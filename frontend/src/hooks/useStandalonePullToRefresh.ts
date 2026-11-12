import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useTransform, type AnimationPlaybackControls } from 'motion/react';
import { needsInAppRefreshChrome } from '../lib/pwaDisplay';
import { isHomePath, requestAppRefresh, requestHomeRefresh } from '../lib/appNavigation';

export const PULL_THRESHOLD_PX = 64;
export const MAX_PULL_PX = 120;
/** Height the content rests at while the spinner shows. */
const HOLD_PX = 56;
/** Keep the spinner visible at least this long so the refresh reads as intentional, not a flicker. */
const MIN_SPIN_MS = 380;
/** Slightly under-damped: settles in ~250ms with a barely-visible soft bounce. */
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 } as const;
const REDUCED = { duration: 0.12, ease: 'easeOut' } as const;

/** ~1:1 near the start, then asymptotically approaches MAX_PULL_PX (iOS-style rubber band). */
function rubberBand(delta: number) {
  return MAX_PULL_PX * (1 - 1 / (delta / MAX_PULL_PX + 1));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Touches inside fixed overlays (modals, story viewer) must not drag the page underneath. */
function startsInFixedLayer(target: EventTarget | null, root: HTMLElement) {
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (getComputedStyle(node).position === 'fixed') return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Touches inside a nested scroller that is already scrolled (e.g. the WevSpace
 * dashboard's own content pane) belong to that scroller, not to pull-to-refresh.
 */
function startsInScrolledChild(target: EventTarget | null, root: HTMLElement) {
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (node.scrollTop > 2) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Pull-to-refresh on `#main-scroll-area` for phones / installed PWAs.
 * Home -> soft feed + stories refresh; other routes -> hard reload.
 * Gesture drives motion values directly (no React re-render per touchmove).
 */
export function useStandalonePullToRefresh(enabled = true) {
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(false);
  /** Indicator offset (always follows the finger). */
  const pullY = useMotionValue(0);
  /** Content offset (stays 0 with prefers-reduced-motion). */
  const contentY = useMotionValue(0);
  const progress = useTransform(pullY, [0, PULL_THRESHOLD_PX], [0, 1], { clamp: true });
  const startX = useRef(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const engaged = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const sync = () => setActive(needsInAppRefreshChrome());
    sync();
    const mq = window.matchMedia(
      '(max-device-width: 767px), (max-width: 767px) and (pointer: coarse)',
    );
    const onChange = () => sync();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !active || typeof window === 'undefined') return;
    const el = document.getElementById('main-scroll-area');
    if (!el) return;
    let anims: AnimationPlaybackControls[] = [];
    let holdTimer: number | undefined;

    const stopAnims = () => {
      anims.forEach((a) => a.stop());
      anims = [];
    };

    const settle = (to: number) => {
      stopAnims();
      const reduce = prefersReducedMotion();
      const opts = reduce ? REDUCED : SPRING;
      anims = [animate(pullY, to, opts), animate(contentY, reduce ? 0 : to, opts)];
      return Promise.all(anims.map((a) => a.finished));
    };

    const onStart = (e: TouchEvent) => {
      pulling.current = false;
      engaged.current = false;
      if (refreshingRef.current || el.scrollTop > 2) return;
      if (startsInFixedLayer(e.target, el)) return;
      if (startsInScrolledChild(e.target, el)) return;
      const t = e.touches[0];
      if (!t) return;
      startX.current = t.clientX;
      startY.current = t.clientY;
      pulling.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      if (!engaged.current) {
        const dx = t.clientX - startX.current;
        const dy = t.clientY - startY.current;
        // Horizontal swipe (story carousel) or upward scroll -> leave it to native scrolling.
        if ((Math.abs(dx) > 10 && Math.abs(dx) > dy) || dy < -6 || el.scrollTop > 2) {
          pulling.current = false;
          return;
        }
        if (dy <= 6) return;
        engaged.current = true;
        startY.current = t.clientY; // start from here so the content doesn't jump
        stopAnims();
      }
      const y = rubberBand(Math.max(0, t.clientY - startY.current));
      pullY.set(y);
      contentY.set(prefersReducedMotion() ? 0 : y);
      if (e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (!engaged.current) return;
      engaged.current = false;
      if (pullY.get() < PULL_THRESHOLD_PX || refreshingRef.current) {
        void settle(0);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      void settle(HOLD_PX);
      if (isHomePath(window.location.pathname)) {
        requestHomeRefresh();
        holdTimer = window.setTimeout(() => {
          void settle(0).then(() => {
            refreshingRef.current = false;
            setRefreshing(false);
          });
        }, MIN_SPIN_MS);
      } else {
        requestAppRefresh({ hard: true });
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      window.clearTimeout(holdTimer);
      stopAnims();
      pullY.set(0);
      contentY.set(0);
      refreshingRef.current = false;
      setRefreshing(false);
    };
  }, [enabled, active, pullY, contentY]);

  return {
    /** Phone / PWA mode and enabled for this route. */
    active: enabled && active,
    pullY,
    contentY,
    progress,
    refreshing,
  };
}