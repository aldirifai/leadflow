'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Lead, LeadListResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Select, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { scoreColor, statusColor, formatDate } from '@/lib/helpers';
import { ExternalLink, Star } from 'lucide-react';

export default function LeadsPage() {
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    min_score: '',
    has_website: '',
    city: '',
    category: '',
    search: '',
    sort: 'score_desc',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page, page_size: 50 };
      if (filters.status) params.status = filters.status;
      if (filters.min_score) params.min_score = Number(filters.min_score);
      if (filters.has_website === 'yes') params.has_website = true;
      if (filters.has_website === 'no') params.has_website = false;
      if (filters.city) params.city = filters.city;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      params.sort = filters.sort;
      const res = await api.listLeads(params);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters.sort]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-fg mt-1">
            {data ? `${data.total} total` : 'Loading...'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (confirm('Re-score semua leads?')) {
              const res = await api.rescoreAll();
              alert(`Rescored ${res.rescored} leads.`);
              fetchData();
            }
          }}
        >
          Re-score all
        </Button>
      </header>

      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            <Input
              placeholder="Cari nama/alamat"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="md:col-span-2"
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Semua status</option>
              <option value="new">New</option>
              <option value="approved">Approved</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="converted">Converted</option>
              <option value="skipped">Skipped</option>
              <option value="dropped">Dropped</option>
            </Select>
            <Select
              value={filters.has_website}
              onChange={(e) => setFilters({ ...filters, has_website: e.target.value })}
            >
              <option value="">Web: any</option>
              <option value="yes">Has website</option>
              <option value="no">No website</option>
            </Select>
            <Input
              placeholder="Min score"
              type="number"
              value={filters.min_score}
              onChange={(e) => setFilters({ ...filters, min_score: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
            <Input
              placeholder="Kota"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
            <Select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="score_desc">Score ↓</option>
              <option value="score_asc">Score ↑</option>
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setPage(1); fetchData(); }}>Apply</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilters({ status: '', min_score: '', has_website: '', city: '', category: '', search: '', sort: 'score_desc' });
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading && <div className="p-6 text-sm text-muted-fg">Loading...</div>}
          {data && (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-fg">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium w-16">Score</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Web</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scraped</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-fg">
                      Tidak ada leads.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {data && data.total > 50 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-fg">
            Page {data.page} of {Math.ceil(data.total / 50)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 50 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <tr className="border-b hover:bg-muted/50 transition">
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.name}
        </Link>
        {lead.address && (
          <div className="text-xs text-muted-fg truncate max-w-md">{lead.address}</div>
        )}
      </td>
      <td className={`px-4 py-3 font-semibold ${scoreColor(lead.score?.fit_score ?? 0)}`}>
        {lead.score?.fit_score ?? '-'}
      </td>
      <td className="px-4 py-3 text-muted-fg truncate max-w-[160px]">{lead.category || '-'}</td>
      <td className="px-4 py-3 text-muted-fg">{lead.city || '-'}</td>
      <td className="px-4 py-3">
        {lead.website ? (
          <a
            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-fg hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> open
          </a>
        ) : (
          <span className="text-xs text-muted-fg">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        {lead.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            {lead.rating} ({lead.review_count})
          </span>
        ) : (
          <span className="text-muted-fg">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-fg">{formatDate(lead.scraped_at)}</td>
    </tr>
  );
}
