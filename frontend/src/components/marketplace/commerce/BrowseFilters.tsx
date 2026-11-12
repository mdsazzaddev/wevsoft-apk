import React, { useEffect, useState } from 'react';
import { useMarketplaceCategories, dedupeStorefrontCategories } from './utils';

export interface BrowseFilterState {
  category: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  location: string;
  sellerId: string;
  rating: string;
  sort: string;
}

export const EMPTY_BROWSE_FILTERS: BrowseFilterState = {
  category: 'All',
  condition: 'All',
  minPrice: '',
  maxPrice: '',
  location: 'All',
  sellerId: 'All',
  rating: '',
  sort: 'newest',
};

interface Facets {
  locations: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  sellers: { id: string; name: string; count: number }[];
}

/** Facets are static per page load, so fetch them once and share the promise. */
let facetsPromise: Promise<Facets> | null = null;
function loadFacets(): Promise<Facets> {
  if (!facetsPromise) {
    facetsPromise = fetch('/api/marketplace/browse/facets')
      .then((r) => (r.ok ? r.json() : { locations: [], categories: [], sellers: [] }))
      .catch(() => ({ locations: [], categories: [], sellers: [] }));
  }
  return facetsPromise;
}

const selectClass =
  'w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-primary transition-colors';

/**
 * Full filter rail for the browse surfaces: category, price, condition,
 * location, seller, rating and sort. Kept separate from FilterSidebar so the
 * landing page's existing sidebar keeps working unchanged.
 */
export function BrowseFilters({
  value,
  onChange,
  className = '',
}: {
  value: BrowseFilterState;
  onChange: (next: BrowseFilterState) => void;
  className?: string;
}) {
  const [facets, setFacets] = useState<Facets>({ locations: [], categories: [], sellers: [] });
  const liveCategories = useMarketplaceCategories();

  useEffect(() => {
    let mounted = true;
    loadFacets().then((f) => mounted && setFacets(f));
    return () => {
      mounted = false;
    };
  }, []);

  const set = (patch: Partial<BrowseFilterState>) => onChange({ ...value, ...patch });
  const categories = liveCategories.length
    ? liveCategories.map((c) => c.name)
    : ['All', ...dedupeStorefrontCategories(facets.categories.map((c) => ({ name: c.value, slug: c.value }))).map((c) => c.name)];

  const isDirty = JSON.stringify(value) !== JSON.stringify(EMPTY_BROWSE_FILTERS);

  return (
    <aside className={`bg-card border border-border rounded-lg p-4 space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Filters</h3>
        {isDirty && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_BROWSE_FILTERS })}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Category</h4>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ category: c })}
              className={`w-full text-left px-2.5 py-1.5 rounded text-sm transition-colors ${
                value.category === c ? 'bg-primary/15 text-primary font-bold' : 'text-foreground hover:bg-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Price (৳)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            placeholder="Min"
            className={selectClass}
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="number"
            value={value.maxPrice}
            onChange={(e) => set({ maxPrice: e.target.value })}
            placeholder="Max"
            className={selectClass}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Location</h4>
        <select aria-label="Location" value={value.location} onChange={(e) => set({ location: e.target.value })} className={selectClass}>
          <option value="All">Anywhere</option>
          {facets.locations.map((l) => (
            <option key={l.value} value={l.value}>
              {l.value} ({l.count})
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Seller</h4>
        <select aria-label="Seller" value={value.sellerId} onChange={(e) => set({ sellerId: e.target.value })} className={selectClass}>
          <option value="All">All sellers</option>
          {facets.sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Rating</h4>
        <select aria-label="Rating" value={value.rating} onChange={(e) => set({ rating: e.target.value })} className={selectClass}>
          <option value="">Any rating</option>
          <option value="4.5">4.5 &amp; up</option>
          <option value="4">4.0 &amp; up</option>
          <option value="3">3.0 &amp; up</option>
        </select>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Condition</h4>
        <select aria-label="Condition" value={value.condition} onChange={(e) => set({ condition: e.target.value })} className={selectClass}>
          <option value="All">All</option>
          <option value="New">New</option>
          <option value="Used">Used</option>
          <option value="Refurbished">Refurbished</option>
        </select>
      </div>

      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Sort by</h4>
        <select aria-label="Sort by" value={value.sort} onChange={(e) => set({ sort: e.target.value })} className={selectClass}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top rated</option>
          <option value="popular">Most popular</option>
        </select>
      </div>
    </aside>
  );
}

export default BrowseFilters;
