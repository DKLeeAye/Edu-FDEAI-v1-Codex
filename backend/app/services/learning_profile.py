from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Artifact, Course, ExperimentSession, StageRecord
from app.models.enums import SessionStatus, StageStatus, UserRole
from app.schemas.learning_profile import (
    LearningProfileResponse,
    LearningProfileStageStatus,
    LearningProfileStudentSummary,
)
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError

AI_REVIEW_ARTIFACT_TYPES = {
    "stage_1_ai_review",
    "stage_2_ai_review",
    "stage_3_ai_review",
    "stage_4_ai_test_review",
    "stage_5_ai_delivery_review",
}

STAGE_LABELS = {
    "stage_1": "阶段一",
    "stage_2": "阶段二",
    "stage_3": "阶段三",
    "stage_4": "阶段四",
    "stage_5": "阶段五",
}


def get_learning_profile(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
) -> LearningProfileResponse:
    experiment_session = _get_accessible_experiment_session(
        session,
        current_user=current_user,
        session_id=session_id,
    )
    stage_records = sorted(
        experiment_session.stage_records,
        key=lambda stage_record: (stage_record.stage_order, stage_record.stage_key),
    )
    stage_keys = [stage_record.stage_key for stage_record in stage_records]
    artifact_counts, ai_review_counts = _load_artifact_counts(
        session,
        current_user=current_user,
        course_id=experiment_session.course_id,
        session_id=experiment_session.id,
        stage_keys=stage_keys,
    )
    completed_stage_count = sum(
        1 for stage_record in stage_records if stage_record.status == StageStatus.COMPLETED
    )
    total_stage_count = len(stage_records)
    completion_ratio = (
        round(completed_stage_count / total_stage_count, 2)
        if total_stage_count > 0
        else 0.0
    )

    return LearningProfileResponse(
        session_id=experiment_session.id,
        session_status=experiment_session.status,
        student=LearningProfileStudentSummary(
            id=experiment_session.student.id,
            email=experiment_session.student.email,
            full_name=experiment_session.student.full_name,
        ),
        stage_status_summary=[
            LearningProfileStageStatus(
                stage_key=stage_record.stage_key,
                stage_order=stage_record.stage_order,
                status=stage_record.status,
            )
            for stage_record in stage_records
        ],
        artifact_count_by_stage=artifact_counts,
        ai_review_count_by_stage=ai_review_counts,
        completed_stage_count=completed_stage_count,
        total_stage_count=total_stage_count,
        completion_ratio=completion_ratio,
        strengths=_build_strengths(
            completed_stage_count=completed_stage_count,
            total_stage_count=total_stage_count,
        ),
        risks=_build_risks(
            stage_records=stage_records,
            artifact_counts=artifact_counts,
            ai_review_counts=ai_review_counts,
        ),
        next_suggestions=_build_next_suggestions(
            experiment_session=experiment_session,
            stage_records=stage_records,
            completed_stage_count=completed_stage_count,
            total_stage_count=total_stage_count,
        ),
    )


def _get_accessible_experiment_session(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
) -> ExperimentSession:
    statement = (
        select(ExperimentSession)
        .join(Course, ExperimentSession.course_id == Course.id)
        .options(
            selectinload(ExperimentSession.student),
            selectinload(ExperimentSession.stage_records),
        )
        .where(
            ExperimentSession.id == session_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
        )
    )

    if current_user.role == UserRole.STUDENT:
        statement = statement.where(ExperimentSession.student_user_id == current_user.id)
    elif current_user.role == UserRole.TEACHER:
        statement = statement.where(Course.created_by_user_id == current_user.id)
    else:
        raise PermissionDeniedError("User role cannot access learning profiles")

    experiment_session = session.scalar(statement)
    if experiment_session is None:
        raise ResourceNotFoundError("Learning profile not found")
    return experiment_session


def _load_artifact_counts(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
    session_id: uuid.UUID,
    stage_keys: list[str],
) -> tuple[dict[str, int], dict[str, int]]:
    artifact_counts = dict.fromkeys(stage_keys, 0)
    ai_review_counts = dict.fromkeys(stage_keys, 0)
    rows = session.execute(
        select(Artifact.stage_key, Artifact.artifact_type, func.count(Artifact.id))
        .where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.course_id == course_id,
            Artifact.session_id == session_id,
        )
        .group_by(Artifact.stage_key, Artifact.artifact_type)
    )
    for stage_key, artifact_type, count in rows:
        if stage_key not in artifact_counts:
            continue
        artifact_counts[stage_key] += int(count)
        if artifact_type in AI_REVIEW_ARTIFACT_TYPES:
            ai_review_counts[stage_key] += int(count)
    return artifact_counts, ai_review_counts


def _build_strengths(*, completed_stage_count: int, total_stage_count: int) -> list[str]:
    if total_stage_count > 0 and completed_stage_count == total_stage_count:
        return ["完成完整 AI 智能体项目交付链路"]
    return []


def _build_risks(
    *,
    stage_records: list[StageRecord],
    artifact_counts: dict[str, int],
    ai_review_counts: dict[str, int],
) -> list[str]:
    risks: list[str] = []
    for stage_record in stage_records:
        if stage_record.status == StageStatus.LOCKED:
            continue
        stage_label = _stage_label(stage_record.stage_key)
        if ai_review_counts.get(stage_record.stage_key, 0) == 0:
            risks.append(f"{stage_label}缺少 AI 反馈记录")
        if artifact_counts.get(stage_record.stage_key, 0) == 0:
            risks.append(f"{stage_label}过程证据偏少")
    return risks


def _build_next_suggestions(
    *,
    experiment_session: ExperimentSession,
    stage_records: list[StageRecord],
    completed_stage_count: int,
    total_stage_count: int,
) -> list[str]:
    if (
        experiment_session.status == SessionStatus.COMPLETED
        or (total_stage_count > 0 and completed_stage_count == total_stage_count)
    ):
        return [
            "进行项目复盘，整理关键证据并准备教师反馈",
            "检查最终交付材料，准备正式交付说明",
        ]

    next_stage = next(
        (
            stage_record
            for stage_record in stage_records
            if stage_record.status != StageStatus.COMPLETED
        ),
        None,
    )
    if next_stage is None:
        return ["继续整理项目证据，等待教师反馈"]
    return [f"优先推进{_stage_label(next_stage.stage_key)}，补齐该阶段产物与 AI 反馈记录"]


def _stage_label(stage_key: str) -> str:
    return STAGE_LABELS.get(stage_key, stage_key)
