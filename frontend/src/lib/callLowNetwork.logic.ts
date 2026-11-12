/**
 * Phase 7 — low-network adaptive policy (pure).
 * Driven by CallNetworkQuality from real getStats — never invents samples.
 */

import type { CallNetworkQuality } from './callQuality.logic';

export type AdaptiveMediaMode = 'full' | 'saver' | 'audio_first';

export type VideoEncodingHint = {
  maxBitrate: number;
  maxFramerate: number;
  scaleResolutionDownBy: number;
};

/** Consecutive quality samples required before switching modes (hysteresis). */
export const ADAPTIVE_HYSTERESIS = {
  degradeTicks: 2,
  recoverTicks: 3,
} as const;

export const ICE_RESTART_COOLDOWN_MS = 12_000;

export function encodingForMode(mode: AdaptiveMediaMode): VideoEncodingHint {
  switch (mode) {
    case 'audio_first':
      return { maxBitrate: 0, maxFramerate: 1, scaleResolutionDownBy: 4 };
    case 'saver':
      return { maxBitrate: 250_000, maxFramerate: 15, scaleResolutionDownBy: 2 };
    default:
      return { maxBitrate: 1_200_000, maxFramerate: 30, scaleResolutionDownBy: 1 };
  }
}

export function modeFromQuality(q: CallNetworkQuality): AdaptiveMediaMode {
  if (q === 'poor' || q === 'reconnecting') return 'audio_first';
  if (q === 'weak') return 'saver';
  return 'full';
}

export function adaptiveModeLabel(mode: AdaptiveMediaMode): string {
  switch (mode) {
    case 'audio_first':
      return 'Audio-first';
    case 'saver':
      return 'Data saver';
    default:
      return 'Full quality';
  }
}

/**
 * Step adaptive mode with hysteresis so a single bad/good sample doesn't flap.
 */
export function nextAdaptiveMode(input: {
  current: AdaptiveMediaMode;
  observedQuality: CallNetworkQuality;
  degradeStreak: number;
  recoverStreak: number;
}): {
  mode: AdaptiveMediaMode;
  degradeStreak: number;
  recoverStreak: number;
  changed: boolean;
} {
  const target = modeFromQuality(input.observedQuality);
  const rank = (m: AdaptiveMediaMode) => (m === 'full' ? 0 : m === 'saver' ? 1 : 2);
  const cur = rank(input.current);
  const next = rank(target);

  if (next > cur) {
    const degradeStreak = input.degradeStreak + 1;
    if (degradeStreak >= ADAPTIVE_HYSTERESIS.degradeTicks) {
      return { mode: target, degradeStreak: 0, recoverStreak: 0, changed: true };
    }
    return { mode: input.current, degradeStreak, recoverStreak: 0, changed: false };
  }

  if (next < cur) {
    const recoverStreak = input.recoverStreak + 1;
    if (recoverStreak >= ADAPTIVE_HYSTERESIS.recoverTicks) {
      return { mode: target, degradeStreak: 0, recoverStreak: 0, changed: true };
    }
    return { mode: input.current, degradeStreak: 0, recoverStreak, changed: false };
  }

  return { mode: input.current, degradeStreak: 0, recoverStreak: 0, changed: false };
}

export function shouldPauseOutboundVideo(mode: AdaptiveMediaMode, callHasVideo: boolean): boolean {
  return callHasVideo && mode === 'audio_first';
}

export function shouldAttemptIceRestart(input: {
  connectionState: string | null | undefined;
  quality: CallNetworkQuality;
  lastRestartAtMs: number;
  nowMs: number;
}): boolean {
  const cooled = input.nowMs - input.lastRestartAtMs >= ICE_RESTART_COOLDOWN_MS;
  if (!cooled) return false;
  if (input.connectionState === 'disconnected' || input.connectionState === 'failed') return true;
  if (input.quality === 'reconnecting') return true;
  return false;
}

/**
 * Apply encoding constraints to an RTCRtpSender (video).
 * Returns false if the browser rejected / unsupported.
 */
export async function applyVideoEncodingToSender(
  sender: RTCRtpSender | null | undefined,
  mode: AdaptiveMediaMode,
): Promise<boolean> {
  if (!sender || sender.track?.kind !== 'video') return false;
  if (typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') {
    return false;
  }
  try {
    const params = sender.getParameters();
    if (!params.encodings || !params.encodings.length) {
      params.encodings = [{}];
    }
    const hint = encodingForMode(mode);
    params.encodings = params.encodings.map((enc) => ({
      ...enc,
      maxBitrate: hint.maxBitrate > 0 ? hint.maxBitrate : 64_000,
      maxFramerate: hint.maxFramerate,
      scaleResolutionDownBy: hint.scaleResolutionDownBy,
      active: mode !== 'audio_first' ? enc.active !== false : false,
    }));
    await sender.setParameters(params);
    return true;
  } catch {
    return false;
  }
}
