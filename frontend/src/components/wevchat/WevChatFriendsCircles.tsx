import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import UserAvatar from '../UserAvatar';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';

export type WevChatFriendChip = {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  profileSlug?: string | null;
};

type Props = {
  onlineUserIds?: Set<string>;
  onOpenFriend: (friend: WevChatFriendChip) => void;
};

/**
 * Horizontal friend avatar circles (WevChat-style) above the chat list.
 */
// Module-level 60-second friends cache — avoids redundant API round-trips on
// remounts (e.g. PiP mode, tab switches) since the friends list changes rarely.
const friendsCache = new Map<string, { data: WevChatFriendChip[]; expiresAt: number }>();
// Last known list survives reloads so the row paints instantly on first open instead of
// empty -> skeleton -> avatars (which read as a blink).
const FRIENDS_LS_KEY = 'wevchat:friends:v1';
function readStoredFriends(): WevChatFriendChip[] | null {
  try {
    const raw = localStorage.getItem(FRIENDS_LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}
function writeStoredFriends(list: WevChatFriendChip[]) {
  try { localStorage.setItem(FRIENDS_LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function WevChatFriendsCircles({ onlineUserIds, onOpenFriend }: Props) {
  const token = useStore((s) => s.token);
  const { isSpaceMode } = useSpaceIdentities();
  const [friends, setFriends] = useState<WevChatFriendChip[]>(() => {
    const cached = token ? friendsCache.get(token) : null;
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    return readStoredFriends() ?? [];
  });
  // Start in loading state when nothing is cached, so the skeleton shows from the first frame.
  const [loading, setLoading] = useState(() => !!token && readStoredFriends() == null);

  useEffect(() => {
    if (!token || isSpaceMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setFriends([]);
      return;
    }
    // Serve from cache if still fresh.
    const cached = friendsCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      setFriends(cached.data);
      return;
    }
    let cancelled = false;
    if (friends.length === 0) setLoading(true);
    fetch('/api/friends/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then((rows) => {
        if (cancelled) return;
        const mapped: WevChatFriendChip[] = rows.map((f: any) => ({
          id: f.id,
          name: f.name || f.username || 'Friend',
          username: f.username,
          avatar: f.avatar,
          profileSlug: f.profileSlug,
        }));
        friendsCache.set(token, { data: mapped, expiresAt: Date.now() + 60_000 });
        setFriends(mapped);
        writeStoredFriends(mapped);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, isSpaceMode]);

  if (isSpaceMode || !token) return null;
  if (!loading && friends.length === 0) return null;

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden pt-1">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 min-w-0 w-full overscroll-x-contain touch-pan-x">
        {loading && friends.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))
          : friends.map((friend) => {
              const online = onlineUserIds?.has(friend.id);
              const label = (friend.name || '').split(/\s+/)[0] || friend.username || 'Friend';
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onOpenFriend(friend)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
                  title={friend.name}
                >
                  <span className="relative">
                    <span
                      className={`block rounded-full p-[2px] ${
                        online
                          ? 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-blue-500'
                          : 'bg-border/80'
                      }`}
                    >
                      <UserAvatar
                        user={friend}
                        className="w-[3.25rem] h-[3.25rem] text-xs ring-2 ring-background"
                      />
                    </span>
                    {online && (
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-foreground/90 truncate w-full text-center group-hover:text-primary">
                    {label}
                  </span>
                </button>
              );
            })}
        {/* Trailing spacer so the last avatar isn't clipped at the edge */}
        <div className="shrink-0 w-1" aria-hidden />
      </div>
    </div>
  );
}
