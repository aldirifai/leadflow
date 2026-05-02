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

// Best-effort cleanup of a pasted email/WA reply: strips quoted blocks,
// "On X wrote:" / "Pada X menulis:" headers, and common signature markers.
// Heuristic — may over-strip on adversarial input.
export function cleanReplyText(raw: string): string {
  if (!raw) return '';
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  const quoteHeader = [
    /^On\s+.+wrote:?\s*$/i,
    /^Pada\s+.+menulis:?\s*$/i,
    /^From:\s+/i,
    /^Dari:\s+/i,
    /^-{2,}\s*(Original Message|Forwarded message|Pesan asli|Pesan yang diteruskan)\s*-{2,}\s*$/i,
    /^_{4,}$/,
  ];
  const signatureDelim = [
    /^--\s*$/,
    /^—\s*$/,
    /^Sent from my\s+.+/i,
    /^Dikirim dari\s+.+/i,
    /^Get Outlook for\s+/i,
  ];

  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (quoteHeader.some((re) => re.test(t))) break;
    if (signatureDelim.some((re) => re.test(t))) break;
    if (/^>+(\s|$)/.test(t)) continue;
    out.push(line);
  }

  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();

  return out.join('\n');
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
