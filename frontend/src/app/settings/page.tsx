'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui';
import {
  Activity,
  CheckCircle2,
  Plug,
  Puzzle,
  ShieldCheck,
} from 'lucide-react';

interface QuotaStats {
  used: number;
  limit: number;
  remaining: number;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .dashboardStats()
      .then((s) => {
        if (!alive) return;
        setStats({
          used: s.today_quota_used,
          limit: s.today_quota_limit,
          remaining: s.today_quota_remaining,
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

  const quotaPct = stats && stats.limit > 0 ? Math.min(100, (stats.used / stats.limit) * 100) : 0;
  const quotaTone =
    quotaPct >= 90 ? 'bg-danger' : quotaPct >= 60 ? 'bg-warning' : 'bg-accent';

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-fg mt-1">
          Konfigurasi tools dan info tentang environment.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily quota */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-muted-fg" />
              <CardTitle>Daily quota</CardTitle>
            </div>
            <CardDescription>Reset otomatis tiap UTC 00:00.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {loading || !stats ? (
              <>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{stats.used}</span>
                  <span className="text-muted-fg">/ {stats.limit} hari ini</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${quotaTone} transition-all`}
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-fg">
                  Sisa kuota:{' '}
                  <span className="font-medium text-fg">{stats.remaining}</span> lead. Limit
                  ditentukan via env <code className="font-mono text-[11px]">DAILY_INGEST_LIMIT</code>{' '}
                  di server.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Backend connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug size={14} className="text-muted-fg" />
              <CardTitle>Backend connection</CardTitle>
            </div>
            <CardDescription>Endpoint yang dipakai frontend ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-fg mb-1">
                API URL
              </div>
              <code className="block font-mono text-xs bg-muted px-3 py-2 rounded-md break-all">
                {apiUrl}
              </code>
            </div>
            <p className="text-xs text-muted-fg">
              Untuk ubah API URL atau API key, edit{' '}
              <code className="font-mono text-[11px]">.env.local</code> (dev) atau{' '}
              <code className="font-mono text-[11px]">.env</code> (Docker), terus rebuild frontend
              container.
            </p>
          </CardContent>
        </Card>

        {/* Chrome extension setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Puzzle size={14} className="text-muted-fg" />
              <CardTitle>Chrome extension setup</CardTitle>
            </div>
            <CardDescription>Capture lead langsung dari Google Maps.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5 text-sm">
              {[
                <>
                  Buka <code className="font-mono text-[11px]">chrome://extensions</code>
                </>,
                <>Aktifkan &quot;Developer mode&quot;</>,
                <>
                  Klik &quot;Load unpacked&quot; → pilih folder{' '}
                  <code className="font-mono text-[11px]">extension/</code>
                </>,
                <>Buka popup extension, isi API URL dan API Key sesuai backend</>,
                <>
                  Buka <code className="font-mono text-[11px]">google.com/maps</code>, search
                  bisnis, scroll listing
                </>,
                <>Klik tombol &quot;Capture&quot; di popup buat capture batch</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-muted text-muted-fg text-[11px] font-medium inline-flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-fg/90">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Ethical guardrails */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-muted-fg" />
              <CardTitle>Ethical guardrails</CardTitle>
            </div>
            <CardDescription>Sudah di-built-in, gak bisa di-bypass.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                'Daily ingest cap (default 200/hari)',
                'Tidak ada bulk send — semua outreach manual klik per lead',
                'Auto opt-out: replies dengan kata stop/berhenti otomatis blacklist',
                'Cooldown 30 hari sebelum recontact (kecuali sudah ada reply)',
                'Audit log lengkap setiap outreach',
              ].map((item) => (
                <li key={item} className="flex gap-2 items-start">
                  <CheckCircle2
                    size={14}
                    className="flex-shrink-0 mt-0.5 text-accent"
                  />
                  <span className="text-fg/90">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
