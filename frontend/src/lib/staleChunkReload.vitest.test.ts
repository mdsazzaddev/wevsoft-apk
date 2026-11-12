import { beforeEach, describe, expect, it } from 'vitest';
import { claimStaleChunkReload, isStaleChunkError } from './staleChunkReload';

describe('staleChunkReload', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('detects stale chunk / dynamic import failures', () => {
    expect(isStaleChunkError(new Error('Failed to fetch dynamically imported module: /assets/AuthPage-x.js'))).toBe(true);
    expect(isStaleChunkError('Importing a module script failed.')).toBe(true);
    expect(isStaleChunkError({ message: 'Loading chunk 12 failed' })).toBe(true);
    expect(isStaleChunkError(new Error('Network request failed'))).toBe(false);
    expect(isStaleChunkError(undefined)).toBe(false);
  });

  it('allows one reload then blocks inside the guard window (no reload loop)', () => {
    const t = 1_000_000;
    expect(claimStaleChunkReload(t)).toBe(true);
    expect(claimStaleChunkReload(t + 5_000)).toBe(false);
    expect(claimStaleChunkReload(t + 31_000)).toBe(true);
  });
});
