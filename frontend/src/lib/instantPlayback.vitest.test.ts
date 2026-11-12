import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  canWarmPrefetch,
  resolveHlsBufferProfile,
  shouldPreloadReelIndex,
  shouldMountReelIndex,
  resolveReelsMountWindow,
  resolveReelsMountBounds,
  resolveStickyUnloadMs,
  resolvePrefetchAheadCount,
  recordInstantTtff,
  readInstantTtffSamples,
  recordInstantRebuffer,
  readInstantRebufferSamples,
  shouldCountWaitingAsRebuffer,
  clearInstantTtffSamplesForTests,
} from './instantPlayback';

describe('instantPlayback', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_VIDEO_INSTANT', '1');
    vi.stubEnv('VITE_VIDEO_INSTANT_PREFETCH', '1');
    vi.stubEnv('VITE_VIDEO_INSTANT_START_LOW', '1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses short VOD buffers and start-low when instant', () => {
    const p = resolveHlsBufferProfile({ instantStart: true });
    expect(p.maxBufferLength).toBe(10);
    expect(p.maxMaxBufferLength).toBe(24);
    expect(p.startLevel).toBe(0);
  });

  it('keeps live buffers unchanged', () => {
    const live = resolveHlsBufferProfile({ live: true, lowLatency: false, instantStart: true });
    expect(live.maxBufferLength).toBe(12);
    expect(live.startLevel).toBe(-1);
    const ll = resolveHlsBufferProfile({ live: true, lowLatency: true });
    expect(ll.maxBufferLength).toBe(8);
  });

  it('falls back to legacy VOD buffers when instantStart is false', () => {
    const p = resolveHlsBufferProfile({ instantStart: false });
    expect(p.maxBufferLength).toBe(24);
    expect(p.startLevel).toBe(-1);
  });

  it('gates prefetch on data-saver / disablePreload', () => {
    expect(canWarmPrefetch({})).toBe(true);
    expect(canWarmPrefetch({ dataSaver: true })).toBe(false);
    expect(canWarmPrefetch({ disablePreload: true })).toBe(false);
    expect(canWarmPrefetch({ saveData: true })).toBe(false);
  });

  it('IP6 mounts with forward bias (behind 1 / ahead 3)', () => {
    expect(resolveReelsMountBounds(false)).toEqual({ behind: 1, ahead: 3 });
    expect(shouldMountReelIndex(0, false)).toBe(true);
    expect(shouldMountReelIndex(1, false)).toBe(true);
    expect(shouldMountReelIndex(3, false)).toBe(true);
    expect(shouldMountReelIndex(4, false)).toBe(false);
    expect(shouldMountReelIndex(-1, false)).toBe(true);
    expect(shouldMountReelIndex(-2, false)).toBe(false);
    expect(shouldPreloadReelIndex(3, false)).toBe(true);
    expect(shouldPreloadReelIndex(1, true)).toBe(false);
    expect(resolveReelsMountWindow(false)).toBe(3);
    expect(resolveReelsMountWindow(true)).toBe(0);
    expect(resolveStickyUnloadMs()).toBe(450);
    expect(resolvePrefetchAheadCount()).toBe(2);
  });

  it('records TTFF samples in a ring', () => {
    clearInstantTtffSamplesForTests();
    recordInstantTtff({ reelId: 'a', ttffMs: 120 });
    const samples = readInstantTtffSamples();
    expect(samples.some((s) => s.reelId === 'a' && s.ttffMs === 120)).toBe(true);
  });

  it('IP10 records rebuffer stalls above noise floor', () => {
    clearInstantTtffSamplesForTests();
    recordInstantRebuffer({ reelId: 'b', durationMs: 50 });
    expect(readInstantRebufferSamples()).toHaveLength(0);
    recordInstantRebuffer({ reelId: 'b', durationMs: 180 });
    expect(readInstantRebufferSamples().some((s) => s.durationMs === 180)).toBe(true);
    expect(shouldCountWaitingAsRebuffer({ isActive: true, seeking: false, hadPlay: true, stallMs: 180 })).toBe(true);
  });
});
