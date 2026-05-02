'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShortcut } from '@/components/KeyboardShortcuts';
import { api } from '@/lib/api';
import type { Lead, MessageTemplate, OutreachLog, Tag, TagWithCount } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Badge,
  Input,
  Select,
  Textarea,
  Label,
  Skeleton,
  Divider,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Dialog';
import {
  buildGmailCompose,
  buildWhatsAppLink,
  cleanReplyText,
  copyToClipboard,
  formatDateTime,
  scoreColor,
  statusColor,
} from '@/lib/helpers';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eraser,
  ExternalLink,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type ComposeChannel = 'email' | 'whatsapp' | 'linkedin';
type TabKey = 'overview' | 'score' | 'enrichment' | 'compose' | 'outreach' | 'notes';

const CHANNEL_TONE: Record<OutreachLog['channel'], string> = {
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  whatsapp: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  linkedin: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  other: 'bg-muted text-fg',
};

const TAG_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
};
const TAG_DOTS: Record<string, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-500',
  neutral: 'bg-neutral-500',
  fuchsia: 'bg-fuchsia-500',
};
const tagColorClass = (c: string | null) => TAG_COLORS[c || 'neutral'] || TAG_COLORS.neutral;
const tagDotClass = (c: string | null) => TAG_DOTS[c || 'neutral'] || TAG_DOTS.neutral;

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = Number(params.id);

  const [lead, setLead] = useState<Lead | null>(null);
  const [outreach, setOutreach] = useState<OutreachLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  // action loading flags
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  // editable state
  const [editingNotes, setEditingNotes] = useState('');
  const [composeChannel, setComposeChannel] = useState<ComposeChannel>('email');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTemplateId, setComposeTemplateId] = useState<number | ''>('');
  const [composeInstructions, setComposeInstructions] = useState('');
  const [composeStatus, setComposeStatus] = useState<{
    tone: 'success' | 'danger' | 'muted';
    text: string;
  } | null>(null);

  const [showReplyFor, setShowReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  const refresh = async () => {
    try {
      const [l, o, t, tg] = await Promise.all([
        api.getLead(leadId),
        api.listLeadOutreach(leadId),
        api.listTemplates(),
        api.listTags(),
      ]);
      setLead(l);
      setOutreach(o);
      setTemplates(t);
      setAllTags(tg);
      setEditingNotes(l.notes || '');
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleEnrich = async () => {
    if (enriching) return;
    setEnriching(true);
    try {
      await api.enrichLead(leadId);
      toast.success('Enrichment selesai.');
      await refresh();
    } catch (e) {
      toast.danger(`Enrichment gagal: ${e}`);
    } finally {
      setEnriching(false);
    }
  };

  const handleGenerate = async () => {
    if (generating !== null) return;
    setComposeStatus(null);
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
      setComposeStatus({ tone: 'success', text: 'Pesan berhasil di-generate. Edit dulu sebelum kirim.' });
    } catch (e) {
      setComposeStatus({ tone: 'danger', text: `Generate gagal: ${e}` });
    } finally {
      setGenerating(null);
    }
  };

  // Keyboard shortcuts (registered unconditionally — guards inside).
  // `e` -> trigger enrich (when not already enriching)
  useShortcut('e', () => {
    if (!lead || enriching) return;
    void handleEnrich();
  });
  // `g` -> switch to Compose tab AND trigger generate.
  // CONFLICT NOTE: the global root also listens to `g` as the start of a `g <x>`
  // navigation sequence. To preserve both, this handler waits 220ms before firing
  // — if a follow-up printable key arrives within that window we assume the user
  // is mid-sequence (e.g. `g l`) and skip generate. A lone `g` triggers generate.
  useShortcut('g', () => {
    if (!lead || generating !== null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancel = (ev: KeyboardEvent) => {
      if (ev.key.length === 1 && ev.key !== 'g') {
        if (timer) clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('keydown', cancel, true);
    };
    timer = setTimeout(() => {
      window.removeEventListener('keydown', cancel, true);
      setTab('compose');
      void handleGenerate();
    }, 220);
    window.addEventListener('keydown', cancel, true);
  });

  if (error) return <ErrorState message={error} />;
  if (!lead) return <LoadingState />;

  const handleSendAndLog = async (action: 'open' | 'copy') => {
    setComposeStatus(null);
    if (!composeBody.trim()) {
      setComposeStatus({ tone: 'danger', text: 'Pesan kosong — generate atau ketik dulu.' });
      return;
    }

    if (action === 'open') {
      let url: string | null = null;
      if (composeChannel === 'email' && lead.email) {
        url = buildGmailCompose(lead.email, composeSubject, composeBody);
      } else if (composeChannel === 'whatsapp' && (lead.whatsapp || lead.phone)) {
        url = buildWhatsAppLink(lead.whatsapp || lead.phone || '', composeBody);
      } else if (composeChannel === 'linkedin' && lead.linkedin) {
        url = lead.linkedin.startsWith('http')
          ? lead.linkedin
          : `https://linkedin.com/in/${lead.linkedin}`;
      }
      if (!url) {
        setComposeStatus({
          tone: 'danger',
          text: `Lead belum punya kontak ${composeChannel}. Tambah di tab Overview, atau pakai opsi copy.`,
        });
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
        setComposeStatus({ tone: 'success', text: 'Pesan tersalin ke clipboard.' });
      } catch {
        setComposeStatus({ tone: 'danger', text: 'Copy gagal. Manual select-copy aja.' });
        return;
      }
    }

    const ok = await confirm({
      title: 'Tandai pesan sudah dikirim?',
      description: 'Outreach ter-log dan lead status akan otomatis pindah ke "contacted" kalau masih new/approved. Cooldown 30 hari mulai dari sekarang.',
      confirmText: 'Sudah dikirim',
    });
    if (ok) {
      try {
        await api.logOutreach(leadId, {
          channel: composeChannel,
          subject: composeChannel === 'email' ? composeSubject : null,
          message_sent: composeBody,
        });
        setComposeBody('');
        setComposeSubject('');
        setComposeStatus({ tone: 'success', text: 'Outreach ter-log. Cek tab Outreach.' });
        toast.success('Outreach ter-log.');
        await refresh();
      } catch (e) {
        setComposeStatus({ tone: 'danger', text: `Log gagal: ${e}` });
        toast.danger(`Log gagal: ${e}`);
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(newStatus);
    try {
      await api.updateLeadStatus(leadId, newStatus);
      toast.success(`Status di-update ke "${newStatus}".`);
      await refresh();
    } catch (e) {
      toast.danger(`Update status gagal: ${e}`);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      await api.rescoreLead(leadId);
      toast.success('Score di-recompute.');
      await refresh();
    } catch (e) {
      toast.danger(`Re-score gagal: ${e}`);
    } finally {
      setRescoring(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.updateLeadNotes(leadId, editingNotes);
      toast.success('Notes tersimpan.');
      await refresh();
    } catch (e) {
      toast.danger(`Save notes gagal: ${e}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveContacts = async (
    data: Partial<Pick<Lead, 'email' | 'linkedin' | 'instagram'>>,
  ) => {
    await api.updateLead(leadId, data);
    await refresh();
  };

  const handleAttachTag = async (tagId: number) => {
    try {
      await api.attachTag(leadId, tagId);
      toast.success('Tag terpasang.');
      await refresh();
    } catch (e) {
      toast.danger(`Gagal attach tag: ${e}`);
    }
  };

  const handleDetachTag = async (tagId: number) => {
    try {
      await api.detachTag(leadId, tagId);
      toast.success('Tag ter-detach.');
      await refresh();
    } catch (e) {
      toast.danger(`Gagal detach tag: ${e}`);
    }
  };

  const handleCreateAndAttach = async (name: string, color: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await api.createTag({ name: trimmed, color });
      await api.attachTag(leadId, created.id);
      toast.success(`Tag "${created.name}" dibuat & terpasang.`);
      await refresh();
    } catch (e) {
      toast.danger(`Gagal create tag: ${e}`);
    }
  };

  const handleMarkReply = async (logId: number) => {
    if (!replyText.trim()) return;
    await api.markReply(leadId, logId, replyText);
    setShowReplyFor(null);
    setReplyText('');
    await refresh();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Hapus "${lead.name}"?`,
      description: 'Lead, score, enrichment, dan outreach log-nya ikut terhapus permanen. Tidak bisa di-undo.',
      confirmText: 'Hapus permanen',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteLead(leadId);
      toast.success(`"${lead.name}" dihapus.`);
      router.push('/leads');
    } catch (e) {
      toast.danger(`Gagal hapus: ${e}`);
    }
  };

  const fitScore = lead.score?.fit_score ?? 0;
  const reasons = lead.score?.reasons ?? [];

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-px backdrop-blur bg-bg/85 border-b border-border">
        <div className="max-w-6xl px-8 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="-ml-2 mb-2 h-7"
              >
                <ArrowLeft size={14} /> Back
              </Button>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">
                  {lead.name}
                </h1>
                <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-muted ${scoreColor(
                    fitScore,
                  )}`}
                >
                  <Sparkles size={11} /> {fitScore}
                </span>
                {lead.is_blacklisted && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                    Blacklisted
                  </Badge>
                )}
                {lead.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {lead.tags.slice(0, 3).map((t) => (
                      <Badge
                        key={t.id}
                        className={cn('inline-flex items-center gap-1', tagColorClass(t.color))}
                      >
                        <span
                          className={cn('size-1.5 rounded-full', tagDotClass(t.color))}
                          aria-hidden
                        />
                        {t.name}
                      </Badge>
                    ))}
                    {lead.tags.length > 3 && (
                      <Badge className="bg-muted text-muted-fg border-border">
                        +{lead.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('approved')}
                  disabled={statusUpdating !== null}
                >
                  <CheckCircle2 size={13} /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('skipped')}
                  disabled={statusUpdating !== null}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('converted')}
                  disabled={statusUpdating !== null}
                >
                  Convert
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('dropped')}
                  disabled={statusUpdating !== null}
                >
                  Drop
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRescore}
                  disabled={rescoring}
                  title="Re-score lead"
                >
                  <RefreshCw size={13} className={rescoring ? 'animate-spin' : ''} />
                  Re-score
                </Button>
              </div>
              <div className="hidden md:block w-px h-6 mx-1 bg-border" aria-hidden />
              <Button size="sm" variant="danger" onClick={handleDelete}>
                <Trash2 size={13} /> Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl px-8 py-6 grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="min-w-0">
          <Tabs value={tab} onChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="score">Score</TabsTrigger>
              <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="outreach">Outreach ({outreach.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Business info</CardTitle>
                    <CardDescription>Data dari Google Maps.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Field label="Address" value={lead.address} />
                    <Field label="Category" value={lead.category} />
                    <Field label="City" value={lead.city} />
                    <Field label="Province" value={lead.province} />
                    <Field label="Phone" value={lead.phone} mono />
                    <div>
                      <Label>Rating</Label>
                      {lead.rating ? (
                        <p className="text-sm mt-1 inline-flex items-center gap-1">
                          <Star size={12} className="fill-amber-500 text-amber-500" />
                          {lead.rating}{' '}
                          <span className="text-muted-fg">
                            ({lead.review_count} reviews)
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm mt-1 text-muted-fg">-</p>
                      )}
                    </div>
                    <Field
                      label="Website"
                      value={lead.website}
                      link={
                        lead.website &&
                        (lead.website.startsWith('http')
                          ? lead.website
                          : `https://${lead.website}`)
                      }
                    />
                    <Field
                      label="Maps place_id"
                      value={lead.place_id}
                      link={`https://www.google.com/maps/place/?q=place_id:${lead.place_id}`}
                      mono
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Outreach contacts</CardTitle>
                    <CardDescription>Edit kontak di sini sebelum compose.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
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
                    <Field label="WhatsApp" value={lead.whatsapp} mono />
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4">
                <TagsCard
                  leadTags={lead.tags}
                  allTags={allTags}
                  onAttach={handleAttachTag}
                  onDetach={handleDetachTag}
                  onCreate={handleCreateAndAttach}
                />
              </div>
            </TabsContent>

            {/* SCORE */}
            <TabsContent value="score">
              <Card>
                <CardHeader>
                  <CardTitle>Score breakdown</CardTitle>
                  <CardDescription>
                    Skor heuristik berdasarkan kelengkapan data &amp; signal lead.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-baseline gap-3">
                    <span className={`text-5xl font-bold tabular-nums ${scoreColor(fitScore)}`}>
                      {fitScore}
                    </span>
                    <span className="text-sm text-muted-fg">/ 100</span>
                  </div>
                  <div className="h-2 w-full max-w-md rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        fitScore >= 70
                          ? 'bg-accent'
                          : fitScore >= 40
                          ? 'bg-warning'
                          : 'bg-muted-fg/40'
                      }`}
                      style={{ width: `${Math.min(100, fitScore)}%` }}
                    />
                  </div>
                  <div>
                    <Label>Reasons</Label>
                    {reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {reasons.map((r) => (
                          <Badge
                            key={r}
                            className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-fg mt-2">
                        Belum ada reason tercatat (skor rendah / belum di-score).
                      </p>
                    )}
                  </div>
                  {lead.score?.scored_at && (
                    <p className="text-xs text-muted-fg">
                      Last scored: {formatDateTime(lead.score.scored_at)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ENRICHMENT */}
            <TabsContent value="enrichment">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Enrichment (LLM)</CardTitle>
                      <CardDescription>
                        Analisis website &amp; saran sudut outreach.
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={handleEnrich} disabled={enriching}>
                      <Sparkles size={13} className={enriching ? 'animate-pulse' : ''} />
                      {enriching ? 'Running...' : lead.enrichment ? 'Re-enrich' : 'Run enrichment'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.enrichment ? (
                    <>
                      <div>
                        <Label>Website summary</Label>
                        <p className="text-sm mt-1.5 leading-relaxed">
                          {lead.enrichment.website_summary || (
                            <span className="text-muted-fg">-</span>
                          )}
                        </p>
                      </div>
                      <Divider />
                      <div>
                        <Label>Suggested outreach angle</Label>
                        <p className="text-sm mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {lead.enrichment.suggested_angle || (
                            <span className="text-muted-fg">-</span>
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-muted-fg">
                        Enriched: {formatDateTime(lead.enrichment.enriched_at)}
                      </p>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <Sparkles size={28} className="mx-auto text-muted-fg/60" />
                      <p className="mt-3 text-sm font-medium">Belum di-enrich</p>
                      <p className="mt-1 text-xs text-muted-fg max-w-sm mx-auto">
                        Jalanin enrichment buat dapetin ringkasan website &amp; angle
                        outreach yang spesifik buat lead ini.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPOSE */}
            <TabsContent value="compose">
              <Card>
                <CardHeader>
                  <CardTitle>Compose outreach</CardTitle>
                  <CardDescription>
                    Generate via LLM, edit, lalu buka Gmail / WA / LinkedIn buat kirim.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Top: channel + template + instructions */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Channel</Label>
                      <Select
                        value={composeChannel}
                        onChange={(e) =>
                          setComposeChannel(e.target.value as ComposeChannel)
                        }
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
                        onChange={(e) =>
                          setComposeTemplateId(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        className="w-full mt-1"
                      >
                        <option value="">No template</option>
                        {templates
                          .filter((t) => t.channel === composeChannel)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.is_default ? '(default)' : ''}
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
                  <Button
                    onClick={handleGenerate}
                    disabled={generating !== null}
                    variant="subtle"
                    size="sm"
                  >
                    <Sparkles size={13} className={generating ? 'animate-pulse' : ''} />
                    {generating ? 'Generating...' : 'Generate via LLM'}
                  </Button>

                  <Divider />

                  {/* Middle: subject + body */}
                  {composeChannel === 'email' && (
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="mt-1"
                        placeholder="Subject email"
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
                      placeholder="Pesan akan tampil di sini setelah generate, atau ketik manual."
                    />
                  </div>

                  {/* Inline status */}
                  {composeStatus && (
                    <div
                      className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
                        composeStatus.tone === 'success'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : composeStatus.tone === 'danger'
                          ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : 'bg-muted text-muted-fg'
                      }`}
                    >
                      {composeStatus.tone === 'success' ? (
                        <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                      ) : composeStatus.tone === 'danger' ? (
                        <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                      ) : null}
                      <span>{composeStatus.text}</span>
                    </div>
                  )}

                  {/* Bottom: actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => handleSendAndLog('open')} size="md">
                      <Send size={14} /> Open in {composeChannel} &amp; log
                    </Button>
                    <Button
                      onClick={() => handleSendAndLog('copy')}
                      variant="outline"
                      size="md"
                    >
                      <Copy size={14} /> Copy &amp; log
                    </Button>
                  </div>

                  <p className="text-xs text-muted-fg leading-relaxed">
                    Email kebuka di Gmail web compose pre-filled — pakai tombol{' '}
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">▼</kbd>{' '}
                    di samping <strong>Send</strong> → <strong>Schedule send</strong> kalau
                    mau spread out. WhatsApp membuka WA Web, LinkedIn membuka profilnya.
                    Tools tidak kirim otomatis — log disimpan setelah kamu konfirmasi.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* OUTREACH HISTORY */}
            <TabsContent value="outreach">
              <div className="space-y-3">
                {outreach.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <MessageSquare size={28} className="mx-auto text-muted-fg/60" />
                      <p className="mt-3 text-sm font-medium">Belum ada outreach</p>
                      <p className="mt-1 text-xs text-muted-fg">
                        Mulai dari tab <span className="font-medium">Compose</span> di
                        atas.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  outreach.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={CHANNEL_TONE[log.channel]}>
                              {log.channel}
                            </Badge>
                            {log.replied && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                Replied
                              </Badge>
                            )}
                            <span className="text-xs text-muted-fg">
                              {formatDateTime(log.sent_at)}
                            </span>
                          </div>
                          {!log.replied && showReplyFor !== log.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowReplyFor(log.id)}
                            >
                              Mark reply
                            </Button>
                          )}
                        </div>

                        {log.subject && (
                          <p className="text-sm font-medium">{log.subject}</p>
                        )}
                        <pre className="whitespace-pre-wrap text-sm text-fg/85 font-sans">
                          {log.message_sent}
                        </pre>

                        {log.replied && log.reply_text && (
                          <div className="border-l-2 border-accent pl-3 mt-2">
                            <p className="text-[11px] text-muted-fg mb-1 uppercase tracking-wide font-medium">
                              Reply
                              {log.reply_at ? ` · ${formatDateTime(log.reply_at)}` : ''}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{log.reply_text}</p>
                          </div>
                        )}

                        {showReplyFor === log.id && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                              <Label>Reply text</Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReplyText(cleanReplyText(replyText))}
                                disabled={!replyText.trim()}
                                title="Strip quoted lines (>), &quot;On X wrote:&quot; headers, and signatures"
                              >
                                <Eraser size={12} /> Bersihkan
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Paste isi balasan dari mereka. Klik 'Bersihkan' untuk auto-strip quoted text dan signature."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={5}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleMarkReply(log.id)}>
                                Save reply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowReplyFor(null);
                                  setReplyText('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* NOTES */}
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Catatan personal — gak dipakai LLM.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Catatan personal tentang lead ini..."
                    rows={6}
                  />
                  <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? 'Saving...' : 'Save notes'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar score panel — hidden on narrow */}
        <aside className="hidden lg:block sticky top-[7.5rem]">
          <Card>
            <CardHeader>
              <CardTitle>Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-4xl font-bold tabular-nums ${scoreColor(fitScore)}`}>
                  {fitScore}
                </span>
                <span className="text-xs text-muted-fg">/ 100</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    fitScore >= 70
                      ? 'bg-accent'
                      : fitScore >= 40
                      ? 'bg-warning'
                      : 'bg-muted-fg/40'
                  }`}
                  style={{ width: `${Math.min(100, fitScore)}%` }}
                />
              </div>
              {reasons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {reasons.map((r) => (
                    <Badge
                      key={r}
                      className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 text-[10px]"
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-fg">Belum ada reason.</p>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTab('score')}
                className="-ml-2 h-7"
              >
                View details →
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function LoadingState() {
  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="space-y-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-8 max-w-2xl">
      <Card>
        <CardContent className="p-6 flex items-start gap-3">
          <XCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Error loading lead</p>
            <p className="text-xs text-muted-fg mt-1 break-words">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  link,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  link?: string | null | false;
  mono?: boolean;
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
            className={`mt-1 hover:underline inline-flex items-center gap-1 break-all ${
              mono ? 'font-mono text-xs' : 'text-sm'
            }`}
          >
            {value} <ExternalLink size={11} className="flex-shrink-0" />
          </a>
        ) : (
          <p className={`mt-1 break-words ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
            {value}
          </p>
        )
      ) : (
        <p className="text-sm mt-1 text-muted-fg">-</p>
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
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  // keep draft synced when external value changes (e.g., after refresh)
  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm break-all min-w-0">
            {value || <span className="text-muted-fg">-</span>}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(value || '');
              setEditing(true);
            }}
            className="flex-shrink-0 h-7 px-2"
          >
            <Pencil size={12} /> Edit
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '...' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
        >
          <X size={13} />
        </Button>
      </div>
    </div>
  );
}

function TagsCard({
  leadTags,
  allTags,
  onAttach,
  onDetach,
  onCreate,
}: {
  leadTags: Tag[];
  allTags: TagWithCount[];
  onAttach: (tagId: number) => Promise<void>;
  onDetach: (tagId: number) => Promise<void>;
  onCreate: (name: string, color: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState<number | 'create' | null>(null);

  const attachedIds = new Set(leadTags.map((t) => t.id));
  const available = allTags.filter((t) => !attachedIds.has(t.id));

  const closePopover = () => {
    setOpen(false);
    setCreateMode(false);
    setNewName('');
  };

  // Esc closes popover
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const doAttach = async (tagId: number) => {
    setBusy(tagId);
    try {
      await onAttach(tagId);
      closePopover();
    } finally {
      setBusy(null);
    }
  };

  const doCreate = async () => {
    if (!newName.trim()) return;
    setBusy('create');
    try {
      await onCreate(newName.trim(), 'emerald');
      closePopover();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>Segmentasi lead pakai tag warna-warni.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {leadTags.length === 0 ? (
          <p className="text-sm text-muted-fg">
            Belum ada tag. Klik <span className="font-medium text-fg">+ Add tag</span> untuk pertama.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {leadTags.map((t) => (
              <span
                key={t.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium',
                  tagColorClass(t.color),
                )}
              >
                <span
                  className={cn('size-1.5 rounded-full', tagDotClass(t.color))}
                  aria-hidden
                />
                {t.name}
                <button
                  type="button"
                  onClick={() => onDetach(t.id)}
                  className="ml-0.5 -mr-0.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`Detach ${t.name}`}
                  title="Detach tag"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          {!open ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              className="gap-1"
            >
              <Plus size={13} /> Add tag
            </Button>
          ) : (
            <div className="rounded-md border border-border bg-elevated shadow-md p-2 max-w-sm animate-fade-in">
              {!createMode ? (
                <>
                  {available.length === 0 ? (
                    <p className="text-xs text-muted-fg px-2 py-1.5">
                      Semua tag sudah terpasang. Bikin yang baru:
                    </p>
                  ) : (
                    <ul className="max-h-56 overflow-y-auto py-0.5">
                      {available.map((t) => (
                        <li key={t.id}>
                          <button
                            onClick={() => doAttach(t.id)}
                            disabled={busy !== null}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left transition-colors disabled:opacity-50"
                          >
                            <span
                              className={cn(
                                'size-2 rounded-full shrink-0',
                                tagDotClass(t.color),
                              )}
                              aria-hidden
                            />
                            <span className="flex-1 truncate">{t.name}</span>
                            <span className="text-[10px] text-muted-fg shrink-0">
                              {t.lead_count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => setCreateMode(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left text-accent transition-colors"
                    >
                      <Plus size={13} />
                      <span>Create new tag...</span>
                    </button>
                    <button
                      onClick={closePopover}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left text-muted-fg transition-colors"
                    >
                      <X size={12} />
                      <span>Tutup</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 p-1">
                  <Label htmlFor="new-tag-name">Nama tag baru</Label>
                  <Input
                    id="new-tag-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="cth: hot lead"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        doCreate();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={doCreate}
                      disabled={busy !== null || !newName.trim()}
                    >
                      <TagIcon size={12} /> Create &amp; attach
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCreateMode(false);
                        setNewName('');
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-fg leading-relaxed">
                    Default warna emerald. Edit warna nanti di halaman{' '}
                    <span className="font-medium">Tags</span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
