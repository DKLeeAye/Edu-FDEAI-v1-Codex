"""add registration invites

Revision ID: a9d4e8f6b102
Revises: f8c1d2e3a405
Create Date: 2026-06-02 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a9d4e8f6b102"
down_revision: Union[str, Sequence[str], None] = "f8c1d2e3a405"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "registration_invites",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("course_id", sa.Uuid(), nullable=True),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("role", sa.Enum("admin", "teacher", "student", name="user_role", native_enum=False), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False),
        sa.Column("used_count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_registration_invites_course_id_courses")),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name=op.f("fk_registration_invites_created_by_user_id_users")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_registration_invites_institution_id_institutions")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_registration_invites_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_registration_invites")),
    )
    op.create_index(op.f("ix_registration_invites_code_hash"), "registration_invites", ["code_hash"], unique=True)
    op.create_index(op.f("ix_registration_invites_course_id"), "registration_invites", ["course_id"], unique=False)
    op.create_index(op.f("ix_registration_invites_created_by_user_id"), "registration_invites", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_registration_invites_institution_id"), "registration_invites", ["institution_id"], unique=False)
    op.create_index(op.f("ix_registration_invites_tenant_id"), "registration_invites", ["tenant_id"], unique=False)

    op.create_table(
        "registration_invite_redemptions",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("invite_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_registration_invite_redemptions_course_id_courses")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_registration_invite_redemptions_institution_id_institutions")),
        sa.ForeignKeyConstraint(["invite_id"], ["registration_invites.id"], name=op.f("fk_registration_invite_redemptions_invite_id_registration_invites")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_registration_invite_redemptions_tenant_id_tenants")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_registration_invite_redemptions_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_registration_invite_redemptions")),
    )
    op.create_index(op.f("ix_registration_invite_redemptions_email"), "registration_invite_redemptions", ["email"], unique=False)
    op.create_index(op.f("ix_registration_invite_redemptions_invite_id"), "registration_invite_redemptions", ["invite_id"], unique=False)
    op.create_index(op.f("ix_registration_invite_redemptions_institution_id"), "registration_invite_redemptions", ["institution_id"], unique=False)
    op.create_index(op.f("ix_registration_invite_redemptions_tenant_id"), "registration_invite_redemptions", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_registration_invite_redemptions_user_id"), "registration_invite_redemptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_registration_invite_redemptions_user_id"), table_name="registration_invite_redemptions")
    op.drop_index(op.f("ix_registration_invite_redemptions_tenant_id"), table_name="registration_invite_redemptions")
    op.drop_index(op.f("ix_registration_invite_redemptions_institution_id"), table_name="registration_invite_redemptions")
    op.drop_index(op.f("ix_registration_invite_redemptions_invite_id"), table_name="registration_invite_redemptions")
    op.drop_index(op.f("ix_registration_invite_redemptions_email"), table_name="registration_invite_redemptions")
    op.drop_table("registration_invite_redemptions")
    op.drop_index(op.f("ix_registration_invites_tenant_id"), table_name="registration_invites")
    op.drop_index(op.f("ix_registration_invites_institution_id"), table_name="registration_invites")
    op.drop_index(op.f("ix_registration_invites_created_by_user_id"), table_name="registration_invites")
    op.drop_index(op.f("ix_registration_invites_course_id"), table_name="registration_invites")
    op.drop_index(op.f("ix_registration_invites_code_hash"), table_name="registration_invites")
    op.drop_table("registration_invites")
