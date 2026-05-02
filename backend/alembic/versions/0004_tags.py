"""tags and lead_tags

Revision ID: 0004_tags
Revises: 0003_update_dental_templates
Create Date: 2026-05-02 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_tags"
down_revision: Union[str, None] = "0003_update_dental_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("color", sa.String(20)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_tags_name", "tags", ["name"])

    op.create_table(
        "lead_tags",
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.Integer(), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_lead_tags_lead_id", "lead_tags", ["lead_id"])
    op.create_index("ix_lead_tags_tag_id", "lead_tags", ["tag_id"])


def downgrade() -> None:
    op.drop_table("lead_tags")
    op.drop_table("tags")
