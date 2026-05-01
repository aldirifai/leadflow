from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, OutreachLog
from app.schemas.lead import OutreachLogCreate, OutreachLogOut, ReplyMark
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
