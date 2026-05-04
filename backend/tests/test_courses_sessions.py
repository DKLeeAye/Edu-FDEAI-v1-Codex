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
from app.models import Course, ExperimentSession, Institution, StageRecord, Tenant, User
from app.models.enums import StageStatus, UserRole
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


def test_teacher_can_create_course_bound_to_package_version(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)

    response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "制造业质检 AI 项目实训",
            "code": "MFG-QA-001",
            "package_version_id": str(seed.package_version.id),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "制造业质检 AI 项目实训"
    assert body["code"] == "MFG-QA-001"
    assert body["package_version_id"] == str(seed.package_version.id)
    assert body["tenant_id"] == str(teacher.tenant_id)
    assert body["institution_id"] == str(teacher.institution_id)

    course = db_session.get(Course, uuid.UUID(body["id"]))
    assert course is not None
    assert course.tenant_id == teacher.tenant_id
    assert course.institution_id == teacher.institution_id
    assert course.package_version_id == seed.package_version.id
    assert course.created_by_user_id == teacher.id


def test_student_can_create_session_for_course_with_five_stage_records(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)
    student = get_demo_user(db_session, UserRole.STUDENT)
    course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "制造业质检 AI 项目实训",
            "code": "MFG-QA-001",
            "package_version_id": str(seed.package_version.id),
        },
    )
    course_id = course_response.json()["id"]

    response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": course_id},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["course_id"] == course_id
    assert body["student_user_id"] == str(student.id)
    assert body["package_version_id"] == str(seed.package_version.id)
    assert len(body["stage_records"]) == 5
    assert [(stage["stage_key"], stage["status"]) for stage in body["stage_records"]] == [
        ("stage_1", "not_started"),
        ("stage_2", "locked"),
        ("stage_3", "locked"),
        ("stage_4", "locked"),
        ("stage_5", "locked"),
    ]

    course = db_session.get(Course, uuid.UUID(course_id))
    session = db_session.get(ExperimentSession, uuid.UUID(body["id"]))
    assert course is not None
    assert session is not None
    assert session.package_version_id == course.package_version_id

    stage_records = db_session.scalars(
        select(StageRecord)
        .where(StageRecord.session_id == session.id)
        .order_by(StageRecord.stage_order)
    ).all()
    assert len(stage_records) == 5
    assert stage_records[0].status == StageStatus.NOT_STARTED
    assert all(stage.status == StageStatus.LOCKED for stage in stage_records[1:])


def test_session_creation_rejects_frontend_supplied_package_version_id(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)
    student = get_demo_user(db_session, UserRole.STUDENT)
    course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "制造业质检 AI 项目实训",
            "code": "MFG-QA-001",
            "package_version_id": str(seed.package_version.id),
        },
    )

    response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={
            "course_id": course_response.json()["id"],
            "package_version_id": str(uuid.uuid4()),
        },
    )

    assert response.status_code == 422


def test_cross_tenant_course_is_not_queryable_or_usable_for_session(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    student = get_demo_user(db_session, UserRole.STUDENT)
    other_tenant = Tenant(name="Other Tenant", slug="other")
    db_session.add(other_tenant)
    db_session.flush()
    other_institution = Institution(tenant_id=other_tenant.id, name="Other University", code="OTHER")
    db_session.add(other_institution)
    db_session.flush()
    other_teacher = User(
        tenant_id=other_tenant.id,
        institution_id=other_institution.id,
        email="teacher@other.example",
        password_hash="disabled",
        full_name="Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.flush()
    other_course = Course(
        tenant_id=other_tenant.id,
        institution_id=other_institution.id,
        created_by_user_id=other_teacher.id,
        package_version_id=seed.package_version.id,
        title="Other Course",
        code="OTHER-001",
    )
    db_session.add(other_course)
    db_session.commit()

    get_response = client.get(
        f"/api/v1/courses/{other_course.id}",
        headers=auth_headers(student),
    )
    create_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": str(other_course.id)},
    )

    assert get_response.status_code == 404
    assert create_response.status_code == 404


def test_teacher_session_api_is_limited_to_owned_courses(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)
    student = get_demo_user(db_session, UserRole.STUDENT)
    own_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "自有教师课程",
            "code": "MFG-QA-OWNED-SESSION",
            "package_version_id": str(seed.package_version.id),
        },
    )
    own_session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": own_course_response.json()["id"]},
    )

    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="session.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Session Other Teacher",
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
            "code": "MFG-QA-OTHER-SESSION",
            "package_version_id": str(seed.package_version.id),
        },
    )
    other_session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": other_course_response.json()["id"]},
    )

    list_response = client.get(
        "/api/v1/experiment-sessions",
        headers=auth_headers(teacher),
    )
    get_response = client.get(
        f"/api/v1/experiment-sessions/{other_session_response.json()['id']}",
        headers=auth_headers(teacher),
    )

    assert list_response.status_code == 200
    returned_session_ids = {item["id"] for item in list_response.json()}
    assert own_session_response.json()["id"] in returned_session_ids
    assert other_session_response.json()["id"] not in returned_session_ids
    assert get_response.status_code == 404
