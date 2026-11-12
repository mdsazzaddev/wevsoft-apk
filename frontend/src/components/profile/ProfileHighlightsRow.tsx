import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export type ProfileHighlight = {
  id: string;
  title: string;
  coverUrl?: string | null;
};

type Props = {
  userId: string;
  isOwner: boolean;
  token?: string | null;
  /** When false, hide the whole row (e.g. privacy / locked). */
  visible?: boolean;
  /** Render as a compact titled sidebar card (profile left column). */
  card?: boolean;
};

export default function ProfileHighlightsRow({
  userId,
  isOwner,
  token,
  visible = true,
  card = false,
}: Props) {
  const [items, setItems] = useState<ProfileHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!visible || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/highlights/${encodeURIComponent(userId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : Array.isArray(data?.highlights) ? data.highlights : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, token, visible]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
  }, [load]);

  const createHighlight = async () => {
    if (!token || !isOwner) return;
    const title = window.prompt('Highlight title');
    if (!title?.trim()) return;
    try {
      const res = await fetch('/api/stories/highlights', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Could not create highlight');
        return;
      }
      toast.success('Highlight created');
      load();
    } catch {
      toast.error('Network error');
    }
  };

  const removeHighlight = async (id: string) => {
    if (!token || !isOwner) return;
    if (!window.confirm('Delete this highlight?')) return;
    try {
      const res = await fetch(`/api/stories/highlights/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Could not delete');
        return;
      }
      setItems((prev) => prev.filter((h) => h.id !== id));
    } catch {
      toast.error('Network error');
    }
  };

  const manageHighlight = async (highlight: ProfileHighlight) => {
    if (!token || !isOwner) return;
    const title = window.prompt(
      'Rename highlight (clear the title to delete it)',
      highlight.title,
    );
    if (title === null || title.trim() === highlight.title) return;
    if (!title.trim()) {
      await removeHighlight(highlight.id);
      return;
    }
    try {
      const res = await fetch(`/api/stories/highlights/${encodeURIComponent(highlight.id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Could not update highlight');
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === highlight.id ? { ...item, title: title.trim() } : item,
        ),
      );
    } catch {
      toast.error('Network error');
    }
  };

  // Only saved highlights are shown - no empty placeholder row, for anyone.
  // (Stories themselves live on Home; the profile is not a story surface.)
  if (card) {
    // Sidebar card: hidden for visitors when empty; the owner gets an empty state with "New".
    if (!visible || loading || (items.length === 0 && !isOwner)) return null;
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3" data-highlights-card>
        <h2 className="text-sm font-semibold text-foreground mb-2">Highlights</h2>
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground mb-2">Keep your favourite stories on your profile.</p>
        )}
        <div className="grid grid-cols-4 gap-2" role="list" aria-label="Story highlights">
          {items.map((h) => (
            <button
              key={h.id}
              type="button"
              role="listitem"
              onClick={() => {
                if (isOwner) void manageHighlight(h);
              }}
              className="group flex flex-col items-center gap-1 min-w-0"
              title={isOwner ? `${h.title} - tap to rename or delete` : h.title}
            >
              <span className="w-[52px] h-[52px] rounded-full p-[1.5px] bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-amber-400 transition-transform group-active:scale-95">
                <span className="block w-full h-full rounded-full overflow-hidden border-[2.5px] border-card bg-muted">
                  {h.coverUrl ? (
                    <img src={h.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[13px] font-bold text-violet-600 dark:text-violet-300 bg-violet-500/10">
                      {h.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-[11px] leading-tight font-medium text-foreground/80 truncate w-full text-center">{h.title}</span>
            </button>
          ))}
          {isOwner && (
            <button type="button" onClick={createHighlight} aria-label="New highlight" title="New highlight" className="flex flex-col items-center gap-1 min-w-0">
              <span className="w-[52px] h-[52px] rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
                <Plus size={16} strokeWidth={2.25} />
              </span>
              <span className="text-[11px] leading-tight font-medium text-muted-foreground">New</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!visible || loading || items.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 mt-3" data-highlights-row>
      <div
        className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5 snap-x"
        role="list"
        aria-label="Story highlights"
      >
        {items.map((h) => (
          <button
            key={h.id}
            type="button"
            role="listitem"
            onClick={() => {
              if (isOwner) void manageHighlight(h);
            }}
            className="group flex flex-col items-center gap-1 shrink-0 w-[58px] sm:w-[66px] snap-start"
            title={isOwner ? `${h.title} - tap to rename or delete` : h.title}
          >
            <span className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full p-[1.5px] bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-amber-400 transition-transform group-active:scale-95">
              <span className="block w-full h-full rounded-full overflow-hidden border-[2.5px] border-background bg-muted">
                {h.coverUrl ? (
                  <img src={h.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-[13px] font-bold text-violet-600 dark:text-violet-300 bg-violet-500/10">
                    {h.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
            <span className="text-[11px] sm:text-[11px] leading-tight font-medium text-foreground/80 truncate w-full text-center">
              {h.title}
            </span>
          </button>
        ))}
        {isOwner && (
          <button
            type="button"
            onClick={createHighlight}
            aria-label="New highlight"
            title="New highlight"
            className="flex flex-col items-center gap-1 shrink-0 w-[58px] sm:w-[66px]"
          >
            <span className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
              <Plus size={16} strokeWidth={2.25} />
            </span>
            <span className="text-[11px] sm:text-[11px] leading-tight font-medium text-muted-foreground">New</span>
          </button>
        )}
      </div>
    </div>
  );
}