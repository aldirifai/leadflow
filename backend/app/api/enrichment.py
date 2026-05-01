from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, MessageTemplate
from app.schemas.lead import (
    GenerateMessageRequest,
    GenerateMessageResponse,
    LeadDetailOut,
)
from app.services import enrichment

router = APIRouter(prefix="/leads", tags=["enrichment"], dependencies=[Depends(verify_api_key)])


@router.post("/{lead_id}/enrich", response_model=LeadDetailOut)
async def enrich(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.enrichment), joinedload(Lead.score))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    await enrichment.enrich_lead(db, lead)
    db.commit()
    db.refresh(lead)
    return LeadDetailOut.model_validate(lead)


@router.post("/{lead_id}/generate-message", response_model=GenerateMessageResponse)
async def generate_message(
    lead_id: int,
    payload: GenerateMessageRequest,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.enrichment))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    template = None
    if payload.template_id:
        template = db.query(MessageTemplate).filter(MessageTemplate.id == payload.template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    result = await enrichment.generate_message(
        db, lead, payload.channel, template, payload.custom_instructions
    )
    db.commit()
    return GenerateMessageResponse(subject=result.get("subject"), body=result.get("body", ""))
