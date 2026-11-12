import { useCallback, useEffect, useRef, useState } from 'react';

/** Auto-hide timings for Reels chrome (ms). */
export const REELS_CHROME_FIRST_VISIT_MS = 4000;
export const REELS_CHROME_REPEAT_MS = 2500;
export const REELS_VOLUME_HIDE_MS = 2000;

/** Fired by the active reel when playback toggles from a tap: detail = { playing: boolean }. */
export const REELS_PLAYBACK_EVENT = 'reels:playback';
const SEEN_KEY = 'wev.reels.chromeSeen';

export function emitReelsPlayback(playing: boolean) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(REELS_PLAYBACK_EVENT, { detail: { playing } }));
}

/** First-ever Reels visit shows chrome longer; later visits show it briefly. */
export function reelsChromeInitialDelay(): number {
  try {
    if (localStorage.getItem(SEEN_KEY)) return REELS_CHROME_REPEAT_MS;
    localStorage.setItem(SEEN_KEY, '1');
  } catch { /* private mode */ }
  return REELS_CHROME_FIRST_VISIT_MS;
}

/**
 * Visible on mount, hides after `delay` ms. `show(ms?)` reveals and re-arms the timer;
 * `hold()` keeps it visible until the next `show()`/`hideSoon()`.
 */
export function useAutoHide(delay: number, initiallyVisible = true) {
  const [visible, setVisible] = useState(initiallyVisible);
  const timer = useRef<number | null>(null);
  const clear = useCallback(() => { if (timer.current != null) { window.clearTimeout(timer.current); timer.current = null; } }, []);
  const hideSoon = useCallback((ms = delay) => { clear(); timer.current = window.setTimeout(() => setVisible(false), ms); }, [clear, delay]);
  const show = useCallback((ms = delay) => { setVisible(true); hideSoon(ms); }, [hideSoon, delay]);
  const hold = useCallback(() => { clear(); setVisible(true); }, [clear]);
  useEffect(() => { if (initiallyVisible) hideSoon(delay); return clear; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { visible, show, hold, hideSoon };
}