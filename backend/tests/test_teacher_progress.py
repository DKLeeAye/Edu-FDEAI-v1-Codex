from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import Course, ExperimentSession, User
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
    code: str = "MFG-QA-TEACHER",
) -> tuple[Course, ExperimentSession, User, User]:
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
    return course, experiment_session, student, teacher


def create_stage_artifact(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    stage_key: str,
    artifact_type: str,
    title: str,
) -> str:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/{stage_key}/artifacts",
        headers=auth_headers(student),
        json={
            "artifact_type": artifact_type,
            "title": title,
            "content_json": {"summary": title},
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_teacher_can_view_own_course_session_progress_with_stage_artifact_counts(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_problem_summary",
        title="问题发现总结",
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_interview_turn",
        title="访谈记录",
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_2",
        artifact_type="stage_2_solution_definition",
        title="方案定义",
    )

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    course_progress = next(item for item in body if item["id"] == str(course.id))
    assert course_progress["created_by_user_id"] == str(teacher.id)
    assert len(course_progress["sessions"]) == 1

    session_progress = course_progress["sessions"][0]
    assert session_progress["id"] == str(experiment_session.id)
    assert session_progress["student"] == {
        "id": str(student.id),
        "email": student.email,
        "full_name": student.full_name,
    }
    assert session_progress["status"] == "not_started"
    assert session_progress["artifact_total_count"] == 3
    assert session_progress["updated_at"] is not None
    assert [
        (stage["stage_key"], stage["status"], stage["artifact_count"])
        for stage in session_progress["stage_records"]
    ] == [
        ("stage_1", "not_started", 2),
        ("stage_2", "locked", 1),
        ("stage_3", "locked", 0),
        ("stage_4", "locked", 0),
        ("stage_5", "locked", 0),
    ]


def test_teacher_progress_excludes_courses_created_by_other_teacher(
    client: TestClient,
    db_session: Session,
) -> None:
    own_course, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-OWN",
    )
    seed = seed_demo_data(db_session)
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="other.teacher@example.edu",
        password_hash="disabled",
        full_name="Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()
    other_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(other_teacher),
        json={
            "title": "其他教师课程",
            "code": "MFG-QA-OTHER-TEACHER",
            "package_version_id": str(seed.package_version.id),
        },
    )
    assert other_course_response.status_code == 201

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    returned_course_ids = {item["id"] for item in response.json()}
    assert str(own_course.id) in returned_course_ids
    assert other_course_response.json()["id"] not in returned_course_ids


def test_student_cannot_access_teacher_progress_api(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, _ = create_demo_course_and_session(client, db_session)

    list_response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(student),
    )
    artifacts_response = client.get(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(student),
    )

    assert list_response.status_code == 403
    assert artifacts_response.status_code == 403


def test_teacher_can_view_own_course_session_stage_artifact_summaries(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(client, db_session)
    artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_problem_summary",
        title="问题发现总结",
    )

    response = client.get(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    assert [artifact["id"] for artifact in body] == [artifact_id]
    assert body[0]["session_id"] == str(experiment_session.id)
    assert body[0]["stage_key"] == "stage_1"
    assert body[0]["artifact_type"] == "stage_1_problem_summary"
    assert body[0]["title"] == "问题发现总结"
    assert body[0]["content_json"] == {"summary": "问题发现总结"}


def test_teacher_cannot_view_other_teacher_session_artifact_summaries(
    client: TestClient,
    db_session: Session,
) -> None:
    _, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-OWNER",
    )
    seed = seed_demo_data(db_session)
    student = get_demo_user(db_session, UserRole.STUDENT)
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="artifact.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Artifact Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()
    other_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(other_teacher),
        json={
            "title": "其他教师 Artifact 课程",
            "code": "MFG-QA-OTHER-ARTIFACT",
            "package_version_id": str(seed.package_version.id),
        },
    )
    other_session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": other_course_response.json()["id"]},
    )
    assert other_session_response.status_code == 201

    response = client.get(
        "/api/v1/teacher/progress/sessions/"
        f"{other_session_response.json()['id']}/stages/stage_1/artifacts",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 404
