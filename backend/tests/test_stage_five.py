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
    code: str = "MFG-QA-STAGE5",
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


def dify_implementation_payload() -> dict[str, object]:
    return {
        "dify_app_name": "质检追溯 Dify 助手",
        "dify_app_url": "https://dify.example.edu/apps/mfg-qa",
        "dify_app_id": "dify-app-mfg-qa",
        "app_mode": "chatflow",
        "knowledge_base_notes": "已导入质检 SOP、审厂清单和样例质检记录。",
        "prompt_or_instruction_notes": "要求回答必须引用质检记录证据，并对范围外问题说明无法回答。",
        "tool_configuration_notes": "MVP 暂未启用外部工具，仅保留后续 MES 查询工具配置位。",
        "implementation_notes": "按阶段三 RAG 决策配置知识库、混合检索和多轮上下文。",
        "known_limitations": ["MES 导出字段仍需人工清洗", "多轮记忆只覆盖当前会话"],
    }


def stage_four_test_report_payload() -> dict[str, object]:
    return {
        "test_goal": "验证 Dify 智能体能支持质检追溯、范围外拒答和多轮记忆。",
        "test_cases": [
            {
                "scenario": "标准审厂问题",
                "input": "质检记录数字化需要保存哪些信息？",
                "expected_output": "回答应覆盖批次、检验项、结果、责任人和时间。",
                "actual_output": "回答覆盖批次、检验项、结果、责任人和时间，并引用 SOP。",
                "result": "passed",
                "notes": "标准题通过。",
            },
            {
                "scenario": "范围外问题",
                "input": "今天股市行情怎么样？",
                "expected_output": "应拒答并说明不属于质检场景。",
                "actual_output": "拒答并引导回到质检追溯问题。",
                "result": "passed",
                "notes": "范围外拒答通过。",
            },
        ],
        "observed_failures": ["长问题下回答引用证据不够稳定"],
        "improvement_actions": ["补充 SOP 分块标题", "增加范围外问题负样例"],
        "overall_result": "needs_revision",
    }


def delivery_document_payload() -> dict[str, object]:
    return {
        "project_name": "质检追溯 AI 助手交付包",
        "final_agent_url": "https://dify.example.edu/apps/mfg-qa",
        "delivery_summary": "交付一个可供生产负责人查询质检记录和生成审厂追溯摘要的 Dify 应用。",
        "core_features": ["质检记录问答", "审厂追溯摘要", "范围外问题拒答"],
        "target_users": ["生产部门负责人", "一线质检员"],
        "usage_instructions": "用户通过 Dify 链接进入应用，输入质检批次或审厂问题后查看带证据的回答。",
        "known_limitations": ["MES 导出字段仍需人工清洗", "多轮记忆只覆盖当前会话"],
    }


def acceptance_package_payload() -> dict[str, object]:
    return {
        "acceptance_scope": "围绕质检追溯问答、范围外拒答和多轮上下文进行 MVP 验收。",
        "acceptance_criteria": ["标准审厂问题回答可追溯", "范围外问题合理拒答", "多轮追问能保持上下文"],
        "test_evidence_summary": "阶段四完成 2 个标准测试用例，仍记录 1 个长问题证据引用稳定性问题。",
        "unresolved_issues": ["长问题下回答引用证据不够稳定"],
        "handover_checklist": ["Dify 应用链接", "阶段四测试报告", "已知限制说明", "维护说明"],
    }


def operations_guide_payload() -> dict[str, object]:
    return {
        "runtime_dependencies": ["Dify 云端应用", "Dify 知识库", "MES CSV 人工导出文件"],
        "data_update_plan": "每周导入最新质检记录，每月复核 SOP 和审厂清单版本。",
        "monitoring_plan": "每周抽查 10 个典型问题回答，记录无法回答和证据引用异常。",
        "common_issues": ["导入 CSV 字段不一致", "长问题需要拆分提问"],
        "maintenance_owner_notes": "由生产质量负责人维护数据源，由课程演示教师协助复核应用配置。",
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


def complete_stage_three_and_unlock_stage_four(
    client: TestClient,
    db_session: Session,
    experiment_session: ExperimentSession,
    student: User,
) -> None:
    complete_stage_two_and_unlock_stage_three(client, db_session, experiment_session, student)
    decision_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_3/stage-three/knowledge-decision",
        headers=auth_headers(student),
        json=knowledge_decision_payload(),
    )
    assert decision_response.status_code == 201
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
    db_session.expire_all()


def complete_stage_four_and_unlock_stage_five(
    client: TestClient,
    db_session: Session,
    experiment_session: ExperimentSession,
    student: User,
) -> None:
    complete_stage_three_and_unlock_stage_four(client, db_session, experiment_session, student)
    implementation_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_4/stage-four/dify-implementation",
        headers=auth_headers(student),
        json=dify_implementation_payload(),
    )
    assert implementation_response.status_code == 201
    test_report_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_4/stage-four/test-report",
        headers=auth_headers(student),
        json=stage_four_test_report_payload(),
    )
    assert test_report_response.status_code == 201
    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_4/stage-four/ai-test-review",
        headers=auth_headers(student),
    )
    assert review_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_4/stage-four/complete",
        headers=auth_headers(student),
    )
    assert complete_response.status_code == 200
    db_session.expire_all()


def save_delivery_document(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/delivery-document",
        headers=auth_headers(student),
        json=delivery_document_payload(),
    )
    assert response.status_code == 201
    return response.json()


def save_acceptance_package(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/acceptance-package",
        headers=auth_headers(student),
        json=acceptance_package_payload(),
    )
    assert response.status_code == 201
    return response.json()


def save_operations_guide(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/operations-guide",
        headers=auth_headers(student),
        json=operations_guide_payload(),
    )
    assert response.status_code == 201
    return response.json()


def test_stage_five_locked_stage_rejects_delivery_document(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/delivery-document",
        headers=auth_headers(student),
        json=delivery_document_payload(),
    )

    assert response.status_code == 409
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type == "stage_5_delivery_document")
    ) == 0
    assert get_stage(db_session, experiment_session, "stage_5").status == StageStatus.LOCKED


@pytest.mark.parametrize(
    ("operation", "payload_factory"),
    [
        ("delivery-document", delivery_document_payload),
        ("acceptance-package", acceptance_package_payload),
        ("operations-guide", operations_guide_payload),
        ("ai-delivery-review", lambda: None),
        ("complete", lambda: None),
    ],
)
def test_stage_five_requires_stage_four_completed_before_operations(
    client: TestClient,
    db_session: Session,
    operation: str,
    payload_factory: Callable[[], dict[str, object] | None],
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_three_and_unlock_stage_four(client, db_session, experiment_session, student)
    stage_five = get_stage(db_session, experiment_session, "stage_5")
    stage_five.status = StageStatus.NOT_STARTED
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        f"/stages/stage_5/stage-five/{operation}",
        headers=auth_headers(student),
        json=payload_factory(),
    )

    assert response.status_code == 409
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type.like("stage_5_%"))
    ) == 0


def test_stage_five_rejects_non_stage_five_key(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_4/stage-five/delivery-document",
        headers=auth_headers(student),
        json=delivery_document_payload(),
    )

    assert response.status_code == 404


def test_student_can_save_stage_five_delivery_document(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)

    body = save_delivery_document(client, experiment_session, student)

    artifact_body = body["artifact"]
    stage_five = get_stage(db_session, experiment_session, "stage_5")
    assert body["stage_key"] == "stage_5"
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_five.id)
    assert artifact_body["stage_key"] == "stage_5"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_5_delivery_document"
    assert artifact_body["title"] == delivery_document_payload()["project_name"]
    assert artifact_body["content_json"] == delivery_document_payload()
    assert stage_five.status == StageStatus.IN_PRACTICE
    assert stage_five.started_at is not None


def test_stage_five_acceptance_package_requires_stage_four_implementation_and_test_report(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_three_and_unlock_stage_four(client, db_session, experiment_session, student)
    stage_four = get_stage(db_session, experiment_session, "stage_4")
    stage_five = get_stage(db_session, experiment_session, "stage_5")
    stage_four.status = StageStatus.COMPLETED
    stage_five.status = StageStatus.NOT_STARTED
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/acceptance-package",
        headers=auth_headers(student),
        json=acceptance_package_payload(),
    )

    assert response.status_code == 409
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type == "stage_5_acceptance_package")
    ) == 0


def test_student_can_save_stage_five_acceptance_package(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)

    body = save_acceptance_package(client, experiment_session, student)

    artifact_body = body["artifact"]
    assert artifact_body["artifact_type"] == "stage_5_acceptance_package"
    assert artifact_body["stage_key"] == "stage_5"
    assert artifact_body["content_json"] == acceptance_package_payload()
    assert artifact_body["content_json"]["unresolved_issues"] == ["长问题下回答引用证据不够稳定"]


def test_student_can_save_stage_five_operations_guide(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)

    body = save_operations_guide(client, experiment_session, student)

    artifact_body = body["artifact"]
    assert artifact_body["artifact_type"] == "stage_5_operations_guide"
    assert artifact_body["stage_key"] == "stage_5"
    assert artifact_body["content_json"] == operations_guide_payload()
    assert artifact_body["content_json"]["runtime_dependencies"] == [
        "Dify 云端应用",
        "Dify 知识库",
        "MES CSV 人工导出文件",
    ]


def test_stage_five_ai_delivery_review_uses_gateway_and_persists_review_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)
    delivery_body = save_delivery_document(client, experiment_session, student)
    acceptance_body = save_acceptance_package(client, experiment_session, student)
    operations_body = save_operations_guide(client, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/ai-delivery-review",
        headers=auth_headers(student),
    )

    assert response.status_code == 201
    body = response.json()
    artifact_body = body["artifact"]
    review_content = artifact_body["content_json"]
    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_5_delivery_review")
    )
    assert ai_log is not None
    assert body["ai_call_log_id"] == str(ai_log.id)
    assert ai_log.provider == "fake"
    assert ai_log.request_metadata_json["payload_keys"] == [
        "acceptance_package",
        "acceptance_package_artifact_id",
        "delivery_document",
        "delivery_document_artifact_id",
        "operations_guide",
        "operations_guide_artifact_id",
        "rubric",
        "stage_4_ai_test_review",
        "stage_4_ai_test_review_artifact_id",
        "stage_4_dify_implementation",
        "stage_4_dify_implementation_artifact_id",
        "stage_4_test_report",
        "stage_4_test_report_artifact_id",
        "stage_blueprint",
        "stage_key",
    ]
    assert artifact_body["artifact_type"] == "stage_5_ai_delivery_review"
    assert artifact_body["stage_key"] == "stage_5"
    assert review_content["review_summary"].startswith("Fake stage_5_delivery_review response")
    assert review_content["delivery_completeness"]["has_final_agent_url"] is True
    assert review_content["delivery_completeness"]["core_feature_count"] == 3
    assert review_content["acceptance_risks"] == ["长问题下回答引用证据不够稳定"]
    assert review_content["operations_risks"] == [
        "导入 CSV 字段不一致",
        "长问题需要拆分提问",
        "MES 导出字段仍需人工清洗",
        "多轮记忆只覆盖当前会话",
    ]
    assert review_content["improvement_suggestions"] == [
        "补充 SOP 分块标题",
        "增加范围外问题负样例",
    ]
    assert review_content["final_readiness"] == "ready_with_disclosed_risks"
    assert review_content["ai_call_log_id"] == str(ai_log.id)
    assert review_content["delivery_document_artifact_id"] == delivery_body["artifact"]["id"]
    assert review_content["acceptance_package_artifact_id"] == acceptance_body["artifact"]["id"]
    assert review_content["operations_guide_artifact_id"] == operations_body["artifact"]["id"]
    assert review_content["stage_4_dify_implementation_artifact_id"]
    assert review_content["stage_4_test_report_artifact_id"]
    assert review_content["stage_4_ai_test_review_artifact_id"]
    assert review_content["rubric"]["stage_key"] == "stage_5"
    assert review_content["rubric"]["version"] == 1


def test_stage_five_completion_requires_artifacts_then_completes_session(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, student)

    missing_all_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/complete",
        headers=auth_headers(student),
    )
    assert missing_all_response.status_code == 409

    save_delivery_document(client, experiment_session, student)
    save_acceptance_package(client, experiment_session, student)
    save_operations_guide(client, experiment_session, student)
    missing_review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/complete",
        headers=auth_headers(student),
    )
    assert missing_review_response.status_code == 409

    review_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/ai-delivery-review",
        headers=auth_headers(student),
    )
    assert review_response.status_code == 201
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_5/stage-five/complete",
        headers=auth_headers(student),
    )

    assert complete_response.status_code == 200
    body = complete_response.json()
    db_session.refresh(experiment_session)
    assert body["completed_stage_key"] == "stage_5"
    assert body["completed_stage_status"] == "completed"
    assert body["session_status"] == "completed"
    assert get_stage(db_session, experiment_session, "stage_5").status == StageStatus.COMPLETED
    assert experiment_session.status == SessionStatus.COMPLETED
    assert experiment_session.completed_at is not None


@pytest.mark.parametrize(
    ("operation", "payload_factory"),
    [
        ("delivery-document", delivery_document_payload),
        ("acceptance-package", acceptance_package_payload),
        ("operations-guide", operations_guide_payload),
        ("ai-delivery-review", lambda: None),
        ("complete", lambda: None),
    ],
)
def test_student_cannot_operate_another_students_stage_five_session(
    client: TestClient,
    db_session: Session,
    operation: str,
    payload_factory: Callable[[], dict[str, object] | None],
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    complete_stage_four_and_unlock_stage_five(client, db_session, experiment_session, owner)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email=f"other.stage5.{operation}@example.edu",
        password_hash="disabled",
        full_name="Other Stage Five Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        f"/stages/stage_5/stage-five/{operation}",
        headers=auth_headers(other_student),
        json=payload_factory(),
    )

    assert response.status_code == 404
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.artifact_type.like("stage_5_%"))
    ) == 0
