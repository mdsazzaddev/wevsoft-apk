import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { claimFeedVideoPlayback, releaseFeedVideoPlayback } from '../../lib/feedAutoplay';
import { isExclusivePlaying, isFinePointerHover } from '../../lib/exclusiveMediaPlayback';
import { clearVisibleMedia, reportVisibleMedia, setHoveredMedia, visibilityCenterScore } from '../../lib/visibleMediaPlayback';
import { feedVideoPlaceholderStyle, isPortraitRatio, nativeFeedVideoStyle, readVideoRatio } from '../../lib/videoPresentation';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import { VideoUnavailable } from '../ui/SafeImage';
import { isInstantPlaybackEnabled } from '../../lib/instantPlayback';
import { warmPlaybackUrl } from '../../lib/videoPrefetch';
import { isHlsUrl } from '../../lib/hlsPlayback';
import { stashFeedHandoffSnapshot } from '../../lib/openReel';
import { useValueChanged } from '../../hooks/useValueChanged';
import { resolveMediaDuration } from '../../lib/mediaDuration';
import { isPhoneDevice } from '../../lib/phoneLayout';
import {
  applyFeedVideoSound,
  getFeedVideoPreferMuted,
  getFeedVideoVolume,
  setFeedVideoPreferMuted,
} from '../../lib/feedVideoSound';

interface FeedAutoplayVideoProps {
  src: string;
  className?: string;
  autoplayEnabled: boolean;
  loop?: boolean;
  pauseOnScrollAway?: boolean;
  visibilityThreshold?: number;
  onOpen?: () => void;
  layout?: 'natural' | 'fill';
  forceMuted?: boolean;
  hideMuteControl?: boolean;
}

export function formatVideoClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FeedVideoChrome({
  muted,
  onToggleMute,
  duration,
  currentTime,
  compact = false,
  lengthOnHover = false,
  showMute = true,
}: {
  muted: boolean;
  onToggleMute: (e: React.MouseEvent) => void;
  duration: number;
  currentTime: number;
  compact?: boolean;
  lengthOnHover?: boolean;
  showMute?: boolean;
}) {
  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <>
      {showMute && (
      <span
        role="button"
        tabIndex={0}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        onClick={onToggleMute}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleMute(e as unknown as React.MouseEvent);
          }
        }}
        className={`absolute z-10 border-0 bg-transparent p-0 text-white shadow-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)] cursor-pointer pointer-events-auto ${
          compact ? 'top-1.5 right-1.5' : 'top-2.5 right-2.5'
        }`}
      >
        {muted ? <VolumeX size={compact ? 12 : 16} /> : <Volume2 size={compact ? 12 : 16} />}
      </span>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-10 pointer-events-none ${compact ? 'px-1.5 pb-1' : 'px-2.5 pb-2'} ${
          lengthOnHover
            ? 'opacity-0 group-hover:opacity-100 group-hover/feedvid:opacity-100 group-focus-within:opacity-100 group-focus-within/feedvid:opacity-100 [@media(hover:hover)]:transition-opacity'
            : ''
        }`}
      >
        {duration > 0 && (
          <span
            className={`inline-block rounded-md bg-black/65 text-white font-bold tabular-nums backdrop-blur-sm ${
              compact ? 'text-[9px] px-1 py-0.5 mb-1' : 'text-[11px] px-1.5 py-0.5 mb-1.5'
            }`}
          >
            {compact
              ? formatVideoClock(duration)
              : `${formatVideoClock(currentTime)} / ${formatVideoClock(duration)}`}
          </span>
        )}
        <div className={`w-full overflow-hidden rounded-full bg-white/25 ${compact ? 'h-[2px]' : 'h-1'}`}>
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );
}

export default function FeedAutoplayVideo({
  src,
  className = '',
  autoplayEnabled,
  loop = true,
  pauseOnScrollAway = true,
  visibilityThreshold = 0.28,
  onOpen,
  layout = 'natural',
  forceMuted = false,
  hideMuteControl = false,
}: FeedAutoplayVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const keyRef = useRef(`feed-vid:${src}:${Math.random().toString(36).slice(2, 9)}`);
  const lastScoreRef = useRef(0);
  const [nearViewport, setNearViewport] = useState(false);
  const phoneFeed = isPhoneDevice();
  const [muted, setMuted] = useState(() => forceMuted || getFeedVideoPreferMuted(phoneFeed));
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);
  /** The source 404'd / failed to decode: show a placeholder instead of a black box. */
  const [failed, setFailed] = useState(false);
  const srcChanged = useValueChanged(src);
  if (srcChanged && failed) setFailed(false);
  const lastTimeUpdateRef = useRef(0);
  /** After unmuted autoplay is blocked, stay muted on this element until a user gesture. */
  const unmuteBlockedRef = useRef(false);
  const effectivelyMuted = forceMuted || muted;
  const feedVolume = effectivelyMuted ? 0 : getFeedVideoVolume();
  const instantStart = isInstantPlaybackEnabled();

  // IP2 — when an HLS feed card nears the viewport, warm first segments
  useEffect(() => {
    if (!nearViewport || !instantStart || !isHlsUrl(src)) return;
    const saveData = typeof navigator !== 'undefined' && !!(navigator as any).connection?.saveData;
    if (saveData) return;
    const ac = new AbortController();
    void warmPlaybackUrl(src, { signal: ac.signal, maxSegments: 1, saveData });
    return () => ac.abort();
  }, [nearViewport, src, instantStart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setRatio(null);
    setDuration(0);
    setCurrentTime(0);
    keyRef.current = `feed-vid:${src}:${Math.random().toString(36).slice(2, 9)}`;
  }, [src]);

  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const key = keyRef.current;
    const claim = () => {
      if (!autoplayEnabled) return;
      if (unmuteBlockedRef.current && !forceMuted) {
        video.muted = true;
        video.volume = 0;
        setMuted(true);
      } else {
        const nextMuted = applyFeedVideoSound(video, { forceMuted, isPhone: phoneFeed });
        setMuted(nextMuted);
      }
      void claimFeedVideoPlayback(video).then((ok) => {
        if (ok || video.muted || forceMuted) return;
        // Browser blocked unmuted autoplay — keep session preference, mute this element until gesture.
        unmuteBlockedRef.current = true;
        video.muted = true;
        video.volume = 0;
        setMuted(true);
        void claimFeedVideoPlayback(video);
      });
    };
    const release = () => {
      if (pauseOnScrollAway || !autoplayEnabled) {
        video.pause();
        releaseFeedVideoPlayback(video);
      }
    };

    if (!autoplayEnabled) {
      clearVisibleMedia(key);
      release();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const ratioVisible = entry.intersectionRatio;
        setNearViewport(entry.isIntersecting || ratioVisible > 0.05);
        const score = visibilityCenterScore(entry.boundingClientRect, ratioVisible);
        lastScoreRef.current = score;
        reportVisibleMedia({
          key,
          score,
          minScore: visibilityThreshold,
          claim,
          release,
        });
      },
      { threshold: [0, 0.05, 0.15, 0.28, 0.4, 0.55, 0.7, 0.85, 1] },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearVisibleMedia(key);
      video.pause();
      releaseFeedVideoPlayback(video);
    };
  }, [autoplayEnabled, pauseOnScrollAway, visibilityThreshold, src, forceMuted, phoneFeed]);

  useEffect(() => {
    unmuteBlockedRef.current = false;
    const el = videoRef.current;
    if (!el) return;
    const nextMuted = applyFeedVideoSound(el, { forceMuted, isPhone: phoneFeed });
    setMuted(nextMuted);
  }, [forceMuted, src, phoneFeed]);

  const onHoverStart = () => {
    if (!autoplayEnabled || !isFinePointerHover()) return;
    setHoveredMedia(keyRef.current);
  };
  const onHoverEnd = () => {
    if (!isFinePointerHover()) return;
    setHoveredMedia(null);
  };

  const unlockFeedSound = () => {
    if (forceMuted) return;
    const el = videoRef.current;
    if (!el) return;
    unmuteBlockedRef.current = false;
    el.muted = false;
    el.volume = getFeedVideoVolume();
    setMuted(false);
    setFeedVideoPreferMuted(false, phoneFeed);
    if (autoplayEnabled) void claimFeedVideoPlayback(el);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceMuted) return;
    const el = videoRef.current;
    if (!el) return;
    const next = !el.muted;
    if (!next) {
      unmuteBlockedRef.current = false;
      el.muted = false;
      el.volume = getFeedVideoVolume();
      setMuted(false);
      setFeedVideoPreferMuted(false, phoneFeed);
      if (el.paused && autoplayEnabled) void claimFeedVideoPlayback(el);
      return;
    }
    el.muted = true;
    el.volume = 0;
    setMuted(true);
    setFeedVideoPreferMuted(true, phoneFeed);
  };

  if (failed) return <VideoUnavailable className={layout === 'natural' ? 'aspect-video' : 'h-full'} />;

  const natural = layout === 'natural';
  const boxStyle = natural
    ? (ratio ? nativeFeedVideoStyle(ratio) : feedVideoPlaceholderStyle())
    : undefined;

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden ${
        natural
          ? 'mx-auto'
          : 'w-full h-full flex items-center justify-center'
      } ${onOpen ? 'cursor-pointer' : ''} group/feedvid`}
      style={boxStyle}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onPointerDown={() => {
        if (phoneFeed) unlockFeedSound();
      }}
      onClick={(e) => {
        if (!onOpen) return;
        e.preventDefault();
        e.stopPropagation();
        const el = videoRef.current;
        stashFeedHandoffSnapshot({
          src: el?.currentSrc || el?.getAttribute('src') || src,
          currentTime: el?.currentTime ?? currentTime,
          poster: el?.getAttribute('poster') || undefined,
        });
        onOpen();
      }}
      role={onOpen ? 'link' : undefined}
    >
      <UniversalVideoPlayer
        videoRef={videoRef}
        src={src}
        context="feed"
        aspectRatio={ratio}
        muted={effectivelyMuted}
        volume={feedVolume}
        loop={loop}
        autoplay={false}
        isActive={nearViewport && autoplayEnabled}
        instantStart={instantStart}
        preload={nearViewport ? 'auto' : 'metadata'}
        className={className.replace(/object-(?:cover|contain|fill|none|scale-down)/g, '')}
        videoClassName="w-full h-full block"
        onError={() => setFailed(true)}
        onLoadedMetadata={(d, r) => {
          const next = resolveMediaDuration(d);
          if (next > 0) setDuration(next);
          if (r) setRatio(r);
        }}
        onTimeUpdate={(t, d) => {
          const nextDur = resolveMediaDuration(d);
          if (nextDur > 0) setDuration((prev) => (prev === nextDur ? prev : nextDur));
          const now = performance.now();
          if (now - lastTimeUpdateRef.current > 250 || t === 0 || (nextDur > 0 && t >= nextDur)) {
            setCurrentTime(t);
            lastTimeUpdateRef.current = now;
          }
        }}
        onPlay={(e) => {
          void claimFeedVideoPlayback(e.currentTarget);
        }}
        onPause={(e) => {
          if (isExclusivePlaying(e.currentTarget)) {
            releaseFeedVideoPlayback(e.currentTarget);
          }
        }}
        onVolumeChange={(e) => {
          // Local UI only — do not clear session unmute preference on autoplay fallback mute.
          if (forceMuted) return;
          setMuted(e.currentTarget.muted);
        }}
      >
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <FeedVideoChrome
            muted={effectivelyMuted}
            onToggleMute={toggleMute}
            duration={duration}
            currentTime={currentTime}
            lengthOnHover
            showMute={!hideMuteControl && !forceMuted}
          />
        </div>
        {onOpen && (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center opacity-0 group-hover/feedvid:opacity-100 transition-opacity bg-black/10">
            <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-black/55 backdrop-blur-md border border-white/20">
              Open in Reels
            </span>
          </div>
        )}
      </UniversalVideoPlayer>
    </div>
  );
}
