import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { FilterSidebar } from '../components/marketplace/commerce/FilterSidebar';
import { ProductGrid } from '../components/marketplace/commerce/ProductCard';
import { marketFetch, categoryMatches } from '../components/marketplace/commerce/utils';
import { SlidersHorizontal, X, BookmarkPlus } from 'lucide-react';
import { RecommendRails } from '../components/marketplace/experience/RecommendRails';
import { CompareTray } from '../components/marketplace/experience/CompareTray';
import MarketplaceFooter from '../components/marketplace/commerce/MarketplaceFooter';
import MarketplaceHero from '../components/marketplace/commerce/MarketplaceHero';
import WevMallLiftDock from '../components/marketplace/commerce/WevMallLiftDock';
import VoucherClaimPill from '../components/marketplace/commerce/VoucherClaimPill';
import DailyCheckInBanner from '../components/marketplace/commerce/DailyCheckInBanner';
import { CircularCategories } from '../components/marketplace/commerce/MarketplaceCategories';
import { RecentlyViewedTray } from '../components/marketplace/commerce/RecentlyViewedTray';
import LiveDealsSection from '../components/marketplace/commerce/LiveDealsSection';
import OfficialStoresSection from '../components/marketplace/commerce/OfficialStoresSection';
import ProductSection from '../components/marketplace/commerce/ProductSection';
import PopularStores from '../components/marketplace/commerce/PopularStores';
import AllProductsBrowser from '../components/marketplace/commerce/AllProductsBrowser';
import { useMarketplaceLang } from '../components/marketplace/commerce/useMarketplaceLang';
import { useStorefrontConfig } from '../components/marketplace/commerce/useStorefrontConfig';

/** Session cache of the product list so revisits render instantly. */
let marketProductsCache: any[] | null = null;

export default function MarketplacePage() {
  const token = useStore((s) => s.token);
  const { t, tCategory } = useMarketplaceLang();
  const storefront = useStorefrontConfig();
  const widgets = storefront?.widgets;
  const promo = storefront?.promoBanner;
  const homeBackWired = useRef(false);
  useLayoutEffect(() => {
    if (homeBackWired.current || window.location.pathname !== '/wevmall') return;
    homeBackWired.current = true;
    const current = window.history.state ?? {};
    const idx = typeof current.idx === 'number' ? current.idx : 0;
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState(current, '', '/home');
    window.history.pushState(
      { ...current, idx: idx + 1, usr: { ...(current.usr ?? {}), marketBackIsHome: true } },
      '',
      here,
    );
  }, []);
  const [products, setProducts] = useState<any[]>(() => marketProductsCache ?? []);
  const [loading, setLoading] = useState(() => !marketProductsCache);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [urlParams] = useSearchParams();

  // The landing view (no search, no category) shows the curated rails plus the
  // server-paginated All Products browser. Any search or category selection
  // falls back to the original client-filtered results grid.
  const isBrowsing = !search.trim() && category === 'All';

  // Support deep links like /wevmall?q=iphone from history and saved searches.
  useEffect(() => {
    const q = urlParams.get('q');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (q && q !== search) setSearch(q);
     
  }, [urlParams]);

  // Reset pagination when search or filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setCurrentPage(1);
  }, [category, condition, search, minPrice, maxPrice, sort, nearbyIds]);

  const loadProducts = async () => {
    if (marketProductsCache) setProducts(marketProductsCache);
    else setLoading(true);
    try {
      const data = await marketFetch('/api/marketplace', token);
      const list = Array.isArray(data) ? data : [];
      marketProductsCache = list;
      setProducts(list);
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
    <div className="w-full min-h-full pb-14 bg-background text-foreground">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleNlpSearch}
        onNlpSearch={handleNlpSearch}
        category={category}
        onCategory={setCategory}
        cartCount={cartCount}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      {promo?.enabled && (promo.text || promo.textBn) && (
        <a
          href={promo.link || undefined}
          className="block mb-3 rounded-lg px-4 py-2 text-center text-xs md:text-sm font-semibold text-white hover:opacity-95"
          style={{ backgroundColor: promo.bgColor || '#f97316' }}
        >
          {t(promo.text || promo.textBn, promo.textBn || promo.text)}
        </a>
      )}
      {widgets?.dailyCheckInEnabled !== false && <DailyCheckInBanner />}

      {sellerFeed.length > 0 && (
        <div className="mb-3 border border-border rounded-lg bg-card p-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            {t('From shops you follow', 'আপনার ফলো করা স্টোর থেকে')}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sellerFeed.slice(0, 12).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => f.product?.id && (window.location.href = `/wevmall/product/${f.product.id}`)}
                className="shrink-0 max-w-[220px] text-left border border-border rounded-md px-3 py-2 hover:border-primary transition-colors"
              >
                <p className="text-[11px] font-bold truncate">{f.seller?.shopName || t('Shop update', 'স্টোর আপডেট')}</p>
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
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-primary to-amber-300">
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
            <BookmarkPlus size={12} /> {t('Save search', 'সার্চ সংরক্ষণ করুন')}
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
              className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {assistantHint && <p className="text-[11px] text-muted-foreground mb-2">{assistantHint}</p>}

      {!search.trim() && category === 'All' && (
        <div className="flex flex-col gap-8 mb-10">
          <MarketplaceHero />
          {(() => {
            // Order controlled by Admin → Storefront Settings → Homepage section order.
            const sections: Record<string, React.ReactNode> = {
              categories: <div id="wevmall-categories" className="scroll-mt-24"><CircularCategories selected={category} onSelect={setCategory} /></div>,
              voucher: <VoucherClaimPill />,
              'recently-viewed': <RecentlyViewedTray />,
              'flash-deals': <div id="wevmall-flash-deals" className="scroll-mt-24"><LiveDealsSection /></div>,
              'official-stores': <OfficialStoresSection />,
              featured: (
                <ProductSection
                  title={t('Featured Products', 'নির্বাচিত পণ্যসমূহ')}
                  countKey="featured"
                  subtitle={t('Hand-picked listings from trusted sellers', 'বিশ্বস্ত সেলারদের বাছাইকৃত সেরা পণ্য')}
                  endpoint="/api/marketplace/feed/featured"
                  viewAllLink="/wevmall/featured-products"
                />
              ),
            };
            const defaults = Object.keys(sections);
            const configured = (storefront?.sectionOrder ?? []).filter((id) => id in sections);
            const order = [...configured, ...defaults.filter((id) => !configured.includes(id))];
            return order.map((id) => <React.Fragment key={id}>{sections[id]}</React.Fragment>);
          })()}
          <ProductSection
            title={t('Trending Products', 'ট্রেন্ডিং পণ্যসমূহ')}
            countKey="trending"
            subtitle={t('What buyers are viewing most right now', 'ক্রেতারা এই মুহূর্তে যেসব পণ্য সবচেয়ে বেশি দেখছেন')}
            endpoint="/api/marketplace/feed/trending"
            viewAllLink="/wevmall/trending-products"
          />
          {token && (
            <ProductSection
              title={t('Recommended For You', 'শুধুমাত্র আপনার জন্য')}
              countKey="recommended"
              subtitle={t('Picked from what you have browsed and saved', 'আপনার পছন্দ ও ব্রাউজিং অনুযায়ী বাছাইকৃত')}
              endpoint="/api/marketplace/feed/recommended"
              viewAllLink="/wevmall/recommended-products"
            />
          )}
          <ProductSection
            title={t('Recently Added', 'নতুন সংযোজন')}
            countKey="new-arrivals"
            subtitle={t('Fresh listings from the last seven days', 'গত ৭ দিনে যুক্ত হওয়া নতুন পণ্যসমূহ')}
            endpoint="/api/marketplace/feed/new-arrivals"
            viewAllLink="/wevmall/new-arrivals"
          />
          <ProductSection
            title={t('Best Sellers', 'সেরা বিক্রিত পণ্য')}
            countKey="best-sellers"
            subtitle={t('The listings buyers order most', 'সবচেয়ে বেশি অর্ডার হওয়া জনপ্রিয় পণ্য')}
            endpoint="/api/marketplace/feed/best-sellers"
            viewAllLink="/wevmall/best-sellers"
          />
          <ProductSection
            title={t('Top Rated Products', 'টপ রেটেড পণ্যসমূহ')}
            countKey="top-rated"
            subtitle={t('Highest rated listings with real reviews', 'ক্রেতাদের সর্বোচ্চ রেটিং ও রিভিউ প্রাপ্ত পণ্য')}
            endpoint="/api/marketplace/feed/top-rated"
            viewAllLink="/wevmall/top-rated"
          />
          <PopularStores />
          {token && (
            <ProductSection
              title={t('Nearby Products', 'আপনার কাছাকাছি পণ্য')}
              endpoint="/api/marketplace/nearby"
              viewAllLink="/wevmall/map"
            />
          )}
        </div>
      )}

      {isBrowsing ? (
        <>
          <div id="wevmall-for-you" className="scroll-mt-24">
          <AllProductsBrowser
            title={t('Just For You • All Products', 'শুধুমাত্র আপনার জন্য • সকল পণ্য')}
            subtitle={t('Browse all products from every category', 'প্রতিটি ক্যাটাগরির সকল পণ্য ব্রাউজ করুন')}
            collection="all"
            viewAllLink="/wevmall/all-products"
          />
          </div>
          <div className="mt-4">
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
        </>
      ) : (
      <>
      <div className="flex flex-col gap-2 mb-3">
        <h1 className="text-lg font-bold text-foreground flex items-baseline gap-2">
          {category === 'All' ? t('Search Results', 'সার্চ ফলাফল') : tCategory(category)}
          <span className="text-xs font-semibold text-muted-foreground">({filtered.length})</span>
        </h1>
      </div>

      <div className="flex items-center justify-between mb-3 md:hidden">
        <p className="text-xs text-muted-foreground font-medium">{filtered.length} {t('products', 'টি পণ্য')}</p>
        <button
          type="button"
          onClick={() => setMobileFilters(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-bold"
        >
          <SlidersHorizontal size={14} /> {t('Filters', 'ফিল্টার')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="hidden lg:block">{filters}</div>
        <div>
          <div className="hidden md:flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-foreground">
              {category === 'All' ? t('All products', 'সকল পণ্য') : tCategory(category)}
              <span className="ml-2 text-xs font-medium text-muted-foreground">({filtered.length})</span>
            </h1>
          </div>
          <ProductGrid
            products={filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
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
          
          {filtered.length > itemsPerPage && (
            <div className="flex flex-col items-center mt-12 mb-8 gap-6">
              {currentPage < Math.ceil(filtered.length / itemsPerPage) && (
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filtered.length / itemsPerPage), prev + 1))}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-[15px] hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {t('Load More Products', 'আরো পণ্য লোড করুন')}
                </button>
              )}

              <div className="flex flex-wrap justify-center items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Prev
                </button>
                
                {Array.from({ length: Math.ceil(filtered.length / itemsPerPage) }).map((_, i) => {
                  const pageNum = i + 1;
                  const totalPages = Math.ceil(filtered.length / itemsPerPage);
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          document.getElementById('main-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-all ${
                          currentPage === pageNum 
                            ? 'bg-primary text-primary-foreground border-transparent shadow-sm' 
                            : 'border border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="text-muted-foreground px-1 font-bold">...</span>;
                  }
                  
                  return null;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filtered.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
      </>
      )}
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
              className="mt-4 w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold"
            >
              Show results
            </button>
          </div>
        </div>
      )}

      <MarketplaceFooter />
      {widgets?.liftDockEnabled !== false && <WevMallLiftDock />}
      </div>
    </div>
  );
}
