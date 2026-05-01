from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(500), nullable=False)
    address = Column(Text)
    phone = Column(String(50), index=True)
    whatsapp = Column(String(50), index=True)
    email = Column(String(255), index=True)
    linkedin = Column(String(500))
    instagram = Column(String(500))
    website = Column(String(1000))
    category = Column(String(255), index=True)
    rating = Column(Float)
    review_count = Column(Integer, default=0)
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String(255), index=True)
    province = Column(String(255))
    hours_json = Column(JSONB)
    raw_data = Column(JSONB)

    is_blacklisted = Column(Boolean, default=False, nullable=False, index=True)
    status = Column(String(50), default="new", nullable=False, index=True)
    notes = Column(Text)

    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    score = relationship("LeadScore", back_populates="lead", uselist=False, cascade="all, delete-orphan")
    enrichment = relationship("LeadEnrichment", back_populates="lead", uselist=False, cascade="all, delete-orphan")
    outreach_logs = relationship("OutreachLog", back_populates="lead", cascade="all, delete-orphan")


class LeadScore(Base):
    __tablename__ = "lead_scores"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False)
    fit_score = Column(Integer, nullable=False, index=True)
    reasons = Column(JSONB)
    scored_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="score")


class LeadEnrichment(Base):
    __tablename__ = "lead_enrichments"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), unique=True, nullable=False)
    website_summary = Column(Text)
    website_audit = Column(JSONB)
    suggested_angle = Column(Text)
    generated_message_email_subject = Column(String(500))
    generated_message_email = Column(Text)
    generated_message_whatsapp = Column(Text)
    generated_message_linkedin = Column(Text)
    enriched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="enrichment")


class OutreachLog(Base):
    __tablename__ = "outreach_log"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50), nullable=False)
    subject = Column(String(500))
    message_sent = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    replied = Column(Boolean, default=False, nullable=False)
    reply_at = Column(DateTime)
    reply_text = Column(Text)
    notes = Column(Text)

    lead = relationship("Lead", back_populates="outreach_logs")


class SearchSession(Base):
    __tablename__ = "searches"

    id = Column(Integer, primary_key=True)
    query = Column(String(500), nullable=False)
    location = Column(String(255))
    results_count = Column(Integer, default=0)
    run_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class IngestQuota(Base):
    __tablename__ = "ingest_quota"
    __table_args__ = (UniqueConstraint("date_key", name="uq_quota_date"),)

    id = Column(Integer, primary_key=True)
    date_key = Column(String(10), nullable=False, index=True)
    count = Column(Integer, default=0, nullable=False)


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    channel = Column(String(50), nullable=False, index=True)
    subject = Column(String(500))
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Blacklist(Base):
    __tablename__ = "blacklist"

    id = Column(Integer, primary_key=True)
    identifier_type = Column(String(50), nullable=False, index=True)
    identifier_value = Column(String(500), nullable=False, index=True)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("identifier_type", "identifier_value", name="uq_blacklist_identifier"),)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
