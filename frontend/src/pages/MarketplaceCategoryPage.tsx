import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { FilterSidebar } from '../components/marketplace/commerce/FilterSidebar';
import { ProductGrid } from '../components/marketplace/commerce/ProductCard';
import { marketFetch, categoryMatches, MARKET_CATEGORIES, useMarketplaceCategories } from '../components/marketplace/commerce/utils';
import { SlidersHorizontal, X, BookmarkPlus } from 'lucide-react';
import { RecommendRails } from '../components/marketplace/experience/RecommendRails';
import { CompareTray } from '../components/marketplace/experience/CompareTray';
import MarketplaceFooter from '../components/marketplace/commerce/MarketplaceFooter';
import Breadcrumb from '../components/marketplace/commerce/Breadcrumb';
import Pagination from '../components/marketplace/commerce/Pagination';

export default function MarketplaceCategoryPage() {
  const { categorySlug } = useParams();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const liveCategories = useMarketplaceCategories();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const slugName =
    liveCategories.find((c) => c.slug === categorySlug || c.name.toLowerCase() === String(categorySlug || '').toLowerCase())
      ?.name ||
    MARKET_CATEGORIES.find((c) => c.slug === categorySlug || c.name.toLowerCase() === String(categorySlug || '').toLowerCase())
      ?.name ||
    (String(categorySlug || '').toLowerCase() === 'pets' ? 'Animals' : categorySlug) ||
    'All';
  const [category, setCategory] = useState(slugName);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setCategory(slugName);
  }, [slugName]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [condition, setCondition] = useState('All');
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [distanceKm, setDistanceKm] = useState('all');
  const [nearbyIds, setNearbyIds] = useState<Set<string> | null>(null);
  const [saved, setSaved] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [assistantHint, setAssistantHint] = useState('');
  const [sellerFeed, setSellerFeed] = useState<any[]>([]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await marketFetch('/api/marketplace', token);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    if (!token) return;
    try {
      const [wish, cart] = await Promise.all([
        marketFetch('/api/marketplace/wishlist', token),
        marketFetch('/api/marketplace/cart', token),
      ]);
      setWishlistIds(new Set((Array.isArray(wish) ? wish : []).map((w: any) => w.productId)));
      setCartCount(cart.count || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadProducts();
    loadMeta();
    if (!token) return;
    marketFetch('/api/marketplace/saved-searches', token).then((d) => setSaved(d.items || [])).catch(() => {});
    marketFetch('/api/marketplace/stories', token).then((d) => setStories(d.stories || [])).catch(() => {});
    marketFetch('/api/marketplace/seller/feed', token).then((d) => setSellerFeed(d.items || [])).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || distanceKm === 'all') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setNearbyIds(null);
      return;
    }
    marketFetch(`/api/marketplace/nearby?km=${distanceKm}`, token)
      .then((d) => setNearbyIds(new Set((d.products || []).map((p: any) => p.id))))
      .catch(() => setNearbyIds(null));
  }, [token, distanceKm]);

  const handleNlpSearch = async () => {
    if (!search.trim()) {
      loadProducts();
      return;
    }
    setLoading(true);
    try {
      const data = token
        ? await marketFetch('/api/marketplace/ai/assistant', token, {
            method: 'POST',
            body: JSON.stringify({ query: search }),
          })
        : await (await fetch('/api/v1/marketplace/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: search, category }),
          })).json();
      setProducts(data.products || []);
      setAssistantHint(data.parsed ? `Matched ${data.parsed.category || 'all'} under ৳${data.parsed.maxPrice || 'any'}` : '');
      toast.success(`Found ${data.products?.length || 0} listings`);
    } catch (e: any) {
      toast.error(e.message || 'AI search failed');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentSearch = async () => {
    if (!token || !search.trim()) return toast.error('Type a search first');
    try {
      await marketFetch('/api/marketplace/saved-searches', token, {
        method: 'POST',
        body: JSON.stringify({ name: search, query: search, filters: { category, minPrice, maxPrice } }),
      });
      toast.success('Search saved');
      const d = await marketFetch('/api/marketplace/saved-searches', token);
      setSaved(d.items || []);
    } catch (e: any) {
      toast.error(e.message || 'Could not save');
    }
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'All') {
      list = list.filter((p) => categoryMatches(category, p.category));
    }
    if (condition !== 'All') {
      list = list.filter((p) => String(p.condition || '').toLowerCase() === condition.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          String(p.title || '').toLowerCase().includes(q) ||
          String(p.description || '').toLowerCase().includes(q) ||
          String(p.brand || '').toLowerCase().includes(q)
      );
    }
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min != null && !Number.isNaN(min)) list = list.filter((p) => Number(p.price || 0) >= min);
    if (max != null && !Number.isNaN(max)) list = list.filter((p) => Number(p.price || 0) <= max);

    if (sort === 'price_asc') list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === 'price_desc') list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === 'rating') list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (nearbyIds) list = list.filter((p) => nearbyIds.has(p.id));
    return list;
  }, [products, category, condition, search, minPrice, maxPrice, sort, nearbyIds]);

  const filters = (
    <FilterSidebar
      category={category}
      onCategory={setCategory}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPrice={setMinPrice}
      onMaxPrice={setMaxPrice}
      sort={sort}
      onSort={setSort}
      condition={condition}
      onCondition={setCondition}
      distanceKm={distanceKm}
      onDistanceKm={setDistanceKm}
    />
  );

  return (
    <div className="w-full max-w-7xl mx-auto pb-10">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleNlpSearch}
        onNlpSearch={handleNlpSearch}
        category={category}
        onCategory={setCategory}
        cartCount={cartCount}
      />

      {sellerFeed.length > 0 && (
        <div className="mb-3 border border-border rounded-lg bg-card p-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            From shops you follow
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sellerFeed.slice(0, 12).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => f.product?.id && (window.location.href = `/wevmall/product/${f.product.id}`)}
                className="shrink-0 max-w-[220px] text-left border border-border rounded-md px-3 py-2 hover:border-[#F57224] transition-colors"
              >
                <p className="text-[11px] font-bold truncate">{f.seller?.shopName || 'Shop update'}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{f.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {stories.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-3 mb-3">
          {stories.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => s.product?.id && (window.location.href = `/wevmall/product/${s.product.id}`)}
              className="shrink-0 w-16 text-center"
            >
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#F57224] to-amber-300">
                <img src={s.mediaUrl} alt="" className="w-full h-full rounded-full object-cover border-2 border-background" />
              </div>
              <p className="text-[10px] truncate mt-1">{s.seller?.shopName || s.user?.name}</p>
            </button>
          ))}
        </div>
      )}

      {(saved.length > 0 || search.trim()) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={saveCurrentSearch}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-[11px] font-bold"
          >
            <BookmarkPlus size={12} /> Save search
          </button>
          {saved.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={async () => {
                setSearch(s.query);
                if (!token) return;
                setLoading(true);
                try {
                  const data = await marketFetch('/api/marketplace/ai/assistant', token, {
                    method: 'POST',
                    body: JSON.stringify({ query: s.query }),
                  });
                  setProducts(data.products || []);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-2.5 py-1 rounded-full bg-[#F57224]/10 text-[#F57224] text-[11px] font-bold"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {assistantHint && <p className="text-[11px] text-muted-foreground mb-2">{assistantHint}</p>}

      <div className="mb-4">
        <Breadcrumb items={[
          { label: 'WevMall', href: '/wevmall' },
          { label: category }
        ]} />
      </div>

      <div className="flex items-center justify-between mb-3 md:hidden">
        <p className="text-xs text-muted-foreground font-medium">{filtered.length} products</p>
        <button
          type="button"
          onClick={() => setMobileFilters(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-bold"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="hidden lg:block">{filters}</div>
        <div>
          <div className="hidden md:flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-foreground">
              {category === 'All' ? 'All products' : category}
              <span className="ml-2 text-xs font-medium text-muted-foreground">({filtered.length})</span>
            </h1>
          </div>
          <ProductGrid
            products={filtered}
            loading={loading}
            wishlistIds={wishlistIds}
            onWishlistChange={(id, wished) => {
              setWishlistIds((prev) => {
                const next = new Set(prev);
                if (wished) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
            onCartChange={loadMeta}
          />
          <div className="mt-8">
            <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} onLimitChange={() => {}} />
          </div>
          <RecommendRails
            token={token}
            wishlistIds={wishlistIds}
            onWishlistChange={(id, wished) => {
              setWishlistIds((prev) => {
                const next = new Set(prev);
                if (wished) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
            onCartChange={loadMeta}
          />
        </div>
      </div>
      <CompareTray />

      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl border-t border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Filters</h2>
              <button type="button" onClick={() => setMobileFilters(false)}>
                <X size={18} />
              </button>
            </div>
            {filters}
            <button
              type="button"
              onClick={() => setMobileFilters(false)}
              className="mt-4 w-full py-2.5 rounded-md bg-[#F57224] text-white text-sm font-bold"
            >
              Show results
            </button>
          </div>
        </div>
      )}

      <MarketplaceFooter />
    </div>
  );
}
