import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, MessageCircle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOverlayBack } from '../hooks/useOverlayBack';
import PostComments from './PostComments';
import PostCreatorHeader from './social/PostCreatorHeader';
import PostMediaGrid from './social/PostMediaGrid';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';
import ExpandableText from './ExpandableText';
import { parseLegacyMedia } from '../lib/postMedia';
import { openFeedVideoInReels, payloadFromFeedVideo } from '../lib/openReel';
import { acquirePostMusicSuspend } from '../lib/postMusicPlayback';
import { pauseExclusivePlayback } from '../lib/exclusiveMediaPlayback';
import { stopReelPreview } from '../lib/reelPreviewPlayback';

function useIsDesktopPanel() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return desktop;
}

function PostMeta({
  post,
  author,
  timeLabel,
  hasMedia,
  postMedia,
  legacyMedia,
  hasPostMusic,
  navigate,
  showMedia,
  className = '',
}: {
  post: any;
  author: ReturnType<typeof resolveContentAuthor>;
  timeLabel: string;
  hasMedia: boolean;
  postMedia: any[];
  legacyMedia: any[];
  hasPostMusic: boolean;
  navigate: ReturnType<typeof useNavigate>;
  showMedia: boolean;
  className?: string;
}) {
  return (
    <article className={className}>
      <PostCreatorHeader
        author={author}
        timeLabel={timeLabel}
        musicTitle={post.postMusic?.titleSnapshot || post.music?.title}
        musicArtist={post.postMusic?.artistSnapshot || post.music?.artist}
      />
      {post.content ? (
        <ExpandableText
          text={post.content}
          className="mt-2.5 text-[15px] leading-relaxed text-foreground"
        />
      ) : null}
      {showMedia && hasMedia ? (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
          <PostMediaGrid
            media={postMedia}
            template={post.templateType}
            legacyMedia={legacyMedia}
            autoplayEnabled
            loopVideos
            pauseOnScrollAway={false}
            forceMuteVideos={!!post.postMusic?.originalAudioMuted}
            hideVideoMuteControl={hasPostMusic}
            onVideoClick={(item) =>
              openFeedVideoInReels(navigate, payloadFromFeedVideo({ post, item }))
            }
          />
        </div>
      ) : null}
    </article>
  );
}

function CommentsDisabled() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
        <MessageCircle size={22} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-foreground">Comments are turned off</p>
      <p className="text-xs text-muted-foreground">The author disabled comments on this post.</p>
    </div>
  );
}

function HeaderBlock({
  count,
  onClose,
  closeIcon,
  trailingClose = false,
}: {
  count: number;
  onClose: () => void;
  closeIcon: 'back' | 'x';
  trailingClose?: boolean;
}) {
  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      aria-label="Close comments"
    >
      {closeIcon === 'back' ? <ArrowLeft size={20} /> : <X size={18} />}
    </button>
  );

  const titles = (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight md:text-[16px]">
        Comments
      </h1>
      {count > 0 ? (
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {count} comment{count === 1 ? '' : 's'}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Join the conversation</p>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2.5 border-b border-border/60 bg-background/85 px-3 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:bg-card/90 md:px-4">
      {!trailingClose ? closeBtn : null}
      {titles}
      {trailingClose ? closeBtn : null}
    </header>
  );
}

/**
 * Comments window over the current feed — no route change, feed stays mounted.
 * Shows the same post media (including video) as the feed; only comments fetch.
 */
export default function PostCommentsWindow({
  post,
  onClose,
  commentCount,
  onCommentCount,
}: {
  post: any;
  onClose: () => void;
  commentCount?: number;
  onCommentCount?: (n: number) => void;
}) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktopPanel();
  useOverlayBack(true, onClose);

  useEffect(() => {
    const release = acquirePostMusicSuspend();
    pauseExclusivePlayback();
    stopReelPreview();
    const scrollEl = document.getElementById('main-scroll-area');
    const prevOverflow = scrollEl?.style.overflowY ?? '';
    const prevBody = document.body.style.overflow;
    if (scrollEl) scrollEl.style.overflowY = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      release();
      if (scrollEl) scrollEl.style.overflowY = prevOverflow;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('wev:close-post-overlays', close);
    return () => window.removeEventListener('wev:close-post-overlays', close);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const count = commentCount ?? Number(post?._count?.comments);
  const author = resolveContentAuthor(post);
  const timeLabel = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';
  const postMedia = Array.isArray(post.postMedia) ? post.postMedia : [];
  const legacyMedia = parseLegacyMedia(post.media);
  const hasMedia = postMedia.length > 0 || legacyMedia.length > 0;
  const hasPostMusic = Boolean(post.postMusic?.audioUrl || post.music?.audioUrl);
  const useTwoColumn = isDesktop && hasMedia;

  const metaProps = {
    post,
    author,
    timeLabel,
    hasMedia,
    postMedia,
    legacyMedia,
    hasPostMusic,
    navigate,
  };

  const commentsProps = {
    postId: post.id as string,
    variant: 'sheet' as const,
    onCommentCreated: () => onCommentCount?.(count + 1),
    onCommentsLoaded: (n: number) => onCommentCount?.(Math.max(count, n)),
  };

  let body: ReactNode;

  if (useTwoColumn) {
    body = (
      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-h-0 min-w-0 flex-[1.2] items-center justify-center overflow-hidden bg-black">
          <div className="h-full w-full">
            <PostMediaGrid
              media={postMedia}
              template={post.templateType}
              legacyMedia={legacyMedia}
              autoplayEnabled
              loopVideos
              pauseOnScrollAway={false}
              forceMuteVideos={!!post.postMusic?.originalAudioMuted}
              hideVideoMuteControl={hasPostMusic}
              onVideoClick={(item) =>
                openFeedVideoInReels(navigate, payloadFromFeedVideo({ post, item }))
              }
            />
          </div>
        </div>

        <div className="flex w-[min(100%,400px)] shrink-0 flex-col border-l border-border/50 bg-card">
          <HeaderBlock count={count} onClose={onClose} closeIcon="x" trailingClose />
          <div className="min-h-0 flex-1">
            {post.commentsDisabled ? (
              <>
                <PostMeta
                  {...metaProps}
                  showMedia={false}
                  className="border-b border-border/50 px-4 pb-3 pt-3"
                />
                <CommentsDisabled />
              </>
            ) : (
              <PostComments
                {...commentsProps}
                listHeader={
                  <PostMeta
                    {...metaProps}
                    showMedia={false}
                    className="mb-3 border-b border-border/50 pb-3"
                  />
                }
              />
            )}
          </div>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <HeaderBlock
          count={count}
          onClose={onClose}
          closeIcon={isDesktop ? 'x' : 'back'}
          trailingClose={isDesktop}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          {post.commentsDisabled ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <PostMeta
                {...metaProps}
                showMedia
                className="border-b border-border/50 px-4 pb-4 pt-3"
              />
              <CommentsDisabled />
            </div>
          ) : (
            <PostComments
              {...commentsProps}
              listHeader={
                <PostMeta
                  {...metaProps}
                  showMedia
                  className="mb-1 border-b border-border/50 pb-4"
                />
              }
            />
          )}
        </div>
      </>
    );
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[85] flex items-stretch justify-center md:items-center md:p-5"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dark:bg-black/65"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Post comments"
        initial={
          isDesktop ? { opacity: 0, scale: 0.97, y: 12 } : { opacity: 0, y: 32 }
        }
        animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={
          isDesktop
            ? { duration: 0.2 }
            : { type: 'spring', damping: 30, stiffness: 340 }
        }
        className={
          isDesktop
            ? `relative z-[1] flex w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl ${
                useTwoColumn
                  ? 'h-[min(90dvh,860px)] max-w-[980px]'
                  : 'h-[min(88dvh,760px)] max-w-[520px] flex-col'
              }`
            : 'relative z-[1] flex h-full w-full flex-col bg-background'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
