from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PackageStatus, PackageType, RubricStatus, enum_values
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Institution, Tenant
    from app.models.teaching import Course, ExperimentSession


class ExperimentPackage(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiment_packages"
    __table_args__ = (
        UniqueConstraint("tenant_id", "institution_id", "slug", name="uq_packages_scope_slug"),
    )

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=True,
        index=True,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    package_type: Mapped[PackageType] = mapped_column(
        Enum(
            PackageType,
            name="package_type",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=PackageType.STANDARD,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="experiment_packages")
    institution: Mapped["Institution | None"] = relationship(back_populates="experiment_packages")
    versions: Mapped[list["ExperimentPackageVersion"]] = relationship(back_populates="package")


class ExperimentPackageVersion(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiment_package_versions"
    __table_args__ = (
        UniqueConstraint("package_id", "version", name="uq_package_versions_package_version"),
    )

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=True,
        index=True,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )
    package_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_packages.id"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[PackageStatus] = mapped_column(
        Enum(
            PackageStatus,
            name="package_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=PackageStatus.DRAFT,
    )
    content_manifest_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="experiment_package_versions")
    institution: Mapped["Institution | None"] = relationship(
        back_populates="experiment_package_versions"
    )
    package: Mapped["ExperimentPackage"] = relationship(back_populates="versions")
    courses: Mapped[list["Course"]] = relationship(back_populates="package_version")
    sessions: Mapped[list["ExperimentSession"]] = relationship(back_populates="package_version")
    rubrics: Mapped[list["Rubric"]] = relationship(back_populates="package_version")
    stage_blueprints: Mapped[list["StageBlueprint"]] = relationship(
        back_populates="package_version",
        order_by="StageBlueprint.stage_order",
    )


class StageBlueprint(IdMixin, TimestampMixin, Base):
    __tablename__ = "stage_blueprints"
    __table_args__ = (
        UniqueConstraint(
            "package_version_id",
            "stage_key",
            name="uq_stage_blueprints_package_version_stage",
        ),
        UniqueConstraint(
            "package_version_id",
            "stage_order",
            name="uq_stage_blueprints_package_version_order",
        ),
    )

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=True,
        index=True,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )
    package_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_package_versions.id"),
        nullable=False,
        index=True,
    )
    stage_key: Mapped[str] = mapped_column(String(50), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    blueprint_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="stage_blueprints")
    institution: Mapped["Institution | None"] = relationship(back_populates="stage_blueprints")
    package_version: Mapped["ExperimentPackageVersion"] = relationship(
        back_populates="stage_blueprints"
    )


class Rubric(IdMixin, TimestampMixin, Base):
    __tablename__ = "rubrics"
    __table_args__ = (
        UniqueConstraint(
            "package_version_id",
            "course_id",
            "stage_key",
            "version",
            name="uq_rubrics_package_course_stage_version",
        ),
    )

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=True,
        index=True,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("courses.id"),
        nullable=True,
        index=True,
    )
    package_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiment_package_versions.id"),
        nullable=False,
        index=True,
    )
    stage_key: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    status: Mapped[RubricStatus] = mapped_column(
        Enum(
            RubricStatus,
            name="rubric_status",
            native_enum=False,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=RubricStatus.DRAFT,
    )
    rubric_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="rubrics")
    institution: Mapped["Institution | None"] = relationship(back_populates="rubrics")
    course: Mapped["Course | None"] = relationship(back_populates="rubrics")
    package_version: Mapped["ExperimentPackageVersion"] = relationship(back_populates="rubrics")
