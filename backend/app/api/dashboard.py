from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import case, cast, desc, func
from sqlalchemy.orm import Session
from sqlalchemy.types import Date

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, LeadScore, OutreachLog
from app.schemas.lead import DashboardStats
from app.services import quota

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(verify_api_key)])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_leads = db.query(func.count(Lead.id)).filter(Lead.is_blacklisted == False).scalar() or 0  # noqa: E712

    by_status_rows = (
        db.query(Lead.status, func.count(Lead.id))
        .filter(Lead.is_blacklisted == False)  # noqa: E712
        .group_by(Lead.status)
        .all()
    )
    by_status = {row[0]: row[1] for row in by_status_rows}

    tier_expr = case(
        (LeadScore.fit_score >= 70, "high"),
        (LeadScore.fit_score >= 40, "medium"),
        else_="low",
    )
    by_tier_rows = (
        db.query(tier_expr.label("tier"), func.count(LeadScore.id))
        .join(Lead, Lead.id == LeadScore.lead_id)
        .filter(Lead.is_blacklisted == False)  # noqa: E712
        .group_by("tier")
        .all()
    )
    by_score_tier = {"high": 0, "medium": 0, "low": 0}
    for tier, count in by_tier_rows:
        by_score_tier[tier] = count

    used, limit, remaining = quota.get_today_quota(db)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    outreach_today = (
        db.query(func.count(OutreachLog.id)).filter(OutreachLog.sent_at >= today_start).scalar() or 0
    )
    outreach_week = (
        db.query(func.count(OutreachLog.id)).filter(OutreachLog.sent_at >= week_start).scalar() or 0
    )

    # Per-day outreach counts for last 7 days, oldest first, today last.
    today_date = today_start.date()
    by_day_rows = (
        db.query(
            cast(OutreachLog.sent_at, Date).label("d"),
            func.count(OutreachLog.id).label("c"),
        )
        .filter(OutreachLog.sent_at >= week_start)
        .group_by("d")
        .all()
    )
    counts_by_date: dict[date, int] = {row.d: row.c for row in by_day_rows}
    outreach_by_day = [
        counts_by_date.get(today_date - timedelta(days=offset), 0)
        for offset in range(6, -1, -1)
    ]

    cutoff_30d = datetime.utcnow() - timedelta(days=30)
    sent_30d = (
        db.query(func.count(OutreachLog.id))
        .filter(OutreachLog.sent_at >= cutoff_30d)
        .scalar()
        or 0
    )
    replied_30d = (
        db.query(func.count(OutreachLog.id))
        .filter(OutreachLog.sent_at >= cutoff_30d, OutreachLog.replied == True)  # noqa: E712
        .scalar()
        or 0
    )
    reply_rate_30d = (replied_30d / sent_30d * 100) if sent_30d else 0.0

    top_cities_rows = (
        db.query(Lead.city, func.count(Lead.id).label("c"))
        .filter(Lead.city.isnot(None), Lead.city != "", Lead.is_blacklisted == False)  # noqa: E712
        .group_by(Lead.city)
        .order_by(desc("c"))
        .limit(8)
        .all()
    )
    top_cities = [{"city": row[0], "count": row[1]} for row in top_cities_rows]

    top_categories_rows = (
        db.query(Lead.category, func.count(Lead.id).label("c"))
        .filter(Lead.category.isnot(None), Lead.category != "", Lead.is_blacklisted == False)  # noqa: E712
        .group_by(Lead.category)
        .order_by(desc("c"))
        .limit(8)
        .all()
    )
    top_categories = [{"category": row[0], "count": row[1]} for row in top_categories_rows]

    return DashboardStats(
        total_leads=total_leads,
        by_status=by_status,
        by_score_tier=by_score_tier,
        today_quota_used=used,
        today_quota_limit=limit,
        today_quota_remaining=remaining,
        outreach_today=outreach_today,
        outreach_this_week=outreach_week,
        outreach_by_day=outreach_by_day,
        reply_rate_30d=round(reply_rate_30d, 2),
        top_cities=top_cities,
        top_categories=top_categories,
    )
