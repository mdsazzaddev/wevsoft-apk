import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { MobileSearchSheet } from './search/MobileSearchSheet';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import UserAvatar from './UserAvatar';
import WevsoftMark from './auth/WevsoftMark';
import MobileAccountMenuSheet from './MobileAccountMenuSheet';
import { AppNavLink } from './navigation/AppNavLink';
import { NavGlyph } from './navigation/NavGlyph';
import { NotificationBadge } from './ui/NotificationBadge';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { spaceModeNavPath } from '@wevsoft/shared/wevspace';
import { isSpaceModeExternalNav } from '../lib/navigationMenu';
import {
  parseMobileTopHeaderStyle,
  type MobileTopHeaderStyle,
} from '../lib/mobileTopHeader';
import { MOBILE_TOP_HEADER_BLEND_FADE_PX } from '../lib/mobileTopHeaderChrome';
import {
  applyStatusBarTheme,
  resolveStatusBarMode,
  statusBarColorForMode,
  syncStatusBarToDisplayMode,
} from '../lib/statusBarTheme';
import { handleHomeNavClick } from '../lib/appNavigation';

type Props = {
  visible?: boolean;
  /**
   * Home feed: the bar overlays `#main-scroll-area` (absolute, content padded
   * underneath) so it can slide away with a transform and no layout shift.
   */
  overlay?: boolean;
  /** Overlay mode only: slide the bar up out of view (scroll-down auto-hide). */
  hidden?: boolean;
  /** Brand mark + wordmark only (no search / profile). */
  brandOnly?: boolean;
};

/** Notch / status-bar fill — same height formula as StatusBarChrome. */
const SAFE_TOP =
  'max(env(safe-area-inset-top, 0px), var(--wev-status-bar-fallback, 0px))';

function headerSurface(
  style: MobileTopHeaderStyle,
  glassEffects: boolean,
  chrome: 'classic' | 'blend' | 'transparent',
): CSSProperties {
  if (chrome === 'transparent') {
    return {
      background: 'transparent',
      opacity: style.opacity,
      borderBottomWidth: 0,
      borderBottomStyle: 'solid' as const,
      borderBottomColor: 'transparent',
      boxShadow: 'none',
      paddingLeft: style.paddingX,
      paddingRight: style.paddingX,
      height: style.height,
      minHeight: style.height,
    };
  }

  if (chrome === 'blend') {
    const rawBlur = glassEffects ? Math.max(style.blurIntensity || 16, 12) : 0;
    const mobileBlurCap =
      typeof window !== 'undefined' && window.matchMedia('(max-device-width: 767px)').matches
        ? Math.min(rawBlur, 14)
        : rawBlur;
    return {
      // Plate paints via `.wev-top-header-blend`; keep row itself clear.
      background: 'transparent',
      opacity: style.opacity,
      backdropFilter: undefined,
      WebkitBackdropFilter: undefined,
      borderBottomWidth: 0,
      borderBottomStyle: 'solid' as const,
      borderBottomColor: 'transparent',
      boxShadow: 'none',
      paddingLeft: style.paddingX,
      paddingRight: style.paddingX,
      height: style.height,
      minHeight: style.height,
      // Used by the absolute blend plate for blur strength.
      ['--wev-top-header-blur' as string]: mobileBlurCap > 0 ? `${mobileBlurCap}px` : '0px',
    };
  }

  const rawBlur = style.blur && glassEffects ? style.blurIntensity : 0;
  // Phones pay heavily for large backdrop-filter on a sticky header.
  const mobileBlurCap =
    typeof window !== 'undefined' && window.matchMedia('(max-device-width: 767px)').matches
      ? Math.min(rawBlur, 10)
      : rawBlur;
  const blurPx = mobileBlurCap;
  let background: string;
  if (style.transparent) {
    background = glassEffects
      ? 'color-mix(in oklab, var(--background) 62%, transparent)'
      : 'color-mix(in oklab, var(--background) 88%, transparent)';
  } else {
    switch (style.background) {
      case 'primary':
        background = 'var(--primary)';
        break;
      case 'card':
        background = 'var(--card)';
        break;
      case 'custom':
        background = style.customBackground || 'var(--background)';
        break;
      case 'background':
        background = 'var(--background)';
        break;
      case 'auto':
      default:
        // Keep in sync with resolveMobileHeaderThemeColor / status-bar shell.
        background = 'var(--background)';
        break;
    }
  }

  return {
    background,
    opacity: style.opacity,
    backdropFilter: blurPx > 0 && style.transparent ? `blur(${blurPx}px) saturate(1.2)` : undefined,
    WebkitBackdropFilter: blurPx > 0 && style.transparent ? `blur(${blurPx}px) saturate(1.2)` : undefined,
    borderBottomWidth: style.border ? 1 : 0,
    borderBottomStyle: 'solid' as const,
    borderBottomColor: style.border
      ? `color-mix(in oklab, var(--border) ${Math.round(style.borderOpacity * 100)}%, transparent)`
      : 'transparent',
    boxShadow: style.shadow ? '0 1px 0 color-mix(in oklab, var(--foreground) 6%, transparent)' : 'none',
    paddingLeft: style.paddingX,
    paddingRight: style.paddingX,
    height: style.height,
    minHeight: style.height,
  };
}

function logoColorClass(style: MobileTopHeaderStyle, chrome: 'classic' | 'blend' | 'transparent'): string {
  if (style.logoColor === 'primary') return 'text-primary';
  if (style.logoColor === 'foreground') return 'text-foreground';
  if (style.logoColor === 'custom') return '';
  if (chrome === 'classic' && !style.transparent && style.background === 'primary') {
    return 'text-primary-foreground';
  }
  return 'text-primary';
}

/**
 * Phone device chrome only (`device-md:hidden`). Brand left · profile avatar right.
 * Notch paint lives in a separate safe strip (StatusBarChrome + spacer) so the
 * 48px bar is not half-empty black padding.
 */
export default function MobileTopHeader({ visible = true, overlay = false, hidden = false, brandOnly = false }: Props) {
  const user = useStore((s) => s.user);
  const glassEffects = useStore((s) => s.glassEffects);
  const theme = useStore((s) => s.theme);
  const mobileTopHeaderStyle = useStore((s) => s.mobileTopHeaderStyle);
  const chrome = useStore((s) => s.mobileTopHeaderChrome);
  const { active, isSpaceMode } = useSpaceIdentities();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { unread: unreadNotifs } = useUnreadNotifications();
  const effectiveBrandOnly = brandOnly;

  const style = useMemo(
    () => parseMobileTopHeaderStyle(mobileTopHeaderStyle),
    [mobileTopHeaderStyle],
  );

  const isBlend = chrome === 'blend';
  const isMinimal = chrome === 'transparent';

  const actingUser =
    isSpaceMode && active ? { name: active.name, avatar: active.avatar } : user;
  const homeTo = isSpaceMode ? spaceModeNavPath('/home', active) : '/home';
  const notifTo = isSpaceMode ? spaceModeNavPath('/notifications', active) : '/notifications';
  const headerActionBtn = `shrink-0 relative w-9 h-9 rounded-full flex items-center justify-center text-foreground active:scale-[0.95] transition-transform ${
    isMinimal ? 'bg-muted/55' : 'bg-muted/70'
  }`;

  const mode = resolveStatusBarMode(theme);
  const modeColor = statusBarColorForMode(mode);
  const surface = headerSurface(style, glassEffects, chrome);
  const brandClass = logoColorClass(style, chrome);
  const brandStyle =
    style.logoColor === 'custom' && style.customLogoColor
      ? { color: style.customLogoColor, fontSize: style.logoSize }
      : { fontSize: style.logoSize };

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const mq = window.matchMedia('(max-device-width: 767px)');
    const nextMode = resolveStatusBarMode(theme);

    if (!mq.matches) {
      syncStatusBarToDisplayMode(theme);
      return;
    }

    const root = document.documentElement;
    const useAccentHeader =
      chrome === 'classic' && style.background === 'primary' && !style.transparent;

    if (useAccentHeader) {
      const primaryVar = getComputedStyle(root).getPropertyValue('--primary').trim();
      const color =
        primaryVar.startsWith('#') || primaryVar.startsWith('rgb') || primaryVar.startsWith('hsl')
          ? primaryVar
          : statusBarColorForMode(nextMode);
      applyStatusBarTheme({ color, mode: nextMode, allowAccent: true });
      root.style.setProperty('--wev-mobile-header-safe-bg', color);
    } else {
      syncStatusBarToDisplayMode(theme);
      root.style.setProperty('--wev-mobile-header-safe-bg', statusBarColorForMode(nextMode));
    }
    root.classList.add('wev-mobile-top-header');

    return () => {
      root.classList.remove('wev-mobile-top-header');
      root.style.removeProperty('--wev-mobile-header-safe-bg');
      syncStatusBarToDisplayMode(theme);
    };
  }, [visible, style, theme, glassEffects, chrome]);

  if (!visible) return null;

  const profileBox = style.profileSize;
  const safeBg =
    chrome === 'classic' && style.background === 'primary' && !style.transparent
      ? (surface.background as string)
      : modeColor;

  const slideHidden = overlay && hidden;
  const motionClass = isBlend
    ? slideHidden
      ? 'duration-[480ms] ease-[cubic-bezier(0.55,0.05,0.85,0.35)]'
      : 'duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
    : 'duration-[220ms] ease-out';

  const headerClass = overlay
    ? // Slides up behind the (opaque) safe strip; transform only, so nothing reflows.
      `relative z-0 flex w-full shrink-0 items-center justify-between gap-3 max-device-md:flex device-md:hidden transition-transform motion-reduce:transition-none ${motionClass} ${
        slideHidden ? 'pointer-events-none' : 'pointer-events-auto'
      }`
    : `sticky top-0 z-40 flex w-full shrink-0 items-center justify-between gap-3 overflow-visible max-device-md:flex device-md:hidden`;

  const headerStyle: CSSProperties = overlay
    ? {
        ...surface,
        // Extra 4px so the bottom border/shadow can't peek out under the safe strip.
        // Blend plate extends below the row — hide that too when slid away.
        transform: slideHidden
          ? `translate3d(0, calc(-100% - ${isBlend ? MOBILE_TOP_HEADER_BLEND_FADE_PX + 4 : 4}px), 0)`
          : 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }
    : surface;

  const plateBlur = glassEffects || isBlend;
  const blendPlateStyle: CSSProperties | undefined = isBlend
    ? {
        height: `calc(100% + ${MOBILE_TOP_HEADER_BLEND_FADE_PX}px)`,
        backdropFilter: plateBlur
          ? `blur(var(--wev-top-header-blur, 12px)) saturate(1.25)`
          : undefined,
        WebkitBackdropFilter: plateBlur
          ? `blur(var(--wev-top-header-blur, 12px)) saturate(1.25)`
          : undefined,
      }
    : undefined;

  const content = (
    <>
      {/* Layout spacer for the notch - StatusBarChrome paints the same strip. */}
      <div
        aria-hidden
        data-wev-mobile-header-safe
        className={`max-device-md:block device-md:hidden shrink-0 w-full ${overlay ? 'relative z-[1]' : ''}`}
        style={{ height: SAFE_TOP, background: safeBg }}
      />
      <header
        className={headerClass}
        style={headerStyle}
        data-wev-mobile-top-header
        data-wev-mobile-top-header-chrome={chrome}
        data-wev-mobile-top-header-hidden={slideHidden ? '' : undefined}
        role="banner"
        inert={slideHidden ? true : undefined}
      >
        {isBlend && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 wev-top-header-blend"
            style={blendPlateStyle}
          />
        )}
        <button
          type="button"
          onClick={(event) => {
            handleHomeNavClick(event, location.pathname);
            navigate(homeTo);
          }}
          className="relative z-[1] min-w-0 flex items-center gap-1.5 py-1 -ml-0.5 rounded-lg active:opacity-80"
          aria-label="Wevsoft Home"
        >
          <WevsoftMark className="h-5 w-auto" />
          <span
            className={`font-black tracking-tight truncate leading-none ${brandClass}`}
            style={brandStyle}
          >
            Wevsoft
          </span>
        </button>

        {effectiveBrandOnly ? (
          <div className="relative z-[1] flex-1" aria-hidden />
        ) : (
          <div className="relative z-[1] shrink-0 flex items-center gap-1.5">
            {/* Facebook-style search entry (mobile header only). */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={headerActionBtn}
              title="Search"
              aria-label="Search"
            >
              <Search size={20} strokeWidth={2.25} />
            </button>
            {isSpaceModeExternalNav('/notifications', isSpaceMode) ? (
              <a
                href={typeof notifTo === 'string' ? notifTo : '/notifications'}
                target="_blank"
                rel="noopener noreferrer"
                className={headerActionBtn}
                title="Notifications"
                aria-label="Notifications"
              >
                <NavGlyph icon={Bell} to="/notifications" iconKey="notifications" size={20} />
                <NotificationBadge
                  count={unreadNotifs}
                  maxCount={9}
                  variant="rose"
                  size="sm"
                  className="absolute top-0.5 right-0.5 border-2 border-background"
                />
              </a>
            ) : (
              <AppNavLink
                to={notifTo}
                className={headerActionBtn}
                title="Notifications"
                aria-label="Notifications"
              >
                <NavGlyph icon={Bell} to="/notifications" iconKey="notifications" size={20} />
                <NotificationBadge
                  count={unreadNotifs}
                  maxCount={9}
                  variant="rose"
                  size="sm"
                  className="absolute top-0.5 right-0.5 border-2 border-background"
                />
              </AppNavLink>
            )}
            <button
              type="button"
              onClick={() => setAccountMenuOpen(true)}
              className="relative shrink-0 rounded-full active:scale-[0.97] transition-transform"
              title={isSpaceMode ? `Logged in as ${active?.name}` : 'Account menu'}
              aria-label="Open account menu"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              style={{ opacity: style.profileOpacity }}
            >
              <span
                className={`inline-flex overflow-hidden rounded-full shadow-sm ${
                  style.profileBorder ? 'border border-border/80' : ''
                }`}
                style={{ width: profileBox, height: profileBox }}
              >
                <UserAvatar user={actingUser} className="h-full w-full text-[10px]" />
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute -right-1.5 top-[58%] flex -translate-y-1/2 items-center justify-center text-foreground"
              >
                <ChevronDown
                  size={11}
                  strokeWidth={2.75}
                  className={`drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.65)] ${
                    accountMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'
                  }`}
                />
              </span>
            </button>
          </div>
        )}
      </header>
      {!effectiveBrandOnly && searchOpen && <MobileSearchSheet open onClose={() => setSearchOpen(false)} />}
      {!effectiveBrandOnly && (
        <MobileAccountMenuSheet
          open={accountMenuOpen}
          onClose={() => setAccountMenuOpen(false)}
        />
      )}
    </>
  );

  if (!overlay) return content;

  return (
    // Wrapper itself never takes taps: when the bar is slid away its layout box is empty.
    <div
      data-wev-mobile-header-overlay
      className="pointer-events-none absolute inset-x-0 top-0 z-40 device-md:hidden"
    >
      {content}
    </div>
  );
}
