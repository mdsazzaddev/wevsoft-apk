/** Settings → Reduce screen motion (`access_reduced_motion`). Adds `reduce-motion` on <html>; CSS in index.css shortens animations/transitions. */

export const REDUCED_MOTION_PREF_KEY = 'access_reduced_motion';
export const REDUCED_MOTION_CLASS = 'reduce-motion';
const CACHE_KEY = 'wev.reducedMotion';

export function parseReducedMotion(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function isReducedMotionApplied(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains(REDUCED_MOTION_CLASS);
}

const listeners = new Set<() => void>();

/** Subscribe to changes of the in-app preference (for useSyncExternalStore). */
export function subscribeReducedMotion(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Value for motion/react `<MotionConfig reducedMotion>`: when the in-app setting is on, JS animations are
 * always reduced; otherwise follow the OS `prefers-reduced-motion` ('user').
 */
export function motionConfigReducedMotion(enabled: boolean): 'always' | 'user' {
  return enabled ? 'always' : 'user';
}

export function applyReducedMotionToDocument(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const before = isReducedMotionApplied();
  document.documentElement.classList.toggle(REDUCED_MOTION_CLASS, enabled);
  try { localStorage.setItem(CACHE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
  if (before !== enabled) listeners.forEach(l => { try { l(); } catch { /* ignore */ } });
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  try { if (localStorage.getItem(CACHE_KEY) === '1') document.documentElement.classList.add(REDUCED_MOTION_CLASS); } catch { /* ignore */ }
}