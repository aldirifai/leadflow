'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Lead, LeadListResponse, LeadStatus } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/Card';
import { Badge, Input, Select, Skeleton, Divider, Label } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { statusColor, formatDate } from '@/lib/helpers';
import {
  Search,
  ExternalLink,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sliders,
  Settings2,
  Globe,
  X,
} from 'lucide-react';

type SortValue = 'score_desc' | 'score_asc' | 'recent' | 'oldest' | 'name';

type Filters = {
  status: '' | LeadStatus;
  min_score: string;
  has_website: '' | 'yes' | 'no';
  city: string;
  category: string;
  search: string;
  sort: SortValue;
};

const DEFAULT_FILTERS: Filters = {
  status: '',
  min_score: '',
  has_website: '',
  city: '',
  category: '',
  search: '',
  sort: 'score_desc',
};

const PAGE_SIZE = 50;

const STATUS_TABS: Array<{ value: '' | LeadStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'new', label: 'New' },
  { value: 'approved', label: 'Approved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'converted', label: 'Converted' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'dropped', label: 'Dropped' },
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: 'score_desc', label: 'Score tertinggi' },
  { value: 'score_asc', label: 'Score terendah' },
  { value: 'recent', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'name', label: 'Nama (A-Z)' },
];

export default function LeadsPage() {
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const fetchData = async (overrides?: Partial<Filters> & { page?: number }) => {
    const f = { ...filters, ...overrides };
    const p = overrides?.page ?? page;
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: p,
        page_size: PAGE_SIZE,
      };
      if (f.status) params.status = f.status;
      if (f.min_score) params.min_score = Number(f.min_score);
      if (f.has_website === 'yes') params.has_website = true;
      if (f.has_website === 'no') params.has_website = false;
      if (f.city) params.city = f.city;
      if (f.category) params.category = f.category;
      if (f.search) params.search = f.search;
      params.sort = f.sort;
      const res = await api.listLeads(params);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.sort, filters.status]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.status) n++;
    if (filters.min_score) n++;
    if (filters.has_website) n++;
    if (filters.city) n++;
    if (filters.category) n++;
    if (filters.search) n++;
    return n;
  }, [filters]);

  const tierCounts = useMemo(() => {
    if (!data) return { high: 0, med: 0, low: 0 };
    const counts = { high: 0, med: 0, low: 0 };
    for (const l of data.items) {
      const s = l.score?.fit_score ?? 0;
      if (s >= 70) counts.high++;
      else if (s >= 40) counts.med++;
      else counts.low++;
    }
    return counts;
  }, [data]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const rangeStart = data && data.items.length > 0 ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  const onApply = () => {
    setPage(1);
    fetchData({ page: 1 });
  };

  const onReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setShowMoreFilters(false);
    fetchData({ ...DEFAULT_FILTERS, page: 1 });
  };

  const handleRescore = async () => {
    if (!confirm('Re-score semua leads? Ini akan menghitung ulang fit score.')) return;
    setRescoring(true);
    try {
      const res = await api.rescoreAll();
      alert(`Selesai. ${res.rescored} leads di-rescore.`);
      fetchData();
    } finally {
      setRescoring(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-fg mt-1">
            {data ? (
              <>
                <span className="font-medium text-fg">{data.total.toLocaleString('id-ID')}</span>{' '}
                klinik tersaring &middot; review &amp; approve untuk outreach
              </>
            ) : (
              'Memuat lead pipeline...'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-xs text-muted-fg hover:text-fg inline-flex items-center gap-1.5 px-2 h-8"
          >
            <Settings2 size={14} />
            Setup extension
          </Link>
          <Button variant="subtle" size="sm" onClick={handleRescore} disabled={rescoring}>
            <RotateCcw size={14} className={rescoring ? 'animate-spin' : ''} />
            {rescoring ? 'Menghitung...' : 'Re-score all'}
          </Button>
        </div>
      </header>

      {/* Filter strip */}
      <Card>
        <CardContent className="space-y-4">
          {/* Search + status tabs */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
              />
              <Input
                placeholder="Cari nama, alamat, atau kota..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onApply();
                }}
                className="pl-9"
              />
            </div>

            <Tabs
              value={filters.status}
              onChange={(v) => {
                setFilters({ ...filters, status: v as Filters['status'] });
                setPage(1);
              }}
            >
              <TabsList className="flex-wrap">
                {STATUS_TABS.map((t) => (
                  <TabsTrigger key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Inline secondary filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showMoreFilters ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => setShowMoreFilters((s) => !s)}
            >
              <Sliders size={14} />
              {showMoreFilters ? 'Sembunyikan filter' : 'More filters'}
            </Button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Label htmlFor="sort" className="hidden sm:block">
                Urut
              </Label>
              <Select
                id="sort"
                value={filters.sort}
                onChange={(e) =>
                  setFilters({ ...filters, sort: e.target.value as SortValue })
                }
                className="h-8 text-xs w-[160px]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <>
                <Badge className="bg-accent/15 text-accent border-accent/20">
                  {activeFilterCount} filter aktif
                </Badge>
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <X size={14} />
                  Reset
                </Button>
              </>
            )}
          </div>

          {showMoreFilters && (
            <>
              <Divider />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="min_score">Min score</Label>
                  <Input
                    id="min_score"
                    placeholder="contoh: 70"
                    type="number"
                    value={filters.min_score}
                    onChange={(e) =>
                      setFilters({ ...filters, min_score: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onApply();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has_website">Website</Label>
                  <Select
                    id="has_website"
                    value={filters.has_website}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        has_website: e.target.value as Filters['has_website'],
                      })
                    }
                  >
                    <option value="">Semua</option>
                    <option value="yes">Punya website</option>
                    <option value="no">Tanpa website</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    placeholder="Jakarta, Bandung, ..."
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onApply();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Kategori</Label>
                  <Input
                    id="category"
                    placeholder="dental, klinik gigi, ..."
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onApply();
                    }}
                  />
                </div>
              </div>
              <div>
                <Button size="sm" onClick={onApply}>
                  Terapkan filter
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      {data && data.items.length > 0 && (
        <div className="flex items-center gap-2 text-xs flex-wrap px-1">
          <span className="text-muted-fg">Halaman ini:</span>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <span className="font-semibold">{tierCounts.high}</span>
            <span className="ml-1 opacity-80">High &ge;70</span>
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            <span className="font-semibold">{tierCounts.med}</span>
            <span className="ml-1 opacity-80">Med 40-69</span>
          </Badge>
          <Badge className="bg-muted text-muted-fg border-border">
            <span className="font-semibold">{tierCounts.low}</span>
            <span className="ml-1 opacity-80">Low &lt;40</span>
          </Badge>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-fg">
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border w-[28%]">
                  Klinik
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border w-[80px]">
                  Score
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Kategori
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Kota
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Web
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Rating
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Status
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 py-3 font-medium border-b border-border">
                  Scraped
                </th>
                <th className="sticky top-0 z-10 bg-card/95 backdrop-blur px-2 py-3 font-medium border-b border-border w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {loading && !data && <SkeletonRows />}
              {data &&
                data.items.map((lead, i) => (
                  <LeadRow key={lead.id} lead={lead} index={i} />
                ))}
              {data && data.items.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState hasFilters={activeFilterCount > 0} onReset={onReset} />
                  </td>
                </tr>
              )}
              {loading && data && (
                <tr>
                  <td colSpan={9} className="p-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-fg">
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-border border-t-fg animate-spin" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination footer */}
        {data && data.total > 0 && (
          <CardFooter className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-muted-fg">
              <span className="font-medium text-fg">
                {rangeStart.toLocaleString('id-ID')}-{rangeEnd.toLocaleString('id-ID')}
              </span>{' '}
              dari{' '}
              <span className="font-medium text-fg">{data.total.toLocaleString('id-ID')}</span>{' '}
              leads
            </div>
            <Pagination
              page={data.page}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function LeadRow({ lead, index }: { lead: Lead; index: number }) {
  const score = lead.score?.fit_score ?? 0;
  const isHigh = score >= 70;
  const stripe = index % 2 === 1 ? 'dark:bg-bg/30' : '';

  return (
    <tr className={`group border-b border-border hover:bg-muted/40 transition-colors ${stripe}`}>
      {/* Name + address with left accent */}
      <td className="px-4 py-3 align-top relative">
        <span
          aria-hidden
          className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-colors ${
            isHigh ? 'bg-emerald-500' : 'bg-transparent'
          }`}
        />
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-fg hover:text-primary transition-colors line-clamp-1"
        >
          {lead.name}
        </Link>
        {lead.address && (
          <div className="text-xs text-muted-fg truncate max-w-[360px] mt-0.5">
            {lead.address}
          </div>
        )}
      </td>

      {/* Score chip */}
      <td className="px-4 py-3 align-top">
        {lead.score ? (
          <span
            className={`inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-md text-xs font-semibold tabular-nums border ${scoreChipClass(
              score,
            )}`}
            title={lead.score.reasons?.join(' · ') || undefined}
          >
            {score}
          </span>
        ) : (
          <span className="text-xs text-muted-fg">-</span>
        )}
      </td>

      {/* Category badge */}
      <td className="px-4 py-3 align-top">
        {lead.category ? (
          <Badge className="bg-muted text-muted-fg border-border max-w-[160px] truncate">
            {lead.category}
          </Badge>
        ) : (
          <span className="text-xs text-muted-fg">-</span>
        )}
      </td>

      {/* City */}
      <td className="px-4 py-3 align-top text-muted-fg text-xs">
        {lead.city || '-'}
      </td>

      {/* Website */}
      <td className="px-4 py-3 align-top">
        {lead.website ? <WebsiteCell website={lead.website} /> : (
          <span className="text-xs text-muted-fg">-</span>
        )}
      </td>

      {/* Rating */}
      <td className="px-4 py-3 align-top text-xs">
        {lead.rating ? (
          <span className="inline-flex items-center gap-1 text-fg">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span className="tabular-nums">{lead.rating.toFixed(1)}</span>
            <span className="text-muted-fg">&middot; {lead.review_count}</span>
          </span>
        ) : (
          <span className="text-muted-fg">-</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 align-top">
        <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
      </td>

      {/* Scraped date */}
      <td className="px-4 py-3 align-top text-xs text-muted-fg whitespace-nowrap">
        {formatDate(lead.scraped_at)}
      </td>

      {/* Quick actions (revealed on hover) */}
      <td className="px-2 py-3 align-top">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/leads/${lead.id}`} aria-label="Buka detail">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Eye size={14} />
            </Button>
          </Link>
          {lead.website && (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Buka website"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink size={14} />
              </Button>
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

function WebsiteCell({ website }: { website: string }) {
  const url = website.startsWith('http') ? website : `https://${website}`;
  let host = website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (host.length > 24) host = host.slice(0, 22) + '…';
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-xs text-fg hover:text-primary transition-colors max-w-[180px]"
    >
      <Globe size={12} className="text-muted-fg shrink-0" />
      <span className="truncate">{host}</span>
    </a>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 mt-2" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-7 w-10" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-2 py-3">
            <Skeleton className="h-7 w-12" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <Card className="m-6 border-dashed bg-bg/30 shadow-none">
      <CardHeader className="border-b-0 text-center pt-8">
        <CardTitle className="text-base">
          {hasFilters ? 'Tidak ada yang cocok' : 'Belum ada leads'}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? 'Coba longgarkan filter atau reset untuk lihat semua.'
            : 'Install extension dan capture beberapa klinik dari Google Maps.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-2 pb-8">
        {hasFilters ? (
          <Button variant="outline" size="sm" onClick={onReset}>
            <X size={14} /> Reset filter
          </Button>
        ) : (
          <Link href="/settings">
            <Button variant="default" size="sm">
              <Settings2 size={14} /> Setup extension
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  const showJump = totalPages > 5;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={14} /> Prev
      </Button>

      {showJump ? (
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`g-${idx}`} className="px-1.5 text-xs text-muted-fg">
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`h-8 min-w-[32px] px-2 rounded-md text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-primary text-primary-fg'
                    : 'text-muted-fg hover:text-fg hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-fg px-2 tabular-nums">
          Halaman <span className="text-fg font-medium">{page}</span> / {totalPages}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Halaman berikutnya"
      >
        Next <ChevronRight size={14} />
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function scoreChipClass(score: number): string {
  if (score >= 70) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  }
  if (score >= 40) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  }
  return 'bg-muted text-muted-fg border-border';
}

function buildPageList(current: number, total: number): Array<number | '...'> {
  // Compact pagination: 1 ... c-1 c c+1 ... total
  const out: Array<number | '...'> = [];
  const window = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(window)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    const next = sorted[i + 1];
    if (next !== undefined && next - sorted[i] > 1) {
      out.push('...');
    }
  }
  return out;
}
