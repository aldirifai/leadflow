export type LeadStatus = 'new' | 'approved' | 'skipped' | 'contacted' | 'replied' | 'converted' | 'dropped';

export interface LeadScore {
  fit_score: number;
  reasons: string[] | null;
  scored_at: string;
}

export interface LeadEnrichment {
  website_summary: string | null;
  suggested_angle: string | null;
  generated_message_email_subject: string | null;
  generated_message_email: string | null;
  generated_message_whatsapp: string | null;
  generated_message_linkedin: string | null;
  enriched_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface TagWithCount extends Tag {
  lead_count: number;
}

export interface Lead {
  id: number;
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  review_count: number;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  status: LeadStatus;
  is_blacklisted: boolean;
  notes: string | null;
  scraped_at: string;
  score: LeadScore | null;
  tags: Tag[];
  enrichment?: LeadEnrichment | null;
  outreach_count?: number;
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
}

export interface OutreachLog {
  id: number;
  lead_id: number;
  channel: 'email' | 'whatsapp' | 'linkedin' | 'other';
  subject: string | null;
  message_sent: string;
  sent_at: string;
  replied: boolean;
  reply_at: string | null;
  reply_text: string | null;
  notes: string | null;
}

export interface MessageTemplate {
  id: number;
  name: string;
  channel: 'email' | 'whatsapp' | 'linkedin';
  subject: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
}

export interface BlacklistEntry {
  id: number;
  identifier_type: 'phone' | 'email' | 'whatsapp' | 'domain' | 'place_id';
  identifier_value: string;
  reason: string | null;
  created_at: string;
}

export interface OutreachAnalytics {
  total_sent: number;
  total_replied: number;
  reply_rate: number;
  avg_reply_hours: number | null;
  by_channel: Array<{ channel: string; sent: number; replied: number; reply_rate: number }>;
  by_hour: number[];
  by_dow: Array<{ dow: number; sent: number; replied: number }>;
}

export interface DashboardStats {
  total_leads: number;
  by_status: Record<string, number>;
  by_score_tier: { high: number; medium: number; low: number };
  today_quota_used: number;
  today_quota_limit: number;
  today_quota_remaining: number;
  outreach_today: number;
  outreach_this_week: number;
  outreach_by_day: number[];
  reply_rate_30d: number;
  top_cities: Array<{ city: string; count: number }>;
  top_categories: Array<{ category: string; count: number }>;
}
