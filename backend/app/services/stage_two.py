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
from app.schemas.stage_two import StageTwoSolutionDefinitionRequest
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_TWO_KEY = "stage_2"
STAGE_THREE_KEY = "stage_3"
STAGE_TWO_REVIEW_USAGE = "stage_2_feasibility_review"
STAGE_TWO_SOLUTION_ARTIFACT_TYPE = "stage_2_solution_definition"
STAGE_TWO_AI_REVIEW_ARTIFACT_TYPE = "stage_2_ai_review"


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


def _rubric_snapshot(rubric: Rubric | None) -> dict[str, Any] | None:
    if rubric is None:
        return None
    return {
        "id": str(rubric.id),
        "stage_key": rubric.stage_key,
        "version": rubric.version,
        "name": rubric.name,
    }
