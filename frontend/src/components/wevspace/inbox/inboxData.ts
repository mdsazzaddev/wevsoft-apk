/**
 * Data layer for the Wevsoft Space Inbox (phase 1).
 *
 * Every number and row here comes from the existing Space inbox API
 * (GET /api/spaces/manage/:id/inbox, GET /inbox/:threadId …) that the classic
 * MessagesPanel already used — nothing is invented. Filters the server has no
 * folder for are *derived* from a real sample of open conversations and say so;
 * filters with no backing data at all (VIP) render an honest empty state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpaceInboxFolder, SpaceThreadStatus } from '@wevsoft/shared/wevspace';
import {
  fetchInboxThread,
  fetchInboxThreads,
  type InboxListResponse,
  type InboxThreadResponse,
} from '../../../lib/wevspaceManageApi';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { createPresenceTrack } from '../../../lib/presenceClient';

export const PAGE_SIZE = 25;
/** The server caps a page at 50, so derived filters and stats read the latest 50. */
export const SAMPLE_SIZE = 50;

export type InboxFilterId =
  | 'all'
  | 'requests'
  | 'unread'
  | 'assigned'
  | 'mine'
  | 'vip'
  | 'leads'
  | 'support'
  | 'resolved'
  | 'archived'
  | 'spam';

export interface ListParams {
  folder?: SpaceInboxFolder;
  status?: SpaceThreadStatus;
}

export interface InboxFilterDef {
  id: InboxFilterId;
  label: string;
  /** server: its own query · derived: filtered from the open sample · none: no data source yet. */
  source: 'server' | 'derived' | 'none';
  blurb: string;
  params?: ListParams;
  /** Rows this filter keeps (derived filters, and a guard for server ones). */
  match?: (thread: any, ctx: { meId: string | null }) => boolean;
  empty: string;
}

const hasLabel = (thread: any, id: string) => Array.isArray(thread?.labels) && thread.labels.includes(id);

export const INBOX_FILTERS: InboxFilterDef[] = [
  { id: 'all', label: 'All', source: 'server', params: { folder: 'inbox' }, blurb: 'Every accepted, open conversation', empty: 'When somebody messages this Space the conversation appears here.' },
  { id: 'requests', label: 'Requests', source: 'server', params: { folder: 'requests' }, blurb: 'First-time senders awaiting acceptance', empty: 'First-time senders wait here until somebody accepts them.' },
  { id: 'unread', label: 'Unread', source: 'server', params: { folder: 'unread' }, blurb: 'Open conversations with messages nobody has opened', empty: 'You are all caught up.' },
  { id: 'assigned', label: 'Assigned', source: 'derived', match: (t) => Boolean(t?.assignedTo), blurb: 'Open conversations handed to any teammate (latest 50)', empty: 'No open conversation is assigned to a teammate.' },
  { id: 'mine', label: 'My Chats', source: 'derived', match: (t, { meId }) => Boolean(meId) && t?.assignedTo?.user?.id === meId, blurb: 'Open conversations assigned to you (latest 50)', empty: 'Nothing is assigned to you right now.' },
  { id: 'vip', label: 'VIP', source: 'none', blurb: 'VIP contacts arrive with the CRM in the next phase', empty: 'VIP tagging is coming in the next phase. There is no VIP marker on conversations yet, so this list stays empty rather than guessing.' },
  { id: 'leads', label: 'Leads', source: 'derived', match: (t) => hasLabel(t, 'lead'), blurb: 'Open conversations labelled “Lead” (latest 50)', empty: 'Label a conversation “Lead” from its ⋮ menu and it shows up here.' },
  { id: 'support', label: 'Support', source: 'derived', match: (t) => hasLabel(t, 'support'), blurb: 'Open conversations labelled “Support” (latest 50)', empty: 'Label a conversation “Support” from its ⋮ menu and it shows up here.' },
  { id: 'resolved', label: 'Resolved', source: 'server', params: { folder: 'resolved' }, blurb: 'Closed conversations', empty: 'Resolved conversations land here.' },
  { id: 'archived', label: 'Archived', source: 'server', params: { status: 'ARCHIVED' }, match: (t) => t?.status === 'ARCHIVED', blurb: 'Archived (manually, or auto-archived after being resolved)', empty: 'Nothing archived yet.' },
  { id: 'spam', label: 'Spam', source: 'server', params: { folder: 'spam' }, blurb: 'Filtered or reported', empty: 'No spam. Nice.' },
];

export function filterDef(id: InboxFilterId): InboxFilterDef {
  return INBOX_FILTERS.find((f) => f.id === id) || INBOX_FILTERS[0];
}

/** Client-side name/@username match, so search also works on derived lists. */
export function matchesSearch(thread: any, search: string): boolean {
  const q = search.trim().replace(/^@+/, '').toLowerCase();
  if (!q) return true;
  const c = thread?.customer || {};
  return String(c.name || '').toLowerCase().includes(q) || String(c.username || '').toLowerCase().includes(q);
}

interface ListState {
  data: InboxListResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * One inbox list query with silent background refresh and "load more".
 * `params === null` disables it (derived/none filters read the sample instead).
 */
export function useThreadList(spaceId: string, params: ListParams | null, search: string, limit = PAGE_SIZE) {
  const [state, setState] = useState<ListState>({ data: null, loading: Boolean(params), error: null });
  const [more, setMore] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const key = JSON.stringify([spaceId, params, search, limit]);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const load = useCallback(
    async (silent: boolean) => {
      const p = paramsRef.current;
      if (!p) {
        setState({ data: null, loading: false, error: null });
        return;
      }
      const mine = ++generation.current;
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await fetchInboxThreads(spaceId, { ...p, search: search.trim() || undefined, limit });
        if (generation.current !== mine) return;
        setState({ data, loading: false, error: null });
        if (!silent) setMore([]);
      } catch (error: any) {
        if (generation.current !== mine) return;
        setState((s) =>
          silent ? { ...s, loading: false } : { data: null, loading: false, error: error?.message || 'Could not load conversations' },
        );
      }
    },
     
    [key],
  );

  useEffect(() => {
    setMore([]);
    void load(false);
  }, [load]);

  const threads = useMemo(() => {
    const first = state.data?.threads || [];
    const seen = new Set(first.map((t: any) => t.id));
    return [...first, ...more.filter((t) => !seen.has(t.id))];
  }, [state.data, more]);

  const total = state.data?.total ?? 0;
  const hasMore = Boolean(params) && threads.length < total;

  const loadMore = useCallback(async () => {
    const p = paramsRef.current;
    if (!p || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchInboxThreads(spaceId, { ...p, search: search.trim() || undefined, limit, offset: threads.length });
      setMore((prev) => [...prev, ...(page.threads || [])]);
    } catch {
      /* the button stays; the user can retry */
    } finally {
      setLoadingMore(false);
    }
  }, [spaceId, search, limit, threads.length, loadingMore]);

  return { ...state, threads, total, hasMore, loadMore, loadingMore, reload: () => load(false), refresh: () => load(true) };
}

/** One conversation with its messages (GET /inbox/:threadId, which also clears its unread count). */
export function useThreadDetail(threadId: string | null) {
  const [data, setData] = useState<InboxThreadResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(threadId));
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(
    async (silent: boolean) => {
      if (!threadId) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
      }
      const mine = ++generation.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await fetchInboxThread(threadId, { limit: 100 });
        if (generation.current !== mine) return;
        setData(result);
        setError(null);
      } catch (err: any) {
        if (generation.current !== mine) return;
        if (!silent) {
          setData(null);
          setError(err?.message || 'Could not open this conversation');
        }
      } finally {
        if (generation.current === mine) setLoading(false);
      }
    },
    [threadId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setData(null);
    void load(false);
  }, [load]);

  return { data, loading, error, reload: () => load(false), refresh: () => load(true) };
}

/** Live presence: snapshot of who is active, plus user:online / user:offline as it changes. */
export function usePresence(): Record<string, 'online' | 'offline'> {
  const { socket } = useWebSocket();
  const [presence, setPresence] = useState<Record<string, 'online' | 'offline'>>({});
  const trackRef = useRef(createPresenceTrack());
  useEffect(() => {
    if (!socket) return;
    const track = trackRef.current;
    const on = (p: { userId?: string }) => {
      if (!p?.userId) return;
      track.note(p.userId, true);
      const userId = p.userId;
      setPresence((s) => ({ ...s, [userId]: 'online' }));
    };
    const off = (p: { userId?: string }) => {
      if (!p?.userId) return;
      track.note(p.userId, false);
      const userId = p.userId;
      setPresence((s) => ({ ...s, [userId]: 'offline' }));
    };
    const onList = (ids: unknown) => {
      const list = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
      const online = track.applySnapshot(list);
      setPresence((prev) => {
        const next: Record<string, 'online' | 'offline'> = {};
        for (const id of Object.keys(prev)) next[id] = 'offline';
        for (const id of online) next[id] = 'online';
        return next;
      });
    };
    const request = () => socket.emit('presence:sync');
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) request();
    };
    socket.on('user:online', on);
    socket.on('user:offline', off);
    socket.on('presence:online-list', onList);
    socket.on('connect', request);
    request();
    // Match WevChat: periodic resync so TTL-expired ghost sockets do not stay "online".
    const resync = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (socket.connected) request();
    }, 45_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(resync);
      socket.off('user:online', on);
      socket.off('user:offline', off);
      socket.off('presence:online-list', onList);
      socket.off('connect', request);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [socket]);
  return presence;
}

/**
 * Calls `onActivity` when something may have changed in this Space's inbox: a
 * message in a conversation we can see, a Space-message notification, or every
 * 30 s while the tab is visible (the team is not always in the conversation room).
 */
export function useInboxActivity(onActivity: (conversationId: string | undefined, source: 'socket' | 'poll') => void) {
  const { socket } = useWebSocket();
  const cb = useRef(onActivity);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  cb.current = onActivity;
  useEffect(() => {
    const onMessage = (payload: any) => cb.current(payload?.conversationId || payload?.message?.conversationId, 'socket');
    const onNotification = (payload: any) => {
      const text = JSON.stringify(payload || {});
      if (text.includes('space_message') || text.includes('/manage/wevchat')) cb.current(undefined, 'socket');
    };
    socket?.on('new-message', onMessage);
    socket?.on('notification:new', onNotification);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') cb.current(undefined, 'poll');
    }, 30000);
    return () => {
      socket?.off('new-message', onMessage);
      socket?.off('notification:new', onNotification);
      window.clearInterval(timer);
    };
  }, [socket]);
}

export interface InboxStats {
  totalChats: number | null;
  unread: number | null;
  activeUsers: number | null;
  responseMs: number | null;
  responseSample: number;
}

/** Header-strip numbers. Each is real or null (rendered as "—" with a reason). */
export function computeStats(opts: {
  statusCounts: Record<string, number> | null;
  unreadThreads: number | undefined;
  openSample: any[] | null;
  resolvedSample: any[] | null;
}): InboxStats {
  const { statusCounts, unreadThreads, openSample, resolvedSample } = opts;
  const totalChats = statusCounts ? Object.values(statusCounts).reduce((a, b) => a + (Number(b) || 0), 0) : null;
  const unread =
    typeof unreadThreads === 'number'
      ? unreadThreads
      : openSample
        ? openSample.filter((t) => (t.unreadCount || 0) > 0).length
        : null;

  let activeUsers: number | null = null;
  if (openSample) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const ids = new Set<string>();
    for (const t of [...openSample, ...(resolvedSample || [])]) {
      const at = new Date(t.lastMessageAt || 0).getTime();
      if (at >= cutoff && t.customer?.id) ids.add(t.customer.id);
    }
    activeUsers = ids.size;
  }

  const durations: number[] = [];
  for (const t of [...(openSample || []), ...(resolvedSample || [])]) {
    if (!t.createdAt || !t.firstReplyAt) continue;
    const ms = new Date(t.firstReplyAt).getTime() - new Date(t.createdAt).getTime();
    if (Number.isFinite(ms) && ms >= 0) durations.push(ms);
  }
  durations.sort((a, b) => a - b);
  const responseMs = durations.length
    ? durations.length % 2
      ? durations[(durations.length - 1) / 2]
      : (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
    : null;

  return { totalChats, unread, activeUsers, responseMs, responseSample: durations.length };
}

// ── formatting ─────────────────────────────────────────────

export function shortTime(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function clockTime(value: unknown): string {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function dayKey(value: unknown): string {
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? '' : date.toDateString();
}

export function dayLabel(value: unknown): string {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function longDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function duration(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function compact(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat(undefined, { notation: n >= 10000 ? 'compact' : 'standard' }).format(n);
}
