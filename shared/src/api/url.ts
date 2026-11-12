/** Environment-neutral API URL helpers (no import.meta / process.env). */

export function normalizeApiBase(raw?: string | null): string {
  return String(raw || '').replace(/\/$/, '');
}

export function buildApiUrl(base: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeApiBase(base)}${normalized}`;
}

/** True when path should be routed to the backend API origin. */
export function isBackendRelativePath(path: string): boolean {
  return (
    path.startsWith('/api/') ||
    path.startsWith('/uploads/') ||
    path.startsWith('/media/') ||
    path.startsWith('/socket.io')
  );
}
