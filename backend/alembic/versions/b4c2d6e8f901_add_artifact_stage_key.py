"""add artifact stage key

Revision ID: b4c2d6e8f901
Revises: 82e61f25d0bf
Create Date: 2026-04-30 15:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b4c2d6e8f901"
down_revision: Union[str, Sequence[str], None] = "82e61f25d0bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("artifacts", sa.Column("stage_key", sa.String(length=50), nullable=True))
    op.execute(
        """
        UPDATE artifacts
        SET stage_key = stage_records.stage_key
        FROM stage_records
        WHERE artifacts.stage_record_id = stage_records.id
        """
    )
    op.execute("UPDATE artifacts SET stage_key = 'unknown' WHERE stage_key IS NULL")
    op.alter_column("artifacts", "stage_key", existing_type=sa.String(length=50), nullable=False)
    op.create_index(op.f("ix_artifacts_stage_key"), "artifacts", ["stage_key"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_artifacts_stage_key"), table_name="artifacts")
    op.drop_column("artifacts", "stage_key")
