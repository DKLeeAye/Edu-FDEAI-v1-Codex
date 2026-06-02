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
)
from app.models.enums import ArtifactStatus, RubricStatus, SessionStatus, StageStatus, UserRole
from app.schemas.stage_three import (
    StageThreeCaseStudyRecordRequest,
    StageThreeKnowledgeDecisionRequest,
    StageThreeLabExperimentRecordRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_TWO_KEY = "stage_2"
STAGE_THREE_KEY = "stage_3"
STAGE_FOUR_KEY = "stage_4"
STAGE_TWO_SOLUTION_ARTIFACT_TYPE = "stage_2_solution_definition"
STAGE_TWO_TECHNICAL_ARTIFACT_TYPE = "stage_2_technical_solution"
STAGE_THREE_REVIEW_USAGE = "stage_3_knowledge_decision_review"
STAGE_THREE_DECISION_ARTIFACT_TYPE = "stage_3_knowledge_decision"
STAGE_THREE_AI_REVIEW_ARTIFACT_TYPE = "stage_3_ai_review"
STAGE_THREE_CASE_STUDY_ARTIFACT_TYPE = "stage_3_case_study_record"
STAGE_THREE_LAB_EXPERIMENT_ARTIFACT_TYPE = "stage_3_lab_experiment_record"


@dataclass(frozen=True)
class StageThreeScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageThreeKnowledgeDecisionResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageThreeProcessArtifactResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageThreeAiReviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageThreeCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    unlocked_stage_record: StageRecord


def save_knowledge_decision(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageThreeKnowledgeDecisionRequest,
) -> StageThreeKnowledgeDecisionResult:
    scope = _get_stage_three_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_three_writable(scope)
    _ensure_stage_two_completed(session, scope)
    _mark_stage_three_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_THREE_DECISION_ARTIFACT_TYPE,
        title="知识工程决策",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageThreeKnowledgeDecisionResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_case_study_record(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageThreeCaseStudyRecordRequest,
) -> StageThreeProcessArtifactResult:
    scope = _get_stage_three_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_three_writable(scope)
    _ensure_stage_two_completed(session, scope)
    _mark_stage_three_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_THREE_CASE_STUDY_ARTIFACT_TYPE,
        title="阶段三案例学习记录",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.SUBMITTED,
    )
    return StageThreeProcessArtifactResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_lab_experiment_record(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageThreeLabExperimentRecordRequest,
) -> StageThreeProcessArtifactResult:
    scope = _get_stage_three_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_three_writable(scope)
    _ensure_stage_two_completed(session, scope)
    _mark_stage_three_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_THREE_LAB_EXPERIMENT_ARTIFACT_TYPE,
        title="阶段三五层实验观察记录",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.SUBMITTED,
    )
    return StageThreeProcessArtifactResult(
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
) -> StageThreeAiReviewResult:
    scope = _get_stage_three_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_three_unlocked(scope)
    stage_two = _ensure_stage_two_completed(session, scope)
    decision_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_THREE_DECISION_ARTIFACT_TYPE,
    )
    if decision_artifact is None:
        raise ConflictError("Stage three knowledge decision is required before AI review")

    solution_artifact = _get_stage_two_handoff_artifact(session, stage_two)
    if solution_artifact is None:
        raise ConflictError("Stage two technical solution is required for stage three AI review")

    rubric = _get_stage_three_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_THREE_REVIEW_USAGE,
            input_text=_build_review_input(
                knowledge_decision_artifact=decision_artifact,
                solution_artifact=solution_artifact,
            ),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "stage_blueprint": scope.stage_blueprint.blueprint_json,
                "stage_2_solution_artifact_id": str(solution_artifact.id),
                "stage_2_solution_definition": solution_artifact.content_json,
                "knowledge_decision_artifact_id": str(decision_artifact.id),
                "knowledge_decision": decision_artifact.content_json,
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_review_content(
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        decision_artifact=decision_artifact,
        solution_artifact=solution_artifact,
        rubric=rubric,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_THREE_AI_REVIEW_ARTIFACT_TYPE,
        title="阶段三 AI 知识工程决策评审",
        content_json=review_content,
        status=ArtifactStatus.REVIEWED,
    )
    return StageThreeAiReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def complete_stage_three(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageThreeCompletionResult:
    scope = _get_stage_three_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_three_unlocked(scope)
    _ensure_stage_two_completed(session, scope)
    decision_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_THREE_DECISION_ARTIFACT_TYPE,
    )
    review_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_THREE_AI_REVIEW_ARTIFACT_TYPE,
    )
    risk_boundary_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_THREE_LAB_EXPERIMENT_ARTIFACT_TYPE,
    )
    has_formal_gate = decision_artifact is not None and review_artifact is not None
    has_vnext_risk_gate = _is_completed_vnext_risk_boundary_artifact(risk_boundary_artifact)
    if not has_formal_gate and not has_vnext_risk_gate:
        raise ConflictError(
            "Stage three knowledge decision and AI review, or completed RAG risk boundary record, are required"
        )

    stage_four = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_FOUR_KEY,
    )
    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if stage_four.status == StageStatus.LOCKED:
        stage_four.status = StageStatus.NOT_STARTED
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(stage_four)
    return StageThreeCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        unlocked_stage_record=stage_four,
    )


def _is_completed_vnext_risk_boundary_artifact(artifact: Artifact | None) -> bool:
    if artifact is None:
        return False
    content = artifact.content_json if isinstance(artifact.content_json, dict) else {}
    parameters = content.get("selected_parameters")
    if not isinstance(parameters, dict) or parameters.get("experiment_type") != "risk_boundary":
        return False

    boundary_fields = parameters.get("boundary_fields")
    checks = parameters.get("checks")
    judgments = parameters.get("risk_case_judgments")
    if not isinstance(boundary_fields, dict) or not isinstance(checks, dict) or not isinstance(judgments, dict):
        return False

    required_fields = ("scope", "evidence", "manual", "refusal")
    required_cases = ("authority", "conflict", "missing", "supported")
    return (
        all(len(str(boundary_fields.get(key) or "").strip()) >= 8 for key in required_fields)
        and all(bool(checks.get(key)) for key in checks)
        and len(checks) >= 4
        and all(str(judgments.get(key) or "").strip() for key in required_cases)
    )


def _get_stage_three_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageThreeScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage three")
    if stage_key != STAGE_THREE_KEY:
        raise ResourceNotFoundError("Stage three endpoint only supports stage_3")

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
            StageRecord.stage_key == STAGE_THREE_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage three session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    return StageThreeScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _ensure_stage_three_unlocked(scope: StageThreeScope) -> None:
    if scope.stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage three is locked")


def _ensure_stage_three_writable(scope: StageThreeScope) -> None:
    _ensure_stage_three_unlocked(scope)
    if scope.stage_record.status == StageStatus.COMPLETED:
        raise ConflictError("Stage three is already completed")


def _ensure_stage_two_completed(session: Session, scope: StageThreeScope) -> StageRecord:
    stage_two = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_TWO_KEY,
    )
    if stage_two.status != StageStatus.COMPLETED:
        raise ConflictError("Stage two must be completed before stage three")
    return stage_two


def _mark_stage_three_started(scope: StageThreeScope) -> None:
    now = datetime.now(UTC)
    if scope.stage_record.status == StageStatus.NOT_STARTED:
        scope.stage_record.status = StageStatus.IN_PRACTICE
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now


def _get_latest_stage_artifact(
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


def _get_stage_three_rubric(session: Session, scope: StageThreeScope) -> Rubric | None:
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
    scope: StageThreeScope,
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


def _get_stage_two_handoff_artifact(
    session: Session,
    stage_record: StageRecord,
) -> Artifact | None:
    return _get_latest_stage_artifact(
        session,
        stage_record=stage_record,
        artifact_type=STAGE_TWO_TECHNICAL_ARTIFACT_TYPE,
    ) or _get_latest_stage_artifact(
        session,
        stage_record=stage_record,
        artifact_type=STAGE_TWO_SOLUTION_ARTIFACT_TYPE,
    )


def _build_review_input(
    *,
    knowledge_decision_artifact: Artifact,
    solution_artifact: Artifact,
) -> str:
    decision = knowledge_decision_artifact.content_json
    solution = solution_artifact.content_json
    return "\n".join(
        [
            str(solution.get("solution_title") or solution.get("stage_three_starting_point") or "").strip(),
            str(solution.get("problem_summary") or solution.get("knowledge_base_rationale") or "").strip(),
            str(decision.get("knowledge_goal", "")).strip(),
            str(decision.get("selected_strategy", "")).strip(),
            str(decision.get("strategy_rationale", "")).strip(),
        ]
    ).strip()


def _build_review_content(
    *,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    decision_artifact: Artifact,
    solution_artifact: Artifact,
    rubric: Rubric | None,
) -> dict[str, Any]:
    decision = decision_artifact.content_json
    data_quality_risks = _as_string_list(decision.get("data_quality_risks"))
    required_knowledge_types = _as_string_list(decision.get("required_knowledge_types"))
    selected_strategy = str(decision.get("selected_strategy") or "unknown")
    return {
        "review_summary": ai_content,
        "strategy_fit": f"{selected_strategy}_strategy_needs_stage_four_validation",
        "missing_knowledge_risks": [
            f"阶段四需要验证“{knowledge_type}”是否已有足够可用来源。"
            for knowledge_type in required_knowledge_types
        ],
        "data_quality_warnings": data_quality_risks,
        "stage_4_readiness": (
            "ready_with_data_quality_risks"
            if data_quality_risks
            else "ready_for_stage_4_build"
        ),
        "suggested_improvements": [
            "把阶段二数据风险逐条映射到阶段四知识库构建检查项。",
            "明确每类知识来源的清洗负责人、更新频率和验收样例。",
            "在阶段四 Dify 构建计划中预留召回失败和证据不足的调试步骤。",
        ],
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "knowledge_decision_artifact_id": str(decision_artifact.id),
        "stage_2_solution_artifact_id": str(solution_artifact.id),
        "rubric": _rubric_snapshot(rubric),
    }


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if value is None:
        return []
    return [str(value)]


def _rubric_snapshot(rubric: Rubric | None) -> dict[str, Any] | None:
    if rubric is None:
        return None
    return {
        "id": str(rubric.id),
        "stage_key": rubric.stage_key,
        "version": rubric.version,
        "name": rubric.name,
    }
