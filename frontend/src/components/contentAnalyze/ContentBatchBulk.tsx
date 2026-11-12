import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { creatorHubPath } from '../../lib/creatorHub';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CalendarClock, Check, CheckCircle2, Clock3, Eye, Hash, Image as ImageIcon, Layers, Loader2, Lock, Play,
  Plus, Send, Trash2, Type, UploadCloud, Users, AlertTriangle, Globe2, ExternalLink, Save,
} from 'lucide-react';
import { useStore } from '../../store';
import {
  batchFetch, BatchDetail, fromLocalInput, PLATFORM_OPTIONS, PlatformIcon, toLocalInput, uploadBatchMedia,
} from '../creator/batch/batchApi';
import { useCreatorSpace } from '../../lib/creatorSpaceContext';

type Privacy = 'public' | 'friends' | 'followers' | 'private';
type RowStatus = 'uploading' | 'upload_failed' | 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';
interface Row {
  key: string; id?: string; file?: File; localUrl?: string; mediaUrl: string | null; mediaType: 'image' | 'video' | null;
  caption: string; privacy: Privacy; platforms: string[]; scheduledAt: string | null; status: RowStatus; error?: string | null; progress?: number; postId?: string | null;
}
const PRIV: { id: Privacy; label: string; icon: React.ElementType }[] = [
  { id: 'public', label: 'Public', icon: Globe2 }, { id: 'friends', label: 'Friends', icon: Users }, { id: 'followers', label: 'Followers', icon: Users }, { id: 'private', label: 'Only me', icon: Lock },
];
const STATUS_UI: Record<RowStatus, { label: string; cls: string }> = {
  uploading: { label: 'Uploading', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  upload_failed: { label: 'Upload failed', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' },
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  processing: { label: 'Processing', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' },
};
const surface = 'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/[0.07] dark:bg-[#12141d]';
const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white';
const ghost = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]';
const primary = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50';
const MAX_FILES = 50;
let seq = 0;
const newKey = () => `r${Date.now()}-${seq++}`;

function rowFromItem(it: any, batchPrivacy: string, batchPlatforms: string[]): Row {
  const due = it.status === 'scheduled' && it.scheduledAt && new Date(it.scheduledAt).getTime() <= Date.now();
  return {
    key: it.id, id: it.id, mediaUrl: it.mediaUrl, mediaType: it.mediaType === 'video' ? 'video' : it.mediaUrl ? 'image' : null,
    caption: it.caption || '', privacy: (it.privacy || batchPrivacy || 'public') as Privacy, platforms: it.platforms || batchPlatforms || ['wevsoft'],
    scheduledAt: it.scheduledAt, status: due ? 'processing' : it.status, error: it.error, postId: it.postId,
  };
}

export default function ContentBatchBulk() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const token = useStore((s: any) => s.token) as string | null;
  const user = useStore((s: any) => s.user);
  const { spaceId } = useCreatorSpace();
  const [batchId, setBatchId] = useState<string | null>(params.get('id'));
  const [name, setName] = useState(`Bulk upload ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [bulkCaption, setBulkCaption] = useState('');
  const [captionMode, setCaptionMode] = useState<'replace' | 'append'>('replace');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkStart, setBulkStart] = useState('');
  const [bulkGap, setBulkGap] = useState(0);
  const [bulkPrivacy, setBulkPrivacy] = useState<Privacy | ''>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (id: string, quiet = false) => {
    try {
      const r = await batchFetch<{ batch: BatchDetail & { items: any[] } }>(token, `/${id}`, {}, spaceId);
      setName(r.batch.name);
      setRows((prev) => {
        const fresh = r.batch.items.map((it) => rowFromItem(it, r.batch.privacy, r.batch.platforms));
        const pendingUploads = prev.filter((p) => !p.id && (p.status === 'uploading' || p.status === 'upload_failed'));
        return [...fresh, ...pendingUploads];
      });
    } catch (e: any) { if (!quiet) toast.error(e.message); }
  }, [token, spaceId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (batchId) void load(batchId); }, []);  

  // live status while anything is scheduled/processing
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const live = rows.some((r) => r.status === 'processing' || (r.status === 'scheduled' && r.scheduledAt && new Date(r.scheduledAt).getTime() - Date.now() < 120000));
  useEffect(() => { if (!batchId || !live) return; const t = setInterval(() => load(batchId, true), 5000); return () => clearInterval(t); }, [batchId, live, load]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const editable = (r: Row) => r.status === 'draft' || r.status === 'upload_failed';

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
    if (!list.length) { toast.error('Choose photos or videos'); return; }
    const room = MAX_FILES - rows.length; if (room <= 0) { toast.error(`Max ${MAX_FILES} items per batch`); return; }
    const take = list.slice(0, room); if (list.length > room) toast(`Only the first ${room} files were added (max ${MAX_FILES}).`);
    const fresh: Row[] = take.map((f) => ({ key: newKey(), file: f, localUrl: URL.createObjectURL(f), mediaUrl: null, mediaType: f.type.startsWith('video/') ? 'video' : 'image', caption: '', privacy: 'public', platforms: ['wevsoft'], scheduledAt: null, status: 'uploading', progress: 0 }));
    setRows((rs) => [...rs, ...fresh]);
    if (!focus && fresh[0]) setFocus(fresh[0].key);
    // upload 3 at a time through the app's media endpoint
    let i = 0;
    const worker = async () => { while (i < fresh.length) { const r = fresh[i++]; try { const up = await uploadBatchMedia(token, r.file!); patch(r.key, { mediaUrl: up.url, mediaType: up.type, status: 'draft' }); } catch (e: any) { patch(r.key, { status: 'upload_failed', error: e.message }); } } };
    await Promise.all([worker(), worker(), worker()]);
  };
  const retryUpload = async (r: Row) => { if (!r.file) return; patch(r.key, { status: 'uploading', error: null }); try { const up = await uploadBatchMedia(token, r.file); patch(r.key, { mediaUrl: up.url, mediaType: up.type, status: 'draft' }); } catch (e: any) { patch(r.key, { status: 'upload_failed', error: e.message }); } };

  const selectedRows = rows.filter((r) => sel.has(r.key) && editable(r));
  const targets = selectedRows.length ? selectedRows : rows.filter(editable);
  const applyBulk = (what: 'caption' | 'tags' | 'schedule' | 'privacy') => {
    if (!targets.length) { toast.error('No editable drafts'); return; }
    const keys = new Set(targets.map((t) => t.key));
    if (what === 'schedule' && !bulkStart) { toast.error('Pick a start date & time'); return; }
    let n = 0;
    setRows((rs) => rs.map((r) => {
      if (!keys.has(r.key)) return r;
      if (what === 'caption') return { ...r, caption: captionMode === 'replace' ? bulkCaption : [r.caption, bulkCaption].filter(Boolean).join('\n') };
      if (what === 'tags') { const tags = bulkTags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : `#${t}`)); const missing = tags.filter((t) => !r.caption.toLowerCase().includes(t.toLowerCase())); return missing.length ? { ...r, caption: `${r.caption}${r.caption ? ' ' : ''}${missing.join(' ')}` } : r; }
      if (what === 'privacy') return bulkPrivacy ? { ...r, privacy: bulkPrivacy } : r;
      const base = new Date(bulkStart).getTime(); const at = new Date(base + (n++) * bulkGap * 3600000); return { ...r, scheduledAt: at.toISOString() };
    }));
    toast.success(`Applied to ${targets.length} item${targets.length === 1 ? '' : 's'}`);
  };

  const payloadItems = () => rows.filter((r) => r.status !== 'uploading' && r.status !== 'upload_failed' && r.status !== 'published').map((r) => ({ caption: r.caption, mediaUrl: r.mediaUrl, mediaType: r.mediaType, scheduledAt: r.scheduledAt, privacy: r.privacy, platforms: r.platforms }));
  const save = async (action: 'draft' | 'schedule' | 'publish_now') => {
    if (rows.some((r) => r.status === 'uploading')) { toast.error('Wait for uploads to finish'); return; }
    const items = payloadItems();
    if (!items.length) { toast.error('Add at least one item'); return; }
    if (action !== 'draft') {
      const empty = items.findIndex((i) => !i.caption && !i.mediaUrl); if (empty >= 0) { toast.error(`Item ${empty + 1} needs a caption or media`); return; }
      if (!items.some((i) => i.platforms.includes('wevsoft'))) { toast.error('Select Wevsoft on at least one item. Other platforms are not connected yet.'); return; }
    }
    if (action === 'schedule') {
      const missing = items.filter((i) => i.platforms.includes('wevsoft') && (!i.scheduledAt || new Date(i.scheduledAt).getTime() < Date.now() + 60000)).length;
      if (missing) { toast.error(`${missing} item${missing === 1 ? ' has' : 's have'} no future date/time — set one or use Publish now`); return; }
    }
    setBusy(action);
    try {
      const body = { name: name.trim() || 'Bulk upload', items, action, platforms: ['wevsoft'], privacy: 'public', category: 'Bulk upload' };
      const r = batchId
        ? await batchFetch<{ batch: any }>(token, `/${batchId}`, { method: 'PATCH', body: JSON.stringify(body) }, spaceId)
        : await batchFetch<{ batch: any }>(token, '', { method: 'POST', body: JSON.stringify(body) }, spaceId);
      const id = r.batch.id as string; setBatchId(id);
      const p = new URLSearchParams(params); p.set('view', 'batch-create'); p.set('id', id); setParams(p, { replace: true });
      const pending = rows.filter((x) => x.status === 'upload_failed');
      setRows([...r.batch.items.map((it: any) => rowFromItem(it, r.batch.privacy, r.batch.platforms)), ...pending]); setSel(new Set());
      toast.success(action === 'draft' ? 'Draft saved' : action === 'schedule' ? 'Scheduled on Wevsoft' : 'Publishing now — posts go live within ~30 seconds');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const counts = useMemo(() => { const c: Record<string, number> = {}; rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; }); return c; }, [rows]);
  const doneCount = (counts.published || 0);
  const goingCount = (counts.scheduled || 0) + (counts.processing || 0) + doneCount;
  const focused = rows.find((r) => r.key === focus) || rows[0];
  const allChecked = rows.length > 0 && rows.filter(editable).every((r) => sel.has(r.key)) && rows.some(editable);

  const Thumb = ({ r, cls }: { r: Row; cls: string }) => {
    const src = r.localUrl || r.mediaUrl;
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5 ${cls}`}>
        {src && r.mediaType === 'video' ? <video src={`${src}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Type className="h-4 w-4 text-slate-400" /></div>}
        {r.mediaType === 'video' && <span className="absolute inset-0 grid place-items-center"><span className="grid h-6 w-6 place-items-center rounded-full bg-black/45"><Play className="h-3 w-3 fill-white text-white" /></span></span>}
        {r.status === 'uploading' && <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></span>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 dark:bg-[#0b0d14] dark:text-slate-100">
      <div className="mx-auto max-w-[1320px] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" aria-label="Back" onClick={() => navigate('/studio/content')} className="mt-1 grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"><ArrowLeft className="h-4 w-4" /></button>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-500/10"><Layers className="h-6 w-6 text-blue-600" /></span>
            <div>
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">Bulk Upload</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Upload many photos and videos, edit each post, then publish now or schedule them all.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {batchId && <button type="button" className={ghost} onClick={() => navigate(creatorHubPath('batch'))}><ExternalLink className="h-4 w-4" />Open in Creator Batch</button>}
            <button type="button" className={ghost} disabled={!!busy || !rows.length} onClick={() => save('draft')}>{busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save draft</button>
            <button type="button" className={ghost} disabled={!!busy || !rows.some(editable)} onClick={() => save('schedule')}>{busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}Schedule all</button>
            <button type="button" className={primary} disabled={!!busy || !rows.some(editable)} onClick={() => save('publish_now')}>{busy === 'publish_now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish now</button>
          </div>
        </div>

        {/* name + progress */}
        <div className={`${surface} mt-5 flex flex-wrap items-center gap-4 p-4`}>
          <label className="min-w-[240px] flex-1 text-xs font-semibold text-slate-500">Batch name<input className={`${inp} mt-1 font-semibold text-slate-900`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
          <div className="flex flex-wrap gap-2">{(Object.keys(STATUS_UI) as RowStatus[]).filter((s) => counts[s]).map((s) => <span key={s} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_UI[s].cls}`}>{STATUS_UI[s].label} {counts[s]}</span>)}</div>
          {goingCount > 0 && <div className="w-full"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Publishing progress</span><span>{doneCount} of {goingCount} published</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${goingCount ? (doneCount / goingCount) * 100 : 0}%` }} /></div></div>}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            {/* Drop zone */}
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
              className={`${surface} flex flex-col items-center gap-2 border-2 border-dashed p-6 text-center transition ${drag ? '!border-blue-500 !bg-blue-50/60 dark:!bg-blue-500/10' : '!border-blue-200 dark:!border-white/10'} ${rows.length ? 'sm:flex-row sm:text-left' : 'py-12'}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-500/10"><UploadCloud className="h-6 w-6 text-blue-600" /></span>
              <div className="flex-1"><div className="font-bold">{rows.length ? 'Add more photos or videos' : 'Drag & drop photos and videos here'}</div><div className="text-xs text-slate-500">Up to {MAX_FILES} files per batch · JPG, PNG, WEBP, MP4, MOV, WEBM · each file becomes its own post</div></div>
              <button type="button" className={primary} onClick={() => fileRef.current?.click()}><Plus className="h-4 w-4" />Choose files</button>
              <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
            </div>

            {rows.length > 0 && (
              <section className={surface}>
                {/* bulk edit bar */}
                <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-2 2xl:grid-cols-4 dark:border-white/5">
                  <div><div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Caption</span><span className="flex gap-1">{(['replace', 'append'] as const).map((m) => <button key={m} type="button" onClick={() => setCaptionMode(m)} className={`rounded px-1.5 capitalize ${captionMode === m ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : ''}`}>{m}</button>)}</span></div>
                    <div className="flex gap-2"><input className={inp} placeholder="Caption for selected" value={bulkCaption} onChange={(e) => setBulkCaption(e.target.value)} /><button type="button" className={ghost + ' !px-3'} onClick={() => applyBulk('caption')}>Apply</button></div></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-500">Hashtags</div><div className="flex gap-2"><input className={inp} placeholder="#travel #bangladesh" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} /><button type="button" className={ghost + ' !px-3'} disabled={!bulkTags.trim()} onClick={() => applyBulk('tags')}><Hash className="h-4 w-4" /></button></div></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-500">Schedule from · spacing</div><div className="flex gap-2"><input type="datetime-local" className={inp} value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} /><select className={inp + ' !w-24'} value={bulkGap} onChange={(e) => setBulkGap(Number(e.target.value))}><option value={0}>Same</option><option value={1}>+1h</option><option value={3}>+3h</option><option value={6}>+6h</option><option value={24}>+1 day</option></select><button type="button" className={ghost + ' !px-3'} onClick={() => applyBulk('schedule')}><Clock3 className="h-4 w-4" /></button></div></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-500">Audience</div><div className="flex gap-2"><select className={inp} value={bulkPrivacy} onChange={(e) => setBulkPrivacy(e.target.value as Privacy)}><option value="">Choose…</option>{PRIV.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select><button type="button" className={ghost + ' !px-3'} disabled={!bulkPrivacy} onClick={() => applyBulk('privacy')}>Apply</button></div></div>
                  <p className="text-[11px] text-slate-500 lg:col-span-2 2xl:col-span-4">{selectedRows.length ? `Bulk edits apply to ${selectedRows.length} selected draft${selectedRows.length === 1 ? '' : 's'}.` : 'Nothing selected — bulk edits apply to all drafts.'} Scheduled and published items are locked.</p>
                </div>

                <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-sm dark:border-white/5">
                  <button type="button" role="checkbox" aria-checked={allChecked} onClick={() => setSel(allChecked ? new Set() : new Set(rows.filter(editable).map((r) => r.key)))} className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border ${allChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>{allChecked && <Check className="h-3 w-3" />}</button>
                  <span className="font-medium">Select all drafts</span>
                  {sel.size > 0 && <button type="button" className="ml-auto flex items-center gap-1 text-xs font-semibold text-rose-600" onClick={() => { setRows((rs) => rs.filter((r) => !(sel.has(r.key) && editable(r)))); setSel(new Set()); }}><Trash2 className="h-3.5 w-3.5" />Remove selected</button>}
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {rows.map((r, idx) => { const on = sel.has(r.key); const ed = editable(r); return (
                    <li key={r.key} onClick={() => setFocus(r.key)} className={`grid gap-3 p-4 md:grid-cols-[auto_auto_minmax(0,1fr)_200px] ${focus === r.key ? 'bg-blue-50/40 dark:bg-blue-500/[0.05]' : ''}`}>
                      <button type="button" role="checkbox" aria-checked={on} disabled={!ed} onClick={(e) => { e.stopPropagation(); setSel((s) => { const n = new Set(s); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; }); }} className={`mt-1 grid h-[18px] w-[18px] place-items-center rounded-[5px] border disabled:opacity-30 ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>{on && <Check className="h-3 w-3" />}</button>
                      <Thumb r={r} cls="h-24 w-32" />
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">#{idx + 1}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_UI[r.status].cls}`}>{STATUS_UI[r.status].label}</span>{r.error && <span className="flex items-center gap-1 truncate text-[11px] text-rose-600"><AlertTriangle className="h-3 w-3" />{r.error}</span>}{r.status === 'upload_failed' && r.file && <button type="button" className="text-[11px] font-semibold text-blue-600" onClick={() => retryUpload(r)}>Retry</button>}</div>
                        <textarea disabled={!ed} className={`${inp} min-h-[64px] resize-y disabled:opacity-70`} placeholder="Write a caption…" value={r.caption} onChange={(e) => patch(r.key, { caption: e.target.value })} maxLength={5000} />
                        <div className="flex flex-wrap items-center gap-1.5">
                          {PLATFORM_OPTIONS.map((p) => { const onP = r.platforms.includes(p.id); return (
                            <button key={p.id} type="button" disabled={!ed} title={p.live ? p.label : `${p.label} — saved as a target only (not connected yet)`} onClick={() => patch(r.key, { platforms: onP ? r.platforms.filter((x) => x !== p.id) : [...r.platforms, p.id] })} className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${onP ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>
                              <PlatformIcon id={p.id} size={14} />{p.label}{!p.live && <span className="text-[9px] font-medium opacity-70">target</span>}
                            </button>
                          ); })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-500">Audience<select disabled={!ed} className={`${inp} mt-1`} value={r.privacy} onChange={(e) => patch(r.key, { privacy: e.target.value as Privacy })}>{PRIV.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
                        <label className="block text-[11px] font-semibold text-slate-500">Schedule<input type="datetime-local" disabled={!ed} className={`${inp} mt-1`} value={toLocalInput(r.scheduledAt)} onChange={(e) => patch(r.key, { scheduledAt: fromLocalInput(e.target.value) })} /></label>
                        <div className="flex justify-between">{r.postId && r.status === 'published' ? <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => navigate(`/posts/${r.postId}`)}>View post</button> : <span />}{ed && <button type="button" className="flex items-center gap-1 text-xs font-semibold text-rose-600" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 className="h-3.5 w-3.5" />Remove</button>}</div>
                      </div>
                    </li>
                  ); })}
                </ul>
              </section>
            )}
          </div>

          {/* Preview */}
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className={`${surface} p-4`}>
              <div className="mb-3 flex items-center gap-2 font-bold"><Eye className="h-4 w-4 text-blue-600" />Preview</div>
              {focused ? (
                <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/[0.07]">
                  <div className="flex items-center gap-2.5 p-3">
                    {user?.avatar ? <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{(user?.name || 'U')[0]}</span>}
                    <div className="leading-tight"><div className="text-sm font-bold">{user?.name}</div><div className="flex items-center gap-1 text-[11px] text-slate-500">{focused.scheduledAt ? new Date(focused.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now'} · {(() => { const P = PRIV.find((p) => p.id === focused.privacy)!; return <><P.icon className="h-3 w-3" />{P.label}</>; })()}</div></div>
                  </div>
                  {focused.caption && <p className="whitespace-pre-wrap px-3 pb-3 text-sm">{focused.caption}</p>}
                  {(focused.localUrl || focused.mediaUrl) && (focused.mediaType === 'video' ? <video src={focused.localUrl || focused.mediaUrl!} controls muted className="max-h-80 w-full bg-black" /> : <img src={focused.localUrl || focused.mediaUrl!} alt="" className="max-h-80 w-full object-cover" />)}
                  <div className="flex justify-around border-t border-slate-100 py-2 text-xs font-semibold text-slate-500 dark:border-white/5"><span>Like</span><span>Comment</span><span>Share</span></div>
                </div>
              ) : <div className="grid h-48 place-items-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-white/[0.03]"><ImageIcon className="h-6 w-6" /></div>}
            </section>
            <section className={`${surface} p-4 text-xs text-slate-600 dark:text-slate-300`}>
              <div className="mb-2 font-bold text-slate-900 dark:text-white">How publishing works</div>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /><span>Each Wevsoft item becomes a real post. <b>Publish now</b> goes live within ~30 seconds; <b>Schedule all</b> posts at each item’s time.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />Status updates live: Draft → Scheduled → Processing → Published (or Failed).</li>
                <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />Facebook, Instagram, YouTube, TikTok, X and LinkedIn are saved as targets only — they aren’t connected, so nothing is posted there.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
