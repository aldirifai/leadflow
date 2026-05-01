'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="p-8 text-danger">Error: {error}</div>;
  if (!stats) return <div className="p-8 text-muted-fg">Loading...</div>;

  const quotaPct = (stats.today_quota_used / stats.today_quota_limit) * 100;

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-fg mt-1">Overview pipeline outreach kamu hari ini.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={stats.total_leads} />
        <StatCard label="Score tinggi (70+)" value={stats.by_score_tier.high} accent="emerald" />
        <StatCard label="Outreach hari ini" value={stats.outreach_today} />
        <StatCard label="Reply rate (30d)" value={`${stats.reply_rate_30d}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily ingest quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-fg">
              {stats.today_quota_used} / {stats.today_quota_limit} leads di-ingest hari ini
            </span>
            <span>{stats.today_quota_remaining} sisa</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(quotaPct, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lead status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.by_status).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <Badge className="bg-muted text-fg capitalize">{k}</Badge>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {Object.keys(stats.by_status).length === 0 && (
              <p className="text-sm text-muted-fg">Belum ada leads.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.top_categories.map((c) => (
              <div key={c.category} className="flex justify-between text-sm py-1">
                <span className="truncate max-w-[70%]">{c.category}</span>
                <span className="font-medium">{c.count}</span>
              </div>
            ))}
            {stats.top_categories.length === 0 && (
              <p className="text-sm text-muted-fg">Belum ada data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top kota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.top_cities.map((c) => (
              <div key={c.city} className="flex justify-between text-sm py-1">
                <span>{c.city}</span>
                <span className="font-medium">{c.count}</span>
              </div>
            ))}
            {stats.top_cities.length === 0 && (
              <p className="text-sm text-muted-fg">Belum ada data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outreach minggu ini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.outreach_this_week}</p>
            <p className="text-sm text-muted-fg mt-1">pesan dikirim 7 hari terakhir</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-fg">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${accent === 'emerald' ? 'text-emerald-600' : ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
