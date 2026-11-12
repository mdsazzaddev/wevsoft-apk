/** App-like navigation helpers for Wevsoft (history, scroll, home double-tap). */

import type { NavigateFunction, To } from 'react-router-dom';

export const HOME_DOUBLE_TAP_MS = 300;
export const HOME_REFRESH_EVENT = 'wev:home-refresh';

const SCROLL_STORAGE_KEY = 'wev_nav_scroll';
const SCROLL_CACHE_LIMIT = 50;
const scrollMemory = new Map<string, number>();

let lastHomeTapAt = 0;

export function isHomePath(pathname: string) {
  return pathname === '/home' || pathname === '/';
}

export function routeKey(pathname: string, search = '') {
  return `${pathname}${search}`;
}

/**
 * Scroll-restoration key. Ignores in-page query params (e.g. About `section=`)
 * so swapping left-nav chips does not jump `#main-scroll-area` to the top.
 */
export function scrollRouteKey(pathname: string, search = '') {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return pathname;
  const params = new URLSearchParams(raw);
  params.delete('section');
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function readMainScrollTop() {
  const el = document.getElementById('main-scroll-area');
  return el ? el.scrollTop : window.scrollY;
}

export function writeMainScrollTop(y: number) {
  const el = document.getElementById('main-scroll-area');
  if (el) el.scrollTop = y;
  else window.scrollTo(0, y);
}

export function saveRouteScroll(key: string, y: number) {
  scrollMemory.set(key, y);
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    all[key] = y;
    const keys = Object.keys(all);
    if (keys.length > SCROLL_CACHE_LIMIT) {
      for (const extra of keys.slice(0, keys.length - SCROLL_CACHE_LIMIT)) {
        delete all[extra];
      }
    }
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

export function readRouteScroll(key: string): number | undefined {
  if (scrollMemory.has(key)) return scrollMemory.get(key);
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return typeof all[key] === 'number' ? all[key] : undefined;
  } catch {
    return undefined;
  }
}

export function requestHomeRefresh() {
  window.dispatchEvent(new Event(HOME_REFRESH_EVENT));
}

/**
 * Soft refresh on Home (feed remount); hard reload elsewhere.
 * Installed PWAs have no browser chrome refresh — call this from in-app controls.
 */
export function requestAppRefresh(options?: { hard?: boolean }) {
  if (typeof window === 'undefined') return;
  if (options?.hard) {
    window.location.reload();
    return;
  }
  const path = window.location.pathname;
  if (isHomePath(path)) {
    requestHomeRefresh();
    return;
  }
  window.location.reload();
}

/** Same-route Home tap is a no-op; a second tap within 300ms refreshes Home data. */
export function handleHomeNavClick(event: { preventDefault: () => void }, pathname: string) {
  if (!isHomePath(pathname)) {
    lastHomeTapAt = 0;
    return;
  }
  event.preventDefault();
  const now = Date.now();
  if (now - lastHomeTapAt <= HOME_DOUBLE_TAP_MS) {
    lastHomeTapAt = 0;
    requestHomeRefresh();
    return;
  }
  lastHomeTapAt = now;
}

export function readSessionUi<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`wev_ui:${key}`);
    if (!raw) return fallback;
    return { ...(fallback as object), ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function writeSessionUi(key: string, value: unknown) {
  try {
    sessionStorage.setItem(`wev_ui:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * True when there is an earlier entry *inside this app* to go back to.
 * react-router stamps every entry it creates with history.state.idx (0 for the
 * first entry of the tab/PWA window). window.history.length is not usable for
 * this: it also counts other sites' entries and the forward stack.
 */
export function hasInAppHistory(): boolean {
  if (typeof window === 'undefined') return false;
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

/**
 * In-app Back button: pop one entry when we have in-app history, otherwise
 * (deep link, fresh tab, installed PWA cold start) go to  allback by
 * *replacing* the current entry, so Back never leaves the app or dead-ends and
 * never piles up extra entries.
 */
export function goBackOr(navigate: NavigateFunction, fallback: To = '/home') {
  if (hasInAppHistory()) navigate(-1);
  else navigate(fallback, { replace: true });
}

export function readSessionString(key: string, fallback: string) {
  try {
    return sessionStorage.getItem(`wev_ui:${key}`) || fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionString(key: string, value: string) {
  try {
    sessionStorage.setItem(`wev_ui:${key}`, value);
  } catch {
    /* ignore */
  }
}
