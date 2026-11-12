import { describe, expect, it } from 'vitest';
import { scrollRouteKey } from './appNavigation';

describe('scrollRouteKey', () => {
  it('ignores About section query so left-nav chips keep scroll', () => {
    expect(scrollRouteKey('/profile', '?tab=about&section=intro')).toBe('/profile?tab=about');
    expect(scrollRouteKey('/profile', '?tab=about&section=personal')).toBe('/profile?tab=about');
    expect(scrollRouteKey('/profile', '?tab=about&section=intro')).toBe(
      scrollRouteKey('/profile', '?tab=about&section=contact'),
    );
  });

  it('still distinguishes real tab changes', () => {
    expect(scrollRouteKey('/profile', '?tab=about')).not.toBe(scrollRouteKey('/profile', '?tab=friends'));
  });
});
