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
from app.schemas.stage_four import (
    StageFourDifyImplementationRequest,
    StageFourTestReportRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_THREE_KEY = "stage_3"
STAGE_FOUR_KEY = "stage_4"
STAGE_FIVE_KEY = "stage_5"
STAGE_THREE_DECISION_ARTIFACT_TYPE = "stage_3_knowledge_decision"
STAGE_FOUR_REVIEW_USAGE = "stage_4_agent_test_review"
STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE = "stage_4_dify_implementation"
STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE = "stage_4_test_report"
STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE = "stage_4_ai_test_review"


@dataclass(frozen=True)
class StageFourScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageFourDifyImplementationResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFourTestReportResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFourAiTestReviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageFourCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    unlocked_stage_record: StageRecord


def save_dify_implementation(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourDifyImplementationRequest,
) -> StageFourDifyImplementationResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    _mark_stage_four_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
        title=payload.dify_app_name,
        content_json=payload.model_dump(mode="json", exclude_none=True),
        status=ArtifactStatus.DRAFT,
    )
    return StageFourDifyImplementationResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_test_report(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourTestReportRequest,
) -> StageFourTestReportResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    if implementation_artifact is None:
        raise ConflictError("Stage four Dify implementation is required before test report")

    _mark_stage_four_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
        title="阶段四智能体测试记录",
        content_json=payload.model_dump(mode="json"),
        status=ArtifactStatus.DRAFT,
    )
    return StageFourTestReportResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_ai_test_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourAiTestReviewResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    stage_three = _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    test_report_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
    )
    if implementation_artifact is None or test_report_artifact is None:
        raise ConflictError("Stage four Dify implementation and test report are required")

    knowledge_decision_artifact = _get_latest_stage_artifact(
        session,
        stage_record=stage_three,
        artifact_type=STAGE_THREE_DECISION_ARTIFACT_TYPE,
    )
    if knowledge_decision_artifact is None:
        raise ConflictError("Stage three knowledge decision is required for stage four AI review")

    rubric = _get_stage_four_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_FOUR_REVIEW_USAGE,
            input_text=_build_review_input(
                implementation_artifact=implementation_artifact,
                test_report_artifact=test_report_artifact,
                knowledge_decision_artifact=knowledge_decision_artifact,
            ),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "stage_blueprint": scope.stage_blueprint.blueprint_json,
                "dify_implementation_artifact_id": str(implementation_artifact.id),
                "dify_implementation": implementation_artifact.content_json,
                "test_report_artifact_id": str(test_report_artifact.id),
                "test_report": test_report_artifact.content_json,
                "stage_3_knowledge_decision_artifact_id": str(knowledge_decision_artifact.id),
                "stage_3_knowledge_decision": knowledge_decision_artifact.content_json,
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_review_content(
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        implementation_artifact=implementation_artifact,
        test_report_artifact=test_report_artifact,
        knowledge_decision_artifact=knowledge_decision_artifact,
        rubric=rubric,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE,
        title="阶段四 AI 智能体测试反馈",
        content_json=review_content,
        status=ArtifactStatus.REVIEWED,
    )
    return StageFourAiTestReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def complete_stage_four(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourCompletionResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_unlocked(scope)
    _ensure_stage_three_completed(session, scope)
    required_artifacts = [
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
        ),
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
        ),
        _get_latest_stage_artifact(
            session,
            stage_record=scope.stage_record,
            artifact_type=STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE,
        ),
    ]
    if any(artifact is None for artifact in required_artifacts):
        raise ConflictError("Stage four Dify implementation, test report, and AI review are required")

    stage_five = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_FIVE_KEY,
    )
    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if stage_five.status == StageStatus.LOCKED:
        stage_five.status = StageStatus.NOT_STARTED
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(stage_five)
    return StageFourCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        unlocked_stage_record=stage_five,
    )


def _get_stage_four_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage four")
    if stage_key != STAGE_FOUR_KEY:
        raise ResourceNotFoundError("Stage four endpoint only supports stage_4")

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
            StageRecord.stage_key == STAGE_FOUR_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage four session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    return StageFourScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _ensure_stage_four_unlocked(scope: StageFourScope) -> None:
    if scope.stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage four is locked")


def _ensure_stage_four_writable(scope: StageFourScope) -> None:
    _ensure_stage_four_unlocked(scope)
    if scope.stage_record.status == StageStatus.COMPLETED:
        raise ConflictError("Stage four is already completed")


def _ensure_stage_three_completed(session: Session, scope: StageFourScope) -> StageRecord:
    stage_three = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_THREE_KEY,
    )
    if stage_three.status != StageStatus.COMPLETED:
        raise ConflictError("Stage three must be completed before stage four")
    return stage_three


def _mark_stage_four_started(scope: StageFourScope) -> None:
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


def _get_stage_four_rubric(session: Session, scope: StageFourScope) -> Rubric | None:
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
    scope: StageFourScope,
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
    implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    knowledge_decision_artifact: Artifact,
) -> str:
    implementation = implementation_artifact.content_json
    test_report = test_report_artifact.content_json
    knowledge_decision = knowledge_decision_artifact.content_json
    return "\n".join(
        [
            str(implementation.get("dify_app_name", "")).strip(),
            str(implementation.get("app_mode", "")).strip(),
            str(implementation.get("knowledge_base_notes", "")).strip(),
            str(test_report.get("test_goal", "")).strip(),
            str(test_report.get("overall_result", "")).strip(),
            str(knowledge_decision.get("knowledge_goal", "")).strip(),
        ]
    ).strip()


def _build_review_content(
    *,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    knowledge_decision_artifact: Artifact,
    rubric: Rubric | None,
) -> dict[str, Any]:
    implementation = implementation_artifact.content_json
    test_report = test_report_artifact.content_json
    test_cases = test_report.get("test_cases")
    if not isinstance(test_cases, list):
        test_cases = []
    passed_cases = sum(1 for item in test_cases if _mapping_value(item, "result") == "passed")
    overall_result = str(test_report.get("overall_result") or "needs_revision")
    observed_failures = _as_string_list(test_report.get("observed_failures"))
    implementation_risks = [
        *_as_string_list(implementation.get("known_limitations")),
        *observed_failures,
    ]
    release_readiness = (
        "ready_for_stage_5"
        if overall_result == "passed" and not observed_failures
        else "needs_revision_before_stage_5"
    )
    return {
        "review_summary": ai_content,
        "test_coverage_feedback": {
            "total_cases": len(test_cases),
            "passed_cases": passed_cases,
            "failed_or_partial_cases": len(test_cases) - passed_cases,
            "overall_result": overall_result,
        },
        "implementation_risks": implementation_risks,
        "improvement_suggestions": _as_string_list(test_report.get("improvement_actions"))
        or [
            "补充阶段四标准题、范围外问题和多轮记忆测试证据。",
            "把阶段三知识工程风险逐项映射到 Dify 知识库配置和测试记录。",
        ],
        "release_readiness": release_readiness,
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "dify_implementation_artifact_id": str(implementation_artifact.id),
        "test_report_artifact_id": str(test_report_artifact.id),
        "stage_3_knowledge_decision_artifact_id": str(knowledge_decision_artifact.id),
        "rubric": _rubric_snapshot(rubric),
    }


def _mapping_value(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return value.get(key)
    return None


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
