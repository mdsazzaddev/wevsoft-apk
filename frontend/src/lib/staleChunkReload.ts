/**
 * Self-heal after a deploy.
 *
 * Cloudflare Pages replaces every hashed file on each deploy and answers unknown
 * `/assets/*` URLs with the SPA shell (HTTP 200 text/html). A tab (or a stale
 * service-worker shell) that still points at the previous build then fails to
 * import its lazy route chunk and renders a blank page until the user refreshes.
 * Reload once automatically instead; a 30s guard prevents reload loops.
 */

const RELOAD_KEY = 'wev_stale_chunk_reload_at';
const RELOAD_GUARD_MS = 30_000;

const STALE_CHUNK_RE =
  /dynamically imported module|Importing a module script failed|Failed to load module script|Loading chunk|Loading CSS chunk|ChunkLoadError|Unable to preload CSS|error loading dynamically imported module/i;

export function isStaleChunkError(input: unknown): boolean {
  if (!input) return false;
  const msg =
    typeof input === 'string'
      ? input
      : String((input as { message?: unknown }).message ?? input);
  return STALE_CHUNK_RE.test(msg);
}

/** True when a reload is allowed now (and records it). */
export function claimStaleChunkReload(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (last && now - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    /* storage blocked: still allow a single attempt per page load below */
  }
  return true;
}

let installed = false;

export function installStaleChunkReload(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const reload = () => {
    if (claimStaleChunkReload()) window.location.reload();
  };

  // Vite fires this when a dynamic import / its preload deps fail.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reload();
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkError(event.reason)) reload();
  });
  window.addEventListener('error', (event) => {
    if (isStaleChunkError(event.message)) reload();
  });
}
