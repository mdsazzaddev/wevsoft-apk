import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { useStore } from '../../store';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { useValueChanged } from '../../hooks/useValueChanged';

type Result = {
  kind: string;
  id: string;
  content?: string | null;
  caption?: string | null;
  description?: string | null;
  title?: string | null;
  createdAt?: string;
};

export default function ProfileContentSearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useOverlayBack(open, onClose);
  const token = useStore((s) => s.token);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Closing → clear the search (adjusted during render).
  const openChanged = useValueChanged(open);
  if (openChanged && !open) {
    setQ('');
    setResults([]);
    setError(null);
  }

  const searchActive = open && !!token && q.trim().length >= 1;
  if (!searchActive && results.length > 0) setResults([]);

  useEffect(() => {
    if (!searchActive) return;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/profile/content-search?q=${encodeURIComponent(q.trim())}&type=${encodeURIComponent(type)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Search failed');
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (e: any) {
        setError(e?.message || 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [open, token, q, type]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[92] bg-black/45" role="dialog" aria-modal="true" aria-label="Search your profile">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto w-full max-w-lg rounded-b-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Search size={18} className="text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your posts, reels, highlights…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {['all', 'posts', 'photos', 'videos', 'reels', 'highlights'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                type === t ? 'bg-foreground text-background' : 'bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="max-h-[50dvh] overflow-y-auto px-3 pb-4">
          {loading && <Loader2 className="mx-auto my-4 animate-spin text-muted-foreground" />}
          {error && <p className="py-3 text-sm text-destructive">{error}</p>}
          {!loading && !error && q.trim() && !results.length && (
            <p className="py-3 text-sm text-muted-foreground">No matches on your profile.</p>
          )}
          <ul className="space-y-1">
            {results.map((r) => {
              const text =
                r.title || r.caption || r.description || r.content || r.kind;
              const href =
                r.kind === 'reel'
                  ? `/reels/${r.id}`
                  : r.kind === 'highlight'
                    ? `/profile?tab=highlights`
                    : `/posts/${r.id}`;
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <Link
                    to={href}
                    onClick={onClose}
                    className="block rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {r.kind}
                    </span>
                    <span className="block text-sm line-clamp-2">{text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
