import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../../store';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import ReactionIcon from '../reactions/ReactionIcon';
import UserAvatar from '../UserAvatar';
import { formatSocialCount } from '../../lib/formatCount';
import { profilePathFor } from '../../lib/profileLinks';
import type { ReactionType } from '../../lib/reactions';

type Summary = {
  total: number;
  byType: Record<'love' | 'haha' | 'wow' | 'sad' | 'angry', number>;
  topTypes: Array<'love' | 'haha' | 'wow' | 'sad' | 'angry'>;
};

type Reactor = {
  id: string;
  type: ReactionType;
  createdAt?: string;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    profileSlug?: string | null;
    avatar?: string | null;
    verifiedBadge?: boolean;
    officialTeam?: boolean;
  } | null;
};

const FILTERS: Array<{ id: 'all' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'love', label: 'Love' },
  { id: 'haha', label: 'Haha' },
  { id: 'wow', label: 'Wow' },
  { id: 'sad', label: 'Sad' },
  { id: 'angry', label: 'Angry' },
];

/**
 * Facebook-style reaction chips above the comment composer.
 * Tap to open who reacted + which reaction.
 */
export default function PostReactionSummary({
  postId,
  className = '',
}: {
  postId: string;
  className?: string;
}) {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'>('all');
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useOverlayBack(open, () => setOpen(false));

  const openReactorProfile = (user: NonNullable<Reactor['user']>) => {
    if (user.officialTeam) return;
    const href = profilePathFor({
      id: user.id,
      username: user.username,
      profileSlug: user.profileSlug,
      officialTeam: user.officialTeam,
    });
    if (!href) return;
    setOpen(false);
    // Close comments / other post overlays so the profile is not stuck behind them.
    window.dispatchEvent(new CustomEvent('wev:close-post-overlays'));
    navigate(href);
  };

  const loadSummary = useCallback(async () => {
    if (!postId) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/reactions?limit=1`, {
        headers,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.summary) setSummary(data.summary as Summary);
    } catch {
      /* silent */
    }
  }, [postId, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const onReacted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId === postId) void loadSummary();
    };
    window.addEventListener('wev:post-reacted', onReacted);
    return () => window.removeEventListener('wev:post-reacted', onReacted);
  }, [postId, loadSummary]);

  const loadReactors = useCallback(
    async (type: typeof filter) => {
      if (!postId) return;
      setLoadingList(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const qs = new URLSearchParams({
          limit: '60',
          offset: '0',
          type,
        });
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/reactions?${qs}`, {
          headers,
        });
        if (!res.ok) {
          setReactors([]);
          return;
        }
        const data = await res.json();
        if (data?.summary) setSummary(data.summary as Summary);
        setReactors(Array.isArray(data?.reactors) ? data.reactors : []);
      } catch {
        setReactors([]);
      } finally {
        setLoadingList(false);
      }
    },
    [postId, token],
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void loadReactors(filter);
  }, [open, filter, loadReactors]);

  if (!summary || summary.total <= 0) return null;

  const stack = summary.topTypes.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-xl px-1 py-2 text-left transition-colors hover:bg-muted/50 ${className}`}
        aria-label={`${summary.total} reactions — see who reacted`}
      >
        <span className="flex items-center -space-x-1.5">
          {stack.map((type) => (
            <span
              key={type}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-background"
            >
              <ReactionIcon type={type} size={20} staticImage />
            </span>
          ))}
        </span>
        <span className="text-sm font-bold tabular-nums text-foreground/90">
          {formatSocialCount(summary.total)}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {summary.total === 1 ? 'reaction' : 'reactions'} · see who
        </span>
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="Close reactions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] bg-black/50"
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="People who reacted"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    className="fixed inset-x-0 bottom-0 z-[91] max-h-[75dvh] overflow-hidden rounded-t-[20px] border-t border-border bg-background shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[min(70vh,520px)] md:w-[min(420px,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <h3 className="text-sm font-bold">Reactions</h3>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 no-scrollbar">
                      {FILTERS.map((f) => {
                        const count =
                          f.id === 'all' ? summary.total : summary.byType[f.id] || 0;
                        if (f.id !== 'all' && count <= 0) return null;
                        const active = filter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                              active
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {f.id !== 'all' ? (
                              <ReactionIcon type={f.id} size={16} staticImage />
                            ) : null}
                            {f.label}
                            <span className="tabular-nums opacity-80">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="max-h-[min(55dvh,380px)] overflow-y-auto px-2 py-2">
                      {loadingList ? (
                        <div className="space-y-2 p-2">
                          <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
                          <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
                        </div>
                      ) : reactors.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                          No reactions in this filter.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {reactors.map((row) => {
                            const u = row.user;
                            if (!u) return null;
                            const canVisit = !u.officialTeam && !!profilePathFor(u);
                            return (
                              <li key={row.id}>
                                <button
                                  type="button"
                                  disabled={!canVisit}
                                  onClick={() => openReactorProfile(u)}
                                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                                    canVisit
                                      ? 'cursor-pointer hover:bg-muted/60'
                                      : 'cursor-default opacity-90'
                                  }`}
                                  aria-label={
                                    canVisit
                                      ? `Open ${u.name || u.username || 'user'} profile`
                                      : undefined
                                  }
                                >
                                  <UserAvatar user={u} className="h-10 w-10 shrink-0 text-xs" />
                                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                                    {u.name || u.username || 'User'}
                                  </span>
                                  <ReactionIcon type={row.type} size={22} staticImage />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
