import { describe, expect, it } from 'vitest';
import {
  OWNER_PROFILE_MIN_VISIBLE,
  OWNER_PROFILE_TAB_ORDER,
  fitOwnerProfileTabs,
  splitOwnerProfileTabs,
} from './profileTabs.logic';

describe('fitOwnerProfileTabs', () => {
  it('keeps All/Posts/Reels on a narrow row', () => {
    const { barIds, moreIds } = fitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      rowWidthPx: 360,
      activeId: 'all',
      chipFallbackPx: 96,
      moreWidthPx: 88,
    });
    expect(barIds.length).toBeGreaterThanOrEqual(OWNER_PROFILE_MIN_VISIBLE);
    expect(barIds.slice(0, 3)).toEqual(['all', 'posts', 'reels']);
    expect(moreIds).toContain('photos');
  });

  it('places Reposts ahead of Friends in priority order', () => {
    expect(OWNER_PROFILE_TAB_ORDER.indexOf('reposts')).toBeLessThan(
      OWNER_PROFILE_TAB_ORDER.indexOf('friends'),
    );
    expect(OWNER_PROFILE_TAB_ORDER.slice(0, 5)).toEqual([
      'all',
      'posts',
      'reels',
      'about',
      'reposts',
    ]);
  });

  it('fills empty space with Photos/Videos instead of capping at 6', () => {
    // ~712px chip area + ~88 More ≈ 800px row — old max=6 left a gap; now packs more.
    const { barIds, moreIds } = fitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      rowWidthPx: 800,
      activeId: 'all',
      chipFallbackPx: 96,
      moreWidthPx: 88,
    });
    expect(barIds.length).toBeGreaterThan(6);
    expect(barIds).toEqual(expect.arrayContaining(['reposts', 'videos']));
    expect(moreIds).not.toContain('videos');
  });

  it('hides More when every tab fits', () => {
    const { barIds, moreIds } = fitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      rowWidthPx: 4000,
      activeId: 'all',
      chipFallbackPx: 96,
      moreWidthPx: 88,
    });
    expect(barIds).toEqual([...OWNER_PROFILE_TAB_ORDER]);
    expect(moreIds).toEqual([]);
  });

  it('uses measured chip widths when provided', () => {
    const narrow: Record<string, number> = Object.fromEntries(
      OWNER_PROFILE_TAB_ORDER.map((id) => [id, 70]),
    );
    const { barIds } = fitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      rowWidthPx: 800,
      activeId: 'all',
      tabWidthsPx: narrow,
      moreWidthPx: 80,
    });
    expect(barIds.length).toBeGreaterThan(7);
    expect(barIds).toContain('reposts');
  });

  it('promotes an active More tab into the last bar slot', () => {
    const { barIds, moreIds } = fitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      rowWidthPx: 360,
      activeId: 'saved',
      chipFallbackPx: 96,
      moreWidthPx: 88,
    });
    expect(barIds[barIds.length - 1]).toBe('saved');
    expect(moreIds).not.toContain('saved');
    expect(moreIds[0]).toBe('reels');
  });
});

describe('splitOwnerProfileTabs', () => {
  it('puts Reels on the bar when visibleCount is 3+', () => {
    const { barIds, moreIds } = splitOwnerProfileTabs({
      orderedIds: OWNER_PROFILE_TAB_ORDER,
      visibleCount: 3,
      activeId: 'all',
    });
    expect(barIds).toEqual(['all', 'posts', 'reels']);
    expect(moreIds[0]).toBe('about');
  });
});
