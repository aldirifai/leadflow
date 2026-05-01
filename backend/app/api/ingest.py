from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, LeadScore, SearchSession
from app.schemas.lead import LeadIngestBatch, LeadIngestResult
from app.services import blacklist, quota, scoring
from app.services.normalize import normalize_email, normalize_phone

router = APIRouter(prefix="/leads", tags=["ingest"])


@router.post("/ingest", response_model=LeadIngestResult, dependencies=[Depends(verify_api_key)])
def ingest_leads(payload: LeadIngestBatch, db: Session = Depends(get_db)):
    if not payload.leads:
        used, limit, remaining = quota.get_today_quota(db)
        return LeadIngestResult(
            inserted=0, updated=0, skipped_blacklisted=0,
            quota_used=used, quota_limit=limit, quota_remaining=remaining,
        )

    allowed, consumed, remaining = quota.check_and_increment(db, len(payload.leads))
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily ingest quota exceeded.",
        )

    if payload.search_query:
        db.add(SearchSession(
            query=payload.search_query,
            location=payload.search_location,
            results_count=consumed,
        ))

    inserted = updated = skipped_blacklisted = 0
    leads_to_process = payload.leads[:consumed]

    for lead_in in leads_to_process:
        existing = db.query(Lead).filter(Lead.place_id == lead_in.place_id).first()

        if existing:
            existing.name = lead_in.name
            existing.address = lead_in.address or existing.address
            existing.phone = lead_in.phone or existing.phone
            existing.whatsapp = normalize_phone(lead_in.phone) or existing.whatsapp
            existing.email = normalize_email(lead_in.email) or existing.email
            existing.instagram = lead_in.instagram or existing.instagram
            existing.website = lead_in.website or existing.website
            existing.category = lead_in.category or existing.category
            existing.rating = lead_in.rating if lead_in.rating is not None else existing.rating
            existing.review_count = (
                lead_in.review_count if lead_in.review_count is not None else existing.review_count
            )
            existing.latitude = lead_in.latitude if lead_in.latitude is not None else existing.latitude
            existing.longitude = lead_in.longitude if lead_in.longitude is not None else existing.longitude
            existing.city = lead_in.city or existing.city
            existing.province = lead_in.province or existing.province
            if lead_in.hours_json:
                existing.hours_json = lead_in.hours_json
            if lead_in.raw_data:
                existing.raw_data = lead_in.raw_data
            updated += 1
            db.flush()
            _rescore(db, existing)
        else:
            new_lead = Lead(
                place_id=lead_in.place_id,
                name=lead_in.name,
                address=lead_in.address,
                phone=lead_in.phone,
                whatsapp=normalize_phone(lead_in.phone),
                email=normalize_email(lead_in.email),
                instagram=lead_in.instagram,
                website=lead_in.website,
                category=lead_in.category,
                rating=lead_in.rating,
                review_count=lead_in.review_count or 0,
                latitude=lead_in.latitude,
                longitude=lead_in.longitude,
                city=lead_in.city,
                province=lead_in.province,
                hours_json=lead_in.hours_json,
                raw_data=lead_in.raw_data,
            )
            db.add(new_lead)
            db.flush()

            blocked, reason = blacklist.is_blacklisted(db, new_lead)
            if blocked:
                new_lead.is_blacklisted = True
                new_lead.status = "dropped"
                new_lead.notes = f"Auto-blacklisted on ingest: {reason}"
                skipped_blacklisted += 1

            _rescore(db, new_lead)
            inserted += 1

    db.commit()

    used, limit, remaining_after = quota.get_today_quota(db)
    return LeadIngestResult(
        inserted=inserted,
        updated=updated,
        skipped_blacklisted=skipped_blacklisted,
        quota_used=used,
        quota_limit=limit,
        quota_remaining=remaining_after,
    )


def _rescore(db: Session, lead: Lead) -> None:
    fit, reasons = scoring.score_lead(lead)
    if lead.score:
        lead.score.fit_score = fit
        lead.score.reasons = reasons
    else:
        db.add(LeadScore(lead_id=lead.id, fit_score=fit, reasons=reasons))
    db.flush()
