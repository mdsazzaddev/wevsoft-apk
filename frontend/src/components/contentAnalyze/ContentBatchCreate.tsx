/**
 * /studio/content?view=batch-create — "Batch Upload".
 *
 * Upload many photos/videos, edit each post, reorder them, then publish now (in order) or schedule
 * them all with a fixed spacing. Persistence + publishing reuse the real Creator Batch backend
 * (creator-batch-routes.ts → ContentBatch / ContentBatchItem → scheduled Post rows that the post
 * scheduler publishes) and the app's real media upload (/api/media/upload).
 *
 * Destinations = WebSoft + the accounts the user connected (Facebook Pages, YouTube channels, …) via
 * the "Connect platform" flow (SocialDestinations.tsx → /api/social). Each external destination gets
 * its own publish job and status (modules/social-publishing); unsupported ones say "coming soon".
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDownUp, ArrowUpDown, BadgeCheck, Bell, CalendarDays, Check, ChevronDown, ChevronUp, Clock, Copy, Eye, EyeOff, Forward,
  Image as ImageIcon, LayoutGrid, Layers, List, Loader2, Lock, Maximize2, Menu as MenuIcon, MessageSquare, Moon, MoreHorizontal,
  Crosshair, History, MoreVertical, Pencil, Play, Plus, Save, Search, Send, Settings, Sun, ThumbsUp, Trash2, Type, UploadCloud, Users, X,
} from 'lucide-react';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';
import { resolveAvatarUrl } from '../UserAvatar';
import WevsoftMark from '../auth/WevsoftMark';
import { NO_TARGETING, targetingPayload, valueFromServer, type TargetingValue } from '../../lib/postTargeting';
import { cleanFacebook, cleanLinkedIn, sameJson, type FacebookAudience, type LinkedInAudience, type LinkedInVisibility } from '../../lib/platformAudience';
import { AccountDestinations, Brand, ConnectPlatformsModal } from './SocialDestinations';
import { BatchAudiencePanel, PostAudienceButton, type AudienceValue } from './AudiencePanel';
import { YouTubeSettingsCard, compactYt, mergeYt, probeVideo, stripYtAudience, type YouTubeOpts, type YtPrivacy } from './YouTubeSettings';
import { setDefaultConnection, useSocialConnections, type SocialConnection, type SocialDelivery } from '../../lib/socialConnections';
import { batchFetch, fromLocalInput, toLocalInput, uploadBatchMedia } from '../creator/batch/batchApi';

type Privacy = 'public' | 'friends' | 'followers' | 'private';
type ServerStatus = 'uploading' | 'upload_failed' | 'draft' | 'scheduled' | 'processing' | 'published' | 'failed' | 'canceled';
type ViewStatus = 'uploading' | 'upload_failed' | 'draft' | 'ready' | 'scheduled' | 'processing' | 'published' | 'failed' | 'canceled';

interface Row {
  key: string;
  id?: string;
  file?: File;
  size: number;
  localUrl?: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  duration?: number | null;
  caption: string;
  tags: string[];
  privacy: Privacy;
  /** Audience targeting (restriction or feed preference). */
  tg: TargetingValue;
  platforms: string[];
  /** Connected-account destinations (SocialConnection ids). */
  dest: string[];
  /** Per-destination publish status from the server. */
  deliveries: SocialDelivery[];
  scheduledAt: string | null;
  status: ServerStatus;
  error?: string | null;
  /** Per-post YouTube settings (override on top of the batch defaults). */
  yt?: YouTubeOpts | null;
  /** undefined = follow the batch Facebook audience. null = no Facebook limit on this post. */
  fb?: FacebookAudience | null;
  /** undefined = follow the batch LinkedIn audience. */
  li?: LinkedInAudience | null;
  /** Video size + length for the Shorts badge (undefined = not probed yet, null = probing / unknown). */
  dims?: { width: number; height: number; durationSec: number } | null;
}

const PRIVACY: { id: Privacy; label: string; icon: React.ElementType }[] = [
  { id: 'public', label: 'Public', icon: Users },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'private', label: 'Only me', icon: Lock },
];
const SPACINGS = [5, 10, 15, 30, 60, 120, 240, 1440];
const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_ITEMS = 100;
const CAPTION_MAX = 5000;
const PAGE = 4;
const LS_KEY = 'wev.batchCreate.lastBatchId';
function batchStorageKey(spaceId: string | null) {
  return spaceId ? `${LS_KEY}:${spaceId}` : LS_KEY;
}

const BADGE: Record<ViewStatus, { label: string; cls: string; dot: string }> = {
  uploading: { label: 'Uploading', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', dot: 'bg-sky-500' },
  upload_failed: { label: 'Upload failed', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300', dot: 'bg-rose-500' },
  draft: { label: 'Draft', cls: 'bg-[#eef1f6] text-slate-600 dark:bg-white/10 dark:text-slate-300', dot: 'bg-slate-400' },
  ready: { label: 'Ready', cls: 'bg-[#e8f8ee] text-[#167a3e] dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-500' },
  scheduled: { label: 'Scheduled', cls: 'bg-[#f1e9ff] text-[#7a3fd6] dark:bg-violet-500/10 dark:text-violet-300', dot: 'bg-violet-500' },
  processing: { label: 'Publishing', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', dot: 'bg-amber-500' },
  published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-600' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300', dot: 'bg-rose-500' },
  canceled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', dot: 'bg-slate-300' },
};

let seq = 0;
const newKey = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const isEditable = (r: Row) => r.status !== 'published' && r.status !== 'processing';
const fmtSize = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 0 ? `${Math.max(1, Math.round(b / 1e3))} KB` : '0 MB');
const fmtDur = (s?: number | null) => (s && Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/(\d{4}), /, '$1 ') : '';

function splitTags(caption: string): { text: string; tags: string[] } {
  // A trailing hashtag line becomes chips; inline hashtags stay in the text.
  const m = caption.match(/(?:\n|^)((?:#[\p{L}\p{N}_]+\s*)+)$/u);
  if (!m) return { text: caption, tags: [] };
  return { text: caption.slice(0, m.index).trimEnd(), tags: m[1].trim().split(/\s+/).map((t) => t.replace(/^#/, '')) };
}
const joinCaption = (r: Pick<Row, 'caption' | 'tags'>) => [r.caption.trim(), r.tags.length ? r.tags.map((t) => `#${t}`).join(' ') : ''].filter(Boolean).join('\n');
const cleanTag = (t: string) => t.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 40);

function viewStatus(r: Row): ViewStatus {
  if (r.status === 'scheduled' && r.scheduledAt && new Date(r.scheduledAt).getTime() <= Date.now()) return 'processing';
  if (r.status === 'draft' && (r.caption.trim() || r.mediaUrl) && r.scheduledAt && (r.platforms.includes('wevsoft') || r.dest.length > 0)) return 'ready';
  return r.status;
}

function ytAud(o: YouTubeOpts | null | undefined): { privacy: YtPrivacy; madeForKids: boolean } {
  return { privacy: o?.privacy || 'public', madeForKids: !!o?.madeForKids };
}

/** Shared audience becomes the batch default; posts that differ keep an override. */
function rowsFromBatch(items: any[], batchPrivacy: string, batchPlatforms: string[]) {
  if (!items.length) return { rows: [] as Row[], bulkFb: undefined, bulkLi: undefined, bulkYtAud: undefined, bulkTg: undefined };
  const rows = items.map((it) => rowFromItem(it, batchPrivacy, batchPlatforms));
  const fbVals = items.map((it) => cleanFacebook(it.platformOptions?.facebook));
  const fbShared = fbVals.every((v) => sameJson(v, fbVals[0] ?? null));
  const liVals = items.map((it) => cleanLinkedIn(it.platformOptions?.linkedin));
  const liShared = liVals.every((v) => sameJson(v, liVals[0] ?? null));
  const withYt = items.map((it) => it.platformOptions?.youtube as YouTubeOpts | null).filter(Boolean);
  const auds = withYt.map((yt) => ytAud(yt));
  const ytShared = !auds.length || auds.every((a) => a.privacy === auds[0].privacy && a.madeForKids === auds[0].madeForKids);
  const tgShared = rows.every((r) => sameJson(targetingPayload(r.tg), targetingPayload(rows[0].tg)));
  return {
    rows: rows.map((row, i) => ({ ...row, fb: fbShared ? undefined : fbVals[i], li: liShared ? undefined : liVals[i], yt: ytShared ? stripYtAudience(row.yt) : row.yt })),
    bulkFb: fbShared ? (fbVals[0] ?? null) : undefined,
    bulkLi: liShared ? (liVals[0] ?? null) : undefined,
    bulkYtAud: withYt.length && ytShared ? auds[0] : undefined,
    bulkTg: tgShared ? rows[0].tg : undefined,
  };
}

function rowFromItem(it: any, batchPrivacy: string, batchPlatforms: string[]): Row {
  const { text, tags } = splitTags(it.caption || '');
  return {
    key: it.id, id: it.id, size: 0, mediaUrl: it.mediaUrl, mediaType: it.mediaType === 'video' ? 'video' : it.mediaUrl ? 'image' : null,
    caption: text, tags, privacy: (it.privacy || batchPrivacy || 'public') as Privacy, platforms: it.platforms || batchPlatforms || ['wevsoft'], tg: valueFromServer(it.targeting, it.feedTargeting),
    dest: Array.isArray(it.destinations) ? it.destinations : [], deliveries: Array.isArray(it.deliveries) ? it.deliveries : [],
    scheduledAt: it.scheduledAt, status: it.status, error: it.error, yt: it.platformOptions?.youtube || null,
  };
}

function videoDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => resolve(null);
    v.src = url;
  });
}

/** Sequential times: each draft `spacing` minutes after the previous one, never in the past. */
function sequenceTimes(rows: Row[], spacingMin: number, onlyMissing: boolean, start?: number): Row[] {
  const gap = spacingMin * 60000;
  let next = Math.max(start ?? 0, Date.now() + gap);
  return rows.map((r) => {
    if (!isEditable(r) || r.status === 'scheduled') return r;
    const cur = r.scheduledAt ? new Date(r.scheduledAt).getTime() : NaN;
    if (onlyMissing && Number.isFinite(cur) && cur > Date.now() + 60000) { next = Math.max(next, cur + gap); return r; }
    const at = next; next += gap;
    return { ...r, scheduledAt: new Date(at).toISOString() };
  });
}

// ── Brand marks (destinations) ─────────────────────────────────────────────────

const card = 'rounded-[14px] border border-[#e4e9f2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)] dark:border-white/[0.08] dark:bg-white/[0.03]';
const btn = 'inline-flex h-9 whitespace-nowrap items-center justify-center gap-2 rounded-[10px] border border-[#dfe5ee] bg-white px-3.5 text-[12.5px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]';
const btnSm = 'inline-flex h-[26px] items-center justify-center gap-1.5 rounded-[8px] border border-[#dfe5ee] bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300';
const field = 'h-8 rounded-[9px] border border-[#dfe5ee] bg-white px-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
const lbl = 'mb-[3px] block text-[11px] font-semibold text-slate-800 dark:text-slate-300';
const menuItem = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/5';
const vdiv = 'hidden w-px self-stretch bg-[#e4e9f2] sm:block dark:bg-white/10';

function Badge({ s }: { s: ViewStatus }) {
  const b = BADGE[s];
  return <span className={`inline-flex h-[15px] items-center gap-0.5 whitespace-nowrap rounded-full px-1 text-[9px] font-semibold ${b.cls}`}><span className={`h-1 w-1 rounded-full ${b.dot}`} />{b.label}</span>;
}

function TagChips({ tags, onRemove, onAdd, disabled, tone = 'blue' }: { tags: string[]; onRemove: (t: string) => void; onAdd: (t: string) => void; disabled?: boolean; tone?: 'blue' | 'gray' }) {
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState('');
  const commit = () => { v.split(/[\s,]+/).map(cleanTag).filter(Boolean).forEach(onAdd); setV(''); setAdding(false); };
  const chip = tone === 'blue' ? 'bg-[#eef3ff] text-[#2d55c8] dark:bg-blue-500/10 dark:text-blue-300' : 'bg-[#eef1f6] text-slate-700 dark:bg-white/10 dark:text-slate-200';
  const h = tone === 'blue' ? 'h-[19px] text-[9.5px]' : 'h-6 text-[11px]';
  return (
    <div className="flex flex-wrap items-center gap-[5px]">
      {tags.map((t) => (
        <span key={t} className={`group inline-flex items-center gap-1 rounded-full px-[7px] font-medium ${h} ${chip}`}>
          #{t}
          {!disabled && <button type="button" aria-label={`Remove #${t}`} onClick={() => onRemove(t)} className="hidden text-slate-400 hover:text-rose-500 group-hover:inline"><X className="h-2.5 w-2.5" /></button>}
        </span>
      ))}
      {!disabled && (adding ? (
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setV(''); setAdding(false); } }}
          placeholder="tag" className={`${h} w-20 rounded-full border border-blue-400 bg-white px-2 outline-none dark:bg-transparent`} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`inline-flex items-center gap-1 rounded-full px-3 font-medium text-[#2d55c8] hover:brightness-95 ${h} ${tone === 'blue' ? 'bg-[#eef3ff] dark:bg-blue-500/10' : 'bg-[#eef3ff] dark:bg-blue-500/10'}`}><Plus className="h-2.5 w-2.5" />Add</button>
      ))}
    </div>
  );
}

function Menu({ trigger, children, align = 'right' }: { trigger: (toggle: () => void) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger(() => setOpen((o) => !o))}
      {open && <div className={`absolute top-full z-40 mt-1.5 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 text-[12.5px] shadow-xl dark:border-white/10 dark:bg-[#151823] ${align === 'left' ? 'left-0' : 'right-0'}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

/** Styled date/time button over a native datetime-local input (opens the native picker). */
function WhenField({ value, onChange, disabled }: { value: string | null; onChange: (v: string | null) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => { const el = ref.current; if (!el || disabled) return; try { el.showPicker(); } catch { el.focus(); } };
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={open} className={`${field} !h-[26px] flex w-full items-center gap-1 !rounded-[7px] !px-1.5 text-left !text-[10px] disabled:cursor-not-allowed`}>
        <CalendarDays className="h-3 w-3 shrink-0 text-slate-600 dark:text-slate-300" />
        <span className={`flex-1 truncate ${value ? '' : 'text-slate-400'}`}>{value ? fmtWhen(value) : 'Set date & time'}</span>
        <Clock className="h-3 w-3 shrink-0 text-slate-500" />
      </button>
      {/* eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior) */}
      <input ref={ref} id={`schedule-${Math.random().toString(36).slice(2, 7)}`} name="scheduledAt" type="datetime-local" tabIndex={-1} aria-label="Schedule" value={toLocalInput(value)} disabled={disabled} onChange={(e) => onChange(fromLocalInput(e.target.value))} className="pointer-events-none absolute inset-0 opacity-0" />
    </div>
  );
}

function Select<T extends string | number>({ value, onChange, options, icon: Icon, className = '', disabled, small }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; icon?: React.ElementType; className?: string; disabled?: boolean; small?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 ${small ? 'left-2 h-3.5 w-3.5' : 'left-2.5 h-4 w-4'}`} />}
      <select disabled={disabled} value={value} onChange={(e) => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}
        className={`${field} w-full appearance-none ${Icon ? (small ? '!pl-[25px]' : '!pl-9') : ''} ${small ? '!pr-5 !text-[10.5px]' : '!pr-7'}`}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
    </div>
  );
}

function CheckFilled({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="11" fill="#16a34a" /><path d="m7 12.3 3.3 3.2L17.2 8.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function WarnFilled() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0"><path d="M10.3 3.2a2 2 0 0 1 3.4 0l8.4 14.6a2 2 0 0 1-1.7 3H3.6a2 2 0 0 1-1.7-3z" fill="#f97316" /><path d="M12 9v4.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="17" r="1.3" fill="#fff" /></svg>;
}

function GlobeSmall() { return <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" /></svg>; }

function PostCard({ r, avatar, name, verified, seeMore, setSeeMore, big }: { r: Row; avatar: string | null; name: string; verified: boolean; seeMore: boolean; setSeeMore: (v: boolean) => void; big?: boolean }) {
  const P = PRIVACY.find((p) => p.id === r.privacy) || PRIVACY[0];
  const text = joinCaption(r);
  const long = text.length > 90 || text.split('\n').length > 2;
  const src = r.localUrl || r.mediaUrl;
  const when = r.status === 'published' ? 'Published' : r.scheduledAt ? fmtWhen(r.scheduledAt) : 'Just now';
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#e4e9f2] bg-white dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2.5 px-3 pt-3">
        {avatar ? <img src={avatar} alt="" className="h-[42px] w-[42px] rounded-full object-cover" /> : <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{name[0]?.toUpperCase()}</span>}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1 text-[13.5px] font-bold text-slate-900 dark:text-white">{name}{verified && <BadgeCheck className="h-[15px] w-[15px] fill-blue-600 text-white" />}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">{r.privacy === 'public' ? <GlobeSmall /> : <P.icon className="h-3 w-3" />}{P.label} • {when}</div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-slate-700 dark:text-slate-300" />
      </div>
      {text ? (
        <div className="px-3 pb-2 pt-2.5 text-[12px] leading-[1.45] text-slate-900 dark:text-slate-100">
          <p className={`whitespace-pre-wrap ${!seeMore && long && !big ? 'line-clamp-2' : ''}`}>{text}</p>
          {long && !big && <button type="button" onClick={() => setSeeMore(!seeMore)} className="text-[11.5px] font-medium text-slate-600 dark:text-slate-400">… {seeMore ? 'See less' : 'See more'}</button>}
        </div>
      ) : <div className="h-2" />}
      {src && (
        <div className="px-3">
          {r.mediaType === 'video'
            ? <video src={src} controls muted playsInline className={`w-full rounded-[8px] bg-black object-cover ${big ? 'max-h-[60vh]' : 'aspect-[3/2]'}`} />
            : <img src={src} alt="" className={`w-full rounded-[8px] object-cover ${big ? 'max-h-[60vh]' : 'aspect-[3/2]'}`} />}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-[#edf1f7] px-3 py-2 text-[11px] text-slate-500 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Target:</span>
          {r.platforms.includes('wevsoft') && <Brand id="wevsoft" size={14} />}
          {r.dest.map((d) => <Brand key={d} id={d} size={14} />)}
        </div>
        <span className="capitalize text-[10.5px] font-medium text-slate-400">{r.mediaType || 'Text'} post</span>
      </div>
    </div>
  );
}

function BatchEditModal({ count, mode, setMode, tags, privacy, platforms, onClose, onApply }: { count: number; mode: 'replace' | 'append'; setMode: (m: 'replace' | 'append') => void; tags: string[]; privacy: Privacy; platforms: string[]; onClose: () => void; onApply: (caption: string) => void }) {
  const [caption, setCaption] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-[#151823]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center text-[15px] font-bold">Batch edit<button type="button" aria-label="Close" className="ml-auto" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <p className="mb-3 text-[12px] text-slate-500">Applies to {count} {count === 1 ? 'post' : 'posts'} (selected, or all if none are selected). Published posts are skipped.</p>
        <span className={lbl}>Caption</span>
        <div className="mb-2 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/[0.03]">{(['replace', 'append'] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`h-7 rounded-lg px-3 text-[12px] font-semibold capitalize ${mode === m ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}>{m}</button>)}</div>
        <textarea id="batch-edit-caption" name="batchCaption" value={caption} maxLength={CAPTION_MAX} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Leave empty to keep each caption" className="mb-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04]" />
        <ul className="mb-3 space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
          <li>Hashtags added: {tags.length ? tags.map((t) => `#${t}`).join(' ') : <span className="text-slate-400">none</span>}</li>
          <li>Audience: {PRIVACY.find((p) => p.id === privacy)?.label}</li>
          <li className="flex items-center gap-1">Platforms: {platforms.map((p) => <Brand key={p} id={p} size={16} />)}</li>
        </ul>
        <p className="mb-3 text-[11px] text-slate-400">Hashtags, audience and platforms come from the batch settings row.</p>
        <div className="flex justify-end gap-2"><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={`${btn} !border-blue-600 !bg-blue-600 !text-white hover:!bg-blue-700`} onClick={() => onApply(caption)}>Apply</button></div>
      </div>
    </div>
  );
}

export default function ContentBatchCreate() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const token = useStore((s: any) => s.token) as string | null;
  const user = useStore((s: any) => s.user);
  const social = useSocialConnections(token);
  const [connectOpen, setConnectOpen] = useState(() => params.get('connect') === '1');
  // Inbox / home "Reconnect accounts" lands here — this is the only in-app connect UI.
  useEffect(() => {
    if (params.get('connect') !== '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    setConnectOpen(true);
    const next = new URLSearchParams(params);
    next.delete('connect');
    setParams(next, { replace: true });
  }, [params, setParams]);
  // Default destinations = accounts starred as default, until the user picks for this batch.
  const [bulkDestPick, setBulkDest] = useState<string[] | null>(null);
  const bulkDest = bulkDestPick ?? social.usable.filter((c) => c.isDefault).map((c) => c.id);
  const usableIds = new Set(social.usable.map((c) => c.id));
  const toggleDefault = (c: SocialConnection) => {
    void setDefaultConnection(token, c.id, !c.isDefault).then(() => social.reload()).catch((e: Error) => toast.error(e.message));
  };

  const storageKey = batchStorageKey(params.get('space'));
  const [batchId, setBatchId] = useState<string | null>(() => params.get('id') || (params.get('new') ? null : localStorage.getItem(storageKey)));
  /** After schedule / publish: a success card with "Create another" instead of a dead end. */
  const [done, setDone] = useState<{ action: 'schedule' | 'publish_now'; count: number; first: string | null } | null>(null);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'serial' | 'schedule' | 'status'>('serial');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Set<ViewStatus>>(new Set());
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [shown, setShown] = useState(PAGE);
  const [captionMode, setCaptionMode] = useState<'replace' | 'append'>('replace');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [spacing, setSpacing] = useState(15);
  /** Schedule switch: off = every post goes out right away (Publish now), times are ignored. */
  const [scheduleOn, setScheduleOn] = useState(true);
  /** Batch-level YouTube defaults (each post can override). */
  const [bulkYt, setBulkYt] = useState<YouTubeOpts | null>(null);
  /** Batch Facebook / LinkedIn audience. Posts with `fb` / `li` set override these. */
  const [bulkFb, setBulkFb] = useState<FacebookAudience | null>(null);
  const [bulkLi, setBulkLi] = useState<LinkedInAudience | null>(null);
  const [studioTab, setStudioTab] = useState<'title' | 'audience'>('title');
  const ytConnIds = new Set(social.usable.filter((c) => c.platform === 'youtube').map((c) => c.id));
  // Batch posts are always Public; who sees them is narrowed with targeting.
  const [bulkPrivacy] = useState<Privacy>('public');
  const [bulkTg, setBulkTg] = useState<TargetingValue>(NO_TARGETING);
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>(['wevsoft']);
  const [editOpen, setEditOpen] = useState(false);
  const [previewBig, setPreviewBig] = useState(false);
  const [showPreview, setShowPreview] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wev.batchCreate.showPreview');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const togglePreview = () => {
    setShowPreview((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wev.batchCreate.showPreview', String(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  /** Global batch title / caption that applies across all posts by default */
  const [globalTitle, setGlobalTitle] = useState('');
  /** Track keys of posts that the creator specifically customized */
  const [customizedKeys, setCustomizedKeys] = useState<Set<string>>(new Set());

  const handleGlobalTitleChange = (val: string) => {
    setGlobalTitle(val);
    setName((prev) => (!prev.trim() || prev === globalTitle ? val.slice(0, 120) : prev));
    setRows((rs) =>
      rs.map((r) => {
        if (!isEditable(r)) return r;
        // Update if post is not customized, or its caption matched the prior global title, or was empty
        if (!customizedKeys.has(r.key) || r.caption === globalTitle || !r.caption.trim()) {
          return { ...r, caption: val.slice(0, CAPTION_MAX) };
        }
        return r;
      })
    );
  };

  const applyTitleToAll = (val: string) => {
    if (!val.trim()) return;
    setRows((rs) =>
      rs.map((r) => (isEditable(r) ? { ...r, caption: val.slice(0, CAPTION_MAX) } : r))
    );
    setCustomizedKeys(new Set());
    toast.success(`Title applied to all ${rows.length} post${rows.length === 1 ? '' : 's'}`);
  };

  const [seeMore, setSeeMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);

  const patch = useCallback((key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r))), []);
  const toggleSel = (key: string) => setSel((p) => { const c = new Set(p); if (c.has(key)) c.delete(key); else c.add(key); return c; });

  const load = useCallback(async (id: string, quiet = false) => {
    try {
      const r = await batchFetch<{ batch: any }>(token, `/${id}`);
      setName(r.batch.name);
      const built = rowsFromBatch(r.batch.items, r.batch.privacy, r.batch.platforms);
      if (built.bulkFb !== undefined) setBulkFb(built.bulkFb);
      if (built.bulkLi !== undefined) setBulkLi(built.bulkLi);
      if (built.bulkTg) setBulkTg(built.bulkTg);
      if (built.bulkYtAud) {
        const a = built.bulkYtAud;
        setBulkYt((prev) => {
          const next: YouTubeOpts = { ...(prev || {}) };
          if (a.privacy === 'public') delete next.privacy; else next.privacy = a.privacy;
          if (a.madeForKids) next.madeForKids = true; else delete next.madeForKids;
          return compactYt(next);
        });
      }
      setRows((prev) => {
        const keep = new Map(prev.filter((p) => p.id).map((p) => [p.id, { size: p.size, localUrl: p.localUrl, duration: p.duration }]));
        const fresh = built.rows.map((row) => ({ ...row, ...(row.id ? keep.get(row.id) || {} : {}) }));
        return [...fresh, ...prev.filter((p) => !p.id && (p.status === 'uploading' || p.status === 'upload_failed'))];
      });
      if (Array.isArray(r.batch.items) && r.batch.items.length > 0) {
        const firstCap = r.batch.items[0]?.caption || '';
        const allSame = r.batch.items.every((it: any) => (it.caption || '') === firstCap);
        if (allSame && firstCap) {
          setGlobalTitle(firstCap);
          setCustomizedKeys(new Set());
        }
      }
      localStorage.setItem(storageKey, id);
    } catch (e: any) {
      if (/not found|404/i.test(String(e?.message))) { localStorage.removeItem(storageKey); setBatchId(null); }
      if (!quiet) toast.error(e.message);
    }
  }, [token, storageKey]);
  useEffect(() => { if (!batchId) return; const t = setTimeout(() => void load(batchId), 0); return () => clearTimeout(t); }, [batchId, load]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i); }, []);
  // Probe video size / length once per row (Shorts badge in YouTube settings).
  useEffect(() => {
    for (const r of rows) {
      if (r.mediaType !== 'video' || r.dims !== undefined) continue;
      const src = r.localUrl || r.mediaUrl;
      if (!src) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      patch(r.key, { dims: null });
      void probeVideo(src).then((d) => patch(r.key, { dims: d }));
    }
  }, [rows, patch]);

  const live = rows.some((r) => r.status === 'scheduled' && r.scheduledAt && new Date(r.scheduledAt).getTime() - now < 120000);
  useEffect(() => {
    if (!live || !batchId) return;
    const t = setInterval(() => void load(batchId, true), 10000);
    return () => clearInterval(t);
  }, [live, batchId, load]);

  const accepted = (f: File) => ACCEPT.split(',').includes(f.type) && f.size <= MAX_BYTES;
  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    const ok = files.filter(accepted);
    if (ok.length < files.length) toast.error(`${files.length - ok.length} file(s) skipped: unsupported type or over 100 MB`);
    const take = ok.slice(0, Math.max(0, MAX_ITEMS - rows.length));
    if (ok.length > take.length) toast.error(`A batch holds up to ${MAX_ITEMS} posts`);
    if (!take.length) return;
    const fresh: Row[] = take.map((f) => ({
      key: newKey(), file: f, size: f.size, localUrl: URL.createObjectURL(f), mediaUrl: null, mediaType: f.type.startsWith('video/') ? 'video' : 'image',
      caption: globalTitle || '', tags: [...bulkTags], privacy: bulkPrivacy, tg: bulkTg, platforms: [...bulkPlatforms], dest: [...bulkDest], deliveries: [], scheduledAt: null, status: 'uploading',
    }));
    setRows((rs) => [...rs, ...fresh]);
    setFocus((f) => f || fresh[0].key);
    fresh.forEach((r) => { if (r.mediaType === 'video' && r.localUrl) void videoDuration(r.localUrl).then((d) => patch(r.key, { duration: d })); });
    let i = 0;
    const worker = async () => {
      while (i < fresh.length) {
        const r = fresh[i++];
        try { const up = await uploadBatchMedia(token, r.file!); patch(r.key, { mediaUrl: up.url, mediaType: up.type, status: 'draft', error: null }); }
        catch (e: any) { patch(r.key, { status: 'upload_failed', error: e.message }); }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };
  const replaceMedia = async (key: string, f: File) => {
    if (!accepted(f)) { toast.error('Unsupported file or over 100 MB'); return; }
    const localUrl = URL.createObjectURL(f);
    const mediaType = f.type.startsWith('video/') ? 'video' : 'image';
    patch(key, { file: f, size: f.size, localUrl, mediaType, status: 'uploading', duration: null });
    if (mediaType === 'video') void videoDuration(localUrl).then((d) => patch(key, { duration: d }));
    try { const up = await uploadBatchMedia(token, f); patch(key, { mediaUrl: up.url, mediaType: up.type, status: 'draft', error: null }); }
    catch (e: any) { patch(key, { status: 'upload_failed', error: e.message }); }
  };

  const platformOptionsFor = (r: Row) => {
    const y = r.dest.some((d) => ytConnIds.has(d)) ? mergeYt(bulkYt, r.yt) : null;
    const fb = cleanFacebook(r.fb === undefined ? bulkFb : r.fb);
    const liRaw = r.li === undefined ? bulkLi : r.li;
    const li = liRaw?.visibility === 'CONNECTIONS' ? { visibility: 'CONNECTIONS' as const } : r.li?.visibility === 'PUBLIC' ? { visibility: 'PUBLIC' as const } : null;
    const out: { youtube?: YouTubeOpts; facebook?: FacebookAudience; linkedin?: LinkedInAudience } = {};
    if (y) out.youtube = y;
    if (fb) out.facebook = fb;
    if (li) out.linkedin = li;
    return Object.keys(out).length ? out : null;
  };
  const tgSig = (v: TargetingValue) => JSON.stringify(targetingPayload(v));
  const onBatchTg = (v: TargetingValue) => {
    const prev = tgSig(bulkTg);
    setBulkTg(v);
    setRows((rs) => rs.map((r) => (!isEditable(r) || tgSig(r.tg) !== prev ? r : { ...r, tg: v })));
  };
  const onBatchYt = (privacy: YtPrivacy, kids: boolean) => setBulkYt((prev) => {
    const next: YouTubeOpts = { ...(prev || {}) };
    if (privacy === 'public') delete next.privacy; else next.privacy = privacy;
    if (kids) next.madeForKids = true; else delete next.madeForKids;
    return compactYt(next);
  });
  const onBatchLi = (v: LinkedInVisibility) => setBulkLi(v === 'CONNECTIONS' ? { visibility: 'CONNECTIONS' } : null);
  const applyAudienceToAll = () => {
    const n = rows.filter(isEditable).length;
    setRows((rs) => rs.map((r) => (isEditable(r) ? { ...r, tg: bulkTg, fb: undefined, li: undefined, yt: stripYtAudience(r.yt) } : r)));
    toast.success(n ? `Audience applied to ${n} post${n === 1 ? '' : 's'}` : 'New posts will use this audience');
  };
  const onPostFb = (r: Row, v: FacebookAudience | null) => {
    const cleaned = cleanFacebook(v);
    patch(r.key, { fb: sameJson(cleaned, cleanFacebook(bulkFb)) ? undefined : cleaned });
  };
  const onPostLi = (r: Row, v: LinkedInVisibility) => {
    const bulkVis: LinkedInVisibility = bulkLi?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
    patch(r.key, { li: v === bulkVis ? undefined : { visibility: v } });
  };
  const onPostYt = (r: Row, privacy: YtPrivacy, kids: boolean) => {
    const same = (bulkYt?.privacy || 'public') === privacy && !!bulkYt?.madeForKids === kids;
    const next: YouTubeOpts = { ...(r.yt || {}) };
    if (same) { delete next.privacy; delete next.madeForKids; } else { next.privacy = privacy; next.madeForKids = kids; }
    patch(r.key, { yt: compactYt(next) });
  };
  const resetAud = (r: Row) => patch(r.key, { tg: bulkTg, fb: undefined, li: undefined, yt: stripYtAudience(r.yt) });
  const save = async (action: 'draft' | 'schedule' | 'publish_now' | 'unschedule', source: Row[] = rows) => {
    if (source.some((r) => r.status === 'uploading')) { toast.error('Wait for uploads to finish'); return; }
    const pending = source.filter((r) => r.status !== 'uploading' && r.status !== 'upload_failed' && r.status !== 'published');
    const items = pending.map((r) => ({ id: r.id, caption: joinCaption(r), mediaUrl: r.mediaUrl, mediaType: r.mediaType, scheduledAt: r.scheduledAt, privacy: r.privacy, ...targetingPayload(r.tg), platforms: r.platforms, destinations: r.dest.filter((d) => usableIds.has(d)), platformOptions: platformOptionsFor(r) }));
    if (!items.length && action !== 'unschedule') { toast.error('Add at least one post'); return; }
    if (action === 'schedule' || action === 'publish_now') {
      const empty = items.findIndex((i) => !i.caption && !i.mediaUrl);
      if (empty >= 0) { toast.error(`Post #${String(empty + 1).padStart(2, '0')} needs a caption or media`); return; }
      if (!items.some((i) => i.platforms.includes('wevsoft') || i.destinations.length)) { toast.error('Pick at least one destination: WebSoft or a connected account.'); return; }
    }
    if (action === 'schedule') {
      const bad = items.filter((i) => (i.platforms.includes('wevsoft') || i.destinations.length > 0) && (!i.scheduledAt || new Date(i.scheduledAt).getTime() < Date.now() + 60000)).length;
      if (bad) { toast.error(`${bad} post${bad === 1 ? ' has' : 's have'} no future time`); return; }
    }
    if (action === 'unschedule' && !batchId) return;
    setBusy(action);
    try {
      const body = action === 'unschedule' ? { action } : { ...(name.trim() ? { name: name.trim() } : {}), items, action, platforms: ['wevsoft'], privacy: bulkPrivacy, category: 'Batch upload' };
      const r = batchId
        ? await batchFetch<{ batch: any }>(token, `/${batchId}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await batchFetch<{ batch: any }>(token, '', { method: 'POST', body: JSON.stringify(body) });
      const id = r.batch.id as string;
      setBatchId(id);
      if (r.batch.name) setName(r.batch.name);
      localStorage.setItem(storageKey, id);
      const p = new URLSearchParams(params); p.set('view', 'batch-create'); p.set('id', id); setParams(p, { replace: true });
      const built = rowsFromBatch(r.batch.items, r.batch.privacy, r.batch.platforms);
      if (built.bulkFb !== undefined) setBulkFb(built.bulkFb);
      if (built.bulkLi !== undefined) setBulkLi(built.bulkLi);
      if (built.bulkTg) setBulkTg(built.bulkTg);
      if (built.bulkYtAud) {
        const a = built.bulkYtAud;
        setBulkYt((prev) => {
          const next: YouTubeOpts = { ...(prev || {}) };
          if (a.privacy === 'public') delete next.privacy; else next.privacy = a.privacy;
          if (a.madeForKids) next.madeForKids = true; else delete next.madeForKids;
          return compactYt(next);
        });
      }
      setRows([...built.rows, ...source.filter((x) => x.status === 'upload_failed')]);
      setSel(new Set());
      if (action === 'schedule' || action === 'publish_now') {
        const sch = (r.batch.items as any[]).filter((it) => it.status === 'scheduled');
        const first = sch.map((it) => it.scheduledAt).filter(Boolean).sort()[0] || null;
        setDone({ action, count: sch.length, first });
      } else setDone(null);
      toast.success(action === 'draft' ? 'Draft saved' : action === 'schedule' ? 'All posts scheduled' : action === 'publish_now' ? 'Publishing in order — posts go live within ~30 seconds' : 'Moved back to drafts');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const scheduleAll = () => { const next = sequenceTimes(rows, spacing, true); setRows(next); void save('schedule', next); };
  const publishNow = () => void save('publish_now');
  const newBatch = () => {
    setDone(null);
    localStorage.removeItem(storageKey); setBatchId(null); setRows([]); setSel(new Set()); setFocus(null);
    setName('');
    setGlobalTitle('');
    setCustomizedKeys(new Set());
    const p = new URLSearchParams(); p.set('view', 'batch-create'); setParams(p, { replace: true });
  };

  const move = (key: string, dir: number) => setRows((rs) => {
    const i = rs.findIndex((r) => r.key === key); const j = Math.min(rs.length - 1, Math.max(0, i + dir));
    if (i < 0 || i === j) return rs; const c = [...rs]; const [m] = c.splice(i, 1); c.splice(j, 0, m); return c;
  });
  const dropOn = (target: string) => setRows((rs) => {
    if (!dragKey || dragKey === target) return rs;
    const from = rs.findIndex((r) => r.key === dragKey); const to = rs.findIndex((r) => r.key === target);
    if (from < 0 || to < 0) return rs; const c = [...rs]; const [m] = c.splice(from, 1); c.splice(to, 0, m); return c;
  });
  const duplicate = (keys: string[]) => {
    if (rows.length + keys.length > MAX_ITEMS) { toast.error(`A batch holds up to ${MAX_ITEMS} posts`); return; }
    setRows((rs) => rs.flatMap((r) => (keys.includes(r.key) && r.status !== 'uploading'
      ? [r, { ...r, key: newKey(), id: undefined, status: r.status === 'upload_failed' ? 'upload_failed' : 'draft', scheduledAt: null } as Row]
      : [r])));
  };
  const remove = (keys: string[]) => { setRows((rs) => rs.filter((r) => !keys.includes(r.key) || r.status === 'published')); setSel(new Set()); };
  const applyBatchEdit = (caption: string) => {
    const targets = new Set(sel.size ? sel : rows.map((r) => r.key));
    setRows((rs) => rs.map((r) => {
      if (!targets.has(r.key) || !isEditable(r)) return r;
      const cap = caption.trim() ? (captionMode === 'replace' ? caption.trim() : [r.caption.trim(), caption.trim()].filter(Boolean).join('\n')) : r.caption;
      return { ...r, caption: cap.slice(0, CAPTION_MAX), tags: Array.from(new Set([...r.tags, ...bulkTags])), privacy: bulkPrivacy, tg: bulkTg.t ? bulkTg : r.tg, platforms: [...bulkPlatforms], dest: [...bulkDest] };
    }));
    toast.success(`Applied to ${targets.size} post${targets.size === 1 ? '' : 's'}`);
    setEditOpen(false);
  };
  const resequence = () => {
    const first = rows.map((r) => (r.status !== 'scheduled' && r.scheduledAt ? new Date(r.scheduledAt).getTime() : NaN)).find((t) => Number.isFinite(t) && t > Date.now());
    setRows((rs) => sequenceTimes(rs, spacing, false, first));
    toast.success(`Draft times re-spaced every ${spacing} minutes in serial order`);
  };

  const serial = useMemo(() => new Map(rows.map((r, i) => [r.key, i + 1])), [rows]);
  const counts = useMemo(() => { const c: Partial<Record<ViewStatus, number>> = {}; rows.forEach((r) => { const s = viewStatus(r); c[s] = (c[s] || 0) + 1; }); return c; }, [rows]);
  const published = counts.published || 0;
  const queued = (counts.scheduled || 0) + (counts.processing || 0);
  const pct = rows.length ? Math.round((published / rows.length) * 100) : 0;
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => (!needle || joinCaption(r).toLowerCase().includes(needle)) && (!statusFilter.size || statusFilter.has(viewStatus(r))));
    if (sortBy !== 'serial' || !sortAsc) {
      const rank: ViewStatus[] = ['upload_failed', 'uploading', 'draft', 'ready', 'scheduled', 'processing', 'published', 'failed'];
      const t = (r: Row) => (r.scheduledAt ? new Date(r.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER);
      list = [...list].sort((a, b) => {
        const d = sortBy === 'serial' ? serial.get(a.key)! - serial.get(b.key)! : sortBy === 'schedule' ? t(a) - t(b) : rank.indexOf(viewStatus(a)) - rank.indexOf(viewStatus(b));
        return sortAsc ? d : -d;
      });
    }
    return list;
  }, [rows, q, statusFilter, sortBy, sortAsc, serial]);
  const canDrag = sortBy === 'serial' && sortAsc && !q && !statusFilter.size;
  const focused = rows.find((r) => r.key === focus) || rows[0] || null;
  const totalSize = rows.reduce((n, r) => n + (r.size || 0), 0);
  const allChecked = visible.length > 0 && visible.every((r) => sel.has(r.key));
  const noSchedule = rows.filter((r) => r.status !== 'published' && !r.scheduledAt).length;
  const audCustomCount = rows.filter((r) => tgSig(r.tg) !== tgSig(bulkTg) || r.fb !== undefined || r.li !== undefined || r.yt?.privacy !== undefined || r.yt?.madeForKids !== undefined).length;
  const activePlatforms = useMemo(() => {
    const ids = new Set<string>();
    if (rows.some((r) => r.platforms.includes('wevsoft')) || bulkPlatforms.includes('wevsoft')) ids.add('wevsoft');
    const byId = new Map(social.usable.map((c) => [c.id, c.platform]));
    for (const id of [...bulkDest, ...rows.flatMap((r) => r.dest)]) { const p = byId.get(id); if (p) ids.add(p); }
    return ids;
  }, [rows, bulkPlatforms, bulkDest, social.usable]);
  const batchAudience: AudienceValue = {
    tg: bulkTg,
    fb: bulkFb,
    ytPrivacy: bulkYt?.privacy || 'public',
    ytKids: !!bulkYt?.madeForKids,
    li: bulkLi?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
  };
  const checklist = [
    { label: 'All required fields are filled', ok: rows.length > 0 && rows.every((r) => r.caption.trim() || r.mediaUrl) },
    { label: `Media files are valid (${rows.filter((r) => r.mediaUrl).length}/${rows.length})`, ok: rows.length > 0 && rows.every((r) => r.status !== 'upload_failed' && r.status !== 'uploading') },
    { label: 'Schedule times are set', ok: rows.length > 0 && noSchedule === 0 },
    { label: `Destinations are selected (${rows.filter((r) => r.platforms.includes('wevsoft') || r.dest.length).length})`, ok: rows.length > 0 && rows.every((r) => r.platforms.includes('wevsoft') || r.dest.length > 0) },
  ];
  const avatar = resolveAvatarUrl(user?.avatar) || user?.avatar || null;
  const userName: string = user?.name || user?.username || 'You';
  const verified = !!(user?.isVerified || user?.verified);
  const busyAny = !!busy;
  const pickReplace = (key: string) => { replaceKey.current = key; replaceRef.current?.click(); };
  const theme = useStore((s: any) => s.theme) as string | undefined;
  const setTheme = useStore((s: any) => s.setTheme) as ((t: string) => void) | undefined;
  const isDark = /dark|oled/i.test(theme || '');
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!token) return;
    fetch('/api/notifications?limit=1', { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null))
      .then((r) => setUnread(Number(r?.unread ?? r?.unreadCount ?? 0) || 0)).catch(() => {});
  }, [token]);
  // Saved items carry no size/duration: read them from the media itself (HEAD content-length, video metadata).
  const enrichKey = rows.filter((r) => r.mediaUrl && !r.file).map((r) => r.key + r.mediaUrl).join('|');
  useEffect(() => {
    let dead = false;
    rows.forEach((r) => {
      if (!r.mediaUrl || r.file) return;
      if (!r.size) fetch(r.mediaUrl, { method: 'HEAD' }).then((res) => { const n = Number(res.headers.get('content-length')) || 0; if (n && !dead) patch(r.key, { size: n }); }).catch(() => {});
      if (r.mediaType === 'video' && r.duration == null) void videoDuration(r.mediaUrl).then((d) => { if (!dead) patch(r.key, { duration: d }); });
    });
    return () => { dead = true; };
  }, [enrichKey]);

  const thumb = (r: Row, cls: string) => {
    const src = r.localUrl || r.mediaUrl;
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-[6px] bg-slate-100 dark:bg-white/5 ${cls}`}>
        {src ? (r.mediaType === 'video' ? <video src={r.localUrl ? src : `${src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={src} alt="" className="h-full w-full object-cover" />) : <div className="grid h-full place-items-center text-slate-400"><ImageIcon className="h-5 w-5" /></div>}
        {r.mediaType === 'video' && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-7 w-7 place-items-center rounded-full bg-black/55 ring-2 ring-white"><Play className="ml-0.5 h-3 w-3 fill-white text-white" /></span></span>}
        {r.mediaType === 'video' && r.duration ? <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">{fmtDur(r.duration)}</span> : null}
        {isEditable(r) && <button type="button" aria-label="Replace media" onClick={(e) => { e.stopPropagation(); pickReplace(r.key); }} className="absolute right-0.5 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/70 hover:bg-black/75"><Pencil className="h-2.5 w-2.5" /></button>}
        {r.status === 'uploading' && <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /></span>}
      </div>
    );
  };
  const dragProps = (r: Row) => ({
    onDragOver: (e: React.DragEvent) => { if (canDrag && dragKey) { e.preventDefault(); dropOn(r.key); } },
  });
  const handle = (r: Row) => (
    <span draggable={canDrag} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragKey(r.key); }} onDragEnd={() => setDragKey(null)}
      title={canDrag ? 'Drag to reorder' : 'Sort by Serial (1 → N) with no filters to drag'}
      className={`text-slate-500 ${canDrag ? 'cursor-grab hover:text-slate-800 active:cursor-grabbing' : 'cursor-not-allowed opacity-50'}`}><svg viewBox="0 0 10 16" className="h-3.5 w-2" fill="currentColor">{[2, 8, 14].flatMap((y) => [2, 8].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" />))}</svg></span>
  );
  const serialTone = (s: ViewStatus) => (s === 'scheduled' || s === 'processing' ? 'bg-[#f1e9ff] text-[#6d33c9] dark:bg-violet-500/15 dark:text-violet-300' : s === 'ready' || s === 'published' ? 'bg-[#e6f4ff] text-[#1559c7] dark:bg-sky-500/15 dark:text-sky-300' : 'bg-[#e9effb] text-[#1e3a8a] dark:bg-blue-500/15 dark:text-blue-300');

  const rowView = (r: Row) => {
    const n = serial.get(r.key)!;
    const ed = isEditable(r);
    const vs = viewStatus(r);
    return (
      <div id={`batch-post-${r.key}`} key={r.key} onClick={() => setFocus(r.key)} {...dragProps(r)}
        className={`relative flex flex-wrap items-start gap-x-2.5 gap-y-2 border-b border-[#edf1f7] px-3 py-2.5 last:border-b-0 lg:flex-nowrap dark:border-white/[0.06] transition-colors ${focused?.key === r.key ? 'bg-[#f7faff] dark:bg-blue-500/[0.04]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.01]'} ${dragKey === r.key ? 'opacity-50' : ''}`}>
        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <input type="checkbox" aria-label={`Select post ${n}`} checked={sel.has(r.key)} onChange={() => toggleSel(r.key)} onClick={(e) => e.stopPropagation()} className="h-[15px] w-[15px] rounded border-slate-300 accent-blue-600 cursor-pointer" />
          {handle(r)}
        </div>
        <div className="flex w-[48px] shrink-0 flex-col items-center gap-1 self-center">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${serialTone(vs)}`}>#{String(n).padStart(2, '0')}</span>
          <Badge s={vs} />
        </div>
        {thumb(r, 'h-[68px] w-[90px] self-center')}
        <div className="w-full min-w-0 lg:w-auto lg:min-w-[200px] lg:flex-1">
          <div className="mb-[3px] flex items-center justify-between">
            <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-300">Caption / Title</span>
            <div className="flex items-center gap-1.5">
              {globalTitle && r.caption === globalTitle && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  Default
                </span>
              )}
              {globalTitle && r.caption !== globalTitle && r.caption.trim() && (
                <div className="flex items-center gap-1">
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Customized
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      patch(r.key, { caption: globalTitle });
                      setCustomizedKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(r.key);
                        return next;
                      });
                    }}
                    className="text-[9.5px] text-blue-600 hover:underline dark:text-blue-400"
                    title="Reset to default batch title"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <textarea
              value={r.caption}
              disabled={!ed}
              maxLength={CAPTION_MAX}
              rows={2}
              placeholder="Write a caption or customize title…"
              onFocus={() => setFocus(r.key)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const newVal = e.target.value;
                patch(r.key, { caption: newVal });
                setCustomizedKeys((prev) => {
                  const next = new Set(prev);
                  if (newVal !== globalTitle) next.add(r.key);
                  else next.delete(r.key);
                  return next;
                });
              }}
              className="block min-h-[58px] w-full resize-none rounded-[8px] border border-[#dfe5ee] bg-white px-2.5 py-[6px] pr-12 text-[12px] leading-[1.4] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            />
            <span className="pointer-events-none absolute bottom-1 right-2 text-[9.5px] text-slate-400">{r.caption.length}/{CAPTION_MAX}</span>
          </div>
          <div className="mt-1.5"><TagChips tags={r.tags} disabled={!ed} onRemove={(t) => patch(r.key, { tags: r.tags.filter((x) => x !== t) })} onAdd={(t) => patch(r.key, { tags: r.tags.includes(t) ? r.tags : [...r.tags, t] })} /></div>
          {r.error && <p className="mt-1 text-[11px] text-rose-600 font-medium">{r.error}</p>}
          {r.dest.some((d) => ytConnIds.has(d)) && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <YouTubeSettingsCard token={token} scope="post" connectionId={r.dest.find((d) => ytConnIds.has(d)) || null} value={r.yt || null} inherited={bulkYt} onChange={(v) => patch(r.key, { yt: v })}
                caption={joinCaption(r)} mediaType={r.mediaType} media={r.dims || (r.duration ? { durationSec: r.duration } : null)} scheduleOn={scheduleOn} disabled={!ed} onReconnected={() => void social.reload()} />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-1.5 pt-[1px] lg:w-auto lg:shrink-0">
          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <div className="w-[120px]"><span className={lbl}>Audience</span>
              <PostAudienceButton disabled={!ed} tg={r.tg} onTg={(v) => patch(r.key, { tg: v })} fb={r.fb} onFb={(v) => onPostFb(r, v)} li={r.li} onLi={(v) => onPostLi(r, v)} yt={r.yt || null} onYouTube={(privacy, kids) => onPostYt(r, privacy, kids)} bulk={batchAudience} active={activePlatforms} onReset={() => resetAud(r)} />
            </div>
            <div className="min-w-[165px]"><span className={lbl}>Schedule</span><WhenField value={r.scheduledAt} disabled={!ed || !scheduleOn} onChange={(v) => patch(r.key, { scheduledAt: v })} /></div>
            <div><span className={lbl}>Destinations</span>
              <AccountDestinations wevsoft={r.platforms.includes('wevsoft')} onWevsoft={(on) => patch(r.key, { platforms: on ? [...r.platforms.filter((x) => x !== 'wevsoft'), 'wevsoft'] : r.platforms.filter((x) => x !== 'wevsoft') })}
                value={r.dest} onChange={(v) => patch(r.key, { dest: v })} accounts={social.usable} deliveries={r.deliveries} disabled={!ed} onConnect={() => setConnectOpen(true)} onToggleDefault={toggleDefault} max={3} />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pr-1">
            <button type="button" className={btnSm} onClick={(e) => { e.stopPropagation(); duplicate([r.key]); }} title="Duplicate post"><Copy className="h-3.5 w-3.5 text-slate-600" />Duplicate</button>
            <button type="button" className={`${btnSm} !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10`} disabled={r.status === 'published'} onClick={(e) => { e.stopPropagation(); remove([r.key]); }} title="Remove post"><Trash2 className="h-3.5 w-3.5" />Remove</button>
          </div>
        </div>
        <div className="absolute right-2 top-2 flex shrink-0 items-center lg:static lg:self-stretch lg:border-l lg:border-[#edf1f7] lg:pl-1.5 lg:pt-1 dark:border-white/[0.06]">
          <Menu trigger={(t) => <button type="button" aria-label="More options" onClick={(e) => { e.stopPropagation(); t(); }} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"><MoreVertical className="h-4 w-4" /></button>}>
            {(close) => (<>
              <button type="button" className={menuItem} onClick={() => { setFocus(r.key); setPreviewBig(true); close(); }}><Eye className="h-4 w-4" />Preview</button>
              <button type="button" className={menuItem} disabled={!ed} onClick={() => { pickReplace(r.key); close(); }}><Pencil className="h-4 w-4" />Replace media</button>
              <button type="button" className={menuItem} disabled={!ed} onClick={() => { patch(r.key, { scheduledAt: null }); close(); }}><Clock className="h-4 w-4" />Clear schedule</button>
              <div className="border-t border-slate-100 dark:border-white/10 my-1" />
              <button type="button" className={menuItem} onClick={() => { move(r.key, -MAX_ITEMS); close(); }}><ChevronUp className="h-4 w-4" />Move to top</button>
              <button type="button" className={menuItem} onClick={() => { move(r.key, MAX_ITEMS); close(); }}><ChevronDown className="h-4 w-4" />Move to bottom</button>
            </>)}
          </Menu>
        </div>
      </div>
    );
  };

  const gridView = (r: Row) => {
    const ed = isEditable(r);
    return (
      <div key={r.key} onClick={() => setFocus(r.key)} {...dragProps(r)} className={`rounded-xl border p-2 ${focused?.key === r.key ? 'border-blue-400' : 'border-[#e4e9f2] dark:border-white/10'} ${dragKey === r.key ? 'opacity-50' : ''}`}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <input type="checkbox" aria-label="Select" checked={sel.has(r.key)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(r.key)} className="h-3.5 w-3.5 accent-blue-600" />
          {handle(r)}
          <span className={`rounded-full px-2 text-[11.5px] font-extrabold ${serialTone(viewStatus(r))}`}>#{String(serial.get(r.key)!).padStart(2, '0')}</span><span className="ml-auto"><Badge s={viewStatus(r)} /></span>
        </div>
        {thumb(r, 'aspect-square w-full')}
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            value={r.caption}
            disabled={!ed}
            placeholder="Type caption / title…"
            onFocus={() => setFocus(r.key)}
            onChange={(e) => {
              const newVal = e.target.value;
              patch(r.key, { caption: newVal });
              setCustomizedKeys((prev) => {
                const next = new Set(prev);
                if (newVal !== globalTitle) next.add(r.key);
                else next.delete(r.key);
                return next;
              });
            }}
            className="h-7 w-full rounded-md border border-[#dfe5ee] bg-white px-2 text-[11.5px] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
          />
        </div>
        <p className="mt-1 text-[10.5px] text-slate-500">{r.scheduledAt ? fmtWhen(r.scheduledAt) : 'No schedule'}</p>
        <div className="mt-1.5"><PostAudienceButton disabled={!ed} tg={r.tg} onTg={(v) => patch(r.key, { tg: v })} fb={r.fb} onFb={(v) => onPostFb(r, v)} li={r.li} onLi={(v) => onPostLi(r, v)} yt={r.yt || null} onYouTube={(privacy, kids) => onPostYt(r, privacy, kids)} bulk={batchAudience} active={activePlatforms} onReset={() => resetAud(r)} /></div>
      </div>
    );
  };

  const initials = userName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const spacingLabel = spacing < 60 ? `${spacing} min` : spacing < 1440 ? `${spacing / 60} h` : '1 day';
  const seqStyle = (s: ViewStatus) => (s === 'published' ? 'bg-[#16a34a] text-white ring-[5px] ring-[#dcf5e4] dark:ring-emerald-500/20'
    : s === 'scheduled' || s === 'processing' ? 'bg-[#a855f7] text-white ring-[5px] ring-[#efe3ff] dark:ring-violet-500/20'
    : s === 'ready' ? 'border border-emerald-300 bg-[#effaf3] text-emerald-700 dark:bg-emerald-500/10'
    : 'border border-[#dfe5ee] bg-[#f1f4f9] text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300');

  return (
    <div className="min-h-screen bg-[#f5f8fd] text-slate-900 dark:bg-[#0b0d14] dark:text-slate-100">
      <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && replaceKey.current) void replaceMedia(replaceKey.current, f); e.target.value = ''; }} />

      {/* Streamlined Studio Topbar: Breadcrumbs + Batch Name + Primary Actions */}
      <header className="border-b border-[#e4e9f2] bg-white/80 backdrop-blur-md px-3 py-2 sm:px-6 lg:h-[58px] lg:py-0 dark:border-white/[0.08] dark:bg-[#0f121d]/80 sticky top-0 z-30">
        <div className="flex flex-wrap items-center justify-between gap-3 h-full">
          {/* Left: Breadcrumbs + Inline Batch Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Menu align="left" trigger={(t) => (
              <button type="button" aria-label="Menu" onClick={t} className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#e4e9f2] bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                <MenuIcon className="h-4 w-4" />
              </button>
            )}>
              {(close) => (
                <div className="text-left">
                  <button type="button" className={menuItem} onClick={() => { close(); navigate('/'); }}><Layers className="h-4 w-4" />Home</button>
                  <button type="button" className={menuItem} onClick={() => { close(); navigate('/studio/content'); }}><ImageIcon className="h-4 w-4" />Content Studio</button>
                  <button type="button" className={menuItem} onClick={() => { close(); navigate(creatorHubPath('batch')); }}><CalendarDays className="h-4 w-4" />All batches</button>
                </div>
              )}
            </Menu>

            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
              <Link to="/studio/content" className="hover:text-blue-600 font-medium">Studio</Link>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-white">Batch Upload</span>
            </div>

            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>

            {/* Editable Batch Name */}
            <div className="relative flex items-center min-w-[150px] max-w-[240px]">
              <input
                id="batch-name"
                name="batchName"
                value={name}
                maxLength={120}
                placeholder="Auto: Batch 1, Batch 2…"
                title="Batch name (leave empty for auto name)"
                onChange={(e) => setName(e.target.value)}
                className="h-7 w-full rounded-md border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-2 text-[12.5px] font-bold text-slate-900 focus:bg-white dark:text-white dark:focus:bg-white/5 outline-none transition"
              />
              <Pencil className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400 opacity-60" />
            </div>

            {/* Quick Batch Status Pill */}
            {rows.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {published}/{rows.length} published ({pct}%)
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${btn} !h-8 !px-2.5 !text-[12px]`}
              onClick={() => navigate('/studio/content?view=batch-queue')}
              title="Scheduled & history"
            >
              <History className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">History</span>
            </button>

            <button
              type="button"
              className={`${btn} !h-8 !px-2.5 !text-[12px]`}
              disabled={busyAny || !rows.length}
              onClick={() => void save('draft')}
            >
              {busy === 'draft' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            {/* Schedule All Split Button */}
            <div className="flex h-8 rounded-[9px] border border-[#dfe5ee] bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <button
                type="button"
                disabled={busyAny || !rows.some(isEditable) || !scheduleOn}
                onClick={scheduleAll}
                className="inline-flex items-center gap-1.5 px-3 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-white/5"
                title={scheduleOn ? `Schedule all every ${spacingLabel}` : 'Schedule is currently turned off'}
              >
                {busy === 'schedule' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5 text-violet-600" />}
                <span>Schedule ({spacingLabel})</span>
              </button>
              <Menu trigger={(t) => (
                <button type="button" aria-label="Schedule spacing options" onClick={t} className="grid h-full w-6 place-items-center border-l border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}>
                {(close) => (
                  <div className="py-1">
                    <p className="px-3 py-1 text-[10.5px] font-semibold uppercase text-slate-400">Spacing between posts</p>
                    {SPACINGS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`${menuItem} ${spacing === m ? '!text-blue-600 !font-bold' : ''}`}
                        onClick={() => { setSpacing(m); close(); }}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {m < 60 ? `${m} minutes` : m < 1440 ? `${m / 60} hour${m === 60 ? '' : 's'}` : '1 day'}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                    <button type="button" className={menuItem} onClick={() => { setScheduleOn(!scheduleOn); close(); }}>
                      <Clock className="h-3.5 w-3.5" />
                      {scheduleOn ? 'Turn schedule OFF (Publish immediately)' : 'Turn schedule ON'}
                    </button>
                    <button type="button" className={menuItem} onClick={() => { resequence(); close(); }}>
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      Re-space draft times
                    </button>
                  </div>
                )}
              </Menu>
            </div>

            {/* Publish Now Solid CTA */}
            <button
              type="button"
              disabled={busyAny || !rows.some(isEditable)}
              onClick={publishNow}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-[#1d63ed] px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === 'publish_now' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish Now
            </button>

            <span className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

            <button type="button" aria-label="Toggle theme" onClick={() => setTheme?.(isDark ? 'Light mode' : 'Dark mode')} className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <Link to="/profile" className="flex items-center gap-1 rounded-full p-0.5 hover:ring-2 hover:ring-blue-500/20">
              {avatar ? <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{initials}</span>}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className={`grid gap-4 px-3 py-3 sm:px-6 ${showPreview ? 'xl:grid-cols-[minmax(0,1fr)_clamp(290px,22vw,340px)]' : 'grid-cols-1 max-w-[1440px] mx-auto w-full'}`}>
        <div className="min-w-0 space-y-3">
          {done && (
            <div className={`${card} flex flex-wrap items-center gap-3 !border-emerald-200 !bg-[#f0fbf4] px-4 py-2.5 dark:!border-emerald-500/20 dark:!bg-emerald-500/[0.06]`} role="status">
              <CheckFilled className="h-6 w-6 shrink-0" />
              <div className="min-w-[200px] flex-1 leading-tight">
                <div className="text-[13.5px] font-bold">{done.action === 'publish_now' ? `${done.count} post${done.count === 1 ? '' : 's'} sent to publish` : `${done.count} post${done.count === 1 ? '' : 's'} scheduled`}</div>
                <div className="text-[11.5px] text-slate-600 dark:text-slate-400">{done.action === 'schedule' && done.first ? `First goes out ${fmtWhen(done.first)} (${Intl.DateTimeFormat().resolvedOptions().timeZone}). ` : 'Posts go live within ~30 seconds. '}Queue more now — your destinations and audience stay selected.</div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
                <button type="button" className={`${btn} !border-[#1d63ed] !bg-[#1d63ed] !text-white hover:!bg-blue-700`} onClick={newBatch}><Plus className="h-4 w-4" />Create another</button>
                <button type="button" className={btn} onClick={() => navigate('/studio/content?view=batch-queue')}><History className="h-4 w-4" />View history</button>
              </div>
              <button type="button" aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/70" onClick={() => setDone(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Batch defaults: Title and Audience. Audience applies to every post that still follows it. */}
          <div className={`${card} p-3 sm:px-4 sm:py-3 border-blue-200/80 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 dark:border-blue-500/20 dark:from-blue-500/[0.04] dark:to-transparent`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div role="tablist" aria-label="Batch defaults" className="flex rounded-[10px] border border-[#dfe5ee] bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                <button type="button" role="tab" aria-selected={studioTab === 'title'} onClick={() => setStudioTab('title')} className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-bold ${studioTab === 'title' ? 'bg-[#dfeaff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>
                  <Type className="h-3.5 w-3.5" />Title
                </button>
                <button type="button" role="tab" id="batch-audience-tab" aria-selected={studioTab === 'audience'} onClick={() => setStudioTab('audience')} className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-bold ${studioTab === 'audience' ? 'bg-[#dfeaff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>
                  <Crosshair className="h-3.5 w-3.5" />Audience
                </button>
              </div>
              {rows.length > 0 && studioTab === 'title' && (
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  {customizedKeys.size > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{customizedKeys.size} of {rows.length} customized</span>
                  ) : (
                    <span>{rows.length} post{rows.length === 1 ? '' : 's'} linked</span>
                  )}
                </span>
              )}
            </div>

            {studioTab === 'audience' ? (
              <BatchAudiencePanel value={batchAudience} onTg={onBatchTg} onFb={setBulkFb} onYouTube={onBatchYt} onLinkedIn={onBatchLi} active={activePlatforms} customCount={audCustomCount} total={rows.length} onApply={applyAudienceToAll} />
            ) : (
            <div>
            <p className="mb-2 text-[11.5px] text-slate-500 dark:text-slate-400">Applies to every post that still uses this title. Edit a post to customize it.</p>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="batch-global-title"
                  aria-label="Batch title and caption"
                  name="globalTitle"
                  value={globalTitle}
                  maxLength={CAPTION_MAX}
                  onChange={(e) => handleGlobalTitleChange(e.target.value)}
                  placeholder="Type a title or caption to apply to all posts (e.g. Eid Collection 2026)..."
                  className="h-9 w-full rounded-[9px] border border-[#dfe5ee] bg-white px-3 pr-20 text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {globalTitle && (
                    <button
                      type="button"
                      aria-label="Clear batch title"
                      onClick={() => handleGlobalTitleChange('')}
                      className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <span className="pointer-events-none text-[10px] text-slate-400">
                    {globalTitle.length}/{CAPTION_MAX}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyTitleToAll(globalTitle)}
                disabled={!globalTitle.trim() || rows.length === 0}
                title="Apply this title to all posts"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-blue-600 px-3.5 text-[11.5px] font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 transition"
              >
                <Check className="h-3.5 w-3.5" />
                Apply to All
              </button>
            </div>
            {globalTitle.length > 280 && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">X allows 280 characters. Instagram allows 2,200 and at most 30 hashtags. LinkedIn allows 3,000. A destination that cannot take this caption is rejected when it publishes.</p>
            )}
            </div>
            )}
          </div>

          {/* Hero Upload Dropzone (Shown prominently when no posts exist) */}
          {rows.length === 0 && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }} onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed p-8 transition text-center ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-[#9dbcf5] bg-[#f4f8ff] hover:bg-[#eef4ff] dark:border-blue-500/30 dark:bg-blue-500/[0.04]'}`}>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#dfeaff] text-[#1d63ed] dark:bg-blue-500/20"><UploadCloud className="h-7 w-7" /></span>
              <div>
                <div className="text-[17px] font-bold text-slate-900 dark:text-white">Upload photos or videos to start batch</div>
                <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Supports SVG, JPG, PNG, WEBP, MP4, MOV, WEBM • Up to 100MB per file</div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="mt-2 inline-flex h-9 items-center gap-2 rounded-xl bg-[#1d63ed] px-5 text-[13px] font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700">
                <Plus className="h-4 w-4" />Choose files
              </button>
            </div>
          )}

          {/* Unified Contextual Toolbar (Replaces repetitive strips and the 92px bottom footer) */}
          <div className={`${card} p-2 sm:px-3 sm:py-2`}>
            {sel.size > 0 ? (
              /* Contextual Selection Action Bar */
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f0f6ff] dark:bg-blue-500/10 rounded-xl px-3 py-1.5 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    onChange={() => setSel(allChecked ? new Set() : new Set(visible.map((r) => r.key)))}
                    className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[12.5px] font-bold text-blue-900 dark:text-blue-200">
                    {sel.size} of {visible.length} selected
                  </span>
                  <button type="button" onClick={() => setSel(new Set())} className="text-[11.5px] text-blue-600 hover:underline dark:text-blue-300">
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button type="button" className={`${btn} !h-7 !px-2.5 !text-[11.5px] font-medium`} onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3 w-3 text-blue-600" />Batch Edit
                  </button>
                  <button type="button" className={`${btn} !h-7 !px-2.5 !text-[11.5px] font-medium`} onClick={() => duplicate([...sel])}>
                    <Copy className="h-3 w-3 text-slate-600" />Duplicate
                  </button>
                  <button
                    type="button"
                    className={`${btn} !h-7 !px-2.5 !text-[11.5px] !text-rose-600 hover:!bg-rose-50 dark:!bg-rose-500/10 font-medium`}
                    onClick={() => { if (window.confirm(`Remove ${sel.size} selected post(s) from this batch?`)) remove([...sel]); }}
                  >
                    <Trash2 className="h-3 w-3" />Delete
                  </button>
                </div>
              </div>
            ) : (
              /* Default Global Toolbar */
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  {/* Search */}
                  <div className="relative w-full sm:w-[170px] lg:w-[210px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="batch-search"
                      name="q"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search posts..."
                      className={`${field} !h-7 w-full !pl-8 !text-[11.5px]`}
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-1">
                    <Select
                      small
                      className="w-[125px]"
                      value={sortBy}
                      onChange={(v) => setSortBy(v)}
                      options={[
                        { id: 'serial', label: `Serial (${sortAsc ? '1→N' : 'N→1'})` },
                        { id: 'schedule', label: 'Schedule' },
                        { id: 'status', label: 'Status' }
                      ]}
                    />
                    <button
                      type="button"
                      aria-label="Sort direction"
                      onClick={() => setSortAsc((a) => !a)}
                      className="grid h-7 w-7 place-items-center rounded-[8px] border border-[#dfe5ee] bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className={`${vdiv} my-0.5 h-6`} />

                  {/* Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['draft', 'ready', 'scheduled', 'published'] as ViewStatus[]).map((s) => {
                      const count = counts[s] || 0;
                      if (count === 0 && rows.length > 0) return null;
                      const tone = s === 'draft' ? 'bg-[#e7efff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-300' : BADGE[s].cls;
                      const dot = s === 'draft' ? 'bg-[#2563eb]' : BADGE[s].dot;
                      const active = statusFilter.has(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setStatusFilter((p) => { const c = new Set(p); if (c.has(s)) c.delete(s); else c.add(s); return c; })}
                          className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[10px] font-semibold transition ${tone} ${active ? 'ring-2 ring-blue-500 shadow-sm' : 'opacity-85 hover:opacity-100'}`}
                        >
                          <span className={`h-1 w-1 rounded-full ${dot}`} />
                          {BADGE[s].label}
                          <span className="ml-0.5 text-[9.5px] opacity-75">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right controls: Add Media + View Mode + Toggle Preview */}
                <div className="flex items-center gap-2 ml-auto">
                  {rows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"
                    >
                      <Plus className="h-3.5 w-3.5" />Add Media
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={togglePreview}
                    title={showPreview ? "Hide side preview (expand feed)" : "Show side preview"}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2 text-[11px] font-semibold transition ${
                      showPreview
                        ? 'border-[#dfe5ee] bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                        : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                    }`}
                  >
                    {showPreview ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-blue-600" />}
                    <span className="hidden sm:inline">{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>

                  <div className="flex overflow-hidden rounded-[8px] border border-[#dfe5ee] dark:border-white/10">
                    {([['list', List], ['grid', LayoutGrid]] as const).map(([id, Ic]) => (
                      <button
                        key={id}
                        type="button"
                        aria-label={`${id} view`}
                        aria-pressed={layout === id}
                        onClick={() => setLayout(id)}
                        className={`grid h-7 w-8 place-items-center ${id === 'grid' ? 'border-l border-[#dfe5ee] dark:border-white/10' : ''} ${layout === id ? 'bg-[#f1f5fb] text-slate-900 dark:bg-white/10 dark:text-white' : 'bg-white text-slate-500 dark:bg-transparent'}`}
                      >
                        <Ic className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* YouTube Settings Card (Shown cleanly if YouTube destination active) */}
          {(bulkDest.some((d) => ytConnIds.has(d)) || rows.some((r) => r.dest.some((d) => ytConnIds.has(d)))) && (
            <div className={`${card} px-3 py-2.5`}>
              <YouTubeSettingsCard
                token={token}
                scope="batch"
                connectionId={[...bulkDest, ...rows.flatMap((r) => r.dest)].find((d) => ytConnIds.has(d)) || null}
                value={bulkYt}
                onChange={setBulkYt}
                scheduleOn={scheduleOn}
                onReconnected={() => void social.reload()}
              />
              <p className="mt-1 px-1 text-[10px] text-slate-500">Applied as defaults for posts sent to YouTube.</p>
            </div>
          )}

          {/* Posts Feed Card */}
          <div className={card}>
            {rows.length > 0 && (sel.size > 0 || !canDrag || visible.length !== rows.length) && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1f7] px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.06]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={allChecked}
                    onChange={() => setSel(allChecked ? new Set() : new Set(visible.map((r) => r.key)))}
                    className="h-3.5 w-3.5 rounded accent-blue-600"
                  />
                  <span>Select all ({visible.length} items)</span>
                </label>
                {!canDrag && <span className="text-[10.5px] text-slate-400">Drag reordering active in Serial order with no search/filter.</span>}
              </div>
            )}

            {rows.length === 0 ? null : layout === 'list' ? (
              <div className="divide-y divide-[#edf1f7] dark:divide-white/[0.06]">{visible.slice(0, shown).map(rowView)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">{visible.slice(0, shown).map(gridView)}</div>
            )}

            {visible.length > shown && (
              <div className="p-2.5">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + PAGE)}
                  className="flex h-7 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#e4e9f2] bg-[#f4f7fc] text-[11px] font-medium text-[#1d4ed8] hover:bg-[#eef3fb] dark:border-white/10 dark:bg-white/[0.03] dark:text-blue-300"
                >
                  ↓ Load more items ({visible.length - shown} remaining)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Clean Post Preview + Interactive Batch Readiness Inspector */}
        <aside className={`space-y-3 xl:sticky xl:top-[66px] xl:self-start ${showPreview ? '' : 'hidden'}`}>
          {/* Post Preview Card */}
          <div className={`${card} p-3`}>
            <div className="mb-2 flex items-center justify-between text-[13px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                <Eye className="h-4 w-4 text-[#1d63ed]" />
                Preview {focused ? `#${String(serial.get(focused.key) || 1).padStart(2, '0')}` : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Expand preview"
                  disabled={!focused}
                  onClick={() => setPreviewBig(true)}
                  title="Open full preview"
                  className="grid h-6 w-6 place-items-center rounded-md border border-[#e4e9f2] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Hide preview panel"
                  onClick={togglePreview}
                  title="Hide side preview (expand feed)"
                  className="grid h-6 w-6 place-items-center rounded-md border border-[#e4e9f2] text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
                >
                  <EyeOff className="h-3 w-3 text-slate-500" />
                </button>
              </div>
            </div>
            {focused ? (
              <PostCard r={focused} avatar={avatar} name={userName} verified={verified} seeMore={seeMore} setSeeMore={setSeeMore} />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-white/10">
                Upload photos or videos to preview your post.
              </p>
            )}
          </div>

          {/* Combined Interactive Readiness & Sequence Card */}
          <div className={`${card} p-3`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900 dark:text-white">
                <CheckFilled className="h-4 w-4" />
                Batch Readiness
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {published}/{rows.length} Ready
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>

            {/* Interactive Checklist: Clicking warning jumps straight to the post! */}
            <ul className="space-y-1.5 text-[11.5px] border-b border-slate-100 dark:border-white/10 pb-3">
              {checklist.map((c, idx) => (
                <li
                  key={c.label}
                  onClick={() => {
                    if (!c.ok) {
                      // Jump to the first problematic post
                      const target = idx === 0
                        ? rows.find((r) => !r.caption.trim() && !r.mediaUrl)
                        : idx === 1
                        ? rows.find((r) => r.status === 'upload_failed')
                        : idx === 2
                        ? rows.find((r) => r.status !== 'published' && !r.scheduledAt)
                        : rows.find((r) => !r.platforms.includes('wevsoft') && !r.dest.length);
                      if (target) {
                        setFocus(target.key);
                        const el = document.getElementById(`batch-post-${target.key}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  }}
                  className={`flex items-center justify-between gap-2 p-1 rounded-lg ${!c.ok ? 'hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {c.ok ? <CheckFilled className="h-3.5 w-3.5 shrink-0" /> : <WarnFilled />}
                    <span className={`truncate ${c.ok ? 'text-slate-700 dark:text-slate-300' : 'text-amber-700 dark:text-amber-400 font-medium'}`}>
                      {c.label}
                    </span>
                  </div>
                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${c.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                    {c.ok ? 'Ready' : 'Fix'}
                  </span>
                </li>
              ))}
            </ul>

            {/* Sequence Pills */}
            <div className="pt-2.5">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Publishing Order</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Spacing: <b className="text-blue-600 dark:text-blue-400">{spacingLabel}</b>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                {rows.length === 0 && <span className="text-[11px] text-slate-400">No posts in batch yet.</span>}
                {rows.map((r, i) => (
                  <button
                    key={r.key}
                    type="button"
                    title={`#${String(i + 1).padStart(2, '0')} · ${BADGE[viewStatus(r)].label}${r.scheduledAt ? ` · ${fmtWhen(r.scheduledAt)}` : ''}`}
                    onClick={() => {
                      setFocus(r.key);
                      const el = document.getElementById(`batch-post-${r.key}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-bold transition ${seqStyle(viewStatus(r))} ${focused?.key === r.key ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {connectOpen && <ConnectPlatformsModal token={token} connections={social.connections} platforms={social.platforms} reload={social.reload} onClose={() => setConnectOpen(false)} />}
      {editOpen && <BatchEditModal count={sel.size || rows.length} mode={captionMode} setMode={setCaptionMode} tags={bulkTags} privacy={bulkPrivacy} platforms={bulkPlatforms} onClose={() => setEditOpen(false)} onApply={applyBatchEdit} />}
      {previewBig && focused && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPreviewBig(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-3 dark:bg-[#151823]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center text-[14px] font-bold"><Eye className="mr-2 h-4 w-4 text-blue-600" />Post Preview<button type="button" aria-label="Close" className="ml-auto" onClick={() => setPreviewBig(false)}><X className="h-4 w-4" /></button></div>
            <PostCard r={focused} avatar={avatar} name={userName} verified={verified} seeMore setSeeMore={() => undefined} big />
          </div>
        </div>
      )}
    </div>
  );
}
