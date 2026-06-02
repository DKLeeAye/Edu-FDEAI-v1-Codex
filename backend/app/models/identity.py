from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.ai import AiCallLog
    from app.models.evidence import Artifact
    from app.models.organization import Institution, Tenant
    from app.models.teaching import Course, CourseMember, ExperimentSession


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=UserRole.STUDENT,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    institution: Mapped["Institution"] = relationship(back_populates="users")
    created_courses: Mapped[list["Course"]] = relationship(back_populates="created_by")
    course_members: Mapped[list["CourseMember"]] = relationship(back_populates="user")
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="student")
    submitted_artifacts: Mapped[list["Artifact"]] = relationship(back_populates="submitted_by")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="user")


class RegistrationInvite(IdMixin, TimestampMixin, Base):
    __tablename__ = "registration_invites"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("courses.id"),
        nullable=True,
        index=True,
    )
    code_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=UserRole.STUDENT,
    )
    max_uses: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class RegistrationInviteRedemption(IdMixin, TimestampMixin, Base):
    __tablename__ = "registration_invite_redemptions"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    invite_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("registration_invites.id"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id"), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
