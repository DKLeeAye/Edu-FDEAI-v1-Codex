from __future__ import annotations

import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import Course, ExperimentPackageVersion
from app.models.enums import CourseStatus, UserRole
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError


def create_course(
    session: Session,
    *,
    current_user: CurrentUserContext,
    title: str,
    code: str,
    package_version_id: uuid.UUID,
) -> Course:
    if current_user.role != UserRole.TEACHER:
        raise PermissionDeniedError("Only teachers can create courses")

    package_version = get_package_version_for_scope(
        session,
        current_user=current_user,
        package_version_id=package_version_id,
    )
    if package_version is None:
        raise ResourceNotFoundError("Package version not found")

    normalized_code = code.strip()
    existing_course = session.scalar(
        select(Course).where(
            Course.institution_id == current_user.institution_id,
            Course.code == normalized_code,
        )
    )
    if existing_course is not None:
        raise ConflictError("Course code already exists in this institution")

    course = Course(
        tenant_id=current_user.tenant_id,
        institution_id=current_user.institution_id,
        package_version_id=package_version.id,
        created_by_user_id=current_user.id,
        title=title.strip(),
        code=normalized_code,
        status=CourseStatus.ACTIVE,
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


def list_courses(session: Session, *, current_user: CurrentUserContext) -> list[Course]:
    return list(
        session.scalars(
            select(Course)
            .where(
                Course.tenant_id == current_user.tenant_id,
                Course.institution_id == current_user.institution_id,
            )
            .order_by(Course.created_at.desc(), Course.id)
        )
    )


def get_course(session: Session, *, current_user: CurrentUserContext, course_id: uuid.UUID) -> Course:
    course = session.scalar(
        select(Course).where(
            Course.id == course_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
        )
    )
    if course is None:
        raise ResourceNotFoundError("Course not found")
    return course


def get_package_version_for_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    package_version_id: uuid.UUID,
) -> ExperimentPackageVersion | None:
    return session.scalar(
        select(ExperimentPackageVersion).where(
            ExperimentPackageVersion.id == package_version_id,
            or_(
                and_(
                    ExperimentPackageVersion.tenant_id.is_(None),
                    ExperimentPackageVersion.institution_id.is_(None),
                ),
                and_(
                    ExperimentPackageVersion.tenant_id == current_user.tenant_id,
                    ExperimentPackageVersion.institution_id.is_(None),
                ),
                and_(
                    ExperimentPackageVersion.tenant_id == current_user.tenant_id,
                    ExperimentPackageVersion.institution_id == current_user.institution_id,
                ),
            ),
        )
    )
