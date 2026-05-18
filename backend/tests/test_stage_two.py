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
from app.models import AiCallLog, Artifact, Course, ExperimentSession, StageRecord, User, YellowFlag
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


def requirements_document_payload() -> dict[str, object]:
    return {
        "project_background": "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
        "current_business_process": "质检员记录异常后，生产负责人手工汇总质检记录和不合格品处置单。",
        "pain_points": ["审厂材料人工整理耗时", "质检异常追溯断点多"],
        "requirement_goals": ["让生产负责人快速生成质检追溯摘要", "降低审厂前资料准备压力"],
        "acceptance_criteria": ["输入异常编号后能返回关联质检记录摘要", "输出内容能标记缺失字段"],
        "constraints": ["不增加一线录入负担", "优先使用现有 MES 导出数据"],
        "source_evidence_artifact_ids": [],
    }


def feasibility_report_payload() -> dict[str, object]:
    return {
        "data_sources": ["MES 质检记录", "不合格品处理单", "审厂检查清单"],
        "data_quality_assessment": "MES 字段基本可用，但班组备注和异常编号关联质量不稳定。",
        "data_gaps": ["需要确认异常编号与处置单的稳定关联字段"],
        "data_feasibility_conclusion": "needs_supplement",
        "ai_capable_scope": "AI 可以生成追溯摘要、检查缺失字段并提示补充材料。",
        "ai_limitations": "AI 不能自动修复源系统数据，也不能替代质检责任判断。",
        "technical_risks": ["字段映射不稳定会影响召回准确性"],
        "technical_feasibility_conclusion": "conditional",
        "expected_benefits": "缩短审厂材料准备时间，并减少跨部门反复沟通。",
        "implementation_cost": "先用两周完成小范围试点，暂不改造 MES。",
        "roi_conclusion": "conditional",
        "overall_recommendation": "adjust_scope",
    }


def technical_solution_payload() -> dict[str, object]:
    return {
        "knowledge_base_strategy": "structured",
        "knowledge_base_rationale": "核心数据来自 MES 导出和处置单，结构化字段比纯文档更关键。",
        "agent_type": "workflow",
        "agent_type_rationale": "审厂资料生成有明确步骤，需要按异常编号检索、汇总、校验缺失项。",
        "data_flow": "MES 导出 CSV 和处置单进入知识库，智能体按异常编号检索并生成追溯摘要。",
        "deployment_option": "local_demo",
        "deployment_rationale": "MVP 先用本地演示验证流程，不接生产 MES。",
        "technical_risks": ["结构化字段不稳定时需要人工补录和映射表维护"],
        "stage_three_starting_point": "优先盘点 MES 导出字段和处置单字段，设计结构化知识入库方案。",
        "stage_four_build_plan": "在 Dify 中先搭建工作流型应用，输入异常编号后输出追溯摘要和缺失字段。",
    }


def stage_two_section_responses() -> dict[str, dict[str, object]]:
    return {
        "requirements_context": {
            "project_background": "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
            "current_business_process": "质检员记录异常后，生产负责人手工汇总质检记录和不合格品处置单。",
            "evidence_summary": "阶段一访谈确认审厂材料整理主要依赖人工补齐。",
        },
        "requirements_scope": {
            "pain_points": ["审厂材料人工整理耗时", "质检异常追溯断点多"],
            "requirement_goals": ["让生产负责人快速生成质检追溯摘要", "降低审厂前资料准备压力"],
            "out_of_scope": ["暂不直接改造生产 MES"],
        },
        "requirements_acceptance": {
            "acceptance_criteria": ["输入异常编号后能返回关联质检记录摘要", "输出内容能标记缺失字段"],
            "constraints": ["不增加一线录入负担", "优先使用现有 MES 导出数据"],
            "open_questions": ["需要确认异常编号与处置单的稳定关联字段"],
        },
        "feasibility_data": {
            "data_sources": ["MES 质检记录", "不合格品处理单", "审厂检查清单"],
            "data_quality_assessment": "MES 字段基本可用，但班组备注和异常编号关联质量不稳定。",
            "data_gaps": ["需要确认异常编号与处置单的稳定关联字段"],
            "data_feasibility_conclusion": "needs_supplement",
        },
        "feasibility_technical": {
            "ai_capable_scope": "AI 可以生成追溯摘要、检查缺失字段并提示补充材料。",
            "ai_limitations": "AI 不能自动修复源系统数据，也不能替代质检责任判断。",
            "technical_risks": ["字段映射不稳定会影响召回准确性"],
            "technical_feasibility_conclusion": "conditional",
        },
        "feasibility_value": {
            "expected_benefits": "缩短审厂材料准备时间，并减少跨部门反复沟通。",
            "implementation_cost": "先用两周完成小范围试点，暂不改造 MES。",
            "roi_conclusion": "conditional",
            "overall_recommendation": "adjust_scope",
        },
        "technical_route": {
            "knowledge_base_strategy": "structured",
            "knowledge_base_rationale": "核心数据来自 MES 导出和处置单，结构化字段比纯文档更关键。",
            "agent_type": "workflow",
            "agent_type_rationale": "审厂资料生成有明确步骤，需要按异常编号检索、汇总、校验缺失项。",
        },
        "technical_flow": {
            "data_flow": "MES 导出 CSV 和处置单进入知识库，智能体按异常编号检索并生成追溯摘要。",
            "deployment_option": "local_demo",
            "deployment_rationale": "MVP 先用本地演示验证流程，不接生产 MES。",
        },
        "technical_handoff": {
            "technical_risks": ["结构化字段不稳定时需要人工补录和映射表维护"],
            "stage_three_starting_point": "优先盘点 MES 导出字段和处置单字段，设计结构化知识入库方案。",
            "stage_four_build_plan": "在 Dify 中先搭建工作流型应用，输入异常编号后输出追溯摘要和缺失字段。",
        },
    }


def save_stage_two_section_draft(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    document_type: str,
    section_key: str,
    student_responses: dict[str, object] | None = None,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/section-draft",
        headers=auth_headers(student),
        json={
            "document_type": document_type,
            "section_key": section_key,
            "student_responses": student_responses or stage_two_section_responses()[section_key],
            "evidence_artifact_ids": [],
            "student_reflection": "我已对照阶段一证据检查这一小节的判断。",
        },
    )
    assert response.status_code == 201
    return response.json()


def review_stage_two_section(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    document_type: str,
    section_key: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/section-review",
        headers=auth_headers(student),
        json={"document_type": document_type, "section_key": section_key},
    )
    assert response.status_code == 201
    return response.json()


def submit_stage_two_section(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    document_type: str,
    section_key: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/section-submit",
        headers=auth_headers(student),
        json={"document_type": document_type, "section_key": section_key},
    )
    assert response.status_code == 201
    return response.json()


def complete_guided_stage_two_section(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    document_type: str,
    section_key: str,
) -> dict[str, object]:
    save_stage_two_section_draft(
        client,
        experiment_session,
        student,
        document_type=document_type,
        section_key=section_key,
    )
    review_stage_two_section(
        client,
        experiment_session,
        student,
        document_type=document_type,
        section_key=section_key,
    )
    return submit_stage_two_section(
        client,
        experiment_session,
        student,
        document_type=document_type,
        section_key=section_key,
    )


def compose_stage_two_document(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    document_type: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/document-from-sections",
        headers=auth_headers(student),
        json={"document_type": document_type},
    )
    assert response.status_code == 201
    return response.json()


def save_requirements_document(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/requirements-document",
        headers=auth_headers(student),
        json=requirements_document_payload(),
    )
    assert response.status_code == 201
    return response.json()


def save_feasibility_report(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/feasibility-report",
        headers=auth_headers(student),
        json=feasibility_report_payload(),
    )
    assert response.status_code == 201
    return response.json()


def save_technical_solution(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/technical-solution",
        headers=auth_headers(student),
        json=technical_solution_payload(),
    )
    assert response.status_code == 201
    return response.json()


def request_document_review(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    document_type: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/document-review",
        headers=auth_headers(student),
        json={"document_type": document_type},
    )
    assert response.status_code == 201
    return response.json()


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


def test_stage_two_new_document_chain_requires_previous_review(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)
    save_requirements_document(client, experiment_session, student)

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/feasibility-report",
        headers=auth_headers(student),
        json=feasibility_report_payload(),
    )

    assert response.status_code == 409
    assert "requirements document review" in response.json()["detail"]


def test_stage_two_new_document_chain_reviews_and_completion_create_yellow_debt(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)

    requirements_body = save_requirements_document(client, experiment_session, student)
    requirements_review = request_document_review(
        client,
        experiment_session,
        student,
        "requirements_document",
    )
    feasibility_body = save_feasibility_report(client, experiment_session, student)
    feasibility_review = request_document_review(
        client,
        experiment_session,
        student,
        "feasibility_report",
    )
    technical_body = save_technical_solution(client, experiment_session, student)
    technical_review = request_document_review(
        client,
        experiment_session,
        student,
        "technical_solution",
    )
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/complete",
        headers=auth_headers(student),
    )

    assert requirements_body["artifact"]["artifact_type"] == "stage_2_requirements_document"
    assert feasibility_body["artifact"]["artifact_type"] == "stage_2_feasibility_report"
    assert technical_body["artifact"]["artifact_type"] == "stage_2_technical_solution"
    assert requirements_review["artifact"]["content_json"]["document_type"] == "requirements_document"
    assert feasibility_review["artifact"]["content_json"]["document_type"] == "feasibility_report"
    assert technical_review["artifact"]["content_json"]["document_type"] == "technical_solution"
    assert feasibility_review["artifact"]["content_json"]["yellow_flags"]
    assert technical_review["artifact"]["content_json"]["yellow_flags"]
    assert complete_response.status_code == 200
    assert get_stage(db_session, experiment_session, "stage_2").status == StageStatus.COMPLETED
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.NOT_STARTED
    assert db_session.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(
            Artifact.session_id == experiment_session.id,
            Artifact.stage_key == "stage_2",
            Artifact.artifact_type.in_(
                [
                    "stage_2_requirements_document",
                    "stage_2_feasibility_report",
                    "stage_2_technical_solution",
                    "stage_2_document_review",
                ]
            ),
        )
    ) == 6
    yellow_flags = db_session.scalars(
        select(YellowFlag).where(
            YellowFlag.session_id == experiment_session.id,
            YellowFlag.source_stage_key == "stage_2",
        )
    ).all()
    assert len(yellow_flags) >= 2
    assert {flag.impact_stage_key for flag in yellow_flags} >= {"stage_3", "stage_4"}


def test_stage_two_guided_section_requires_ai_review_before_submission_and_composition(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)
    save_stage_two_section_draft(
        client,
        experiment_session,
        student,
        document_type="requirements_document",
        section_key="requirements_context",
    )

    blocked_submit = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/section-submit",
        headers=auth_headers(student),
        json={"document_type": "requirements_document", "section_key": "requirements_context"},
    )
    assert blocked_submit.status_code == 409
    assert "section review" in blocked_submit.json()["detail"]

    review = review_stage_two_section(
        client,
        experiment_session,
        student,
        document_type="requirements_document",
        section_key="requirements_context",
    )
    submitted = submit_stage_two_section(
        client,
        experiment_session,
        student,
        document_type="requirements_document",
        section_key="requirements_context",
    )
    incomplete_compose = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/document-from-sections",
        headers=auth_headers(student),
        json={"document_type": "requirements_document"},
    )

    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_2_section_review")
    )
    assert ai_log is not None
    assert review["ai_call_log_id"] == str(ai_log.id)
    assert review["artifact"]["artifact_type"] == "stage_2_section_review"
    assert review["artifact"]["content_json"]["can_submit"] is True
    assert review["artifact"]["content_json"]["section_key"] == "requirements_context"
    assert submitted["artifact"]["artifact_type"] == "stage_2_section_submission"
    assert submitted["artifact"]["status"] == "submitted"
    assert incomplete_compose.status_code == 409
    assert "section submissions" in incomplete_compose.json()["detail"]


def test_stage_two_guided_sections_compose_documents_and_support_completion(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    unlock_stage_two(client, db_session, experiment_session, student)

    for section_key in [
        "requirements_context",
        "requirements_scope",
        "requirements_acceptance",
    ]:
        complete_guided_stage_two_section(
            client,
            experiment_session,
            student,
            document_type="requirements_document",
            section_key=section_key,
        )
    requirements_body = compose_stage_two_document(
        client,
        experiment_session,
        student,
        document_type="requirements_document",
    )
    requirements_review = request_document_review(
        client,
        experiment_session,
        student,
        "requirements_document",
    )

    for section_key in [
        "feasibility_data",
        "feasibility_technical",
        "feasibility_value",
    ]:
        complete_guided_stage_two_section(
            client,
            experiment_session,
            student,
            document_type="feasibility_report",
            section_key=section_key,
        )
    feasibility_body = compose_stage_two_document(
        client,
        experiment_session,
        student,
        document_type="feasibility_report",
    )
    feasibility_review = request_document_review(
        client,
        experiment_session,
        student,
        "feasibility_report",
    )

    for section_key in ["technical_route", "technical_flow", "technical_handoff"]:
        complete_guided_stage_two_section(
            client,
            experiment_session,
            student,
            document_type="technical_solution",
            section_key=section_key,
        )
    technical_body = compose_stage_two_document(
        client,
        experiment_session,
        student,
        document_type="technical_solution",
    )
    technical_review = request_document_review(
        client,
        experiment_session,
        student,
        "technical_solution",
    )
    complete_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-two/complete",
        headers=auth_headers(student),
    )

    assert requirements_body["artifact"]["artifact_type"] == "stage_2_requirements_document"
    assert requirements_body["artifact"]["content_json"]["generated_from_sections"] is True
    assert requirements_body["artifact"]["content_json"]["project_background"].startswith("汽车零部件工厂")
    assert feasibility_body["artifact"]["artifact_type"] == "stage_2_feasibility_report"
    assert feasibility_body["artifact"]["content_json"]["data_feasibility_conclusion"] == "needs_supplement"
    assert technical_body["artifact"]["artifact_type"] == "stage_2_technical_solution"
    assert technical_body["artifact"]["content_json"]["knowledge_base_strategy"] == "structured"
    assert requirements_review["artifact"]["content_json"]["document_type"] == "requirements_document"
    assert feasibility_review["artifact"]["content_json"]["document_type"] == "feasibility_report"
    assert technical_review["artifact"]["content_json"]["document_type"] == "technical_solution"
    assert complete_response.status_code == 200
    assert get_stage(db_session, experiment_session, "stage_2").status == StageStatus.COMPLETED
    assert get_stage(db_session, experiment_session, "stage_3").status == StageStatus.NOT_STARTED
    assert (
        db_session.scalar(
            select(func.count())
            .select_from(Artifact)
            .where(
                Artifact.session_id == experiment_session.id,
                Artifact.stage_key == "stage_2",
                Artifact.artifact_type == "stage_2_section_submission",
            )
        )
        == 9
    )


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
