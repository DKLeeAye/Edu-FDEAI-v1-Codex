from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.ai import AiCallLog
    from app.models.content import ExperimentPackage, ExperimentPackageVersion, Rubric, StageBlueprint
    from app.models.evidence import Artifact, YellowFlag
    from app.models.identity import User
    from app.models.teaching import Course, ExperimentSession, StageRecord


class Tenant(IdMixin, TimestampMixin, Base):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)

    institutions: Mapped[list["Institution"]] = relationship(back_populates="tenant")
    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    courses: Mapped[list["Course"]] = relationship(back_populates="tenant")
    experiment_packages: Mapped[list["ExperimentPackage"]] = relationship(back_populates="tenant")
    experiment_package_versions: Mapped[list["ExperimentPackageVersion"]] = relationship(
        back_populates="tenant"
    )
    stage_blueprints: Mapped[list["StageBlueprint"]] = relationship(back_populates="tenant")
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="tenant")
    stage_records: Mapped[list["StageRecord"]] = relationship(back_populates="tenant")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="tenant")
    rubrics: Mapped[list["Rubric"]] = relationship(back_populates="tenant")
    yellow_flags: Mapped[list["YellowFlag"]] = relationship(back_populates="tenant")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="tenant")


class Institution(IdMixin, TimestampMixin, Base):
    __tablename__ = "institutions"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_institutions_tenant_code"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="institutions")
    users: Mapped[list["User"]] = relationship(back_populates="institution")
    courses: Mapped[list["Course"]] = relationship(back_populates="institution")
    experiment_packages: Mapped[list["ExperimentPackage"]] = relationship(
        back_populates="institution"
    )
    experiment_package_versions: Mapped[list["ExperimentPackageVersion"]] = relationship(
        back_populates="institution"
    )
    stage_blueprints: Mapped[list["StageBlueprint"]] = relationship(back_populates="institution")
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="institution")
    stage_records: Mapped[list["StageRecord"]] = relationship(back_populates="institution")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="institution")
    rubrics: Mapped[list["Rubric"]] = relationship(back_populates="institution")
    yellow_flags: Mapped[list["YellowFlag"]] = relationship(back_populates="institution")
    ai_call_logs: Mapped[list["AiCallLog"]] = relationship(back_populates="institution")
