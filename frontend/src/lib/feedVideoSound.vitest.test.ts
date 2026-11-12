import { afterEach, describe, expect, it } from 'vitest';
import {
  applyFeedVideoSound,
  getFeedVideoPreferMuted,
  getFeedVideoVolume,
  resetFeedVideoSoundPreferenceForTests,
  setFeedVideoPreferMuted,
} from './feedVideoSound';

afterEach(() => {
  resetFeedVideoSoundPreferenceForTests();
});

describe('feedVideoSound', () => {
  it('defaults to muted on desktop and remembers unmute across videos', () => {
    expect(getFeedVideoPreferMuted(false)).toBe(true);
    setFeedVideoPreferMuted(false, false);
    expect(getFeedVideoPreferMuted(false)).toBe(false);
    setFeedVideoPreferMuted(true, false);
    expect(getFeedVideoPreferMuted(false)).toBe(true);
  });

  it('defaults unmuted on phone and remembers mute/unmute for the session', () => {
    expect(getFeedVideoPreferMuted(true)).toBe(false);
    setFeedVideoPreferMuted(true, true);
    expect(getFeedVideoPreferMuted(true)).toBe(true);
    setFeedVideoPreferMuted(false, true);
    expect(getFeedVideoPreferMuted(true)).toBe(false);
    expect(getFeedVideoVolume()).toBe(1);
  });

  it('applyFeedVideoSound sets volume 1 when unmuted and 0 when muted', () => {
    const video = { muted: true, volume: 0 };
    setFeedVideoPreferMuted(false, false);
    expect(applyFeedVideoSound(video, { isPhone: false })).toBe(false);
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(1);

    expect(applyFeedVideoSound(video, { forceMuted: true, isPhone: false })).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0);
  });

  it('applyFeedVideoSound keeps phone unmuted at full volume', () => {
    const video = { muted: true, volume: 0 };
    expect(applyFeedVideoSound(video, { isPhone: true })).toBe(false);
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(1);
  });
});
