import { describe, it, expect } from 'vitest';
import {
  resolvePlaylistUri,
  extractMediaSegmentUrls,
  pickLowestVariantUrl,
} from './videoPrefetch';

const MASTER = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720/index.m3u8
`;

const MEDIA = `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXTINF:4.0,
seg_000.ts
#EXTINF:4.0,
seg_001.ts
#EXTINF:4.0,
seg_002.ts
`;

describe('videoPrefetch playlist helpers', () => {
  it('resolves relative playlist URIs', () => {
    expect(resolvePlaylistUri('https://cdn.example/media/reels/hls/a/master.m3u8', '360/index.m3u8')).toBe(
      'https://cdn.example/media/reels/hls/a/360/index.m3u8',
    );
  });

  it('picks the lowest-bandwidth master variant', () => {
    expect(pickLowestVariantUrl(MASTER, 'https://cdn.example/media/a/master.m3u8')).toBe(
      'https://cdn.example/media/a/360/index.m3u8',
    );
  });

  it('returns null when playlist has no variants', () => {
    expect(pickLowestVariantUrl(MEDIA, 'https://cdn.example/media/a/360/index.m3u8')).toBeNull();
  });

  it('extracts the first N media segments', () => {
    expect(extractMediaSegmentUrls(MEDIA, 'https://cdn.example/media/a/360/index.m3u8', 2)).toEqual([
      'https://cdn.example/media/a/360/seg_000.ts',
      'https://cdn.example/media/a/360/seg_001.ts',
    ]);
  });
});
