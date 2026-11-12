import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { PriceTag } from '../components/marketplace/commerce/primitives';
import { marketFetch, productThumb } from '../components/marketplace/commerce/utils';
import { useStore } from '../store';

const KM = [5, 10, 25, 50];

export default function MarketplaceMapPage() {
  const token = useStore((s) => s.token);
  const [km, setKm] = useState(10);
  const [data, setData] = useState<{ origin?: any; products: any[] }>({ products: [] });

  useEffect(() => {
    if (!token) return;
    marketFetch(`/api/marketplace/nearby?km=${km}`, token).then(setData).catch(() => setData({ products: [] }));
  }, [token, km]);

  const origin = data.origin || { lat: 23.81, lng: 90.41 };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Nearby products</h1>
        <div className="flex gap-1">
          {KM.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setKm(n)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                km === n ? 'bg-[#F57224] text-white border-[#F57224]' : 'border-border'
              }`}
            >
              {n} KM
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[420px] rounded-lg border border-border bg-emerald-950/20 overflow-hidden mb-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,114,36,0.12),transparent_55%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-500 shadow" title="You" />
        {data.products.map((p) => {
          const x = 50 + (Number(p.longitude) - origin.lng) * 18;
          const y = 50 - (Number(p.latitude) - origin.lat) * 22;
          return (
            <Link
              key={p.id}
              to={`/wevmall/product/${p.id}`}
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full overflow-hidden border-2 border-[#F57224] bg-card"
              style={{ left: `${Math.max(4, Math.min(96, x))}%`, top: `${Math.max(4, Math.min(96, y))}%` }}
              title={`${p.title} · ${p.distanceKm} km`}
            >
              <img src={productThumb(p)} alt="" className="w-full h-full object-cover" />
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.products.map((p) => (
          <Link key={p.id} to={`/wevmall/product/${p.id}`} className="flex gap-3 bg-card border border-border rounded-lg p-3">
            <img src={productThumb(p)} alt="" className="w-16 h-16 rounded object-cover" />
            <div>
              <div className="text-sm font-bold">{p.title}</div>
              <PriceTag price={p.price} discountPrice={p.discountPrice} />
              <div className="text-[11px] text-muted-foreground">{p.distanceKm} km · {p.location}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
