/**
 * One Space conversation (MP2 §9–§11).
 *
 * The identity rule is enforced twice on purpose: the banner above the reply box
 * says "Replying as ✓ <Space>", and every outgoing bubble is rendered under the
 * Space's own name and avatar — with the teammate who actually typed it shown in
 * small print *to the team only*, which is how a shared inbox stays accountable
 * without leaking staff identities to the visitor (§11).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  Loader2,
  Send,
  ShieldAlert,
  Tag,
  UserCheck,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_THREAD_LABELS,
  SPACE_THREAD_STATUS_LABELS,
  type SpaceThreadLabel,
  type SpaceThreadStatus,
} from '@wevsoft/shared/wevspace';
import {
  fetchInboxThread,
  fetchTeam,
  patchInboxThread,
  replyAsSpace,
} from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  PanelError,
  PanelSkeleton,
  PersonAvatar,
  Select,
  dateTime,
  relativeTime,
  statusTone,
  usePanelData,
} from './manageUi';

interface InboxThreadProps {
  threadId: string;
  /** The list row, so the header can render before the fetch lands. */
  listRow?: any | null;
  canAssign: boolean;
  onBack: () => void;
  onChanged: () => void;
}

export default function InboxThread({ threadId, listRow, canAssign, onBack, onChanged }: InboxThreadProps) {
  const { spaceId, accent } = useManage();
  const detail = usePanelData(() => fetchInboxThread(threadId), [threadId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [patching, setPatching] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const thread = detail.data?.thread || null;
  const messages = detail.data?.messages || [];
  const replyingAs = detail.data?.replyingAs || null;
  const canReply = detail.data?.canReply === true;
  const quickReplies = detail.data?.quickReplies || [];
  const customer = thread?.customer || listRow?.customer || null;
  const status: SpaceThreadStatus = (thread?.status || listRow?.status || 'OPEN') as SpaceThreadStatus;
  const labels: string[] = Array.isArray(thread?.labels) ? thread.labels : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, threadId]);

  // Only fetched when the viewer may actually assign, so a SUPPORT member with no
  // team permission never pulls the roster (§12).
  const team = usePanelData(
    () => (canAssign ? fetchTeam(spaceId) : Promise.resolve(null as any)),
    [spaceId, canAssign],
  );
  const assignable = useMemo(
    () => (team.data?.members || []).filter((member: any) => member.status === 'ACTIVE'),
    [team.data],
  );

  const applyPatch = useCallback(
    async (patch: Parameters<typeof patchInboxThread>[1], message: string) => {
      setPatching(true);
      try {
        await patchInboxThread(threadId, patch);
        toast.success(message);
        await detail.reload();
        onChanged();
      } catch (error: any) {
        toast.error(error?.message || 'Could not update this conversation');
      } finally {
        setPatching(false);
      }
    },
    [threadId, detail, onChanged],
  );

  const send = async (body?: string, cannedReplyId?: string) => {
    const value = (body ?? text).trim();
    if (!value) return;
    setSending(true);
    try {
      await replyAsSpace(threadId, cannedReplyId ? { text: value, cannedReplyId } : { text: value });
      setText('');
      setShowQuick(false);
      await detail.reload();
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || 'Could not send that reply');
    } finally {
      setSending(false);
    }
  };

  const toggleLabel = (id: SpaceThreadLabel) => {
    const next = labels.includes(id) ? labels.filter((entry) => entry !== id) : [...labels, id];
    void applyPatch({ labels: next }, 'Labels updated');
  };

  if (detail.loading && !detail.data) return <PanelSkeleton rows={2} tall />;
  if (detail.error) return <PanelError message={detail.error} onRetry={detail.reload} />;

  return (
    <Card padded={false} className="flex flex-col max-h-[calc(100vh-13rem)] lg:max-h-[38rem]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 p-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="lg:hidden p-2 -ml-1 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <PersonAvatar person={customer} accent={accent} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black truncate">{customer?.name || 'Someone'}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {customer?.username ? `@${customer.username}` : 'Visitor'}
            {thread?.assignedTo?.user?.name && ` · handled by ${thread.assignedTo.user.name}`}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusTone(status)}`}>
          {SPACE_THREAD_STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* A person under a sanction must be obvious before anyone replies (§8). */}
      {Array.isArray(thread?.customerSanctions) && thread.customerSanctions.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-bold">
          <ShieldAlert size={13} />
          This person is currently {thread.customerSanctions.join(' and ').toLowerCase()} on this Space.
        </div>
      )}

      {/* Team controls */}
      {canReply && (
        <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border">
          {status === 'PENDING' && (
            <ActionButton size="sm" tone="accent" accent={accent} busy={patching} onClick={() => applyPatch({ status: 'OPEN' }, 'Request accepted')}>
              <Check size={13} /> Accept request
            </ActionButton>
          )}
          {status !== 'RESOLVED' && status !== 'PENDING' && (
            <ActionButton size="sm" busy={patching} onClick={() => applyPatch({ status: 'RESOLVED' }, 'Marked resolved')}>
              Resolve
            </ActionButton>
          )}
          {status === 'RESOLVED' && (
            <ActionButton size="sm" busy={patching} onClick={() => applyPatch({ status: 'OPEN' }, 'Reopened')}>
              Reopen
            </ActionButton>
          )}
          {status !== 'SPAM' && (
            <ActionButton size="sm" busy={patching} onClick={() => applyPatch({ status: 'SPAM' }, 'Moved to spam')}>
              Spam
            </ActionButton>
          )}
          <button
            type="button"
            onClick={() => setShowLabels((value) => !value)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-muted text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Tag size={12} /> Labels <ChevronDown size={11} />
          </button>
          {canAssign && (
            <div className="flex items-center gap-1.5 ml-auto">
              <UserCheck size={13} className="text-muted-foreground" />
              <Select
                aria-label="Assign to a teammate"
                value={thread?.assignedTo?.memberId || ''}
                disabled={patching || team.loading}
                onChange={(event) =>
                  applyPatch(
                    { assignedMemberId: event.target.value || null },
                    event.target.value ? 'Conversation assigned' : 'Assignment cleared',
                  )
                }
                className="w-auto py-1.5 text-[11px]"
              >
                <option value="">Unassigned</option>
                {assignable.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.user?.name || member.user?.username || 'Teammate'}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      {showLabels && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-border">
          {SPACE_THREAD_LABELS.map((def) => {
            const on = labels.includes(def.id);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => toggleLabel(def.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-opacity ${def.tone} ${on ? '' : 'opacity-40'}`}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No messages in this conversation yet.</p>
        )}
        {messages.map((message: any) => (
          <MessageBubble key={message.id} message={message} accent={accent} />
        ))}
        <div ref={endRef} />
      </div>

      {/* Reply */}
      {canReply ? (
        <div className="shrink-0 border-t border-border">
          {replyingAs && (
            <div className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] font-extrabold" style={{ color: accent }}>
              Replying as
              {replyingAs.verified && <BadgeCheck size={12} />}
              <span className="truncate">{replyingAs.name}</span>
            </div>
          )}

          {showQuick && (
            <div className="px-3 pt-2 space-y-1.5 max-h-40 overflow-y-auto">
              {quickReplies.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No saved replies yet — add them from “Saved replies”.
                </p>
              ) : (
                quickReplies.map((reply: any) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => {
                      setText(reply.body);
                      setShowQuick(false);
                    }}
                    className="w-full text-left p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="block text-[11px] font-extrabold truncate">{reply.title}</span>
                    <span className="block text-[11px] text-muted-foreground line-clamp-2">{reply.body}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            <button
              type="button"
              onClick={() => setShowQuick((value) => !value)}
              aria-label="Saved replies"
              className="shrink-0 p-2.5 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Zap size={15} />
            </button>
            <textarea
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={`Reply as ${replyingAs?.name || 'the Space'}…`}
              className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none resize-none max-h-32"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              aria-label="Send reply"
              className="shrink-0 p-2.5 rounded-xl text-primary-foreground disabled:opacity-50 transition-opacity"
              style={{ background: accent }}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-3 py-3 border-t border-border text-[11px] font-bold text-muted-foreground">
          You can read this Space's messages but not reply. Ask the owner for the reply permission.
        </div>
      )}
    </Card>
  );
}

function MessageBubble({ message, accent }: { message: any; accent: string }) {
  const fromSpace = message.fromSpace === true;
  return (
    <div className={`flex gap-2 ${fromSpace ? 'flex-row-reverse' : ''}`}>
      <PersonAvatar person={message.author} size={28} accent={accent} />
      <div className={`min-w-0 max-w-[80%] ${fromSpace ? 'items-end text-right' : ''}`}>
        <div
          className={`inline-block px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
            fromSpace ? 'text-primary-foreground' : 'bg-muted'
          }`}
          style={fromSpace ? { background: accent } : undefined}
        >
          {message.text || (message.imageUrl ? 'Sent an attachment' : '')}
        </div>
        {message.imageUrl && (
          <img src={message.imageUrl} alt="" loading="lazy" className="mt-1.5 max-w-full rounded-2xl" />
        )}
        <p className="mt-1 text-[10px] text-muted-foreground" title={dateTime(message.createdAt)}>
          {relativeTime(message.createdAt)}
          {/* Visible to the team only — the visitor sees just the Space. */}
          {fromSpace && message.sentBy?.name && ` · sent by ${message.sentBy.name}`}
        </p>
      </div>
    </div>
  );
}
