/**
 * Comment moderation queue (MP2 §8).
 *
 * The spec's constraint drives the design: "Do not automatically punish users
 * without clear moderation logic." So nothing here is implicit —
 *  - the action vocabulary is the closed SPACE_COMMENT_ACTIONS list, and each
 *    button says exactly what it does to whom;
 *  - a sanction against a *person* is a separate, deliberate step behind a sheet
 *    that asks for a reason and an optional duration, never a side effect of
 *    hiding one comment;
 *  - every action is logged server-side, so a moderator can be asked why.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  MessageSquare,
  Pin,
  PinOff,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_AUDIENCE_SANCTIONS,
  type SpaceCommentAction,
  type SpaceSanction,
} from '@wevsoft/shared/wevspace';
import {
  fetchSpaceComments,
  moderateSpaceComment,
  setAudienceFlag,
} from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelSkeleton,
  PersonRow,
  Pill,
  SegmentedTabs,
  Select,
  Sheet,
  TextArea,
  confirmAction,
  num,
  relativeTime,
  statusTone,
  usePanelData,
} from './manageUi';

type CommentFilter = 'pending' | 'visible' | 'hidden' | 'all';

const FILTERS: ReadonlyArray<{ id: CommentFilter; label: string }> = [
  { id: 'pending', label: 'Needs review' },
  { id: 'visible', label: 'Visible' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'all', label: 'Everything' },
];

const PAGE_SIZE = 25;

interface SanctionTarget {
  userId: string;
  name: string;
}

export default function CommentsTab({ onModerated }: { onModerated?: () => void | Promise<void> }) {
  const { spaceId, accent } = useManage();
  const [filter, setFilter] = useState<CommentFilter>('pending');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sanctionFor, setSanctionFor] = useState<SanctionTarget | null>(null);

  const list = usePanelData(
    () => fetchSpaceComments(spaceId, { status: filter, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [spaceId, filter, page],
  );

  const comments = list.data?.comments || [];
  const total = list.data?.total || 0;
  const pendingCount = list.data?.pendingCount || 0;

  const refreshAll = useCallback(async () => {
    await list.reload();
    await onModerated?.();
  }, [list, onModerated]);

  const moderate = async (comment: any, action: SpaceCommentAction) => {
    if (action === 'delete' && !confirmAction('Delete this comment? The author is not notified.')) return;
    setBusyId(comment.id);
    try {
      await moderateSpaceComment(comment.id, { action });
      toast.success(
        action === 'approve'
          ? 'Comment approved'
          : action === 'hide'
            ? 'Comment hidden — only its author still sees it'
            : action === 'show'
              ? 'Comment visible again'
              : action === 'delete'
                ? 'Comment deleted'
                : action === 'pin'
                  ? 'Comment pinned'
                  : 'Comment unpinned',
      );
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.message || 'Could not moderate that comment');
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(
    () => ({ pending: pendingCount }) as Partial<Record<CommentFilter, number>>,
    [pendingCount],
  );

  return (
    <div className="space-y-3">
      <SegmentedTabs
        options={FILTERS}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(0);
        }}
        accent={accent}
        counts={counts}
      />

      {list.loading && !list.data ? (
        <PanelSkeleton rows={3} />
      ) : list.error ? (
        <PanelError message={list.error} onRetry={list.reload} />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={18} />}
          title={filter === 'pending' ? 'Nothing waiting for review' : 'No comments here'}
          blurb={
            filter === 'pending'
              ? 'Comments held by your keyword filters or approval setting land here first.'
              : 'When people comment on this Space you can review, hide or pin them from here.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {comments.map((comment: any) => {
            const busy = busyId === comment.id;
            const isHidden = comment.status === 'hidden';
            const isPending = comment.status === 'pending';
            return (
              <Card key={comment.id} className="p-3 sm:p-4">
                <PersonRow
                  person={comment.author}
                  accent={accent}
                  meta={`${relativeTime(comment.createdAt)}${comment.author?.username ? ` · @${comment.author.username}` : ''}`}
                  right={
                    <>
                      {comment.pinnedAt && <Pill accent={accent}>Pinned</Pill>}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusTone(comment.status)}`}
                      >
                        {comment.status}
                      </span>
                    </>
                  }
                />

                <p className="mt-2.5 text-sm break-words whitespace-pre-wrap">{comment.text}</p>

                {comment.post && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-1">
                    on “{String(comment.post.content || comment.post.type || 'a post').slice(0, 90)}”
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
                  {isPending && (
                    <ActionButton size="sm" tone="accent" accent={accent} busy={busy} onClick={() => moderate(comment, 'approve')}>
                      <Check size={13} /> Approve
                    </ActionButton>
                  )}
                  <IconButton
                    label={isHidden ? 'Make visible again' : 'Hide from everyone but the author'}
                    busy={busy}
                    onClick={() => moderate(comment, isHidden ? 'show' : 'hide')}
                  >
                    {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </IconButton>
                  <IconButton
                    label={comment.pinnedAt ? 'Unpin comment' : 'Pin comment'}
                    busy={busy}
                    onClick={() => moderate(comment, comment.pinnedAt ? 'unpin' : 'pin')}
                  >
                    {comment.pinnedAt ? <PinOff size={14} /> : <Pin size={14} />}
                  </IconButton>
                  {/* Acting against the person is deliberately a separate step. */}
                  {comment.author?.id && (
                    <IconButton
                      label={`Restrict or ban ${comment.author.name || 'this person'}`}
                      busy={busy}
                      onClick={() =>
                        setSanctionFor({ userId: comment.author.id, name: comment.author.name || 'this person' })
                      }
                    >
                      <ShieldAlert size={14} />
                    </IconButton>
                  )}
                  <div className="ml-auto">
                    <IconButton label="Delete comment" tone="danger" busy={busy} onClick={() => moderate(comment, 'delete')}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-extrabold text-muted-foreground tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {num(total)}
          </span>
          <div className="flex gap-2">
            <ActionButton size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Previous
            </ActionButton>
            <ActionButton size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>
              Next
            </ActionButton>
          </div>
        </div>
      )}

      {sanctionFor && (
        <SanctionSheet
          target={sanctionFor}
          accent={accent}
          spaceId={spaceId}
          onClose={() => setSanctionFor(null)}
          onDone={() => void refreshAll()}
        />
      )}
    </div>
  );
}

/**
 * A sanction needs a stated reason before it can be applied — the audit trail is
 * the whole point of §8's "clear moderation logic", and the reason is what a
 * later moderator (or the owner) reads when the decision is questioned.
 */
function SanctionSheet({
  target,
  accent,
  spaceId,
  onClose,
  onDone,
}: {
  target: SanctionTarget;
  accent: string;
  spaceId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [sanction, setSanction] = useState<SpaceSanction>('RESTRICTED');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('0');
  const [busy, setBusy] = useState(false);

  const chosen = SPACE_AUDIENCE_SANCTIONS.find((entry) => entry.id === sanction);

  const apply = async () => {
    if (reason.trim().length < 4) {
      toast.error('Write a short reason first — it goes in the activity log.');
      return;
    }
    setBusy(true);
    try {
      const days = Number(duration);
      await setAudienceFlag(spaceId, {
        userId: target.userId,
        sanction,
        reason: reason.trim(),
        durationDays: days > 0 ? days : undefined,
      });
      toast.success(`${chosen?.label || 'Sanction'} applied to ${target.name}`);
      onDone();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not apply that');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={`Moderate ${target.name}`}
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="accent" accent={accent} busy={busy} onClick={apply} full>
            Apply
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          {SPACE_AUDIENCE_SANCTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSanction(entry.id)}
              className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                sanction === entry.id ? 'border-border bg-muted/60' : 'border-border hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <p className="text-sm font-bold">{entry.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.blurb}</p>
            </button>
          ))}
        </div>

        <Field label="Reason" hint="Kept in the Space's activity log. The person is not shown this note.">
          <TextArea
            rows={3}
            value={reason}
            maxLength={300}
            placeholder="Repeated spam links under every post"
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <Field label="How long">
          <Select value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="0">Until I lift it</option>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </Select>
        </Field>

        <p className="text-[11px] text-muted-foreground">
          This affects only how they interact with this Space. Platform-level reports stay with Wevsoft moderation.
        </p>
      </div>
    </Sheet>
  );
}
