import type {
  BlacklistEntry,
  DashboardStats,
  Lead,
  LeadListResponse,
  MessageTemplate,
  OutreachLog,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  dashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  listLeads: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    });
    const qs = search.toString();
    return request<LeadListResponse>(`/leads${qs ? `?${qs}` : ''}`);
  },

  getLead: (id: number) => request<Lead>(`/leads/${id}`),

  updateLeadStatus: (id: number, status: string) =>
    request<Lead>(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateLeadNotes: (id: number, notes: string | null) =>
    request<Lead>(`/leads/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  updateLead: (id: number, data: Partial<Pick<Lead, 'email' | 'linkedin' | 'instagram' | 'notes'>>) =>
    request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  rescoreLead: (id: number) => request<Lead>(`/leads/${id}/score`, { method: 'POST' }),

  rescoreAll: () => request<{ rescored: number }>(`/leads/score-all`, { method: 'POST' }),

  deleteLead: (id: number) => request<void>(`/leads/${id}`, { method: 'DELETE' }),

  enrichLead: (id: number) => request<Lead>(`/leads/${id}/enrich`, { method: 'POST' }),

  generateMessage: (
    id: number,
    channel: 'email' | 'whatsapp' | 'linkedin',
    template_id?: number,
    custom_instructions?: string,
  ) =>
    request<{ subject: string | null; body: string }>(`/leads/${id}/generate-message`, {
      method: 'POST',
      body: JSON.stringify({ channel, template_id, custom_instructions }),
    }),

  logOutreach: (
    id: number,
    data: { channel: string; subject?: string | null; message_sent: string; notes?: string | null },
  ) =>
    request<OutreachLog>(`/leads/${id}/outreach`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listLeadOutreach: (id: number) => request<OutreachLog[]>(`/leads/${id}/outreach`),

  markReply: (lead_id: number, log_id: number, reply_text: string) =>
    request<OutreachLog>(`/leads/${lead_id}/outreach/${log_id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply_text }),
    }),

  listAllOutreach: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    });
    const qs = search.toString();
    return request<OutreachLog[]>(`/outreach${qs ? `?${qs}` : ''}`);
  },

  listTemplates: (channel?: string) =>
    request<MessageTemplate[]>(`/templates${channel ? `?channel=${channel}` : ''}`),

  createTemplate: (data: Omit<MessageTemplate, 'id' | 'created_at'>) =>
    request<MessageTemplate>(`/templates`, { method: 'POST', body: JSON.stringify(data) }),

  updateTemplate: (id: number, data: Omit<MessageTemplate, 'id' | 'created_at'>) =>
    request<MessageTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTemplate: (id: number) => request<void>(`/templates/${id}`, { method: 'DELETE' }),

  listBlacklist: () => request<BlacklistEntry[]>(`/blacklist`),

  addBlacklist: (data: { identifier_type: string; identifier_value: string; reason?: string | null }) =>
    request<BlacklistEntry>(`/blacklist`, { method: 'POST', body: JSON.stringify(data) }),

  removeBlacklist: (id: number) => request<void>(`/blacklist/${id}`, { method: 'DELETE' }),
};
