/**
 * Reviews tab. Anyone who can see the Space can leave one review (the server
 * upserts by spaceId+userId, so re-submitting edits it), and anyone with the
 * `reviews.moderate` permission can hide or remove a review.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Loader2, MessageSquare, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SPACE_LIMITS } from '@wevsoft/shared/wevspace';
import { fetchReviews, saveReview, setReviewStatus, type SpaceReview } from '../../lib/wevspaceApi';
import UserAvatar from '../UserAvatar';

interface Props {
  spaceId: string;
  spaceName: string;
  /** false for the owner and for anonymous visitors — both see read-only. */
  canReview?: boolean;
  isOwner?: boolean;
  accent: string;
  className?: string;
}

const PAGE_SIZE = 20;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? 'text-amber-400' : 'text-muted-foreground/35'}
          fill={n <= value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export default function SpaceReviewsPanel({
  spaceId,
  spaceName,
  canReview = false,
  isOwner = false,
  accent,
  className = '',
}: Props) {
  const [reviews, setReviews] = useState<SpaceReview[]>([]);
  const [total, setTotal] = useState(0);
  const [average, setAverage] = useState(0);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReviews(spaceId, PAGE_SIZE, 0);
      setReviews(res.reviews || []);
      setTotal(res.total || 0);
      setAverage(res.average || 0);
      setCanModerate(!!res.canModerate);
      const mine = (res.reviews || []).find((r) => r.isMine);
      if (mine) {
        setRating(mine.rating);
        setText(mine.text || '');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const submit = async () => {
    if (rating < 1) {
      toast.error('Pick a rating first');
      return;
    }
    setSaving(true);
    try {
      await saveReview(spaceId, rating, text.trim() || undefined);
      toast.success('Thanks for the review');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your review');
    } finally {
      setSaving(false);
    }
  };

  const moderate = async (review: SpaceReview, status: 'hidden' | 'removed') => {
    if (status === 'removed' && !window.confirm('Remove this review permanently?')) return;
    setBusyId(review.id);
    try {
      await setReviewStatus(review.id, status);
      toast.success(status === 'hidden' ? 'Review hidden' : 'Review removed');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update this review');
    } finally {
      setBusyId(null);
    }
  };

  const myReview = reviews.find((r) => r.isMine);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="bg-card border border-border rounded-3xl p-5 flex flex-wrap items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-black leading-none">{average ? average.toFixed(1) : '—'}</p>
          <div className="mt-1.5">
            <Stars value={Math.round(average)} size={15} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm">
            {total} {total === 1 ? 'review' : 'reviews'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total === 0 ? `No one has reviewed ${spaceName} yet.` : `What people say about ${spaceName}.`}
          </p>
        </div>
      </div>

      {/* Write / edit */}
      {canReview && (
        <div className="bg-card border border-border rounded-3xl p-5">
          <h3 className="font-black text-sm">{myReview ? 'Edit your review' : 'Write a review'}</h3>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={rating === n}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Star
                  size={22}
                  className={n <= rating ? 'text-amber-400' : 'text-muted-foreground/40'}
                  fill={n <= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            rows={3}
            maxLength={SPACE_LIMITS.reviewText.max}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share what your experience was like (optional)"
            className="mt-3 w-full px-3.5 py-3 rounded-2xl bg-muted text-sm font-semibold outline-none resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              {text.length}/{SPACE_LIMITS.reviewText.max}
            </span>
            <button
              type="button"
              disabled={saving || rating < 1}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: accent }}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {myReview ? 'Update review' : 'Post review'}
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <p className="text-xs text-muted-foreground font-semibold px-1">
          You cannot review your own WevSpace.
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-3xl p-10 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
            <MessageSquare size={20} />
          </span>
          <p className="mt-3 font-black text-sm">No reviews yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canReview ? 'Be the first to leave one.' : 'Reviews will appear here once people start posting.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <UserAvatar user={review.user as any} className="w-10 h-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {review.user.username ? (
                      <Link to={`/@${review.user.username}`} className="font-black text-sm hover:underline">
                        {review.user.name}
                      </Link>
                    ) : (
                      <span className="font-black text-sm">{review.user.name}</span>
                    )}
                    {review.isMine && (
                      <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                        You
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <Stars value={review.rating} />
                  </div>
                  {review.text && <p className="mt-2 text-sm break-words">{review.text}</p>}

                  {/* The Space's answer. Attributed to the Space, never to the
                      teammate who typed it. */}
                  {review.ownerReply && (
                    <div className="mt-3 pl-3 border-l-2 rounded-r-xl" style={{ borderColor: accent }}>
                      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: accent }}>
                        {spaceName} replied
                      </p>
                      <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{review.ownerReply}</p>
                    </div>
                  )}
                </div>

                {canModerate && !review.isMine && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => void moderate(review, 'hidden')}
                      aria-label="Hide review"
                      title="Hide review"
                      className="p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                    >
                      {busyId === review.id ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => void moderate(review, 'removed')}
                      aria-label="Remove review"
                      title="Remove review"
                      className="p-2 rounded-xl bg-muted text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
