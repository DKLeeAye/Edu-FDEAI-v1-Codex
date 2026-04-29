from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AiCallStatus, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.identity import User
    from app.models.organization import Institution, Tenant
    from app.models.teaching import Course, ExperimentSession, StageRecord


class AiCallLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_call_logs"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("courses.id"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("experiment_sessions.id"),
        nullable=True,
        index=True,
    )
    stage_record_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stage_records.id"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    prompt_version_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True, index=True)
    usage_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[AiCallStatus] = mapped_column(
        Enum(
            AiCallStatus,
            name="ai_call_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=AiCallStatus.SUCCEEDED,
    )
    request_metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    response_metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="ai_call_logs")
    institution: Mapped["Institution"] = relationship(back_populates="ai_call_logs")
    course: Mapped["Course | None"] = relationship(back_populates="ai_call_logs")
    session: Mapped["ExperimentSession | None"] = relationship(back_populates="ai_call_logs")
    stage_record: Mapped["StageRecord | None"] = relationship(back_populates="ai_call_logs")
    user: Mapped["User | None"] = relationship(back_populates="ai_call_logs")
