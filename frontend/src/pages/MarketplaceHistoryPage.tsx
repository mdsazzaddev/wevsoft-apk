import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, History, ArrowLeft } from 'lucide-react';
import { useStore } from '../store';
import { marketFetch, formatPrice, productThumb } from '../components/marketplace/commerce/utils';

export default function MarketplaceHistoryPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ products: [], viewHistory: [], searchHistory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    marketFetch('/api/marketplace/history', token)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => setError('We could not load your history. Please try again.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(load, [token]);

  const viewedAtFor = (productId: string) =>
    data.viewHistory?.find((v: any) => v.productId === productId)?.viewedAt;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate('/wevmall')}
        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to WevMall
      </button>

      <h1 className="text-xl font-bold flex items-center gap-2">
        <History className="w-5 h-5 text-[#F57224]" /> Recently viewed
      </h1>
      <p className="text-xs text-muted-foreground mt-1">Everything you have browsed and searched, in one place.</p>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-2 space-y-2">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-8 border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button type="button" onClick={load} className="mt-3 px-4 py-2 rounded-md bg-[#F57224] text-white text-xs font-bold">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && !data.products?.length && (
        <div className="mt-8 border border-border rounded-lg p-10 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-bold text-sm">Nothing here yet</p>
          <p className="text-xs text-muted-foreground mt-1">Products you open will show up here for quick access.</p>
          <button
            type="button"
            onClick={() => navigate('/wevmall')}
            className="mt-4 px-4 py-2 rounded-md bg-[#F57224] text-white text-xs font-bold"
          >
            Browse the marketplace
          </button>
        </div>
      )}

      {!loading && !error && !!data.products?.length && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
          {data.products.map((p: any) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/wevmall/product/${p.id}`)}
              className="text-left rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow bg-card"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={productThumb(p)} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold line-clamp-2">{p.title}</p>
                <p className="text-sm font-bold text-[#F57224] mt-1">{formatPrice(p.discountPrice || p.price)}</p>
                {viewedAtFor(p.id) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(viewedAtFor(p.id)).toLocaleDateString()}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !!data.searchHistory?.length && (
        <div className="mt-10">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-[#F57224]" /> Recent searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.searchHistory.map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/wevmall?q=${encodeURIComponent(s.query)}`)}
                className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold hover:border-[#F57224] hover:text-[#F57224] transition-colors"
              >
                {s.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
