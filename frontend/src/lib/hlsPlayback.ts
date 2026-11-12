/**
 * HLS capability helpers for UniversalVideoPlayer (Phase 3).
 * Keep detection free of the hls.js bundle so pickVideoSrc stays cheap.
 * Instant Playback (IP1): VOD uses resolveHlsBufferProfile for shorter buffers + start-low.
 */

import { resolveHlsBufferProfile } from './instantPlayback';
import { playWithAutoplayFallback } from './videoAutoplay';

export function isHlsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url);
  return /\.m3u8(\?|#|$)/i.test(u) || /\/hls\//i.test(u);
}

/** Safari / iOS native HLS. */
export function canPlayHlsNatively(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  } catch {
    return false;
  }
}

/**
 * True when native HLS or MSE (hls.js) can play adaptive streams.
 * Does not import hls.js — uses MediaSource presence as a proxy.
 */
export function canUseHlsPlayback(): boolean {
  if (canPlayHlsNatively()) return true;
  if (typeof window === 'undefined') return false;
  return typeof MediaSource !== 'undefined' || typeof (window as any).ManagedMediaSource !== 'undefined';
}

export type HlsQualityHint = string | null | undefined;

/** Map UI quality labels to approximate max height for hls.js level filter. */
export function qualityLabelToMaxHeight(label: HlsQualityHint): number | null {
  if (!label || label === 'Auto') return null;
  const key = String(label).trim().toLowerCase();
  const map: Record<string, number> = {
    '240p': 240,
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '2160p': 2160,
    '4k': 2160,
    sd: 480,
    hd: 720,
    fullhd: 1080,
  };
  if (map[key] != null) return map[key];
  const m = key.match(/(\d{3,4})/);
  return m ? Number(m[1]) : null;
}

export type AttachHlsResult = {
  destroy: () => void;
};

export type HlsFatalKind = 'network' | 'media' | 'other';

/**
 * `giveUpAfter` is how many retries to allow before surfacing a fatal error.
 * Undefined keeps the historical behavior: keep recovering network/media errors.
 */
export function hlsFatalAction(
  kind: HlsFatalKind,
  strikes: number,
  giveUpAfter: number | undefined,
): 'retry' | 'fatal' {
  if (kind === 'other') return 'fatal';
  if (giveUpAfter == null) return 'retry';
  return strikes > giveUpAfter ? 'fatal' : 'retry';
}

/**
 * Attach HLS to a video element. Caller owns the element lifecycle.
 * Native HLS uses `video.src`; MSE uses dynamic `hls.js` import.
 */
export async function attachHlsToVideo(
  video: HTMLVideoElement,
  src: string,
  opts: {
    preferredQuality?: HlsQualityHint;
    /** Live HLS: shorter buffers. */
    live?: boolean;
    /**
     * True LL-HLS (EXT-X-PART). Default false — mpegts / ordinary live stalls with LL mode.
     * W6 MediaMTX LL can opt in.
     */
    lowLatency?: boolean;
    /**
     * VOD fast-start profile (shorter buffer + optional lowest rung first).
     * Ignored for live. Default true when VITE_VIDEO_INSTANT is on.
     */
    instantStart?: boolean;
    onFatalError?: () => void;
    /**
     * After this many network/media recoveries, call onFatalError.
     * Omit to keep retrying (live streams).
     */
    networkGiveUpAfter?: number;
  } = {},
): Promise<AttachHlsResult> {
  let destroyed = false;
  let hls: { destroy: () => void; currentLevel: number; levels: Array<{ height?: number }> } | null = null;

  const destroy = () => {
    destroyed = true;
    try {
      hls?.destroy();
    } catch { /* ignore */ }
    hls = null;
    try {
      video.removeAttribute('src');
      video.load();
    } catch { /* ignore */ }
  };

  if (canPlayHlsNatively()) {
    video.src = src;
    return { destroy };
  }

  const HlsMod = await import('hls.js');
  if (destroyed) return { destroy };
  const Hls = HlsMod.default;
  if (!Hls?.isSupported?.()) {
    opts.onFatalError?.();
    return { destroy };
  }

  const live = !!opts.live;
  const lowLatency = !!opts.lowLatency;
  const profile = resolveHlsBufferProfile({
    live,
    lowLatency,
    instantStart: live ? false : opts.instantStart,
  });
  const instance = new Hls({
    enableWorker: true,
    lowLatencyMode: lowLatency,
    maxBufferLength: profile.maxBufferLength,
    maxMaxBufferLength: profile.maxMaxBufferLength,
    backBufferLength: profile.backBufferLength,
    liveSyncDurationCount: live ? (lowLatency ? 2 : 3) : undefined,
    liveDurationInfinity: live,
    startLevel: profile.startLevel,
    abrEwmaDefaultEstimate: profile.abrEwmaDefaultEstimate,
  });
  hls = instance;

  const tryPlay = () => {
    if (destroyed) return;
    // Respect current element mute; UVP arms gesture remute when sound is desired.
    void playWithAutoplayFallback(video, { wantMuted: video.muted, volume: video.volume });
  };

  const applyQualityCap = () => {
    const maxH = qualityLabelToMaxHeight(opts.preferredQuality);
    if (maxH == null || !instance.levels?.length) {
      // Instant start-low: keep startLevel; otherwise ABR auto.
      if (profile.startLevel < 0) instance.currentLevel = -1;
      return;
    }
    let best = -1;
    let bestH = -1;
    for (let i = 0; i < instance.levels.length; i++) {
      const h = instance.levels[i]?.height || 0;
      if (h > 0 && h <= maxH && h >= bestH) {
        bestH = h;
        best = i;
      }
    }
    instance.currentLevel = best >= 0 ? best : -1;
  };

  let releasedAbr = profile.startLevel < 0 || qualityLabelToMaxHeight(opts.preferredQuality) != null;
  instance.on(Hls.Events.MANIFEST_PARSED, () => {
    applyQualityCap();
    tryPlay();
  });
  instance.on(Hls.Events.FRAG_BUFFERED, () => {
    // IP1: after the first fragment at start-low, hand control back to ABR.
    if (!releasedAbr && !live && qualityLabelToMaxHeight(opts.preferredQuality) == null) {
      releasedAbr = true;
      try {
        instance.currentLevel = -1;
      } catch { /* ignore */ }
    }
    if (video.paused) tryPlay();
  });
  let networkStrikes = 0;
  let mediaStrikes = 0;
  instance.on(Hls.Events.ERROR, (_event, data) => {
    if (!data?.fatal) return;
    const kind: HlsFatalKind = data.type === Hls.ErrorTypes.NETWORK_ERROR
      ? 'network'
      : data.type === Hls.ErrorTypes.MEDIA_ERROR
        ? 'media'
        : 'other';
    const strikes = kind === 'network' ? ++networkStrikes : kind === 'media' ? ++mediaStrikes : 1;
    const action = hlsFatalAction(kind, strikes, opts.networkGiveUpAfter);
    if (action === 'retry') {
      try {
        if (kind === 'network') {
          instance.startLoad();
          return;
        }
        if (kind === 'media') {
          instance.recoverMediaError();
          return;
        }
      } catch { /* fall through */ }
    }
    opts.onFatalError?.();
  });

  instance.loadSource(src);
  instance.attachMedia(video);
  // Native path already set src; MSE needs an explicit play after attach.
  tryPlay();

  return {
    destroy: () => {
      destroyed = true;
      try {
        instance.destroy();
      } catch { /* ignore */ }
      hls = null;
      try {
        video.removeAttribute('src');
        video.load();
      } catch { /* ignore */ }
    },
  };
}
