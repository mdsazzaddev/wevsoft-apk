import { useTranslation } from 'react-i18next';
import { trLabel } from './settings/languagePickerShared';
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useStore } from '../store';
import UserAvatar from './UserAvatar';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { spaceModeNavPath } from '@wevsoft/shared/wevspace';
import { AppNavLink } from './navigation/AppNavLink';
import { NavGlyph } from './navigation/NavGlyph';
import { handleHomeNavClick } from '../lib/appNavigation';
import { desktopHeaderNavEntry } from '../lib/desktopHeaderNav';
import { DESKTOP_MD_QUERY } from '../lib/desktopHeader';
import { shouldShowFloatingHeaderNav } from '../lib/desktopHeaderNavFloating';
import { isDonationNavHiddenPath, isSpaceModeHiddenNavPath, isDeveloperConsolePath, type NavigationMenuItem } from '../lib/navigationMenu';
import { useSystemSettings } from '../hooks/useSystemSettings';
import WevsoftMark from './auth/WevsoftMark';

/** Official brand mark — transparent SVG (no background plate). */
const BRAND_LOGO = '/logo.svg';

interface DesktopTopBarProps {
  logoUrl: string;
  logoError: boolean;
  onLogoError: () => void;
  unreadNotifications?: number;
  /**
   * When the Settings desktop header is off, only allow the floating
   * notifications/avatar pill on feed-style pages — never as a global overlay.
   */
  allowFloatingChrome?: boolean;
  /** Brand mark + wordmark only (no center shortcuts, notifications, or avatar). */
  brandOnly?: boolean;
}

/** Built-in placeholders — never treat the new brand mark as a custom upload. */
function isBuiltInLogo(url: string | null | undefined) {
  if (!url) return true;
  return (
    url === '/logo.png' ||
    url === '/logo.svg' ||
    url === BRAND_LOGO ||
    url.endsWith('/logo.png') ||
    url.endsWith('/logo.svg') ||
    url.endsWith('/logo-wevsoft.png') ||
    url.endsWith('/logo-wevsoft.jpg')
  );
}

export function DesktopTopBar({
  logoUrl,
  logoError,
  onLogoError,
  unreadNotifications = 0,
  allowFloatingChrome = true,
  brandOnly = false,
}: DesktopTopBarProps) {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const showDesktopHeader = useStore((s) => s.showDesktopHeader);
  const desktopHeaderNavFloating = useStore((s) => s.desktopHeaderNavFloating);
  const desktopHeaderNavIds = useStore((s) => s.desktopHeaderNavIds);
  const token = useStore((s) => s.token);
  const { active, isSpaceMode } = useSpaceIdentities();
  const donationNavEnabled = useSystemSettings()?.donationNavEnabled;
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifs, setUnreadNotifs] = useState(unreadNotifications);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [isDesktopMd, setIsDesktopMd] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MD_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MD_QUERY);
    const sync = () => setIsDesktopMd(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setUnreadNotifs(unreadNotifications);
  }, [unreadNotifications]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setChromeHidden(false);
  }, [location.pathname]);

  // Hide the whole top chrome (center shortcuts + notifications/avatar) on scroll-down;
  // show again on scroll-up or near the top. Capture + low threshold so trackpad
  // pixel deltas still flip direction (THRESHOLD=8 often never fires on trackpads).
  useEffect(() => {
    const THRESHOLD = 2;
    const readY = () => {
      const scrollArea = document.getElementById('main-scroll-area');
      if (scrollArea) return scrollArea.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };
    let lastY = readY();
    let ticking = false;

    const applyScroll = () => {
      ticking = false;
      const y = readY();
      const delta = y - lastY;
      lastY = y;

      if (y <= 24) {
        setChromeHidden(false);
        return;
      }
      if (delta > THRESHOLD) setChromeHidden(true);
      else if (delta < -THRESHOLD) setChromeHidden(false);
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyScroll);
    };

    // Capture catches scrolls on #main-scroll-area (and nested scrollers).
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const actingUser = isSpaceMode && active
    ? { name: active.name, avatar: active.avatar }
    : user;
  const homeTo = isSpaceMode ? spaceModeNavPath('/home', active) : '/home';
  const notifTo = isSpaceMode ? spaceModeNavPath('/notifications', active) : '/notifications';
  const profileTo = isSpaceMode ? spaceModeNavPath('/profile', active) : '/profile';
  const navTo = (to: string) => (isSpaceMode ? spaceModeNavPath(to, active) : to);

  const iconBtn =
    'relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors';

  // Track the homepage main column (not the full viewport) so the floating
  // shortcuts stay centered over the feed when the window shrinks or the
  // left/right rails appear/disappear.
  const [mainMetrics, setMainMetrics] = useState(() => {
    if (typeof window === 'undefined') return { centerX: 640, width: 800 };
    return { centerX: window.innerWidth / 2, width: Math.max(window.innerWidth - 320, 200) };
  });

  useEffect(() => {
    const measure = () => {
      const main = document.getElementById('main-scroll-area');
      if (main) {
        const rect = main.getBoundingClientRect();
        if (rect.width > 0) {
          setMainMetrics({
            centerX: rect.left + rect.width / 2,
            width: rect.width,
          });
          return;
        }
      }
      const vw = window.innerWidth;
      setMainMetrics({ centerX: vw / 2, width: Math.max(vw - 320, 200) });
    };

    measure();
    window.addEventListener('resize', measure, { passive: true });
    const main = document.getElementById('main-scroll-area');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (main && ro) ro.observe(main);
    const shell = main?.parentElement;
    if (shell && ro) ro.observe(shell);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [location.pathname, showDesktopHeader, desktopHeaderNavFloating, allowFloatingChrome]);

  // Immersive routes stay distraction-free on PC — never render full or floating chrome.
  // DashboardLayout also skips mounting this bar; this guard is belt-and-suspenders.
  const path = location.pathname;
  const isImmersiveRoute =
    path === '/reels' ||
    path.startsWith('/reels/') ||
    path === '/wevmall' ||
    path.startsWith('/wevmall/');
  if (isImmersiveRoute) return null;

  const effectiveBrandOnly = brandOnly;

  const visibleHeaderNavIds = desktopHeaderNavIds.filter((id) => {
    const entry = desktopHeaderNavEntry(id);
    if (!entry) return false;
    if (isSpaceMode && isSpaceModeHiddenNavPath(entry.to)) return false;
    if (isDonationNavHiddenPath(entry.to, donationNavEnabled)) return false;
    return true;
  });

  if (isSpaceMode && !isDeveloperConsolePath(path) && !visibleHeaderNavIds.includes('developer-console')) {
    visibleHeaderNavIds.push('developer-console');
  }

  // Scale the floating/header track to the main column width (stays centered on resize).
  const navCount = Math.max(visibleHeaderNavIds.length, 1);
  const availableForNav = Math.max(mainMetrics.width - 32, 200);
  const slotPx = Math.min(112, Math.max(56, Math.floor(availableForNav / navCount)));
  const navTrackWidth = Math.min(navCount * slotPx, 680, availableForNav);
  const shortcutIconSize = slotPx < 72 ? 20 : slotPx < 96 ? 22 : 24;

  const useCustomLogo = !logoError && !!logoUrl && !isBuiltInLogo(logoUrl);
  const src = useCustomLogo ? logoUrl : BRAND_LOGO;

  const badgeFor = (key?: NavigationMenuItem['badgeKey']) => {
    if (key === 'notifications') return unreadNotifs;
    return 0;
  };

  const renderShortcutIcons = (variant: 'header' | 'floating') => {
    const slotClass =
      variant === 'floating'
        ? 'relative flex flex-1 items-center justify-center h-10 min-w-0 rounded-full transition-colors'
        : 'relative flex flex-1 items-center justify-center h-12 min-w-0 max-w-[7rem] rounded-lg transition-colors';

    return visibleHeaderNavIds.map((id) => {
      const entry = desktopHeaderNavEntry(id);
      if (!entry) return null;
      const Icon = entry.icon;
      const to = navTo(entry.to);
      const isHomeItem = entry.to === '/home';
      const badge = badgeFor(entry.badgeKey);
      return (
        <AppNavLink
          key={id}
          to={to}
          title={trLabel(t, entry.labelKey || entry.label, entry.label)}
          {...(entry.id === 'developer-console' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          onClick={isHomeItem ? (event) => handleHomeNavClick(event, location.pathname) : undefined}
          className={({ isActive }) =>
            `${slotClass} ${
              isActive
                ? variant === 'floating'
                  ? 'text-primary bg-primary/15'
                  : 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`
          }
        >
          <NavGlyph
            icon={Icon}
            to={entry.to}
            id={entry.id}
            size={variant === 'floating' ? shortcutIconSize : 24}
            strokeWidth={2}
          />
          {badge > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </AppNavLink>
      );
    });
  };

  const logo = (
    <button
      type="button"
      onClick={() => navigate(homeTo)}
      className="flex items-center gap-2.5 shrink-0 -ml-2"
    >
      {useCustomLogo ? (
        <img
          src={src}
          alt="Wevsoft"
          className="h-5 w-auto object-contain bg-transparent border-0 shadow-none"
          onError={onLogoError}
        />
      ) : (
        <WevsoftMark className="h-5 w-auto" />
      )}
      <span className="font-black text-lg tracking-tight text-foreground">Wevsoft</span>
    </button>
  );

  const centerNav = (
    <div className="flex-1 min-w-0 flex items-center justify-center">
      <nav
        className="flex items-center justify-between"
        style={{ width: navTrackWidth, maxWidth: '100%' }}
        aria-label={trLabel(t, 'QuickNavigation', 'Quick navigation')}
      >
        {renderShortcutIcons('header')}
      </nav>
    </div>
  );

  const chromeMotion =
    'transition-[transform,opacity] duration-300 ease-out will-change-transform';

  const floatingCenterNav = (
    <nav
      className={`fixed top-3 z-50 flex items-center justify-between ${chromeMotion} ${
        chromeHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        left: mainMetrics.centerX,
        width: navTrackWidth,
        maxWidth: `min(${Math.max(mainMetrics.width - 24, 200)}px, 100%)`,
        transform: chromeHidden ? 'translate(-50%, -140%)' : 'translate(-50%, 0)',
      }}
      aria-label={trLabel(t, 'QuickNavigation', 'Quick navigation')}
      aria-hidden={chromeHidden}
    >
      {renderShortcutIcons('floating')}
    </nav>
  );

  const actions = (
    <nav className="flex items-center gap-1.5 shrink-0" aria-label={trLabel(t, 'Account', 'Account')}>
      {isSpaceMode ? (
        <a
          href={notifTo}
          target="_blank"
          rel="noopener noreferrer"
          className={iconBtn}
          title={trLabel(t, 'Notifications', 'Notifications')}
        >
          <NavGlyph icon={Bell} to="/notifications" iconKey="notifications" size={20} />
          {unreadNotifs > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadNotifs > 99 ? '99+' : unreadNotifs}
            </span>
          )}
        </a>
      ) : (
        <NavLink to={notifTo} className={({ isActive }) => `${iconBtn} ${isActive ? 'text-primary bg-primary/10' : ''}`} title={trLabel(t, 'Notifications', 'Notifications')}>
          <NavGlyph icon={Bell} to="/notifications" iconKey="notifications" size={20} />
          {unreadNotifs > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadNotifs > 99 ? '99+' : unreadNotifs}
            </span>
          )}
        </NavLink>
      )}
      <NavLink
        to={profileTo}
        title={isSpaceMode ? `${trLabel(t, 'LoggedInAs', 'Logged in as')} ${active?.name}` : trLabel(t, 'Profile', 'Profile')}
        aria-label={trLabel(t, 'Profile', 'Profile')}
        className="relative ml-1 block shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <UserAvatar user={actingUser} className="w-9 h-9 border border-border text-[10px]" />
      </NavLink>
    </nav>
  );

  // Transparent floating shortcuts — Home/Friends. Desktop needs header off;
  // mobile/tablet has no desktop bar so the floating pref alone is enough.
  const showFloatingNav = shouldShowFloatingHeaderNav({
    allowFloatingChrome,
    desktopHeaderNavFloating,
    showDesktopHeader,
    isDesktopMd,
  });

  if (showFloatingNav && !effectiveBrandOnly) {
    // Return the fixed nav directly — a `display:contents` wrapper broke
    // position:fixed in some PC / web-preview browsers.
    return floatingCenterNav;
  }

  // Header-off + floating pref off → no top chrome (donate always keeps brand strip).
  if (!showDesktopHeader && !effectiveBrandOnly) return null;

  // Brand-only pages keep the strip visible (no scroll-away hide).
  const chromeCollapsed = chromeHidden && !effectiveBrandOnly;

  return (
    <header
      className={`hidden device-md:flex shrink-0 items-center gap-4 px-4 lg:px-6 bg-card z-40 overflow-hidden ${chromeMotion} ${
        chromeCollapsed
          ? 'h-0 border-0 opacity-0 pointer-events-none'
          : 'h-14 border-b border-border opacity-100'
      }`}
      aria-hidden={chromeCollapsed}
    >
      {logo}
      {allowFloatingChrome && !effectiveBrandOnly ? centerNav : <div className="flex-1 min-w-0" aria-hidden />}
      {effectiveBrandOnly ? null : actions}
    </header>
  );
}
