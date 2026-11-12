import { describe, expect, it } from 'vitest';
import { isReelHoldSpeedZone } from './reelHoldSpeed.logic';

describe('isReelHoldSpeedZone', () => {
  const rect = { top: 100, height: 1000 };

  it('rejects the upper/mid frame', () => {
    expect(isReelHoldSpeedZone(100, rect)).toBe(false);
    expect(isReelHoldSpeedZone(500, rect)).toBe(false);
    // Bottom 42% starts at relative y >= 580 → clientY 680; stay clearly above.
    expect(isReelHoldSpeedZone(670, rect)).toBe(false);
  });

  it('accepts the bottom zone', () => {
    expect(isReelHoldSpeedZone(690, rect)).toBe(true);
    expect(isReelHoldSpeedZone(1099, rect)).toBe(true);
  });

  it('handles zero-height safely', () => {
    expect(isReelHoldSpeedZone(50, { top: 0, height: 0 })).toBe(false);
  });
});
