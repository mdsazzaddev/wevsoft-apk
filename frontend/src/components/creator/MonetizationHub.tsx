import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Handshake, Loader2, RefreshCw, Star, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';
import { StarsGiftingView } from './StarsGiftingView';
import {
  HubEmpty, HubPageHeader, HubRow, HubSection, HubSkeleton, HubStatRow, HubTabs, chartColors, hubBtnPrimary, hubBtnSecondary, hubBtnGhost, hubCard,
} from './hub/HubUI';

function money(n?: number | null) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type HubTab = 'overview' | 'stars';
type Monetization = {
  subscriptionRevenue?: number;
  giftRevenue?: number;
  totalRevenue?: number;
  paidOrReserved?: number;
  available?: number;
  activeSubscribers?: number;
};
type Payout = { id: string; amount: number; status?: string | null; payoutMethod?: string | null; createdAt?: string | null };

/** Status is a small dot + word, not a pastel pill. */
const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  FAILED: 'bg-destructive',
  REJECTED: 'bg-destructive',
};
export const MonetizationHub = () => {
  const token = useStore((s) => s.token);
  const [params, setParams] = useSearchParams();
  const hubTab: HubTab = params.get('sub') === 'stars' ? 'stars' : 'overview';
  const setHubTab = (t: HubTab) => {
    const next = new URLSearchParams(params);
    if (t === 'stars') next.set('sub', 'stars');
    else next.delete('sub');
    setParams(next, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [earningsChart, setEarningsChart] = useState<{ month: string; revenue: number }[]>([]);
  const [monetization, setMonetization] = useState<Monetization | null>(null);
  const [affiliate, setAffiliate] = useState<{ coins: number; estimatedBdt: number; pending: number } | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const my = ++seq.current;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/studio', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Could not load monetization (${res.status})`);
      if (my !== seq.current) return;
      setCreator(data?.creator ?? null);
      setEarningsChart(Array.isArray(data?.earningsChart) ? data.earningsChart : []);
      setMonetization(data?.monetization ?? null);
      const affRes = await fetch('/api/reels/affiliate/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (affRes?.ok) {
        const aff = await affRes.json().catch(() => null);
        if (aff && my === seq.current) setAffiliate({ coins: aff.coins || 0, estimatedBdt: aff.estimatedBdt || 0, pending: aff.pending || 0 });
      }
    } catch (e: any) {
      if (my === seq.current) setError(e?.message || 'Could not load monetization');
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount / token change
    void load();
  }, [load]);

  const available = Number(monetization?.available ?? creator?.monthlyEarnings ?? 0);
  const totalRevenue = Number(monetization?.totalRevenue ?? 0);
  const paidOrReserved = Number(monetization?.paidOrReserved ?? 0);
  const subscriptions = Number(monetization?.subscriptionRevenue || 0);
  const tips = Number(monetization?.giftRevenue || 0);
  const subscribers = Number(monetization?.activeSubscribers ?? creator?.subscriberCount ?? 0);
  const payouts: Payout[] = Array.isArray(creator?.payouts)
    ? [...creator.payouts].sort((a: Payout, b: Payout) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    : [];

  const requestPayout = async () => {
    if (!token || available <= 0) return;
    setRequestingPayout(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: available, payoutMethod: 'bKash / Bank' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Payout request failed');
      toast.success('Payout requested');
      setConfirmPayout(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Payout request failed');
    } finally {
      setRequestingPayout(false);
    }
  };

  const affiliateActive = !!affiliate && (affiliate.coins > 0 || affiliate.pending > 0);
  // API month labels have no year and arrive unordered; show them oldest -> newest ending this month.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const thisMonth = new Date().getMonth();
  const monthAge = (m: string) => { const i = MONTHS.indexOf(String(m).slice(0, 3)); return i < 0 ? 99 : (thisMonth - i + 12) % 12; };
  const chartRows = [...earningsChart].sort((x, y) => monthAge(y.month) - monthAge(x.month));

  return (
    <div className="space-y-5 text-foreground">
      <HubPageHeader
        title="Monetization"
        description="Earnings, balance and payouts."
        actions={hubTab === 'overview' ? (
          <button type="button" onClick={() => void load()} disabled={loading} className={hubBtnSecondary}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        ) : undefined}
      />

      <HubTabs<HubTab>
        label="Monetization sections"
        value={hubTab}
        onChange={setHubTab}
        items={[{ id: 'overview', label: 'Earnings & payouts' }, { id: 'stars', label: 'Stars & gifting' }]}
      />

      {hubTab === 'stars' ? (
        <StarsGiftingView />
      ) : loading && !monetization && !error ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading monetization">
          <HubSkeleton className="h-[112px]" />
          <HubSkeleton className="h-[86px]" />
          <HubSkeleton className="h-[260px]" />
        </div>
      ) : error && !monetization ? (
        <div className={hubCard}>
          <HubEmpty
            text={error}
            action={<button type="button" onClick={() => void load()} className={hubBtnPrimary}><RefreshCw size={15} /> Try again</button>}
          />
        </div>
      ) : (
        <>
          <div className={`${hubCard} flex flex-wrap items-center justify-between gap-4 p-5`}>
            <div className="min-w-0">
              <div className="text-[13px] text-muted-foreground">Available balance</div>
              <div className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums">{money(available)}</div>
              <div className="mt-2 text-[13px] text-muted-foreground">
                {paidOrReserved > 0 ? `${money(paidOrReserved)} paid out or pending` : 'Nothing paid out yet'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {confirmPayout ? (
                <>
                  <button type="button" onClick={() => setConfirmPayout(false)} disabled={requestingPayout} className={hubBtnGhost}>Cancel</button>
                  <button type="button" onClick={() => void requestPayout()} disabled={requestingPayout} className={hubBtnPrimary}>
                    {requestingPayout && <Loader2 size={15} className="animate-spin" />} Confirm {money(available)}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmPayout(true)}
                  disabled={available <= 0}
                  title={available <= 0 ? 'You need a positive balance to request a payout' : undefined}
                  className={hubBtnPrimary}
                >
                  Request payout
                </button>
              )}
            </div>
          </div>

          <HubStatRow
            stats={[
              { label: 'Total earned', value: money(totalRevenue), hint: 'All time' },
              { label: 'Subscriptions', value: money(subscriptions), hint: `${subscribers} active subscriber${subscribers === 1 ? '' : 's'}` },
              { label: 'Tips & gifts', value: money(tips), hint: 'Stars and virtual gifts' },
              affiliateActive
                ? { label: 'Reel affiliate', value: `${affiliate!.coins.toLocaleString()} coins`, hint: affiliate!.pending ? `${affiliate!.pending} pending` : 'Tagged product sales' }
                : { label: 'Paid out', value: money(paidOrReserved), hint: 'Including pending' },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <HubSection title="Earnings" description="Monthly revenue, last 6 months with earnings">
              {earningsChart.length > 0 ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={chartColors.grid} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: chartColors.axis, fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: chartColors.axis, fontSize: 12 }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        formatter={(v) => [money(Number(v)), 'Revenue']}
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="revenue" fill={chartColors.primary} radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <HubEmpty
                  className="py-14"
                  text="No earnings yet. Subscriptions, Stars and gifts will show up here."
                  action={<button type="button" onClick={() => setHubTab('stars')} className={hubBtnSecondary}><Star size={15} /> Set up Stars</button>}
                />
              )}
            </HubSection>

            <HubSection title="Payouts" flush>
              <div className="divide-y divide-border">
                <HubRow
                  icon={Wallet}
                  title={creator?.monetizationStatus ? 'Monetization enabled' : 'Monetization paused'}
                  description="Payouts go to the method saved in your Wallet (bKash / bank)."
                  trailing={<span className={`h-2 w-2 shrink-0 rounded-full ${creator?.monetizationStatus ? 'bg-emerald-500' : 'bg-amber-500'}`} />}
                />
                <HubRow to="/wallet" icon={Wallet} title="Manage in Wallet" description="Payout method and withdrawals" trailing={<ChevronRight size={18} className="text-muted-foreground" />} />
                <HubRow to={creatorHubPath('brand_collab')} icon={Handshake} title="Brand deals" description="Find paid collaborations" trailing={<ChevronRight size={18} className="text-muted-foreground" />} />
                <HubRow onClick={() => setHubTab('stars')} icon={Star} title="Stars & gifting" description="Let fans support you directly" trailing={<ChevronRight size={18} className="text-muted-foreground" />} />
              </div>
            </HubSection>
          </div>

          <HubSection
            title="Payout history"
            action={payouts.length > 0 ? <span className="text-[13px] text-muted-foreground">{payouts.length} request{payouts.length === 1 ? '' : 's'}</span> : undefined}
            flush
          >
            {payouts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Method</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payouts.map((p) => {
                      const st = String(p.status || 'PENDING').toUpperCase();
                      return (
                        <tr key={p.id} className="hover:bg-surface-hover">
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td className="px-4 py-3 font-medium">{p.payoutMethod || 'bKash / Bank'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[13px]">
                              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[st] || STATUS_DOT.PENDING}`} />
                              {st.charAt(0) + st.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <HubEmpty text="No payouts yet. Requests you make will be listed here." />
            )}
          </HubSection>
        </>
      )}
    </div>
  );
};