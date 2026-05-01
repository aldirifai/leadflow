'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { OutreachLog } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Select, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/helpers';

export default function OutreachPage() {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [channel, setChannel] = useState('');
  const [replied, setReplied] = useState('');

  const refresh = async () => {
    const params: Record<string, string | boolean> = {};
    if (channel) params.channel = channel;
    if (replied === 'yes') params.replied = true;
    if (replied === 'no') params.replied = false;
    setLogs(await api.listAllOutreach(params));
  };

  useEffect(() => {
    refresh();
  }, [channel, replied]);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Outreach history</h1>
        <p className="text-sm text-muted-fg mt-1">Semua pesan yang pernah kamu kirim.</p>
      </header>

      <div className="flex gap-3">
        <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="linkedin">LinkedIn</option>
          <option value="other">Other</option>
        </Select>
        <Select value={replied} onChange={(e) => setReplied(e.target.value)}>
          <option value="">All replies</option>
          <option value="yes">Replied</option>
          <option value="no">No reply</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-fg">Belum ada history.</p>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-muted">{log.channel}</Badge>
                      {log.replied && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          Replied
                        </Badge>
                      )}
                      <span className="text-xs text-muted-fg">{formatDateTime(log.sent_at)}</span>
                    </div>
                    <Link
                      href={`/leads/${log.lead_id}`}
                      className="text-xs text-fg hover:underline"
                    >
                      Lead #{log.lead_id} →
                    </Link>
                  </div>
                  {log.subject && <p className="text-sm font-medium mb-1">{log.subject}</p>}
                  <p className="text-sm text-muted-fg whitespace-pre-wrap line-clamp-3">
                    {log.message_sent}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
