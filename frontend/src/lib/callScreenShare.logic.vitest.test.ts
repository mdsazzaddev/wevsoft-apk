import { describe, expect, it } from 'vitest';
import {
  applyScreenTrackHints,
  buildScreenShareConstraints,
  detectScreenShareSupport,
  isDisplayTrack,
} from './callScreenShare.logic';

describe('callScreenShare.logic', () => {
  it('builds presentation-friendly constraints by default', () => {
    const c = buildScreenShareConstraints({ withSystemAudio: true });
    expect(c.audio).toBeTruthy();
    expect((c.video as MediaTrackConstraints).frameRate).toMatchObject({ ideal: 15, max: 20 });
  });

  it('raises frame rate for motion shares', () => {
    const c = buildScreenShareConstraints({ preferMotion: true, withSystemAudio: false });
    expect(c.audio).toBe(false);
    expect((c.video as MediaTrackConstraints).frameRate).toMatchObject({ ideal: 30, max: 30 });
  });

  it('detects support gates', () => {
    expect(detectScreenShareSupport({ isSecureContext: false, hasGetDisplayMedia: true }).supported).toBe(false);
    expect(detectScreenShareSupport({ isSecureContext: true, hasGetDisplayMedia: false }).supported).toBe(false);
    expect(detectScreenShareSupport({ isSecureContext: true, hasGetDisplayMedia: true }).supported).toBe(true);
  });

  it('identifies display tracks and applies content hints', () => {
    const track = {
      label: 'Screen 1',
      getSettings: () => ({ displaySurface: 'monitor' }),
    } as unknown as MediaStreamTrack;
    expect(isDisplayTrack(track)).toBe(true);
    const hinted = { contentHint: '' } as MediaStreamTrack & { contentHint?: string };
    applyScreenTrackHints(hinted, false);
    expect(hinted.contentHint).toBe('detail');
    applyScreenTrackHints(hinted, true);
    expect(hinted.contentHint).toBe('motion');
  });
});
