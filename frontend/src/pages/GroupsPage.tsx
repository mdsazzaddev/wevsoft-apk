import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'motion/react';
import {
  ChevronDown, LayoutGrid, List, Image as ImageIcon, PieChart, Smile, X, UsersRound, UserCheck, Compass, CalendarDays, MapPin, Plus,
  LogOut, PenLine, Search, Sparkles, Inbox, Users, ArrowRight, Loader2, Bookmark,
} from 'lucide-react';
import { useStore } from '../store';
import { resolveAvatarUrl } from '../components/UserAvatar';
import {
  hubFetch, catMeta, CATEGORY_META, GroupAvatar, PersonAvatar, fmtCount, plural, card,
  type HubGroup, type HubOverview, type HubPost, type HubTrending, type HubEvent,
} from '../components/groups/groupsApi';
import { GroupsTopBar, type HubTab } from '../components/groups/GroupsTopBar';
import {
  LeftRail, RightRail, GroupCard, GroupListRow, GroupCardSkeleton, JoinButton, PrivacyBadge, useJoinGroup, VIEW_META, type HubView,
} from '../components/groups/GroupsRails';
import { GroupPostCard, PostMediaTile, PostSkeleton } from '../components/groups/GroupPostCard';
import { GroupPostModal, type ComposerMode } from '../components/groups/GroupPostModal';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';


type SortKey = 'recent' | 'discussed' | 'liked';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'discussed', label: 'Most Discussed' },
  { key: 'liked', label: 'Most Liked' },
];
const GROUP_SORTS: { key: 'recent' | 'popular' | 'active' | 'name'; label: string }[] = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'popular', label: 'Most Members' },
  { key: 'active', label: 'Most Active' },
  { key: 'name', label: 'Name (A-Z)' },
];
const VIEWS: HubView[] = ['all', 'joined', 'mine', 'saved'];
const TABS: HubTab[] = ['groups', 'discover', 'events'];

function readLS<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function SortPills({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort posts">
      {SORTS.map((s) => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-pressed={active}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition ${
              active
                ? 'bg-primary text-white shadow-sm '
                : 'bg-muted text-foreground/80 hover:bg-muted '
            }`}
          >
            {s.label}
            {active && <ChevronDown size={14} className="opacity-90" />}
          </button>
        );
      })}
    </div>
  );
}

function GroupSortMenu({ value, onChange }: { value: string; onChange: (s: any) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground/80 transition hover:border-foreground/25 "
      >
        {GROUP_SORTS.find((s) => s.key === value)?.label || 'Most Recent'}
        <ChevronDown size={14} className={`text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-border bg-card p-1 shadow-sm ">
          {GROUP_SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="option"
              aria-selected={s.key === value}
              onClick={() => { onChange(s.key); setOpen(false); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-[12.5px] ${s.key === value ? 'bg-primary/10 font-semibold text-primary ' : 'text-foreground/70 hover:bg-muted/60 '}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, children }: { icon: React.FC<any>; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-12 text-center`}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon size={28} />
      </span>
      <h3 className="text-[16px] font-bold text-foreground ">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground ">{text}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

const primaryBtn = 'inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90';
const ghostBtn = 'inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-semibold text-foreground/80 transition hover:bg-muted';

/** Session cache of the last hub lists, so revisiting shows them instantly while they refresh. */
const hubCache = new Map<string, unknown>();
let hubCacheOwner: string | null | undefined;
function hubCacheFor(token: string | null | undefined) {
  if (hubCacheOwner !== token) { hubCache.clear(); hubCacheOwner = token; }
  return hubCache;
}

export default function GroupsPage() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user) as any;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tab: HubTab = TABS.includes(params.get('tab') as HubTab) ? (params.get('tab') as HubTab) : 'groups';
  const view: HubView = VIEWS.includes(params.get('view') as HubView) ? (params.get('view') as HubView) : 'joined';
  const category = params.get('category') && CATEGORY_META[params.get('category') as string] ? params.get('category') : null;
  const groupId = params.get('group');
  const q = params.get('q') || '';

  const [sort, setSortState] = useState<SortKey>(() => readLS('wev.groups.sort', ['recent', 'discussed', 'liked'] as const, 'recent'));
  const [groupSort, setGroupSortState] = useState<'recent' | 'popular' | 'active' | 'name'>(() => readLS('wev.groups.groupSort', ['recent', 'popular', 'active', 'name'] as const, 'recent'));
  const setGroupSort = (s: 'recent' | 'popular' | 'active' | 'name') => { setGroupSortState(s); try { localStorage.setItem('wev.groups.groupSort', s); } catch { /* ignore */ } };
  const [layout, setLayoutState] = useState<'grid' | 'list'>(() => readLS('wev.groups.layout', ['grid', 'list'] as const, 'list'));
  const setSort = (s: SortKey) => { setSortState(s); try { localStorage.setItem('wev.groups.sort', s); } catch { /* ignore */ } };
  const setLayout = (l: 'grid' | 'list') => { setLayoutState(l); try { localStorage.setItem('wev.groups.layout', l); } catch { /* ignore */ } };

  const [overview, setOverview] = useState<HubOverview | null>(() => (hubCacheFor(token).get('o') as HubOverview | undefined) ?? null);
  const [groups, setGroups] = useState<HubGroup[] | null>(null);
  const [focusGroup, setFocusGroup] = useState<HubGroup | null>(null);
  const [posts, setPosts] = useState<HubPost[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trending, setTrending] = useState<HubTrending[] | null>(() => (hubCacheFor(token).get('t') as HubTrending[] | undefined) ?? null);
  const [suggested, setSuggested] = useState<HubGroup[] | null>(() => (hubCacheFor(token).get('s') as HubGroup[] | undefined) ?? null);
  const [discover, setDiscover] = useState<HubGroup[] | null>(null);
  const [events, setEvents] = useState<HubEvent[] | null>(null);
  const [composer, setComposer] = useState<{ mode: ComposerMode; groupIds: string[] } | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);


  
  
  
  
  
  
  
  

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setParams(next);
    },
    [params, setParams],
  );

  const myGroups = overview?.myGroups || [];

  // ── Loaders ──
  const loadOverview = useCallback(() => {
    hubFetch<HubOverview>(token, '/overview').then((o) => { hubCacheFor(token).set('o', o); setOverview(o); }).catch(() => setOverview({ counts: { all: 0, joined: 0, myPosts: 0, savedPosts: 0 }, categories: [], myGroups: [] }));
  }, [token]);
  const loadSide = useCallback(() => {
    hubFetch<{ posts: HubTrending[] }>(token, '/trending').then((r) => { hubCacheFor(token).set('t', r.posts); setTrending(r.posts); }).catch(() => setTrending([]));
    hubFetch<{ groups: HubGroup[] }>(token, '/suggested?limit=4').then((r) => { hubCacheFor(token).set('s', r.groups); setSuggested(r.groups); }).catch(() => setSuggested([]));
  }, [token]);

  useEffect(() => {
    loadOverview();
    loadSide();
  }, [token, loadOverview, loadSide]);

  const groupFilter = 'joined';
  const groupsQS = useMemo(() => {
    const sp = new URLSearchParams({ filter: groupFilter, sort: groupSort, limit: '24' });
    if (category) sp.set('category', category);
    if (q) sp.set('q', q);
    return sp.toString();
  }, [groupFilter, groupSort, category, q]);
  const loadGroups = useCallback(() => {
    hubFetch<{ groups: HubGroup[] }>(token, `/groups?${groupsQS}`)
      .then((r) => { hubCacheFor(token).set('g|' + groupsQS, r.groups); setGroups(r.groups); })
      .catch(() => setGroups((cur) => cur ?? []));
  }, [token, groupsQS]);
  useEffect(() => {
    if (tab !== 'groups') return;
    // Cached list shows instantly; the skeleton only appears on a first visit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setGroups((hubCacheFor(token).get('g|' + groupsQS) as HubGroup[] | undefined) ?? null);
    loadGroups();
  }, [tab, loadGroups]);

  const feedQuery = useMemo(() => {
    const sp = new URLSearchParams({ scope: view, limit: '8' });
    if (groupId) sp.set('groupId', groupId);
    if (category) sp.set('category', category);
    if (q) sp.set('q', q);
    return sp.toString();
  }, [view, groupId, category, q]);

  const loadFeed = useCallback(() => {
    const cached = hubCacheFor(token).get('f|' + feedQuery) as { posts: HubPost[]; cursor: string | null } | undefined;
    setPosts(cached ? cached.posts : null);
    if (cached) setCursor(cached.cursor);
    setFeedError(false);
    hubFetch<{ posts: HubPost[]; nextCursor: string | null }>(token, `/feed?${feedQuery}`)
      .then((r) => { hubCacheFor(token).set('f|' + feedQuery, { posts: r.posts, cursor: r.nextCursor }); setPosts(r.posts); setCursor(r.nextCursor); })
      .catch(() => { setPosts([]); setCursor(null); setFeedError(true); });
  }, [token, feedQuery]);
  useEffect(() => {
    if (tab !== 'groups') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadFeed();
  }, [tab, loadFeed]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    hubFetch<{ posts: HubPost[]; nextCursor: string | null }>(token, `/feed?${feedQuery}&cursor=${encodeURIComponent(cursor)}`)
      .then((r) => { setPosts((p) => [...(p || []), ...r.posts.filter((x) => !(p || []).some((y) => y.id === x.id))]); setCursor(r.nextCursor); })
      .catch(() => toast.error('Could not load more posts'))
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, token, feedQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { root: scrollRef.current, rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  // Focused group (banner) — reuse loaded data, otherwise fetch it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!groupId) { setFocusGroup(null); return; }
    const known = [...(groups || []), ...myGroups, ...(suggested || []), ...(discover || [])].find((g) => g.id === groupId);
    if (known) { setFocusGroup(known); return; }
    hubFetch<{ group: HubGroup }>(token, `/groups/${groupId}`).then((r) => setFocusGroup(r.group)).catch(() => { setFocusGroup(null); toast.error('Group not found'); setParam({ group: null }); });
     
  }, [groupId, groups, overview, suggested, discover, token]);

  useEffect(() => {
    if (tab !== 'discover') return;
    const sp = new URLSearchParams({ filter: 'discover', sort: groupSort, limit: '48' });
    if (category) sp.set('category', category);
    if (q) sp.set('q', q);
    const key = 'd|' + sp.toString();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    setDiscover((hubCacheFor(token).get(key) as HubGroup[] | undefined) ?? null);
    hubFetch<{ groups: HubGroup[] }>(token, `/groups?${sp}`)
      .then((r) => { hubCacheFor(token).set(key, r.groups); setDiscover(r.groups); })
      .catch(() => setDiscover((cur) => cur ?? []));
  }, [tab, groupSort, category, q, token]);

  useEffect(() => {
    if (tab !== 'events') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setEvents((hubCacheFor(token).get('e') as HubEvent[] | undefined) ?? null);
    hubFetch<{ events: HubEvent[] }>(token, '/events')
      .then((r) => { hubCacheFor(token).set('e', r.events); setEvents(r.events); })
      .catch(() => setEvents((cur) => cur ?? []));
  }, [tab, token]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab, view, category]);

  // ── Actions ──
  const markGroup = (id: string, patch: Partial<HubGroup>) => {
    const apply = (list: HubGroup[] | null) => (list ? list.map((g) => (g.id === id ? { ...g, ...patch } : g)) : list);
    setGroups(apply);
    setSuggested(apply);
    setDiscover(apply);
    setFocusGroup((g) => (g && g.id === id ? { ...g, ...patch } : g));
  };
  const { join, busy: joinBusy } = useJoinGroup((id, state) => {
    const base = [...(groups || []), ...(suggested || []), ...(discover || []), ...(focusGroup ? [focusGroup] : [])].find((g) => g.id === id);
    markGroup(id, state === 'joined' ? { joined: true, pending: false, role: 'member', memberCount: (base?.memberCount || 0) + 1 } : { pending: true });
    loadOverview();
  });

  const leave = async (g: HubGroup) => {
    if (!window.confirm(`Leave ${g.name}?`)) return;
    try {
      await hubFetch(token, `/groups/${g.id}/leave`, { method: 'POST' });
      markGroup(g.id, { joined: false, role: null, memberCount: Math.max(0, g.memberCount - 1) });
      toast.success(`You left ${g.name}`);
      loadOverview();
      if (view !== 'all') loadGroups();
    } catch (e: any) {
      toast.error(e?.message || 'Could not leave');
    }
  };

  const openComposer = (mode: ComposerMode = 'text', preset?: string[]) => {
    if (!overview) return;
    if (!myGroups.length) {
      toast('Join or create a group first — posts always live inside groups.', { icon: '👥' });
      return;
    }
    const pre = preset ?? (focusGroup?.joined ? [focusGroup.id] : []);
    setComposer({ mode, groupIds: pre });
  };

  const onPosted = (post: HubPost) => {
    const visible = !groupId || post.groups.some((g) => g.id === groupId);
    if (visible && view !== 'saved') setPosts((p) => [post, ...(p || [])]);
    loadOverview();
    loadGroups();
  };

  const onGroupCreated = (g: HubGroup) => {
    loadOverview();
    loadSide();
    setGroups((list) => [g, ...(list || [])]);
    setParam({ tab: null, group: g.id });
  };

  const openGroup = (id: string) => setParam({ tab: null, group: groupId === id ? null : id });

  // ── Header copy ──
  const headerTitle = q ? `Results for “${q}”` : category ? `${catMeta(category).label} Groups` : VIEW_META[view].title;
  const headerSub = q ? 'Groups and posts matching your search.' : category ? `Communities and posts in ${catMeta(category).label.toLowerCase()}.` : VIEW_META[view].sub;

  const composerBar = (
    <div
      className="w-full bg-card border border-border rounded-xl px-2.5 py-2 shadow-sm hover:border-primary/40 transition-all cursor-pointer group select-none"
      onClick={() => openComposer('text')}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <PersonAvatar user={user} size={32} className="border border-border" />
        
        <div className="flex-1 min-w-0 bg-muted/60 hover:bg-muted border border-border rounded-full px-3 py-1.5 text-muted-foreground transition-all text-[12.5px] font-medium flex items-center justify-between">
          <span className="truncate">
            {focusGroup?.joined ? `Share something with ${focusGroup.name}…` : 'Share something with your groups…'}
          </span>
          <Sparkles
            size={13}
            className="text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
          />
        </div>
        
        <button
          type="button"
          className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          title="Photo/Video"
          onClick={(e) => {
            e.stopPropagation();
            openComposer('media');
          }}
        >
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          className="shrink-0 p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
          title="Poll"
          onClick={(e) => {
            e.stopPropagation();
            openComposer('poll');
          }}
        >
          <PieChart size={16} />
        </button>
        <button
          type="button"
          className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          title="Feeling/Activity"
          onClick={(e) => {
            e.stopPropagation();
            openComposer('feeling');
          }}
        >
          <Smile size={16} />
        </button>
      </div>
    </div>
  );

  const focusBanner = focusGroup && (
    <section className={`${card} overflow-hidden`}>
      <div className={`relative h-32 overflow-hidden sm:h-40 ${catMeta(focusGroup.category).grad}`}>
        {resolveAvatarUrl(focusGroup.coverPhoto) && <img src={resolveAvatarUrl(focusGroup.coverPhoto) as string} alt="" className="h-full w-full object-cover" />}
        <button type="button" onClick={() => setParam({ group: null })} aria-label="Close group" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-foreground shadow-sm hover:bg-card">
          <X size={16} />
        </button>
      </div>
      <div className="relative flex flex-col gap-3 px-4 pb-4 pt-9 sm:flex-row sm:items-end sm:px-5">
        <GroupAvatar group={focusGroup} size={68} className="absolute -top-9 left-4 rounded-xl ring-[3px] ring-card sm:left-5" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[19px] font-bold text-foreground ">{focusGroup.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted-foreground ">
            <PrivacyBadge privacy={focusGroup.privacy} /> <span>·</span>
            <span>{fmtCount(focusGroup.memberCount)} member{focusGroup.memberCount === 1 ? '' : 's'}</span> <span>·</span>
            <span>{fmtCount(focusGroup.postCount)} post{focusGroup.postCount === 1 ? '' : 's'}</span> <span>·</span>
            <span>{catMeta(focusGroup.category).label}</span>
          </p>
          {focusGroup.description && <p className="mt-2 line-clamp-2 text-[13px] text-foreground/70 ">{focusGroup.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {focusGroup.joined ? (
            <>
              <button type="button" onClick={() => openComposer('text', [focusGroup.id])} className={primaryBtn}><PenLine size={15} /> Post here</button>
              {focusGroup.role !== 'owner' && (
                <button type="button" onClick={() => leave(focusGroup)} className={ghostBtn}><LogOut size={15} /> Leave</button>
              )}
            </>
          ) : (
            <JoinButton group={focusGroup} busy={joinBusy === focusGroup.id} onJoin={() => join(focusGroup)} size="md" />
          )}
        </div>
      </div>
    </section>
  );

  const mobileChip = (active: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-muted'}`;
  const mobileFilters = (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:hidden [scrollbar-width:none]">
      <button type="button" onClick={() => setParam({ tab: null, view: null, category: null, group: null })} className={mobileChip(tab === 'groups' && view === 'joined' && !category)}>
        <UserCheck size={14} /> Your Feed
      </button>
      <button type="button" onClick={() => setParam({ tab: null, view: 'all', category: null, group: null })} className={mobileChip(tab === 'groups' && view === 'all' && !category)}>
        <UsersRound size={14} /> Joined Groups
      </button>
      <button type="button" onClick={() => setParam({ tab: null, view: 'mine', category: null, group: null })} className={mobileChip(tab === 'groups' && view === 'mine' && !category)}>
        <LayoutGrid size={14} /> My Posts
      </button>
      <button type="button" onClick={() => setParam({ tab: null, view: 'saved', category: null, group: null })} className={mobileChip(tab === 'groups' && view === 'saved' && !category)}>
        <Bookmark size={14} /> Saved
      </button>
      <button type="button" onClick={() => setParam({ tab: 'discover', group: null })} className={mobileChip(tab === 'discover')}>
        <Compass size={14} /> Discover
      </button>
      <button type="button" onClick={() => setCreateGroupOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-[12.5px] font-semibold text-primary">
        <Plus size={14} /> Create group
      </button>
    </div>
  );

  const sortedPosts = useMemo(() => {
    if (!posts) return null;
    if (sort === 'recent') return posts;
    const copy = [...posts];
    if (sort === 'discussed') copy.sort((a, b) => (b.counts.comments - a.counts.comments) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    else if (sort === 'liked') copy.sort((a, b) => (b.counts.likes - a.counts.likes) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    return copy;
  }, [posts, sort]);

  const noGroupsAtAll = groups !== null && groups.length === 0 && !q && !category && !groupId && (view === 'all' || view === 'joined');

  const groupsTab = (
    <div className="min-w-0 space-y-4">
      {mobileFilters}




      {(q || category || view !== 'joined') && (
        <div className="flex flex-wrap gap-2">
          {view !== 'joined' && <FilterChip label={VIEW_META[view].label} onClear={() => setParam({ view: null })} />}
          {category && <FilterChip label={catMeta(category).label} onClear={() => setParam({ category: null })} />}
          {q && <FilterChip label={`“${q}”`} onClear={() => setParam({ q: null })} />}
        </div>
      )}

      {/* Explore-only: browse group profiles (not part of Your Feed post stream) */}
      {view === 'all' && (
        noGroupsAtAll ? (
          <EmptyState icon={UsersRound} title="No groups yet" text="Groups are where communities share posts, polls and events. Be the first to start one.">
            <button type="button" onClick={() => setCreateGroupOpen(true)} className={primaryBtn}><Plus size={15} /> Create Group</button>
          </EmptyState>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold text-foreground ">Your joined groups</h2>
              <button type="button" onClick={() => setParam({ tab: 'discover' })} className="text-[12px] font-semibold text-primary ">Discover</button>
            </div>
            {layout === 'list' ? (
              <div className={`${card} p-2`}>
                {groups === null && <div className="space-y-2 p-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted " />)}</div>}
                {groups?.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">No groups match these filters.</p>}
                {groups?.map((g) => (
                  <GroupListRow key={g.id} group={g} active={g.id === groupId} onOpen={() => openGroup(g.id)} onJoin={() => join(g)} joinBusy={joinBusy === g.id} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {groups === null && Array.from({ length: 4 }).map((_, i) => <GroupCardSkeleton key={i} />)}
                {groups?.map((g) => (
                  <GroupCard key={g.id} group={g} active={g.id === groupId} onOpen={() => openGroup(g.id)} onJoin={() => join(g)} joinBusy={joinBusy === g.id} />
                ))}
                {groups?.length === 0 && (
                  <div className="col-span-full flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-[12.5px] text-muted-foreground ">
                    <Search size={20} className="mb-2 text-muted-foreground" />
                    No groups match these filters.
                    <button type="button" onClick={() => setParam({ tab: 'discover' })} className="mt-2 font-semibold text-primary ">Discover groups</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* Joined-home empty: prompt to create/join when user has zero groups */}
      {view !== 'all' && noGroupsAtAll && (
        <EmptyState icon={UsersRound} title="No groups yet" text="Groups are where communities share posts, polls and events. Be the first to start one.">
          <button type="button" onClick={() => setCreateGroupOpen(true)} className={primaryBtn}><Plus size={15} /> Create Group</button>
          <button type="button" onClick={() => setParam({ tab: 'discover' })} className={ghostBtn}><Compass size={15} /> Discover groups</button>
        </EmptyState>
      )}

      {focusBanner}

      {/* Suggested strip for < xl (right rail hidden) */}
      {suggested && suggested.length > 0 && (
        <div className="xl:hidden">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-foreground ">Suggested Groups</h3>
            <button type="button" onClick={() => setParam({ tab: 'discover' })} className="text-[12px] font-semibold text-primary ">View All</button>
          </div>
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {suggested.map((g) => (
              <div key={g.id} className={`${card} flex w-[220px] shrink-0 items-center gap-3 p-3`}>
                <button type="button" onClick={() => openGroup(g.id)}><GroupAvatar group={g} size={40} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground ">{g.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{plural(g.memberCount, 'member')}</p>
                </div>
                <JoinButton group={g} busy={joinBusy === g.id} onJoin={() => join(g)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {(view !== 'all' || focusGroup) && (!focusGroup || focusGroup.joined) && !noGroupsAtAll && composerBar}
      {overview && !myGroups.length && !noGroupsAtAll && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 p-4 text-[13px] text-foreground sm:flex-row sm:items-center">
          <Sparkles size={18} className="shrink-0 text-primary" />
          <span className="flex-1">Posts always live inside groups. Join a group (or create your own) to start posting.</span>
          <button type="button" onClick={() => setParam({ tab: 'discover' })} className="font-semibold text-primary hover:underline ">Discover groups</button>
        </div>
      )}

      {/* Feed — posts only (Facebook-style). Hidden on Joined Groups list (no focus). */}
      {(view !== 'all' || focusGroup) && <div className="space-y-4">
        {posts === null && (
          layout === 'grid'
            ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${card} aspect-[4/5] animate-pulse`} />)}</div>
            : <><PostSkeleton /><PostSkeleton /></>
        )}
        {posts?.length === 0 && !noGroupsAtAll && (
          feedError ? (
            <EmptyState icon={Inbox} title="Couldn't load posts" text="Something went wrong while loading the feed.">
              <button type="button" onClick={loadFeed} className={ghostBtn}>Try again</button>
            </EmptyState>
          ) : view === 'saved' ? (
            <EmptyState icon={Inbox} title="No saved posts" text="Tap Save on any group post to keep it here for later." />
          ) : view === 'mine' ? (
            <EmptyState icon={PenLine} title="You haven't posted yet" text="Share an update, photo or poll with one or more of your groups.">
              {myGroups.length > 0 && <button type="button" onClick={() => openComposer('text')} className={primaryBtn}><PenLine size={15} /> Create Post</button>}
            </EmptyState>
          ) : (
            <EmptyState
              icon={Users}
              title={q ? 'No posts match your search' : focusGroup ? 'No posts in this group yet' : 'No posts yet'}
              text={focusGroup && !focusGroup.joined && focusGroup.privacy !== 'public' ? 'Join this group to see what members are sharing.' : 'Start the conversation — your post can go to several groups at once.'}
            >
              {myGroups.length > 0 && (!focusGroup || focusGroup.joined) && <button type="button" onClick={() => openComposer('text')} className={primaryBtn}><PenLine size={15} /> Create Post</button>}
              {!myGroups.length && <button type="button" onClick={() => setParam({ tab: 'discover' })} className={ghostBtn}><Compass size={15} /> Discover groups</button>}
            </EmptyState>
          )
        )}
        {sortedPosts && sortedPosts.length > 0 && layout === 'grid' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sortedPosts.map((p) => (
              <PostMediaTile
                key={p.id}
                post={p}
                onOpen={() => setLayout('list')}
              />
            ))}
          </div>
        )}
        {sortedPosts && sortedPosts.length > 0 && layout === 'list' && sortedPosts.map((p) => (
          <GroupPostCard
            key={p.id}
            post={p}
            onOpenGroup={openGroup}
            onChange={(np) => setPosts((list) => (list || []).map((x) => (x.id === np.id ? np : x)).filter((x) => view !== 'saved' || x.savedByMe))}
            onRemove={(id) => { setPosts((list) => (list || []).filter((x) => x.id !== id)); loadOverview(); }}
          />
        ))}
        <div ref={sentinelRef} />
        {loadingMore && <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="animate-spin" size={20} /></div>}
        {posts && posts.length > 0 && !cursor && <p className="py-4 text-center text-[12px] text-muted-foreground ">You're all caught up</p>}
      </div>}
    </div>
  );


  const discoverTab = (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-tight text-foreground">Discover groups</h1>
          <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">Find communities that match your interests, join the conversation, and share to many groups at once.</p>
        </div>
        <button type="button" onClick={() => setCreateGroupOpen(true)} className={`${primaryBtn} shrink-0 self-start sm:self-auto`}>
          <Plus size={15} /> Create your own
        </button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
          <button type="button" onClick={() => setParam({ category: null })} className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${!category ? 'border-primary bg-primary text-white' : 'border-border bg-card text-foreground/70 '}`}>All</button>
          {Object.keys(CATEGORY_META).map((key) => {
            const m = catMeta(key);
            const on = key === category;
            return (
              <button key={key} type="button" onClick={() => setParam({ category: on ? null : key })} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-border bg-card text-foreground/70 '}`}>
                <m.icon size={13} /> {m.label}
              </button>
            );
          })}
        </div>
        <GroupSortMenu value={groupSort} onChange={setGroupSort} />
      </div>
      {discover === null ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${card} h-56 animate-pulse`} />)}</div>
      ) : discover.length === 0 ? (
        <EmptyState icon={Compass} title="Nothing new to discover" text={q || category ? 'No groups match these filters. Try another category or search.' : "You've joined every group available. Why not start a new one?"}>
          <button type="button" onClick={() => setCreateGroupOpen(true)} className={primaryBtn}><Plus size={15} /> Create Group</button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {discover.map((g) => {
            const m = catMeta(g.category);
            const cover = resolveAvatarUrl(g.coverPhoto);
            return (
              <div key={g.id} className={`${card} group flex flex-col overflow-hidden transition hover:shadow-md`}>
                <button type="button" onClick={() => openGroup(g.id)} className={`relative block h-24 w-full overflow-hidden ${m.grad}`}>
                  {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground/80"><m.icon size={11} /> {m.label}</span>
                </button>
                <div className="relative flex flex-1 flex-col p-4 pt-8">
                  <GroupAvatar group={g} size={48} className="absolute -top-6 left-4 ring-[3px] ring-card " />
                  <p className="truncate text-[14.5px] font-bold text-foreground ">{g.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground "><PrivacyBadge privacy={g.privacy} /> · {plural(g.memberCount, 'member')} · {plural(g.postCount, 'post')}</p>
                  <p className="mt-2 line-clamp-2 flex-1 text-[12.5px] text-foreground/70 ">{g.description || 'No description yet.'}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={() => openGroup(g.id)} className="flex items-center gap-1 text-[12.5px] font-semibold text-foreground/70 hover:text-primary ">View <ArrowRight size={13} /></button>
                    <JoinButton group={g} busy={joinBusy === g.id} onJoin={() => join(g)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const eventsTab = (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground ">Group Events</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground ">Upcoming events from the groups you belong to.</p>
        </div>
        <button type="button" onClick={() => navigate('/events')} className={ghostBtn}><CalendarDays size={15} /> Open Events</button>
      </div>
      {events === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className={`${card} h-24 animate-pulse`} />)}</div>
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming group events" text="When admins of your groups schedule events, they'll appear here." />
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const d = new Date(e.startTime);
            return (
              <div key={e.id} className={`${card} flex items-center gap-4 p-4`}>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground">
                  <span className="text-center leading-none">
                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-primary">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="block text-[20px] font-bold">{d.getDate()}</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-foreground ">{e.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground ">
                    {e.isAllDay ? 'All day' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {e.location && <> · <MapPin size={11} className="inline" /> {e.location}</>}
                    {' · '}{e.attendees} going
                  </p>
                  {e.group && <button type="button" onClick={() => openGroup(e.group!.id)} className="mt-1 text-[12px] font-semibold text-primary hover:underline ">{e.group.name}</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );



  







  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground ">
      <GroupsTopBar
        query={q}
        onQuery={(nq) => setParam({ q: nq || null })}
        onCreatePost={() => openComposer('text')}
        onCreateGroup={() => setCreateGroupOpen(true)}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)] gap-5 px-3 pt-4 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:pt-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="hidden min-h-0 overflow-y-auto overscroll-contain lg:block">
            <div className="pb-10 pt-2">
              <LeftRail
                overview={overview}
                view={tab === 'groups' ? view : ('' as HubView)}
                category={category}
                discoverActive={tab === 'discover'}
                onView={(v) => setParam({ tab: null, view: v === 'joined' ? null : v, category: null, group: null })}
                onCategory={(c) => setParam({ tab: tab === 'discover' ? 'discover' : null, category: c, group: null })}
                onViewAllCategories={() => setParam({ tab: 'discover', group: null })}
                onOpenGroup={openGroup}
              />
            </div>
          </aside>
          <main ref={scrollRef} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain pb-24 lg:pb-10">{tab === 'discover' ? discoverTab : tab === 'events' ? eventsTab : groupsTab}</main>
          <aside className="hidden min-h-0 overflow-y-auto overscroll-contain xl:block">
            <div className="pb-10 pt-2">
              <RightRail
                trending={trending}
                suggested={suggested}
                onOpenPost={(t) => navigate(`/posts/${t.id}`)}
                onOpenGroup={openGroup}
                onJoin={join}
                joinBusy={joinBusy}
                onDiscover={() => setParam({ tab: 'discover', group: null })}
                onCreateGroup={() => setCreateGroupOpen(true)}
              />
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {composer && overview && (
          <GroupPostModal myGroups={myGroups} initialGroupIds={composer.groupIds} mode={composer.mode} onClose={() => setComposer(null)} onPosted={onPosted} />
        )}
      </AnimatePresence>
      {createGroupOpen && <CreateGroupModal defaultCategory={category} onClose={() => setCreateGroupOpen(false)} onCreated={onGroupCreated} />}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-[12px] font-semibold text-primary ">
      {label}
      <button type="button" onClick={onClear} aria-label={`Clear ${label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/15 "><X size={12} /></button>
    </span>
  );
}
