import { describe, expect, it } from 'vitest';
import {
  adaptiveModeLabel,
  encodingForMode,
  modeFromQuality,
  nextAdaptiveMode,
  shouldAttemptIceRestart,
  shouldPauseOutboundVideo,
} from './callLowNetwork.logic';

describe('callLowNetwork.logic', () => {
  it('maps quality to mode', () => {
    expect(modeFromQuality('excellent')).toBe('full');
    expect(modeFromQuality('good')).toBe('full');
    expect(modeFromQuality('weak')).toBe('saver');
    expect(modeFromQuality('poor')).toBe('audio_first');
    expect(modeFromQuality('reconnecting')).toBe('audio_first');
  });

  it('requires hysteresis before degrade/recover', () => {
    let state = nextAdaptiveMode({
      current: 'full',
      observedQuality: 'weak',
      degradeStreak: 0,
      recoverStreak: 0,
    });
    expect(state.mode).toBe('full');
    expect(state.changed).toBe(false);

    state = nextAdaptiveMode({
      current: 'full',
      observedQuality: 'weak',
      degradeStreak: state.degradeStreak,
      recoverStreak: state.recoverStreak,
    });
    expect(state.mode).toBe('saver');
    expect(state.changed).toBe(true);

    state = nextAdaptiveMode({
      current: 'audio_first',
      observedQuality: 'excellent',
      degradeStreak: 0,
      recoverStreak: 0,
    });
    expect(state.mode).toBe('audio_first');
    state = nextAdaptiveMode({
      current: 'audio_first',
      observedQuality: 'excellent',
      degradeStreak: 0,
      recoverStreak: state.recoverStreak,
    });
    expect(state.mode).toBe('audio_first');
    state = nextAdaptiveMode({
      current: 'audio_first',
      observedQuality: 'excellent',
      degradeStreak: 0,
      recoverStreak: state.recoverStreak,
    });
    expect(state.mode).toBe('full');
    expect(state.changed).toBe(true);
  });

  it('encoding hints and ice restart cooldown', () => {
    expect(encodingForMode('saver').maxBitrate).toBeLessThan(encodingForMode('full').maxBitrate);
    expect(shouldPauseOutboundVideo('audio_first', true)).toBe(true);
    expect(shouldPauseOutboundVideo('full', true)).toBe(false);
    expect(
      shouldAttemptIceRestart({
        connectionState: 'disconnected',
        quality: 'reconnecting',
        lastRestartAtMs: 0,
        nowMs: 20_000,
      }),
    ).toBe(true);
    expect(
      shouldAttemptIceRestart({
        connectionState: 'disconnected',
        quality: 'reconnecting',
        lastRestartAtMs: 15_000,
        nowMs: 20_000,
      }),
    ).toBe(false);
    expect(adaptiveModeLabel('saver')).toBe('Data saver');
  });
});
