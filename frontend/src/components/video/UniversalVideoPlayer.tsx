import React, { useEffect, useState, useRef } from 'react';
import VideoSurface from './VideoSurface';
import { getVideoPresentationMode, readVideoRatio, type VideoContext } from '../../lib/videoPresentation';
import { attachHlsToVideo, isHlsUrl } from '../../lib/hlsPlayback';
import { attachDashToVideo, isDashUrl } from '../../lib/dashPlayback';
import { readVideoDuration } from '../../lib/mediaDuration';
import { armUnmuteOnGesture, playWithAutoplayFallback } from '../../lib/videoAutoplay';

export interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  /** Explicit or initial aspect ratio */
  aspectRatio?: number | null;
  /** 'reels-mobile' | 'reels-desktop' | 'feed' | 'fullscreen' */
  context: VideoContext;
  /** If the parent container is fixed (like desktop reels), pass its ratio to help decide presentation */
  containerRatio?: number | null;
  muted?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
  brightness?: number;
  preload?: 'auto' | 'metadata' | 'none';
  playsInline?: boolean;
  isActive?: boolean;
  /** Preferred ladder rung for hls.js / dash.js (Auto = ABR). */
  preferredQuality?: string;
  /** Live HLS: shorter buffers, no loop recommended by callers. */
  live?: boolean;
  /** True LL-HLS (EXT-X-PART) — opt-in; default off for ordinary live mpegts. */
  lowLatency?: boolean;
  /**
   * VOD Instant Playback: shorter buffers + start-low ABR (ignored for live).
   * Default true when VITE_VIDEO_INSTANT is on.
   */
  instantStart?: boolean;
  /**
   * Reel VOD: after this many HLS network/media recoveries, fire onError so
   * the caller can try the next source. Omit for live (keep retrying).
   */
  hlsNetworkGiveUpAfter?: number;

  className?: string;
  videoClassName?: string;
  style?: React.CSSProperties;

  onTimeUpdate?: (current: number, duration: number) => void;
  onLoadedMetadata?: (duration: number, ratio: number | null) => void;
  onEnded?: () => void;
  onPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPause?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVolumeChange?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onError?: () => void;

  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children?: React.ReactNode;
}

export default function UniversalVideoPlayer({
  src,
  poster,
  aspectRatio: initialRatio = null,
  context,
  containerRatio = null,
  muted = true,
  autoplay = false,
  loop = true,
  volume = 1,
  playbackRate = 1,
  brightness = 1,
  preload = 'metadata',
  playsInline = true,
  isActive = true,
  preferredQuality,
  live = false,
  lowLatency = false,
  instantStart,
  hlsNetworkGiveUpAfter,
  className = '',
  videoClassName = '',
  style,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onPlay,
  onPause,
  onVolumeChange,
  onError,
  videoRef: externalVideoRef,
  children,
}: UniversalVideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (externalVideoRef || internalRef) as React.MutableRefObject<HTMLVideoElement | null>;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const bindRef = useRef(0);

  const [actualRatio, setActualRatio] = useState<number | null>(initialRatio || null);

  const presentation = getVideoPresentationMode(actualRatio || initialRatio, context, containerRatio);

  // Progressive / HLS (TS or fMP4) / DASH binding.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    let cancelled = false;
    let alive = true;
    let cleanup: (() => void) | null = null;
    const bind = ++bindRef.current;
    el.dataset.playbackBind = String(bind);
    const reportError = () => {
      if (!alive || el.dataset.playbackBind !== String(bind)) return;
      onErrorRef.current?.();
    };

    const run = async () => {
      if (isDashUrl(src)) {
        const attached = await attachDashToVideo(el, src, {
          preferredQuality,
          onFatalError: reportError,
        });
        if (cancelled) {
          attached.destroy();
          return;
        }
        cleanup = attached.destroy;
      } else if (isHlsUrl(src)) {
        const attached = await attachHlsToVideo(el, src, {
          preferredQuality,
          live,
          lowLatency,
          instantStart: live ? false : instantStart,
          networkGiveUpAfter: hlsNetworkGiveUpAfter,
          onFatalError: reportError,
        });
        if (cancelled) {
          attached.destroy();
          return;
        }
        cleanup = attached.destroy;
      } else {
        el.src = src;
        cleanup = () => {
          try {
            el.removeAttribute('src');
            el.load();
          } catch { /* ignore */ }
        };
      }
    };

    void run();

    return () => {
      alive = false;
      cancelled = true;
      if (el.dataset.playbackBind === String(bind)) delete el.dataset.playbackBind;
      cleanup?.();
    };
  }, [src, preferredQuality, live, lowLatency, instantStart, hlsNetworkGiveUpAfter]);

  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  mutedRef.current = muted;
  volumeRef.current = volume;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, volume));
    el.playbackRate = playbackRate;
    el.loop = loop;
    // Prefer explicit mute; only force-unmute when the browser gesture budget allows it.
    // Blind el.muted=false after a policy mute leaves React "unmuted" while audio stays silent.
    if (muted) {
      el.muted = true;
    } else if (!el.muted) {
      /* already unmuted */
    } else {
      void playWithAutoplayFallback(el, { wantMuted: false, volume }).then((r) => {
        if (r === 'muted' && !mutedRef.current) {
          armUnmuteOnGesture(el, {
            getVolume: () => volumeRef.current,
            shouldUnmute: () => !mutedRef.current,
          });
        }
      });
    }
  }, [muted, volume, playbackRate, loop, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!isActive) {
      el.pause();
      return;
    }
    if (autoplay && el.paused) {
      void playWithAutoplayFallback(el, { wantMuted: muted, volume }).then((r) => {
        if (r === 'muted' && !mutedRef.current) {
          armUnmuteOnGesture(el, {
            getVolume: () => volumeRef.current,
            shouldUnmute: () => !mutedRef.current,
          });
        }
      });
    }
  }, [isActive, autoplay, src, muted, volume]);

  const fitClass = presentation.mode === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <VideoSurface
      presentation={presentation}
      poster={poster}
      brightness={brightness}
      className={className}
      style={style}
    >
      {/* src is bound in effect so hls.js and native HLS do not fight the attribute */}
      <video
        ref={videoRef}
        poster={poster}
        className={`w-full h-full block ${fitClass} ${videoClassName}`}
        playsInline={playsInline}
        muted={muted}
        loop={loop}
        preload={live ? 'auto' : preload}
        style={{ filter: `brightness(${brightness})` }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const r = readVideoRatio(el);
          if (r) setActualRatio(r);
          const d = readVideoDuration(el);
          if (onLoadedMetadata) onLoadedMetadata(d, r);
          if (autoplay && isActive && el.paused) {
            void playWithAutoplayFallback(el, { wantMuted: muted, volume }).then((r) => {
              if (r === 'muted' && !mutedRef.current) {
                armUnmuteOnGesture(el, {
                  getVolume: () => volumeRef.current,
                  shouldUnmute: () => !mutedRef.current,
                });
              }
            });
          }
        }}
        onLoadedData={(e) => {
          const el = e.currentTarget;
          if (autoplay && isActive && el.paused) {
            void playWithAutoplayFallback(el, { wantMuted: muted, volume }).then((r) => {
              if (r === 'muted' && !mutedRef.current) {
                armUnmuteOnGesture(el, {
                  getVolume: () => volumeRef.current,
                  shouldUnmute: () => !mutedRef.current,
                });
              }
            });
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (onTimeUpdate) {
            onTimeUpdate(el.currentTime || 0, readVideoDuration(el));
          }
        }}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
        onVolumeChange={onVolumeChange}
        onError={(e) => {
          const node = e.currentTarget;
          if (!node.dataset.playbackBind) return;
          if (!node.currentSrc && !node.getAttribute('src')) return;
          const bind = Number(node.dataset.playbackBind);
          if (!Number.isFinite(bind) || bind !== bindRef.current) return;
          onErrorRef.current?.();
        }}
      />
      {children}
    </VideoSurface>
  );
}
