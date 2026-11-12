/**
 * WS7c: one-time handoff code (replaces the raw JWT `#wev_handoff` fragment).
 * Target app: prepare a verifier (sessionStorage) and send its challenge inside the
 * `next` URL hash (`#wev_hc=`). Main app: after sign-in, trade the challenge for a
 * one-time code (`/api/auth/handoff/start`) and redirect to `next#wev_code=`.
 * Target app: exchange code + verifier at `/api/auth/handoff/exchange` (same origin bound).
 */

export const HANDOFF_CODE_PARAM = 'wev_code';
export const HANDOFF_CHALLENGE_PARAM = 'wev_hc';
const VERIFIER_KEY = 'wev_handoff_verifier';
const TRIES_KEY = 'wev_handoff_tries';
const B64URL_43 = /^[A-Za-z0-9_-]{43}$/;

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomVerifier(): string {
  const a = new Uint8Array(32);
  globalThis.crypto.getRandomValues(a);
  return b64url(a);
}

export async function challengeOf(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

function hashParams(url: URL): URLSearchParams {
  return new URLSearchParams(url.hash.replace(/^#/, ''));
}

function setHash(url: URL, params: URLSearchParams): void {
  const s = params.toString();
  url.hash = s ? s : '';
}

/** Target app: login URL whose `next` carries a fresh challenge; verifier stays in sessionStorage. */
export async function buildHandoffLoginUrl(
  buildLoginUrl: (returnTo: string) => string,
  returnTo: string,
  storage: KV = sessionStorage,
): Promise<string> {
  const verifier = randomVerifier();
  storage.setItem(VERIFIER_KEY, verifier);
  const url = new URL(returnTo);
  const params = hashParams(url);
  params.delete(HANDOFF_CODE_PARAM);
  params.set(HANDOFF_CHALLENGE_PARAM, await challengeOf(verifier));
  setHash(url, params);
  return buildLoginUrl(url.toString());
}

/** Target app: read `#wev_code` once, strip it from the address bar, pair it with the stored verifier. */
export function takeHandoffCode(storage: KV = sessionStorage): { code: string; verifier: string } | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const params = hashParams(url);
  const code = params.get(HANDOFF_CODE_PARAM);
  if (!code && !params.has(HANDOFF_CHALLENGE_PARAM)) return null;
  params.delete(HANDOFF_CODE_PARAM);
  params.delete(HANDOFF_CHALLENGE_PARAM);
  setHash(url, params);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  const verifier = storage.getItem(VERIFIER_KEY);
  storage.removeItem(VERIFIER_KEY);
  if (!code || !B64URL_43.test(code) || !verifier) return null;
  return { code, verifier };
}

export type HandoffSession = { token?: string; user: Record<string, unknown> };

export async function exchangeHandoffCode(
  pending: { code: string; verifier: string },
  fetchImpl: typeof fetch = fetch,
): Promise<HandoffSession | null> {
  try {
    const res = await fetchImpl('/api/auth/handoff/exchange', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? (data as HandoffSession) : null;
  } catch {
    return null;
  }
}

/**
 * Main app: redirect to an external trusted `dest`. If it carries a challenge, attach a
 * one-time code; otherwise redirect plainly (the target bounces back with a challenge).
 * Never puts a token in the URL.
 */
export async function redirectWithHandoffCode(
  dest: string,
  bearer: string | null | undefined,
  assign: (url: string) => void = (u) => window.location.assign(u),
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const url = new URL(dest);
  const params = hashParams(url);
  const challenge = params.get(HANDOFF_CHALLENGE_PARAM);
  params.delete(HANDOFF_CHALLENGE_PARAM);
  params.delete(HANDOFF_CODE_PARAM);
  if (challenge && B64URL_43.test(challenge)) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bearer) headers.Authorization = `Bearer ${bearer}`;
      const res = await fetchImpl('/api/auth/handoff/start', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ targetOrigin: url.origin, challenge }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.code) params.set(HANDOFF_CODE_PARAM, String(data.code));
    } catch {
      /* fall back to a plain redirect */
    }
  }
  setHash(url, params);
  assign(url.toString());
}

/** Target app loop guard: at most 3 sign-in bounces per 2 minutes. */
export function allowHandoffBounce(storage: KV = sessionStorage, now = Date.now()): boolean {
  try {
    const raw = JSON.parse(storage.getItem(TRIES_KEY) || 'null') as { n: number; t: number } | null;
    const fresh = raw && now - raw.t < 120_000 ? raw : { n: 0, t: now };
    if (fresh.n >= 3) return false;
    storage.setItem(TRIES_KEY, JSON.stringify({ n: fresh.n + 1, t: fresh.t }));
    return true;
  } catch {
    return true;
  }
}

export function resetHandoffBounces(storage: KV = sessionStorage): void {
  try { storage.removeItem(TRIES_KEY); } catch { /* ignore */ }
}
