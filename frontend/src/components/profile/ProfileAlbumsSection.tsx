import React, { useEffect, useState } from 'react';
import { Folder, Plus, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useStore } from '../../store';

type AlbumRow = {
  id: string;
  name: string;
  description?: string | null;
  privacy: string;
  coverUrl?: string | null;
  mediaCount?: number;
  media?: { id: string; path: string; type: string }[];
};

type Props = {
  /** When set, loads public albums for that user (viewer). When omitted, loads own albums. */
  userId?: string;
  canManage?: boolean;
  accent?: string;
};

export default function ProfileAlbumsSection({ userId, canManage = false, accent }: Props) {
  const token = useStore((s) => s.token);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState('friends');
  const [creating, setCreating] = useState(false);
  const [openAlbum, setOpenAlbum] = useState<AlbumRow | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const load = async () => {
    setLoading(true);
    try {
      const url = userId && !canManage
        ? `/api/albums/user/${encodeURIComponent(userId)}`
        : '/api/albums';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load albums');
      const data = await res.json();
      setAlbums(Array.isArray(data.albums) ? data.albums : []);
    } catch {
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
     
  }, [userId, canManage, token]);

  const createAlbum = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Album name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed, privacy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create album');
      setShowCreate(false);
      setName('');
      setPrivacy('friends');
      toast.success('Album created');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create album');
    } finally {
      setCreating(false);
    }
  };

  const openAlbumDetail = async (album: AlbumRow) => {
    try {
      const res = await fetch(`/api/albums/${encodeURIComponent(album.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Could not open album');
      const data = await res.json();
      setOpenAlbum(data.album || album);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not open album');
    }
  };

  const slides = (openAlbum?.media || [])
    .filter((m) => m.type === 'image' || /\.(jpe?g|png|gif|webp)$/i.test(m.path))
    .map((m) => ({ src: m.path }));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Folder size={16} style={accent ? { color: accent } : undefined} className="text-muted-foreground shrink-0" />
          <h4 className="text-sm font-bold text-foreground">Albums</h4>
          {!loading && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {albums.length}
            </span>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground"
          >
            <Plus size={14} />
            New
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4">Loading albums…</p>
      ) : albums.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          {canManage ? 'No albums yet. Create one to organize photos.' : 'No albums to show.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-2">
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => openAlbumDetail(album)}
              className="text-left rounded-2xl overflow-hidden border border-border bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <div className="aspect-square bg-muted relative">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                    <ImageIcon size={28} />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-foreground truncate">{album.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {album.mediaCount ?? 0} · {album.privacy}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-card border border-border p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">New album</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Album name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mb-3 outline-none focus:border-primary"
              maxLength={120}
            />
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mb-4 outline-none"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Only me</option>
            </select>
            <button
              type="button"
              disabled={creating}
              onClick={createAlbum}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create album'}
            </button>
          </div>
        </div>
      )}

      {openAlbum && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-border p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{openAlbum.name}</h3>
                {openAlbum.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{openAlbum.description}</p>
                )}
              </div>
              <button type="button" onClick={() => setOpenAlbum(null)} className="p-1.5 rounded-full hover:bg-muted shrink-0">
                <X size={16} />
              </button>
            </div>
            {!openAlbum.media?.length ? (
              <p className="text-xs text-muted-foreground py-8 text-center">This album is empty.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {openAlbum.media.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    <img src={m.path} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
      />
    </div>
  );
}
