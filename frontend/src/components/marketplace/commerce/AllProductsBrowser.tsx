import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, PackageOpen, SlidersHorizontal, X, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../../store';
import { ProductGrid } from './ProductCard';
import { BrowseFilters, BrowseFilterState, EMPTY_BROWSE_FILTERS } from './BrowseFilters';
import { formatCompact, marketFetch } from './utils';

const PAGE_SIZE = 24;

/** Scrolls the app's scroll container, falling back to the window. */
function scrollToTop(anchor?: HTMLElement | null) {
  const container = document.getElementById('main-scroll-area');
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

interface Props {
  title?: string;
  subtitle?: string;
  /** Collection preset understood by /api/marketplace/browse. */
  collection?: string;
  showFilters?: boolean;
  /** Reads and writes ?page= so pagination is shareable and back-button safe. */
  syncUrl?: boolean;
  /** Query string param holding the page number. */
  pageParam?: string;
  searchQuery?: string;
  viewAllLink?: string;
  showHeading?: boolean;
  className?: string;
}

export function AllProductsBrowser({
  title = 'All Products',
  subtitle = 'Browse all products from every category',
  collection = 'all',
  showFilters = true,
  syncUrl = true,
  pageParam = 'page',
  searchQuery = '',
  viewAllLink,
  showHeading = true,
  className = '',
}: Props) {
  const token = useStore((s) => s.token);
  const [params, setParams] = useSearchParams();
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const urlPage = Math.max(1, Number(params.get(pageParam)) || 1);
  const [page, setPage] = useState(urlPage);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BrowseFilterState>({ ...EMPTY_BROWSE_FILTERS });
  const [mobileFilters, setMobileFilters] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Load More appends onto the current page rather than replacing it, so the
  // user keeps everything they have already scrolled past.
  const [appendedPages, setAppendedPages] = useState<number[]>([]);
  const filtersReady = useRef(false);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('limit', String(PAGE_SIZE));
    if (collection && collection !== 'all') q.set('collection', collection);
    if (searchQuery.trim()) q.set('q', searchQuery.trim());
    if (filters.category !== 'All') q.set('category', filters.category);
    if (filters.condition !== 'All') q.set('condition', filters.condition);
    if (filters.location !== 'All') q.set('location', filters.location);
    if (filters.sellerId !== 'All') q.set('sellerId', filters.sellerId);
    if (filters.rating) q.set('rating', filters.rating);
    if (filters.minPrice) q.set('minPrice', filters.minPrice);
    if (filters.maxPrice) q.set('maxPrice', filters.maxPrice);
    if (filters.sort) q.set('sort', filters.sort);
    return q.toString();
  }, [collection, searchQuery, filters]);

  const fetchPage = useCallback(
    async (targetPage: number, mode: 'replace' | 'append') => {
      if (mode === 'append') setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await marketFetch(`/api/marketplace/browse?${queryString}&page=${targetPage}`, token);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setProducts((prev) => {
          if (mode === 'replace') return data.products || [];
          const seen = new Set(prev.map((p: any) => p.id));
          return [...prev, ...(data.products || []).filter((p: any) => !seen.has(p.id))];
        });
        setError(null);
      } catch (e: any) {
        setError(e.message || 'We could not load products right now.');
        if (mode === 'replace') setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [queryString, token]
  );

  // Filters or the search term changed: reset back to page one.
  // Skip the first run so a deep link like ?page=3 is not wiped on mount.
  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      return;
    }
    setPage(1);
    setAppendedPages([]);
    if (syncUrl && params.get(pageParam)) {
      const next = new URLSearchParams(params);
      next.delete(pageParam);
      setParams(next, { replace: true });
    }
     
  }, [queryString]);

  // Keep local page in sync with back/forward navigation.
  useEffect(() => {
    if (!syncUrl) return;
    if (urlPage !== page) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPage(urlPage);
      setAppendedPages([]);
    }
     
  }, [urlPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchPage(page, 'replace');
  }, [page, fetchPage]);

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/wishlist', token)
      .then((w) => setWishlistIds(new Set((Array.isArray(w) ? w : []).map((x: any) => x.productId))))
      .catch(() => {});
  }, [token]);

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped === page && !appendedPages.length) return;
    setAppendedPages([]);
    setPage(clamped);
    if (syncUrl) {
      const q = new URLSearchParams(params);
      if (clamped === 1) q.delete(pageParam);
      else q.set(pageParam, String(clamped));
      setParams(q);
    }
    scrollToTop(anchorRef.current);
  };

  const loadMore = () => {
    const next = page + appendedPages.length + 1;
    if (next > totalPages || loadingMore) return;
    setAppendedPages((prev) => [...prev, next]);
    fetchPage(next, 'append');
  };

  const lastLoadedPage = page + appendedPages.length;
  const hasMore = lastLoadedPage < totalPages;

  // Windowed page numbers: first, last, and a band around the current page.
  const pageNumbers = useMemo(() => {
    const out: (number | 'gap')[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) out.push(i);
      else if (out[out.length - 1] !== 'gap') out.push('gap');
    }
    return out;
  }, [page, totalPages]);

  const filterRail = <BrowseFilters value={filters} onChange={setFilters} />;

  return (
    <section className={`w-full ${className}`} ref={anchorRef}>
      {showHeading && (
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground flex items-baseline gap-2">
            {title}
            <span className="text-sm font-medium text-muted-foreground">
              ({formatCompact(total)})
            </span>
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-sm font-medium text-primary hover:text-primary flex items-center gap-1 group whitespace-nowrap"
            >
              See More <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          {showFilters && (
            <button
              type="button"
              onClick={() => setMobileFilters(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-bold"
            >
              <SlidersHorizontal size={14} /> Filters
            </button>
          )}
        </div>
      </div>
      )}

      {!showHeading && showFilters && (
        <div className="flex justify-end mb-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-bold"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      )}

      <div className={showFilters ? 'grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4' : ''}>
        {showFilters && <div className="hidden lg:block">{filterRail}</div>}

        <div className="min-w-0">
          {error && !loading ? (
            <div className="border border-border rounded-lg p-10 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-3" />
              <p className="font-bold text-sm">Something went wrong</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchPage(page, 'replace')}
                className="mt-4 px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary transition-colors"
              >
                Try again
              </button>
            </div>
          ) : !loading && products.length === 0 ? (
            <div className="border border-border rounded-lg p-12 text-center">
              <PackageOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-bold text-sm">No products match these filters</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try widening the price range, clearing the location, or picking another category.
              </p>
              <button
                type="button"
                onClick={() => setFilters({ ...EMPTY_BROWSE_FILTERS })}
                className="mt-4 px-5 py-2 rounded-full border border-border text-xs font-bold hover:border-primary hover:text-primary transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <ProductGrid
                products={products}
                loading={loading}
                wishlistIds={wishlistIds}
                onWishlistChange={(id, wished) =>
                  setWishlistIds((prev) => {
                    const next = new Set(prev);
                    if (wished) next.add(id);
                    else next.delete(id);
                    return next;
                  })
                }
              />
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="flex flex-col items-center gap-6 mt-10 mb-4">
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-primary text-white font-bold text-[15px] hover:bg-primary hover:shadow-lg shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-wait transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Loading…
                    </>
                  ) : (
                    'Load More Products'
                  )}
                </button>
              )}

              <p className="text-xs text-muted-foreground">
                Showing {formatCompact(products.length)} of {formatCompact(total)} products
              </p>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="w-full flex justify-start sm:justify-center overflow-x-auto hide-scrollbar"
                >
                  <div className="flex items-center gap-1.5 px-1">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 h-9 flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm shrink-0"
                    >
                      Previous
                    </button>

                    {pageNumbers.map((p, i) =>
                      p === 'gap' ? (
                        <span key={`gap-${i}`} className="px-1 text-muted-foreground font-bold shrink-0">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          aria-current={page === p ? 'page' : undefined}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm shrink-0 transition-all ${
                            page === p
                              ? 'bg-primary text-white shadow-sm scale-105'
                              : 'border border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 h-9 flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm shrink-0"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>

      {showFilters && mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl border-t border-border p-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Filters</h2>
              <button type="button" onClick={() => setMobileFilters(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            {filterRail}
            <button
              type="button"
              onClick={() => setMobileFilters(false)}
              className="mt-4 w-full py-2.5 rounded-md bg-primary text-white text-sm font-bold"
            >
              Show {formatCompact(total)} results
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default AllProductsBrowser;
