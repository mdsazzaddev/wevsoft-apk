import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, UserPlus, UserCheck, Clock3, Check, Lock, CheckCircle } from 'lucide-react';
import ReactionIcon from '../reactions/ReactionIcon';
import { isReactionType } from '../../lib/reactions';

export type StatsSheetMode = 'people' | 'following' | 'reactions';
type PeopleTab = 'friends' | 'followers';

type Person = {
  id: string;
  name: string;
  username: string | null;
  profileSlug: string | null;
  avatar: string | null;
  verified: boolean;
  verifiedBadge: boolean;
  friendStatus: 'none' | 'accepted' | 'pending_sent' | 'pending_received' | 'self';
  isFollowing: boolean;
};

type ReactionsData = {
  total: number;
  byType: Record<string, number>;
  topPosts: { id: string; content: string; reactions: number }[];
};

const REACTION_LABEL: Record<string, string> = {
  like: 'Like', love: 'Love', care: 'Care', haha: 'Haha', wow: 'Wow', sad: 'Sad', angry: 'Angry',
};

function authHeaders(token?: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function PersonRow({ p, token, onOpen }: { p: Person; token?: string | null; onOpen: (p: Person) => void }) {
  const [status, setStatus] = useState(p.friendStatus);
  const [following, setFollowing] = useState(p.isFollowing);
  const [busy, setBusy] = useState(false);

  const post = async (path: string) => {
    if (!token || busy) return null;
    setBusy(true);
    try {
      const res = await fetch(path, { method: 'POST', headers: authHeaders(token) });
      return res.ok ? res : null;
    } finally {
      setBusy(false);
    }
  };

  let action: React.ReactNode = null;
  const btn = 'h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60 shrink-0';
  if (status === 'self' || !token) action = null;
  else if (status === 'accepted')
    action = <span className={`${btn} bg-muted text-foreground`}><UserCheck size={14} /> Friends</span>;
  else if (status === 'pending_sent')
    action = <span className={`${btn} bg-muted text-muted-foreground`}><Clock3 size={14} /> Requested</span>;
  else if (status === 'pending_received')
    action = (
      <button type="button" disabled={busy} className={`${btn} bg-violet-600 hover:bg-violet-700 text-white`}
        onClick={async () => { if (await post(`/api/friends/accept/${p.id}`)) setStatus('accepted'); }}>
        <Check size={14} /> Confirm
      </button>
    );
  else
    action = (
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" disabled={busy} className={`${btn} bg-violet-600 hover:bg-violet-700 text-white`}
          onClick={async () => { if (await post(`/api/friends/request/${p.id}`)) setStatus('pending_sent'); }}>
          <UserPlus size={14} /> Add
        </button>
        <button type="button" disabled={busy} className={`${btn} border border-border bg-card hover:bg-muted text-foreground`}
          onClick={async () => {
            const res = await post(`/api/users/${p.id}/follow`);
            if (res) { const d = await res.json().catch(() => ({})); setFollowing(!!d.following); }
          }}>
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    );

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
      <button type="button" onClick={() => onOpen(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-lg">
        {p.avatar ? (
          <img src={p.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-sm font-black text-white">
            {p.name?.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-bold text-foreground truncate">
            {p.name}
            {(p.verified || p.verifiedBadge) && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-blue-500" fill="currentColor" strokeWidth={0} />}
          </span>
          {p.username && <span className="block text-xs text-muted-foreground truncate">@{p.username}</span>}
        </span>
      </button>
      {action}
    </li>
  );
}

export default function ProfileStatsSheet({
  username,
  token,
  mode,
  initialTab = 'friends',
  canSeeFriends = true,
  onClose,
}: {
  username: string;
  token?: string | null;
  mode: StatsSheetMode;
  initialTab?: PeopleTab;
  canSeeFriends?: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<PeopleTab>(canSeeFriends ? initialTab : 'followers');
  const kind = mode === 'following' ? 'following' : tab;
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState<ReactionsData | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const loadPeople = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/u/${encodeURIComponent(username)}/connections?kind=${kind}&offset=${offset}&limit=30`, { headers: authHeaders(token) });
      const data = res.ok ? await res.json() : { users: [], total: 0, nextOffset: null, hidden: false };
      setHidden(!!data.hidden);
      setTotal(Number(data.total) || 0);
      setNextOffset(data.nextOffset ?? null);
      setPeople((prev) => (offset === 0 ? data.users || [] : [...prev, ...(data.users || [])]));
    } catch {
      if (offset === 0) setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [username, kind, token]);

  useEffect(() => {
    if (mode === 'reactions') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
      setLoading(true);
      fetch(`/api/u/${encodeURIComponent(username)}/reactions`, { headers: authHeaders(token) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setReactions(d))
        .catch(() => setReactions(null))
        .finally(() => setLoading(false));
      return;
    }
    setPeople([]);
    void loadPeople(0);
  }, [mode, loadPeople, username, token]);

  const openPerson = (p: Person) => {
    onClose();
    navigate(`/u/${p.username || p.profileSlug || p.id}`);
  };

  const title = mode === 'reactions' ? 'Reactions' : mode === 'following' ? 'Following' : 'Friends & Followers';
  const reactionRows = reactions ? Object.entries(reactions.byType).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/50 cursor-default" aria-label="Close" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="relative flex max-h-[85vh] w-full sm:max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border bg-card shadow-2xl outline-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-extrabold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {mode === 'people' && (
          <div className="flex border-b border-border px-2" role="tablist">
            {(['friends', 'followers'] as PeopleTab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`relative flex-1 py-2.5 text-sm font-bold ${tab === t ? 'text-violet-600' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'friends' ? 'Friends' : 'Followers'}
                {tab === t && !loading && <span className="ml-1 text-xs font-semibold opacity-70">{total}</span>}
                {tab === t && <span className="absolute left-4 right-4 bottom-0 h-[3px] rounded-full bg-violet-600" />}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-[200px] flex-1 overflow-y-auto">
          {mode === 'reactions' ? (
            loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : !reactions || reactions.total === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No reactions yet.</p>
            ) : (
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-foreground">{reactions.total.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">total reactions on posts you can see</div>
                </div>
                <ul className="space-y-2">
                  {reactionRows.map(([type, n]) => (
                    <li key={type} className="flex items-center gap-3">
                      <span className="w-7 flex justify-center">{isReactionType(type) ? <ReactionIcon type={type} size={22} /> : <span>👍</span>}</span>
                      <span className="w-14 text-sm font-semibold text-foreground">{REACTION_LABEL[type] || type}</span>
                      <span className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <span className="block h-full rounded-full bg-violet-600" style={{ width: `${Math.max(4, (n / reactions.total) * 100)}%` }} />
                      </span>
                      <span className="w-12 text-right text-sm font-bold text-foreground">{n.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                {reactions.topPosts.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Top posts</h3>
                    <ul className="divide-y divide-border rounded-2xl border border-border">
                      {reactions.topPosts.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => { onClose(); navigate(`/posts/${encodeURIComponent(p.id)}`); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50">
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.content || 'Photo/video post'}</span>
                            <span className="shrink-0 text-xs font-bold text-muted-foreground">{p.reactions}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          ) : hidden || (mode === 'people' && tab === 'friends' && !canSeeFriends) ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Lock size={22} />
              This list is private.
            </div>
          ) : people.length === 0 && loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : people.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No one here yet.</p>
          ) : (
            <ul className="py-1">
              {people.map((p) => <PersonRow key={`${kind}-${p.id}`} p={p} token={token} onOpen={openPerson} />)}
              {nextOffset != null && (
                <li className="px-4 py-3">
                  <button type="button" disabled={loading} onClick={() => loadPeople(nextOffset)} className="w-full h-9 rounded-xl border border-border bg-card hover:bg-muted text-sm font-bold text-foreground disabled:opacity-60">
                    {loading ? 'Loading…' : 'Show more'}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}