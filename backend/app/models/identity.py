from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.ai import AiCallLog
    from app.models.evidence import Artifact
    from app.models.organization import Institution, Tenant
    from app.models.teaching import Course, ExperimentSession


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
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="student")
    submitted_artifacts: Mapped[list["Artifact"]] = relationship(back_populates="submitted_by")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="user")
