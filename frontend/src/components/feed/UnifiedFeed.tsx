import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openShare } from '../../lib/share/openShare';
import { useGovernanceSync } from '../../hooks/useGovernanceSync';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Globe2, HelpCircle, Lock, MessageCircle, Share2, Users } from 'lucide-react';
import { useStore } from '../../store';
import PostCreatorHeader from '../social/PostCreatorHeader';
import { contentAuthorLabel, resolveContentAuthor } from '@wevsoft/shared/content-author';
import { motion } from 'motion/react';
import PostMediaGrid from '../social/PostMediaGrid';
import PostPhotoViewer from '../social/PostPhotoViewer';
import PostComments from '../PostComments';
import CommentsBottomSheet from '../CommentsBottomSheet';
import PostCommentsWindow from '../PostCommentsWindow';
import { parseLegacyMedia } from '../../lib/postMedia';
import ReelsCarousel from './ReelsCarousel';
import FeedProductCard from './FeedProductCard';
import FeedSuggestionsCard, { type FeedSuggestion } from './FeedSuggestionsCard';
import FeedSkeleton from './FeedSkeleton';
import FeedEmptyState from './FeedEmptyState';
import VirtualBlock from './VirtualBlock';
import { AITextTools } from '../ai/AITextTools';
import { observeFeedDwell, startAnalyticsTracker, stopAnalyticsTracker, trackFeedInteraction } from '../../lib/AnalyticsTracker';
import { observePostView } from '../../lib/postViewTracker';
import PostOptionsMenu from '../social/PostOptionsMenu';
import PostViewIndicator from '../social/PostViewIndicator';
import PostBackgroundMusic from '../social/PostBackgroundMusic';
import { openFeedVideoInReels, payloadFromFeedVideo } from '../../lib/openReel';
import { openPostPermalink } from '../../lib/openPost';
import ReactionButton from '../social/ReactionButton';
import { isPostReaction, viewerPostReaction, type ReactionType } from '../../lib/reactions';
import toast from 'react-hot-toast';
import RepostIcon from '../icons/RepostIcon';
import { formatSocialCount } from '../../lib/formatCount';
import SponsoredAdCard from '../ads/SponsoredAdCard';
import FeedPoll from './FeedPoll';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import LinkPreviewCard, { parseLinkPreviewJson } from '../social/LinkPreviewCard';
import ExpandableText from '../ExpandableText';
import PaidPartnershipLabel from './PaidPartnershipLabel';
import PostEditedBadge from '../social/PostEditedBadge';
import { formatRelativeTime, getLocaleForLang } from '../../utils/l10n';
import { trLabel } from '../settings/languagePickerShared';
import { useFeedPostActions } from '../../hooks/useFeedPostActions';

/** Compact relative age for feed meta — prefers Intl narrow, falls back to unit suffixes. */
function shortTimeAgo(value: Date | string | number, langCode?: string): string {
  try {
    const locale = getLocaleForLang(langCode);
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const now = Date.now();
      const target = new Date(value).getTime();
      if (!Number.isFinite(target)) return String(value);
      const diffSec = Math.round((target - now) / 1000);
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'narrow' });
      const abs = Math.abs(diffSec);
      if (abs < 60) return rtf.format(diffSec, 'second');
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
      if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
      if (abs < 2592000) return rtf.format(Math.round(diffSec / 604800), 'week');
      if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
      return rtf.format(Math.round(diffSec / 31536000), 'year');
    }
  } catch {
    /* fall through */
  }
  return formatRelativeTime(value, langCode);
}

function PrivacyMeta({ privacy }: { privacy?: string | null }) {
  const { t } = useTranslation();
  const p = String(privacy || 'public').toLowerCase();
  if (p === 'public') {
    const label = trLabel(t, 'Public', 'Public');
    return (
      <span className="inline-flex items-center gap-0.5" title={label}>
        <Globe2 size={11} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  if (p === 'friends' || p === 'close_friends') {
    const label = p === 'close_friends' ? trLabel(t, 'CloseFriends', 'Close friends') : trLabel(t, 'Friends', 'Friends');
    return (
      <span className="inline-flex items-center gap-0.5" title={label}>
        <Users size={11} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  if (p === 'followers') {
    const label = trLabel(t, 'Followers', 'Followers');
    return (
      <span className="inline-flex items-center gap-0.5" title={label}>
        <Users size={11} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  const label = trLabel(t, 'Private', 'Private');
  return (
    <span className="inline-flex items-center gap-0.5" title={label}>
      <Lock size={11} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

type FeedItem = {
  id: string;
  type: 'POST' | 'REELS_BLOCK' | 'MARKETPLACE_BLOCK' | 'SPONSORED_AD' | 'SUGGESTIONS_BLOCK';
  content?: any;
  reels?: any[];
  products?: any[];
  ad?: any;
  suggestions?: FeedSuggestion[];
};
type FeedGovernance = {
  enforcing?: boolean;
  studyHoursActive?: boolean;
  activeWindowName?: string | null;
  autoplayAllowed?: boolean;
  infiniteScrollAllowed?: boolean;
  screenTimeLocked?: boolean;
  studentMode?: boolean;
  warnings?: { slug: string; warning: string; suggestCategories: string[] }[];
  suggestCategories?: string[];
};

/** Keep a phone's first render small; the remaining items load on scroll. */
function getFeedPageSize() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    ? 8
    : 16;
}

function shouldAnimateFeedCards() {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
}

const StudyHoursBanner = memo(function StudyHoursBanner({ name }: { name?: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
      <BookOpen size={18} className="shrink-0" />
      <div className="text-sm">
        <p className="font-bold">Study hours are active{name ? ` — ${name}` : ''}</p>
        <p className="text-xs opacity-80">{trLabel(t, 'FeedLimitedLearning', 'Your feed is limited to learning-friendly content right now.')}</p>
      </div>
    </div>
  );
});

export const UnifiedPostCard = memo(function UnifiedPostCard({
  post,
  onHidden,
  onRestored,
  autoplayEnabled = true,
  /**
   * `window` (default): comments overlay on top of the feed (no route change).
   * `navigate`: `/posts/:id` permalink. `inline`: legacy expand. `hidden`: no comment control.
   */
  commentsMode = 'window',
  /**
   * `feed` (default): mobile flush edge-to-edge + hairline dividers.
   * `card`: always rounded bordered tile — use on profile / inset columns.
   */
  variant = 'feed',
}: {
  post: any;
  onHidden?: () => void;
  onRestored?: () => void;
  autoplayEnabled?: boolean;
  commentsMode?: 'window' | 'navigate' | 'inline' | 'hidden';
  variant?: 'feed' | 'card';
}) {
  const { t, i18n } = useTranslation();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const feedActions = useFeedPostActions();
  const rawLikeCount = Math.max(
    Number(post._count?.likes) || 0,
    Number(post.analytics?.likeCount) || 0,
    Number(post._count?.reactions) || 0,
    Array.isArray(post.likes) ? post.likes.length : 0,
    Array.isArray(post.reactions) ? post.reactions.length : 0,
    post.myReaction ? 1 : 0
  );
  const [liked, setLiked] = useState(Boolean(post.likes?.length || post.myReaction));
  const [likeCount, setLikeCount] = useState(rawLikeCount);
  const [commentCount, setCommentCount] = useState(Number(post._count?.comments) || 0);
  const [reaction, setReaction] = useState<ReactionType | null>(() => viewerPostReaction(post));
  const reactionReqId = useRef(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ index: number; photos: Array<{ url: string; id?: string }> } | null>(null);
  const [cardPost, setCardPost] = useState(post);
  const [isBoosted, setIsBoosted] = useState(!!post.isBoosted);
  const [boostsCount, setBoostsCount] = useState(Number(post.boostsCount) || 0);
  const [viewCount, setViewCount] = useState(
    typeof post.viewCount === 'number' ? post.viewCount : 0,
  );
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local card state when the post prop changes
  useEffect(() => { setCardPost(post); }, [post]);
  useEffect(() => {
    const freshLikeCount = Math.max(
      Number(post._count?.likes) || 0,
      Number(post.analytics?.likeCount) || 0,
      Number(post._count?.reactions) || 0,
      Array.isArray(post.likes) ? post.likes.length : 0,
      Array.isArray(post.reactions) ? post.reactions.length : 0,
      post.myReaction ? 1 : 0
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local card state when the post prop changes
    setCommentCount(Number(post._count?.comments) || 0);
    setLikeCount(freshLikeCount);
    setLiked(Boolean(post.likes?.length || post.myReaction));
    setReaction(viewerPostReaction(post));
  }, [post.id, post.myReaction, post.likes, post.reactions, post._count?.likes, post._count?.reactions]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local card state when the post prop changes
    setIsBoosted(!!post.isBoosted);
    setBoostsCount(Number(post.boostsCount) || 0);
  }, [post.id, post.isBoosted, post.boostsCount]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local card state when the post prop changes
    setViewCount(typeof post.viewCount === 'number' ? post.viewCount : 0);
  }, [post.id, post.viewCount]);

  const canBoost = Boolean(token && !cardPost.sharingDisabled);
  const isOwnPost =
    !!user?.id &&
    (cardPost.userId === user.id || cardPost.user?.id === user.id);

  const updateCommentCount = useCallback((updater: number | ((prev: number) => number)) => {
    setCommentCount((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (post && typeof post === 'object') {
        post._count = { ...(post._count || {}), comments: next };
      }
      return next;
    });
  }, [post]);

  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cardRef.current) return;
    return observeFeedDwell(cardRef.current, { targetId: cardPost.id, targetType: 'POST', categoryId: cardPost.category });
  }, [cardPost.category, cardPost.id]);

  useEffect(() => {
    if (!cardRef.current) return;
    const isVideoLike =
      String(cardPost.type || '').toLowerCase() === 'video' ||
      String(cardPost.type || '').toLowerCase() === 'reel' ||
      (Array.isArray(cardPost.postMedia) &&
        cardPost.postMedia.some((m: any) => String(m.type || '').includes('video')));
    return observePostView(cardRef.current, {
      postId: cardPost.id,
      source: 'feed',
      isVideoLike,
      onCounted: (views) => {
        setViewCount(views);
        if (post && typeof post === 'object') {
          post.viewCount = views;
        }
        window.dispatchEvent(
          new CustomEvent('wev:post-view-count', { detail: { postId: cardPost.id, views } }),
        );
      },
    });
  }, [cardPost.id, cardPost.type, cardPost.postMedia, post]);
  const applyReaction = async (next: ReactionType | null) => {
    if (!token) {
      toast.error(trLabel(t, 'SignInToReact', 'Sign in to react'));
      return;
    }
    const reqId = ++reactionReqId.current;
    const prev = reaction;
    const prevCount = likeCount;
    const prevLiked = liked;
    const optimistic = next;
    setReaction(optimistic);
    const wasOn = Boolean(prev);
    const nowOn = Boolean(optimistic);
    const optimisticCount = wasOn !== nowOn ? Math.max(0, prevCount + (nowOn ? 1 : -1)) : prevCount;
    if (wasOn !== nowOn) setLikeCount(optimisticCount);
    setLiked(nowOn);
    if (post && typeof post === 'object') {
      // eslint-disable-next-line react-hooks/immutability -- intentional: keeps the shared feed item in sync so remounted cards show the optimistic state (existing behavior)
      post.myReaction = optimistic;
      post.likes = nowOn ? [{ id: 'optimistic' }] : [];
      post._count = { ...(post._count || {}), likes: optimisticCount, reactions: optimisticCount };
    }
    try {
      const response = await fetch(`/api/posts/${cardPost.id}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: next || prev || 'love', action: next ? 'react' : 'remove' }),
      });
      if (reqId !== reactionReqId.current) return;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not react');
      const serverType = isPostReaction(data.reaction) ? data.reaction : null;
      const finalLiked = Boolean(data.liked);
      const finalCount = typeof data.likeCount === 'number' ? data.likeCount : optimisticCount;
      setReaction(serverType);
      setLiked(finalLiked);
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      if (post && typeof post === 'object') {
        post.myReaction = serverType;
        post.likes = finalLiked ? [{ id: 'liked' }] : [];
        post._count = { ...(post._count || {}), likes: finalCount, reactions: finalCount };
      }
      window.dispatchEvent(new CustomEvent('wev:post-reacted', { detail: { postId: cardPost.id } }));
      trackFeedInteraction({ targetId: cardPost.id, targetType: 'POST', categoryId: cardPost.category, actionType: 'LIKE' });
    } catch (err: any) {
      if (reqId !== reactionReqId.current) return;
      setReaction(prev);
      setLikeCount(prevCount);
      setLiked(prevLiked);
      if (post && typeof post === 'object') {
        post.myReaction = prev;
        post.likes = prevLiked ? [{ id: 'liked' }] : [];
        post._count = { ...(post._count || {}), likes: prevCount, reactions: prevCount };
      }
      toast.error(err?.message || 'Could not react');
    }
  };
  const handleBoost = () => {
    if (!token || !canBoost) return;
    const next = !isBoosted;
    const nextCount = Math.max(0, boostsCount + (next ? 1 : -1));
    setIsBoosted(next);
    setBoostsCount(nextCount);
    if (post && typeof post === 'object') {
      // eslint-disable-next-line react-hooks/immutability -- intentional: keeps the shared feed item in sync so remounted cards show the optimistic state (existing behavior)
      post.isBoosted = next;
      post.boostsCount = nextCount;
    }
    fetch(`/api/posts/${cardPost.id}/boost`, {
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
        toast.success(d.boosted ? trLabel(t, 'RepostedToNetwork', 'Reposted to your network') : trLabel(t, 'RepostRemoved', 'Repost removed'));
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
  const text = cardPost.content || '';
  const linkPreview = parseLinkPreviewJson(cardPost.linkPreviewJson || cardPost.linkPreview);
  const isQuestion = String(cardPost.type || '').toLowerCase() === 'question';
  // A Space-published card names the Space. `cardPost.user` is absent on those rows
  // by design, so there is nothing to fall back to — see `shared/content-author.ts`.
  const author = resolveContentAuthor(cardPost, user?.id);
  const hasPostMusic = Boolean(cardPost.postMusic?.audioUrl || cardPost.music?.audioUrl);
  const hasMedia = Boolean(cardPost.postMedia?.length || cardPost.media);
  const musicControl = (
    <PostBackgroundMusic
      postId={cardPost.id}
      post={cardPost}
      rootRef={cardRef}
      enabled={autoplayEnabled}
    />
  );
  const cardShellClass =
    variant === 'card'
      ? // Profile/mobile: edge-to-edge (no side gutters); soft corners from sm+ so it never feels like a floating box
        'relative overflow-hidden rounded-none border-x-0 border-y border-border/50 bg-card sm:rounded-[1.75rem] sm:border sm:border-border/40 sm:shadow-sm sm:shadow-black/5 md:rounded-[2rem] md:bg-card/50 dark:sm:shadow-black/20'
      : 'relative overflow-x-hidden rounded-none border-x-0 border-y border-border/60 bg-card shadow-none md:overflow-hidden md:rounded-3xl md:border md:border-border/60 md:bg-card/50 md:shadow-sm';

  return (
    <article ref={cardRef} data-feed-card className={cardShellClass}>
      {!hasMedia ? musicControl : null}
      {(cardPost.pinned || cardPost.isPinned) && (
        <div className="flex items-center gap-1.5 px-3 pt-3 text-[11px] font-bold text-violet-600 md:px-4">
          <span aria-hidden>📌</span>
          Pinned Post
        </div>
      )}
      <div className="flex items-start justify-between gap-2 px-2.5 py-3 md:p-4">
        <PostCreatorHeader
          author={author}
          timeLabel={shortTimeAgo(cardPost.createdAt, i18n.language)}
          musicTitle={cardPost.postMusic?.title || cardPost.music?.title}
          musicArtist={cardPost.postMusic?.artist || cardPost.music?.artist}
          extraMeta={
            <>
              <PrivacyMeta privacy={cardPost.privacy} />
              <PostEditedBadge postId={cardPost.id} editedAt={cardPost.editedAt} isOwner={isOwnPost} token={token} />
              <PaidPartnershipLabel post={cardPost} />
              {cardPost.feeling ? <span className="truncate">· feeling {cardPost.feeling}</span> : null}
              {cardPost.location ? <span className="truncate">· at {cardPost.location}</span> : null}
            </>
          }
        />
        <PostOptionsMenu
          post={cardPost}
          onHidden={onHidden}
          onRestored={onRestored}
          onRemoved={onHidden}
          onChanged={(patch) => {
            if (post && typeof post === 'object') Object.assign(post, patch);
            setCardPost((current: any) => ({ ...current, ...patch }));
          }}
        />
      </div>
      {isQuestion && (
        <div className="px-2.5 pb-1 md:px-4">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
            <HelpCircle size={12} />
            Question
          </span>
        </div>
      )}
      {text && (
        <div className="px-2.5 pb-3 md:px-4">
          {isQuestion ? (
            <ExpandableText
              text={text}
              className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium"
            />
          ) : (
            <AITextTools
              sourceId={cardPost.id}
              sourceType="POST"
              originalText={text}
              enableSummary
              collapsible
              textClassName="text-sm leading-relaxed whitespace-pre-wrap break-words"
            />
          )}
        </div>
      )}
      {linkPreview ? (
        <div className="px-2.5 pb-3 md:px-4">
          <LinkPreviewCard preview={linkPreview} />
        </div>
      ) : null}
      {hasMedia ? (
        <div className="relative">
          <PostMediaGrid
            media={cardPost.postMedia || []}
            template={cardPost.templateType}
            legacyMedia={parseLegacyMedia(cardPost.media)}
            autoplayEnabled={autoplayEnabled}
            loopVideos
            pauseOnScrollAway
            forceMuteVideos={!!cardPost.postMusic?.originalAudioMuted}
            hideVideoMuteControl={hasPostMusic}
            onVideoClick={(item) => openFeedVideoInReels(navigate, payloadFromFeedVideo({ post: cardPost, item }))}
            onImageClick={(index, photos) =>
              setPhotoViewer({
                index,
                photos: photos.map((p) => ({ url: p.url, id: p.id })),
              })
            }
          />
          {musicControl}
        </div>
      ) : null}
      <FeedPoll post={cardPost} />
      <div className="wev-post-actions flex items-center justify-between border-t border-border/50 px-3 py-2">
        {/* eslint-disable-next-line react-hooks/immutability -- applyReaction intentionally syncs the shared feed item (see above) */}
        {feedActions.react ? (
          <ReactionButton value={reaction} count={likeCount} onChange={applyReaction} variant="feed" hideCount={!!cardPost.hideLikeCount} />
        ) : null}
        {feedActions.comment ? (
          <button
            type="button"
            onClick={() => {
              trackFeedInteraction({ targetId: cardPost.id, targetType: 'POST', categoryId: cardPost.category, actionType: 'COMMENT' });
              if (commentsMode === 'inline') {
                setCommentsOpen((value) => !value);
                return;
              }
              if (commentsMode === 'hidden') {
                document.getElementById('post-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
              }
              if (commentsMode === 'navigate') {
                openPostPermalink(navigate, cardPost);
                return;
              }
              setCommentsOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold text-foreground/85 hover:text-sky-500"
            aria-label={trLabel(t, 'Comments', 'Comments')}
          >
            <MessageCircle size={20} strokeWidth={2.35} />
            {cardPost.hideCommentCount ? null : <span className="tabular-nums">{formatSocialCount(commentCount)}</span>}
          </button>
        ) : null}
        {feedActions.repost && canBoost ? (
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
        ) : null}
        {feedActions.share ? (
          <button type="button" onClick={() => { trackFeedInteraction({ targetId: cardPost.id, targetType: 'POST', categoryId: cardPost.category, actionType: 'SHARE' }); openShare({ url: `/posts/${cardPost.id}`, title: text || contentAuthorLabel(cardPost), targetType: 'post', targetId: cardPost.id }); }} className="rounded-full px-3 py-1.5 text-foreground/85 hover:text-foreground" aria-label={trLabel(t, 'Share', 'Share')}><Share2 size={20} strokeWidth={2.35} /></button>
        ) : null}
        {feedActions.views ? (
          <PostViewIndicator
            postId={cardPost.id}
            viewCount={typeof viewCount === 'number' ? viewCount : 0}
            canOpenDetails={isOwnPost}
            hidden={
              String(cardPost.viewCountVisibility || 'public').toLowerCase() === 'hidden' ||
              (String(cardPost.viewCountVisibility || '').toLowerCase() === 'owner' && !isOwnPost)
            }
          />
        ) : null}
      </div>
      {photoViewer ? (
        <PostPhotoViewer
          open
          photos={photoViewer.photos}
          index={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
          onIndexChange={(next) => setPhotoViewer((cur) => (cur ? { ...cur, index: next } : cur))}
          postId={cardPost.id}
          postTitle={text}
          author={{
            name: author.name || contentAuthorLabel(cardPost),
            avatar: author.avatar,
            username: author.at ? String(author.at).replace(/^@/, '') : null,
            href: author.href,
            verified: !!author.verified,
          }}
          post={cardPost}
          onPostChanged={(patch) => {
            if (post && typeof post === 'object') Object.assign(post, patch);
            setCardPost((current: any) => ({ ...current, ...patch }));
          }}
          onPostRemoved={onHidden}
          onPostRestored={onRestored}
          shareCount={Number(cardPost._count?.shares) || 0}
          createdAt={cardPost.createdAt}
          commentsDisabled={!!cardPost.commentsDisabled}
          sharingDisabled={!!cardPost.sharingDisabled}
          hideCommentCount={!!cardPost.hideCommentCount}
          hideLikeCount={!!cardPost.hideLikeCount}
          commentCount={commentCount}
          likeCount={likeCount}
          reaction={reaction}
          onReact={applyReaction}
          onCommentCount={updateCommentCount}
        />
      ) : null}
      {commentsMode === 'window' && commentsOpen ? (
        <PostCommentsWindow
          post={cardPost}
          onClose={() => setCommentsOpen(false)}
          commentCount={commentCount}
          onCommentCount={updateCommentCount}
        />
      ) : null}
      {commentsMode === 'inline' && commentsOpen && (
        <CommentsBottomSheet
          open
          onClose={() => setCommentsOpen(false)}
          count={commentCount}
          inline={
            <div className="border-t border-border/50 bg-muted/10">
              <PostComments
                postId={cardPost.id}
                onCommentCreated={() => updateCommentCount((c) => c + 1)}
                onCommentsLoaded={(n) => updateCommentCount((c) => Math.max(c, n))}
              />
            </div>
          }
        >
          <PostComments
            postId={cardPost.id}
            variant="sheet"
            onCommentCreated={() => updateCommentCount((c) => c + 1)}
            onCommentsLoaded={(n) => updateCommentCount((c) => Math.max(c, n))}
          />
        </CommentsBottomSheet>
      )}
    </article>
  );
});

function injectSuggestions(
  items: FeedItem[],
  suggestions: FeedSuggestion[],
  alreadyInjected: boolean,
): FeedItem[] {
  if (alreadyInjected || !suggestions.length) return items;
  const block: FeedItem = {
    id: 'suggestions:home',
    type: 'SUGGESTIONS_BLOCK',
    suggestions: suggestions.slice(0, 8),
  };
  const insertAt = Math.min(2, items.length);
  const next = items.slice();
  next.splice(insertAt, 0, block);
  return next;
}

export default function UnifiedFeed({
  mediaActive = true,
  spaceId,
}: { mediaActive?: boolean; spaceId?: string }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const { isSpaceMode } = useSpaceIdentities();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [governance, setGovernance] = useState<FeedGovernance | null>(null);
  const suggestionsInjected = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const infiniteRef = useRef(true);
  const pageSizeRef = useRef(getFeedPageSize());
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadSeqRef = useRef(0);
  // Decided once on mount (same as the previous ref); state so render may read it.
  const [animateCards] = useState(() => shouldAnimateFeedCards());
  const allowFriendSuggestions = !isSpaceMode && !spaceId;

  useEffect(() => {
    startAnalyticsTracker();
    return () => {
      abortControllerRef.current?.abort();
      stopAnalyticsTracker();
    };
  }, [token]);

  const load = useCallback(async (append = false) => {
    if (!token) return;
    if (append && (!hasMoreRef.current || loadingMoreRef.current || !infiniteRef.current)) return;

    if (!append) {
      abortControllerRef.current?.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const seq = ++loadSeqRef.current;

    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLoadError(false);
    }

    const shouldFetchSuggestions = !append && !suggestionsInjected.current && allowFriendSuggestions;
    const suggestionsPromise = shouldFetchSuggestions
      ? fetch('/api/v1/feed/suggestions', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : null;

    try {
      const params = new URLSearchParams({ limit: String(pageSizeRef.current) });
      if (append && cursorRef.current) params.set('cursor', cursorRef.current);
      if (spaceId) params.set('spaceId', spaceId);
      const response = await fetch(`/api/v1/feed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Feed request failed');
      const body = await response.json();
      if (seq !== loadSeqRef.current || controller.signal.aborted) return;

      const nextItems: FeedItem[] = body?.data?.items || [];
      const nextCursor = body?.data?.nextCursor || null;
      setGovernance(body?.meta?.governance || null);
      infiniteRef.current = body?.meta?.governance?.infiniteScrollAllowed !== false;

      if (!allowFriendSuggestions) {
        suggestionsInjected.current = true;
      }

      setItems((current) =>
        append
          ? [...current, ...nextItems.filter((item) => !current.some((old) => old.id === item.id))]
          : nextItems,
      );
      cursorRef.current = nextCursor;
      hasMoreRef.current = Boolean(nextCursor);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
      setLoading(false);

      if (suggestionsPromise) {
        void suggestionsPromise.then((sugBody) => {
          if (seq !== loadSeqRef.current || controller.signal.aborted || suggestionsInjected.current) return;
          const suggestions: FeedSuggestion[] = Array.isArray(sugBody?.suggestions)
            ? sugBody.suggestions
            : [];
          suggestionsInjected.current = true;
          if (suggestions.length > 0) {
            setItems((current) => injectSuggestions(current, suggestions, current.some((i) => i.id === 'suggestions:home')));
          }
        });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || seq !== loadSeqRef.current) return;
      console.error(error);
      if (!append) {
        setItems([]);
        setLoadError(true);
      }
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [spaceId, token, allowFriendSuggestions]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    suggestionsInjected.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    loadingMoreRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset paging when the feed source changes
    setCursor(null);
    setHasMore(true);
    void load(false);
  }, [token, spaceId, load]);

  useGovernanceSync(useCallback(() => {
    suggestionsInjected.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    loadingMoreRef.current = false;
    setCursor(null);
    setHasMore(true);
    void loadRef.current(false);
  }, []));

  useEffect(() => {
    if (loading || !hasMore) return;
    const node = sentinel.current;
    if (!node) return;
    // Feed scrolls inside #main-scroll-area, not the window — root must match
    // or the sentinel often never "intersects" / never re-fires after a page.
    const root = typeof document !== 'undefined' ? document.getElementById('main-scroll-area') : null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadRef.current(true);
      },
      { root: root || null, rootMargin: '600px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Re-arm after each page so a still-visible sentinel loads the next page
    // (IntersectionObserver does not re-fire while isIntersecting stays true).
  }, [loading, loadingMore, hasMore, items.length]);

  if (loading) return <FeedSkeleton />;

  const visible = items.filter(
    (item) => item.type !== 'POST' || (item.content?.id && !hiddenIds.has(item.content.id)),
  );
  const autoplay = mediaActive && governance?.autoplayAllowed !== false;
  const organicCount = visible.filter((item) => item.type !== 'SUGGESTIONS_BLOCK').length;

  return (
    <div className="space-y-0 md:space-y-2">
      {governance?.studyHoursActive && (
        <div className="px-3 md:px-0 py-2 md:py-0">
          <StudyHoursBanner name={governance.activeWindowName} />
        </div>
      )}
      {governance?.warnings?.[0] && (
        <div className="px-3 md:px-0 py-2 md:py-0">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sky-800 dark:text-sky-300">
          <BookOpen size={18} className="shrink-0" />
          <div className="text-sm">
            <p className="font-bold">{governance.warnings[0].warning}</p>
            {governance.suggestCategories?.length ? (
              <p className="text-xs opacity-80 truncate">{t('TryCategories', { cats: governance.suggestCategories.slice(0, 4).join(', ') }) === 'TryCategories' ? `Try: ${governance.suggestCategories.slice(0, 4).join(', ')}` : t('TryCategories', { cats: governance.suggestCategories.slice(0, 4).join(', ') })}</p>
            ) : null}
          </div>
        </div>
        </div>
      )}
      {governance?.screenTimeLocked && (
        <div className="px-3 md:px-0 py-2 md:py-0">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-300">
          <Clock size={18} className="shrink-0" />
          <div className="text-sm">
            <p className="font-bold truncate">{trLabel(t, 'DailyScreenTimeCap', 'Daily screen-time cap reached')}</p>
            <p className="text-xs opacity-80">{trLabel(t, 'EntertainmentPaused', 'Entertainment is paused. Learning content can still appear.')}</p>
          </div>
        </div>
        </div>
      )}
      {loadError ? (
        <div className="px-3 md:px-0 py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">{trLabel(t, 'CouldntLoadFeed', "Couldn't load your feed.")}</p>
          <button
            type="button"
            onClick={() => {
              suggestionsInjected.current = false;
              setCursor(null);
              setHasMore(true);
              load(false);
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            {trLabel(t, 'TryAgain', 'Try again')}
          </button>
        </div>
      ) : null}
      {!loadError && organicCount === 0 ? (
        <FeedEmptyState variant="feed" />
      ) : null}
      {visible.map((item, index) => (
        <motion.div
          key={item.id}
          initial={animateCards ? { opacity: 0, y: 12 } : false}
          animate={animateCards ? { opacity: 1, y: 0 } : undefined}
          transition={animateCards ? { duration: 0.2, delay: Math.min(index * 0.025, 0.15) } : undefined}
          className={
            item.type === 'REELS_BLOCK' || item.type === 'MARKETPLACE_BLOCK' || item.type === 'SUGGESTIONS_BLOCK'
              ? 'md:my-1'
              : undefined
          }
        >
          <VirtualBlock>
            {item.type === 'POST' ? (
              <UnifiedPostCard post={item.content} autoplayEnabled={autoplay} onHidden={() => setHiddenIds((prev) => new Set(prev).add(item.content?.id))}
                onRestored={() =>
                  setHiddenIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.content?.id);
                    return next;
                  })
                }
              />
            ) : item.type === 'SPONSORED_AD' ? (
              <SponsoredAdCard ad={item.ad} />
            ) : item.type === 'REELS_BLOCK' ? (
              <ReelsCarousel reels={item.reels || []} />
            ) : item.type === 'SUGGESTIONS_BLOCK' ? (
              <FeedSuggestionsCard suggestions={item.suggestions || []} />
            ) : (
              <FeedProductCard products={item.products || []} />
            )}
          </VirtualBlock>
        </motion.div>
      ))}
      <div ref={sentinel} className="min-h-12 flex items-center justify-center py-3 text-xs text-muted-foreground">
        {loadingMore ? (
          trLabel(t, 'LoadingMore', 'Loading more…')
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void load(true)}
            className="px-4 py-2 rounded-full border border-border bg-card/70 hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
          >
            {trLabel(t, 'LoadMore', 'Load more')}
          </button>
        ) : visible.length > 0 ? (
          trLabel(t, 'AllCaughtUp', "You're all caught up")
        ) : null}
      </div>
    </div>
  );
}
