import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { goBackOr } from '../lib/appNavigation';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store';
import { UnifiedPostCard } from '../components/feed/UnifiedFeed';
import PostComments from '../components/PostComments';

type PostLocationState = { post?: any } | null;

/**
 * Facebook-style permalink: one post + its comment thread.
 * Feed never expands comments inline — Comment opens this page.
 * Prefers `location.state.post` so opening from the feed paints immediately (no black flash).
 */
export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const statePost = (location.state as PostLocationState)?.post;
  const stateMatches =
    statePost &&
    postId &&
    String(statePost.id) === String(postId);

  const [post, setPost] = useState<any | null>(stateMatches ? statePost : null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!stateMatches);
  const [commentCount, setCommentCount] = useState(
    stateMatches ? Number(statePost._count?.comments) || 0 : 0,
  );

  useEffect(() => {
    if (!token || !postId) return;
    let cancelled = false;
    // Soft refresh in background when we already painted from feed state.
    if (!stateMatches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(true);
      setError(null);
    }
    fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Post not found');
        if (!cancelled) {
          setPost(data);
          setCommentCount(Number(data._count?.comments) || 0);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (!cancelled && !stateMatches) {
          setPost(null);
          setError(err?.message || 'Failed to load post');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, postId, stateMatches]);

  const goBack = () => {
    goBackOr(navigate, '/home');
  };

  if (loading && !post) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-24 md:pb-8">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-md">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[15px] font-bold">Post</h1>
        </header>
        <div className="animate-pulse space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div className="h-40 rounded-2xl bg-muted/60" />
          <div className="h-3 w-full rounded bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-md md:rounded-b-2xl md:px-4">
        <button
          type="button"
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold leading-tight">Post</h1>
          {commentCount > 0 ? (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {commentCount} comment{commentCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      </header>

      {error || !post ? (
        <div className="px-4 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">{error || 'Post not found'}</p>
          <button
            type="button"
            onClick={goBack}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Go back
          </button>
        </div>
      ) : (
        <>
          <UnifiedPostCard post={post} commentsMode="hidden" autoplayEnabled />
          {!post.commentsDisabled ? (
            <div id="post-comments" className="border-t border-border/60 bg-card/40 md:rounded-b-3xl md:border md:border-t-0 md:border-border/60">
              <PostComments
                postId={post.id}
                variant="inline"
                onCommentCreated={() => setCommentCount((c) => c + 1)}
                onCommentsLoaded={(n) => setCommentCount((c) => Math.max(c, n))}
              />
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Comments are turned off for this post.</p>
          )}
        </>
      )}
    </div>
  );
}
