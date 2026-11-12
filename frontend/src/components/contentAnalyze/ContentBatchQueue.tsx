/**
 * /business/batch/history — "Scheduled & history" for Batch Upload.
 *
 * Every batch post the user made, newest schedule first, with per-destination status, filters,
 * actions (edit / reschedule / cancel / retry / duplicate / delete) and an audit timeline.
 * Backend: modules/social-publishing/queue.routes.ts (ownership enforced server-side).
 * Inside Business Suite every call carries the selected Space (?spaceId=, CreatorSpaceProvider).
 * Times are stored in UTC and shown in the browser's own time zone (with its short name).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle, AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Clock, Copy, Download, ExternalLink, History, Image as ImageIcon, Info, Layers, Loader2,
  MoreHorizontal, Pencil, Play, Plus, RefreshCw, RotateCcw, Search, Send, SlidersHorizontal, Trash2, X, XCircle,
} from 'lucide-react';
import { useStore } from '../../store';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';
import { batchCreatePath } from '../../lib/batchStudio';
import TargetingButton from '../targeting/TargetingButton';
import { targetingPayload, valueFromServer, type TargetingValue } from '../../lib/postTargeting';
import { Brand } from './SocialDestinations';
import { fromLocalInput, toLocalInput, uploadBatchMedia } from '../creator/batch/batchApi';

import { YouTubeOptionsSummary, YouTubeResultPanel, YouTubeSettingsCard, compactYt, type YouTubeOpts, type YtDeliveryResult } from './YouTubeSettings';

const BASE = '/api/v1/jobs-creator/creator/batch-queue';
type QStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed' | 'canceled';
interface Delivery { id: string; platform: string; name: string; avatarUrl: string | null; status: string; error: string | null; externalUrl: string | null; publishedAt: string | null; attempts: number; connectionId?: string; result?: YtDeliveryResult | null }
interface QItem {
  id: string; batchId: string; batchName: string; caption: string; mediaUrl: string | null; mediaType: string | null; scheduledAt: string | null;
  createdAt: string; updatedAt: string; itemStatus: string; error: string | null; targeting: unknown; feedTargeting: unknown;
  status: QStatus; actions: { edit: boolean; reschedule: boolean; cancel: boolean; retry: boolean; duplicate: boolean; delete: boolean }; deliveries: Delivery[];
  platformOptions?: { youtube?: YouTubeOpts } | null;
}
interface AuditEvent { id: string; type: string; message: string; platform: string | null; actor: 'you' | 'user' | 'system'; createdAt: string; data: any }

const STATUS: Record<QStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#eef1f6] text-slate-600 dark:bg-white/10 dark:text-slate-300', dot: 'bg-slate-400' },
  scheduled: { label: 'Scheduled', cls: 'bg-[#f1e9ff] text-[#7a3fd6] dark:bg-violet-500/10 dark:text-violet-300', dot: 'bg-violet-500' },
  publishing: { label: 'Publishing', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', dot: 'bg-amber-500' },
  published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-600' },
  partial: { label: 'Partly published', cls: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300', dot: 'bg-lime-500' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300', dot: 'bg-rose-500' },
  canceled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', dot: 'bg-slate-300' },
};
const DSTATUS: Record<string, { label: string; cls: string; dot: string }> = {
  queued: { label: 'Scheduled', cls: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  publishing: { label: 'Publishing\u2026', cls: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  published: { label: 'Published', cls: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', cls: 'text-rose-600 dark:text-rose-300', dot: 'bg-rose-500' },
  unsupported: { label: 'Not supported', cls: 'text-orange-600 dark:text-orange-300', dot: 'bg-orange-500' },
  canceled: { label: 'Cancelled', cls: 'text-slate-500', dot: 'bg-slate-300' },
};
type Ev = { label: string; tone: string; icon: React.ComponentType<{ className?: string }> };
const EVENT: Record<string, Ev> = {
  created: { label: 'Created', tone: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300', icon: Plus },
  scheduled: { label: 'Scheduled', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', icon: CalendarClock },
  edited: { label: 'Edited', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', icon: Pencil },
  rescheduled: { label: 'Rescheduled', tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', icon: CalendarDays },
  unscheduled: { label: 'Unscheduled', tone: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300', icon: Clock },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300', icon: XCircle },
  publish_attempt: { label: 'Publish attempt', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: Send },
  published: { label: 'Published', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', icon: AlertCircle },
  retry: { label: 'Retry', tone: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', icon: RotateCcw },
  retry_scheduled: { label: 'Auto-retry', tone: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', icon: RotateCcw },
  duplicated: { label: 'Duplicated', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: Copy },
  deleted: { label: 'Deleted', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', icon: Trash2 },
};
const PLATFORMS = [['all', 'All platforms'], ['wevsoft', 'WebSoft'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn'], ['x', 'X'], ['tiktok', 'TikTok']] as const;
const FILTERS: ('all' | QStatus)[] = ['all', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'canceled', 'draft'];
const STATS: { s: QStatus; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { s: 'scheduled', label: 'Scheduled', icon: CalendarClock, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  { s: 'published', label: 'Published', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { s: 'failed', label: 'Failed', icon: AlertCircle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  { s: 'canceled', label: 'Cancelled', icon: XCircle, tone: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300' },
];

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d63ed]/60 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0b0d14]';
const card = 'rounded-[14px] border border-[#e4e9f2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)] dark:border-white/[0.08] dark:bg-white/[0.03]';
const btn = `inline-flex h-9 whitespace-nowrap items-center justify-center gap-2 rounded-[10px] border border-[#dfe5ee] bg-white px-3.5 text-[12.5px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07] ${ring}`;
const btnSm = `inline-flex h-7 items-center justify-center gap-1.5 rounded-[8px] border border-[#dfe5ee] bg-white px-2.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 ${ring}`;
const field = 'h-9 rounded-[10px] border border-[#dfe5ee] bg-white px-3 text-[12.5px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:[color-scheme:dark]';
const lbl = 'mb-1 block text-[11.5px] font-semibold text-slate-700 dark:text-slate-300';
const primary = '!border-[#1d63ed] !bg-[#1d63ed] !text-white hover:!bg-blue-700';
const danger = '!text-rose-600 dark:!text-rose-300';
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Local time with the zone name, e.g. "Oct 22, 2026, 01:30 PM GMT+6". */
export const fmtLocal = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : '\u2014';
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const fmtRel = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso).getTime() - Date.now(); const a = Math.abs(d);
  const t = a < 3_600_000 ? `${Math.max(1, Math.round(a / 60_000))} min` : a < 86_400_000 ? `${Math.round(a / 3_600_000)} h` : `${Math.round(a / 86_400_000)} d`;
  return d > 0 ? `in ${t}` : `${t} ago`;
};
const dayKey = (iso: string | null) => { if (!iso) return 'none'; const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (iso: string | null) => {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso); const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};

async function qFetch<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || `Request failed (${res.status})`);
  return body as T;
}

/** qFetch bound to the session token and, inside Business Suite, the selected Space (?spaceId=). */
function useQFetch(token: string | null | undefined) {
  const { spaceId } = useCreatorSpace();
  return useCallback(<T,>(path: string, init: RequestInit = {}) => qFetch<T>(token ?? null, withCreatorSpaceQuery(path, spaceId), init), [token, spaceId]);
}

function StatusBadge({ s }: { s: QStatus }) {
  const b = STATUS[s] || STATUS.draft;
  return <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold ${b.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${b.dot} ${s === 'publishing' ? 'animate-pulse' : ''}`} />{b.label}</span>;
}

function Thumb({ it, cls }: { it: Pick<QItem, 'mediaUrl' | 'mediaType'>; cls: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-[10px] bg-slate-100 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10 ${cls}`}>
      {it.mediaUrl ? (it.mediaType === 'video' ? <video src={`${it.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={it.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover" />) : <div className="grid h-full place-items-center text-slate-400"><ImageIcon className="h-5 w-5" /></div>}
      {it.mediaType === 'video' && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-6 w-6 place-items-center rounded-full bg-black/55 ring-2 ring-white"><Play className="ml-0.5 h-3 w-3 fill-white text-white" /></span></span>}
    </div>
  );
}

/** Compact platform icon with a status dot; full detail in the tooltip. */
function DestIcon({ d }: { d: Delivery }) {
  const s = DSTATUS[d.status] || DSTATUS.queued;
  return (
    <span className="relative inline-grid h-7 w-7 place-items-center rounded-full border border-[#e4e9f2] bg-white dark:border-white/10 dark:bg-white/[0.06]" title={`${d.name} \u00b7 ${s.label}${d.error ? ` \u2014 ${d.error}` : ''}`}>
      <Brand id={d.platform} size={15} />
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#12151f] ${s.dot} ${d.status === 'publishing' ? 'animate-pulse' : ''}`} />
      <span className="sr-only">{d.name}: {s.label}</span>
    </span>
  );
}

/** Full destination row (drawer). */
function DeliveryRow({ d, itemId, token }: { d: Delivery; itemId?: string; token?: string | null }) {
  const qf = useQFetch(token);
  const s = DSTATUS[d.status] || DSTATUS.queued;
  const Icon = d.status === 'published' ? CheckCircle2 : d.status === 'failed' || d.status === 'unsupported' ? AlertCircle : d.status === 'canceled' ? XCircle : d.status === 'publishing' ? Loader2 : Clock;
  return (
    <div className="rounded-[10px] border border-[#e4e9f2] bg-[#fafbfe] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
        <Brand id={d.platform} size={18} />
        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-slate-200">{d.name}</span>
        <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${s.cls}`}><Icon className={`h-3.5 w-3.5 ${d.status === 'publishing' ? 'animate-spin' : ''}`} />{s.label}</span>
        {d.externalUrl && <a href={d.externalUrl} target={d.externalUrl.startsWith('/') ? undefined : '_blank'} rel="noreferrer" className={`rounded text-blue-600 hover:underline ${ring}`} aria-label="Open published post"><ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
      {d.error && d.status !== 'published' && <p className="mt-1 pl-[26px] text-[11.5px] text-rose-600 dark:text-rose-300">{d.error}</p>}
      {d.platform === 'youtube' && d.result && itemId && <YouTubeResultPanel result={d.result} fetchKey={() => qf<{ rtmpUrl: string; streamKey: string }>(`/items/${itemId}/live-key?jobId=${encodeURIComponent(d.id)}`)} />}
    </div>
  );
}

type MenuItem = { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; danger?: boolean; disabled?: boolean };
function Kebab({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`grid h-8 w-8 place-items-center rounded-[9px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100 ${ring}`}><MoreHorizontal className="h-4 w-4" /></button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-[12px] border border-[#e4e9f2] bg-white py-1 shadow-[0_12px_32px_rgba(16,24,40,0.14)] dark:border-white/10 dark:bg-[#171a26]">
          {items.map((m) => (
            <button key={m.label} type="button" role="menuitem" disabled={m.disabled} onClick={() => { setOpen(false); m.onClick(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-medium hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none disabled:opacity-40 dark:hover:bg-white/5 dark:focus-visible:bg-white/5 ${m.danger ? 'text-rose-600 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>
              <m.icon className="h-4 w-4" />{m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = 'details' | 'edit' | 'history';
function Drawer({ token, id, onClose, onChanged }: { token: string | null; id: string; onClose: () => void; onChanged: () => void }) {
  const qf = useQFetch(token);
  const { spaceId } = useCreatorSpace();
  const [item, setItem] = useState<QItem | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [caption, setCaption] = useState('');
  const [when, setWhen] = useState<string | null>(null);
  const [media, setMedia] = useState<{ url: string | null; type: string | null }>({ url: null, type: null });
  const [tg, setTg] = useState<TargetingValue | null>(null);
  const [yt, setYt] = useState<YouTubeOpts | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('details');
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const r = await qf<{ item: QItem; audit: AuditEvent[] }>(`/items/${id}`);
    setItem(r.item); setAudit(r.audit); setCaption(r.item.caption); setWhen(r.item.scheduledAt); setMedia({ url: r.item.mediaUrl, type: r.item.mediaType }); setTg(valueFromServer(r.item.targeting as any, r.item.feedTargeting as any)); setYt(r.item.platformOptions?.youtube || null);
  }, [qf, id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setErr(null); load().catch((e: Error) => { setErr(e.message); toast.error(e.message); }); }, [load]);
  const act = async (name: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(name);
    try { await fn(); toast.success(ok); onChanged(); if (name === 'delete') onClose(); else await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  if (!item) return (
    <Shell onClose={onClose}>
      {err ? <div className="p-6 text-center"><AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-500" /><p className="text-[13px] font-semibold">Couldn't load this post</p><p className="mt-1 text-[12px] text-slate-500">{err}</p>
        <button type="button" className={`${btn} mt-4`} onClick={() => { setErr(null); load().catch((e: Error) => setErr(e.message)); }}><RefreshCw className="h-4 w-4" />Try again</button></div>
        : <div className="space-y-4 p-5">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-[12px] bg-slate-100 dark:bg-white/5" />)}</div>}
    </Shell>
  );
  const ed = item.actions.edit;
  const ytDelivery = item.deliveries.find((d) => d.platform === 'youtube');
  const ytDirty = JSON.stringify(compactYt(yt)) !== JSON.stringify(compactYt(item.platformOptions?.youtube));
  const dirty = ytDirty || caption !== item.caption || when !== item.scheduledAt || media.url !== item.mediaUrl || JSON.stringify(tg) !== JSON.stringify(valueFromServer(item.targeting as any, item.feedTargeting as any));
  const saveEdits = () => act('save', async () => {
    const body: any = {};
    if (caption !== item.caption) body.caption = caption;
    if (media.url !== item.mediaUrl) { body.mediaUrl = media.url; body.mediaType = media.type; }
    if (when !== item.scheduledAt) body.scheduledAt = when;
    if (ytDirty) body.platformOptions = compactYt(yt) ? { youtube: compactYt(yt) } : { youtube: null };
    if (tg && JSON.stringify(tg) !== JSON.stringify(valueFromServer(item.targeting as any, item.feedTargeting as any))) Object.assign(body, targetingPayload(tg));
    await qf(`/items/${item.id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }, 'Changes saved');
  const retry = () => act('retry', () => qf(`/items/${item.id}/retry`, { method: 'POST' }), 'Retry queued \u2014 publishing within ~30 seconds');
  const dup = () => act('dup', () => qf(`/items/${item.id}/duplicate`, { method: 'POST' }), 'Copied as a new draft');
  const cancel = () => { if (window.confirm('Cancel this scheduled post? Nothing will be published.')) void act('cancel', () => qf(`/items/${item.id}/cancel`, { method: 'POST' }), 'Post cancelled'); };
  const del = () => { if (window.confirm('Delete this post? Its history stays in the audit log.')) void act('delete', () => qf(`/items/${item.id}`, { method: 'DELETE' }), 'Deleted'); };
  const reset = () => { setYt(item.platformOptions?.youtube || null); setCaption(item.caption); setWhen(item.scheduledAt); setMedia({ url: item.mediaUrl, type: item.mediaType }); setTg(valueFromServer(item.targeting as any, item.feedTargeting as any)); };
  const tabs: [Tab, string, number?][] = [['details', 'Details'], ['edit', 'Edit'], ['history', 'History', audit.length]];
  const sec = 'text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';

  const footer = tab === 'edit' ? (
    <>
      <button type="button" className={btn} disabled={!dirty || !!busy} onClick={reset}>Discard</button>
      <button type="button" className={`${btn} ${primary} ml-auto`} disabled={!dirty || !ed || !!busy} onClick={saveEdits}>{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save changes</button>
    </>
  ) : tab === 'history' ? (
    <button type="button" className={`${btn} ml-auto`} onClick={() => void downloadCsv(token, item.id, spaceId)}><Download className="h-4 w-4" />Export this post's audit CSV</button>
  ) : (
    <>
      {item.actions.delete && <button type="button" aria-label="Delete" title="Delete" className={`${btn} !px-2.5 ${danger}`} disabled={!!busy} onClick={del}><Trash2 className="h-4 w-4" /></button>}
      {item.actions.cancel && <button type="button" className={`${btn} ${danger}`} disabled={!!busy} onClick={cancel}><XCircle className="h-4 w-4" />Cancel post</button>}
      <button type="button" className={`${btn} ml-auto`} disabled={!!busy} onClick={dup}>{busy === 'dup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}Duplicate</button>
      {item.actions.retry ? <button type="button" className={`${btn} ${primary}`} disabled={!!busy} onClick={retry}>{busy === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Retry failed</button>
        : ed && <button type="button" className={`${btn} ${primary}`} onClick={() => setTab('edit')}><Pencil className="h-4 w-4" />Edit</button>}
    </>
  );

  return (
    <Shell onClose={onClose} title={item.batchName} status={item.status} footer={footer}
      tabs={<div role="tablist" className="flex gap-1 px-4 sm:px-5">{tabs.map(([t, l, n]) => (
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
          className={`relative -mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[12.5px] font-semibold ${ring} ${tab === t ? 'border-[#1d63ed] text-[#1d63ed] dark:text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          {l}{n ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-slate-100 px-1 text-[10.5px] text-slate-600 dark:bg-white/10 dark:text-slate-300">{n}</span> : null}
        </button>))}</div>}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusy('upload'); uploadBatchMedia(token, f).then((u) => setMedia({ url: u.url, type: u.type })).catch((er: Error) => toast.error(er.message)).finally(() => setBusy(null)); }} />

      {tab === 'details' && (
        <div className="space-y-5 p-4 sm:p-5">
          {!item.actions.edit && !item.actions.cancel && !item.actions.retry && (
            <div className="flex gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item.status === 'published' || item.status === 'partial' ? 'This post has already been published, so it can no longer be edited, rescheduled or cancelled. Use Duplicate to schedule it again.' : item.status === 'publishing' ? 'This post is going out right now, so it can no longer be changed.' : item.status === 'canceled' ? 'This post was cancelled. Duplicate it to schedule it again, or delete it.' : 'Edit and cancel are only available for posts that are scheduled at least a minute ahead.'}</span>
            </div>
          )}
          <Thumb it={{ mediaUrl: item.mediaUrl, mediaType: item.mediaType }} cls="aspect-video w-full" />
          <section className="space-y-1.5"><h3 className={sec}>Caption</h3>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">{item.caption || <span className="italic text-slate-400">No caption</span>}</p></section>
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[12px] border border-[#e4e9f2] p-3 dark:border-white/10"><h3 className={sec}>Scheduled</h3><p className="mt-1 text-[12.5px] font-semibold">{fmtLocal(item.scheduledAt)}</p>{item.scheduledAt && <p className="text-[11.5px] text-slate-500">{fmtRel(item.scheduledAt)}</p>}</div>
            <div className="rounded-[12px] border border-[#e4e9f2] p-3 dark:border-white/10"><h3 className={sec}>Created</h3><p className="mt-1 text-[12.5px] font-semibold">{fmtLocal(item.createdAt)}</p><p className="text-[11.5px] text-slate-500">{fmtRel(item.createdAt)}</p></div>
          </section>
          {item.error && item.status === 'failed' && <div className="flex gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{item.error}</div>}
          <section className="space-y-2"><h3 className={sec}>Destinations ({item.deliveries.length})</h3>
            {item.deliveries.length ? item.deliveries.map((d) => <DeliveryRow key={d.id} d={d} itemId={item.id} token={token} />) : <p className="text-[12px] text-slate-500">No destination</p>}</section>
          {ytDelivery && <section className="space-y-2"><h3 className={sec}>YouTube settings</h3><YouTubeOptionsSummary opts={item.platformOptions?.youtube} /></section>}
        </div>
      )}

      {tab === 'edit' && (
        <div className="space-y-5 p-4 sm:p-5">
          {!ed && <div className="flex gap-2 rounded-[12px] bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600 dark:bg-white/5 dark:text-slate-300"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{item.status === 'draft' ? <>Drafts are edited in the <Link className="font-semibold text-blue-600" to={batchCreatePath({ id: item.batchId })}>batch editor</Link>.</> : 'This post can no longer be edited (it is publishing, already went out, or was cancelled).'}</span></div>}
          <section><span className={lbl}>Media</span>
            <div className="flex items-center gap-3">
              <div className="relative"><Thumb it={{ mediaUrl: media.url, mediaType: media.type }} cls="h-[84px] w-[120px]" />{busy === 'upload' && <span className="absolute inset-0 grid place-items-center rounded-[10px] bg-white/60"><Loader2 className="h-4 w-4 animate-spin" /></span>}</div>
              <div className="flex flex-col gap-2">
                <button type="button" className={btnSm} disabled={!ed || !!busy} onClick={() => fileRef.current?.click()}><ImageIcon className="h-3.5 w-3.5" />Replace media</button>
                {media.url && <button type="button" className={btnSm} disabled={!ed || !!busy || !caption.trim()} onClick={() => setMedia({ url: null, type: null })}><X className="h-3.5 w-3.5" />Remove media</button>}
              </div>
            </div>
          </section>
          <label className="block"><span className={lbl}>Caption <span className="float-right font-normal text-slate-400">{caption.length}/5000</span></span>
            <textarea value={caption} disabled={!ed} maxLength={5000} rows={5} onChange={(e) => setCaption(e.target.value)} className="block w-full resize-y rounded-[10px] border border-[#dfe5ee] bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.04]" />
          </label>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block"><span className={lbl}>Scheduled time <span className="font-normal text-slate-500">({TZ})</span></span>
              <input type="datetime-local" disabled={!item.actions.reschedule} value={toLocalInput(when)} onChange={(e) => setWhen(fromLocalInput(e.target.value))} className={`${field} w-full`} />
            </label>
            <div><span className={lbl}>Audience</span>{tg && <TargetingButton placeholder="Public" disabled={!ed} value={tg} onChange={setTg} align="left" />}</div>
          </div>
          {ytDelivery && <YouTubeSettingsCard token={token} scope="single" connectionId={ytDelivery.connectionId || null} value={yt} onChange={setYt} caption={caption} mediaType={media.type === 'video' ? 'video' : media.url ? 'image' : null} disabled={!ed} defaultOpen />}
          {dirty && <p className="text-[11.5px] font-medium text-amber-700 dark:text-amber-300">You have unsaved changes.</p>}
        </div>
      )}

      {tab === 'history' && (
        <div className="p-4 sm:p-5">
          {audit.length === 0 ? <div className="py-10 text-center"><History className="mx-auto mb-2 h-6 w-6 text-slate-400" /><p className="text-[12.5px] text-slate-500">No events recorded yet. Posts created before the audit log existed have no history.</p></div> : (
            <ol className="relative">
              {audit.map((e, i) => {
                const ev = EVENT[e.type] || { label: e.type, tone: 'bg-slate-100 text-slate-600', icon: Clock };
                return (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < audit.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-28px)] w-px bg-[#e4e9f2] dark:bg-white/10" aria-hidden />}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ev.tone}`}><ev.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
                        <b className="text-slate-900 dark:text-slate-100">{ev.label}</b>{e.platform && <Brand id={e.platform} size={13} />}
                        <span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">{e.actor === 'system' ? 'System' : 'You'}</span>
                        <time className="ml-auto text-[11px] text-slate-500" dateTime={e.createdAt} title={fmtLocal(e.createdAt)}>{fmtLocal(e.createdAt)}</time>
                      </div>
                      {e.message && <p className="mt-0.5 text-[12px] text-slate-700 dark:text-slate-300">{e.message}</p>}
                      {e.type === 'rescheduled' && e.data?.from && <p className="mt-1 rounded-[8px] bg-slate-50 px-2 py-1 text-[11.5px] text-slate-600 dark:bg-white/5 dark:text-slate-300">{fmtLocal(e.data.from)} <span className="text-slate-400">{'\u2192'}</span> {fmtLocal(e.data.to)}</p>}
                      {e.type === 'edited' && Array.isArray(e.data?.changes) && <div className="mt-1 space-y-0.5 rounded-[8px] bg-slate-50 px-2 py-1 dark:bg-white/5">{e.data.changes.map((c: any) => <p key={c.field} className="truncate text-[11.5px] text-slate-600 dark:text-slate-300" title={`${String(c.from ?? '')} \u2192 ${String(c.to ?? '')}`}><span className="font-semibold">{c.field}</span>: <span className="text-slate-400 line-through">{typeof c.from === 'object' && c.from ? 'targeting' : String(c.from ?? '\u2205').slice(0, 40)}</span> {'\u2192'} {typeof c.to === 'object' && c.to ? 'targeting' : String(c.to ?? '\u2205').slice(0, 40)}</p>)}</div>}
                      {e.data?.url && <a href={e.data.url} target={String(e.data.url).startsWith('/') ? undefined : '_blank'} rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" />Open post</a>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onClose, title, status, tabs, footer }: { children: React.ReactNode; onClose: () => void; title?: string; status?: QStatus; tabs?: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title || 'Post'} className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[560px] sm:rounded-l-[18px] dark:bg-[#12151f]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 border-b border-[#edf1f7] dark:border-white/10">
          <div className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e7efff] text-[#1d63ed] dark:bg-blue-500/15 dark:text-blue-300"><Layers className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold leading-tight">{title || 'Post'}</p>{status && <div className="mt-1"><StatusBadge s={status} /></div>}</div>
            <button type="button" aria-label="Close" className={`grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 ${ring}`} onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
          {tabs}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#edf1f7] bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5 dark:border-white/10 dark:bg-[#12151f]/95">{footer}</div>}
      </aside>
    </div>
  );
}

async function downloadCsv(token: string | null, itemId?: string, spaceId?: string | null) {
  try {
    const res = await fetch(withCreatorSpaceQuery(`${BASE}/audit.csv${itemId ? `?itemId=${encodeURIComponent(itemId)}` : ''}`, spaceId), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `batch-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e: any) { toast.error(e.message); }
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="h-[60px] w-[84px] animate-pulse rounded-[10px] bg-slate-100 dark:bg-white/5" />
      <div className="flex-1 space-y-2"><div className="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-white/5" /><div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-white/5" /></div>
      <div className="hidden h-6 w-24 animate-pulse rounded-full bg-slate-100 sm:block dark:bg-white/5" />
    </div>
  );
}
interface QBatch { id: string; name: string; createdAt: string; posts: number; counts: Record<string, number>; status: QStatus | 'empty' | 'mixed'; destinations: { platform: string; name: string; posts: number }[]; firstAt: string | null; lastAt: string | null }

/** Batches view: one card per batch (name, post count, destinations, status mix), rename inline, expand to its posts. */
function BatchesView({ token, search, onOpen, refreshKey }: { token: string | null; search: string; onOpen: (id: string) => void; refreshKey: number }) {
  const qf = useQFetch(token);
  const [list, setList] = useState<QBatch[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Record<string, QItem[]>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { const r = await qf<{ batches: QBatch[] }>(`/batches${search ? `?search=${encodeURIComponent(search)}` : ''}`); setList(r.batches); setErr(null); }
    catch (e: any) { setErr(e.message); }
  }, [qf, search]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void load(); }, [load, refreshKey]);
  const loadPosts = useCallback(async (id: string) => {
    const r = await qf<{ items: QItem[] }>(`?batchId=${encodeURIComponent(id)}&pageSize=100`);
    setPosts((m) => ({ ...m, [id]: r.items }));
  }, [qf]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (openId) void loadPosts(openId).catch((e: Error) => toast.error(e.message)); }, [openId, loadPosts, refreshKey]);
  const rename = async (b: QBatch) => {
    const name = draft.trim();
    if (!name || name === b.name) { setEditing(null); return; }
    setSaving(true);
    try { await qf(`/batches/${b.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); toast.success('Batch renamed'); setEditing(null); await load(); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  if (err && !list) return <div className={`${card} px-6 py-12 text-center`}><p className="text-[14px] font-bold">Couldn't load batches</p><p className="mt-1 text-[12.5px] text-slate-500">{err}</p><button type="button" className={`${btn} mt-4`} onClick={() => void load()}><RefreshCw className="h-4 w-4" />Try again</button></div>;
  if (!list) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-24 animate-pulse`} />)}</div>;
  if (!list.length) return <div className={`${card} px-6 py-12 text-center`}><p className="text-[14px] font-bold">{search ? 'No batch matches this search' : 'No batches yet'}</p><p className="mt-1 text-[12.5px] text-slate-500">Each upload you schedule from Batch Upload becomes a batch here (Batch 1, Batch 2, \u2026).</p></div>;
  const order: QStatus[] = ['scheduled', 'publishing', 'published', 'partial', 'failed', 'canceled', 'draft'];
  return (
    <div className="space-y-3">
      {list.map((b) => {
        const isOpen = openId === b.id;
        return (
          <div key={b.id} className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><Layers className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                {editing === b.id ? (
                  <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); void rename(b); }}>
                    <input autoFocus aria-label="Batch name" value={draft} maxLength={120} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }} className={`${field} !h-8 w-full max-w-[320px]`} />
                    <button type="submit" className={`${btnSm} ${primary}`} disabled={saving || !draft.trim()}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Save</button>
                    <button type="button" className={btnSm} onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-[14.5px] font-bold">{b.name}</h3>
                    <button type="button" aria-label={`Rename ${b.name}`} title="Rename" className={`grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 ${ring}`} onClick={() => { setEditing(b.id); setDraft(b.name); }}><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <p className="mt-0.5 text-[11.5px] text-slate-500">{b.posts} post{b.posts === 1 ? '' : 's'}{b.firstAt ? ` \u00b7 ${fmtLocal(b.firstAt)}${b.lastAt && b.lastAt !== b.firstAt ? ` \u2192 ${fmtLocal(b.lastAt)}` : ''}` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">{order.filter((s2) => b.counts[s2]).map((s2) => <span key={s2} className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${STATUS[s2].cls}`}>{b.counts[s2]} {STATUS[s2].label}</span>)}</div>
              <button type="button" aria-expanded={isOpen} className={btn} onClick={() => setOpenId(isOpen ? null : b.id)}>{isOpen ? 'Hide posts' : 'Show posts'}</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#edf1f7] bg-[#fafbfe] px-4 py-2 text-[11.5px] dark:border-white/[0.06] dark:bg-white/[0.02]">
              <span className="font-semibold text-slate-500">Goes to:</span>
              {b.destinations.length ? b.destinations.map((d) => <span key={d.platform + d.name} className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e9f2] bg-white px-2 py-0.5 font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"><Brand id={d.platform} size={13} />{d.name}<span className="text-slate-400">\u00d7{d.posts}</span></span>) : <span className="text-slate-400">No destination (drafts)</span>}
            </div>
            {isOpen && (
              <div className="divide-y divide-[#edf1f7] border-t border-[#edf1f7] dark:divide-white/[0.06] dark:border-white/[0.06]">
                {!posts[b.id] ? <div className="p-4"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /></div>
                  : !posts[b.id].length ? <p className="p-4 text-[12.5px] text-slate-500">No posts in this batch.</p>
                  : posts[b.id].map((it, i) => (
                    <button key={it.id} type="button" onClick={() => onOpen(it.id)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f7faff] dark:hover:bg-blue-500/[0.04] ${ring}`}>
                      <span className="w-6 shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">#{i + 1}</span>
                      <Thumb it={it} cls="h-10 w-14" />
                      <span className="min-w-0 flex-1"><span className="line-clamp-1 text-[12.5px] font-medium">{it.caption || <i className="text-slate-400">No caption</i>}</span><span className="text-[11px] text-slate-500">{it.scheduledAt ? fmtLocal(it.scheduledAt) : 'Not scheduled'}</span></span>
                      <span className="hidden gap-1 sm:flex">{it.deliveries.map((d) => <DestIcon key={d.id} d={d} />)}</span>
                      <StatusBadge s={it.status} />
                    </button>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContentBatchQueue() {
  const navigate = useNavigate();
  const token = useStore((s: any) => s.token) as string | null;
  const qf = useQFetch(token);
  const { spaceId } = useCreatorSpace();
  const [items, setItems] = useState<QItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | QStatus>('all');
  const [platform, setPlatform] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [qd, setQd] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<'posts' | 'batches'>(() => (new URLSearchParams(window.location.search).get('group') === 'batches' ? 'batches' : 'posts'));
  const [bump, setBump] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const PAGE = 20;
  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setPage(1); }, [status, platform, from, to, qd]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ status, platform, page: String(page), pageSize: String(PAGE) });
    if (qd) p.set('search', qd);
    if (from) p.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) p.set('to', new Date(`${to}T23:59:59`).toISOString());
    return p.toString();
  }, [status, platform, page, qd, from, to]);
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const r = await qf<{ items: QItem[]; total: number; counts: Record<string, number> }>(`?${query}`); setItems(r.items); setTotal(r.total); setCounts(r.counts); setError(null); }
    catch (e: any) { if (!quiet) { setError(e.message); toast.error(e.message); } } finally { setLoading(false); }
  }, [qf, query]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void load(); }, [load]);
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const live = items.some((i) => i.status === 'publishing' || (i.status === 'scheduled' && i.scheduledAt && new Date(i.scheduledAt).getTime() - Date.now() < 120_000));
  useEffect(() => { if (!live) return; const t = setInterval(() => void load(true), 10_000); return () => clearInterval(t); }, [live, load]);

  const quick = async (it: QItem, name: string, path: string, method: string, ok: string) => {
    setBusy(`${it.id}:${name}`);
    try { await qf(path, { method }); toast.success(ok); await load(true); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const filtered = !!(from || to || q || platform !== 'all' || status !== 'all');
  const extraFilters = [from || to, platform !== 'all', status !== 'all' && !STATS.some((x) => x.s === status)].filter(Boolean).length;
  const clear = () => { setFrom(''); setTo(''); setQ(''); setPlatform('all'); setStatus('all'); };
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: QItem[] }[] = [];
    for (const it of items) { const k = dayKey(it.scheduledAt); const last = out[out.length - 1]; if (last && last.key === k) last.items.push(it); else out.push({ key: k, label: dayLabel(it.scheduledAt), items: [it] }); }
    return out;
  }, [items]);
  const newPost = () => navigate(batchCreatePath({ new: '1' }));
  const closeDrawer = useCallback(() => setOpen(null), []);

  const filterFields = (
    <>
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'all' | QStatus)} className={`${field} w-full sm:w-[170px]`}>{FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? `All statuses (${counts.all ?? total})` : `${STATUS[s].label} (${counts[s] || 0})`}</option>)}</select>
      <select aria-label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${field} w-full sm:w-[150px]`}>{PLATFORMS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${field} min-w-0 flex-1 sm:w-[140px] sm:flex-none`} />
        <span className="text-[12px] text-slate-400">to</span>
        <input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${field} min-w-0 flex-1 sm:w-[140px] sm:flex-none`} />
      </div>
    </>
  );

  return (
    <div className="min-h-full bg-[#f5f8fd] text-slate-900 dark:bg-[#0b0d14] dark:text-slate-100">
      <div className="mx-auto max-w-[1280px] space-y-4 px-3 pb-10 pt-4 sm:space-y-5 sm:px-[30px] sm:pt-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d63ed] text-white shadow-sm shadow-blue-600/30"><History className="h-5 w-5" /></span>
            <div className="min-w-0 leading-tight">
              <h1 className="text-[20px] font-extrabold tracking-tight sm:text-[23px]">Scheduled &amp; history</h1>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">Track every batch post, where it goes and what happened. Times shown in {TZ}.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${btn} h-10`} onClick={() => navigate(batchCreatePath())}><Layers className="h-4 w-4" />Batch Upload</button>
            <button type="button" className={`${btn} h-10`} onClick={() => void downloadCsv(token, undefined, spaceId)}><Download className="h-4 w-4" /><span className="hidden sm:inline">Export audit CSV</span><span className="sm:hidden">Export</span></button>
            <button type="button" className={`${btn} h-10 flex-1 sm:flex-none ${primary}`} onClick={newPost}><Plus className="h-4 w-4" />New scheduled post</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {STATS.map(({ s, label, icon: Icon, tone }) => {
            const on = status === s;
            const n = counts[s] || 0;
            return (
              <button key={s} type="button" aria-pressed={on} onClick={() => setStatus(on ? 'all' : s)} title={on ? 'Show all' : `Show only ${label.toLowerCase()}`}
                className={`${card} ${ring} flex items-center gap-3 px-3.5 py-3 text-left transition hover:-translate-y-px hover:shadow-md sm:px-4 ${on ? '!border-[#1d63ed] ring-2 ring-[#1d63ed]/20' : ''}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tone}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-[22px] font-extrabold leading-none tabular-nums">{n}</span>
                  <span className="mt-1 block truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">{label}{s === 'published' && counts.partial ? ` \u00b7 +${counts.partial} partly` : ''}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div role="tablist" aria-label="Group by" className="inline-flex rounded-[12px] border border-[#e4e9f2] bg-white p-1 dark:border-white/10 dark:bg-white/[0.03]">
          {([['posts', 'All posts'], ['batches', 'Batches']] as const).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3.5 text-[12.5px] font-semibold ${ring} ${mode === m ? 'bg-[#1d63ed] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'}`}>{m === 'batches' ? <Layers className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{l}</button>
          ))}
        </div>

        {mode === 'batches' ? <BatchesView token={token} search={qd} onOpen={setOpen} refreshKey={bump} /> : <>
        <div className={`${card} flex flex-wrap items-center gap-2 p-2.5`}>
          <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={'Search caption or batch name\u2026'} aria-label="Search" className={`${field} w-full !pl-9`} />
          </div>
          <div className="hidden flex-wrap items-center gap-2 sm:flex">{filterFields}</div>
          <button type="button" className={`${btn} sm:hidden`} onClick={() => setSheet(true)} aria-label="Filters"><SlidersHorizontal className="h-4 w-4" />{extraFilters ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1d63ed] px-1 text-[10.5px] text-white">{extraFilters}</span> : null}</button>
          <div className="ml-auto flex items-center gap-1">
            {filtered && <button type="button" className={`${btnSm} !h-9 !border-transparent !bg-transparent !shadow-none text-slate-500`} onClick={clear}><X className="h-3.5 w-3.5" />Clear</button>}
            <button type="button" aria-label="Refresh" title="Refresh" className={`${btn} !px-2.5`} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="hidden grid-cols-[84px_minmax(0,1fr)_150px_140px_160px_36px] items-center gap-4 border-b border-[#edf1f7] bg-[#fafbfe] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid dark:border-white/[0.06] dark:bg-white/[0.02]">
            <span>Media</span><span>Post</span><span>Time</span><span>Status</span><span>Destinations</span><span className="sr-only">Actions</span>
          </div>
          {loading && !items.length ? <div className="divide-y divide-[#edf1f7] dark:divide-white/[0.06]">{[0, 1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}</div>
            : error && !items.length ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-50 dark:bg-rose-500/10"><AlertTriangle className="h-6 w-6 text-rose-500" /></span>
                <p className="text-[14px] font-bold">Couldn't load your posts</p>
                <p className="mt-1 text-[12.5px] text-slate-500">{error}</p>
                <button type="button" className={`${btn} mt-4`} onClick={() => void load()}><RefreshCw className="h-4 w-4" />Try again</button>
              </div>
            ) : !items.length ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 dark:bg-blue-500/10">{filtered ? <Search className="h-6 w-6 text-blue-600" /> : <CalendarDays className="h-6 w-6 text-blue-600" />}</span>
                <p className="text-[14px] font-bold">{filtered ? 'No posts match these filters' : 'Nothing scheduled yet'}</p>
                <p className="mx-auto mt-1 max-w-[380px] text-[12.5px] text-slate-500">{filtered ? 'Try a different search, platform or date range.' : 'Schedule posts from Batch Upload and they will show up here with their full history.'}</p>
                {filtered ? <button type="button" className={`${btn} mt-4`} onClick={clear}><X className="h-4 w-4" />Clear filters</button>
                  : <button type="button" className={`${btn} mt-4 ${primary}`} onClick={newPost}><Plus className="h-4 w-4" />Create a scheduled post</button>}
              </div>
            ) : groups.map((g) => (
              <section key={g.key + g.items[0].id} aria-label={g.label}>
                <div className="flex items-center gap-2 border-b border-[#edf1f7] bg-[#f8faff] px-4 py-1.5 text-[11.5px] font-bold text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-300">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />{g.label}<span className="font-medium text-slate-400">{'\u00b7'} {g.items.length}</span>
                </div>
                {g.items.map((it) => {
                  const menu: MenuItem[] = [
                    { label: it.actions.edit ? 'Edit' : 'View details', icon: it.actions.edit ? Pencil : Info, onClick: () => setOpen(it.id) },
                    ...(it.actions.retry ? [{ label: 'Retry failed', icon: RotateCcw, disabled: !!busy, onClick: () => void quick(it, 'retry', `/items/${it.id}/retry`, 'POST', 'Retry queued') }] : []),
                    { label: 'Duplicate', icon: Copy, disabled: !!busy, onClick: () => void quick(it, 'dup', `/items/${it.id}/duplicate`, 'POST', 'Copied as a new draft') },
                    { label: 'Audit history', icon: History, onClick: () => setOpen(it.id) },
                    ...(it.actions.cancel ? [{ label: 'Cancel post', icon: XCircle, danger: true, disabled: !!busy, onClick: () => { if (window.confirm('Cancel this scheduled post?')) void quick(it, 'cancel', `/items/${it.id}/cancel`, 'POST', 'Post cancelled'); } }] : []),
                    ...(it.actions.delete ? [{ label: 'Delete', icon: Trash2, danger: true, disabled: !!busy, onClick: () => { if (window.confirm('Delete this post? Its history stays in the audit log.')) void quick(it, 'del', `/items/${it.id}`, 'DELETE', 'Deleted'); } }] : []),
                  ];
                  const working = !!busy && busy.startsWith(`${it.id}:`);
                  const kebab = working ? <Loader2 className="m-2 h-4 w-4 animate-spin text-blue-600" /> : <Kebab items={menu} />;
                  return (
                    <div key={it.id} role="button" tabIndex={0} onClick={() => setOpen(it.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(it.id); } }}
                      className={`grid cursor-pointer grid-cols-[72px_minmax(0,1fr)_32px] items-start gap-x-3 gap-y-2.5 border-b border-[#edf1f7] px-3.5 py-3 last:border-b-0 hover:bg-[#f7faff] focus-visible:bg-[#f2f7ff] focus-visible:outline-none sm:px-4 lg:grid-cols-[84px_minmax(0,1fr)_150px_140px_160px_36px] lg:items-center lg:gap-4 dark:border-white/[0.06] dark:hover:bg-blue-500/[0.04] ${it.status === 'canceled' ? 'opacity-70' : ''}`}>
                      <Thumb it={it} cls="h-[56px] w-[72px] lg:h-[60px] lg:w-[84px]" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-900 dark:text-slate-100">{it.caption || <span className="italic text-slate-400">No caption</span>}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-500"><Layers className="h-3 w-3 shrink-0" /><span className="truncate">{it.batchName}</span></p>
                        {it.error && it.status === 'failed' && <p className="mt-0.5 truncate text-[11.5px] text-rose-600 dark:text-rose-300" title={it.error}>{it.error}</p>}
                      </div>
                      <div className="lg:hidden">{kebab}</div>
                      <div className="col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:hidden">
                        <StatusBadge s={it.status} />
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 dark:text-slate-300"><Clock className="h-3.5 w-3.5 text-slate-400" />{it.scheduledAt ? `${fmtTime(it.scheduledAt)} \u00b7 ${fmtRel(it.scheduledAt)}` : 'Not scheduled'}</span>
                        <span className="ml-auto flex gap-1">{it.deliveries.map((d) => <DestIcon key={d.id} d={d} />)}</span>
                      </div>
                      <div className="hidden text-[12px] lg:block">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{it.scheduledAt ? fmtTime(it.scheduledAt) : '\u2014'}</div>
                        {it.scheduledAt && <div className="text-[11.5px] text-slate-500" title={fmtLocal(it.scheduledAt)}>{fmtRel(it.scheduledAt)}</div>}
                      </div>
                      <div className="hidden lg:block"><StatusBadge s={it.status} /></div>
                      <div className="hidden flex-wrap gap-1.5 lg:flex">{it.deliveries.length ? it.deliveries.map((d) => <DestIcon key={d.id} d={d} />) : <span className="text-[11.5px] text-slate-400">None</span>}</div>
                      <div className="hidden justify-end lg:flex">{kebab}</div>
                    </div>
                  );
                })}
              </section>
            ))}
          {total > PAGE && (
            <div className="flex items-center justify-between border-t border-[#edf1f7] px-4 py-2.5 text-[12px] dark:border-white/[0.06]">
              <span className="text-slate-500">{(page - 1) * PAGE + 1}{'\u2013'}{Math.min(total, page * PAGE)} of {total}</span>
              <div className="flex gap-1.5"><button type="button" className={btnSm} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><button type="button" className={btnSm} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button></div>
            </div>
          )}
        </div>
        </>}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 sm:hidden" onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Filters" className="w-full space-y-3 rounded-t-[20px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] dark:bg-[#12151f]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-200 dark:bg-white/15" />
            <div className="flex items-center"><p className="text-[15px] font-bold">Filters</p><button type="button" aria-label="Close" className={`ml-auto grid h-8 w-8 place-items-center rounded-lg ${ring}`} onClick={() => setSheet(false)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-3">{filterFields}</div>
            <div className="flex gap-2 pt-1"><button type="button" className={`${btn} flex-1`} onClick={clear}>Clear all</button><button type="button" className={`${btn} flex-1 ${primary}`} onClick={() => setSheet(false)}>Show {total} posts</button></div>
          </div>
        </div>
      )}
      {open && <Drawer token={token} id={open} onClose={closeDrawer} onChanged={() => { void load(true); setBump((n) => n + 1); }} />}
    </div>
  );
}