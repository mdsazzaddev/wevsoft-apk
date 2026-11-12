import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { PriceTag, RatingStars } from '../components/marketplace/commerce/primitives';
import { marketFetch, productThumb } from '../components/marketplace/commerce/utils';
import { useStore } from '../store';
import { stockLabel } from '../components/marketplace/experience/stock';

const ROWS: { key: string; label: string; render: (p: any) => React.ReactNode }[] = [
  { key: 'price', label: 'Price', render: (p) => <PriceTag price={p.price} discountPrice={p.discountPrice} /> },
  { key: 'rating', label: 'Rating', render: (p) => <RatingStars value={p.rating} count={p.reviewsCount} /> },
  { key: 'condition', label: 'Condition', render: (p) => p.condition || '—' },
  { key: 'brand', label: 'Brand', render: (p) => p.brand || '—' },
  { key: 'location', label: 'Location', render: (p) => p.location || '—' },
  { key: 'trust', label: 'Seller trust score', render: (p) => `${Number(p.trustScore || p.seller?.sellerProfile?.trustScore || 50).toFixed(0)}/100` },
  { key: 'stock', label: 'Availability', render: (p) => stockLabel(p).label },
];

export default function MarketplaceComparePage() {
  const [params] = useSearchParams();
  const token = useStore((s) => s.token);
  const [products, setProducts] = useState<any[]>([]);
  // UI-02: no ids → don't call the API (it answers 400); show an empty state instead.
  const ids = (params.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!token || !idsKey) return;
    marketFetch(`/api/marketplace/compare?ids=${encodeURIComponent(idsKey)}`, token)
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, [token, idsKey]);

  if (!idsKey) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
        <h1 className="text-xl font-bold mb-4">Compare products</h1>
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          <p className="mb-3">No products selected yet. Add products to compare from any product card.</p>
          <Link to="/wevmall" className="font-bold text-[#F57224] hover:underline">
            Browse WevMall
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
      <h1 className="text-xl font-bold mb-4">Compare products</h1>
      <div className="overflow-x-auto bg-card border border-border rounded-lg">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left text-xs text-muted-foreground">Feature</th>
              {products.map((p) => (
                <th key={p.id} className="p-3 text-left">
                  <img src={productThumb(p)} alt="" className="w-20 h-20 object-cover rounded mb-2" />
                  <Link to={`/wevmall/product/${p.id}`} className="font-bold hover:text-[#F57224]">
                    {p.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-border/60">
                <td className="p-3 text-xs font-bold text-muted-foreground">{row.label}</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
