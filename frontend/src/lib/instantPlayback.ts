/**
 * Instant Playback — Wave 1 (IP0–IP5) + Wave 2 (IP6+).
 * Additive on top of existing UVP / hls.js / CMAF paths. Kill via VITE_VIDEO_INSTANT=0.
 */

function envFlag(name: string, fallback: boolean): boolean {
  try {
    const v = String((import.meta as any).env?.[name] ?? '').trim().toLowerCase();
    if (!v) return fallback;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  } catch {
    return fallback;
  }
}

/** Master switch — TTFF-oriented VOD buffers + start-low ABR. Default on. */
export function isInstantPlaybackEnabled(): boolean {
  return envFlag('VITE_VIDEO_INSTANT', true);
}

/** Warm next reel playlist + first segments. Default on when instant is on. */
export function isInstantPrefetchEnabled(): boolean {
  if (!isInstantPlaybackEnabled()) return false;
  return envFlag('VITE_VIDEO_INSTANT_PREFETCH', true);
}

/** Start HLS at lowest rung then climb (faster first frame on slow nets). Default on. */
export function isInstantStartLowEnabled(): boolean {
  if (!isInstantPlaybackEnabled()) return false;
  return envFlag('VITE_VIDEO_INSTANT_START_LOW', true);
}

/** Symmetric radius helper (legacy callers). Prefer resolveReelsMountBounds. */
export function resolveReelsMountWindow(disablePreload: boolean): number {
  if (disablePreload) return 0;
  const b = resolveReelsMountBounds(disablePreload);
  return Math.max(b.behind, b.ahead);
}

export type ReelsMountBounds = {
  /** Keep previous N reels mounted (swipe back). */
  behind: number;
  /** Keep next N reels mounted (forward swipe — biased higher in IP6). */
  ahead: number;
};

/**
 * IP6 — asymmetric mount window: more neighbors ahead than behind so forward
 * swipe hits an already-attached player.
 */
export function resolveReelsMountBounds(disablePreload: boolean): ReelsMountBounds {
  if (disablePreload) return { behind: 0, ahead: 0 };
  if (!isInstantPlaybackEnabled()) return { behind: 1, ahead: 2 };
  // Wave 2 seamless: prev + current + next three mounted when possible.
  return { behind: 1, ahead: 3 };
}

export function shouldMountReelIndex(dist: number, disablePreload: boolean): boolean {
  if (disablePreload) return dist === 0;
  const { behind, ahead } = resolveReelsMountBounds(disablePreload);
  return dist >= -behind && dist <= ahead;
}

/**
 * Indices relative to active that should load media (`shouldLoad`).
 * IP6: same as mount window so next reels attach HLS (muted/paused) before swipe.
 */
export function shouldPreloadReelIndex(dist: number, disablePreload: boolean): boolean {
  return shouldMountReelIndex(dist, disablePreload);
}

/** ms to keep media attached after leaving the window (quick swipe-back). */
export function resolveStickyUnloadMs(): number {
  if (!isInstantPlaybackEnabled()) return 0;
  return 450;
}

/** How many upcoming reels to HTTP-warm (playlist + first segments). */
export function resolvePrefetchAheadCount(): number {
  if (!isInstantPrefetchEnabled()) return 0;
  return 2;
}

export type HlsBufferProfile = {
  maxBufferLength: number;
  maxMaxBufferLength: number;
  backBufferLength: number;
  /** hls.js: -1 = ABR auto; 0 = lowest level first. */
  startLevel: number;
  /** Conservative estimate (bps) so ABR does not jump high before first samples. */
  abrEwmaDefaultEstimate: number;
};

/**
 * Pure HLS buffer / start-level config for attachHlsToVideo.
 * Live / LL paths stay unchanged when instant is only for VOD.
 */
export function resolveHlsBufferProfile(opts: {
  live?: boolean;
  lowLatency?: boolean;
  instantStart?: boolean;
}): HlsBufferProfile {
  const live = !!opts.live;
  const lowLatency = !!opts.lowLatency;

  if (live) {
    return {
      maxBufferLength: lowLatency ? 8 : 12,
      maxMaxBufferLength: lowLatency ? 16 : 24,
      backBufferLength: 6,
      startLevel: -1,
      abrEwmaDefaultEstimate: 500_000,
    };
  }

  const instant = opts.instantStart !== false && isInstantPlaybackEnabled();
  if (instant) {
    return {
      maxBufferLength: 10,
      maxMaxBufferLength: 24,
      backBufferLength: 8,
      startLevel: isInstantStartLowEnabled() ? 0 : -1,
      abrEwmaDefaultEstimate: 800_000,
    };
  }

  return {
    maxBufferLength: 24,
    maxMaxBufferLength: 48,
    backBufferLength: 12,
    startLevel: -1,
    abrEwmaDefaultEstimate: 500_000,
  };
}

/** Save-Data / data-saver / explicit disable → no segment prefetch. */
export function canWarmPrefetch(opts: {
  disablePreload?: boolean;
  dataSaver?: boolean;
  saveData?: boolean;
}): boolean {
  if (!isInstantPrefetchEnabled()) return false;
  if (opts.disablePreload) return false;
  if (opts.dataSaver) return false;
  if (opts.saveData) return false;
  return true;
}

export type InstantTtffSample = {
  reelId?: string;
  ttffMs: number;
  at: number;
};

export type InstantRebufferSample = {
  reelId?: string;
  durationMs: number;
  at: number;
};

const TTFF_RING_MAX = 24;
const ttffRing: InstantTtffSample[] = [];
const rebufferRing: InstantRebufferSample[] = [];

/** Lightweight client ring for IP5 — no network; inspectable in console / future admin. */
export function recordInstantTtff(sample: Omit<InstantTtffSample, 'at'> & { at?: number }): void {
  if (!isInstantPlaybackEnabled()) return;
  ttffRing.push({ ...sample, at: sample.at ?? Date.now() });
  while (ttffRing.length > TTFF_RING_MAX) ttffRing.shift();
}

/** IP10 — stall duration after play had started. */
export function recordInstantRebuffer(
  sample: Omit<InstantRebufferSample, 'at'> & { at?: number },
): void {
  if (!isInstantPlaybackEnabled()) return;
  const durationMs = Math.round(Number(sample.durationMs));
  if (!Number.isFinite(durationMs) || durationMs < 120) return;
  rebufferRing.push({
    reelId: sample.reelId,
    durationMs,
    at: sample.at ?? Date.now(),
  });
  while (rebufferRing.length > TTFF_RING_MAX) rebufferRing.shift();
}

export function readInstantTtffSamples(): readonly InstantTtffSample[] {
  return ttffRing;
}

export function readInstantRebufferSamples(): readonly InstantRebufferSample[] {
  return rebufferRing;
}

/** Test helper — clear the TTFF / rebuffer rings. */
export function clearInstantTtffSamplesForTests(): void {
  ttffRing.length = 0;
  rebufferRing.length = 0;
}

/** IP10 — ignore seek/startup noise when counting HTMLMediaElement waiting. */
export function shouldCountWaitingAsRebuffer(opts: {
  isActive: boolean;
  seeking: boolean;
  hadPlay: boolean;
  minStallMs?: number;
  stallMs?: number;
}): boolean {
  if (!opts.isActive || opts.seeking || !opts.hadPlay) return false;
  const min = opts.minStallMs ?? 120;
  if (opts.stallMs != null && opts.stallMs < min) return false;
  return true;
}
