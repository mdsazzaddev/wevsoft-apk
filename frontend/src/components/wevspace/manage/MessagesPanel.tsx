/**
 * The Space inbox (MP2 §9–§11).
 *
 * The spec's hard rules, and where each one lives:
 *  - "Every conversation must retain the identity: User → WevSpace, NOT User →
 *    Owner's personal account." The rows come from WevSpaceInboxThread, which is
 *    keyed by spaceId, so a personal DM can never surface here.
 *  - "Do NOT mix Space inbox with the user's personal inbox." This screen is
 *    reachable only inside the dashboard; nothing here writes to the personal
 *    conversation list.
 *  - "Replying as ✓ Wevsoft Studio … This must always be obvious." The banner is
 *    rendered from the server's `replyingAs` block, pinned above the folders and
 *    repeated inside the conversation, and it is never collapsed away.
 */

import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { BadgeCheck, Inbox, MessageSquareText, Search, Zap } from 'lucide-react';
import {
  SPACE_INBOX_FOLDERS,
  SPACE_THREAD_LABELS,
  SPACE_THREAD_STATUS_LABELS,
  type SpaceInboxFolder,
  type SpaceThreadStatus,
} from '@wevsoft/shared/wevspace';
import { fetchInboxThreads, type ReplyingAs } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  EmptyState,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonAvatar,
  inputClass,
  num,
  relativeTime,
  usePanelData,
} from './manageUi';

const InboxThread = lazy(() => import('./InboxThread'));
const CannedRepliesSheet = lazy(() => import('./CannedRepliesSheet'));

const PAGE_SIZE = 25;

export default function MessagesPanel() {
  const { spaceId, accent, can, refresh } = useManage();
  const [folder, setFolder] = useState<SpaceInboxFolder>('inbox');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [showCanned, setShowCanned] = useState(false);

  const list = usePanelData(
    () => fetchInboxThreads(spaceId, { folder, search: applied || undefined, limit: PAGE_SIZE }),
    [spaceId, folder, applied],
  );

  const threads = list.data?.threads || [];
  const replyingAs = list.data?.replyingAs || null;
  const canReply = list.data?.canReply === true;
  const canAssign = list.data?.canAssign === true;
  const statusCounts = list.data?.statusCounts || {};

  const folderCounts = useMemo(() => {
    // Only the counts the server actually knows: requests and resolved map to a
    // status, the rest have no single number so they stay unlabelled.
    const out: Partial<Record<SpaceInboxFolder, number>> = {};
    if (statusCounts.PENDING) out.requests = statusCounts.PENDING;
    if (statusCounts.RESOLVED) out.resolved = statusCounts.RESOLVED;
    if (statusCounts.SPAM) out.spam = statusCounts.SPAM;
    return out;
  }, [statusCounts]);

  const afterChange = useCallback(async () => {
    await list.reload();
    await refresh();
  }, [list, refresh]);

  const openThread = threads.find((thread: any) => thread.id === openThreadId) || null;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Messages"
        blurb="Conversations people started with this Space. Your personal chats stay in your own inbox."
        actions={
          canReply ? (
            <ActionButton onClick={() => setShowCanned(true)}>
              <Zap size={14} /> Saved replies
            </ActionButton>
          ) : undefined
        }
      />

      {/* §11's mandatory, always-visible identity banner. */}
      {replyingAs && <ReplyingAsBanner replyingAs={replyingAs} accent={accent} />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setApplied(search.trim());
            }}
            placeholder="Search by name or @username"
            aria-label="Search conversations"
            className={`${inputClass} pl-9`}
          />
        </div>
        <ActionButton onClick={() => setApplied(search.trim())}>Search</ActionButton>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
        {SPACE_INBOX_FOLDERS.map((entry) => {
          const active = entry.id === folder;
          const count = folderCounts[entry.id];
          return (
            <button
              key={entry.id}
              type="button"
              title={entry.blurb}
              onClick={() => {
                setFolder(entry.id);
                setOpenThreadId(null);
              }}
              aria-current={active ? 'true' : undefined}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition-colors ${
                active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={active ? { background: accent } : undefined}
            >
              {entry.label}
              {typeof count === 'number' && count > 0 && (
                <span className={`px-1.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-black/20' : 'bg-black/10 dark:bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {list.loading && !list.data ? (
        <PanelSkeleton rows={4} />
      ) : list.error ? (
        <PanelError message={list.error} onRetry={list.reload} />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-3 lg:items-start">
          {/* Phone: the list hides once a conversation is open, because a squeezed
              two-pane layout is unusable at that width (MP1). */}
          <div className={`${openThreadId ? 'hidden lg:block' : ''} space-y-2`}>
            {threads.length === 0 ? (
              <EmptyState
                icon={<Inbox size={18} />}
                title={applied ? 'Nobody matches that' : `Nothing in ${SPACE_INBOX_FOLDERS.find((f) => f.id === folder)?.label}`}
                blurb={
                  applied
                    ? 'Try a username instead of a full name.'
                    : folder === 'requests'
                      ? 'First-time senders wait here until somebody accepts them.'
                      : 'When somebody messages this Space the conversation appears here.'
                }
              />
            ) : (
              threads.map((thread: any) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  accent={accent}
                  active={thread.id === openThreadId}
                  onOpen={() => setOpenThreadId(thread.id)}
                />
              ))
            )}
          </div>

          <div className={openThreadId ? '' : 'hidden lg:block'}>
            {openThreadId ? (
              <Suspense fallback={<PanelSkeleton rows={2} tall />}>
                <InboxThread
                  threadId={openThreadId}
                  listRow={openThread}
                  canAssign={canAssign}
                  onBack={() => setOpenThreadId(null)}
                  onChanged={() => void afterChange()}
                />
              </Suspense>
            ) : (
              <EmptyState
                icon={<MessageSquareText size={18} />}
                title="Pick a conversation"
                blurb="Replies go out as the Space, signed with its name and tick — never from your personal account."
              />
            )}
          </div>
        </div>
      )}

      {showCanned && (
        <Suspense fallback={null}>
          <CannedRepliesSheet onClose={() => setShowCanned(false)} />
        </Suspense>
      )}
    </div>
  );
}

function ReplyingAsBanner({ replyingAs, accent }: { replyingAs: ReplyingAs; accent: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
      style={{ background: `${accent}14`, color: accent }}
    >
      <PersonAvatar person={{ name: replyingAs.name, avatar: replyingAs.avatar }} size={28} accent={accent} />
      <span className="min-w-0 flex items-center gap-1 text-xs font-extrabold truncate">
        Replying as
        {replyingAs.verified && <BadgeCheck size={13} className="shrink-0" />}
        <span className="truncate">{replyingAs.name}</span>
      </span>
      <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wide opacity-70">Space inbox</span>
    </div>
  );
}

function ThreadRow({
  thread,
  accent,
  active,
  onOpen,
}: {
  thread: any;
  accent: string;
  active: boolean;
  onOpen: () => void;
}) {
  const unread = thread.unreadCount || 0;
  const labels: string[] = Array.isArray(thread.labels) ? thread.labels : [];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left flex gap-3 p-3 rounded-3xl border transition-colors ${
        active ? 'bg-muted/70 border-border' : 'bg-card border-border hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <PersonAvatar person={thread.customer} accent={accent} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold truncate flex-1">{thread.customer?.name || 'Someone'}</span>
          <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{relativeTime(thread.lastMessageAt)}</span>
        </span>
        <span className="block text-[11px] text-muted-foreground truncate">
          {thread.preview
            ? `${thread.preview.fromSpace ? 'You: ' : ''}${thread.preview.text || 'Sent an attachment'}`
            : `${SPACE_THREAD_STATUS_LABELS[thread.status as SpaceThreadStatus] || thread.status}`}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          {labels.map((id) => {
            const def = SPACE_THREAD_LABELS.find((entry) => entry.id === id);
            if (!def) return null;
            return (
              <span key={id} className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${def.tone}`}>
                {def.label}
              </span>
            );
          })}
          {thread.assignedTo?.user?.name && (
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-black text-muted-foreground">
              → {thread.assignedTo.user.name.split(' ')[0]}
            </span>
          )}
        </span>
      </span>
      {unread > 0 && (
        <span className="self-start shrink-0 px-1.5 rounded-md bg-red-500 text-white text-[10px] font-black tabular-nums">
          {unread > 99 ? '99+' : num(unread)}
        </span>
      )}
    </button>
  );
}
