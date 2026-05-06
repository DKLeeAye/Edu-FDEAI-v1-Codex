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
    if not _artifact_exists(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_ONE_SUMMARY_ARTIFACT_TYPE,
    ):
        raise ConflictError("Stage one problem summary is required before completion")

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
        "system_prompt": _build_ai_customer_system_prompt(scope),
    }


def _build_ai_customer_system_prompt(scope: StageOneScope) -> str:
    manifest = scope.package_version.content_manifest_json or {}
    persona = manifest.get("stage_1_ai_customer_persona", {})
    return "\n".join(
        [
            "你正在扮演 EduFDE 阶段一需求访谈中的客户访谈对象。",
            "你不是导师、评审、解题助手或产品经理，不要解释教学目标、Rubric 或标准答案。",
            "项目背景：制造业质检 AI 智能体项目。",
            f"业务场景：{manifest.get('scenario') or '汽车零部件质检智能体'}。",
            f"公司背景：{manifest.get('company_profile') or '中型制造企业正在推进质检数字化'}。",
            f"客户人设：{_format_prompt_context(persona)}。",
            f"表层诉求：{manifest.get('surface_need') or '希望提升质检效率'}。",
            f"隐藏驱动力：{manifest.get('real_driver') or '需要通过更强的质检追溯能力满足客户要求'}。",
            f"已知约束：{_format_prompt_context(manifest.get('constraints'))}。",
            "回答规则：保持客户口吻，优先说业务现状、痛点、限制和期望；学生问得笼统时只给模糊信息；"
            "学生追问到审厂、合规、数据质量、流程责任或一线使用障碍时，再释放更具体信息。",
            "不要主动替学生总结完整需求，不要给出技术方案，不要建议他们该怎么做。",
            "每次回复控制在 2 到 4 句中文；可以反问一个客户视角的问题来推动访谈。",
        ]
    )


def _format_prompt_context(value: Any) -> str:
    if value is None or value == "":
        return "未提供"
    if isinstance(value, dict):
        parts = [f"{key}: {_format_prompt_context(item)}" for key, item in value.items()]
        return "；".join(parts)
    if isinstance(value, list):
        return "、".join(_format_prompt_context(item) for item in value)
    return str(value)


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
