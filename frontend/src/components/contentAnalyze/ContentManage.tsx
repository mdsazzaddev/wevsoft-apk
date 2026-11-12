import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3, Bell, Calendar, CheckSquare, ChevronDown, Download, Eye, EyeOff, FileText, Flame, FolderMinus, FolderPlus, Heart,
  Image as ImageIcon, LayoutGrid, Link2, List, Loader2, Lock, Megaphone, Moon, MoreHorizontal, Pin, PinOff, Play, Search, Sun,
  Trash2, TrendingUp, Upload, Clapperboard, CircleDot, X, ScanSearch, Layers,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../store';
import { batchCreateAppUrl } from '../../lib/batchStudio';
import { isBusinessAppHost } from '../../lib/consumerAppUrl';
import { personalCreatorHubPath } from '../../lib/creatorHub';
import { fmtCount } from '../../lib/contentAnalysis';

type Kind = 'photo' | 'video' | 'reel' | 'link' | 'story' | 'text';
export interface ManageItem {
  id: string; source: 'post' | 'reel' | 'story'; kind: Kind; title: string; text: string; createdAt: string; privacy: string;
  pinned: boolean; hidden: boolean; albumId: string | null; thumbUrl: string | null; thumbIsVideo: boolean; durationSec: number | null;
  media: { url: string; type: string }[]; allowDownload: boolean; reach: number; engagement: number; likes: number; comments: number; shares: number; reachDelta: number | null;
}
interface ManageData {
  counts: Record<string, number>; items: ManageItem[]; chart: { date: string; reach: number; engagement: number }[]; top: ManageItem[]; allTime: boolean;
  overview: { totalPosts: number; totalReach: number; totalEngagement: number; engagementRate: number | null; deltas: { posts: number | null; reach: number | null; engagement: number | null; rate: number | null }; chartNote?: string };
}

const tok = () => useStore.getState().token;
async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${tok()}` }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const t = await r.text(); let b: any; try { b = t ? JSON.parse(t) : null; } catch { b = { error: t }; }
  if (!r.ok) throw new Error(b?.error || `Request failed (${r.status})`);
  return b as T;
}

const surface = 'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/[0.07] dark:bg-[#12141d]';
const ago = (d: string) => { const s = (Date.now() - +new Date(d)) / 1000; if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hours ago`; const n = Math.floor(s / 86400); return n === 1 ? '1 day ago' : n < 30 ? `${n} days ago` : new Date(d).toLocaleDateString(); };
const dur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const KIND_LABEL: Record<Kind, string> = { photo: 'Photo', video: 'Video', reel: 'Reel', link: 'Link', story: 'Story', text: 'Text' };
const TABS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Posts', icon: CheckSquare }, { id: 'photo', label: 'Photos', icon: ImageIcon }, { id: 'video', label: 'Videos', icon: Play },
  { id: 'reel', label: 'Reels', icon: Clapperboard }, { id: 'link', label: 'Links', icon: Link2 }, { id: 'story', label: 'Stories', icon: CircleDot },
];
const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: '7', label: 'Last 7 days', days: 7 }, { id: '30', label: 'Last 30 days', days: 30 }, { id: '90', label: 'Last 90 days', days: 90 }, { id: '365', label: 'Last 12 months', days: 365 }, { id: 'all', label: 'All time', days: null },
];
const SORTS: { id: string; label: string }[] = [
  { id: 'new', label: 'Newest First' }, { id: 'old', label: 'Oldest First' }, { id: 'reach', label: 'Most Reach' }, { id: 'eng', label: 'Most Engagement' },
];

function privacyPill(p: string, hidden: boolean) {
  if (hidden) return { label: 'Hidden', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
  const v = (p || '').toLowerCase();
  if (v === 'public') return { label: 'Public', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
  if (v === 'friends' || v === 'close_friends') return { label: v === 'friends' ? 'Friends' : 'Close friends', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' };
  if (v === 'followers') return { label: 'Followers', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' };
  if (v === 'private' || v === 'only_me') return { label: 'Only me', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
  if (v === 'unlisted') return { label: 'Unlisted', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' };
  return { label: v ? v[0].toUpperCase() + v.slice(1) : '—', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
}

function Delta({ v }: { v: number | null | undefined }) {
  if (v == null || !isFinite(v)) return null;
  const up = v >= 0;
  return <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{up ? '↑' : '↓'} {Math.abs(v)}%</span>;
}

function Thumb({ it, className = 'h-12 w-[72px]' }: { it: ManageItem; className?: string }) {
  const [d, setD] = useState<number | null>(it.durationSec);
  const isVid = it.kind === 'video' || it.kind === 'reel' || it.thumbIsVideo;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 ${className}`}>
      {it.thumbUrl && it.thumbIsVideo ? <video src={`${it.thumbUrl}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" onLoadedMetadata={(e) => { if (d == null && isFinite(e.currentTarget.duration)) setD(e.currentTarget.duration); }} />
        : it.thumbUrl ? <img src={it.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center p-1 text-center text-[9px] font-semibold leading-tight text-slate-600 dark:text-slate-300">{it.kind === 'link' ? <Link2 className="h-4 w-4" /> : it.title.slice(0, 28)}</div>}
      {isVid && <span className="absolute left-1 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-black/45"><Play className="h-2.5 w-2.5 fill-white text-white" /></span>}
      {isVid && d ? <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] font-semibold text-white">{dur(d)}</span> : null}
    </div>
  );
}

function useClickAway(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => { const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, [ref, cb]);
}

function Menu({ open, onClose, children, align = 'left', className = '' }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: 'left' | 'right'; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, onClose);
  if (!open) return null;
  return <div ref={ref} role="menu" className={`absolute top-full z-40 mt-1.5 min-w-[250px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#171a24] ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}>{children}</div>;
}
function MenuItem({ icon: I, children, onClick, disabled, hint, danger }: { icon: React.ElementType; children: React.ReactNode; onClick?: () => void; disabled?: boolean; hint?: string; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} title={hint} onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition disabled:cursor-not-allowed disabled:opacity-45 ${danger ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'}`}>
      <I className="h-4 w-4 shrink-0" /><span className="flex-1 whitespace-nowrap">{children}</span>{hint && disabled && <span className="whitespace-nowrap text-[10px] font-semibold text-slate-400">{hint}</span>}
    </button>
  );
}

const POST_PRIVACY = [['public', 'Public'], ['friends', 'Friends'], ['followers', 'Followers'], ['private', 'Only me']] as const;
const REEL_PRIVACY = [['public', 'Public'], ['followers', 'Followers'], ['private', 'Only me']] as const;

export default function ContentManage() {
  const navigate = useNavigate();
  const user = useStore((s: any) => s.user);
  const theme = useStore((s: any) => s.theme) as string;
  const setTheme = useStore((s: any) => s.setTheme) as (t: string) => void;
  const isDark = /dark|oled/i.test(theme || '');

  const [range, setRange] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('new');
  const [sortOpen, setSortOpen] = useState(false);
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [data, setData] = useState<ManageData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<ManageItem[] | null>(null);
  const [albumPick, setAlbumPick] = useState<ManageItem[] | null>(null);
  const [albums, setAlbums] = useState<{ id: string; name: string }[] | null>(null);
  const [working, setWorking] = useState(false);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');

  const rangeObj = RANGES.find((r) => r.id === range)!;
  const load = useCallback(async () => {
    setErr(null);
    try {
      const qs = rangeObj.days == null ? 'range=all' : `from=${new Date(Date.now() - rangeObj.days * 86400000).toISOString()}&to=${new Date().toISOString()}`;
      setData(await api<ManageData>(`/api/content-analysis/manage?${qs}`));
    } catch (e: any) { setErr(e.message); setData(null); }
  }, [rangeObj.days]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { api<any>('/api/notifications?limit=1').then((r) => setUnread(Number(r?.unread ?? r?.unreadCount ?? 0) || 0)).catch(() => {}); }, []);

  const key = (i: ManageItem) => `${i.source}:${i.id}`;
  const rows = useMemo(() => {
    const list = (data?.items || []).filter((i) => tab === 'all' || i.kind === tab);
    const s = [...list];
    if (sort === 'new') s.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === 'old') s.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    if (sort === 'reach') s.sort((a, b) => b.reach - a.reach);
    if (sort === 'eng') s.sort((a, b) => b.engagement - a.engagement);
    return s;
  }, [data, tab, sort]);
  const selected = rows.filter((r) => sel.has(key(r)));
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggle = (i: ManageItem) => setSel((s) => { const n = new Set(s); if (n.has(key(i))) n.delete(key(i)); else n.add(key(i)); return n; });
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setSel(new Set()), [tab, range]);

  // ---------- real actions ----------
  const run = async (label: string, targets: ManageItem[], fn: (i: ManageItem) => Promise<unknown> | null) => {
    setWorking(true); let ok = 0, skipped = 0, failed = 0;
    for (const t of targets) { const p = fn(t); if (!p) { skipped++; continue; } try { await p; ok++; } catch { failed++; } }
    setWorking(false); setBatchOpen(false); setRowMenu(null);
    const parts = [`${label}: ${ok} done`]; if (skipped) parts.push(`${skipped} not supported`); if (failed) parts.push(`${failed} failed`);
    (failed && !ok ? toast.error : toast.success)(parts.join(' · '));
    setSel(new Set()); await load();
  };
  const hide = (targets: ManageItem[], hidden: boolean) => run(hidden ? 'Hidden' : 'Unhidden', targets, (i) =>
    i.source === 'post' ? api(`/api/posts/${i.id}`, 'PATCH', { isArchived: hidden }) : i.source === 'reel' ? api(`/api/finance/content/${i.id}`, 'PATCH', { status: hidden ? 'archived' : 'published' }) : null);
  const del = (targets: ManageItem[]) => run('Deleted', targets, (i) =>
    i.source === 'post' ? api(`/api/posts/${i.id}`, 'DELETE') : i.source === 'reel' ? api(`/api/finance/content/${i.id}`, 'PATCH', { delete: true }) : null);
  const pin = (targets: ManageItem[], pinned: boolean) => {
    const posts = targets.filter((t) => t.source === 'post');
    if (pinned && posts.length > 1) toast('Only one post can be pinned to your profile — pinning the first selected.', { icon: '📌' });
    return run(pinned ? 'Pinned' : 'Unpinned', pinned ? [targets.find((t) => t.source === 'post') || targets[0]] : targets, (i) => i.source === 'post' ? api(`/api/posts/${i.id}`, 'PATCH', { pinned }) : null);
  };
  const setPrivacy = (i: ManageItem, privacy: string) => run('Privacy updated', [i], (x) =>
    x.source === 'post' ? api(`/api/posts/${x.id}`, 'PATCH', { privacy }) : x.source === 'reel' ? api(`/api/finance/content/${x.id}`, 'PATCH', { privacy }) : null);
  const openAlbums = async (targets: ManageItem[]) => {
    setBatchOpen(false); setRowMenu(null); setAlbumPick(targets); setAlbums(null);
    try { const r = await api<{ albums: { id: string; name: string }[] }>('/api/albums'); setAlbums(r.albums || []); } catch (e: any) { toast.error(e.message); setAlbums([]); }
  };
  const moveAlbum = (targets: ManageItem[], albumId: string | null) => run(albumId ? 'Added to collection' : 'Removed from collection', targets, (i) =>
    i.source === 'post' && i.media.length ? api(`/api/posts/${i.id}/move-album`, 'POST', { albumId }) : null);
  const download = async (targets: ManageItem[]) => {
    setBatchOpen(false); setRowMenu(null);
    const files = targets.flatMap((t) => (t.allowDownload ? t.media : []).map((m, n) => ({ ...m, name: `${t.kind}-${t.id.slice(0, 8)}-${n + 1}` })));
    if (!files.length) { toast.error('No downloadable media in the selection'); return; }
    setWorking(true); let ok = 0;
    for (const f of files) {
      try {
        const r = await fetch(f.url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error();
        const b = await r.blob(); const ext = (b.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('quicktime', 'mov');
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${f.name}.${ext}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); ok++;
      } catch { /* skip */ }
    }
    setWorking(false); (ok ? toast.success : toast.error)(`Downloaded ${ok} of ${files.length} files`);
  };
  const exportCsv = () => {
    const list = selected.length ? selected : rows;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['id', 'type', 'title', 'created_at', 'privacy', 'hidden', 'pinned', 'reach', 'engagement', 'likes', 'comments', 'shares', 'reach_change_pct'];
    const lines = [head.join(','), ...list.map((i) => [i.id, KIND_LABEL[i.kind], i.title, new Date(i.createdAt).toISOString(), i.privacy, i.hidden, i.pinned, i.reach, i.engagement, i.likes, i.comments, i.shares, i.reachDelta ?? ''].map(esc).join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `wevsoft-content-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast.success(`Exported ${list.length} rows`);
  };
  const analyze = (i?: ManageItem) => {
    if (i) sessionStorage.setItem('ca-prefill', JSON.stringify({ title: i.title.slice(0, 120), text: i.text }));
    navigate('/studio/content?view=analyze');
  };
  const viewHref = (i: ManageItem) => (i.source === 'post' ? `/posts/${i.id}` : i.source === 'reel' ? `/reels/${i.id}` : null);

  const anyPost = selected.some((s) => s.source === 'post');
  const anyHideable = selected.some((s) => s.source !== 'story');
  const anyMediaPost = selected.some((s) => s.source === 'post' && s.media.length);
  const ov = data?.overview;
  const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const rangeText = rangeObj.days == null ? 'All time' : `${new Date(Date.now() - rangeObj.days * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const initials = (user?.name || 'U').split(' ').map((s: string) => s[0]).slice(0, 2).join('');

  const RowMenu = ({ i }: { i: ManageItem }) => {
    const [priv, setPriv] = useState(false);
    const href = viewHref(i);
    const opts = i.source === 'reel' ? REEL_PRIVACY : POST_PRIVACY;
    return (
      <Menu open={rowMenu === key(i)} onClose={() => setRowMenu(null)} align="right">
        {href ? <MenuItem icon={Eye} onClick={() => { setRowMenu(null); navigate(href); }}>View</MenuItem> : <MenuItem icon={Eye} disabled hint="No page">View</MenuItem>}
        <MenuItem icon={ScanSearch} onClick={() => analyze(i)}>Analyze</MenuItem>
        <MenuItem icon={Lock} disabled={i.source === 'story'} hint="Not supported" onClick={() => setPriv((p) => !p)}>Edit privacy</MenuItem>
        {priv && <div className="mb-1 ml-7 grid gap-0.5">{opts.map(([v, l]) => <button key={v} type="button" onClick={() => setPrivacy(i, v)} className={`rounded-md px-2 py-1 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5 ${i.privacy === v ? 'font-bold text-blue-600' : 'text-slate-600 dark:text-slate-300'}`}>{l}{i.privacy === v ? ' ✓' : ''}</button>)}</div>}
        <MenuItem icon={i.hidden ? Eye : EyeOff} disabled={i.source === 'story'} hint="Not supported" onClick={() => hide([i], !i.hidden)}>{i.hidden ? 'Unhide' : 'Hide'}</MenuItem>
        {i.source === 'post' && <MenuItem icon={i.pinned ? PinOff : Pin} onClick={() => pin([i], !i.pinned)}>{i.pinned ? 'Unpin' : 'Pin to profile'}</MenuItem>}
        {i.source === 'post' && i.media.length > 0 && <MenuItem icon={FolderPlus} onClick={() => openAlbums([i])}>Add to collection</MenuItem>}
        {i.media.length > 0 && <MenuItem icon={Download} onClick={() => download([i])} disabled={!i.allowDownload} hint="Download off">Download media</MenuItem>}
        <div className="my-1 h-px bg-slate-100 dark:bg-white/5" />
        <MenuItem icon={Trash2} danger disabled={i.source === 'story'} hint="Not supported" onClick={() => { setRowMenu(null); setConfirmDel([i]); }}>Delete</MenuItem>
      </Menu>
    );
  };

  const Check = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={onChange} className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white hover:border-blue-400 dark:border-white/20 dark:bg-transparent'}`}>
      {on && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );

  const metric = (v: number, d: number | null) => <div><div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{fmtCount(v)}</div><Delta v={d} /></div>;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 dark:bg-[#0b0d14] dark:text-slate-100">
      {/* App header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-white/[0.06] dark:bg-[#0e1018]/90">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2"><span className="text-lg font-extrabold tracking-tight">Content Analyze</span></Link>
          <form className="relative mx-auto hidden w-full max-w-[380px] md:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search anything on Wevsoft..." className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-20 text-sm outline-none focus:border-blue-400 focus:bg-white dark:border-white/10 dark:bg-white/5" />
            <span className="pointer-events-none absolute right-3.5 top-2 text-[11px] text-slate-400">Ctrl + K</span>
          </form>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <Link to="/notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</Link>
            <button type="button" aria-label="Toggle theme" onClick={() => setTheme(isDark ? 'Light mode' : 'Dark mode')} className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">{isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</button>
            <Link to="/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-white/5">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials}</span>}
              <span className="hidden leading-tight lg:block"><span className="block text-sm font-bold">{user?.name}</span><span className="block text-xs text-slate-500">@{user?.username}</span></span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 lg:block" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 py-4 sm:px-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Title */}
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-500/10"><BarChart3 className="h-6 w-6 text-blue-600" strokeWidth={2.4} /></span>
            <div><h1 className="text-[22px] font-extrabold leading-tight tracking-tight">Content Analyze</h1><p className="text-sm text-slate-500 dark:text-slate-400">Track your content performance, manage your posts and take action — all in one place.</p></div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setRangeOpen((o) => !o)} className={`${surface} flex h-10 w-full items-center gap-2.5 px-3.5 text-[13px] font-medium`}><Calendar className="h-4 w-4 text-blue-600" /><span className="flex-1 text-left">{rangeText}</span><ChevronDown className="h-4 w-4 text-slate-400" /></button>
            <Menu open={rangeOpen} onClose={() => setRangeOpen(false)} align="right" className="w-full">{RANGES.map((r) => <MenuItem key={r.id} icon={Calendar} onClick={() => { setRange(r.id); setRangeOpen(false); }}>{r.label}{r.id === range ? ' ✓' : ''}</MenuItem>)}</Menu>
          </div>

          {/* Main column */}
          <div className="min-w-0 space-y-4">
            <div className={`${surface} flex gap-1 overflow-x-auto p-1.5`}>
              {TABS.map((t) => { const on = tab === t.id; return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${on ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                  <t.icon className="h-4 w-4" />{t.label}
                </button>
              ); })}
              <button
                type="button"
                onClick={() => {
                  // Bulk Upload is Space/Business Batch only — personal mode stays in Creator Hub.
                  if (isBusinessAppHost()) window.location.assign(batchCreateAppUrl());
                  else navigate(personalCreatorHubPath('content_studio'));
                }}
                className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <Layers className="h-4 w-4" />{isBusinessAppHost() ? 'Bulk Upload' : 'Content Studio'}
              </button>
            </div>

            <section className={`${surface}`}>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5 dark:border-white/5">
                {/* eslint-disable-next-line react-hooks/static-components -- inline component kept as-is (existing behavior) */}
                <label className="mr-1 flex items-center gap-2.5 text-sm font-medium"><Check on={allChecked} onChange={() => setSel(allChecked ? new Set() : new Set(rows.map(key)))} label="Select all" />Select All</label>
                <div className="relative">
                  <button type="button" disabled={!selected.length || working} onClick={() => setBatchOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50">
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}Batch Actions<ChevronDown className="h-4 w-4" />
                  </button>
                  <Menu open={batchOpen} onClose={() => setBatchOpen(false)}>
                    <MenuItem icon={EyeOff} disabled={!anyHideable} hint="Not supported" onClick={() => hide(selected, true)}>Hide Posts</MenuItem>
                    <MenuItem icon={Trash2} disabled={!anyHideable} hint="Not supported" onClick={() => { setBatchOpen(false); setConfirmDel(selected); }}>Delete Posts</MenuItem>
                    <MenuItem icon={Pin} disabled={!anyPost} hint="Posts only" onClick={() => pin(selected, true)}>Pin Posts</MenuItem>
                    <MenuItem icon={PinOff} disabled={!selected.some((s) => s.pinned)} hint="None pinned" onClick={() => pin(selected.filter((s) => s.pinned), false)}>Unpin Posts</MenuItem>
                    <MenuItem icon={FolderPlus} disabled={!anyMediaPost} hint="Media posts only" onClick={() => openAlbums(selected)}>Add to Collection</MenuItem>
                    <MenuItem icon={FolderMinus} disabled={!selected.some((s) => s.albumId)} hint="None in a collection" onClick={() => moveAlbum(selected.filter((s) => s.albumId), null)}>Remove from Collection</MenuItem>
                    <MenuItem icon={Megaphone} disabled hint="Coming soon">Boost / Promote</MenuItem>
                    <MenuItem icon={Download} disabled={!selected.some((s) => s.media.length)} hint="No media" onClick={() => download(selected)}>Download Media</MenuItem>
                  </Menu>
                </div>
                <button type="button" onClick={() => analyze(selected[0])} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><BarChart3 className="h-4 w-4 text-blue-600" />Analyze</button>
                <button type="button" disabled={!rows.length} onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><Upload className="h-4 w-4 text-blue-600" />Export</button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="hidden text-sm text-slate-500 sm:block">Sort by:</span>
                  <div className="relative">
                    <button type="button" onClick={() => setSortOpen((o) => !o)} className="flex h-10 min-w-[150px] items-center justify-between gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-medium dark:border-white/10">{SORTS.find((s) => s.id === sort)!.label}<ChevronDown className="h-4 w-4 text-slate-400" /></button>
                    <Menu open={sortOpen} onClose={() => setSortOpen(false)} align="right">{SORTS.map((s) => <MenuItem key={s.id} icon={TrendingUp} onClick={() => { setSort(s.id); setSortOpen(false); }}>{s.label}{s.id === sort ? ' ✓' : ''}</MenuItem>)}</Menu>
                  </div>
                  <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-white/10">
                    <button type="button" aria-label="Grid view" onClick={() => setLayout('grid')} className={`grid h-8 w-8 place-items-center rounded-lg ${layout === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
                    <button type="button" aria-label="List view" onClick={() => setLayout('list')} className={`grid h-8 w-8 place-items-center rounded-lg ${layout === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><List className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>

              {!data && !err && <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></div>}
              {err && <div className="p-8 text-center text-sm text-rose-600">{err} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></div>}
              {data && !rows.length && <div className="flex flex-col items-center gap-2 py-16 text-center"><FileText className="h-8 w-8 text-slate-300" /><div className="font-semibold">No {tab === 'all' ? 'content' : TABS.find((t) => t.id === tab)!.label.toLowerCase()} in this period</div><p className="text-sm text-slate-500">Try a longer date range.</p></div>}

              {data && rows.length > 0 && layout === 'list' && (
                <>
                  <table className="hidden w-full table-fixed text-sm md:table">
                    <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500 dark:border-white/5 dark:text-slate-400"><th className="w-12 py-3 pl-4" /><th className="py-3 font-medium">Post</th><th className="w-[100px] font-medium">Reach</th><th className="w-[110px] font-medium">Engagement</th><th className="w-[110px] font-medium">Status</th><th className="w-20 pr-4 text-center font-medium">Actions</th></tr></thead>
                    <tbody>{rows.map((i) => { const on = sel.has(key(i)); const p = privacyPill(i.privacy, i.hidden); return (
                      <tr key={key(i)} className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${on ? 'bg-blue-50/50 dark:bg-blue-500/[0.06]' : 'hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'}`}>
                        <td className="py-2.5 pl-4"><Check on={on} onChange={() => toggle(i)} label={`Select ${i.title}`} /></td>
                        <td className="py-2.5 pr-4"><div className="flex min-w-0 items-center gap-3.5"><Thumb it={i} /><div className="min-w-0"><div className="flex items-center gap-1.5 truncate font-semibold">{i.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-blue-600" />}<span className="truncate">{i.title}</span></div><div className="text-xs text-slate-500">{ago(i.createdAt)} · {KIND_LABEL[i.kind]}</div></div></div></td>
                        <td>{metric(i.reach, i.reachDelta)}</td>
                        <td>{metric(i.engagement, null)}</td>
                        <td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.cls}`}>{p.label}</span></td>
                        <td className="pr-4 text-center"><div className="relative inline-block"><button type="button" aria-label="Actions" onClick={() => setRowMenu(rowMenu === key(i) ? null : key(i))} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5"><MoreHorizontal className="h-5 w-5" /></button><RowMenu i={i} /></div></td>
                      </tr>
                    ); })}</tbody>
                  </table>
                  <ul className="divide-y divide-slate-100 md:hidden dark:divide-white/5">{rows.map((i) => { const on = sel.has(key(i)); const p = privacyPill(i.privacy, i.hidden); return (
                    <li key={key(i)} className={`flex items-center gap-3 p-3 ${on ? 'bg-blue-50/50 dark:bg-blue-500/[0.06]' : ''}`}>
                      <Check on={on} onChange={() => toggle(i)} label={`Select ${i.title}`} /><Thumb it={i} className="h-14 w-16" />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{i.title}</div><div className="text-[11px] text-slate-500">{ago(i.createdAt)} · {KIND_LABEL[i.kind]}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="flex items-center gap-1"><Eye className="h-3 w-3 text-slate-400" />{fmtCount(i.reach)} <Delta v={i.reachDelta} /></span><span className="flex items-center gap-1"><Heart className="h-3 w-3 text-slate-400" />{fmtCount(i.engagement)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.cls}`}>{p.label}</span></div></div>
                      <div className="relative"><button type="button" aria-label="Actions" onClick={() => setRowMenu(rowMenu === key(i) ? null : key(i))} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600"><MoreHorizontal className="h-5 w-5" /></button><RowMenu i={i} /></div>
                    </li>
                  ); })}</ul>
                </>
              )}
              {data && rows.length > 0 && layout === 'grid' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 sm:grid-cols-3 lg:grid-cols-4">{rows.map((i) => { const on = sel.has(key(i)); const p = privacyPill(i.privacy, i.hidden); return (
                  <div key={key(i)} className={`group relative overflow-visible rounded-xl border transition ${on ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80 dark:border-white/[0.07]'}`}>
                    <Thumb it={i} className="aspect-[4/3] w-full rounded-b-none rounded-t-xl" />
                    <div className="absolute left-2 top-2"><Check on={on} onChange={() => toggle(i)} label={`Select ${i.title}`} /></div>
                    <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.cls}`}>{p.label}</span>
                    <div className="p-2.5"><div className="truncate text-[13px] font-semibold">{i.title}</div><div className="text-[11px] text-slate-500">{ago(i.createdAt)} · {KIND_LABEL[i.kind]}</div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs"><span className="flex items-center gap-1"><Eye className="h-3 w-3 text-slate-400" />{fmtCount(i.reach)}</span><span className="flex items-center gap-1"><Heart className="h-3 w-3 text-slate-400" />{fmtCount(i.engagement)}</span>
                        <div className="relative ml-auto"><button type="button" aria-label="Actions" onClick={() => setRowMenu(rowMenu === key(i) ? null : key(i))} className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5"><MoreHorizontal className="h-4 w-4" /></button><RowMenu i={i} /></div></div></div>
                  </div>
                ); })}</div>
              )}
            </section>
          </div>

          {/* Right rail */}
          <aside className="space-y-4">
            <section className={`${surface} p-4`}>
              <div className="mb-3 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 dark:bg-blue-500/10"><BarChart3 className="h-6 w-6 text-blue-600" strokeWidth={2.4} /></span><div><div className="font-bold">Content Overview</div><div className="text-xs text-slate-500">Total posts and performance</div></div></div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { k: 'Total Posts', v: ov ? fmtCount(ov.totalPosts) : '—', d: ov?.deltas.posts, I: Calendar, c: 'text-blue-600' },
                  { k: 'Total Reach', v: ov ? fmtCount(ov.totalReach) : '—', d: ov?.deltas.reach, I: Eye, c: 'text-blue-600' },
                  { k: 'Total Engagement', v: ov ? fmtCount(ov.totalEngagement) : '—', d: ov?.deltas.engagement, I: Heart, c: 'text-rose-500' },
                  { k: 'Avg. Engagement Rate', v: ov?.engagementRate != null ? `${ov.engagementRate}%` : '—', d: ov?.deltas.rate, I: TrendingUp, c: 'text-violet-600' },
                ].map((m) => (
                  <div key={m.k} className="rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]">
                    <div className="flex items-start justify-between"><div className="text-xl font-extrabold">{m.v}</div><m.I className={`h-4 w-4 ${m.c}`} /></div>
                    <div className="text-[11px] text-slate-500">{m.k}</div>
                    <div className="mt-1 h-4"><Delta v={m.d} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${surface} p-4`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><div className="flex min-w-0 items-center gap-2 whitespace-nowrap font-bold"><BarChart3 className="h-4 w-4 shrink-0 text-blue-600" />Performance Chart</div><div className="ml-auto flex shrink-0 gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" />Reach</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />Engagement</span></div></div>
              {data?.chart?.length ? (
                <div className="h-[170px]"><ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart} margin={{ left: -22, right: 4, top: 6 }}>
                    <defs><linearGradient id="cmR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="1" stopColor="#2563eb" stopOpacity={0} /></linearGradient><linearGradient id="cmE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity={0.2} /><stop offset="1" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v) => fmtCount(Number(v))} />
                    <Tooltip labelFormatter={(l) => fmtDay(String(l))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="reach" name="Reach" stroke="#2563eb" strokeWidth={2.2} fill="url(#cmR)" />
                    <Area type="monotone" dataKey="engagement" name="Engagement" stroke="#8b5cf6" strokeWidth={2.2} fill="url(#cmE)" />
                  </AreaChart>
                </ResponsiveContainer></div>
              ) : <div className="grid h-[150px] place-items-center text-center text-xs text-slate-500">{data?.allTime ? 'Pick a date range to see the daily chart.' : 'No dated activity in this period.'}</div>}
              {ov?.chartNote && <p className="mt-1 text-[10.5px] text-slate-400">{ov.chartNote}</p>}
            </section>

            <section className={`${surface} p-4`}>
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><Flame className="h-4 w-4 text-blue-600" />Top Performing Posts</div><button type="button" onClick={() => { setTab('all'); setSort('eng'); setLayout('list'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-semibold text-blue-600">View All</button></div>
              {data?.top?.length ? <ul className="space-y-3">{data.top.map((i) => (
                <li key={key(i)}><button type="button" onClick={() => { const h = viewHref(i); if (h) navigate(h); }} className="flex w-full items-center gap-3 text-left">
                  <Thumb it={i} className="h-10 w-14" />
                  <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{i.title}</div><div className="text-[11px] text-slate-500">{fmtCount(i.reach)} reach · {fmtCount(i.engagement)} engagement</div></div>
                  <Delta v={i.reachDelta} />
                </button></li>
              ))}</ul> : <p className="py-6 text-center text-xs text-slate-500">No content in this period.</p>}
            </section>
          </aside>
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#171a24]">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10"><Trash2 className="h-5 w-5" /></div>
            <h3 className="text-lg font-bold">Delete {confirmDel.length} item{confirmDel.length > 1 ? 's' : ''}?</h3>
            <p className="mt-1 text-sm text-slate-500">Posts move to trash and reels are removed from your profile. {confirmDel.some((i) => i.source === 'story') ? 'Stories can’t be deleted here and will be skipped.' : ''}</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10" onClick={() => setConfirmDel(null)}>Cancel</button><button type="button" disabled={working} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" onClick={async () => { const t = confirmDel; setConfirmDel(null); await del(t); }}>Delete</button></div>
          </div>
        </div>
      )}
      {albumPick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#171a24]">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">Add to collection</h3><button type="button" aria-label="Close" onClick={() => setAlbumPick(null)}><X className="h-5 w-5 text-slate-400" /></button></div>
            {albums == null ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" /> : !albums.length ? <p className="text-sm text-slate-500">You don’t have any albums yet. Create one from your profile’s Photos → Albums.</p> : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">{albums.map((a) => <li key={a.id}><button type="button" onClick={() => { const t = albumPick; setAlbumPick(null); void moveAlbum(t, a.id); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"><FolderPlus className="h-4 w-4 text-blue-600" />{a.name}</button></li>)}</ul>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Only posts with photos or videos can go into a collection.</p>
          </div>
        </div>
      )}
    </div>
  );
}
