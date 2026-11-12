import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { marketFetch } from './commerce/utils';

export function SellerGrowthPanel() {
  const token = useStore((s) => s.token);
  const [analytics, setAnalytics] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [rep, setRep] = useState<any>(null);
  const [storyUrl, setStoryUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('Live product showcase');
  const [boostId, setBoostId] = useState('');
  const [history, setHistory] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/analytics', token).then(setAnalytics).catch(() => {});
    marketFetch('/api/marketplace/offers', token).then((d) => setOffers(d.offers || [])).catch(() => {});
    marketFetch('/api/marketplace/reputation/me', token).then(setRep).catch(() => {});
  }, [token]);

  const totals = analytics?.totals || {};
  const series: any[] = analytics?.series || [];
  const peak = Math.max(1, ...series.map((s) => s.revenue));

  if (!analytics) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          ['Revenue', `৳${Number(totals.revenue || 0).toLocaleString('en-BD')}`],
          ['Orders', totals.orders],
          ['Views', totals.views],
          ['Followers', totals.followers],
          ['Conversion', `${totals.conversionRate ?? 0}%`],
          ['Growth', `${totals.salesGrowth ?? 0}%`],
          ['Shares', totals.shares],
          ['Cart adds', totals.cartAdds],
        ].map(([label, val]) => (
          <div key={String(label)} className="bg-card border border-border rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
            <div className="text-lg font-extrabold mt-1">{val ?? 0}</div>
          </div>
        ))}
      </div>

      {!!series.length && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Revenue over the last 6 months</h3>
            <span
              className={`text-xs font-bold ${Number(totals.salesGrowth) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {Number(totals.salesGrowth) >= 0 ? '▲' : '▼'} {Math.abs(Number(totals.salesGrowth || 0))}% vs last month
            </span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {series.map((s) => (
              <div key={s.month} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
                  style={{ height: `${Math.max(4, (s.revenue / peak) * 100)}%` }}
                  title={`৳${s.revenue.toLocaleString('en-BD')} · ${s.orders} orders`}
                />
                <span className="text-[9px] text-muted-foreground">{s.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!analytics?.topProducts?.length && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-bold text-sm mb-3">Top products by revenue</h3>
          <div className="space-y-2">
            {analytics.topProducts.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-xs font-semibold">{p.title}</span>
                <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, (p.revenue / Math.max(1, analytics.topProducts[0].revenue)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold w-24 text-right">
                  ৳{Number(p.revenue || 0).toLocaleString('en-BD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rep && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-bold text-sm mb-2">Wevsoft reputation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>Trust {Number(rep.trustScore).toFixed(0)}</div>
            <div>Buyer {Number(rep.buyerScore).toFixed(0)}</div>
            <div>Seller {Number(rep.sellerScore).toFixed(0)}</div>
            <div>Scam risk {Number(rep.scamRiskScore).toFixed(0)}</div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(rep.badges || []).map((b: any) => (
              <span key={b.id || b.badge} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {b.badge}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 overflow-x-auto">
        <h3 className="font-bold text-sm mb-2">Product performance</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="pb-2">Product</th>
              <th>Views</th>
              <th>CTR</th>
              <th>Conv.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(analytics?.products || []).map((p: any) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="py-2">{p.title}</td>
                <td>{p.viewCount}</td>
                <td>{p.ctr}%</td>
                <td>{p.conversionRate}%</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setBoostId(p.id)}
                    className="text-primary font-bold"
                  >
                    Boost
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {boostId && (
          <button
            type="button"
            className="mt-3 px-3 py-2 rounded-md bg-primary text-white text-xs font-bold"
            onClick={async () => {
              const d = await marketFetch('/api/marketplace/boost', token, {
                method: 'POST',
                body: JSON.stringify({ productId: boostId, hours: 24 }),
              });
              toast.success(`Boosted · ${d.balance} coins left`);
            }}
          >
            Spend 50 coins to boost 24h
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="font-bold text-sm">WevMall story (24h)</h3>
          <input
            value={storyUrl}
            onChange={(e) => setStoryUrl(e.target.value)}
            placeholder="Image URL"
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background"
          />
          <button
            type="button"
            onClick={async () => {
              await marketFetch('/api/marketplace/stories', token, {
                method: 'POST',
                body: JSON.stringify({ mediaUrl: storyUrl }),
              });
              toast.success('Story published');
              setStoryUrl('');
            }}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-bold"
          >
            Post story
          </button>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="font-bold text-sm">Go live</h3>
          <input
            value={liveTitle}
            onChange={(e) => setLiveTitle(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background"
          />
          <button
            type="button"
            onClick={async () => {
              const s = await marketFetch('/api/marketplace/live', token, {
                method: 'POST',
                body: JSON.stringify({ title: liveTitle }),
              });
              window.location.href = `/wevmall/live/${s.id}`;
            }}
            className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-bold"
          >
            Start live sale
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Offers</h3>
        {(offers || []).map((o) => (
          <div key={o.id} className="py-2 border-b border-border/50 text-xs">
            <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-bold">{o.product?.title}</div>
              <div className="text-muted-foreground">
                ৳{o.amount} · {o.status}
                {o.counterAmount ? ` · counter ৳${o.counterAmount}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (history[o.id]) return setHistory((p) => ({ ...p, [o.id]: null }));
                const d = await marketFetch(`/api/marketplace/offers/${o.id}/history`, token);
                setHistory((p) => ({ ...p, [o.id]: d }));
              }}
              className="px-2 py-1 rounded border border-border text-[11px] font-bold"
            >
              History
            </button>
            {o.status === 'pending' && (
              <div className="flex gap-1">
                {['accept', 'reject', 'counter'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={async () => {
                      const counterAmount = action === 'counter' ? Number(prompt('Counter amount') || 0) : undefined;
                      await marketFetch(`/api/marketplace/offers/${o.id}/respond`, token, {
                        method: 'POST',
                        body: JSON.stringify({ action, counterAmount }),
                      });
                      toast.success(action);
                    }}
                    className="px-2 py-1 rounded border border-border capitalize"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            </div>
            {history[o.id] && (
              <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
                {(history[o.id].events || []).map((e: any) => (
                  <p key={e.id} className="text-[11px] text-muted-foreground">
                    <span className="font-bold capitalize">{e.action}</span> by {e.actor?.name || 'user'}
                    {e.amount ? ` · ৳${e.amount}` : ''} ·{' '}
                    {new Date(e.createdAt).toLocaleString()}
                    {e.note ? ` — ${e.note}` : ''}
                  </p>
                ))}
                {!history[o.id].events?.length && (
                  <p className="text-[11px] text-muted-foreground">No negotiation steps recorded yet.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {!offers.length && <p className="text-xs text-muted-foreground">No offers yet.</p>}
      </div>
    </div>
  );
}
