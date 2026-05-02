'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { OutreachLog } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/helpers';
import { ArrowRight, Inbox, MessageSquare } from 'lucide-react';

type ChannelFilter = '' | 'email' | 'whatsapp' | 'linkedin' | 'other';
type ReplyFilter = '' | 'yes' | 'no';

const CHANNEL_TONE: Record<OutreachLog['channel'], string> = {
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  whatsapp: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  linkedin: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  other: 'bg-muted text-fg',
};

const CHANNEL_OPTIONS: Array<{ value: ChannelFilter; label: string }> = [
  { value: '', label: 'All channels' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Other' },
];

const REPLY_OPTIONS: Array<{ value: ReplyFilter; label: string }> = [
  { value: '', label: 'All replies' },
  { value: 'yes', label: 'Replied' },
  { value: 'no', label: 'No reply' },
];

export default function OutreachPage() {
  const [logs, setLogs] = useState<OutreachLog[] | null>(null);
  const [channel, setChannel] = useState<ChannelFilter>('');
  const [replied, setReplied] = useState<ReplyFilter>('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const refresh = async () => {
    setLogs(null);
    const params: Record<string, string | boolean> = {};
    if (channel) params.channel = channel;
    if (replied === 'yes') params.replied = true;
    if (replied === 'no') params.replied = false;
    setLogs(await api.listAllOutreach(params));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, replied]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total = logs?.length ?? 0;
  const repliedCount = useMemo(
    () => (logs ? logs.filter((l) => l.replied).length : 0),
    [logs],
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outreach history</h1>
          <p className="text-sm text-muted-fg mt-1">
            Semua pesan yang pernah kamu kirim, di-log otomatis dari halaman lead.
          </p>
        </div>
        {logs && (
          <div className="flex gap-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-fg">Total</div>
              <div className="font-semibold tabular-nums">{total}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-fg">Replied</div>
              <div className="font-semibold tabular-nums text-accent">{repliedCount}</div>
            </div>
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Persempit history berdasarkan channel atau status reply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-fg mb-2">
              Channel
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_OPTIONS.map((opt) => {
                const active = channel === opt.value;
                return (
                  <button
                    key={opt.value || 'all-channel'}
                    onClick={() => setChannel(opt.value)}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-fg'
                        : 'bg-muted text-muted-fg hover:text-fg hover:bg-muted/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-fg mb-2">
              Reply
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REPLY_OPTIONS.map((opt) => {
                const active = replied === opt.value;
                return (
                  <button
                    key={opt.value || 'all-reply'}
                    onClick={() => setReplied(opt.value)}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-fg'
                        : 'bg-muted text-muted-fg hover:text-fg hover:bg-muted/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {logs === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox size={32} className="mx-auto text-muted-fg/60" />
            <p className="mt-3 text-sm font-medium">Belum ada history</p>
            <p className="mt-1 text-xs text-muted-fg">
              Mulai outreach dari halaman lead — log otomatis tersimpan di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expanded.has(log.id);
            return (
              <Card key={log.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={CHANNEL_TONE[log.channel]}>{log.channel}</Badge>
                      {log.replied && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <MessageSquare size={11} className="mr-1" /> Replied
                        </Badge>
                      )}
                      <span className="text-xs text-muted-fg">
                        {formatDateTime(log.sent_at)}
                      </span>
                    </div>
                    <Link
                      href={`/leads/${log.lead_id}`}
                      className="text-xs font-medium text-fg hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      Lead #{log.lead_id} <ArrowRight size={12} />
                    </Link>
                  </div>

                  {log.subject && (
                    <p className="text-sm font-medium">{log.subject}</p>
                  )}

                  <pre
                    className={`text-sm whitespace-pre-wrap text-fg/85 font-sans ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {log.message_sent}
                  </pre>

                  {log.message_sent.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(log.id)}
                      className="-ml-2 h-7 px-2"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </Button>
                  )}

                  {log.replied && log.reply_text && (
                    <div className="border-l-2 border-accent pl-3 mt-2">
                      <p className="text-[11px] text-muted-fg mb-1 uppercase tracking-wide font-medium">
                        Reply{log.reply_at ? ` · ${formatDateTime(log.reply_at)}` : ''}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{log.reply_text}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
