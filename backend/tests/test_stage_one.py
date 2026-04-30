from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import AiCallLog, Artifact, Course, ExperimentSession, StageRecord, User
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


def create_demo_course_and_session(
    client: TestClient,
    db_session: Session,
    *,
    code: str = "MFG-QA-STAGE1",
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


def test_student_can_ask_ai_customer_and_persist_artifact_log_and_stage_status(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_record = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == "stage_1",
        )
    )
    assert stage_record is not None
    assert stage_record.status == StageStatus.NOT_STARTED

    message = "当前质检流程最大的痛点是什么？"
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": message},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["stage_key"] == "stage_1"
    assert body["user_message"] == message
    assert (
        body["ai_customer_response"]
        == f"Fake stage_1_customer_interview response: {message}"
    )
    assert body["ai_call_log_id"] is not None

    artifact_body = body["artifact"]
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_record.id)
    assert artifact_body["stage_key"] == "stage_1"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_1_interview_turn"
    assert artifact_body["title"] == "阶段一 AI 客户访谈记录"
    assert artifact_body["content_json"]["user_message"] == message
    assert artifact_body["content_json"]["ai_customer_response"] == body["ai_customer_response"]
    assert artifact_body["content_json"]["ai_call_log_id"] == body["ai_call_log_id"]

    artifact = db_session.get(Artifact, uuid.UUID(artifact_body["id"]))
    assert artifact is not None
    assert artifact.stage_record_id == stage_record.id
    assert artifact.content_json["user_message"] == message

    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_1_customer_interview")
    )
    assert ai_log is not None
    assert str(ai_log.id) == body["ai_call_log_id"]
    assert ai_log.tenant_id == student.tenant_id
    assert ai_log.institution_id == student.institution_id
    assert ai_log.course_id == course.id
    assert ai_log.session_id == experiment_session.id
    assert ai_log.stage_record_id == stage_record.id
    assert ai_log.user_id == student.id
    assert ai_log.request_metadata_json["summary"] == message
    assert "customer_persona" in ai_log.request_metadata_json["payload_keys"]
    assert "stage_blueprint" in ai_log.request_metadata_json["payload_keys"]

    db_session.refresh(stage_record)
    assert stage_record.status == StageStatus.IN_PRACTICE
    assert stage_record.started_at is not None


def test_stage_one_interview_rejects_another_students_session(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email="other.stage1.student@example.edu",
        password_hash="disabled",
        full_name="Other Stage One Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(other_student),
        json={"message": "我能访问别人的客户访谈吗？"},
    )

    assert response.status_code == 404
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert db_session.scalar(select(func.count()).select_from(AiCallLog)) == 0


def test_stage_one_interview_rejects_non_stage_one_stage(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_two = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == "stage_2",
        )
    )
    assert stage_two is not None

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": "这个接口不能写入阶段二。"},
    )

    assert response.status_code == 404
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert db_session.scalar(select(func.count()).select_from(AiCallLog)) == 0
    db_session.refresh(stage_two)
    assert stage_two.status == StageStatus.LOCKED


def test_stage_one_summary_is_saved_as_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    payload = {
        "problem_statement": "质检记录依赖人工整理，审厂追溯材料准备压力大。",
        "target_user": "生产部门负责人和一线质检员",
        "business_context": "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
        "pain_points": ["漏检原因难追踪", "MES 数据质量不稳定", "一线员工不愿使用复杂系统"],
        "success_criteria": ["减少人工整理时间", "关键质检记录可追溯", "上线流程不增加一线负担"],
    }

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json=payload,
    )

    assert response.status_code == 201
    artifact_body = response.json()["artifact"]
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_key"] == "stage_1"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_1_problem_summary"
    assert artifact_body["title"] == "阶段一问题发现总结"
    assert artifact_body["content_json"] == payload
