/**
 * Base URL of the standalone Developer console app (developer/ workspace).
 * - VITE_DEVELOPER_APP_URL wins (e.g. https://developer.wevsoft.com).
 * - Production build default: https://developer.wevsoft.com
 * - Dev default: same host on port 3003 (works for localhost and LAN previews).
 */
export function getDeveloperAppBase(): string {
  const configured = String(import.meta.env.VITE_DEVELOPER_APP_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  if (import.meta.env.PROD) return 'https://developer.wevsoft.com';
  if (typeof window !== 'undefined' && /(^|\.)wevsoft\.com$/i.test(window.location.hostname)) return 'https://developer.wevsoft.com';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3003`;
  return 'http://localhost:3003';
}

export function getDeveloperAppOrigin(): string {
  try {
    return new URL(getDeveloperAppBase()).origin;
  } catch {
    return '';
  }
}

/** Absolute developer-app URL for an app path such as `/developer/apps`. */
export function getDeveloperAppUrl(path = '/developer'): string {
  return `${getDeveloperAppBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
