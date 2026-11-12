/**
 * HTML boot splash lives outside #root so React mount does not flash a second
 * loader. In installed PWA (standalone) the splash is removed by boot-theme.js /
 * hidden by boot-shell.css because Chrome already showed the native splash —
 * painting #wev-initial-splash again made the W appear twice.
 * Always dismiss on first React paint + hard failsafe so a slow lazy chunk
 * can never leave the user stuck on a loading shell.
 */

let failsafeTimer: number | null = null;

export function dismissWevSplash(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('wev-initial-splash');
  if (!el || el.dataset.dismissed === '1') return;
  el.dataset.dismissed = '1';
  if (failsafeTimer != null) {
    window.clearTimeout(failsafeTimer);
    failsafeTimer = null;
  }
  // Fade on the next frame so the shell has painted underneath (no blank gap).
  window.requestAnimationFrame(() => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    window.setTimeout(() => el.remove(), 200);
  });
}

/** Call once at boot — removes splash even if DashboardLayout never mounts. */
export function armWevSplashFailsafe(ms = 8000): void {
  if (typeof window === 'undefined') return;
  if (failsafeTimer != null) return;
  failsafeTimer = window.setTimeout(() => {
    failsafeTimer = null;
    dismissWevSplash();
  }, ms);
}