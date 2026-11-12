import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { AppNavLink } from '../../components/navigation/AppNavLink';
import { DonationStatusBadge } from '../../components/donate/DonationStatusBadge';
import {
  errorMessage,
  fetchMyDonations,
  formatDate,
  formatMoney,
  STATUS_LABEL,
  type Donation,
  type DonationListMeta,
  type DonationStatus,
} from '../../lib/donationApi';

const PAGE_SIZE = 10;
const STATUSES = Object.keys(STATUS_LABEL) as DonationStatus[];

interface SummaryView {
  total: string;
  approved: string;
  pending: string;
  amount: string;
}

/** Prefer server summary; otherwise derive from the user's most recent 100 donations. */
async function loadSummary(): Promise<SummaryView> {
  const r = await fetchMyDonations({ limit: 100 });
  if (r.summary) {
    return {
      total: r.summary.totalCount != null ? String(r.summary.totalCount) : '—',
      approved: r.summary.approvedCount != null ? String(r.summary.approvedCount) : '—',
      pending: r.summary.pendingCount != null ? String(r.summary.pendingCount) : '—',
      amount: r.summary.approvedAmount != null ? formatMoney(r.summary.approvedAmount, r.summary.currency) : '—',
    };
  }
  const approved = r.items.filter((d) => d.status === 'APPROVED');
  const byCur = new Map<string, number>();
  approved.forEach((d) => byCur.set(d.currency, (byCur.get(d.currency) || 0) + d.amount));
  const more = r.meta.total > r.items.length;
  const suffix = more ? '+' : '';
  return {
    total: `${r.meta.total}`,
    approved: `${approved.length}${suffix}`,
    pending: `${r.items.filter((d) => d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW').length}${suffix}`,
    amount: byCur.size ? Array.from(byCur).map(([c, v]) => formatMoney(v, c)).join(' + ') + suffix : '—',
  };
}

export function DonationHistoryPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ status: '', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Donation[]>([]);
  const [meta, setMeta] = useState<DonationListMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryView | null>(null);

  useEffect(() => {
    let alive = true;
    loadSummary().then((s) => alive && setSummary(s)).catch(() => alive && setSummary(null));
    return () => { alive = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMyDonations({ ...applied, page, limit: PAGE_SIZE });
      setItems(r.items);
      setMeta(r.meta);
    } catch (e) {
      setError(errorMessage(e, 'Could not load your donations'));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { void load(); }, [load]);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied({ status, q: q.trim(), from, to });
  };
  const reset = () => {
    setStatus(''); setQ(''); setFrom(''); setTo('');
    setPage(1);
    setApplied({ status: '', q: '', from: '', to: '' });
  };

  const cards = [
    { label: 'Total donations', value: summary?.total },
    { label: 'Approved', value: summary?.approved },
    { label: 'Pending review', value: summary?.pending },
    { label: 'Approved amount', value: summary?.amount },
  ];

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-[2400px] items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-6 2xl:px-10">
          <AppNavLink
            to="/donate"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Back to donate"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </AppNavLink>
          <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-foreground sm:text-lg">My donations</h1>
          <AppNavLink to="/donate" className="rounded-lg px-2.5 py-2 text-body-sm font-semibold text-primary hover:bg-primary/10">
            Donate
          </AppNavLink>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[2400px] flex-1 px-3 pb-24 pt-4 sm:px-5 lg:px-6 2xl:px-10 md:pb-12">

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} padding="md">
            <p className="text-caption text-muted-foreground">{c.label}</p>
            {summary ? <p className="mt-1 truncate text-title font-bold text-foreground">{c.value ?? '—'}</p> : <Skeleton className="mt-2 h-6 w-20" />}
          </Card>
        ))}
      </div>

      <form onSubmit={apply} className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-gutter sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <Input label="Search" placeholder="Tracking ID or reference" leftIcon={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dh-status" className="text-body-sm font-semibold text-foreground">Status</label>
          <select id="dh-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-control-md rounded-sm border border-input bg-card px-3 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </form>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : error ? (
          <Card className="text-center"><p role="alert" className="text-body-sm text-destructive">{error}</p><Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button></Card>
        ) : items.length === 0 ? (
          <Card className="text-center">
            <p className="text-body-sm text-muted-foreground">No donations found.</p>
            <AppNavLink to="/donate" className="mt-3 inline-block text-body-sm font-semibold text-primary hover:underline">Make a donation</AppNavLink>
          </Card>
        ) : (
          <>
            {/* Table ≥ md */}
            <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-border bg-muted/50 text-caption uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tracking ID</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{d.publicReference}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(d.submittedAt || d.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.methodName || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMoney(d.amount, d.currency)}</td>
                      <td className="px-4 py-3"><DonationStatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <AppNavLink to={`/donate/history/${encodeURIComponent(d.id)}`} className="font-semibold text-primary hover:underline">View</AppNavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards < md */}
            <ul className="space-y-3 md:hidden">
              {items.map((d) => (
                <li key={d.id}>
                  <AppNavLink to={`/donate/history/${encodeURIComponent(d.id)}`} className="block rounded-lg border border-border bg-card p-gutter">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-body-sm font-semibold text-foreground">{d.publicReference}</span>
                      <DonationStatusBadge status={d.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-body-sm">
                      <span className="text-muted-foreground">{formatDate(d.submittedAt || d.createdAt)} · {d.methodName || '—'}</span>
                      <span className="font-semibold text-foreground">{formatMoney(d.amount, d.currency)}</span>
                    </div>
                  </AppNavLink>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between text-body-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default DonationHistoryPage;
