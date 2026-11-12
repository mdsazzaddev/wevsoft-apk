import { DEV_PORTS } from './constants/ports.js';

/** Consumer preview (:3000) never hosts admin — resolve the admin SPA origin. */
export function resolveAdminAppBase(configured?: string | null): string {
  const trimmed = String(configured || '').replace(/\/$/, '');
  if (trimmed) return trimmed;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${DEV_PORTS.admin}`;
  }
  return `http://localhost:${DEV_PORTS.admin}`;
}

export function buildAdminAppUrl(path = '/admin', configured?: string | null): string {
  const base = resolveAdminAppBase(configured);
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
