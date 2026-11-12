import React, { useEffect, useState } from 'react';
import { ListMusic, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type Playlist = {
  id: string;
  name: string;
  privacy: string;
  itemCount?: number;
};

/** Minimal playlists manager for Settings / profile music area. */
export default function MusicPlaylistsPanel() {
  const token = useStore((s) => s.token);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/music/playlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [token]);

  const create = async () => {
    if (!token || !name.trim()) return;
    try {
      const res = await fetch('/api/music/playlists', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), privacy: 'private' }),
      });
      if (!res.ok) throw new Error('Failed');
      setName('');
      toast.success('Playlist created');
      await load();
    } catch {
      toast.error('Could not create playlist');
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/music/playlists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      toast.error('Could not delete');
    }
  };

  if (!token) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <ListMusic size={16} className="text-cyan-500" />
        <h3 className="text-sm font-bold">My playlists</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 120))}
          placeholder="New playlist name"
          className="flex-1 text-sm rounded-xl border border-border bg-muted/30 px-3 py-2"
        />
        <button
          type="button"
          onClick={create}
          className="px-3 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : playlists.length === 0 ? (
        <p className="text-xs text-muted-foreground">No playlists yet.</p>
      ) : (
        <ul className="space-y-1">
          {playlists.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2 px-2 rounded-xl hover:bg-muted/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.privacy} · {p.itemCount ?? 0} tracks
                </p>
              </div>
              <button type="button" onClick={() => remove(p.id)} className="p-1.5 text-muted-foreground hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
