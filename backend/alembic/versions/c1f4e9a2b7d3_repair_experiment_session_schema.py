"""repair experiment session schema

Revision ID: c1f4e9a2b7d3
Revises: b4c2d6e8f901
Create Date: 2026-05-07 12:35:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1f4e9a2b7d3"
down_revision: Union[str, Sequence[str], None] = "b4c2d6e8f901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Repair local schemas that drifted from the tracked SQLAlchemy models."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {column["name"] for column in inspector.get_columns("experiment_sessions")}
    if "project_description" in columns:
        op.drop_column("experiment_sessions", "project_description")
    if "project_title" in columns:
        op.drop_column("experiment_sessions", "project_title")

    unique_constraints = {
        constraint["name"] for constraint in inspector.get_unique_constraints("experiment_sessions")
    }
    if "uq_sessions_course_student" not in unique_constraints:
        op.execute(
            """
            CREATE TEMPORARY TABLE duplicate_experiment_sessions_to_delete
            ON COMMIT DROP
            AS
            SELECT id
            FROM (
                SELECT
                    id,
                    row_number() OVER (
                        PARTITION BY course_id, student_user_id
                        ORDER BY
                            CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
                            completed_at DESC NULLS LAST,
                            updated_at DESC,
                            created_at DESC,
                            id DESC
                    ) AS duplicate_rank
                FROM experiment_sessions
            ) ranked_sessions
            WHERE duplicate_rank > 1
            """
        )
        op.execute(
            """
            DELETE FROM yellow_flags
            WHERE session_id IN (SELECT id FROM duplicate_experiment_sessions_to_delete)
            """
        )
        op.execute(
            """
            DELETE FROM artifacts
            WHERE session_id IN (SELECT id FROM duplicate_experiment_sessions_to_delete)
            """
        )
        op.execute(
            """
            DELETE FROM ai_call_logs
            WHERE session_id IN (SELECT id FROM duplicate_experiment_sessions_to_delete)
            """
        )
        op.execute(
            """
            DELETE FROM stage_records
            WHERE session_id IN (SELECT id FROM duplicate_experiment_sessions_to_delete)
            """
        )
        op.execute(
            """
            DELETE FROM experiment_sessions
            WHERE id IN (SELECT id FROM duplicate_experiment_sessions_to_delete)
            """
        )
        op.create_unique_constraint(
            "uq_sessions_course_student",
            "experiment_sessions",
            ["course_id", "student_user_id"],
        )


def downgrade() -> None:
    """No-op: this revision only removes untracked local schema drift."""
