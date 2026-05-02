'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { OutreachAnalytics } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Clock,
  Inbox,
  MessageSquare,
  Send,
  TrendingUp,
} from 'lucide-react';

const RANGE_OPTIONS: Array<{ value: string; label: string; days: number }> = [
  { value: '7', label: '7 hari', days: 7 },
  { value: '30', label: '30 hari', days: 30 },
  { value: '90', label: '90 hari', days: 90 },
  { value: '365', label: '1 tahun', days: 365 },
];

const DOW_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const CHANNEL_LABEL: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  other: 'Lainnya',
};

function formatReplyTime(hours: number | null): string {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return '<1 jam';
  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} jam`;
  }
  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours - days * 24);
  if (remainder === 0) return `${days} hari`;
  return `${days} hari ${remainder} jam`;
}

function replyRateTone(rate: number): string {
  if (rate >= 10) return 'text-accent';
  if (rate >= 5) return 'text-warning';
  return 'text-muted-fg';
}

function formatRate(rate: number): string {
  return `${(Math.round(rate * 10) / 10).toFixed(1)}%`;
}

interface StatTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
  hint?: string;
}

function StatTile({ label, value, icon, valueClassName, hint }: StatTileProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
            {label}
          </span>
          <span className="text-muted-fg/70">{icon}</span>
        </div>
        <div className={cn('mt-2 text-2xl font-semibold tabular-nums', valueClassName)}>
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-fg">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function OutreachAnalyticsPage() {
  const [range, setRange] = useState<string>('90');
  const [data, setData] = useState<OutreachAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const days = Number(range);
    setLoading(true);
    api
      .outreachAnalytics(days)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const isEmpty = !loading && data && data.total_sent === 0;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/outreach"
            className="inline-flex items-center gap-1 text-xs text-muted-fg hover:text-fg transition-colors mb-2"
          >
            <ArrowLeft size={12} /> Kembali ke Outreach
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Outreach Analytics</h1>
          <p className="text-sm text-muted-fg mt-1">
            Insight performance dari outreach kamu.
          </p>
        </div>
        <Tabs value={range} onChange={setRange}>
          <TabsList>
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {loading || !data ? (
        <LoadingState />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <Analytics data={data} />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Inbox size={36} className="mx-auto text-muted-fg/60" />
        <p className="mt-4 text-sm font-medium">
          Belum ada outreach yang ter-log.
        </p>
        <p className="mt-1 text-xs text-muted-fg">
          Mulai dari halaman lead detail — log otomatis tersimpan dan akan muncul di sini.
        </p>
        <Link
          href="/leads"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:text-primary transition-colors"
        >
          Buka Leads <ArrowRight size={14} />
        </Link>
      </CardContent>
    </Card>
  );
}

function Analytics({ data }: { data: OutreachAnalytics }) {
  return (
    <div className="space-y-6">
      <StatRow data={data} />
      <ByChannelCard data={data} />
      <ByHourCard data={data} />
      <ByDowCard data={data} />
    </div>
  );
}

function StatRow({ data }: { data: OutreachAnalytics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        label="Total kirim"
        value={data.total_sent.toLocaleString('id-ID')}
        icon={<Send size={14} />}
      />
      <StatTile
        label="Total balasan"
        value={data.total_replied.toLocaleString('id-ID')}
        icon={<MessageSquare size={14} />}
      />
      <StatTile
        label="Persentase balasan"
        value={formatRate(data.reply_rate)}
        icon={<TrendingUp size={14} />}
        valueClassName={replyRateTone(data.reply_rate)}
      />
      <StatTile
        label="Rata-rata waktu balas"
        value={formatReplyTime(data.avg_reply_hours)}
        icon={<Clock size={14} />}
        hint={data.avg_reply_hours === null ? 'Belum ada balasan' : undefined}
      />
    </div>
  );
}

function ByChannelCard({ data }: { data: OutreachAnalytics }) {
  const channels = data.by_channel;
  const maxRate = Math.max(...channels.map((c) => c.reply_rate), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per channel</CardTitle>
        <CardDescription>
          Bandingkan performa reply rate antar channel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <p className="text-xs text-muted-fg">Belum ada data per channel.</p>
        ) : (
          <div className="space-y-4">
            {channels.map((row) => {
              const widthPct = Math.max((row.reply_rate / maxRate) * 100, row.reply_rate > 0 ? 4 : 0);
              return (
                <div key={row.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
                    <span className="font-medium">
                      {CHANNEL_LABEL[row.channel] ?? row.channel}
                    </span>
                    <div className="flex items-center gap-4 text-xs tabular-nums">
                      <span className="text-muted-fg">
                        Kirim <span className="text-fg font-medium">{row.sent}</span>
                      </span>
                      <span className="text-muted-fg">
                        Balas <span className="text-fg font-medium">{row.replied}</span>
                      </span>
                      <span className={cn('font-semibold', replyRateTone(row.reply_rate))}>
                        {formatRate(row.reply_rate)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ByHourCard({ data }: { data: OutreachAnalytics }) {
  const hours = data.by_hour ?? [];
  const max = Math.max(...hours, 1);
  const peak = hours.reduce(
    (acc, val, idx) => (val > acc.val ? { val, idx } : acc),
    { val: -1, idx: 0 },
  );
  const total = hours.reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per jam (UTC)</CardTitle>
        <CardDescription>
          Sebaran jam kirim dalam zona UTC. Tambah 7 jam untuk WIB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-xs text-muted-fg">Belum ada data per jam.</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-1 h-40">
              {hours.map((count, hour) => {
                const heightPct = (count / max) * 100;
                const isPeak = hour === peak.idx && count > 0;
                return (
                  <div
                    key={hour}
                    className="group flex-1 flex flex-col items-center gap-1 min-w-0"
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={cn(
                          'w-full rounded-t-sm transition-colors',
                          isPeak ? 'bg-accent' : 'bg-muted group-hover:bg-muted-fg/40',
                        )}
                        style={{ height: count > 0 ? `${Math.max(heightPct, 4)}%` : '2px' }}
                        title={`${hour}:00 UTC — ${count}`}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[9px] tabular-nums leading-none',
                        isPeak ? 'text-accent font-semibold' : 'text-muted-fg',
                      )}
                    >
                      {hour}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-fg">
              <span>Peak: jam {peak.idx}:00 UTC ({peak.val} kirim)</span>
              <span>Berdasarkan UTC. Tambah 7 jam untuk WIB.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ByDowCard({ data }: { data: OutreachAnalytics }) {
  const rows = DOW_LABELS.map((label, dow) => {
    const found = data.by_dow.find((d) => d.dow === dow);
    const sent = found?.sent ?? 0;
    const replied = found?.replied ?? 0;
    const rate = sent > 0 ? (replied / sent) * 100 : 0;
    return { dow, label, sent, replied, rate };
  });

  const maxSent = Math.max(...rows.map((r) => r.sent), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per hari</CardTitle>
        <CardDescription>
          Volume kirim dan balasan per hari dalam seminggu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => {
            const sentPct = (row.sent / maxSent) * 100;
            const repliedPct = (row.replied / maxSent) * 100;
            return (
              <div key={row.dow} className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
                <span className="text-xs font-medium text-muted-fg">{row.label}</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full transition-all"
                        style={{ width: row.sent > 0 ? `${Math.max(sentPct, 2)}%` : '0%' }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px] tabular-nums text-muted-fg">
                      {row.sent}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: row.replied > 0 ? `${Math.max(repliedPct, 2)}%` : '0%' }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px] tabular-nums text-muted-fg">
                      {row.replied}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums w-14 text-right',
                    replyRateTone(row.rate),
                  )}
                >
                  {row.sent > 0 ? formatRate(row.rate) : '—'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-fg">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent/70" /> Kirim
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-success" /> Balas
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <BarChart3 size={11} /> Reply rate per hari
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
