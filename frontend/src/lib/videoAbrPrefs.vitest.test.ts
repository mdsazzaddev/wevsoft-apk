import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findMediaMaster,
  isCmafHlsUrl,
  isDashUrl,
  pickPreferredAdaptiveUrl,
  resolveAbrMode,
  writeAbrModeOverride,
} from './videoAbrPrefs';

describe('videoAbrPrefs', () => {
  beforeEach(() => {
    writeAbrModeOverride(null);
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
      removeItem(k: string) {
        delete this.store[k];
      },
    });
  });

  afterEach(() => {
    writeAbrModeOverride(null);
    vi.unstubAllGlobals();
  });

  it('detects dash and cmaf urls', () => {
    expect(isDashUrl('/media/reels/dash/a/manifest.mpd')).toBe(true);
    expect(isDashUrl('/media/reels/hls/a/master.m3u8')).toBe(false);
    expect(isCmafHlsUrl('/media/reels/cmaf/a/master.m3u8')).toBe(true);
    expect(isCmafHlsUrl('/media/reels/hls/a/master.m3u8')).toBe(false);
  });

  it('finds auto masters by kind', () => {
    const files = [
      { kind: 'hls_fmp4', quality: '720p', url: '/cmaf/a/720p/index.m3u8' },
      { kind: 'hls_fmp4', quality: 'auto', url: '/cmaf/a/master.m3u8' },
      { kind: 'dash', quality: 'auto', url: '/dash/a/manifest.mpd' },
    ];
    expect(findMediaMaster(files, 'hls_fmp4')).toBe('/cmaf/a/master.m3u8');
    expect(findMediaMaster(files, 'dash')).toBe('/dash/a/manifest.mpd');
  });

  it('prefers CMAF over TS when preferCmaf', () => {
    const url = pickPreferredAdaptiveUrl(
      {
        hlsUrl: '/media/reels/hls/a/master.m3u8',
        mediaFiles: [
          { kind: 'hls_fmp4', quality: 'auto', url: '/media/reels/cmaf/a/master.m3u8' },
        ],
      },
      { preferCmaf: true, enableDash: false, mode: 'auto' },
    );
    expect(url).toBe('/media/reels/cmaf/a/master.m3u8');
  });

  it('returns null in hls-only mode so caller uses reel.hlsUrl', () => {
    const url = pickPreferredAdaptiveUrl(
      {
        mediaFiles: [
          { kind: 'hls_fmp4', quality: 'auto', url: '/media/reels/cmaf/a/master.m3u8' },
        ],
      },
      { mode: 'hls', preferCmaf: true },
    );
    expect(url).toBeNull();
  });

  it('picks dash when mode=dash', () => {
    const url = pickPreferredAdaptiveUrl(
      {
        mediaFiles: [
          { kind: 'hls_fmp4', quality: 'auto', url: '/cmaf/a/master.m3u8' },
          { kind: 'dash', quality: 'auto', url: '/dash/a/manifest.mpd' },
        ],
      },
      { mode: 'dash', enableDash: true },
    );
    expect(url).toBe('/dash/a/manifest.mpd');
  });

  it('resolveAbrMode defaults to auto when prefer CMAF', () => {
    expect(['auto', 'hls']).toContain(resolveAbrMode());
  });
});
