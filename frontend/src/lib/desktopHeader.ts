/** Settings → Show header (`app_desktop_header`). Desktop device chrome only. */

export const DESKTOP_HEADER_PREF_KEY = 'app_desktop_header';
/**
 * Device screen ≥768px — does **not** flip when the browser window is resized
 * narrower on a desktop monitor. See `phoneLayout.ts`.
 */
export const DESKTOP_MD_QUERY = '(min-device-width: 768px)';

export function parseDesktopHeaderEnabled(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

export function isDesktopMd(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_MD_QUERY).matches;
}
