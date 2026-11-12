/**
 * Batch Upload -> "YouTube settings" (collapsible card) + the read-only summary / live key panel used in
 * Scheduled & history. Values are stored per post as platformOptions.youtube (backend validates again:
 * modules/social-publishing/youtube-options.ts). Batch defaults apply to every post; a post can override.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, Copy, Eye, EyeOff, ImagePlus, Info, Loader2, Radio, RefreshCw, RotateCcw, Video, X } from 'lucide-react';
import { Brand } from './SocialDestinations';
import { connectPlatform } from '../../lib/socialConnections';
import { fromLocalInput, toLocalInput, uploadBatchMedia } from '../creator/batch/batchApi';

export type YtPrivacy = 'public' | 'unlisted' | 'private';
export interface YouTubeOpts {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  privacy?: YtPrivacy;
  useNativeSchedule?: boolean;
  thumbnailUrl?: string | null;
  playlistId?: string | null;
  newPlaylistTitle?: string | null;
  madeForKids?: boolean;
  appendShortsTag?: boolean;
  live?: { enabled: boolean; scheduledStart?: string | null } | null;
}
export interface YtStep { step: string; ok: boolean; message?: string; id?: string }
export interface YtDeliveryResult { steps: YtStep[]; videoId: string | null; live: { broadcastId: string | null; watchUrl: string | null; rtmpUrl: string | null; scheduledStart: string | null; hasKey: boolean; streamKeyMasked: string } | null }

export const YT_LIMITS = { title: 100, description: 5000, tagsTotal: 500 } as const;
export const YT_PRIVACY: { id: YtPrivacy; label: string; hint: string }[] = [
  { id: 'public', label: 'Public', hint: 'Everyone can find and watch' },
  { id: 'unlisted', label: 'Unlisted', hint: 'Only people with the link' },
  { id: 'private', label: 'Private', hint: 'Only you' },
];
const LANGS: [string, string][] = [['', 'Not set'], ['en', 'English'], ['bn', 'Bangla'], ['hi', 'Hindi'], ['ur', 'Urdu'], ['ar', 'Arabic'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['id', 'Indonesian'], ['ru', 'Russian'], ['tr', 'Turkish'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese']];
export const STATIC_CATEGORIES = [
  { id: '1', title: 'Film & Animation' }, { id: '2', title: 'Autos & Vehicles' }, { id: '10', title: 'Music' }, { id: '15', title: 'Pets & Animals' },
  { id: '17', title: 'Sports' }, { id: '19', title: 'Travel & Events' }, { id: '20', title: 'Gaming' }, { id: '22', title: 'People & Blogs' },
  { id: '23', title: 'Comedy' }, { id: '24', title: 'Entertainment' }, { id: '25', title: 'News & Politics' }, { id: '26', title: 'Howto & Style' },
  { id: '27', title: 'Education' }, { id: '28', title: 'Science & Technology' }, { id: '29', title: 'Nonprofits & Activism' },
];

/** Vertical or square and at most 3 minutes -> YouTube shows it as a Short (same rule as the backend). */
export function isShortsCandidate(m: { width?: number | null; height?: number | null; durationSec?: number | null }) {
  const w = Number(m.width || 0), h = Number(m.height || 0), d = Number(m.durationSec || 0);
  return w > 0 && h > 0 && d > 0 && d <= 180 && h >= w;
}
export const ytTagsLength = (tags: string[]) => tags.reduce((n, t, i) => n + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
export const ytTitleFrom = (caption: string) => (caption.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || 'Untitled video').replace(/[<>]/g, '').slice(0, YT_LIMITS.title);

/** Drop empty fields so "not set" falls back to the batch default / caption. */
export function compactYt(o: YouTubeOpts | null | undefined): YouTubeOpts | null {
  if (!o) return null;
  const out: any = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    if (k === 'live' && !(v as any).enabled) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}
export const mergeYt = (a: YouTubeOpts | null | undefined, b: YouTubeOpts | null | undefined) => compactYt({ ...(a || {}), ...(b || {}) });

/** Drop privacy / made-for-kids so the post follows the batch YouTube audience again. */
export function stripYtAudience(o: YouTubeOpts | null | undefined): YouTubeOpts | null {
  if (!o) return null;
  const next: YouTubeOpts = { ...o };
  delete next.privacy;
  delete next.madeForKids;
  return compactYt(next);
}

/** Video width / height / duration from a URL (for the Shorts badge). */
export function probeVideo(url: string): Promise<{ width: number; height: number; durationSec: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight, durationSec: Number.isFinite(v.duration) ? v.duration : 0 });
    v.onerror = () => resolve(null);
    v.src = url;
  });
}

export interface YtMeta { categories: { id: string; title: string }[]; playlists: { id: string; title: string; privacy: string | null }[]; playlistsError: string | null; needsReconnect: boolean; categoriesSource: string }

export function useYouTubeMeta(token: string | null, connectionId: string | null) {
  const [meta, setMeta] = useState<YtMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const region = (navigator.language.split('-')[1] || 'US').toUpperCase();
  const reload = useCallback(async () => {
    if (!connectionId || !token) { setMeta(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/social/youtube/${encodeURIComponent(connectionId)}/meta?region=${region}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMeta(j);
    } catch {
      setMeta({ categories: STATIC_CATEGORIES, playlists: [], playlistsError: 'Could not load playlists', needsReconnect: false, categoriesSource: 'static' });
    } finally { setLoading(false); }
  }, [token, connectionId, region]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void reload(); }, [reload]);
  return { meta, loading, reload };
}

const fieldCls = 'h-8 w-full rounded-[9px] border border-[#dfe5ee] bg-white px-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
const lblCls = 'mb-[3px] flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-300';
const chip = (on: boolean) => `inline-flex h-7 items-center justify-center gap-1 rounded-[8px] px-2.5 text-[11.5px] font-semibold ${on ? 'bg-[#dfeaff] text-[#1d4ed8] ring-1 ring-inset ring-[#9dbcf5] dark:bg-blue-500/15 dark:text-blue-300' : 'bg-white text-slate-700 ring-1 ring-inset ring-[#dfe5ee] hover:bg-slate-50 dark:bg-transparent dark:text-slate-300 dark:ring-white/10'}`;
const count = (n: number, max: number) => <span className={`font-normal ${n > max ? 'text-rose-600' : 'text-slate-400'}`}>{n}/{max}</span>;

function TagInput({ tags, onChange, disabled }: { tags: string[]; onChange: (t: string[]) => void; disabled?: boolean }) {
  const [v, setV] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((x) => x.replace(/[<>]/g, '').replace(/^#/, '').trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...tags];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 100));
    onChange(next); setV('');
  };
  return (
    <div className="flex min-h-[32px] flex-wrap items-center gap-1 rounded-[9px] border border-[#dfe5ee] bg-white px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.04]">
      {tags.map((t) => (
        <span key={t} className="inline-flex h-[22px] items-center gap-1 rounded-full bg-rose-50 pl-2 pr-1 text-[11px] font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{t}
          {!disabled && <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))} className="grid h-4 w-4 place-items-center rounded-full hover:bg-rose-100 dark:hover:bg-white/10"><X className="h-3 w-3" /></button>}
        </span>
      ))}
      <input value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} placeholder={tags.length ? '' : 'Add tag, press Enter'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(v); } else if (e.key === 'Backspace' && !v && tags.length) onChange(tags.slice(0, -1)); }}
        onBlur={() => add(v)} className="h-[22px] min-w-[90px] flex-1 bg-transparent px-1 text-[11.5px] outline-none" />
    </div>
  );
}

export interface YouTubeSettingsProps {
  token: string | null;
  connectionId: string | null;
  /** batch: the defaults for every post. post: an override on top of `inherited`. single: one saved post. */
  scope: 'batch' | 'post' | 'single';
  value: YouTubeOpts | null;
  onChange: (v: YouTubeOpts | null) => void;
  inherited?: YouTubeOpts | null;
  caption?: string;
  media?: { width?: number | null; height?: number | null; durationSec?: number | null } | null;
  mediaType?: 'image' | 'video' | null;
  /** Batch "Schedule" switch: when off, everything publishes right away. */
  scheduleOn?: boolean;
  disabled?: boolean;
  defaultOpen?: boolean;
  onReconnected?: () => void;
}

export function YouTubeSettingsCard({ token, connectionId, scope, value, onChange, inherited, caption = '', media, mediaType, scheduleOn = true, disabled, defaultOpen, onReconnected }: YouTubeSettingsProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [newPl, setNewPl] = useState(!!value?.newPlaylistTitle);
  const { meta, loading, reload } = useYouTubeMeta(open ? token : null, connectionId);
  const eff: YouTubeOpts = { ...(inherited || {}), ...(value || {}) };
  const set = (p: Partial<YouTubeOpts>) => onChange(compactYt({ ...(value || {}), ...p }));
  const overridden = scope === 'post' && !!compactYt(value);
  const shorts = mediaType === 'video' && isShortsCandidate(media || {});
  const live = !!eff.live?.enabled;
  const tagsLen = ytTagsLength(eff.tags || []);
  const cats = meta?.categories?.length ? meta.categories : STATIC_CATEGORIES;
  const privacyLabel = YT_PRIVACY.find((p) => p.id === (eff.privacy || 'public'))?.label;
  const catLabel = cats.find((c) => c.id === (eff.categoryId || '22'))?.title;
  const summary = [live ? 'Live stream' : 'Video', privacyLabel, live ? null : catLabel, eff.playlistId || eff.newPlaylistTitle ? 'Playlist' : null, eff.madeForKids ? 'Made for kids' : null].filter(Boolean).join(' \u00b7 ');

  const reconnect = async () => {
    const r = await connectPlatform(token, 'youtube');
    if (r.ok) { toast.success('YouTube reconnected'); onReconnected?.(); void reload(); } else if (r.error) toast.error(r.error);
  };
  const pickThumb = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png)$/.test(f.type)) { toast.error('Thumbnail must be a JPG or PNG'); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error('Thumbnail must be 2 MB or smaller'); return; }
    setThumbBusy(true);
    uploadBatchMedia(token, f).then((u) => set({ thumbnailUrl: u.url })).catch((e: Error) => toast.error(e.message)).finally(() => setThumbBusy(false));
  };

  return (
    <div className="rounded-[12px] border border-[#e4e9f2] bg-white dark:border-white/[0.08] dark:bg-white/[0.02]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <Brand id="youtube" size={20} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-bold text-slate-900 dark:text-white">YouTube settings
            {scope === 'batch' && <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Batch default</span>}
            {scope === 'post' && <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${overridden ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>{overridden ? 'Custom for this post' : 'Using batch defaults'}</span>}
            {shorts && !live && <span className="rounded-full bg-rose-600 px-1.5 py-px text-[10px] font-bold text-white">Shorts</span>}
            {live && <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Radio className="h-3 w-3" />Live</span>}
          </span>
          <span className="block truncate text-[11px] text-slate-500">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-[#edf1f7] px-3 pb-3 pt-2.5 dark:border-white/[0.06]">
          {meta?.needsReconnect && (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11.5px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">This channel was connected before thumbnails, playlists and live were added. Reconnect to allow them (normal uploads still work).</span>
              <button type="button" onClick={() => void reconnect()} className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-amber-600 px-2.5 font-semibold text-white hover:bg-amber-700"><RefreshCw className="h-3.5 w-3.5" />Reconnect YouTube</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" disabled={disabled} className={chip(!live)} onClick={() => set({ live: null })}><Video className="h-3.5 w-3.5" />Upload video</button>
            {/* eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior) */}
            <button type="button" disabled={disabled} className={chip(live)} onClick={() => set({ live: { enabled: true, scheduledStart: eff.live?.scheduledStart || new Date(Date.now() + 3600_000).toISOString() } })}><Radio className="h-3.5 w-3.5" />Live stream</button>
            {overridden && <button type="button" disabled={disabled} onClick={() => onChange(null)} className="ml-auto inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" />Reset to batch defaults</button>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2"><span className={lblCls}>Title{count((eff.title || '').length, YT_LIMITS.title)}</span>
              <input value={value?.title ?? (scope !== 'post' ? eff.title || '' : '')} disabled={disabled} maxLength={YT_LIMITS.title} onChange={(e) => set({ title: e.target.value })}
                placeholder={eff.title || (caption ? ytTitleFrom(caption) : 'First line of the caption')} className={fieldCls} /></label>
            <label className="block md:col-span-2"><span className={lblCls}>Description{count((eff.description ?? caption).length, YT_LIMITS.description)}</span>
              <textarea value={value?.description ?? (scope !== 'post' ? eff.description || '' : '')} disabled={disabled} maxLength={YT_LIMITS.description} rows={3} onChange={(e) => set({ description: e.target.value })}
                placeholder={eff.description || 'Leave empty to use the post caption'} className={`${fieldCls} h-auto resize-y py-1.5 leading-[1.4]`} /></label>
            {!live && <div className="md:col-span-2"><span className={lblCls}>Tags{count(tagsLen, YT_LIMITS.tagsTotal)}</span><TagInput tags={eff.tags || []} disabled={disabled} onChange={(t) => set({ tags: t })} /></div>}
            {!live && <label className="block"><span className={lblCls}>Category{loading && <Loader2 className="h-3 w-3 animate-spin" />}</span>
              <select value={eff.categoryId || '22'} disabled={disabled} onChange={(e) => set({ categoryId: e.target.value })} className={fieldCls}>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
            {!live && <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={lblCls}>Language</span><select value={eff.defaultLanguage || ''} disabled={disabled} onChange={(e) => set({ defaultLanguage: e.target.value })} className={fieldCls}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
              <label className="block"><span className={lblCls}>Audio language</span><select value={eff.defaultAudioLanguage || ''} disabled={disabled} onChange={(e) => set({ defaultAudioLanguage: e.target.value })} className={fieldCls}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
            </div>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div><span className={lblCls}>Visibility</span>
              <div className="flex gap-1.5">{YT_PRIVACY.map((p) => <button key={p.id} type="button" title={p.hint} disabled={disabled} className={`${chip((eff.privacy || 'public') === p.id)} flex-1`} onClick={() => set({ privacy: p.id })}>{p.label}</button>)}</div></div>
            <div><span className={lblCls}>Audience (required by YouTube)</span>
              <div className="flex gap-1.5">
                <button type="button" disabled={disabled} className={`${chip(!eff.madeForKids)} flex-1`} onClick={() => set({ madeForKids: false })}>Not made for kids</button>
                <button type="button" disabled={disabled} className={`${chip(!!eff.madeForKids)} flex-1`} onClick={() => set({ madeForKids: true })}>Made for kids</button>
              </div></div>
          </div>

          {live ? (
            <div className="space-y-2 rounded-[10px] bg-rose-50/60 p-2.5 dark:bg-rose-500/5">
              <label className="block max-w-[260px]"><span className={lblCls}>Live starts at</span>
                <input type="datetime-local" disabled={disabled} value={toLocalInput(eff.live?.scheduledStart || null)} onChange={(e) => set({ live: { enabled: true, scheduledStart: fromLocalInput(e.target.value) } })} className={fieldCls} /></label>
              <p className="flex gap-1.5 text-[11px] text-slate-600 dark:text-slate-400"><Info className="mt-px h-3.5 w-3.5 shrink-0" />The broadcast is created on YouTube as soon as you schedule or publish. The RTMP URL and stream key then appear (only to you) in Scheduled &amp; history. Live streaming must be enabled on the channel in YouTube Studio (first-time activation can take 24 hours).</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div><span className={lblCls}>Playlist</span>
                  {newPl ? (
                    <div className="flex gap-1.5"><input value={eff.newPlaylistTitle || ''} disabled={disabled} maxLength={150} placeholder="New playlist name" onChange={(e) => set({ newPlaylistTitle: e.target.value, playlistId: null })} className={fieldCls} />
                      <button type="button" className={chip(false)} onClick={() => { setNewPl(false); set({ newPlaylistTitle: null }); }}>Cancel</button></div>
                  ) : (
                    <select value={eff.playlistId || ''} disabled={disabled} onChange={(e) => { if (e.target.value === '__new') { setNewPl(true); set({ playlistId: null }); } else set({ playlistId: e.target.value || null, newPlaylistTitle: null }); }} className={fieldCls}>
                      <option value="">No playlist</option>
                      {(meta?.playlists || []).map((p) => <option key={p.id} value={p.id}>{p.title}{p.privacy && p.privacy !== 'public' ? ` (${p.privacy})` : ''}</option>)}
                      <option value="__new">+ Create new playlist</option>
                    </select>
                  )}
                  {meta?.playlistsError && !meta.needsReconnect && <p className="mt-1 text-[10.5px] text-slate-500">Playlists could not be loaded; you can still create a new one.</p>}
                </div>
                <div><span className={lblCls}>Custom thumbnail</span>
                  <div className="flex items-center gap-2">
                    {eff.thumbnailUrl ? <img src={eff.thumbnailUrl} alt="" className="h-[45px] w-[80px] rounded-[6px] object-cover ring-1 ring-black/5" /> : <span className="grid h-[45px] w-[80px] place-items-center rounded-[6px] bg-slate-100 text-slate-400 dark:bg-white/5"><ImagePlus className="h-4 w-4" /></span>}
                    <label className={`${chip(false)} cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}>{thumbBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{eff.thumbnailUrl ? 'Change' : 'Upload'}
                      <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { pickThumb(e.target.files?.[0]); e.target.value = ''; }} /></label>
                    {eff.thumbnailUrl && <button type="button" disabled={disabled} aria-label="Remove thumbnail" className={chip(false)} onClick={() => set({ thumbnailUrl: null })}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <p className="mt-1 text-[10.5px] text-slate-500">JPG/PNG, 1280x720, max 2 MB. Needs a verified channel; if YouTube refuses it the video is still published.</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={`flex items-start gap-2 text-[11.5px] ${!scheduleOn ? 'opacity-50' : ''}`}>
                  <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-blue-600" disabled={disabled || !scheduleOn} checked={!!eff.useNativeSchedule && scheduleOn} onChange={(e) => set({ useNativeSchedule: e.target.checked })} />
                  <span><b>Let YouTube publish at the scheduled time.</b> The video is uploaded right away as Private and YouTube makes it {YT_PRIVACY.find((p) => p.id === (eff.privacy || 'public'))?.label} at the post time. Off: WebSoft uploads it at the post time.{!scheduleOn && ' (Schedule is off, so posts go out now.)'}</span>
                </label>
                <label className="flex items-start gap-2 text-[11.5px]">
                  <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-blue-600" disabled={disabled} checked={!!eff.appendShortsTag} onChange={(e) => set({ appendShortsTag: e.target.checked })} />
                  <span>Add <b>#Shorts</b> to the description. {shorts ? <span className="font-semibold text-rose-600">This video is vertical/square and 3 min or shorter, so YouTube will show it as a Short.</span> : 'Shorts are vertical or square videos up to 3 minutes; YouTube detects them automatically.'}</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STEP_LABEL: Record<string, string> = { upload: 'Video upload', thumbnail: 'Thumbnail', playlist: 'Playlist', live_broadcast: 'Live broadcast', live_stream: 'Stream', live_bind: 'Bind stream' };

/** Read-only summary of a post's YouTube settings (Scheduled & history -> Details). */
export function YouTubeOptionsSummary({ opts }: { opts: YouTubeOpts | null | undefined }) {
  if (!opts) return <p className="text-[12px] text-slate-500">Default YouTube settings (title from the caption, Public, People &amp; Blogs).</p>;
  const cat = STATIC_CATEGORIES.find((c) => c.id === opts.categoryId)?.title || opts.categoryId;
  const rows: [string, React.ReactNode][] = [
    ['Type', opts.live?.enabled ? `Live stream, starts ${opts.live.scheduledStart ? new Date(opts.live.scheduledStart).toLocaleString() : '-'}` : 'Video upload'],
    ['Title', opts.title || 'From the caption'],
    ['Visibility', YT_PRIVACY.find((p) => p.id === (opts.privacy || 'public'))?.label],
    ['Made for kids', opts.madeForKids ? 'Yes' : 'No'],
  ];
  if (!opts.live?.enabled) {
    if (opts.description) rows.push(['Description', <span className="line-clamp-3 whitespace-pre-wrap">{opts.description}</span>]);
    if (opts.tags?.length) rows.push(['Tags', opts.tags.join(', ')]);
    if (cat) rows.push(['Category', cat]);
    if (opts.defaultLanguage || opts.defaultAudioLanguage) rows.push(['Language', [opts.defaultLanguage, opts.defaultAudioLanguage && `audio ${opts.defaultAudioLanguage}`].filter(Boolean).join(', ')]);
    if (opts.playlistId || opts.newPlaylistTitle) rows.push(['Playlist', opts.newPlaylistTitle ? `New: ${opts.newPlaylistTitle}` : 'Existing playlist']);
    if (opts.thumbnailUrl) rows.push(['Thumbnail', <img src={opts.thumbnailUrl} alt="" className="h-[36px] w-[64px] rounded object-cover" />]);
    rows.push(['Publishing', opts.useNativeSchedule ? 'YouTube schedule (uploaded early as Private)' : 'Uploaded at the post time']);
    if (opts.appendShortsTag) rows.push(['Shorts', '#Shorts added']);
  }
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
      {rows.map(([k, v]) => <React.Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-200">{v}</dd></React.Fragment>)}
    </dl>
  );
}

/** Per-step result of a YouTube delivery + the owner-only live stream key (masked, reveal / copy). */
export function YouTubeResultPanel({ result, fetchKey }: { result: YtDeliveryResult | null | undefined; fetchKey: () => Promise<{ rtmpUrl: string; streamKey: string }> }) {
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!result) return null;
  const reveal = async () => {
    if (key) { setKey(null); return; }
    setBusy(true);
    try { setKey((await fetchKey()).streamKey); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); } catch { toast.error('Copy failed'); } };
  const copyKey = async () => { setBusy(true); try { await copy((await fetchKey()).streamKey, 'Stream key'); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <div className="mt-1.5 space-y-1.5 pl-[26px]">
      {result.steps.length > 0 && <ul className="flex flex-wrap gap-1.5">{result.steps.map((s, i) => (
        <li key={i} title={s.message || ''} className={`inline-flex items-center gap-1 rounded-full px-2 py-px text-[10.5px] font-semibold ${s.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{s.ok ? '\u2713' : '!'} {STEP_LABEL[s.step] || s.step}</li>))}</ul>}
      {result.steps.filter((s) => !s.ok || (s.step === 'upload' && s.message)).map((s, i) => <p key={i} className={`text-[11px] ${s.ok ? 'text-slate-500' : 'text-amber-700 dark:text-amber-300'}`}>{STEP_LABEL[s.step] || s.step}: {s.message}</p>)}
      {result.live && (
        <div className="space-y-1 rounded-[10px] border border-rose-100 bg-white p-2 text-[11.5px] dark:border-rose-500/20 dark:bg-transparent">
          <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300"><Radio className="h-3.5 w-3.5" />Live broadcast{result.live.scheduledStart && <span className="font-normal text-slate-500">starts {new Date(result.live.scheduledStart).toLocaleString()}</span>}</div>
          {result.live.rtmpUrl && <div className="flex items-center gap-1.5"><span className="w-[70px] shrink-0 text-slate-500">RTMP URL</span><code className="min-w-0 flex-1 truncate">{result.live.rtmpUrl}</code><button type="button" aria-label="Copy RTMP URL" onClick={() => void copy(result.live!.rtmpUrl!, 'RTMP URL')} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button></div>}
          {result.live.hasKey && <div className="flex items-center gap-1.5"><span className="w-[70px] shrink-0 text-slate-500">Stream key</span><code className="min-w-0 flex-1 truncate">{key || result.live.streamKeyMasked}</code>
            <button type="button" aria-label={key ? 'Hide stream key' : 'Reveal stream key'} disabled={busy} onClick={() => void reveal()} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-white/10">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : key ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
            <button type="button" aria-label="Copy stream key" disabled={busy} onClick={() => void copyKey()} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button></div>}
          <p className="text-[10.5px] text-slate-500">Keep the stream key secret: anyone with it can stream to your channel. Paste both into OBS or your encoder.</p>
        </div>
      )}
    </div>
  );
}