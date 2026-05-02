'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Lead, MessageTemplate, OutreachLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Input, Select, Textarea, Label } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import {
  buildGmailCompose,
  buildWhatsAppLink,
  copyToClipboard,
  formatDateTime,
  scoreColor,
  statusColor,
} from '@/lib/helpers';
import { ArrowLeft, Copy, ExternalLink, Trash2, Star } from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = Number(params.id);

  const [lead, setLead] = useState<Lead | null>(null);
  const [outreach, setOutreach] = useState<OutreachLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  const [composeChannel, setComposeChannel] = useState<'email' | 'whatsapp' | 'linkedin'>('email');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTemplateId, setComposeTemplateId] = useState<number | ''>('');
  const [composeInstructions, setComposeInstructions] = useState('');

  const [showReplyFor, setShowReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const refresh = async () => {
    try {
      const [l, o, t] = await Promise.all([
        api.getLead(leadId),
        api.listLeadOutreach(leadId),
        api.listTemplates(),
      ]);
      setLead(l);
      setOutreach(o);
      setTemplates(t);
      setEditingNotes(l.notes || '');
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, [leadId]);

  if (error) return <div className="p-8 text-danger">Error: {error}</div>;
  if (!lead) return <div className="p-8 text-muted-fg">Loading...</div>;

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      await api.enrichLead(leadId);
      await refresh();
    } catch (e) {
      alert(`Enrichment gagal: ${e}`);
    } finally {
      setEnriching(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(composeChannel);
    try {
      const result = await api.generateMessage(
        leadId,
        composeChannel,
        composeTemplateId ? Number(composeTemplateId) : undefined,
        composeInstructions || undefined,
      );
      setComposeBody(result.body);
      if (composeChannel === 'email' && result.subject) setComposeSubject(result.subject);
    } catch (e) {
      alert(`Generate gagal: ${e}`);
    } finally {
      setGenerating(null);
    }
  };

  const handleSendAndLog = async (action: 'open' | 'copy') => {
    if (!composeBody.trim()) {
      alert('Pesan kosong');
      return;
    }

    if (action === 'open') {
      let url: string | null = null;
      if (composeChannel === 'email' && lead.email) {
        url = buildGmailCompose(lead.email, composeSubject, composeBody);
      } else if (composeChannel === 'whatsapp' && (lead.whatsapp || lead.phone)) {
        url = buildWhatsAppLink(lead.whatsapp || lead.phone || '', composeBody);
      } else if (composeChannel === 'linkedin' && lead.linkedin) {
        url = lead.linkedin.startsWith('http') ? lead.linkedin : `https://linkedin.com/in/${lead.linkedin}`;
      }
      if (!url) {
        alert(
          `Lead tidak punya ${composeChannel} contact. Tambahkan dulu di field di atas, atau pakai opsi copy.`,
        );
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      try {
        const fullText =
          composeChannel === 'email' && composeSubject
            ? `Subject: ${composeSubject}\n\n${composeBody}`
            : composeBody;
        await copyToClipboard(fullText);
      } catch {
        alert('Copy gagal. Manual select-copy aja.');
      }
    }

    if (confirm('Tandai pesan ini sudah dikirim?')) {
      try {
        await api.logOutreach(leadId, {
          channel: composeChannel,
          subject: composeChannel === 'email' ? composeSubject : null,
          message_sent: composeBody,
        });
        setComposeBody('');
        setComposeSubject('');
        await refresh();
      } catch (e) {
        alert(`Log gagal: ${e}`);
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await api.updateLeadStatus(leadId, newStatus);
    await refresh();
  };

  const handleSaveNotes = async () => {
    await api.updateLeadNotes(leadId, editingNotes);
    await refresh();
  };

  const handleSaveContacts = async (data: Partial<Pick<Lead, 'email' | 'linkedin' | 'instagram'>>) => {
    await api.updateLead(leadId, data);
    await refresh();
  };

  const handleMarkReply = async (logId: number) => {
    if (!replyText.trim()) return;
    await api.markReply(leadId, logId, replyText);
    setShowReplyFor(null);
    setReplyText('');
    await refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus permanen "${lead.name}"?`)) return;
    await api.deleteLead(leadId);
    router.push('/leads');
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-3">
            <ArrowLeft size={14} /> Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
            <span className={`font-semibold ${scoreColor(lead.score?.fit_score ?? 0)}`}>
              Score: {lead.score?.fit_score ?? '-'}
            </span>
            {lead.is_blacklisted && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Blacklisted
              </Badge>
            )}
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 size={14} /> Delete
        </Button>
      </header>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => handleStatusChange('approved')}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusChange('skipped')}>
          Skip
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusChange('converted')}>
          Mark converted
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusChange('dropped')}>
          Drop
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await api.rescoreLead(leadId);
            await refresh();
          }}
        >
          Re-score
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Address" value={lead.address} />
            <Field label="Category" value={lead.category} />
            <Field label="City" value={lead.city} />
            <Field label="Province" value={lead.province} />
            <Field label="Phone" value={lead.phone} />
            <div>
              <Label>Rating</Label>
              {lead.rating ? (
                <p className="text-sm inline-flex items-center gap-1">
                  <Star size={12} className="fill-amber-500 text-amber-500" />
                  {lead.rating} ({lead.review_count} reviews)
                </p>
              ) : (
                <p className="text-sm text-muted-fg">-</p>
              )}
            </div>
            <Field
              label="Website"
              value={lead.website}
              link={lead.website && (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`)}
            />
            <Field
              label="Maps place_id"
              value={lead.place_id}
              link={`https://www.google.com/maps/place/?q=place_id:${lead.place_id}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outreach contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactField
              label="Email"
              value={lead.email}
              onSave={(v) => handleSaveContacts({ email: v || null })}
              placeholder="email@domain.com"
            />
            <ContactField
              label="LinkedIn"
              value={lead.linkedin}
              onSave={(v) => handleSaveContacts({ linkedin: v || null })}
              placeholder="https://linkedin.com/in/..."
            />
            <ContactField
              label="Instagram"
              value={lead.instagram}
              onSave={(v) => handleSaveContacts({ instagram: v || null })}
              placeholder="@username atau URL"
            />
            <Field label="WhatsApp" value={lead.whatsapp} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Score breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.score?.reasons && lead.score.reasons.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lead.score.reasons.map((r) => (
                <Badge key={r} className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30">
                  {r}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-fg">No reasons (score 0).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Enrichment (LLM)</CardTitle>
          <Button size="sm" onClick={handleEnrich} disabled={enriching}>
            {enriching ? 'Running...' : lead.enrichment ? 'Re-enrich' : 'Run enrichment'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lead.enrichment ? (
            <>
              <div>
                <Label>Website summary</Label>
                <p className="text-sm mt-1">{lead.enrichment.website_summary || '-'}</p>
              </div>
              <div>
                <Label>Suggested outreach angle</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{lead.enrichment.suggested_angle || '-'}</p>
              </div>
              <p className="text-xs text-muted-fg">
                Enriched: {formatDateTime(lead.enrichment.enriched_at)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-fg">Belum di-enrich. Klik tombol di atas untuk analisis.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose outreach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Channel</Label>
              <Select
                value={composeChannel}
                onChange={(e) => setComposeChannel(e.target.value as 'email' | 'whatsapp' | 'linkedin')}
                className="w-full mt-1"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="linkedin">LinkedIn</option>
              </Select>
            </div>
            <div>
              <Label>Template (optional)</Label>
              <Select
                value={composeTemplateId}
                onChange={(e) => setComposeTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1"
              >
                <option value="">No template</option>
                {templates
                  .filter((t) => t.channel === composeChannel)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_default && '(default)'}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Custom instructions (optional)</Label>
            <Input
              value={composeInstructions}
              onChange={(e) => setComposeInstructions(e.target.value)}
              placeholder="cth: lebih casual, sebut promo bulan ini"
              className="mt-1"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating !== null} variant="outline" size="sm">
            {generating ? 'Generating...' : 'Generate message via LLM'}
          </Button>

          {composeChannel === 'email' && (
            <div>
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Message body</Label>
            <Textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={10}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleSendAndLog('open')} size="sm">
              Open in {composeChannel} & log
            </Button>
            <Button onClick={() => handleSendAndLog('copy')} variant="outline" size="sm">
              <Copy size={14} /> Copy & log
            </Button>
          </div>
          <p className="text-xs text-muted-fg">
            Email kebuka di Gmail web compose pre-filled — pakai tombol{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">▼</kbd> di samping{' '}
            <strong>Send</strong> → <strong>Schedule send</strong> kalau mau spread out. WhatsApp
            membuka WA Web, LinkedIn membuka profilnya. Tools tidak kirim otomatis — log disimpan
            setelah kamu konfirmasi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={editingNotes}
            onChange={(e) => setEditingNotes(e.target.value)}
            placeholder="Catatan personal tentang lead ini..."
            rows={4}
          />
          <Button size="sm" onClick={handleSaveNotes}>
            Save notes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outreach history ({outreach.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outreach.length === 0 && (
            <p className="text-sm text-muted-fg">Belum ada history outreach.</p>
          )}
          {outreach.map((log) => (
            <div key={log.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted">{log.channel}</Badge>
                  <span className="text-xs text-muted-fg">{formatDateTime(log.sent_at)}</span>
                </div>
                {log.replied ? (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    Replied
                  </Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowReplyFor(log.id)}>
                    Mark reply
                  </Button>
                )}
              </div>
              {log.subject && <p className="text-sm font-medium">{log.subject}</p>}
              <p className="text-sm whitespace-pre-wrap text-muted-fg">{log.message_sent}</p>
              {log.replied && log.reply_text && (
                <div className="border-l-2 border-emerald-500 pl-3 mt-2">
                  <p className="text-xs text-muted-fg mb-1">
                    Reply at {log.reply_at && formatDateTime(log.reply_at)}:
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{log.reply_text}</p>
                </div>
              )}
              {showReplyFor === log.id && (
                <div className="space-y-2 pt-2">
                  <Textarea
                    placeholder="Paste isi balasan dari mereka..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleMarkReply(log.id)}>
                      Save reply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowReplyFor(null); setReplyText(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: string | null | false;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline inline-flex items-center gap-1"
          >
            {value} <ExternalLink size={11} />
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )
      ) : (
        <p className="text-sm text-muted-fg">-</p>
      )}
    </div>
  );
}

function ContactField({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (!editing) {
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">{value || <span className="text-muted-fg">-</span>}</p>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value || ''); setEditing(true); }}>
            Edit
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}
