import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  EyeOff,
  Globe,
  Heart,
  Search,
  UserPlus,
  Users,
  X,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../store';
import {
  audienceSummaryLabel,
  DEFAULT_VISIBILITY_FLAGS,
  normalizeAudienceSelection,
  type AudienceUser,
  type VisibilityFlags,
} from '../../lib/postVisibility';

type Props = {
  open: boolean;
  onClose: () => void;
  initialFlags?: VisibilityFlags;
  initialCustomUsers?: AudienceUser[];
  initialHideFromUsers?: AudienceUser[];
  onSave: (payload: {
    flags: VisibilityFlags;
    customUsers: AudienceUser[];
    hideFromUsers: AudienceUser[];
  }) => void;
  /** Defaults to "Post audience" */
  title?: string;
};

const OPTIONS: {
  key: keyof VisibilityFlags;
  label: string;
  hint: string;
  icon: typeof Users;
}[] = [
  { key: 'friends', label: 'Friends', hint: 'People you are friends with', icon: Users },
  {
    key: 'closeFriends',
    label: 'Close Friends',
    hint: 'Only people on your Close Friends list',
    icon: Heart,
  },
  { key: 'followers', label: 'Followers', hint: 'People who follow you', icon: UserPlus },
  { key: 'public', label: 'Public', hint: 'Anyone on or off Wevsoft', icon: Globe },
  { key: 'custom', label: 'Custom', hint: 'Only specific people you choose', icon: Users },
  {
    key: 'hideFrom',
    label: 'Hide From Specific Users',
    hint: 'Hide this post from people you pick (works with Friends / Followers / Public)',
    icon: EyeOff,
  },
];

function PeoplePicker({
  title,
  query,
  onQueryChange,
  searching,
  results,
  selected,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  query: string;
  onQueryChange: (q: string) => void;
  searching: boolean;
  results: AudienceUser[];
  selected: AudienceUser[];
  onAdd: (u: AudienceUser) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mx-0.5 mt-1 mb-1 rounded-lg border border-border bg-background/80 p-1.5 space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground px-0.5">{title}</p>
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-card pl-7 pr-7 py-1.5 text-[11px] outline-none focus:border-primary/50"
        />
        {searching && (
          <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-24 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onAdd(u)}
                className="w-full flex items-center gap-1.5 px-1.5 py-1 text-left hover:bg-muted/60"
              >
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold truncate leading-tight">{u.name}</p>
                  {u.username && (
                    <p className="text-[9px] text-muted-foreground truncate leading-tight">@{u.username}</p>
                  )}
                </div>
                <UserPlus size={11} className="text-primary shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 pl-0.5 pr-1 py-0.5 text-[10px] font-semibold"
            >
              <img
                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`}
                alt=""
                className="w-3.5 h-3.5 rounded-full object-cover"
              />
              <span className="max-w-[72px] truncate">{u.name}</span>
              <button
                type="button"
                onClick={() => onRemove(u.id)}
                className="p-0.5 rounded-full hover:bg-background"
                aria-label={`Remove ${u.name}`}
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AudienceSelectorModal({
  open,
  onClose,
  initialFlags,
  initialCustomUsers,
  initialHideFromUsers,
  onSave,
  title = 'Post audience',
}: Props) {
  const token = useStore((s) => s.token);
  const [flags, setFlags] = useState<VisibilityFlags>(initialFlags || DEFAULT_VISIBILITY_FLAGS);
  const [customUsers, setCustomUsers] = useState<AudienceUser[]>(initialCustomUsers || []);
  const [hideFromUsers, setHideFromUsers] = useState<AudienceUser[]>(initialHideFromUsers || []);
  const [query, setQuery] = useState('');
  const [hideQuery, setHideQuery] = useState('');
  const [results, setResults] = useState<AudienceUser[]>([]);
  const [hideResults, setHideResults] = useState<AudienceUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [hideSearching, setHideSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setFlags({ ...DEFAULT_VISIBILITY_FLAGS, ...(initialFlags || {}) });
    setCustomUsers(initialCustomUsers || []);
    setHideFromUsers(initialHideFromUsers || []);
    setQuery('');
    setHideQuery('');
    setResults([]);
    setHideResults([]);
  }, [open, initialFlags, initialCustomUsers, initialHideFromUsers]);

  const runSearch = useCallback(
    async (
      q: string,
      excludeIds: Set<string>,
      setList: (u: AudienceUser[]) => void,
      setBusy: (b: boolean) => void,
    ) => {
      if (!token || q.trim().length < 1) {
        setList([]);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        const users: AudienceUser[] = Array.isArray(data.users) ? data.users : [];
        setList(users.filter((u) => !excludeIds.has(u.id)));
      } catch {
        setList([]);
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!flags.custom) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(
        query,
        new Set([...customUsers.map((u) => u.id), ...hideFromUsers.map((u) => u.id)]),
        setResults,
        setSearching,
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, flags.custom, customUsers, hideFromUsers, runSearch]);

  useEffect(() => {
    if (!flags.hideFrom) return;
    if (hideDebounceRef.current) clearTimeout(hideDebounceRef.current);
    hideDebounceRef.current = setTimeout(() => {
      void runSearch(
        hideQuery,
        new Set([...hideFromUsers.map((u) => u.id), ...customUsers.map((u) => u.id)]),
        setHideResults,
        setHideSearching,
      );
    }, 300);
    return () => {
      if (hideDebounceRef.current) clearTimeout(hideDebounceRef.current);
    };
  }, [hideQuery, flags.hideFrom, hideFromUsers, customUsers, runSearch]);

  const toggle = (key: keyof VisibilityFlags) => {
    if (key === 'onlyMe') return;
    setFlags((prev) => {
      const next = { ...prev, [key]: !prev[key], onlyMe: true };
      // Public is exclusive of friends/followers/custom allow-list (hideFrom can stay).
      if (key === 'public' && next.public) {
        next.friends = false;
        next.followers = false;
        next.custom = false;
        next.closeFriends = false;
      }
      if (key === 'closeFriends' && next.closeFriends) {
        next.public = false;
        next.friends = false;
        next.followers = false;
        next.custom = false;
      }
      if ((key === 'friends' || key === 'followers' || key === 'custom') && next[key]) {
        next.public = false;
        next.closeFriends = false;
      }
      return next;
    });
  };

  const addCustomUser = (user: AudienceUser) => {
    setCustomUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user]));
    setFlags((prev) => ({ ...prev, custom: true, onlyMe: true, public: false }));
    setQuery('');
    setResults((prev) => prev.filter((u) => u.id !== user.id));
  };

  const addHideUser = (user: AudienceUser) => {
    setHideFromUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user]));
    setFlags((prev) => ({ ...prev, hideFrom: true, onlyMe: true }));
    setHideQuery('');
    setHideResults((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleSave = () => {
    const next = normalizeAudienceSelection(flags, customUsers, hideFromUsers);
    onSave({
      flags: next.flags,
      customUsers: next.customUsers,
      hideFromUsers: next.hideFromUsers,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[360px] sm:max-w-[400px] max-h-[min(80vh,560px)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-tight">{title}</h2>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {audienceSummaryLabel(flags, customUsers.length, hideFromUsers.length)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-3 py-2 space-y-0.5 composer-scrollbar">
            <p className="text-[11px] text-muted-foreground px-2 py-1.5 leading-snug">
              Default is Only Me. Tick an audience to share — optional hide list blocks specific people.
            </p>
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const checked = !!flags[opt.key];
              return (
                <label
                  key={opt.key}
                  title={opt.hint}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors shrink-0 ${
                      checked
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border bg-background'
                    }`}
                  >
                    {checked ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggle(opt.key)}
                  />
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1 text-sm font-semibold truncate">{opt.label}</span>
                </label>
              );
            })}

            {flags.custom && (
              <PeoplePicker
                title="Share with"
                query={query}
                onQueryChange={setQuery}
                searching={searching}
                results={results}
                selected={customUsers}
                onAdd={addCustomUser}
                onRemove={(id) => setCustomUsers((prev) => prev.filter((u) => u.id !== id))}
                placeholder="Search people to include…"
              />
            )}

            {flags.hideFrom && (
              <PeoplePicker
                title="Hide from"
                query={hideQuery}
                onQueryChange={setHideQuery}
                searching={hideSearching}
                results={hideResults}
                selected={hideFromUsers}
                onAdd={addHideUser}
                onRemove={(id) => setHideFromUsers((prev) => prev.filter((u) => u.id !== id))}
                placeholder="Search people to hide from…"
              />
            )}
          </div>

          <div className="px-3 py-2.5 border-t border-border flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
