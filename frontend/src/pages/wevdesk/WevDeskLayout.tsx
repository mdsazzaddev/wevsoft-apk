/**
 * /space/:handle/desk/* — WevDesk, the Space's full-screen business workspace.
 *
 * In Space mode every WevChat entry point lands here (see spaceModeNavPath and
 * SpaceManagePage.goto). The layout resolves the Space with the same overview
 * call as the Space dashboard, so permissions are the server's own, and it
 * provides both the WevDesk context and the dashboard's ManageProvider — the
 * Unified Inbox page renders the Space Inbox inside this shell.
 */

import { Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Bot,
  CalendarCheck,
  CalendarDays,
  Clapperboard,
  Code2,
  Terminal,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Home,
  Megaphone as MegaphoneIcon,
  MessageCircle,
  PenSquare,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Palette,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  resolveSpaceAccent,
  spaceDashboardPath,
  spaceDeskPath,
  spacePublicPath,
  visibleDashboardSections,
  type SpaceDashboardSection,
  type SpacePermission,
} from '@wevsoft/shared/wevspace';
import { fetchManageOverview, SpaceApiError } from '../../lib/wevspaceManageApi';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useStore } from '../../store';
import { ManageProvider, type ManageContextValue } from '../../components/wevspace/manage/ManageContext';
import { resolveAvatarUrl } from '../../components/UserAvatar';
import { dismissWevSplash } from '../../lib/wevSplash';
import { DeskCtx, useDesk, type DeskContextValue } from './deskContext';
import { WevDeskLogo, cx } from './deskUi';
import './wevdesk.css';

type NavTarget = { desk: string } | { manage: SpaceDashboardSection } | { href: string };
interface NavItem {
  label: string;
  icon: LucideIcon;
  target: NavTarget;
  badge?: 'AI';
  keywords?: string;
}

const MAIN: NavItem[] = [
  { label: 'Home', icon: Home, target: { desk: '' } },
  { label: 'Chat', icon: MessageCircle, target: { desk: 'inbox' }, badge: 'AI', keywords: 'unified inbox wevchat messages conversations' },
  { label: 'Content Studio', icon: Clapperboard, target: { desk: 'content-studio' }, keywords: 'posts reels create' },
  { label: 'Planner', icon: CalendarDays, target: { desk: 'planner' }, keywords: 'calendar schedule' },
];
const AUTOMATE: NavItem[] = [
  { label: 'Automations', icon: Zap, target: { desk: 'workflows' }, keywords: 'automation workflows instant away keyword faq' },
  { label: 'AI Agents', icon: Bot, target: { desk: 'ai-agents' }, keywords: 'auto reply assistant knowledge' },
  { label: 'Integrations & API', icon: Code2, target: { desk: 'integrations' }, keywords: 'developer console oauth webhooks api keys' },
  { label: 'Developer', icon: Terminal, target: { href: '/developer' }, keywords: 'developer console apps oauth api webhooks docs' },
];
const GROW: NavItem[] = [
  { label: 'Commerce', icon: ShoppingBag, target: { desk: 'commerce' }, keywords: 'products shop orders' },
  { label: 'Team & Hiring', icon: Users, target: { desk: 'team' }, keywords: 'members jobs roles' },
  { label: 'Insights', icon: BarChart3, target: { desk: 'insights' }, keywords: 'analytics reach engagement' },
  { label: 'Ads & Promotions', icon: Megaphone, target: { desk: 'ads' }, keywords: 'boost campaign' },
  { label: 'Customers (CRM)', icon: UserRound, target: { desk: 'crm' }, keywords: 'contacts crm' },
  { label: 'Payments', icon: CreditCard, target: { desk: 'payments' }, keywords: 'wallet payouts invoices' },
  { label: 'Bookings', icon: CalendarCheck, target: { desk: 'bookings' }, keywords: 'appointments services' },
  { label: 'Reviews', icon: Star, target: { desk: 'reviews' }, keywords: 'rating reputation' },
  { label: 'Creator Hub', icon: GraduationCap, target: { desk: 'creator-hub' }, keywords: 'courses subscribers' },
];
const BOTTOM: NavItem[] = [
  { label: 'Settings', icon: Settings, target: { desk: 'settings' } },
  { label: 'Brand Kit', icon: Palette, target: { desk: 'brand-kit' }, keywords: 'logo colours' },
  { label: 'Billing & plan', icon: Receipt, target: { desk: 'billing' }, keywords: 'plan credits upgrade invoices' },
];
const EXTRA: NavItem[] = [
  { label: 'Broadcast', icon: MegaphoneIcon, target: { desk: 'broadcast' }, keywords: 'announce message everyone followers' },
  { label: 'New chat', icon: PenSquare, target: { desk: 'new-chat' }, keywords: 'message start conversation' },
  { label: 'Invoices', icon: Receipt, target: { desk: 'invoices' }, keywords: 'bill customer payment' },
];
/** Everything Ctrl K can open (sidebar + WevDesk pages reached from tiles). */
export const DESK_NAV = [...MAIN, ...AUTOMATE, ...GROW, ...BOTTOM, ...EXTRA];

export default function WevDeskLayout() {
  const { handle: handleParam = '' } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    dismissWevSplash();
  }, []);

  const overviewQuery = useQuery({
    queryKey: ['wevdesk', 'overview', handleParam],
    queryFn: () => fetchManageOverview(handleParam),
    retry: (count, error: any) => !(error instanceof SpaceApiError && [401, 403, 404].includes(error.status)) && count < 2,
    staleTime: 30_000,
  });
  const overview = overviewQuery.data || null;
  const space = overview?.space || null;
  const handle = space?.handle || handleParam;

  const sectionIds = useMemo<SpaceDashboardSection[]>(() => {
    if (!overview) return [];
    const held = Object.keys(overview.permissions).filter((k) => (overview.permissions as Record<string, boolean>)[k] === true);
    return visibleDashboardSections({ permissions: held, features: overview.features, spaceType: space?.spaceType }).map((s) => s.id);
  }, [overview, space?.spaceType]);

  const refresh = useCallback(async () => {
    await overviewQuery.refetch();
  }, [overviewQuery]);

  const can = useCallback((p: SpacePermission) => (overview?.permissions as Record<string, boolean> | undefined)?.[p] === true, [overview]);

  const desk = useMemo<DeskContextValue | null>(() => {
    if (!overview || !space) return null;
    return {
      overview,
      space,
      spaceId: space.id,
      handle,
      sectionIds,
      can,
      deskPath: (page?: string) => spaceDeskPath(handle, page),
      managePath: (section) => spaceDashboardPath(handle, section),
      refresh,
    };
  }, [overview, space, handle, sectionIds, can, refresh]);

  // The Space Inbox (and the saved-replies sheet) read the dashboard context.
  const manage = useMemo<ManageContextValue | null>(() => {
    if (!overview || !space) return null;
    return {
      space,
      spaceId: space.id,
      handle: space.handle,
      accent: resolveSpaceAccent(space),
      permissions: overview.permissions as Record<string, boolean>,
      features: overview.features || {},
      isOwner: overview.isOwner,
      role: overview.role,
      counts: overview.counts || {},
      recentActivity: overview.recentActivity || [],
      standing: overview.standing || null,
      meta: null,
      section: 'wevchat',
      refresh,
      goto: (section) => navigate(DESK_SECTION_SLUG[section] !== undefined ? spaceDeskPath(handle, DESK_SECTION_SLUG[section]) : spaceDashboardPath(handle, section)),
      can,
    };
  }, [overview, space, handle, refresh, navigate, can]);

  if (overviewQuery.isLoading) {
    return (
      <div className="wd-root fixed inset-0 grid place-items-center">
        <Loader2 className="animate-spin text-[var(--wd-muted)]" />
      </div>
    );
  }
  if (!desk || !manage) {
    const err = overviewQuery.error as any;
    const status = err instanceof SpaceApiError ? err.status : 0;
    // Not a member of this Space (or it does not exist): never render the desk shell.
    // Strangers land on the public Space page; a missing Space goes home.
    if (status === 403) return <Navigate to={spacePublicPath(handleParam)} replace />;
    if (status === 404) return <Navigate to="/home" replace />;
    return (
      <div className="wd-root fixed inset-0 grid place-items-center p-6">
        <div className="wd-card max-w-md p-7 text-center">
          <ShieldAlert className="mx-auto text-[var(--wd-muted)]" />
          <h1 className="mt-3 text-[18px] font-semibold">{status === 404 ? 'Space not found' : status === 403 ? 'You cannot open this WevDesk' : 'WevDesk could not load'}</h1>
          <p className="mt-1.5 text-[13px] text-[var(--wd-muted)]">{err?.message || 'Try again in a moment.'}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/home" className="h-9 px-4 inline-flex items-center rounded-[10px] border border-[var(--wd-btn-border)] bg-white text-[13px] font-medium">
              Back to Wevsoft
            </Link>
            {status !== 404 && status !== 403 && (
              <button type="button" onClick={() => void overviewQuery.refetch()} className="h-9 px-4 rounded-[10px] bg-[var(--wd-teal)] text-white text-[13px] font-medium">
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DeskCtx.Provider value={desk}>
      <ManageProvider value={manage}>
        <DeskShell>
          <Suspense
            fallback={
              <div className="h-full grid place-items-center">
                <Loader2 className="animate-spin text-[var(--wd-muted)]" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </DeskShell>
      </ManageProvider>
    </DeskCtx.Provider>
  );
}

/** Manage sections that have an in-desk route, so panel links stay inside WevDesk. */
const DESK_SECTION_SLUG: Partial<Record<SpaceDashboardSection, string>> = {
  wevchat: 'inbox',
  products: 'commerce',
  team: 'team',
  analytics: 'insights',
  promotion: 'ads',
  monetization: 'payments',
  reviews: 'reviews',
  settings: 'settings',
  'custom-profile': 'brand-kit',
  notifications: 'notifications',
};

function targetPath(t: NavTarget, desk: DeskContextValue): string {
  if ('desk' in t) return desk.deskPath(t.desk || undefined);
  if ('manage' in t) return desk.managePath(t.manage);
  return t.href;
}

function DeskShell({ children }: { children: ReactNode }) {
  const desk = useDesk();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const isInbox = location.pathname.replace(/\/+$/, '').endsWith('/desk/inbox');

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="wd-root fixed inset-0 z-[40] flex overflow-hidden">
      <aside className="wd-side hidden lg:flex w-[250px] h-full shrink-0 flex-col bg-[var(--wd-side)] border-r border-[var(--wd-border)]">
        <Sidebar desk={desk} />
      </aside>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[60] flex bg-black/50" onClick={() => setDrawer(false)}>
          <aside className="wd-side relative w-[270px] max-w-[85vw] h-full flex flex-col bg-[var(--wd-side)] border-r border-[var(--wd-border)]" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-[18px] p-1.5 rounded-lg text-[var(--wd-muted)] hover:bg-[var(--wd-chip)]">
              <X size={18} />
            </button>
            <Sidebar desk={desk} />
          </aside>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMenu={() => setDrawer(true)} compact={isInbox} />
        <main className={cx('flex-1 min-h-0', isInbox ? 'overflow-hidden' : 'overflow-y-auto wd-scroll')}>{children}</main>
      </div>
    </div>
  );
}


function Sidebar({ desk }: { desk: DeskContextValue }) {
  const unread = desk.overview.counts?.unreadThreads || 0;
  const item = (it: NavItem) => {
    const to = targetPath(it.target, desk);
    const isDesk = 'desk' in it.target;
    const Icon = it.icon;
    return (
      <li key={it.label}>
        <NavLink
          to={to}
          end={isDesk}
          title={!isDesk ? `Opens ${it.label}` : undefined}
          className={({ isActive }) =>
            cx(
              'wd-nav flex items-center gap-3 h-[36px] px-3 rounded-[10px] text-[13px] transition-colors',
              isActive && isDesk ? 'is-active bg-[var(--wd-side-active)] text-[var(--wd-teal)] font-semibold' : 'text-[var(--wd-side-text)] hover:bg-[#f3f5f8] hover:text-[var(--wd-text)]',
            )
          }
        >
          <Icon size={16} strokeWidth={1.8} className="shrink-0" />
          <span className="flex-1 truncate">{it.label}</span>
          {it.badge && (
            <span className="h-[18px] px-1.5 rounded-[6px] bg-[var(--wd-ai)] text-white text-[10px] font-semibold leading-[18px]" title="AI-assisted">
              {it.badge}
            </span>
          )}
          {it.label === 'Chat' && unread > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] text-white text-[10px] font-semibold leading-[18px] text-center">{unread > 99 ? '99+' : unread}</span>
          )}
        </NavLink>
      </li>
    );
  };
  const head = (label: string) => <p className="wd-side-label px-3 pt-5 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--wd-side-head)]">{label}</p>;
  return (
    <>
      <Link to={desk.deskPath()} className="shrink-0 flex items-center h-[64px] px-5 border-b border-[var(--wd-border)]">
        <WevDeskLogo />
      </Link>
      <nav className="flex-1 min-h-0 overflow-y-auto wd-side-scroll px-3 pt-2 pb-3">
        <ul className="space-y-0.5">{MAIN.map(item)}</ul>
        {head('AUTOMATE')}
        <ul className="space-y-0.5">{AUTOMATE.map(item)}</ul>
        {head('GROW')}
        <ul className="space-y-0.5">{GROW.map(item)}</ul>
      </nav>
      <div className="shrink-0 px-3 py-3 border-t border-[var(--wd-border)]">
        <ul className="space-y-0.5">{BOTTOM.map(item)}</ul>
      </div>
    </>
  );
}

function TopBar({ onMenu, compact }: { onMenu: () => void; compact: boolean }) {
  const desk = useDesk();
  const navigate = useNavigate();
  const user = useStore((s) => s.user) as any;
  const { unread } = useUnreadNotifications();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const term = q.trim().toLowerCase();
  const matches = term
    ? DESK_NAV.filter((n) => `${n.label} ${n.keywords || ''}`.toLowerCase().includes(term)).slice(0, 7)
    : DESK_NAV.slice(0, 6);
  const go = (to: string) => {
    if (/^\/developer(?:[/?#]|$)/.test(to)) {
      window.open(to, '_blank', 'noopener');
      setOpen(false);
      setMenu(false);
      return;
    }
    setOpen(false);
    setQ('');
    navigate(to);
  };
  const avatarUrl = resolveAvatarUrl(user?.avatar || null);
  const initial = String(desk.space?.name || user?.name || 'W').trim().charAt(0).toUpperCase();

  return (
    <header className={cx('shrink-0 flex items-center gap-3 px-3 sm:px-5', compact ? 'h-[64px] border-b border-[var(--wd-border)] bg-white' : 'wd-topbar h-[64px] border-b border-[var(--wd-border)] bg-white/85 backdrop-blur')}>
      <button type="button" onClick={onMenu} aria-label="Open menu" className="lg:hidden p-2 rounded-[10px] bg-white border border-[var(--wd-border)]">
        <Menu size={18} />
      </button>
      <div ref={boxRef} className="relative flex-1 min-w-0">
        <label className="wd-search flex items-center gap-2.5 h-[42px] px-4 rounded-[12px] bg-white border border-[var(--wd-border)]">
          <Search size={16} className="text-[var(--wd-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                if (matches[0] && term) go(targetPath(matches[0].target, desk));
                else if (term) go(`/ai-wevchat?q=${encodeURIComponent(q.trim())}`);
              }
            }}
            placeholder="Search anything or ask Wev AI"
            aria-label="Search WevDesk or ask Wev AI"
            className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-[var(--wd-text)] placeholder:text-[var(--wd-muted)]"
          />
          <kbd className="hidden sm:inline-flex items-center h-[22px] px-2 rounded-[6px] bg-[var(--wd-chip)] text-[10.5px] font-medium text-[var(--wd-muted)]">Ctrl K</kbd>
        </label>
        {open && (
          <div className="absolute z-50 left-0 right-0 top-[48px] wd-pop rounded-[14px] border border-[var(--wd-border)] bg-white shadow-[0_16px_40px_rgba(13,20,33,0.12)] py-1.5">
            {matches.map((n) => (
              <button key={n.label} type="button" onClick={() => go(targetPath(n.target, desk))} className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-[#f5f6f8]">
                <n.icon size={15} className="text-[var(--wd-muted)]" />
                <span className="flex-1">{n.label}</span>
                {!('desk' in n.target) && <ExternalLink size={12} className="text-[var(--wd-faint)]" />}
              </button>
            ))}
            {term && (
              <button type="button" onClick={() => go(`/ai-wevchat?q=${encodeURIComponent(q.trim())}`)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] text-[var(--wd-ai-text)] hover:bg-[var(--wd-ai-soft)] border-t border-[var(--wd-line)] mt-1">
                <Sparkles size={15} />
                <span className="flex-1 truncate">Ask Wev AI: “{q.trim()}”</span>
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => navigate(desk.sectionIds.includes('notifications') ? desk.managePath('notifications') : '/notifications')}
        className="wd-iconbtn relative grid place-items-center w-[42px] h-[42px] rounded-[12px] bg-white border border-[var(--wd-border)] hover:bg-[#f7f8fa]"
      >
        <Bell size={17} />
        {unread > 0 && <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ef4444] text-white text-[9.5px] font-semibold leading-4">{unread > 99 ? '99+' : unread}</span>}
      </button>
      <div ref={menuRef} className="relative">
        <button type="button" aria-label="Account menu" onClick={() => setMenu((v) => !v)} className="wd-avatar grid place-items-center w-[42px] h-[42px] rounded-full overflow-hidden bg-[var(--wd-teal)] text-white text-[16px] font-semibold">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
        </button>
        {menu && (
          <div className="absolute z-50 right-0 top-[54px] w-60 wd-pop rounded-[14px] border border-[var(--wd-border)] bg-white shadow-[0_16px_40px_rgba(13,20,33,0.12)] py-1.5">
            <div className="px-4 py-2 border-b border-[var(--wd-line)] mb-1">
              <p className="text-[13px] font-semibold truncate">{desk.space?.name}</p>
              <p className="text-[11.5px] text-[var(--wd-muted)] truncate">{user?.name ? `Signed in as ${user.name}` : `@${desk.handle}`}</p>
            </div>
            {[
              { label: 'Space dashboard', icon: LayoutDashboard, to: desk.managePath('overview') },
              { label: 'View public Space', icon: ExternalLink, to: spacePublicPath(desk.handle) },
              { label: 'Developer Console', icon: Code2, to: '/developer' },
              { label: 'Back to Wevsoft', icon: LogOut, to: '/home' },
            ].map((m) => (
              <button key={m.label} type="button" onClick={() => go(m.to)} className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-[#f5f6f8]">
                <m.icon size={15} className="text-[var(--wd-muted)]" /> {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
