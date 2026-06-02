from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import (
    Course,
    CourseMember,
    ExperimentSession,
    RegistrationInvite,
    RegistrationInviteRedemption,
    StageBlueprint,
    StageRecord,
    User,
)
from app.models.enums import SessionStatus, StageStatus, UserRole
from app.schemas.invites import RegistrationInviteCreateRequest
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError


def normalize_invite_code(code: str) -> str:
    return code.strip().upper()


def hash_invite_code(code: str) -> str:
    normalized = normalize_invite_code(code)
    return hashlib.sha256(f"{settings.jwt_secret_key}:{normalized}".encode("utf-8")).hexdigest()


def generate_invite_code() -> str:
    token = secrets.token_urlsafe(18).replace("_", "").replace("-", "").upper()
    return f"EDUFDE-{token[:4]}-{token[4:8]}-{token[8:12]}"


def create_registration_invite(
    session: Session,
    *,
    current_user: CurrentUserContext,
    payload: RegistrationInviteCreateRequest,
) -> tuple[RegistrationInvite, str]:
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Only admins can create registration invites")
    if payload.role != UserRole.STUDENT:
        raise PermissionDeniedError("Public invite registration currently only supports students")

    if payload.course_id is not None:
        course = _get_course_for_scope(
            session,
            tenant_id=current_user.tenant_id,
            institution_id=current_user.institution_id,
            course_id=payload.course_id,
        )
        if course is None:
            raise ResourceNotFoundError("Course not found")

    invite_code = generate_invite_code()
    invite = RegistrationInvite(
        tenant_id=current_user.tenant_id,
        institution_id=current_user.institution_id,
        created_by_user_id=current_user.id,
        course_id=payload.course_id,
        code_hash=hash_invite_code(invite_code),
        label=payload.label.strip(),
        role=payload.role,
        max_uses=payload.max_uses,
        used_count=0,
        expires_at=payload.expires_at,
        is_active=True,
        metadata_json=payload.metadata_json,
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return invite, invite_code


def list_registration_invites(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> list[RegistrationInvite]:
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Only admins can list registration invites")
    return list(
        session.scalars(
            select(RegistrationInvite)
            .where(
                RegistrationInvite.tenant_id == current_user.tenant_id,
                RegistrationInvite.institution_id == current_user.institution_id,
            )
            .order_by(RegistrationInvite.created_at.desc(), RegistrationInvite.id)
        )
    )


def revoke_registration_invite(
    session: Session,
    *,
    current_user: CurrentUserContext,
    invite_id: uuid.UUID,
) -> RegistrationInvite:
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Only admins can revoke registration invites")
    invite = session.scalar(
        select(RegistrationInvite).where(
            RegistrationInvite.id == invite_id,
            RegistrationInvite.tenant_id == current_user.tenant_id,
            RegistrationInvite.institution_id == current_user.institution_id,
        )
    )
    if invite is None:
        raise ResourceNotFoundError("Registration invite not found")
    invite.is_active = False
    session.commit()
    session.refresh(invite)
    return invite


def register_with_invite(
    session: Session,
    *,
    invite_code: str,
    email: str,
    full_name: str,
    password: str,
) -> User:
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise ConflictError("Email is required")

    existing_user = session.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise ConflictError("Email is already registered")

    invite = session.scalar(
        select(RegistrationInvite).where(
            RegistrationInvite.code_hash == hash_invite_code(invite_code),
        )
    )
    if invite is None or not _invite_can_be_used(invite):
        raise ResourceNotFoundError("Registration invite is invalid or expired")
    if invite.role != UserRole.STUDENT:
        raise PermissionDeniedError("This invite cannot be used for public registration")

    user = User(
        tenant_id=invite.tenant_id,
        institution_id=invite.institution_id,
        email=normalized_email,
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        role=invite.role,
        is_active=True,
    )
    session.add(user)
    session.flush()

    if invite.course_id is not None:
        course = _get_course_for_scope(
            session,
            tenant_id=invite.tenant_id,
            institution_id=invite.institution_id,
            course_id=invite.course_id,
        )
        if course is None:
            raise ResourceNotFoundError("Invite course not found")
        _ensure_course_member(session, course=course, user=user, role="student")
        _ensure_experiment_session(session, course=course, user=user)

    invite.used_count += 1
    session.add(
        RegistrationInviteRedemption(
            tenant_id=invite.tenant_id,
            institution_id=invite.institution_id,
            invite_id=invite.id,
            user_id=user.id,
            email=user.email,
            course_id=invite.course_id,
            metadata_json={"source": "public_invite_registration"},
        )
    )
    session.commit()
    session.refresh(user)
    return user


def _invite_can_be_used(invite: RegistrationInvite) -> bool:
    if not invite.is_active:
        return False
    if invite.used_count >= invite.max_uses:
        return False
    if invite.expires_at is not None and datetime.now(UTC) >= invite.expires_at:
        return False
    return True


def _get_course_for_scope(
    session: Session,
    *,
    tenant_id: uuid.UUID,
    institution_id: uuid.UUID,
    course_id: uuid.UUID,
) -> Course | None:
    return session.scalar(
        select(Course).where(
            Course.id == course_id,
            Course.tenant_id == tenant_id,
            Course.institution_id == institution_id,
        )
    )


def _ensure_course_member(session: Session, *, course: Course, user: User, role: str) -> CourseMember:
    member = session.scalar(
        select(CourseMember).where(
            CourseMember.course_id == course.id,
            CourseMember.user_id == user.id,
        )
    )
    if member is None:
        member = CourseMember(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            user_id=user.id,
            role=role,
            is_active=True,
        )
        session.add(member)
    else:
        member.tenant_id = course.tenant_id
        member.institution_id = course.institution_id
        member.role = role
        member.is_active = True
    session.flush()
    return member


def _ensure_experiment_session(session: Session, *, course: Course, user: User) -> ExperimentSession:
    experiment_session = session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == user.id,
        )
    )
    if experiment_session is None:
        experiment_session = ExperimentSession(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            student_user_id=user.id,
            package_version_id=course.package_version_id,
            status=SessionStatus.NOT_STARTED,
        )
        session.add(experiment_session)
        session.flush()
    else:
        return experiment_session

    stage_blueprints = list(
        session.scalars(
            select(StageBlueprint)
            .where(StageBlueprint.package_version_id == course.package_version_id)
            .order_by(StageBlueprint.stage_order)
        )
    )
    if len(stage_blueprints) != 5:
        raise ConflictError("Course package version must define exactly five stage blueprints")

    for stage in stage_blueprints:
        session.add(
            StageRecord(
                tenant_id=course.tenant_id,
                institution_id=course.institution_id,
                course_id=course.id,
                session_id=experiment_session.id,
                stage_key=stage.stage_key,
                stage_order=stage.stage_order,
                status=StageStatus.NOT_STARTED if stage.stage_order == 1 else StageStatus.LOCKED,
            )
        )
    session.flush()
    return experiment_session

