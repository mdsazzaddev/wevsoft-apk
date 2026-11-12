/**
 * Phone vs desktop *chrome* (top bar / bottom nav / drawers).
 *
 * Uses **device-width**, not viewport width — so shrinking a desktop browser
 * window does not flip the app into the phone shell. Real phones (and DevTools
 * device mode) still get mobile chrome.
 *
 * Content grids may still use Tailwind `md:`/`lg:` (viewport) for fluid layout.
 */

/** True phone / small tablet by screen size (ignores window resize). */
export const PHONE_DEVICE_QUERY = '(max-device-width: 767px)';
/** Desktop / large tablet screen (ignores window resize). */
export const DESKTOP_DEVICE_QUERY = '(min-device-width: 768px)';

export function isPhoneDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(PHONE_DEVICE_QUERY).matches;
}

export function isDesktopDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_DEVICE_QUERY).matches;
}
