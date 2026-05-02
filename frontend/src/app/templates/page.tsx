'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MessageTemplate } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label, Badge, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Dialog';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';

type TemplateDraft = Omit<MessageTemplate, 'id' | 'created_at'>;

const empty = (): TemplateDraft => ({
  name: '',
  channel: 'email',
  subject: null,
  body: '',
  is_default: false,
});

const CHANNEL_TONE: Record<MessageTemplate['channel'], string> = {
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  whatsapp: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  linkedin: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [editing, setEditing] = useState<TemplateDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const refresh = async () => setTemplates(await api.listTemplates());

  useEffect(() => {
    refresh();
  }, []);

  const startNew = () => {
    setEditing(empty());
    setEditingId(null);
  };

  const startEdit = (t: MessageTemplate) => {
    setEditing({
      name: t.name,
      channel: t.channel,
      subject: t.subject,
      body: t.body,
      is_default: t.is_default,
    });
    setEditingId(t.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.body) {
      toast.danger('Name dan body wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateTemplate(editingId, editing);
        toast.success('Template ter-update.');
      } else {
        await api.createTemplate(editing);
        toast.success('Template baru tersimpan.');
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      toast.danger(`Gagal save: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Hapus template?',
      description: 'Template yang sudah dipakai untuk generate-message sebelumnya tetap tersimpan di outreach log — yang dihapus cuma referensi-nya untuk generate berikutnya.',
      confirmText: 'Hapus',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteTemplate(id);
      toast.success('Template dihapus.');
      await refresh();
    } catch (e) {
      toast.danger(`Gagal hapus: ${e}`);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-fg mt-1">
            Template referensi buat LLM saat generate pesan personal.
          </p>
        </div>
        {!editing && (
          <Button onClick={startNew}>
            <Plus size={14} /> New template
          </Button>
        )}
      </header>

      {/* Edit / create form */}
      {editing && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>{editingId ? 'Edit template' : 'New template'}</CardTitle>
                <CardDescription>
                  {editingId
                    ? 'Update template, lalu save buat ganti yang lama.'
                    : 'Bikin template baru. Pakai placeholder di body buat kasih konteks ke LLM.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="cth: Cold email klinik gigi"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Channel</Label>
                <Select
                  value={editing.channel}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      channel: e.target.value as MessageTemplate['channel'],
                    })
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
                  onChange={(e) =>
                    setEditing({ ...editing, subject: e.target.value || null })
                  }
                  placeholder="cth: Ide buat website {nama_bisnis}"
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
                placeholder="Halo {nama_bisnis}, gue lihat..."
              />
              <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-fg">
                  Tip: pakai placeholder{' '}
                  <code className="font-mono text-[10px] bg-bg/60 px-1 py-0.5 rounded">
                    {'{nama_bisnis}'}
                  </code>
                  ,{' '}
                  <code className="font-mono text-[10px] bg-bg/60 px-1 py-0.5 rounded">
                    {'{kota}'}
                  </code>
                  ,{' '}
                  <code className="font-mono text-[10px] bg-bg/60 px-1 py-0.5 rounded">
                    {'{kategori}'}
                  </code>
                  ,{' '}
                  <code className="font-mono text-[10px] bg-bg/60 px-1 py-0.5 rounded">
                    {'{observasi}'}
                  </code>
                  ,{' '}
                  <code className="font-mono text-[10px] bg-bg/60 px-1 py-0.5 rounded">
                    {'{angle_spesifik}'}
                  </code>{' '}
                  sebagai panduan untuk LLM.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_default}
                onChange={(e) =>
                  setEditing({ ...editing, is_default: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>
                Default untuk channel{' '}
                <span className="font-medium">{editing.channel}</span>
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create template'}
              </Button>
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {templates === null ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : templates.length === 0 && !editing ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText size={28} className="mx-auto text-muted-fg/60" />
              <p className="mt-3 text-sm font-medium">Belum ada template</p>
              <p className="mt-1 text-xs text-muted-fg">
                Klik &quot;New template&quot; di kanan atas buat mulai.
              </p>
            </CardContent>
          </Card>
        ) : (
          templates?.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{t.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <Badge className={CHANNEL_TONE[t.channel]}>{t.channel}</Badge>
                      {t.is_default && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          default
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                      <Pencil size={13} /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                      className="text-danger hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                {t.subject && (
                  <p className="text-xs">
                    <span className="text-muted-fg">Subject: </span>
                    <span className="font-medium">{t.subject}</span>
                  </p>
                )}
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/60 text-fg/90 px-3 py-2.5 rounded-md max-h-40 overflow-y-auto border border-border">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
