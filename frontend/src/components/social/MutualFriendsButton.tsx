import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, X } from 'lucide-react';
import { useStore } from '../../store';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';

type MutualUser = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  verified?: boolean;
};

type Props = {
  targetUserId: string;
  /** When known from parent, skip an extra count-only fetch. */
  initialCount?: number | null;
  className?: string;
};

export function MutualFriendsButton({ targetUserId, initialCount = null, className = '' }: Props) {
  const token = useStore((s) => s.token);
  const selfId = useStore((s) => s.user?.id);
  const { isSpaceMode } = useSpaceIdentities();
  const [count, setCount] = useState(initialCount ?? 0);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<MutualUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (isSpaceMode || !token || !targetUserId || targetUserId === selfId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setCount(0);
      return;
    }
    if (initialCount != null) {
      setCount(initialCount);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${targetUserId}/mutual-friends?countOnly=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(Number(data.count) || 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, targetUserId, selfId, initialCount, isSpaceMode]);

  const loadPage = async (cursor?: string | null, append = false) => {
    if (!token || isSpaceMode) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '24' });
      if (cursor) qs.set('cursor', cursor);
      const res = await fetch(`/api/users/${targetUserId}/mutual-friends?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCount(Number(data.count) || 0);
      setUsers((prev) => (append ? [...prev, ...(data.users || [])] : data.users || []));
      setNextCursor(data.nextCursor || null);
    } catch {
      if (!append) setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openSheet = () => {
    setOpen(true);
    void loadPage(null, false);
  };

  if (isSpaceMode || !token || !targetUserId || targetUserId === selfId || count <= 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={`inline-flex items-center gap-1.5 text-sm text-primary hover:underline ${className}`}
      >
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span>
          {count} mutual friend{count === 1 ? '' : 's'}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-label="Mutual friends"
            className="w-full sm:max-w-md max-h-[85dvh] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground text-sm">
                Mutual friends ({count})
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-2 py-2">
              {loading && users.length === 0 ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No mutual friends</p>
              ) : (
                <ul className="space-y-0.5">
                  {users.map((u) => (
                    <li key={u.id}>
                      <Link
                        to={u.username ? `/u/${u.username}` : `/profile`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60"
                      >
                        <img
                          src={u.avatar || '/default-avatar.png'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover bg-muted"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                          {u.username ? (
                            <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {nextCursor ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadPage(nextCursor, true)}
                  className="w-full text-sm text-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
