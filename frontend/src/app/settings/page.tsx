'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SettingsPage() {
  const [stats, setStats] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  useEffect(() => {
    api.dashboardStats().then((s) => {
      setStats({
        used: s.today_quota_used,
        limit: s.today_quota_limit,
        remaining: s.today_quota_remaining,
      });
    });
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-fg mt-1">
          Konfigurasi tools dan info tentang environment.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Daily quota</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {stats && (
            <>
              <p>
                Used today: <span className="font-medium">{stats.used}</span> /{' '}
                <span className="font-medium">{stats.limit}</span>
              </p>
              <p>
                Remaining: <span className="font-medium">{stats.remaining}</span>
              </p>
              <p className="text-xs text-muted-fg">
                Limit ditentukan via env var <code>DAILY_INGEST_LIMIT</code> di server. Reset otomatis tiap UTC 00:00.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend connection</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-mono text-xs">
            API URL: <code className="text-fg">{apiUrl}</code>
          </p>
          <p className="text-muted-fg text-xs">
            Untuk ubah API URL atau API key, edit <code>.env.local</code> (dev) atau <code>.env</code> (Docker)
            dan rebuild frontend container.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chrome extension setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1 text-muted-fg">
            <li>Buka <code>chrome://extensions</code></li>
            <li>Aktifkan &quot;Developer mode&quot;</li>
            <li>Klik &quot;Load unpacked&quot; → pilih folder <code>extension/</code></li>
            <li>Buka popup extension, isi API URL dan API Key sesuai backend</li>
            <li>Buka <code>google.com/maps</code>, search bisnis, scroll listing</li>
            <li>Klik tombol &quot;Capture&quot; di popup untuk capture batch</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ethical guardrails (built-in)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-fg">
          <ul className="list-disc list-inside space-y-1">
            <li>Daily ingest cap (default 200/hari)</li>
            <li>Tidak ada bulk send — semua outreach manual klik per lead</li>
            <li>Auto opt-out detection: replies dengan kata stop/berhenti otomatis blacklist</li>
            <li>Cooldown 30 hari sebelum recontact (kecuali sudah ada reply)</li>
            <li>Audit log lengkap setiap outreach</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
