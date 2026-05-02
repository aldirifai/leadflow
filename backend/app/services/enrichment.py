"""Lead enrichment: website analysis + outreach angle + message generation."""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadEnrichment, MessageTemplate
from app.services.openrouter import chat_completion, chat_completion_json
from app.services.website import fetch_website_text


SYSTEM_PROMPT_ANALYSIS = """Anda adalah konsultan digital marketing yang membantu Aldi (developer solo dari landingklinik.id) mengidentifikasi peluang outreach untuk jasa pembuatan landing page khusus klinik gigi di Indonesia.

KONTEKS LAYANAN:
landingklinik.id menjual paket starter Rp 5.500.000 sekali bayar yang berisi: landing page klinik custom, integrasi WhatsApp booking, optimasi Google Business Profile, dan dashboard inquiry untuk resepsionis. Target audiens: pemilik klinik gigi atau dokter gigi praktek mandiri yang sudah punya pasien tapi online presence-nya belum optimal.

TUGAS:
Analisis bisnis (klinik gigi) berdasarkan data yang diberikan. Identifikasi 1-2 kelemahan online presence yang KONKRET dan SPESIFIK untuk klinik tersebut. Sarankan ANGLE OUTREACH yang personal dan relevan untuk pemilik klinik tersebut.

YANG HARUS DIPERHATIKAN:
- Apakah ada website? Kondisinya apa: brosur statis, Linktree, Wordpress lama, atau gak ada sama sekali?
- Rating dan review count: 4.5+ dengan 100+ review = klinik established yang siap upgrade. 3-4 rating = ada masalah service yang gak bisa diselesaikan dengan website.
- Kategori spesifik: general dentistry vs aesthetic vs pediatric punya pain dan budget berbeda
- Lokasi: tier-1 city (Jakarta, Surabaya, Bandung) cenderung punya budget lebih untuk digital. Tier-2 city lebih price-sensitive.
- Jam operasional dan kontak yang tersedia menunjukkan klinik active vs dormant

OUTPUT JSON dengan field:
- website_summary: 1-2 kalimat ringkas tentang bisnis ini, neutral tone
- weaknesses: list 2-3 kelemahan KONKRET (misal "website cuma Linktree, gak ada info treatment dan harga"), bukan generik
- suggested_angle: 1 paragraf saran approach personal untuk Aldi saat outreach. Sebutkan observasi spesifik yang bisa jadi pembuka pesan. Hindari bahasa marketing-y.

PRINSIP:
- Bahasa Indonesia santai profesional. Bukan formal kaku, bukan juga gaul.
- Jangan over-sell. Kalau klinik kelihatan udah established dengan online presence bagus, bilang aja "klinik ini sudah established, angle outreach lebih sulit" — Aldi akan skip lead ini.
- Jangan janjikan hasil spesifik (omzet naik X%, conversion naik Y%) — itu janji palsu yang bikin trust hilang saat klien check reality.
- Hindari kata-kata buzzword: "revolutionize", "transform", "skyrocket", "game-changer", dll.
- Tone: developer yang ngerti bisnis dan peduli, bukan salesperson.
- Nama developer adalah **'Aldi'** (4 huruf: A-l-d-i). Selalu tulis 'Aldi' kalau ke-reference dalam output. JANGAN tulis 'Aldhi', 'Aldy', 'Aldie', 'Aldhy', atau variasi lain."""


SYSTEM_PROMPT_MESSAGE = """Anda adalah copywriter yang menulis pesan outreach personal untuk Aldi (developer solo dari landingklinik.id) ke pemilik klinik gigi.

KONTEKS:
landingklinik.id adalah jasa pembuatan landing page khusus klinik gigi. Paket starter Rp 5.500.000 sekali bayar, project 3 minggu, berisi landing page custom + integrasi WhatsApp + optimasi Google Business Profile + dashboard inquiry resepsionis.

ATURAN WAJIB:
1. Personal — sebutkan observasi konkret tentang klinik target. Hindari pujian basi seperti "rating bagus" tanpa angka spesifik atau "saya impressed dengan klinik Anda" tanpa alasan.

2. Singkat dan langsung ke poin:
   - Email body: max 120 kata
   - WhatsApp body: max 60 kata
   - LinkedIn body: max 80 kata

3. Tidak hard sell. Tutup dengan opsi mudah untuk decline. Contoh: "kalau tidak relevan saat ini, no problem" atau "kalau timing-nya kurang pas, abaikan saja pesan ini".

4. Bahasa Indonesia santai profesional. Sapaan: "Halo tim {nama_klinik}" atau "Halo {nama_klinik}". Hindari "Yth" (terlalu formal, gak match brand).

5. Jangan janjikan hasil spesifik. Jangan tulis "booking naik 200%" atau "conversion meningkat drastis". Fokus ke value proposition jujur: "landing page yang fokus ke booking, bukan brosur".

6. Sebutkan landingklinik.id sekali untuk credibility (di sign-off email/LinkedIn, atau di body untuk WA singkat).

7. Sign-off untuk semua channel: "Aldi" diikuti "landingklinik.id" di baris baru.

8. Untuk EMAIL:
   - Subject line max 50 karakter, specific bukan clickbait
   - Subject bagus: "Quick observasi tentang klinik {nama}"
   - Subject buruk: "Tingkatkan booking klinik Anda 200%!"

9. Pesan harus terasa ditulis manusia yang sudah baca website dan profil klinik mereka, bukan template generic. Reference ke website atau detail spesifik adalah strong signal personal.

10. Jangan pakai bahasa hardsell: "limited offer", "promo khusus", "harga spesial", "diskon", dll. Brand landingklinik.id adalah professional service, bukan e-commerce.

11. Nama developer adalah **'Aldi'** (4 huruf: A-l-d-i). Selalu tulis 'Aldi' di body, subject, dan sign-off. JANGAN tulis 'Aldhi', 'Aldy', 'Aldie', 'Aldhy', atau variasi ejaan lain. Hardcoded — gak boleh diubah meski terkesan natural untuk diubah.

OUTPUT JSON dengan field:
- subject: string (only untuk email channel, untuk WhatsApp dan LinkedIn null)
- body: string (isi pesan)

CHANNEL-SPECIFIC TONE:
- Email: lebih formal sedikit, pakai paragraph struktur. Cocok untuk first impression yang serius.
- WhatsApp: lebih singkat, percakapan. Tidak ada paragraph formal, langsung to the point.
- LinkedIn: profesional, networking tone. Implikasi peer-to-peer professional, bukan vendor-to-client."""


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
