from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import AccessTokenClaims, verify_password
from app.models.enums import UserRole
from app.models.identity import User


@dataclass(frozen=True)
class CurrentUserContext:
    id: uuid.UUID
    email: str
    full_name: str
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    role: UserRole

    @classmethod
    def from_user(cls, user: User) -> "CurrentUserContext":
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            tenant_id=user.tenant_id,
            institution_id=user.institution_id,
            role=user.role,
        )


def authenticate_user(session: Session, *, email: str, password: str) -> User | None:
    normalized_email = email.strip().lower()
    user = session.scalar(
        select(User).where(
            User.email == normalized_email,
            User.is_active.is_(True),
        )
    )
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_active_user_for_token(session: Session, claims: AccessTokenClaims) -> User | None:
    return session.scalar(
        select(User).where(
            User.id == claims.user_id,
            User.tenant_id == claims.tenant_id,
            User.institution_id == claims.institution_id,
            User.role == claims.role,
            User.is_active.is_(True),
        )
    )
