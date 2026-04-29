from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CourseStatus, SessionStatus, StageStatus, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.ai import AiCallLog
    from app.models.content import ExperimentPackageVersion, Rubric
    from app.models.evidence import Artifact, YellowFlag
    from app.models.identity import User
    from app.models.organization import Institution, Tenant


class Course(IdMixin, TimestampMixin, Base):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_courses_institution_code"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    package_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_package_versions.id"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[CourseStatus] = mapped_column(
        Enum(
            CourseStatus,
            name="course_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=CourseStatus.DRAFT,
    )
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="courses")
    institution: Mapped["Institution"] = relationship(back_populates="courses")
    package_version: Mapped["ExperimentPackageVersion"] = relationship(back_populates="courses")
    created_by: Mapped["User | None"] = relationship(back_populates="created_courses")
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="course")
    stage_records: Mapped[list["StageRecord"]] = relationship(back_populates="course")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="course")
    rubrics: Mapped[list["Rubric"]] = relationship(back_populates="course")
    yellow_flags: Mapped[list["YellowFlag"]] = relationship(back_populates="course")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="course")


class ExperimentSession(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiment_sessions"
    __table_args__ = (
        UniqueConstraint("course_id", "student_user_id", name="uq_sessions_course_student"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    student_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    package_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_package_versions.id"),
        nullable=False,
        index=True,
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(
            SessionStatus,
            name="session_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=SessionStatus.NOT_STARTED,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="sessions")
    institution: Mapped["Institution"] = relationship(back_populates="sessions")
    course: Mapped["Course"] = relationship(back_populates="sessions")
    student: Mapped["User"] = relationship(back_populates="sessions")
    package_version: Mapped["ExperimentPackageVersion"] = relationship(back_populates="sessions")
    stage_records: Mapped[list["StageRecord"]] = relationship(back_populates="session")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="session")
    yellow_flags: Mapped[list["YellowFlag"]] = relationship(back_populates="session")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="session")


class StageRecord(IdMixin, TimestampMixin, Base):
    __tablename__ = "stage_records"
    __table_args__ = (
        UniqueConstraint("session_id", "stage_key", name="uq_stage_records_session_stage"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_sessions.id"),
        nullable=False,
        index=True,
    )
    stage_key: Mapped[str] = mapped_column(String(50), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[StageStatus] = mapped_column(
        Enum(
            StageStatus,
            name="stage_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=StageStatus.LOCKED,
    )
    skipped_learning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    skipped_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="stage_records")
    institution: Mapped["Institution"] = relationship(back_populates="stage_records")
    course: Mapped["Course"] = relationship(back_populates="stage_records")
    session: Mapped["ExperimentSession"] = relationship(back_populates="stage_records")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="stage_record")
    yellow_flags: Mapped[list["YellowFlag"]] = relationship(back_populates="source_stage_record")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="stage_record")
