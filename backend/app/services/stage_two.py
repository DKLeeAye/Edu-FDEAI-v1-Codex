from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayRequest, invoke_ai
from app.models import (
    Artifact,
    Course,
    ExperimentPackageVersion,
    ExperimentSession,
    Rubric,
    StageBlueprint,
    StageRecord,
    YellowFlag,
)
from app.models.enums import (
    ArtifactStatus,
    RubricStatus,
    SessionStatus,
    StageStatus,
    UserRole,
    YellowFlagSeverity,
    YellowFlagStatus,
)
from app.schemas.stage_two import (
    StageTwoDocumentFromSectionsRequest,
    StageTwoDocumentReviewRequest,
    StageTwoFeasibilityReportRequest,
    StageTwoRequirementsDocumentRequest,
    StageTwoSectionActionRequest,
    StageTwoSectionDraftRequest,
    StageTwoSolutionDefinitionRequest,
    StageTwoTechnicalSolutionRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_TWO_KEY = "stage_2"
STAGE_THREE_KEY = "stage_3"
STAGE_FOUR_KEY = "stage_4"
STAGE_TWO_REVIEW_USAGE = "stage_2_feasibility_review"
STAGE_TWO_DOCUMENT_REVIEW_USAGE = "stage_2_document_review"
STAGE_TWO_SECTION_REVIEW_USAGE = "stage_2_section_review"
STAGE_TWO_SOLUTION_ARTIFACT_TYPE = "stage_2_solution_definition"
STAGE_TWO_AI_REVIEW_ARTIFACT_TYPE = "stage_2_ai_review"
STAGE_TWO_SECTION_DRAFT_ARTIFACT_TYPE = "stage_2_section_draft"
STAGE_TWO_SECTION_REVIEW_ARTIFACT_TYPE = "stage_2_section_review"
STAGE_TWO_SECTION_SUBMISSION_ARTIFACT_TYPE = "stage_2_section_submission"
STAGE_TWO_REQUIREMENTS_ARTIFACT_TYPE = "stage_2_requirements_document"
STAGE_TWO_FEASIBILITY_ARTIFACT_TYPE = "stage_2_feasibility_report"
STAGE_TWO_TECHNICAL_ARTIFACT_TYPE = "stage_2_technical_solution"
STAGE_TWO_DOCUMENT_REVIEW_ARTIFACT_TYPE = "stage_2_document_review"
REQUIREMENTS_DOCUMENT = "requirements_document"
FEASIBILITY_REPORT = "feasibility_report"
TECHNICAL_SOLUTION = "technical_solution"
DOCUMENT_ARTIFACT_TYPES = {
    REQUIREMENTS_DOCUMENT: STAGE_TWO_REQUIREMENTS_ARTIFACT_TYPE,
    FEASIBILITY_REPORT: STAGE_TWO_FEASIBILITY_ARTIFACT_TYPE,
    TECHNICAL_SOLUTION: STAGE_TWO_TECHNICAL_ARTIFACT_TYPE,
}


@dataclass(frozen=True)
class StageTwoSectionSpec:
    key: str
    document_type: str
    title: str
    teaching_goal: str
    required_fields: tuple[str, ...]
    checkpoints: tuple[str, ...]


SECTION_SPECS: dict[str, StageTwoSectionSpec] = {
    "requirements_context": StageTwoSectionSpec(
        key="requirements_context",
        document_type=REQUIREMENTS_DOCUMENT,
        title="背景与现状",
        teaching_goal="把阶段一访谈事实转成客户能读懂的项目背景和业务现状。",
        required_fields=("project_background", "current_business_process"),
        checkpoints=("是否引用阶段一事实", "是否说明现有流程和责任人", "是否避免直接跳到技术方案"),
    ),
    "requirements_scope": StageTwoSectionSpec(
        key="requirements_scope",
        document_type=REQUIREMENTS_DOCUMENT,
        title="痛点与目标",
        teaching_goal="从访谈噪声中提炼真正要解决的痛点，并转成清晰的需求目标。",
        required_fields=("pain_points", "requirement_goals"),
        checkpoints=("痛点是否具体", "目标是否对应痛点", "是否写清不做什么"),
    ),
    "requirements_acceptance": StageTwoSectionSpec(
        key="requirements_acceptance",
        document_type=REQUIREMENTS_DOCUMENT,
        title="验收与约束",
        teaching_goal="把需求目标转成可观察的验收标准，并记录当前项目边界。",
        required_fields=("acceptance_criteria", "constraints"),
        checkpoints=("验收标准是否可测试", "约束是否来自客户现实", "是否保留待确认问题"),
    ),
    "feasibility_data": StageTwoSectionSpec(
        key="feasibility_data",
        document_type=FEASIBILITY_REPORT,
        title="数据可行性",
        teaching_goal="判断当前数据是否支撑 AI 方案，而不是只罗列数据名称。",
        required_fields=("data_sources", "data_quality_assessment", "data_feasibility_conclusion"),
        checkpoints=("是否列出关键数据来源", "是否判断数据质量", "是否说明数据差距"),
    ),
    "feasibility_technical": StageTwoSectionSpec(
        key="feasibility_technical",
        document_type=FEASIBILITY_REPORT,
        title="技术可行性",
        teaching_goal="区分 AI 能做、不能做和必须在后续验证的技术风险。",
        required_fields=("ai_capable_scope", "ai_limitations", "technical_feasibility_conclusion"),
        checkpoints=("是否避免过度承诺", "是否说明人工判断边界", "是否形成技术风险"),
    ),
    "feasibility_value": StageTwoSectionSpec(
        key="feasibility_value",
        document_type=FEASIBILITY_REPORT,
        title="价值与综合建议",
        teaching_goal="用收益、成本和范围建议判断项目是否值得继续推进。",
        required_fields=("expected_benefits", "implementation_cost", "roi_conclusion", "overall_recommendation"),
        checkpoints=("是否说明业务收益", "是否估计实施成本", "建议是否与数据和技术结论一致"),
    ),
    "technical_route": StageTwoSectionSpec(
        key="technical_route",
        document_type=TECHNICAL_SOLUTION,
        title="知识库与智能体路线",
        teaching_goal="基于数据形态和业务流程选择知识库策略与智能体类型。",
        required_fields=(
            "knowledge_base_strategy",
            "knowledge_base_rationale",
            "agent_type",
            "agent_type_rationale",
        ),
        checkpoints=("知识库路线是否匹配数据形态", "智能体类型是否匹配业务流程", "是否解释选择依据"),
    ),
    "technical_flow": StageTwoSectionSpec(
        key="technical_flow",
        document_type=TECHNICAL_SOLUTION,
        title="数据流与部署方式",
        teaching_goal="让后续实现者知道数据如何进入系统、如何输出，以及当前部署边界。",
        required_fields=("data_flow", "deployment_option", "deployment_rationale"),
        checkpoints=("数据流是否闭环", "部署方式是否适合 MVP", "是否避免接入生产系统过早"),
    ),
    "technical_handoff": StageTwoSectionSpec(
        key="technical_handoff",
        document_type=TECHNICAL_SOLUTION,
        title="后续阶段交接",
        teaching_goal="把技术方案转成阶段三知识工程和阶段四构建的起点。",
        required_fields=("stage_three_starting_point", "stage_four_build_plan"),
        checkpoints=("是否给出阶段三数据盘点起点", "是否给出阶段四构建计划", "是否保留技术风险"),
    ),
}

DOCUMENT_SECTION_KEYS: dict[str, tuple[str, ...]] = {
    REQUIREMENTS_DOCUMENT: (
        "requirements_context",
        "requirements_scope",
        "requirements_acceptance",
    ),
    FEASIBILITY_REPORT: (
        "feasibility_data",
        "feasibility_technical",
        "feasibility_value",
    ),
    TECHNICAL_SOLUTION: (
        "technical_route",
        "technical_flow",
        "technical_handoff",
    ),
}


@dataclass(frozen=True)
class StageTwoScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageTwoSolutionDefinitionResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageTwoDocumentResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageTwoAiReviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageTwoCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    unlocked_stage_record: StageRecord


def save_section_draft(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoSectionDraftRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_writable(scope)
    spec = _get_section_spec(payload.document_type, payload.section_key)
    _ensure_document_sections_unlocked(session, scope=scope, document_type=payload.document_type)
    _mark_stage_two_started(scope)
    content_json = {
        "document_type": payload.document_type,
        "section_key": payload.section_key,
        "section_title": spec.title,
        "teaching_goal": spec.teaching_goal,
        "quality_checkpoints": list(spec.checkpoints),
        "required_fields": list(spec.required_fields),
        "student_responses": payload.student_responses,
        "evidence_artifact_ids": [str(artifact_id) for artifact_id in payload.evidence_artifact_ids],
        "student_reflection": payload.student_reflection,
    }
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_SECTION_DRAFT_ARTIFACT_TYPE,
        title=f"{spec.title}小节草稿",
        content_json=content_json,
        status=ArtifactStatus.DRAFT,
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_section_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoSectionActionRequest,
) -> StageTwoAiReviewResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_unlocked(scope)
    spec = _get_section_spec(payload.document_type, payload.section_key)
    _ensure_document_sections_unlocked(session, scope=scope, document_type=payload.document_type)
    draft_artifact = _get_latest_section_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_TWO_SECTION_DRAFT_ARTIFACT_TYPE,
        document_type=payload.document_type,
        section_key=payload.section_key,
    )
    if draft_artifact is None:
        raise ConflictError("Stage two section draft is required before section review")

    rubric = _get_stage_two_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_TWO_SECTION_REVIEW_USAGE,
            input_text=_build_section_review_input(spec, draft_artifact),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "document_type": payload.document_type,
                "section_key": payload.section_key,
                "section_spec": _section_spec_snapshot(spec),
                "draft_artifact_id": str(draft_artifact.id),
                "student_responses": draft_artifact.content_json.get("student_responses"),
                "stage_one_evidence": _stage_one_evidence_snapshot(session, scope),
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_section_review_content(
        spec=spec,
        draft_artifact=draft_artifact,
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        rubric=rubric,
    )
    review_artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_SECTION_REVIEW_ARTIFACT_TYPE,
        title=f"{spec.title}小节 AI 追问",
        content_json=review_content,
        status=(
            ArtifactStatus.REVISION_REQUIRED
            if review_content["red_flags"]
            else ArtifactStatus.REVIEWED
        ),
    )
    return StageTwoAiReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=review_artifact,
    )


def submit_section(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoSectionActionRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_writable(scope)
    spec = _get_section_spec(payload.document_type, payload.section_key)
    _ensure_document_sections_unlocked(session, scope=scope, document_type=payload.document_type)
    draft_artifact = _get_latest_section_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_TWO_SECTION_DRAFT_ARTIFACT_TYPE,
        document_type=payload.document_type,
        section_key=payload.section_key,
    )
    if draft_artifact is None:
        raise ConflictError("Stage two section draft is required before section submission")
    review_artifact = _get_latest_section_review(
        session,
        stage_record=scope.stage_record,
        document_type=payload.document_type,
        section_key=payload.section_key,
        source_draft_artifact_id=draft_artifact.id,
    )
    if review_artifact is None:
        raise ConflictError("Stage two section review is required before section submission")
    if not review_artifact.content_json.get("can_submit") or _review_has_red_flags(review_artifact):
        raise ConflictError("Stage two section still has blocking review issues")

    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_SECTION_SUBMISSION_ARTIFACT_TYPE,
        title=f"{spec.title}小节提交",
        content_json={
            "document_type": payload.document_type,
            "section_key": payload.section_key,
            "section_title": spec.title,
            "source_draft_artifact_id": str(draft_artifact.id),
            "source_review_artifact_id": str(review_artifact.id),
            "submitted_content": draft_artifact.content_json.get("student_responses") or {},
            "evidence_artifact_ids": draft_artifact.content_json.get("evidence_artifact_ids") or [],
            "student_reflection": draft_artifact.content_json.get("student_reflection"),
            "teacher_visible_process": {
                "teaching_goal": spec.teaching_goal,
                "ai_follow_up_questions": review_artifact.content_json.get("follow_up_questions") or [],
                "revision_advice": review_artifact.content_json.get("revision_advice") or [],
            },
        },
        status=ArtifactStatus.SUBMITTED,
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def compose_document_from_sections(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoDocumentFromSectionsRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_writable(scope)
    _ensure_document_sections_unlocked(session, scope=scope, document_type=payload.document_type)
    submissions = _latest_section_submissions(
        session,
        stage_record=scope.stage_record,
        document_type=payload.document_type,
    )
    required_section_keys = DOCUMENT_SECTION_KEYS[payload.document_type]
    missing_sections = [
        SECTION_SPECS[section_key].title
        for section_key in required_section_keys
        if section_key not in submissions
    ]
    if missing_sections:
        raise ConflictError(
            "Stage two section submissions are required: " + ", ".join(missing_sections)
        )

    content_json = _compose_formal_document_content(
        payload.document_type,
        [submissions[section_key] for section_key in required_section_keys],
    )
    artifact = _create_stage_two_document_artifact(
        session,
        current_user=current_user,
        scope=scope,
        artifact_type=DOCUMENT_ARTIFACT_TYPES[payload.document_type],
        title=_formal_document_title(payload.document_type),
        content_json=content_json,
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_requirements_document(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoRequirementsDocumentRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    artifact = _create_stage_two_document_artifact(
        session,
        current_user=current_user,
        scope=scope,
        artifact_type=STAGE_TWO_REQUIREMENTS_ARTIFACT_TYPE,
        title="需求文档",
        content_json=payload.model_dump(mode="json"),
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_feasibility_report(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoFeasibilityReportRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_document_reviewed(
        session,
        scope=scope,
        document_type=REQUIREMENTS_DOCUMENT,
        missing_message="Stage two requirements document review is required before feasibility report",
    )
    artifact = _create_stage_two_document_artifact(
        session,
        current_user=current_user,
        scope=scope,
        artifact_type=STAGE_TWO_FEASIBILITY_ARTIFACT_TYPE,
        title="可行性报告",
        content_json=payload.model_dump(mode="json"),
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_technical_solution(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoTechnicalSolutionRequest,
) -> StageTwoDocumentResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_document_reviewed(
        session,
        scope=scope,
        document_type=FEASIBILITY_REPORT,
        missing_message="Stage two feasibility report review is required before technical solution",
    )
    artifact = _create_stage_two_document_artifact(
        session,
        current_user=current_user,
        scope=scope,
        artifact_type=STAGE_TWO_TECHNICAL_ARTIFACT_TYPE,
        title="总体技术方案",
        content_json=payload.model_dump(mode="json"),
    )
    return StageTwoDocumentResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_document_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoDocumentReviewRequest,
) -> StageTwoAiReviewResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_unlocked(scope)
    document_type = payload.document_type
    artifact_type = DOCUMENT_ARTIFACT_TYPES[document_type]
    document_artifact = _get_latest_stage_two_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=artifact_type,
    )
    if document_artifact is None:
        raise ConflictError(f"Stage two {document_type} is required before document review")

    if document_type == FEASIBILITY_REPORT:
        _ensure_document_reviewed(
            session,
            scope=scope,
            document_type=REQUIREMENTS_DOCUMENT,
            missing_message="Stage two requirements document review is required before feasibility review",
        )
    if document_type == TECHNICAL_SOLUTION:
        _ensure_document_reviewed(
            session,
            scope=scope,
            document_type=FEASIBILITY_REPORT,
            missing_message="Stage two feasibility report review is required before technical solution review",
        )

    rubric = _get_stage_two_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_TWO_DOCUMENT_REVIEW_USAGE,
            input_text=_build_document_review_input(document_type, document_artifact),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "document_type": document_type,
                "document_artifact_id": str(document_artifact.id),
                "document_content": document_artifact.content_json,
                "stage_one_evidence": _stage_one_evidence_snapshot(session, scope),
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_document_review_content(
        document_type=document_type,
        document_artifact=document_artifact,
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        rubric=rubric,
    )
    review_artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_DOCUMENT_REVIEW_ARTIFACT_TYPE,
        title=f"{_document_title(document_type)}评审",
        content_json=review_content,
        status=(
            ArtifactStatus.REVISION_REQUIRED
            if review_content["red_flags"]
            else ArtifactStatus.REVIEWED
        ),
    )
    _persist_yellow_flags(
        session,
        scope=scope,
        source_artifact=document_artifact,
        yellow_flags=review_content["yellow_flags"],
    )
    session.commit()
    session.refresh(review_artifact)
    return StageTwoAiReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=review_artifact,
    )


def save_solution_definition(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageTwoSolutionDefinitionRequest,
) -> StageTwoSolutionDefinitionResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_writable(scope)
    _mark_stage_two_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_SOLUTION_ARTIFACT_TYPE,
        title=payload.solution_title,
        content_json=payload.model_dump(mode="json", exclude_none=True),
        status=ArtifactStatus.DRAFT,
    )
    return StageTwoSolutionDefinitionResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_ai_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageTwoAiReviewResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_unlocked(scope)
    solution_artifact = _get_latest_stage_two_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_TWO_SOLUTION_ARTIFACT_TYPE,
    )
    if solution_artifact is None:
        raise ConflictError("Stage two solution definition is required before AI review")

    rubric = _get_stage_two_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_TWO_REVIEW_USAGE,
            input_text=_build_review_input(solution_artifact),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "stage_blueprint": scope.stage_blueprint.blueprint_json,
                "solution_artifact_id": str(solution_artifact.id),
                "solution_definition": solution_artifact.content_json,
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_review_content(
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        solution_artifact=solution_artifact,
        rubric=rubric,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_TWO_AI_REVIEW_ARTIFACT_TYPE,
        title="阶段二 AI 可行性评审",
        content_json=review_content,
        status=ArtifactStatus.REVIEWED,
    )
    return StageTwoAiReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def complete_stage_two(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageTwoCompletionResult:
    scope = _get_stage_two_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_two_unlocked(scope)
    new_chain_artifacts = {
        document_type: _get_latest_stage_two_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=artifact_type,
        )
        for document_type, artifact_type in DOCUMENT_ARTIFACT_TYPES.items()
    }
    if any(artifact is not None for artifact in new_chain_artifacts.values()):
        missing_documents = [
            _document_title(document_type)
            for document_type, artifact in new_chain_artifacts.items()
            if artifact is None
        ]
        if missing_documents:
            raise ConflictError(
                "Stage two formal documents are required: " + ", ".join(missing_documents)
            )
        for document_type in DOCUMENT_ARTIFACT_TYPES:
            _ensure_document_reviewed(
                session,
                scope=scope,
                document_type=document_type,
                missing_message=f"Stage two {_document_title(document_type)} review is required",
            )
        return _complete_stage_two_and_unlock_stage_three(session, scope)

    solution_artifact = _get_latest_stage_two_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_TWO_SOLUTION_ARTIFACT_TYPE,
    )
    review_artifact = _get_latest_stage_two_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_TWO_AI_REVIEW_ARTIFACT_TYPE,
    )
    if solution_artifact is None or review_artifact is None:
        raise ConflictError("Stage two solution definition and AI review are required")

    return _complete_stage_two_and_unlock_stage_three(session, scope)


def _complete_stage_two_and_unlock_stage_three(
    session: Session,
    scope: StageTwoScope,
) -> StageTwoCompletionResult:
    stage_three = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_THREE_KEY,
    )
    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if stage_three.status == StageStatus.LOCKED:
        stage_three.status = StageStatus.NOT_STARTED
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(stage_three)
    return StageTwoCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        unlocked_stage_record=stage_three,
    )


def _get_stage_two_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageTwoScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage two")
    if stage_key != STAGE_TWO_KEY:
        raise ResourceNotFoundError("Stage two endpoint only supports stage_2")

    statement = (
        select(
            Course,
            ExperimentSession,
            ExperimentPackageVersion,
            StageBlueprint,
            StageRecord,
        )
        .join(ExperimentSession, ExperimentSession.course_id == Course.id)
        .join(
            ExperimentPackageVersion,
            ExperimentPackageVersion.id == ExperimentSession.package_version_id,
        )
        .join(
            StageRecord,
            and_(
                StageRecord.session_id == ExperimentSession.id,
                StageRecord.course_id == Course.id,
            ),
        )
        .join(
            StageBlueprint,
            and_(
                StageBlueprint.package_version_id == ExperimentSession.package_version_id,
                StageBlueprint.stage_key == StageRecord.stage_key,
            ),
        )
        .where(
            ExperimentSession.id == session_id,
            ExperimentSession.student_user_id == current_user.id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            StageRecord.tenant_id == current_user.tenant_id,
            StageRecord.institution_id == current_user.institution_id,
            StageRecord.stage_key == STAGE_TWO_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage two session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    return StageTwoScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _ensure_stage_two_unlocked(scope: StageTwoScope) -> None:
    if scope.stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage two is locked")


def _ensure_stage_two_writable(scope: StageTwoScope) -> None:
    _ensure_stage_two_unlocked(scope)
    if scope.stage_record.status == StageStatus.COMPLETED:
        raise ConflictError("Stage two is already completed")


def _mark_stage_two_started(scope: StageTwoScope) -> None:
    now = datetime.now(UTC)
    if scope.stage_record.status == StageStatus.NOT_STARTED:
        scope.stage_record.status = StageStatus.IN_PRACTICE
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now


def _create_stage_two_document_artifact(
    session: Session,
    *,
    current_user: CurrentUserContext,
    scope: StageTwoScope,
    artifact_type: str,
    title: str,
    content_json: dict[str, Any],
) -> Artifact:
    _ensure_stage_two_writable(scope)
    _mark_stage_two_started(scope)
    return artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=artifact_type,
        title=title,
        content_json=content_json,
        status=ArtifactStatus.DRAFT,
    )


def _ensure_document_reviewed(
    session: Session,
    *,
    scope: StageTwoScope,
    document_type: str,
    missing_message: str,
) -> Artifact:
    document_artifact = _get_latest_stage_two_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=DOCUMENT_ARTIFACT_TYPES[document_type],
    )
    if document_artifact is None:
        raise ConflictError(f"Stage two {_document_title(document_type)} is required")
    review_artifact = _get_latest_document_review(
        session,
        stage_record=scope.stage_record,
        document_type=document_type,
        source_artifact_id=document_artifact.id,
    )
    if review_artifact is None:
        raise ConflictError(missing_message)
    if _review_has_red_flags(review_artifact):
        raise ConflictError(f"Stage two {_document_title(document_type)} has blocking review issues")
    return review_artifact


def _get_section_spec(document_type: str, section_key: str) -> StageTwoSectionSpec:
    spec = SECTION_SPECS[section_key]
    if spec.document_type != document_type:
        raise ConflictError("Stage two section does not belong to requested document")
    return spec


def _ensure_document_sections_unlocked(
    session: Session,
    *,
    scope: StageTwoScope,
    document_type: str,
) -> None:
    if document_type == FEASIBILITY_REPORT:
        _ensure_document_reviewed(
            session,
            scope=scope,
            document_type=REQUIREMENTS_DOCUMENT,
            missing_message="Stage two requirements document review is required before feasibility sections",
        )
    if document_type == TECHNICAL_SOLUTION:
        _ensure_document_reviewed(
            session,
            scope=scope,
            document_type=FEASIBILITY_REPORT,
            missing_message="Stage two feasibility report review is required before technical sections",
        )


def _get_latest_section_artifact(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
    document_type: str,
    section_key: str,
) -> Artifact | None:
    artifacts = session.scalars(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == artifact_type,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    ).all()
    for artifact in artifacts:
        if artifact.content_json.get("document_type") != document_type:
            continue
        if artifact.content_json.get("section_key") != section_key:
            continue
        return artifact
    return None


def _get_latest_section_review(
    session: Session,
    *,
    stage_record: StageRecord,
    document_type: str,
    section_key: str,
    source_draft_artifact_id: uuid.UUID | None = None,
) -> Artifact | None:
    reviews = session.scalars(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == STAGE_TWO_SECTION_REVIEW_ARTIFACT_TYPE,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    ).all()
    for review in reviews:
        if review.content_json.get("document_type") != document_type:
            continue
        if review.content_json.get("section_key") != section_key:
            continue
        if source_draft_artifact_id is not None and review.content_json.get(
            "source_draft_artifact_id"
        ) != str(source_draft_artifact_id):
            continue
        return review
    return None


def _latest_section_submissions(
    session: Session,
    *,
    stage_record: StageRecord,
    document_type: str,
) -> dict[str, Artifact]:
    artifacts = session.scalars(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == STAGE_TWO_SECTION_SUBMISSION_ARTIFACT_TYPE,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    ).all()
    submissions: dict[str, Artifact] = {}
    for artifact in artifacts:
        if artifact.content_json.get("document_type") != document_type:
            continue
        section_key = artifact.content_json.get("section_key")
        if not isinstance(section_key, str) or section_key in submissions:
            continue
        submissions[section_key] = artifact
    return submissions


def _get_latest_document_review(
    session: Session,
    *,
    stage_record: StageRecord,
    document_type: str,
    source_artifact_id: uuid.UUID | None = None,
) -> Artifact | None:
    reviews = session.scalars(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == STAGE_TWO_DOCUMENT_REVIEW_ARTIFACT_TYPE,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    ).all()
    for review in reviews:
        if review.content_json.get("document_type") != document_type:
            continue
        if source_artifact_id is not None and review.content_json.get("source_artifact_id") != str(
            source_artifact_id
        ):
            continue
        return review
    return None


def _review_has_red_flags(review_artifact: Artifact) -> bool:
    red_flags = review_artifact.content_json.get("red_flags") or []
    return isinstance(red_flags, list) and len(red_flags) > 0


def _get_latest_stage_two_artifact(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
) -> Artifact | None:
    return session.scalar(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == artifact_type,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    )


def _get_stage_two_rubric(session: Session, scope: StageTwoScope) -> Rubric | None:
    course_rubric = session.scalar(
        select(Rubric).where(
            Rubric.package_version_id == scope.package_version.id,
            Rubric.course_id == scope.course.id,
            Rubric.stage_key == scope.stage_record.stage_key,
            Rubric.status == RubricStatus.PUBLISHED,
        )
    )
    if course_rubric is not None:
        return course_rubric
    return session.scalar(
        select(Rubric).where(
            Rubric.package_version_id == scope.package_version.id,
            Rubric.course_id.is_(None),
            Rubric.stage_key == scope.stage_record.stage_key,
            Rubric.status == RubricStatus.PUBLISHED,
        )
    )


def _get_scoped_stage_record(
    session: Session,
    *,
    scope: StageTwoScope,
    stage_key: str,
) -> StageRecord:
    stage_record = session.scalar(
        select(StageRecord).where(
            StageRecord.tenant_id == scope.stage_record.tenant_id,
            StageRecord.institution_id == scope.stage_record.institution_id,
            StageRecord.course_id == scope.stage_record.course_id,
            StageRecord.session_id == scope.stage_record.session_id,
            StageRecord.stage_key == stage_key,
        )
    )
    if stage_record is None:
        raise ResourceNotFoundError(f"{stage_key} record not found")
    return stage_record


def _build_review_input(solution_artifact: Artifact) -> str:
    solution = solution_artifact.content_json
    title = solution.get("solution_title", "")
    problem_summary = solution.get("problem_summary") or solution.get("problem_statement_ref") or ""
    return f"{title}\n{problem_summary}".strip()


def _build_review_content(
    *,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    solution_artifact: Artifact,
    rubric: Rubric | None,
) -> dict[str, Any]:
    solution = solution_artifact.content_json
    risks = solution.get("feasibility_risks") or []
    if not isinstance(risks, list):
        risks = [str(risks)]
    return {
        "review_summary": ai_content,
        "feasibility_judgement": "needs_revision_review",
        "key_risks": risks,
        "suggested_improvements": [
            "补充阶段一访谈证据引用。",
            "明确数据源字段质量和系统依赖边界。",
            "将主要可行性风险转化为后续验证任务。",
        ],
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "rubric": _rubric_snapshot(rubric),
    }


def _build_section_review_input(spec: StageTwoSectionSpec, draft_artifact: Artifact) -> str:
    content = draft_artifact.content_json
    return (
        f"{_formal_document_title(spec.document_type)} - {spec.title}\n"
        f"教学目标：{spec.teaching_goal}\n"
        f"学生回答：{content.get('student_responses')}"
    ).strip()


def _build_section_review_content(
    *,
    spec: StageTwoSectionSpec,
    draft_artifact: Artifact,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    rubric: Rubric | None,
) -> dict[str, Any]:
    student_responses = draft_artifact.content_json.get("student_responses") or {}
    evidence_ids = draft_artifact.content_json.get("evidence_artifact_ids") or []
    red_flags = _derive_section_red_flags(spec, student_responses)
    yellow_flags = _derive_section_yellow_flags(spec, evidence_ids)
    return {
        "document_type": spec.document_type,
        "section_key": spec.key,
        "section_title": spec.title,
        "source_draft_artifact_id": str(draft_artifact.id),
        "review_summary": ai_content,
        "teaching_points": [
            spec.teaching_goal,
            "先判断业务和证据，再把判断写成文档语言。",
        ],
        "follow_up_questions": _section_follow_up_questions(spec, red_flags, yellow_flags),
        "revision_advice": _section_revision_advice(spec, red_flags, yellow_flags),
        "evidence_checks": _section_evidence_checks(evidence_ids),
        "red_flags": red_flags,
        "yellow_flags": yellow_flags,
        "can_submit": not red_flags,
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "rubric": _rubric_snapshot(rubric),
    }


def _derive_section_red_flags(
    spec: StageTwoSectionSpec,
    student_responses: object,
) -> list[dict[str, str]]:
    if not isinstance(student_responses, dict):
        return [
            {
                "flag_type": "invalid_section_response",
                "description": f"{spec.title}小节没有形成结构化回答。",
                "related_section": spec.title,
            }
        ]
    red_flags: list[dict[str, str]] = []
    for field_name in spec.required_fields:
        if not _has_response_value(student_responses.get(field_name)):
            red_flags.append(
                {
                    "flag_type": "missing_required_judgement",
                    "description": f"{spec.title}缺少关键判断：{field_name}",
                    "related_section": spec.title,
                }
            )
    return red_flags


def _derive_section_yellow_flags(
    spec: StageTwoSectionSpec,
    evidence_ids: object,
) -> list[dict[str, str]]:
    yellow_flags: list[dict[str, str]] = []
    if not isinstance(evidence_ids, list) or not evidence_ids:
        yellow_flags.append(
            _yellow_flag(
                flag_type="section_weak_evidence_link",
                description=f"{spec.title}小节尚未显式绑定阶段一证据，提交后仍需在文档评审中复核。",
                impact_stage_key=STAGE_TWO_KEY,
            )
        )
    return yellow_flags


def _section_follow_up_questions(
    spec: StageTwoSectionSpec,
    red_flags: list[dict[str, str]],
    yellow_flags: list[dict[str, str]],
) -> list[str]:
    if red_flags:
        return [
            f"你能补充{flag['description']}对应的阶段一证据或判断吗？"
            for flag in red_flags[:3]
        ]
    if yellow_flags:
        return [
            "这一节最能支撑判断的访谈证据是哪一条？",
            "如果教师追问依据不足，你会用什么客户事实回应？",
        ]
    return [f"请检查{spec.title}是否已经能直接汇入正式文档。"]


def _section_revision_advice(
    spec: StageTwoSectionSpec,
    red_flags: list[dict[str, str]],
    yellow_flags: list[dict[str, str]],
) -> list[str]:
    if red_flags:
        return [f"先补齐{spec.title}的必填判断，再重新请求 AI 追问。"]
    advice = [f"保留{spec.title}当前判断，可继续打磨表达和证据引用。"]
    if yellow_flags:
        advice.append("建议回到阶段一证据面板选择访谈记录、拜访间整理或问题总结作为依据。")
    return advice


def _section_evidence_checks(evidence_ids: object) -> list[str]:
    if isinstance(evidence_ids, list) and evidence_ids:
        return ["已绑定阶段一证据，文档整体评审会继续检查证据是否匹配。"]
    return ["未绑定阶段一证据，允许继续提交，但会形成待复核提示。"]


def _compose_formal_document_content(
    document_type: str,
    section_submissions: list[Artifact],
) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    source_section_artifact_ids: list[str] = []
    section_summaries: list[dict[str, str]] = []
    for submission in section_submissions:
        source_section_artifact_ids.append(str(submission.id))
        section_key = str(submission.content_json.get("section_key") or "")
        section_title = str(submission.content_json.get("section_title") or section_key)
        section_summaries.append({"section_key": section_key, "section_title": section_title})
        submitted_content = submission.content_json.get("submitted_content") or {}
        if isinstance(submitted_content, dict):
            merged.update(submitted_content)

    if document_type == REQUIREMENTS_DOCUMENT:
        content = {
            "project_background": _string_field(merged, "project_background"),
            "current_business_process": _string_field(merged, "current_business_process"),
            "pain_points": _as_string_list(merged.get("pain_points")),
            "requirement_goals": _as_string_list(merged.get("requirement_goals")),
            "acceptance_criteria": _as_string_list(merged.get("acceptance_criteria")),
            "constraints": _as_string_list(merged.get("constraints")),
            "source_evidence_artifact_ids": _unique_string_list(
                field
                for submission in section_submissions
                for field in _as_string_list(submission.content_json.get("evidence_artifact_ids"))
            ),
        }
    elif document_type == FEASIBILITY_REPORT:
        content = {
            "data_sources": _as_string_list(merged.get("data_sources")),
            "data_quality_assessment": _string_field(merged, "data_quality_assessment"),
            "data_gaps": _as_string_list(merged.get("data_gaps")),
            "data_feasibility_conclusion": _choice_field(
                merged,
                "data_feasibility_conclusion",
                "needs_supplement",
            ),
            "ai_capable_scope": _string_field(merged, "ai_capable_scope"),
            "ai_limitations": _string_field(merged, "ai_limitations"),
            "technical_risks": _as_string_list(merged.get("technical_risks")),
            "technical_feasibility_conclusion": _choice_field(
                merged,
                "technical_feasibility_conclusion",
                "conditional",
            ),
            "expected_benefits": _string_field(merged, "expected_benefits"),
            "implementation_cost": _string_field(merged, "implementation_cost"),
            "roi_conclusion": _choice_field(merged, "roi_conclusion", "conditional"),
            "overall_recommendation": _choice_field(merged, "overall_recommendation", "adjust_scope"),
        }
    else:
        content = {
            "knowledge_base_strategy": _choice_field(merged, "knowledge_base_strategy", "structured"),
            "knowledge_base_rationale": _string_field(merged, "knowledge_base_rationale"),
            "agent_type": _choice_field(merged, "agent_type", "workflow"),
            "agent_type_rationale": _string_field(merged, "agent_type_rationale"),
            "data_flow": _string_field(merged, "data_flow"),
            "deployment_option": _choice_field(merged, "deployment_option", "local_demo"),
            "deployment_rationale": _string_field(merged, "deployment_rationale"),
            "technical_risks": _as_string_list(merged.get("technical_risks")),
            "stage_three_starting_point": _string_field(merged, "stage_three_starting_point"),
            "stage_four_build_plan": _string_field(merged, "stage_four_build_plan"),
        }
    content["generated_from_sections"] = True
    content["source_section_artifact_ids"] = source_section_artifact_ids
    content["section_summaries"] = section_summaries
    return content


def _build_document_review_input(document_type: str, document_artifact: Artifact) -> str:
    content = document_artifact.content_json
    return f"{_document_title(document_type)}\n{content}".strip()


def _build_document_review_content(
    *,
    document_type: str,
    document_artifact: Artifact,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    rubric: Rubric | None,
) -> dict[str, Any]:
    content = document_artifact.content_json
    red_flags = _derive_red_flags(document_type, content)
    yellow_flags = _derive_yellow_flags(document_type, content)
    return {
        "document_type": document_type,
        "source_artifact_id": str(document_artifact.id),
        "review_summary": ai_content,
        "review_judgement": (
            "blocked"
            if red_flags
            else "conditional_pass"
            if yellow_flags
            else "approved"
        ),
        "red_flags": red_flags,
        "yellow_flags": yellow_flags,
        "suggested_improvements": _suggested_improvements(document_type, yellow_flags),
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "rubric": _rubric_snapshot(rubric),
    }


def _derive_red_flags(document_type: str, content: dict[str, Any]) -> list[dict[str, str]]:
    if document_type == FEASIBILITY_REPORT:
        if (
            content.get("data_feasibility_conclusion") == "not_feasible"
            and content.get("overall_recommendation") == "proceed"
        ):
            return [
                {
                    "flag_type": "feasibility_contradiction",
                    "description": "数据可行性结论为不可行，但综合建议仍然继续推进。",
                    "related_section": "综合可行性结论",
                }
            ]
    if document_type == TECHNICAL_SOLUTION:
        if content.get("knowledge_base_strategy") == "none":
            return [
                {
                    "flag_type": "knowledge_route_missing",
                    "description": "总体技术方案没有给出可支撑阶段三的知识库路线。",
                    "related_section": "知识库方案初选",
                }
            ]
    return []


def _derive_yellow_flags(document_type: str, content: dict[str, Any]) -> list[dict[str, str]]:
    yellow_flags: list[dict[str, str]] = []
    if document_type == REQUIREMENTS_DOCUMENT:
        evidence_ids = content.get("source_evidence_artifact_ids") or []
        if not evidence_ids:
            yellow_flags.append(
                _yellow_flag(
                    flag_type="weak_evidence_link",
                    description="需求文档尚未显式绑定阶段一访谈或总结证据。",
                    impact_stage_key=STAGE_TWO_KEY,
                )
            )
        if len(_as_string_list(content.get("acceptance_criteria"))) < 2:
            yellow_flags.append(
                _yellow_flag(
                    flag_type="thin_acceptance_criteria",
                    description="验收标准还不够具体，后续阶段五验收会缺少判定依据。",
                    impact_stage_key="stage_5",
                )
            )
    if document_type == FEASIBILITY_REPORT:
        for data_gap in _as_string_list(content.get("data_gaps"))[:5]:
            yellow_flags.append(
                _yellow_flag(
                    flag_type="data_gap",
                    description=f"数据可行性仍有待确认项：{data_gap}",
                    impact_stage_key=STAGE_THREE_KEY,
                )
            )
        for technical_risk in _as_string_list(content.get("technical_risks"))[:5]:
            yellow_flags.append(
                _yellow_flag(
                    flag_type="technical_risk",
                    description=f"技术可行性风险需要在构建阶段验证：{technical_risk}",
                    impact_stage_key=STAGE_FOUR_KEY,
                )
            )
        if content.get("overall_recommendation") == "adjust_scope":
            yellow_flags.append(
                _yellow_flag(
                    flag_type="scope_adjustment",
                    description="当前建议调整范围后推进，后续方案和构建任务需要保持收敛。",
                    impact_stage_key=STAGE_FOUR_KEY,
                )
            )
    if document_type == TECHNICAL_SOLUTION:
        for technical_risk in _as_string_list(content.get("technical_risks"))[:5]:
            yellow_flags.append(
                _yellow_flag(
                    flag_type="build_risk",
                    description=f"总体技术方案中的构建风险需要在阶段四回应：{technical_risk}",
                    impact_stage_key=STAGE_FOUR_KEY,
                )
            )
    return yellow_flags


def _yellow_flag(
    *,
    flag_type: str,
    description: str,
    impact_stage_key: str,
) -> dict[str, str]:
    return {
        "flag_type": flag_type,
        "severity": YellowFlagSeverity.MEDIUM.value,
        "description": description,
        "impact_stage_key": impact_stage_key,
    }


def _suggested_improvements(document_type: str, yellow_flags: list[dict[str, str]]) -> list[str]:
    base = {
        REQUIREMENTS_DOCUMENT: [
            "把每个核心需求绑定到阶段一访谈证据。",
            "把验收标准写成可观察、可测试的业务结果。",
        ],
        FEASIBILITY_REPORT: [
            "把数据差距拆成阶段三可检查的字段或样例问题。",
            "把技术风险转化为阶段四构建和测试任务。",
        ],
        TECHNICAL_SOLUTION: [
            "明确知识库路线、智能体类型和部署方式之间的一致性。",
            "把技术风险写入阶段四构建计划。",
        ],
    }[document_type]
    if yellow_flags:
        return base
    return ["当前文档已具备进入下一步的最小依据，后续仍可继续补充证据和表达。"]


def _persist_yellow_flags(
    session: Session,
    *,
    scope: StageTwoScope,
    source_artifact: Artifact,
    yellow_flags: list[dict[str, str]],
) -> None:
    for flag in yellow_flags:
        session.add(
            YellowFlag(
                tenant_id=scope.stage_record.tenant_id,
                institution_id=scope.stage_record.institution_id,
                course_id=scope.stage_record.course_id,
                session_id=scope.stage_record.session_id,
                source_stage_record_id=scope.stage_record.id,
                source_artifact_id=source_artifact.id,
                source_stage_key=scope.stage_record.stage_key,
                impact_stage_key=flag.get("impact_stage_key"),
                flag_type=flag["flag_type"],
                severity=YellowFlagSeverity(flag.get("severity", YellowFlagSeverity.MEDIUM.value)),
                description=flag["description"],
                status=YellowFlagStatus.OPEN,
            )
        )


def _stage_one_evidence_snapshot(session: Session, scope: StageTwoScope) -> list[dict[str, Any]]:
    artifacts = session.scalars(
        select(Artifact)
        .where(
            Artifact.tenant_id == scope.stage_record.tenant_id,
            Artifact.institution_id == scope.stage_record.institution_id,
            Artifact.course_id == scope.stage_record.course_id,
            Artifact.session_id == scope.stage_record.session_id,
            Artifact.stage_key == "stage_1",
            Artifact.artifact_type.in_(
                [
                    "stage_1_interview_turn",
                    "stage_1_visit_notes",
                    "stage_1_problem_summary",
                    "stage_1_evaluation",
                ]
            ),
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
        .limit(8)
    ).all()
    return [
        {
            "artifact_id": str(artifact.id),
            "artifact_type": artifact.artifact_type,
            "title": artifact.title,
            "content": artifact.content_json,
        }
        for artifact in artifacts
    ]


def _document_title(document_type: str) -> str:
    return {
        REQUIREMENTS_DOCUMENT: "requirements document",
        FEASIBILITY_REPORT: "feasibility report",
        TECHNICAL_SOLUTION: "technical solution",
    }[document_type]


def _formal_document_title(document_type: str) -> str:
    return {
        REQUIREMENTS_DOCUMENT: "需求文档",
        FEASIBILITY_REPORT: "可行性报告",
        TECHNICAL_SOLUTION: "总体技术方案",
    }[document_type]


def _section_spec_snapshot(spec: StageTwoSectionSpec) -> dict[str, Any]:
    return {
        "key": spec.key,
        "document_type": spec.document_type,
        "title": spec.title,
        "teaching_goal": spec.teaching_goal,
        "required_fields": list(spec.required_fields),
        "checkpoints": list(spec.checkpoints),
    }


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _unique_string_list(values: Any) -> list[str]:
    result: list[str] = []
    for value in values:
        text = str(value).strip()
        if text and text not in result:
            result.append(text)
    return result


def _string_field(values: dict[str, Any], key: str) -> str:
    value = values.get(key)
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return "\n".join(_as_string_list(value))
    if value is None:
        return ""
    return str(value).strip()


def _choice_field(values: dict[str, Any], key: str, fallback: str) -> str:
    value = values.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _has_response_value(value: Any) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(_has_response_value(item) for item in value)
    if isinstance(value, dict):
        return any(_has_response_value(item) for item in value.values())
    return value is not None


def _rubric_snapshot(rubric: Rubric | None) -> dict[str, Any] | None:
    if rubric is None:
        return None
    return {
        "id": str(rubric.id),
        "stage_key": rubric.stage_key,
        "version": rubric.version,
        "name": rubric.name,
    }
