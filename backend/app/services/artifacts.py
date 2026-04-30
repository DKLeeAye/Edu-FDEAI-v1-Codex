from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Artifact, Course, ExperimentSession, StageRecord
from app.models.enums import ArtifactStatus, UserRole
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError


def create_artifact(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    artifact_type: str,
    title: str,
    content_json: dict[str, Any],
    status: ArtifactStatus = ArtifactStatus.DRAFT,
) -> Artifact:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can create artifacts")

    stage_record = _get_accessible_stage_record(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
        for_write=True,
    )

    artifact = Artifact(
        tenant_id=stage_record.tenant_id,
        institution_id=stage_record.institution_id,
        course_id=stage_record.course_id,
        session_id=stage_record.session_id,
        stage_record_id=stage_record.id,
        stage_key=stage_record.stage_key,
        submitted_by_user_id=current_user.id,
        artifact_type=artifact_type.strip(),
        title=title.strip(),
        content_json=content_json,
        version=1,
        status=status,
        submitted_at=datetime.now(UTC) if status == ArtifactStatus.SUBMITTED else None,
    )
    session.add(artifact)
    session.commit()
    session.refresh(artifact)
    return artifact


def list_artifacts_for_stage(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> list[Artifact]:
    stage_record = _get_accessible_stage_record(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
        for_write=False,
    )
    return list(
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


def get_artifact(
    session: Session,
    *,
    current_user: CurrentUserContext,
    artifact_id: uuid.UUID,
) -> Artifact:
    statement = (
        select(Artifact)
        .join(ExperimentSession, Artifact.session_id == ExperimentSession.id)
        .join(Course, Artifact.course_id == Course.id)
        .where(
            Artifact.id == artifact_id,
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
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
    elif current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("User role cannot read artifacts")

    artifact = session.scalar(statement)
    if artifact is None:
        raise ResourceNotFoundError("Artifact not found")
    return artifact


def _get_accessible_stage_record(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    for_write: bool,
) -> StageRecord:
    statement = (
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
        )
    )

    if current_user.role == UserRole.STUDENT:
        statement = statement.where(ExperimentSession.student_user_id == current_user.id)
    elif current_user.role == UserRole.TEACHER and not for_write:
        # TODO: replace course creator check with course_members when MVP membership exists.
        statement = statement.where(Course.created_by_user_id == current_user.id)
    elif current_user.role == UserRole.ADMIN and not for_write:
        pass
    elif for_write:
        raise PermissionDeniedError("Only students can create artifacts")
    else:
        raise PermissionDeniedError("User role cannot read artifacts")

    stage_record = session.scalar(statement)
    if stage_record is None:
        raise ResourceNotFoundError("Experiment session stage not found")
    return stage_record
