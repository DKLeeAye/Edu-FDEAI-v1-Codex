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
from app.schemas.stage_five import (
    StageFiveAcceptancePackageRequest,
    StageFiveDeliveryDocumentRequest,
    StageFiveOperationsGuideRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_FOUR_KEY = "stage_4"
STAGE_FIVE_KEY = "stage_5"
STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE = "stage_4_dify_implementation"
STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE = "stage_4_test_report"
STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE = "stage_4_ai_test_review"
STAGE_FIVE_REVIEW_USAGE = "stage_5_delivery_review"
STAGE_FIVE_DELIVERY_DOCUMENT_ARTIFACT_TYPE = "stage_5_delivery_document"
STAGE_FIVE_ACCEPTANCE_PACKAGE_ARTIFACT_TYPE = "stage_5_acceptance_package"
STAGE_FIVE_OPERATIONS_GUIDE_ARTIFACT_TYPE = "stage_5_operations_guide"
STAGE_FIVE_AI_DELIVERY_REVIEW_ARTIFACT_TYPE = "stage_5_ai_delivery_review"


@dataclass(frozen=True)
class StageFiveScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageFiveArtifactResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFiveAiDeliveryReviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageFiveCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    experiment_session: ExperimentSession


def save_delivery_document(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveDeliveryDocumentRequest,
) -> StageFiveArtifactResult:
    scope = _get_stage_five_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_five_writable(scope)
    _ensure_stage_four_completed(session, scope)
    _mark_stage_five_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FIVE_DELIVERY_DOCUMENT_ARTIFACT_TYPE,
        title=payload.project_name,
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageFiveArtifactResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_acceptance_package(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveAcceptancePackageRequest,
) -> StageFiveArtifactResult:
    scope = _get_stage_five_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_five_writable(scope)
    stage_four = _ensure_stage_four_completed(session, scope)
    _get_required_stage_four_handover_artifacts(session, stage_four=stage_four)
    _mark_stage_five_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FIVE_ACCEPTANCE_PACKAGE_ARTIFACT_TYPE,
        title="阶段五验收材料",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageFiveArtifactResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_operations_guide(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveOperationsGuideRequest,
) -> StageFiveArtifactResult:
    scope = _get_stage_five_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_five_writable(scope)
    _ensure_stage_four_completed(session, scope)
    _mark_stage_five_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FIVE_OPERATIONS_GUIDE_ARTIFACT_TYPE,
        title="阶段五运维说明",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageFiveArtifactResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_ai_delivery_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFiveAiDeliveryReviewResult:
    scope = _get_stage_five_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_five_writable(scope)
    stage_four = _ensure_stage_four_completed(session, scope)

    delivery_document_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FIVE_DELIVERY_DOCUMENT_ARTIFACT_TYPE,
    )
    acceptance_package_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FIVE_ACCEPTANCE_PACKAGE_ARTIFACT_TYPE,
    )
    operations_guide_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FIVE_OPERATIONS_GUIDE_ARTIFACT_TYPE,
    )
    if (
        delivery_document_artifact is None
        or acceptance_package_artifact is None
        or operations_guide_artifact is None
    ):
        raise ConflictError(
            "Stage five delivery document, acceptance package, and operations guide are required"
        )

    dify_implementation_artifact, test_report_artifact = _get_required_stage_four_handover_artifacts(
        session,
        stage_four=stage_four,
    )
    ai_test_review_artifact = _get_required_stage_four_ai_test_review(
        session,
        stage_four=stage_four,
    )

    rubric = _get_stage_five_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_FIVE_REVIEW_USAGE,
            input_text=_build_review_input(
                delivery_document_artifact=delivery_document_artifact,
                acceptance_package_artifact=acceptance_package_artifact,
                operations_guide_artifact=operations_guide_artifact,
                dify_implementation_artifact=dify_implementation_artifact,
                test_report_artifact=test_report_artifact,
                ai_test_review_artifact=ai_test_review_artifact,
            ),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "stage_blueprint": scope.stage_blueprint.blueprint_json,
                "delivery_document_artifact_id": str(delivery_document_artifact.id),
                "delivery_document": delivery_document_artifact.content_json,
                "acceptance_package_artifact_id": str(acceptance_package_artifact.id),
                "acceptance_package": acceptance_package_artifact.content_json,
                "operations_guide_artifact_id": str(operations_guide_artifact.id),
                "operations_guide": operations_guide_artifact.content_json,
                "stage_4_dify_implementation_artifact_id": str(
                    dify_implementation_artifact.id
                ),
                "stage_4_dify_implementation": dify_implementation_artifact.content_json,
                "stage_4_test_report_artifact_id": str(test_report_artifact.id),
                "stage_4_test_report": test_report_artifact.content_json,
                "stage_4_ai_test_review_artifact_id": str(ai_test_review_artifact.id),
                "stage_4_ai_test_review": ai_test_review_artifact.content_json,
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_review_content(
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        delivery_document_artifact=delivery_document_artifact,
        acceptance_package_artifact=acceptance_package_artifact,
        operations_guide_artifact=operations_guide_artifact,
        dify_implementation_artifact=dify_implementation_artifact,
        test_report_artifact=test_report_artifact,
        ai_test_review_artifact=ai_test_review_artifact,
        rubric=rubric,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FIVE_AI_DELIVERY_REVIEW_ARTIFACT_TYPE,
        title="阶段五 AI 交付审阅",
        content_json=review_content,
        status=ArtifactStatus.REVIEWED,
    )
    return StageFiveAiDeliveryReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def complete_stage_five(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFiveCompletionResult:
    scope = _get_stage_five_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_five_unlocked(scope)
    _ensure_stage_four_completed(session, scope)
    required_artifacts = [
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FIVE_DELIVERY_DOCUMENT_ARTIFACT_TYPE,
        ),
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FIVE_ACCEPTANCE_PACKAGE_ARTIFACT_TYPE,
        ),
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FIVE_OPERATIONS_GUIDE_ARTIFACT_TYPE,
        ),
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FIVE_AI_DELIVERY_REVIEW_ARTIFACT_TYPE,
        ),
    ]
    if any(artifact is None for artifact in required_artifacts):
        raise ConflictError(
            "Stage five delivery document, acceptance package, operations guide, "
            "and AI delivery review are required"
        )

    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if scope.experiment_session.status != SessionStatus.ARCHIVED:
        scope.experiment_session.status = SessionStatus.COMPLETED
        if scope.experiment_session.started_at is None:
            scope.experiment_session.started_at = now
        if scope.experiment_session.completed_at is None:
            scope.experiment_session.completed_at = now
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(scope.experiment_session)
    return StageFiveCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        experiment_session=scope.experiment_session,
    )


def _get_stage_five_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFiveScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage five")
    if stage_key != STAGE_FIVE_KEY:
        raise ResourceNotFoundError("Stage five endpoint only supports stage_5")

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
            StageRecord.stage_key == STAGE_FIVE_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage five session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    return StageFiveScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _ensure_stage_five_unlocked(scope: StageFiveScope) -> None:
    if scope.stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage five is locked")


def _ensure_stage_five_writable(scope: StageFiveScope) -> None:
    _ensure_stage_five_unlocked(scope)
    if scope.stage_record.status == StageStatus.COMPLETED:
        raise ConflictError("Stage five is already completed")


def _ensure_stage_four_completed(session: Session, scope: StageFiveScope) -> StageRecord:
    stage_four = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_FOUR_KEY,
    )
    if stage_four.status != StageStatus.COMPLETED:
        raise ConflictError("Stage four must be completed before stage five")
    return stage_four


def _mark_stage_five_started(scope: StageFiveScope) -> None:
    now = datetime.now(UTC)
    if scope.stage_record.status == StageStatus.NOT_STARTED:
        scope.stage_record.status = StageStatus.IN_PRACTICE
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now


def _get_required_stage_four_handover_artifacts(
    session: Session,
    *,
    stage_four: StageRecord,
) -> tuple[Artifact, Artifact]:
    dify_implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=stage_four,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    test_report_artifact = _get_latest_stage_artifact(
        session,
        stage_record=stage_four,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
    )
    if dify_implementation_artifact is None or test_report_artifact is None:
        raise ConflictError(
            "Stage four Dify implementation and test report are required for stage five"
        )
    return dify_implementation_artifact, test_report_artifact


def _get_required_stage_four_ai_test_review(
    session: Session,
    *,
    stage_four: StageRecord,
) -> Artifact:
    ai_test_review_artifact = _get_latest_stage_artifact(
        session,
        stage_record=stage_four,
        artifact_type=STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE,
    )
    if ai_test_review_artifact is None:
        raise ConflictError("Stage four AI test review is required for stage five AI review")
    return ai_test_review_artifact


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


def _get_stage_five_rubric(session: Session, scope: StageFiveScope) -> Rubric | None:
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
    scope: StageFiveScope,
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


def _build_review_input(
    *,
    delivery_document_artifact: Artifact,
    acceptance_package_artifact: Artifact,
    operations_guide_artifact: Artifact,
    dify_implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    ai_test_review_artifact: Artifact,
) -> str:
    delivery_document = delivery_document_artifact.content_json
    acceptance_package = acceptance_package_artifact.content_json
    operations_guide = operations_guide_artifact.content_json
    dify_implementation = dify_implementation_artifact.content_json
    test_report = test_report_artifact.content_json
    ai_test_review = ai_test_review_artifact.content_json
    return "\n".join(
        [
            str(delivery_document.get("project_name", "")).strip(),
            str(delivery_document.get("final_agent_url", "")).strip(),
            str(delivery_document.get("delivery_summary", "")).strip(),
            str(acceptance_package.get("acceptance_scope", "")).strip(),
            str(acceptance_package.get("test_evidence_summary", "")).strip(),
            str(operations_guide.get("data_update_plan", "")).strip(),
            str(operations_guide.get("monitoring_plan", "")).strip(),
            str(dify_implementation.get("dify_app_name", "")).strip(),
            str(test_report.get("overall_result", "")).strip(),
            str(ai_test_review.get("release_readiness", "")).strip(),
        ]
    ).strip()


def _build_review_content(
    *,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    delivery_document_artifact: Artifact,
    acceptance_package_artifact: Artifact,
    operations_guide_artifact: Artifact,
    dify_implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    ai_test_review_artifact: Artifact,
    rubric: Rubric | None,
) -> dict[str, Any]:
    delivery_document = delivery_document_artifact.content_json
    acceptance_package = acceptance_package_artifact.content_json
    operations_guide = operations_guide_artifact.content_json
    dify_implementation = dify_implementation_artifact.content_json
    ai_test_review = ai_test_review_artifact.content_json
    acceptance_risks = _as_string_list(acceptance_package.get("unresolved_issues"))
    operations_risks = _dedupe_preserve_order(
        [
            *_as_string_list(operations_guide.get("common_issues")),
            *_as_string_list(delivery_document.get("known_limitations")),
        ]
    )
    improvement_suggestions = _as_string_list(ai_test_review.get("improvement_suggestions"))
    if not improvement_suggestions:
        improvement_suggestions = [
            "补充客户演示时的操作脚本和验收证据截图。",
            "把阶段四已知限制明确写入交付说明和运维说明。",
        ]
    final_readiness = (
        "ready_for_teacher_review"
        if not acceptance_risks and not operations_risks
        else "ready_with_disclosed_risks"
    )
    return {
        "review_summary": ai_content,
        "delivery_completeness": {
            "has_project_name": bool(str(delivery_document.get("project_name") or "").strip()),
            "has_final_agent_url": bool(
                str(delivery_document.get("final_agent_url") or "").strip()
            ),
            "core_feature_count": len(_as_string_list(delivery_document.get("core_features"))),
            "target_user_count": len(_as_string_list(delivery_document.get("target_users"))),
            "has_usage_instructions": bool(
                str(delivery_document.get("usage_instructions") or "").strip()
            ),
            "limitation_count": len(
                _as_string_list(delivery_document.get("known_limitations"))
            ),
            "acceptance_criteria_count": len(
                _as_string_list(acceptance_package.get("acceptance_criteria"))
            ),
            "handover_checklist_count": len(
                _as_string_list(acceptance_package.get("handover_checklist"))
            ),
            "runtime_dependency_count": len(
                _as_string_list(operations_guide.get("runtime_dependencies"))
            ),
        },
        "acceptance_risks": acceptance_risks,
        "operations_risks": operations_risks,
        "improvement_suggestions": improvement_suggestions,
        "final_readiness": final_readiness,
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "delivery_document_artifact_id": str(delivery_document_artifact.id),
        "acceptance_package_artifact_id": str(acceptance_package_artifact.id),
        "operations_guide_artifact_id": str(operations_guide_artifact.id),
        "stage_4_dify_implementation_artifact_id": str(dify_implementation_artifact.id),
        "stage_4_test_report_artifact_id": str(test_report_artifact.id),
        "stage_4_ai_test_review_artifact_id": str(ai_test_review_artifact.id),
        "final_agent_url": delivery_document.get("final_agent_url"),
        "dify_app_url": dify_implementation.get("dify_app_url"),
        "rubric": _rubric_snapshot(rubric),
    }


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if value is None:
        return []
    return [str(value)]


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _rubric_snapshot(rubric: Rubric | None) -> dict[str, Any] | None:
    if rubric is None:
        return None
    return {
        "id": str(rubric.id),
        "stage_key": rubric.stage_key,
        "version": rubric.version,
        "name": rubric.name,
    }
