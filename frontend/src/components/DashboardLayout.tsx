import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import SmartSearchBar from "./SmartSearchBar";
import { isCreatorHubPath } from '../lib/creatorHub';
import { isBatchStudioPath } from '../lib/batchStudio';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trLabel } from './settings/languagePickerShared';
import { useStore } from '../store';
import { motion, AnimatePresence, useTransform } from 'motion/react';
import { X, Globe, Settings, LogOut, RefreshCw, Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import i18n from '../i18n';
import { MemoizedSidebar } from './MemoizedSidebar';
import SpacesSidebar from './wevspace/SpacesSidebar';
import { RightSidebarWidget } from './RightSidebarWidget';
import { MobileBottomNav } from './MobileBottomNav';
import { DesktopTopBar } from './DesktopTopBar';
import MobileTopHeader from './MobileTopHeader';
import toast from 'react-hot-toast';
import { useL10n } from '../utils/l10n';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { DIRECT_NAVIGATION_ITEMS, MORE_NAVIGATION_ITEMS, filterNavigationForDonationNav, filterNavigationForSpaceMode, isSpaceModeExternalNav, isSpaceModeHiddenNavPath, type NavigationMenuItem } from '../lib/navigationMenu';
import { handleHomeNavClick } from '../lib/appNavigation';
import { handleWevChatNavClick, isWevChatNavPath } from '../lib/wevchatNav';
import { useOverlayBack } from '../hooks/useOverlayBack';
import { AppNavLink } from './navigation/AppNavLink';
import { NavGlyph } from './navigation/NavGlyph';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { spaceModeNavPath } from '@wevsoft/shared/wevspace';
import UserAvatar, { resolveAvatarUrl } from './UserAvatar';
import SpaceSwitcher from './wevspace/SpaceSwitcher';
import { MAX_PULL_PX, PULL_THRESHOLD_PX, useStandalonePullToRefresh } from '../hooks/useStandalonePullToRefresh';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { NotificationBadge } from './ui/NotificationBadge';
import OutletFallback from './OutletFallback';
import { dismissWevSplash } from '../lib/wevSplash';
import { useAutoHideOnScroll } from '../hooks/useAutoHideOnScroll';
import { parseMobileTopHeaderStyle } from '../lib/mobileTopHeader';
import { useUiStore } from '../stores/uiStore';
import { ConnectCallProvider } from './connect/ConnectCallProvider';

const WevChatLayout = lazy(() =>
  import('./wevchat/WevChatLayout').then((m) => ({ default: m.WevChatLayout })),
);
const UploadModal = lazy(() => import('./UploadModal'));
const LanguageModal = lazy(() =>
  import('./LanguageModal').then((m) => ({ default: m.LanguageModal })),
);
const SwitchAccountModal = lazy(() =>
  import('./SwitchAccountModal').then((m) => ({ default: m.SwitchAccountModal })),
);

export default function DashboardLayout() {
  useEffect(() => {
    void import('../lib/mediaVisibilityGuard').then((m) => m.installMediaVisibilityGuard());
  }, []);

  useEffect(() => {
    dismissWevSplash();
  }, []);
  const location = useLocation();
  const path = location.pathname;
  const wevChatDesktopFloat = useUiStore((s) => s.wevChatDesktopFloat);
  const wevChatOpenMinimized = useUiStore((s) => s.wevChatOpenMinimized);
  const closeWevChatDesktopFloat = useUiStore((s) => s.closeWevChatDesktopFloat);
  const openWevChatDesktopFloat = useUiStore((s) => s.openWevChatDesktopFloat);
  const isHomeScreen = path === '/' || path === '/home' || path === '/feed';
  const isProfileScreen =
    path === '/profile' ||
    path.startsWith('/profile/') ||
    path.startsWith('/u/') ||
    path.startsWith('/@');
  const showRightRail = isHomeScreen;
  // RightSidebarWidget is `hidden lg:flex` — below lg, embed is unavailable.
  const [isLgUp, setIsLgUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLgUp(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  // Minimized first-open uses the floating pill; restored open embeds in the home rail.
  const wevChatInRightRail = wevChatDesktopFloat && showRightRail && isLgUp && !wevChatOpenMinimized;
  const isMarketplace = path === '/wevmall' || path.startsWith('/wevmall/');
  const isReels = path === '/reels' || path.startsWith('/reels');
  const isMessages = path === '/messages' || path.startsWith('/messages');

  // Exit-fullscreen from /messages stashes a pending float, then navigates home.
  useEffect(() => {
    if (isMessages) return;
    try {
      if (sessionStorage.getItem('wev_pending_desktop_float') === null) return;
      const id = sessionStorage.getItem('wev_pending_desktop_float');
      sessionStorage.removeItem('wev_pending_desktop_float');
      openWevChatDesktopFloat(id || null);
    } catch { /* ignore */ }
  }, [isMessages, path, openWevChatDesktopFloat]);
  // WevSpace manage / public / create own their chrome — floating DesktopTopBar
  // must not sit on top of StandingBanner / SpaceIdentity (header-off mode).
  const isSpaceManage = /\/space\/[^/]+\/manage(?:\/|$)/.test(path);
  const isSpacePublic = /^\/space\//.test(path) && !isSpaceManage;
  const isSpacesCreate = path === '/spaces/create' || path.startsWith('/spaces/create/');
  const isSpacesDirectory = path === '/spaces' || path.startsWith('/spaces/category/');
  // Creator Hub is a full-screen workspace with its own rail: no app sidebar / top bar.
  const isCreatorStudio = isCreatorHubPath(path);
  // Batch Upload / Scheduled & history — own studio chrome, full-bleed.
  const isBatchStudio = isBatchStudioPath(path, location.search);
  // WevMall + Reels: fullscreen PC experience — no DesktopTopBar / floating shortcuts.
  // Mobile keeps ReelsMobileHeader / WevMall chrome; do not gate those here.
  const isImmersive = isMarketplace || isReels;
  const isGroups = path === '/groups' || path.startsWith('/groups/');
  // Floating pill (header-off) on Home/Feed only — never on Reels/WevMall.
  // Full desktop top nav (center shortcuts) on Home/Feed and Friends/Connections.
  const isFriendsScreen = path === '/friends' || path.startsWith('/friends/');
  const isDonateScreen = path === '/donate' || path.startsWith('/donate/');
  const isLiveScreen = path === '/live' || path.startsWith('/live/');
  /** Watching a specific stream — immersive full-bleed (Facebook Live–style). */
  const isLiveWatch = /^\/live\/[^/]+/.test(path);
  // Personal profile is header-off (full-bleed cover) except sections that opt in (Friends tab).
  const profileTopBarVisible = useUiStore((s) => s.profileTopBarVisible);
  const hideTopBar =
    isMarketplace ||
    isReels ||
    isLiveWatch ||
    (isProfileScreen && !profileTopBarVisible) ||
    isMessages ||
    isSpaceManage ||
    isSpacePublic ||
    isSpacesCreate ||
    isSpacesDirectory ||
    isCreatorStudio ||
    isBatchStudio ||
    isGroups ||
    isDonateScreen;
  // Home/Friends keep center shortcut chrome; Donate is full-bleed (own page header).
  const allowFloatingChrome = isHomeScreen || isFriendsScreen;
  const { t } = useTranslation();
  const logout = useStore(state => state.logout);
  const user = useStore(state => state.user);
  const { active, isSpaceMode } = useSpaceIdentities();
  const isSpaceModeBlocked = isSpaceMode && isSpaceModeHiddenNavPath(path);

  // Personal WevChat float/rail must close on Space switch so a user cannot
  // accidentally send a personal DM while thinking they are in Space mode.
  useEffect(() => {
    if (isSpaceMode && wevChatDesktopFloat) {
      closeWevChatDesktopFloat();
    }
  }, [isSpaceMode, wevChatDesktopFloat, closeWevChatDesktopFloat]);

  useEffect(() => {
    if (isSpaceModeBlocked) {
      toast.error(
        t('spaceModeFeatureBlocked', 'This feature is only available for personal accounts, not in Space (Business) mode.')
      );
    }
  }, [isSpaceModeBlocked, path]);  
  const actingName = isSpaceMode && active ? active.name : user?.name;
  const actingUser = isSpaceMode && active
    ? { name: active.name, avatar: resolveAvatarUrl(active.avatar) }
    : user
      ? { name: user.name, avatar: resolveAvatarUrl(user.avatar) }
      : null;
  const navTo = (to: string) => (isSpaceMode ? spaceModeNavPath(to, active) : to);
  // Spaces sidebar replaces (never stacks with) the app sidebar: on the Spaces
  // directory and on Space profiles only (every other route keeps the app sidebar).
  const showAppSidebar =
    !isImmersive &&
    !isProfileScreen &&
    !isSpacePublic &&
    !isSpacesDirectory &&
    !isSpacesCreate &&
    !isSpaceManage &&
    !isCreatorStudio &&
    !isBatchStudio &&
    !isGroups &&
    !isFriendsScreen &&
    !isDonateScreen &&
    !isLiveWatch;
  const showSpacesSidebar = isSpacesDirectory || isSpacePublic;
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useOverlayBack(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
  const token = useStore(state => state.token);
  const systemSettings = useStore(state => state.systemSettings);
  const showMobileTopHeader = useStore(state => state.showMobileTopHeader);
  // Reels already has ReelsMobileHeader — don't stack MobileTopHeader on phones.
  const showMobileHeaderChrome = !!showMobileTopHeader && !hideTopBar && !isReels;
  const pullRefreshEnabled = !isReels && !isMessages && !isBatchStudio;
  const { active: pullActive, pullY, contentY, progress, refreshing } = useStandalonePullToRefresh(pullRefreshEnabled);
  const indicatorY = useTransform(pullY, (v) => v / 2 - 18);
  const indicatorOpacity = useTransform(pullY, [0, 24, PULL_THRESHOLD_PX], [0, 0.6, 1]);
  const indicatorScale = useTransform(pullY, [0, PULL_THRESHOLD_PX], [0.6, 1]);
  const iconRotate = useTransform(pullY, [0, MAX_PULL_PX], [0, 270]);
  // Home feed on phones: MobileTopHeader overlays #main-scroll-area (content padded
  // underneath) and slides away on scroll-down / back on scroll-up. Other routes keep
  // the in-flow sticky header.
  const mobileHeaderOverlay = showMobileHeaderChrome && isHomeScreen;
  const mobileTopHeaderStyleRaw = useStore(state => state.mobileTopHeaderStyle);
  const mobileHeaderBarPx = useMemo(
    () => parseMobileTopHeaderStyle(mobileTopHeaderStyleRaw).height,
    [mobileTopHeaderStyleRaw],
  );
  const mobileHeaderHidden = useAutoHideOnScroll({
    enabled: mobileHeaderOverlay,
    resetKey: path,
    pullY,
    contentY,
  });
  const layoutStyle = mobileHeaderOverlay
    ? ({
      // Safe strip (same formula as StatusBarChrome) + bar height.
      '--wev-mobile-header-offset': `calc(max(env(safe-area-inset-top, 0px), var(--wev-status-bar-fallback, 0px)) + ${mobileHeaderBarPx}px)`,
    } as React.CSSProperties)
    : undefined;
  const { currentLang } = useL10n();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const currentLangMeta = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string>('');
  const [sidebarLogoError, setSidebarLogoError] = useState(false);

  // Shared React Query hook — deduplicated with MobileBottomNav (single network request).
  const { unread: unreadNotifs } = useUnreadNotifications();

  useEffect(() => {
    document.documentElement.classList.toggle('wev-messages-page', isMessages);
    return () => document.documentElement.classList.remove('wev-messages-page');
  }, [isMessages]);

  useEffect(() => {
    let logo = systemSettings?.sidebarLogo || systemSettings?.websiteLogo;
    if (!logo || logo === '/test.png') {
      logo = '/logo.png';
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setSidebarLogoUrl(logo);
    setSidebarLogoError(false);
  }, [systemSettings?.sidebarLogo, systemSettings?.websiteLogo]);

  const mobileLinkClass = (isActive: boolean) =>
    `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
      ? 'bg-primary/12 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const renderMobileMenuItem = (item: NavigationMenuItem) => {
    const Icon = item.icon;
    const to = navTo(item.to);
    const isHomeItem = item.to === '/home';
    const isWevChatItem = isWevChatNavPath(item.to);

    // WevDesk / Developer Console live outside DashboardLayout — open in a new tab
    if (isSpaceModeExternalNav(item.to, isSpaceMode)) {
      const href = typeof to === 'string' ? to : item.to;
      return (
        <a
          key={item.to}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsMobileMenuOpen(false)}
          className={mobileLinkClass(false)}
        >
          <NavGlyph icon={Icon} to={item.to} size={22} className="text-muted-foreground group-hover:text-foreground" />
          <span className="truncate">{trLabel(t, item.labelKey || item.label, item.label)}</span>
          {item.badgeKey === 'notifications' && (
            <NotificationBadge count={unreadNotifs} variant="blue" size="md" className="ml-auto" />
          )}
        </a>
      );
    }

    return (
      <AppNavLink
        key={item.to}
        to={to}
        replace={isMobileMenuOpen}
        onClick={(event) => {
          if (isHomeItem) handleHomeNavClick(event, location.pathname);
          if (isWevChatItem) {
            handleWevChatNavClick(event);
            if (event.defaultPrevented) setIsMobileMenuOpen(false);
          }
          // Same-route taps prevent navigation — dismiss via history pop.
          // Cross-route taps use replace over the overlay entry; useOverlayBack
          // closes when inStack drops. Calling setOpen(false) here on a real
          // navigation would navigate(-1) and undo the destination.
          const dest = typeof to === 'string' ? to.split('?')[0].split('#')[0] : '';
          if (event.defaultPrevented || (dest && location.pathname === dest)) {
            setIsMobileMenuOpen(false);
          }
        }}
        className={({ isActive }) => mobileLinkClass(isActive || (isWevChatItem && wevChatDesktopFloat))}
      >
        {({ isActive }) => (
          <>
            <NavGlyph icon={Icon} to={item.to} size={22} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />
            <span className="truncate">{trLabel(t, item.labelKey || item.label, item.label)}</span>
            {item.badgeKey === 'notifications' && (
              <NotificationBadge count={unreadNotifs} variant="blue" size="md" className="ml-auto" />
            )}
          </>
        )}
      </AppNavLink>
    );
  };

  if (isSpaceModeBlocked) {
    return <Navigate to="/home" replace />;
  }

  return (
    <ConnectCallProvider>
    <div className={`relative flex ${showSpacesSidebar ? 'flex-row' : 'flex-col'} h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans ${isMessages ? 'wev-messages-page' : ''}`} style={layoutStyle}>
      {/* Admin-panel structure: the Spaces sidebar runs full height from the top;
          the top bar and content sit to its right and only the content scrolls. */}
      {showSpacesSidebar && <SpacesSidebar />}
      <div className="relative flex flex-col flex-1 min-w-0 min-h-0">
      {(!hideTopBar || showSpacesSidebar) && (
        <DesktopTopBar
          logoUrl={sidebarLogoUrl}
          logoError={sidebarLogoError}
          onLogoError={() => setSidebarLogoError(true)}
          unreadNotifications={unreadNotifs}
          allowFloatingChrome={allowFloatingChrome}
        />
      )}
      {showMobileHeaderChrome && (
        <MobileTopHeader visible overlay={mobileHeaderOverlay} hidden={mobileHeaderHidden} />
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar (Desktop) — hidden on WevMall, Reels, and profile (full-bleed cover) */}
        {/* Public WevSpace page is a full page too: edge-to-edge header, no side rails. */}
        {!showSpacesSidebar && showAppSidebar && (
          <MemoizedSidebar
            sidebarLogoUrl={sidebarLogoUrl}
            sidebarLogoError={sidebarLogoError}
            onLogoError={() => setSidebarLogoError(true)}
          />
        )}

        {/* Mobile Slide-Out Drawer (For Menu/Search) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 z-[60] device-md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="fixed inset-y-0 left-0 w-[72%] max-w-[20rem] bg-background border-r border-border z-[60] device-md:hidden flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="p-4 border-b border-border flex justify-between items-center gap-2 bg-muted/30">
                  <SpaceSwitcher
                    className="min-w-0 flex-1"
                    renderTrigger={({ open, current }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={trLabel(t, 'SwitchAccount', 'Switch Account')}
                        className="w-full flex items-center gap-3 min-w-0 text-left rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] px-1 py-1 transition-colors"
                      >
                        <UserAvatar
                          user={
                            current
                              ? { name: current.name, avatar: resolveAvatarUrl(current.avatar) }
                              : actingUser
                          }
                          className="w-10 h-10 text-sm border border-primary/20"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{current?.name || actingName}</p>
                          <p className="text-xs text-primary font-medium">
                            {current?.kind === 'space' || isSpaceMode
                              ? (t('Business account', 'Business account') || 'Business account')
                              : (t('Personal account', 'Personal account') || 'Personal account')}
                          </p>
                        </div>
                        <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
                      </button>
                    )}
                  />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors shrink-0">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                  <div className="relative z-20 pb-3">
                    <SmartSearchBar compact placeholder={trLabel(t, 'SearchAnything', 'Search anything')} />
                  </div>
                  <div className="space-y-0.5">
                    {filterNavigationForDonationNav(
                      filterNavigationForSpaceMode(DIRECT_NAVIGATION_ITEMS, isSpaceMode, path),
                      systemSettings?.donationNavEnabled,
                    ).map(renderMobileMenuItem)}
                  </div>

                  {showMoreMenu && (
                    <div className="mt-1 space-y-0.5">
                      {filterNavigationForSpaceMode(MORE_NAVIGATION_ITEMS, isSpaceMode).map(renderMobileMenuItem)}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMoreMenu((value) => !value)}
                    className={mobileLinkClass(false)}
                    aria-expanded={showMoreMenu}
                  >
                    {showMoreMenu ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <span>{showMoreMenu ? trLabel(t, 'SeeLess', 'See Less') : trLabel(t, 'SeeMore', 'See More')}</span>
                  </button>

                  <div className="my-2 border-t border-border/60" />

                  <AppNavLink to="/settings" replace={isMobileMenuOpen} className={({ isActive }) => `px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'hover:bg-muted'}`}><NavGlyph icon={Settings} to="/settings" size={22} /> <span>{t('Settings & Privacy') || 'Settings & Privacy'}</span></AppNavLink>
                  <AppNavLink to="/support" replace={isMobileMenuOpen} className={({ isActive }) => mobileLinkClass(isActive)}><NavGlyph icon={Headphones} to="/support" size={22} /> <span>{t('Support', 'Support')}</span></AppNavLink>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLangModalOpen(true);
                    }}
                    className="w-full px-4 py-3 rounded-xl flex items-center justify-between font-medium transition-colors hover:bg-muted text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-primary" />
                      <span className="truncate">{trLabel(t, 'Language', 'Language')}</span>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                      {currentLangMeta?.flag} {currentLangMeta?.nativeName || currentLang.toUpperCase()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSwitchAccountOpen(true);
                    }}
                    className="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors hover:bg-sky-500/10 hover:text-sky-500 text-left"
                  >
                    <NavGlyph icon={RefreshCw} iconKey="switch" size={22} /> <span className="truncate">{trLabel(t, 'SwitchAccount', 'Switch Account')}</span>
                  </button>
                  <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors text-red-500 hover:bg-red-500/10 text-left">
                    <NavGlyph icon={LogOut} iconKey="logout" size={22} /> <span>{t('LogOut') || 'Log Out'}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 min-h-0 flex flex-col relative ${isReels ? 'bg-black' : 'bg-background'}`}>
          {pullActive && (
            <>
              {/* Sits in the gap the content leaves while sliding down; starts hidden behind the header. */}
              <motion.div
                className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center device-md:hidden"
                style={{
                  y: indicatorY,
                  opacity: indicatorOpacity,
                  scale: indicatorScale,
                  // Overlay header: main starts under it, so park the spinner at its bottom edge.
                  top: mobileHeaderOverlay ? 'var(--wev-mobile-header-offset, 0px)' : undefined,
                }}
                aria-hidden
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary shadow-md">
                  <svg viewBox="0 0 36 36" className={`absolute inset-0 h-full w-full ${refreshing ? 'animate-spin' : ''}`}>
                    <g transform="rotate(-90 18 18)">
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ pathLength: refreshing ? 0.72 : progress }}
                      />
                    </g>
                  </svg>
                  <motion.span className="flex" style={{ rotate: iconRotate }}>
                    <RefreshCw size={14} />
                  </motion.span>
                </div>
              </motion.div>
            </>
          )}
          <div
            id="main-scroll-area"
            className={
              isReels || isCreatorStudio || isGroups || isLiveWatch
                ? 'flex-1 p-0 overflow-hidden min-h-0 w-full h-full'
                : isMarketplace
                  ? 'flex-1 p-0 overflow-y-auto overflow-x-hidden w-full scrollbar-thin'
                  : isProfileScreen || isSpacePublic || isSpacesDirectory || isSpacesCreate || isSpaceManage || isFriendsScreen || isDonateScreen || isLiveScreen || isBatchStudio
                    ? 'flex-1 p-0 overflow-y-auto overflow-x-hidden no-scrollbar w-full'
                    : isMessages
                      ? 'flex-1 p-0 overflow-hidden min-h-0 w-full'
                      : isHomeScreen
                        ? `flex-1 px-0 device-md:px-5 pt-0 pb-24 device-md:pb-6 overflow-y-auto overflow-x-hidden no-scrollbar w-full ${mobileHeaderOverlay ? 'max-device-md:pt-[var(--wev-mobile-header-offset,0px)]' : ''
                        }`
                        : 'flex-1 px-3 sm:px-4 device-md:px-5 pt-0 pb-24 device-md:pb-6 overflow-y-auto overflow-x-hidden no-scrollbar w-full'
            }
          >
            <motion.div
              className={
                isReels || isMessages || isCreatorStudio || isGroups || isLiveWatch
                  ? 'h-full min-h-0'
                  : isSpaceManage
                    ? // lg+: definite height so the dashboard's rail + content panes scroll on their own.
                    'min-h-full lg:h-full'
                    : 'min-h-full'
              }
              style={{ y: contentY }}
            >
              <Suspense fallback={<OutletFallback />}>
                <Outlet />
              </Suspense>

            </motion.div>
          </div>
        </main>

        {showRightRail && !isImmersive && <RightSidebarWidget />}
      </div>

      {(!isImmersive || isReels) && !isGroups && !isCreatorStudio && !isBatchStudio && !isLiveWatch && (
        <MobileBottomNav
          menuOpen={isMobileMenuOpen}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          onMenuClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isUploadOpen && (
        <Suspense fallback={null}>
          <UploadModal onClose={() => setIsUploadOpen(false)} />
        </Suspense>
      )}
      {isLangModalOpen && (
        <Suspense fallback={null}>
          <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
        </Suspense>
      )}
      {isSwitchAccountOpen && (
        <Suspense fallback={null}>
          <SwitchAccountModal isOpen={isSwitchAccountOpen} onClose={() => setIsSwitchAccountOpen(false)} />
        </Suspense>
      )}

      {/* Floating WevChat when the home right rail cannot host it (off-home or < lg). */}
      {wevChatDesktopFloat && !isMessages && !wevChatInRightRail && (
        <Suspense fallback={null}>
          <WevChatLayout desktopFloat onClose={closeWevChatDesktopFloat} />
        </Suspense>
      )}
      </div>
    </div>
    </ConnectCallProvider>
  );
}
