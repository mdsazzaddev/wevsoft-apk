import React, { useEffect, useRef, useState } from 'react';
import {
  FEED_VIRTUAL_ROOT_MARGIN,
  feedVirtualObserverInit,
  feedVirtualObserverKey,
  resolveFeedScrollRoot,
  shouldMountVirtualChildren,
} from './virtualBlock.logic';

type VisibilityCallback = (isIntersecting: boolean) => void;
type ResizeCallback = (height: number) => void;

const visibilityCallbacks = new WeakMap<Element, VisibilityCallback>();
const sharedIntersectionObservers = new Map<string, IntersectionObserver>();

function getSharedIntersectionObserver(rootMargin: string): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
  const root = resolveFeedScrollRoot();
  const key = feedVirtualObserverKey(rootMargin, root);
  let observer = sharedIntersectionObservers.get(key);
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cb = visibilityCallbacks.get(entry.target);
          if (cb) cb(entry.isIntersecting);
        }
      },
      feedVirtualObserverInit(rootMargin, root),
    );
    sharedIntersectionObservers.set(key, observer);
  }
  return observer;
}

const resizeCallbacks = new WeakMap<Element, ResizeCallback>();
let sharedResizeObserver: ResizeObserver | null = null;

function getSharedResizeObserver(): ResizeObserver | null {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return null;
  if (!sharedResizeObserver) {
    sharedResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cb = resizeCallbacks.get(entry.target);
        if (!cb) continue;
        const nextHeight = Math.round(entry.contentRect.height);
        if (nextHeight > 40) cb(nextHeight);
      }
    });
  }
  return sharedResizeObserver;
}

/**
 * Lightweight viewport virtualization block using pooled IntersectionObserver and ResizeObserver.
 * Keeps mounted children when near the feed scroller and replaces far-offscreen blocks
 * with an exact measured-height spacer so long feeds stay fast without layout jumps.
 *
 * Intentionally does NOT set CSS `content-visibility` — that skips paint near the
 * scroller edge and causes blank blinks when scrolling down (especially on phones).
 * Far cards are already replaced with spacers via React unmount.
 */
export default function VirtualBlock({
  children,
  defaultHeight = 320,
  minHeight,
  rootMargin = FEED_VIRTUAL_ROOT_MARGIN,
}: {
  children: React.ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  rootMargin?: string;
  key?: React.Key;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hasMeasuredRef = useRef(false);
  const [intersecting, setIntersecting] = useState(true);
  const [hasMeasuredHeight, setHasMeasuredHeight] = useState(false);
  const [height, setHeight] = useState(minHeight ?? defaultHeight);
  const mounted = shouldMountVirtualChildren(intersecting, hasMeasuredHeight);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const io = getSharedIntersectionObserver(rootMargin);
    if (!io) return;
    visibilityCallbacks.set(node, (next) => {
      if (!next && hostRef.current && hasMeasuredRef.current) {
        const snap = Math.round(hostRef.current.getBoundingClientRect().height);
        if (snap > 40) setHeight((prev) => (Math.abs(prev - snap) >= 2 ? snap : prev));
      }
      setIntersecting(next);
    });
    io.observe(node);
    return () => {
      io.unobserve(node);
      visibilityCallbacks.delete(node);
    };
  }, [rootMargin]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || !mounted) return;
    const ro = getSharedResizeObserver();
    if (!ro) return;
    resizeCallbacks.set(node, (nextHeight) => {
      hasMeasuredRef.current = true;
      setHasMeasuredHeight(true);
      setHeight((prev) => (Math.abs(prev - nextHeight) >= 2 ? nextHeight : prev));
    });
    ro.observe(node);
    return () => {
      ro.unobserve(node);
      resizeCallbacks.delete(node);
    };
  }, [mounted]);

  return (
    <div
      ref={hostRef}
      style={mounted ? undefined : { minHeight: `${height}px` }}
    >
      {mounted ? children : <div style={{ height: `${height}px` }} aria-hidden="true" />}
    </div>
  );
}
