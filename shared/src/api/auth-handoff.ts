/**
 * Cross-origin auth handoff (dev: frontend :3000 → admin :3002).
 * Tokens live in per-origin localStorage; after login on the consumer app,
 * redirect back with a short-lived hash payload the target app consumes once.
 */

export type AuthHandoffPayload = {
  token: string;
  user: Record<string, unknown>;
  t: number;
};

const HANDOFF_PARAM = 'wev_handoff';
const HANDOFF_MAX_AGE_MS = 60_000;

/** Internal constant — consumer login never surfaces this to clients (generic failure only). */
export const ADMIN_PORTAL_REQUIRED_CODE = 'ADMIN_PORTAL_REQUIRED';

export function isExternalAuthNext(next: string | null | undefined): boolean {
  if (!next) return false;
  return /^https?:\/\//i.test(next);
}

/** Internal SPA path or external absolute URL. */
export function resolveAuthNext(next: string | null | undefined, fallback = '/feed'): string {
  if (!next) return fallback;
  if (isExternalAuthNext(next)) return next;
  return next.startsWith('/') ? next : fallback;
}

function encodeHandoff(payload: AuthHandoffPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return encodeURIComponent(json);
}

function decodeHandoff(raw: string): AuthHandoffPayload | null {
  try {
    let json: string;
    if (typeof atob === 'function') {
      try {
        json = decodeURIComponent(escape(atob(raw)));
      } catch {
        json = decodeURIComponent(raw);
      }
    } else {
      json = decodeURIComponent(raw);
    }
    const payload = JSON.parse(json) as AuthHandoffPayload;
    if (!payload?.token || !payload?.user || typeof payload.t !== 'number') return null;
    if (Date.now() - payload.t > HANDOFF_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

/** @deprecated WS7c: puts a raw JWT in the URL. Kept only for legacy tests; use auth-handoff-code. */
export function buildAuthHandoffUrl(
  targetUrl: string,
  token: string,
  user: Record<string, unknown>,
): string {
  const url = new URL(targetUrl);
  const payload: AuthHandoffPayload = { token, user, t: Date.now() };
  url.hash = `${HANDOFF_PARAM}=${encodeURIComponent(encodeHandoff(payload))}`;
  return url.toString();
}

/** Remove a `#wev_handoff` hash without consuming credentials (admin ignores handoff). */
export function stripAuthHandoffHash(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const params = new URLSearchParams(hash);
  if (!params.has(HANDOFF_PARAM)) return;
  params.delete(HANDOFF_PARAM);
  const remaining = params.toString();
  const cleanUrl = remaining
    ? `${window.location.pathname}${window.location.search}#${remaining}`
    : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
}

/** Read `#wev_handoff=…` once, strip it from the address bar, return credentials. */
export function consumeAuthHandoff(): AuthHandoffPayload | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const raw = params.get(HANDOFF_PARAM);
  if (!raw) return null;

  const payload = decodeHandoff(raw);
  params.delete(HANDOFF_PARAM);
  const remaining = params.toString();
  const cleanUrl = remaining
    ? `${window.location.pathname}${window.location.search}#${remaining}`
    : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
  return payload;
}

/** Inlined so this file stays a leaf (no sibling import of `constants/ports`). */
const DEV_ADMIN_PORT = '3002';

function roleIsAdmin(role?: string | null): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

/** True when `url` is the admin SPA origin (explicit base, or local :3002). */
export function isAdminAppUrl(url: string, adminBase = ''): boolean {
  try {
    const parsed = new URL(url);
    const base = adminBase.replace(/\/$/, '');
    if (base) {
      return parsed.origin === new URL(base).origin;
    }
    return parsed.port === DEV_ADMIN_PORT;
  } catch {
    return false;
  }
}

/**
 * Whether AuthPage should honour `next`. A non-admin `next` pointing at the
 * admin SPA must not be followed — AuthPage auto-redirects already-logged-in
 * users, and sending them back to :3002 is what made the two apps bounce.
 */
export function shouldFollowAuthNext(
  next: string | null | undefined,
  role?: string | null,
  adminBase = '',
): boolean {
  if (!next || !isExternalAuthNext(next)) return true;
  if (!isAdminAppUrl(next, adminBase)) return true;
  return roleIsAdmin(role);
}

export type FollowAuthNextOptions = {
  adminBase?: string;
  /** When set, the session is only handed off to these origins (others get a plain redirect). */
  trustedHandoffOrigins?: string[];
  /**
   * WS7c: perform the handoff redirect (one-time code exchange). Without it, trusted
   * external targets get a plain redirect: a raw token is never put in the URL.
   */
  handoff?: (dest: string, auth: { token: string; user: Record<string, unknown> }) => void;
};

function isTrustedHandoffTarget(dest: string, trusted?: string[]): boolean {
  if (!trusted) return true;
  try {
    return trusted.includes(new URL(dest).origin);
  } catch {
    return false;
  }
}

/** SPA navigate for internal paths; full redirect (+ optional handoff) for other origins. */
export function followAuthNext(
  next: string | null | undefined,
  navigate: (path: string) => void,
  auth?: { token: string; user: Record<string, unknown> } | null,
  fallback = '/feed',
  options?: FollowAuthNextOptions,
): void {
  const dest = resolveAuthNext(next, fallback);
  const role = auth?.user ? String(auth.user.role || '') : '';
  if (!shouldFollowAuthNext(dest, role, options?.adminBase || '')) {
    navigate(fallback);
    return;
  }
  if (isExternalAuthNext(dest)) {
    const adminDest = isAdminAppUrl(dest, options?.adminBase || '');
    if (auth?.token && auth.user && !adminDest && isTrustedHandoffTarget(dest, options?.trustedHandoffOrigins) && options?.handoff) {
      options.handoff(dest, auth);
      return;
    }
    window.location.assign(dest);
    return;
  }
  navigate(dest);
}
