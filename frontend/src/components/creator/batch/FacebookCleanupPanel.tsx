/**
 * Space Batch → Cleanup: list Facebook Page posts and bulk-delete (cap 50).
 * API: GET/POST /api/social/facebook/:connectionId/posts|bulk-delete
 */
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../../../store';
import { ConnectPlatformsModal } from '../../contentAnalyze/SocialDestinations';
import { useSocialConnections, type SocialConnection } from '../../../lib/socialConnections';

type FbPost = {
  id: string;
  message: string;
  createdTime: string | null;
  permalink: string | null;
  type: string | null;
};

export default function FacebookCleanupPanel() {
  const token = useStore((s: any) => s.token) as string | null;
  const social = useSocialConnections(token);
  const pages = useMemo(
    () => social.usable.filter((c) => c.platform === 'facebook'),
    [social.usable],
  );
  const [connectionId, setConnectionId] = useState<string>('');
  const [q, setQ] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [posts, setPosts] = useState<FbPost[]>([]);
  const [maxDelete, setMaxDelete] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  // Keep the picked page valid: default to the first page, fall back when it disappears.
  const validConnectionId = !connectionId
    ? (pages[0]?.id ?? '')
    : pages.some((p) => p.id === connectionId) ? connectionId : (pages[0]?.id || '');
  if (validConnectionId !== connectionId) setConnectionId(validConnectionId);

  const load = useCallback(async () => {
    if (!token || !connectionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (q.trim()) params.set('q', q.trim());
      if (since) params.set('since', new Date(since).toISOString());
      if (until) params.set('until', new Date(until).toISOString());
      const res = await fetch(`/api/social/facebook/${encodeURIComponent(connectionId)}/posts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Load failed (${res.status})`);
      setPosts(Array.isArray(body.posts) ? body.posts : []);
      setMaxDelete(Number(body.maxDelete) || 50);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || 'Could not load Page posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [token, connectionId, q, since, until]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxDelete) next.add(id);
      else toast.error(`You can delete at most ${maxDelete} posts at once`);
      return next;
    });
  };

  const selectVisible = () => {
    setSelected(new Set(posts.slice(0, maxDelete).map((p) => p.id)));
  };

  const remove = async () => {
    if (!token || !connectionId || !selected.size) return;
    const page = pages.find((p) => p.id === connectionId);
    if (!window.confirm(`Delete ${selected.size} post${selected.size === 1 ? '' : 's'} from ${page?.name || 'this Page'}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/social/facebook/${encodeURIComponent(connectionId)}/bulk-delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: [...selected] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Delete failed (${res.status})`);
      const deleted = Number(body.deleted) || 0;
      const failed = Number(body.failed) || 0;
      if (deleted) toast.success(`Deleted ${deleted} post${deleted === 1 ? '' : 's'}`);
      if (failed) toast.error(`${failed} could not be deleted`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const pageLabel = (c: SocialConnection) => c.name || c.username || c.externalId;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Facebook Cleanup</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Load recent posts from a connected Page, filter by keyword or date, then delete up to {maxDelete} at a time.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[180px] flex-1 text-[11px] font-medium text-muted-foreground">
            Page
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[13px] text-foreground"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              disabled={!pages.length}
            >
              {!pages.length && <option value="">No Facebook Page connected</option>}
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{pageLabel(p)}</option>
              ))}
            </select>
          </label>
          <label className="min-w-[140px] flex-1 text-[11px] font-medium text-muted-foreground">
            Keyword
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[13px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Contains…"
            />
          </label>
          <label className="text-[11px] font-medium text-muted-foreground">
            From
            <input type="date" className="mt-1 block rounded-lg border border-border bg-background px-2.5 py-2 text-[13px]" value={since} onChange={(e) => setSince(e.target.value)} />
          </label>
          <label className="text-[11px] font-medium text-muted-foreground">
            To
            <input type="date" className="mt-1 block rounded-lg border border-border bg-background px-2.5 py-2 text-[13px]" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={!connectionId || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load posts
          </button>
          {!pages.length && (
            <button type="button" onClick={() => setConnectOpen(true)} className="h-9 rounded-lg border border-border px-3 text-[12.5px] font-semibold">
              Connect Page
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectVisible} disabled={!posts.length} className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40">
          Select visible
        </button>
        <button type="button" onClick={() => setSelected(new Set())} disabled={!selected.size} className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40">
          Clear
        </button>
        <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={!selected.size || deleting}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete selected
        </button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {!posts.length && !loading && (
          <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            {connectionId ? 'Load posts to review what is on this Page.' : 'Connect a Facebook Page first.'}
          </li>
        )}
        {posts.map((p) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-rose-600"
                checked={on}
                onChange={() => toggle(p.id)}
                aria-label={`Select post ${p.id}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-foreground whitespace-pre-wrap break-words">{p.message || '(no text)'}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.createdTime ? new Date(p.createdTime).toLocaleString() : 'Unknown time'}
                  {p.type ? ` · ${p.type}` : ''}
                </p>
              </div>
              {p.permalink && (
                <a href={p.permalink} target="_blank" rel="noreferrer" className="mt-1 text-muted-foreground hover:text-primary" title="Open on Facebook">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {connectOpen && (
        <ConnectPlatformsModal
          token={token}
          connections={social.connections}
          platforms={social.platforms}
          onClose={() => setConnectOpen(false)}
          reload={social.reload}
        />
      )}
    </div>
  );
}
