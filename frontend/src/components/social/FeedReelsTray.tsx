import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Clapperboard, Plus } from 'lucide-react';
import { openFeedVideoInReels, stashFeedHandoffSnapshot } from '../../lib/openReel';
import { FeedVideoChrome } from './FeedAutoplayVideo';
import {
  isActiveReelPreview,
  isMostlyBlackImage,
  seekReelPreviewPoster,
  stopReelPreview,
} from '../../lib/reelPreviewPlayback';
import {
  claimExclusivePlayback,
  isFinePointerHover,
  subscribeExclusivePlayback,
} from '../../lib/exclusiveMediaPlayback';
import {
  clearVisibleMedia,
  reportVisibleMedia,
  setHoveredMedia,
  visibilityCenterScore,
} from '../../lib/visibleMediaPlayback';
import { pickPreviewVideoSrc } from '../../lib/reelsPrefs';

/**
 * Home/feed Reels tray. Most-visible tile (toward screen center) autoplays muted;
 * on desktop, the tile under the mouse cursor takes priority.
 * Click opens the full Reels player. Sound icon is hidden.
 */
export default function FeedReelsTray({
  mediaActive = true,
}: { mediaActive?: boolean }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mediaActive) return;
    stopReelPreview();
  }, [mediaActive]);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reels/feed', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          if (!cancelled) setReels(list.slice(0, 20));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const openReel = (reel?: any, videoEl?: HTMLVideoElement | null) => {
    if (reel?.id) {
      if (videoEl) {
        stashFeedHandoffSnapshot({
          src: videoEl.currentSrc || videoEl.getAttribute('src') || reel.videoUrl,
          currentTime: videoEl.currentTime,
          poster: videoEl.getAttribute('poster') || reel.thumbnailUrl,
        });
      }
      openFeedVideoInReels(navigate, {
        id: reel.id,
        source: reel.source === 'post' ? 'post' : 'reel',
        videoUrl: reel.videoUrl,
        hlsUrl: reel.hlsUrl,
        thumbnailUrl: reel.thumbnailUrl,
        caption: reel.caption || reel.description,
        user: reel.user,
        mediaFiles: reel.mediaFiles,
      });
    } else {
      navigate('/reels');
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clapperboard size={18} className="text-primary" />
          <h3 className="font-bold text-sm truncate">{trLabel(t, 'Reels', 'Reels')}</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto items-start">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[120px] sm:w-[140px] h-[213px] sm:h-[249px] rounded-2xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clapperboard size={18} className="text-primary" />
            <h3 className="font-bold text-sm truncate">{trLabel(t, 'Reels', 'Reels')}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openReel()}
          className="flex items-center gap-3 w-full text-left rounded-xl border border-dashed border-border/70 px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Plus size={22} />
          </div>
          <div>
            <p className="text-sm font-bold truncate">{trLabel(t, 'CreateAReel', 'Create a Reel')}</p>
            <p className="text-xs text-muted-foreground truncate">{trLabel(t, 'ShareShortVideo', 'Share a short video with friends')}</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-3 sm:p-4 group/reels-tray">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <Clapperboard size={18} className="text-primary" />
          <h3 className="font-extrabold text-sm sm:text-base truncate">{trLabel(t, 'Reels', 'Reels')}</h3>
        </div>
        <button
          type="button"
          onClick={() => openReel()}
          className="text-xs sm:text-sm font-semibold text-primary hover:underline"
        >
          See all
        </button>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-280)}
        aria-label={trLabel(t, 'ScrollReelsLeft', 'Scroll reels left')}
        className="absolute left-1 top-1/2 z-20 w-9 h-9 -translate-y-1/2 mt-3 bg-background/90 backdrop-blur-xl rounded-full shadow-lg border border-border/80 hidden md:flex items-center justify-center opacity-0 group-hover/reels-tray:opacity-100 hover:scale-110 transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(280)}
        aria-label={trLabel(t, 'ScrollReelsRight', 'Scroll reels right')}
        className="absolute right-1 top-1/2 z-20 w-9 h-9 -translate-y-1/2 mt-3 bg-background/90 backdrop-blur-xl rounded-full shadow-lg border border-border/80 hidden md:flex items-center justify-center opacity-0 group-hover/reels-tray:opacity-100 hover:scale-110 transition-all"
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={scrollRef}
        className="flex items-start gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar snap-x pb-1 w-full min-w-0"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/reels/create')}
          className="flex-shrink-0 w-[120px] sm:w-[140px] h-[213px] sm:h-[249px] rounded-2xl overflow-hidden snap-start relative border border-border/70 bg-muted/40"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-fuchsia-500/20" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 gap-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Plus size={22} />
            </div>
            <span className="text-xs font-bold text-white truncate">{trLabel(t, 'CreateReel', 'Create reel')}</span>
          </div>
        </motion.button>

        {reels.map((reel) => (
          <ReelPreviewCard
            key={`${reel.source || 'reel'}-${reel.id}`}
            reel={reel}
            onOpen={(videoEl) => openReel(reel, videoEl)}
            mediaActive={mediaActive}
          />
        ))}
      </div>
    </div>
  );
}

function ReelPreviewCard({
  reel,
  onOpen,
  mediaActive = true,
}: {
  reel: any;
  onOpen: (videoEl?: HTMLVideoElement | null) => void;
  mediaActive?: boolean;
}) {
  const hostRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const keyRef = useRef(`reel-tray:${reel.source || 'reel'}:${reel.id}`);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [useServerThumb, setUseServerThumb] = useState(Boolean(reel.thumbnailUrl));

  useEffect(() => {
    keyRef.current = `reel-tray:${reel.source || 'reel'}:${reel.id}`;
  }, [reel.id, reel.source]);

  useEffect(() => {
    if (useServerThumb || playing) return;
    const video = videoRef.current;
    if (!video) return;
    const park = () => seekReelPreviewPoster(video);
    if (video.readyState >= 1) park();
    else video.addEventListener('loadedmetadata', park, { once: true });
    return () => video.removeEventListener('loadedmetadata', park);
  }, [useServerThumb, playing, reel.videoUrl]);

  useEffect(() => {
    return subscribeExclusivePlayback((el) => {
      const mine = videoRef.current;
      if (!mine || el === mine) return;
      setPlaying(false);
      setMuted(true);
      if (!useServerThumb) seekReelPreviewPoster(mine);
    });
  }, [useServerThumb]);

  useEffect(() => {
    const host = hostRef.current;
    const video = videoRef.current;
    if (!host || !video) return;
    const key = keyRef.current;

    if (!mediaActive) {
      clearVisibleMedia(key);
      stopReelPreview(video);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPlaying(false);
      setMuted(true);
      if (!useServerThumb) seekReelPreviewPoster(video);
      return;
    }

    const claim = () => {
      setMuted(true);
      setPlaying(true);
      video.muted = true;
      video.volume = 0;
      if (video.paused || video.ended) {
        try {
          video.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      claimExclusivePlayback(video).then((ok) => {
        if (!ok || !isActiveReelPreview(video)) setPlaying(false);
      });
    };
    const release = () => {
      stopReelPreview(video);
      setPlaying(false);
      setMuted(true);
      if (!useServerThumb) seekReelPreviewPoster(video);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const score = visibilityCenterScore(entry.boundingClientRect, entry.intersectionRatio);
        reportVisibleMedia({
          key,
          score,
          minScore: 0.35,
          claim,
          release,
        });
      },
      { threshold: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1] },
    );

    observer.observe(host);
    return () => {
      observer.disconnect();
      clearVisibleMedia(key);
      stopReelPreview(video);
    };
  }, [reel.videoUrl, useServerThumb, mediaActive]);

  return (
    <motion.button
      ref={hostRef}
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(videoRef.current)}
      onMouseEnter={() => {
        if (!mediaActive || !isFinePointerHover()) return;
        setHoveredMedia(keyRef.current);
      }}
      onMouseLeave={() => {
        if (!isFinePointerHover()) return;
        setHoveredMedia(null);
      }}
      className="flex-shrink-0 w-[120px] sm:w-[140px] h-[213px] sm:h-[249px] rounded-2xl overflow-hidden snap-start relative bg-black border border-border/50 group"
    >
      {reel.thumbnailUrl && useServerThumb ? (
        <img
          src={reel.thumbnailUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover ${playing ? 'opacity-0' : 'opacity-100'}`}
          onLoad={(e) => {
            if (isMostlyBlackImage(e.currentTarget)) {
              setUseServerThumb(false);
              seekReelPreviewPoster(videoRef.current);
            }
          }}
          onError={() => {
            setUseServerThumb(false);
            seekReelPreviewPoster(videoRef.current);
          }}
        />
      ) : null}
      <video
        ref={videoRef}
        src={pickPreviewVideoSrc(reel)}
        poster={useServerThumb ? reel.thumbnailUrl || undefined : undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover bg-black"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          if (!useServerThumb) seekReelPreviewPoster(e.currentTarget);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          if (videoRef.current && !isActiveReelPreview(videoRef.current)) {
            setPlaying(false);
            if (!useServerThumb) seekReelPreviewPoster(videoRef.current);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />
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
            const next = !muted;
            setMuted(next);
            if (videoRef.current) videoRef.current.muted = next;
          }}
        />
      )}
    </motion.button>
  );
}
