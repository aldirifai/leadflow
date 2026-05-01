"""Blacklist checks and opt-out detection."""

import re

from sqlalchemy.orm import Session

from app.models.lead import Blacklist, Lead
from app.services.normalize import extract_domain, normalize_email, normalize_phone

OPT_OUT_PATTERNS = [
    r"\bstop\b", r"\bberhenti\b", r"\bunsubscribe\b", r"\bremove\b",
    r"\bjangan\s+(kirim|hubungi|chat)\b", r"\btidak\s+tertarik\b",
    r"\bno\s+thanks?\b", r"\bdo\s+not\s+contact\b",
    r"\bspam\b", r"\bdiblock\b", r"\bblok(ir)?\b",
]


def is_blacklisted(db: Session, lead: Lead) -> tuple[bool, str | None]:
    """Check whether lead matches any blacklist entry. Returns (blocked, reason)."""
    checks: list[tuple[str, str | None]] = [
        ("place_id", lead.place_id),
        ("phone", normalize_phone(lead.phone)),
        ("whatsapp", normalize_phone(lead.whatsapp)),
        ("email", normalize_email(lead.email)),
        ("domain", extract_domain(lead.website)),
    ]
    for itype, value in checks:
        if not value:
            continue
        match = (
            db.query(Blacklist)
            .filter(Blacklist.identifier_type == itype, Blacklist.identifier_value == value)
            .first()
        )
        if match:
            return True, f"{itype}={value} ({match.reason or 'blacklisted'})"
    return False, None


def detect_opt_out(text: str) -> bool:
    """Check whether reply text expresses opt-out intent."""
    if not text:
        return False
    lowered = text.lower()
    for pattern in OPT_OUT_PATTERNS:
        if re.search(pattern, lowered):
            return True
    return False


def add_to_blacklist(db: Session, lead: Lead, reason: str) -> None:
    """Auto-blacklist lead's identifiers when opt-out detected."""
    additions = []
    if lead.place_id:
        additions.append(("place_id", lead.place_id))
    if lead.phone:
        normalized = normalize_phone(lead.phone)
        if normalized:
            additions.append(("phone", normalized))
            additions.append(("whatsapp", normalized))
    if lead.email:
        normalized = normalize_email(lead.email)
        if normalized:
            additions.append(("email", normalized))

    for itype, value in additions:
        existing = (
            db.query(Blacklist)
            .filter(Blacklist.identifier_type == itype, Blacklist.identifier_value == value)
            .first()
        )
        if not existing:
            db.add(Blacklist(identifier_type=itype, identifier_value=value, reason=reason))

    lead.is_blacklisted = True
    lead.status = "dropped"
