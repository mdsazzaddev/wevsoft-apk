import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { profilePathFor } from '../lib/profileLinks';
import { ChevronDown, ChevronUp, Heart, PlusCircle, Send, Video, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import ReelsSidebar, { type ReelsSidebarExtra } from '../components/reels/ReelsSidebar';
import ReelsDesktopChrome from '../components/reels/ReelsDesktopChrome';
import ReelsMobileHeader, { type ReelsFeedTab } from '../components/reels/ReelsMobileHeader';
import ReelPlayer from '../components/reels/ReelPlayer';
import ReelTapHearts, { type TapHeart } from '../components/reels/ReelTapHearts';
import ReelActionRail from '../components/reels/ReelActionRail';
import ReelHudIndicator, { type HudState } from '../components/reels/ReelHudIndicator';
import ReelsSearchPanel from '../components/reels/ReelsSearchPanel';
import { useReelGestures } from '../components/reels/useReelGestures';
import { useReelHotkeys } from '../components/reels/useReelHotkeys';
import { useReelChrome } from '../components/reels/useReelChrome';
import { enterReelFullscreen, exitReelFullscreen, useNativeFullscreen } from '../components/reels/ReelFullscreenControls';
import ShareModal from '../components/ShareModal';
import SponsoredAdCard from '../components/ads/SponsoredAdCard';
import { readReelsMuted, writeReelsMuted, readReelsVolume, writeReelsVolume } from '../lib/reelsMute';
import {
  applyVideoUnmute,
  armUnmuteOnGesture,
  consumeReelsAudioUnlockIntent,
  mediaGestureAllowsUnmute,
  markReelsAudioUnlockIntent,
} from '../lib/videoAutoplay';
import ReelVolumeSlider from '../components/reels/ReelVolumeSlider';
import { emitReelsPlayback } from '../components/reels/useAutoHide';
import { useReelsUiMode } from '../lib/reelsUiPrefs';
import {
  loadReelsSettings,
  getCachedReelsSettings,
  shouldAutoplay,
  type ReelsSettings,
} from '../lib/reelsPrefs';
import { applyOpenReelHandoffToReel, takeStashedReel } from '../lib/openReel';
import { isReactionType, type ReactionType } from '../lib/reactions';
import { useGovernanceSync } from '../hooks/useGovernanceSync';
import {
  canWarmPrefetch,
  resolvePrefetchAheadCount,
  shouldMountReelIndex,
  shouldPreloadReelIndex,
  resolveStickyUnloadMs,
} from '../lib/instantPlayback';
import { warmPlaybackUrl } from '../lib/videoPrefetch';
import { buildReelPlaybackSources } from '../lib/reelPlaybackSources';
import { getApiBaseUrl } from '../lib/apiBase';
import { startInstantTtffReporter } from '../lib/instantTtffReport';
import { useValueChanged } from '../hooks/useValueChanged';

type MainTab = ReelsFeedTab;
type ShareTarget = { id: string; source: 'reel' | 'post' };

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export default function ReelsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reelId: routeReelId } = useParams<{ reelId?: string }>();
  const startReelId = routeReelId || searchParams.get('v');
  const startReelSrc = searchParams.get('src');

  const token = useStore((s) => s.token);
  const isDesktop = useIsDesktop();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [reels, setReels] = useState<any[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('for-you');
  const [extraActive, setExtraActive] = useState<ReelsSidebarExtra | null>(null);

  /** Reel upload lives on the dedicated Creator page (/reels/create). */
  const openCreator = useCallback(() => navigate('/reels/create'), [navigate]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const [settings, setSettings] = useState<ReelsSettings>(() => getCachedReelsSettings());
  // Mobile / narrow preview: sound on by default (no volume chrome). Desktop remembers last mute.
  const [globalMuted, setGlobalMuted] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches
      ? false
      : readReelsMuted(false),
  );
  const [volume, setVolume] = useState(() => readReelsVolume(getCachedReelsSettings().defaultVolume ?? 0.8));
  const [brightness, setBrightness] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [holdRate, setHoldRate] = useState<number | null>(null);
  /** Nav/feed click that opened Reels — allow remute after muted autoplay fallback. */
  const [entrySoundUnlock] = useState(() =>
    typeof window !== 'undefined'
      ? consumeReelsAudioUnlockIntent() || mediaGestureAllowsUnmute()
      : false,
  );

  // Drop 2× when the user swipes to another reel (pointer may leave without up).
  const reelChanged = useValueChanged(activeReelIndex);
  if (reelChanged && holdRate !== null) setHoldRate(null);

  const isFullscreen = useNativeFullscreen(stageRef);
  // Mobile preview: full volume + sound on; volume icon lives only on desktop (left of frame).
  if (!isDesktop && volume < 1) setVolume(1);
  if (!isDesktop && globalMuted) setGlobalMuted(false);

  const lastStartIdRef = useRef<string | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef<boolean>(true);
  const loadingMoreRef = useRef<boolean>(false);
  const infiniteAllowedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef<number>(0);

  // IP9 — sampled TTFF flush to /api/video/instant-ttff for Admin Health
  useEffect(() => startInstantTtffReporter(() => token), [token]);

  // ---- settings ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadReelsSettings(token).then((s) => {
      if (cancelled) return;
      setSettings(s);
      setPlaybackRate(s.playbackSpeed || 1);
      if (typeof s.defaultVolume === 'number' && readReelsVolume(-1) < 0) setVolume(s.defaultVolume);
      if (s.soundMode === 'muted') setGlobalMuted(true);
      else if (s.soundMode === 'sound' || s.soundMode === 'auto_unmute') setGlobalMuted(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    writeReelsMuted(globalMuted);
  }, [globalMuted]);

  useEffect(() => {
    writeReelsVolume(volume);
  }, [volume]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ---- feed --------------------------------------------------------------
  const fetchReels = useCallback(
    async (reset = false) => {
      if (!reset && (!hasMoreRef.current || loadingMoreRef.current || !infiniteAllowedRef.current)) {
        return;
      }
      if (reset) {
        abortControllerRef.current?.abort();
        nextCursorRef.current = null;
        hasMoreRef.current = true;
        loadingMoreRef.current = false;
        setLoading(true);
      } else {
        loadingMoreRef.current = true;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const seq = ++fetchSeqRef.current;

      try {
        const qs = new URLSearchParams();
        if (mainTab === 'following') qs.set('tab', 'following');
        if (extraActive) qs.set('filter', extraActive);
        if (!reset && nextCursorRef.current) qs.set('cursor', nextCursorRef.current);
        const query = qs.toString();
        const res = await fetch(`/api/reels/feed${query ? `?${query}` : ''}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('feed');
        const data = await res.json();
        if (seq !== fetchSeqRef.current || controller.signal.aborted) return;

        let nextList: any[] = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        const nextCursor = typeof data?.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null;
        nextCursorRef.current = nextCursor;
        hasMoreRef.current = Boolean(nextCursor) && data?.hasMore !== false;
        infiniteAllowedRef.current = data?.governance?.infiniteScrollAllowed !== false;

        let startIdx = 0;
        if (reset) {
          const startId = startReelId;
          // IP7: always consume stash once so watchPosition/poster apply even when the reel is already in the feed.
          const stashed = startId ? takeStashedReel() : null;
          if (startId) {
            const found = nextList.findIndex((r: any) => String(r.id) === String(startId));
            if (found >= 0) {
              startIdx = found;
              if (stashed && String(stashed.id) === String(startId)) {
                nextList = nextList.map((r: any, i: number) =>
                  i === found ? applyOpenReelHandoffToReel(r, stashed) : r,
                );
              }
            } else if (stashed?.videoUrl || stashed?.hlsUrl) {
              const seeded = applyOpenReelHandoffToReel(
                {
                  id: stashed.id || startId,
                  source: stashed.source || (startReelSrc === 'post' ? 'post' : 'reel'),
                  videoUrl: stashed.videoUrl,
                  hlsUrl: stashed.hlsUrl || null,
                  thumbnailUrl: stashed.thumbnailUrl || null,
                  caption: stashed.caption || '',
                  description: stashed.caption || '',
                  user: stashed.user,
                  mediaFiles: stashed.mediaFiles || null,
                  likes: [],
                  _count: { likes: 0, comments: 0, shares: 0 },
                },
                stashed,
              );
              nextList = [seeded, ...nextList.filter((r: any) => String(r.id) !== String(seeded.id))];
              startIdx = 0;
            }
          }
          setReels(nextList);
          setActiveReelIndex(startIdx);
          pendingScrollRef.current = startIdx;
        } else if (nextList.length > 0) {
          setReels((prev) => {
            const seen = new Set(prev.map((r: any) => `${r.source || 'reel'}:${r.adId || r.id}`));
            const additions = nextList.filter((r: any) => {
              const key = `${r.source || 'reel'}:${r.adId || r.id}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || seq !== fetchSeqRef.current) return;
        if (reset) toast.error('Failed to load reels');
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [token, mainTab, extraActive, startReelId, startReelSrc],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void fetchReels(true);
  }, [mainTab, extraActive]);

  useGovernanceSync(() => {
    void fetchReels(true);
  });

  // Automatically prefetch the next page of reels when approaching the end of the current list
  useEffect(() => {
    if (loading || reels.length === 0) return;
    if (activeReelIndex >= reels.length - 4 && hasMoreRef.current && !loadingMoreRef.current) {
      void fetchReels(false);
    }
  }, [activeReelIndex, reels.length, loading, fetchReels]);

  // IP2/IP6 — warm next N reels' playlist + first segments before swipe
  useEffect(() => {
    if (!canWarmPrefetch({
      disablePreload: settings.disablePreload,
      dataSaver: settings.dataSaver,
      saveData: typeof navigator !== 'undefined' && !!(navigator as any).connection?.saveData,
    })) return;
    const ahead = resolvePrefetchAheadCount();
    if (ahead <= 0) return;
    const ac = new AbortController();
    const apiBase = getApiBaseUrl();
    for (let i = 1; i <= ahead; i++) {
      const next = reels[activeReelIndex + i];
      if (!next || next?.source === 'sponsored_ad' || next?.sponsored) continue;
      const sources = buildReelPlaybackSources(next, settings, apiBase);
      const url = sources[0];
      if (!url) continue;
      void warmPlaybackUrl(url, {
        signal: ac.signal,
        maxSegments: i === 1 ? 2 : 1,
        disablePreload: settings.disablePreload,
        dataSaver: settings.dataSaver,
      });
    }
    return () => ac.abort();
  }, [activeReelIndex, reels, settings]);

  // Deep-link change while already mounted (e.g. shared /reels/:id navigation)
  useEffect(() => {
    if (!startReelId || !reels.length) return;
    if (lastStartIdRef.current === startReelId) return;
    const idx = reels.findIndex((r: any) => String(r.id) === String(startReelId));
    if (idx >= 0) {
      lastStartIdRef.current = startReelId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setActiveReelIndex(idx);
      pendingScrollRef.current = idx;
    }
  }, [startReelId, reels]);

  // Perform the deferred scroll once the list is painted
  useEffect(() => {
    const idx = pendingScrollRef.current;
    if (idx == null) return;
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = idx * el.clientHeight;
      pendingScrollRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [reels]);

  // ---- active index tracking --------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const indexStr = (entry.target as HTMLElement).dataset.index;
            if (indexStr) {
              const index = parseInt(indexStr, 10);
              setActiveReelIndex((prev) => (prev !== index ? index : prev));
            }
          }
        });
      },
      { root: el, threshold: 0.5 }
    );

    const observeChildren = () => {
      if (!el) return;
      Array.from(el.children).forEach((child) => {
        if (child.classList.contains('reel-container-item')) {
          observer.observe(child);
        }
      });
    };

    observeChildren();

    const mutationObserver = new MutationObserver((mutations) => {
      let shouldReobserve = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldReobserve = true;
          break;
        }
      }
      if (shouldReobserve) observeChildren();
    });

    mutationObserver.observe(el, { childList: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [reels]);

  // Keep the address bar shareable without a full re-render
  useEffect(() => {
    const reel = reels[activeReelIndex];
    if (!reel?.id || reel.source === 'sponsored_ad' || reel.sponsored) return;
    const src = reel.source === 'post' ? '?src=post' : '';
    try {
      window.history.replaceState(window.history.state, '', `/reels/${reel.id}${src}`);
    } catch {
      /* ignore */
    }
  }, [activeReelIndex, reels]);

  // ---- navigation --------------------------------------------------------
  const scrollToIndex = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' });
  }, []);

  const goNext = useCallback(() => {
    setActiveReelIndex((prev) => {
      const next = Math.min(reels.length - 1, prev + 1);
      scrollToIndex(next);
      return next;
    });
  }, [reels.length, scrollToIndex]);

  const goPrev = useCallback(() => {
    setActiveReelIndex((prev) => {
      const next = Math.max(0, prev - 1);
      scrollToIndex(next);
      return next;
    });
  }, [scrollToIndex]);

  const skipCurrentReel = useCallback(() => {
    goNext();
  }, [goNext]);

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted((m) => {
      // Unmuting from a 0 level restores an audible volume.
      if (m) setVolume((v) => (v > 0.02 ? v : 0.5));
      return !m;
    });
  }, []);

  /** Slider: sets real volume; 0 = muted, any level > 0 unmutes. */
  const setVolumeLevel = useCallback((v: number) => {
    const next = Math.min(1, Math.max(0, v));
    if (next === 0) {
      setGlobalMuted(true);
    } else {
      setVolume(next);
      setGlobalMuted(false);
    }
  }, []);

  const toggleFullscreenMode = useCallback(async () => {
    try {
      if (isFullscreen) await exitReelFullscreen();
      else if (stageRef.current) await enterReelFullscreen(stageRef.current);
    } catch {
      /* ignore (iOS css-fs / unsupported) */
    }
  }, [isFullscreen]);

  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const registerActiveVideo = useCallback((el: HTMLVideoElement | null) => {
    activeVideoRef.current = el;
  }, []);

  useReelHotkeys(true, {
    onTogglePlay: () => {
      const v = activeVideoRef.current;
      if (!v) return;
      if (v.paused) void v.play().catch(() => {});
      else v.pause();
    },
    onSeekBy: (delta) => {
      const v = activeVideoRef.current;
      if (v && Number.isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    },
    onVolumeDelta: (d) => setVolume((val) => Math.min(1, Math.max(0, val + d))),
    onToggleMute: toggleGlobalMute,
    onFullscreen: toggleFullscreenMode,
    onExitFullscreen: () => void exitReelFullscreen(),
    onNext: goNext,
    onPrev: goPrev,
    onExit: isDesktop && !searchOpen && !menuOpen
      ? () => {
          const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
          if (idx > 0) navigate(-1);
          else navigate('/', { replace: true });
        }
      : undefined,
    isFullscreen,
  });

  const onExtraSelect = useCallback((id: ReelsSidebarExtra) => {
    setExtraActive((prev) => (prev === id ? null : id));
  }, []);

  const onMainSelect = useCallback((tab: MainTab) => {
    setExtraActive(null);
    setMainTab(tab);
  }, []);

  const openSearchReel = useCallback((items: any[], index: number) => {
    setSearchOpen(false);
    if (!Array.isArray(items) || !items.length) return;
    hasMoreRef.current = false;
    setReels(items);
    setActiveReelIndex(index);
    pendingScrollRef.current = index;
  }, []);

  const overlayActions = !isDesktop;
  const activeReel = reels[activeReelIndex];
  const [railHost, setRailHost] = useState<HTMLDivElement | null>(null);
  const [commentsHost, setCommentsHost] = useState<HTMLDivElement | null>(null);
  const volumeMode = useReelsUiMode('volume');
  const { t } = useTranslation();

  /** Outer shell keeps the same centered footprint; left chrome is absolute so it does not push the video. */
  const frameShellClass = isDesktop
    ? 'relative h-full aspect-[9/16] max-h-[min(100dvh,920px)] w-auto max-w-[min(100%,520px)]'
    : 'relative h-full w-full';
  const frameSurfaceClass = isDesktop
    ? 'absolute inset-0 overflow-hidden rounded-2xl bg-black shadow-2xl'
    : 'absolute inset-0 overflow-hidden bg-black';

  return (
    <div className={`relative flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden ${isDesktop ? 'bg-black' : 'bg-black'} text-white`}>
      <ReelsSidebar
        active={mainTab}
        onSelect={onMainSelect}
        onProfile={() => navigate('/profile')}
        onCreate={openCreator}
        extraActive={extraActive}
        onExtraSelect={onExtraSelect}
        onSearch={() => setSearchOpen(true)}
        mobileOpen={menuOpen}
        onMobileClose={closeMenu}
      />

      {searchOpen && (
        <ReelsSearchPanel
          open={searchOpen}
          token={token}
          onClose={() => setSearchOpen(false)}
          onOpenReel={openSearchReel}
        />
      )}

      <div className="relative flex-1 h-full min-w-0 flex items-center justify-center">
        <ReelsMobileHeader
          activeTab={mainTab}
          onTabChange={onMainSelect}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setSearchOpen(true)}
        />

        <ReelsDesktopChrome onSearch={() => setSearchOpen(true)} searchOpen={searchOpen} />

        {!overlayActions && (
          <div className="absolute right-4 lg:right-6 top-1/2 z-30 -translate-y-1/2 flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-neutral-900/70 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/60">
            <button
              type="button"
              aria-label="Previous reel"
              title="Previous reel (Up arrow)"
              onClick={goPrev}
              disabled={activeReelIndex <= 0}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/90 transition-all duration-200 hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none disabled:hover:bg-white/5"
            >
              <ChevronUp size={22} strokeWidth={2.4} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
            </button>
            <div className="w-4 h-px bg-white/15" aria-hidden="true" />
            <button
              type="button"
              aria-label="Next reel"
              title="Next reel (Down arrow)"
              onClick={goNext}
              disabled={activeReelIndex >= reels.length - 1}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/90 transition-all duration-200 hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none disabled:hover:bg-white/5"
            >
              <ChevronDown size={22} strokeWidth={2.4} className="transition-transform duration-200 group-hover:translate-y-0.5" />
            </button>
          </div>
        )}

        <div
          ref={stageRef}
          className={`flex h-full w-full min-h-0 items-center justify-center ${overlayActions ? 'overflow-hidden px-0' : 'gap-4 overflow-visible px-2'}`}
        >
          <div className={frameShellClass}>
            {/* Desktop: volume + author outside the video, without shifting the centered frame. */}
            {!overlayActions && !isFullscreen ? (
              <div className="pointer-events-none absolute right-full top-0 bottom-0 z-30 mr-1.5 flex w-[min(220px,24vw)] flex-col justify-between items-end gap-3 pt-4 pb-8">
                {volumeMode !== 'hidden' ? (
                  <div className="pointer-events-auto">
                    <ReelVolumeSlider
                      volume={volume}
                      muted={globalMuted}
                      onChange={setVolumeLevel}
                      onToggleMute={toggleGlobalMute}
                      labels={{ volume: t('reels.volume', 'Volume'), mute: t('Mute', 'Mute'), unmute: t('reels.unmute', 'Unmute') }}
                    />
                  </div>
                ) : (
                  <span aria-hidden className="h-10 w-9 shrink-0" />
                )}
                {activeReel && !(activeReel.source === 'sponsored_ad' || activeReel.sponsored) ? (
                  <div className="pointer-events-auto w-auto max-w-full text-right text-white">
                    <ReelAuthorLink author={activeReel.user || activeReel.author} className="mb-2 flex items-center justify-end gap-2.5">
                      <img
                        src={
                          (activeReel.user || activeReel.author)?.avatar
                          || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(activeReel.user || activeReel.author)?.id || 'u'}`
                        }
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-white/70 object-cover"
                      />
                      <span className="truncate text-[14px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                        {(activeReel.user || activeReel.author)?.name
                          || (activeReel.user || activeReel.author)?.username
                          || 'Wevsoft'}
                      </span>
                    </ReelAuthorLink>
                    {(activeReel.caption || activeReel.description || activeReel.content) ? (
                      <p className="line-clamp-3 text-[13px] leading-snug text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                        {activeReel.caption || activeReel.description || activeReel.content}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={frameSurfaceClass}>
            <div
              ref={containerRef}
              className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory no-scrollbar"
            >
              {!loading && reels.length === 0 && (
                <div className="flex flex-col h-full w-full items-center justify-center px-8 text-center">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <Video className="w-10 h-10 text-white/70" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Reels Found</h3>
                  <p className="text-white/70 text-sm max-w-sm mb-6">There are no short videos here yet. Create your first Reel and share your moments with the world.</p>
                  <button
                    type="button"
                    onClick={openCreator}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-semibold transition-colors"
                  >
                    <PlusCircle size={18} />
                    Create a Reel
                  </button>
                </div>
              )}

              {reels.map((reel, index) => {
                const dist = index - activeReelIndex;
                const shouldMount = shouldMountReelIndex(dist, !!settings.disablePreload);
                const preload = shouldPreloadReelIndex(dist, !!settings.disablePreload);

                if (reel?.source === 'sponsored_ad' || reel?.sponsored) {
                  return (
                    <div
                      key={`sponsored-${reel.adId || reel.id}`}
                      data-index={index}
                      className="reel-container-item h-full w-full snap-start snap-always flex items-center justify-center p-3 bg-black"
                    >
                      {shouldMount ? (
                        <div className="w-full max-w-md">
                          <SponsoredAdCard ad={{ ...reel, placement: 'REELS' }} />
                        </div>
                      ) : (
                        <div className="h-full w-full bg-black" aria-hidden="true" />
                      )}
                    </div>
                  );
                }

                if (!shouldMount) {
                  return (
                    <div
                      key={`${reel.source || 'reel'}-${reel.id}`}
                      data-index={index}
                      className="reel-container-item h-full w-full snap-start snap-always relative overflow-hidden bg-black"
                      aria-hidden="true"
                    >
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-50" loading="lazy" />
                      ) : null}
                    </div>
                  );
                }

                return (
                  <ReelItem
                    key={`${reel.source || 'reel'}-${reel.id}`}
                    dataIndex={index}
                    reel={reel}
                    preload={preload}
                    isActive={index === activeReelIndex}
                    isDesktop={isDesktop}
                    overlayActions={overlayActions}
                    token={token}
                    isMuted={globalMuted}
                    entrySoundUnlock={entrySoundUnlock}
                    onToggleMute={toggleGlobalMute}
                    onSetVolume={setVolumeLevel}
                    settings={settings}
                    volume={volume}
                    brightness={brightness}
                    playbackRate={holdRate || playbackRate}
                    autoplayAllowed={shouldAutoplay(settings)}
                    onVolumeDelta={(d) => setVolume((v) => Math.min(1, Math.max(0, v + d)))}
                    onBrightnessDelta={(d) => setBrightness((b) => Math.min(1.6, Math.max(0.4, b + d)))}
                    onHoldSpeedStart={() => setHoldRate(2)}
                    onHoldSpeedEnd={() => setHoldRate(null)}
                    holdSpeedActive={holdRate != null && index === activeReelIndex}
                    onRegisterVideo={registerActiveVideo}
                    onEndedNext={() => { if (settings.autoNext) goNext(); }}
                    onSkip={goNext}
                    onNext={goNext}
                    onPrev={goPrev}
                    onShare={() => setShareTarget({ id: reel.id, source: reel.source === 'post' ? 'post' : 'reel' })}
                    isFullscreen={isFullscreen && index === activeReelIndex}
                    onToggleFullscreen={toggleFullscreenMode}
                    railHost={overlayActions ? null : railHost}
                    commentsHost={overlayActions ? null : commentsHost}
                  />
                );
              })}
            </div>
            </div>
            {/* Desktop: action rail stays fixed beside the video; comments open to its right. */}
            {!overlayActions ? (
              <div className="pointer-events-none absolute left-full top-0 bottom-0 z-40 ml-2 flex items-stretch gap-3">
                <div
                  ref={setRailHost}
                  className="pointer-events-auto flex h-full w-12 shrink-0 items-end pb-8"
                />
                <div
                  ref={setCommentsHost}
                  className="pointer-events-auto h-full w-[min(360px,32vw)] max-w-[360px] empty:hidden"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
        url={shareTarget?.source === 'post' ? `/posts/${shareTarget.id}` : `/reels/${shareTarget?.id || ''}`}
        title={shareTarget?.source === 'post' ? 'Share this post' : 'Share this reel'}
        targetType={shareTarget?.source === 'post' ? 'post' : 'reel'}
        targetId={shareTarget?.id || null}
        allowRepost
      />
    </div>
  );
}

// ===========================================================================
// ReelItem — a single full-height reel: video + gestures + action rail
// ===========================================================================

function ReelItem({
  reel,
  preload = false,
  isActive,
  isDesktop,
  overlayActions,
  token,
  isMuted,
  entrySoundUnlock = false,
  onToggleMute,
  onSetVolume,
  settings,
  volume,
  brightness,
  playbackRate,
  autoplayAllowed,
  onVolumeDelta,
  onBrightnessDelta,
  onHoldSpeedStart,
  onHoldSpeedEnd,
  holdSpeedActive = false,
  onRegisterVideo,
  onEndedNext,
  onSkip,
  onNext,
  onPrev,
  onShare,
  isFullscreen,
  onToggleFullscreen,
  railHost,
  commentsHost,
  dataIndex,
}: {
  reel: any;
  preload?: boolean;
  isActive: boolean;
  isDesktop: boolean;
  overlayActions: boolean;
  token: string | null;
  isMuted: boolean;
  /** True when the user opened Reels via a click (nav/feed) — remute after policy mute. */
  entrySoundUnlock?: boolean;
  onToggleMute: () => void;
  onSetVolume: (v: number) => void;
  settings: ReelsSettings;
  volume: number;
  brightness: number;
  playbackRate: number;
  autoplayAllowed: boolean;
  onVolumeDelta: (delta: number) => void;
  onBrightnessDelta: (delta: number) => void;
  onHoldSpeedStart: () => void;
  onHoldSpeedEnd: () => void;
  holdSpeedActive?: boolean;
  onRegisterVideo: (el: HTMLVideoElement | null) => void;
  onEndedNext: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShare: (e?: React.MouseEvent) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Desktop: host beside the 9:16 frame. Null keeps the rail on the video. */
  railHost?: HTMLElement | null;
  /** Desktop: comments open to the right of the video surface (outside the box). */
  commentsHost?: HTMLElement | null;
  key?: React.Key;
  dataIndex?: number;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const source: 'reel' | 'post' = reel.source === 'post' ? 'post' : 'reel';

  const [shouldLoad, setShouldLoad] = useState(isActive || !!preload || !!reel._preload);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState<ReactionType | null>(() => {
    if (isReactionType(reel.myReaction)) return reel.myReaction;
    const own = Array.isArray(reel.likes) ? reel.likes[0] : null;
    if (!own) return null;
    return isReactionType(own.type) ? own.type : 'like';
  });
  const reactReqId = useRef(0);
  const [likesCount, setLikesCount] = useState<number>(reel._count?.likes || reel.likesCount || 0);
  const [isSaved, setIsSaved] = useState<boolean>(!!reel.isSaved);
  const [isBoosted, setIsBoosted] = useState<boolean>(!!reel.isBoosted);
  const [boostsCount, setBoostsCount] = useState<number>(reel.boostsCount || reel._count?.boosts || 0);
  const [showComments, setShowComments] = useState(false);
  const [hud, setHud] = useState<HudState>(null);
  const isDesktopItem = useIsDesktop();

  useEffect(() => {
    if (!isActive && showComments) setShowComments(false);
  }, [isActive, showComments]);

  // Desktop docked comments: click outside the panel closes (comment button toggles separately).
  useEffect(() => {
    if (!showComments || overlayActions || !commentsHost) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (commentsHost.contains(t)) return;
      const commentBtn = (e.target as Element | null)?.closest?.('[data-reel-comment="true"]');
      if (commentBtn) return;
      setShowComments(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [showComments, overlayActions, commentsHost]);

  const chrome = useReelChrome(!!settings.autoHideChrome && overlayActions);

  // Mount / unmount the media as the window slides (IP6: sticky unload for quick swipe-back)
  useEffect(() => {
    if (isActive || preload || reel._preload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setShouldLoad(true);
      return;
    }
    const delay = resolveStickyUnloadMs();
    if (delay <= 0) {
      setShouldLoad(false);
      return;
    }
    const t = window.setTimeout(() => setShouldLoad(false), delay);
    return () => window.clearTimeout(t);
  }, [isActive, preload, reel._preload]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setIsBoosted(!!reel.isBoosted);
    setBoostsCount(reel.boostsCount || reel._count?.boosts || 0);
  }, [reel.id, reel.isBoosted, reel.boostsCount, reel._count?.boosts]);

  // Register the active <video> for page-level hotkeys and sync play state
  useEffect(() => {
    const el = videoRef.current;
    if (isActive) onRegisterVideo(el);
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      if (isActive) onRegisterVideo(null);
    };
  }, [isActive, shouldLoad, onRegisterVideo]);

  // HUD feedback on volume changes (only when volume or muted actually changes while active)
  const prevVol = useRef(volume);
  const prevMuted = useRef(isMuted);
  useEffect(() => {
    if (!isActive) {
      prevVol.current = volume;
      prevMuted.current = isMuted;
      return;
    }
    if (prevVol.current !== volume || prevMuted.current !== isMuted) {
      prevVol.current = volume;
      prevMuted.current = isMuted;
      // Mobile is icon-only: no level / percentage HUD.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
      if (isDesktopItem) setHud({ type: 'volume', value: volume, muted: isMuted });
    }
  }, [volume, isActive, isMuted, isDesktopItem]);

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  // Browser may force-mute for autoplay; remute when gesture budget / entry intent allows.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isActive) return;
    if (isMuted) {
      el.muted = true;
      return;
    }
    el.volume = Math.min(1, Math.max(0, volume));
    if (entrySoundUnlock || mediaGestureAllowsUnmute() || !el.muted) {
      applyVideoUnmute(el, volume);
    }
    return armUnmuteOnGesture(el, {
      getVolume: () => volumeRef.current,
      shouldUnmute: () => !isMutedRef.current,
    });
  }, [isMuted, isActive, volume, shouldLoad, entrySoundUnlock]);

  const unlockReelSound = useCallback(() => {
    if (isMuted) return;
    markReelsAudioUnlockIntent();
    const el = videoRef.current;
    if (!el) return;
    applyVideoUnmute(el, volume);
    if (el.paused) void el.play().catch(() => {});
  }, [isMuted, volume]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      if (isMuted) el.muted = true;
      else applyVideoUnmute(el, volume);
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
    if (isActive) emitReelsPlayback(!el.paused);
  }, [isMuted, isActive, volume]);

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current;
    if (el && Number.isFinite(el.duration)) {
      el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + delta));
    }
  }, []);

  const handleReact = useCallback(
    async (next: ReactionType | null) => {
      if (!token) {
        toast.error('Sign in to react');
        return;
      }
      const reqId = ++reactReqId.current;
      const prevReaction = reaction;
      const prevCount = likesCount;
      const had = !!prevReaction;
      const has = !!next;
      const optimisticCount = had === has ? prevCount : has ? prevCount + 1 : Math.max(0, prevCount - 1);
      setReaction(next);
      setLikesCount(optimisticCount);
      if (reel && typeof reel === 'object') {
        reel.myReaction = next;
        reel.likes = next ? [{ type: next }] : [];
        reel.likesCount = optimisticCount;
        reel._count = { ...(reel._count || {}), likes: optimisticCount };
      }
      try {
        // `/react` stores the chosen type and toggles only when the same type is sent
        // again. (`/like` is a blind toggle: every pick was saved as a plain like, and
        // switching e.g. love -> haha removed the reaction on the server.)
        const base = source === 'post' ? `/api/posts/${reel.id}` : `/api/reels/${reel.id}`;
        const res = await fetch(`${base}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: next || prevReaction || 'love' }),
        });
        if (reqId !== reactReqId.current) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not react');
        const resolvedReaction = isReactionType(data.reaction) ? data.reaction : null;
        const resolvedCount = typeof data.likeCount === 'number' ? data.likeCount : optimisticCount;
        setReaction(resolvedReaction);
        if (typeof data.likeCount === 'number') setLikesCount(data.likeCount);
        if (reel && typeof reel === 'object') {
          reel.myReaction = resolvedReaction;
          reel.likes = resolvedReaction ? [{ type: resolvedReaction }] : [];
          reel.likesCount = resolvedCount;
          reel._count = { ...(reel._count || {}), likes: resolvedCount };
        }
      } catch (err: any) {
        if (reqId !== reactReqId.current) return;
        setReaction(prevReaction);
        setLikesCount(prevCount);
        if (reel && typeof reel === 'object') {
          reel.myReaction = prevReaction;
          reel.likes = prevReaction ? [{ type: prevReaction }] : [];
          reel.likesCount = prevCount;
          reel._count = { ...(reel._count || {}), likes: prevCount };
        }
        toast.error(err?.message || 'Could not react');
      }
    },
    [reaction, likesCount, source, reel, token],
  );

  const handleBoost = useCallback(async () => {
    const prev = isBoosted;
    const nextBoosted = !prev;
    const nextCount = prev ? Math.max(0, boostsCount - 1) : boostsCount + 1;
    setIsBoosted(nextBoosted);
    setBoostsCount(nextCount);
    if (reel && typeof reel === 'object') {
      reel.isBoosted = nextBoosted;
      reel.boostsCount = nextCount;
      reel._count = { ...(reel._count || {}), boosts: nextCount };
    }
    try {
      const url = source === 'post' ? `/api/posts/${reel.id}/boost` : `/api/reels/${reel.id}/boost`;
      const res = await fetch(url, {
        method: prev ? 'DELETE' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('boost');
      if (!prev) toast.success('Reposted to your network');
    } catch {
      setIsBoosted(prev);
      setBoostsCount(boostsCount);
      if (reel && typeof reel === 'object') {
        reel.isBoosted = prev;
        reel.boostsCount = boostsCount;
        reel._count = { ...(reel._count || {}), boosts: boostsCount };
      }
    }
  }, [isBoosted, boostsCount, source, reel, token]);

  const handleSave = useCallback(async () => {
    const prev = isSaved;
    setIsSaved(!prev);
    if (reel && typeof reel === 'object') {
      reel.isSaved = !prev;
    }
    try {
      const url = source === 'post' ? `/api/posts/${reel.id}/save` : `/api/reels/${reel.id}/save`;
      await fetch(url, {
        method: prev ? 'DELETE' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      setIsSaved(prev);
      if (reel && typeof reel === 'object') {
        reel.isSaved = prev;
      }
    }
  }, [isSaved, source, reel, token]);

  const [tapHearts, setTapHearts] = useState<TapHeart[]>([]);
  const gestureRef = useReelGestures(isActive, {
    onTogglePlay: togglePlay,
    onSeekBy: seekBy,
    onDoubleTap: (x, y) => {
      setTapHearts((h) => [...h.slice(-11), { id: Date.now() + Math.random(), x, y, rot: Math.round(Math.random() * 40 - 20) }]);
      if (reaction !== 'love') void handleReact('love');
    },
    onMouseDoubleClick: onToggleFullscreen,
    onHoldSpeedStart,
    onHoldSpeedEnd,
    onVolumeDelta,
    onBrightnessDelta,
    onRevealChrome: chrome.bump,
    chromeVisible: chrome.visible,
    isFullscreen,
  });

  const author = reel.user || reel.author || {};
  const caption = reel.caption || reel.description || reel.content || '';
  const commentsCount = reel._count?.comments || reel.commentsCount || 0;

  return (
    <div
      ref={gestureRef}
      data-index={dataIndex}
      className="reel-container-item w-full h-full min-h-full snap-start snap-always relative overflow-hidden flex items-center justify-center bg-black"
      onPointerDownCapture={unlockReelSound}
    >
      <ReelTapHearts hearts={tapHearts} onDone={(id) => setTapHearts((h) => h.filter((x) => x.id !== id))} />
      <ReelPlayer
        reel={reel}
        isActive={isActive}
        shouldLoad={shouldLoad}
        isMuted={isMuted}
        playbackRate={playbackRate}
        volume={volume}
        brightness={brightness}
        loop={settings.loopVideo !== false}
        autoplay={isActive && autoplayAllowed}
        settings={settings}
        cinematic={!!settings.cinematicMode}
        showProgress={settings.showProgressBar !== false}
        zoom={1}
        videoRef={videoRef}
        forceContain={isFullscreen}
        immersive={overlayActions}
        playing={playing}
        scrubEndInset={overlayActions}
        onTogglePlay={togglePlay}
        onSkip={onSkip}
        onTime={() => { /* progress painted internally */ }}
        onEnded={onEndedNext}
      />

      <ReelHudIndicator state={hud} />

      {holdSpeedActive ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[42%] z-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/55 px-4 py-1.5 text-sm font-black tracking-wide text-white shadow-lg backdrop-blur-md"
          aria-live="polite"
        >
          2×
        </div>
      ) : null}

      {/* Caption / author — mobile overlay only (desktop sits left of the frame). */}
      {overlayActions ? (
        <div
          className={`absolute bottom-4 left-3 z-20 max-w-[70%] text-white transition-opacity duration-300 ${
            !chrome.visible ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <ReelAuthorLink author={author} className="mb-2 flex items-center gap-2.5">
            <img
              src={author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.id || 'u'}`}
              alt=""
              className="h-9 w-9 rounded-full border border-white/70 object-cover"
            />
            <span className="text-[14px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {author.name || author.username || 'Wevsoft'}
            </span>
          </ReelAuthorLink>
          {caption ? (
            <p className="line-clamp-2 text-[13px] leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{caption}</p>
          ) : null}
        </div>
      ) : null}

      {/* Action rail — on the video for phones; beside the frame on desktop */}
      {overlayActions ? (
      <div
        className={`absolute z-[60] right-2 bottom-6 transition-opacity duration-300 ${
          !chrome.visible ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <ReelActionRail
          isLiked={reaction === 'like'}
          reaction={reaction}
          likesCount={likesCount}
          commentsCount={commentsCount}
          boostsCount={boostsCount}
          isSaved={isSaved}
          isBoosted={isBoosted}
          commentsOpen={showComments}
          onReact={handleReact}
          onComment={() => setShowComments((v) => !v)}
          onShare={(e) => { e.stopPropagation(); onShare(e); }}
          onBoost={handleBoost}
          onSave={handleSave}
          onMore={(e) => { e.stopPropagation(); onSkip(); }}
          onMedia
        />
      </div>
      ) : isActive && railHost ? createPortal(
        <ReelActionRail
          isLiked={reaction === 'like'}
          reaction={reaction}
          likesCount={likesCount}
          commentsCount={commentsCount}
          boostsCount={boostsCount}
          isSaved={isSaved}
          isBoosted={isBoosted}
          commentsOpen={showComments}
          onReact={handleReact}
          onComment={() => setShowComments((v) => !v)}
          onShare={(e) => { e.stopPropagation(); onShare(e); }}
          onBoost={handleBoost}
          onSave={handleSave}
          onMore={(e) => { e.stopPropagation(); onSkip(); }}
          onMedia
        />,
        railHost,
      ) : null}

      <AnimatePresence>
        {showComments && overlayActions ? (
          <CommentsDrawer
            reelId={reel.id}
            source={source}
            commentsCount={commentsCount}
            onClose={() => setShowComments(false)}
            token={token}
            isDesktop={false}
          />
        ) : null}
      </AnimatePresence>
      {showComments && isActive && !overlayActions && commentsHost
        ? createPortal(
            <AnimatePresence>
              <CommentsDrawer
                key={reel.id}
                reelId={reel.id}
                source={source}
                commentsCount={commentsCount}
                onClose={() => setShowComments(false)}
                token={token}
                isDesktop
                docked
              />
            </AnimatePresence>,
            commentsHost,
          )
        : null}
    </div>
  );
}

// ===========================================================================
// CommentsDrawer — mobile bottom-sheet / desktop side panel
// ===========================================================================

function CommentsDrawer({
  reelId,
  source,
  commentsCount,
  onClose,
  token,
  isDesktop,
  docked = false,
}: {
  reelId: string;
  source: 'reel' | 'post';
  commentsCount: number;
  onClose: () => void;
  token: string | null;
  isDesktop: boolean;
  /** Desktop: fill the host to the right of the video surface (not overlaid on it). */
  docked?: boolean;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);

  const fetchComments = useCallback(async () => {
    const url = source === 'post' ? `/api/posts/${reelId}/comments` : `/api/comments/reel/${reelId}`;
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.items || data.comments || []);
      }
    } catch {
      /* ignore */
    }
  }, [reelId, source, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      if (source === 'post') {
        const res = await fetch(`/api/posts/${reelId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ text, parentId: replyTo?.id || null }),
        });
        if (res.ok) {
          setText('');
          setReplyTo(null);
          void fetchComments();
        }
        return;
      }
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reelId, text, parentCommentId: replyTo?.id || null }),
      });
      if (res.ok) {
        setText('');
        setReplyTo(null);
        void fetchComments();
      }
    } catch {
      /* ignore */
    }
  };

  const commentText = (c: any) => c.text || c.content || '';

  const panelClass = docked
    ? 'h-full w-full rounded-2xl bg-card/95 backdrop-blur-xl z-50 flex flex-col border border-border text-foreground shadow-2xl shadow-black/40 overflow-hidden'
    : isDesktop
      ? 'absolute inset-y-0 right-0 w-[360px] max-w-full bg-card/95 backdrop-blur-xl z-50 flex flex-col border-l border-border text-foreground'
      : 'absolute inset-x-0 bottom-0 h-[70dvh] bg-card/95 backdrop-blur-xl rounded-t-3xl z-50 flex flex-col border-t border-border text-foreground';

  const motionProps = docked || isDesktop
    ? { initial: { x: 24, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 24, opacity: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };

  return (
    <motion.div
      {...motionProps}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className={panelClass}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h3 className="font-bold">Comments {commentsCount ? `(${commentsCount})` : ''}</h3>
        <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80" aria-label="Close comments">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {comments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">No comments yet. Say something!</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="space-y-3">
            <div className="flex gap-3">
              <img
                src={c.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user?.id || 'u'}`}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-xs font-bold text-muted-foreground">{c.user?.name || c.user?.username}</p>
                <p className="text-sm mt-0.5">{commentText(c)}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-medium">
                  <button onClick={() => setReplyTo(c)}>Reply</button>
                </div>
              </div>
            </div>
            {c.replies?.length > 0 && (
              <div className="pl-11 space-y-3">
                {c.replies.map((r: any) => (
                  <div key={r.id} className="flex gap-3">
                    <img
                      src={r.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user?.id || 'u'}`}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-muted-foreground">{r.user?.name || r.user?.username}</p>
                      <p className="text-sm mt-0.5">{commentText(r)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-2">
            <span>Replying to {replyTo.user?.name || replyTo.user?.username}</span>
            <button type="button" onClick={() => setReplyTo(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-muted px-4 py-3 rounded-full text-sm outline-none border border-transparent focus:border-border"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-full flex items-center gap-1"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/** Uploader avatar + name; links to their public profile when one exists. */
function ReelAuthorLink({
  author,
  className,
  children,
}: {
  author?: { id?: string; username?: string | null; profileSlug?: string | null; officialTeam?: boolean | null; name?: string | null } | null;
  className: string;
  children: React.ReactNode;
}) {
  const to = profilePathFor(author);
  if (!to) return <div className={className}>{children}</div>;
  return (
    <Link
      to={to}
      className={`${className} rounded-full outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70`}
      aria-label={`Open ${author?.name || author?.username || 'creator'}'s profile`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
