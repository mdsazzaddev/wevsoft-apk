/**
 * Feed cards scroll inside `#main-scroll-area`, not the window.
 * IntersectionObserver must use that element as `root` or visibility
 * flips too early and remounts flash blank while scrolling down.
 */
export const FEED_SCROLL_ROOT_ID = 'main-scroll-area';

/** Prefetch / keep-mounted band above & below the scroller viewport. */
export const FEED_VIRTUAL_ROOT_MARGIN = '2400px 0px';

export function resolveFeedScrollRoot(
  doc: { getElementById(id: string): Element | null } | null | undefined = typeof document !== 'undefined' ? document : null,
): Element | null {
  if (!doc) return null;
  return doc.getElementById(FEED_SCROLL_ROOT_ID);
}

export function feedVirtualObserverKey(rootMargin: string, root: Element | null): string {
  return `${rootMargin}::${root ? FEED_SCROLL_ROOT_ID : 'viewport'}`;
}

export function feedVirtualObserverInit(
  rootMargin: string,
  root: Element | null,
): IntersectionObserverInit {
  return {
    root: root || null,
    rootMargin,
    threshold: 0,
  };
}

/**
 * Keep children mounted until we have a measured height, even when offscreen.
 * Otherwise the spacer stays at defaultHeight (320/480) and remounting a tall
 * card into a short hole causes a blank jump when scrolling back into view.
 */
export function shouldMountVirtualChildren(
  intersecting: boolean,
  hasMeasuredHeight: boolean,
): boolean {
  if (intersecting) return true;
  return !hasMeasuredHeight;
}
