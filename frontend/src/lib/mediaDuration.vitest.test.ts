import { describe, expect, it } from 'vitest';
import { readVideoDuration, resolveMediaDuration } from './mediaDuration';

describe('resolveMediaDuration', () => {
  it('uses finite reported duration first', () => {
    expect(resolveMediaDuration(12.4, 99, 8)).toBe(12.4);
  });

  it('falls back to seekable end when reported is Infinity/NaN', () => {
    expect(resolveMediaDuration(Infinity, 99, 8.5)).toBe(8.5);
    expect(resolveMediaDuration(Number.NaN, 99, 8.5)).toBe(8.5);
  });

  it('falls back to server metadata last', () => {
    expect(resolveMediaDuration(Infinity, 42, 0)).toBe(42);
    expect(resolveMediaDuration(0, 42, 0)).toBe(42);
  });
});

describe('readVideoDuration', () => {
  it('reads seekable end when duration is not finite', () => {
    const el = {
      duration: Infinity,
      seekable: {
        length: 1,
        end: () => 15.2,
      },
    } as unknown as HTMLMediaElement;
    expect(readVideoDuration(el, 30)).toBe(15.2);
  });

  it('uses fallback when neither duration nor seekable help', () => {
    const el = {
      duration: Number.NaN,
      seekable: { length: 0, end: () => 0 },
    } as unknown as HTMLMediaElement;
    expect(readVideoDuration(el, 30)).toBe(30);
  });
});
