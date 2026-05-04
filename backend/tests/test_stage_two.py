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
    code: str = "MFG-QA-STAGE2",
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


def problem_summary_payload() -> dict[str, object]:
    return {
        "problem_statement": "质检记录依赖人工整理，审厂追溯材料准备压力大。",
        "target_user": "生产部门负责人和一线质检员",
        "business_context": "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
        "pain_points": ["漏检原因难追踪", "MES 数据质量不稳定"],
        "success_criteria": ["关键质检记录可追溯", "上线流程不增加一线负担"],
    }


def solution_payload() -> dict[str, object]:
    return {
        "solution_title": "质检追溯 AI 助手",
        "problem_summary": "审厂前质检记录分散，人工整理慢且难以追溯。",
        "proposed_agent_capability": "根据质检记录和问题描述生成追溯摘要与整改建议。",
        "target_workflow": "质检员录入异常记录后，生产负责人通过智能体生成审厂追溯材料。",
        "data_sources": ["MES 质检记录", "不合格品处理单", "审厂检查清单"],
        "tool_or_system_dependencies": ["Dify", "MES 导出的 CSV"],
        "feasibility_risks": ["MES 数据字段不统一", "一线录入质量不稳定"],
        "expected_value": "减少审厂材料人工整理时间，并提升质检问题追溯效率。",
    }


def get_stage(db_session: Session, experiment_session: ExperimentSession, stage_key: str) -> StageRecord:
    stage_record = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == stage_key,
        )
    )
    assert stage_record is not None
    return stage_record


def unlock_stage_two(
    client: TestClient,
    db_session: Session,
    experiment_session: ExperimentSession,
    student: User,
) -> None:
    summary_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json=problem_summary_payload(),
    )
    assert summary_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/complete",
        headers=auth_headers(student),
    )
    assert complete_response.status_code == 200
    db_session.expire_all()


def save_stage_two_solution(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/solution-definition",
        headers=auth_headers(student),
        json=solution_payload(),
    )
    assert response.status_code == 201
    return response.json()


def test_stage_one_cannot_complete_without_problem_summary(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/complete",
        headers=auth_headers(student),
    )

    assert response.status_code == 409
    assert get_stage(db_session, experiment_session, "stage_1").status == StageStatus.NOT_STARTED
    assert get_stage(db_session, experiment_session, "stage_2").status == StageStatus.LOCKED


def test_stage_one_completion_marks_stage_one_completed_and_unlocks_stage_two(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    unlock_stage_two(client, db_session, experiment_session, student)

    stage_one = get_stage(db_session, experiment_session, "stage_1")
    stage_two = get_stage(db_session, experiment_session, "stage_2")
    stage_three = get_stage(db_session, experiment_session, "stage_3")
    assert stage_one.status == StageStatus.COMPLETED
    assert stage_one.completed_at is not None
    assert stage_two.status == StageStatus.NOT_STARTED
    assert stage_three.status == StageStatus.LOCKED


def test_stage_two_locked_stage_rejects_solution_definition(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/solution-definition",
        headers=auth_headers(student),
        json=solution_payload(),
    )

    assert response.status_code == 409
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert get_stage(db_session, experiment_session, "stage_2").status == StageStatus.LOCKED


def test_student_can_save_solution_definition_after_stage_two_is_unlocked(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)

    body = save_stage_two_solution(client, experiment_session, student)

    artifact_body = body["artifact"]
    stage_two = get_stage(db_session, experiment_session, "stage_2")
    assert body["stage_key"] == "stage_2"
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_two.id)
    assert artifact_body["stage_key"] == "stage_2"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_2_solution_definition"
    assert artifact_body["title"] == "质检追溯 AI 助手"
    assert artifact_body["content_json"] == solution_payload()
    assert stage_two.status == StageStatus.IN_PRACTICE
    assert stage_two.started_at is not None


def test_stage_two_ai_review_uses_gateway_and_persists_review_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)
    save_stage_two_solution(client, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/ai-review",
        headers=auth_headers(student),
    )

    assert response.status_code == 201
    body = response.json()
    artifact_body = body["artifact"]
    review_content = artifact_body["content_json"]
    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_2_feasibility_review")
    )
    assert ai_log is not None
    assert body["ai_call_log_id"] == str(ai_log.id)
    assert ai_log.provider == "fake"
    assert ai_log.request_metadata_json["payload_keys"] == [
        "rubric",
        "solution_artifact_id",
        "solution_definition",
        "stage_blueprint",
        "stage_key",
    ]
    assert artifact_body["artifact_type"] == "stage_2_ai_review"
    assert artifact_body["stage_key"] == "stage_2"
    assert review_content["review_summary"].startswith("Fake stage_2_feasibility_review response")
    assert review_content["feasibility_judgement"] == "needs_revision_review"
    assert review_content["key_risks"] == solution_payload()["feasibility_risks"]
    assert review_content["suggested_improvements"]
    assert review_content["ai_call_log_id"] == str(ai_log.id)
    assert review_content["rubric"]["stage_key"] == "stage_2"
    assert review_content["rubric"]["version"] == 1


def test_stage_two_completion_requires_solution_and_review_then_unlocks_stage_three(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)

    incomplete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/complete",
        headers=auth_headers(student),
    )
    assert incomplete_response.status_code == 409

    save_stage_two_solution(client, experiment_session, student)
    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/ai-review",
        headers=auth_headers(student),
    )
    assert review_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/complete",
        headers=auth_headers(student),
    )

    assert complete_response.status_code == 200
    assert get_stage(db_session, experiment_session, "stage_2").status == StageStatus.COMPLETED
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.NOT_STARTED
    assert get_stage(db_session, experiment_session, "stage_4").status == StageStatus.LOCKED


def test_student_cannot_operate_another_students_stage_two_session(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, owner)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email="other.stage2.student@example.edu",
        password_hash="disabled",
        full_name="Other Stage Two Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    save_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/solution-definition",
        headers=auth_headers(other_student),
        json=solution_payload(),
    )
    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/ai-review",
        headers=auth_headers(other_student),
    )

    assert save_response.status_code == 404
    assert review_response.status_code == 404
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type.in_(["stage_2_solution_definition", "stage_2_ai_review"]))
    ) == 0
