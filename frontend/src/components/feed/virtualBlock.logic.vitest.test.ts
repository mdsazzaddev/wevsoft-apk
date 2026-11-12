import { describe, expect, it } from 'vitest';
import {
  FEED_SCROLL_ROOT_ID,
  FEED_VIRTUAL_ROOT_MARGIN,
  feedVirtualObserverInit,
  feedVirtualObserverKey,
  resolveFeedScrollRoot,
  shouldMountVirtualChildren,
} from './virtualBlock.logic';

describe('virtualBlock.logic', () => {
  it('resolves #main-scroll-area when present', () => {
    const root = { id: FEED_SCROLL_ROOT_ID } as unknown as Element;
    const doc = {
      getElementById(id: string) {
        return id === FEED_SCROLL_ROOT_ID ? root : null;
      },
    };
    expect(resolveFeedScrollRoot(doc)).toBe(root);
  });

  it('falls back to null when scroller is missing', () => {
    const doc = { getElementById: () => null };
    expect(resolveFeedScrollRoot(doc)).toBeNull();
  });

  it('keys observers by margin + scroll root', () => {
    const root = { id: FEED_SCROLL_ROOT_ID } as unknown as Element;
    expect(feedVirtualObserverKey(FEED_VIRTUAL_ROOT_MARGIN, root)).toBe(
      `${FEED_VIRTUAL_ROOT_MARGIN}::${FEED_SCROLL_ROOT_ID}`,
    );
    expect(feedVirtualObserverKey(FEED_VIRTUAL_ROOT_MARGIN, null)).toBe(
      `${FEED_VIRTUAL_ROOT_MARGIN}::viewport`,
    );
  });

  it('builds IntersectionObserver init with feed scroller root', () => {
    const root = { id: FEED_SCROLL_ROOT_ID } as unknown as Element;
    expect(feedVirtualObserverInit(FEED_VIRTUAL_ROOT_MARGIN, root)).toEqual({
      root,
      rootMargin: FEED_VIRTUAL_ROOT_MARGIN,
      threshold: 0,
    });
  });

  it('keeps children mounted until a real height is measured', () => {
    expect(shouldMountVirtualChildren(true, false)).toBe(true);
    expect(shouldMountVirtualChildren(true, true)).toBe(true);
    expect(shouldMountVirtualChildren(false, false)).toBe(true);
    expect(shouldMountVirtualChildren(false, true)).toBe(false);
  });
});
