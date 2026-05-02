export function buildGmailCompose(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: 'cm', to: email });
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildLinkedInProfile(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://linkedin.com/in/${url}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-muted-fg';
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    replied: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    skipped: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dropped: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  };
  return map[status] || map.new;
}
