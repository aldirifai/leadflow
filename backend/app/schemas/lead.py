from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LeadIngest(BaseModel):
    place_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=500)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    instagram: str | None = None
    website: str | None = None
    category: str | None = None
    rating: float | None = None
    review_count: int | None = 0
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    province: str | None = None
    hours_json: dict[str, Any] | None = None
    raw_data: dict[str, Any] | None = None


class LeadIngestBatch(BaseModel):
    leads: list[LeadIngest] = Field(..., max_length=100)
    search_query: str | None = None
    search_location: str | None = None


class LeadIngestResult(BaseModel):
    inserted: int
    updated: int
    skipped_blacklisted: int
    quota_remaining: int
    quota_used: int
    quota_limit: int


class LeadScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fit_score: int
    reasons: list[str] | None = None
    scored_at: datetime


class LeadEnrichmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    website_summary: str | None
    suggested_angle: str | None
    generated_message_email_subject: str | None
    generated_message_email: str | None
    generated_message_whatsapp: str | None
    generated_message_linkedin: str | None
    enriched_at: datetime


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None
    created_at: datetime


class TagIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = Field(None, max_length=20)


class TagWithCount(TagOut):
    lead_count: int = 0


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    name: str
    address: str | None
    phone: str | None
    whatsapp: str | None
    email: str | None
    instagram: str | None
    linkedin: str | None
    website: str | None
    category: str | None
    rating: float | None
    review_count: int
    latitude: float | None
    longitude: float | None
    city: str | None
    province: str | None
    status: str
    is_blacklisted: bool
    notes: str | None
    scraped_at: datetime
    score: LeadScoreOut | None = None
    tags: list[TagOut] = []


class LeadDetailOut(LeadOut):
    enrichment: LeadEnrichmentOut | None = None
    outreach_count: int = 0


class LeadListResponse(BaseModel):
    items: list[LeadOut]
    total: int
    page: int
    page_size: int


class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|approved|skipped|contacted|replied|converted|dropped)$")


class NotesUpdate(BaseModel):
    notes: str | None = None


class LeadUpdate(BaseModel):
    email: str | None = None
    linkedin: str | None = None
    instagram: str | None = None
    notes: str | None = None


class OutreachLogCreate(BaseModel):
    channel: str = Field(..., pattern="^(email|whatsapp|linkedin|other)$")
    subject: str | None = None
    message_sent: str = Field(..., min_length=1)
    notes: str | None = None


class OutreachLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    channel: str
    subject: str | None
    message_sent: str
    sent_at: datetime
    replied: bool
    reply_at: datetime | None
    reply_text: str | None
    notes: str | None


class ReplyMark(BaseModel):
    reply_text: str = Field(..., min_length=1)


class TemplateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    channel: str = Field(..., pattern="^(email|whatsapp|linkedin)$")
    subject: str | None = None
    body: str = Field(..., min_length=1)
    is_default: bool = False


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    channel: str
    subject: str | None
    body: str
    is_default: bool
    created_at: datetime


class BlacklistIn(BaseModel):
    identifier_type: str = Field(..., pattern="^(phone|email|whatsapp|domain|place_id)$")
    identifier_value: str = Field(..., min_length=1)
    reason: str | None = None


class BlacklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    identifier_type: str
    identifier_value: str
    reason: str | None
    created_at: datetime


class DashboardStats(BaseModel):
    total_leads: int
    by_status: dict[str, int]
    by_score_tier: dict[str, int]
    today_quota_used: int
    today_quota_limit: int
    today_quota_remaining: int
    outreach_today: int
    outreach_this_week: int
    outreach_by_day: list[int]
    reply_rate_30d: float
    top_cities: list[dict[str, Any]]
    top_categories: list[dict[str, Any]]


class GenerateMessageRequest(BaseModel):
    channel: str = Field(..., pattern="^(email|whatsapp|linkedin)$")
    template_id: int | None = None
    custom_instructions: str | None = None


class GenerateMessageResponse(BaseModel):
    subject: str | None = None
    body: str


class TagAttach(BaseModel):
    tag_id: int


class OutreachAnalytics(BaseModel):
    total_sent: int
    total_replied: int
    reply_rate: float
    avg_reply_hours: float | None
    by_channel: list[dict[str, Any]]
    by_hour: list[int]
    by_dow: list[dict[str, Any]]
