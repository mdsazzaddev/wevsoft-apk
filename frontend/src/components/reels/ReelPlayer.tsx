import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { ReelsSettings } from '../../lib/reelsPrefs';
import { buildReelPlaybackSources, preferApiMediaUrl } from '../../lib/reelPlaybackSources';
import { getApiBaseUrl } from '../../lib/apiBase';
import { formatReelTime } from './ReelFullscreenControls';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import type { VideoContext } from '../../lib/videoPresentation';
import { resolveMediaDuration } from '../../lib/mediaDuration';
import {
  isInstantPlaybackEnabled,
  recordInstantRebuffer,
  recordInstantTtff,
  shouldCountWaitingAsRebuffer,
} from '../../lib/instantPlayback';

/** Brief center Play/Pause flash on toggle (no persistent overlay). */
const PLAY_FLASH_MS = 700;

type Props = {
  reel: any;
  isActive: boolean;
  shouldLoad: boolean;
  isMuted: boolean;
  playbackRate: number;
  volume: number;
  brightness: number;
  loop: boolean;
  autoplay: boolean;
  settings: ReelsSettings;
  cinematic: boolean;
  showProgress: boolean;
  zoom: number;
  onTime: (current: number, duration: number) => void;
  onEnded: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  forceContain?: boolean;
  immersive?: boolean;
  fillFrame?: boolean;
  playing?: boolean;
  onTogglePlay?: () => void;
  scrubbing?: boolean;
  scrubEndInset?: boolean;
  onVideoRatioChange?: (ratio: number | null) => void;
  onSkip?: () => void;
};

const TIME_NOTIFY_MS = 400;

export default function ReelPlayer({
  reel,
  isActive,
  shouldLoad,
  isMuted,
  playbackRate,
  volume,
  brightness,
  loop,
  autoplay,
  settings,
  cinematic: _cinematic,
  showProgress,
  zoom: _zoom,
  onTime,
  onEnded,
  videoRef,
  forceContain = false,
  immersive = false,
  fillFrame = false,
  playing = false,
  onTogglePlay,
  scrubbing = false,
  scrubEndInset = false,
  onVideoRatioChange,
  onSkip,
}: Props) {
  const stageImmersive = immersive || fillFrame;
  const [duration, setDuration] = useState(Number(reel.durationSec) || 0);
  const [current, setCurrent] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mediaKey, setMediaKey] = useState(0);
  const [srcIndex, setSrcIndex] = useState(0);
  const seekingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const lastNotifyRef = useRef(0);
  const durationRef = useRef(Number(reel.durationSec) || 0);
  const sources = useMemo(
    () => buildReelPlaybackSources(reel, settings, getApiBaseUrl()),
    [reel, settings],
  );
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const srcIndexRef = useRef(0);
  const advancingRef = useRef(false);
  const src = sources[srcIndex] || '';
  const resumed = useRef(false);
  const poster = preferApiMediaUrl(reel.thumbnailUrl, getApiBaseUrl()) || undefined;
  const [boxRatio, setBoxRatio] = useState<number | null>(null);
  const onTimeRef = useRef(onTime);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  onTimeRef.current = onTime;
  const activeAtRef = useRef<number | null>(null);
  const ttffRecordedRef = useRef(false);
  const hadPlayRef = useRef(false);
  const waitingSinceRef = useRef<number | null>(null);
  const instantStart = isInstantPlaybackEnabled() && !settings.dataSaver;
  const handoffPoster =
    (typeof reel._handoffPoster === 'string' && reel._handoffPoster)
    || poster
    || undefined;
  const [showHandoffCover, setShowHandoffCover] = useState(
    () => !!(isActive && isInstantPlaybackEnabled() && (reel._handoffAt || reel.watchPosition > 0.25)),
  );
  const [playFlash, setPlayFlash] = useState<'play' | 'pause' | null>(null);
  const playFlashTimer = useRef<number | null>(null);
  const prevPlayingRef = useRef(playing);
  /** Skip the first play flash after a reel becomes active (autoplay). */
  const skipPlayFlashRef = useRef(true);

  const paintProgress = (t: number, d: number) => {
    const pct = d > 0 ? Math.min(100, (t / d) * 100) : 0;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (timeLabelRef.current) {
      timeLabelRef.current.textContent = d > 0
        ? `${formatReelTime(t)} / ${formatReelTime(d)}`
        : `${formatReelTime(t)} / —`;
    }
  };

  const onPlaybackError = () => {
    if (advancingRef.current) return;
    const list = sourcesRef.current;
    const next = srcIndexRef.current + 1;
    if (next < list.length) {
      advancingRef.current = true;
      srcIndexRef.current = next;
      setSrcIndex(next);
      return;
    }
    setLoadError(true);
  };

  useEffect(() => {
    advancingRef.current = false;
  }, [srcIndex, mediaKey]);

  const clearPlayFlashTimer = () => {
    if (playFlashTimer.current) {
      window.clearTimeout(playFlashTimer.current);
      playFlashTimer.current = null;
    }
  };

  const flashPlayIcon = (kind: 'play' | 'pause') => {
    setPlayFlash(kind);
    clearPlayFlashTimer();
    playFlashTimer.current = window.setTimeout(() => {
      playFlashTimer.current = null;
      setPlayFlash(null);
    }, PLAY_FLASH_MS);
  };

  useEffect(() => {
    resumed.current = false;
    advancingRef.current = false;
    srcIndexRef.current = 0;
    ttffRecordedRef.current = false;
    activeAtRef.current = null;
    prevPlayingRef.current = playing;
    skipPlayFlashRef.current = true;
    clearPlayFlashTimer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setSrcIndex(0);
    setLoadError(sourcesRef.current.length === 0);
    setMediaKey(0);
    setPlayFlash(null);
    durationRef.current = Number(reel.durationSec) || 0;
    setDuration(durationRef.current);
    setCurrent(0);
    paintProgress(0, durationRef.current);
    lastNotifyRef.current = 0;
    setShowHandoffCover(
      !!(isInstantPlaybackEnabled() && (reel._handoffAt || Number(reel.watchPosition) > 0.25)),
    );
  }, [reel.id, reel._handoffAt, reel.watchPosition]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on reel change only; playing sampled for prev ref

  useEffect(() => {
    if (!isActive) {
      activeAtRef.current = null;
      hadPlayRef.current = false;
      waitingSinceRef.current = null;
      prevPlayingRef.current = playing;
      skipPlayFlashRef.current = true;
      clearPlayFlashTimer();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear flash when leaving the active reel
      setPlayFlash(null);
      return;
    }
    skipPlayFlashRef.current = true;
    if (activeAtRef.current == null) activeAtRef.current = performance.now();
    // playing is only sampled when becoming inactive; keep out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reel.id]);

  useEffect(() => {
    const wasPlaying = prevPlayingRef.current;
    prevPlayingRef.current = playing;
    if (!isActive || scrubbing || loadError || wasPlaying === playing) return;
    if (wasPlaying && !playing) {
      flashPlayIcon('pause');
      return;
    }
    if (!wasPlaying && playing) {
      if (skipPlayFlashRef.current) {
        skipPlayFlashRef.current = false;
        return;
      }
      flashPlayIcon('play');
    }
  }, [playing, isActive, scrubbing, loadError]);

  useEffect(() => () => {
    clearPlayFlashTimer();
  }, []);

  // IP10 — measure stall time while active after play has started
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isActive || !instantStart) return;

    const onWaiting = () => {
      if (seekingRef.current || !hadPlayRef.current) return;
      if (waitingSinceRef.current == null) waitingSinceRef.current = performance.now();
    };
    const endStall = () => {
      const started = waitingSinceRef.current;
      waitingSinceRef.current = null;
      if (started == null) return;
      const stallMs = Math.round(performance.now() - started);
      if (
        !shouldCountWaitingAsRebuffer({
          isActive: true,
          seeking: seekingRef.current,
          hadPlay: hadPlayRef.current,
          stallMs,
        })
      ) return;
      recordInstantRebuffer({
        reelId: String(reel.id || ''),
        durationMs: stallMs,
      });
    };

    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', endStall);
    el.addEventListener('canplay', endStall);
    return () => {
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('playing', endStall);
      el.removeEventListener('canplay', endStall);
    };
  }, [isActive, instantStart, reel.id, videoRef, mediaKey, srcIndex]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setBoxRatio(width / height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isActive || loadError) return;
    if (!resumed.current && reel.watchPosition > 2 && reel.watchPosition < (duration || reel.durationSec || 1e9) - 2) {
      try { el.currentTime = reel.watchPosition; } catch { /* ignore */ }
      resumed.current = true;
    }
  }, [isActive, reel.id, loadError, mediaKey, duration, reel.durationSec, reel.watchPosition, videoRef]);

  useEffect(() => {
    if (shouldLoad) return;
    const el = videoRef.current;
    if (!el) return;
    try {
      el.pause();
      el.removeAttribute('src');
      el.load();
    } catch { /* ignore */ }
  }, [shouldLoad, videoRef]);

  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  const seekToRatio = (ratio: number) => {
    const el = videoRef.current;
    const d = durationRef.current || duration;
    if (!el || !d) return;
    const next = Math.min(d, Math.max(0, ratio * d));
    el.currentTime = next;
    setCurrent(next);
    paintProgress(next, d);
    onTimeRef.current(next, d);
  };

  const onScrub = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    seekToRatio(ratio);
  };

  const startBarScrub = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    seekingRef.current = true;
    setSeeking(true);
    onScrub(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const moveBarScrub = (e: React.PointerEvent<HTMLElement>) => {
    if (!seekingRef.current) return;
    if (e.pointerType === 'mouse' && (e.buttons & 1) !== 1) return;
    onScrub(e);
  };

  const endBarScrub = () => {
    seekingRef.current = false;
    setSeeking(false);
  };

  const retryLoad = () => {
    advancingRef.current = false;
    srcIndexRef.current = 0;
    setSrcIndex(0);
    setLoadError(false);
    setMediaKey((k) => k + 1);
  };

  const videoContext: VideoContext = stageImmersive ? 'reels-mobile' : 'reels-desktop';

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 group/reel overflow-hidden ${isActive ? 'md:cursor-grab md:active:cursor-grabbing' : ''}`}
    >
      {shouldLoad && src ? (
        <>
          <UniversalVideoPlayer
            key={`${reel.id}-${mediaKey}-${srcIndex}`}
            videoRef={videoRef}
            src={src}
            hlsNetworkGiveUpAfter={1}
            poster={poster}
            context={forceContain ? 'fullscreen' : videoContext}
            containerRatio={boxRatio}
            muted={isMuted}
            autoplay={autoplay}
            loop={loop}
            volume={volume}
            playbackRate={playbackRate}
            brightness={brightness}
            preferredQuality={settings.preferredQuality}
            instantStart={instantStart}
            // IP6: neighbors that shouldLoad also use preload=auto so HLS buffers before swipe
            // Progressive MP4 neighbors only fetch metadata so they don't starve the active reel's bandwidth;
            // adaptive (HLS/DASH) neighbors keep buffering because hls.js caps how much they pull.
            preload={isActive || (shouldLoad && /\.(m3u8|mpd)(\?|$)/i.test(src)) ? 'auto' : 'metadata'}
            isActive={isActive && !loadError}
            videoClassName={isActive ? '' : 'pointer-events-none'}
            onLoadedMetadata={(d, r) => {
              const next = resolveMediaDuration(d, Number(reel.durationSec) || 0);
              if (next > 0) {
                durationRef.current = next;
                setDuration(next);
                paintProgress(videoRef.current?.currentTime || 0, next);
              }
              if (onVideoRatioChange) onVideoRatioChange(r);
              setLoadError(false);
            }}
            onPlay={() => {
              hadPlayRef.current = true;
              if (showHandoffCover) setShowHandoffCover(false);
              if (ttffRecordedRef.current || !isActive) return;
              const started = activeAtRef.current;
              if (started == null) return;
              ttffRecordedRef.current = true;
              recordInstantTtff({
                reelId: String(reel.id || ''),
                ttffMs: Math.max(0, Math.round(performance.now() - started)),
              });
            }}
            onTimeUpdate={(t, d) => {
              if (seekingRef.current) return;
              const nextDur = resolveMediaDuration(d, durationRef.current || Number(reel.durationSec) || 0);
              if (nextDur > 0 && nextDur !== durationRef.current) {
                durationRef.current = nextDur;
                setDuration(nextDur);
              }
              const dur = durationRef.current || nextDur;
              paintProgress(t, dur);
              const now = performance.now();
              if (now - lastNotifyRef.current >= TIME_NOTIFY_MS) {
                lastNotifyRef.current = now;
                setCurrent(t);
                onTimeRef.current(t, dur);
              }
            }}
            onError={onPlaybackError}
            onEnded={onEnded}
          />
          {isActive && showHandoffCover && handoffPoster ? (
            <div className="pointer-events-none absolute inset-0 z-[15] bg-black" aria-hidden="true">
              <img src={handoffPoster} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          {loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <p className="relative z-10 text-sm font-semibold text-white">Couldn't load this reel.</p>
              <div className="relative z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); retryLoad(); }}
                  className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black"
                >
                  Retry
                </button>
                {onSkip ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSkip(); }}
                    className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white"
                  >
                    Skip
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="relative z-10 h-full w-full bg-black">
          {poster ? (
            <img src={poster} alt="" className="h-full w-full object-cover opacity-60" />
          ) : null}
        </div>
      )}

      {isActive && onTogglePlay && playFlash && !scrubbing && !loadError && (
        <div
          data-reel-play
          data-reel-play-flash={playFlash}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] animate-in fade-in zoom-in-95 duration-200"
        >
          {playFlash === 'pause' ? (
            <Pause size={52} fill="currentColor" strokeWidth={1.5} />
          ) : (
            <Play size={52} fill="currentColor" strokeWidth={1.5} className="ml-1" />
          )}
        </div>
      )}

      {showProgress && !loadError && (
        <div
          data-reel-scrub
          role="slider"
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className={`absolute bottom-0 left-0 z-50 px-2.5 pt-4 pointer-events-auto cursor-pointer select-none touch-none ${
            scrubEndInset ? 'right-14' : 'right-0'
          }`}
          style={{ paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom) * 0.4))' }}
          onPointerDown={startBarScrub}
          onPointerMove={moveBarScrub}
          onPointerUp={endBarScrub}
          onPointerCancel={endBarScrub}
          onLostPointerCapture={endBarScrub}
        >
          <span
            ref={timeLabelRef}
            data-reel-time
            aria-label="Video time"
            className="mb-1.5 inline-block border-0 bg-transparent px-0 py-0 text-[10px] font-bold tabular-nums text-white opacity-100 shadow-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
          >
            {duration > 0 ? `${formatReelTime(current)} / ${formatReelTime(duration)}` : '0:00 / —'}
          </span>
          <div className={`w-full rounded-full bg-white/20 transition-[height] duration-200 motion-reduce:transition-none ${seeking || scrubbing ? 'h-[5px]' : 'h-[2.5px] hover:h-[5px]'}`}>
            <div ref={fillRef} className="relative h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" style={{ width: `${percent}%` }}>
              <span className={`absolute right-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-opacity ${seeking || scrubbing ? 'opacity-100 scale-110' : 'opacity-0 group-hover/reel:opacity-100'}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function requestReelFullscreen(node: HTMLElement | null) {
  if (!node) return;
  if (document.fullscreenElement) await document.exitFullscreen();
  else await node.requestFullscreen();
}
