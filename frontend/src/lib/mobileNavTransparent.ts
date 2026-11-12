/**
 * Settings → Transparent navbar (`app_mobile_nav_transparent`).
 * Affects Mobile Preview / phones / tablets (`MobileBottomNav`, md:hidden).
 * Toggle is shown on PC Settings too so the preview can be configured from desktop.
 */

export const MOBILE_NAV_TRANSPARENT_PREF_KEY = 'app_mobile_nav_transparent';

/** Default Off = show the bar background plate. */
export function parseMobileNavTransparent(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return false;
}
