from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import Lead, Tag, lead_tags
from app.schemas.lead import LeadDetailOut, TagAttach, TagIn, TagOut, TagWithCount

router = APIRouter(prefix="/tags", tags=["tags"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=list[TagWithCount])
def list_tags(db: Session = Depends(get_db)):
    rows = (
        db.query(Tag, func.count(lead_tags.c.lead_id).label("lead_count"))
        .outerjoin(lead_tags, lead_tags.c.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(Tag.name)
        .all()
    )
    return [
        TagWithCount(
            id=t.id, name=t.name, color=t.color, created_at=t.created_at, lead_count=count or 0
        )
        for t, count in rows
    ]


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagIn, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag dengan nama itu sudah ada")
    tag = Tag(name=payload.name, color=payload.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, payload: TagIn, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if payload.name != tag.name:
        clash = db.query(Tag).filter(Tag.name == payload.name, Tag.id != tag_id).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nama tag sudah dipakai")
    tag.name = payload.name
    tag.color = payload.color
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    db.delete(tag)
    db.commit()


# Lead-tag attachment endpoints (mounted under /leads prefix in main.py)

lead_tag_router = APIRouter(
    prefix="/leads",
    tags=["tags"],
    dependencies=[Depends(verify_api_key)],
)


@lead_tag_router.post("/{lead_id}/tags", response_model=LeadDetailOut)
def attach_tag(lead_id: int, payload: TagAttach, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    tag = db.query(Tag).filter(Tag.id == payload.tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if tag not in lead.tags:
        lead.tags.append(tag)
        db.commit()
    db.refresh(lead)
    return LeadDetailOut.model_validate(lead)


@lead_tag_router.delete("/{lead_id}/tags/{tag_id}", response_model=LeadDetailOut)
def detach_tag(lead_id: int, tag_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if tag in lead.tags:
        lead.tags.remove(tag)
        db.commit()
    db.refresh(lead)
    return LeadDetailOut.model_validate(lead)
