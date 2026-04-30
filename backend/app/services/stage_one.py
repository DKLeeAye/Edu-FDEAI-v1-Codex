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
    StageBlueprint,
    StageRecord,
)
from app.models.enums import ArtifactStatus, SessionStatus, StageStatus, UserRole
from app.schemas.stage_one import StageOneSummaryRequest
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_ONE_KEY = "stage_1"
STAGE_ONE_INTERVIEW_USAGE = "stage_1_customer_interview"
STAGE_ONE_INTERVIEW_ARTIFACT_TYPE = "stage_1_interview_turn"
STAGE_ONE_SUMMARY_ARTIFACT_TYPE = "stage_1_problem_summary"


@dataclass(frozen=True)
class StageOneScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageOneInterviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    user_message: str
    ai_customer_response: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageOneSummaryResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


def ask_ai_customer(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    message: str,
) -> StageOneInterviewResult:
    normalized_message = message.strip()
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )

    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_ONE_INTERVIEW_USAGE,
            input_text=normalized_message,
            request_payload=_build_ai_customer_payload(scope),
        ),
    )

    _mark_stage_one_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_ONE_INTERVIEW_ARTIFACT_TYPE,
        title="阶段一 AI 客户访谈记录",
        content_json={
            "user_message": normalized_message,
            "ai_customer_response": ai_response.content,
            "ai_call_log_id": str(ai_response.call_log_id) if ai_response.call_log_id else None,
        },
        status=ArtifactStatus.DRAFT,
    )

    return StageOneInterviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        user_message=normalized_message,
        ai_customer_response=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def save_problem_summary(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneSummaryRequest,
) -> StageOneSummaryResult:
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _mark_stage_one_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_ONE_SUMMARY_ARTIFACT_TYPE,
        title="阶段一问题发现总结",
        content_json=payload.model_dump(),
        status=ArtifactStatus.DRAFT,
    )
    return StageOneSummaryResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def _get_stage_one_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageOneScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage one")
    if stage_key != STAGE_ONE_KEY:
        raise ResourceNotFoundError("Stage one endpoint only supports stage_1")

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
            StageRecord.stage_key == STAGE_ONE_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage one session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    if stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage one is locked")
    return StageOneScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _build_ai_customer_payload(scope: StageOneScope) -> dict[str, Any]:
    manifest = scope.package_version.content_manifest_json or {}
    return {
        "stage_key": scope.stage_record.stage_key,
        "stage_title": scope.stage_blueprint.title,
        "stage_blueprint": scope.stage_blueprint.blueprint_json,
        "package_version_id": str(scope.package_version.id),
        "scenario": manifest.get("scenario"),
        "company_profile": manifest.get("company_profile"),
        "customer_persona": manifest.get("stage_1_ai_customer_persona", {}),
    }


def _mark_stage_one_started(scope: StageOneScope) -> None:
    now = datetime.now(UTC)
    if scope.stage_record.status == StageStatus.NOT_STARTED:
        scope.stage_record.status = StageStatus.IN_PRACTICE
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now
