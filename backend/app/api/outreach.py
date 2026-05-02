from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Integer, desc, extract, func
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, OutreachLog
from app.schemas.lead import OutreachAnalytics, OutreachLogCreate, OutreachLogOut, ReplyMark
from app.services import blacklist, cooldown

router = APIRouter(prefix="/leads", tags=["outreach"], dependencies=[Depends(verify_api_key)])


@router.post("/{lead_id}/outreach", response_model=OutreachLogOut)
def log_outreach(lead_id: int, payload: OutreachLogCreate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if lead.is_blacklisted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead is blacklisted")

    allowed, next_allowed = cooldown.can_contact(db, lead_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"In cooldown. Next contact allowed: {next_allowed.isoformat() if next_allowed else 'unknown'}",
        )

    log = OutreachLog(
        lead_id=lead_id,
        channel=payload.channel,
        subject=payload.subject,
        message_sent=payload.message_sent,
        notes=payload.notes,
    )
    db.add(log)

    if lead.status in ("new", "approved"):
        lead.status = "contacted"

    db.commit()
    db.refresh(log)
    return log


@router.get("/{lead_id}/outreach", response_model=list[OutreachLogOut])
def list_outreach(lead_id: int, db: Session = Depends(get_db)):
    return (
        db.query(OutreachLog)
        .filter(OutreachLog.lead_id == lead_id)
        .order_by(desc(OutreachLog.sent_at))
        .all()
    )


@router.post("/{lead_id}/outreach/{log_id}/reply", response_model=OutreachLogOut)
def mark_reply(
    lead_id: int,
    log_id: int,
    payload: ReplyMark,
    db: Session = Depends(get_db),
):
    log = (
        db.query(OutreachLog)
        .filter(OutreachLog.id == log_id, OutreachLog.lead_id == lead_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outreach log not found")

    log.replied = True
    log.reply_at = datetime.utcnow()
    log.reply_text = payload.reply_text

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if blacklist.detect_opt_out(payload.reply_text):
        blacklist.add_to_blacklist(db, lead, "Auto-blacklisted: opt-out detected in reply")
    elif lead and lead.status == "contacted":
        lead.status = "replied"

    db.commit()
    db.refresh(log)
    return log


outreach_router = APIRouter(prefix="/outreach", tags=["outreach"], dependencies=[Depends(verify_api_key)])


@outreach_router.get("", response_model=list[OutreachLogOut])
def list_all_outreach(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    channel: str | None = None,
    replied: bool | None = None,
):
    q = db.query(OutreachLog)
    if channel:
        q = q.filter(OutreachLog.channel == channel)
    if replied is not None:
        q = q.filter(OutreachLog.replied == replied)
    return q.order_by(desc(OutreachLog.sent_at)).offset((page - 1) * page_size).limit(page_size).all()


@outreach_router.get("/analytics", response_model=OutreachAnalytics)
def outreach_analytics(
    db: Session = Depends(get_db),
    days: int = Query(90, ge=7, le=365),
):
    """Aggregate stats for outreach in the last `days` window."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    total_sent = db.query(func.count(OutreachLog.id)).filter(OutreachLog.sent_at >= cutoff).scalar() or 0
    total_replied = (
        db.query(func.count(OutreachLog.id))
        .filter(OutreachLog.sent_at >= cutoff, OutreachLog.replied == True)  # noqa: E712
        .scalar()
        or 0
    )
    reply_rate = (total_replied / total_sent * 100) if total_sent else 0.0

    # Average reply time in hours (only for replied logs)
    avg_seconds_row = (
        db.query(
            func.avg(
                func.extract("epoch", OutreachLog.reply_at) - func.extract("epoch", OutreachLog.sent_at)
            )
        )
        .filter(
            OutreachLog.sent_at >= cutoff,
            OutreachLog.replied == True,  # noqa: E712
            OutreachLog.reply_at.isnot(None),
        )
        .scalar()
    )
    avg_reply_hours = round(avg_seconds_row / 3600, 1) if avg_seconds_row else None

    # By channel
    chan_rows = (
        db.query(
            OutreachLog.channel,
            func.count(OutreachLog.id).label("sent"),
            func.sum(func.cast(OutreachLog.replied, type_=Integer)).label("replied"),
        )
        .filter(OutreachLog.sent_at >= cutoff)
        .group_by(OutreachLog.channel)
        .all()
    )
    by_channel = []
    for ch, sent, replied in chan_rows:
        sent = sent or 0
        replied = int(replied or 0)
        by_channel.append({
            "channel": ch,
            "sent": sent,
            "replied": replied,
            "reply_rate": round((replied / sent * 100) if sent else 0.0, 2),
        })

    # By hour-of-day (UTC). Initialize 24 buckets to zero.
    hour_rows = (
        db.query(extract("hour", OutreachLog.sent_at).label("h"), func.count(OutreachLog.id).label("c"))
        .filter(OutreachLog.sent_at >= cutoff)
        .group_by("h")
        .all()
    )
    by_hour = [0] * 24
    for h, c in hour_rows:
        if h is not None:
            by_hour[int(h)] = c

    # By day-of-week. Postgres EXTRACT(DOW FROM ts): Sunday=0..Saturday=6
    dow_rows = (
        db.query(
            extract("dow", OutreachLog.sent_at).label("d"),
            func.count(OutreachLog.id).label("sent"),
            func.sum(func.cast(OutreachLog.replied, type_=Integer)).label("replied"),
        )
        .filter(OutreachLog.sent_at >= cutoff)
        .group_by("d")
        .all()
    )
    dow_map = {int(d): (int(s or 0), int(r or 0)) for d, s, r in dow_rows if d is not None}
    by_dow = [
        {"dow": i, "sent": dow_map.get(i, (0, 0))[0], "replied": dow_map.get(i, (0, 0))[1]}
        for i in range(7)
    ]

    return OutreachAnalytics(
        total_sent=total_sent,
        total_replied=total_replied,
        reply_rate=round(reply_rate, 2),
        avg_reply_hours=avg_reply_hours,
        by_channel=by_channel,
        by_hour=by_hour,
        by_dow=by_dow,
    )
