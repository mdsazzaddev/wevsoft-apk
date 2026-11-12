import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useStore } from '../../store';
import type { GifSearchResult } from '../social/GifPickerModal';

export function FieldSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-2xl bg-zinc-950/98 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl ring-1 ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-white">{title}</span>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1 text-white hover:bg-white/10">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function TextPromptSheet({
  title,
  placeholder,
  prefix,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  placeholder: string;
  prefix?: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState('');
  return (
    <FieldSheet title={title} onClose={onClose}>
      <div className="flex gap-2">
        {prefix ? <span className="flex h-11 items-center text-[18px] font-semibold text-white/70">{prefix}</span> : null}
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && v.trim()) onSubmit(v.trim());
          }}
          placeholder={placeholder}
          className="h-11 flex-1 rounded-xl bg-white/10 px-3 text-[15px] text-white outline-none ring-1 ring-white/15 placeholder:text-white/40"
        />
        <button
          type="button"
          disabled={!v.trim()}
          onClick={() => v.trim() && onSubmit(v.trim())}
          className="rounded-xl bg-sky-500 px-4 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </FieldSheet>
  );
}

export function CountdownSheet({
  onSubmit,
  onClose,
}: {
  onSubmit: (title: string, endsAt: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('Countdown');
  const defaultEnd = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDefault = `${defaultEnd.getFullYear()}-${pad(defaultEnd.getMonth() + 1)}-${pad(defaultEnd.getDate())}T${pad(defaultEnd.getHours())}:${pad(defaultEnd.getMinutes())}`;
  const [when, setWhen] = useState(localDefault);
  return (
    <FieldSheet title="Countdown" onClose={onClose}>
      <label className="mb-2 block text-[12px] text-white/60">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 h-11 w-full rounded-xl bg-white/10 px-3 text-[15px] text-white outline-none ring-1 ring-white/15"
      />
      <label className="mb-2 block text-[12px] text-white/60">Ends at</label>
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="mb-3 h-11 w-full rounded-xl bg-white/10 px-3 text-[15px] text-white outline-none ring-1 ring-white/15"
      />
      <button
        type="button"
        onClick={() => {
          const ends = new Date(when);
          if (!Number.isFinite(ends.getTime())) return;
          onSubmit(title.trim() || 'Countdown', ends.toISOString());
        }}
        className="w-full rounded-xl bg-sky-500 py-3 text-[14px] font-semibold text-white"
      >
        Add countdown
      </button>
    </FieldSheet>
  );
}

export function InlineGifSheet({
  onSelect,
  onClose,
}: {
  onSelect: (gif: { url: string; previewUrl?: string | null; title?: string }) => void;
  onClose: () => void;
}) {
  const token = useStore((s) => s.token);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GifSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams({ limit: '24' });
          if (q.trim()) params.set('q', q.trim());
          const res = await fetch(`/api/media-extras/gifs/search?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setResults([]);
            setError(data.error || data.code || 'GIF search unavailable');
            return;
          }
          setResults(Array.isArray(data.results) ? data.results : []);
        } catch {
          setResults([]);
          setError('GIF search failed');
        } finally {
          setLoading(false);
        }
      })();
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [token, q]);

  return (
    <FieldSheet title="GIF" onClose={onClose}>
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 ring-1 ring-white/15">
        <Search size={16} className="text-white/50" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Tenor"
          className="h-11 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/40"
        />
      </div>
      {error ? <p className="mb-2 text-[12px] text-amber-300">{error}</p> : null}
      {loading ? (
        <div className="flex justify-center py-8 text-white/50">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : (
        <div className="grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto">
          {results.map((g) => {
            const src = g.previewUrl || g.url;
            if (!src || !g.url) return null;
            return (
              <button
                key={g.id}
                type="button"
                className="aspect-square overflow-hidden rounded-lg bg-white/5"
                onClick={() => onSelect({ url: g.url!, previewUrl: g.previewUrl, title: g.title })}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      )}
    </FieldSheet>
  );
}
