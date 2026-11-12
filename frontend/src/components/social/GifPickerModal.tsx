import React, { useEffect, useRef, useState } from 'react';
import { Film, Loader2, Search, X } from 'lucide-react';
import { useStore } from '../../store';

export interface GifSearchResult {
  id: string;
  title: string;
  previewUrl: string | null;
  url: string | null;
  width?: number | null;
  height?: number | null;
}

interface GifPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: { url: string; previewUrl?: string | null; title?: string }) => void;
}

export default function GifPickerModal({ open, onClose, onSelect }: GifPickerModalProps) {
  const token = useStore((s) => s.token);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GifSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setQ('');
    setError(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
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
            setError(data.error || data.code || 'GIF search failed');
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
  }, [open, token, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[min(80dvh,640px)] bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Film size={18} className="text-fuchsia-400 shrink-0" />
            <h3 className="font-bold text-sm truncate">GIF</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border/60 px-3 py-2">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search GIFs…"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/70"
            />
            {loading ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error ? (
            <p className="text-center text-xs text-rose-500 font-semibold py-8 px-4">{error}</p>
          ) : null}
          {!error && !loading && results.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No GIFs found</p>
          ) : null}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {results.map((g) => {
              const src = g.previewUrl || g.url;
              if (!src || !g.url) return null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onSelect({ url: g.url!, previewUrl: g.previewUrl, title: g.title });
                    onClose();
                  }}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted/40 hover:ring-2 hover:ring-primary/60 transition-all"
                  title={g.title || 'GIF'}
                >
                  <img src={src} alt={g.title || ''} className="w-full h-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
