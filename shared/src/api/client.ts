/**
 * Browser-safe API client helpers — no secrets, no server env.
 * Token is read from localStorage only when `window` exists.
 */

const DEFAULT_TOKEN_KEY = 'token';

/** Read JWT from device storage (returns null on server / SSR). */
export function readStoredAuthToken(storageKey = DEFAULT_TOKEN_KEY): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/** Standard Authorization header map for authenticated API calls. */
export function bearerAuthHeaders(
  token: string | null | undefined,
  options?: { json?: boolean; extra?: Record<string, string> },
): Record<string, string> {
  const headers: Record<string, string> = { ...(options?.extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options?.json) headers['Content-Type'] = 'application/json';
  return headers;
}

/** Convenience: read token from storage and build auth headers. */
export function authHeadersFromStorage(json = false, storageKey = DEFAULT_TOKEN_KEY): Record<string, string> {
  return bearerAuthHeaders(readStoredAuthToken(storageKey), { json });
}
