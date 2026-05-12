"""add stage one guided training records

Revision ID: d6a4f2c8b901
Revises: c1f4e9a2b7d3
Create Date: 2026-05-10 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d6a4f2c8b901"
down_revision: Union[str, Sequence[str], None] = "c1f4e9a2b7d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stage_one_guided_attempts",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("stage_record_id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("active_level", sa.String(length=80), nullable=False),
        sa.Column("completed_levels_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_stage_one_guided_attempts_course_id_courses")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_stage_one_guided_attempts_institution_id_institutions")),
        sa.ForeignKeyConstraint(["session_id"], ["experiment_sessions.id"], name=op.f("fk_stage_one_guided_attempts_session_id_experiment_sessions")),
        sa.ForeignKeyConstraint(["stage_record_id"], ["stage_records.id"], name=op.f("fk_stage_one_guided_attempts_stage_record_id_stage_records")),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], name=op.f("fk_stage_one_guided_attempts_student_user_id_users")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_stage_one_guided_attempts_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stage_one_guided_attempts")),
        sa.UniqueConstraint("session_id", "stage_record_id", name="uq_stage_one_guided_attempts_session_stage"),
    )
    op.create_index(op.f("ix_stage_one_guided_attempts_course_id"), "stage_one_guided_attempts", ["course_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_attempts_institution_id"), "stage_one_guided_attempts", ["institution_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_attempts_session_id"), "stage_one_guided_attempts", ["session_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_attempts_stage_record_id"), "stage_one_guided_attempts", ["stage_record_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_attempts_student_user_id"), "stage_one_guided_attempts", ["student_user_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_attempts_tenant_id"), "stage_one_guided_attempts", ["tenant_id"], unique=False)

    op.create_table(
        "stage_one_guided_turns",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("stage_record_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("level_key", sa.String(length=80), nullable=False),
        sa.Column("student_message", sa.Text(), nullable=False),
        sa.Column("customer_response", sa.Text(), nullable=False),
        sa.Column("feedback_json", sa.JSON(), nullable=False),
        sa.Column("customer_call_log_id", sa.Uuid(), nullable=True),
        sa.Column("feedback_call_log_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["stage_one_guided_attempts.id"], name=op.f("fk_stage_one_guided_turns_attempt_id_stage_one_guided_attempts")),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_stage_one_guided_turns_course_id_courses")),
        sa.ForeignKeyConstraint(["customer_call_log_id"], ["ai_call_logs.id"], name=op.f("fk_stage_one_guided_turns_customer_call_log_id_ai_call_logs")),
        sa.ForeignKeyConstraint(["feedback_call_log_id"], ["ai_call_logs.id"], name=op.f("fk_stage_one_guided_turns_feedback_call_log_id_ai_call_logs")),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], name=op.f("fk_stage_one_guided_turns_institution_id_institutions")),
        sa.ForeignKeyConstraint(["session_id"], ["experiment_sessions.id"], name=op.f("fk_stage_one_guided_turns_session_id_experiment_sessions")),
        sa.ForeignKeyConstraint(["stage_record_id"], ["stage_records.id"], name=op.f("fk_stage_one_guided_turns_stage_record_id_stage_records")),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], name=op.f("fk_stage_one_guided_turns_student_user_id_users")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_stage_one_guided_turns_tenant_id_tenants")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stage_one_guided_turns")),
    )
    op.create_index(op.f("ix_stage_one_guided_turns_attempt_id"), "stage_one_guided_turns", ["attempt_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_course_id"), "stage_one_guided_turns", ["course_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_customer_call_log_id"), "stage_one_guided_turns", ["customer_call_log_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_feedback_call_log_id"), "stage_one_guided_turns", ["feedback_call_log_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_institution_id"), "stage_one_guided_turns", ["institution_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_level_key"), "stage_one_guided_turns", ["level_key"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_session_id"), "stage_one_guided_turns", ["session_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_stage_record_id"), "stage_one_guided_turns", ["stage_record_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_student_user_id"), "stage_one_guided_turns", ["student_user_id"], unique=False)
    op.create_index(op.f("ix_stage_one_guided_turns_tenant_id"), "stage_one_guided_turns", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stage_one_guided_turns_tenant_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_student_user_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_stage_record_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_session_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_level_key"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_institution_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_feedback_call_log_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_customer_call_log_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_course_id"), table_name="stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_turns_attempt_id"), table_name="stage_one_guided_turns")
    op.drop_table("stage_one_guided_turns")
    op.drop_index(op.f("ix_stage_one_guided_attempts_tenant_id"), table_name="stage_one_guided_attempts")
    op.drop_index(op.f("ix_stage_one_guided_attempts_student_user_id"), table_name="stage_one_guided_attempts")
    op.drop_index(op.f("ix_stage_one_guided_attempts_stage_record_id"), table_name="stage_one_guided_attempts")
    op.drop_index(op.f("ix_stage_one_guided_attempts_session_id"), table_name="stage_one_guided_attempts")
    op.drop_index(op.f("ix_stage_one_guided_attempts_institution_id"), table_name="stage_one_guided_attempts")
    op.drop_index(op.f("ix_stage_one_guided_attempts_course_id"), table_name="stage_one_guided_attempts")
    op.drop_table("stage_one_guided_attempts")
