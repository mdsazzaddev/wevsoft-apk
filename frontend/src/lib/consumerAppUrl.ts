/**
 * Absolute URL into the main consumer app (www / :3000).
 * Used from Business Suite when opening feed surfaces (Reels, Story Studio, …).
 */
export function getConsumerAppBase(): string {
  const configured = String(import.meta.env.VITE_APP_URL || import.meta.env.VITE_FRONTEND_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  if (import.meta.env.PROD) return 'https://www.wevsoft.com';
  if (typeof window !== 'undefined' && /(^|\.)wevsoft\.com$/i.test(window.location.hostname)) {
    return 'https://www.wevsoft.com';
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    // Business Suite local ports → main Vite on 3000
    if (port === '3004' || port === '3005' || /^business\./i.test(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export function consumerAppUrl(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getConsumerAppBase()}${p}`;
}

/** True when this SPA is the Business Suite host (not the main consumer app). */
export function isBusinessAppHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const port = window.location.port;
  if (/^business\./i.test(host)) return true;
  if (port === '3004' || port === '3005') return true;
  return window.location.pathname.startsWith('/business');
}
