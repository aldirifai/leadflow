"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-01 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("place_id", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("address", sa.Text()),
        sa.Column("phone", sa.String(50)),
        sa.Column("whatsapp", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("linkedin", sa.String(500)),
        sa.Column("instagram", sa.String(500)),
        sa.Column("website", sa.String(1000)),
        sa.Column("category", sa.String(255)),
        sa.Column("rating", sa.Float()),
        sa.Column("review_count", sa.Integer(), server_default="0"),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("city", sa.String(255)),
        sa.Column("province", sa.String(255)),
        sa.Column("hours_json", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("raw_data", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("is_blacklisted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(50), nullable=False, server_default="new"),
        sa.Column("notes", sa.Text()),
        sa.Column("scraped_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_leads_place_id", "leads", ["place_id"])
    op.create_index("ix_leads_phone", "leads", ["phone"])
    op.create_index("ix_leads_whatsapp", "leads", ["whatsapp"])
    op.create_index("ix_leads_email", "leads", ["email"])
    op.create_index("ix_leads_category", "leads", ["category"])
    op.create_index("ix_leads_city", "leads", ["city"])
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index("ix_leads_is_blacklisted", "leads", ["is_blacklisted"])
    op.create_index("ix_leads_scraped_at", "leads", ["scraped_at"])

    op.create_table(
        "lead_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("fit_score", sa.Integer(), nullable=False),
        sa.Column("reasons", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("scored_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_lead_scores_fit_score", "lead_scores", ["fit_score"])

    op.create_table(
        "lead_enrichments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("website_summary", sa.Text()),
        sa.Column("website_audit", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("suggested_angle", sa.Text()),
        sa.Column("generated_message_email_subject", sa.String(500)),
        sa.Column("generated_message_email", sa.Text()),
        sa.Column("generated_message_whatsapp", sa.Text()),
        sa.Column("generated_message_linkedin", sa.Text()),
        sa.Column("enriched_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "outreach_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(500)),
        sa.Column("message_sent", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("replied", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reply_at", sa.DateTime()),
        sa.Column("reply_text", sa.Text()),
        sa.Column("notes", sa.Text()),
    )
    op.create_index("ix_outreach_log_lead_id", "outreach_log", ["lead_id"])
    op.create_index("ix_outreach_log_sent_at", "outreach_log", ["sent_at"])

    op.create_table(
        "searches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("query", sa.String(500), nullable=False),
        sa.Column("location", sa.String(255)),
        sa.Column("results_count", sa.Integer(), server_default="0"),
        sa.Column("run_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_searches_run_at", "searches", ["run_at"])

    op.create_table(
        "ingest_quota",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date_key", sa.String(10), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("date_key", name="uq_quota_date"),
    )
    op.create_index("ix_ingest_quota_date_key", "ingest_quota", ["date_key"])

    op.create_table(
        "message_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(500)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_message_templates_channel", "message_templates", ["channel"])

    op.create_table(
        "blacklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("identifier_type", sa.String(50), nullable=False),
        sa.Column("identifier_value", sa.String(500), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("identifier_type", "identifier_value", name="uq_blacklist_identifier"),
    )
    op.create_index("ix_blacklist_identifier_type", "blacklist", ["identifier_type"])
    op.create_index("ix_blacklist_identifier_value", "blacklist", ["identifier_value"])

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_table("blacklist")
    op.drop_table("message_templates")
    op.drop_table("ingest_quota")
    op.drop_table("searches")
    op.drop_table("outreach_log")
    op.drop_table("lead_enrichments")
    op.drop_table("lead_scores")
    op.drop_table("leads")
