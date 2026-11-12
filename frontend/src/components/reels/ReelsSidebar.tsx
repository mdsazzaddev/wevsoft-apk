import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReelsUiMode } from '../../lib/reelsUiPrefs';
import {
  Sparkles, Users, User, Plus, Flame, Music, Gamepad2, Monitor,
  Heart, Star, Clock, Search, X,
  type LucideIcon,
} from 'lucide-react';

export type ReelsSidebarExtra = 'trending' | 'music' | 'gaming' | 'technology' | 'liked' | 'saved' | 'history';
type MainTab = 'for-you' | 'following';
type ExtraId = ReelsSidebarExtra;

/** Always OLED black — ignores app light/dark theme tokens. */
const itemClass = (isActive: boolean, collapsed: boolean) =>
  `group relative flex items-center rounded-2xl text-[15px] font-semibold transition-colors ${
    collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 px-3.5 py-3'
  } ${
    isActive
      ? 'bg-white/12 text-white'
      : 'text-white/55 hover:bg-white/8 hover:text-white'
  }`;

type NavItem = { id: string; label: string; icon: LucideIcon; isActive: boolean; onClick: () => void };

export default function ReelsSidebar({
  active,
  onSelect,
  onProfile,
  onCreate,
  extraActive,
  onExtraSelect,
  onSearch,
  hidden,
  mobileOpen = false,
  onMobileClose,
}: {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  onProfile: () => void;
  onCreate: () => void;
  extraActive?: ExtraId | null;
  onExtraSelect?: (id: ExtraId) => void;
  onSearch?: () => void;
  hidden?: boolean;
  /** Mobile: slide-in drawer state (desktop sidebar is always persistent). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { t } = useTranslation();
  const [localExtra, setLocalExtra] = useState<ExtraId | null>(null);
  const picked = extraActive !== undefined ? extraActive : localExtra;

  // Desktop: icon rail always visible; hover expands labels (auto). Always = full; hidden = off.
  const sidebarMode = useReelsUiMode('sidebar');
  const [peek, setPeek] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);
  const show = useCallback(() => { cancelHide(); setPeek(true); }, [cancelHide]);
  const hideSoon = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => { hideTimer.current = null; setPeek(false); }, 280);
  }, [cancelHide]);
  useEffect(() => cancelHide, [cancelHide]);
  const expanded = sidebarMode === 'always' || peek;
  const collapsed = !expanded;

  // Close the drawer on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const closeDrawer = () => onMobileClose?.();

  const selectMain = (tab: MainTab) => {
    setLocalExtra(null);
    onSelect(tab);
    closeDrawer();
  };

  const selectExtra = (id: ExtraId) => {
    setLocalExtra(id);
    onExtraSelect?.(id);
    closeDrawer();
  };

  const search = () => {
    closeDrawer();
    onSearch?.();
  };

  const main: NavItem[] = [
    { id: 'for-you', label: t('reels.forYou', 'For You'), icon: Sparkles, isActive: !picked && active === 'for-you', onClick: () => selectMain('for-you') },
    { id: 'following', label: t('reels.following', 'Following'), icon: Users, isActive: !picked && active === 'following', onClick: () => selectMain('following') },
  ];

  const discover: NavItem[] = [
    { id: 'search', label: t('reels.search', 'Search'), icon: Search, isActive: false, onClick: search },
    ...([
      { id: 'trending', label: t('reels.trending', 'Trending'), icon: Flame },
      { id: 'music', label: t('reels.music', 'Music'), icon: Music },
      { id: 'gaming', label: t('reels.gaming', 'Gaming'), icon: Gamepad2 },
      { id: 'technology', label: t('reels.technology', 'Technology'), icon: Monitor },
    ] as const).map((i) => ({ ...i, isActive: picked === i.id, onClick: () => selectExtra(i.id) })),
  ];

  const library: NavItem[] = ([
    { id: 'liked', label: t('reels.liked', 'Liked Reels'), icon: Heart },
    { id: 'saved', label: t('reels.saved', 'Saved Reels'), icon: Star },
    { id: 'history', label: t('reels.history', 'Watch History'), icon: Clock },
  ] as const).map((i) => ({ ...i, isActive: picked === i.id, onClick: () => selectExtra(i.id) }));

  const renderItem = (item: NavItem, isCollapsed: boolean) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={item.onClick}
        title={isCollapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={item.isActive ? 'page' : undefined}
        className={itemClass(item.isActive, isCollapsed)}
      >
        {item.isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-400" aria-hidden="true" />
        )}
        <Icon size={22} strokeWidth={item.isActive ? 2.4 : 2} className={item.isActive ? 'text-emerald-400' : undefined} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  const sectionTitle = (label: string, isCollapsed: boolean) =>
    isCollapsed ? (
      <div className="mx-auto my-3 h-px w-8 bg-white/10" aria-hidden="true" />
    ) : (
      <p className="px-3.5 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{label}</p>
    );

  const body = (isCollapsed: boolean, mobile: boolean) => (
    <>
      <div className={`flex items-center mb-6 ${isCollapsed ? 'flex-col gap-2' : 'gap-1.5 px-2'}`}>
        {!isCollapsed && (
          <h1 className={`text-white font-extrabold tracking-tight flex-1 ${mobile ? 'text-[24px] pl-2' : 'text-[28px]'}`}>
            {t('reels.title', 'Reels')}
          </h1>
        )}
        {mobile ? (
          <button
            type="button"
            onClick={closeDrawer}
            title={t('reels.closeMenu', 'Close menu')}
            aria-label={t('reels.closeMenu', 'Close menu')}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white shrink-0"
          >
            <X size={22} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      <nav className="flex flex-col gap-1">
        {main.map((i) => renderItem(i, isCollapsed))}
        <button
          type="button"
          onClick={() => { closeDrawer(); onProfile(); }}
          title={isCollapsed ? t('reels.profile', 'Profile') : undefined}
          aria-label={t('reels.profile', 'Profile')}
          className={itemClass(false, isCollapsed)}
        >
          <User size={22} strokeWidth={2} />
          {!isCollapsed && <span className="truncate">{t('reels.profile', 'Profile')}</span>}
        </button>
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar mt-2">
        {sectionTitle(t('reels.discover', 'Discover'), isCollapsed)}
        <nav className="flex flex-col gap-1">{discover.map((i) => renderItem(i, isCollapsed))}</nav>
        {sectionTitle(t('reels.library', 'Library'), isCollapsed)}
        <nav className="flex flex-col gap-1">{library.map((i) => renderItem(i, isCollapsed))}</nav>
      </div>

      <div className={`mt-auto pt-4 ${isCollapsed ? '' : 'px-2'}`}>
        <button
          type="button"
          onClick={() => { closeDrawer(); onCreate(); }}
          title={isCollapsed ? t('reels.create', 'Create') : undefined}
          aria-label={t('reels.create', 'Create')}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors ${
            isCollapsed ? 'h-12 w-12 mx-auto' : 'w-full py-3'
          }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          {!isCollapsed && t('reels.create', 'Create')}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: icons always on; hover the left ~160px band to expand labels */}
      {!hidden && sidebarMode !== 'hidden' && (
        <div className="hidden lg:block">
          {sidebarMode === 'auto' && !expanded ? (
            <div
              className="absolute inset-y-0 left-0 z-[45] w-40"
              onMouseEnter={show}
              aria-hidden="true"
            />
          ) : null}
          <aside
            className={`absolute inset-y-0 left-0 z-50 flex flex-col text-white transition-[width,padding,background-color,border-color,box-shadow] duration-300 ease-out ${
              expanded
                ? 'w-[280px] bg-black/95 px-5 py-6 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-black/70'
                : 'w-16 bg-transparent px-2 py-6 border-r border-transparent'
            }`}
            aria-label={t('reels.title', 'Reels')}
            aria-expanded={expanded}
            onMouseEnter={sidebarMode === 'auto' ? show : undefined}
            onMouseLeave={sidebarMode === 'auto' ? hideSoon : undefined}
            onFocus={sidebarMode === 'auto' ? show : undefined}
            onBlur={
              sidebarMode === 'auto'
                ? (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hideSoon();
                  }
                : undefined
            }
          >
            {body(collapsed, false)}
          </aside>
        </div>
      )}

      {/* Mobile: slide-in drawer */}
      {!hidden && (
        <div className={`lg:hidden fixed inset-0 z-[60] ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeDrawer}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t('reels.title', 'Reels')}
            className={`absolute inset-y-0 left-0 w-[min(82vw,300px)] flex flex-col bg-neutral-950/95 backdrop-blur-2xl text-white border-r border-white/10 px-4 shadow-2xl shadow-black/70 transition-transform duration-300 ease-out ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
              paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            }}
          >
            {body(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
