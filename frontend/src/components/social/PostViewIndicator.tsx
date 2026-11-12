import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatCompactViews } from '../../lib/postViewTracker';
import { useStore } from '../../store';
import { useOverlayBack } from '../../hooks/useOverlayBack';

type Props = {
  postId: string;
  viewCount?: number | null;
  /** Owner (or space analytics) may open the details panel. */
  canOpenDetails?: boolean;
  /** When true (post viewCountVisibility=hidden), hide the eye entirely. */
  hidden?: boolean;
  className?: string;
};

/**
 * Compact view indicator for the post action bar — not a Like button.
 * Always shows Eye + count (defaults to 0) so viewers can see reach.
 * Click opens details only when the viewer has permission.
 */
export default function PostViewIndicator({
  postId,
  viewCount,
  canOpenDetails = false,
  hidden = false,
  className = '',
}: Props) {
  const token = useStore((s) => s.token);
  const [count, setCount] = useState<number>(
    typeof viewCount === 'number' ? Math.max(0, viewCount) : 0,
  );
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (typeof viewCount === 'number') setCount(Math.max(0, viewCount));
  }, [viewCount]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId === postId && typeof detail.views === 'number') {
        setCount(Math.max(0, detail.views));
      }
    };
    window.addEventListener('wev:post-view-count', handler);
    return () => window.removeEventListener('wev:post-view-count', handler);
  }, [postId]);

  useOverlayBack(open, () => setOpen(false));

  if (hidden) return null;

  const openDetails = async () => {
    if (!canOpenDetails || !token) return;
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/view-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDetails(await res.json());
      else setDetails(null);
    } catch {
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const label = formatCompactViews(count);
  const body = (
    <>
      <Eye size={20} strokeWidth={2.35} className="shrink-0" aria-hidden />
      <span className="tabular-nums font-extrabold">{label}</span>
    </>
  );

  return (
    <>
      {canOpenDetails ? (
        <button
          type="button"
          onClick={() => void openDetails()}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold text-foreground/85 hover:text-foreground ${className}`}
          aria-label={`${count.toLocaleString()} views`}
          title="View details"
        >
          {body}
        </button>
      ) : (
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold text-foreground/85 pointer-events-none select-none ${className}`}
          aria-label={`${count.toLocaleString()} views`}
        >
          {body}
        </span>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] bg-black/50"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Post Views"
                  initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
                  animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                  exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className={
                    isMobile
                      ? 'fixed inset-x-0 bottom-0 z-[81] max-h-[70dvh] overflow-y-auto rounded-t-[20px] border-t border-border bg-background shadow-2xl'
                      : 'fixed left-1/2 top-1/2 z-[81] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'
                  }
                >
                  <ViewDetailsPanel
                    loading={loading}
                    details={details}
                    fallbackCount={count}
                    onClose={() => setOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function ViewDetailsPanel({
  loading,
  details,
  fallbackCount,
  onClose,
}: {
  loading: boolean;
  details: any;
  fallbackCount: number;
  onClose: () => void;
}) {
  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Post Views</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-10 animate-pulse rounded-xl bg-muted/60" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total views" value={(details?.totalViews ?? fallbackCount).toLocaleString()} />
            <Stat label="Unique viewers" value={(details?.uniqueViewers ?? 0).toLocaleString()} />
          </div>
          {Array.isArray(details?.recent) && details.recent.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent activity
              </p>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {details.recent.map((row: any) => (
                  <li key={row.id} className="flex items-center gap-2 text-sm">
                    {row.user ? (
                      <>
                        {row.user.avatar ? (
                          <img src={row.user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {(row.user.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate font-medium">{row.user.name || row.user.username}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Anonymous viewer</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Individual viewer identities are hidden. Aggregate counts stay available to you.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
