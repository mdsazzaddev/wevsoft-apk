import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AppWindow, BadgeCheck, Banknote, Bell, BookOpen, Bot, ChartLine, ChevronDown, ChevronUp, CircleHelp, CirclePlus, Clock, Cog,
  CreditCard, FileText, FolderOpen, Gauge, Globe, Home, Key, KeyRound, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, Link2, ListChecks,
  Contrast, Lock, LogOut, Menu, MessageCircle, Moon, PanelLeft, PanelLeftClose, Plus, Puzzle, ScrollText, Search, Settings, Share2, ShieldCheck,
  FlaskConical, Code2, Globe2, SquareTerminal, Sun, User as UserIcon, UserCheck, Users, Webhook, X, Activity,
} from 'lucide-react';
import WevsoftMark from '../../../components/auth/WevsoftMark';
import { useStore } from '../../../store';
import { useUnreadNotifications } from '../../../hooks/useUnreadNotifications';
import { useSpaceIdentities } from '../../../lib/useSpaceIdentities';
import { spaceDashboardPath } from '@wevsoft/shared/wevspace';
import type { DeveloperApp } from '../devApi';
import { AppAvatar, cx } from '../devUi';
import { explorerHref, useOperationSearch } from '../docsSearch';
import { CONSOLE_APP_KEY, CONSOLE_VERSION, readLocal, writeLocal } from './consoleData';
import { appSwitchPath } from './appSwitchPath';
import { useDevT } from './i18n/developerI18n';
import { ALL_APPS, appSwitchTarget, liveApps, nextOptionIndex, resolveSelectedApp } from './appSelection';
import { CONSOLE_THEME_LABELS, type ConsoleThemeMode, consoleRootClasses, migrateLegacyConsoleTheme, modeFromClassList } from './consoleTheme';
import { useSettingsStore } from '../../../stores/settingsStore';
import { mergeNav } from './platformNav';
import { buildSidebarSections } from './sidebarSections';
import { primaryActiveFor, tabGroupFor } from './navTabs';
import './console.css';

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */

export type AppTab = 'overview' | 'analytics' | 'settings' | 'credentials' | 'oauth' | 'webhooks' | 'security' | 'audit';

export type NavTarget =
  | { kind: 'route'; to: string }
  | { kind: 'hash'; id: string }
  | { kind: 'appTab'; tab: AppTab }
  /** A WevSpace dashboard section of the active Space (falls back to /spaces in personal mode). */
  | { kind: 'space'; section: string }
  | { kind: 'create' };

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  target: NavTarget;
  keywords?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const BASE_NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, target: { kind: 'route', to: '/developer' } },
      { label: 'Analytics', icon: ChartLine, target: { kind: 'route', to: '/developer/analytics' }, keywords: 'usage chart requests deliveries' },
      { label: 'Recent Activity', icon: Clock, target: { kind: 'route', to: '/developer/activity' }, keywords: 'timeline events history' },
      { label: 'Monetization & Payouts', icon: Banknote, target: { kind: 'route', to: '/developer/monetization' }, keywords: 'earnings payout withdrawal balance pricing revenue' },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    items: [
      { label: 'My Apps', icon: LayoutGrid, target: { kind: 'route', to: '/developer/apps' }, keywords: 'applications list manage' },
      { label: 'Create App', icon: CirclePlus, target: { kind: 'route', to: '/developer/apps/new' }, keywords: 'new register' },
      { label: 'App Environments', icon: Layers, target: { kind: 'route', to: '/developer/environments' }, keywords: 'production development mode' },
      { label: 'App Reviews & Publishing', icon: BadgeCheck, target: { kind: 'route', to: '/developer/publishing' }, keywords: 'publish live review' },
      { label: 'App Directory', icon: Globe, target: { kind: 'route', to: '/developer/directory' }, keywords: 'store ecosystem showcase explore' },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication & Security',
    items: [
      { label: 'OAuth 2.0', icon: ShieldCheck, target: { kind: 'route', to: '/developer/oauth' }, keywords: 'authorize token endpoint pkce' },
      { label: 'OAuth Clients', icon: KeyRound, target: { kind: 'route', to: '/developer/oauth/clients' }, keywords: 'redirect uri client' },
      { label: 'API Keys & Secrets', icon: Key, target: { kind: 'route', to: '/developer/credentials' }, keywords: 'client secret rotate credentials' },
      { label: 'Scopes & Permissions', icon: ListChecks, target: { kind: 'route', to: '/developer/scopes' }, keywords: 'scope permission consent' },
      { label: 'Authorized Applications', icon: UserCheck, target: { kind: 'route', to: '/developer/authorized-apps' }, keywords: 'grants revoke access' },
      { label: 'Security & Access', icon: Lock, target: { kind: 'route', to: '/developer/security' }, keywords: 'ip allowlist security' },
    ],
  },
  {
    id: 'tools',
    label: 'Developer Tools',
    items: [
      { label: 'API Explorer', icon: SquareTerminal, target: { kind: 'route', to: '/developer/api-explorer' }, keywords: 'try request playground' },
      { label: 'API Reference', icon: BookOpen, target: { kind: 'route', to: '/developer/api-reference' }, keywords: 'endpoints reference' },
      { label: 'Webhooks', icon: Webhook, target: { kind: 'route', to: '/developer/webhooks' }, keywords: 'events endpoint' },
      { label: 'Logs & Monitoring', icon: ScrollText, target: { kind: 'route', to: '/developer/logs' }, keywords: 'audit log deliveries' },
      { label: 'Usage & Quotas', icon: Gauge, target: { kind: 'route', to: '/developer/usage' }, keywords: 'quota limits' },
      { label: 'Domain Verification', icon: Globe2, target: { kind: 'route', to: '/developer/domains' }, keywords: 'dns txt verify domain' },
      { label: 'Embed Widgets', icon: Code2, target: { kind: 'route', to: '/developer/embed' }, keywords: 'share follow button one tap sdk script' },
      { label: 'Test Users', icon: FlaskConical, target: { kind: 'route', to: '/developer/test-users' }, keywords: 'sandbox synthetic fake accounts' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    items: [
      { label: 'Connected Apps', icon: Link2, target: { kind: 'route', to: '/developer/integrations/connected' }, keywords: 'connected accounts' },
      { label: 'Social Platforms', icon: Share2, target: { kind: 'route', to: '/developer/integrations/social' }, keywords: 'google facebook youtube' },
      { label: 'WevChat Integrations', icon: MessageCircle, target: { kind: 'route', to: '/developer/integrations/wevchat' }, keywords: 'messages chat' },
      { label: 'AI Providers', icon: Bot, target: { kind: 'route', to: '/developer/integrations/ai' }, keywords: 'openai gemini' },
      { label: 'Storage & Files', icon: FolderOpen, target: { kind: 'route', to: '/developer/integrations/storage' }, keywords: 'drive media upload' },
      { label: 'Payments & Commerce', icon: CreditCard, target: { kind: 'route', to: '/developer/integrations/payments' }, keywords: 'wallet billing' },
      { label: 'Other Integrations', icon: Puzzle, target: { kind: 'route', to: '/developer/integrations/other' } },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & Account',
    items: [
      { label: 'Team & Access', icon: Users, target: { kind: 'route', to: '/developer/team' }, keywords: 'space members' },
      { label: 'Developer Settings', icon: Settings, target: { kind: 'route', to: '/developer/settings' }, keywords: 'account preferences' },
      { label: 'Documentation', icon: FileText, target: { kind: 'route', to: '/developer/docs' } },
      { label: 'System Status', icon: Activity, target: { kind: 'route', to: '/developer/status' }, keywords: 'status uptime health outages operational' },
      { label: 'Support', icon: LifeBuoy, target: { kind: 'route', to: '/developer/support' }, keywords: 'help ticket sla response time enterprise contact' },
    ],
  },
];

export const NAV_GROUPS: NavGroup[] = mergeNav(BASE_NAV_GROUPS);

const DOC_SEARCH: { label: string; to: string }[] = [
  { label: 'Docs Â· Overview', to: '/developer/docs#overview' },
  { label: 'Docs Â· Create an app', to: '/developer/docs#create-app' },
  { label: 'Docs Â· Send people to authorize', to: '/developer/docs#authorize' },
  { label: 'Docs Â· Handle the callback', to: '/developer/docs#callback' },
  { label: 'Docs Â· Exchange the code for tokens', to: '/developer/docs#token' },
  { label: 'Docs Â· PKCE for mobile & SPA', to: '/developer/docs#pkce' },
  { label: 'Docs Â· API Keys (M2M)', to: '/developer/docs#api-keys' },
  { label: 'Docs Â· Platform APIs', to: '/developer/docs#platform-apis' },
  { label: 'Docs Â· Webhooks & Signatures', to: '/developer/docs#webhooks' },
  { label: 'Docs Â· Batch requests', to: '/developer/docs#batch' },
  { label: 'Docs Â· Test users', to: '/developer/docs#test-users' },
  { label: 'Docs Â· SDKs', to: '/developer/docs#sdks' },
  { label: 'Docs Â· Scopes', to: '/developer/docs#scopes' },
  { label: 'Docs Â· Errors', to: '/developer/docs#errors' },
  { label: 'Docs Â· Security checklist', to: '/developer/docs#security' },
  { label: 'Docs Â· Platform terms', to: '/developer/docs#platform-terms' },
];

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

/** Console features that act on one app: /developer/apps/:id/<slug>  (slug -> global entry route). */
export const APP_SCOPED_SECTIONS: Record<string, string> = {
  'api-keys': '/developer/credentials',
  access: '/developer/security',
  domains: '/developer/domains',
  embed: '/developer/embed',
  'test-users': '/developer/test-users',
};
const GLOBAL_TO_SCOPED: Record<string, string> = Object.fromEntries(Object.entries(APP_SCOPED_SECTIONS).map(([k, v]) => [v, k]));
/** Tabs of the app detail page, each at /developer/apps/:id/<tab> (overview = /developer/apps/:id). */
export const APP_DETAIL_TABS = ['overview', 'products', 'analytics', 'settings', 'credentials', 'oauth', 'webhooks', 'security', 'audit', 'danger'] as const;

export { appSwitchPath } from './appSwitchPath';

/** Old one-page dashboard anchors -> their own pages. */
const LEGACY_HASH: Record<string, string> = {
  'your-applications': '/developer/apps',
  'all-applications': '/developer/apps',
  'developer-resources': '/developer/oauth',
  'api-usage': '/developer/usage',
  'integration-overview': '/developer/integrations/connected',
  'recent-activity': '/developer/activity',
};
const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Old /developer?section=webhooks (or tab/view/page) -> the matching sidebar route. */
function legacySectionRoute(s: string): string | null {
  const want = slugify(s);
  if (APP_SCOPED_SECTIONS[want]) return APP_SCOPED_SECTIONS[want];
  for (const g of NAV_GROUPS) for (const it of g.items) {
    if (it.target.kind !== 'route' || it.target.to === '/developer') continue;
    const last = it.target.to.split('/').pop() || '';
    if (last === want || slugify(it.label) === want) return it.target.to;
  }
  return null;
}

/** The app a console page works on: the app in the URL, else the app switcher's app. */
export function useConsoleApp() {
  const { apps, selectedApp, switchApp } = useConsole();
  const { id: routeId } = useParams<{ id?: string }>();
  const app = (routeId ? apps.find((a) => a.id === routeId) : undefined) || selectedApp || null;
  return { apps, app, appId: app?.id || '', setAppId: switchApp };
}

interface ConsoleCtx {
  apps: DeveloperApp[];
  selectedApp: DeveloperApp | null;
  selectApp: (id: string) => void;
  /** Select an app and, on an app-scoped URL, move to the same section of that app. */
  switchApp: (id: string) => void;
  /** Sidebar route -> concrete URL (app-scoped features resolve to the selected app). */
  hrefFor: (to: string) => string;
  openCreate: () => void;
  /** Navigate to a tab of the selected app (prompts to create one when none exists). */
  goAppTab: (tab: AppTab) => void;
  appTabHref: (tab: AppTab) => string | null;
  runTarget: (t: NavTarget) => void;
  /** True in dark and OLED (both follow the global display mode). */
  dark: boolean;
  setTheme: (dark: boolean) => void;
  themeMode: ConsoleThemeMode;
  setThemeMode: (mode: ConsoleThemeMode) => void;
}

const Ctx = createContext<ConsoleCtx | null>(null);

export function useConsole(): ConsoleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConsole must be used inside <DeveloperConsoleShell>');
  return v;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

/** Global display mode, live: follows html.dark / html.oled (single theme source, Phase 2 P2-1). */
function useDisplayMode(): ConsoleThemeMode {
  const [mode, setMode] = useState<ConsoleThemeMode>(() => modeFromClassList(typeof document !== 'undefined' ? document.documentElement.classList : null));
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setMode(modeFromClassList(root.classList));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return mode;
}

/** Browser-local display-mode change (no profile PATCH); applies html classes immediately. */
function setGlobalThemeMode(mode: ConsoleThemeMode) {
  useSettingsStore.getState().setTheme(CONSOLE_THEME_LABELS[mode]);
}

export default function DeveloperConsoleShell({
  apps,
  onCreate,
  children,
}: {
  apps: DeveloperApp[];
  onCreate: () => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const themeMode = useDisplayMode();
  const dark = themeMode !== 'light';
  const [selectedId, setSelectedId] = useState<string | null>(() => readLocal(CONSOLE_APP_KEY));
  const [mobileNav, setMobileNav] = useState(false);
  // Desktop sidebar: collapsible to an icon rail (persisted), peeks open on hover, like the admin panel.
  const [sideCollapsed, setSideCollapsed] = useState(() => readLocal(SIDEBAR_KEY) === 'collapsed');
  const [sidePeek, setSidePeek] = useState(false);
  const sideOpen = !sideCollapsed || sidePeek;
  const persistSide = (collapsed: boolean) => {
    setSideCollapsed(collapsed);
    setSidePeek(false);
    writeLocal(SIDEBAR_KEY, collapsed ? 'collapsed' : 'open');
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  const selection = useMemo(() => resolveSelectedApp(apps, selectedId), [apps, selectedId]);
  const selectedApp = selection.app;
  // A8: a stored app that was deleted (or is no longer yours) falls back to "All apps".
  useEffect(() => {
    if (!selection.stale) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads/persists browser storage, which is an external system
    setSelectedId(ALL_APPS);
    writeLocal(CONSOLE_APP_KEY, ALL_APPS);
  }, [selection.stale]);

  const selectApp = useCallback((id: string) => {
    setSelectedId(id);
    writeLocal(CONSOLE_APP_KEY, id);
  }, []);

  const hrefFor = useCallback(
    (to: string) => {
      const slug = GLOBAL_TO_SCOPED[to];
      return slug && selectedApp ? `/developer/apps/${selectedApp.id}/${slug}` : to;
    },
    [selectedApp],
  );

  const switchApp = useCallback(
    (id: string) => {
      selectApp(id);
      const p = appSwitchPath(location.pathname, id);
      const target = p && p !== location.pathname ? appSwitchTarget(p, location.search, location.hash) : null;
      if (target) navigate(target);
    },
    [selectApp, location.pathname, location.search, location.hash, navigate],
  );

  const appTabHref = useCallback(
    (tab: AppTab) => (selectedApp ? `/developer/apps/${selectedApp.id}${tab === 'overview' ? '' : `/${tab}`}` : null),
    [selectedApp],
  );

  const goAppTab = useCallback(
    (tab: AppTab) => {
      const href = appTabHref(tab);
      if (href) navigate(href);
      else {
        toast('Create an application first to use this section.');
        onCreate();
      }
    },
    [appTabHref, navigate, onCreate],
  );

  const { isSpaceMode, active: activeSpace } = useSpaceIdentities();
  const spaceHref = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- manual memoization kept as-is (existing behavior)
    (section: string) => (isSpaceMode && activeSpace?.handle ? spaceDashboardPath(activeSpace.handle, section) : '/spaces'),
    [isSpaceMode, activeSpace?.handle],
  );

  const runTarget = useCallback(
    (t: NavTarget) => {
      setMobileNav(false);
      if (t.kind === 'create') return onCreate();
      if (t.kind === 'space') return navigate(spaceHref(t.section));
      if (t.kind === 'appTab') return goAppTab(t.tab);
      if (t.kind === 'hash') {
        if (location.pathname === '/developer' && location.hash === `#${t.id}`) {
          document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return navigate(`/developer#${t.id}`);
      }
      navigate(hrefFor(t.to));
    },
    [goAppTab, hrefFor, location.hash, location.pathname, navigate, onCreate, spaceHref],
  );

  // Old one-page URLs (/developer#api-usage, /developer?section=webhooks) open the feature's own page.
  useEffect(() => {
    if (location.pathname !== '/developer') return;
    const h = location.hash.slice(1);
    const q = new URLSearchParams(location.search);
    const s = q.get('section') || q.get('tab') || q.get('view') || q.get('page');
    const to = (h && LEGACY_HASH[h]) || (s ? legacySectionRoute(s) : null);
    if (to) navigate(hrefFor(to), { replace: true });
  }, [location.pathname, location.hash, location.search, navigate, hrefFor]);

  // In-page anchors (#api-usage, #your-applications, ...) scroll inside the console's own scroller.
  // Each console page starts at the top (the shell stays mounted between pages).
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) {
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (location.pathname !== '/developer') return; // other pages (docs) handle their own anchors
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [location.hash, location.pathname]);

  // One-time migration of the old console-only theme key (pre Phase 2).
  useEffect(() => {
    try {
      const label = migrateLegacyConsoleTheme(localStorage, modeFromClassList(document.documentElement.classList));
      if (label) useSettingsStore.getState().setTheme(label);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleTheme = (next: boolean) => setGlobalThemeMode(next ? 'dark' : 'light');

  const ctx: ConsoleCtx = { apps, selectedApp, selectApp, switchApp, hrefFor, openCreate: onCreate, goAppTab, appTabHref, runTarget, dark, setTheme: toggleTheme, themeMode, setThemeMode: setGlobalThemeMode };

  return (
    <Ctx.Provider value={ctx}>
      <div className={cx('dc-root h-[100dvh] flex flex-col overflow-hidden', ...consoleRootClasses(themeMode))}>
        <TopBar mode={themeMode} onMode={setGlobalThemeMode} onMenu={() => setMobileNav(true)} />
        <div className="flex-1 min-h-0 flex">
          <aside
            className={cx(
              'hidden lg:flex shrink-0 bg-[var(--dc-side)] border-r border-[var(--dc-side-line)] flex-col min-h-0 overflow-hidden transition-[width] duration-200 ease-out',
              sideOpen ? 'w-[248px]' : 'w-[64px]',
            )}
            onMouseEnter={() => { if (sideCollapsed) setSidePeek(true); }}
            onMouseLeave={() => setSidePeek(false)}
          >
            <div className={cx('h-[44px] shrink-0 flex items-center border-b border-[var(--dc-side-line)]', sideOpen ? 'px-[22px] justify-between' : 'justify-center')}>
              {sideOpen && <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--dc-side-head)] whitespace-nowrap">Navigation</span>}
              <button
                type="button"
                onClick={() => persistSide(!sideCollapsed)}
                title={sideCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                aria-label={sideCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                aria-expanded={!sideCollapsed}
                className="w-[30px] h-[30px] grid place-items-center rounded-[8px] text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-side-hover)] transition-colors duration-150"
              >
                {sideCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
            <SidebarNav compact={!sideOpen} />
          </aside>
          {mobileNav && (
            <div className="lg:hidden fixed inset-0 z-[80] flex">
              <div className="absolute inset-0 bg-black/50 dc-fade-in" onClick={() => setMobileNav(false)} />
              <aside className="dc-slide-in relative w-[272px] max-w-[85vw] bg-[var(--dc-side)] border-r border-[var(--dc-side-line)] flex flex-col shadow-2xl">
                <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--dc-side-line)]">
                  <span className="text-[var(--dc-text)] font-semibold text-sm">Developer Console</span>
                  <button type="button" aria-label="Close menu" onClick={() => setMobileNav(false)} className="w-8 h-8 grid place-items-center rounded-[10px] text-[var(--dc-muted)] hover:bg-[var(--dc-hover)] hover:text-[var(--dc-text)]">
                    <X size={18} />
                  </button>
                </div>
                <SidebarNav onNavigate={() => setMobileNav(false)} />
              </aside>
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <div ref={scrollRef} id="main-scroll-area" className="dc-scroll flex-1 min-h-0 overflow-y-auto">
              <SectionTabs pathname={location.pathname} search={location.search} hrefFor={hrefFor} />
              {children}
            </div>
            <ConsoleFooter />
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

const THEME_OPTIONS: { mode: ConsoleThemeMode; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { mode: 'light', label: 'Light theme', icon: Sun },
  { mode: 'dark', label: 'Dark theme', icon: Moon },
  { mode: 'oled', label: 'OLED true black theme', icon: Contrast },
];

function TopBar({ mode, onMode, onMenu }: { mode: ConsoleThemeMode; onMode: (mode: ConsoleThemeMode) => void; onMenu: () => void }) {
  const { unread } = useUnreadNotifications();
  const t = useDevT();
  return (
    <header className="h-14 shrink-0 bg-[var(--dc-side)] border-b border-[var(--dc-side-line)] flex items-center pr-3 sm:pr-5 relative z-30">
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="lg:hidden ml-3 w-8 h-8 grid place-items-center rounded-md text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
        <Menu size={18} />
      </button>
      <Link to="/developer" className="flex items-center shrink-0 pl-3 lg:pl-[22px] lg:w-[278px]" aria-label="WebSoft Developer Console">
        <WevsoftMark className="h-[18px] w-auto" />
        <span className="ml-[8px] text-[18px] leading-none font-bold tracking-[-0.01em] text-[var(--dc-text)]">WebSoft</span>
        <span className="hidden sm:block mx-[12px] h-[22px] w-px bg-[var(--dc-border-2)]" />
        <span className="hidden sm:block text-[12px] font-semibold text-[var(--dc-text)] whitespace-nowrap">Developer Console</span>
      </Link>
      <AppSwitcher />
      <GlobalSearch />
      <div className="ml-auto flex items-center">
        <Link to="/developer/docs" className="hidden xl:inline-flex items-center gap-[6px] px-2 h-8 rounded-md text-[11.5px] font-medium text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
          <FileText size={15} strokeWidth={1.8} className="text-[var(--dc-text-2)]" /> Documentation
        </Link>
        <Link to="/developer/api-reference" className="hidden xl:inline-flex items-center gap-[6px] px-2 h-8 ml-[14px] rounded-md text-[11.5px] font-medium text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)] whitespace-nowrap">
          <Cog size={15} strokeWidth={1.8} /> API Reference
        </Link>
        <Link to="/notifications" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className="relative ml-[22px] w-8 h-8 grid place-items-center rounded-md text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
          <Bell size={17} strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute top-[3px] right-[4px] min-w-[13px] h-[13px] px-[3px] rounded-full bg-[#ef4444] text-white text-[8.5px] font-bold leading-[13px] text-center ring-2 ring-[var(--dc-card)]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link to="/support" aria-label="Help & support" className="ml-[6px] w-8 h-8 grid place-items-center rounded-md text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
          <CircleHelp size={17} strokeWidth={1.8} />
        </Link>
        <div className="ml-[8px] flex items-center gap-[2px]" role="group" aria-label={t('theme.label')}>
          {THEME_OPTIONS.map(({ mode: m, label: fallback, icon: Icon }) => {
            const label = t(`theme.${m}`, { defaultValue: fallback });
            return (
            <button key={m} type="button" aria-label={label} title={label} aria-pressed={mode === m} onClick={() => onMode(m)} className={cx('w-[22px] h-[22px] grid place-items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dc-blue)]', mode === m ? 'text-[var(--dc-text)] bg-[var(--dc-hover)]' : 'text-[var(--dc-faint)] hover:text-[var(--dc-text-2)]')}>
              <Icon size={m === 'light' ? 14 : 13} strokeWidth={2} />
            </button>
            );
          })}
        </div>
        <span className="hidden sm:block mx-[16px] h-[26px] w-px bg-[var(--dc-border)]" />
        <UserMenu />
      </div>
    </header>
  );
}

/** Tab strip for consolidated nav groups (P2-4). Keeps ?search when switching tabs. */
function SectionTabs({ pathname, search, hrefFor }: { pathname: string; search: string; hrefFor: (to: string) => string }) {
  const hit = tabGroupFor(pathname);
  if (!hit) return null;
  return (
    <nav aria-label={hit.group.primary} className="px-4 sm:px-6 lg:px-8 pt-4 -mb-1 overflow-x-auto">
      <div className="inline-flex gap-1 rounded-[10px] border border-[var(--dc-border)] bg-[var(--dc-card)] p-1">
        {hit.group.tabs.map((t, i) => (
          <Link
            key={t.to}
            to={`${hrefFor(t.to)}${i === hit.active ? search : ''}`}
            aria-current={i === hit.active ? 'page' : undefined}
            className={cx('whitespace-nowrap px-3 h-[28px] inline-flex items-center rounded-[7px] text-[12px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dc-blue)]', i === hit.active ? 'bg-[var(--dc-blue-soft)] text-[var(--dc-blue)]' : 'text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]')}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function useOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, ref]);
}

function AppSwitcher() {
  const { apps: allApps, selectedApp, switchApp, openCreate } = useConsole();
  const t = useDevT();
  const apps = useMemo(() => liveApps(allApps), [allApps]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, open, close);
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, apps.findIndex((a) => a.id === selectedApp?.id));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the listbox: syncs the active option with DOM focus
    setActive(i);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLElement>('[role=option]')[i]?.focus());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    const n = nextOptionIndex(e.key, active, apps.length);
    if (n === null) return;
    e.preventDefault();
    setActive(n);
    listRef.current?.querySelectorAll<HTMLElement>('[role=option]')[n]?.focus();
  };
  return (
    <div ref={ref} className="relative ml-2 md:ml-3 lg:ml-[19px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('switcher.current', { name: selectedApp?.name || t('switcher.allApps') })}
        className="w-[132px] sm:w-[190px] h-[34px] flex items-center gap-[8px] pl-[6px] pr-[10px] rounded-[10px] border border-[var(--dc-border)] bg-[var(--dc-card)] hover:border-[var(--dc-blue)]/40 transition-colors"
      >
        <span className="w-[22px] h-[22px] rounded-[7px] bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center shrink-0">
          <AppWindow size={12} strokeWidth={2.2} />
        </span>
        <span className="flex-1 min-w-0 truncate text-left text-[11.5px] font-medium text-[var(--dc-text)]">{selectedApp?.name || t('switcher.allApps')}</span>
        <ChevronDown size={14} className="text-[var(--dc-muted)] shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-[40px] w-[min(270px,calc(100vw-24px))] dc-card !rounded-[14px] p-1.5 shadow-xl z-50">
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--dc-faint)]">{t('switcher.yourApps')}</p>
          {apps.length === 0 && <p className="px-2.5 py-2 text-[12px] text-[var(--dc-muted)]">{t('switcher.none')}</p>}
          <div ref={listRef} role="listbox" aria-label={t('switcher.yourApps')} onKeyDown={onListKey} className="max-h-[260px] overflow-y-auto">
            {apps.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={selectedApp?.id === a.id}
                tabIndex={i === active ? 0 : -1}
                onClick={() => {
                  switchApp(a.id);
                  setOpen(false);
                }}
                className={cx('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-[var(--dc-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue)]', selectedApp?.id === a.id && 'bg-[var(--dc-blue-soft)]')}
              >
                <AppAvatar name={a.name} logoUrl={a.logoUrl} size="sm" className="!w-7 !h-7 !rounded-md !text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-[var(--dc-text)]">{a.name}</span>
                  <span className="block truncate text-[10.5px] text-[var(--dc-muted)]">{a.mode === 'production' ? 'Production' : 'Development'}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--dc-border)] mt-1 pt-1">
            <button type="button" onClick={() => { setOpen(false); openCreate(); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-medium text-[var(--dc-blue)] hover:bg-[var(--dc-hover)]">
              <Plus size={14} /> {t('switcher.create')}
            </button>
            {selectedApp && (
              <Link to={`/developer/apps/${selectedApp.id}`} onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-medium text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
                <Settings size={14} /> {t('switcher.manage', { name: selectedApp.name })}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchEntry {
  label: string;
  hint: string;
  run: () => void;
  keywords: string;
}

function GlobalSearch() {
  const { apps, runTarget } = useConsole();
  const { isSpaceMode, active: activeSpace } = useSpaceIdentities();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(boxRef, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entries = useMemo<SearchEntry[]>(() => {
    const nav = NAV_GROUPS.flatMap((g) =>
      g.items.map((it) => ({ label: it.label, hint: g.label, run: () => runTarget(it.target), keywords: `${it.label} ${g.label} ${it.keywords || ''}` })),
    );
    const appEntries = apps.map((a) => ({ label: a.name, hint: 'Application', run: () => navigate(`/developer/apps/${a.id}`), keywords: `${a.name} ${a.clientId} app` }));
    const docs = DOC_SEARCH.map((d) => ({ label: d.label, hint: 'Documentation', run: () => navigate(d.to), keywords: `${d.label} docs api` }));
    const spaceEntries = isSpaceMode && activeSpace?.handle
      ? [{ label: `${activeSpace.name} Â· Space developer console`, hint: 'WevSpace', run: () => navigate(spaceDashboardPath(activeSpace.handle, 'developer-console')), keywords: 'space wevspace developer console linked apps' }]
      : [];
    return [...appEntries, ...nav, ...spaceEntries, ...docs];
  }, [apps, navigate, runTarget, isSpaceMode, activeSpace]);

  // W5: live API endpoint hits from the OpenAPI index; up to 4 slots after local matches.
  const opSearch = useOperationSearch(q, 4);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? entries.filter((e) => e.keywords.toLowerCase().includes(term)) : entries;
    const ops: SearchEntry[] = term.length >= 2
      ? (opSearch.data?.results || []).map((op) => ({
          label: `${op.method} ${op.path}`,
          hint: 'API endpoint',
          run: () => navigate(explorerHref(op)),
          keywords: op.operationId,
        }))
      : [];
    return [...list.slice(0, 9 - Math.min(ops.length, 4)), ...ops].slice(0, 9);
  }, [entries, q, opSearch.data, navigate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setActive(0), [q]);

  const choose = (e?: SearchEntry) => {
    if (!e) return;
    e.run();
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  return (
    <div ref={boxRef} className="relative hidden md:block ml-4 lg:ml-[18px] flex-1 max-w-[460px] min-w-[180px]">
      <div className="h-[36px] flex items-center gap-[9px] px-[12px] rounded-[10px] border border-[var(--dc-border)] bg-[var(--dc-bg)] focus-within:border-[var(--dc-blue)]/50 focus-within:bg-[var(--dc-card)] focus-within:ring-4 focus-within:ring-[var(--dc-blue)]/10 transition-colors">
        <Search size={14} className="text-[var(--dc-faint)] shrink-0" />
        <input
          ref={inputRef}
          id="developer-console-search"
          name="developer_console_search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
            else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder="Search APIs, apps, documentation..."
          aria-label="Search the developer console"
          className="flex-1 min-w-0 bg-transparent outline-none text-[11.5px] text-[var(--dc-text)] placeholder:text-[var(--dc-faint)]"
        />
        <kbd className="hidden min-[1500px]:inline-flex items-center h-[20px] px-[6px] rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-card)] text-[10.5px] font-medium text-[var(--dc-muted)] font-sans whitespace-nowrap">
          Ctrl + K
        </kbd>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-[42px] dc-card !rounded-[14px] p-2 shadow-2xl z-50">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[var(--dc-muted)]">No results for â€œ{q}â€.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.hint}-${r.label}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
                onClick={() => choose(r)}
                className={cx('w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] text-left', i === active ? 'bg-[var(--dc-blue-soft)]' : 'hover:bg-[var(--dc-hover)]')}
              >
                <span className="truncate text-[12px] font-medium text-[var(--dc-text)]">{r.label}</span>
                <span className="shrink-0 text-[10.5px] text-[var(--dc-muted)]">{r.hint}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, open, close);
  const name = (user?.name as string) || 'Developer';
  const avatar = typeof user?.avatar === 'string' && user.avatar ? user.avatar : null;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-[9px] rounded-md pl-1 pr-1 py-1 hover:bg-[var(--dc-hover)]">
        {avatar && !broken ? (
          <img src={avatar} alt="" onError={() => setBroken(true)} className="w-[31px] h-[31px] rounded-full object-cover" />
        ) : (
          <span className="w-[31px] h-[31px] rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-[11px] font-bold grid place-items-center">{initials || 'D'}</span>
        )}
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-[11.5px] font-semibold text-[var(--dc-text)] max-w-[120px] truncate">{name}</span>
          <span className="block text-[10px] text-[var(--dc-muted)]">Developer</span>
        </span>
        <ChevronDown size={14} className="hidden sm:block ml-[6px] text-[var(--dc-muted)]" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[44px] w-[220px] dc-card !rounded-[14px] p-1.5 shadow-xl z-50">
          {[
            { to: '/profile', label: 'My profile', icon: UserIcon },
            { to: '/settings', label: 'Account settings', icon: Settings },
            { to: '/developer/docs', label: 'Documentation', icon: BookOpen },
            { to: '/home', label: 'Back to WebSoft', icon: Home },
          ].map((m) => (
            <Link key={m.to} to={m.to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
              <m.icon size={14} /> {m.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/auth');
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium text-[var(--dc-red)] hover:bg-[var(--dc-red-soft)]"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const itemCls = 'w-full flex items-center gap-[10px] h-[30px] px-[10px] rounded-[8px] text-[12.5px] text-left transition-[background-color,color,padding] duration-150 ease-out';
const itemActiveCls = 'bg-[var(--dc-side-active)] text-[var(--dc-side-active-text)] font-semibold';
const itemIdleCls = 'text-[var(--dc-side-text)] hover:bg-[var(--dc-side-hover)] hover:text-[var(--dc-text)] hover:translate-x-[1px]';
const SIDEBAR_KEY = 'wev-dev-console-sidebar';

const SECTIONS_KEY = 'wev-dev-console-nav-sections';
const SIDEBAR_SECTIONS = buildSidebarSections(NAV_GROUPS);

function readOpenSections(): Record<string, boolean> {
  try {
    const v = JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function SidebarNav({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { runTarget, appTabHref, hrefFor } = useConsole();
  const location = useLocation();
  // Expanded/collapsed per section, remembered across visits. Missing = section default.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(readOpenSections);
  const [query, setQuery] = useState('');

  const isActive = (t: NavTarget): boolean => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (t.kind === 'route') {
      const p = t.to.split(/[?#]/)[0];
      if (primaryActiveFor(p, path)) return true;
      const seg = path.startsWith('/developer/apps/') ? path.split('/')[4] : undefined;
      // App detail pages (/developer/apps/:id[/tab]) belong to "My Apps"; app-scoped features to their own item.
      if (p === '/developer/apps') return path === p || (path.startsWith('/developer/apps/') && path !== '/developer/apps/new' && !(seg && seg in APP_SCOPED_SECTIONS));
      const slug = GLOBAL_TO_SCOPED[p];
      if (slug) return path === p || seg === slug;
      return path === p;
    }
    if (t.kind === 'hash') return path === '/developer' && location.hash === `#${t.id}`;
    if (t.kind === 'appTab') {
      const href = appTabHref(t.tab);
      if (!href) return false;
      return path === href;
    }
    return false;
  };

  const toggleSection = (id: string, current: boolean) => {
    setOpenMap((m) => {
      const next = { ...m, [id]: !current };
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const sections = q
    ? SIDEBAR_SECTIONS.map((s) => ({ ...s, items: s.items.filter((it) => `${it.label} ${s.label} ${it.keywords || ''}`.toLowerCase().includes(q)) })).filter((s) => s.items.length)
    : SIDEBAR_SECTIONS;

  const renderItem = (it: NavItem, hidden: boolean) => {
    const active = isActive(it.target);
    const cls = cx(itemCls, active ? itemActiveCls : itemIdleCls, compact && '!px-0 justify-center');
    const inner = (
      <>
        <it.icon size={15} strokeWidth={1.8} className="shrink-0 opacity-90" />
        <span className={cx('truncate', compact && 'sr-only')}>{it.label}</span>
        {active && !compact && <span className="ml-auto h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--dc-side-active-text)]" aria-hidden />}
      </>
    );
    return (
      <li key={it.label}>
        {it.target.kind === 'route' ? (
          <Link to={hrefFor(it.target.to)} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={compact ? it.label : undefined} tabIndex={hidden ? -1 : undefined} className={cls}>
            {inner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              runTarget(it.target);
            }}
            aria-current={active ? 'page' : undefined}
            title={compact ? it.label : undefined}
            tabIndex={hidden ? -1 : undefined}
            className={cls}
          >
            {inner}
          </button>
        )}
      </li>
    );
  };

  return (
    <nav className="dc-side-scroll flex-1 min-h-0 overflow-y-auto pt-[10px] pb-6" aria-label="Developer console">
      {!compact && (
        <div className="px-[12px] pb-[8px]">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="Filter menu"
              aria-label="Filter menu"
              className="w-full h-[30px] pl-[28px] pr-[26px] rounded-[8px] border border-[var(--dc-side-line)] bg-transparent text-[12px] text-[var(--dc-text)] placeholder:text-[var(--dc-faint)] outline-none focus:border-[var(--dc-blue)]"
            />
            {query && (
              <button type="button" aria-label="Clear filter" onClick={() => setQuery('')} className="absolute right-[6px] top-1/2 -translate-y-1/2 text-[var(--dc-faint)] hover:text-[var(--dc-text)]">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}
      {q && sections.length === 0 && <p className="px-[22px] py-3 text-[12px] text-[var(--dc-muted)]">No menu items match "{query}".</p>}
      {sections.map((s, si) => {
        const groupActive = s.items.some((it) => isActive(it.target));
        const open = compact || Boolean(q) || (openMap[s.id] ?? (s.defaultOpen || groupActive));
        const hidden = !open;
        return (
          <div key={s.id} className={cx(compact ? 'px-[10px]' : 'px-[12px]', si > 0 && (compact ? 'mt-[6px] pt-[6px] border-t border-[var(--dc-side-line)]' : 'mt-[4px]'))}>
            {!compact && (
              <button
                type="button"
                onClick={() => toggleSection(s.id, open)}
                aria-expanded={open}
                disabled={Boolean(q)}
                className={cx(
                  'w-full flex items-center gap-[6px] px-[10px] h-[26px] rounded-[6px] text-[10.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-150 hover:bg-[var(--dc-side-hover)]',
                  groupActive ? 'text-[var(--dc-side-active-text)]' : 'text-[var(--dc-side-head)] hover:text-[var(--dc-text)]',
                )}
              >
                <ChevronDown size={12} className={cx('opacity-70 shrink-0 transition-transform duration-200', !open && '-rotate-90')} />
                <span className="truncate flex-1 text-left">{s.label}</span>
                {!open && <span className="text-[10px] font-medium normal-case tracking-normal opacity-60">{s.items.length}</span>}
              </button>
            )}
            <div className={cx('grid transition-[grid-template-rows,opacity] duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
              <ul className={cx('min-h-0 overflow-hidden space-y-[1px]', !compact && open && 'mt-[2px] mb-[4px]')} aria-hidden={hidden ? true : undefined}>
                {s.items.map((it) => renderItem(it, hidden))}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function ConsoleFooter() {
  // Backend readiness probe (same endpoint the e2e config waits on).
  const ready = useQuery({
    queryKey: ['developerConsole', 'ready'],
    queryFn: async () => {
      const res = await fetch('/api/ready');
      if (!res.ok) throw new Error(String(res.status));
      return true;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });
  const degraded = ready.isError;
  return (
    <footer className="h-[32px] shrink-0 border-t border-[var(--dc-border)] bg-[var(--dc-side)] flex items-center justify-between px-[28px] text-[10.5px]">
      <span className="flex items-center gap-[7px] text-[var(--dc-muted)]">
        <span className={cx('w-[6px] h-[6px] rounded-full', degraded ? 'bg-[var(--dc-amber)]' : 'bg-[#22c55e]')} />
        {degraded ? 'Some systems degraded' : 'All systems operational'}
      </span>
      <span className="text-[var(--dc-text-2)]">
        WebSoft Developer Console <span className="text-[var(--dc-muted)]">{CONSOLE_VERSION}</span>
      </span>
    </footer>
  );
}
