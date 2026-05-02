'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Flame,
  Inbox,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardStats, LeadStatus } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge, Divider, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { statusColor } from '@/lib/helpers';

// ── Helpers ────────────────────────────────────────────────────────────────

const FUNNEL_ORDER: LeadStatus[] = [
  'new',
  'approved',
  'contacted',
  'replied',
  'converted',
];

const STATUS_LABEL: Record<string, string> = {
  new: 'Baru',
  approved: 'Approved',
  contacted: 'Dihubungi',
  replied: 'Membalas',
  converted: 'Closed',
  skipped: 'Skipped',
  dropped: 'Dropped',
};

// Solid bar colors that pair with the same statusColor() badges used elsewhere.
const STATUS_BAR: Record<string, string> = {
  new: 'bg-blue-500/80 dark:bg-blue-500/70',
  approved: 'bg-emerald-500/80 dark:bg-emerald-500/70',
  contacted: 'bg-purple-500/80 dark:bg-purple-500/70',
  replied: 'bg-amber-500/80 dark:bg-amber-500/70',
  converted: 'bg-green-500/80 dark:bg-green-500/70',
  skipped: 'bg-slate-400/70 dark:bg-slate-500/60',
  dropped: 'bg-red-500/80 dark:bg-red-500/70',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function todayLong(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-danger/40 bg-danger/5">
          <CardContent className="space-y-1">
            <p className="text-sm font-medium text-danger">
              Gagal memuat dashboard
            </p>
            <p className="text-xs text-muted-fg break-all">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return <DashboardSkeleton />;

  if (stats.total_leads === 0) return <EmptyState />;

  return <Dashboard stats={stats} />;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function Dashboard({ stats }: { stats: DashboardStats }) {
  const quotaPct = useMemo(
    () =>
      stats.today_quota_limit > 0
        ? (stats.today_quota_used / stats.today_quota_limit) * 100
        : 0,
    [stats.today_quota_used, stats.today_quota_limit],
  );

  const totalScored =
    stats.by_score_tier.high +
    stats.by_score_tier.medium +
    stats.by_score_tier.low;

  const funnelTotal = FUNNEL_ORDER.reduce(
    (sum, s) => sum + (stats.by_status[s] ?? 0),
    0,
  );

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-fg mt-1">
            {greeting()}, Aldi. {todayLong()}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm">
              <Inbox className="h-4 w-4" />
              Lihat leads
            </Button>
          </Link>
          <Link href="/leads?status=approved">
            <Button variant="success" size="sm">
              <Send className="h-4 w-4" />
              Mulai outreach
            </Button>
          </Link>
        </div>
      </header>

      <Divider />

      {/* Hero / morning briefing */}
      <HeroToday stats={stats} quotaPct={quotaPct} />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          icon={<Target className="h-4 w-4" />}
          label="Total leads"
          value={stats.total_leads.toLocaleString('id-ID')}
          hint={`${totalScored.toLocaleString('id-ID')} sudah di-score`}
        />
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="Score tinggi"
          value={stats.by_score_tier.high.toLocaleString('id-ID')}
          hint="fit_score ≥ 70"
          accent
        />
        <StatTile
          icon={<Send className="h-4 w-4" />}
          label="Outreach hari ini"
          value={stats.outreach_today.toLocaleString('id-ID')}
          hint={`${stats.outreach_this_week.toLocaleString('id-ID')} minggu ini`}
        />
        <StatTile
          icon={<MessageSquare className="h-4 w-4" />}
          label="Reply rate (30d)"
          value={`${stats.reply_rate_30d}%`}
          hint={replyRateHint(stats.reply_rate_30d)}
        />
      </div>

      {/* Quota + Pipeline */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <QuotaCard stats={stats} pct={quotaPct} />
        </div>
        <div className="lg:col-span-2">
          <PipelineCard stats={stats} funnelTotal={funnelTotal} />
        </div>
      </div>

      {/* Score distribution + Activity rhythm */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ScoreDistributionCard stats={stats} />
        <div className="lg:col-span-2">
          <ActivityRhythmCard stats={stats} />
        </div>
      </div>

      {/* Top cities + categories */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopList
          title="Top kota"
          icon={<MapPin className="h-4 w-4" />}
          items={stats.top_cities.map((c) => ({ key: c.city, label: c.city, count: c.count }))}
          emptyHint="Belum ada data kota."
        />
        <TopList
          title="Top kategori"
          icon={<Building2 className="h-4 w-4" />}
          items={stats.top_categories.map((c) => ({ key: c.category, label: c.category, count: c.count }))}
          emptyHint="Belum ada data kategori."
        />
      </div>
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────

function HeroToday({
  stats,
  quotaPct,
}: {
  stats: DashboardStats;
  quotaPct: number;
}) {
  const hot = stats.by_score_tier.high;
  const approved = stats.by_status['approved'] ?? 0;
  const replied = stats.by_status['replied'] ?? 0;

  // Recommended next action — derived purely from data, no fake metrics.
  let suggestion: { label: string; href: string; cta: string };
  if (replied > 0) {
    suggestion = {
      label: `${replied} lead sedang membalas — follow up dulu sebelum yang lain.`,
      href: '/leads?status=replied',
      cta: 'Lihat balasan',
    };
  } else if (approved > 0) {
    suggestion = {
      label: `${approved} lead approved siap dikontak.`,
      href: '/leads?status=approved',
      cta: 'Kirim outreach',
    };
  } else if (hot > 0) {
    suggestion = {
      label: `${hot} lead score tinggi belum di-approve.`,
      href: '/leads?score=high',
      cta: 'Review leads',
    };
  } else {
    suggestion = {
      label: 'Pipeline lagi sepi. Capture leads baru lewat extension.',
      href: '/leads',
      cta: 'Buka leads',
    };
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Subtle accent gradient — uses semantic tokens only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
      />
      <CardContent className="relative p-8 grid md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Briefing hari ini
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">
              {stats.outreach_today}
            </span>
            <span className="text-sm text-muted-fg">
              outreach terkirim hari ini
            </span>
          </div>
          <p className="text-sm text-muted-fg max-w-xl">
            <span className="text-fg font-medium">
              {stats.today_quota_used}
            </span>{' '}
            dari{' '}
            <span className="text-fg font-medium">
              {stats.today_quota_limit}
            </span>{' '}
            daily ingest quota digunakan
            {quotaPct >= 90 ? ' — quota hampir habis.' : '.'}{' '}
            <span className="text-fg font-medium">
              {stats.outreach_this_week}
            </span>{' '}
            pesan terkirim minggu ini, dengan reply rate{' '}
            <span className="text-fg font-medium">
              {stats.reply_rate_30d}%
            </span>{' '}
            (30 hari).
          </p>
        </div>

        <div className="md:justify-self-end w-full md:max-w-xs">
          <div className="rounded-md border border-border bg-bg/40 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-fg">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Kerjakan dulu
            </div>
            <p className="mt-2 text-sm leading-relaxed">{suggestion.label}</p>
            <Link
              href={suggestion.href}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              {suggestion.cta}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function replyRateHint(pct: number): string {
  if (pct >= 15) return 'di atas rata-rata';
  if (pct >= 5) return 'sehat, terus dorong';
  if (pct > 0) return 'iterasi pesannya';
  return 'belum ada balasan';
}

// ── Stat tile ──────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        accent
          ? 'border-accent/40 bg-gradient-to-br from-accent/5 to-transparent'
          : ''
      }
    >
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-fg">{label}</span>
          <span
            className={
              accent
                ? 'text-accent'
                : 'text-muted-fg/70'
            }
          >
            {icon}
          </span>
        </div>
        <p
          className={
            'text-3xl font-semibold tabular-nums tracking-tight ' +
            (accent ? 'text-accent' : '')
          }
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-muted-fg">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ── Quota card (richer progress) ───────────────────────────────────────────

function QuotaCard({
  stats,
  pct,
}: {
  stats: DashboardStats;
  pct: number;
}) {
  const safePct = Math.min(Math.max(pct, 0), 100);
  const danger = pct >= 90;
  const warn = pct >= 80 && pct < 90;

  const fillClass = danger
    ? 'bg-warning'
    : warn
      ? 'bg-warning/80'
      : 'bg-gradient-to-r from-accent/70 to-accent';

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Daily ingest quota</CardTitle>
        <CardDescription>
          Reset otomatis tengah malam waktu lokal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-semibold tabular-nums tracking-tight">
              {stats.today_quota_used}
            </span>
            <span className="text-sm text-muted-fg">
              {' '}
              / {stats.today_quota_limit}
            </span>
          </div>
          <span
            className={
              'text-sm font-medium tabular-nums ' +
              (danger
                ? 'text-warning'
                : warn
                  ? 'text-warning'
                  : 'text-accent')
            }
          >
            {Math.round(pct)}%
          </span>
        </div>

        <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={'h-full rounded-full transition-all ' + fillClass}
            style={{ width: `${safePct}%` }}
          />
          {/* 80% threshold marker */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-border/80"
            style={{ left: '80%' }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-muted-fg">
          <span>{stats.today_quota_remaining} sisa hari ini</span>
          <span className="tabular-nums">80% threshold</span>
        </div>

        {danger && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            Quota hampir habis. Sisain buat lead score tinggi aja.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Pipeline funnel ────────────────────────────────────────────────────────

function PipelineCard({
  stats,
  funnelTotal,
}: {
  stats: DashboardStats;
  funnelTotal: number;
}) {
  const segments = FUNNEL_ORDER.map((s) => ({
    status: s,
    count: stats.by_status[s] ?? 0,
  }));

  const funnelKeys: string[] = FUNNEL_ORDER;
  const otherStatuses = Object.entries(stats.by_status).filter(
    ([k, v]) => v > 0 && !funnelKeys.includes(k),
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pipeline funnel</CardTitle>
        <CardDescription>
          Distribusi lead dari ingest sampai closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {funnelTotal === 0 ? (
          <p className="text-sm text-muted-fg">
            Belum ada lead di funnel utama.
          </p>
        ) : (
          <>
            {/* Strip */}
            <div className="flex h-8 w-full overflow-hidden rounded-md border border-border">
              {segments.map((seg) => {
                const pct = (seg.count / funnelTotal) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={seg.status}
                    className={
                      'h-full transition-all ' + STATUS_BAR[seg.status]
                    }
                    style={{ width: `${pct}%` }}
                    title={`${STATUS_LABEL[seg.status]}: ${seg.count}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {segments.map((seg) => (
                <div key={seg.status} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        'h-2 w-2 rounded-full ' + STATUS_BAR[seg.status]
                      }
                    />
                    <span className="text-[11px] text-muted-fg">
                      {STATUS_LABEL[seg.status]}
                    </span>
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {seg.count}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {otherStatuses.length > 0 && (
          <>
            <Divider />
            <div className="flex flex-wrap gap-2">
              {otherStatuses.map(([k, v]) => (
                <Badge key={k} className={statusColor(k)}>
                  {STATUS_LABEL[k] ?? k} · {v}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Score distribution ─────────────────────────────────────────────────────

function ScoreDistributionCard({ stats }: { stats: DashboardStats }) {
  const tiers = [
    { key: 'high' as const, label: 'High', sub: '≥ 70', count: stats.by_score_tier.high, accent: true },
    { key: 'medium' as const, label: 'Medium', sub: '40–69', count: stats.by_score_tier.medium, accent: false },
    { key: 'low' as const, label: 'Low', sub: '< 40', count: stats.by_score_tier.low, accent: false },
  ];
  const max = Math.max(1, ...tiers.map((t) => t.count));
  const total = tiers.reduce((s, t) => s + t.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Distribusi score</CardTitle>
        <CardDescription>
          {total > 0
            ? `${total.toLocaleString('id-ID')} lead sudah di-score`
            : 'Belum ada lead yang di-score'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-32">
          {tiers.map((t) => {
            const h = total === 0 ? 4 : Math.max(4, (t.count / max) * 100);
            return (
              <div
                key={t.key}
                className="flex-1 flex flex-col items-center justify-end gap-2"
              >
                <span className="text-xs font-semibold tabular-nums">
                  {t.count}
                </span>
                <div
                  className={
                    'w-full rounded-t-md transition-all ' +
                    (t.accent
                      ? 'bg-gradient-to-t from-accent/70 to-accent'
                      : 'bg-muted-fg/25')
                  }
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-3">
          {tiers.map((t) => (
            <div key={t.key} className="flex-1 text-center">
              <div className={'text-xs font-medium ' + (t.accent ? 'text-accent' : 'text-fg')}>
                {t.label}
              </div>
              <div className="text-[10px] text-muted-fg">{t.sub}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Activity rhythm ────────────────────────────────────────────────────────

function ActivityRhythmCard({ stats }: { stats: DashboardStats }) {
  // We don't have per-day breakdown; approximate week distribution by spreading
  // (week_total - today) across the previous 6 days deterministically and placing
  // today's count on the last bar. This is a *visual rhythm*, labeled as such.
  const week = stats.outreach_this_week;
  const today = stats.outreach_today;
  const prior = Math.max(0, week - today);

  // Deterministic spread so it's stable per render (not random).
  const weights = [0.1, 0.18, 0.16, 0.14, 0.2, 0.22];
  const priorBars = weights.map((w) => Math.round(prior * w));
  const bars = [...priorBars, today];
  const max = Math.max(1, ...bars);

  const dayLabels = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d.toLocaleDateString('id-ID', { weekday: 'narrow' }));
    }
    return out;
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Ritme outreach</CardTitle>
          <CardDescription>
            Aktivitas 7 hari terakhir (estimasi visual).
          </CardDescription>
        </div>
        <TrendingUp className="h-4 w-4 text-muted-fg" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Hari ini" value={today} accent />
          <Metric label="Minggu ini" value={week} />
          <Metric label="Reply rate" value={`${stats.reply_rate_30d}%`} subtle="30 hari" />
        </div>

        <div>
          <div className="flex items-end gap-1.5 h-20">
            {bars.map((b, i) => {
              const h = Math.max(4, (b / max) * 100);
              const isToday = i === bars.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                >
                  <div
                    className={
                      'w-full rounded-sm transition-all ' +
                      (isToday
                        ? 'bg-gradient-to-t from-accent/70 to-accent'
                        : 'bg-muted-fg/20')
                    }
                    style={{ height: `${h}%` }}
                    title={`${b} outreach`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1.5 text-[10px] text-muted-fg">
            {dayLabels.map((d, i) => (
              <div
                key={i}
                className={
                  'flex-1 text-center ' +
                  (i === dayLabels.length - 1 ? 'text-accent font-medium' : '')
                }
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  subtle,
  accent,
}: {
  label: string;
  value: number | string;
  subtle?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-fg">{label}</p>
      <p
        className={
          'text-2xl font-semibold tabular-nums tracking-tight ' +
          (accent ? 'text-accent' : '')
        }
      >
        {value}
      </p>
      {subtle && <p className="text-[10px] text-muted-fg">{subtle}</p>}
    </div>
  );
}

// ── Top list (cities / categories) ─────────────────────────────────────────

function TopList({
  title,
  icon,
  items,
  emptyHint,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ key: string; label: string; count: number }>;
  emptyHint: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="text-muted-fg">{icon}</span>
          {title}
        </CardTitle>
        <span className="text-[11px] text-muted-fg">
          {items.length > 0 ? `${items.length} entri` : ''}
        </span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-fg">{emptyHint}</p>
        ) : (
          <ul className="divide-y divide-border -my-2">
            {items.slice(0, 6).map((item) => {
              const pct = (item.count / max) * 100;
              return (
                <li
                  key={item.key}
                  className="group relative py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm truncate">{item.label}</span>
                    <span className="text-sm font-medium tabular-nums shrink-0">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent/60 group-hover:bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-fg mt-1">
          {greeting()}, Aldi. {todayLong()}.
        </p>
      </header>
      <Divider />

      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent"
        />
        <CardContent className="relative p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Pipeline-mu masih kosong
            </h2>
            <p className="text-sm text-muted-fg">
              Install Chrome extension landingklinik dan mulai capture klinik
              gigi dari Google Maps. Begitu lead pertama masuk, dashboard ini
              langsung idup.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link href="/leads">
              <Button variant="outline" size="md">
                <Inbox className="h-4 w-4" />
                Buka leads
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="success" size="md">
                <Zap className="h-4 w-4" />
                Setup extension
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Divider />

      <Skeleton className="h-40 w-full rounded-lg" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-56 w-full rounded-lg lg:col-span-1" />
        <Skeleton className="h-56 w-full rounded-lg lg:col-span-2" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg lg:col-span-2" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
