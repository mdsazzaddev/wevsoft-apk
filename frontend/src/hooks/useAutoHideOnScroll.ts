import { useEffect, useState } from 'react';
import type { MotionValue } from 'motion/react';

/** Minimum accumulated scroll (px) in one direction before the header flips. */
const DIRECTION_THRESHOLD_PX = 8;
/** Fallback "near top" distance when the header element can't be measured. */
const FALLBACK_HEADER_PX = 56;
/** Auto-hide only applies below the app's 1024px desktop breakpoint. */
const NARROW_QUERY = '(max-width: 1023px)';

type Options = {
  /** Attach the scroll listener at all (home feed + mobile header shown). */
  enabled: boolean;
  /** Any change (e.g. route pathname) forces the header back to visible. */
  resetKey: string;
  /** Pull-to-refresh offsets; while either is > 0 the header stays visible. */
  pullY?: MotionValue<number>;
  contentY?: MotionValue<number>;
  /** Element whose height counts as "near the top" (header + safe strip). */
  headerSelector?: string;
};

/**
 * Facebook/Instagram-style hide-on-scroll-down / show-on-scroll-up for the
 * mobile top header. Listens on `#main-scroll-area` (the real feed scroller),
 * passive + rAF-throttled. Returns `true` when the header should be hidden.
 */
export function useAutoHideOnScroll({
  enabled,
  resetKey,
  pullY,
  contentY,
  headerSelector = '[data-wev-mobile-header-overlay]',
}: Options): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setHidden(false);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const el = document.getElementById('main-scroll-area');
    if (!el) return;
    const mq = window.matchMedia(NARROW_QUERY);

    const headerHeight = () => {
      const node = document.querySelector<HTMLElement>(headerSelector);
      const h = node?.offsetHeight ?? 0;
      return h > 0 ? h : FALLBACK_HEADER_PX;
    };
    const isPulling = () => (pullY?.get() ?? 0) > 0.5 || (contentY?.get() ?? 0) > 0.5;
    /** Clamp iOS rubber-band overscroll so bounce at either end doesn't flip direction. */
    const readY = () => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      return Math.min(max, Math.max(0, el.scrollTop));
    };

    let anchorY = readY();
    let frame = 0;

    const apply = () => {
      frame = 0;
      const y = readY();
      if (!mq.matches || isPulling() || y < headerHeight()) {
        anchorY = y;
        setHidden(false);
        return;
      }
      const delta = y - anchorY;
      // Keep the anchor until the threshold is crossed so slow scrolls still accumulate.
      if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return;
      anchorY = y;
      setHidden(delta > 0);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // A pull gesture doesn't scroll; make sure the header is visible as soon as it starts.
    const unsubPull = pullY?.on('change', (v) => {
      if (v > 0.5) setHidden(false);
    });
    const onMq = () => {
      if (!mq.matches) setHidden(false);
    };
    mq.addEventListener?.('change', onMq);

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      unsubPull?.();
      mq.removeEventListener?.('change', onMq);
    };
  }, [enabled, resetKey, pullY, contentY, headerSelector]);

  return enabled && hidden;
}