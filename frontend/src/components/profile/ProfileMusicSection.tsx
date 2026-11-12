import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type Track = {
  id: string;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl: string;
  duration?: number;
};

type Props = {
  userId: string;
  isOwner?: boolean;
};

export default function ProfileMusicSection({ userId, isOwner }: Props) {
  const token = useStore((s) => s.token);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`/api/profile/music?userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTrack(data.track || null);
    } catch {
      /* ignore */
    }
  }, [token, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlay = () => {
    if (!track?.audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audioUrl);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      if (audioRef.current.src !== track.audioUrl) audioRef.current.src = track.audioUrl;
      void audioRef.current.play().then(() => setPlaying(true)).catch(() => toast.error('Could not play'));
      if (token) {
        void fetch(`/api/music/${track.id}/play`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    }
  };

  const search = async (q: string) => {
    setQuery(q);
    if (!token || q.trim().length < 1) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/music?tab=trending&q=${encodeURIComponent(q)}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setResults(Array.isArray(data.tracks) ? data.tracks : []);
    } catch {
      setResults([]);
    }
  };

  const setFeatured = async (musicId: string | null) => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile/music', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTrack(data.track || null);
      setPickerOpen(false);
      toast.success(musicId ? 'Profile music updated' : 'Profile music cleared');
    } catch {
      toast.error('Could not update music');
    }
  };

  if (!track && !isOwner) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Music2 size={16} className="text-cyan-500" />
          <h3 className="text-sm font-bold text-foreground">Featured music</h3>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-semibold text-cyan-600 hover:underline"
          >
            {track ? 'Change' : 'Add'}
          </button>
        )}
      </div>

      {track ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
            {track.coverImage ? (
              <img src={track.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={18} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{track.title}</p>
            {track.artist && <p className="text-xs text-muted-foreground truncate">{track.artist}</p>}
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center shrink-0"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No featured track yet.</p>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setPickerOpen(false)} />
          <div className="relative w-full max-w-md mx-3 mb-6 sm:mb-0 rounded-2xl bg-card border border-border shadow-xl p-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Choose featured music</h3>
              <button type="button" onClick={() => setPickerOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => void search(e.target.value)}
                placeholder="Search library…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-muted/30"
              />
            </div>
            <div className="overflow-y-auto space-y-1 flex-1">
              {track && (
                <button
                  type="button"
                  onClick={() => setFeatured(null)}
                  className="w-full text-left text-xs text-red-500 py-2 px-2 hover:bg-muted rounded-lg"
                >
                  Remove featured music
                </button>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeatured(t.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {t.coverImage ? <img src={t.coverImage} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                </button>
              ))}
              {!results.length && query && (
                <p className="text-xs text-muted-foreground text-center py-6">No tracks found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
