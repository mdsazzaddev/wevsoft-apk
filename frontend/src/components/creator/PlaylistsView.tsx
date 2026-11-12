import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListVideo, Plus, Trash2, Pencil, Loader2, Film, FileVideo, Search, X,
  ChevronLeft, Lock, Globe, Users, GripVertical, ArrowUp, ArrowDown, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type Privacy = 'public' | 'friends' | 'private';
type ItemType = 'reel' | 'post';

interface PlaylistSummary {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  privacy: Privacy;
  itemCount: number;
  updatedAt: string;
}

interface PlaylistItem {
  id: string;
  itemType: ItemType;
  itemId: string;
  sortOrder: number;
  title: string;
  thumb: string | null;
  views: number;
  likes: number;
  durationSec: number | null;
  href: string;
}

interface PlaylistDetail extends PlaylistSummary {
  items: PlaylistItem[];
}

interface Eligible {
  itemType: ItemType;
  itemId: string;
  title: string;
  thumb: string | null;
  views: number;
  likes: number;
  durationSec: number | null;
  createdAt: string;
}

const PRIVACY_META: Record<Privacy, { label: string; icon: React.ElementType }> = {
  public: { label: 'Public', icon: Globe },
  friends: { label: 'Friends', icon: Users },
  private: { label: 'Private', icon: Lock },
};

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

export function PlaylistsView() {
  const token = useStore((s) => s.token);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [saving, setSaving] = useState(false);

  const [eligible, setEligible] = useState<{ reels: Eligible[]; posts: Eligible[] }>({ reels: [], posts: [] });
  const [eligibleQ, setEligibleQ] = useState('');
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/playlists', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load playlists');
      setPlaylists(data.playlists || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  const loadDetail = useCallback(async (id: string) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${id}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load playlist');
      setDetail(data.playlist);
      setSelectedId(id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load playlist');
    } finally {
      setDetailLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void loadList();
  }, [loadList]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setPrivacy('public');
    setCreateOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setName(detail.name);
    setDescription(detail.description || '');
    setPrivacy(detail.privacy);
    setEditOpen(true);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/playlists', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, description, privacy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Create failed');
      toast.success('Playlist created');
      setCreateOpen(false);
      await loadList();
      if (data.playlist?.id) await loadDetail(data.playlist.id);
    } catch (e: any) {
      toast.error(e.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${detail.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name, description, privacy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      toast.success('Playlist updated');
      setEditOpen(false);
      await loadList();
      await loadDetail(detail.id);
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const removePlaylist = async () => {
    if (!detail) return;
    if (!window.confirm(`Delete “${detail.name}”? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${detail.id}`, { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Playlist deleted');
      setDetail(null);
      setSelectedId(null);
      await loadList();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const loadEligible = useCallback(async (q = '') => {
    if (!token) return;
    setEligibleLoading(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/eligible-content?q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load content');
      setEligible({ reels: data.reels || [], posts: data.posts || [] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to load content');
    } finally {
      setEligibleLoading(false);
    }
  }, [token, headers]);

  const openAdd = async () => {
    setAddOpen(true);
    setEligibleQ('');
    await loadEligible();
  };

  const addItem = async (item: Eligible) => {
    if (!detail) return;
    const key = `${item.itemType}:${item.itemId}`;
    setAddingKey(key);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${detail.id}/items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemType: item.itemType, itemId: item.itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setDetail(data.playlist);
      toast.success('Added to playlist');
      await loadList();
    } catch (e: any) {
      toast.error(e.message || 'Add failed');
    } finally {
      setAddingKey(null);
    }
  };

  const removeItem = async (itemRowId: string) => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${detail.id}/items/${itemRowId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Remove failed');
      setDetail(data.playlist);
      await loadList();
    } catch (e: any) {
      toast.error(e.message || 'Remove failed');
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    if (!detail?.items) return;
    const next = [...detail.items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setDetail({ ...detail, items: next });
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/playlists/${detail.id}/items/reorder`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reorder failed');
      setDetail(data.playlist);
    } catch (e: any) {
      toast.error(e.message || 'Reorder failed');
      await loadDetail(detail.id);
    }
  };

  const inPlaylist = useMemo(() => {
    const s = new Set<string>();
    detail?.items?.forEach((i) => s.add(`${i.itemType}:${i.itemId}`));
    return s;
  }, [detail]);

  if (selectedId && detail) {
    const PrivIcon = PRIVACY_META[detail.privacy]?.icon || Globe;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => { setSelectedId(null); setDetail(null); void loadList(); }}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-surface-hover"
              aria-label="Back to playlists"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">{detail.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><PrivIcon className="h-3.5 w-3.5" />{PRIVACY_META[detail.privacy]?.label}</span>
                <span>·</span>
                <span>{detail.items?.length || 0} items</span>
              </p>
              {detail.description && <p className="mt-1 text-[13px] text-muted-foreground">{detail.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openAdd} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add content
            </button>
            <button type="button" onClick={openEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold hover:bg-surface-hover">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button type="button" onClick={removePlaylist} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !(detail.items?.length) ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">No content yet.</span> Add Reels or video posts to build this playlist.</p>
            <button type="button" onClick={openAdd} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Add content
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {detail.items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 sm:gap-3">
                <span className="hidden text-muted-foreground sm:block"><GripVertical className="h-4 w-4" /></span>
                <span className="w-6 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.thumb ? <img src={item.thumb} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-muted-foreground"><Film className="h-4 w-4" /></span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.itemType === 'reel' ? 'Reel' : 'Video post'}
                    {item.views ? ` · ${fmt(item.views)} views` : ''}
                    {item.durationSec != null ? ` · ${Math.round(item.durationSec)}s` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => void moveItem(i, -1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={i === detail.items.length - 1} onClick={() => void moveItem(i, 1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => void removeItem(item.id)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(editOpen || createOpen) && null}
        {editOpen && (
          <PlaylistFormModal
            title="Edit playlist"
            name={name}
            description={description}
            privacy={privacy}
            saving={saving}
            onName={setName}
            onDescription={setDescription}
            onPrivacy={setPrivacy}
            onClose={() => setEditOpen(false)}
            onSubmit={submitEdit}
          />
        )}
        {addOpen && (
          <AddContentModal
            q={eligibleQ}
            onQ={setEligibleQ}
            loading={eligibleLoading}
            eligible={eligible}
            inPlaylist={inPlaylist}
            addingKey={addingKey}
            onAdd={addItem}
            onClose={() => setAddOpen(false)}
            onRefresh={() => void loadEligible(eligibleQ)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Playlists</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Group Reels and video posts into ordered collections — like Facebook Professional Dashboard playlists.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadList()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold hover:bg-surface-hover">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New playlist
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button type="button" className="font-semibold" onClick={() => void loadList()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : playlists.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">No playlists yet.</span> Create a playlist to organize your best Reels into a shareable collection.</p>
          <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Create playlist
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((p) => {
            const PrivIcon = PRIVACY_META[p.privacy]?.icon || Globe;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void loadDetail(p.id)}
                className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-primary/40"
              >
                <div className="aspect-[16/9] bg-muted">
                  {p.coverUrl ? (
                    <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground"><ListVideo className="h-10 w-10" /></div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="truncate text-[14px] font-bold text-foreground">{p.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><PrivIcon className="h-3 w-3" />{PRIVACY_META[p.privacy]?.label}</span>
                    <span>·</span>
                    <span>{p.itemCount} item{p.itemCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {createOpen && (
        <PlaylistFormModal
          title="New playlist"
          name={name}
          description={description}
          privacy={privacy}
          saving={saving}
          onName={setName}
          onDescription={setDescription}
          onPrivacy={setPrivacy}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCreate}
        />
      )}
    </div>
  );
}

function PlaylistFormModal(props: {
  title: string;
  name: string;
  description: string;
  privacy: Privacy;
  saving: boolean;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onPrivacy: (v: Privacy) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={props.onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{props.title}</h3>
          <button type="button" onClick={props.onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-hover"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-[12px] font-semibold text-muted-foreground">Name</label>
        <input
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Best of 2026"
          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/40"
        />
        <label className="mt-3 block text-[12px] font-semibold text-muted-foreground">Description (optional)</label>
        <textarea
          value={props.description}
          onChange={(e) => props.onDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
        />
        <label className="mt-3 block text-[12px] font-semibold text-muted-foreground">Privacy</label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {(['public', 'friends', 'private'] as Privacy[]).map((p) => {
            const Icon = PRIVACY_META[p].icon;
            return (
              <button
                key={p}
                type="button"
                onClick={() => props.onPrivacy(p)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold ${
                  props.privacy === p ? 'border-border bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />{PRIVACY_META[p].label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={props.saving || !props.name.trim()}
          onClick={props.onSubmit}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {props.saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

function AddContentModal(props: {
  q: string;
  onQ: (v: string) => void;
  loading: boolean;
  eligible: { reels: Eligible[]; posts: Eligible[] };
  inPlaylist: Set<string>;
  addingKey: string | null;
  onAdd: (item: Eligible) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const all = [...props.eligible.reels, ...props.eligible.posts];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={props.onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[15px] font-bold">Add to playlist</h3>
          <button type="button" onClick={props.onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-hover"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2 border-b border-border px-4 py-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={props.q}
              onChange={(e) => props.onQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') props.onRefresh(); }}
              placeholder="Search your Reels & videos…"
              className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-sm outline-none focus:border-primary/40 dark:bg-background"
            />
          </div>
          <button type="button" onClick={props.onRefresh} className="grid h-9 w-9 place-items-center rounded-lg border border-border" aria-label="Search"><Search className="h-3.5 w-3.5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {props.loading ? (
            <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : all.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No eligible Reels or video posts found.</p>
          ) : (
            <ul className="space-y-1">
              {all.map((item) => {
                const key = `${item.itemType}:${item.itemId}`;
                const added = props.inPlaylist.has(key);
                return (
                  <li key={key} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-hover">
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.thumb ? <img src={item.thumb} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-muted-foreground">{item.itemType === 'reel' ? <Film className="h-4 w-4" /> : <FileVideo className="h-4 w-4" />}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground">{item.itemType === 'reel' ? 'Reel' : 'Video post'}{item.views ? ` · ${fmt(item.views)} views` : ''}</div>
                    </div>
                    <button
                      type="button"
                      disabled={added || props.addingKey === key}
                      onClick={() => props.onAdd(item)}
                      className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {props.addingKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : added ? 'Added' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
