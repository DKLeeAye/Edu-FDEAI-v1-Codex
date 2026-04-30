from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import Artifact, Course, ExperimentSession, Institution, StageRecord, Tenant, User
from app.models.enums import UserRole
from app.seeds.demo import seed_demo_data


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_sessionmaker = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    with testing_sessionmaker() as session:
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
        role=user.role,
    )
    return {"Authorization": f"Bearer {token}"}


def get_demo_user(session: Session, role: UserRole) -> User:
    return session.scalar(select(User).where(User.role == role))  # type: ignore[return-value]


def create_demo_course_and_session(
    client: TestClient,
    db_session: Session,
    *,
    code: str = "MFG-QA-001",
) -> tuple[Course, ExperimentSession, User]:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)
    student = get_demo_user(db_session, UserRole.STUDENT)
    course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "制造业质检 AI 项目实训",
            "code": code,
            "package_version_id": str(seed.package_version.id),
        },
    )
    session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": course_response.json()["id"]},
    )
    course = db_session.get(Course, uuid.UUID(course_response.json()["id"]))
    experiment_session = db_session.get(ExperimentSession, uuid.UUID(session_response.json()["id"]))
    assert course is not None
    assert experiment_session is not None
    return course, experiment_session, student


def test_student_can_create_artifact_for_own_session_stage(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(student),
        json={
            "artifact_type": "interview_transcript",
            "title": "第一轮访谈记录",
            "content_json": {"turns": [{"speaker": "student", "text": "当前质检痛点是什么？"}]},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["tenant_id"] == str(student.tenant_id)
    assert body["institution_id"] == str(student.institution_id)
    assert body["course_id"] == str(course.id)
    assert body["session_id"] == str(experiment_session.id)
    assert body["stage_key"] == "stage_1"
    assert body["submitted_by_user_id"] == str(student.id)
    assert body["artifact_type"] == "interview_transcript"
    assert body["title"] == "第一轮访谈记录"
    assert body["content_json"]["turns"][0]["speaker"] == "student"
    assert body["version"] == 1
    assert body["status"] == "draft"

    artifact = db_session.get(Artifact, uuid.UUID(body["id"]))
    assert artifact is not None
    assert artifact.tenant_id == student.tenant_id
    assert artifact.institution_id == student.institution_id
    assert artifact.course_id == course.id
    assert artifact.session_id == experiment_session.id
    assert artifact.stage_key == "stage_1"
    assert artifact.submitted_by_user_id == student.id


def test_student_can_list_and_read_own_artifacts(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    create_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(student),
        json={
            "artifact_type": "visit_summary",
            "title": "拜访整理",
            "content_json": {"summary": "客户担心审厂材料准备不足。"},
        },
    )
    artifact_id = create_response.json()["id"]

    list_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(student),
    )
    detail_response = client.get(
        f"/api/v1/artifacts/{artifact_id}",
        headers=auth_headers(student),
    )

    assert list_response.status_code == 200
    assert [artifact["id"] for artifact in list_response.json()] == [artifact_id]
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == artifact_id
    assert detail_response.json()["content_json"] == {"summary": "客户担心审厂材料准备不足。"}


def test_student_cannot_access_another_students_artifacts(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email="other.student@example.edu",
        password_hash="disabled",
        full_name="Other Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()
    create_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(owner),
        json={
            "artifact_type": "interview_transcript",
            "title": "访谈记录",
            "content_json": {"turns": []},
        },
    )
    artifact_id = create_response.json()["id"]

    list_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(other_student),
    )
    detail_response = client.get(
        f"/api/v1/artifacts/{artifact_id}",
        headers=auth_headers(other_student),
    )
    create_for_other_session_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(other_student),
        json={
            "artifact_type": "interview_transcript",
            "title": "越权访谈记录",
            "content_json": {"turns": []},
        },
    )

    assert list_response.status_code == 404
    assert detail_response.status_code == 404
    assert create_for_other_session_response.status_code == 404


def test_cross_tenant_artifact_access_is_rejected(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    create_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(owner),
        json={
            "artifact_type": "interview_transcript",
            "title": "访谈记录",
            "content_json": {"turns": []},
        },
    )
    artifact_id = create_response.json()["id"]

    other_tenant = Tenant(name="Other Tenant", slug="other")
    db_session.add(other_tenant)
    db_session.flush()
    other_institution = Institution(
        tenant_id=other_tenant.id, name="Other University", code="OTHER"
    )
    db_session.add(other_institution)
    db_session.flush()
    other_student = User(
        tenant_id=other_tenant.id,
        institution_id=other_institution.id,
        email="student@other.example.edu",
        password_hash="disabled",
        full_name="Other Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    list_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(other_student),
    )
    detail_response = client.get(
        f"/api/v1/artifacts/{artifact_id}",
        headers=auth_headers(other_student),
    )

    assert list_response.status_code == 404
    assert detail_response.status_code == 404


def test_artifact_creation_requires_existing_stage_in_session(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_count = db_session.scalar(
        select(func.count())
        .select_from(StageRecord)
        .where(StageRecord.session_id == experiment_session.id)
    )

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/stage_9/artifacts",
        headers=auth_headers(student),
        json={
            "artifact_type": "invalid",
            "title": "不存在阶段",
            "content_json": {},
        },
    )

    assert stage_count == 5
    assert response.status_code == 404
