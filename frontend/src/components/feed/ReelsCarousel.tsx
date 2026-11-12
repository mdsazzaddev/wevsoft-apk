import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import { memo, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { observeFeedDwell, trackFeedInteraction } from '../../lib/AnalyticsTracker';
import { openFeedVideoInReels, stashFeedHandoffSnapshot } from '../../lib/openReel';
import { FeedVideoChrome } from '../social/FeedAutoplayVideo';
import {
  isActiveReelPreview,
  isFinePointerHover,
  isMostlyBlackImage,
  playReelPreviewWithSound,
  seekReelPreviewPoster,
  stopReelPreview,
} from '../../lib/reelPreviewPlayback';
import { subscribeExclusivePlayback } from '../../lib/exclusiveMediaPlayback';
import { acquirePostMusicSuspend } from '../../lib/postMusicPlayback';
import { refreshVisibleMedia } from '../../lib/visibleMediaPlayback';
import { pickPreviewVideoSrc } from '../../lib/reelsPrefs';

export type FeedReel = {
  id: string;
  videoUrl: string;
  hlsUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string;
  category?: string | null;
  mediaFiles?: Array<{ url?: string; quality?: string; kind?: string }>;
  user?: { id: string; name: string; avatar?: string; username?: string; handle?: string };
  space?: { id: string; name: string; avatar?: string; handle?: string; username?: string };
  source?: 'reel' | 'post';
};

/**
 * "Reels for you" tile — desktop hover plays with sound; click opens full Reels.
 * Mobile: first tap plays with sound, second tap opens.
 */
function ReelTile({ reel }: { reel: FeedReel; key?: string }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLButtonElement>(null);
  const musicSuspendRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [useServerThumb, setUseServerThumb] = useState(Boolean(reel.thumbnailUrl));
  const lastTimeUpdateRef = useRef(0);

  const releaseMusicSuspend = () => {
    musicSuspendRef.current?.();
    musicSuspendRef.current = null;
  };

  useEffect(() => {
    if (!hostRef.current) return;
    return observeFeedDwell(hostRef.current, { targetId: reel.id, targetType: 'REEL', categoryId: reel.category });
  }, [reel.id, reel.category]);

  useEffect(() => {
    if (useServerThumb || playing) return;
    const video = ref.current;
    if (!video) return;
    const park = () => seekReelPreviewPoster(video);
    if (video.readyState >= 1) park();
    else video.addEventListener('loadedmetadata', park, { once: true });
    return () => video.removeEventListener('loadedmetadata', park);
  }, [useServerThumb, playing, reel.videoUrl]);

  useEffect(() => {
    return subscribeExclusivePlayback((el) => {
      const mine = ref.current;
      if (!mine || el === mine) return;
      releaseMusicSuspend();
      setPlaying(false);
      setMuted(true);
      if (!useServerThumb) seekReelPreviewPoster(mine);
    });
  }, [useServerThumb]);

  useEffect(() => {
    return () => {
      releaseMusicSuspend();
      stopReelPreview(ref.current);
    };
  }, []);

  const stop = () => {
    releaseMusicSuspend();
    stopReelPreview(ref.current);
    setPlaying(false);
    setMuted(true);
    if (!useServerThumb) seekReelPreviewPoster(ref.current);
    refreshVisibleMedia();
  };

  const start = () => {
    const video = ref.current;
    if (!video) return;
    // Hover/tap preview with sound — silence nearby post soundtracks.
    if (!musicSuspendRef.current) {
      musicSuspendRef.current = acquirePostMusicSuspend();
    }
    setMuted(false);
    setPlaying(true);
    playReelPreviewWithSound(video).then(() => {
      if (!isActiveReelPreview(video)) {
        releaseMusicSuspend();
        setPlaying(false);
        return;
      }
      if (video.muted) setMuted(true);
      else setMuted(false);
    });
  };

  const open = () => {
    trackFeedInteraction({ targetId: reel.id, targetType: 'REEL', categoryId: reel.category, actionType: 'CLICK' });
    const el = ref.current;
    if (el) {
      stashFeedHandoffSnapshot({
        src: el.currentSrc || el.getAttribute('src') || reel.videoUrl,
        currentTime: el.currentTime,
        poster: el.getAttribute('poster') || reel.thumbnailUrl,
      });
    }
    openFeedVideoInReels(navigate, {
      id: reel.id,
      source: reel.source || 'reel',
      videoUrl: reel.videoUrl,
      hlsUrl: reel.hlsUrl,
      thumbnailUrl: reel.thumbnailUrl,
      caption: reel.caption,
      user: reel.user,
      mediaFiles: reel.mediaFiles,
    });
  };

  return (
    <div className="relative flex-shrink-0 w-[136px] sm:w-[158px] snap-start">
      <button
        ref={hostRef}
        type="button"
        onMouseEnter={start}
        onMouseLeave={stop}
        onFocus={start}
        onBlur={stop}
        onClick={(e) => {
          if (isFinePointerHover()) {
            open();
            return;
          }
          e.preventDefault();
          if (playing) open();
          else start();
        }}
        className="relative h-[242px] sm:h-[281px] w-full overflow-hidden rounded-2xl bg-black text-left group border border-fuchsia-500/30 shadow-[0_0_0_1px_rgba(217,70,239,0.12)] ring-1 ring-fuchsia-500/10"
        aria-label={reel.caption ? `Open reel: ${reel.caption}` : 'Open reel'}
      >
        {reel.thumbnailUrl && useServerThumb ? (
          <img
            src={reel.thumbnailUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${playing ? 'opacity-0' : 'opacity-100'}`}
            onLoad={(e) => {
              if (isMostlyBlackImage(e.currentTarget)) {
                setUseServerThumb(false);
                seekReelPreviewPoster(ref.current);
              }
            }}
            onError={() => {
              setUseServerThumb(false);
              seekReelPreviewPoster(ref.current);
            }}
          />
        ) : null}
        <video
          ref={ref}
          src={pickPreviewVideoSrc(reel)}
          poster={useServerThumb ? reel.thumbnailUrl || undefined : undefined}
          muted={muted}
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            if (!useServerThumb) seekReelPreviewPoster(e.currentTarget);
          }}
          onTimeUpdate={(e) => {
            const now = performance.now();
            const ct = e.currentTarget.currentTime || 0;
            const d = e.currentTarget.duration || 0;
            if (now - lastTimeUpdateRef.current > 250 || ct === 0 || ct >= d) {
              setCurrentTime(ct);
              lastTimeUpdateRef.current = now;
            }
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            if (ref.current && !isActiveReelPreview(ref.current)) {
              setPlaying(false);
              if (!useServerThumb) seekReelPreviewPoster(ref.current);
            }
          }}
        />
        {playing && (
          <FeedVideoChrome
            compact
            lengthOnHover
            showMute={false}
            muted={muted}
            duration={duration}
            currentTime={currentTime}
            onToggleMute={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const video = ref.current;
              const next = !muted;
              setMuted(next);
              if (video) video.muted = next;
            }}
          />
        )}
      </button>
    </div>
  );
}

export default memo(function ReelsCarousel({
  reels,
  title,
}: {
  reels: FeedReel[];
  title?: string;
}) {
  const { t } = useTranslation();
  const heading = title || trLabel(t, 'ReelsForYou', 'Reels for you');
  if (!reels?.length) return null;
  return (
    <section className="rounded-none border-y border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/8 via-card to-card px-3 py-3 md:rounded-3xl md:border md:border-fuchsia-500/25 md:px-4 md:py-4 md:shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clapperboard size={18} className="text-fuchsia-500 shrink-0" aria-hidden />
          <h2 className="text-sm font-extrabold text-foreground truncate">{heading}</h2>
        </div>
        <Link to="/reels" className="text-[11px] font-bold text-fuchsia-600 hover:underline dark:text-fuchsia-300 shrink-0">
          {trLabel(t, 'WatchAll', 'Watch all')}
        </Link>
      </div>
      <div className="flex items-start snap-x gap-2.5 overflow-x-auto pb-1 no-scrollbar min-w-0 w-full">
        {reels.map((reel) => (
          <ReelTile key={reel.id} reel={reel} />
        ))}
      </div>
    </section>
  );
});
