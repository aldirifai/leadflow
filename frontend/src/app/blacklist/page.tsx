'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BlacklistEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, Badge } from '@/components/ui';
import { formatDate } from '@/lib/helpers';
import { Trash2 } from 'lucide-react';

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [type, setType] = useState<BlacklistEntry['identifier_type']>('phone');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const refresh = async () => setEntries(await api.listBlacklist());

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async () => {
    if (!value.trim()) {
      alert('Value wajib diisi.');
      return;
    }
    try {
      await api.addBlacklist({ identifier_type: type, identifier_value: value, reason: reason || null });
      setValue('');
      setReason('');
      await refresh();
    } catch (e) {
      alert(`Gagal: ${e}`);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Hapus dari blacklist?')) return;
    await api.removeBlacklist(id);
    await refresh();
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Blacklist</h1>
        <p className="text-sm text-muted-fg mt-1">
          Kontak/domain yang gak akan dihubungi. Auto-populated saat ada opt-out reply.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add to blacklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
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
            <div className="col-span-2">
              <Label>Value</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1"
                placeholder={type === 'domain' ? 'example.com' : type === 'email' ? 'user@example.com' : '0812...'}
              />
            </div>
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={handleAdd}>Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blacklist entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-fg">Blacklist kosong.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs text-muted-fg">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Badge className="bg-muted">{e.identifier_type}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.identifier_value}</td>
                    <td className="px-4 py-3 text-muted-fg">{e.reason || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-fg">{formatDate(e.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(e.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
