import React, { useEffect, useState, useRef } from 'react';
import { Search, Check, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import UserAvatar from '../UserAvatar';
import { wevchatApi } from '../../lib/wevchatApi';
import { UserProfileModal } from '../wevchat/UserProfileModal';

export type SharePerson = {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  isOnline?: boolean;
  verified?: boolean;
};

export default function WevChatFriendPicker({
  selectedIds,
  onSelectionChange,
  isMobile = true,
  highlight = false,
}: {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isMobile?: boolean;
  /** Briefly pulse the row when "Send to Friend" focuses this section. */
  highlight?: boolean;
}) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [people, setPeople] = useState<SharePerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [previewUser, setPreviewUser] = useState<SharePerson | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlight || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlight]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchPeople = async () => {
      setLoading(true);
      const byId = new Map<string, SharePerson>();

      try {
        const convos = await wevchatApi.getConversations();
        if (Array.isArray(convos)) {
          for (const c of convos) {
            if (String(c?.type || '') === 'group') continue;
            const other =
              c?.otherUser ||
              (Array.isArray(c?.members)
                ? c.members.find((m: any) => m?.user?.id && m.user.id !== user?.id)?.user
                : null);
            if (!other?.id || other.id === user?.id) continue;
            if (!byId.has(other.id)) {
              byId.set(other.id, {
                id: other.id,
                name: other.name || other.username || 'Chat',
                username: other.username,
                avatar: other.avatar,
                isOnline: other.isOnline,
                verified: !!(other.verified || other.isVerified),
              });
            }
          }
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch('/api/friends/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            for (const f of rows) {
              if (!f?.id || f.id === user?.id) continue;
              const existing = byId.get(f.id);
              byId.set(f.id, {
                id: f.id,
                name: f.name || f.username || existing?.name || 'Friend',
                username: f.username || existing?.username,
                avatar: f.avatar || existing?.avatar,
                isOnline: f.isOnline ?? existing?.isOnline,
                verified: !!(f.verified || f.isVerified || existing?.verified),
              });
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) {
        setPeople(Array.from(byId.values()));
        setLoading(false);
      }
    };
    fetchPeople();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  const filteredPeople = people.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const togglePerson = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handlePointerDown = (person: SharePerson) => {
    pressTimer.current = setTimeout(() => setPreviewUser(person), 500);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  if (loading && people.length === 0) {
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-8 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && people.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No WevChat friends yet.</p>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`space-y-2 relative rounded-2xl transition-shadow ${
        highlight ? 'ring-2 ring-primary/40 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]' : ''
      }`}
    >
      {(isMobile ? showMobileSearch : true) && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="share-friend-search"
              type="search"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="off"
            />
          </div>
          {!isMobile && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={selectedIds.length === filteredPeople.length && filteredPeople.length > 0}
                onChange={(e) => {
                  if (e.target.checked) onSelectionChange(filteredPeople.map((p) => p.id));
                  else onSelectionChange([]);
                }}
              />
              Select All
            </label>
          )}
        </div>
      )}

      {isMobile && !showMobileSearch && (
        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={() => setShowMobileSearch(true)}
            className="text-[11px] font-semibold text-primary flex items-center gap-0.5"
            aria-label="Search friends"
          >
            <Search size={12} /> Search
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5 relative">
        {filteredPeople.map((person) => {
          const isSelected = selectedIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => togglePerson(person.id)}
              onPointerDown={() => handlePointerDown(person)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => {
                e.preventDefault();
                setPreviewUser(person);
              }}
              className="flex flex-col items-center gap-1 shrink-0 w-14 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
              aria-pressed={isSelected}
              aria-label={`${person.name}${isSelected ? ', selected' : ''}`}
            >
              <div className="relative">
                <UserAvatar
                  user={person}
                  className={`w-11 h-11 text-xs transition-transform ${
                    isSelected ? 'scale-95 ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                />
                {isSelected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
                {!isSelected && person.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium truncate w-full text-center ${
                  isSelected ? 'text-primary font-bold' : ''
                }`}
              >
                {person.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
        {filteredPeople.length > 6 && (
          <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-10 text-muted-foreground" aria-hidden>
            <ChevronRight size={18} />
          </div>
        )}
        {filteredPeople.length === 0 && searchQuery && (
          <div className="text-xs text-muted-foreground py-2 w-full text-center">No friends found</div>
        )}
      </div>

      {previewUser && (
        <UserProfileModal
          isOpen={!!previewUser}
          onClose={() => setPreviewUser(null)}
          user={previewUser as any}
        />
      )}
    </div>
  );
}
