import React from 'react';
import { useMarketplaceCategories } from './utils';

export function FilterSidebar({
  category,
  onCategory,
  minPrice,
  maxPrice,
  onMinPrice,
  onMaxPrice,
  sort,
  onSort,
  condition,
  onCondition,
  distanceKm,
  onDistanceKm,
  location,
  onLocation,
  locations = [],
  sellerId,
  onSellerId,
  sellers = [],
  rating,
  onRating,
  className = '',
}: {
  category: string;
  onCategory: (c: string) => void;
  minPrice: string;
  maxPrice: string;
  onMinPrice: (v: string) => void;
  onMaxPrice: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  condition: string;
  onCondition: (v: string) => void;
  distanceKm?: string;
  onDistanceKm?: (v: string) => void;
  location?: string;
  onLocation?: (v: string) => void;
  locations?: { value: string; count?: number }[];
  sellerId?: string;
  onSellerId?: (v: string) => void;
  sellers?: { id: string; name: string; count?: number }[];
  rating?: string;
  onRating?: (v: string) => void;
  className?: string;
}) {
  const categories = useMarketplaceCategories();
  return (
    <aside className={`bg-card border border-border rounded-lg p-4 space-y-5 ${className}`}>
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
          Category
        </h3>
        <div className="space-y-1">
          {categories.map((c) => (
            <button
              key={c.slug || c.name}
              type="button"
              onClick={() => onCategory(c.name)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-sm ${
                category === c.name
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
          Price (৳)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => onMinPrice(e.target.value)}
            placeholder="Min"
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => onMaxPrice(e.target.value)}
            placeholder="Max"
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-3">
          Condition
        </h3>
        <div className="space-y-2">
          {['All', 'New', 'Used', 'Refurbished'].map(cond => (
            <label key={cond} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="radio"
                name="condition"
                checked={condition === cond}
                onChange={() => onCondition(cond)}
                className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-offset-background"
              />
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{cond}</span>
            </label>
          ))}
        </div>
      </div>

      {onDistanceKm && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
            Distance
          </h3>
          <select aria-label="Distance"
            value={distanceKm || 'all'}
            onChange={(e) => onDistanceKm(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
          >
            <option value="all">Anywhere</option>
            <option value="5">Within 5 KM</option>
            <option value="10">Within 10 KM</option>
            <option value="25">Within 25 KM</option>
            <option value="50">Within 50 KM</option>
          </select>
        </div>
      )}

      {onLocation && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
            Location
          </h3>
          <select aria-label="Location"
            value={location || 'All'}
            onChange={(e) => onLocation(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
          >
            <option value="All">Anywhere</option>
            {locations.map((l) => (
              <option key={l.value} value={l.value}>
                {l.value}{l.count != null ? ` (${l.count})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {onSellerId && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
            Seller
          </h3>
          <select aria-label="Seller"
            value={sellerId || 'All'}
            onChange={(e) => onSellerId(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
          >
            <option value="All">All sellers</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.count != null ? ` (${s.count})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {onRating && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-3">
            Rating
          </h3>
          <div className="space-y-2">
            {[
              { value: '', label: 'Any rating' },
              { value: '4.5', label: '4.5 & up' },
              { value: '4', label: '4.0 & up' },
              { value: '3', label: '3.0 & up' },
            ].map(r => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio"
                  name="rating"
                  checked={rating === r.value}
                  onChange={() => onRating(r.value)}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-offset-background"
                />
                <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
          Sort by
        </h3>
        <select aria-label="Sort by"
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
    </aside>
  );
}
