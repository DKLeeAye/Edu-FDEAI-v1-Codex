from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.ai_runtime.gateway import AiRuntimeScope
from app.ai_runtime.stage_one import (
    run_stage_one_guided_turn,
    run_stage_one_practice_evaluation,
    run_stage_one_practice_turn,
)
from app.ai_runtime.stage_one.customer_config import (
    GUIDED_LEVEL_KEYS,
    next_guided_level,
    resolve_customer_persona,
)
from app.models import (
    Artifact,
    Course,
    ExperimentPackageVersion,
    ExperimentSession,
    StageOneGuidedAttempt,
    StageOneGuidedTurn,
    StageBlueprint,
    StageRecord,
)
from app.models.enums import ArtifactStatus, SessionStatus, StageStatus, UserRole
from app.schemas.stage_one import (
    StageOneGuidedTurnRequest,
    StageOneSummaryRequest,
    StageOneVisitNotesRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_ONE_KEY = "stage_1"
STAGE_ONE_INTERVIEW_ARTIFACT_TYPE = "stage_1_interview_turn"
STAGE_ONE_SUMMARY_ARTIFACT_TYPE = "stage_1_problem_summary"
STAGE_ONE_VISIT_NOTES_ARTIFACT_TYPE = "stage_1_visit_notes"
STAGE_ONE_EVALUATION_ARTIFACT_TYPE = "stage_1_evaluation"


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
class StageOneGuidedTrainingResult:
    attempt: StageOneGuidedAttempt
    customer_persona: dict[str, Any]
    turns: list[StageOneGuidedTurn]


@dataclass(frozen=True)
class StageOneGuidedTurnResult:
    attempt: StageOneGuidedAttempt
    turn: StageOneGuidedTurn


@dataclass(frozen=True)
class StageOneGuidedLevelCompletionResult:
    attempt: StageOneGuidedAttempt


@dataclass(frozen=True)
class StageOneSummaryResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageOneVisitNotesResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageOneEvaluationResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageOneCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    unlocked_stage_record: StageRecord


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

    ai_response = run_stage_one_practice_turn(
        session,
        scope=_runtime_scope(scope, current_user),
        stage_key=scope.stage_record.stage_key,
        stage_title=scope.stage_blueprint.title,
        stage_blueprint=scope.stage_blueprint.blueprint_json,
        manifest=scope.package_version.content_manifest_json or {},
        student_message=normalized_message,
        conversation_history=_practice_conversation_history(
            _artifacts_of_type(
                session,
                stage_record=scope.stage_record,
                artifact_type=STAGE_ONE_INTERVIEW_ARTIFACT_TYPE,
            )
        ),
        practice_context=_practice_context(session, stage_record=scope.stage_record),
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
            "ai_customer_response": ai_response["customer_response"],
            "ai_call_log_id": str(ai_response["customer_call_log_id"])
            if ai_response.get("customer_call_log_id")
            else None,
        },
        status=ArtifactStatus.DRAFT,
    )

    return StageOneInterviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        user_message=normalized_message,
        ai_customer_response=ai_response["customer_response"],
        ai_call_log_id=ai_response.get("customer_call_log_id"),
        artifact=artifact,
    )


def get_guided_training(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageOneGuidedTrainingResult:
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    attempt = _get_or_create_guided_attempt(session, scope=scope, current_user=current_user)
    turns = _get_guided_turns(session, attempt=attempt)
    customer_persona = resolve_customer_persona(
        scope.package_version.content_manifest_json or {},
        mode="guided",
    )
    return StageOneGuidedTrainingResult(
        attempt=attempt,
        customer_persona=customer_persona,
        turns=turns,
    )


def create_guided_training_turn(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneGuidedTurnRequest,
) -> StageOneGuidedTurnResult:
    normalized_message = payload.message.strip()
    if payload.level_key not in GUIDED_LEVEL_KEYS:
        raise ResourceNotFoundError("Guided training level not found")
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    attempt = _get_or_create_guided_attempt(session, scope=scope, current_user=current_user)
    if attempt.status == "completed":
        if payload.level_key != GUIDED_LEVEL_KEYS[-1]:
            raise ConflictError("Completed guided training can only append closing turns")
    if payload.level_key != attempt.active_level:
        raise ConflictError("Guided training turn must target the active level")
    previous_turns = _get_guided_turns(session, attempt=attempt)
    ai_result = run_stage_one_guided_turn(
        session,
        scope=_runtime_scope(scope, current_user),
        stage_key=scope.stage_record.stage_key,
        stage_title=scope.stage_blueprint.title,
        stage_blueprint=scope.stage_blueprint.blueprint_json,
        manifest=scope.package_version.content_manifest_json or {},
        level_key=payload.level_key,
        student_message=normalized_message,
        conversation_history=_guided_conversation_history(previous_turns),
    )
    _mark_stage_one_started(scope)
    turn = StageOneGuidedTurn(
        tenant_id=scope.stage_record.tenant_id,
        institution_id=scope.stage_record.institution_id,
        course_id=scope.stage_record.course_id,
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        attempt_id=attempt.id,
        student_user_id=current_user.id,
        level_key=payload.level_key,
        student_message=normalized_message,
        customer_response=ai_result["customer_response"],
        feedback_json=ai_result["feedback"],
        customer_call_log_id=ai_result.get("customer_call_log_id"),
        feedback_call_log_id=ai_result.get("feedback_call_log_id"),
    )
    session.add(turn)
    _apply_guided_level_progress(
        attempt,
        level_key=payload.level_key,
        can_continue=bool(ai_result.get("feedback", {}).get("can_continue")),
    )
    session.commit()
    session.refresh(attempt)
    session.refresh(turn)
    return StageOneGuidedTurnResult(attempt=attempt, turn=turn)


def complete_guided_training_level(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    level_key: str,
) -> StageOneGuidedLevelCompletionResult:
    if level_key not in GUIDED_LEVEL_KEYS:
        raise ResourceNotFoundError("Guided training level not found")
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    attempt = _get_or_create_guided_attempt(session, scope=scope, current_user=current_user)
    if level_key in (attempt.completed_levels_json or []):
        return StageOneGuidedLevelCompletionResult(attempt=attempt)
    if level_key != attempt.active_level:
        raise ConflictError("Only the active guided training level can be completed")
    latest_turn = _latest_guided_turn_for_level(session, attempt=attempt, level_key=level_key)
    if latest_turn is None or not latest_turn.feedback_json.get("can_continue"):
        raise ConflictError("AI feedback must allow this guided training level before completion")
    _apply_guided_level_progress(attempt, level_key=level_key, can_continue=True)
    _mark_stage_one_started(scope)
    session.commit()
    session.refresh(attempt)
    return StageOneGuidedLevelCompletionResult(attempt=attempt)


def _apply_guided_level_progress(
    attempt: StageOneGuidedAttempt,
    *,
    level_key: str,
    can_continue: bool,
) -> None:
    if not can_continue:
        return
    completed_levels = list(attempt.completed_levels_json or [])
    if level_key not in completed_levels:
        completed_levels.append(level_key)
    next_level = next_guided_level(level_key)
    attempt.completed_levels_json = completed_levels
    attempt.active_level = next_level or level_key
    attempt.status = "completed" if next_level is None else "in_progress"


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
        content_json=payload.model_dump(mode="json", exclude_unset=True),
        status=ArtifactStatus.DRAFT,
    )
    return StageOneSummaryResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_visit_notes(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneVisitNotesRequest,
) -> StageOneVisitNotesResult:
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    if not _artifact_exists(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_ONE_INTERVIEW_ARTIFACT_TYPE,
    ):
        raise ConflictError("Stage one interview is required before visit notes")
    _mark_stage_one_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_ONE_VISIT_NOTES_ARTIFACT_TYPE,
        title="阶段一拜访间整理",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageOneVisitNotesResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def generate_practice_evaluation(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageOneEvaluationResult:
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    interview_artifacts = _artifacts_of_type(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_ONE_INTERVIEW_ARTIFACT_TYPE,
    )
    visit_notes_artifact = _latest_artifact_of_type(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_ONE_VISIT_NOTES_ARTIFACT_TYPE,
    )
    problem_summary_artifact = _latest_artifact_of_type(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_ONE_SUMMARY_ARTIFACT_TYPE,
    )
    if not interview_artifacts or visit_notes_artifact is None or problem_summary_artifact is None:
        raise ConflictError("Stage one formal interview, visit notes and problem summary are required")

    evaluation = run_stage_one_practice_evaluation(
        session,
        scope=_runtime_scope(scope, current_user),
        stage_key=scope.stage_record.stage_key,
        stage_title=scope.stage_blueprint.title,
        stage_blueprint=scope.stage_blueprint.blueprint_json,
        manifest=scope.package_version.content_manifest_json or {},
        interview_turns=_interview_turn_payloads(interview_artifacts),
        visit_notes=visit_notes_artifact.content_json,
        problem_summary=problem_summary_artifact.content_json,
    )
    _mark_stage_one_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_ONE_EVALUATION_ARTIFACT_TYPE,
        title="阶段一项目实战综合评估",
        content_json=evaluation["evaluation"],
        status=ArtifactStatus.DRAFT,
    )
    return StageOneEvaluationResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def complete_stage_one(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageOneCompletionResult:
    scope = _get_stage_one_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    required_artifacts = (
        STAGE_ONE_INTERVIEW_ARTIFACT_TYPE,
        STAGE_ONE_VISIT_NOTES_ARTIFACT_TYPE,
        STAGE_ONE_SUMMARY_ARTIFACT_TYPE,
        STAGE_ONE_EVALUATION_ARTIFACT_TYPE,
    )
    if not all(
        _artifact_exists(session, stage_record=scope.stage_record, artifact_type=artifact_type)
        for artifact_type in required_artifacts
    ):
        raise ConflictError(
            "Stage one requires formal interview, visit notes, problem summary and evaluation"
        )

    stage_two = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key="stage_2",
    )

    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now
    if stage_two.status == StageStatus.LOCKED:
        stage_two.status = StageStatus.NOT_STARTED
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(stage_two)

    return StageOneCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        unlocked_stage_record=stage_two,
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


def _artifact_exists(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
) -> bool:
    return (
        session.scalar(
            select(Artifact.id).where(
                Artifact.tenant_id == stage_record.tenant_id,
                Artifact.institution_id == stage_record.institution_id,
                Artifact.course_id == stage_record.course_id,
                Artifact.session_id == stage_record.session_id,
                Artifact.stage_record_id == stage_record.id,
                Artifact.stage_key == stage_record.stage_key,
                Artifact.artifact_type == artifact_type,
            )
        )
        is not None
    )


def _get_scoped_stage_record(
    session: Session,
    *,
    scope: StageOneScope,
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


def _runtime_scope(scope: StageOneScope, current_user: CurrentUserContext) -> AiRuntimeScope:
    return AiRuntimeScope(
        tenant_id=scope.stage_record.tenant_id,
        institution_id=scope.stage_record.institution_id,
        course_id=scope.stage_record.course_id,
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        user_id=current_user.id,
    )


def _get_or_create_guided_attempt(
    session: Session,
    *,
    scope: StageOneScope,
    current_user: CurrentUserContext,
) -> StageOneGuidedAttempt:
    attempt = session.scalar(
        select(StageOneGuidedAttempt).where(
            StageOneGuidedAttempt.tenant_id == scope.stage_record.tenant_id,
            StageOneGuidedAttempt.institution_id == scope.stage_record.institution_id,
            StageOneGuidedAttempt.course_id == scope.stage_record.course_id,
            StageOneGuidedAttempt.session_id == scope.stage_record.session_id,
            StageOneGuidedAttempt.stage_record_id == scope.stage_record.id,
            StageOneGuidedAttempt.student_user_id == current_user.id,
        )
    )
    if attempt is not None:
        return attempt

    attempt = StageOneGuidedAttempt(
        tenant_id=scope.stage_record.tenant_id,
        institution_id=scope.stage_record.institution_id,
        course_id=scope.stage_record.course_id,
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        student_user_id=current_user.id,
        active_level=GUIDED_LEVEL_KEYS[0],
        completed_levels_json=[],
        status="in_progress",
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


def _get_guided_turns(
    session: Session,
    *,
    attempt: StageOneGuidedAttempt,
) -> list[StageOneGuidedTurn]:
    return list(
        session.scalars(
            select(StageOneGuidedTurn)
            .where(StageOneGuidedTurn.attempt_id == attempt.id)
            .order_by(StageOneGuidedTurn.created_at, StageOneGuidedTurn.id)
        ).all()
    )


def _latest_guided_turn_for_level(
    session: Session,
    *,
    attempt: StageOneGuidedAttempt,
    level_key: str,
) -> StageOneGuidedTurn | None:
    return session.scalars(
        select(StageOneGuidedTurn)
        .where(
            StageOneGuidedTurn.attempt_id == attempt.id,
            StageOneGuidedTurn.level_key == level_key,
        )
        .order_by(StageOneGuidedTurn.created_at.desc(), StageOneGuidedTurn.id.desc())
    ).first()


def _artifacts_of_type(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
) -> list[Artifact]:
    return list(
        session.scalars(
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
            .order_by(Artifact.created_at, Artifact.id)
        ).all()
    )


def _latest_artifact_of_type(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
) -> Artifact | None:
    return session.scalars(
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
    ).first()


def _practice_conversation_history(artifacts: list[Artifact]) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for artifact in artifacts:
        user_message = str(artifact.content_json.get("user_message") or "").strip()
        customer_response = str(artifact.content_json.get("ai_customer_response") or "").strip()
        if user_message:
            history.append({"role": "user", "content": user_message})
        if customer_response:
            history.append({"role": "assistant", "content": customer_response})
    return history


def _interview_turn_payloads(artifacts: list[Artifact]) -> list[dict[str, Any]]:
    return [
        {
            "artifact_id": str(artifact.id),
            "student_message": str(artifact.content_json.get("user_message") or ""),
            "customer_response": str(artifact.content_json.get("ai_customer_response") or ""),
            "created_at": artifact.created_at.isoformat() if artifact.created_at else None,
            "ai_call_log_id": artifact.content_json.get("ai_call_log_id"),
        }
        for artifact in artifacts
    ]


def _practice_context(session: Session, *, stage_record: StageRecord) -> dict[str, Any]:
    visit_notes = _latest_artifact_of_type(
        session,
        stage_record=stage_record,
        artifact_type=STAGE_ONE_VISIT_NOTES_ARTIFACT_TYPE,
    )
    problem_summary = _latest_artifact_of_type(
        session,
        stage_record=stage_record,
        artifact_type=STAGE_ONE_SUMMARY_ARTIFACT_TYPE,
    )
    return {
        "visit_notes": visit_notes.content_json if visit_notes is not None else None,
        "problem_summary": problem_summary.content_json if problem_summary is not None else None,
    }


def _guided_conversation_history(turns: list[StageOneGuidedTurn]) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for turn in turns:
        history.append({"role": "user", "content": turn.student_message})
        history.append({"role": "assistant", "content": turn.customer_response})
    return history


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
