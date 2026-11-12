import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyVideoUnmute,
  consumeReelsAudioUnlockIntent,
  markReelsAudioUnlockIntent,
  mediaGestureAllowsUnmute,
  playWithAutoplayFallback,
} from './videoAutoplay';

describe('mediaGestureAllowsUnmute', () => {
  it('is false without userActivation', () => {
    expect(mediaGestureAllowsUnmute({})).toBe(false);
    expect(mediaGestureAllowsUnmute(null)).toBe(false);
  });

  it('is true when isActive or hasBeenActive', () => {
    expect(mediaGestureAllowsUnmute({ userActivation: { isActive: true } })).toBe(true);
    expect(mediaGestureAllowsUnmute({ userActivation: { hasBeenActive: true } })).toBe(true);
    expect(mediaGestureAllowsUnmute({ userActivation: { isActive: false, hasBeenActive: false } })).toBe(false);
  });
});

describe('playWithAutoplayFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockVideo(overrides: Partial<HTMLVideoElement> = {}) {
    const el = {
      muted: false,
      volume: 1,
      paused: true,
      play: vi.fn(),
      ...overrides,
    } as unknown as HTMLVideoElement;
    return el;
  }

  it('plays muted when wantMuted', async () => {
    const el = mockVideo();
    (el.play as any).mockResolvedValue(undefined);
    const r = await playWithAutoplayFallback(el, { wantMuted: true, volume: 0.5 });
    expect(r).toBe('ok');
    expect(el.muted).toBe(true);
    expect(el.volume).toBe(0.5);
  });

  it('returns ok when unmuted play succeeds', async () => {
    const el = mockVideo();
    (el.play as any).mockResolvedValue(undefined);
    const r = await playWithAutoplayFallback(el, { wantMuted: false });
    expect(r).toBe('ok');
    expect(el.muted).toBe(false);
  });

  it('falls back to muted when unmuted play is blocked', async () => {
    const el = mockVideo();
    (el.play as any)
      .mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { userActivation: { isActive: false, hasBeenActive: false } });
    const r = await playWithAutoplayFallback(el, { wantMuted: false });
    expect(r).toBe('muted');
    expect(el.muted).toBe(true);
  });

  it('remutes after muted fallback when sticky activation exists', async () => {
    const el = mockVideo();
    (el.play as any)
      .mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { userActivation: { isActive: false, hasBeenActive: true } });
    const r = await playWithAutoplayFallback(el, { wantMuted: false, volume: 0.9 });
    expect(r).toBe('ok');
    expect(el.muted).toBe(false);
    expect(el.volume).toBe(0.9);
  });
});

describe('applyVideoUnmute', () => {
  it('clears mute and clamps volume', () => {
    const el = { muted: true, volume: 0 } as HTMLVideoElement;
    applyVideoUnmute(el, 1.5);
    expect(el.muted).toBe(false);
    expect(el.volume).toBe(1);
  });
});

describe('reels audio unlock intent', () => {
  afterEach(() => {
    try {
      sessionStorage.removeItem('wev_reels_audio_unlock');
    } catch {
      /* */
    }
  });

  it('consumes a fresh mark once', () => {
    markReelsAudioUnlockIntent();
    expect(consumeReelsAudioUnlockIntent()).toBe(true);
    expect(consumeReelsAudioUnlockIntent()).toBe(false);
  });
});
