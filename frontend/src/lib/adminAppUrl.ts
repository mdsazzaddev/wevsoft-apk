import { buildAdminAppUrl } from '@wevsoft/shared/admin-app-url';

const CONFIGURED = String(import.meta.env.VITE_ADMIN_URL || '');

export function getAdminAppBase(): string {
  return buildAdminAppUrl('/admin', CONFIGURED).replace(/\/admin$/, '');
}

export function getAdminAppUrl(path = '/admin'): string {
  return buildAdminAppUrl(path, CONFIGURED);
}

/** Open the standalone admin SPA on :3002 — sign-in happens there, not via handoff. */
export function openAdminApp(path = '/admin'): void {
  window.location.assign(getAdminAppUrl(path));
}
