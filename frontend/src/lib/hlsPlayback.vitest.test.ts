import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isHlsUrl,
  canPlayHlsNatively,
  canUseHlsPlayback,
  qualityLabelToMaxHeight,
  hlsFatalAction,
} from './hlsPlayback';
import { resolveHlsBufferProfile } from './instantPlayback';
import { pickPreviewVideoSrc, pickVideoSrc, type ReelsSettings } from './reelsPrefs';

const baseSettings: ReelsSettings = {
  autoplayMode: 'always',
  soundMode: 'muted',
  defaultVolume: 0.8,
  playbackSpeed: 1,
  loopVideo: true,
  autoNext: false,
  dataSaver: false,
  hdOnlyWifi: false,
  disablePreload: false,
  autoCaptions: false,
  captionLanguage: 'en',
  captionFontSize: 'md',
  highContrast: false,
  infiniteScroll: true,
  showWatched: true,
  cinematicMode: false,
  showNavIndicator: true,
  showProgressBar: true,
  autoHideChrome: false,
  preferredQuality: 'Auto',
};

describe('hlsPlayback helpers', () => {
  it('detects m3u8 / hls paths', () => {
    expect(isHlsUrl('/media/reels/hls/x/master.m3u8')).toBe(true);
    expect(isHlsUrl('/media/reels/videos/x-480.mp4')).toBe(false);
    expect(isHlsUrl(null)).toBe(false);
  });

  it('gives up on a repeated network failure only when a limit is set', () => {
    expect(hlsFatalAction('network', 1, undefined)).toBe('retry');
    expect(hlsFatalAction('network', 1, 1)).toBe('retry');
    expect(hlsFatalAction('network', 2, 1)).toBe('fatal');
    expect(hlsFatalAction('other', 1, undefined)).toBe('fatal');
  });

  it('maps quality labels to max height', () => {
    expect(qualityLabelToMaxHeight('Auto')).toBeNull();
    expect(qualityLabelToMaxHeight('720p')).toBe(720);
    expect(qualityLabelToMaxHeight('hd')).toBe(720);
  });

  it('instant VOD profile is shorter than legacy VOD buffers', () => {
    const instant = resolveHlsBufferProfile({ instantStart: true });
    const legacy = resolveHlsBufferProfile({ instantStart: false });
    expect(instant.maxBufferLength).toBeLessThan(legacy.maxBufferLength);
  });
});

describe('pickVideoSrc with MSE HLS', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaSource', function MediaSource() {});
    Object.defineProperty(document, 'createElement', {
      configurable: true,
      value: () => ({ canPlayType: () => '' }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('prefers hlsUrl when MSE is available and not data-saver', () => {
    expect(canUseHlsPlayback()).toBe(true);
    expect(canPlayHlsNatively()).toBe(false);
    const src = pickVideoSrc(
      {
        videoUrl: '/media/reels/videos/a.mp4',
        hlsUrl: '/media/reels/hls/a/master.m3u8',
        mediaFiles: [],
      },
      baseSettings,
    );
    expect(src).toBe('/media/reels/hls/a/master.m3u8');
  });

  it('prefers CMAF hls_fmp4 master over TS hlsUrl when packaged', () => {
    const src = pickVideoSrc(
      {
        videoUrl: '/media/reels/videos/a.mp4',
        hlsUrl: '/media/reels/hls/a/master.m3u8',
        mediaFiles: [
          { quality: 'auto', kind: 'hls_fmp4', url: '/media/reels/cmaf/a/master.m3u8' },
          { quality: 'auto', kind: 'hls', url: '/media/reels/hls/a/master.m3u8' },
        ],
      },
      baseSettings,
    );
    expect(src).toBe('/media/reels/cmaf/a/master.m3u8');
  });

  it('falls back to progressive under data saver when 480p progressive exists', () => {
    const src = pickVideoSrc(
      {
        videoUrl: '/media/reels/videos/a.mp4',
        hlsUrl: '/media/reels/hls/a/master.m3u8',
        mediaFiles: [
          { quality: '480p', kind: 'progressive', url: '/media/reels/videos/a-480.mp4' },
          { quality: '480p', kind: 'hls', url: '/media/reels/hls/a/480/index.m3u8' },
        ],
      },
      { ...baseSettings, dataSaver: true },
    );
    expect(src).toBe('/media/reels/videos/a-480.mp4');
  });

  it('pickPreviewVideoSrc prefers 480p progressive for tray tiles', () => {
    expect(
      pickPreviewVideoSrc({
        videoUrl: '/media/reels/videos/a.mp4',
        mediaFiles: [
          { quality: '1080p', kind: 'progressive', url: '/media/reels/videos/a-1080.mp4' },
          { quality: '480p', kind: 'progressive', url: '/media/reels/videos/a-480.mp4' },
          { quality: '480p', kind: 'hls', url: '/media/reels/hls/a/480/index.m3u8' },
        ],
      }),
    ).toBe('/media/reels/videos/a-480.mp4');
  });
});
