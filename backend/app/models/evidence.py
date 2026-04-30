from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ArtifactStatus, YellowFlagSeverity, YellowFlagStatus, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Institution, Tenant
    from app.models.identity import User
    from app.models.teaching import Course, ExperimentSession, StageRecord


class Artifact(IdMixin, TimestampMixin, Base):
    __tablename__ = "artifacts"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id"), nullable=False, index=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_sessions.id"),
        nullable=False,
        index=True,
    )
    stage_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stage_records.id"),
        nullable=False,
        index=True,
    )
    stage_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    artifact_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    file_record_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[ArtifactStatus] = mapped_column(
        Enum(
            ArtifactStatus,
            name="artifact_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=ArtifactStatus.DRAFT,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="artifacts")
    institution: Mapped["Institution"] = relationship(back_populates="artifacts")
    course: Mapped["Course"] = relationship(back_populates="artifacts")
    session: Mapped["ExperimentSession"] = relationship(back_populates="artifacts")
    stage_record: Mapped["StageRecord"] = relationship(back_populates="artifacts")
    submitted_by: Mapped["User | None"] = relationship(back_populates="submitted_artifacts")


class YellowFlag(IdMixin, TimestampMixin, Base):
    __tablename__ = "yellow_flags"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id"), nullable=False, index=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_sessions.id"),
        nullable=False,
        index=True,
    )
    source_stage_record_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stage_records.id"),
        nullable=True,
        index=True,
    )
    source_artifact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("artifacts.id"),
        nullable=True,
        index=True,
    )
    source_review_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True, index=True)
    cleared_by_artifact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("artifacts.id"),
        nullable=True,
        index=True,
    )
    source_stage_key: Mapped[str] = mapped_column(String(50), nullable=False)
    impact_stage_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    flag_type: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[YellowFlagSeverity] = mapped_column(
        Enum(
            YellowFlagSeverity,
            name="yellow_flag_severity",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=YellowFlagSeverity.MEDIUM,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[YellowFlagStatus] = mapped_column(
        Enum(
            YellowFlagStatus,
            name="yellow_flag_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=YellowFlagStatus.OPEN,
    )
    acknowledged_by_student: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    teacher_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="yellow_flags")
    institution: Mapped["Institution"] = relationship(back_populates="yellow_flags")
    course: Mapped["Course"] = relationship(back_populates="yellow_flags")
    session: Mapped["ExperimentSession"] = relationship(back_populates="yellow_flags")
    source_stage_record: Mapped["StageRecord | None"] = relationship(
        back_populates="yellow_flags",
        foreign_keys=[source_stage_record_id],
    )
    source_artifact: Mapped["Artifact | None"] = relationship(foreign_keys=[source_artifact_id])
    cleared_by_artifact: Mapped["Artifact | None"] = relationship(
        foreign_keys=[cleared_by_artifact_id]
    )
