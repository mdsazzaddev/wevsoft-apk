import React, { useState, useEffect, useMemo, useRef } from 'react';
import { reinsertAt } from '../lib/reinsertAt';
import PostBackgroundMusic from '../components/social/PostBackgroundMusic';
import PostComposer from "../components/social/PostComposer";
import PostMediaGrid from "../components/social/PostMediaGrid";
import PostPhotoViewer from "../components/social/PostPhotoViewer";
import StoryBar from "../components/social/StoryBar";
import FeedReelsTray from "../components/social/FeedReelsTray";
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  MessageCircle, Share2, Pin, AlertCircle,
  Smartphone, Monitor, Sparkles, Wifi, Battery, ChevronRight, Check, Repeat2, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '../utils/l10n';
import { trLabel } from '../components/settings/languagePickerShared';
import PostOptionsMenu from '../components/social/PostOptionsMenu';
import ShareModal from '../components/ShareModal';
import ReportModal from '../components/ReportModal';
import PostCommentsWindow from '../components/PostCommentsWindow';
import { parseLegacyMedia } from '../lib/postMedia';
import { useSettings } from '../hooks/useSettings';
import { AuthorAvatar, AuthorVerifiedBadge } from '../components/social/ContentAuthor';
import PostCreatorHeader from '../components/social/PostCreatorHeader';
import FeedPoll from '../components/feed/FeedPoll';
import LinkPreviewCard, { parseLinkPreviewJson } from '../components/social/LinkPreviewCard';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';
import { AITextTools } from '../components/ai/AITextTools';
import {
  shouldLoopFeedVideos,
  shouldPauseOnScroll,
} from '../lib/feedAutoplay';
import { Link, useNavigate } from 'react-router-dom';
import { openFeedVideoInReels, payloadFromFeedVideo } from '../lib/openReel';
import ExpandableText from '../components/ExpandableText';
import ReactionButton from '../components/social/ReactionButton';
import { isPostReaction, viewerPostReaction, type ReactionType } from '../lib/reactions';
import VirtualBlock from '../components/feed/VirtualBlock';
import RepostIcon from '../components/icons/RepostIcon';
import PostViewIndicator from '../components/social/PostViewIndicator';
import { observePostView } from '../lib/postViewTracker';
import { useFeedPostActions } from '../hooks/useFeedPostActions';

function FeedPostReaction({ post }: { post: any }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const rawLikeCount = Math.max(
    Number(post._count?.likes) || 0,
    Number(post.analytics?.likeCount) || 0,
    Number(post._count?.reactions) || 0,
    Array.isArray(post.likes) ? post.likes.length : 0,
    Array.isArray(post.reactions) ? post.reactions.length : 0,
    post.myReaction ? 1 : 0
  );
  const [reaction, setReaction] = useState<ReactionType | null>(() => viewerPostReaction(post));
  const [likeCount, setLikeCount] = useState(rawLikeCount);
  const reactionReqId = useRef(0);

  useEffect(() => {
    const freshLikeCount = Math.max(
      Number(post._count?.likes) || 0,
      Number(post.analytics?.likeCount) || 0,
      Number(post._count?.reactions) || 0,
      Array.isArray(post.likes) ? post.likes.length : 0,
      Array.isArray(post.reactions) ? post.reactions.length : 0,
      post.myReaction ? 1 : 0
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setReaction(viewerPostReaction(post));
    setLikeCount(freshLikeCount);
  }, [post.id, post.myReaction, post.reactions, post.likes?.length, post._count?.likes, post._count?.reactions]);

  const applyReaction = async (next: ReactionType | null) => {
    if (!token) {
      toast.error(trLabel(t, 'SignInToReact', 'Sign in to react'));
      return;
    }
    const reqId = ++reactionReqId.current;
    const prev = reaction;
    const prevCount = likeCount;
    setReaction(next);
    if (Boolean(prev) !== Boolean(next)) {
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    }
    try {
      const response = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: next || prev || 'love', action: next ? 'react' : 'remove' }),
      });
      if (reqId !== reactionReqId.current) return;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not react');
      setReaction(isPostReaction(data.reaction) ? data.reaction : null);
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      window.dispatchEvent(new CustomEvent('wev:post-reacted', { detail: { postId: post.id } }));
    } catch (err: any) {
      if (reqId !== reactionReqId.current) return;
      setReaction(prev);
      setLikeCount(prevCount);
      toast.error(err?.message || 'Could not react');
    }
  };

  return (
    <ReactionButton
      value={reaction}
      count={likeCount}
      onChange={applyReaction}
      variant="feed"
      hideCount={!!post.hideLikeCount}
    />
  );
}

function FeedPostRepost({ post }: { post: any }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const canBoost = Boolean(token && !post.sharingDisabled);
  const [isBoosted, setIsBoosted] = useState(!!post.isBoosted);
  const [boostsCount, setBoostsCount] = useState(Number(post.boostsCount) || 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync when feed row updates
    setIsBoosted(!!post.isBoosted);
    setBoostsCount(Number(post.boostsCount) || 0);
  }, [post.id, post.isBoosted, post.boostsCount]);

  if (!canBoost) return null;

  const handleBoost = () => {
    if (!token) return;
    const next = !isBoosted;
    const nextCount = Math.max(0, boostsCount + (next ? 1 : -1));
    setIsBoosted(next);
    setBoostsCount(nextCount);
    if (post && typeof post === 'object') {
      post.isBoosted = next;
      post.boostsCount = nextCount;
    }
    fetch(`/api/posts/${post.id}/boost`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boosted: next }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Boost failed');
        const confirmedBoosted = !!d.boosted;
        const confirmedCount = typeof d.boostsCount === 'number' ? d.boostsCount : nextCount;
        setIsBoosted(confirmedBoosted);
        if (typeof d.boostsCount === 'number') setBoostsCount(d.boostsCount);
        if (post && typeof post === 'object') {
          post.isBoosted = confirmedBoosted;
          post.boostsCount = confirmedCount;
        }
        toast.success(
          d.boosted
            ? trLabel(t, 'RepostedToNetwork', 'Reposted to your network')
            : trLabel(t, 'RepostRemoved', 'Repost removed'),
        );
      })
      .catch((err: any) => {
        const revertedCount = Math.max(0, nextCount + (next ? -1 : 1));
        setIsBoosted(!next);
        setBoostsCount(revertedCount);
        if (post && typeof post === 'object') {
          post.isBoosted = !next;
          post.boostsCount = revertedCount;
        }
        toast.error(err?.message || trLabel(t, 'CouldNotRepost', 'Could not repost'));
      });
  };

  return (
    <button
      type="button"
      onClick={handleBoost}
      className={`flex items-center justify-center rounded-full p-1.5 transition-colors ${
        isBoosted
          ? 'text-emerald-500 hover:text-emerald-400'
          : 'text-foreground/85 hover:text-emerald-500'
      }`}
      aria-label={isBoosted ? trLabel(t, 'RemoveRepost', 'Remove repost') : trLabel(t, 'Repost', 'Repost')}
      title={isBoosted ? trLabel(t, 'Reposted', 'Reposted') : trLabel(t, 'Repost', 'Repost')}
    >
      <RepostIcon size={20} strokeWidth={2.35} />
    </button>
  );
}

function FeedPostViews({ post }: { post: any }) {
  const user = useStore((s) => s.user);
  const visibility = String(post.viewCountVisibility || 'public').toLowerCase();
  const isOwnPost =
    !!user?.id && (post.userId === user.id || post.user?.id === user.id);
  const hidden =
    visibility === 'hidden' || (visibility === 'owner' && !isOwnPost);
  const [viewCount, setViewCount] = useState(
    typeof post.viewCount === 'number' ? post.viewCount : 0,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync when feed row updates
    setViewCount(typeof post.viewCount === 'number' ? post.viewCount : 0);
  }, [post.id, post.viewCount]);

  return (
    <PostViewIndicator
      postId={post.id}
      viewCount={viewCount}
      canOpenDetails={isOwnPost}
      hidden={hidden}
    />
  );
}

function shouldAnimateFeedCards() {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
}

function FeedCardShell({
  post,
  index,
  important,
  children,
}: {
  post: any;
  index: number;
  important?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const animate = shouldAnimateFeedCards();

  useEffect(() => {
    if (!ref.current) return;
    const isVideoLike =
      String(post.type || '').toLowerCase() === 'video' ||
      String(post.type || '').toLowerCase() === 'reel' ||
      (Array.isArray(post.postMedia) &&
        post.postMedia.some((m: any) => String(m.type || '').includes('video')));
    return observePostView(ref.current, {
      postId: post.id,
      source: 'feed',
      isVideoLike,
      onCounted: (views) => {
        if (post && typeof post === 'object') post.viewCount = views;
        window.dispatchEvent(
          new CustomEvent('wev:post-view-count', { detail: { postId: post.id, views } }),
        );
      },
    });
  }, [post.id, post.type, post.postMedia]);

  // Motion stays outside VirtualBlock so remounting a card does not re-run
  // opacity:0 → 1 (that looked like a blank blink on /feed downward scroll).
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 15 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.18, ease: 'easeOut', delay: Math.min(index * 0.03, 0.09) } : undefined}
    >
      <VirtualBlock defaultHeight={480}>
        <div
          ref={ref}
          data-feed-card
          className={`relative bg-card border ${
            important
              ? 'border-red-500/40 shadow-sm'
              : 'border-border shadow-sm hover:border-border'
          } rounded-[2rem] overflow-hidden transition-colors group`}
        >
          <PostBackgroundMusic postId={post.id} post={post} rootRef={ref} />
          {children}
        </div>
      </VirtualBlock>
    </motion.div>
  );
}

export default function FeedPage() {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const { t, i18n } = useTranslation();
  const { valuesMap } = useSettings();
  const navigate = useNavigate();
  const feedActions = useFeedPostActions();
  const [posts, setPosts] = useState<any[]>([]);
  // Rows hidden from this list via the post menu, with their index, so an Undo (snooze) can put them back in place.
  const hiddenRowsRef = useRef(new Map<string, { row: any; index: number }>());
  const [feedSession, setFeedSession] = useState<string | null>(null);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ url: string; type: 'post' | 'reel'; id: string } | null>(null);
  const [commentsPost, setCommentsPost] = useState<any | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{
    post: any;
    index: number;
    photos: Array<{ url: string; id?: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState<{targetId: string, targetType: string} | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  
  // Mobile Preview Toggle state
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  const loopVideos = useMemo(
    () => shouldLoopFeedVideos(valuesMap),
    [valuesMap],
  );
  const pauseOnScrollAway = useMemo(
    () => shouldPauseOnScroll(valuesMap),
    [valuesMap],
  );

  useEffect(() => {
    // New browser load / remount → new ranking session so #1 is not sticky
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchFeed({ refreshSession: true });
  }, []);

  const fetchFeed = async (opts?: { refreshSession?: boolean; append?: boolean }) => {
    const refreshSession = opts?.refreshSession !== false && !opts?.append;
    const append = !!opts?.append;

    if (append) {
      if (!feedHasMore || !feedCursor || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (!refreshSession && feedSession) params.set('session', feedSession);
      if (append && feedCursor) params.set('cursor', feedCursor);

      const res = await fetch(`/api/ai/feed?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // New API: { posts, session, nextCursor, hasMore }
        // Legacy fallback: bare array
        const list = Array.isArray(data) ? data : (Array.isArray(data?.posts) ? data.posts : []);
        const session = Array.isArray(data) ? null : (data?.session || null);
        const nextCursor = Array.isArray(data) ? null : (data?.nextCursor ?? null);
        const hasMore = Array.isArray(data) ? false : !!data?.hasMore;

        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const p of list) {
              if (p?.id && !seen.has(p.id)) {
                seen.add(p.id);
                merged.push(p);
              }
            }
            return merged;
          });
        } else {
          setPosts(list);
        }

        if (session) setFeedSession(session);
        setFeedCursor(nextCursor);
        setFeedHasMore(hasMore);
      } else if (!append) {
        setPosts([]);
      }
    } catch (err) {
      console.error(err);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMoreRef.current = () => {
      void fetchFeed({ append: true, refreshSession: false });
    };
  });

  useEffect(() => {
    if (loading || !feedHasMore) return;
    const node = loadMoreSentinelRef.current;
    if (!node) return;
    const root = typeof document !== 'undefined' ? document.getElementById('main-scroll-area') : null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMoreRef.current();
      },
      { root: root || null, rootMargin: '600px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, feedHasMore, posts.length]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-12 pt-0">
      
      {/* Stories + Create Post — tight stack, no large gap */}
      <div className="w-full space-y-1.5">
        <StoryBar />
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PostComposer onPostCreated={() => fetchFeed({ refreshSession: true })} />
        </motion.div>
      </div>

      {/* Facebook-style Reels tray — click opens full Reels section */}
      <FeedReelsTray />

      {/* Feed Stream — tight card stack (mobile + desktop); was space-y-5/6 */}
      <div className="space-y-2 md:space-y-3 mt-2">
        {loading ? (
          <div className="text-center py-16 bg-card/80 md:bg-card/40 md:backdrop-blur-sm rounded-3xl border border-border/40">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary mx-auto shadow-[0_0_20px_rgba(168,85,247,0.5)]"></div>
            <p className="text-xs text-muted-foreground mt-3 font-semibold tracking-wide">{trLabel(t, 'LoadingFeed', 'Loading feed')}...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-6 text-muted-foreground bg-card/80 md:bg-card/50 md:backdrop-blur-sm rounded-[2rem] border border-dashed border-border/70 shadow-inner space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30">
              <Sparkles size={26} />
            </div>
            <p className="font-extrabold text-foreground text-base">{trLabel(t, 'NoPostsYet', 'No posts yet')}</p>
            <p className="text-xs opacity-75 max-w-sm mx-auto">{trLabel(t, 'NoPostsYetBody', 'Be the first to share an update, photo, or AI generated memory with your friends!')}</p>
          </div>
        ) : (
          posts.map((post, index) => {
             const mediaItems = parseLegacyMedia(post.media);
             const isShare = post.type === 'share' || !!post.shareMeta;
             const originalPost = post.shareMeta?.originalPost;
             const originalReel = post.shareMeta?.originalReel;
             const originalRow = originalPost || originalReel || null;
             // Both halves of a reshare can be Space-published, so both go through the
             // one resolver instead of reading `.user` off whichever row is nested —
             // that key is deliberately absent on a Space's row.
             const author = resolveContentAuthor(post, user?.id);
             const originalAuthor = originalRow ? resolveContentAuthor(originalRow) : null;
             const authorHref = author.href;
             const originalAuthorHref = originalAuthor?.href || null;
             const displayMedia = originalPost?.postMedia?.length
               ? originalPost.postMedia
               : post.postMedia || [];
             const displayLegacy = originalPost
               ? parseLegacyMedia(originalPost.media)
               : mediaItems;
             const nestedContent = originalPost?.content || originalReel?.caption || null;
             const linkPreview = parseLinkPreviewJson(
               originalPost?.linkPreviewJson || post.linkPreviewJson || post.linkPreview,
             );
             const isQuestion = String(post.type || '').toLowerCase() === 'question';
             
             return (
            <FeedCardShell post={post} index={index} important={!!post.important} key={post.id}>
              {/* Share attribution */}
              {isShare && (
                <div className="px-4 sm:px-5 pt-3 pb-0 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Repeat2 size={14} className="text-primary shrink-0" />
                  <span className="truncate">
                    {authorHref ? (
                      <Link to={authorHref} className="text-foreground font-bold hover:underline">{author.name}</Link>
                    ) : (
                      <span className="text-foreground font-bold">{author.name}</span>
                    )}
                    {' '}shared a {post.shareMeta?.kind === 'reel' || originalReel ? 'reel' : 'post'}
                    {originalAuthor?.name ? (
                      <>
                        {' '}from{' '}
                        {originalAuthorHref ? (
                          <Link to={originalAuthorHref} className="text-foreground font-bold hover:underline">{originalAuthor.name}</Link>
                        ) : (
                          <span className="text-foreground font-bold">{originalAuthor.name}</span>
                        )}
                      </>
                    ) : null}
                  </span>
                </div>
              )}

              {/* Post Header */}
              <div className="p-4 sm:p-5 flex justify-between items-start gap-2">
                <PostCreatorHeader
                  author={author}
                  timeLabel={formatRelativeTime(post.createdAt, i18n.language)}
                  musicTitle={post.postMusic?.title || post.music?.title}
                  musicArtist={post.postMusic?.artist || post.music?.artist}
                  avatarClassName="h-11 w-11"
                  showAdminPill
                  extraMeta={
                    <>
                      {post.feeling ? <span className="truncate">· feeling {post.feeling}</span> : null}
                      {post.location ? <span className="truncate">· at {post.location}</span> : null}
                    </>
                  }
                />
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {post.pinned && <div className="bg-primary/10 p-1.5 rounded-full"><Pin size={14} className="text-primary transform rotate-45" /></div>}
                  {post.important && <div className="bg-red-500/10 p-1.5 rounded-full"><AlertCircle size={14} className="text-red-500" /></div>}
                  {/*
                    This slot used to be a `MoreHorizontal` button with no handler, so
                    every post on this page had a visible menu affordance that did
                    nothing. `PostOptionsMenu` already renders its own trigger and is
                    the same component the home feed uses, so this is the existing menu
                    reaching a second surface rather than a second implementation.
                  */}
                  <PostOptionsMenu
                    post={post}
                    onHidden={() =>
                      setPosts((list) => {
                        const index = list.findIndex((row) => row.id === post.id);
                        if (index >= 0) hiddenRowsRef.current.set(post.id, { row: list[index], index });
                        return list.filter((row) => row.id !== post.id);
                      })
                    }
                    onRestored={() => {
                      const saved = hiddenRowsRef.current.get(post.id);
                      hiddenRowsRef.current.delete(post.id);
                      if (!saved) return;
                      setPosts((list) => reinsertAt(list, saved.row, saved.index));
                    }}
                    onRemoved={() => setPosts((list) => list.filter((row) => row.id !== post.id))}
                    onChanged={(patch) =>
                      setPosts((list) => list.map((row) => (row.id === post.id ? { ...row, ...patch } : row)))
                    }
                  />
                </div>
              </div>

              {/* Sharer caption */}
              <div className="px-4 sm:px-5 pb-3">
                {isQuestion && (
                  <span className="inline-flex items-center gap-1 mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                    <HelpCircle size={12} />
                    Question
                  </span>
                )}
                {post.content && (
                  isQuestion ? (
                    <ExpandableText
                      text={post.content}
                      className="text-foreground whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed font-medium"
                    />
                  ) : (
                    <AITextTools
                      sourceId={post.id}
                      sourceType="POST"
                      originalText={post.content}
                      enableSummary
                      collapsible
                      textClassName="text-foreground whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed"
                    />
                  )
                )}
                {linkPreview ? (
                  <div className="mt-3">
                    <LinkPreviewCard preview={linkPreview} />
                  </div>
                ) : null}
                {post.isSensitive && (
                  <div className="mt-3 text-xs text-red-500 font-bold border border-red-500/30 bg-red-500/10 p-2.5 rounded-xl text-center">
                    Sensitive Content
                  </div>
                )}
              </div>

              {/* Nested original (for shares) or normal media */}
              {isShare && (originalPost || originalReel) ? (
                <div className="mx-3 sm:mx-5 mb-3 rounded-2xl border border-border/70 overflow-hidden bg-muted/20">
                  {originalAuthor && (
                    <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/50">
                      {originalAuthorHref ? (
                        <Link to={originalAuthorHref} className="shrink-0 touch-manipulation" aria-label={`Open ${originalAuthor.name} profile`}>
                          <AuthorAvatar author={originalAuthor} className="w-7 h-7 text-[9px]" radius="rounded-lg" decorative />
                        </Link>
                      ) : (
                        <AuthorAvatar author={originalAuthor} className="w-7 h-7 text-[9px]" radius="rounded-lg" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate flex items-center gap-1.5">
                          {originalAuthorHref ? (
                            <Link to={originalAuthorHref} className="truncate hover:text-primary hover:underline">{originalAuthor.name}</Link>
                          ) : (
                            <span className="truncate text-muted-foreground">{originalAuthor.name}</span>
                          )}
                          <AuthorVerifiedBadge author={originalAuthor} size={13} />
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-0">
                          {originalAuthor.at && originalAuthorHref ? (
                            <Link to={originalAuthorHref} className="truncate font-semibold hover:text-primary">{originalAuthor.at}</Link>
                          ) : originalAuthor.at ? (
                            <span className="truncate font-semibold">{originalAuthor.at}</span>
                          ) : null}
                          {originalAuthor.at ? <span aria-hidden>·</span> : null}
                          <span>Original {originalReel ? 'reel' : 'post'}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {nestedContent && post.content !== nestedContent && originalPost?.id && (
                    <div className="px-3 py-2">
                      <AITextTools
                        sourceId={originalPost.id}
                        sourceType="POST"
                        originalText={nestedContent}
                        enableSummary
                        collapsible
                        textClassName="text-sm text-foreground/90 whitespace-pre-wrap break-words"
                      />
                    </div>
                  )}
                  {nestedContent && post.content !== nestedContent && !originalPost?.id && (
                    <ExpandableText
                      text={nestedContent}
                      className="px-3 py-2 text-sm text-foreground/90"
                    />
                  )}
                  <PostMediaGrid 
                    media={
                      originalReel
                        ? [{ url: originalReel.videoUrl, type: 'video' }]
                        : displayMedia
                    } 
                    template={originalPost?.templateType || post.templateType} 
                    legacyMedia={originalReel ? [originalReel.videoUrl] : displayLegacy}
                    autoplayEnabled
                    loopVideos={loopVideos}
                    pauseOnScrollAway={pauseOnScrollAway}
                    forceMuteVideos={!!post.postMusic?.originalAudioMuted}
                    hideVideoMuteControl={Boolean(post.postMusic?.audioUrl || post.music?.audioUrl)}
                    onVideoClick={(item) =>
                      openFeedVideoInReels(navigate, payloadFromFeedVideo({ post, item, originalReel }))
                    }
                    onImageClick={(index, photos) =>
                      setPhotoViewer({
                        post,
                        index,
                        photos: photos.map((p) => ({ url: p.url, id: p.id })),
                      })
                    }
                  />
                </div>
              ) : (
                <div className="px-2 sm:px-5 pb-2">
                  <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm">
                    <PostMediaGrid 
                      media={post.postMedia || []} 
                      template={post.templateType} 
                      legacyMedia={mediaItems}
                      autoplayEnabled
                      loopVideos={loopVideos}
                      pauseOnScrollAway={pauseOnScrollAway}
                      forceMuteVideos={!!post.postMusic?.originalAudioMuted}
                      hideVideoMuteControl={Boolean(post.postMusic?.audioUrl || post.music?.audioUrl)}
                    onVideoClick={(item) =>
                      openFeedVideoInReels(navigate, payloadFromFeedVideo({ post, item }))
                    }
                    onImageClick={(index, photos) =>
                      setPhotoViewer({
                        post,
                        index,
                        photos: photos.map((p) => ({ url: p.url, id: p.id })),
                      })
                    }
                    />
                  </div>
                </div>
              )}

              <FeedPoll post={post} />

              {/* Action Bar — visibility from Admin → Feed post actions */}
              <div className="wev-post-actions relative z-20 px-3 sm:px-4 py-2 flex items-center justify-between border-t border-border/50 bg-card">
                {feedActions.react ? <FeedPostReaction post={post} /> : null}
                {feedActions.comment && !post.commentsDisabled ? (
                  <button
                    type="button"
                    onClick={() => setCommentsPost(post)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold text-foreground/85 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                    aria-label={trLabel(t, 'Comments', 'Comments')}
                  >
                    <MessageCircle size={20} strokeWidth={2.35} />
                    {!post.hideCommentCount && <span className="tabular-nums">{post._count?.comments || 0}</span>}
                  </button>
                ) : null}
                {feedActions.repost ? <FeedPostRepost post={post} /> : null}
                {feedActions.share && !post.sharingDisabled ? (
                  <button
                    type="button"
                    onClick={() => setShareTarget({
                      url: `/posts/${post.shareMeta?.originalPost?.id || post.id}`,
                      type: 'post',
                      id: post.shareMeta?.originalPost?.id || post.id,
                    })}
                    className="rounded-full px-3 py-1.5 text-foreground/85 hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label={trLabel(t, 'Share', 'Share')}
                  >
                    <Share2 size={20} strokeWidth={2.35} />
                  </button>
                ) : null}
                {feedActions.views ? <FeedPostViews post={post} /> : null}
              </div>
            </FeedCardShell>
          );
          })
        )}

        {!loading && (
          <div ref={loadMoreSentinelRef} className="flex justify-center pt-2 pb-4 min-h-12">
            {feedHasMore ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchFeed({ append: true, refreshSession: false })}
                className="px-5 py-2.5 rounded-full text-sm font-bold border border-border bg-card/60 hover:bg-muted/50 disabled:opacity-60 transition-colors"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <ShareModal 
        isOpen={!!shareTarget} 
        onClose={() => setShareTarget(null)} 
        url={shareTarget?.url || ''} 
        title={trLabel(t, 'SharePost', 'Share Post')}
        targetType={shareTarget?.type}
        targetId={shareTarget?.id}
        onSharedToFeed={() => fetchFeed({ refreshSession: true })}
      />
      {commentsPost ? (
        <PostCommentsWindow
          post={commentsPost}
          onClose={() => setCommentsPost(null)}
          commentCount={Number(commentsPost._count?.comments) || 0}
          onCommentCount={(n) =>
            setCommentsPost((p: any) =>
              p ? { ...p, _count: { ...p._count, comments: n } } : p,
            )
          }
        />
      ) : null}
      {photoViewer ? (
        <PostPhotoViewer
          open
          photos={photoViewer.photos}
          index={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
          onIndexChange={(next) => setPhotoViewer((cur) => (cur ? { ...cur, index: next } : cur))}
          postId={photoViewer.post.id}
          postTitle={photoViewer.post.content || undefined}
          author={(() => {
            const a = resolveContentAuthor(photoViewer.post, user?.id);
            return {
              name: a.name,
              avatar: a.avatar,
              username: a.at ? String(a.at).replace(/^@/, '') : null,
              href: a.href,
              verified: !!(a as any).verified,
            };
          })()}
          post={photoViewer.post}
          shareCount={Number(photoViewer.post._count?.shares) || 0}
          onPostChanged={(patch) => {
            const id = photoViewer.post.id;
            setPosts((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));
            setPhotoViewer((cur) => (cur && cur.post.id === id ? { ...cur, post: { ...cur.post, ...patch } } : cur));
          }}
          onPostRemoved={() => {
            const id = photoViewer.post.id;
            setPosts((list) => {
              const index = list.findIndex((row) => row.id === id);
              if (index >= 0) hiddenRowsRef.current.set(id, { row: list[index], index });
              return list.filter((row) => row.id !== id);
            });
          }}
          onPostRestored={() => {
            const id = photoViewer.post.id;
            const saved = hiddenRowsRef.current.get(id);
            hiddenRowsRef.current.delete(id);
            if (!saved) return;
            setPosts((list) => reinsertAt(list, saved.row, saved.index));
          }}
          createdAt={photoViewer.post.createdAt}
          commentsDisabled={!!photoViewer.post.commentsDisabled}
          sharingDisabled={!!photoViewer.post.sharingDisabled}
          hideCommentCount={!!photoViewer.post.hideCommentCount}
          hideLikeCount={!!photoViewer.post.hideLikeCount}
          commentCount={Number(photoViewer.post._count?.comments) || 0}
          likeCount={Math.max(
            Number(photoViewer.post._count?.likes) || 0,
            Number(photoViewer.post.analytics?.likeCount) || 0,
            photoViewer.post.myReaction ? 1 : 0,
          )}
          reaction={viewerPostReaction(photoViewer.post)}
          onReact={async (next) => {
            if (!token) {
              toast.error(trLabel(t, 'SignInToReact', 'Sign in to react'));
              return;
            }
            const postId = photoViewer.post.id;
            const prev = viewerPostReaction(photoViewer.post);
            setPhotoViewer((cur) => {
              if (!cur) return cur;
              const likes = Math.max(Number(cur.post._count?.likes) || 0, cur.post.myReaction ? 1 : 0);
              const wasOn = Boolean(prev);
              const nowOn = Boolean(next);
              const delta = wasOn === nowOn ? 0 : nowOn ? 1 : -1;
              return {
                ...cur,
                post: {
                  ...cur.post,
                  myReaction: next,
                  _count: {
                    ...cur.post._count,
                    likes: Math.max(0, likes + delta),
                  },
                },
              };
            });
            try {
              const response = await fetch(`/api/posts/${postId}/react`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: next || prev || 'love', action: next ? 'react' : 'remove' }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.error || 'Could not react');
              setPosts((list) =>
                list.map((p) =>
                  p.id === postId
                    ? {
                        ...p,
                        myReaction: isPostReaction(data.reaction) ? data.reaction : null,
                        _count: {
                          ...p._count,
                          likes: typeof data.likeCount === 'number' ? data.likeCount : p._count?.likes,
                        },
                      }
                    : p,
                ),
              );
              setPhotoViewer((cur) =>
                cur && cur.post.id === postId
                  ? {
                      ...cur,
                      post: {
                        ...cur.post,
                        myReaction: isPostReaction(data.reaction) ? data.reaction : null,
                        _count: {
                          ...cur.post._count,
                          likes: typeof data.likeCount === 'number' ? data.likeCount : cur.post._count?.likes,
                        },
                      },
                    }
                  : cur,
              );
            } catch (err: any) {
              toast.error(err?.message || 'Could not react');
              setPhotoViewer((cur) =>
                cur && cur.post.id === postId ? { ...cur, post: photoViewer.post } : cur,
              );
            }
          }}
          onCommentCount={(n) => {
            setPhotoViewer((cur) =>
              cur
                ? {
                    ...cur,
                    post: { ...cur.post, _count: { ...cur.post._count, comments: n } },
                  }
                : cur,
            );
            setPosts((list) =>
              list.map((p) =>
                p.id === photoViewer.post.id
                  ? { ...p, _count: { ...p._count, comments: n } }
                  : p,
              ),
            );
          }}
        />
      ) : null}
      {reportModal && (
        <ReportModal 
          targetId={reportModal.targetId} 
          targetType={reportModal.targetType} 
          onClose={() => setReportModal(null)} 
        />
      )}
    </div>
  );
}
