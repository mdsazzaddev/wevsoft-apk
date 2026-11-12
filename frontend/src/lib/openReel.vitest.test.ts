import { describe, it, expect } from 'vitest';
import {
  isHandoffFresh,
  mergeOpenReelHandoff,
  applyOpenReelHandoffToReel,
  type FeedHandoffSnapshot,
  type OpenReelPayload,
} from './openReel';

describe('openReel IP7 handoff', () => {
  it('treats handoff as fresh only within TTL', () => {
    const now = 1_000_000;
    expect(isHandoffFresh(now - 1000, now, 8000)).toBe(true);
    expect(isHandoffFresh(now - 9000, now, 8000)).toBe(false);
  });

  it('merges watch position and poster from feed snapshot', () => {
    const payload: OpenReelPayload = {
      id: 'r1',
      source: 'reel',
      videoUrl: '/media/reels/videos/a.mp4',
      thumbnailUrl: null,
    };
    const handoff: FeedHandoffSnapshot = {
      src: '/media/reels/videos/a-480.mp4',
      currentTime: 4.2,
      poster: '/media/thumbs/a.jpg',
      capturedAt: 1_000_000,
    };
    const merged = mergeOpenReelHandoff(payload, handoff, 1_000_500);
    expect(merged.watchPosition).toBe(4.2);
    expect(merged.thumbnailUrl).toBe('/media/thumbs/a.jpg');
    expect(merged.handoffSrc).toBe('/media/reels/videos/a-480.mp4');
    expect(merged.videoUrl).toBe('/media/reels/videos/a.mp4');
  });

  it('ignores stale handoff', () => {
    const payload: OpenReelPayload = { id: 'r1', videoUrl: '/a.mp4' };
    const merged = mergeOpenReelHandoff(
      payload,
      { src: '/b.mp4', currentTime: 9, capturedAt: 100, poster: null },
      20_000,
    );
    expect(merged).toEqual(payload);
  });

  it('applies stash fields onto an existing reel row', () => {
    const reel = { id: 'r1', videoUrl: '/v.mp4', thumbnailUrl: null as string | null };
    const patched = applyOpenReelHandoffToReel(reel, {
      id: 'r1',
      thumbnailUrl: '/t.jpg',
      watchPosition: 3.5,
      handoffSrc: '/v.mp4',
      handoffAt: 99,
    });
    expect(patched.thumbnailUrl).toBe('/t.jpg');
    expect(patched.watchPosition).toBe(3.5);
    expect(patched._handoffPoster).toBe('/t.jpg');
    expect(patched._handoffSrc).toBe('/v.mp4');
  });

  it('does not patch a different reel id', () => {
    const reel = { id: 'r1' };
    expect(applyOpenReelHandoffToReel(reel, { id: 'other', watchPosition: 2 })).toEqual(reel);
  });
});
