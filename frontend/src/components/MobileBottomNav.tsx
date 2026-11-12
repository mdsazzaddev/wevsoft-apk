import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trLabel } from './settings/languagePickerShared';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { handleHomeNavClick } from '../lib/appNavigation';
import { AppNavLink } from './navigation/AppNavLink';
import { NavGlyph } from './navigation/NavGlyph';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { spaceModeNavPath } from '@wevsoft/shared/wevspace';
import { WevsoftMenuIcon } from '../icons/WevsoftMenuIcon';
import {
  mobileBottomNavEntry,
  mobileBottomNavGridClass,
  type MobileBottomNavId,
} from '../lib/mobileBottomNav';
import { isDonationNavHiddenPath, isSpaceModeExternalNav, isSpaceModeHiddenNavPath } from '../lib/navigationMenu';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { NotificationBadge } from './ui/NotificationBadge';
import { useSystemSettings } from '../hooks/useSystemSettings';

interface MobileBottomNavProps {
  /** Opens the main slide-out nav drawer (Home, Friends, Settings, …). */
  onMenuClick?: () => void;
  onMenuClose?: () => void;
  menuOpen?: boolean;
}

/** Same stroke for every bottom-nav icon (idle + active). */
const NAV_ICON_SIZE = 22;
const NAV_ICON_STROKE = 2;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onMenuClick,
  onMenuClose,
  menuOpen = false,
}) => {
  const { t } = useTranslation();

  const isChatActive = useStore((state) => state.isChatActive);
  const mobileBottomNavStyle = useStore((state) => state.mobileBottomNavStyle);
  const reelsBottomNav = useStore((state) => state.reelsBottomNav);
  const glassEffects = useStore((state) => state.glassEffects);
  const mobileNavItems = useStore((state) => state.mobileNavItems);
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  const { active, isSpaceMode } = useSpaceIdentities();
  const donationNavEnabled = useSystemSettings()?.donationNavEnabled;

  const { unread: unreadNotifs } = useUnreadNotifications();

  const navTo = (to: string) => (isSpaceMode ? spaceModeNavPath(to, active) : to);
  const isReels =
    location.pathname === '/reels' || location.pathname.startsWith('/reels/');
  const isBlend = !isReels && mobileBottomNavStyle === 'blend';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setHidden(false);
  }, [location.pathname]);

  useEffect(() => {
    // Blend: stickier hide (heavier), quicker reveal on scroll-up.
    const THRESHOLD = isBlend ? 14 : 8;
    const scrollArea = document.getElementById('main-scroll-area');
    const readY = () => (scrollArea ? scrollArea.scrollTop : window.scrollY);
    let lastY = readY();
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = readY();
        const delta = y - lastY;
        lastY = y;

        if (y <= 16) {
          setHidden(false);
          return;
        }
        if (delta > THRESHOLD) setHidden(true);
        else if (delta < -(isBlend ? 6 : THRESHOLD)) setHidden(false);
      });
    };

    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    }

    return () => {
      if (scrollArea) {
        scrollArea.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll, { capture: true });
      }
    };
  }, [isBlend]);

  if (isChatActive) return null;
  if (location.pathname === '/wevmall' || location.pathname.startsWith('/wevmall/')) return null;
  if (isReels && reelsBottomNav === 'hidden') return null;

  // Reels sits on black video — use Instagram-style light icons + optional frosted plate.
  const reelsChrome = isReels;
  const showPlate = reelsChrome
    ? reelsBottomNav === 'blur'
    : mobileBottomNavStyle !== 'transparent';
  const iconIdle = reelsChrome
    ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]'
    : 'text-foreground';
  const iconActive = reelsChrome
    ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]'
    : 'text-primary';
  const badgeBorder = reelsChrome ? 'border-black/40' : 'border-background';
  const motionClass = isBlend
    ? hidden
      ? 'duration-[480ms] ease-[cubic-bezier(0.55,0.05,0.85,0.35)]'
      : 'duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
    : 'duration-300 ease-out';

  const visibleNavItems = mobileNavItems.filter((id) => {
    const entry = mobileBottomNavEntry(id);
    if (!entry) return false;
    if (isSpaceMode && entry.to && isSpaceModeHiddenNavPath(entry.to)) return false;
    if (isDonationNavHiddenPath(entry.to, donationNavEnabled)) return false;
    return true;
  });

  const renderItem = (id: MobileBottomNavId) => {
    const entry = mobileBottomNavEntry(id);
    if (!entry) return null;

    if (entry.kind === 'menu') {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            if (menuOpen) onMenuClose?.();
            else onMenuClick?.();
          }}
          className={`flex flex-col items-center justify-center relative group w-full h-full ${
            menuOpen ? iconActive : iconIdle
          }`}
          title={trLabel(t, 'Menu', 'Menu')}
          aria-label={menuOpen ? trLabel(t, 'CloseMenu', 'Close menu') : trLabel(t, 'OpenMenu', 'Open menu')}
          aria-expanded={menuOpen}
        >
          <div className="p-2 rounded-2xl transition-colors duration-200 active:scale-95">
            {menuOpen ? (
              <X size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
            ) : (
              <WevsoftMenuIcon size={NAV_ICON_SIZE} />
            )}
          </div>
          {menuOpen && (
            <div
              className={`absolute bottom-1 w-1 h-1 rounded-full ${
                reelsChrome ? 'bg-white' : 'bg-primary'
              }`}
            />
          )}
        </button>
      );
    }

    const to = navTo(entry.to || '/home');
    const isHomeItem = entry.id === 'home';
    const Icon = entry.icon;
    const homeActive =
      isHomeItem && (location.pathname === '/home' || location.pathname === '/feed' || location.pathname === '/');
    const itemTo = entry.to || '/home';

    if (isSpaceModeExternalNav(itemTo, isSpaceMode)) {
      return (
        <a
          key={id}
          href={typeof to === 'string' ? to : itemTo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center relative group w-full h-full"
          title={trLabel(t, entry.labelKey || entry.label, entry.label)}
        >
          <div className={`p-2 rounded-2xl transition-colors duration-200 relative ${iconIdle}`}>
            <NavGlyph icon={Icon} to={itemTo} id={entry.id} size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} absoluteStrokeWidth={false} />
            {entry.badgeKey === 'notifications' && (
              <NotificationBadge
                count={unreadNotifs}
                maxCount={9}
                variant="rose"
                size="sm"
                className={`absolute top-1 right-1 border-2 ${badgeBorder}`}
              />
            )}
          </div>
        </a>
      );
    }

    return (
      <AppNavLink
        key={id}
        to={to}
        end={isHomeItem}
        onClick={(event) => {
          if (isHomeItem) handleHomeNavClick(event, location.pathname);
        }}
        className="flex flex-col items-center justify-center relative group w-full h-full"
      >
        {({ isActive }) => {
          const active = isHomeItem ? homeActive : isActive;
          return (
            <>
              <div
                className={`p-2 rounded-2xl transition-colors duration-200 relative ${
                  active ? iconActive : iconIdle
                }`}
              >
                <NavGlyph icon={Icon} to={itemTo} id={entry.id} size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} absoluteStrokeWidth={false} />
                {entry.badgeKey === 'notifications' && (
                  <NotificationBadge
                    count={unreadNotifs}
                    maxCount={9}
                    variant="rose"
                    size="sm"
                    className={`absolute top-1 right-1 border-2 ${badgeBorder}`}
                  />
                )}
              </div>
              {active && (
                <div
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    reelsChrome ? 'bg-white' : 'bg-primary'
                  }`}
                />
              )}
            </>
          );
        }}
      </AppNavLink>
    );
  };

  const plateHidden = hidden;
  const plateBlur = glassEffects || isBlend ? (isBlend ? 'backdrop-blur-xl' : 'backdrop-blur-md') : '';

  return (
    <nav
      className={`device-md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom,0px)] ${
        isBlend ? 'h-[calc(64px+env(safe-area-inset-bottom,0px))]' : 'h-[calc(52px+env(safe-area-inset-bottom,0px))]'
      }`}
      aria-hidden={hidden}
    >
      {showPlate && (
        <div
          className={`absolute inset-0 transition-transform ${motionClass} ${
            plateHidden
              ? 'translate-y-[120%] pointer-events-none'
              : `translate-y-0 pointer-events-auto ${
                  reelsChrome
                    ? `border-t bg-black/45 ${plateBlur} border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`
                    : isBlend
                      ? `${plateBlur} border-t border-transparent shadow-none wev-bottom-nav-blend`
                      : `border-t bg-card/95 ${plateBlur} border-border shadow-[0_-8px_28px_rgba(0,0,0,0.10)]`
                }`
          }`}
        />
      )}

      <div
        className={`absolute inset-0 grid ${mobileBottomNavGridClass(visibleNavItems.length)} items-center px-2 sm:px-4 transition-transform ${motionClass} ${
          plateHidden
            ? 'translate-y-[120%] pointer-events-none'
            : 'translate-y-0 pointer-events-auto'
        }`}
      >
        {visibleNavItems.map(renderItem)}
      </div>
    </nav>
  );
};
