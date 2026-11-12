import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, MoreHorizontal, ChevronLeft, ChevronRight, Play, Pause, Send,
  Volume2, VolumeX, Eye, Trash2, Flag, Copy, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import FitStoryCanvas, { studioSlideFromStory } from '../storyStudio/render/FitStoryCanvas';
import StoryPollSticker, { type StoryPollApi } from './storyPoll/StoryPollSticker';
import StoryPollInsightsSheet from './storyPoll/StoryPollInsightsSheet';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';

interface StoryViewerProps {
  storyGroups: any[];
  initialGroupIndex: number;
  onClose: () => void;
  onComplete: () => void;
}

const REACT_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥'] as const;

function mediaOf(story: any) {
  return story?.media?.[0] || null;
}

function isVideoStory(story: any) {
  const m = mediaOf(story);
  return m?.type === 'video' || story?.type === 'video';
}

function isImageStory(story: any) {
  const m = mediaOf(story);
  return m?.type === 'image' || story?.type === 'photo' || story?.type === 'image';
}

function isTextStory(story: any) {
  return story?.type === 'text' || (!mediaOf(story) && story?.content);
}

function profilePathFor(u: any, currentUserId?: string | null) {
  if (!u) return null;
  if (currentUserId && u.id === currentUserId) return '/profile';
  const handle = u.profileSlug || u.username || u.id;
  return handle ? `/u/${handle}` : null;
}

export default function StoryViewer({ storyGroups, initialGroupIndex, onClose, onComplete }: StoryViewerProps) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [groups, setGroups] = useState(storyGroups);
  const [mounted, setMounted] = useState(false);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [flyingReactions, setFlyingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pollData, setPollData] = useState<StoryPollApi | null>(null);
  const [showPollInsights, setShowPollInsights] = useState(false);
  const [pollInteracting, setPollInteracting] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or misleading');
  const [busy, setBusy] = useState(false);
  const reactionIdCounter = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.items[storyIndex];
  const media = mediaOf(currentStory);
  // Stories made in Story Studio carry their design in media.config and render through the shared canvas.
  const studioSlide = studioSlideFromStory(media);
  const pollOverlayIds = (studioSlide?.overlays || []).filter((o) => o.kind === 'poll').map((o) => o.id);
  const isOwner = Boolean(user?.id && currentGroup?.user?.id === user.id);
  const overlayOpen = showViewers || showMenu || showReport || showPollInsights || pollInteracting;

  const STORY_DURATION =
    studioSlide && studioSlide.media?.type !== 'video'
      ? Math.round(studioSlide.duration * 1000)
      : isVideoStory(currentStory) && videoDurationMs
      ? Math.min(Math.max(videoDurationMs, 1500), 60000)
      : isVideoStory(currentStory)
        ? 15000
        : 5000;

  const progressRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  const ownerProfilePath = profilePathFor(currentGroup?.user, user?.id);

  const openOwnerProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentGroup?.sponsored) {
      const handle = currentGroup?.user?.username || currentStory?.space?.handle;
      if (!handle) return;
      onClose();
      navigate(`/space/@${handle}`);
      return;
    }
    if (!ownerProfilePath) return;
    onClose();
    navigate(ownerProfilePath);
  };

  const openUserProfile = (u: any) => {
    const path = profilePathFor(u, user?.id);
    if (!path) return;
    onClose();
    navigate(path);
  };


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    setPollData(null);
    setShowPollInsights(false);
    setPollInteracting(false);
    if (!currentStory?.id || currentStory?.sponsored) return;
    let cancelled = false;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    (async () => {
      try {
        const res = await fetch(`/api/stories/${currentStory.id}/poll`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.id) setPollData(data);
      } catch {
        /* no poll */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStory?.id, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (overlayOpen) setIsPaused(true);
  }, [overlayOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setProgress(0);
    progressRef.current = 0;
    if (!overlayOpen) setIsPaused(false);
    setVideoDurationMs(null);
    setMyReactions([]);
    setViewCount(0);
    setViewers([]);
    setShowViewers(false);
    setShowMenu(false);
    setShowReport(false);

    if (!currentStory || !token) return;
    if (currentStory.sponsored || currentGroup?.sponsored) {
      const eventId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      fetch('/api/ads/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'impression',
          eventId,
          adId: currentStory.adId,
          campaignId: currentStory.campaignId,
          placement: 'STORY',
        }),
      }).catch(() => {});
      return;
    }

    fetch(`/api/stories/${currentStory.id}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);

    if (!isOwner) {
      fetch(`/api/stories/${currentStory.id}/react`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.reactions) setMyReactions(d.reactions);
        })
        .catch(() => {});
    } else {
      fetch(`/api/stories/${currentStory.id}/viewers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setViewCount(d.viewCount || 0);
            setViewers(d.viewers || []);
          }
        })
        .catch(() => {});
    }
  }, [groupIndex, storyIndex, currentStory?.id, token, isOwner]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideoStory(currentStory)) return;
    el.muted = isMuted;
    if (isPaused) {
      el.pause();
      return;
    }
    const tryPlay = async () => {
      try {
        el.muted = isMuted;
        await el.play();
      } catch {
        try {
          el.muted = true;
          setIsMuted(true);
          await el.play();
        } catch {
          /* ignore */
        }
      }
    };
    void tryPlay();
  }, [isPaused, isMuted, groupIndex, storyIndex, currentStory?.id]);

  const handleNext = () => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.items.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(groups[groupIndex - 1].items.length - 1);
    }
  };

  useEffect(() => {
    if (!currentStory || overlayOpen) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (!isPaused) {
        progressRef.current += (deltaTime / STORY_DURATION) * 100;
        if (progressRef.current >= 100) {
          handleNext();
        } else {
          setProgress(progressRef.current);
          animationRef.current = requestAnimationFrame(animate);
        }
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = undefined;
    };
  }, [currentStory?.id, isPaused, groupIndex, storyIndex, STORY_DURATION, overlayOpen]);

  const triggerFlyingReaction = (emoji: string) => {
    const id = reactionIdCounter.current++;
    setFlyingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFlyingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleReaction = async (emoji: string) => {
    if (!currentStory || isOwner) return;
    const already = myReactions.includes(emoji);
    if (!already && myReactions.length >= 5) {
      toast.error('Maximum 5 reactions');
      return;
    }
    triggerFlyingReaction(emoji);
    // optimistic
    setMyReactions((prev) =>
      already ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: emoji }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to react');
        // reload
        const r2 = await fetch(`/api/stories/${currentStory.id}/react`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d2 = await r2.json().catch(() => null);
        if (d2?.reactions) setMyReactions(d2.reactions);
        return;
      }
      if (data.reactions) setMyReactions(data.reactions);
    } catch {
      toast.error('Failed to react');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reply');
      }
      setReplyText('');
      toast.success('Reply sent in Messages');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reply');
    }
  };

  const openViewers = async () => {
    if (!currentStory || !isOwner) return;
    setShowViewers(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/viewers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setViewCount(d.viewCount || 0);
        setViewers(d.viewers || []);
      }
    } catch {
      toast.error('Failed to load viewers');
    }
  };

  const handleDelete = async () => {
    if (!currentStory || !isOwner || busy) return;
    if (!window.confirm('Delete this story?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('delete failed');
      toast.success('Story deleted');

      const nextGroups = groups
        .map((g, gi) => {
          if (gi !== groupIndex) return g;
          return { ...g, items: g.items.filter((_: any, i: number) => i !== storyIndex) };
        })
        .filter((g) => g.items.length > 0);

      if (nextGroups.length === 0) {
        onComplete();
        onClose();
        return;
      }

      setGroups(nextGroups);
      const newGi = Math.min(groupIndex, nextGroups.length - 1);
      setGroupIndex(newGi);
      setStoryIndex(0);
      setShowMenu(false);
      onComplete();
    } catch {
      toast.error('Failed to delete story');
    } finally {
      setBusy(false);
    }
  };

  const handleReport = async () => {
    if (!currentStory || isOwner || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'report failed');
      toast.success(data.alreadyReported ? 'Already reported' : 'Story reported');
      setShowReport(false);
      setShowMenu(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to report');
    } finally {
      setBusy(false);
    }
  };

  const copyStoryLink = async () => {
    try {
      const url = `${window.location.origin}/home?story=${currentStory?.id || ''}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
      setShowMenu(false);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (!mounted || !currentGroup || !currentStory) return null;

  const avatarSrc =
    currentGroup.user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentGroup.user?.name || 'User')}&background=random`;

  const ui = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black md:bg-black/85 flex items-center justify-center md:left-64 md:right-0"
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 p-3 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all backdrop-blur-md"
        aria-label="Close story"
      >
        <X size={22} />
      </button>

      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hidden md:flex items-center justify-center hover:scale-110 transition-transform bg-white/5 rounded-full backdrop-blur-md hover:bg-white/15 z-50"
        aria-label="Previous story"
      >
        <ChevronLeft size={36} />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hidden md:flex items-center justify-center hover:scale-110 transition-transform bg-white/5 rounded-full backdrop-blur-md hover:bg-white/15 z-50"
        aria-label="Next story"
      >
        <ChevronRight size={36} />
      </button>

      <div className="relative w-full h-[100dvh] md:h-[min(92dvh,920px)] md:w-[min(100%-2rem,420px)] md:rounded-[2rem] md:overflow-hidden md:border md:border-white/10 md:shadow-[0_0_60px_rgba(0,0,0,0.65)] bg-black flex flex-col">
        <div className="absolute top-0 left-0 w-full pt-[max(0.75rem,env(safe-area-inset-top))] px-3 flex gap-1 z-30">
          {currentGroup.items.map((_: any, i: number) => (
            <div key={i} className="h-0.5 flex-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-100 ease-linear"
                style={{
                  width: i === storyIndex ? `${progress}%` : i < storyIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-[max(1.75rem,calc(env(safe-area-inset-top)+1.25rem))] left-0 w-full px-3 flex items-center justify-between z-40 pointer-events-none">
          <button
            type="button"
            onClick={openOwnerProfile}
            disabled={!ownerProfilePath}
            className="flex items-center gap-2.5 pointer-events-auto text-left rounded-full pr-3 py-1 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-90"
            aria-label={`View ${currentGroup.user?.name || 'user'} profile`}
          >
            <div className="w-9 h-9 rounded-full border-2 border-white/90 overflow-hidden shadow-lg shrink-0 bg-zinc-800">
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm drop-shadow-md truncate max-w-[160px]">
                {currentGroup.user?.name || 'User'}
              </p>
              <p className="text-white/75 text-[11px] drop-shadow-md">
                {currentGroup?.sponsored || currentStory?.sponsored
                  ? 'Sponsored'
                  : currentStory?.createdAt
                    ? `${formatDistanceToNow(new Date(currentStory.createdAt))} ago`
                    : ''}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1 pointer-events-auto">
            {isVideoStory(currentStory) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((m) => !m);
                }}
                className="text-white p-2 drop-shadow-lg bg-black/25 rounded-full backdrop-blur-md hover:bg-black/45 transition-all"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="text-white p-2 drop-shadow-lg bg-black/25 rounded-full backdrop-blur-md hover:bg-black/45 transition-all"
              aria-label={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? <Play size={16} className="ml-0.5" /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(true);
              }}
              className="text-white p-2 drop-shadow-lg bg-black/25 rounded-full backdrop-blur-md hover:bg-black/45 transition-all"
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div
          className="absolute inset-0 bg-black"
          onPointerDown={() => {
            if (!overlayOpen) setIsPaused(true);
          }}
          onPointerUp={() => {
            if (!overlayOpen) setIsPaused(false);
          }}
          onPointerLeave={() => {
            if (!overlayOpen) setIsPaused(false);
          }}
          onPointerCancel={() => {
            if (!overlayOpen) setIsPaused(false);
          }}
        >
          {!overlayOpen && (
            <>
              <div className="absolute inset-y-0 left-0 w-[30%] z-20" onClick={handlePrev} />
              <div className="absolute inset-y-0 right-0 w-[30%] z-20" onClick={handleNext} />
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {studioSlide ? (
                <FitStoryCanvas
                  slide={studioSlide}
                  playing={!isPaused}
                  muted={isMuted}
                  autoPlay
                  hideOverlayIds={pollData ? pollOverlayIds : undefined}
                  onVideoMeta={(d) => setVideoDurationMs(d * 1000)}
                  onVideoEnded={handleNext}
                >
                  {pollData ? (
                    <StoryPollSticker
                      storyId={currentStory.id}
                      token={token}
                      poll={pollData}
                      onPollUpdate={setPollData}
                      onInteract={setPollInteracting}
                      onLoginRequired={() => {
                        onClose();
                        navigate('/auth');
                      }}
                      scale={1}
                    />
                  ) : null}
                </FitStoryCanvas>
              ) : isTextStory(currentStory) ? (
                <div
                  className="w-full h-full flex items-center justify-center p-8 sm:p-10 text-center"
                  style={{
                    backgroundColor: currentStory.backgroundColor || '#3b82f6',
                    fontFamily: currentStory.fontFamily || 'inherit',
                  }}
                >
                  <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold whitespace-pre-wrap drop-shadow-xl leading-relaxed max-w-full">
                    {currentStory.content}
                  </p>
                </div>
              ) : isImageStory(currentStory) && media?.url ? (
                <img
                  src={media.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  draggable={false}
                />
              ) : isVideoStory(currentStory) && media?.url ? (
                <div className="absolute inset-0 w-full h-full bg-black">
                  <UniversalVideoPlayer
                    key={media.url}
                    videoRef={videoRef}
                    src={media.url}
                    context="fullscreen"
                    muted={isMuted}
                    autoplay={!isPaused}
                    isActive={!isPaused}
                    loop={false}
                    preload="auto"
                    className="w-full h-full"
                    videoClassName="object-contain"
                    onLoadedMetadata={(d) => {
                      if (Number.isFinite(d) && d > 0) setVideoDurationMs(d * 1000);
                    }}
                    onEnded={handleNext}
                  />
                </div>
              ) : media?.url ? (
                <img
                  src={media.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  draggable={false}
                />
              ) : (
                <div className="text-white/60 text-sm">Unable to load story</div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none z-10" />
        </div>

        <div className="absolute bottom-28 right-4 w-16 h-64 pointer-events-none z-40 overflow-visible">
          <AnimatePresence>
            {flyingReactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                initial={{ opacity: 0, y: 50, x: Math.random() * 20 - 10, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                  y: -200 - Math.random() * 50,
                  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                  x: Math.random() * 40 - 20,
                  scale: [0.5, 1.5, 1.5, 1],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute bottom-0 text-4xl drop-shadow-xl"
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Owner: compact Viewers control (bottom-left) */}
        {isOwner && (
          <div className="absolute bottom-0 left-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={openViewers}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/45 hover:bg-black/60 border border-white/20 text-white backdrop-blur-xl transition-all shadow-lg"
              aria-label={`Viewers ${viewCount}`}
            >
              <Eye size={14} />
              <span className="text-[11px] font-semibold tracking-wide">Views</span>
              <span className="text-[11px] text-white/75 tabular-nums min-w-[1ch]">{viewCount}</span>
            </button>
            {pollData ? (
              <button
                type="button"
                onClick={() => {
                  setShowPollInsights(true);
                  setIsPaused(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/45 hover:bg-black/60 border border-white/20 text-white backdrop-blur-xl transition-all shadow-lg"
                aria-label="Poll insights"
              >
                <span className="text-[11px] font-semibold tracking-wide">Poll Insights</span>
              </button>
            ) : null}
          </div>
        )}

        {/* Viewer: reply + reactions — or sponsored CTA */}
        {!isOwner && (currentGroup?.sponsored || currentStory?.sponsored) && (
          <div className="absolute bottom-0 left-0 w-full p-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-30">
            <button
              type="button"
              className="w-full py-3 rounded-full bg-white text-black text-sm font-extrabold"
              onClick={(e) => {
                e.stopPropagation();
                const eventId =
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `ev_${Date.now()}`;
                if (token) {
                  fetch('/api/ads/events', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      kind: 'click',
                      eventId,
                      adId: currentStory.adId,
                      campaignId: currentStory.campaignId,
                      placement: 'STORY',
                    }),
                  })
                    .then((r) => r.json())
                    .then((body) => {
                      const url = body?.redirectUrl || currentStory?.space?.path || `/space/@${currentGroup?.user?.username || ''}`;
                      if (url) window.open(url, '_blank', 'noopener,noreferrer');
                    })
                    .catch(() => {});
                }
              }}
            >
              {currentStory?.creative?.cta === 'SHOP_NOW'
                ? 'Shop now'
                : currentStory?.creative?.cta === 'SIGN_UP'
                  ? 'Sign up'
                  : 'Learn more'}
            </button>
          </div>
        )}
        {!isOwner && !(currentGroup?.sponsored || currentStory?.sponsored) && (
          <div className="absolute bottom-0 left-0 w-full p-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-30 space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              {REACT_EMOJIS.map((emoji) => {
                const active = myReactions.includes(emoji);
                const locked = !active && myReactions.length >= 5;
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={locked}
                    onClick={() => handleReaction(emoji)}
                    className={`text-xl w-11 h-11 rounded-full border backdrop-blur-xl transition-all ${
                      active
                        ? 'bg-white/25 border-white/50 scale-110'
                        : locked
                          ? 'bg-black/20 border-white/10 opacity-40'
                          : 'bg-black/40 border-white/20 hover:scale-110'
                    }`}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <form onSubmit={handleReply} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => {
                    if (!overlayOpen) setIsPaused(false);
                  }}
                  placeholder={`Reply to ${currentGroup.user.name}...`}
                  className="w-full bg-black/40 border border-white/25 rounded-full py-3 pl-4 pr-11 text-white placeholder:text-white/55 focus:outline-none focus:border-white/50 backdrop-blur-xl transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-all"
                  aria-label="Send reply"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3-dot menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowMenu(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl"
              >
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Story options</p>
                  <button type="button" onClick={() => setShowMenu(false)} className="text-white/70 p-1">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={copyStoryLink}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white hover:bg-white/10 transition-colors text-sm"
                  >
                    <Copy size={18} className="text-white/70" />
                    Copy link
                  </button>
                  {ownerProfilePath && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onClose();
                        navigate(ownerProfilePath);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white hover:bg-white/10 transition-colors text-sm"
                    >
                      <ExternalLink size={18} className="text-white/70" />
                      View profile
                    </button>
                  )}
                  {isOwner ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                    >
                      <Trash2 size={18} />
                      Delete story
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowReport(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                    >
                      <Flag size={18} />
                      Report story
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report sheet */}
        <AnimatePresence>
          {showReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowReport(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold">Report story</p>
                  <button type="button" onClick={() => setShowReport(false)} className="text-white/70 p-1">
                    <X size={18} />
                  </button>
                </div>
                {['Spam or misleading', 'Harassment or hate', 'Nudity or sexual content', 'Violence', 'Other'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                      reportReason === reason
                        ? 'bg-white/15 border-white/40 text-white'
                        : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReport}
                  className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  Submit report
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewers panel */}
        <AnimatePresence>
          {showViewers && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowViewers(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-h-[70%] rounded-t-3xl bg-zinc-950 border-t border-white/10 flex flex-col"
              >
                <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Eye size={18} />
                      <p className="font-semibold">Viewers</p>
                      <span className="text-white/60 text-sm">{viewCount}</span>
                    </div>
                    <button type="button" onClick={() => setShowViewers(false)} className="text-white/70 p-1">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto overscroll-contain p-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {viewers.length === 0 ? (
                    <p className="text-center text-white/50 text-sm py-10">No viewers yet</p>
                  ) : (
                    viewers.map((v) => {
                      const u = v.user;
                      const av =
                        u?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'U')}&background=random`;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => openUserProfile(u)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                        >
                          <img src={av} alt="" className="w-11 h-11 rounded-full object-cover bg-zinc-800 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-sm truncate">{u?.name || 'User'}</p>
                            <p className="text-white/45 text-[11px]">
                              {v.viewedAt ? formatDistanceToNow(new Date(v.viewedAt)) + ' ago' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 text-base shrink-0">
                            {(v.reactions || []).slice(0, 5).map((r: string, i: number) => (
                              <span key={`${r}-${i}`}>{r}</span>
                            ))}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isOwner && token && pollData ? (
        <StoryPollInsightsSheet
          storyId={currentStory.id}
          token={token}
          open={showPollInsights}
          onClose={() => { setShowPollInsights(false); setPollInteracting(false); }}
        />
      ) : null}
    </motion.div>
  );

  return createPortal(ui, document.body);
}

