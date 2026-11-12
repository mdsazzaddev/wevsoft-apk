export * from '@wevsoft/shared/api/url';
export * from '@wevsoft/shared/api/error';

import { buildApiUrl, normalizeApiBase } from '@wevsoft/shared/api/url';

function isLoopbackApiBase(base: string): boolean {
  if (!base) return true;
  try {
    const withScheme = /:\/\//.test(base) ? base : `http://${base}`;
    const host = new URL(withScheme).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(base);
  }
}

/** True when the page is opened via a LAN IP / hostname (phone on Wi-Fi), not loopback. */
function isPageOnLanHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' && host !== '::1';
}

/**
 * Vite public env — empty = same origin (dev / preview proxy).
 *
 * Phone Wi-Fi preview opens `http://<PC-LAN-IP>:3000`. A baked-in
 * `VITE_API_URL=http://localhost:3001` would point at the phone itself and
 * blank the app — fall back to same-origin so Vite/backend proxy is used.
 */
export function getApiBaseUrl(): string {
  const configured = normalizeApiBase(import.meta.env.VITE_API_URL);
  if (isPageOnLanHost() && isLoopbackApiBase(configured)) {
    return '';
  }
  return configured;
}

/**
 * Origin that actually serves `/media` + `/uploads` for `<img>` / `<video>`.
 * Apex `wevsoft.com` often has no media proxy; `cdn.wevsoft.com` may 404 while
 * files live on `api.wevsoft.com`. Prefer VITE_API_URL, then known prod API host.
 */
export function getMediaApiOrigin(): string {
  const configured = getApiBaseUrl();
  if (configured) return configured;
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'wevsoft.com' || host === 'www.wevsoft.com' || host === 'cdn.wevsoft.com') {
    return 'https://api.wevsoft.com';
  }
  return '';
}

export function apiUrl(path: string): string {
  return buildApiUrl(getApiBaseUrl(), path);
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(input), init);
}
