/**
 * Wevsoft Space Inbox — phase 1 (Meta Business Suite / Messenger / Intercom style).
 *
 * Rendered by SpaceManagePage for /space/:handle/manage/wevchat as its own
 * full-viewport app: global header, collapsible left rail, an analytics strip
 * and the three-pane inbox (conversations · chat · contact). It lives inside
 * the dashboard's ManageProvider, so the Space, the viewer's permissions
 * (messages.read / reply / assign …) and refresh() are exactly the ones the
 * classic MessagesPanel used; the server re-checks every call (§24).
 *
 * Identity rules from the classic panel still hold: rows come from the Space's
 * own inbox threads (never a personal DM) and "Replying as ✓ <Space>" stays
 * pinned above the list and the composer (§11).
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Contact,
  ExternalLink,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutList,
  Lock,
  Megaphone,
  Menu,
  MessageSquareText,
  MessagesSquare,
  PenSquare,
  Search,
  Settings,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  isVerifiedSpace,
  spaceDashboardPath,
  spaceDeskPath,
  spacePublicPath,
  type SpaceDashboardSection,
} from '@wevsoft/shared/wevspace';
import WevsoftMark from '../../auth/WevsoftMark';
import { useStore } from '../../../store';
import { useSpaceIdentities } from '../../../lib/useSpaceIdentities';
import { useUnreadNotifications } from '../../../hooks/useUnreadNotifications';
import { useManage } from '../manage/ManageContext';
import ConversationList from './ConversationList';
import ChatPane from './ChatPane';
import ContactPanel from './ContactPanel';
import StandingBanner from '../manage/StandingBanner';
import {
  SAMPLE_SIZE,
  computeStats,
  compact,
  duration,
  filterDef,
  matchesSearch,
  useInboxActivity,
  usePresence,
  useThreadDetail,
  useThreadList,
  type InboxFilterId,
} from './inboxData';
import { Avatar, EmptyBlock, IconBtn, MenuItem, Popover, btn, cx, useDismiss } from './inboxUi';
import './inbox.css';

const CannedRepliesSheet = lazy(() => import('../manage/CannedRepliesSheet'));

type ViewId = 'inbox' | 'spaces' | 'broadcast' | 'tickets' | 'crm' | 'analytics' | 'ai' | 'settings';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** view: rendered inside the inbox · section: another dashboard section · placeholder views otherwise. */
  view?: ViewId;
  section?: SpaceDashboardSection;
  /** An existing app page elsewhere (Business suite); opened in place of an inbox view. */
  href?: string;
  /** A WevDesk page (/space/:handle/desk/<desk>). */
  desk?: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'overview' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, view: 'inbox' },
  { id: 'spaces', label: 'Spaces', icon: Building2, view: 'spaces' },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone, view: 'broadcast', desk: 'broadcast' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, view: 'tickets', href: '/business/support' },
  { id: 'crm', label: 'CRM', icon: Contact, view: 'crm', href: '/business/crm' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'analytics', view: 'analytics' },
  // Space-scoped AI agent config lives inside the WevDesk shell (not the personal /business/ai page).
  { id: 'ai', label: 'AI Assistant', icon: Bot, view: 'ai', desk: 'ai-agents' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'settings', view: 'settings' },
];

const VIEW_IDS: ViewId[] = ['inbox', 'spaces', 'broadcast', 'tickets', 'crm', 'analytics', 'ai', 'settings'];
const COLLAPSE_KEY = 'wevsoft.spaceInbox.railCollapsed';

export default function SpaceInbox({
  sectionIds,
  embedded = false,
}: {
  sectionIds: SpaceDashboardSection[];
  /** Rendered inside the WevDesk shell: no own header / rail, fills its parent. */
  embedded?: boolean;
}) {
  const ctx = useManage();
  const { space, spaceId } = ctx;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const me = useStore((s) => s.user) as any;

  const rawTab = params.get('tab') as ViewId | null;
  const view: ViewId = rawTab && VIEW_IDS.includes(rawTab) ? rawTab : 'inbox';
  const filter = filterDef((params.get('filter') as InboxFilterId) || 'all');
  const selectedId = params.get('c');

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawer, setDrawer] = useState(false);
  const [contactOpen, setContactOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const [showCanned, setShowCanned] = useState(false);

  const setParam = useCallback(
    (patch: Record<string, string | null>, push = false) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: !push });
    },
    [params, setParams],
  );

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        /* not persisted */
      }
      return !v;
    });
  };

  // ── data ────────────────────────────────────────────────
  const presence = usePresence();
  const serverList = useThreadList(spaceId, filter.source === 'server' ? filter.params || null : null, search);
  const openSample = useThreadList(spaceId, { folder: 'inbox' }, '', SAMPLE_SIZE);
  const resolvedSample = useThreadList(spaceId, { folder: 'resolved' }, '', SAMPLE_SIZE);
  const detail = useThreadDetail(selectedId);

  const meId: string | null = me?.id || null;
  const threads = useMemo(() => {
    if (filter.source === 'none') return [];
    if (filter.source === 'derived') {
      return openSample.threads.filter((t) => filter.match!(t, { meId })).filter((t) => matchesSearch(t, search));
    }
    const rows = serverList.threads.filter((t) => matchesSearch(t, search));
    return filter.match ? rows.filter((t) => filter.match!(t, { meId })) : rows;
  }, [filter, openSample.threads, serverList.threads, search, meId]);

  const listMeta = serverList.data || openSample.data;
  const replyingAs = listMeta?.replyingAs || detail.data?.replyingAs || null;
  const canReply = listMeta ? listMeta.canReply === true : detail.data?.canReply === true;
  const canAssign = listMeta?.canAssign === true;
  const statusCounts: Record<string, number> | null = openSample.data?.statusCounts || serverList.data?.statusCounts || null;

  const counts = useMemo(() => {
    const out: Partial<Record<InboxFilterId, number>> = {};
    if (statusCounts) {
      out.all = statusCounts.OPEN || 0;
      out.requests = statusCounts.PENDING || 0;
      out.resolved = statusCounts.RESOLVED || 0;
      out.archived = statusCounts.ARCHIVED || 0;
      out.spam = statusCounts.SPAM || 0;
    }
    if (typeof ctx.counts.unreadThreads === 'number') out.unread = ctx.counts.unreadThreads;
    if (openSample.data) {
      out.assigned = openSample.threads.filter((t) => t.assignedTo).length;
      out.mine = openSample.threads.filter((t) => meId && t.assignedTo?.user?.id === meId).length;
      out.leads = openSample.threads.filter((t) => Array.isArray(t.labels) && t.labels.includes('lead')).length;
      out.support = openSample.threads.filter((t) => Array.isArray(t.labels) && t.labels.includes('support')).length;
    }
    return out;
  }, [statusCounts, ctx.counts.unreadThreads, openSample.data, openSample.threads, meId]);

  const stats = useMemo(
    () =>
      computeStats({
        statusCounts,
        unreadThreads: typeof ctx.counts.unreadThreads === 'number' ? ctx.counts.unreadThreads : undefined,
        openSample: openSample.data ? openSample.threads : null,
        resolvedSample: resolvedSample.data ? resolvedSample.threads : null,
      }),
    [statusCounts, ctx.counts.unreadThreads, openSample.data, openSample.threads, resolvedSample.data, resolvedSample.threads],
  );

  const listRow = useMemo(
    () =>
      (selectedId &&
        (serverList.threads.find((t) => t.id === selectedId) || openSample.threads.find((t) => t.id === selectedId) || resolvedSample.threads.find((t) => t.id === selectedId))) ||
      null,
    [selectedId, serverList.threads, openSample.threads, resolvedSample.threads],
  );

  const refreshLists = useCallback(() => {
    void serverList.refresh();
    void openSample.refresh();
    void resolvedSample.refresh();
     
  }, [serverList.refresh, openSample.refresh, resolvedSample.refresh]);

  const afterChange = useCallback(() => {
    refreshLists();
    void ctx.refresh();
  }, [refreshLists, ctx]);

  // Opening a thread clears its unread count on the server — reflect that in the lists and badges.
  const clearedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || !detail.data || clearedRef.current === selectedId) return;
    clearedRef.current = selectedId;
    if ((listRow?.unreadCount || 0) > 0) afterChange();
  }, [selectedId, detail.data, listRow, afterChange]);

  const conversationIdRef = useRef<string | null>(null);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  conversationIdRef.current = detail.data?.thread?.conversationId || listRow?.conversationId || null;
  useInboxActivity((conversationId, source) => {
    refreshLists();
    if (selectedId && (!conversationId || conversationId === conversationIdRef.current)) void detail.refresh();
    if (source === 'socket') void ctx.refresh();
  });

  const [refreshing, setRefreshing] = useState(false);
  const manualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([serverList.refresh(), openSample.refresh(), resolvedSample.refresh(), selectedId ? detail.refresh() : null, ctx.refresh()]);
    setRefreshing(false);
  };

  // ── navigation ──────────────────────────────────────────
  const openView = (item: NavItem) => {
    setDrawer(false);
    if (item.href) {
      navigate(item.href);
      return;
    }
    if (item.desk) {
      navigate(spaceDeskPath(ctx.handle, item.desk));
      return;
    }
    if (item.section && sectionIds.includes(item.section)) {
      ctx.goto(item.section);
      return;
    }
    if (item.view) setParam({ tab: item.view === 'inbox' ? null : item.view, c: item.view === 'inbox' ? selectedId : null });
  };

  const selectThread = (id: string) => setParam({ c: id, tab: null }, true);
  const closeThread = () => setParam({ c: null });
  const applySearch = (value: string) => {
    setSearch(value);
    if (view !== 'inbox') setParam({ tab: null });
  };

  const canSection = (s: SpaceDashboardSection) => sectionIds.includes(s);
  const inboxUnread = typeof ctx.counts.unreadThreads === 'number' ? ctx.counts.unreadThreads : 0;
  const verified = isVerifiedSpace(space?.verificationStatus);

  return (
    <div className={cx('si-root flex flex-col overflow-hidden', embedded ? 'relative h-full' : 'fixed inset-0 z-[40]')}>
      {!embedded && (
      <InboxHeader
        collapsed={collapsed}
        onToggleRail={toggleCollapsed}
        onOpenDrawer={() => setDrawer(true)}
        search={search}
        onSearch={applySearch}
        canSection={canSection}
        hideOnMobile={view === 'inbox' && Boolean(selectedId)}
      />
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Left rail (desktop) */}
        <aside
          aria-label="Inbox navigation"
          className={cx(
            embedded && '!hidden',
            'hidden lg:flex shrink-0 flex-col bg-[var(--si-side)] text-[var(--si-side-text)] transition-[width] duration-200',
            collapsed ? 'w-[68px]' : 'w-[228px]',
          )}
        >
          <Rail
            collapsed={collapsed}
            active={view}
            onPick={openView}
            canSection={canSection}
            inboxUnread={inboxUnread}
            replyingAs={replyingAs}
            spaceName={space?.name}
            verified={verified}
          />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="shrink-0 flex items-center gap-2 h-11 px-[22px] border-t border-[var(--si-side-line)] text-[12px] text-[var(--si-side-text)] hover:text-white"
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && 'Collapse'}
          </button>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          {view === 'inbox' ? (
            <>
              <div className={cx('shrink-0 px-3 lg:px-4 empty:hidden [&>*]:mt-3', selectedId && 'hidden lg:block')}>
                <StandingBanner />
              </div>
              <StatsStrip stats={stats} openTotal={statusCounts?.OPEN} className={selectedId ? 'hidden lg:flex' : 'flex'} />
              <div className="flex-1 min-h-0 flex lg:gap-3 lg:px-4 lg:pb-4">
                <div
                  className={cx(
                    'min-h-0 overflow-hidden w-full lg:w-[22%] lg:min-w-[290px] lg:max-w-[360px] lg:rounded-[10px] lg:border lg:border-[var(--si-border)] lg:[box-shadow:var(--si-shadow)]',
                    selectedId ? 'hidden lg:block' : 'block',
                  )}
                >
                  <ConversationList
                    filter={filter}
                    onFilter={(id) => setParam({ filter: id === 'all' ? null : id })}
                    counts={counts}
                    search={search}
                    onSearch={setSearch}
                    threads={threads}
                    loading={filter.source === 'derived' ? openSample.loading : serverList.loading}
                    error={filter.source === 'derived' ? openSample.error : serverList.error}
                    onRetry={() => void (filter.source === 'derived' ? openSample.reload() : serverList.reload())}
                    hasMore={filter.source === 'server' && serverList.hasMore}
                    loadingMore={serverList.loadingMore}
                    onLoadMore={() => void serverList.loadMore()}
                    selectedId={selectedId}
                    onSelect={selectThread}
                    presence={presence}
                    replyingAs={replyingAs}
                    canReply={canReply}
                    onOpenSaved={() => setShowCanned(true)}
                    onRefresh={() => void manualRefresh()}
                    refreshing={refreshing}
                  />
                </div>

                <div
                  className={cx(
                    'flex-1 min-w-0 min-h-0 overflow-hidden lg:rounded-[10px] lg:border lg:border-[var(--si-border)] lg:[box-shadow:var(--si-shadow)]',
                    selectedId ? 'block' : 'hidden lg:block',
                  )}
                >
                  {selectedId ? (
                    <ChatPane
                      spaceId={spaceId}
                      threadId={selectedId}
                      listRow={listRow}
                      detail={detail}
                      canAssign={canAssign}
                      presence={presence}
                      contactOpen={contactOpen}
                      onToggleContact={() => setContactOpen((v) => !v)}
                      onBack={closeThread}
                      onChanged={afterChange}
                      onOpenSaved={() => setShowCanned(true)}
                    />
                  ) : (
                    <div className="h-full grid place-items-center bg-[var(--si-card)]">
                      <EmptyBlock
                        icon={MessageSquareText}
                        title="Pick a conversation"
                        blurb="Replies go out as the Space, signed with its name and tick — never from your personal account."
                      />
                    </div>
                  )}
                </div>

                {selectedId && contactOpen && (
                  <div className="hidden xl:block w-[25%] min-w-[280px] max-w-[360px] min-h-0 overflow-hidden rounded-[10px] border border-[var(--si-border)] [box-shadow:var(--si-shadow)]">
                    <ContactPanel
                      thread={detail.data?.thread || null}
                      listRow={listRow}
                      replyingAs={replyingAs}
                      presence={presence[(detail.data?.thread?.customer || listRow?.customer)?.id]}
                      loading={detail.loading}
                      onClose={() => setContactOpen(false)}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <OtherView
              view={view}
              canSection={canSection}
              onGoto={(s) => ctx.goto(s)}
              onOpenSaved={canReply ? () => setShowCanned(true) : undefined}
              onBackToInbox={() => setParam({ tab: null })}
            />
          )}
        </main>
      </div>

      {/* Contact panel as a drawer below xl */}
      {view === 'inbox' && selectedId && contactOpen && (
        <div className="xl:hidden fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setContactOpen(false)}>
          <div className="w-full sm:w-[360px] h-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ContactPanel
              thread={detail.data?.thread || null}
              listRow={listRow}
              replyingAs={replyingAs}
              presence={presence[(detail.data?.thread?.customer || listRow?.customer)?.id]}
              loading={detail.loading}
              onClose={() => setContactOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile navigation drawer */}
      {drawer && !embedded && (
        <div className="lg:hidden fixed inset-0 z-[60] flex bg-black/50" onClick={() => setDrawer(false)}>
          <div className="w-[280px] max-w-[85vw] h-full flex flex-col bg-[var(--si-side)] text-[var(--si-side-text)]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 h-14 flex items-center gap-2 px-4 border-b border-[var(--si-side-line)]">
              <WevsoftMark className="h-[18px] w-auto" />
              <span className="text-[15px] font-bold text-white">Space Inbox</span>
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="ml-auto p-1.5 rounded-lg hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <Rail
              collapsed={false}
              active={view}
              onPick={openView}
              canSection={canSection}
              inboxUnread={inboxUnread}
              replyingAs={replyingAs}
              spaceName={space?.name}
              verified={verified}
            />
            <div className="shrink-0 p-3 grid grid-cols-2 gap-2 border-t border-[var(--si-side-line)]">
              <button type="button" onClick={() => navigate(spaceDeskPath(ctx.handle, 'new-chat'))} className="w-full h-9 rounded-lg bg-white/10 hover:bg-white/15 text-[12px] font-semibold text-white inline-flex items-center justify-center gap-1.5">
                <PenSquare size={14} /> New Chat
              </button>
              <button type="button" onClick={() => navigate(spaceDeskPath(ctx.handle, 'broadcast'))} className="w-full h-9 rounded-lg bg-white/10 hover:bg-white/15 text-[12px] font-semibold text-white inline-flex items-center justify-center gap-1.5">
                <Megaphone size={14} /> Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {showCanned && (
        <Suspense fallback={null}>
          <CannedRepliesSheet onClose={() => setShowCanned(false)} />
        </Suspense>
      )}
    </div>
  );
}

// ── header ────────────────────────────────────────────────

function InboxHeader({
  collapsed,
  onToggleRail,
  onOpenDrawer,
  search,
  onSearch,
  canSection,
  hideOnMobile,
}: {
  collapsed: boolean;
  onToggleRail: () => void;
  onOpenDrawer: () => void;
  search: string;
  onSearch: (value: string) => void;
  canSection: (s: SpaceDashboardSection) => boolean;
  hideOnMobile: boolean;
}) {
  const ctx = useManage();
  const navigate = useNavigate();
  const { unread } = useUnreadNotifications();
  const [draft, setDraft] = useState(search);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (draft.trim() !== search.trim()) onSearch(draft.trim());
    }, 400);
    return () => window.clearTimeout(t);
     
  }, [draft]);

  return (
    <header className={cx('shrink-0 h-14 items-center gap-2 px-2 sm:px-3 bg-[var(--si-card)] border-b border-[var(--si-border)] z-30', hideOnMobile ? 'hidden lg:flex' : 'flex')}>
      <button type="button" onClick={onOpenDrawer} aria-label="Open menu" className="lg:hidden p-2 rounded-lg text-[var(--si-text)] hover:bg-[var(--si-hover)]">
        <Menu size={19} />
      </button>
      <button type="button" onClick={onToggleRail} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'} className="hidden lg:grid place-items-center w-9 h-9 rounded-lg text-[var(--si-muted)] hover:bg-[var(--si-hover)] hover:text-[var(--si-text)]">
        <Menu size={18} />
      </button>
      <Link to="/home" className="flex items-center gap-2 shrink-0" aria-label="Wevsoft home">
        <WevsoftMark className="h-[18px] w-auto" />
        <span className="hidden sm:inline text-[17px] font-bold tracking-[-0.01em] text-[var(--si-text)]">Wevsoft</span>
      </Link>
      <span className="hidden sm:block w-px h-6 bg-[var(--si-border)] mx-1" />
      <h1 className="text-[14.5px] font-semibold text-[var(--si-text)] whitespace-nowrap">Space Inbox</h1>

      <SpaceSwitcherMenu />

      <div className="hidden md:block flex-1 max-w-[460px] mx-auto">
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--si-faint)]" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch(draft.trim());
            }}
            placeholder="Search conversations by name or @username"
            aria-label="Search the inbox"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] text-[13px] text-[var(--si-text)] placeholder:text-[var(--si-faint)] outline-none focus:border-[var(--si-blue)] focus:bg-[var(--si-card)]"
          />
        </label>
      </div>
      <span className="flex-1 md:hidden" />

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => navigate(spaceDeskPath(ctx.handle, 'new-chat'))} className={cx(btn.primary, 'hidden lg:inline-flex')}>
          <PenSquare size={15} /> New Chat
        </button>
        <button type="button" onClick={() => navigate(spaceDeskPath(ctx.handle, 'broadcast'))} className={cx(btn.secondary, 'hidden lg:inline-flex')}>
          <Megaphone size={15} /> Broadcast
        </button>
        <button
          type="button"
          onClick={() => navigate(spaceDeskPath(ctx.handle, 'workflows'))}
          className={cx(btn.secondary, 'hidden lg:inline-flex')}
          title="Instant reply, away message, FAQ & keyword rules"
        >
          <Zap size={15} /> Automations
        </button>
        <IconBtn
          icon={Bell}
          label="Notifications"
          badge={unread}
          tip={canSection('notifications') ? 'Space notifications' : 'Notifications'}
          onClick={() => (canSection('notifications') ? ctx.goto('notifications') : navigate('/notifications'))}
        />
        <span className="hidden sm:inline-flex">
          <IconBtn
            icon={Settings}
            label="Settings"
            disabled={!canSection('settings')}
            tip={canSection('settings') ? 'Space settings' : 'You do not have access to this Space\'s settings'}
            onClick={() => ctx.goto('settings')}
          />
        </span>
        <ProfileMenu />
      </div>
    </header>
  );
}

function SpaceSwitcherMenu() {
  const { space, isOwner, role } = useManage();
  const { spaces, loading } = useSpaceIdentities();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const others = spaces.filter((s) => s.id !== space?.id);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="ml-1 flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg border border-[var(--si-border)] bg-[var(--si-card)] hover:bg-[var(--si-hover)] min-w-0 max-w-[220px]"
      >
        <Avatar person={{ id: space?.id, name: space?.name, avatar: space?.avatar }} size={26} square />
        <span className="hidden sm:block min-w-0 text-left">
          <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--si-text)] leading-tight">
            <span className="truncate">{space?.name}</span>
            {isVerifiedSpace(space?.verificationStatus) && <BadgeCheck size={12} className="shrink-0 text-[var(--si-blue)]" />}
          </span>
          <span className="block text-[10.5px] text-[var(--si-muted)] leading-tight truncate">@{space?.handle}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-[var(--si-muted)]" />
      </button>
      {open && (
        <Popover className="left-0 top-11 w-[300px]">
          <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--si-faint)]">Current Space</p>
          <div className="mx-1.5 flex items-center gap-2.5 rounded-lg bg-[var(--si-blue-soft)] px-2.5 py-2">
            <Avatar person={{ id: space?.id, name: space?.name, avatar: space?.avatar }} size={34} square />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[var(--si-text)] truncate">{space?.name}</span>
              <span className="block text-[11px] text-[var(--si-muted)] truncate">
                @{space?.handle} · {isOwner ? 'Owner' : role ? role.charAt(0) + role.slice(1).toLowerCase() : 'Team'}
              </span>
            </span>
            <Check size={15} className="text-[var(--si-blue)]" />
          </div>
          <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--si-faint)]">Switch to</p>
          <div className="max-h-64 overflow-y-auto si-scroll px-1.5">
            {loading && others.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-[var(--si-muted)]">Loading your Spaces…</p>
            ) : others.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-[var(--si-muted)]">This is the only Space you manage.</p>
            ) : (
              others.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(spaceDeskPath(s.handle, 'inbox'));
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--si-hover)]"
                >
                  <Avatar person={{ id: s.id, name: s.name, avatar: s.avatar }} size={32} square />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] font-medium text-[var(--si-text)]">
                      <span className="truncate">{s.name}</span>
                      {s.verified && <BadgeCheck size={12} className="shrink-0 text-[var(--si-blue)]" />}
                    </span>
                    <span className="block text-[11px] text-[var(--si-muted)] truncate">
                      @{s.handle}
                      {s.role ? ` · ${String(s.role).charAt(0)}${String(s.role).slice(1).toLowerCase()}` : ''}
                    </span>
                  </span>
                  {(s.unreadCount || 0) > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--si-red)] text-white text-[10px] font-bold leading-[18px] text-center">
                      {(s.unreadCount as number) > 99 ? '99+' : s.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[var(--si-border)]">
            <MenuItem icon={MessagesSquare} onClick={() => navigate('/messages')}>
              Personal messages
            </MenuItem>
            <MenuItem icon={Building2} onClick={() => navigate('/spaces')}>
              Browse Spaces
            </MenuItem>
          </div>
        </Popover>
      )}
    </div>
  );
}

function ProfileMenu() {
  const user = useStore((s) => s.user) as any;
  const { space, goto } = useManage();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Your profile menu" className="ml-0.5 rounded-full p-0.5 hover:ring-2 hover:ring-[var(--si-border-2)]">
        <Avatar person={user} size={32} />
      </button>
      {open && (
        <Popover className="right-0 top-11 w-64">
          <div className="flex items-center gap-2.5 px-3 pt-1.5 pb-2.5 border-b border-[var(--si-border)] mb-1">
            <Avatar person={user} size={36} />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[var(--si-text)] truncate">{user?.name || user?.username || 'You'}</span>
              {user?.username && <span className="block text-[11.5px] text-[var(--si-muted)] truncate">@{user.username}</span>}
            </span>
          </div>
          <MenuItem icon={LayoutDashboard} onClick={() => goto('overview')}>
            Space dashboard
          </MenuItem>
          <MenuItem icon={ExternalLink} onClick={() => navigate(spacePublicPath(space?.handle))}>
            View public Space
          </MenuItem>
          <MenuItem icon={MessagesSquare} onClick={() => navigate('/messages')}>
            Personal messages
          </MenuItem>
          <MenuItem
            icon={LayoutList}
            tip="The previous inbox inside the Space dashboard"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('view', 'classic');
              setParams(next, { replace: true });
            }}
          >
            Classic inbox view
          </MenuItem>
          <MenuItem icon={Home} onClick={() => navigate('/home')}>
            Back to Wevsoft
          </MenuItem>
        </Popover>
      )}
    </div>
  );
}

// ── left rail ─────────────────────────────────────────────

function Rail({
  collapsed,
  active,
  onPick,
  canSection,
  inboxUnread,
  replyingAs,
  spaceName,
  verified,
}: {
  collapsed: boolean;
  active: ViewId;
  onPick: (item: NavItem) => void;
  canSection: (s: SpaceDashboardSection) => boolean;
  inboxUnread: number;
  replyingAs: { name: string; avatar: string | null; verified: boolean; spaceId: string } | null;
  spaceName?: string;
  verified: boolean;
}) {
  return (
    <nav className="flex-1 min-h-0 overflow-y-auto si-side-scroll py-3">
      {!collapsed && <p className="px-5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/40">Workspace</p>}
      <ul className="space-y-0.5 px-2.5">
        {NAV.map((item) => {
          const isActive = item.view === active && !(item.section && canSection(item.section));
          const external = Boolean(item.href || item.desk) || (item.section && canSection(item.section));
          const badge = item.id === 'inbox' ? inboxUnread : 0;
          const soon = false;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                title={collapsed ? item.label : soon ? `${item.label} — coming in the next phase` : item.href ? `Open ${item.label}` : external ? `Open ${item.label} in the Space dashboard` : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'relative w-full flex items-center gap-3 h-10 rounded-lg text-[13px] transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-3',
                  isActive ? 'bg-[var(--si-side-active)] text-white font-semibold' : 'text-[var(--si-side-text)] hover:bg-white/[0.06] hover:text-white',
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                {!collapsed && soon && <span className="text-[9.5px] font-semibold uppercase tracking-wide text-white/35">Soon</span>}
                {badge > 0 &&
                  (collapsed ? (
                    <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-[var(--si-red)]" />
                  ) : (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--si-red)] text-white text-[10.5px] font-bold leading-5 text-center tabular-nums">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ))}
                {!collapsed && external && <ExternalLink size={12} className="text-white/30" />}
              </button>
            </li>
          );
        })}
      </ul>

      {!collapsed && replyingAs && (
        <div className="mx-3 mt-5 rounded-lg border border-[var(--si-side-line)] bg-[var(--si-side-2)] p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/40">Replying as</p>
          <div className="mt-2 flex items-center gap-2">
            <Avatar person={{ id: replyingAs.spaceId, name: replyingAs.name, avatar: replyingAs.avatar }} size={28} square />
            <span className="min-w-0 flex items-center gap-1 text-[12.5px] font-semibold text-white">
              <span className="truncate">{replyingAs.name || spaceName}</span>
              {(replyingAs.verified || verified) && <BadgeCheck size={13} className="shrink-0 text-[#7fb0ff]" />}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">Every reply is sent as the Space — never from your personal account.</p>
        </div>
      )}
    </nav>
  );
}

// ── analytics strip ───────────────────────────────────────

function StatsStrip({ stats, openTotal, className }: { stats: ReturnType<typeof computeStats>; openTotal?: number; className?: string }) {
  const tiles: Array<{ label: string; value: string; icon: LucideIcon; tone: string; tip: string; sub?: string }> = [
    {
      label: 'Total Chats',
      value: compact(stats.totalChats),
      icon: MessagesSquare,
      tone: 'bg-[var(--si-blue-soft)] text-[var(--si-blue)]',
      tip: 'Every conversation this Space has: open, requests, resolved, archived and spam.',
      sub: typeof openTotal === 'number' ? `${compact(openTotal)} open` : undefined,
    },
    {
      label: 'Unread',
      value: compact(stats.unread),
      icon: Inbox,
      tone: 'bg-[var(--si-red-soft)] text-[var(--si-red)]',
      tip: 'Open conversations with messages the team has not opened yet.',
    },
    {
      label: 'Active Users',
      value: compact(stats.activeUsers),
      icon: Users,
      tone: 'bg-[var(--si-green-soft)] text-[var(--si-green)]',
      tip: 'People with conversation activity in the last 24 hours (latest 50 open + 50 resolved conversations).',
      sub: 'last 24h',
    },
    {
      label: 'Open Tickets',
      value: '—',
      icon: Ticket,
      tone: 'bg-[var(--si-amber-soft)] text-[var(--si-amber)]',
      tip: 'Space conversations are not tickets, so nothing is counted here. Support tickets live in Business > Support (/business/support).',
      sub: 'see Support',
    },
    {
      label: 'Response Time',
      value: duration(stats.responseMs),
      icon: Clock3,
      tone: 'bg-[#efe9ff] text-[#7c3aed] dark:bg-[rgba(124,58,237,0.16)]',
      tip:
        stats.responseMs === null
          ? 'Median first-response time appears once a conversation has been answered (needs the updated inbox API).'
          : `Median time to the first reply across ${stats.responseSample} recent conversation${stats.responseSample === 1 ? '' : 's'}.`,
      sub: stats.responseMs === null ? undefined : 'median first reply',
    },
  ];
  return (
    <div className={cx('shrink-0 gap-3 overflow-x-auto si-noscrollbar px-3 lg:px-4 py-3', className)}>
      {tiles.map((t) => (
        <div key={t.label} title={t.tip} className="si-card shrink-0 lg:shrink lg:flex-1 min-w-[150px] flex items-center gap-3 px-3.5 py-3 cursor-default">
          <span className={cx('grid place-items-center w-9 h-9 rounded-lg shrink-0', t.tone)}>
            <t.icon size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11.5px] text-[var(--si-muted)] truncate">{t.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[19px] font-bold leading-tight text-[var(--si-text)] tabular-nums">{t.value}</span>
              {t.sub && <span className="text-[10.5px] text-[var(--si-faint)] truncate">{t.sub}</span>}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── non-inbox views ───────────────────────────────────────

function OtherView({
  view,
  canSection,
  onGoto,
  onBackToInbox,
}: {
  view: ViewId;
  canSection: (s: SpaceDashboardSection) => boolean;
  onGoto: (s: SpaceDashboardSection) => void;
  onOpenSaved?: () => void;
  onBackToInbox: () => void;
}) {
  const back = (
    <button type="button" className={btn.secondary} onClick={onBackToInbox}>
      <ArrowLeft size={14} /> Back to inbox
    </button>
  );
  switch (view) {
    case 'spaces':
      return <SpacesView />;
    case 'broadcast':
      return <DeskRedirect page="broadcast" />;
    // Old ?tab=tickets|crm|ai links open the existing Business pages.
    case 'ai':
      return <DeskRedirect page="ai-agents" />;
    case 'tickets':
    case 'crm':
      return <Navigate to={NAV.find((n) => n.view === view)?.href || '/business/crm'} replace />;
    case 'analytics':
    case 'settings': {
      const section: SpaceDashboardSection = view;
      if (canSection(section)) return <SectionRedirect section={section} onGoto={onGoto} />;
      return (
        <div className="h-full grid place-items-center p-6">
          <div className="si-card max-w-md p-6 text-center">
            <span className="mx-auto grid place-items-center w-12 h-12 rounded-xl bg-[var(--si-hover)] text-[var(--si-muted)]">
              <Lock size={22} />
            </span>
            <h2 className="mt-3 text-[17px] font-bold text-[var(--si-text)]">{view === 'analytics' ? 'Analytics' : 'Settings'} not available</h2>
            <p className="mt-1.5 text-[13px] text-[var(--si-muted)]">Your role on this Space does not include {view === 'analytics' ? 'insights' : 'settings'}. Ask the owner if you need access.</p>
            <div className="mt-4 flex justify-center">{back}</div>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

/** ?tab=analytics / ?tab=settings with access: hand over to that dashboard section. */
/** Old ?tab=broadcast links open the WevDesk Broadcast page. */
function DeskRedirect({ page }: { page: string }) {
  const { handle } = useManage();
  return <Navigate to={spaceDeskPath(handle, page)} replace />;
}

function SectionRedirect({ section, onGoto }: { section: SpaceDashboardSection; onGoto: (s: SpaceDashboardSection) => void }) {
  useEffect(() => {
    onGoto(section);
     
  }, [section]);
  return null;
}

/** Real list of the Spaces you can act as (same source as the Space switcher). */
function SpacesView() {
  const { space } = useManage();
  const { spaces, loading, error } = useSpaceIdentities();
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto si-scroll p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-[var(--si-text)]">Your Spaces</h2>
            <p className="text-[13px] text-[var(--si-muted)]">Every Space you can manage. Open one to switch this inbox to it.</p>
          </div>
          <Link to="/spaces" className={btn.secondary}>
            <Building2 size={14} /> Browse all Spaces
          </Link>
        </div>
        {loading && spaces.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="si-card h-[76px] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="si-card p-5 text-[13px] text-[var(--si-red)]">{error}</div>
        ) : spaces.length === 0 ? (
          <div className="si-card">
            <EmptyBlock icon={Building2} title="No Spaces yet" blurb="Spaces you own or belong to will appear here." />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {spaces.map((s) => {
              const current = s.id === space?.id;
              return (
                <div key={s.id} className={cx('si-card flex items-center gap-3 p-3.5', current && 'ring-2 ring-[var(--si-blue)]')}>
                  <Avatar person={{ id: s.id, name: s.name, avatar: s.avatar }} size={44} square />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[14px] font-semibold text-[var(--si-text)]">
                      <span className="truncate">{s.name}</span>
                      {s.verified && <BadgeCheck size={13} className="shrink-0 text-[var(--si-blue)]" />}
                    </p>
                    <p className="text-[12px] text-[var(--si-muted)] truncate">
                      @{s.handle}
                      {s.role ? ` · ${String(s.role).charAt(0)}${String(s.role).slice(1).toLowerCase()}` : ''}
                      {typeof s.followersCount === 'number' ? ` · ${compact(s.followersCount)} followers` : ''}
                    </p>
                  </div>
                  {(s.unreadCount || 0) > 0 && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--si-red-soft)] text-[var(--si-red)] text-[11px] font-bold">{s.unreadCount} unread</span>
                  )}
                  {current ? (
                    <span className="shrink-0 text-[11.5px] font-semibold text-[var(--si-blue)]">Current</span>
                  ) : (
                    <button type="button" className={btn.small} onClick={() => navigate(spaceDeskPath(s.handle, 'inbox'))}>
                      Open inbox
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
