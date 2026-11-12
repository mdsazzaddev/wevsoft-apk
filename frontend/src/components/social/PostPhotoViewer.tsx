import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Maximize2,
  MessageCircle,
  Minimize2,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { useFeedPostActions } from '../../hooks/useFeedPostActions';
import { openShare } from '../../lib/share/openShare';
import ReactionButton from './ReactionButton';
import PostOptionsMenu from './PostOptionsMenu';
import PostComments from '../PostComments';
import PostViewIndicator from './PostViewIndicator';
import RepostIcon from '../icons/RepostIcon';
import type { ReactionType } from '../../lib/reactions';
import {
  enterReelFullscreen,
  exitReelFullscreen,
  getFullscreenElement,
  isIOSDevice,
} from '../reels/ReelFullscreenControls';

export type PostPhotoSlide = { url: string; id?: string; type?: 'image' | 'video' };

export type PostPhotoAuthor = {
  name: string;
  avatar?: string | null;
  username?: string | null;
  href?: string | null;
  verified?: boolean | null;
};

type Props = {
  open: boolean;
  photos: PostPhotoSlide[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  postId: string;
  /** Caption / title shown above comments when present. */
  postTitle?: string;
  author?: PostPhotoAuthor | null;
  createdAt?: string | Date | null;
  commentsDisabled?: boolean;
  sharingDisabled?: boolean;
  hideCommentCount?: boolean;
  hideLikeCount?: boolean;
  commentCount?: number;
  likeCount?: number;
  /** Real share count (hidden while 0). */
  shareCount?: number;
  reaction?: ReactionType | null;
  onReact?: (next: ReactionType | null) => void;
  onCommentCount?: (n: number) => void;
  /** The full post row: powers the "..." menu (report, edit, delete, hide, ...). */
  post?: any;
  onPostChanged?: (patch: Record<string, any>) => void;
  /** The post was hidden / deleted from the "..." menu - the viewer closes itself first. */
  onPostRemoved?: () => void;
  /** Undo of a hide/snooze from the "..." menu: put the post back where it was. */
  onPostRestored?: () => void;
};

function compactCount(n: number) {
  if (!n) return '';
  if (n > 999_999) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n > 999) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/** Caption with blue, searchable hashtags. */
function CaptionText({ text, onNavigate, className }: { text: string; onNavigate: () => void; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <p className={className}>
      {parts.map((part, idx) =>
        /^#[\p{L}\p{N}_]+$/u.test(part) ? (
          <Link
            key={idx}
            to={`/search?q=${encodeURIComponent(part)}`}
            onClick={onNavigate}
            className="font-medium text-sky-500 hover:underline dark:text-sky-400"
          >
            {part}
          </Link>
        ) : (
          <span key={idx}>{part}</span>
        ),
      )}
    </p>
  );
}

/**
 * Post viewer (every "click a post photo" entry point - feed, profile feed, Spaces - lands here):
 * - Centre: the photo (rounded, contain) with a frosted action bar underneath
 * - Up/down chevrons switch photos (wheel, swipe, arrow keys, j/k too)
 * - Right: rounded panel - author, caption, comments, composer ("..." keeps every post action)
 * - Mobile: photo on top, the panel slides up as a bottom sheet
 * - Themes: follows Light / Dark / OLED through the --ppv-* variables below
 */
export default function PostPhotoViewer({
  open,
  photos,
  index,
  onClose,
  onIndexChange,
  postId,
  postTitle,
  author,
  createdAt,
  commentsDisabled,
  sharingDisabled,
  hideCommentCount,
  hideLikeCount,
  commentCount = 0,
  likeCount = 0,
  shareCount = 0,
  reaction = null,
  onReact,
  onCommentCount,
  post,
  onPostChanged,
  onPostRemoved,
  onPostRestored,
}: Props) {
  const token = useStore((st) => st.token);
  const meId = useStore((st) => st.user?.id);
  const feedActions = useFeedPostActions();
  const rootRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const [i, setI] = useState(index);
  const [localComments, setLocalComments] = useState(commentCount);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [boosted, setBoosted] = useState(!!post?.isBoosted);
  const [boostsCount, setBoostsCount] = useState<number>(
    () => Number(post?.boostsCount ?? post?._count?.boosts) || 0,
  );
  const [zoom, setZoom] = useState(1);
  /** Browser Fullscreen API only — never device/native video fullscreen. */
  const [browserFs, setBrowserFs] = useState(false);
  /** iOS has no element Fullscreen API; expand the media pane inside the viewer instead. */
  const [cssFs, setCssFs] = useState(false);
  const [slideH, setSlideH] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mediaPaneRef = useRef<HTMLDivElement>(null);
  const isFullscreen = browserFs || cssFs;

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const skipObserve = useRef(false);
  const indexRef = useRef(index);
  const animatingRef = useRef(false);
  const wheelLockUntil = useRef(0);

  const textOnly = photos.length === 0;
  const slideCount = Math.max(1, photos.length);
  const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useOverlayBack(open, onClose);
  // Parents often pass an inline callback; keep it out of effect deps so a re-render cannot loop.
  const onIndexChangeRef = useRef(onIndexChange);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  onIndexChangeRef.current = onIndexChange;

  useEffect(() => {
    indexRef.current = i;
    setZoom(1);
  }, [i]);

  // Avoid mounting the heavy desktop comments tree while it is CSS-hidden on phones.
  const [isMdUp, setIsMdUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const sync = () => {
      const el = getFullscreenElement();
      setBrowserFs(!!el && (!mediaPaneRef.current || el === mediaPaneRef.current));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!cssFs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setCssFs(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cssFs]);

  useEffect(() => {
    if (open) {
      const start = Math.min(Math.max(0, index), Math.max(0, slideCount - 1));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setI(start);
      indexRef.current = start;
      setLocalComments(commentCount);
      setMobileCommentsOpen(false);
      setZoom(1);
      setCssFs(false);
    } else {
      setCssFs(false);
      if (getFullscreenElement()) void exitReelFullscreen().catch(() => {});
    }
  }, [open, index, slideCount, commentCount]);

  const scrollTo = useCallback(
    (next: number, behavior: ScrollBehavior = 'smooth') => {
      const root = scrollerRef.current;
      if (!root) return;
      const clamped = Math.min(Math.max(0, next), slideCount - 1);
      const h = root.clientHeight;
      if (h <= 0) return;
      if (prefersReducedMotion()) behavior = 'auto';
      skipObserve.current = true;
      animatingRef.current = true;
      wheelLockUntil.current = Date.now() + (behavior === 'smooth' ? 520 : 120);
      root.scrollTo({ top: clamped * h, behavior });
      setI(clamped);
      indexRef.current = clamped;
      onIndexChangeRef.current?.(clamped);
      window.setTimeout(
        () => {
          // Snap exactly in case smooth scroll undershot.
          if (scrollerRef.current) {
            scrollerRef.current.scrollTop = clamped * scrollerRef.current.clientHeight;
          }
          skipObserve.current = false;
          animatingRef.current = false;
        },
        behavior === 'smooth' ? 480 : 50,
      );
    },
    [slideCount],
  );

  // Open on the clicked photo (instant, no multi-slide bounce).
  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    const start = Math.min(Math.max(0, index), Math.max(0, slideCount - 1));
    scrollTo(start, 'auto');
  }, [open, index, slideCount, scrollTo]);

  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    const root = scrollerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (skipObserve.current || animatingRef.current) return;
        let best: { idx: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.photoIndex);
          if (!Number.isFinite(idx)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { idx, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio >= 0.65 && best.idx !== indexRef.current) {
          setI(best.idx);
          indexRef.current = best.idx;
          onIndexChangeRef.current?.(best.idx);
        }
      },
      { root, threshold: [0.65, 0.85] },
    );
    slideRefs.current.forEach((el) => {
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [open, slideCount]);

  // One wheel / trackpad / swipe → exactly one photo (prevents skipping several slides).
  useEffect(() => {
    if (!open) return;
    const root = scrollerRef.current;
    if (!root) return;

    const allowScroll = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('[data-ppv-allow-scroll]');

    const onWheel = (e: WheelEvent) => {
      if (allowScroll(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(e.deltaY) < 2 && Math.abs(e.deltaX) < 2) return;
      if (Date.now() < wheelLockUntil.current || animatingRef.current) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      scrollTo(indexRef.current + (delta > 0 ? 1 : -1));
    };

    // Touch / pen: capture the gesture and advance exactly one slide on release.
    let touchStartY = 0;
    let touchStartX = 0;
    let touchActive = false;
    let touchMoved = false;

    const onTouchStart = (e: TouchEvent) => {
      if (allowScroll(e.target) || e.touches.length !== 1) return;
      if (Date.now() < wheelLockUntil.current || animatingRef.current) return;
      touchActive = true;
      touchMoved = false;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - touchStartY;
      const dx = e.touches[0].clientX - touchStartX;
      if (Math.abs(dy) > 8 || Math.abs(dx) > 8) touchMoved = true;
      // Block native momentum scroll that can leap past multiple snaps.
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchActive) return;
      touchActive = false;
      if (!touchMoved || Date.now() < wheelLockUntil.current || animatingRef.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dy = t.clientY - touchStartY;
      const dx = t.clientX - touchStartX;
      if (Math.abs(dy) < 36 || Math.abs(dy) < Math.abs(dx)) return;
      scrollTo(indexRef.current + (dy < 0 ? 1 : -1));
    };

    // If scrollbar / residual native scroll lands between slides, snap to nearest.
    let settleTimer = 0;
    const onScroll = () => {
      if (skipObserve.current || animatingRef.current) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (skipObserve.current || animatingRef.current) return;
        const h = root.clientHeight;
        if (h <= 0) return;
        const nearest = Math.round(root.scrollTop / h);
        if (nearest !== indexRef.current) {
          scrollTo(nearest, 'smooth');
        } else if (Math.abs(root.scrollTop - nearest * h) > 2) {
          root.scrollTop = nearest * h;
        }
      }, 90);
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('scroll', onScroll);
      window.clearTimeout(settleTimer);
    };
  }, [open, scrollTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Nested UI (the "..." sheet, share, emoji) owns Esc / arrows while it is open.
      const nestedOpen = !!document.querySelector('[role="dialog"][aria-label="Post options"], [role="dialog"][aria-labelledby="wev-share-title"], [data-ppv-nested]');
      if (e.key === 'Escape') {
        if (nestedOpen) return;
        if (mobileCommentsOpen) {
          setMobileCommentsOpen(false);
          return;
        }
        onClose();
        return;
      }
      if (nestedOpen || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        scrollTo(indexRef.current + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        scrollTo(indexRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, scrollTo, mobileCommentsOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep each slide exactly one viewport tall so scroll math never skips.
  useEffect(() => {
    if (!open) return;
    const root = scrollerRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const sync = () => {
      const h = root.clientHeight;
      setSlideH(h);
      // Re-align current slide after resize without animation.
      if (h > 0) {
        root.scrollTop = indexRef.current * h;
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    return () => ro.disconnect();
  }, [open, slideCount]);

  // Saved state for the bookmark (the same endpoint the "..." menu uses).
  useEffect(() => {
    if (!open || !token || !postId) return;
    let cancelled = false;
    fetch(`/api/posts/${encodeURIComponent(postId)}/menu-context`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setSaved(!!j.saved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, token, postId]);

  useEffect(() => {
    setBoosted(!!post?.isBoosted);
    setBoostsCount(Number(post?.boostsCount ?? post?._count?.boosts) || 0);
  }, [post?.id, post?.isBoosted, post?.boostsCount, post?._count?.boosts]);

  if (!open || typeof document === 'undefined') return null;

  const canShare = !sharingDisabled && feedActions.share;
  const canComment = !commentsDisabled && feedActions.comment;
  const canRepost = !!feedActions.repost;
  const isOwnPost = !!(meId && post?.userId && String(post.userId) === String(meId));
  const viewCount = Number(post?.viewCount ?? post?._count?.views) || 0;
  const hasMore = slideCount > 1;
  const canGoUp = i > 0;
  const canGoDown = i < slideCount - 1;

  const onCommentCountRef = useRef(onCommentCount);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing pattern)
  onCommentCountRef.current = onCommentCount;
  const bumpComments = useCallback((n: number) => {
    setLocalComments(n);
    onCommentCountRef.current?.(n);
  }, []);
  const onCommentCreated = useCallback(() => {
    setLocalComments((n) => {
      const next = n + 1;
      onCommentCountRef.current?.(next);
      return next;
    });
  }, []);

  const timeLabel = (() => {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (!Number.isFinite(d.getTime())) return null;
    try {
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return null;
    }
  })();

  const caption = (postTitle || '').trim();
  const initial = (author?.name || '?').charAt(0).toUpperCase();
  const handle = author?.username ? `@${author.username.replace(/^@/, '')}` : null;

  const toggleSave = async () => {
    if (!token || !postId) return;
    const prev = saved;
    setSaved(!prev);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('save');
      const j = await res.json().catch(() => ({}));
      const next = typeof j.saved === 'boolean' ? j.saved : !prev;
      setSaved(next);
      toast.success(next ? 'Post saved' : 'Removed from saved');
    } catch {
      setSaved(prev);
      toast.error('Could not update saved posts');
    }
  };

  const openMobileComments = () => setMobileCommentsOpen(true);

  const focusComments = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      const panel = document.getElementById('ppv-comments');
      panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const composer = panel?.querySelector<HTMLElement>('textarea, input:not([type="hidden"])');
      composer?.focus?.();
      return;
    }
    openMobileComments();
  };

  const toggleBoost = () => {
    if (!token || !postId || !canRepost) return;
    const next = !boosted;
    const nextCount = Math.max(0, boostsCount + (next ? 1 : -1));
    setBoosted(next);
    setBoostsCount(nextCount);
    if (post && typeof post === 'object') {
      post.isBoosted = next;
      post.boostsCount = nextCount;
      post._count = { ...(post._count || {}), boosts: nextCount };
    }
    fetch(`/api/posts/${encodeURIComponent(postId)}/boost`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boosted: next }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Repost failed');
        const confirmed = !!d.boosted;
        const confirmedCount = typeof d.boostsCount === 'number' ? d.boostsCount : nextCount;
        setBoosted(confirmed);
        setBoostsCount(confirmedCount);
        if (post && typeof post === 'object') {
          post.isBoosted = confirmed;
          post.boostsCount = confirmedCount;
          post._count = { ...(post._count || {}), boosts: confirmedCount };
        }
        onPostChanged?.({ isBoosted: confirmed, boostsCount: confirmedCount });
        toast.success(confirmed ? 'Reposted to your network' : 'Repost removed');
      })
      .catch((err: any) => {
        setBoosted(!next);
        setBoostsCount(boostsCount);
        if (post && typeof post === 'object') {
          post.isBoosted = !next;
          post.boostsCount = boostsCount;
        }
        toast.error(err?.message || 'Could not repost');
      });
  };

  const avatarEl = (size: string) =>
    author ? (
      <span className={`${size} relative inline-flex shrink-0 rounded-full p-[2px] ring-2 ring-sky-500/80`}>
        <span className="block h-full w-full overflow-hidden rounded-full bg-[color:var(--ppv-chip)]">
          {author.avatar ? (
            <img src={author.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[color:var(--ppv-text)]">{initial}</span>
          )}
        </span>
      </span>
    ) : null;

  const authorRow = (compact?: boolean) =>
    author ? (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {author.href ? (
          <Link to={author.href} onClick={onClose} aria-label={`${author.name} profile`}>
            {avatarEl(compact ? 'h-10 w-10' : 'h-11 w-11')}
          </Link>
        ) : (
          avatarEl(compact ? 'h-10 w-10' : 'h-11 w-11')
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-bold leading-tight text-[color:var(--ppv-text)]">
            {author.href ? (
              <Link to={author.href} onClick={onClose} className="truncate hover:underline">
                {author.name}
              </Link>
            ) : (
              <span className="truncate">{author.name}</span>
            )}
            {author.verified ? <BadgeCheck size={16} className="shrink-0 fill-sky-500 text-white" aria-label="Verified" /> : null}
          </p>
          <p className="truncate text-xs text-[color:var(--ppv-muted)]">
            {handle}
            {handle && timeLabel ? ' • ' : null}
            {timeLabel}
          </p>
        </div>
      </div>
    ) : timeLabel ? (
      <p className="min-w-0 flex-1 text-xs text-[color:var(--ppv-muted)]">{timeLabel}</p>
    ) : (
      <div className="flex-1" />
    );

  const optionsMenu = post ? (
    <PostOptionsMenu
      post={post}
      overlayZIndex={430}
      triggerClassName="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ppv-text)] transition hover:bg-[color:var(--ppv-chip)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      onChanged={(patch) => onPostChanged?.(patch)}
      onHidden={() => {
        onClose();
        onPostRemoved?.();
      }}
      onRestored={onPostRestored}
      onRemoved={() => {
        onClose();
        onPostRemoved?.();
      }}
    />
  ) : null;

  const countTxt = (n: number) => (n > 0 ? compactCount(n) : '');
  const actionBtn =
    'inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-sm font-semibold text-[color:var(--ppv-text)] transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500';

  const actionBar = (
    <div
      className="flex w-[min(100%,420px)] shrink-0 items-center justify-between gap-1 rounded-2xl border border-[color:var(--ppv-glass-border)] bg-[color:var(--ppv-glass)] px-3 py-2 shadow-lg backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
      data-testid="ppv-action-bar"
    >
      {feedActions.react && onReact ? (
        <div className="flex items-center gap-1 text-[color:var(--ppv-text)] [&_button]:!text-[color:var(--ppv-text)]">
          <ReactionButton variant="feed" value={reaction} count={likeCount} onChange={onReact} hideCount />
          {!hideLikeCount && likeCount > 0 ? (
            <span className="-ml-2 text-sm font-semibold tabular-nums" data-testid="ppv-like-count">
              {compactCount(likeCount)}
            </span>
          ) : null}
        </div>
      ) : null}

      {canComment ? (
        <button
          type="button"
          aria-label="Comments"
          onClick={focusComments}
          className={actionBtn}
        >
          <MessageCircle size={19} strokeWidth={2} />
          {!hideCommentCount && localComments > 0 ? (
            <span className="tabular-nums text-[color:var(--ppv-muted)]">{countTxt(localComments)}</span>
          ) : null}
        </button>
      ) : null}

      {canRepost ? (
        <button
          type="button"
          aria-label={boosted ? 'Remove repost' : 'Repost'}
          title={boosted ? 'Reposted' : 'Repost'}
          aria-pressed={boosted}
          onClick={toggleBoost}
          className={`${actionBtn} ${boosted ? 'text-emerald-500' : ''}`}
        >
          <RepostIcon size={19} strokeWidth={2} />
          {boostsCount > 0 ? <span className="tabular-nums">{countTxt(boostsCount)}</span> : null}
        </button>
      ) : null}

      {canShare ? (
        <button
          type="button"
          aria-label="Share"
          onClick={() =>
            openShare({
              url: `/posts/${postId}`,
              title: caption || author?.name || 'Post',
              targetType: 'post',
              targetId: postId,
              zIndex: 440,
            })
          }
          className={actionBtn}
        >
          <Share2 size={19} strokeWidth={2} />
          {shareCount > 0 ? <span className="tabular-nums">{countTxt(shareCount)}</span> : null}
        </button>
      ) : null}

      {feedActions.views ? (
        <PostViewIndicator
          postId={postId}
          viewCount={viewCount}
          canOpenDetails={isOwnPost}
          hidden={
            String(post?.viewCountVisibility || 'public').toLowerCase() === 'hidden' ||
            (String(post?.viewCountVisibility || '').toLowerCase() === 'owner' && !isOwnPost)
          }
        />
      ) : null}

      <button
        type="button"
        aria-label={saved ? 'Remove from saved' : 'Save post'}
        aria-pressed={saved}
        onClick={() => void toggleSave()}
        className={actionBtn}
      >
        <Bookmark size={20} strokeWidth={2} className={saved ? 'fill-current' : ''} />
      </button>
    </div>
  );

  const commentsHeading = (
    <h3 className="px-4 pb-1 pt-3 text-[15px] font-bold text-[color:var(--ppv-text)]">
      Comments
      {!hideCommentCount && localComments > 0 ? <span data-testid="ppv-comments-count"> ({localComments})</span> : null}
    </h3>
  );

  const panelBody = (opts: { showHeader: boolean }) => (
    <div className="flex h-full min-h-0 flex-col text-[color:var(--ppv-text)]">
      {opts.showHeader ? (
        <div className="shrink-0">
          <div className="flex items-center gap-2 px-4 pb-3 pt-4">
            {authorRow()}
            {optionsMenu}
          </div>
          {caption && !textOnly ? (
            <CaptionText
              text={caption}
              onNavigate={onClose}
              className="whitespace-pre-wrap break-words px-4 pb-3 text-[14px] leading-relaxed text-[color:var(--ppv-text)] line-clamp-6"
            />
          ) : null}
          <div className="border-t border-[color:var(--ppv-border)]" />
        </div>
      ) : null}
      {canComment ? (
        <>
          {commentsHeading}
          <div className="min-h-0 flex-1">
            <PostComments
              postId={postId}
              variant="viewer"
              onCommentCreated={onCommentCreated}
              onCommentsLoaded={bumpComments}
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <MessageCircle size={28} className="text-[color:var(--ppv-muted)]" />
          <p className="text-sm font-semibold">Comments are turned off</p>
          <p className="text-xs text-[color:var(--ppv-muted)]">The author disabled comments on this post.</p>
        </div>
      )}
    </div>
  );

  const navBtn =
    'flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ppv-border)] bg-[color:var(--ppv-chip)] text-[color:var(--ppv-text)] shadow-lg backdrop-blur-md transition motion-reduce:transition-none hover:bg-[color:var(--ppv-glass)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-30';
  const mediaToolBtn =
    'flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--ppv-text)] transition hover:bg-[color:var(--ppv-chip)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-35';
  const mediaClass =
    'max-h-[calc(var(--ppv-h)-120px)] md:max-h-[calc(var(--ppv-h)-136px)] max-w-full select-none rounded-[18px] border-2 border-[color:var(--ppv-photo-border)] object-contain shadow-2xl transition-transform duration-200 motion-reduce:transition-none origin-center will-change-auto';

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const toggleFullscreen = async () => {
    const el = mediaPaneRef.current;
    if (!el) return;
    // Prefer the browser Fullscreen API on the media pane — never video.webkitEnterFullscreen
    // (that is OS/device player fullscreen).
    if (cssFs) {
      setCssFs(false);
      return;
    }
    if (getFullscreenElement()) {
      try {
        await exitReelFullscreen();
      } catch {
        /* ignore */
      }
      return;
    }
    if (isIOSDevice()) {
      setCssFs(true);
      return;
    }
    try {
      await enterReelFullscreen(el);
    } catch {
      // Last resort: in-app expand (still not device video fullscreen).
      setCssFs(true);
    }
  };

  const onRootKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = rootRef.current;
    if (!root || !(e.target instanceof Node) || !root.contains(e.target)) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'),
    ).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={rootRef}
      className="ppv-root fixed inset-0 z-[420] flex flex-col bg-[color:var(--ppv-bg)] text-[color:var(--ppv-text)]"
      role="dialog"
      aria-modal="true"
      aria-label="Post viewer"
      onKeyDown={onRootKeyDown}
      data-testid="post-viewer"
    >
      <style>{`
        .ppv-root {
          --ppv-bg: #eceef2; --ppv-panel: #ffffff; --ppv-border: rgba(15,23,42,.14);
          --ppv-glass: rgba(255,255,255,.66); --ppv-glass-border: rgba(15,23,42,.16);
          --ppv-photo-border: rgba(255,255,255,.95); --ppv-text: #0f172a; --ppv-muted: #64748b;
          --ppv-chip: rgba(15,23,42,.06);
        }
        html.dark .ppv-root {
          --ppv-bg: #111214; --ppv-panel: #0e0f11; --ppv-border: rgba(255,255,255,.2);
          --ppv-glass: rgba(150,152,162,.34); --ppv-glass-border: rgba(255,255,255,.3);
          --ppv-photo-border: rgba(255,255,255,.5); --ppv-text: #f5f6f7; --ppv-muted: rgba(255,255,255,.55);
          --ppv-chip: rgba(255,255,255,.08);
        }
        html.oled .ppv-root {
          --ppv-bg: #000000; --ppv-panel: #000000; --ppv-border: rgba(255,255,255,.22);
          --ppv-glass: rgba(120,122,132,.3); --ppv-chip: rgba(255,255,255,.1);
        }
        .ppv-scroll { overflow-y: scroll; scrollbar-width: none; }
        .ppv-scroll::-webkit-scrollbar { display: none; }
        .ppv-thin-scroll { scrollbar-width: thin; scrollbar-color: rgba(128,128,140,.55) transparent; }
        .ppv-thin-scroll::-webkit-scrollbar { width: 6px; }
        .ppv-thin-scroll::-webkit-scrollbar-track { background: transparent; }
        .ppv-thin-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,140,.55); border-radius: 999px; }
      `}</style>

      {/* Mobile top bar */}
      <header className="relative z-20 flex shrink-0 items-center gap-2 px-3 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        {authorRow(true)}
        {optionsMenu}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ppv-chip)] text-[color:var(--ppv-text)]"
        >
          <X size={20} />
        </button>
      </header>
      {caption && !textOnly ? (
        <CaptionText
          text={caption}
          onNavigate={onClose}
          className="shrink-0 px-4 pb-1 text-[13px] leading-snug text-[color:var(--ppv-text)] line-clamp-2 md:hidden"
        />
      ) : null}

      <div className="flex min-h-0 flex-1 gap-0 md:gap-4 md:p-3">
        <div
          ref={mediaPaneRef}
          className={`relative min-h-0 min-w-0 flex-1 bg-[color:var(--ppv-bg)] ${
            cssFs ? 'fixed inset-0 z-[430] h-[100dvh] w-[100dvw]' : ''
          }`}
          data-ppv-browser-fs={isFullscreen ? 'true' : undefined}
        >
          {/* Desktop: close in the top-left corner (where search used to sit) */}
          <button
            type="button"
            aria-label="Close"
            autoFocus
            onClick={onClose}
            className="absolute left-0 top-0 z-20 hidden h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ppv-border)] bg-[color:var(--ppv-chip)] text-[color:var(--ppv-text)] backdrop-blur-md transition hover:bg-[color:var(--ppv-glass)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 md:flex"
          >
            <X size={20} />
          </button>
          {hasMore ? (
            <p
              className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-[color:var(--ppv-border)] bg-[color:var(--ppv-chip)] px-3 py-1 text-xs font-semibold tabular-nums backdrop-blur-md"
              aria-live="polite"
            >
              {i + 1} / {slideCount}
            </p>
          ) : null}

          {!textOnly ? (
            <div
              className="absolute right-2 top-2 z-20 flex h-7 w-[97px] items-center justify-center gap-0.5 rounded-full border border-[color:var(--ppv-glass-border)] bg-[color:var(--ppv-glass)] px-1 shadow-md backdrop-blur-xl"
              data-testid="ppv-media-tools"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={zoom <= ZOOM_MIN}
                onClick={zoomOut}
                className={mediaToolBtn}
              >
                <ZoomOut size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={zoom >= ZOOM_MAX}
                onClick={zoomIn}
                className={mediaToolBtn}
              >
                <ZoomIn size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-pressed={isFullscreen}
                onClick={() => void toggleFullscreen()}
                className={mediaToolBtn}
              >
                {isFullscreen ? <Minimize2 size={15} strokeWidth={2.2} /> : <Maximize2 size={15} strokeWidth={2.2} />}
              </button>
            </div>
          ) : null}

          <div
            ref={scrollerRef}
            className="ppv-scroll absolute inset-0 snap-y snap-mandatory overscroll-y-contain"
            data-testid="post-photo-scroller"
          >
            {Array.from({ length: slideCount }).map((_, idx) => {
              const photo = photos[idx];
              const near = Math.abs(idx - i) <= 1;
              const active = idx === i;
              const zoomStyle =
                active && zoom !== 1
                  ? { transform: `scale(${zoom}) translateZ(0)`, willChange: 'transform' as const }
                  : undefined;
              return (
                <section
                  key={photo?.id || `${photo?.url || 'text'}-${idx}`}
                  ref={(el) => {
                    slideRefs.current[idx] = el;
                  }}
                  data-photo-index={idx}
                  className="relative flex w-full shrink-0 snap-start snap-always flex-col items-center justify-center px-3 pb-16 pt-2 md:px-16 md:pb-16 md:pt-14"
                  style={{ height: slideH || '100%', minHeight: slideH || '100%', ['--ppv-h' as string]: slideH ? `${slideH}px` : '100dvh' }}
                  aria-label={textOnly ? 'Post' : `Photo ${idx + 1} of ${slideCount}`}
                  aria-hidden={!active}
                >
                  {near ? (
                    <div className={`flex w-full flex-none items-center justify-center ${active && zoom > 1 ? 'overflow-hidden' : ''}`}>
                      {textOnly ? (
                        <div
                          className="max-h-[calc(var(--ppv-h)-120px)] md:max-h-[calc(var(--ppv-h)-136px)] w-[min(100%,560px)] overflow-y-auto rounded-[22px] border-2 border-[color:var(--ppv-photo-border)] bg-gradient-to-br from-sky-500/25 via-violet-500/20 to-fuchsia-500/20 p-8 shadow-2xl ppv-thin-scroll"
                          data-ppv-allow-scroll
                          data-testid="ppv-text-card"
                        >
                          {caption ? (
                            <CaptionText
                              text={caption}
                              onNavigate={onClose}
                              className="whitespace-pre-wrap break-words text-[22px] font-semibold leading-snug text-[color:var(--ppv-text)]"
                            />
                          ) : (
                            <p className="text-center text-sm text-[color:var(--ppv-muted)]">This post has no text or media.</p>
                          )}
                        </div>
                      ) : photo?.type === 'video' ? (
                        <video
                          src={photo.url}
                          controls={active}
                          playsInline
                          preload={active ? 'metadata' : 'none'}
                          className={mediaClass}
                          style={zoomStyle}
                        />
                      ) : photo ? (
                        <img
                          src={photo.url}
                          alt=""
                          className={mediaClass}
                          style={zoomStyle}
                          draggable={false}
                          decoding="async"
                          loading={active ? 'eager' : 'lazy'}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="h-[40%] w-[40%] rounded-[18px] bg-[color:var(--ppv-chip)]" aria-hidden />
                  )}
                </section>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3 md:bottom-4">
            <div className="pointer-events-auto">{actionBar}</div>
          </div>

          {hasMore ? (
            <div className="pointer-events-none absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 md:flex">
              <button
                type="button"
                aria-label="Previous photo"
                disabled={!canGoUp}
                onClick={() => scrollTo(i - 1)}
                className={`pointer-events-auto ${navBtn}`}
              >
                <ChevronUp size={22} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                disabled={!canGoDown}
                onClick={() => scrollTo(i + 1)}
                className={`pointer-events-auto ${navBtn}`}
              >
                <ChevronDown size={22} strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
        </div>

        {isMdUp ? (
          <aside
            id="ppv-comments"
            aria-label="Post details and comments"
            className="flex h-full w-[clamp(320px,27vw,420px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--ppv-border)] bg-[color:var(--ppv-panel)]"
          >
            {panelBody({ showHeader: true })}
          </aside>
        ) : null}
      </div>

      {mobileCommentsOpen && !isMdUp ? (
        <div className="absolute inset-0 z-30 flex flex-col" role="dialog" aria-label="Comments" data-ppv-nested>
          <button
            type="button"
            className="min-h-0 flex-1 bg-black/55"
            aria-label="Close comments"
            onClick={() => setMobileCommentsOpen(false)}
          />
          <div id="ppv-comments-mobile" className="flex h-[min(78dvh,680px)] flex-col overflow-hidden rounded-t-2xl border-t border-[color:var(--ppv-border)] bg-[color:var(--ppv-panel)]">
            <div className="flex items-center justify-between px-3 pt-1">
              <span className="mx-auto h-1 w-10 rounded-full bg-[color:var(--ppv-border)]" aria-hidden />
              <button
                type="button"
                onClick={() => setMobileCommentsOpen(false)}
                className="absolute right-2 top-1 rounded-full p-2 text-[color:var(--ppv-muted)] hover:bg-[color:var(--ppv-chip)]"
                aria-label="Close comments"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{panelBody({ showHeader: false })}</div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
