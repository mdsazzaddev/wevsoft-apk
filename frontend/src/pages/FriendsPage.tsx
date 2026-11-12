import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw,
  Ban,
  Check,
  Clock3,
  Ellipsis,
  Home,
  LayoutGrid,
  LayoutList,
  SquareUserRound,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UserCheck,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  followSpace,
  unfollowSpace,
  type SpaceCardPayload,
} from '../lib/wevspaceApi';
import { isVerifiedSpace, spacePublicPath } from '@wevsoft/shared/wevspace';
import { useStore } from '../store';
import UserAvatar, { resolveAvatarUrl } from '../components/UserAvatar';
import SuspendedBadge from '../components/SuspendedBadge';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { withoutStaff } from '../lib/hideStaff';
import { getSocket } from '../lib/socket';
import { useEnBn } from '../lib/useEnBn';
import { WevSpaceIcon } from '../components/wevspace/WevSpaceIcon';
import followIconUrl from '../assets/icons/follow.png';
import { profilePathFor } from '../lib/profileLinks';
import ContactDiscoveryPanel, {
  type ContactDiscoveryMatch,
} from '../components/friends/ContactDiscoveryPanel';
import { useValueChanged } from '../hooks/useValueChanged';

type FriendTab = 'discover' | 'requests' | 'suggestions' | 'sent' | 'friends' | 'all' | 'pages';

/** Friends menu — every section is backed by a real endpoint. URL: /friends/<slug>. */
const tabs: { id: FriendTab; slug: string; label: string; short: string; icon: React.ElementType; hint: string }[] = [
  { id: 'discover', slug: '', label: 'Home', short: 'Home', icon: Home, hint: 'People & pages to discover' },
  { id: 'requests', slug: 'requests', label: 'Friend requests', short: 'Requests', icon: UserPlus, hint: 'People who want to connect' },
  { id: 'suggestions', slug: 'suggestions', label: 'Suggestions', short: 'Suggestions', icon: Wand2, hint: 'Based on mutual friends & interests' },
  { id: 'sent', slug: 'sent', label: 'Sent requests', short: 'Sent', icon: Clock3, hint: 'Requests waiting for a reply' },
  { id: 'friends', slug: 'all-friends', label: 'All friends', short: 'Friends', icon: UserCheck, hint: 'Your accepted friends' },
  { id: 'all', slug: 'people', label: 'All people', short: 'People', icon: Users, hint: 'Everyone you are not connected with yet' },
  { id: 'pages', slug: 'pages', label: 'Following pages', short: 'Pages', icon: Store, hint: 'Pages you follow' },
];

function tabFromPath(pathname: string): FriendTab {
  const slug = pathname.replace(/^\/friends\/?/, '').split('/')[0] || '';
  return tabs.find((t) => t.slug === slug)?.id ?? 'discover';
}

function matchesQuery(u: any, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return [u?.name, u?.username].some((v) => typeof v === 'string' && v.toLowerCase().includes(s));
}

export type FriendsLayout = 'grid' | 'card' | 'list';
const LAYOUT_STORAGE_KEY = 'wev_friends_layout';
const layoutOptions: { id: FriendsLayout; label: string; icon: React.ElementType }[] = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'card', label: 'Card', icon: SquareUserRound },
  { id: 'list', label: 'List', icon: LayoutList },
];

function readLayout(): FriendsLayout {
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return v === 'grid' || v === 'card' || v === 'list' ? v : 'list';
  } catch {
    return 'list';
  }
}

/** Container classes per layout — content pane beside the Friends menu, 375px to 4K. */
const layoutContainer: Record<FriendsLayout, string> = {
  list: 'flex flex-col gap-3 sm:gap-4 w-full max-w-4xl',
  grid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-7 gap-3 sm:gap-4',
  card: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[2200px]:grid-cols-5 gap-4 sm:gap-5',
};

type DiscoverItem =
  | { kind: 'user'; id: string; user: any }
  | { kind: 'space'; id: string; space: SpaceCardPayload };

const REQ_BN = '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F';
const FRIEND_BN = '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1';
const tabBn: Record<FriendTab, { label: string; short: string }> = {
  discover: { label: '\u09B9\u09CB\u09AE', short: '\u09B9\u09CB\u09AE' },
  requests: { label: `${FRIEND_BN} ${REQ_BN}`, short: REQ_BN },
  suggestions: { label: '\u09B8\u09BE\u099C\u09C7\u09B6\u09A8', short: '\u09B8\u09BE\u099C\u09C7\u09B6\u09A8' },
  sent: { label: `\u09AA\u09BE\u09A0\u09BE\u09A8\u09CB ${REQ_BN}`, short: '\u09AA\u09BE\u09A0\u09BE\u09A8\u09CB' },
  friends: { label: `\u09B8\u09AC ${FRIEND_BN}`, short: FRIEND_BN },
  all: { label: '\u09B8\u09AC \u09AE\u09BE\u09A8\u09C1\u09B7', short: '\u09AE\u09BE\u09A8\u09C1\u09B7' },
  pages: { label: '\u09AB\u09B2\u09CB \u0995\u09B0\u09BE \u09AA\u09C7\u099C', short: '\u09AA\u09C7\u099C' },
};

type TypeFilter = 'all' | 'people' | 'stores' | 'spaces';
const typeFilters: { id: TypeFilter; en: string; bn: string }[] = [
  { id: 'all', en: 'All', bn: '\u09B8\u09AC' },
  { id: 'people', en: 'People', bn: '\u09AE\u09BE\u09A8\u09C1\u09B7' },
  { id: 'stores', en: 'Stores', bn: '\u09B8\u09CD\u099F\u09CB\u09B0' },
  { id: 'spaces', en: 'Spaces', bn: '\u09B8\u09CD\u09AA\u09C7\u09B8' },
];

const PAGE = 20;
/** Fresh per load / tab visit / refresh; sent with every page so paging stays stable. */
/**
 * Session cache (stale-while-revalidate): re-entering Friends paints the last
 * list instantly instead of skeleton -> fetch -> swap, which felt laggy.
 */
const friendsListCache = new Map<string, { items: DiscoverItem[]; total: number; next: string | null }>();
let friendsCountsCache: Record<string, number | null> | null = null;

const newSeed = () => Math.random().toString(36).slice(2, 10) || 'seed';
const SEEDED_SECTIONS = new Set(['suggestions', 'people', 'stores', 'spaces', 'home']);
type HubPage = { items: any[]; total: number; nextCursor: string | null };
type Loaded = { items: DiscoverItem[]; total: number; next: string | null };

const userItem = (user: any): DiscoverItem => ({ kind: 'user', id: `u:${user.id}`, user });
const spaceItem = (space: SpaceCardPayload): DiscoverItem => ({ kind: 'space', id: `s:${space.id}`, space });

export default function FriendsPage() {
  const { isSpaceMode } = useSpaceIdentities();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useEnBn();
  const tab = tabFromPath(location.pathname);
  const token = useStore((state) => state.token);
  const viewerId = useStore((state: any) => state.user?.id) as string | undefined;
  const viewerRole = useStore((state: any) => state.user?.role);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [seed, setSeed] = useState(newSeed);
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [counts, setCounts] = useState<Record<FriendTab, number | null>>(() => (friendsCountsCache as Record<FriendTab, number | null> | null) ?? {
    discover: null, requests: null, suggestions: null, sent: null, friends: null, all: null, pages: null,
  });
  const [menuId, setMenuId] = useState<string | null>(null);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reqSeq = useRef(0);
  const [layout, setLayoutState] = useState<FriendsLayout>(readLayout);
  const [contactMatches, setContactMatches] = useState<ContactDiscoveryMatch[]>([]);
  const onContactMatchesChange = useCallback((rows: ContactDiscoveryMatch[]) => {
    setContactMatches(withoutStaff(rows, viewerRole));
  }, [viewerRole]);
  const setLayout = (nextLayout: FriendsLayout) => {
    setLayoutState(nextLayout);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, nextLayout);
    } catch {
      /* ignore storage errors */
    }
  };

  const setTab = (nextTab: FriendTab) => {
    const slug = tabs.find((x) => x.id === nextTab)?.slug ?? '';
    setMenuId(null);
    setSeed(newSeed());
    navigate(slug ? `/friends/${slug}` : '/friends');
  };

  const authHeaders = { Authorization: `Bearer ${token}` };
  const getJson = async (url: string) => {
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) throw new Error(url);
    return res.json();
  };

  const hub = async (section: string, cursor: string | null): Promise<HubPage> => {
    const params = new URLSearchParams({ limit: String(PAGE) });
    if (cursor) params.set('cursor', cursor);
    if (q) params.set('q', q);
    if (SEEDED_SECTIONS.has(section)) params.set('seed', seed);
    const data = await getJson(`/api/friends/hub/${section}?${params}`);
    return { items: withoutStaff(Array.isArray(data?.items) ? data.items : [], viewerRole), total: Number(data?.total) || 0, nextCursor: data?.nextCursor ?? null };
  };
  const hubLoaded = async (section: string, cursor: string | null): Promise<Loaded> => {
    const p = await hub(section, cursor);
    return { items: p.items.map(userItem), total: p.total, next: p.nextCursor };
  };
  /** Server-side paged Space cards (spaces | following-spaces), same cursor contract as people. */
  const spacesLoaded = async (cursor: string | null, followed = false): Promise<Loaded> => {
    const p = await hub(followed ? 'following-spaces' : 'spaces', cursor);
    return { items: p.items.map((space) => spaceItem(space as SpaceCardPayload)), total: p.total, next: p.nextCursor };
  };
  /** Home: server merges people + spaces with one combined cursor and an exact total. */
  const homeLoaded = async (cursor: string | null): Promise<Loaded> => {
    const p = await hub('home', cursor);
    return {
      items: p.items.map((it: any) => (it.kind === 'space' ? spaceItem(it as SpaceCardPayload) : userItem(it))),
      total: p.total,
      next: p.nextCursor,
    };
  };

  /** One loader per tab (+ type filter on Home). Composite cursor for the mixed Home feed. */
  const loadPage = async (cursor: string | null): Promise<Loaded> => {
    switch (tab) {
      case 'requests': return hubLoaded('requests', cursor);
      case 'sent': return hubLoaded('sent', cursor);
      case 'friends': return hubLoaded('friends', cursor);
      case 'suggestions': return hubLoaded('suggestions', cursor);
      case 'all': return hubLoaded('people', cursor);
      case 'pages': return spacesLoaded(cursor, true);
      default: {
        if (typeFilter === 'people') return hubLoaded('people', cursor);
        if (typeFilter === 'stores') return hubLoaded('stores', cursor);
        if (typeFilter === 'spaces') return spacesLoaded(cursor);
        return homeLoaded(cursor);
      }
    }
  };

  const reload = async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(false);
    try {
      const page = await loadPage(null);
      if (seq !== reqSeq.current) return;
      setItems(page.items);
      setTotal(page.total);
      setNext(page.next);
      friendsListCache.set(`${tab}|${q}|${typeFilter}`, { items: page.items, total: page.total, next: page.next });
    } catch {
      if (seq === reqSeq.current) setError(true);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!next || loadingMore || loading) return;
    const seq = reqSeq.current;
    setLoadingMore(true);
    try {
      const page = await loadPage(next);
      if (seq !== reqSeq.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setNext(page.next);
    } catch {
      toast.error(t('Could not load more', '\u0986\u09B0\u0993 \u09B2\u09CB\u09A1 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshCounts = async () => {
    try {
      const c = await getJson('/api/friends/hub/counts');
      setCounts((prev) => (friendsCountsCache = {
        ...prev,
        requests: c?.requests ?? 0,
        sent: c?.sent ?? 0,
        friends: c?.friends ?? 0,
        suggestions: c?.suggestions ?? 0,
        pages: c?.following ?? 0,
      }));
    } catch {
      /* keep last counts */
    }
  };

  // Debounced search.
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (isSpaceMode || !token) return;
    const cached = friendsListCache.get(`${tab}|${q}|${typeFilter}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    setItems(cached?.items ?? []);
    setTotal(cached?.total ?? 0);
    setNext(cached?.next ?? null);
    void reload();
  }, [tab, q, typeFilter, seed, token, isSpaceMode]);

  useEffect(() => {
    if (isSpaceMode || !token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void refreshCounts();
  }, [token, isSpaceMode]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loading, loadingMore, items.length]);

  // Real-time: another account accepted / sent / cancelled -> refresh counts + graph tabs.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const countsRef = useRef(refreshCounts);
  countsRef.current = refreshCounts;
  useEffect(() => {
    if (isSpaceMode || !token || !viewerId) return;
    const socket = getSocket(viewerId);
    const onChanged = (payload: { actorId?: string } | undefined) => {
      void countsRef.current();
      if (payload?.actorId && payload.actorId === viewerId) return; // own action already applied locally
      if (['requests', 'sent', 'friends', 'suggestions'].includes(tabRef.current)) void reloadRef.current();
    };
    socket.on('friends:changed', onChanged);
    return () => {
      socket.off('friends:changed', onChanged);
    };
  }, [token, viewerId, isSpaceMode]);

  useEffect(() => {
    if (isSpaceMode) return;
    const scrollArea = document.getElementById('main-scroll-area');
    if (!scrollArea) return;
    const handleScroll = (e: any) => {
      const currentScrollY = e.target.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) setIsNavVisible(false);
      else setIsNavVisible(true);
      lastScrollY.current = currentScrollY;
    };
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [isSpaceMode]);

  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }

  const dropItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((n) => Math.max(0, n - 1));
  };

  /** Which tab an item leaves after an action (it moves to another tab, counts follow). */
  const leavesTab = (action: string) =>
    (tab === 'requests' && (action === 'accept' || action === 'reject')) ||
    (tab === 'sent' && action === 'cancel') ||
    (tab === 'friends' && action === 'remove');

  const handleFriendAction = async (userId: string, action: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/friends/${action}/${userId}`, { method: 'POST', headers: authHeaders });
      if (!res.ok) throw new Error();
      setMenuId(null);
      const nextStatus =
        action === 'request' ? 'pending_sent' : action === 'accept' ? 'accepted' : 'none';
      toast.success(
        action === 'request'
          ? t('Friend request sent', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7')
          : action === 'accept'
            ? t('Request accepted', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u0997\u09CD\u09B0\u09B9\u09A3 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7')
            : action === 'reject'
              ? t('Request deleted', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09B9\u09DF\u09C7\u099B\u09C7')
              : action === 'cancel'
                ? t('Request cancelled', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AC\u09BE\u09A4\u09BF\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7')
                : t('Removed from friends', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7'),
      );
      if (leavesTab(action)) dropItem(`u:${userId}`);
      else
        setItems((prev) =>
          prev.map((i) =>
            i.kind === 'user' && i.user.id === userId
              ? {
                  ...i,
                  user: {
                    ...i.user,
                    friendStatus: nextStatus,
                  },
                }
              : i,
          ),
        );
      setContactMatches((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, friendStatus: nextStatus } : m)),
      );
      void refreshCounts();
      return true;
    } catch {
      toast.error(t('Could not complete that action', '\u0995\u09BE\u099C\u099F\u09BF \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
      return false;
    }
  };

  const dismissSuggestion = async (userId: string) => {
    dropItem(`u:${userId}`);
    setCounts((c) => ({ ...c, suggestions: Math.max(0, (c.suggestions ?? 0) - 1) }));
    try {
      await fetch('/api/recommendations/friends/dismiss', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      /* best effort */
    }
  };

  const handleFollowSpace = async (space: SpaceCardPayload) => {
    if (followBusyId) return;
    setFollowBusyId(space.id);
    const nextFollowing = !space.isFollowing;
    const patch = (v: boolean) =>
      setItems((prev) => prev.map((i) => (i.kind === 'space' && i.space.id === space.id ? { ...i, space: { ...i.space, isFollowing: v } } : i)));
    patch(nextFollowing);
    try {
      if (nextFollowing) await followSpace(space.id);
      else await unfollowSpace(space.id);
      if (tab === 'pages' && !nextFollowing) dropItem(`s:${space.id}`);
      setCounts((c) => ({ ...c, pages: Math.max(0, (c.pages ?? 0) + (nextFollowing ? 1 : -1)) }));
      toast.success(nextFollowing ? t(`Following ${space.name}`, `${space.name} \u09AB\u09B2\u09CB \u0995\u09B0\u099B\u09C7\u09A8`) : t(`Unfollowed ${space.name}`, `${space.name} \u0986\u09A8\u09AB\u09B2\u09CB \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7`));
    } catch {
      patch(!nextFollowing);
      toast.error(t('Could not update follow', '\u09AB\u09B2\u09CB \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setFollowBusyId(null);
    }
  };

  const current = tabs.find((x) => x.id === tab) ?? tabs[0];
  const tabLabel = (id: FriendTab, en: string, short = false) => t(en, short ? tabBn[id].short : tabBn[id].label);

  /** Contact matches prepended into Discover / Suggestions people lists. */
  const feedItems = useMemo(() => {
    const showContacts =
      (tab === 'discover' && (typeFilter === 'all' || typeFilter === 'people')) ||
      tab === 'suggestions';
    if (!showContacts || contactMatches.length === 0) return items;
    const seen = new Set(
      items.filter((i) => i.kind === 'user').map((i) => (i as { user: { id: string } }).user.id),
    );
    const contactItems: DiscoverItem[] = [];
    for (const m of contactMatches) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      contactItems.push(
        userItem({
          id: m.id,
          name: m.name,
          username: m.username,
          avatar: m.avatar,
          friendStatus: m.friendStatus || 'none',
          fromContacts: true,
          mutualFriendsCount: 0,
        }),
      );
    }
    return contactItems.length ? [...contactItems, ...items] : items;
  }, [items, contactMatches, tab, typeFilter]);

  const feedTotal = total + Math.max(0, feedItems.length - items.length);
  const resultLabel = loading
    ? t('Loading...', '\u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...')
    : `${feedTotal} ${t(feedTotal === 1 ? 'result' : 'results', '\u09AB\u09B2\u09BE\u09AB\u09B2')}`;

  const searchInput = (
    <label className="relative block w-full group">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
        size={16}
      />
      <input
        ref={searchRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('Search people, stores & spaces...', '\u09AE\u09BE\u09A8\u09C1\u09B7, \u09B8\u09CD\u099F\u09CB\u09B0 \u0993 \u09B8\u09CD\u09AA\u09C7\u09B8 \u0996\u09C1\u0981\u099C\u09C1\u09A8...')}
        aria-label={t('Search friends', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u0996\u09C1\u0981\u099C\u09C1\u09A8')}
        className="h-10 w-full rounded-full border border-border bg-muted/40 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:bg-card focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
      />
    </label>
  );

  const renderItem = (item: DiscoverItem) => {
    if (item.kind === 'space') {
      return (
        <SpaceDiscoverCard
          key={item.id}
          space={item.space}
          busy={followBusyId === item.space.id}
          onFollow={() => void handleFollowSpace(item.space)}
          layout={layout}
        />
      );
    }
    const card = (
      <PersonCard user={item.user} menuId={menuId} setMenuId={setMenuId} onAction={handleFriendAction} layout={layout} />
    );
    if (tab !== 'suggestions') return <React.Fragment key={item.id}>{card}</React.Fragment>;
    return (
      <div key={item.id} className="relative">
        {card}
        <button
          type="button"
          onClick={() => void dismissSuggestion(item.user.id)}
          className="absolute right-2 top-2 z-30 rounded-full bg-card/90 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          aria-label={`${t('Dismiss', '\u09B8\u09B0\u09BE\u09A8')} ${item.user.name}`}
          title={t('Remove suggestion', '\u09B8\u09BE\u099C\u09C7\u09B6\u09A8 \u09B8\u09B0\u09BE\u09A8')}
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[2400px] min-h-full gap-6 px-3 pb-24 md:pb-12 sm:px-5 lg:px-6 2xl:px-10">
      <aside className="hidden lg:block w-72 xl:w-80 shrink-0" aria-label={t('Friends menu', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09AE\u09C7\u09A8\u09C1')}>
        <div className="sticky top-4 mt-4 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-3 no-scrollbar">
          <div className="flex items-center justify-between px-2 pt-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{t('Friends', FRIEND_BN)}</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70"
                aria-label={t('Search friends', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u0996\u09C1\u0981\u099C\u09C1\u09A8')}
              >
                <Search size={17} />
              </button>
              <Link
                to="/settings?opt=sec_blocked_users"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70"
                aria-label={t('Friends settings', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09B8\u09C7\u099F\u09BF\u0982\u09B8')}
              >
                <Settings size={17} />
              </Link>
            </div>
          </div>
          <div className="px-1">{searchInput}</div>
          <nav className="flex flex-col gap-0.5">
            {tabs.map(({ id, label, icon: Icon, hint }) => {
              const active = tab === id;
              const count = counts[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={active ? 'page' : undefined}
                  title={hint}
                  className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[15px] font-semibold transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{tabLabel(id, label)}</span>
                  {count != null && count > 0 && (
                    <span
                      className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums ${
                        id === 'requests' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-1 border-t border-border pt-2">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Privacy', '\u0997\u09CB\u09AA\u09A8\u09C0\u09DF\u09A4\u09BE')}</p>
            <Link to="/settings?opt=story_close_friends" className="flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] font-semibold hover:bg-muted">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Star size={18} /></span>
              {t('Close friends', '\u0995\u09CD\u09B2\u09CB\u099C \u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1')}
            </Link>
            <Link to="/settings?opt=sec_blocked_users" className="flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] font-semibold hover:bg-muted">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Ban size={18} /></span>
              {t('Blocked people', '\u09AC\u09CD\u09B2\u0995 \u0995\u09B0\u09BE \u09AE\u09BE\u09A8\u09C1\u09B7')}
            </Link>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-5">
        <div
          className={`lg:hidden sticky top-0 z-40 -mx-3 px-3 sm:-mx-5 sm:px-5 py-3 bg-background/90 backdrop-blur-xl transition-transform duration-200 ease-out motion-reduce:transition-none border-b border-border ${isNavVisible ? 'translate-y-0' : '-translate-y-full'} flex flex-col gap-3`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight">{t('Friends', FRIEND_BN)}</h1>
            <Link to="/settings?opt=sec_blocked_users" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted" aria-label={t('Friends settings', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09B8\u09C7\u099F\u09BF\u0982\u09B8')}>
              <Settings size={17} />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {tabs.map(({ id, short, icon: Icon }) => {
              const count = counts[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                  }`}
                >
                  <Icon size={15} />
                  {tabLabel(id, short, true)}
                  {count != null && count > 0 && (
                    <span className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${id === 'requests' && tab !== id ? 'bg-destructive text-destructive-foreground' : ''}`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {searchInput}
        </div>

        <div className="flex items-center justify-between gap-3 px-1 lg:pt-6">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight">{tabLabel(current.id, current.label)}</h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{resultLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSeed(newSeed());
              void refreshCounts();
            }}
            disabled={loading}
            aria-label={t('Refresh', '\u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6')}
            title={t('Refresh - show a fresh mix', '\u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 - \u09A8\u09A4\u09C1\u09A8 \u0995\u09B0\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/40 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div role="group" aria-label="Layout" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-card/40 p-1">
            {layoutOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLayout(id)}
                aria-pressed={layout === id}
                aria-label={`${label} layout`}
                title={`${label} layout`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 h-8 text-xs font-semibold transition-colors ${
                  layout === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          </div>
        </div>

        {(tab === 'discover' || tab === 'suggestions') && (
          <ContactDiscoveryPanel
            token={token}
            viewerRole={viewerRole}
            onFriendRequest={(userId) => handleFriendAction(userId, 'request')}
            onMatchesChange={onContactMatchesChange}
            hideMatchList
          />
        )}

        {tab === 'discover' && (
          <div role="group" aria-label={t('Filter by type', '\u09A7\u09B0\u09A8 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09AB\u09BF\u09B2\u09CD\u099F\u09BE\u09B0')} className="flex flex-wrap gap-2 px-1">
            {typeFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                aria-pressed={typeFilter === f.id}
                className={`h-8 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                  typeFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                }`}
              >
                {t(f.en, f.bn)}
              </button>
            ))}
          </div>
        )}

        {loading && feedItems.length === 0 ? (
          <LoadingGrid layout={layout} />
        ) : error && feedItems.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border px-6 py-16 text-center">
            <p className="text-base font-bold">{t('Could not load this list', '\u098F\u0987 \u09A4\u09BE\u09B2\u09BF\u0995\u09BE \u09B2\u09CB\u09A1 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF')}</p>
            <button type="button" onClick={() => void reload()} className="mt-4 h-9 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              {t('Retry', '\u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8')}
            </button>
          </div>
        ) : feedItems.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            <div className={layoutContainer[layout]}>{feedItems.map(renderItem)}</div>
            {next && <div ref={sentinelRef} aria-hidden className="h-1 w-full" />}
            {loadingMore && <LoadingGrid layout={layout} rows={layout === 'list' ? 2 : 4} />}
          </>
        )}
      </section>
    </div>
  );
}
type AccountKind = 'personal' | 'store' | 'space';

function useKindLabel() {
  const { t } = useEnBn();
  return (k: AccountKind) =>
    k === 'store' ? t('WevMall store', '\u0993\u09DF\u09C7\u09AD\u09AE\u09B2 \u09B8\u09CD\u099F\u09CB\u09B0') : k === 'space' ? t('Space', '\u09B8\u09CD\u09AA\u09C7\u09B8') : t('Person', '\u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF');
}

/** Product icon only (no text) so a store / space never looks like a personal account. */
function TypeBadge({ kind }: { kind: AccountKind }) {
  const label = useKindLabel()(kind);
  if (kind === 'personal') return null;
  return (
    <span role="img" aria-label={label} title={label} className="pointer-events-auto inline-flex shrink-0 items-center">
      {kind === 'store' ? (
        <Store size={14} className="text-amber-500 dark:text-amber-400" aria-hidden />
      ) : (
        <WevSpaceIcon size={14} className="text-primary" aria-hidden />
      )}
    </span>
  );
}

/** User-supplied follow glyph, rendered as a CSS mask so it follows currentColor. */
function FollowIcon({ className = 'size-3.5 shrink-0 block' }: { className?: string }) {
  const mask = `url(${followIconUrl})`;
  return (
    <span
      aria-hidden
      className={`${className} bg-current`}
      style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
    />
  );
}

/** Same-size placeholder for the ⋯ button so every row's actions line up. */
const MoreSpacer = () => <span className="h-9 w-9 shrink-0" aria-hidden />;

const btnBase =
  'relative z-20 pointer-events-auto inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold leading-none transition-colors duration-200 active:scale-95 whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 disabled:pointer-events-none';
const btnPrimary = 'border border-primary bg-primary text-primary-foreground hover:bg-primary/90';
const btnMuted = 'border border-border bg-card text-foreground hover:bg-muted';
const btnIconCls = 'size-3.5 shrink-0 block';

const stop = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

function FollowButton({
  following,
  busy,
  name,
  onClick,
  fullWidth,
}: {
  following: boolean;
  busy: boolean;
  name: string;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  const { t } = useEnBn();
  const label = following ? t('Following', '\u09AB\u09B2\u09CB \u0995\u09B0\u099B\u09C7\u09A8') : t('Follow', '\u09AB\u09B2\u09CB');
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        stop(e);
        e.preventDefault();
        onClick();
      }}
      aria-pressed={following}
      aria-label={`${following ? t('Unfollow', '\u0986\u09A8\u09AB\u09B2\u09CB') : t('Follow', '\u09AB\u09B2\u09CB')} ${name}`}
      className={`${btnBase} ${following ? btnMuted : btnPrimary} ${fullWidth ? 'min-w-0 flex-1 basis-0' : ''}`}
    >
      {following ? <Check className={btnIconCls} aria-hidden /> : <FollowIcon className={btnIconCls} />}
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}

/**
 * Shared shell for every account card (Grid / Card / List). The whole card is one
 * real <Link> overlay (keyboard + middle-click friendly); buttons sit above it with
 * pointer-events-auto and stopPropagation, so only they do not navigate.
 */
function AccountCard({
  layout,
  href,
  avatar,
  title,
  verified,
  kind,
  subtitle,
  meta,
  actions,
}: {
  layout: FriendsLayout;
  href: string | null;
  avatar: React.ReactNode;
  title: string;
  verified: boolean;
  kind: AccountKind;
  subtitle: React.ReactNode;
  meta?: React.ReactNode;
  actions: React.ReactNode;
}) {
  const { t } = useEnBn();
  const overlay = href ? (
    <Link
      to={href}
      aria-label={`${t('Open profile', '\u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u0996\u09C1\u09B2\u09C1\u09A8')}: ${title}`}
      className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    />
  ) : null;
  const titleRow = (
    <span className="flex max-w-full items-center gap-1 min-w-0">
      <h3 className={`truncate font-bold tracking-tight text-foreground group-hover:text-primary transition-colors ${layout === 'card' ? 'text-base' : layout === 'grid' ? 'text-sm' : 'text-[15px]'}`}>
        {title}
      </h3>
      {verified && <ShieldCheck size={14} className="shrink-0 fill-primary text-primary" aria-label={t('Verified', '\u09AF\u09BE\u099A\u09BE\u0987\u0995\u09C3\u09A4')} />}
    </span>
  );

  if (layout === 'list') {
    return (
      <article className={`group relative flex items-center justify-between gap-4 rounded-[20px] border border-transparent bg-card/20 p-4 transition-[transform,background-color,border-color] duration-150 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:border-border hover:bg-card/40 ${href ? 'cursor-pointer' : ''}`}>
        {overlay}
        <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border shadow-sm sm:h-14 sm:w-14">{avatar}</span>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            {titleRow}
            <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
              <TypeBadge kind={kind} />
              {subtitle}
            </p>
          </div>
        </div>
        <div className="relative z-20 flex w-40 shrink-0 items-center gap-2 sm:w-52" onClick={stop}>{actions}</div>
      </article>
    );
  }

  const isCard = layout === 'card';
  return (
    <article
      className={`group relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border border-border bg-card text-center transition-[transform,box-shadow] duration-150 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-lg ${isCard ? 'pb-4' : 'p-3 sm:p-4'} ${href ? 'cursor-pointer' : ''}`}
    >
      {overlay}
      {isCard && (
        <div
          className={`h-20 w-full sm:h-24 ${kind === 'store' ? 'bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-muted' : 'bg-gradient-to-br from-primary/25 via-primary/10 to-muted'}`}
          aria-hidden
        />
      )}
      <span
        className={`pointer-events-none relative shrink-0 overflow-hidden ring-4 ring-card ${kind === 'store' ? 'rounded-2xl' : 'rounded-full'} ${isCard ? '-mt-10 h-20 w-20 sm:-mt-12 sm:h-24 sm:w-24' : 'h-14 w-14 sm:h-16 sm:w-16'}`}
      >
        {avatar}
      </span>
      <div className={`pointer-events-none flex w-full min-w-0 flex-col items-center gap-1 ${isCard ? 'mt-3 px-4' : 'mt-2'}`}>
        <span className="flex max-w-full justify-center">{titleRow}</span>
        <TypeBadge kind={kind} />
        <p className="flex max-w-full items-center justify-center gap-1 truncate text-xs text-muted-foreground">{subtitle}</p>
        {meta && isCard && <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">{meta}</p>}
      </div>
      <div className={`relative z-20 mt-auto flex w-full min-w-0 items-center gap-2 pt-3 ${isCard ? 'px-4' : ''}`} onClick={stop}>{actions}</div>
    </article>
  );
}

function SpaceDiscoverCard({
  space,
  busy,
  onFollow,
  layout = 'list',
}: {
  space: SpaceCardPayload;
  busy: boolean;
  onFollow: () => void;
  layout?: FriendsLayout;
}) {
  const { t } = useEnBn();
  const avatar = resolveAvatarUrl(space.avatar);
  const followers = Number((space as any).followersCount ?? (space as any).followerCount ?? 0) || 0;
  return (
    <AccountCard
      layout={layout}
      href={spacePublicPath(space.handle)}
      kind="space"
      avatar={
        <span className="flex h-full w-full items-center justify-center bg-muted text-lg font-black text-muted-foreground">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : space.name.slice(0, 1).toUpperCase()}
        </span>
      }
      title={space.name}
      verified={isVerifiedSpace(space.verificationStatus)}
      subtitle={<span className="truncate">@{space.handle}</span>}
      meta={followers > 0 ? <><Users size={12} aria-hidden /> {followers} {t('followers', '\u09AB\u09B2\u09CB\u09DF\u09BE\u09B0')}</> : undefined}
      actions={<><FollowButton following={!!space.isFollowing} busy={busy} name={space.name} onClick={onFollow} fullWidth /><MoreSpacer /></>}
    />
  );
}

function PersonCard({
  user,
  menuId,
  setMenuId,
  onAction,
  layout = 'list',
}: {
  user: any;
  menuId: any;
  setMenuId: (id: any) => void;
  onAction: (id: string, action: string) => Promise<boolean> | void;
  layout?: FriendsLayout;
}) {
  const { t } = useEnBn();
  const token = useStore((state) => state.token);
  const [status, setStatus] = useState<string>(user.friendStatus || 'none');
  const [following, setFollowing] = useState<boolean>(!!user.isFollowing);
  const [followers, setFollowers] = useState<number>(Number(user.followersCount ?? 0) || 0);
  const [busy, setBusy] = useState(false);
  // Fresh server values → resync the optimistic local state (adjusted during render).
  const friendStatusChanged = useValueChanged(user.friendStatus);
  if (friendStatusChanged) setStatus(user.friendStatus || 'none');
  const followingChanged = useValueChanged(user.isFollowing);
  if (followingChanged) setFollowing(!!user.isFollowing);

  const store = user.accountType === 'store' && user.store?.slug ? user.store : null;
  const kind: AccountKind = store ? 'store' : 'personal';
  const href = store ? `/shop/${store.slug}` : profilePathFor(user);
  const title = (store?.name as string) || user.name;
  const mutual = Number(user.mutualFriendsCount ?? user.mutualFriends ?? user.mutualCount ?? 0) || 0;

  const runFriend = async (action: string, next: string) => {
    if (busy) return;
    const prev = status;
    setStatus(next);
    setMenuId(null);
    setBusy(true);
    const ok = await onAction(user.id, action);
    if (ok === false) setStatus(prev);
    setBusy(false);
  };

  const toggleFollow = async () => {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));
    setMenuId(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const body = await res.json().catch(() => ({}));
      if (typeof body?.following === 'boolean') setFollowing(body.following);
      toast.success(next ? t(`Following ${title}`, `${title} \u0995\u09C7 \u09AB\u09B2\u09CB \u0995\u09B0\u099B\u09C7\u09A8`) : t(`Unfollowed ${title}`, `${title} \u0986\u09A8\u09AB\u09B2\u09CB \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7`));
    } catch {
      setFollowing(!next);
      setFollowers((n) => Math.max(0, n + (next ? -1 : 1)));
      toast.error(t('Could not update follow', '\u09AB\u09B2\u09CB \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setBusy(false);
    }
  };

  const avatar = store?.logo ? (
    <img src={resolveAvatarUrl(store.logo) || store.logo} alt="" className="h-full w-full object-cover" />
  ) : (
    <UserAvatar user={user} alt={user.name} className="h-full w-full rounded-[inherit] object-cover" />
  );

  const subtitle = store ? (
    <span className="truncate">
      {followers} {t('followers', '\u09AB\u09B2\u09CB\u09DF\u09BE\u09B0')}
      {Number(store.rating) > 0 && (
        <>
          {' \u00B7 '}
          <Star size={11} className="inline -mt-0.5 fill-amber-400 text-amber-400" aria-hidden /> {Number(store.rating).toFixed(1)}
        </>
      )}
    </span>
  ) : (
    <>
      <span className="truncate">
        {user.fromContacts
          ? t('From your contacts', '\u09A4\u09CB\u09AE\u09BE\u09B0 contacts \u09A5\u09C7\u0995\u09C7')
          : mutual > 0
            ? t(`${mutual} mutual friend${mutual === 1 ? '' : 's'}`, `${mutual} \u099C\u09A8 \u09AE\u09BF\u0989\u099A\u09C1\u09DF\u09BE\u09B2 \u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1`)
            : user.username
              ? `@${user.username}`
              : t('Wevsoft member', '\u0993\u09DF\u09C7\u09AD\u09B8\u09AB\u099F \u09B8\u09A6\u09B8\u09CD\u09AF')}
      </span>
      <SuspendedBadge user={user} />
    </>
  );

  // Fixed-width action column in every layout so buttons align row to row.
  const full = true;
  let actions: React.ReactNode;
  if (store) {
    actions = <><FollowButton following={following} busy={busy} name={title} onClick={toggleFollow} fullWidth={full} /><MoreSpacer /></>;
  } else if (status === 'pending_received') {
    actions = (
      <>
        <button type="button" disabled={busy} onClick={(e) => { stop(e); void runFriend('accept', 'accepted'); }} className={`${btnBase} ${btnPrimary} ${full ? 'min-w-0 flex-1 basis-0' : ''}`}>
          <Check className={btnIconCls} aria-hidden /> <span className="truncate leading-none">{t('Confirm', '\u0995\u09A8\u09AB\u09BE\u09B0\u09CD\u09AE')}</span>
        </button>
        <button type="button" disabled={busy} onClick={(e) => { stop(e); void runFriend('reject', 'none'); }} className={`${btnBase} ${btnMuted} ${full ? 'min-w-0 flex-1 basis-0' : ''}`}>
          <X className={btnIconCls} aria-hidden /> <span className="truncate leading-none">{t('Delete', '\u09AE\u09C1\u099B\u09C1\u09A8')}</span>
        </button>
      </>
    );
  } else if (status === 'pending_sent') {
    actions = (
      <>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => { stop(e); void runFriend('cancel', 'none'); }}
        title={t('Tap to cancel request', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09A4\u09C7 \u099A\u09BE\u09AA\u09C1\u09A8')}
        className={`${btnBase} ${btnMuted} ${full ? 'min-w-0 flex-1 basis-0' : ''}`}
      >
        <Clock3 className={btnIconCls} aria-hidden /> <span className="truncate leading-none">{t('Requested', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB')}</span>
      </button>
        <MoreSpacer />
      </>
    );
  } else {
    const isFriend = status === 'accepted';
    const open = menuId === user.id;
    actions = (
      <>
        {isFriend ? (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => { stop(e); setMenuId(open ? null : user.id); }}
            aria-haspopup="menu"
            aria-expanded={open}
            className={`${btnBase} ${btnMuted} ${full ? 'min-w-0 flex-1 basis-0' : ''}`}
          >
            <UserCheck className={btnIconCls} aria-hidden /> <span className="truncate leading-none">{t('Friends', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1')}</span>
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={(e) => { stop(e); void runFriend('request', 'pending_sent'); }} className={`${btnBase} ${btnPrimary} ${full ? 'min-w-0 flex-1 basis-0' : ''}`}>
            <UserPlus className={btnIconCls} aria-hidden /> <span className="truncate leading-none">{t('Add friend', '\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8')}</span>
          </button>
        )}
        <div className="relative z-20 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => { stop(e); setMenuId(open ? null : user.id); }}
            aria-label={t('More actions', '\u0986\u09B0\u0993 \u0985\u09AA\u09B6\u09A8')}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Ellipsis size={16} />
          </button>
          {open && (
            <div role="menu" className="absolute bottom-full right-0 z-30 mb-2 w-44 rounded-2xl border border-border bg-card p-1 text-left shadow-xl">
              <button type="button" role="menuitem" onClick={(e) => { stop(e); void toggleFollow(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted">
                {following ? <X size={15} /> : <FollowIcon className="size-[15px] shrink-0 block" />} {following ? t('Unfollow', '\u0986\u09A8\u09AB\u09B2\u09CB') : t('Follow', '\u09AB\u09B2\u09CB')}
              </button>
              {isFriend && (
                <button type="button" role="menuitem" onClick={(e) => { stop(e); void runFriend('remove', 'none'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500/10">
                  <Ban size={15} /> {t('Unfriend', '\u0986\u09A8\u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1')}
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <AccountCard
      layout={layout}
      href={href}
      kind={kind}
      avatar={avatar}
      title={title}
      verified={store ? !!store.verified : !!(user.verified || user.verifiedBadge)}
      subtitle={subtitle}
      meta={!store && layout === 'card' && mutual === 0 ? t('No mutual friends yet', '\u098F\u0996\u09A8\u0993 \u0995\u09CB\u09A8\u09CB \u09AE\u09BF\u0989\u099A\u09C1\u09DF\u09BE\u09B2 \u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09A8\u09C7\u0987') : undefined}
      actions={actions}
    />
  );
}

function LoadingGrid({ layout = 'list', rows = 6 }: { layout?: FriendsLayout; rows?: number }) {
  const tile = layout === 'list' ? 'h-20 sm:h-24 rounded-[20px]' : layout === 'grid' ? 'h-48 rounded-2xl' : 'h-72 rounded-2xl';
  return (
    <div className={layoutContainer[layout]}>
      {Array.from({ length: rows }, (_, i) => i).map((i) => (
        <div key={i} className={`${tile} animate-pulse bg-muted/40`} />
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: FriendTab }) {
  const { t } = useEnBn();
  const msg: Record<FriendTab, [string, string]> = {
    requests: ['No pending requests', '\u0995\u09CB\u09A8\u09CB \u09AA\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09A8\u09C7\u0987'],
    sent: ['No sent requests', '\u0995\u09CB\u09A8\u09CB \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09A8\u09C7\u0987'],
    discover: ['Nothing to discover yet', '\u098F\u0996\u09A8\u09CB \u0995\u09BF\u099B\u09C1 \u09A8\u09C7\u0987'],
    friends: ['No friends yet', '\u098F\u0996\u09A8\u09CB \u0995\u09CB\u09A8\u09CB \u09AB\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 \u09A8\u09C7\u0987'],
    suggestions: ['No suggestions right now', '\u098F\u0996\u09A8 \u0995\u09CB\u09A8\u09CB \u09B8\u09BE\u099C\u09C7\u09B6\u09A8 \u09A8\u09C7\u0987'],
    pages: ['You are not following any pages', '\u0986\u09AA\u09A8\u09BF \u0995\u09CB\u09A8\u09CB \u09AA\u09C7\u099C \u09AB\u09B2\u09CB \u0995\u09B0\u099B\u09C7\u09A8 \u09A8\u09BE'],
    all: ['No people found', '\u0995\u09BE\u0989\u0995\u09C7 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'],
  };
  return (
    <div className="rounded-[32px] border border-dashed border-border bg-card/10 px-6 py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-primary shadow-inner">
        <Users size={28} />
      </div>
      <h3 className="text-lg font-bold tracking-tight">{t(msg[tab][0], msg[tab][1])}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        {t('Try another search or check back soon.', '\u0985\u09A8\u09CD\u09AF \u0995\u09BF\u099B\u09C1 \u0996\u09C1\u0981\u099C\u09C1\u09A8 \u09AC\u09BE \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09A6\u09C7\u0996\u09C1\u09A8\u0964')}
      </p>
    </div>
  );
}
