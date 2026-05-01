"""Daily ingest quota — hard ethical guardrail."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lead import IngestQuota


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_today_quota(db: Session) -> tuple[int, int, int]:
    """Return (used, limit, remaining)."""
    key = _today_key()
    quota = db.query(IngestQuota).filter(IngestQuota.date_key == key).first()
    used = quota.count if quota else 0
    return used, settings.daily_ingest_limit, max(0, settings.daily_ingest_limit - used)


def check_and_increment(db: Session, count: int) -> tuple[bool, int, int]:
    """
    Try to consume `count` from today's quota.
    Returns (allowed, consumed, remaining_after).
    If allowed=False, may consume partial up to limit.
    """
    key = _today_key()
    quota = db.query(IngestQuota).filter(IngestQuota.date_key == key).first()

    if not quota:
        quota = IngestQuota(date_key=key, count=0)
        db.add(quota)
        db.flush()

    available = settings.daily_ingest_limit - quota.count
    if available <= 0:
        return False, 0, 0

    if count <= available:
        quota.count += count
        db.flush()
        return True, count, settings.daily_ingest_limit - quota.count

    quota.count = settings.daily_ingest_limit
    db.flush()
    return True, available, 0
