"""update default templates for dental clinic niche (landingklinik.id)

Revision ID: 0003_update_dental_templates
Revises: 0002_seed_templates
Create Date: 2026-05-01 00:02:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_update_dental_templates"
down_revision: Union[str, None] = "0002_seed_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EMAIL_SUBJECT = "Landing page khusus klinik gigi"

EMAIL_TEMPLATE = """Halo tim {nama_bisnis},

Saya kebetulan lihat profil {nama_bisnis} di Maps untuk wilayah {kota}. {observasi}.

Saya bareng tim landingklinik.id bantu klinik gigi bikin landing page yang fokus konversi pasien — single page, mobile-first, ada booking form dan WhatsApp CTA langsung. Klinik yang sudah pakai biasanya kebantu naikin booking dalam 2-3 bulan pertama.

Paket dasarnya 5.5 juta, sudah termasuk design, copywriting, dan setup. Selesai 7-10 hari kerja.

Kalau memang ada plan upgrade online presence dalam waktu dekat, saya bisa kirim 2-3 contoh studi kasus klinik yang sudah jalan. Kalau belum waktunya juga gak masalah, terima kasih sudah baca.

Salam,
Aldi
landingklinik.id"""

WHATSAPP_TEMPLATE = """Halo {nama_bisnis}, saya Aldi dari landingklinik.id.

Lihat profil di Maps untuk wilayah {kota}, dan {observasi}.

Kami bantu klinik gigi bikin landing page fokus konversi pasien — paket 5.5jt, mobile-first, ada booking form dan WA CTA. Selesai 7-10 hari.

Kalau tertarik diskusi singkat boleh kabari. Kalau gak relevan, no problem.

Terima kasih."""

LINKEDIN_TEMPLATE = """Halo {nama_bisnis},

Tertarik dengan apa yang dikerjakan di {kategori}. Saya bareng landingklinik.id bantu klinik gigi bikin landing page fokus konversi pasien — single page mobile-first dengan booking form dan WA CTA. Paket 5.5jt, 7-10 hari kerja.

Kalau ada plan refresh online presence, mau ngobrol singkat?

Aldi"""


def upgrade() -> None:
    msg_templates = sa.table(
        "message_templates",
        sa.column("name", sa.String),
        sa.column("channel", sa.String),
        sa.column("subject", sa.String),
        sa.column("body", sa.Text),
    )

    op.execute(
        msg_templates.update()
        .where(msg_templates.c.name == "Default email outreach")
        .where(msg_templates.c.channel == "email")
        .values(subject=EMAIL_SUBJECT, body=EMAIL_TEMPLATE)
    )

    op.execute(
        msg_templates.update()
        .where(msg_templates.c.name == "Default WhatsApp")
        .where(msg_templates.c.channel == "whatsapp")
        .values(body=WHATSAPP_TEMPLATE)
    )

    op.execute(
        msg_templates.update()
        .where(msg_templates.c.name == "Default LinkedIn DM")
        .where(msg_templates.c.channel == "linkedin")
        .values(body=LINKEDIN_TEMPLATE)
    )


def downgrade() -> None:
    pass
