'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BlacklistEntry } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, Badge, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/helpers';
import { ShieldOff, Trash2, Plus } from 'lucide-react';

const TYPE_PLACEHOLDER: Record<BlacklistEntry['identifier_type'], string> = {
  phone: '0812...',
  whatsapp: '628xx...',
  email: 'user@example.com',
  domain: 'example.com',
  place_id: 'ChIJ...',
};

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[] | null>(null);
  const [type, setType] = useState<BlacklistEntry['identifier_type']>('phone');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => setEntries(await api.listBlacklist());

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async () => {
    if (!value.trim()) {
      alert('Value wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await api.addBlacklist({
        identifier_type: type,
        identifier_value: value,
        reason: reason || null,
      });
      setValue('');
      setReason('');
      await refresh();
    } catch (e) {
      alert(`Gagal: ${e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Hapus dari blacklist?')) return;
    await api.removeBlacklist(id);
    await refresh();
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Blacklist</h1>
        <p className="text-sm text-muted-fg mt-1">
          Kontak/domain yang gak akan dihubungi. Auto-populated kalau ada opt-out reply.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldOff size={14} className="text-muted-fg" />
            <CardTitle>Tambah ke blacklist</CardTitle>
          </div>
          <CardDescription>Sekali masuk, lead dengan identifier ini gak akan bisa di-outreach lagi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] items-end">
            <div>
              <Label>Type</Label>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as BlacklistEntry['identifier_type'])}
                className="w-full mt-1"
              >
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="domain">Domain</option>
                <option value="place_id">Place ID</option>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 font-mono text-xs"
                placeholder={TYPE_PLACEHOLDER[type]}
              />
            </div>
            <Button onClick={handleAdd} disabled={submitting} size="md">
              <Plus size={14} /> {submitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              placeholder="cth: opt-out via WA, kompetitor, dll"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Entries{entries ? ` (${entries.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries === null ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldOff size={28} className="mx-auto text-muted-fg/60" />
              <p className="mt-3 text-sm font-medium">Blacklist masih kosong</p>
              <p className="mt-1 text-xs text-muted-fg">
                Tambah manual lewat form di atas, atau tunggu auto-populated dari opt-out reply.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted-fg">
                  <tr className="text-left border-b border-border">
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Value</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Added</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Badge className="bg-muted text-fg">{e.identifier_type}</Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs break-all">
                        {e.identifier_value}
                      </td>
                      <td className="px-5 py-3 text-muted-fg">{e.reason || '-'}</td>
                      <td className="px-5 py-3 text-xs text-muted-fg whitespace-nowrap">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(e.id)}
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                          aria-label={`Remove ${e.identifier_value}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
