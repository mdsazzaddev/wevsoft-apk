/**
 * Runtime gates for the login companion's animation loops.
 *
 * The mascot is inline SVG driven by Motion, so "performance" here means: don't
 * run timers, springs or repeating keyframes when nobody can see them, and dial
 * the amplitude down on hardware that would rather not composite 30 animated
 * nodes at 60fps. Each hook is deliberately a one-listener affair — the mascot
 * mounts once for the whole auth session, so setup cost is paid a single time.
 */

import { useEffect, useState, type RefObject } from 'react';

function readVisible() {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

/** True while the tab is foregrounded. Backgrounded tabs get no animation at all. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(readVisible);
  useEffect(() => {
    const onChange = () => setVisible(readVisible());
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/**
 * True while any part of `ref` is inside the viewport. On a short mobile viewport
 * the mascot can sit above the fold and scroll away entirely; there is no reason
 * to keep breathing off-screen.
 */
export function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      // A little slack so a nearly-visible mascot is already moving when it lands.
      { rootMargin: '80px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

type NetworkInfo = { saveData?: boolean; effectiveType?: string };
type LowPowerNav = Navigator & { deviceMemory?: number; connection?: NetworkInfo };

/**
 * Best-effort "this device would rather not" check. Read once — none of these
 * change during a login — and treated as a hint to soften the animation, never
 * as a reason to drop the character.
 *
 * Phones often omit `deviceMemory` and report 8 cores, so concurrency alone
 * under-detects. Treat 2G/3G and save-data as lite as well.
 */
function detectLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as LowPowerNav;
  if (nav.connection?.saveData) return true;
  const net = nav.connection?.effectiveType;
  if (net === 'slow-2g' || net === '2g' || net === '3g') return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4) {
    return true;
  }
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0) {
    return nav.hardwareConcurrency <= 4;
  }
  return false;
}

export function useLowPowerDevice(): boolean {
  const [lowPower] = useState(detectLowPower);
  return lowPower;
}

/**
 * True on touch-first devices. There is no cursor to follow, so the
 * pointermove listener and its per-frame maths are pure overhead.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(pointer: coarse)');
    const onChange = () => setCoarse(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return coarse;
}

/**
 * Phone / narrow auth layout. Backdrop blur, particle fields and infinite
 * mascot loops thrash mobile GPUs; this gate collapses them to a static scene.
 */
export function useNarrowAuthViewport(): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

/** Touch, narrow, or modest hardware — use the cheap auth scene. */
export function useLiteAuthScene(): boolean {
  return useLowPowerDevice() || useCoarsePointer() || useNarrowAuthViewport();
}
