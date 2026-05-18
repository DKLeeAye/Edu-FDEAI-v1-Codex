from __future__ import annotations

import uuid
from collections.abc import Callable, Generator

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
    code: str = "MFG-QA-STAGE3",
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


def visit_notes_payload() -> dict[str, object]:
    return {
        "confirmed_information": ["质检记录整理依赖人工补齐。"],
        "requirement_hypotheses": ["减少审厂前人工整理质检记录的时间。"],
        "risks_and_questions": ["需要确认 MES 字段完整性。"],
        "next_visit_plan": "追问字段、样例和一线录入阻力。",
        "customer_visible_summary": "围绕质检记录整理做小范围试点。",
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


def knowledge_decision_payload() -> dict[str, object]:
    return {
        "knowledge_goal": "支撑质检追溯问答、异常原因定位和审厂材料生成。",
        "required_knowledge_types": ["质检记录字段说明", "不合格品处理流程", "审厂检查清单"],
        "source_inventory": ["MES 导出 CSV", "质检 SOP 文档", "历史不合格品处理单"],
        "selected_strategy": "rag",
        "strategy_rationale": "问题需要引用质检记录和 SOP 证据，单纯 prompt 无法覆盖动态数据。",
        "data_quality_risks": ["MES 字段命名不统一", "历史处理单存在缺失项"],
        "maintenance_plan": "每周同步最新质检记录，每月复查 SOP 和审厂清单版本。",
        "evaluation_plan": "使用标准审厂问题集检查召回证据覆盖率和回答可追溯性。",
        "stage_4_build_plan": "在 Dify 中创建知识库，导入清洗后的 SOP 与样例记录，并配置混合检索。",
    }


def case_study_record_payload() -> dict[str, object]:
    return {
        "visited_lesson_keys": [
            "data_quality",
            "chunking_failure",
            "retrieval_failure",
            "diagnostic_map",
        ],
        "key_takeaways": [
            "坏数据会让知识库把不可追溯信息当成事实。",
            "坏分块会导致召回片段缺少完整处置动作。",
            "坏召回可能看似相关但不能支撑回答。",
        ],
        "diagnostic_summary": "先区分召回不到、召回错了、召回对了但答案质量差，再决定调数据、分块还是召回。",
    }


def lab_experiment_record_payload() -> dict[str, object]:
    return {
        "observations": [
            {
                "layer": "数据准备",
                "knowledge_point": "先判断知识源是否干净、完整、可追溯。",
                "observation": "当前材料覆盖质检 SOP，但批次记录仍需补齐。",
            },
            {
                "layer": "分块策略",
                "knowledge_point": "分块决定召回时上下文是否完整。",
                "observation": "结构化分块保留标题层级，比固定长度更适合 SOP。",
            },
            {
                "layer": "向量化与存储",
                "knowledge_point": "Embedding 把文本映射到语义空间。",
                "observation": "AOI、外观缺陷和设备维护形成可解释语义簇。",
            },
            {
                "layer": "召回策略",
                "knowledge_point": "召回需要平衡语义相似和关键词精确。",
                "observation": "混合检索更适合 AOI、AQL 等业务术语。",
            },
            {
                "layer": "效果评估",
                "knowledge_point": "需要观察命中率、首位命中和误召回。",
                "observation": "Hit Rate 80%，首位命中 AOI 复判规则。",
            },
        ],
        "selected_parameters": {
            "document_id": "qa-sop",
            "chunking": {
                "strategy": "structural",
                "chunk_size": 120,
                "overlap": 20,
                "parent_child": True,
            },
            "retrieval": {
                "query": "AOI 误判复判",
                "mode": "hybrid",
                "vector_weight": 0.4,
                "use_aliases": True,
            },
            "hit_rate": 0.8,
            "top_result_title": "AOI 复判规则",
        },
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
    interview_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": "目前质检记录和追溯证据准备最卡在哪里？"},
    )
    assert interview_response.status_code == 201
    visit_notes_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/visit-notes",
        headers=auth_headers(student),
        json=visit_notes_payload(),
    )
    assert visit_notes_response.status_code == 201
    summary_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json=problem_summary_payload(),
    )
    assert summary_response.status_code == 201
    evaluation_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/evaluation",
        headers=auth_headers(student),
    )
    assert evaluation_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/complete",
        headers=auth_headers(student),
    )
    assert complete_response.status_code == 200
    db_session.expire_all()


def complete_stage_two_and_unlock_stage_three(
    client: TestClient,
    db_session: Session,
    experiment_session: ExperimentSession,
    student: User,
) -> None:
    unlock_stage_two(client, db_session, experiment_session, student)
    solution_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/solution-definition",
        headers=auth_headers(student),
        json=solution_payload(),
    )
    assert solution_response.status_code == 201
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
    db_session.expire_all()


def save_knowledge_decision(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/knowledge-decision",
        headers=auth_headers(student),
        json=knowledge_decision_payload(),
    )
    assert response.status_code == 201
    return response.json()


def test_stage_three_locked_stage_rejects_knowledge_decision(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/knowledge-decision",
        headers=auth_headers(student),
        json=knowledge_decision_payload(),
    )

    assert response.status_code == 409
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.LOCKED


def test_stage_three_requires_stage_two_completed_before_operations(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)
    stage_three = get_stage(db_session, experiment_session, "stage_3")
    stage_three.status = StageStatus.NOT_STARTED
    db_session.commit()

    save_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/knowledge-decision",
        headers=auth_headers(student),
        json=knowledge_decision_payload(),
    )
    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/ai-review",
        headers=auth_headers(student),
    )

    assert save_response.status_code == 409
    assert review_response.status_code == 409
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type.in_(["stage_3_knowledge_decision", "stage_3_ai_review"]))
    ) == 0


def test_student_can_save_knowledge_decision_after_stage_three_is_unlocked(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)

    body = save_knowledge_decision(client, experiment_session, student)

    artifact_body = body["artifact"]
    stage_three = get_stage(db_session, experiment_session, "stage_3")
    assert body["stage_key"] == "stage_3"
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_three.id)
    assert artifact_body["stage_key"] == "stage_3"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_3_knowledge_decision"
    assert artifact_body["title"] == "知识工程决策"
    assert artifact_body["content_json"] == knowledge_decision_payload()
    assert stage_three.status == StageStatus.IN_PRACTICE
    assert stage_three.started_at is not None


def test_student_can_save_stage_three_case_study_record_as_process_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/case-study-record",
        headers=auth_headers(student),
        json=case_study_record_payload(),
    )

    assert response.status_code == 201
    body = response.json()
    artifact_body = body["artifact"]
    stage_three = get_stage(db_session, experiment_session, "stage_3")
    assert body["stage_key"] == "stage_3"
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_three.id)
    assert artifact_body["artifact_type"] == "stage_3_case_study_record"
    assert artifact_body["title"] == "阶段三案例学习记录"
    assert artifact_body["status"] == "submitted"
    assert artifact_body["submitted_at"] is not None
    assert artifact_body["content_json"] == case_study_record_payload()
    assert stage_three.status == StageStatus.IN_PRACTICE
    assert stage_three.started_at is not None


def test_student_can_save_stage_three_lab_experiment_record_as_process_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/lab-experiment-record",
        headers=auth_headers(student),
        json=lab_experiment_record_payload(),
    )

    assert response.status_code == 201
    artifact_body = response.json()["artifact"]
    assert artifact_body["artifact_type"] == "stage_3_lab_experiment_record"
    assert artifact_body["title"] == "阶段三五层实验观察记录"
    assert artifact_body["status"] == "submitted"
    assert artifact_body["content_json"] == lab_experiment_record_payload()
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.IN_PRACTICE


def test_stage_three_process_records_do_not_replace_formal_decision_and_review(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)

    case_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/case-study-record",
        headers=auth_headers(student),
        json=case_study_record_payload(),
    )
    lab_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/lab-experiment-record",
        headers=auth_headers(student),
        json=lab_experiment_record_payload(),
    )
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/complete",
        headers=auth_headers(student),
    )

    assert case_response.status_code == 201
    assert lab_response.status_code == 201
    assert complete_response.status_code == 409
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.IN_PRACTICE


def test_stage_three_ai_review_uses_gateway_and_persists_review_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)
    decision_body = save_knowledge_decision(client, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/ai-review",
        headers=auth_headers(student),
    )

    assert response.status_code == 201
    body = response.json()
    artifact_body = body["artifact"]
    review_content = artifact_body["content_json"]
    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_3_knowledge_decision_review")
    )
    assert ai_log is not None
    assert body["ai_call_log_id"] == str(ai_log.id)
    assert ai_log.provider == "fake"
    assert ai_log.request_metadata_json["payload_keys"] == [
        "knowledge_decision",
        "knowledge_decision_artifact_id",
        "rubric",
        "stage_2_solution_artifact_id",
        "stage_2_solution_definition",
        "stage_blueprint",
        "stage_key",
    ]
    assert artifact_body["artifact_type"] == "stage_3_ai_review"
    assert artifact_body["stage_key"] == "stage_3"
    assert review_content["review_summary"].startswith(
        "Fake stage_3_knowledge_decision_review response"
    )
    assert review_content["strategy_fit"] == "rag_strategy_needs_stage_four_validation"
    assert review_content["missing_knowledge_risks"]
    assert review_content["data_quality_warnings"] == knowledge_decision_payload()[
        "data_quality_risks"
    ]
    assert review_content["stage_4_readiness"] == "ready_with_data_quality_risks"
    assert review_content["suggested_improvements"]
    assert review_content["ai_call_log_id"] == str(ai_log.id)
    assert review_content["knowledge_decision_artifact_id"] == decision_body["artifact"]["id"]
    assert review_content["stage_2_solution_artifact_id"]
    assert review_content["rubric"]["stage_key"] == "stage_3"
    assert review_content["rubric"]["version"] == 1


def test_stage_three_completion_requires_decision_and_review_then_unlocks_stage_four(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)

    missing_both_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/complete",
        headers=auth_headers(student),
    )
    assert missing_both_response.status_code == 409

    save_knowledge_decision(client, experiment_session, student)
    missing_review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/complete",
        headers=auth_headers(student),
    )
    assert missing_review_response.status_code == 409

    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/ai-review",
        headers=auth_headers(student),
    )
    assert review_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/complete",
        headers=auth_headers(student),
    )

    assert complete_response.status_code == 200
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.COMPLETED
    assert get_stage(db_session, experiment_session, "stage_4").status == StageStatus.NOT_STARTED
    assert get_stage(db_session, experiment_session, "stage_5").status == StageStatus.LOCKED


@pytest.mark.parametrize(
    ("operation", "payload_factory"),
    [
        ("knowledge-decision", knowledge_decision_payload),
        ("case-study-record", case_study_record_payload),
        ("lab-experiment-record", lab_experiment_record_payload),
        ("ai-review", lambda: None),
        ("complete", lambda: None),
    ],
)
def test_student_cannot_operate_another_students_stage_three_session(
    client: TestClient,
    db_session: Session,
    operation: str,
    payload_factory: Callable[[], dict[str, object] | None],
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, owner)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email=f"other.stage3.{operation}@example.edu",
        password_hash="disabled",
        full_name="Other Stage Three Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        f"/stages/stage_3/stage-three/{operation}",
        headers=auth_headers(other_student),
        json=payload_factory(),
    )

    assert response.status_code == 404
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type.in_(["stage_3_knowledge_decision", "stage_3_ai_review"]))
    ) == 0
