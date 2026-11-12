import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReelPlaybackSources, preferApiMediaUrl } from './reelPlaybackSources';
import type { ReelsSettings } from './reelsPrefs';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const settings = {
  autoplayMode: 'always',
  soundMode: 'muted',
  defaultVolume: 0.8,
  playbackSpeed: 1,
  loopVideo: true,
  autoNext: false,
  dataSaver: true,
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
} satisfies ReelsSettings;

describe('preferApiMediaUrl', () => {
  it('prefixes relative local media with the API origin', () => {
    expect(preferApiMediaUrl('/media/reels/videos/a.mp4', 'https://api.wevsoft.com')).toBe(
      'https://api.wevsoft.com/media/reels/videos/a.mp4',
    );
  });

  it('rewrites a CDN copy of a local path onto the API origin', () => {
    expect(
      preferApiMediaUrl('https://cdn.wevsoft.com/media/reels/videos/a.mp4?v=1', 'https://api.wevsoft.com'),
    ).toBe('https://api.wevsoft.com/media/reels/videos/a.mp4?v=1');
  });

  it('leaves external videos alone', () => {
    expect(preferApiMediaUrl('https://example.com/cdn/clip.mp4', 'https://api.wevsoft.com')).toBe(
      'https://example.com/cdn/clip.mp4',
    );
  });

  it('keeps a same-origin path when no API base is configured', () => {
    expect(preferApiMediaUrl('/uploads/clip.mp4', '')).toBe('/uploads/clip.mp4');
  });
});

describe('buildReelPlaybackSources', () => {
  it('tries the API host before the CDN url the feed returned', () => {
    const sources = buildReelPlaybackSources(
      { videoUrl: 'https://cdn.wevsoft.com/media/reels/videos/a.mp4', hlsUrl: null, mediaFiles: [] },
      settings,
      'https://api.wevsoft.com',
    );
    expect(sources[0]).toBe('https://api.wevsoft.com/media/reels/videos/a.mp4');
    expect(sources).toContain('https://cdn.wevsoft.com/media/reels/videos/a.mp4');
  });

  it('falls through to a progressive file after the adaptive master', () => {
    vi.stubGlobal('MediaSource', function MediaSource() {});
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'video') return { canPlayType: () => '' } as unknown as HTMLElement;
      return create(tag);
    }) as typeof document.createElement);
    const sources = buildReelPlaybackSources(
      {
        videoUrl: '/media/reels/videos/a.mp4',
        hlsUrl: '/media/reels/hls/a/master.m3u8',
        mediaFiles: [{ quality: '720p', kind: 'progressive', url: '/media/reels/videos/a-720.mp4' }],
      },
      { ...settings, dataSaver: false },
      'https://api.wevsoft.com',
    );
    expect(sources[0]).toBe('https://api.wevsoft.com/media/reels/hls/a/master.m3u8');
    expect(sources).toContain('https://api.wevsoft.com/media/reels/videos/a.mp4');
    expect(sources).toContain('https://api.wevsoft.com/media/reels/videos/a-720.mp4');
  });

  it('does not duplicate a url that is already on the API origin', () => {
    const sources = buildReelPlaybackSources(
      { videoUrl: 'https://api.wevsoft.com/media/reels/videos/a.mp4', mediaFiles: [] },
      settings,
      'https://api.wevsoft.com',
    );
    expect(sources).toEqual(['https://api.wevsoft.com/media/reels/videos/a.mp4']);
  });
});
