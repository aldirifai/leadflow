"""Cooldown enforcement to prevent recontacting too soon."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lead import OutreachLog


def can_contact(db: Session, lead_id: int) -> tuple[bool, datetime | None]:
    """
    Check if lead can be contacted now.
    Returns (allowed, next_allowed_date_if_blocked).
    Cooldown applies unless there was a reply (then ok to follow up).
    """
    cutoff = datetime.utcnow() - timedelta(days=settings.cooldown_days)
    recent = (
        db.query(OutreachLog)
        .filter(
            OutreachLog.lead_id == lead_id,
            OutreachLog.sent_at >= cutoff,
            OutreachLog.replied == False,  # noqa: E712
        )
        .order_by(OutreachLog.sent_at.desc())
        .first()
    )
    if recent:
        next_allowed = recent.sent_at + timedelta(days=settings.cooldown_days)
        return False, next_allowed
    return True, None
