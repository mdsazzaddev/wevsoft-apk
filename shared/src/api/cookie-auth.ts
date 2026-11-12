/**
 * WS7b: cookie-only browser sessions (client side). Flag: VITE_AUTH_COOKIE_ONLY=true.
 * When ON, the JWT never touches JS: stores keep COOKIE_SESSION_MARKER in place of the
 * token (so existing `Bearer ${token}` call sites keep compiling and working), and the
 * fetch interceptor strips that marker, sends credentials, CSRF token, and refreshes on 401.
 * When OFF, behaviour is exactly the legacy localStorage + Bearer flow.
 */

/** Non-secret placeholder stored instead of a JWT in cookie-only mode (server ignores it). */
export const COOKIE_SESSION_MARKER = 'cookie-session';
export const CSRF_COOKIE = 'wev_csrf';
export const CSRF_HEADER = 'X-CSRF-Token';
export const AUTH_MODE_HEADER = 'X-Auth-Mode';

let override: boolean | null = null;
/**
 * Set by each app's `lib/cookieAuthEnv` (first import, reads VITE_AUTH_COOKIE_ONLY) and by tests.
 * Shared stays environment-neutral (no import.meta here). Default: off.
 */
export function setCookieOnlyOverride(value: boolean | null): void {
  override = value;
}

export function cookieOnlyClient(): boolean {
  return override === true;
}

/** Value a store should keep/persist for a freshly issued session token. */
export function storableToken(token: string | null | undefined): string | null {
  if (cookieOnlyClient()) return COOKIE_SESSION_MARKER;
  return token || null;
}

/** True when the value is a real credential (not empty and not the cookie marker). */
export function isRealToken(token: unknown): token is string {
  return typeof token === 'string' && token !== '' && token !== 'null' && token !== 'undefined' && token !== COOKIE_SESSION_MARKER;
}

export function readCookie(name: string, source?: string): string | undefined {
  const raw = source ?? (typeof document !== 'undefined' ? document.cookie : '');
  for (const part of String(raw || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

/**
 * While the flag is ON, a legacy raw JWT left in localStorage is dropped (audit amendment:
 * clean up only while ON, so rolling the flag back never logs anyone out unexpectedly).
 * Returns the value the store should start with.
 */
export function migrateStoredToken(key: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): string | null {
  try {
    const current = storage.getItem(key);
    if (!cookieOnlyClient()) return current === COOKIE_SESSION_MARKER ? null : current;
    if (!current) return null;
    if (current !== COOKIE_SESSION_MARKER) storage.setItem(key, COOKIE_SESSION_MARKER);
    return COOKIE_SESSION_MARKER;
  } catch {
    return null;
  }
}
