import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, CalendarClock, ChevronLeft, ChevronRight, Download, Loader2, PenLine, RotateCcw, Send, Trash2, X, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsTr } from '../../i18n/settingsBn';
import { creatorHubPath } from '../../lib/creatorHub';

/* Settings > Posts & Content: real lists for drafts, scheduled posts and the archive. */

/** PostComposer picks this up on the feed and opens the draft. */
export const OPEN_DRAFT_KEY = 'wev:openDraft';

function api(token: string) {
  return async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
    return j as T;
  };
}
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
const btn = 'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-50';
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
const Spinner = () => <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
const clip = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);

type Draft = { clientDraftId: string; status: string; content?: string | null; editState?: any; errorMessage?: string | null; updatedAt: string };

export function DraftsPanel({ token, onOpen }: { token: string; onOpen: (clientDraftId: string) => void }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [items, setItems] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => call<{ drafts: Draft[] }>('/api/post-drafts?limit=50')
    .then((j) => setItems((j.drafts || []).filter((d) => d.status === 'draft' || d.status === 'failed')))
    .catch((e) => { setItems([]); toast.error(e.message); }), [token]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id: string) => {
    if (!window.confirm(tr('Delete this draft?'))) return;
    setBusy(id);
    try { await call(`/api/post-drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }); toast.success(tr('Draft deleted')); load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const publish = async (id: string) => {
    setBusy(id);
    try { const r = await call(`/api/post-drafts/${encodeURIComponent(id)}/publish`, { method: 'POST' }); toast.success(tr(r?.status === 'publishing' ? 'Publishing…' : 'Published')); load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  if (!items) return <Spinner />;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{tr('Saved drafts')}: {items.length}</p>
      {!items.length ? <Empty>{tr('No saved drafts.')}</Empty> : (
        <ul className="divide-y divide-border/60">
          {items.map((d) => (
            <li key={d.clientDraftId} className="py-2.5 flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[10rem]">
                <p className="text-sm truncate">{clip(d.content ?? d.editState?.content) || tr('Draft with media')}</p>
                <p className="text-xs text-muted-foreground">{d.status === 'failed' ? `${tr('Publish failed')}${d.errorMessage ? `: ${d.errorMessage}` : ''}` : `${tr('Saved')} ${when(d.updatedAt)}`}</p>
              </div>
              <button type="button" className={btn} onClick={() => onOpen(d.clientDraftId)}><PenLine className="w-3.5 h-3.5" />{tr('Open')}</button>
              <button type="button" className={btn} disabled={busy === d.clientDraftId} onClick={() => publish(d.clientDraftId)}><Send className="w-3.5 h-3.5" />{tr('Publish')}</button>
              <button type="button" className={`${btn} text-red-600`} disabled={busy === d.clientDraftId} onClick={() => remove(d.clientDraftId)}><Trash2 className="w-3.5 h-3.5" />{tr('Delete')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PostItem = { id: string; preview: string; privacy?: string; createdAt: string; scheduledFor?: string | null };
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function ScheduledPostsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [items, setItems] = useState<PostItem[] | null>(null);
  const [edit, setEdit] = useState<{ id: string; value: string } | null>(null);
  const load = useCallback(() => call<{ items: PostItem[] }>('/api/me/posts/scheduled').then((j) => setItems(j.items)).catch((e) => { setItems([]); toast.error(e.message); }), [token]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!edit) return;
    try { await call(`/api/me/posts/scheduled/${edit.id}`, { method: 'PATCH', body: JSON.stringify({ scheduledFor: new Date(edit.value).toISOString() }) }); toast.success(tr('Rescheduled')); setEdit(null); load(); } catch (e: any) { toast.error(e.message); }
  };
  const cancel = async (id: string) => {
    if (!window.confirm(tr('Cancel this scheduled post? It moves to Trash.'))) return;
    try { await call(`/api/me/posts/scheduled/${id}`, { method: 'DELETE' }); toast.success(tr('Cancelled')); load(); } catch (e: any) { toast.error(e.message); }
  };
  if (!items) return <Spinner />;
  if (!items.length) return <Empty>{tr('No scheduled posts.')}</Empty>;
  return (
    <ul className="divide-y divide-border/60">
      {items.map((p) => (
        <li key={p.id} className="py-2.5 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[10rem]">
              <p className="text-sm truncate">{p.preview}</p>
              <p className="text-xs text-muted-foreground">{tr('Goes live')} {when(p.scheduledFor)}</p>
            </div>
            <button type="button" className={btn} onClick={() => setEdit({ id: p.id, value: toLocalInput(p.scheduledFor) })}><CalendarClock className="w-3.5 h-3.5" />{tr('Reschedule')}</button>
            <button type="button" className={`${btn} text-red-600`} onClick={() => cancel(p.id)}><XCircle className="w-3.5 h-3.5" />{tr('Cancel')}</button>
          </div>
          {edit?.id === p.id && (
            <div className="flex gap-2">
              <input type="datetime-local" className="h-8 rounded-lg border border-border bg-background px-2 text-sm" value={edit.value} onChange={(e) => setEdit({ id: p.id, value: e.target.value })} />
              <button type="button" className={btn} onClick={save}>{tr('Save')}</button>
              <button type="button" className={btn} onClick={() => setEdit(null)}>{tr('Close')}</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ArchivePanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [items, setItems] = useState<PostItem[] | null>(null);
  const load = useCallback(() => call<{ items: PostItem[] }>('/api/me/posts/archived').then((j) => setItems(j.items)).catch((e) => { setItems([]); toast.error(e.message); }), [token]);
  useEffect(() => { load(); }, [load]);
  const restore = async (id: string) => {
    try { await call(`/api/me/posts/archived/${id}/restore`, { method: 'POST' }); toast.success(tr('Back on your profile')); load(); } catch (e: any) { toast.error(e.message); }
  };
  if (!items) return <Spinner />;
  if (!items.length) return <Empty>{tr('No archived posts.')}</Empty>;
  return (
    <ul className="divide-y divide-border/60">
      {items.map((p) => (
        <li key={p.id} className="py-2.5 flex gap-3 items-center">
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{p.preview}</p>
            <p className="text-xs text-muted-foreground">{tr('Posted')} {when(p.createdAt)}</p>
          </div>
          <button type="button" className={btn} onClick={() => restore(p.id)}><RotateCcw className="w-3.5 h-3.5" />{tr('Unarchive')}</button>
        </li>
      ))}
    </ul>
  );
}

type ManageItem = PostItem & { isArchived: boolean; status: string };

/** Download own posts as a ZIP (posts.json + posts.csv). */
async function downloadPostsZip(token: string, tr: (s: string) => string) {
  try {
    const r = await fetch('/api/me/posts/export', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Request failed (${r.status})`);
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wevsoft-posts-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast.success(tr('Export downloaded'));
  } catch (e: any) { toast.error(e.message); }
}

export function ExportPostsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3 py-2">
      <p className="text-sm text-muted-foreground">{tr('A ZIP with posts.json and posts.csv: text, dates, audience and media links for every post outside Trash.')}</p>
      <button type="button" className={btn} disabled={busy} onClick={async () => { setBusy(true); await downloadPostsZip(token, tr); setBusy(false); }}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}{tr('Download ZIP')}
      </button>
    </div>
  );
}

/** Select many posts, then archive / unarchive / move to Trash / change audience in one go. */
export function BulkManagePanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [items, setItems] = useState<ManageItem[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => call<{ items: ManageItem[] }>('/api/me/posts/manage').then((j) => { setItems(j.items); setSel(new Set()); }).catch((e) => { setItems([]); toast.error(e.message); }), [token]);
  useEffect(() => { load(); }, [load]);
  const run = async (action: string, privacy?: string) => {
    if (!sel.size) return;
    if (action === 'delete' && !window.confirm(tr('Move the selected posts to Trash?'))) return;
    setBusy(true);
    try {
      const j = await call<{ updated: number }>('/api/me/posts/bulk', { method: 'POST', body: JSON.stringify({ ids: [...sel], action, privacy }) });
      toast.success(`${j.updated} ${tr('posts updated')}`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  if (!items) return <Spinner />;
  if (!items.length) return <Empty>{tr('No posts yet.')}</Empty>;
  const all = sel.size === items.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-card py-2 z-10">
        <label className="inline-flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(items.map((p) => p.id)))} aria-label={tr('Select all')} />
          {sel.size} {tr('selected')}
        </label>
        <button type="button" className={btn} disabled={busy || !sel.size} onClick={() => run('archive')}><Archive className="w-3.5 h-3.5" />{tr('Archive')}</button>
        <button type="button" className={btn} disabled={busy || !sel.size} onClick={() => run('unarchive')}><RotateCcw className="w-3.5 h-3.5" />{tr('Unarchive')}</button>
        <button type="button" className={btn} disabled={busy || !sel.size} onClick={() => run('delete')}><Trash2 className="w-3.5 h-3.5" />{tr('Move to Trash')}</button>
        <select className="h-8 rounded-lg border border-border bg-card px-2 text-xs" disabled={busy || !sel.size} value="" aria-label={tr('Change audience')} onChange={(e) => e.target.value && run('audience', e.target.value)}>
          <option value="">{tr('Change audience')}</option>
          <option value="public">{tr('Public')}</option>
          <option value="friends">{tr('Friends')}</option>
          <option value="followers">{tr('Followers')}</option>
          <option value="private">{tr('Only me')}</option>
        </select>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((p) => (
          <li key={p.id} className="py-2.5 flex gap-3 items-center">
            <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={p.preview} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{p.preview}</p>
              <p className="text-xs text-muted-foreground">
                {when(p.scheduledFor || p.createdAt)} · {tr(p.privacy === 'private' ? 'Only me' : (p.privacy || '').replace(/^./, (c) => c.toUpperCase()))}
                {p.isArchived ? ` · ${tr('Archived')}` : ''}{p.status === 'scheduled' ? ` · ${tr('Scheduled')}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Month view of published + scheduled posts. */
export function ContentCalendarPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [items, setItems] = useState<ManageItem[] | null>(null);
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronises with an external system (network/media/DOM)
    setItems(null); setDay(null);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    call<{ items: ManageItem[] }>(`/api/me/posts/manage?from=${month.toISOString()}&to=${to.toISOString()}&limit=500`).then((j) => setItems(j.items)).catch((e) => { setItems([]); toast.error(e.message); });
  }, [month, token]);
  const byDay = new Map<number, ManageItem[]>();
  for (const p of items || []) {
    const d = new Date(p.status === 'scheduled' && p.scheduledFor ? p.scheduledFor : p.createdAt);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) continue;
    byDay.set(d.getDate(), [...(byDay.get(d.getDate()) || []), p]);
  }
  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" className={btn} onClick={() => shift(-1)} aria-label={tr('Previous month')}><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
        <button type="button" className={btn} onClick={() => shift(1)} aria-label={tr('Next month')}><ChevronRight className="w-4 h-4" /></button>
      </div>
      {!items ? <Spinner /> : (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="font-semibold text-muted-foreground py-1">{d}</div>)}
          {cells.map((d, i) => {
            const list = d ? byDay.get(d) || [] : [];
            const sched = list.some((p) => p.status === 'scheduled');
            return (
              <button type="button" key={i} disabled={!d} onClick={() => d && setDay(d)}
                className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center ${!d ? 'border-transparent' : day === d ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                {d || ''}
                {list.length ? <span className={`mt-0.5 rounded-full px-1.5 text-[10px] font-bold ${sched ? 'bg-amber-500/20 text-amber-700' : 'bg-primary/15 text-primary'}`}>{list.length}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      {day && (
        <ul className="divide-y divide-border/60">
          {(byDay.get(day) || []).map((p) => (
            <li key={p.id} className="py-2 text-sm">
              <p className="truncate">{p.preview}</p>
              <p className="text-xs text-muted-foreground">{when(p.scheduledFor || p.createdAt)}{p.status === 'scheduled' ? ` · ${tr('Scheduled')}` : ''}</p>
            </li>
          ))}
          {!(byDay.get(day) || []).length && <Empty>{tr('Nothing on this day.')}</Empty>}
        </ul>
      )}
    </div>
  );
}

type Insights = { days: number; totals: { postsPublished: number; views: number; reactions: number; comments: number; shares: number }; series: { date: string; views: number }[]; top: { id: string; content: string; views: number; reactions: number; comments: number; shares: number }[] };

/** Settings > Insights & data: last 30 days across your posts. */
export function PostInsightsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const nav = useNavigate();
  const [d, setD] = useState<Insights | null>(null);
  useEffect(() => { api(token)<Insights>('/api/me/posts/insights').then(setD).catch((e) => toast.error(e.message)); }, [token]);
  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.series.map((s) => s.views));
  const tiles: [string, number][] = [['Posts', d.totals.postsPublished], ['Views', d.totals.views], ['Reactions', d.totals.reactions], ['Comments', d.totals.comments], ['Shares', d.totals.shares]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {tiles.map(([k, v]) => (<div key={k} className="rounded-xl border border-border p-2.5 text-center"><p className="text-lg font-bold">{v.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">{tr(k)}</p></div>))}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">{tr('Views per day (last 30 days)')}</p>
        <div className="flex items-end gap-[2px] h-20" role="img" aria-label={tr('Views per day (last 30 days)')}>
          {d.series.map((s) => <div key={s.date} title={`${s.date}: ${s.views}`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(2, (s.views / max) * 100)}%` }} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">{tr('Top posts')}</p>
        <ul className="divide-y divide-border/60">
          {d.top.map((p) => (
            <li key={p.id} className="py-2 cursor-pointer" onClick={() => nav(`/post/${p.id}`)}>
              <p className="text-sm line-clamp-1">{p.content || tr('(no text)')}</p>
              <p className="text-[11px] text-muted-foreground">{p.views} {tr('Views')} · {p.reactions} {tr('Reactions')} · {p.comments} {tr('Comments')} · {p.shares} {tr('Shares')}</p>
            </li>
          ))}
          {!d.top.length && <Empty>{tr('No activity in the last 30 days.')}</Empty>}
        </ul>
      </div>
    </div>
  );
}

type EditRow = { id: string; postId: string; kind: string; createdAt: string; previousContent: string | null; previousPrivacy: string | null; previousMediaCount: number | null; current: { content: string; privacy: string } };

/** Settings > Your posts: edit history with restore. */
export function EditHistoryPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [items, setItems] = useState<EditRow[] | null>(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(() => { call<{ items: EditRow[] }>('/api/me/posts/edits').then((r) => setItems(r.items)).catch((e) => { setItems([]); toast.error(e.message); }); }, [token]);
  useEffect(load, [load]);
  if (!items) return <Spinner />;
  const restore = async (e: EditRow) => {
    setBusy(e.id);
    try { await call(`/api/me/posts/${e.postId}/edits/${e.id}/restore`, { method: 'POST' }); toast.success(tr('Restored')); load(); }
    catch (err: any) { toast.error(err.message); } finally { setBusy(''); }
  };
  return (
    <ul className="divide-y divide-border/60">
      {items.map((e) => (
        <li key={e.id} className="py-2.5 flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{tr(e.kind === 'privacy' ? 'Audience changed' : e.kind === 'media' ? 'Media changed' : e.kind === 'restore' ? 'Restored version' : 'Text edited')} · {when(e.createdAt)}</p>
            <p className="text-sm line-clamp-1">{e.current.content || tr('(no text)')}</p>
            {e.previousPrivacy ? <p className="text-xs">{tr('Before')}: {e.previousPrivacy} → {e.current.privacy}</p> : null}
            {e.previousContent != null && e.kind !== 'privacy' ? <p className="text-xs text-muted-foreground line-clamp-2">{tr('Before')}: {clip(e.previousContent)}</p> : null}
            {e.previousMediaCount != null ? <p className="text-xs">{tr('Before')}: {e.previousMediaCount} {tr('media')}</p> : null}
          </div>
          <button type="button" className={btn} disabled={!!busy} onClick={() => restore(e)}><RotateCcw className="w-3.5 h-3.5" /> {tr('Restore')}</button>
        </li>
      ))}
      {!items.length && <Empty>{tr('No edits yet.')}</Empty>}
    </ul>
  );
}

export type PostTemplate = { id: string; name: string; content: string };
export type HashtagSet = { id: string; name: string; tags: string[] };
export type PostTools = { templates: PostTemplate[]; hashtagSets: HashtagSet[] };
const newId = () => Math.random().toString(36).slice(2, 10);

/** Settings > Create tools: post templates or saved hashtag sets (kind). */
export function PostToolsPanel({ token, kind }: { token: string; kind: 'templates' | 'hashtagSets' }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [data, setData] = useState<PostTools | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { call<PostTools>('/api/me/post-tools').then(setData).catch((e) => { setData({ templates: [], hashtagSets: [] }); toast.error(e.message); }); }, [token]);
  const save = async (next: PostTools) => {
    setSaving(true);
    try { setData(await call<PostTools>('/api/me/post-tools', { method: 'PUT', body: JSON.stringify({ [kind]: next[kind] }) })); return true; }
    catch (e: any) { toast.error(e.message); return false; } finally { setSaving(false); }
  };
  if (!data) return <Spinner />;
  const list: any[] = data[kind];
  const add = async () => {
    if (!name.trim() || !body.trim()) return;
    const item = kind === 'templates' ? { id: newId(), name, content: body } : { id: newId(), name, tags: body.split(/[\s,]+/).filter(Boolean) };
    if (await save({ ...data, [kind]: [...list, item] } as PostTools)) { setName(''); setBody(''); toast.success(tr('Saved')); }
  };
  const remove = (id: string) => save({ ...data, [kind]: list.filter((x) => x.id !== id) } as PostTools);
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/60">
        {list.map((x) => (
          <li key={x.id} className="py-2.5 flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{x.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{kind === 'templates' ? x.content : x.tags.map((t: string) => '#' + t).join(' ')}</p>
            </div>
            <button type="button" className={btn} disabled={saving} onClick={() => remove(x.id)} aria-label={tr('Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
          </li>
        ))}
        {!list.length && <Empty>{tr(kind === 'templates' ? 'No templates yet.' : 'No hashtag sets yet.')}</Empty>}
      </ul>
      {list.length < 20 && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Name')} aria-label={tr('Name')} />
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={kind === 'templates' ? 4 : 2} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={tr(kind === 'templates' ? 'Post text' : 'travel food dhaka')} aria-label={tr(kind === 'templates' ? 'Post text' : 'Hashtags')} />
          <button type="button" className={btn} disabled={saving || !name.trim() || !body.trim()} onClick={add}>{tr('Add')}</button>
        </div>
      )}
    </div>
  );
}

/** Composer chips: insert a saved template or hashtag set into the post text. */
export function ComposerQuickInsert({ token, onInsert, variant }: { token: string; onInsert: (text: string, replace: boolean) => void; variant?: 'inline' }) {
  const tr = useSettingsTr();
  const [data, setData] = useState<PostTools | null>(null);
  useEffect(() => { api(token)<PostTools>('/api/me/post-tools').then(setData).catch(() => setData(null)); }, [token]);
  if (!data || (!data.templates.length && !data.hashtagSets.length)) return null;
  const chip = 'shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted';
  return (
    <div className={variant === 'inline' ? 'mb-2 space-y-1' : 'border-b border-border px-4 py-2 space-y-1'} data-testid="composer-quick-insert">
      {data.templates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto items-center"><span className="text-xs font-semibold text-muted-foreground shrink-0">{tr('Templates')}</span>
          {data.templates.map((t) => <button key={t.id} type="button" className={chip} onClick={() => onInsert(t.content, true)}>{t.name}</button>)}
        </div>
      )}
      {data.hashtagSets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto items-center"><span className="text-xs font-semibold text-muted-foreground shrink-0">{tr('Hashtag sets')}</span>
          {data.hashtagSets.map((t) => <button key={t.id} type="button" className={chip} onClick={() => onInsert(t.tags.map((x) => '#' + x).join(' '), false)}>{t.name}</button>)}
        </div>
      )}
    </div>
  );
}

type ModAssist = {
  enabled: boolean;
  hideLinks: boolean;
  hideNoAvatar: boolean;
  hideNewAccounts: boolean;
  hideKeywords: boolean;
  bannedKeywords: string[];
  hideRepeatSpam: boolean;
  hidePhoneNumbers: boolean;
};

const MOD_RULES: { key: keyof ModAssist; title: string; desc: string }[] = [
  { key: 'hideLinks', title: 'Links in comments', desc: 'Hide comments that include URLs' },
  { key: 'hideNoAvatar', title: 'No profile picture', desc: 'Hide comments from accounts without an avatar' },
  { key: 'hideNewAccounts', title: 'New accounts (under 24h)', desc: 'Hide comments from freshly created accounts' },
  { key: 'hidePhoneNumbers', title: 'Phone numbers', desc: 'Hide comments with phone or WhatsApp digits' },
  { key: 'hideRepeatSpam', title: 'Repeat spam', desc: 'Hide when someone comments 3+ times in 2 minutes' },
  { key: 'hideKeywords', title: 'Restricted keywords', desc: 'Hide comments that match your keyword list' },
];

/** Settings > Posts & Content > Comment filters — same prefs as Creator Hub Moderation Assist. */
export function ModerationAssistPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const navigate = useNavigate();
  const call = api(token);
  const [settings, setSettings] = useState<ModAssist | null>(null);
  const [hiddenMonth, setHiddenMonth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(() => {
    call<{ settings: ModAssist; hiddenCountThisMonth: number }>('/api/v1/jobs-creator/creator/moderation-assist/settings')
      .then((r) => { setSettings(r.settings); setHiddenMonth(r.hiddenCountThisMonth || 0); })
      .catch((e) => toast.error(e.message));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<ModAssist>) => {
    if (!settings || busy) return;
    setBusy(true);
    const prev = settings;
    setSettings({ ...settings, ...patch });
    try {
      const r = await call<{ settings: ModAssist }>('/api/v1/jobs-creator/creator/moderation-assist/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setSettings(r.settings);
      toast.success(tr('Saved'));
    } catch (e: any) {
      setSettings(prev);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addKeyword = async () => {
    const k = keyword.trim().toLowerCase();
    if (!k || !settings) return;
    if (settings.bannedKeywords.includes(k)) { setKeyword(''); return; }
    await save({ bannedKeywords: [...settings.bannedKeywords, k] });
    setKeyword('');
  };

  if (!settings) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">{tr('Auto-hide spammy comments')}</p>
          <p className="text-xs text-muted-foreground">{tr('Filtered this month')}: {hiddenMonth}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <span>{settings.enabled ? tr('On') : tr('Off')}</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            checked={settings.enabled}
            disabled={busy}
            onChange={(e) => void save({ enabled: e.target.checked })}
          />
        </label>
      </div>

      <ul className={`divide-y divide-border/60 rounded-xl border border-border ${settings.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {MOD_RULES.map((rule) => (
          <li key={rule.key} className="flex items-start gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{tr(rule.title)}</p>
              <p className="text-xs text-muted-foreground">{tr(rule.desc)}</p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded"
              checked={Boolean(settings[rule.key])}
              disabled={busy || !settings.enabled}
              onChange={(e) => void save({ [rule.key]: e.target.checked } as Partial<ModAssist>)}
              aria-label={rule.title}
            />
          </li>
        ))}
      </ul>

      {settings.enabled && settings.hideKeywords ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr('Banned keywords')}</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.bannedKeywords.length === 0 ? (
              <span className="text-xs text-muted-foreground">{tr('No keywords yet')}</span>
            ) : settings.bannedKeywords.map((k) => (
              <button
                key={k}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-semibold"
                onClick={() => void save({ bannedKeywords: settings.bannedKeywords.filter((x) => x !== k) })}
                aria-label={`${tr('Remove')} ${k}`}
              >
                {k}<X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); void addKeyword(); }}
          >
            <input
              className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={tr('Add a word or phrase')}
            />
            <button type="submit" className={btn} disabled={busy || !keyword.trim()}>{tr('Add')}</button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={`${btn} w-full justify-center`}
        onClick={() => navigate(`${creatorHubPath('community')}&sub=moderation_assist`)}
      >
        {tr('Open activity log in Creator Hub')}
      </button>
    </div>
  );
}