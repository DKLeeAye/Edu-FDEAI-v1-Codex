from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Institution, Tenant


class DeploymentInstance(IdMixin, TimestampMixin, Base):
    __tablename__ = "deployment_instances"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    environment: Mapped[str] = mapped_column(String(40), nullable=False, default="local")
    deployment_type: Mapped[str] = mapped_column(String(80), nullable=False, default="single_tenant")
    isolation_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    model_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="running")
    last_health_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped["Tenant"] = relationship(back_populates="deployment_instances")
    institution: Mapped["Institution"] = relationship(back_populates="deployment_instances")
    access_grants: Mapped[list["OperationsAccessGrant"]] = relationship(
        back_populates="deployment_instance"
    )


class LicenseEntitlement(IdMixin, TimestampMixin, Base):
    __tablename__ = "license_entitlements"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "institution_id",
            "entitlement_key",
            name="uq_license_entitlements_scope_key",
        ),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    entitlement_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    limit_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped["Tenant"] = relationship(back_populates="license_entitlements")
    institution: Mapped["Institution"] = relationship(back_populates="license_entitlements")


class OperationsAccessGrant(IdMixin, TimestampMixin, Base):
    __tablename__ = "operations_access_grants"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
        index=True,
    )
    deployment_instance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("deployment_instances.id"),
        nullable=False,
        index=True,
    )
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    granted_to_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    scope_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="operations_access_grants")
    institution: Mapped["Institution"] = relationship(back_populates="operations_access_grants")
    deployment_instance: Mapped["DeploymentInstance"] = relationship(back_populates="access_grants")
