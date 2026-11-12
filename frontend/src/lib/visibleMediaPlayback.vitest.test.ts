import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acquireVisibleMediaSuspend,
  isVisibleMediaSuspended,
  reportVisibleMedia,
  resetVisibleMediaPlaybackForTests,
} from './visibleMediaPlayback';

afterEach(() => {
  resetVisibleMediaPlaybackForTests();
  vi.useRealTimers();
});

describe('acquireVisibleMediaSuspend', () => {
  it('releases the autoplay winner and blocks reclaim until released', async () => {
    vi.useFakeTimers();
    const claim = vi.fn();
    const release = vi.fn();

    reportVisibleMedia({
      key: 'clip-a',
      score: 1,
      minScore: 0.2,
      claim,
      release,
    });
    await vi.runAllTimersAsync();
    expect(claim).toHaveBeenCalled();

    const endSuspend = acquireVisibleMediaSuspend();
    expect(isVisibleMediaSuspended()).toBe(true);
    expect(release).toHaveBeenCalled();

    claim.mockClear();
    reportVisibleMedia({
      key: 'clip-a',
      score: 1,
      minScore: 0.2,
      claim,
      release,
    });
    await vi.runAllTimersAsync();
    expect(claim).not.toHaveBeenCalled();

    endSuspend();
    expect(isVisibleMediaSuspended()).toBe(false);
    await vi.runAllTimersAsync();
    expect(claim).toHaveBeenCalled();
  });
});
