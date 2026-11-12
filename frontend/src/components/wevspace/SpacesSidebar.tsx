/**
 * Spaces sidebar (ChatGPT/Gemini style). Shown on the Spaces directory, on Space
 * profiles and, in Space mode, as the Space-mode nav in place of the app sidebar
 * (DashboardLayout renders one or the other, never both).
 * Desktop: collapsible to an icon rail (remembered). Mobile: slide-over drawer
 * opened through `openSpacesNav()` / the `wev:spaces-nav` event.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Flame,
  Heart,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { spaceDashboardPath, spaceDeskPath, spaceInitials, spacePublicPath } from '@wevsoft/shared/wevspace';
import { useStore } from '../../store';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import { fetchFollowedSpaces } from '../../lib/wevspaceApi';
import { getRecentSpaces, RECENT_SPACES_EVENT, type RecentSpace } from '../../lib/recentSpaces';
import { resolveAvatarUrl } from '../UserAvatar';
import { WevSpaceIcon } from './WevSpaceIcon';
import WevDeskMark from './WevDeskMark';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

const COLLAPSE_KEY = 'wev.spacesSidebar.collapsed';
const OPEN_EVENT = 'wev:spaces-nav';
const ICON = 16;
const STROKE = 2;

export function openSpacesNav() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Mobile trigger for the drawer; place it in a page header. */
export function SpacesNavButton({ className = '' }: { className?: string }) {
  const { t } = useMarketplaceLang();
  return (
    <button
      type="button"
      onClick={openSpacesNav}
      aria-label={t('Open Space menu', 'স্পেস মেনু খুলুন')}
      className={`lg:hidden inline-grid place-items-center w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors ${className}`}
    >
      <Menu size={18} strokeWidth={STROKE} />
    </button>
  );
}

function subscribeRecents(cb: () => void) {
  window.addEventListener(RECENT_SPACES_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(RECENT_SPACES_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
let recentsCache: { raw: string; list: RecentSpace[] } = { raw: '', list: [] };
function recentsSnapshot(): RecentSpace[] {
  const list = getRecentSpaces();
  const raw = JSON.stringify(list);
  if (raw !== recentsCache.raw) recentsCache = { raw, list };
  return recentsCache.list;
}

function MiniAvatar({ name, avatar, accent, size = 20 }: { name: string; avatar?: string | null; accent?: string; size?: number }) {
  const url = resolveAvatarUrl(avatar || null);
  return (
    <span
      className="shrink-0 rounded-md overflow-hidden grid place-items-center text-white font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: url ? undefined : accent || 'var(--primary)' }}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" /> : spaceInitials(name)}
    </span>
  );
}

function SidebarBody({
  collapsed,
  pinnedCollapsed = collapsed,
  onToggle,
  inDrawer,
  onClose,
}: {
  collapsed: boolean;
  pinnedCollapsed?: boolean;
  onToggle?: () => void;
  inDrawer?: boolean;
  onClose?: () => void;
}) {
  const user = useStore((s) => s.user) as any;
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const onDirectory = location.pathname === '/spaces' || location.pathname.startsWith('/spaces/category/');
  const view = params.get('view') || params.get('tab');
  const sort = params.get('sort');
  const { t, formatNum } = useMarketplaceLang();
  const { spaces: mySpaces, active, isSpaceMode } = useSpaceIdentities();
  const recents = useSyncExternalStore(subscribeRecents, recentsSnapshot, () => recentsCache.list);

  const following = useQuery({
    queryKey: ['spaces', 'following', 'sidebar'],
    queryFn: () => fetchFollowedSpaces(6, 0),
    enabled: !!user,
    staleTime: 60_000,
  });

  // WevDesk target: the active Space in Space mode, else the picked/first Space this account runs.
  const [deskPick, setDeskPick] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const deskSpace = useMemo(() => {
    if (isSpaceMode && active?.handle) return active;
    return mySpaces.find((s) => s.id === deskPick) || mySpaces[0] || null;
  }, [isSpaceMode, active, mySpaces, deskPick]);

  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (inDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        // Captured before the app-wide search so Spaces pages search Spaces.
        e.preventDefault();
        e.stopImmediatePropagation();
        if (pinnedCollapsed) onToggle?.();
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [inDrawer, pinnedCollapsed, onToggle]);

  const go = useCallback(
    (to: string) => {
      onClose?.();
      navigate(to);
    },
    [navigate, onClose],
  );

  const authed = (to: string) => (user ? to : `/auth?next=${encodeURIComponent(to)}`);

  const navItems: Array<{ key: string; label: string; icon: ReactNode; to: string; active: boolean; badge?: number }> = [
    { key: 'explore', label: t('Explore', 'এক্সপ্লোর'), icon: <Compass size={ICON} strokeWidth={STROKE} />, to: '/spaces', active: onDirectory && !view && (!sort || sort === 'recommended') },
    ...(user
      ? [
          { key: 'mine', label: t('My Space', 'আমার স্পেস'), icon: <WevSpaceIcon size={ICON} />, to: '/spaces?view=mine', active: onDirectory && view === 'mine' },
          {
            key: 'following',
            label: t('Following', 'ফলো করছেন'),
            icon: <Heart size={ICON} strokeWidth={STROKE} />,
            to: '/spaces?view=following',
            active: onDirectory && view === 'following',
            badge: following.data?.total || undefined,
          },
        ]
      : []),
    { key: 'trending', label: t('Trending', 'ট্রেন্ডিং'), icon: <Flame size={ICON} strokeWidth={STROKE} />, to: '/spaces?sort=trending', active: onDirectory && !view && sort === 'trending' },
  ];

  const settingsTo = isSpaceMode && active?.handle ? spaceDashboardPath(active.handle, 'settings') : '/settings';
  // Admin-panel rows: full width, muted text, primary tint + right edge bar when active.
  const row = (activeRow: boolean) =>
    `group w-full flex items-center gap-2 h-8 text-[12.5px] transition-all ${collapsed ? 'justify-center px-0' : 'px-3'} ${
      activeRow
        ? 'text-primary bg-primary/[0.08] border-r-2 border-primary font-bold'
        : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50'
    }`;
  const label = (text: string) => (collapsed ? null : <span className="truncate">{text}</span>);
  const sectionLabel = (text: string) =>
    collapsed ? <div className="my-1.5 mx-2 border-t border-border" /> : <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{text}</div>;

  const followedList = following.data?.spaces || [];
  const recentList = recents.filter((r) => !followedList.some((f) => f.id === r.id)).slice(0, 4);
  const userAvatar = resolveAvatarUrl(user?.avatar || null);

  return (
    <div className="flex h-full flex-col">
      {/* Top: brand + collapse */}
      <div className={`shrink-0 h-12 border-b border-border flex items-center ${collapsed ? 'px-1.5 justify-center' : 'px-3 gap-2 justify-between'}`}>
        {!collapsed && (
          <Link to="/spaces" onClick={onClose} className="flex items-center gap-2 min-w-0" title={t('Space', 'স্পেস')}>
            <span className="w-7 h-7 rounded-lg grid place-items-center bg-primary/10 text-primary shrink-0">
              <WevSpaceIcon size={15} />
            </span>
            <span className="text-[14px] font-bold tracking-tight truncate">{t('Space', 'স্পেস')}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={inDrawer ? onClose : onToggle}
          aria-label={inDrawer ? t('Close menu', 'মেনু বন্ধ করুন') : pinnedCollapsed ? t('Show sidebar', 'সাইডবার দেখান') : t('Hide sidebar', 'সাইডবার লুকান')}
          title={inDrawer ? t('Close', 'বন্ধ করুন') : pinnedCollapsed ? t('Show sidebar', 'সাইডবার দেখান') : t('Hide sidebar', 'সাইডবার লুকান')}
          className="p-1 rounded-md grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          {inDrawer ? <X size={ICON} strokeWidth={STROKE} /> : pinnedCollapsed ? <PanelLeftOpen size={ICON} strokeWidth={STROKE} /> : <PanelLeftClose size={ICON} strokeWidth={STROKE} />}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
        <div className={collapsed ? 'px-1.5' : 'px-3'}>
        {/* Create + search */}
        <button
          type="button"
          onClick={() => go(authed('/spaces/create'))}
          title={t('Create Space', 'স্পেস তৈরি করুন')}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border bg-card text-[12.5px] font-semibold hover:bg-muted transition-colors"
        >
          <Plus size={15} strokeWidth={STROKE} />
          {label(t('Create Space', 'স্পেস তৈরি করুন'))}
        </button>
        {collapsed ? (
          <button type="button" onClick={onToggle} title={t('Search Space (Ctrl K)', 'স্পেস খুঁজুন (Ctrl K)')} className="mt-1.5 w-full h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <Search size={ICON} strokeWidth={STROKE} />
          </button>
        ) : (
          <form
            className="mt-2 mb-1 flex items-center gap-2 h-8 rounded-lg bg-muted px-2.5 text-muted-foreground focus-within:ring-2 focus-within:ring-primary/25"
            onSubmit={(e) => {
              e.preventDefault();
              const term = q.trim();
              go(term ? `/spaces?q=${encodeURIComponent(term)}` : '/spaces');
            }}
          >
            <Search size={14} strokeWidth={STROKE} />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Search Space', 'স্পেস খুঁজুন')}
              aria-label={t('Search Space', 'স্পেস খুঁজুন')}
              className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px] text-foreground placeholder:text-muted-foreground"
            />
            {!inDrawer && <kbd className="text-[10px] border border-border rounded px-1 font-sans">Ctrl K</kbd>}
          </form>
        )}
        </div>

        <nav className="mt-2 flex flex-col" aria-label="Space">
          {navItems.map((item) => (
            <Link key={item.key} to={item.to} onClick={onClose} title={item.label} className={row(item.active)} aria-current={item.active ? 'page' : undefined}>
              <span className={item.active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>{item.icon}</span>
              {label(item.label)}
              {!collapsed && item.badge ? (
                <span className="ml-auto text-[10.5px] font-semibold rounded-full bg-muted px-1.5 text-muted-foreground">{item.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* WevDesk */}
        {user &&
          (deskSpace?.handle ? (
            <div className={`relative mt-2.5 ${collapsed ? 'px-1' : 'px-3'}`}>
              <Link
                to={spaceDeskPath(deskSpace.handle)}
                onClick={onClose}
                title={`WevDesk: ${deskSpace.name}`}
                className={
                  collapsed
                    ? 'relative grid place-items-center w-9 h-9 mx-auto rounded-lg hover:bg-muted transition-colors'
                    : 'flex items-center gap-2.5 p-2.5 rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.12] to-teal-500/[0.03] hover:from-teal-500/[0.18] transition-colors'
                }
              >
                <WevDeskMark size={collapsed ? 24 : 26} />
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-tight">WevDesk</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{deskSpace.name}</span>
                  </span>
                )}
                {!!deskSpace.unreadCount && (
                  <span
                    className={`${collapsed ? 'absolute -top-0.5 -right-0.5' : ''} min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold grid place-items-center`}
                  >
                    {deskSpace.unreadCount > 99 ? '99+' : deskSpace.unreadCount}
                  </span>
                )}
              </Link>
              {!collapsed && !isSpaceMode && mySpaces.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPickerOpen((v) => !v)}
                    aria-label={t('Choose Space for WevDesk', 'WevDesk-এর জন্য স্পেস বেছে নিন')}
                    className="absolute right-4 bottom-1.5 w-5 h-5 grid place-items-center rounded text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <ChevronDown size={13} strokeWidth={STROKE} />
                  </button>
                  {pickerOpen && (
                    <div className="absolute left-3 right-3 top-full mt-1 z-30 p-1 rounded-xl bg-card border border-border shadow-lg">
                      {mySpaces.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setDeskPick(s.id);
                            setPickerOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left hover:bg-muted ${s.id === deskSpace.id ? 'font-semibold' : ''}`}
                        >
                          <MiniAvatar name={s.name} avatar={s.avatar} />
                          <span className="truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <Link
              to="/spaces/create"
              onClick={onClose}
              title={t('Create a Space to use WevDesk', 'WevDesk ব্যবহার করতে একটি স্পেস তৈরি করুন')}
              className={
                collapsed
                  ? 'mt-2.5 grid place-items-center w-10 h-10 mx-auto rounded-xl opacity-70 hover:bg-muted'
                  : 'mt-2.5 mx-3 flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-border hover:bg-muted transition-colors'
              }
            >
              <WevDeskMark size={collapsed ? 24 : 26} className="opacity-80" />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">WevDesk</span>
                  <span className="block text-[11px] text-muted-foreground">{t('Create a Space to use WevDesk', 'WevDesk ব্যবহার করতে একটি স্পেস তৈরি করুন')}</span>
                </span>
              )}
            </Link>
          ))}

        {user && followedList.length > 0 && (
          <>
            {sectionLabel(t('Following Space', 'ফলো করা স্পেস'))}
            <nav className="flex flex-col">
              {followedList.map((s) => (
                <Link key={s.id} to={spacePublicPath(s.handle)} onClick={onClose} title={s.name} className={row(location.pathname.toLowerCase() === spacePublicPath(s.handle).toLowerCase())}>
                  <MiniAvatar name={s.name} avatar={s.avatar} accent={s.accentColor || undefined} />
                  {label(s.name)}
                </Link>
              ))}
              {!collapsed && (following.data?.total || 0) > followedList.length && (
                <Link to="/spaces?view=following" onClick={onClose} className={`${row(false)} text-muted-foreground`}>
                  <ChevronRight size={14} strokeWidth={STROKE} className="mx-[3px]" />
                  <span>{t('Show all', 'সব দেখুন')}</span>
                </Link>
              )}
            </nav>
          </>
        )}

        {recentList.length > 0 && (
          <>
            {sectionLabel(t('Recent Space', 'সাম্প্রতিক স্পেস'))}
            <nav className="flex flex-col">
              {recentList.map((s) => (
                <Link key={s.id} to={spacePublicPath(s.handle)} onClick={onClose} title={s.name} className={row(location.pathname.toLowerCase() === spacePublicPath(s.handle).toLowerCase())}>
                  <MiniAvatar name={s.name} avatar={s.avatar} accent={s.accent} />
                  {label(s.name)}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Bottom */}
      <div className="shrink-0 py-1 border-t border-border flex flex-col">
        <Link to={settingsTo} onClick={onClose} title={t('Settings', 'সেটিংস')} className={row(location.pathname === settingsTo)}>
          <Settings size={ICON} strokeWidth={STROKE} className="text-muted-foreground" />
          {label(t('Settings', 'সেটিংস'))}
        </Link>
        {user ? (
          <Link
            to={isSpaceMode && active?.handle ? spacePublicPath(active.handle) : '/profile'}
            onClick={onClose}
            title={user.name}
            className={`mt-0.5 flex items-center gap-2.5 hover:bg-muted/50 transition-colors ${collapsed ? 'justify-center py-1.5' : 'px-3 py-1.5'}`}
          >
            <span className="w-8 h-8 rounded-full overflow-hidden bg-muted grid place-items-center text-[11px] font-bold shrink-0">
              {userAvatar ? <img src={userAvatar} alt="" className="w-full h-full object-cover" /> : spaceInitials(user.name || user.username || '?')}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold truncate">{isSpaceMode && active ? active.name : user.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {isSpaceMode && active?.handle ? `@${active.handle} · ${t('Space mode', 'স্পেস মোড')}` : `@${user.username}${mySpaces.length ? ` · ${formatNum(mySpaces.length)} ${t('Space', 'স্পেস')}` : ''}`}
                </span>
              </span>
            )}
          </Link>
        ) : (
          <Link to="/auth" onClick={onClose} title={t('Sign in', 'সাইন ইন')} className={row(false)}>
            <LayoutGrid size={ICON} strokeWidth={STROKE} className="text-muted-foreground" />
            {label(t('Sign in', 'সাইন ইন'))}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SpacesSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  // Admin parity: a collapsed rail peeks open while hovered.
  const [peek, setPeek] = useState(false);
  const { t } = useMarketplaceLang();
  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
    setPeek(false);
  }, []);

  const open = !collapsed || peek;
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const [seenPath, setSeenPath] = useState(location.pathname + location.search);
  if (seenPath !== location.pathname + location.search) {
    setSeenPath(location.pathname + location.search);
    if (drawer) setDrawer(false);
  }
  useEffect(() => {
    const open = () => setDrawer(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);
  const close = useCallback(() => setDrawer(false), []);

  return (
    <>
      <aside
        aria-label={t('Space navigation', 'স্পেস নেভিগেশন')}
        onMouseEnter={() => collapsed && setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        className={`hidden lg:flex shrink-0 h-full flex-col overflow-hidden bg-card border-r border-border transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'w-52' : 'w-12'
        }`}
      >
        <SidebarBody collapsed={!open} pinnedCollapsed={collapsed} onToggle={toggle} />
      </aside>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t('Space menu', 'স্পেস মেনু')}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={close} />
          <aside className="absolute left-0 top-0 bottom-0 w-[264px] max-w-[85vw] flex flex-col bg-card border-r border-border shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <SidebarBody collapsed={false} inDrawer onClose={close} />
          </aside>
        </div>
      )}
    </>
  );
}
