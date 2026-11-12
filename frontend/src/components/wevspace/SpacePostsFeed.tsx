import { spaceDeskPath } from '@wevsoft/shared/wevspace';
/**
 * The Posts and Reels tabs on a public Space page (MP3 §35).
 *
 * Backed by GET /api/spaces/:id/posts, which reads the same Post rows the owner's
 * composer writes — a Space reel is a Post with type 'reel', not a Reel row. There
 * is one table, one writer and now one reader, so a post cannot appear in the
 * dashboard and be missing here.
 *
 * The card is assembled from the atoms the personal feed already uses —
 * PostMediaGrid, ReactionButton — rather than a second card implementation.
 * Comment opens the Facebook-style `/posts/:id` permalink (not inline in the feed).
 *
 * What is deliberately *not* reused is UnifiedPostCard's header. That header renders
 * `post.user` — the human account — and here the author is the Space. MP2 §9 is
 * explicit that the identity must read User → WevSpace, never User → the owner's
 * personal account, so the header is built from the Space and the server does not
 * send an author at all. There is no field here to accidentally leak.
 *
 * Reactions and comments post to the existing /api/posts/:id endpoints. A Space post
 * is a Post, so it already has working likes and comments; inventing Space-specific
 * ones would have split engagement across two systems for the same row.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { openShare } from '../../lib/share/openShare';
import { Film, Loader2, MapPin, MessageCircle, Pin, Share2, SquarePen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { fetchSpacePosts, type SpacePostPayload } from '../../lib/wevspaceApi';
import { isPostReaction, viewerPostReaction, type ReactionType } from '../../lib/reactions';
import { parseLegacyMedia } from '../../lib/postMedia';
import PostMediaGrid from '../social/PostMediaGrid';
import PostPhotoViewer from '../social/PostPhotoViewer';
import ReactionButton from '../social/ReactionButton';
import { resolveAvatarUrl } from '../UserAvatar';
import { isVerifiedSpace } from '@wevsoft/shared/wevspace';
import SponsoredAdCard from '../ads/SponsoredAdCard';
import PostCommentsWindow from '../PostCommentsWindow';
import VirtualBlock from '../feed/VirtualBlock';
import { useFeedPostActions } from '../../hooks/useFeedPostActions';

interface SpaceAuthor {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  verificationStatus?: string | null;
}

interface Props {
  space: SpaceAuthor;
  /** 'reel' shows only reels, 'post' excludes them, undefined shows both. */
  kind?: 'post' | 'reel';
  accent: string;
  /** Renders the owner's nudge toward the composer. The server re-checks it. */
  canPost?: boolean;
  /** Home tab preview: caps the list and hides pagination. */
  limit?: number;
  compact?: boolean;
  /** Opens the Space composer (Home) instead of linking to Manage → Content. */
  onCompose?: () => void;
  className?: string;
}

export default function SpacePostsFeed({
  space,
  kind,
  accent,
  canPost = false,
  limit,
  compact = false,
  onCompose,
  className = '',
}: Props) {
  const pageSize = limit || 10;
  const [posts, setPosts] = useState<SpacePostPayload[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchSpacePosts(space.id, { kind, limit: pageSize, offset });
        setPosts((current) => (offset === 0 ? res.posts : [...current, ...res.posts]));
        setTotal(res.total || 0);
      } catch (err: any) {
        setError(err?.message || 'Could not load posts');
        if (offset === 0) setPosts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [space.id, kind, pageSize],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load(0);
  }, [load]);

  const isReels = kind === 'reel';
  // In preview mode the caller asked for N; offering "load more" would quietly turn
  // the Home tab into the Posts tab.
  const hasMore = !limit && posts.length > 0 && posts.length < total;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    if (!hasMore || loadingMore) return;
    void load(posts.length);
  };

  useEffect(() => {
    if (loading || !hasMore) return;
    const node = sentinelRef.current;
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
  }, [loading, loadingMore, hasMore, posts.length]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: compact ? 1 : 2 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted animate-pulse" />
            <div className="mt-4 aspect-video rounded-2xl bg-muted animate-pulse" />
          </div>
        ))}
        <span className="sr-only" role="status">
          Loading posts
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-card border border-border rounded-3xl p-6 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => void load(0)}
          className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`border-2 border-dashed border-border rounded-3xl p-8 sm:p-10 text-center ${className}`}>
        <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
          {isReels ? <Film size={20} /> : <SquarePen size={20} />}
        </span>
        <p className="mt-3 font-black text-sm">
          {isReels ? `${space.name} has not posted a reel yet` : `${space.name} has not posted yet`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          {canPost
            ? 'Anything you publish here is authored by the Space, not by your personal account.'
            : 'Follow this WevSpace to see new posts as soon as they go up.'}
        </p>
        {canPost && (
          onCompose ? (
            <button
              type="button"
              onClick={onCompose}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-extrabold text-primary-foreground hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            >
              <SquarePen size={15} /> {isReels ? 'Upload a reel' : 'Write a post'}
            </button>
          ) : (
            <a
              href={spaceDeskPath(space.handle, 's/content')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-extrabold text-primary-foreground hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            >
              <SquarePen size={15} /> {isReels ? 'Upload a reel' : 'Write a post'}
            </a>
          )
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {posts.map((post: any) =>
          post?.type === 'sponsored_ad' && post.ad ? (
            <VirtualBlock key={post.id} defaultHeight={200}>
              <SponsoredAdCard ad={{ ...post.ad, placement: 'WEVSPACE' }} />
            </VirtualBlock>
          ) : (
            <VirtualBlock key={post.id} defaultHeight={400}>
              <SpacePostCard post={post} space={space} accent={accent} />
            </VirtualBlock>
          ),
        )}
      </div>

      <div ref={sentinelRef} className="mt-4 text-center min-h-12">
        {hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(posts.length)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            {loadingMore && <Loader2 size={15} className="animate-spin" />}
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SpacePostCard({
  post,
  space,
  accent,
}: {
  post: SpacePostPayload;
  space: SpaceAuthor;
  accent: string;
}) {
  const token = useStore((s) => s.token);
  const feedActions = useFeedPostActions();
  const pAny = post as any;
  const rawLikeCount = Math.max(
    Number(pAny._count?.likes) || 0,
    Number(pAny._count?.reactions) || 0,
    Array.isArray(pAny.likes) ? pAny.likes.length : 0,
    Array.isArray(pAny.reactions) ? pAny.reactions.length : 0,
    pAny.myReaction ? 1 : 0
  );
  const [reaction, setReaction] = useState<ReactionType | null>(
    viewerPostReaction(post),
  );
  const [likeCount, setLikeCount] = useState(rawLikeCount);
  const [commentCount, setCommentCount] = useState(post._count?.comments || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ index: number; photos: Array<{ url: string; id?: string }> } | null>(null);
  const reactionReqId = useRef(0);
  const avatarUrl = resolveAvatarUrl(space.avatar);

  /**
   * Optimistic, then reconciled against the server's answer — the same shape the
   * personal feed uses, including rolling the count back on failure so a dropped
   * request cannot leave a like that was never recorded.
   */
  const applyReaction = async (next: ReactionType | null) => {
    if (!token) {
      toast.error('Sign in to react');
      return;
    }
    const reqId = ++reactionReqId.current;
    const prev = reaction;
    const prevCount = likeCount;
    setReaction(next);
    if (Boolean(prev) !== Boolean(next)) setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const response = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: next || prev || 'love', action: next ? 'react' : 'remove' }),
      });
      if (reqId !== reactionReqId.current) return;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'react failed');
      setReaction(isPostReaction(data.reaction) ? data.reaction : null);
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
    } catch (err: any) {
      if (reqId !== reactionReqId.current) return;
      setReaction(prev);
      setLikeCount(prevCount);
      toast.error(err?.message || 'Could not save that reaction');
    }
  };

  const share = () => {
    openShare({
      url: `/posts/${post.id}`,
      title: post.content?.slice(0, 120) || space.name,
      targetType: 'post',
      targetId: post.id,
      preview: { authorName: space.name, authorAvatar: space.avatar || undefined, title: post.content || space.name },
    });
  };

  const hasMedia = post.postMedia.length > 0 || !!post.media;

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-card/50 shadow-sm">
      {/* The Space is the author. There is no personal account in this header
          because the payload does not carry one (MP2 §9). */}
      <header className="flex items-start justify-between gap-2 p-4">
        <a href={`/space/@${space.handle}`} className="flex min-w-0 items-center gap-3 group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-2xl object-cover" loading="lazy" />
          ) : (
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-sm font-black text-white"
              style={{ background: accent }}
              aria-hidden="true"
            >
              {space.name.trim().charAt(0).toUpperCase() || 'S'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold group-hover:underline">
              {space.name}
              {isVerifiedSpace(space.verificationStatus) && (
                <span className="ml-1 text-sky-500" title="Verified WevSpace" aria-label="Verified">
                  ✓
                </span>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">@{space.handle}</span>
              <span aria-hidden="true">·</span>
              {String(post.type).toLowerCase() === 'reel' && (
                <>
                  <span className="inline-flex items-center gap-0.5 font-bold text-foreground/80">
                    <Film size={10} /> Reel
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <time dateTime={String(post.createdAt)}>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </time>
            </p>
          </div>
        </a>
        {post.pinned && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            <Pin size={10} /> Pinned
          </span>
        )}
      </header>

      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
          {post.hashtags?.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {post.hashtags.map((tag) => (
                <span key={tag} className="text-xs font-bold" style={{ color: accent }}>
                  #{String(tag).replace(/^#/, '')}
                </span>
              ))}
            </p>
          )}
          {post.location && (
            <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <MapPin size={11} /> {post.location}
            </p>
          )}
        </div>
      )}

      {hasMedia && (
        <PostMediaGrid
          media={post.postMedia}
          template={(post as any).templateType}
          legacyMedia={parseLegacyMedia(post.media)}
          autoplayEnabled
          loopVideos
          pauseOnScrollAway
          onImageClick={(index, photos) =>
            setPhotoViewer({
              index,
              photos: photos.map((p) => ({ url: p.url, id: p.id })),
            })
          }
        />
      )}

      {post.poll && Array.isArray(post.poll.options) && (
        <div className="px-4 py-3 space-y-1.5">
          {post.poll.options.map((option: any) => (
            <div key={option.id} className="rounded-2xl bg-muted px-3 py-2 text-xs font-bold">
              {option.text}
              <span className="ml-2 text-muted-foreground tabular-nums">{option.votes || 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="wev-post-actions flex items-center justify-between border-t border-border/50 px-3 py-2">
        {feedActions.react ? (
          <ReactionButton
            value={reaction}
            count={likeCount}
            onChange={applyReaction}
            variant="feed"
            hideCount={!!post.hideLikeCount}
          />
        ) : null}
        {feedActions.comment ? (
          post.commentsDisabled ? (
            <span className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground">Comments are off</span>
          ) : (
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-sky-500 transition-colors"
              aria-label="Comments"
            >
              <MessageCircle size={17} />
              {commentCount}
            </button>
          )
        ) : null}
        {feedActions.share && !post.sharingDisabled ? (
          <button
            type="button"
            onClick={share}
            aria-label="Share this post"
            className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 size={17} />
          </button>
        ) : null}
      </div>
      {photoViewer ? (
        <PostPhotoViewer
          open
          photos={photoViewer.photos}
          index={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
          onIndexChange={(next) => setPhotoViewer((cur) => (cur ? { ...cur, index: next } : cur))}
          postId={post.id}
          postTitle={post.content || undefined}
          author={{
            name: space.name,
            avatar: space.avatar,
            username: space.handle,
            href: `/space/@${space.handle}`,
            verified: isVerifiedSpace(space.verificationStatus),
          }}
          post={{ ...post, authorKind: 'space', spaceId: (space as any).id ?? (post as any).spaceId, space }}
          shareCount={Number((post as any)._count?.shares ?? (post as any).shareCount) || 0}
          createdAt={post.createdAt}
          commentsDisabled={!!post.commentsDisabled}
          sharingDisabled={!!post.sharingDisabled}
          hideCommentCount={!!(post as any).hideCommentCount}
          hideLikeCount={!!post.hideLikeCount}
          commentCount={commentCount}
          likeCount={likeCount}
          reaction={reaction}
          onReact={applyReaction}
          onCommentCount={setCommentCount}
        />
      ) : null}
      {commentsOpen ? (
        <PostCommentsWindow
          post={{ ...post, space }}
          onClose={() => setCommentsOpen(false)}
          commentCount={commentCount}
          onCommentCount={setCommentCount}
        />
      ) : null}
    </article>
  );
}
