/** Settings → floating header shortcuts when the bar is off (`app_desktop_header_nav_floating`). */

export const DESKTOP_HEADER_NAV_FLOATING_PREF_KEY = 'app_desktop_header_nav_floating';

export function parseDesktopHeaderNavFloating(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * When to paint the transparent floating shortcut row (Home / Friends).
 *
 * - Desktop (md+): only when Show header is off AND this pref is on.
 * - Mobile / tablet (< md): there is no desktop header bar, so the pref alone
 *   is enough — otherwise the setting could never take effect on phones.
 */
export function shouldShowFloatingHeaderNav(opts: {
  allowFloatingChrome: boolean;
  desktopHeaderNavFloating: boolean;
  showDesktopHeader: boolean;
  isDesktopMd: boolean;
}): boolean {
  if (!opts.allowFloatingChrome || !opts.desktopHeaderNavFloating) return false;
  if (!opts.isDesktopMd) return true;
  return !opts.showDesktopHeader;
}
