"""add admin operations models

Revision ID: f8c1d2e3a405
Revises: e7b9c3d4a102
Create Date: 2026-06-01 22:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f8c1d2e3a405"
down_revision: Union[str, Sequence[str], None] = "e7b9c3d4a102"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deployment_instances",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("environment", sa.String(length=40), nullable=False),
        sa.Column("deployment_type", sa.String(length=80), nullable=False),
        sa.Column("isolation_strategy", sa.Text(), nullable=False),
        sa.Column("model_strategy", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("last_health_check_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_deployment_instances_institution_id_institutions")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_deployment_instances_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deployment_instances")),
    )
    op.create_index(op.f("ix_deployment_instances_institution_id"), "deployment_instances", ["institution_id"], unique=False)
    op.create_index(op.f("ix_deployment_instances_tenant_id"), "deployment_instances", ["tenant_id"], unique=False)

    op.create_table(
        "license_entitlements",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("entitlement_key", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_license_entitlements_institution_id_institutions")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_license_entitlements_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_license_entitlements")),
        sa.UniqueConstraint("tenant_id", "institution_id", "entitlement_key", name="uq_license_entitlements_scope_key"),
    )
    op.create_index(op.f("ix_license_entitlements_entitlement_key"), "license_entitlements", ["entitlement_key"], unique=False)
    op.create_index(op.f("ix_license_entitlements_institution_id"), "license_entitlements", ["institution_id"], unique=False)
    op.create_index(op.f("ix_license_entitlements_tenant_id"), "license_entitlements", ["tenant_id"], unique=False)

    op.create_table(
        "operations_access_grants",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("deployment_instance_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("granted_to_user_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("scope_json", sa.JSON(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["deployment_instance_id"], ["deployment_instances.id"], name=op.f("fk_operations_access_grants_deployment_instance_id_deployment_instances")),
        sa.ForeignKeyConstraint(["granted_to_user_id"], ["users.id"], name=op.f("fk_operations_access_grants_granted_to_user_id_users")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_operations_access_grants_institution_id_institutions")),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], name=op.f("fk_operations_access_grants_requested_by_user_id_users")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_operations_access_grants_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_operations_access_grants")),
    )
    op.create_index(op.f("ix_operations_access_grants_deployment_instance_id"), "operations_access_grants", ["deployment_instance_id"], unique=False)
    op.create_index(op.f("ix_operations_access_grants_granted_to_user_id"), "operations_access_grants", ["granted_to_user_id"], unique=False)
    op.create_index(op.f("ix_operations_access_grants_institution_id"), "operations_access_grants", ["institution_id"], unique=False)
    op.create_index(op.f("ix_operations_access_grants_requested_by_user_id"), "operations_access_grants", ["requested_by_user_id"], unique=False)
    op.create_index(op.f("ix_operations_access_grants_tenant_id"), "operations_access_grants", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_operations_access_grants_tenant_id"), table_name="operations_access_grants")
    op.drop_index(op.f("ix_operations_access_grants_requested_by_user_id"), table_name="operations_access_grants")
    op.drop_index(op.f("ix_operations_access_grants_institution_id"), table_name="operations_access_grants")
    op.drop_index(op.f("ix_operations_access_grants_granted_to_user_id"), table_name="operations_access_grants")
    op.drop_index(op.f("ix_operations_access_grants_deployment_instance_id"), table_name="operations_access_grants")
    op.drop_table("operations_access_grants")
    op.drop_index(op.f("ix_license_entitlements_tenant_id"), table_name="license_entitlements")
    op.drop_index(op.f("ix_license_entitlements_institution_id"), table_name="license_entitlements")
    op.drop_index(op.f("ix_license_entitlements_entitlement_key"), table_name="license_entitlements")
    op.drop_table("license_entitlements")
    op.drop_index(op.f("ix_deployment_instances_tenant_id"), table_name="deployment_instances")
    op.drop_index(op.f("ix_deployment_instances_institution_id"), table_name="deployment_instances")
    op.drop_table("deployment_instances")
