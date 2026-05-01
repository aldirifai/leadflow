from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import verify_api_key
from app.db.session import get_db
from app.models.lead import MessageTemplate
from app.schemas.lead import TemplateIn, TemplateOut

router = APIRouter(prefix="/templates", tags=["templates"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db), channel: str | None = None):
    q = db.query(MessageTemplate)
    if channel:
        q = q.filter(MessageTemplate.channel == channel)
    return q.order_by(MessageTemplate.is_default.desc(), MessageTemplate.name).all()


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(payload: TemplateIn, db: Session = Depends(get_db)):
    if payload.is_default:
        db.query(MessageTemplate).filter(
            MessageTemplate.channel == payload.channel
        ).update({"is_default": False})

    tpl = MessageTemplate(**payload.model_dump())
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, payload: TemplateIn, db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    if payload.is_default:
        db.query(MessageTemplate).filter(
            MessageTemplate.channel == payload.channel,
            MessageTemplate.id != template_id,
        ).update({"is_default": False})

    for k, v in payload.model_dump().items():
        setattr(tpl, k, v)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tpl = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    db.delete(tpl)
    db.commit()
