from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Blacklist, Lead
from app.schemas.lead import BlacklistIn, BlacklistOut
from app.services.normalize import extract_domain, normalize_email, normalize_phone

router = APIRouter(prefix="/blacklist", tags=["blacklist"], dependencies=[Depends(verify_api_key)])


def _normalize_value(itype: str, value: str) -> str | None:
    if itype in ("phone", "whatsapp"):
        return normalize_phone(value)
    if itype == "email":
        return normalize_email(value)
    if itype == "domain":
        return extract_domain(value)
    return value.strip() if value else None


@router.get("", response_model=list[BlacklistOut])
def list_blacklist(db: Session = Depends(get_db)):
    return db.query(Blacklist).order_by(Blacklist.created_at.desc()).all()


@router.post("", response_model=BlacklistOut, status_code=status.HTTP_201_CREATED)
def add_blacklist(payload: BlacklistIn, db: Session = Depends(get_db)):
    normalized = _normalize_value(payload.identifier_type, payload.identifier_value)
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid identifier value")

    existing = (
        db.query(Blacklist)
        .filter(
            Blacklist.identifier_type == payload.identifier_type,
            Blacklist.identifier_value == normalized,
        )
        .first()
    )
    if existing:
        return existing

    entry = Blacklist(
        identifier_type=payload.identifier_type,
        identifier_value=normalized,
        reason=payload.reason,
    )
    db.add(entry)

    if payload.identifier_type == "place_id":
        lead = db.query(Lead).filter(Lead.place_id == normalized).first()
        if lead:
            lead.is_blacklisted = True
            lead.status = "dropped"
    elif payload.identifier_type in ("phone", "whatsapp"):
        leads = db.query(Lead).filter(
            (Lead.phone == normalized) | (Lead.whatsapp == normalized)
        ).all()
        for lead in leads:
            lead.is_blacklisted = True
            lead.status = "dropped"
    elif payload.identifier_type == "email":
        leads = db.query(Lead).filter(Lead.email == normalized).all()
        for lead in leads:
            lead.is_blacklisted = True
            lead.status = "dropped"
    elif payload.identifier_type == "domain":
        leads = db.query(Lead).filter(Lead.website.ilike(f"%{normalized}%")).all()
        for lead in leads:
            lead.is_blacklisted = True
            lead.status = "dropped"

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{blacklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_blacklist(blacklist_id: int, db: Session = Depends(get_db)):
    entry = db.query(Blacklist).filter(Blacklist.id == blacklist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blacklist entry not found")
    db.delete(entry)
    db.commit()
