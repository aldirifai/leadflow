"""seed default templates

Revision ID: 0002_seed_templates
Revises: 0001_initial
Create Date: 2026-05-01 00:01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_seed_templates"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EMAIL_TEMPLATE = """Halo tim {nama_bisnis},

Saya kebetulan lihat profil bisnis Anda di Maps untuk wilayah {kota}. Yang menarik perhatian saya adalah {observasi}.

Saya sendiri kerja di bidang pembuatan landing page dan company profile, dan dari yang saya amati, mungkin ada peluang untuk improvement di sisi online presence Anda — terutama untuk {angle_spesifik}.

Kalau memang relevan dan mau ngobrol singkat, saya siap kasih insight lebih detail tanpa komitmen. Kalau tidak relevan, gak masalah, terima kasih sudah baca.

Salam,
Aldi"""

WHATSAPP_TEMPLATE = """Halo {nama_bisnis}, saya Aldi.

Saya lihat di Maps untuk {kota}, dan {observasi}.

Saya bantu UMKM bikin landing page/company profile profesional. Kalau tertarik diskusi, kabari aja. Kalau tidak, no problem.

Terima kasih."""

LINKEDIN_TEMPLATE = """Halo {nama_bisnis},

Tertarik dengan apa yang Anda kerjakan di {kategori}. Saya bantu bisnis bangun landing page dan company profile yang fokus ke konversi.

Boleh terhubung untuk diskusi singkat?

Aldi"""


def upgrade() -> None:
    table = sa.table(
        "message_templates",
        sa.column("name", sa.String),
        sa.column("channel", sa.String),
        sa.column("subject", sa.String),
        sa.column("body", sa.Text),
        sa.column("is_default", sa.Boolean),
    )
    op.bulk_insert(
        table,
        [
            {
                "name": "Default email outreach",
                "channel": "email",
                "subject": "Quick observasi tentang {nama_bisnis}",
                "body": EMAIL_TEMPLATE,
                "is_default": True,
            },
            {
                "name": "Default WhatsApp",
                "channel": "whatsapp",
                "subject": None,
                "body": WHATSAPP_TEMPLATE,
                "is_default": True,
            },
            {
                "name": "Default LinkedIn DM",
                "channel": "linkedin",
                "subject": None,
                "body": LINKEDIN_TEMPLATE,
                "is_default": True,
            },
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM message_templates WHERE is_default = true")
