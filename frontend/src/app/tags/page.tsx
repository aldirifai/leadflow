'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TagWithCount } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Badge, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';
import { Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';

type TagDraft = {
  name: string;
  color: string | null;
};

const PALETTE: Array<{ name: string; dot: string; ring: string }> = [
  { name: 'emerald', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { name: 'sky', dot: 'bg-sky-500', ring: 'ring-sky-400' },
  { name: 'amber', dot: 'bg-amber-500', ring: 'ring-amber-400' },
  { name: 'red', dot: 'bg-red-500', ring: 'ring-red-400' },
  { name: 'violet', dot: 'bg-violet-500', ring: 'ring-violet-400' },
  { name: 'slate', dot: 'bg-slate-500', ring: 'ring-slate-400' },
  { name: 'neutral', dot: 'bg-neutral-500', ring: 'ring-neutral-400' },
  { name: 'fuchsia', dot: 'bg-fuchsia-500', ring: 'ring-fuchsia-400' },
];

const DOT_BY_NAME: Record<string, string> = PALETTE.reduce<Record<string, string>>(
  (acc, p) => {
    acc[p.name] = p.dot;
    return acc;
  },
  {},
);

const dotClass = (c: string | null) => DOT_BY_NAME[c || 'neutral'] || DOT_BY_NAME.neutral;

const empty = (): TagDraft => ({ name: '', color: 'emerald' });

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[] | null>(null);
  const [editing, setEditing] = useState<TagDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const refresh = async () => setTags(await api.listTags());

  useEffect(() => {
    refresh();
  }, []);

  const startNew = () => {
    setEditing(empty());
    setEditingId(null);
  };

  const startEdit = (t: TagWithCount) => {
    setEditing({ name: t.name, color: t.color });
    setEditingId(t.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.danger('Nama tag wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: editing.name.trim(), color: editing.color };
      if (editingId) {
        await api.updateTag(editingId, payload);
        toast.success('Tag ter-update.');
      } else {
        await api.createTag(payload);
        toast.success('Tag baru tersimpan.');
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      toast.danger(`Gagal save: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TagWithCount) => {
    const ok = await confirm({
      title: `Hapus tag "${t.name}"?`,
      description:
        t.lead_count > 0
          ? `Tag akan ter-detach dari ${t.lead_count} lead. Lead-nya tetap ada — yang dihapus cuma referensi tag-nya.`
          : 'Tag belum dipakai di lead manapun.',
      confirmText: 'Hapus',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteTag(t.id);
      toast.success('Tag dihapus.');
      await refresh();
    } catch (e) {
      toast.danger(`Gagal hapus: ${e}`);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-fg mt-1">
            {tags ? (
              <>
                <span className="font-medium text-fg">{tags.length}</span>{' '}
                tag tersimpan &middot; pakai buat segmentasi lead
              </>
            ) : (
              'Memuat tag...'
            )}
          </p>
        </div>
        {!editing && (
          <Button onClick={startNew}>
            <Plus size={14} /> New tag
          </Button>
        )}
      </header>

      {/* Edit / create form */}
      {editing && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit tag' : 'New tag'}</CardTitle>
            <CardDescription>
              {editingId
                ? 'Update nama atau warna tag.'
                : 'Bikin tag baru. Pilih warna buat bedain visual di list lead.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="cth: hot lead, butuh follow-up"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {PALETTE.map((p) => {
                  const active = editing.color === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: p.name })}
                      aria-label={`Warna ${p.name}`}
                      aria-pressed={active}
                      title={p.name}
                      className={cn(
                        'size-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                        p.dot,
                        active
                          ? `ring-2 ring-offset-2 ring-offset-card ${p.ring} scale-110`
                          : 'opacity-80 hover:opacity-100 hover:scale-105',
                      )}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create tag'}
              </Button>
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {tags === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : tags.length === 0 && !editing ? (
        <Card>
          <CardContent className="py-10 text-center">
            <TagIcon size={28} className="mx-auto text-muted-fg/60" />
            <p className="mt-3 text-sm font-medium">Belum ada tag</p>
            <p className="mt-1 text-xs text-muted-fg max-w-xs mx-auto">
              Klik &quot;New tag&quot; di kanan atas buat bikin tag pertama.
              Tag bisa dipakai segmentasi lead di list view dan filter.
            </p>
          </CardContent>
        </Card>
      ) : tags.length > 0 ? (
        <Card>
          <ul className="divide-y divide-border">
            {tags.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn('size-3 rounded-full shrink-0', dotClass(t.color))}
                    aria-hidden
                  />
                  <span className="font-medium text-sm truncate">{t.name}</span>
                  <Badge className="bg-muted text-muted-fg border-border shrink-0">
                    {t.lead_count} {t.lead_count === 1 ? 'lead' : 'leads'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(t)}
                    aria-label={`Edit ${t.name}`}
                    className="h-8 w-8"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(t)}
                    aria-label={`Hapus ${t.name}`}
                    className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
