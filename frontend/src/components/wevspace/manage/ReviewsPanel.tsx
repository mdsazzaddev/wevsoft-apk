/**
 * Reviews (MP2 §16).
 *
 * The moderation view of what people said about this Space. Three rules are
 * encoded here rather than explained in a tooltip:
 *
 *  - It reads `GET /manage/:id/reviews`, not the public list. This one can see
 *    hidden rows and carries the Space's reply; the public list still shows only
 *    visible reviews to visitors.
 *  - Replying speaks *as the Space*, so the reply is attributed to the Space and
 *    the teammate who wrote it is recorded but never shown publicly (§16, §21).
 *  - Hiding a review takes its rating out of the public average, so the copy says
 *    exactly that and the server writes it to the activity log. A Space can hide
 *    but never delete: removal is Wevsoft's call, not the owner's.
 *
 * Reviews only make sense for some Space types (`reviewsMakeSenseFor`), and the
 * feature can be switched off entirely — both cases get a real explanation
 * instead of an empty list (§27 of MP1, §29 of MP3).
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, MessageSquareReply, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  REVIEW_RATING_MAX,
  reviewsMakeSenseFor,
  spaceDashboardPath,
  spacePublicPath,
} from '@wevsoft/shared/wevspace';
import { fetchSpaceReviews, replyToReview } from '../../../lib/wevspaceManageApi';
// Hiding reuses the platform's review endpoint rather than a dashboard copy of it (§32).
import { setReviewStatus } from '../../../lib/wevspaceApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonAvatar,
  Pill,
  SegmentedTabs,
  Sheet,
  TextArea,
  confirmAction,
  dateTime,
  num,
  relativeTime,
  statusTone,
  usePanelData,
} from './manageUi';

type ReviewTab = 'all' | 'unanswered' | 'hidden';

const TABS: ReadonlyArray<{ id: ReviewTab; label: string }> = [
  { id: 'all', label: 'All reviews' },
  { id: 'unanswered', label: 'Needs a reply' },
  { id: 'hidden', label: 'Hidden' },
];

const REPLY_MAX = 1000;

/** The query each tab means, kept next to the tabs so they cannot drift apart. */
function queryFor(tab: ReviewTab) {
  if (tab === 'unanswered') return { status: 'visible' as const, answered: 'no' as const };
  if (tab === 'hidden') return { status: 'hidden' as const };
  return {};
}

export default function ReviewsPanel() {
  const { spaceId, space, handle, accent, features } = useManage();
  const [tab, setTab] = useState<ReviewTab>('all');
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(() => queryFor(tab), [tab]);
  const list = usePanelData(() => fetchSpaceReviews(spaceId, query), [spaceId, query]);

  const data = list.data;
  const reviews = data?.reviews || [];
  const counts = data?.counts;
  const canReply = data?.canReply === true;

  const reviewsOff = features?.reviews === false;
  const wrongType = !reviewsMakeSenseFor(space?.spaceType);

  const toggleVisibility = async (review: any) => {
    const next = review.status === 'hidden' ? 'visible' : 'hidden';
    if (
      next === 'hidden' &&
      !confirmAction(
        `Hide this ${review.rating}-star review?\n\nIt stops showing on ${space?.name || 'the Space'} and stops counting toward your rating. Wevsoft keeps the review and records who hid it.`,
      )
    ) {
      return;
    }
    setBusyId(review.id);
    try {
      await setReviewStatus(review.id, next);
      toast.success(next === 'hidden' ? 'Review hidden' : 'Review is showing again');
      await list.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not change that review');
    } finally {
      setBusyId(null);
    }
  };

  const withdrawReply = async (review: any) => {
    if (!confirmAction('Remove your reply?\n\nThe review stays; only your answer disappears.')) return;
    setBusyId(review.id);
    try {
      await replyToReview(review.id, null);
      toast.success('Reply removed');
      await list.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove that reply');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Reviews"
        blurb={`What people rated ${space?.name || 'this Space'}, and how you answered them.`}
        actions={
          <ActionButton onClick={() => window.open(`${spacePublicPath(handle)}?tab=reviews`, '_blank')}>
            <Star size={13} /> See the public page
          </ActionButton>
        }
      />

      {(reviewsOff || wrongType) && (
        <Card>
          <p className="text-xs font-bold">
            {reviewsOff
              ? 'Reviews are switched off for this Space, so visitors cannot leave new ones.'
              : `A ${String(space?.spaceType || '').toLowerCase() || 'Space'} does not show a reviews tab by default.`}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Anything already left is still here and still counted. Turn the reviews feature{' '}
            {reviewsOff ? 'on' : 'off'} under{' '}
            <Link to={spaceDashboardPath(handle, 'settings')} replace className="font-extrabold underline">
              Settings
            </Link>
            .
          </p>
        </Card>
      )}

      {list.loading && !data ? (
        <PanelSkeleton rows={3} tall />
      ) : list.error ? (
        <PanelError message={list.error} onRetry={list.reload} />
      ) : (
        <>
          <RatingSummary
            average={data?.average || 0}
            distribution={data?.distribution || {}}
            counts={counts}
            accent={accent}
          />

          <SegmentedTabs
            options={TABS}
            value={tab}
            onChange={setTab}
            accent={accent}
            counts={{ unanswered: counts?.unanswered || 0, hidden: counts?.hidden || 0 }}
          />

          {reviews.length === 0 ? (
            <EmptyState
              icon={<Star size={18} />}
              title={
                tab === 'unanswered'
                  ? 'Every review has an answer'
                  : tab === 'hidden'
                    ? 'Nothing is hidden'
                    : 'No reviews yet'
              }
              blurb={
                tab === 'unanswered'
                  ? 'Nice. Replying is the single strongest signal that a Space is looked after.'
                  : tab === 'hidden'
                    ? 'Reviews you hide will collect here so you can put them back.'
                    : 'Once someone rates this Space it lands here, and you can answer as the Space.'
              }
            />
          ) : (
            <div className="space-y-2">
              {reviews.map((review: any) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  spaceName={space?.name || 'this Space'}
                  accent={accent}
                  canReply={canReply}
                  busy={busyId === review.id}
                  onReply={() => setEditing(review)}
                  onWithdraw={() => void withdrawReply(review)}
                  onToggleVisibility={() => void toggleVisibility(review)}
                />
              ))}
            </div>
          )}

          {data && data.total > reviews.length && (
            <p className="text-center text-[11px] font-bold text-muted-foreground">
              Showing the {reviews.length} most recent of {num(data.total)}.
            </p>
          )}
        </>
      )}

      {editing && (
        <ReplySheet
          review={editing}
          spaceName={space?.name || 'this Space'}
          accent={accent}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await list.reload();
          }}
        />
      )}
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────

function Stars({ rating, size = 13, accent }: { rating: number; size?: number; accent?: string }) {
  const filled = Math.round(Number(rating) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${filled} out of ${REVIEW_RATING_MAX} stars`}>
      {Array.from({ length: REVIEW_RATING_MAX }, (_, index) => (
        <Star
          key={index}
          size={size}
          className={index < filled ? '' : 'text-muted-foreground/40'}
          style={index < filled ? { color: accent || '#f59e0b', fill: accent || '#f59e0b' } : undefined}
        />
      ))}
    </span>
  );
}

function RatingSummary({
  average,
  distribution,
  counts,
  accent,
}: {
  average: number;
  distribution: Record<string, number>;
  counts?: { visible: number; hidden: number; unanswered: number };
  accent: string;
}) {
  const total = useMemo(
    () => Object.values(distribution).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [distribution],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <Card className="lg:col-span-1 flex flex-col items-center justify-center text-center">
        <p className="text-4xl font-black tabular-nums" style={{ color: accent }}>
          {average > 0 ? average.toFixed(1) : '—'}
        </p>
        <Stars rating={average} size={15} accent={accent} />
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
          {total === 0 ? 'No public ratings yet' : `${num(total)} ${total === 1 ? 'rating' : 'ratings'} counted`}
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <CardTitle>How the ratings split</CardTitle>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = Number(distribution[String(star)]) || 0;
            const share = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-[11px] font-extrabold tabular-nums text-muted-foreground">
                  {star}★
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${share}%`, background: accent }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground">
                  {num(count)}
                </span>
              </div>
            );
          })}
        </div>
        {counts && (
          // Plain tiles rather than StatTile: these sit *inside* a card, and a card
          // nested in a card is exactly the "collection of random cards" look §25 bans.
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Showing" value={counts.visible} />
            <MiniStat label="Needs a reply" value={counts.unanswered} />
            <MiniStat label="Hidden" value={counts.hidden} />
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-black tabular-nums">{num(value)}</p>
    </div>
  );
}

function ReviewCard({
  review,
  spaceName,
  accent,
  canReply,
  busy,
  onReply,
  onWithdraw,
  onToggleVisibility,
}: {
  review: any;
  spaceName: string;
  accent: string;
  canReply: boolean;
  busy: boolean;
  onReply: () => void;
  onWithdraw: () => void;
  onToggleVisibility: () => void;
}) {
  const hidden = review.status === 'hidden';

  return (
    <Card className={hidden ? 'opacity-75' : ''}>
      <div className="flex items-start gap-3">
        <PersonAvatar person={review.user} accent={accent} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold truncate">{review.user?.name || 'Someone'}</p>
            <Stars rating={review.rating} accent={accent} />
            {hidden && <Pill tone={statusTone('HIDDEN')}>Hidden</Pill>}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground" title={dateTime(review.createdAt)}>
            {review.user?.username ? `@${review.user.username} · ` : ''}
            {relativeTime(review.createdAt)}
          </p>
          {review.text ? (
            <p className="mt-2 text-sm break-words whitespace-pre-wrap">{review.text}</p>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">Rating only, no words.</p>
          )}
        </div>

        {canReply && (
          <div className="shrink-0 flex items-center gap-1">
            <IconButton
              label={hidden ? 'Show this review again' : 'Hide this review'}
              tone={hidden ? 'plain' : 'danger'}
              busy={busy}
              onClick={onToggleVisibility}
            >
              {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            </IconButton>
          </div>
        )}
      </div>

      {review.ownerReply ? (
        <div className="mt-3 ml-4 pl-3 border-l-2 rounded-r-xl" style={{ borderColor: accent }}>
          <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: accent }}>
            {spaceName} replied
          </p>
          <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{review.ownerReply}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] text-muted-foreground" title={dateTime(review.ownerReplyAt)}>
              {relativeTime(review.ownerReplyAt)}
            </span>
            {/* Who on the team wrote it — recorded for the team, never public. */}
            {review.ownerReplyBy?.name && (
              <span className="text-[11px] font-semibold text-muted-foreground">
                Written by {review.ownerReplyBy.name} · only your team sees this line
              </span>
            )}
            {canReply && (
              <span className="flex items-center gap-1">
                <ActionButton size="sm" onClick={onReply}>
                  Edit reply
                </ActionButton>
                <IconButton label="Remove reply" tone="danger" busy={busy} onClick={onWithdraw}>
                  <Trash2 size={13} />
                </IconButton>
              </span>
            )}
          </div>
        </div>
      ) : (
        canReply && (
          <div className="mt-3">
            <ActionButton size="sm" tone="accent" accent={accent} onClick={onReply}>
              <MessageSquareReply size={13} /> Reply as the Space
            </ActionButton>
          </div>
        )
      )}
    </Card>
  );
}

function ReplySheet({
  review,
  spaceName,
  accent,
  onClose,
  onSaved,
}: {
  review: any;
  spaceName: string;
  accent: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [text, setText] = useState<string>(review.ownerReply || '');
  const [saving, setSaving] = useState(false);
  const trimmed = text.trim();
  const tooLong = trimmed.length > REPLY_MAX;

  const save = async () => {
    if (!trimmed || tooLong) return;
    setSaving(true);
    try {
      await replyToReview(review.id, trimmed);
      toast.success('Reply posted');
      await onSaved();
    } catch (error: any) {
      toast.error(error?.message || 'Could not post that reply');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={review.ownerReply ? 'Edit your reply' : 'Reply as the Space'}
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose} full>
            Cancel
          </ActionButton>
          <ActionButton
            tone="accent"
            accent={accent}
            busy={saving}
            disabled={!trimmed || tooLong}
            onClick={() => void save()}
            full
          >
            {review.ownerReply ? 'Save reply' : 'Post reply'}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-muted p-3">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} accent={accent} />
            <span className="text-[11px] font-bold text-muted-foreground">
              {review.user?.name || 'Someone'} · {relativeTime(review.createdAt)}
            </span>
          </div>
          {review.text && <p className="mt-1.5 text-sm break-words whitespace-pre-wrap">{review.text}</p>}
        </div>

        <Field
          label={`Your answer, published as ${spaceName}`}
          hint="Everyone who reads the review sees this. Your own name is not shown."
          count={`${trimmed.length}/${REPLY_MAX}`}
          error={tooLong ? `Shorten this by ${trimmed.length - REPLY_MAX} characters.` : null}
        >
          <TextArea
            rows={5}
            value={text}
            autoFocus
            onChange={(event) => setText(event.target.value)}
            placeholder="Thank them, answer the question, or explain what changed."
          />
        </Field>
      </div>
    </Sheet>
  );
}
