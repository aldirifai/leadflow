'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MessageTemplate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label, Badge } from '@/components/ui';
import { Trash2 } from 'lucide-react';

const empty = (): Omit<MessageTemplate, 'id' | 'created_at'> => ({
  name: '',
  channel: 'email',
  subject: null,
  body: '',
  is_default: false,
});

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editing, setEditing] = useState<Omit<MessageTemplate, 'id' | 'created_at'> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = async () => setTemplates(await api.listTemplates());

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.body) {
      alert('Name dan body wajib diisi.');
      return;
    }
    if (editingId) {
      await api.updateTemplate(editingId, editing);
    } else {
      await api.createTemplate(editing);
    }
    setEditing(null);
    setEditingId(null);
    await refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus template ini?')) return;
    await api.deleteTemplate(id);
    await refresh();
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-fg mt-1">
            Template referensi untuk LLM saat generate pesan personal.
          </p>
        </div>
        {!editing && (
          <Button onClick={() => { setEditing(empty()); setEditingId(null); }}>
            New template
          </Button>
        )}
      </header>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit template' : 'New template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Channel</Label>
                <Select
                  value={editing.channel}
                  onChange={(e) =>
                    setEditing({ ...editing, channel: e.target.value as MessageTemplate['channel'] })
                  }
                  className="w-full mt-1"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="linkedin">LinkedIn</option>
                </Select>
              </div>
            </div>
            {editing.channel === 'email' && (
              <div>
                <Label>Subject template</Label>
                <Input
                  value={editing.subject || ''}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value || null })}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Body</Label>
              <Textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={10}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-xs text-muted-fg mt-1">
                Tip: pakai placeholder {'{nama_bisnis}'}, {'{kota}'}, {'{kategori}'}, {'{observasi}'},{' '}
                {'{angle_spesifik}'} sebagai panduan untuk LLM.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_default}
                onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
              />
              Default untuk channel {editing.channel}
            </label>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="ghost" onClick={() => { setEditing(null); setEditingId(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-muted">{t.channel}</Badge>
                    {t.is_default && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        default
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing({
                        name: t.name,
                        channel: t.channel,
                        subject: t.subject,
                        body: t.body,
                        is_default: t.is_default,
                      });
                      setEditingId(t.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {t.subject && <p className="text-xs text-muted-fg">Subject: {t.subject}</p>}
              <pre className="text-xs whitespace-pre-wrap text-muted-fg font-mono bg-muted p-2 rounded">
                {t.body}
              </pre>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !editing && (
          <p className="text-sm text-muted-fg">Belum ada template. Klik &quot;New template&quot; di atas.</p>
        )}
      </div>
    </div>
  );
}
