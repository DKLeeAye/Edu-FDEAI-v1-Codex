from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Artifact, Course, ExperimentSession, StageRecord
from app.models.enums import UserRole
from app.schemas.teacher_progress import (
    TeacherArtifactSummaryResponse,
    TeacherCourseProgressResponse,
    TeacherSessionProgressResponse,
    TeacherStageProgressResponse,
    TeacherStudentSummary,
)
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError


def list_teacher_course_progress(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> list[TeacherCourseProgressResponse]:
    _ensure_teacher(current_user)

    courses = list(
        session.scalars(
            select(Course)
            .where(
                Course.tenant_id == current_user.tenant_id,
                Course.institution_id == current_user.institution_id,
                Course.created_by_user_id == current_user.id,
            )
            .order_by(Course.created_at.desc(), Course.id)
        )
    )
    if not courses:
        return []

    course_ids = [course.id for course in courses]
    experiment_sessions = list(
        session.scalars(
            select(ExperimentSession)
            .options(
                selectinload(ExperimentSession.student),
                selectinload(ExperimentSession.stage_records),
            )
            .where(
                ExperimentSession.tenant_id == current_user.tenant_id,
                ExperimentSession.institution_id == current_user.institution_id,
                ExperimentSession.course_id.in_(course_ids),
            )
            .order_by(ExperimentSession.updated_at.desc(), ExperimentSession.id)
        )
    )
    session_ids = [experiment_session.id for experiment_session in experiment_sessions]
    artifact_counts, artifact_updated_at = _load_artifact_rollups(
        session,
        current_user=current_user,
        session_ids=session_ids,
    )

    sessions_by_course: dict[uuid.UUID, list[ExperimentSession]] = defaultdict(list)
    for experiment_session in experiment_sessions:
        sessions_by_course[experiment_session.course_id].append(experiment_session)

    return [
        TeacherCourseProgressResponse(
            id=course.id,
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            package_version_id=course.package_version_id,
            created_by_user_id=course.created_by_user_id,
            title=course.title,
            code=course.code,
            status=course.status,
            sessions=[
                _build_session_progress(
                    experiment_session,
                    artifact_counts=artifact_counts,
                    artifact_updated_at=artifact_updated_at,
                )
                for experiment_session in sessions_by_course[course.id]
            ],
        )
        for course in courses
    ]


def list_teacher_stage_artifact_summaries(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> list[TeacherArtifactSummaryResponse]:
    _ensure_teacher(current_user)

    stage_record = session.scalar(
        select(StageRecord)
        .join(ExperimentSession, StageRecord.session_id == ExperimentSession.id)
        .join(Course, StageRecord.course_id == Course.id)
        .where(
            StageRecord.session_id == session_id,
            StageRecord.stage_key == stage_key,
            StageRecord.tenant_id == current_user.tenant_id,
            StageRecord.institution_id == current_user.institution_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            Course.created_by_user_id == current_user.id,
        )
    )
    if stage_record is None:
        raise ResourceNotFoundError("Experiment session stage not found")

    artifacts = list(
        session.scalars(
            select(Artifact)
            .where(
                Artifact.tenant_id == current_user.tenant_id,
                Artifact.institution_id == current_user.institution_id,
                Artifact.course_id == stage_record.course_id,
                Artifact.session_id == stage_record.session_id,
                Artifact.stage_record_id == stage_record.id,
                Artifact.stage_key == stage_record.stage_key,
            )
            .order_by(Artifact.created_at.desc(), Artifact.id)
        )
    )
    return [TeacherArtifactSummaryResponse.model_validate(artifact) for artifact in artifacts]


def _load_artifact_rollups(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_ids: list[uuid.UUID],
) -> tuple[dict[tuple[uuid.UUID, str], int], dict[uuid.UUID, datetime]]:
    if not session_ids:
        return {}, {}

    artifact_counts: dict[tuple[uuid.UUID, str], int] = {}
    artifact_updated_at: dict[uuid.UUID, datetime] = {}
    rows = session.execute(
        select(
            Artifact.session_id,
            Artifact.stage_key,
            func.count(Artifact.id),
            func.max(Artifact.updated_at),
        )
        .where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.session_id.in_(session_ids),
        )
        .group_by(Artifact.session_id, Artifact.stage_key)
    )
    for session_id, stage_key, count, last_artifact_updated_at in rows:
        artifact_counts[(session_id, stage_key)] = int(count)
        if last_artifact_updated_at is not None:
            current_latest = artifact_updated_at.get(session_id)
            if current_latest is None or last_artifact_updated_at > current_latest:
                artifact_updated_at[session_id] = last_artifact_updated_at

    return artifact_counts, artifact_updated_at


def _build_session_progress(
    experiment_session: ExperimentSession,
    *,
    artifact_counts: dict[tuple[uuid.UUID, str], int],
    artifact_updated_at: dict[uuid.UUID, datetime],
) -> TeacherSessionProgressResponse:
    stage_records = sorted(
        experiment_session.stage_records,
        key=lambda stage_record: (stage_record.stage_order, stage_record.stage_key),
    )
    stage_progress = [
        TeacherStageProgressResponse(
            id=stage_record.id,
            course_id=stage_record.course_id,
            session_id=stage_record.session_id,
            stage_key=stage_record.stage_key,
            stage_order=stage_record.stage_order,
            status=stage_record.status,
            artifact_count=artifact_counts.get(
                (experiment_session.id, stage_record.stage_key),
                0,
            ),
            updated_at=stage_record.updated_at,
        )
        for stage_record in stage_records
    ]
    updated_at_values = [
        experiment_session.updated_at,
        *(stage_record.updated_at for stage_record in stage_records),
    ]
    last_artifact_updated_at = artifact_updated_at.get(experiment_session.id)
    if last_artifact_updated_at is not None:
        updated_at_values.append(last_artifact_updated_at)

    return TeacherSessionProgressResponse(
        id=experiment_session.id,
        course_id=experiment_session.course_id,
        student=TeacherStudentSummary(
            id=experiment_session.student.id,
            email=experiment_session.student.email,
            full_name=experiment_session.student.full_name,
        ),
        status=experiment_session.status,
        stage_records=stage_progress,
        artifact_total_count=sum(stage.artifact_count for stage in stage_progress),
        updated_at=max(updated_at_values),
    )


def _ensure_teacher(current_user: CurrentUserContext) -> None:
    if current_user.role != UserRole.TEACHER:
        raise PermissionDeniedError("Only teachers can access teacher progress")
