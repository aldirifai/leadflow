"""Lead enrichment: website analysis + outreach angle + message generation."""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadEnrichment, MessageTemplate
from app.services.openrouter import chat_completion, chat_completion_json
from app.services.website import fetch_website_text


SYSTEM_PROMPT_ANALYSIS = """Anda adalah analis bisnis yang membantu mengidentifikasi peluang outreach untuk jasa pembuatan landing page dan company profile.
Tugas: analisis bisnis berdasarkan data yang diberikan, identifikasi 1-2 kelemahan online presence yang konkret,
dan sarankan ANGLE OUTREACH yang spesifik, natural, dan tidak generik.
Output harus JSON valid dengan field: website_summary (1-2 kalimat tentang bisnis ini),
weaknesses (list of strings, max 3), suggested_angle (1 paragraf saran approach outreach yang personal).
Bahasa: Indonesia santai profesional. Hindari bahasa marketing-y.
"""

SYSTEM_PROMPT_MESSAGE = """Anda adalah copywriter yang menulis pesan outreach personal untuk jasa pembuatan landing page / company profile.
Aturan WAJIB:
1. Pesan harus terasa personal — sebutkan observasi konkret tentang bisnis target (bukan generik).
2. Singkat dan langsung ke poin. Email max 120 kata, WhatsApp max 60 kata, LinkedIn max 80 kata.
3. Tidak ada hard sell, tidak ada CTA agresif. Tutup dengan pertanyaan terbuka atau opsi mudah untuk decline.
4. Bahasa: Indonesia santai profesional. Sapaan: "Halo {nama_bisnis}" atau "Halo tim {nama_bisnis}".
5. Jangan janjikan hasil spesifik (omzet naik, conversion melonjak). Fokus ke value proposition yang jujur.
6. Untuk email, tulis subject line di bawah max 50 char yang specific bukan clickbait.
"""


async def enrich_lead(db: Session, lead: Lead) -> LeadEnrichment:
    """
    Run full enrichment for one lead:
    1. Fetch website (if any)
    2. LLM analysis -> website_summary, weaknesses, suggested_angle
    3. Persist to lead_enrichments
    """
    website_data: dict[str, Any] = {}
    if lead.website:
        website_data = await fetch_website_text(lead.website)

    business_context = _build_business_context(lead, website_data)

    try:
        analysis = await chat_completion_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_ANALYSIS},
                {"role": "user", "content": business_context},
            ],
            temperature=0.5,
            max_tokens=800,
        )
    except Exception as e:
        analysis = {
            "website_summary": f"Enrichment failed: {type(e).__name__}",
            "weaknesses": [],
            "suggested_angle": "",
        }

    enrichment = lead.enrichment
    if enrichment:
        enrichment.website_summary = analysis.get("website_summary")
        enrichment.website_audit = {
            "website_data": website_data,
            "weaknesses": analysis.get("weaknesses", []),
        }
        enrichment.suggested_angle = analysis.get("suggested_angle")
        enrichment.enriched_at = datetime.utcnow()
    else:
        enrichment = LeadEnrichment(
            lead_id=lead.id,
            website_summary=analysis.get("website_summary"),
            website_audit={
                "website_data": website_data,
                "weaknesses": analysis.get("weaknesses", []),
            },
            suggested_angle=analysis.get("suggested_angle"),
        )
        db.add(enrichment)

    db.flush()
    return enrichment


async def generate_message(
    db: Session,
    lead: Lead,
    channel: str,
    template: MessageTemplate | None = None,
    custom_instructions: str | None = None,
) -> dict[str, str | None]:
    """
    Generate personalized outreach message for given channel.
    Returns dict with 'subject' (only for email) and 'body'.
    """
    enrichment = lead.enrichment
    angle = enrichment.suggested_angle if enrichment else None
    summary = enrichment.website_summary if enrichment else None

    user_prompt = _build_message_prompt(lead, channel, angle, summary, template, custom_instructions)

    try:
        result = await chat_completion_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_MESSAGE},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=600,
        )
    except Exception as e:
        return {"subject": None, "body": f"[Generation failed: {type(e).__name__}]"}

    subject = result.get("subject") if channel == "email" else None
    body = result.get("body", "")

    if enrichment:
        if channel == "email":
            enrichment.generated_message_email_subject = subject
            enrichment.generated_message_email = body
        elif channel == "whatsapp":
            enrichment.generated_message_whatsapp = body
        elif channel == "linkedin":
            enrichment.generated_message_linkedin = body
        db.flush()

    return {"subject": subject, "body": body}


def _build_business_context(lead: Lead, website_data: dict) -> str:
    parts = [f"Nama bisnis: {lead.name}"]
    if lead.category:
        parts.append(f"Kategori: {lead.category}")
    if lead.address:
        parts.append(f"Alamat: {lead.address}")
    if lead.city:
        parts.append(f"Kota: {lead.city}")
    if lead.rating:
        parts.append(f"Rating Google: {lead.rating} ({lead.review_count or 0} review)")
    if lead.website:
        parts.append(f"Website: {lead.website}")
    if lead.instagram:
        parts.append(f"Instagram: {lead.instagram}")

    if website_data:
        if website_data.get("error"):
            parts.append(f"\nWebsite fetch error: {website_data['error']}")
        else:
            if website_data.get("title"):
                parts.append(f"\nJudul website: {website_data['title']}")
            if website_data.get("description"):
                parts.append(f"Deskripsi meta: {website_data['description']}")
            if website_data.get("headings"):
                parts.append("Headings utama:")
                for h in website_data["headings"][:5]:
                    parts.append(f"  - [{h['level']}] {h['text']}")
            if website_data.get("body_excerpt"):
                parts.append(f"\nIsi website (potongan): {website_data['body_excerpt'][:2000]}")

    parts.append(
        "\nKeluaran sebagai JSON dengan field: website_summary, weaknesses (list), suggested_angle."
    )
    return "\n".join(parts)


def _build_message_prompt(
    lead: Lead,
    channel: str,
    angle: str | None,
    summary: str | None,
    template: MessageTemplate | None,
    custom: str | None,
) -> str:
    parts = [
        f"Nama bisnis: {lead.name}",
        f"Kategori: {lead.category or 'Tidak diketahui'}",
        f"Kota: {lead.city or 'Tidak diketahui'}",
        f"Channel: {channel}",
    ]
    if lead.website:
        parts.append(f"Website: {lead.website}")
    if summary:
        parts.append(f"\nRingkasan bisnis: {summary}")
    if angle:
        parts.append(f"\nAngle outreach yang disarankan: {angle}")
    if template:
        parts.append(f"\nTemplate referensi (boleh diparafrase): \n{template.body}")
        if template.subject and channel == "email":
            parts.append(f"\nSubject template: {template.subject}")
    if custom:
        parts.append(f"\nInstruksi tambahan: {custom}")

    if channel == "email":
        parts.append("\nKeluaran JSON dengan field: subject (string, max 50 char), body (string).")
    else:
        parts.append('\nKeluaran JSON dengan field: body (string). Tidak perlu subject.')

    return "\n".join(parts)
