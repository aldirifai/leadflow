import csv
import io
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, LeadScore, OutreachLog
from app.schemas.lead import (
    LeadDetailOut,
    LeadListResponse,
    LeadOut,
    LeadUpdate,
    NotesUpdate,
    StatusUpdate,
)
from app.services import scoring
from app.services.normalize import normalize_email

router = APIRouter(prefix="/leads", tags=["leads"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=LeadListResponse)
def list_leads(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    min_score: int | None = Query(None, ge=0, le=100),
    max_score: int | None = Query(None, ge=0, le=100),
    city: str | None = None,
    category: str | None = None,
    has_website: bool | None = None,
    is_blacklisted: bool | None = None,
    search: str | None = None,
    sort: str = Query("score_desc", pattern="^(score_desc|score_asc|recent|oldest|name)$"),
):
    q = db.query(Lead).options(joinedload(Lead.score))

    if status_filter:
        q = q.filter(Lead.status == status_filter)
    if is_blacklisted is not None:
        q = q.filter(Lead.is_blacklisted == is_blacklisted)
    elif status_filter is None:
        q = q.filter(Lead.is_blacklisted == False)  # noqa: E712

    if city:
        q = q.filter(func.lower(Lead.city) == city.lower())
    if category:
        q = q.filter(Lead.category.ilike(f"%{category}%"))
    if has_website is True:
        q = q.filter(Lead.website.isnot(None), Lead.website != "")
    elif has_website is False:
        q = q.filter(or_(Lead.website.is_(None), Lead.website == ""))

    if min_score is not None or max_score is not None:
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id)
        if min_score is not None:
            q = q.filter(LeadScore.fit_score >= min_score)
        if max_score is not None:
            q = q.filter(LeadScore.fit_score <= max_score)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Lead.name.ilike(like), Lead.address.ilike(like), Lead.category.ilike(like)))

    total = q.count()

    if sort == "score_desc":
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id).order_by(
            desc(LeadScore.fit_score), desc(Lead.scraped_at)
        )
    elif sort == "score_asc":
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id).order_by(
            asc(LeadScore.fit_score), desc(Lead.scraped_at)
        )
    elif sort == "recent":
        q = q.order_by(desc(Lead.scraped_at))
    elif sort == "oldest":
        q = q.order_by(asc(Lead.scraped_at))
    elif sort == "name":
        q = q.order_by(asc(Lead.name))

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return LeadListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/export.csv")
def export_leads_csv(
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    min_score: int | None = Query(None, ge=0, le=100),
    max_score: int | None = Query(None, ge=0, le=100),
    city: str | None = None,
    category: str | None = None,
    has_website: bool | None = None,
    is_blacklisted: bool | None = None,
    search: str | None = None,
    sort: str = Query("score_desc", pattern="^(score_desc|score_asc|recent|oldest|name)$"),
):
    """Stream all leads matching filters as CSV. Same filter semantics as GET /leads."""
    q = db.query(Lead).options(joinedload(Lead.score))

    if status_filter:
        q = q.filter(Lead.status == status_filter)
    if is_blacklisted is not None:
        q = q.filter(Lead.is_blacklisted == is_blacklisted)
    elif status_filter is None:
        q = q.filter(Lead.is_blacklisted == False)  # noqa: E712

    if city:
        q = q.filter(func.lower(Lead.city) == city.lower())
    if category:
        q = q.filter(Lead.category.ilike(f"%{category}%"))
    if has_website is True:
        q = q.filter(Lead.website.isnot(None), Lead.website != "")
    elif has_website is False:
        q = q.filter(or_(Lead.website.is_(None), Lead.website == ""))

    if min_score is not None or max_score is not None:
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id)
        if min_score is not None:
            q = q.filter(LeadScore.fit_score >= min_score)
        if max_score is not None:
            q = q.filter(LeadScore.fit_score <= max_score)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Lead.name.ilike(like), Lead.address.ilike(like), Lead.category.ilike(like)))

    if sort == "score_desc":
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id).order_by(
            desc(LeadScore.fit_score), desc(Lead.scraped_at)
        )
    elif sort == "score_asc":
        q = q.outerjoin(LeadScore, LeadScore.lead_id == Lead.id).order_by(
            asc(LeadScore.fit_score), desc(Lead.scraped_at)
        )
    elif sort == "recent":
        q = q.order_by(desc(Lead.scraped_at))
    elif sort == "oldest":
        q = q.order_by(asc(Lead.scraped_at))
    elif sort == "name":
        q = q.order_by(asc(Lead.name))

    leads = q.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "id", "name", "score", "status", "category", "city", "address",
        "phone", "whatsapp", "email", "website", "instagram",
        "rating", "review_count", "place_id", "scraped_at", "notes",
    ])
    for lead in leads:
        writer.writerow([
            lead.id,
            lead.name,
            lead.score.fit_score if lead.score else "",
            lead.status,
            lead.category or "",
            lead.city or "",
            lead.address or "",
            lead.phone or "",
            lead.whatsapp or "",
            lead.email or "",
            lead.website or "",
            lead.instagram or "",
            lead.rating if lead.rating is not None else "",
            lead.review_count or 0,
            lead.place_id,
            lead.scraped_at.isoformat() if lead.scraped_at else "",
            (lead.notes or "").replace("\n", " ").replace("\r", " "),
        ])

    buf.seek(0)
    filename = f"leadflow-export-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/bulk/status")
def bulk_update_status(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Update status for many leads at once. Body: {ids: [int], status: str}"""
    ids = payload.get("ids") or []
    new_status = payload.get("status")
    if not isinstance(ids, list) or not all(isinstance(x, int) for x in ids):
        raise HTTPException(status_code=400, detail="ids must be list of int")
    if new_status not in ("new", "approved", "skipped", "contacted", "replied", "converted", "dropped"):
        raise HTTPException(status_code=400, detail="invalid status")
    if not ids:
        return {"updated": 0}
    updated = (
        db.query(Lead)
        .filter(Lead.id.in_(ids))
        .update({Lead.status: new_status}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated}


@router.post("/bulk/delete")
def bulk_delete(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Delete many leads at once. Body: {ids: [int]}"""
    ids = payload.get("ids") or []
    if not isinstance(ids, list) or not all(isinstance(x, int) for x in ids):
        raise HTTPException(status_code=400, detail="ids must be list of int")
    if not ids:
        return {"deleted": 0}
    deleted = (
        db.query(Lead)
        .filter(Lead.id.in_(ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted": deleted}


@router.get("/{lead_id}", response_model=LeadDetailOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.score), joinedload(Lead.enrichment))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    outreach_count = db.query(func.count(OutreachLog.id)).filter(OutreachLog.lead_id == lead_id).scalar() or 0
    out = LeadDetailOut.model_validate(lead)
    out.outreach_count = outreach_count
    return out


@router.patch("/{lead_id}/status", response_model=LeadOut)
def update_status(lead_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.status = payload.status
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}/notes", response_model=LeadOut)
def update_notes(lead_id: int, payload: NotesUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if payload.email is not None:
        lead.email = normalize_email(payload.email)
    if payload.linkedin is not None:
        lead.linkedin = payload.linkedin
    if payload.instagram is not None:
        lead.instagram = payload.instagram
    if payload.notes is not None:
        lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/score", response_model=LeadOut)
def rescore(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).options(joinedload(Lead.score)).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    fit, reasons = scoring.score_lead(lead)
    if lead.score:
        lead.score.fit_score = fit
        lead.score.reasons = reasons
    else:
        from app.models.lead import LeadScore as LS
        db.add(LS(lead_id=lead.id, fit_score=fit, reasons=reasons))
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/score-all")
def rescore_all(db: Session = Depends(get_db)):
    leads = db.query(Lead).all()
    count = 0
    for lead in leads:
        fit, reasons = scoring.score_lead(lead)
        if lead.score:
            lead.score.fit_score = fit
            lead.score.reasons = reasons
        else:
            from app.models.lead import LeadScore as LS
            db.add(LS(lead_id=lead.id, fit_score=fit, reasons=reasons))
        count += 1
    db.commit()
    return {"rescored": count}


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    db.delete(lead)
    db.commit()
