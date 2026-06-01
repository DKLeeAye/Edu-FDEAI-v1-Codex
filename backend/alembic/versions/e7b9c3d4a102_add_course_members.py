"""add course members

Revision ID: e7b9c3d4a102
Revises: d6a4f2c8b901
Create Date: 2026-06-01 21:20:00.000000

"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7b9c3d4a102"
down_revision: Union[str, Sequence[str], None] = "d6a4f2c8b901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_members",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_course_members_course_id_courses")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_course_members_institution_id_institutions")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_course_members_tenant_id_tenants")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_course_members_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_course_members")),
        sa.UniqueConstraint("course_id", "user_id", name="uq_course_members_course_user"),
    )
    op.create_index(op.f("ix_course_members_course_id"), "course_members", ["course_id"], unique=False)
    op.create_index(op.f("ix_course_members_institution_id"), "course_members", ["institution_id"], unique=False)
    op.create_index(op.f("ix_course_members_tenant_id"), "course_members", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_course_members_user_id"), "course_members", ["user_id"], unique=False)

    connection = op.get_bind()
    courses = connection.execute(
        sa.text(
            """
            SELECT id, tenant_id, institution_id, created_by_user_id
            FROM courses
            WHERE created_by_user_id IS NOT NULL
            """
        )
    )
    for course in courses.mappings():
        connection.execute(
            sa.text(
                """
                INSERT INTO course_members (
                    tenant_id,
                    institution_id,
                    course_id,
                    user_id,
                    role,
                    is_active,
                    id,
                    created_at,
                    updated_at
                )
                VALUES (
                    :tenant_id,
                    :institution_id,
                    :course_id,
                    :user_id,
                    'teacher',
                    :is_active,
                    :id,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "course_id": course["id"],
                "id": uuid.uuid4(),
                "institution_id": course["institution_id"],
                "is_active": True,
                "tenant_id": course["tenant_id"],
                "user_id": course["created_by_user_id"],
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_course_members_user_id"), table_name="course_members")
    op.drop_index(op.f("ix_course_members_tenant_id"), table_name="course_members")
    op.drop_index(op.f("ix_course_members_institution_id"), table_name="course_members")
    op.drop_index(op.f("ix_course_members_course_id"), table_name="course_members")
    op.drop_table("course_members")
