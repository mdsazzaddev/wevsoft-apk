/** Conversation column (~20%): search, filter tabs, rows. */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BadgeCheck, Inbox, Loader2, RefreshCw, Search, X, Zap } from 'lucide-react';
import { SPACE_THREAD_LABELS, SPACE_THREAD_STATUS_LABELS, type SpaceThreadStatus } from '@wevsoft/shared/wevspace';
import type { ReplyingAs } from '../../../lib/wevspaceManageApi';
import { INBOX_FILTERS, type InboxFilterDef, type InboxFilterId, shortTime } from './inboxData';
import { Avatar, EmptyBlock, IconBtn, btn, cx } from './inboxUi';

interface Props {
  filter: InboxFilterDef;
  onFilter: (id: InboxFilterId) => void;
  counts: Partial<Record<InboxFilterId, number>>;
  search: string;
  onSearch: (value: string) => void;
  threads: any[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  presence: Record<string, 'online' | 'offline'>;
  replyingAs: ReplyingAs | null;
  canReply: boolean;
  onOpenSaved: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export default function ConversationList(props: Props) {
  const { filter, onFilter, counts, search, onSearch, threads, loading, error, selectedId } = props;
  const [draft, setDraft] = useState(search);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // Header search and this box share one query.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (draft.trim() !== search.trim()) onSearch(draft.trim());
    }, 350);
    return () => window.clearTimeout(t);
     
  }, [draft]);

  useEffect(() => {
    const chip = tabsRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const strip = tabsRef.current;
    if (chip && strip) {
      const left = chip.offsetLeft;
      const right = left + chip.offsetWidth;
      if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 8);
      else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth + 8;
    }
  }, [filter.id]);

  return (
    <section aria-label="Conversations" className="h-full min-h-0 flex flex-col bg-[var(--si-card)]">
      {/* §11: the identity every reply goes out under is always visible. */}
      {props.replyingAs && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--si-border)] bg-[var(--si-blue-soft)] text-[var(--si-blue)]">
          <Avatar person={{ id: props.replyingAs.spaceId, name: props.replyingAs.name, avatar: props.replyingAs.avatar }} size={22} />
          <span className="min-w-0 flex items-center gap-1 text-[11.5px] font-semibold truncate">
            Replying as
            {props.replyingAs.verified && <BadgeCheck size={12} className="shrink-0" />}
            <span className="truncate">{props.replyingAs.name}</span>
          </span>
          <span className="ml-auto shrink-0 text-[9.5px] font-bold uppercase tracking-wide opacity-70">Space inbox</span>
        </div>
      )}

      <div className="shrink-0 px-3 pt-3 pb-2 space-y-2.5 border-b border-[var(--si-border)]">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-bold text-[var(--si-text)] flex-1">Chats</h2>
          {props.canReply && <IconBtn icon={Zap} label="Saved replies" tip="Manage saved replies (welcome, away, FAQ, quick replies)" onClick={props.onOpenSaved} />}
          <IconBtn
            icon={props.refreshing ? Loader2 : RefreshCw}
            label="Refresh"
            onClick={props.onRefresh}
            className={props.refreshing ? '[&>svg]:animate-spin' : ''}
          />
        </div>
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--si-faint)]" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch(draft.trim());
            }}
            placeholder="Search by name or @username"
            aria-label="Search conversations"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] text-[13px] text-[var(--si-text)] placeholder:text-[var(--si-faint)] outline-none focus:border-[var(--si-blue)] focus:bg-[var(--si-card)]"
          />
          {draft && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setDraft('');
                onSearch('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--si-faint)] hover:text-[var(--si-text)]"
            >
              <X size={13} />
            </button>
          )}
        </label>
        <div ref={tabsRef} className="relative flex gap-1 overflow-x-auto si-noscrollbar -mx-1 px-1">
          {INBOX_FILTERS.map((f) => {
            const active = f.id === filter.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                title={f.blurb}
                onClick={() => onFilter(f.id)}
                className={cx(
                  'shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-semibold transition-colors',
                  active
                    ? 'bg-[var(--si-navy)] text-white dark:bg-[var(--si-blue)]'
                    : 'bg-[var(--si-hover)] text-[var(--si-muted)] hover:text-[var(--si-text)]',
                )}
              >
                {f.label}
                {typeof count === 'number' && count > 0 && (
                  <span className={cx('px-1 rounded text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-[var(--si-border)]')}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {filter.source === 'derived' && (
          <p className="text-[10.5px] text-[var(--si-faint)]">Filtered from the latest 50 open conversations.</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto si-scroll">
        {loading && threads.length === 0 ? (
          <ul className="p-2 space-y-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i} className="flex gap-3 p-2.5 animate-pulse">
                <span className="w-10 h-10 rounded-full bg-[var(--si-hover)]" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-1/2 rounded bg-[var(--si-hover)]" />
                  <span className="block h-2.5 w-4/5 rounded bg-[var(--si-hover)]" />
                </span>
              </li>
            ))}
          </ul>
        ) : error ? (
          <EmptyBlock icon={AlertCircle} title="Could not load conversations" blurb={error}>
            <button type="button" className={btn.small} onClick={props.onRetry}>
              Try again
            </button>
          </EmptyBlock>
        ) : threads.length === 0 ? (
          <EmptyBlock
            icon={Inbox}
            title={search ? 'Nobody matches that' : filter.source === 'none' ? `${filter.label}: not available yet` : `Nothing in ${filter.label}`}
            blurb={search ? 'Try a username instead of a full name.' : filter.empty}
          />
        ) : (
          <ul className="p-1.5">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Row thread={thread} active={thread.id === selectedId} presence={props.presence[thread.customer?.id]} onOpen={() => props.onSelect(thread.id)} />
              </li>
            ))}
            {props.hasMore && (
              <li className="p-2">
                <button type="button" onClick={props.onLoadMore} disabled={props.loadingMore} className={cx(btn.small, 'w-full')}>
                  {props.loadingMore ? <Loader2 size={13} className="animate-spin" /> : null} Load more
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function Row({ thread, active, presence, onOpen }: { thread: any; active: boolean; presence?: 'online' | 'offline'; onOpen: () => void }) {
  const unread = thread.unreadCount || 0;
  const labels: string[] = Array.isArray(thread.labels) ? thread.labels : [];
  const status = thread.status as SpaceThreadStatus;
  const preview = thread.preview
    ? `${thread.preview.fromSpace ? 'You: ' : ''}${thread.preview.text || 'Sent an attachment'}`
    : SPACE_THREAD_STATUS_LABELS[status] || status;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? 'true' : undefined}
      className={cx(
        'w-full text-left flex gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors relative',
        active ? 'bg-[var(--si-blue-soft)]' : 'hover:bg-[var(--si-hover)]',
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--si-blue)]" />}
      <Avatar person={thread.customer} size={40} presence={presence || null} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cx('flex-1 truncate text-[13.5px]', unread ? 'font-bold text-[var(--si-text)]' : 'font-semibold text-[var(--si-text)]')}>
            {thread.customer?.name || thread.customer?.username || 'Someone'}
          </span>
          <span className={cx('shrink-0 text-[11px]', unread ? 'font-semibold text-[var(--si-blue)]' : 'text-[var(--si-faint)]')} title={thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : undefined}>
            {shortTime(thread.lastMessageAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cx('flex-1 truncate text-[12.5px]', unread ? 'text-[var(--si-text-2)] font-medium' : 'text-[var(--si-muted)]')}>{preview}</span>
          {unread > 0 && (
            <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--si-blue)]" aria-label={`${unread} unread`} title={`${unread} unread`} />
          )}
        </span>
        {(labels.length > 0 || thread.assignedTo?.user?.name || status === 'PENDING') && (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {status === 'PENDING' && (
              <span className="px-1.5 py-px rounded text-[10px] font-semibold bg-[var(--si-amber-soft)] text-[var(--si-amber)]">Request</span>
            )}
            {labels.map((id) => {
              const def = SPACE_THREAD_LABELS.find((entry) => entry.id === id);
              if (!def) return null;
              return (
                <span key={id} className={`px-1.5 py-px rounded text-[10px] font-semibold ${def.tone}`}>
                  {def.label}
                </span>
              );
            })}
            {thread.assignedTo?.user?.name && (
              <span className="px-1.5 py-px rounded bg-[var(--si-hover)] text-[10px] font-semibold text-[var(--si-muted)]">
                → {String(thread.assignedTo.user.name).split(' ')[0]}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
