/**
 * Base URL of the standalone Business Suite app (business/ workspace).
 * - VITE_BUSINESS_APP_URL wins (e.g. https://business.wevsoft.com).
 * - Production build default: https://business.wevsoft.com
 * - Dev default: same host on port 3004.
 */
export function getBusinessAppBase(): string {
  const configured = String(import.meta.env.VITE_BUSINESS_APP_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  if (import.meta.env.PROD) return 'https://business.wevsoft.com';
  if (typeof window !== 'undefined' && /(^|\.)wevsoft\.com$/i.test(window.location.hostname)) return 'https://business.wevsoft.com';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3004`;
  return 'http://localhost:3004';
}

export function getBusinessAppOrigin(): string {
  try { return new URL(getBusinessAppBase()).origin; } catch { return ''; }
}

export function getBusinessAppUrl(path = '/business'): string {
  return `${getBusinessAppBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
