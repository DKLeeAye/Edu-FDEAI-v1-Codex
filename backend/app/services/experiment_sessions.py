from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Course, ExperimentSession, StageBlueprint, StageRecord
from app.models.enums import StageStatus, UserRole
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError


def create_experiment_session(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> ExperimentSession:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can create experiment sessions")

    course = session.scalar(
        select(Course).where(
            Course.id == course_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
        )
    )
    if course is None:
        raise ResourceNotFoundError("Course not found")

    existing_session = session.scalar(
        select(ExperimentSession)
        .options(selectinload(ExperimentSession.stage_records))
        .where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == current_user.id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
        )
    )
    if existing_session is not None:
        return existing_session

    stage_blueprints = list(
        session.scalars(
            select(StageBlueprint)
            .where(StageBlueprint.package_version_id == course.package_version_id)
            .order_by(StageBlueprint.stage_order)
        )
    )
    if len(stage_blueprints) != 5:
        raise ConflictError("Course package version must define exactly five stage blueprints")

    experiment_session = ExperimentSession(
        tenant_id=current_user.tenant_id,
        institution_id=current_user.institution_id,
        course_id=course.id,
        student_user_id=current_user.id,
        package_version_id=course.package_version_id,
    )
    session.add(experiment_session)
    session.flush()
    for stage in stage_blueprints:
        session.add(
            StageRecord(
                tenant_id=current_user.tenant_id,
                institution_id=current_user.institution_id,
                course_id=course.id,
                session_id=experiment_session.id,
                stage_key=stage.stage_key,
                stage_order=stage.stage_order,
                status=(
                    StageStatus.NOT_STARTED
                    if stage.stage_order == 1
                    else StageStatus.LOCKED
                ),
            )
        )
    session.commit()
    return get_experiment_session(
        session,
        current_user=current_user,
        session_id=experiment_session.id,
    )


def list_experiment_sessions(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> list[ExperimentSession]:
    statement = (
        select(ExperimentSession)
        .options(selectinload(ExperimentSession.stage_records))
        .where(
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
        )
        .order_by(ExperimentSession.created_at.desc(), ExperimentSession.id)
    )
    if current_user.role == UserRole.STUDENT:
        statement = statement.where(ExperimentSession.student_user_id == current_user.id)
    elif current_user.role == UserRole.TEACHER:
        statement = statement.join(Course, ExperimentSession.course_id == Course.id).where(
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            Course.created_by_user_id == current_user.id,
        )
    return list(session.scalars(statement))


def get_experiment_session(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
) -> ExperimentSession:
    statement = (
        select(ExperimentSession)
        .options(selectinload(ExperimentSession.stage_records))
        .where(
            ExperimentSession.id == session_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
        )
    )
    if current_user.role == UserRole.STUDENT:
        statement = statement.where(ExperimentSession.student_user_id == current_user.id)
    elif current_user.role == UserRole.TEACHER:
        statement = statement.join(Course, ExperimentSession.course_id == Course.id).where(
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            Course.created_by_user_id == current_user.id,
        )
    experiment_session = session.scalar(statement)
    if experiment_session is None:
        raise ResourceNotFoundError("Experiment session not found")
    return experiment_session
