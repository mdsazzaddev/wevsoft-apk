/**
 * /spaces — Explore Spaces + the viewer's own Spaces (spec §9), and the
 * category directory at /spaces/category/:slug (§11).
 *
 * Discovery and search are two different server endpoints, so the page keeps a
 * single result list and swaps which endpoint fills it: typing a query switches
 * to /api/spaces/search, clearing it returns to /api/spaces/discover with the
 * chosen sort and filters.
 *
 * The category filter has two homes. On /spaces it is a query parameter like
 * every other filter; on /spaces/category/:slug the *path* is the filter, which
 * is the form crawlers get to index (§12), so the two never appear at once.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Heart,
  BadgeCheck,
  Briefcase,
  ChevronLeft,
  Clock3,
  Compass,
  Flame,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  SPACES_DIRECTORY_PATH,
  SPACE_TYPES,
  spaceCategoryFromSlug,
  spaceCategoryPath,
  spaceCategorySlug,
  spaceDirectorySeo,
} from '@wevsoft/shared/wevspace';
import {
  discoverSpaces,
  fetchSpaceCategories,
  searchSpaces,
  type SpaceCardPayload,
} from '../lib/wevspaceApi';
import { usePageSeo } from '../lib/pageSeo';
import { useStore } from '../store';
import SpaceCard from '../components/wevspace/SpaceCard';
import CreateSpaceDropdown from '../components/wevspace/CreateSpaceDropdown';
import { spaceTypeLabelBn } from '../components/wevspace/spaceTypeBn';
import SpaceLangSwitch from '../components/wevspace/SpaceLangSwitch';
import SpaceFeatureTour, { isSpaceFeatureTourDismissed } from '../components/wevspace/SpaceFeatureTour';
import { WevSpaceIcon } from '../components/wevspace/WevSpaceIcon';
import MySpacesSection from '../components/wevspace/MySpacesSection';
import FollowingSpacesGrid from '../components/wevspace/FollowingSpacesGrid';
import FeaturedSpacesStrip from '../components/wevspace/FeaturedSpacesStrip';
import { SpacesNavButton } from '../components/wevspace/SpacesSidebar';
import { SpaceCardGridSkeleton } from '../components/wevspace/SpaceSkeletons';
import { useMarketplaceLang } from '../components/marketplace/commerce/useMarketplaceLang';

const PAGE_SIZE = 24;

const SORTS = [
  { id: 'recommended', label: 'Recommended', bn: 'প্রস্তাবিত', icon: Sparkles },
  { id: 'trending', label: 'Trending', bn: 'ট্রেন্ডিং', icon: Flame },
  { id: 'popular', label: 'Popular', bn: 'জনপ্রিয়', icon: Users },
  { id: 'new', label: 'New', bn: 'নতুন', icon: Clock3 },
  { id: 'verified', label: 'Verified', bn: 'ভেরিফায়েড', icon: BadgeCheck },
  { id: 'friends', label: 'Followed by friends', bn: 'বন্ধুরা ফলো করেন', icon: Users },
] as const;

type SortId = (typeof SORTS)[number]['id'];

/** Session cache of the first page per browse state (query/sort/filters). */
const spacesListCache = new Map<string, { spaces: SpaceCardPayload[]; total: number }>();

export default function SpacesPage() {
  const user = useStore((s) => s.user);
  const { t, formatNum } = useMarketplaceLang();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { categorySlug } = useParams();
  // Back from the directory itself always returns Home, even if the user
  // opened Spaces from another page. Category pages keep normal history.
  const homeBackWired = useRef(false);
  useLayoutEffect(() => {
    if (categorySlug || homeBackWired.current) return;
    homeBackWired.current = true;
    const current = window.history.state ?? {};
    const idx = typeof current.idx === 'number' ? current.idx : 0;
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState(current, '', '/home');
    window.history.pushState(
      { ...current, idx: idx + 1, usr: { ...(current.usr ?? {}), spacesBackIsHome: true } },
      '',
      here,
    );
  }, [categorySlug]);

  // "My Spaces" needs an account; the directory itself does not (§12 — it is an
  // indexed page, so an anonymous visitor sees exactly what a crawler sees).
  const rawView = params.get('view') || params.get('tab');
  const view: 'explore' | 'mine' | 'following' =
    user && rawView === 'mine' ? 'mine' : user && rawView === 'following' ? 'following' : 'explore';

  const [query, setQuery] = useState(params.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [sort, setSort] = useState<SortId>((params.get('sort') as SortId) || 'recommended');
  // Sidebar links (e.g. Trending) change ?sort= while this page stays mounted.
  const urlSort = params.get('sort') as SortId | null;
  const [seenUrlSort, setSeenUrlSort] = useState(urlSort);
  if (urlSort !== seenUrlSort) {
    setSeenUrlSort(urlSort);
    setSort(urlSort || 'recommended');
  }
  const [queryCategory, setQueryCategory] = useState(params.get('category') || '');
  const [spaceType, setSpaceType] = useState(params.get('type') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The fixed tour bar sits over the page bottom; reserve room so Load more stays reachable.
  const [tourOpen, setTourOpen] = useState(() => !isSpaceFeatureTourDismissed());

  const [spaces, setSpaces] = useState<SpaceCardPayload[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  /**
   * The label behind the URL slug. The fixed vocabulary answers first, but a
   * Space may type its own category, so the categories actually in use are the
   * fallback — otherwise a real, populated category page would claim not to
   * exist while the crawler was being served its contents.
   */
  const pathCategory = useMemo(() => {
    if (!categorySlug) return null;
    const known = spaceCategoryFromSlug(categorySlug);
    if (known) return known;
    const wanted = spaceCategorySlug(categorySlug);
    return categories.find((row) => spaceCategorySlug(row.category) === wanted)?.category || null;
  }, [categorySlug, categories]);

  /** Still waiting on the categories list before we can say either way. */
  const categoryPending = !!categorySlug && !pathCategory && !categoriesLoaded;
  const unknownCategory = !!categorySlug && !pathCategory && categoriesLoaded;

  // One filter, two sources. The path wins, so a category URL cannot be silently
  // overridden by a leftover query parameter.
  const category = pathCategory || (categorySlug ? '' : queryCategory);

  /** Discards responses from a request that a newer one has already replaced. */
  const requestId = useRef(0);

  useEffect(() => {
    fetchSpaceCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoaded(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // The URL carries the whole browse state so a filtered view is shareable and
  // survives a refresh or a back-navigation from a Space page.
  useEffect(() => {
    const next = new URLSearchParams();
    if (view === 'mine') next.set('view', 'mine');
    if (debouncedQuery) next.set('q', debouncedQuery);
    if (sort !== 'recommended') next.set('sort', sort);
    // Omitted on a category path — the path is already the category, and two
    // URLs for one filter is exactly what canonicalisation exists to prevent.
    if (queryCategory && !categorySlug) next.set('category', queryCategory);
    if (spaceType) next.set('type', spaceType);
    if (location) next.set('location', location);
    // A sort the user picked is its own history entry so Back returns to the
    // previous sort; typing and filter syncs keep replacing the current entry.
    const sortChanged = (params.get('sort') || 'recommended') !== sort;
    setParams(next, { replace: !sortChanged });
  }, [view, debouncedQuery, sort, queryCategory, categorySlug, spaceType, location]);

  const load = useCallback(
    async (offset: number) => {
      const id = ++requestId.current;
      const cacheKey = JSON.stringify([debouncedQuery, sort, category, spaceType, location]);
      const cached = offset === 0 ? spacesListCache.get(cacheKey) : undefined;
      if (cached) {
        // Last result shows instantly and refreshes in the background.
        setSpaces(cached.spaces);
        setTotal(cached.total);
        setLoading(false);
      } else if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = debouncedQuery
          ? await searchSpaces(debouncedQuery, PAGE_SIZE, offset)
          : await discoverSpaces({ sort, category, type: spaceType, location, limit: PAGE_SIZE, offset });
        if (id !== requestId.current) return;
        setSpaces((current) => (offset === 0 ? res.spaces : [...current, ...res.spaces]));
        setTotal(res.total || 0);
        if (offset === 0) spacesListCache.set(cacheKey, { spaces: res.spaces, total: res.total || 0 });
      } catch (err: any) {
        if (id !== requestId.current) return;
        setError(err?.message || 'Could not load Space');
        if (offset === 0 && !cached) setSpaces([]);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, sort, category, spaceType, location],
  );

  useEffect(() => {
    if (view !== 'explore') return;
    // Asking the server before the slug resolves would briefly list *every*
    // Space on a page whose URL promises one category.
    if (categoryPending) return;
    // A slug that names no category has nothing to ask the server for.
    if (unknownCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSpaces([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    void load(0);
  }, [view, load, categoryPending, unknownCategory]);

  /**
   * §12. The crawler already gets a rewritten head from `wevspace.seo.ts`; this
   * is the same information for JavaScript-rendering crawlers and for anyone who
   * copies the address bar mid-session. Faceted views — a search, a non-default
   * sort, a filter, My Spaces — are thin near-duplicates of the directory, so
   * they render normally but ask to stay out of the index. The clean category
   * paths are the crawlable surface.
   */
  const seo = useMemo(() => {
    const faceted =
      view === 'mine' ||
      !!debouncedQuery ||
      sort !== 'recommended' ||
      !!spaceType ||
      !!location ||
      (!!queryCategory && !categorySlug);
    const base = spaceDirectorySeo(pathCategory, pathCategory && !faceted ? total : null);
    return {
      ...base,
      // A slug that names nothing describes itself as such, word for word the
      // way the crawler renderer does — the two heads must not disagree.
      ...(unknownCategory ? { description: 'That Space category does not exist.' } : {}),
      canonical: pathCategory ? spaceCategoryPath(pathCategory) : SPACES_DIRECTORY_PATH,
      // An empty or unknown category is a real page with nothing to rank for.
      robots:
        faceted || unknownCategory || (!!pathCategory && !loading && total === 0)
          ? 'noindex, follow'
          : undefined,
    };
  }, [
    view,
    debouncedQuery,
    sort,
    spaceType,
    location,
    queryCategory,
    categorySlug,
    pathCategory,
    unknownCategory,
    total,
    loading,
  ]);

  // Nothing is written to the head until the slug has resolved — announcing the
  // generic directory title first would be wrong for a moment and indexable.
  usePageSeo(categoryPending ? null : seo);

  const activeFilters = useMemo(
    () => [category, spaceType, location].filter(Boolean).length,
    [category, spaceType, location],
  );

  /**
   * Switching category on a clean category URL means navigating — never stacking
   * a competing `?category=` onto a path that already declares one.
   */
  const chooseCategory = (next: string) => {
    if (categorySlug) {
      navigate(next ? spaceCategoryPath(next) : SPACES_DIRECTORY_PATH);
      return;
    }
    setQueryCategory(next);
  };

  const clearFilters = () => {
    setSpaceType('');
    setLocation('');
    chooseCategory('');
  };

  const setView = (next: 'explore' | 'mine' | 'following') => {
    // "My Spaces" / "Following" are not directory views, so they always live on /spaces.
    if (next !== 'explore' && categorySlug) {
      navigate(`${SPACES_DIRECTORY_PATH}?view=${next}`);
      return;
    }
    const updated = new URLSearchParams(params);
    updated.delete('tab');
    if (next !== 'explore') updated.set('view', next);
    else updated.delete('view');
    setParams(updated, { replace: true });
  };

  /**
   * §11. Real links between the directory pages — useful to a visitor browsing
   * sideways, and the only way a crawler discovers the category URLs at all.
   */
  const categoryChips = useMemo(() => {
    const rows = categories.filter((row) => !!row.category);
    if (pathCategory && !rows.some((row) => row.category === pathCategory)) {
      return [{ category: pathCategory, count: 0 }, ...rows];
    }
    return rows;
  }, [categories, pathCategory]);

  const hasMore = spaces.length > 0 && spaces.length < total;

  return (
    <div className={`w-full max-w-[1200px] mx-auto px-4 sm:px-6 ${tourOpen ? 'pb-56 md:pb-44' : 'pb-24'} relative min-w-0`}>
      {/* 1. Hero Banner */}
      <div
        className="relative w-full rounded-3xl text-primary-foreground overflow-visible mb-4 mt-3 shadow-md px-5 py-6 sm:px-8 sm:py-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
        style={{
          background:
            'radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, white 18%, transparent), transparent 55%), linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 65%, black))',
        }}
      >
        <div className="relative z-10 min-w-0">
          {pathCategory && (
            <Link
              to={SPACES_DIRECTORY_PATH}
              className="inline-flex items-center gap-1 mb-2 text-xs font-extrabold text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <ChevronLeft size={13} /> {t('All Space', 'সব স্পেস')}
            </Link>
          )}
          <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            <SpacesNavButton />
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
              <WevSpaceIcon size={22} className="text-primary-foreground" />
            </div>
            {pathCategory ? `${pathCategory} ${t('Space', 'স্পেস')}` : t('Space', 'স্পেস')}
          </h1>
          <p className="text-sm sm:text-base text-primary-foreground/85 font-medium mt-2 max-w-xl">
            {pathCategory
              ? t(`Public ${pathCategory} presences on Wevsoft you can follow, message and explore.`, `Wevsoft-এর পাবলিক ${pathCategory} স্পেস — ফলো করুন, মেসেজ দিন ও ঘুরে দেখুন।`)
              : t('Public presences on Wevsoft — creators, businesses, brands, communities and more.', 'Wevsoft-এর পাবলিক উপস্থিতি — ক্রিয়েটর, ব্যবসা, ব্র্যান্ড, কমিউনিটি এবং আরও অনেক কিছু।')}
          </p>
        </div>

        <div className="shrink-0 z-10 flex w-full sm:w-auto items-center gap-2">
          {/* Language switch — shares wevmall_lang with the marketplace. */}
          <SpaceLangSwitch variant="hero" />
          <CreateSpaceDropdown className="flex-1 sm:flex-none" />
        </div>
      </div>

      <SpaceFeatureTour onDismiss={() => setTourOpen(false)} />

      {/* View switch — only meaningful once there is an account to own Spaces. */}
      {user && (
        <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-muted">
          <button
            type="button"
            onClick={() => setView('explore')}
            aria-pressed={view === 'explore'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              view === 'explore' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass size={15} /> {t('Explore', 'এক্সপ্লোর')}
          </button>
          <button
            type="button"
            onClick={() => setView('mine')}
            aria-pressed={view === 'mine'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              view === 'mine' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <WevSpaceIcon size={15} /> {t('My Space', 'আমার স্পেস')}
          </button>
          <button
            type="button"
            onClick={() => setView('following')}
            aria-pressed={view === 'following'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              view === 'following' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart size={15} /> {t('Following', 'ফলো করছেন')}
          </button>
        </div>
      )}

      {view === 'mine' ? (
        <MySpacesSection className="mt-5" />
      ) : view === 'following' ? (
        <FollowingSpacesGrid className="mt-5" />
      ) : (
        <>
          {/* Search + filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search by name, @username, category or keyword', 'নাম, @ইউজারনেম, ক্যাটাগরি বা কিওয়ার্ড দিয়ে খুঁজুন')}
                aria-label={t('Search Space', 'স্পেস খুঁজুন')}
                className="w-full pl-10 pr-10 h-11 rounded-xl bg-card border border-border text-sm font-medium outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('Clear search', 'সার্চ মুছুন')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`inline-flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl border text-sm font-semibold transition-colors ${
                activeFilters > 0 ? 'border-primary/60 text-primary' : 'bg-card border-border hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal size={15} /> {t('Filters', 'ফিল্টার')}
              {activeFilters > 0 && (
                <span className="px-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-black">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-3 bg-card border border-border rounded-3xl p-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">{t('Space type', 'স্পেসের ধরন')}</span>
                <select
                  value={spaceType}
                  onChange={(e) => setSpaceType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                >
                  <option value="">{t('Any type', 'যেকোনো ধরন')}</option>
                  {SPACE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {t(type.label, spaceTypeLabelBn(type.id))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">{t('Category', 'ক্যাটাগরি')}</span>
                <select
                  value={category}
                  onChange={(e) => chooseCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                >
                  <option value="">{t('Any category', 'যেকোনো ক্যাটাগরি')}</option>
                  {categoryChips.map((row) => (
                    <option key={row.category} value={row.category}>
                      {row.category}
                      {row.count > 0 ? ` (${row.count})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">{t('Location', 'লোকেশন')}</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t('City or region', 'শহর বা অঞ্চল')}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                  />
                  {(user as any)?.location && (
                    <button
                      type="button"
                      onClick={() => setLocation(String((user as any).location))}
                      className="inline-flex items-center gap-1 px-2.5 rounded-xl bg-muted text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MapPin size={13} /> {t('Near me', 'আমার কাছে')}
                    </button>
                  )}
                </div>
              </label>

              {activeFilters > 0 && (
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={13} /> {t('Clear filters', 'ফিল্টার মুছুন')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sorts are meaningless while searching — the server ranks by relevance. */}
          {!debouncedQuery && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {SORTS.map((option) => {
                const Icon = option.icon;
                const active = sort === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSort(option.id)}
                    aria-pressed={active}
                    className={`inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} /> {t(option.label, option.bn)}
                  </button>
                );
              })}
            </div>
          )}

          {/* §11. Category directories, as real links a crawler can follow. */}
          {!debouncedQuery && categoryChips.length > 0 && (
            <nav aria-label={t('Space categories', 'স্পেস ক্যাটাগরি')} className="mt-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categoryChips.map((row) => {
                  const active = row.category === pathCategory;
                  return (
                    <Link
                      key={row.category}
                      to={active ? SPACES_DIRECTORY_PATH : spaceCategoryPath(row.category)}
                      // The highlighted chip is a *clear* control, not a self
                      // link, so it must not claim aria-current — it navigates
                      // away. The label spells out what the X does, which is
                      // otherwise information only sighted visitors get; "you
                      // are here" comes from the heading and the back link.
                      aria-label={active ? `Clear the ${row.category} category` : undefined}
                      className={`inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors ${
                        active
                          ? 'bg-foreground text-background border-transparent'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {row.category}
                      {active ? <X size={12} /> : null}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          {!debouncedQuery && !category && sort === 'recommended' && (
            <FeaturedSpacesStrip onSeeAll={() => setSort('trending')} />
          )}

          {/* Results */}
          <div className="mt-5">
            {unknownCategory ? (
              <div className="border-2 border-dashed border-border rounded-3xl p-10 text-center">
                <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
                  <Compass size={20} />
                </span>
                <p className="mt-3 font-black text-sm">{t('No such category', 'এমন কোনো ক্যাটাগরি নেই')}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  “{categorySlug}” isn’t a WevSpace category. Browse the whole directory instead.
                </p>
                <Link
                  to={SPACES_DIRECTORY_PATH}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <Compass size={14} /> All Space
                </Link>
              </div>
            ) : loading ? (
              <SpaceCardGridSkeleton count={8} variant="wide" />
            ) : error ? (
               <div className="bg-card border border-border rounded-3xl p-8 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  type="button"
                  onClick={() => void load(0)}
                  className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {t('Try again', 'আবার চেষ্টা করুন')}
                </button>
              </div>
            ) : spaces.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-3xl p-10 text-center">
                <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
                  <Compass size={20} />
                </span>
                <p className="mt-3 font-black text-sm">
                  {debouncedQuery
                    ? `${t('No Space matches', 'কোনো স্পেস মেলেনি')} “${debouncedQuery}”`
                    : pathCategory
                      ? t(`No ${pathCategory} Space yet`, `এখনো কোনো ${pathCategory} স্পেস নেই`)
                      : t('Nothing to show here yet', 'এখনো দেখানোর মতো কিছু নেই')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  {sort === 'friends' && !debouncedQuery
                    ? t('None of your friends follow a Space yet. Try Trending or Recommended.', 'আপনার কোনো বন্ধু এখনো কোনো স্পেস ফলো করেন না। ট্রেন্ডিং বা প্রস্তাবিত দেখুন।')
                    : t('Try a different search, clear your filters, or create the first Space in this category.', 'অন্যভাবে খুঁজুন, ফিল্টার মুছুন, অথবা এই ক্যাটাগরিতে প্রথম স্পেসটি তৈরি করুন।')}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-muted-foreground mb-3">
                  {formatNum(total)}{t(' Space', 'টি স্পেস')}
                  {debouncedQuery ? ` ${t('matching', 'মিলছে')} “${debouncedQuery}”` : ''}
                </p>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                  {spaces.map((space) => (
                    <SpaceCard key={space.id} space={space} variant="wide" />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void load(spaces.length)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                    >
                      {loadingMore && <Loader2 size={15} className="animate-spin" />}
                      {t('Load more', 'আরও দেখুন')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
