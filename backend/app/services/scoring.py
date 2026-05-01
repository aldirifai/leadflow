"""
Lead qualification scoring.

Generic rule-based scoring 0-100. Easy to customize: edit RULES list.
"""

from typing import Callable

from app.models.lead import Lead

ScoreRule = Callable[[Lead], tuple[int, str | None]]


def rule_no_website(lead: Lead) -> tuple[int, str | None]:
    if not lead.website or not lead.website.strip():
        return 30, "no_website"
    return 0, None


def rule_weak_website(lead: Lead) -> tuple[int, str | None]:
    if not lead.website:
        return 0, None
    weak_indicators = [
        "linktr.ee", "linktree", "instagram.com", "facebook.com",
        "wa.me", "wa.link", ".wordpress.com", ".blogspot.com",
        ".weebly.com", ".wixsite.com", "linkbio", "bio.link", "carrd.co",
    ]
    website_lower = lead.website.lower()
    for indicator in weak_indicators:
        if indicator in website_lower:
            return 25, f"weak_website:{indicator}"
    return 0, None


def rule_high_rating_with_volume(lead: Lead) -> tuple[int, str | None]:
    if lead.rating and lead.rating >= 4.3 and (lead.review_count or 0) >= 50:
        return 15, "established_business"
    return 0, None


def rule_has_phone(lead: Lead) -> tuple[int, str | None]:
    if lead.phone and len(lead.phone.strip()) >= 8:
        return 10, "has_phone"
    return 0, None


def rule_active_business(lead: Lead) -> tuple[int, str | None]:
    if lead.hours_json and len(lead.hours_json) > 0:
        return 5, "active_hours"
    return 0, None


def rule_target_location(lead: Lead) -> tuple[int, str | None]:
    target_cities = [
        "surabaya", "malang", "sidoarjo", "gresik", "mojokerto",
        "jakarta", "bandung", "yogyakarta", "semarang", "solo",
        "denpasar", "medan", "makassar", "balikpapan", "samarinda",
        "tangerang", "bekasi", "depok", "bogor",
    ]
    if lead.city and lead.city.lower() in target_cities:
        return 10, f"tier1_2_city:{lead.city.lower()}"
    return 0, None


def rule_has_review_volume(lead: Lead) -> tuple[int, str | None]:
    rc = lead.review_count or 0
    if rc >= 100:
        return 10, "high_review_volume"
    if rc >= 30:
        return 5, "moderate_review_volume"
    return 0, None


def rule_priority_categories(lead: Lead) -> tuple[int, str | None]:
    if not lead.category:
        return 0, None
    cat = lead.category.lower()
    priority = [
        "dokter", "doctor",
        "kursus", "course", "school", "training", "academy",
        "salon", "spa", "beauty",
        "restoran", "restaurant", "cafe", "kafe",
        "hotel", "guest house", "villa",
        "properti", "property", "real estate", "developer",
        "konsultan", "consultant", "lawyer", "notaris", "akuntan",
        "fitness", "gym", "yoga",
    ]
    for p in priority:
        if p in cat:
            return 15, f"priority_category:{p}"
    return 0, None


DENTAL_TERMS = [
    "klinik gigi", "dokter gigi",
    "dental clinic", "dental care", "dental studio",
    "dental specialist", "dental center",
    "dentist",
    "ortodontis", "orthodontist", "orthodontic",
]


def _matches_dental(lead: Lead) -> str | None:
    if not lead.category:
        return None
    cat = lead.category.lower()
    for term in DENTAL_TERMS:
        if term in cat:
            return term
    return None


def rule_dental_clinic(lead: Lead) -> tuple[int, str | None]:
    matched = _matches_dental(lead)
    if matched:
        return 30, f"dental_clinic:{matched}"
    return 0, None


def rule_aesthetic_dental(lead: Lead) -> tuple[int, str | None]:
    if not lead.category:
        return 0, None
    cat = lead.category.lower()
    for term in ("aesthetic", "estetik", "veneer", "implant"):
        if term in cat:
            return 15, f"aesthetic_dental:{term}"
    return 0, None


def rule_established_dental(lead: Lead) -> tuple[int, str | None]:
    if not _matches_dental(lead):
        return 0, None
    rc = lead.review_count or 0
    if rc >= 100:
        return 15, "established_dental_high_volume"
    if rc >= 30:
        return 8, "established_dental_moderate_volume"
    return 0, None


RULES: list[ScoreRule] = [
    rule_no_website,
    rule_weak_website,
    rule_high_rating_with_volume,
    rule_has_phone,
    rule_active_business,
    rule_target_location,
    rule_has_review_volume,
    rule_priority_categories,
    rule_dental_clinic,
    rule_aesthetic_dental,
    rule_established_dental,
]


def score_lead(lead: Lead) -> tuple[int, list[str]]:
    """Run all rules. Return (total_score capped 0-100, reasons list)."""
    total = 0
    reasons: list[str] = []

    for rule in RULES:
        delta, reason = rule(lead)
        if delta > 0 and reason:
            total += delta
            reasons.append(reason)

    return min(total, 100), reasons
