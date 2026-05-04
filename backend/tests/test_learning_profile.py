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
from app.models import Course, ExperimentSession, StageRecord, User
from app.models.enums import SessionStatus, StageStatus, UserRole
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
    code: str = "MFG-QA-PROFILE",
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
) -> None:
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


def set_session_stage_statuses(
    db_session: Session,
    experiment_session: ExperimentSession,
    *,
    session_status: SessionStatus,
    stage_statuses: dict[str, StageStatus],
) -> None:
    experiment_session.status = session_status
    stage_records = list(
        db_session.scalars(
            select(StageRecord).where(StageRecord.session_id == experiment_session.id)
        )
    )
    for stage_record in stage_records:
        stage_record.status = stage_statuses[stage_record.stage_key]
    db_session.commit()


def test_student_can_view_own_learning_profile_with_counts_ratio_and_rule_signals(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, _ = create_demo_course_and_session(client, db_session)
    set_session_stage_statuses(
        db_session,
        experiment_session,
        session_status=SessionStatus.IN_PROGRESS,
        stage_statuses={
            "stage_1": StageStatus.COMPLETED,
            "stage_2": StageStatus.COMPLETED,
            "stage_3": StageStatus.NOT_STARTED,
            "stage_4": StageStatus.LOCKED,
            "stage_5": StageStatus.LOCKED,
        },
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
        stage_key="stage_2",
        artifact_type="stage_2_solution_definition",
        title="方案定义",
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_2",
        artifact_type="stage_2_ai_review",
        title="AI 可行性评审",
    )

    response = client.get(
        f"/api/v1/learning-profiles/sessions/{experiment_session.id}",
        headers=auth_headers(student),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == str(experiment_session.id)
    assert body["session_status"] == "in_progress"
    assert body["student"] == {
        "id": str(student.id),
        "email": student.email,
        "full_name": student.full_name,
    }
    assert [
        (stage["stage_key"], stage["stage_order"], stage["status"])
        for stage in body["stage_status_summary"]
    ] == [
        ("stage_1", 1, "completed"),
        ("stage_2", 2, "completed"),
        ("stage_3", 3, "not_started"),
        ("stage_4", 4, "locked"),
        ("stage_5", 5, "locked"),
    ]
    assert body["artifact_count_by_stage"] == {
        "stage_1": 1,
        "stage_2": 2,
        "stage_3": 0,
        "stage_4": 0,
        "stage_5": 0,
    }
    assert body["ai_review_count_by_stage"] == {
        "stage_1": 0,
        "stage_2": 1,
        "stage_3": 0,
        "stage_4": 0,
        "stage_5": 0,
    }
    assert body["completed_stage_count"] == 2
    assert body["total_stage_count"] == 5
    assert body["completion_ratio"] == 0.4
    assert any("阶段一缺少 AI 反馈记录" in risk for risk in body["risks"])
    assert any("阶段三过程证据偏少" in risk for risk in body["risks"])
    assert any("阶段三" in suggestion for suggestion in body["next_suggestions"])


def test_student_cannot_view_another_students_learning_profile(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner, _ = create_demo_course_and_session(client, db_session)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email="profile.other.student@example.edu",
        password_hash="disabled",
        full_name="Profile Other Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    response = client.get(
        f"/api/v1/learning-profiles/sessions/{experiment_session.id}",
        headers=auth_headers(other_student),
    )

    assert response.status_code == 404


def test_teacher_can_view_own_course_student_learning_profile(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(client, db_session)

    response = client.get(
        f"/api/v1/learning-profiles/sessions/{experiment_session.id}",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == str(experiment_session.id)
    assert body["student"]["id"] == str(student.id)
    assert body["total_stage_count"] == 5


def test_teacher_cannot_view_other_teacher_course_learning_profile(
    client: TestClient,
    db_session: Session,
) -> None:
    _, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-PROFILE-OWNER",
    )
    seed = seed_demo_data(db_session)
    student = get_demo_user(db_session, UserRole.STUDENT)
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="profile.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Profile Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()
    other_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(other_teacher),
        json={
            "title": "其他教师画像课程",
            "code": "MFG-QA-PROFILE-OTHER",
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
        f"/api/v1/learning-profiles/sessions/{other_session_response.json()['id']}",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 404


def test_completed_session_profile_includes_complete_project_strength(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, _ = create_demo_course_and_session(client, db_session)
    set_session_stage_statuses(
        db_session,
        experiment_session,
        session_status=SessionStatus.COMPLETED,
        stage_statuses={
            "stage_1": StageStatus.COMPLETED,
            "stage_2": StageStatus.COMPLETED,
            "stage_3": StageStatus.COMPLETED,
            "stage_4": StageStatus.COMPLETED,
            "stage_5": StageStatus.COMPLETED,
        },
    )

    response = client.get(
        f"/api/v1/learning-profiles/sessions/{experiment_session.id}",
        headers=auth_headers(student),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["completed_stage_count"] == 5
    assert body["completion_ratio"] == 1.0
    assert "完成完整 AI 智能体项目交付链路" in body["strengths"]
    assert any("复盘" in suggestion for suggestion in body["next_suggestions"])
