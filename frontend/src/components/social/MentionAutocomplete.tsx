import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../../store';

export interface MentionUser {
  id: string;
  name: string;
  username: string | null;
  avatar?: string | null;
}

interface MentionAutocompleteProps {
  /** Text fragment after `@` (no @ prefix). Empty hides. */
  query: string;
  open: boolean;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  className?: string;
}

export default function MentionAutocomplete({
  query,
  open,
  onSelect,
  onClose,
  className = '',
}: MentionAutocompleteProps) {
  const token = useStore((s) => s.token);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !token || query.trim().length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setUsers([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/users/search?q=${encodeURIComponent(query.trim())}&limit=8`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const data = await res.json().catch(() => ({}));
          const list: MentionUser[] = Array.isArray(data.users)
            ? data.users.filter((u: MentionUser) => u?.username)
            : [];
          setUsers(list);
          setActive(0);
        } catch {
          setUsers([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, token, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (!users.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (i + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i - 1 + users.length) % users.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const u = users[active];
        if (u) {
          e.preventDefault();
          onSelect(u);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, users, active, onSelect, onClose]);

  if (!open || query.trim().length < 1) return null;

  return (
    <div
      ref={listRef}
      className={`absolute left-0 right-0 top-full mt-1 z-40 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl ${className}`}
      role="listbox"
    >
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Searching…
        </div>
      ) : null}
      {!loading && users.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">No people found</p>
      ) : null}
      {users.map((u, i) => (
        <button
          key={u.id}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
          onMouseEnter={() => setActive(i)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            i === active ? 'bg-primary/10' : 'hover:bg-muted/60'
          }`}
        >
          <img
            src={
              u.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username || 'U')}&background=random`
            }
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/60"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{u.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/** Detect @mention query at caret in a textarea value. */
export function mentionQueryAtCaret(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, Math.max(0, caret));
  const m = before.match(/(^|[\s([{])@([A-Za-z0-9._-]{0,30})$/);
  if (!m) return null;
  const query = m[2] || '';
  const start = before.length - query.length - 1; // index of @
  return { start, query };
}
