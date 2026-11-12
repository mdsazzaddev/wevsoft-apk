import { isBackendRelativePath } from './url.js';
import { AUTH_MODE_HEADER, COOKIE_SESSION_MARKER, CSRF_COOKIE, CSRF_HEADER, cookieOnlyClient, readCookie } from './cookie-auth.js';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * WS7b cookie-only request shaping: drop the marker Bearer, send cookies, add CSRF on writes.
 * Exported for tests.
 */
export function applyCookieAuth(init: RequestInit | undefined, method: string, csrfToken?: string): RequestInit {
  const headers = new Headers(init?.headers || undefined);
  const auth = headers.get('authorization') || '';
  if (auth === `Bearer ${COOKIE_SESSION_MARKER}` || auth === 'Bearer null' || auth === 'Bearer undefined' || auth === 'Bearer ') {
    headers.delete('authorization');
  }
  headers.set(AUTH_MODE_HEADER, 'cookie');
  if (UNSAFE.has(method) && csrfToken && !headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, csrfToken);
  return { ...(init || {}), headers, credentials: 'include' };
}

/** Only our own backend's /api gets cookies + CSRF (never third-party hosts). */
export function isOwnApiUrl(url: string, resolve: (path: string) => string): boolean {
  if (url.startsWith('/api/')) return true;
  const base = resolve('/api/');
  if (/^https?:\/\//i.test(base) && url.startsWith(base)) return true;
  try {
    return typeof window !== 'undefined' && url.startsWith(`/api/`);
  } catch {
    return false;
  }
}

function isRetryableBody(body: unknown): boolean {
  return body == null || typeof body === 'string' || body instanceof URLSearchParams || (typeof FormData !== 'undefined' && body instanceof FormData) || (typeof Blob !== 'undefined' && body instanceof Blob);
}

export type ApiFetchLogoutHandler = () => void;

export type InstallApiFetchInterceptorOptions = {
  /** Prefix relative API/media paths with this origin (empty = same origin). */
  resolveBackendUrl: (path: string) => string;
  /** Called on 401 outside `/api/auth/` — typically clears session state. */
  onUnauthorized?: ApiFetchLogoutHandler;
  /** Paths that must not trigger session logout on 401. */
  authPathGuard?: (url: string) => boolean;
  /** WS7b: cookie-only mode (defaults to VITE_AUTH_COOKIE_ONLY). */
  cookieAuth?: boolean;
  /**
   * SEC-04: Bearer-mode silent refresh. On a 401 from our own API the interceptor
   * calls POST /api/auth/refresh once (httpOnly refresh cookie), stores the new
   * access token and retries the request with it. Only when the refreshed token
   * belongs to the same user. Without this option behaviour is unchanged.
   */
  bearerRefresh?: BearerRefreshBinding;
};

export type BearerRefreshBinding = {
  getToken: () => string | null | undefined;
  setToken: (token: string) => void;
};

/** JWT `id` claim without verifying (the server verifies); null when not a JWT. */
export function jwtSubject(token: string | null | undefined): string | null {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')) : '';
    const payload = JSON.parse(json);
    const id = payload?.id ?? payload?.userId ?? payload?.sub;
    return id == null ? null : String(id);
  } catch {
    return null;
  }
}

/** JWT `exp` (seconds) without verifying; null when absent or not a JWT. */
export function jwtExpiry(token: string | null | undefined): number | null {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Only an expired (or about-to-expire) access token is worth refreshing. */
export function tokenLooksExpired(token: string, nowMs = Date.now(), skewMs = 10_000): boolean {
  const exp = jwtExpiry(token);
  return exp != null && exp * 1000 <= nowMs + skewMs;
}

/** The Bearer value a request carried, if it is a real JWT. */
export function bearerOf(init: RequestInit | undefined, input?: RequestInfo | URL): string | null {
  let auth = '';
  try {
    auth = new Headers(init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)).get('authorization') || '';
  } catch { /* malformed headers */ }
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const tok = m?.[1]?.trim() || '';
  return jwtSubject(tok) ? tok : null;
}

/** Same request, Authorization swapped for the fresh token. */
export function withBearer(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers || undefined);
  headers.set('authorization', `Bearer ${token}`);
  return { ...(init || {}), headers };
}

const defaultAuthGuard = (url: string) => url.includes('/api/auth/');

/**
 * Wrap `window.fetch` so `/api`, `/uploads`, `/media` hit the backend origin
 * and unexpected 401s can sign the user out without treating re-auth as logout.
 */

function isTunnelHostname(hostname: string): boolean {
  const host = (hostname || '').toLowerCase();
  return (
    host.endsWith('.ngrok-free.dev') ||
    host.endsWith('.ngrok-free.app') ||
    host.endsWith('.ngrok.app') ||
    host.endsWith('.ngrok.io') ||
    host.endsWith('.loca.lt') ||
    host.endsWith('.trycloudflare.com')
  );
}

function withTunnelSkipHeader(init?: RequestInit): RequestInit | undefined {
  if (typeof window === 'undefined' || !isTunnelHostname(window.location.hostname)) {
    return init;
  }
  const headers = new Headers(init?.headers || undefined);
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return { ...(init || {}), headers };
}

type CachedBootResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyText: string;
  expiresAt: number;
};

const DEDUPE_BOOT_PATHS = [
  '/api/settings/system',
  '/api/settings/account',
  '/api/profile',
  '/api/v1/feed/suggestions',
  '/api/v1/system/status',
  '/api/v1/system/updates',
  '/api/recommendations/hashtags',
  '/api/stories',
  '/api/groups?mine=true',
];

function isDedupeGetRequest(url: string, init?: RequestInit): boolean {
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET') return false;
  if (init?.signal) return false;
  return DEDUPE_BOOT_PATHS.some((p) => url.includes(p));
}

function getAuthHeaderKey(init?: RequestInit): string {
  if (!init?.headers) return '';
  try {
    const h = new Headers(init.headers);
    return h.get('authorization') || '';
  } catch {
    return '';
  }
}

export function installApiFetchInterceptor(options: InstallApiFetchInterceptorOptions): () => void {
  if (typeof window === 'undefined') return () => {};

  const originalFetch = window.fetch.bind(window);
  const authGuard = options.authPathGuard ?? defaultAuthGuard;
  const inflightGets = new Map<string, Promise<CachedBootResponse | null>>();
  const recentGets = new Map<string, CachedBootResponse>();
  const cookieMode = options.cookieAuth ?? cookieOnlyClient();
  let csrfCache: string | undefined;
  let refreshing: Promise<boolean> | null = null;

  const csrfToken = async (): Promise<string | undefined> => {
    const fromCookie = readCookie(CSRF_COOKIE);
    if (fromCookie) return fromCookie;
    if (csrfCache) return csrfCache;
    try {
      const res = await originalFetch(options.resolveBackendUrl('/api/auth/csrf'), { credentials: 'include' });
      if (res.ok) csrfCache = (await res.json())?.csrfToken || undefined;
    } catch { /* offline */ }
    return csrfCache;
  };

  /** Single-flight cookie refresh; true when a new access cookie was issued. */
  const refreshSession = (): Promise<boolean> => {
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const res = await originalFetch(options.resolveBackendUrl('/api/auth/refresh'), applyCookieAuth({ method: 'POST' }, 'POST', await csrfToken()));
          return res.ok;
        } catch {
          return false;
        } finally {
          setTimeout(() => { refreshing = null; }, 0);
        }
      })();
    }
    return refreshing;
  };

  /** Single-flight Bearer refresh; resolves to the new access token or null. */
  let bearerRefreshing: Promise<string | null> | null = null;
  const refreshBearer = (): Promise<string | null> => {
    if (!bearerRefreshing) {
      bearerRefreshing = (async () => {
        try {
          const res = await originalFetch(options.resolveBackendUrl('/api/auth/refresh'), { method: 'POST', credentials: 'include' });
          if (!res.ok) return null;
          const token = (await res.json().catch(() => null))?.token;
          return typeof token === 'string' && jwtSubject(token) ? token : null;
        } catch {
          return null;
        } finally {
          setTimeout(() => { bearerRefreshing = null; }, 0);
        }
      })();
    }
    return bearerRefreshing;
  };

  /**
   * 401 on our API with a real Bearer: reuse a token another request already
   * refreshed, or refresh once. Returns the retried response, or null to fall
   * back to the old behaviour (onUnauthorized).
   */
  const retryAfterBearerRefresh = async (input: RequestInfo | URL, init: RequestInit | undefined, url: string): Promise<Response | null> => {
    const binding = options.bearerRefresh;
    if (!binding || authGuard(url) || !isOwnApiUrl(url, options.resolveBackendUrl)) return null;
    if (!isRetryableBody(init?.body)) return null;
    const sent = bearerOf(init, input);
    if (!sent) return null;
    const current = binding.getToken();
    let fresh: string | null;
    if (current && current !== sent && jwtSubject(current) === jwtSubject(sent)) {
      fresh = current;
    } else {
      // A 401 for a still-valid token is a revoked session or a route-level
      // denial, not expiry: keep the old behaviour, don't rotate the session.
      if (!tokenLooksExpired(sent)) return null;
      fresh = await refreshBearer();
      if (!fresh || jwtSubject(fresh) !== jwtSubject(sent)) return null;
      const now = binding.getToken();
      // Never overwrite a different account the user switched to meanwhile.
      if (now && now !== sent && jwtSubject(now) !== jwtSubject(sent)) return null;
      try { binding.setToken(fresh); } catch { /* storage full / private mode */ }
    }
    const retryInput = typeof Request !== 'undefined' && input instanceof Request ? new Request(input, { headers: withBearer({ headers: input.headers }, fresh).headers }) : input;
    const again = await originalFetch(retryInput, withTunnelSkipHeader(withBearer(init, fresh)));
    return again.status === 401 ? null : again;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

    if (isBackendRelativePath(url)) {
      url = options.resolveBackendUrl(url);
      if (typeof input === 'string') {
        input = url;
      } else if (input instanceof Request) {
        input = new Request(url, input);
      }
    }

    const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
    if (method !== 'GET') {
      recentGets.clear();
    }

    if (cookieMode && isOwnApiUrl(url, options.resolveBackendUrl)) {
      init = applyCookieAuth(input instanceof Request ? { headers: input.headers, ...(init || {}) } : init, method, UNSAFE.has(method) ? await csrfToken() : undefined);
      const retryable = isRetryableBody(init.body);
      const first = await originalFetch(input, withTunnelSkipHeader(init));
      if (first.status !== 401 || authGuard(url)) return first;
      if (retryable && (await refreshSession())) {
        const again = await originalFetch(input, withTunnelSkipHeader(applyCookieAuth(init, method, UNSAFE.has(method) ? await csrfToken() : undefined)));
        if (again.status !== 401) return again;
      }
      if (options.onUnauthorized) setTimeout(() => options.onUnauthorized?.(), 10);
      return first;
    }

    if (typeof input === 'string' && isDedupeGetRequest(url, init)) {
      const cacheKey = `${getAuthHeaderKey(init)}::${url}`;
      const now = Date.now();
      const hit = recentGets.get(cacheKey);
      if (hit && hit.expiresAt > now) {
        return new Response(hit.bodyText, {
          status: hit.status,
          statusText: hit.statusText,
          headers: hit.headers,
        });
      }
      const pending = inflightGets.get(cacheKey);
      if (pending) {
        const shared = await pending;
        if (shared) {
          return new Response(shared.bodyText, {
            status: shared.status,
            statusText: shared.statusText,
            headers: shared.headers,
          });
        }
      } else {
        const p = (async (): Promise<CachedBootResponse | null> => {
          try {
            let res = await originalFetch(input, withTunnelSkipHeader(init));
            if (res.status === 401) {
              const retried = await retryAfterBearerRefresh(input, init, url);
              if (retried) res = retried;
            }
            if (res.status === 401 && options.onUnauthorized && !authGuard(url)) {
              setTimeout(() => options.onUnauthorized?.(), 10);
            }
            if (!res.ok) return null;
            const clone = res.clone();
            const bodyText = await clone.text();
            const headers: [string, string][] = [];
            res.headers.forEach((v, k) => headers.push([k, v]));
            const entry: CachedBootResponse = {
              status: res.status,
              statusText: res.statusText,
              headers,
              bodyText,
              expiresAt: Date.now() + 2500,
            };
            recentGets.set(cacheKey, entry);
            return entry;
          } catch {
            return null;
          } finally {
            inflightGets.delete(cacheKey);
          }
        })();
        inflightGets.set(cacheKey, p);
        const shared = await p;
        if (shared) {
          return new Response(shared.bodyText, {
            status: shared.status,
            statusText: shared.statusText,
            headers: shared.headers,
          });
        }
      }
    }

    const response = await originalFetch(input, withTunnelSkipHeader(init));

    if (response.status === 401) {
      const retried = await retryAfterBearerRefresh(input, init, url);
      if (retried) return retried;
    }

    if (response.status === 401 && options.onUnauthorized) {
      const responseUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : url;
      if (!authGuard(responseUrl)) {
        setTimeout(() => options.onUnauthorized?.(), 10);
      }
    }

    return response;
  };

  return () => {
    window.fetch = originalFetch;
  };
}
