import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  LayoutGrid,
  LoaderCircle,
  MessageSquareText,
  Orbit,
  Search,
  ShoppingBag,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import UserAvatar from '../components/UserAvatar';
import { AuthorAvatar, AuthorVerifiedBadge } from '../components/social/ContentAuthor';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { SIDEBAR_NAV_ITEMS } from '../lib/sidebarNav';
import { WEVSOFT_PRODUCTS } from '../lib/wevsoftProducts';

/**
 * Resolve the original app icon for a route: main sidebar nav first, then the
 * Wevsoft product catalog (e.g. WevSpaces), falling back to a generic icon.
 */
function appIcon(path: string, fallback: React.ElementType): React.ElementType {
  return (
    SIDEBAR_NAV_ITEMS.find((item) => item.to === path)?.icon ??
    WEVSOFT_PRODUCTS.find((product) => product.path === path)?.icon ??
    fallback
  );
}

const PeopleIcon = appIcon('/friends', Users);
const ReelsIcon = appIcon('/reels', Film);
const WevMallIcon = appIcon('/wevmall', ShoppingBag);
const SpacesIcon = appIcon('/spaces', Orbit);
const JobsIcon = appIcon('/jobs', Briefcase);
const EventsIcon = appIcon('/events', CalendarDays);
const GroupsIcon = appIcon('/groups', UsersRound);
const VideosIcon = appIcon('/videos', LayoutGrid);

type SearchCategory =
  | 'all'
  | 'people'
  | 'posts'
  | 'reels'
  | 'marketplace'
  | 'spaces'
  | 'jobs'
  | 'events'
  | 'groups';

type ExploreResults = {
  query: string;
  users: any[];
  posts: any[];
  reels: any[];
  products: any[];
  jobs: any[];
  events: any[];
  spaces: any[];
  groups: any[];
};

const EMPTY_RESULTS: ExploreResults = {
  query: '',
  users: [],
  posts: [],
  reels: [],
  products: [],
  jobs: [],
  events: [],
  spaces: [],
  groups: [],
};

const CATEGORY_IDS: SearchCategory[] = [
  'all',
  'people',
  'posts',
  'reels',
  'marketplace',
  'spaces',
  'jobs',
  'events',
  'groups',
];

const categories: Array<{ id: SearchCategory; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All', icon: Compass },
  { id: 'people', label: 'People', icon: PeopleIcon },
  { id: 'posts', label: 'Posts', icon: MessageSquareText },
  { id: 'reels', label: 'Reels', icon: ReelsIcon },
  { id: 'marketplace', label: 'WevMall', icon: WevMallIcon },
  { id: 'spaces', label: 'Spaces', icon: SpacesIcon },
  { id: 'jobs', label: 'Jobs', icon: JobsIcon },
  { id: 'events', label: 'Events', icon: EventsIcon },
  { id: 'groups', label: 'Groups', icon: GroupsIcon },
];

const discoveryLinks = [
  { title: 'Trending reels', description: 'Watch what people are sharing now', to: '/reels', icon: ReelsIcon, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { title: 'WevMall finds', description: 'Discover products and local sellers', to: '/wevmall', icon: WevMallIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { title: 'WevSpaces', description: 'Browse public brands, stores and communities', to: '/spaces', icon: SpacesIcon, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { title: 'People to know', description: 'Find classmates, creators and professionals', to: '/friends', icon: PeopleIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { title: 'Jobs for you', description: 'Browse opportunities and growing teams', to: '/jobs', icon: JobsIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { title: 'Upcoming events', description: 'See campus, community and live events', to: '/events', icon: EventsIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { title: 'Groups', description: 'Join public communities and forums', to: '/groups', icon: GroupsIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { title: 'Watch videos', description: 'Explore longer videos from Wevsoft creators', to: '/videos', icon: VideosIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

function parseCategory(value: string | null): SearchCategory {
  if (value && CATEGORY_IDS.includes(value as SearchCategory)) return value as SearchCategory;
  return 'all';
}

export default function ExplorePage() {
  const token = useStore((state) => state.token);
  const { isSpaceMode } = useSpaceIdentities();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<SearchCategory>(() => parseCategory(searchParams.get('cat')));
  const [results, setResults] = useState<ExploreResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setQuery(searchParams.get('q') || '');
    setCategory(parseCategory(searchParams.get('cat')));
  }, [searchParams]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/ai/search?q=${encodeURIComponent(normalized)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Search request failed');
        const data = await response.json();
        setResults({ ...EMPTY_RESULTS, ...data, query: data.query || normalized });

        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('q', normalized);
            return next;
          },
          { replace: true },
        );
      } catch (requestError: any) {
        if (requestError?.name !== 'AbortError') {
          setError('Search is unavailable right now. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, token, setSearchParams]);

  const counts = useMemo(
    () => ({
      all:
        results.users.length +
        results.posts.length +
        results.reels.length +
        results.products.length +
        results.jobs.length +
        results.events.length +
        results.spaces.length +
        results.groups.length,
      people: results.users.length,
      posts: results.posts.length,
      reels: results.reels.length,
      marketplace: results.products.length,
      spaces: results.spaces.length,
      jobs: results.jobs.length,
      events: results.events.length,
      groups: results.groups.length,
    }),
    [results],
  );

  const hasQuery = query.trim().length >= 2;
  const show = (section: SearchCategory) => category === 'all' || category === section;

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setError('');
      setSearchParams({}, { replace: true });
    }
  };

  const selectCategory = (next: SearchCategory) => {
    setCategory(next);
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const params: Record<string, string> = { q: normalized };
    if (next !== 'all') params.cat = next;
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <header className="border-b border-border pb-5 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Search & Explore</h1>
            <p className="text-sm text-muted-foreground">
              Find people, posts, reels, products, WevSpaces, jobs, events and groups.
            </p>
          </div>
        </div>

        <label className="relative mt-5 block">
          {loading ? (
            <LoaderCircle className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-primary" size={20} />
          ) : (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          )}
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search Wevsoft"
            className="h-12 w-full rounded-lg border border-border bg-card pl-12 pr-12 text-base outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => updateQuery('')}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </label>
        {query.trim().length === 1 && (
          <p className="mt-2 text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        )}
      </header>

      {hasQuery && (
        <CategoryScrollNav
          category={category}
          onSelect={selectCategory}
        />
      )}

      {!hasQuery ? (
        <DiscoveryGrid />
      ) : error ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-rose-500">{error}</p>
          <button
            type="button"
            onClick={() => setQuery((value) => `${value} `)}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : loading && counts.all === 0 ? (
        <div className="py-16 text-center text-sm font-medium text-muted-foreground animate-pulse">
          Searching across Wevsoft…
        </div>
      ) : !loading && counts.all === 0 ? (
        <div className="py-16 text-center">
          <Search className="mx-auto text-muted-foreground/50" size={36} />
          <h2 className="mt-4 text-lg font-bold">No results for "{query.trim()}"</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check the spelling or try a broader search.</p>
        </div>
      ) : (
        <div className="space-y-8 py-6">
          {show('people') && results.users.length > 0 && <PeopleResults users={results.users} />}
          {show('posts') && results.posts.length > 0 && <PostResults posts={results.posts} />}
          {show('reels') && results.reels.length > 0 && <ReelResults reels={results.reels} />}
          {show('marketplace') && results.products.length > 0 && <ProductResults products={results.products} />}
          {show('spaces') && results.spaces.length > 0 && <SpaceResults spaces={results.spaces} />}
          {show('jobs') && results.jobs.length > 0 && <JobResults jobs={results.jobs} />}
          {show('events') && results.events.length > 0 && <EventResults events={results.events} />}
          {show('groups') && results.groups.length > 0 && <GroupResults groups={results.groups} />}
        </div>
      )}
    </div>
  );
}

function CategoryScrollNav({
  category,
  onSelect,
}: {
  category: SearchCategory;
  onSelect: (id: SearchCategory) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollHints();
    const el = navRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    const observer = new ResizeObserver(updateScrollHints);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      observer.disconnect();
    };
  }, [updateScrollHints]);

  const scrollBy = (delta: number) => {
    navRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollBtn =
    'absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-muted hover:text-foreground';

  return (
    <div className="relative border-b border-border py-4">
      {canScrollLeft && (
        <button
          type="button"
          className={`${scrollBtn} left-0`}
          onClick={() => scrollBy(-160)}
          aria-label="Scroll categories left"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          className={`${scrollBtn} right-0`}
          onClick={() => scrollBy(160)}
          aria-label="Scroll categories right"
        >
          <ChevronRight size={18} />
        </button>
      )}
      <nav
        ref={navRef}
        className={`flex gap-2 overflow-x-auto no-scrollbar scroll-smooth ${canScrollLeft ? 'pl-9' : ''} ${canScrollRight ? 'pr-9' : ''}`}
        aria-label="Search categories"
      >
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
              category === id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DiscoveryGrid() {
  const { isSpaceMode } = useSpaceIdentities();
  const links = isSpaceMode
    ? discoveryLinks.filter((link) => link.to !== '/friends')
    : discoveryLinks;
  return (
    <section className="py-7">
      <h2 className="text-lg font-bold">Explore Wevsoft</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ title, description, to, icon: Icon, color, bg }) => (
          <Link
            key={to + title}
            to={to}
            className="flex min-h-[92px] items-center gap-4 rounded-lg border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-muted/40"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
              <Icon size={21} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs font-semibold text-muted-foreground">{count} results</span>
      </div>
      {children}
    </section>
  );
}

function PeopleResults({ users }: { users: any[] }) {
  return (
    <Section title="People" count={users.length}>
      <div className="grid gap-3 sm:grid-cols-2">
        {users.map((user) => (
          <Link
            key={user.id}
            to={`/u/${user.username || user.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/40"
          >
            <UserAvatar user={user} className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <h3 className="truncate font-bold">{user.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {user.username ? `@${user.username}` : user.bio || 'Wevsoft member'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function PostResults({ posts }: { posts: any[] }) {
  return (
    <Section title="Posts" count={posts.length}>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {posts.map((post) => {
          const author = resolveContentAuthor(post);
          return (
            <article key={post.id} className="p-4">
              <div className="flex items-center gap-2">
                {author.href ? (
                  <Link to={author.href} className="shrink-0" aria-label={`Open ${author.name} profile`}>
                    <AuthorAvatar author={author} className="h-8 w-8" radius="rounded-lg" decorative />
                  </Link>
                ) : (
                  <AuthorAvatar author={author} className="h-8 w-8" radius="rounded-lg" />
                )}
                <div className="min-w-0">
                  {author.href ? (
                    <Link to={author.href} className="block truncate text-sm font-bold hover:text-primary">
                      {author.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-bold text-muted-foreground">{author.name}</span>
                  )}
                  {author.at ? (
                    author.href ? (
                      <Link to={author.href} className="block truncate text-[11px] font-semibold text-muted-foreground hover:text-primary">
                        {author.at}
                      </Link>
                    ) : (
                      <span className="block truncate text-[11px] font-semibold text-muted-foreground">{author.at}</span>
                    )
                  ) : null}
                </div>
                <AuthorVerifiedBadge author={author} size={14} />
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                {post.content}
              </p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function ReelResults({ reels }: { reels: any[] }) {
  return (
    <Section title="Reels" count={reels.length}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reels.map((reel) => {
          const author = reel.source === 'post' ? resolveContentAuthor(reel) : null;
          const title = reel.label || reel.caption || reel.description || 'Reel';
          return (
            <Link
              key={`${reel.source}-${reel.id}`}
              to="/reels"
              className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30"
            >
              {reel.thumbnail ? (
                <img src={reel.thumbnail} alt="" className="aspect-[9/16] w-full object-cover" />
              ) : (
                <div className="flex aspect-[9/16] items-center justify-center bg-muted text-muted-foreground">
                  <ReelsIcon size={28} />
                </div>
              )}
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-bold">{title}</h3>
                {author && <p className="mt-1 truncate text-xs text-muted-foreground">{author.name}</p>}
                {reel.user?.name && !author && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{reel.user.name}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

function SpaceResults({ spaces }: { spaces: any[] }) {
  return (
    <Section title="WevSpaces" count={spaces.length}>
      <div className="grid gap-3 sm:grid-cols-2">
        {spaces.map((space) => (
          <Link
            key={space.id}
            to={`/space/${space.handle}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/40"
          >
            {space.avatar ? (
              <img src={space.avatar} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SpacesIcon size={20} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-bold">{space.name}</h3>
              <p className="truncate text-sm text-muted-foreground">@{space.handle}</p>
              {space.tagline && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{space.tagline}</p>}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function GroupResults({ groups }: { groups: any[] }) {
  return (
    <Section title="Groups" count={groups.length}>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <Link
            key={group.id}
            to="/groups"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/40"
          >
            {group.avatar ? (
              <img src={group.avatar} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <GroupsIcon size={20} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-bold">{group.name}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{group.description || 'Public group'}</p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function ProductResults({ products }: { products: any[] }) {
  return (
    <Section title="WevMall" count={products.length}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const image = getFirstImage(product.images);
          return (
            <Link
              key={product.id}
              to={`/wevmall/product/${product.id}`}
              className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30"
            >
              {image ? (
                <img src={image} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground">
                  <WevMallIcon size={28} />
                </div>
              )}
              <div className="p-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-bold">{product.title}</h3>
                <p className="mt-2 font-black text-primary">BDT {Number(product.price || 0).toLocaleString()}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

function JobResults({ jobs }: { jobs: any[] }) {
  return (
    <Section title="Jobs" count={jobs.length}>
      <div className="grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="rounded-lg border border-border bg-card p-4 hover:border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <JobsIcon size={19} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold">{job.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{job.companyName || 'Wevsoft employer'}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {[job.location, job.jobType].filter(Boolean).join(' / ')}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function EventResults({ events }: { events: any[] }) {
  return (
    <Section title="Events" count={events.length}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            to="/events"
            className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30"
          >
            {event.image ? (
              <img src={event.image} alt="" className="aspect-[16/8] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/8] items-center justify-center bg-rose-500/10 text-rose-500">
                <EventsIcon size={26} />
              </div>
            )}
            <div className="p-4">
              <h3 className="line-clamp-2 font-bold">{event.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {[event.category, event.location].filter(Boolean).join(' / ')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function getFirstImage(images: unknown): string {
  if (Array.isArray(images)) return String(images[0] || '');
  if (typeof images !== 'string') return '';
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? String(parsed[0] || '') : images;
  } catch {
    return images.split(',')[0]?.trim() || '';
  }
}
