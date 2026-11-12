import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BadgeCheck, BarChart3, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Clock3, Download, Eye, FileText, Film,
  FolderOpen, GitCompareArrows, Hash, Heart, History, Image as ImageIcon, Layers, Lightbulb, Link2, Loader2, MessageCircle,
  Play, Plus, ScanSearch, Search, Share2, SlidersHorizontal, Smile, Sparkles, Target, Trash2, Type, UploadCloud,
  Users, Wand2, X, Zap,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  aiImprove, fetchAiStatus, analyzeContent, AnalysisResult, deleteAnalysis, downloadReport, fetchPerformance, fetchUrlMeta, fmtBytes, fmtCount,
  fmtDuration, getAnalysis, listAnalyses, MediaMeta, overallOf, Platform, PLATFORM_RULES, readMediaFile, saveAnalysis, SavedSummary,
  SourceType, Check,
} from '../lib/contentAnalysis';
import { useStore } from '../store';
import { creatorHubPath, currentCreatorHubMode } from '../lib/creatorHub';
import {
  btnGhost, btnPrimary, card, Empty, FacebookIcon, input, InstagramIcon, Ring, ScorePill, SectionTitle, StatusPill, WebSoftIcon, YoutubeIcon,
} from '../components/contentAnalyze/ui';

const ContentManage = lazy(() => import('../components/contentAnalyze/ContentManage'));
const BatchStudioRedirect = lazy(() => import('../components/BatchStudioRedirect'));

type View = 'analyze' | 'performance' | 'improve' | 'batch' | 'compare' | 'history' | 'suggestions';
type Tab = 'overview' | 'content' | 'seo' | 'audience' | 'engagement' | 'media' | 'recommendations';
type PerfItem = Awaited<ReturnType<typeof fetchPerformance>>['items'][number];

const MODES: { id: View; title: string; sub: string; icon: React.ElementType; tile: string; tint: string }[] = [
  { id: 'analyze', title: 'Analyze Content', sub: 'Check quality & score', icon: ScanSearch, tile: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', tint: '' },
  { id: 'performance', title: 'Performance', sub: 'View analytics & trends', icon: BarChart3, tile: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', tint: 'bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent' },
  { id: 'improve', title: 'AI Improve', sub: 'Get better version', icon: Wand2, tile: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', tint: 'bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-500/[0.06] dark:to-transparent' },
  { id: 'batch', title: 'Batch Analysis', sub: 'Analyze multiple files', icon: Layers, tile: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300', tint: 'bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-500/[0.06] dark:to-transparent' },
  { id: 'compare', title: 'Compare', sub: 'Compare versions', icon: GitCompareArrows, tile: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300', tint: 'bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-500/[0.06] dark:to-transparent' },
];
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Eye }, { id: 'content', label: 'Content Analysis', icon: FileText },
  { id: 'seo', label: 'SEO & Keywords', icon: Search }, { id: 'audience', label: 'Audience', icon: Users },
  { id: 'engagement', label: 'Engagement', icon: MessageCircle }, { id: 'media', label: 'Video/Media', icon: Film },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
];
const PLATFORMS: { id: Platform; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon }, { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { id: 'youtube', label: 'YouTube', Icon: YoutubeIcon }, { id: 'websoft', label: 'WebSoft', Icon: WebSoftIcon },
];
const CHECK_ICON: Record<string, React.ElementType> = { grammar: Type, sentiment: Smile, audience: Users, hook: Zap, cta: Target, caption_len: FileText, hashtags: Hash, title: Type, kw_title: Search, kw_first: Search, resolution: ImageIcon, duration: Clock3, aspect: ImageIcon, caps: Type, emoji: Smile, sentence_len: BookOpen, filesize: FolderOpen, url_desc: FileText, url_h1: Type, url_canon: Link2 };
const ICON_TINT = ['text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', 'text-orange-500 bg-orange-50 dark:bg-orange-500/10', 'text-teal-600 bg-teal-50 dark:bg-teal-500/10', 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'];

const ago = (d: string) => { const s = (Date.now() - +new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hours ago`; const n = Math.floor(s / 86400); return n === 1 ? '1 day ago' : `${n} days ago`; };

/** /studio/content: content manager by default; the analyzer and its sub-pages live under ?view=… */
export default function ContentStudioPage(_props: { space?: { id: string; name: string } } = {}) {
  const [params] = useSearchParams();
  const view = params.get('view');
  // Batch Upload moved to Business Suite (`/business/batch`).
  if (view === 'batch-create' || view === 'batch-queue') {
    return <Suspense fallback={null}><BatchStudioRedirect /></Suspense>;
  }
  return view ? <ContentAnalyzer /> : <Suspense fallback={null}><ContentManage /></Suspense>;
}

function ContentAnalyzer() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useStore((s: any) => s.user);
  const view = (params.get('view') as View) || 'analyze';
  const tab = (params.get('tab') as Tab) || 'overview';
  const go = (v: View, extra: Record<string, string> = {}) => { const p = new URLSearchParams(); p.set('view', v); Object.entries(extra).forEach(([k, val]) => p.set(k, val)); setParams(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); p.set('view', 'analyze'); if (t === 'overview') p.delete('tab'); else p.set('tab', t); setParams(p); };

  const [source, setSource] = useState<SourceType>('file');
  const [platform, setPlatform] = useState<Platform>('websoft');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [urlMeta, setUrlMeta] = useState<any>(null);
  const [media, setMedia] = useState<MediaMeta | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [targetKeyword, setTargetKeyword] = useState('');
  const [saveHistory, setSaveHistory] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [recent, setRecent] = useState<SavedSummary[]>([]);
  const [perf, setPerf] = useState<PerfItem[] | null>(null);
  const [perfErr, setPerfErr] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ca-prefill'); if (!raw) return;
    sessionStorage.removeItem('ca-prefill');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    try { const p = JSON.parse(raw); setSource('text'); setTitle(p.title || ''); setText(p.text || ''); setResult(null); } catch { /* ignore */ }
  }, []);
  const loadRecent = useCallback(() => listAnalyses(20).then((r) => setRecent(r.items)).catch(() => setRecent([])), []);
  useEffect(() => { void loadRecent(); fetchPerformance().then((r) => setPerf(r.items)).catch((e) => { setPerf([]); setPerfErr(e.message); }); }, [loadRecent]);

  const openSaved = useCallback(async (id: string) => {
    try {
      const a = await getAnalysis(id);
      const r = a.result; setResult(r); setResultId(id);
      setSource(r.input.sourceType); setPlatform(r.input.platform); setTitle(r.input.title); setText(r.input.text);
      setUrl(r.input.url || ''); setUrlMeta(r.input.urlMeta || null); setMedia(r.input.media || null); setThumb(r.thumbDataUrl || null); setPreview(null);
      setTargetKeyword(r.input.targetKeyword || '');
    } catch (e: any) { toast.error(e.message || 'Could not open analysis'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { const id = params.get('id'); if (id && id !== resultId) void openSaved(id); }, [params, openSaved, resultId]);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024 && !f.type.startsWith('video/')) { toast.error('Max 50MB for images'); return; }
    const r = await readMediaFile(f);
    if (r.meta.kind === 'other') { toast.error('Supported: JPG, PNG, MP4, MOV, WEBM'); return; }
    setMedia(r.meta); setPreview(r.previewUrl); setThumb(r.thumb); setSource('file');
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    setResult(null); setResultId(null);
  };

  const fetchUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try { const m = await fetchUrlMeta(url.trim()); setUrlMeta(m); if (!title) setTitle(m.title || ''); if (!text) setText(m.description || ''); toast.success(`Fetched ${m.domain}`); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const canAnalyze = !!(title.trim() || text.trim() || media || urlMeta);
  const runAnalysis = async (over?: Partial<{ text: string }>) => {
    if (!canAnalyze && !over?.text) { toast.error('Add a file, text or URL first'); return; }
    setBusy(true);
    try {
      const r = analyzeContent({ sourceType: source, platform, title, text: over?.text ?? text, media: source === 'file' ? media : null, url: source === 'url' ? url : undefined, urlMeta: source === 'url' ? urlMeta : null, targetKeyword: targetKeyword || undefined }, source === 'file' ? thumb : null);
      setResult(r); setResultId(null);
      if (saveHistory) { try { const { id } = await saveAnalysis(r); setResultId(id); void loadRecent(); } catch (e: any) { toast.error(`Analyzed, but not saved: ${e.message}`); } }
      toast.success('Analysis complete');
    } finally { setBusy(false); }
  };

  const newAnalysis = () => { setResult(null); setResultId(null); setTitle(''); setText(''); setUrl(''); setUrlMeta(null); setMedia(null); setPreview(null); setThumb(null); setTargetKeyword(''); go('analyze'); };

  const baseline = useMemo(() => {
    if (!perf || !perf.length) return null;
    const n = perf.length; const sum = (k: 'views' | 'likes' | 'comments' | 'shares') => perf.reduce((s, i) => s + (i[k] || 0), 0);
    const series = [...perf].reverse().slice(-12).map((i) => ({ name: new Date(i.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), views: i.views }));
    return { n, views: Math.round(sum('views') / n), likes: Math.round(sum('likes') / n), comments: Math.round(sum('comments') / n), shares: Math.round(sum('shares') / n), series };
  }, [perf]);

  const ctx = { result, baseline, perf, perfErr, go, setTab, platform, navigate, text, setText, runAnalysis, title, setTitle, setSource, recent, openSaved, loadRecent, resultId };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 dark:bg-[#0b0d14] dark:text-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">Content Analyze</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Analyze your content and get detailed insights, suggestions and performance context.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navigate('/studio/content')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300"><ChevronRight className="h-4 w-4 rotate-180" />All content</button>
            <button type="button" onClick={() => go('history')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"><History className="h-4 w-4" />View History</button>
            <button type="button" className={btnGhost} disabled={!result} title={result ? 'Download the current analysis as an HTML report' : 'Run an analysis first'} onClick={() => result && downloadReport(result)}><Download className="h-4 w-4" />Export Report</button>
            <button type="button" className={btnPrimary} onClick={newAnalysis}><Plus className="h-4 w-4" />New Analysis</button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MODES.map((m) => {
            const active = view === m.id;
            return (
              <button key={m.id} type="button" onClick={() => go(m.id)} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-blue-500 bg-white ring-2 ring-blue-500/15 dark:bg-[#12141d]' : `border-slate-200/80 dark:border-white/[0.07] ${m.tint || 'bg-white dark:bg-[#12141d]'}`}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${m.tile}`}><m.icon className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{m.title}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{m.sub}</span></span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className={`${card} p-4`}>
              <h2 className="text-[15px] font-bold">1. Add Your Content</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Supported: Text, Image, Video, Reel, URL</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {([['file', 'Upload File'], ['text', 'Text & Caption'], ['url', 'URL']] as [SourceType, string][]).map(([id, l]) => (
                  <button key={id} type="button" onClick={() => setSource(id)} className={`rounded-lg border px-1 py-1.5 text-xs font-semibold transition ${source === id ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'}`}>{l}</button>
                ))}
              </div>
              {source === 'file' && (
                <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void onFile(e.dataTransfer.files?.[0]); }}
                  className={`mt-3 rounded-xl border-2 border-dashed p-4 text-center transition ${drag ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10' : 'border-blue-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]'}`}>
                  <UploadCloud className="mx-auto h-9 w-9 text-blue-600 dark:text-blue-400" strokeWidth={1.6} />
                  <p className="mt-2 text-sm font-semibold">Drag &amp; drop your files here</p>
                  <p className="text-xs text-slate-500">or <button type="button" className="font-semibold text-slate-900 underline dark:text-white" onClick={() => fileRef.current?.click()}>click to browse</button></p>
                  <p className="mt-1 text-[10.5px] text-slate-400">Supports: JPG, PNG, MP4, MOV, WEBM (images max 50MB)</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className={`${btnPrimary} mt-3 w-full`}><FolderOpen className="h-4 w-4" />Choose Files</button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
                  {media && <p className="mt-2 truncate text-[11px] text-slate-500">Selected: {media.name} · {fmtBytes(media.sizeBytes)}</p>}
                </div>
              )}
              {source === 'url' && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2"><input className={input} placeholder="https://…" value={url} onChange={(e) => { setUrl(e.target.value); setUrlMeta(null); }} onKeyDown={(e) => { if (e.key === 'Enter') void fetchUrl(); }} /><button type="button" className={btnGhost + ' !px-3'} onClick={fetchUrl} disabled={busy || !url.trim()}>Fetch</button></div>
                  {urlMeta && <p className="truncate text-[11px] text-emerald-600">✓ {urlMeta.domain} — {urlMeta.title || 'no title'}</p>}
                </div>
              )}
              <div className="mt-3 space-y-2">
                <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                <textarea className={`${input} min-h-[72px] resize-y`} placeholder={source === 'url' ? 'Description (auto-filled from page)' : 'Caption / description with #hashtags'} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <p className="mt-3 text-xs font-semibold">Select Platform</p>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {PLATFORMS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlatform(p.id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[10.5px] font-medium transition ${platform === p.id ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                    <p.Icon className="h-5 w-5" />{p.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setAdvOpen((o) => !o)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-500" />Advanced Options</span><ChevronDown className={`h-4 w-4 transition ${advOpen ? 'rotate-180' : ''}`} />
              </button>
              {advOpen && (
                <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <label className="block text-xs font-semibold">Target keyword<input className={`${input} mt-1`} placeholder="e.g. travel bangladesh" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} /></label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={saveHistory} onChange={(e) => setSaveHistory(e.target.checked)} className="accent-blue-600" />Save to history</label>
                </div>
              )}
              <button type="button" className={`${btnPrimary} mt-3 w-full`} disabled={busy || !canAnalyze} onClick={() => runAnalysis()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}Analyze</button>
            </section>

            <section className={`${card} p-4`}>
              <SectionTitle right={<button type="button" onClick={() => go('history')} className="text-xs font-semibold text-blue-600 dark:text-blue-400">View All</button>}><span className="flex items-center gap-2"><History className="h-4 w-4" />Recent Analyses</span></SectionTitle>
              {recent.length ? (
                <ul className="space-y-2.5">
                  {recent.slice(0, 4).map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => go('analyze', { id: r.id })} className="flex w-full items-center gap-3 rounded-xl p-1 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
                        <RecentThumb r={r} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{r.title}</span><span className="block text-[11px] text-slate-500">{ago(r.createdAt)}</span></span>
                        <ScorePill v={r.overallScore} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-xs text-slate-500">No analyses yet. Your saved analyses appear here.</p>}
            </section>
          </aside>

          <main className="min-w-0 space-y-4">
            {view === 'analyze' && <AnalyzeMain {...ctx} tab={tab} preview={preview} thumb={thumb} media={media} urlMeta={urlMeta} source={source} user={user} />}
            {view === 'performance' && <PerformanceView {...ctx} />}
            {view === 'improve' && <ImproveView {...ctx} initialAction={params.get('action') || ''} />}
            {view === 'batch' && <BatchView platform={platform} onSaved={loadRecent} navigate={navigate} />}
            {view === 'compare' && <CompareView {...ctx} />}
            {view === 'history' && <HistoryView {...ctx} />}
            {view === 'suggestions' && <ViewShell title="All Suggestions" sub="Every recommendation from the current analysis" back={() => go('analyze')}><RecommendationsPanel {...ctx} /></ViewShell>}
          </main>
        </div>
      </div>
    </div>
  );
}

function RecentThumb({ r }: { r: SavedSummary }) {
  const [src, setSrc] = useState<string | null>(r.thumbnailUrl);
  useEffect(() => { let on = true; if (!r.thumbnailUrl) getAnalysis(r.id).then((a) => { if (on) setSrc(a.result?.thumbDataUrl || null); }).catch(() => {}); return () => { on = false; }; }, [r.id, r.thumbnailUrl]);
  return src ? <img src={src} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-100 to-violet-100 text-blue-600 dark:from-blue-500/15 dark:to-violet-500/15">{r.sourceType === 'url' ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>;
}

function ViewShell({ title, sub, back, children, right }: { title: string; sub: string; back?: () => void; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {back && <button type="button" onClick={back} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Back"><ChevronRight className="h-4 w-4 rotate-180" /></button>}
          <div><h2 className="text-lg font-extrabold">{title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p></div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function NeedResult({ go }: { go: (v: View) => void }) {
  return <Empty icon={<ScanSearch className="h-6 w-6" />} title="No analysis yet" body="Add a file, caption or URL on the left and press Analyze. Results stay here while you switch views." action={<button type="button" className={`${btnPrimary} mt-2`} onClick={() => go('analyze')}>Start analysis</button>} />;
}

function AnalyzeMain(p: any) {
  const { result, tab, setTab, preview, thumb, media, urlMeta, source, user, title, text, platform } = p as { result: AnalysisResult | null; tab: Tab; setTab: (t: Tab) => void; preview: string | null; thumb: string | null; media: MediaMeta | null; urlMeta: any; source: SourceType; user: any; title: string; text: string; platform: Platform };
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  const img = source === 'file' ? (preview || thumb) : source === 'url' ? urlMeta?.image : null;
  const hasContent = !!(title || text || media || urlMeta);
  const sc = result?.scores;
  const P = PLATFORMS.find((x) => x.id === platform)!;
  const RINGS = sc ? [
    { k: 'Content Quality Score', s: sc.quality, color: '#16a34a', sub: 'Length, hook, CTA, media', txt: 'text-emerald-600' },
    { k: 'SEO Score', s: sc.seo, color: '#2563eb', sub: 'Title, keywords, hashtags', txt: 'text-blue-600' },
    { k: 'Engagement Potential', s: sc.engagement, color: '#7c3aed', sub: 'Needs AI + audience history', txt: 'text-violet-600' },
    { k: 'Readability Score', s: sc.readability, color: '#f97316', sub: sc.readability.reason || '', txt: 'text-orange-500' },
  ] : [];
  return (
    <>
      <section className={`${card} p-4`}>
        {hasContent ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_220px]">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900">
              {media?.kind === 'video' && preview ? <video src={preview} className="h-full w-full object-cover" muted playsInline /> : img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-sm font-semibold text-white/85">{title || 'Text content'}</div>}
              {media?.height ? <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{Math.min(media.height, media.width || 0) >= 2160 ? '4K' : Math.min(media.height, media.width || 0) >= 1080 ? 'HD 1080p' : Math.min(media.height, media.width || 0) >= 720 ? 'HD 720p' : `${Math.min(media.height, media.width || 0)}p`}</span> : null}
              {media?.kind === 'video' && <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 backdrop-blur"><Play className="h-5 w-5 fill-white text-white" /></span></span>}
              {media?.durationSec ? <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{fmtDuration(media.durationSec)}</span> : null}
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-xl font-extrabold">{title || 'Untitled'}{user?.isVerified && <BadgeCheck className="h-5 w-5 fill-blue-600 text-white" />}</h2>
              <p className="mt-1.5 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{text || <span className="italic text-slate-400">No caption yet</span>}</p>
              {tags.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{tags.slice(0, 4).map((t) => <span key={t} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{t.slice(1)}</span>)}{tags.length > 4 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">+{tags.length - 4}</span>}</div>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">{media?.kind === 'video' ? <Film className="h-3.5 w-3.5" /> : media ? <ImageIcon className="h-3.5 w-3.5" /> : source === 'url' ? <Link2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{media ? (media.kind === 'video' ? 'Video' : 'Image') : source === 'url' ? 'URL' : 'Text'}</span>
                {media?.height ? <span>{Math.min(media.height, media.width || 0)}p</span> : null}
                {media?.durationSec ? <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{fmtDuration(media.durationSec)}</span> : null}
                {media && <span>{media.mime.split('/')[1]?.toUpperCase()}</span>}
                {media && <span>{fmtBytes(media.sizeBytes)}</span>}
                {urlMeta && <span>{urlMeta.domain}</span>}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 p-3 text-xs md:col-span-2 xl:col-span-1 dark:border-white/[0.07]">
              <div className="mb-2 flex justify-end">{result ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><CheckCircle2 className="h-3.5 w-3.5" />Analyzed</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Ready for Analysis</span>}</div>
              <div className="mb-1 font-bold text-slate-800 dark:text-slate-100">Content Info</div>
              {[['Type', media ? `${media.kind === 'video' ? 'Video' : 'Image'} (${media.mime.split('/')[1]?.toUpperCase()})` : source === 'url' ? 'Web page' : 'Text'], ['Resolution', media?.width ? `${media.width} × ${media.height}` : '—'], ['Duration', media?.durationSec ? fmtDuration(media.durationSec) : '—'], ['Size', media ? fmtBytes(media.sizeBytes) : `${text.length} chars`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-white/5"><span className="text-slate-500">{k}</span><span className="truncate font-semibold">{v}</span></div>
              ))}
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-500">Platform</span><span className="flex items-center gap-1 font-semibold"><P.Icon className="h-4 w-4" />{P.label}</span></div>
            </div>
          </div>
        ) : <Empty icon={<UploadCloud className="h-6 w-6" />} title="Add content to analyze" body="Upload an image or video, paste a caption, or fetch a URL. We read real file metadata and check your text against platform guidelines." />}
      </section>

      {result && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {RINGS.map((r) => (
            <div key={r.k} className={`${card} p-4`}>
              <div className="text-[13px] font-bold">{r.k}</div>
              <div className="mt-2 flex items-center gap-4">
                <Ring score={r.s} color={r.color} />
                <div className="min-w-0">
                  <div className={`text-[15px] font-bold ${r.s.available ? r.txt : 'text-slate-400'}`}>{r.s.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{r.sub}</div>
                  <span className="mt-2 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">{r.s.available ? 'Rule-based' : 'Not estimated'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-3 dark:border-white/[0.07]">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-semibold transition ${tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}><t.icon className="h-4 w-4" />{t.label}</button>
          ))}
        </div>
        <div className="p-4">
          {!result ? <NeedResult go={p.go} /> : (
            <>
              {tab === 'overview' && <OverviewTab {...p} />}
              {tab === 'content' && <ContentTab r={result} />}
              {tab === 'seo' && <SeoTab r={result} />}
              {tab === 'audience' && <AudienceTab {...p} />}
              {tab === 'engagement' && <EngagementTab {...p} />}
              {tab === 'media' && <MediaTab r={result} />}
              {tab === 'recommendations' && <RecommendationsPanel {...p} />}
            </>
          )}
        </div>
      </section>

      {result && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-orange-50/40 p-3.5 dark:border-amber-500/20 dark:from-amber-500/[0.07] dark:to-transparent">
          <Lightbulb className="h-7 w-7 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">Recommendations</div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {result.recommendations.slice(0, 4).map((x) => <span key={x.id} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{x.text}</span>)}
              {!result.recommendations.length && <span className="text-xs text-slate-600">No issues found by the rule checks.</span>}
            </div>
          </div>
          <button type="button" onClick={() => p.go('suggestions')} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 bg-white px-3.5 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:bg-transparent dark:text-violet-300">View All Suggestions<ChevronRight className="h-3.5 w-3.5" /></button>
        </section>
      )}
    </>
  );
}

function CheckRow({ c, i }: { c: Check; i: number }) {
  const I = CHECK_ICON[c.id] || CheckCircle2;
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ICON_TINT[i % ICON_TINT.length]}`}><I className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold">{c.label}</div><div className="text-xs text-slate-500 dark:text-slate-400">{c.detail}</div></div>
      <StatusPill status={c.status} />
    </li>
  );
}

function BaselineChart({ baseline, height = 170 }: { baseline: any; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={baseline.series} margin={{ left: -18, right: 6, top: 6 }}>
          <defs><linearGradient id="caG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="1" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCount(Number(v))} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2.5} fill="url(#caG)" dot={{ r: 3, fill: '#2563eb' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatTiles({ baseline }: { baseline: any }) {
  const T = [{ k: 'Avg. Views', v: baseline?.views, i: Eye, c: 'text-blue-600' }, { k: 'Avg. Likes', v: baseline?.likes, i: Heart, c: 'text-rose-500' }, { k: 'Avg. Comments', v: baseline?.comments, i: MessageCircle, c: 'text-emerald-600' }, { k: 'Avg. Shares', v: baseline?.shares, i: Share2, c: 'text-violet-600' }];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {T.map((t) => <div key={t.k} className="flex items-center gap-2 rounded-xl border border-slate-200/80 p-2.5 dark:border-white/[0.07]"><t.i className={`h-5 w-5 ${t.c}`} /><div><div className="text-[10.5px] text-slate-500">{t.k}</div><div className="text-sm font-extrabold">{t.v == null ? '—' : fmtCount(t.v)}</div></div></div>)}
    </div>
  );
}

function OverviewTab(p: any) {
  const r: AnalysisResult = p.result;
  const order = ['grammar', 'sentiment', 'audience', 'hook', 'cta', 'caption_len', 'hashtags', 'resolution'];
  const list = order.map((id) => r.checks.find((c) => c.id === id)).filter(Boolean) as Check[];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_230px]">
      <div className="rounded-xl border border-slate-200/80 p-3.5 dark:border-white/[0.07]">
        <SectionTitle>Analysis Insights</SectionTitle>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">{list.map((c, i) => <CheckRow key={c.id} c={c} i={i} />)}</ul>
      </div>
      <div className="rounded-xl border border-slate-200/80 p-3.5 dark:border-white/[0.07]">
        <SectionTitle right={<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Your real averages</span>}>Engagement Baseline</SectionTitle>
        {p.baseline ? <><BaselineChart baseline={p.baseline} /><p className="mb-2 mt-1 text-[11px] text-slate-500">Views on your last {p.baseline.n} posts &amp; videos. This is history, not a forecast — engagement prediction is not available.</p><StatTiles baseline={p.baseline} /></>
          : <Empty icon={<BarChart3 className="h-6 w-6" />} title="No history yet" body={p.perfErr || 'Publish posts or videos to see your real engagement baseline. We do not predict reach without data.'} />}
      </div>
      <div className="rounded-xl border border-slate-200/80 p-3.5 dark:border-white/[0.07]">
        <SectionTitle>Quick Actions</SectionTitle>
        <QuickActions {...p} />
      </div>
    </div>
  );
}

function QuickActions(p: any) {
  const A = [
    { l: 'Improve with AI', i: Sparkles, primary: true, f: () => p.go('improve', { action: 'rewrite' }) },
    { l: 'Generate Caption', i: Wand2, f: () => p.go('improve', { action: 'viral' }) },
    { l: 'Optimize SEO', i: Search, f: () => p.go('improve', { action: 'seo' }) },
    { l: 'Send to Scheduler', i: CalendarClock, f: () => { if (p.text) navigator.clipboard?.writeText(p.text).catch(() => {}); toast.success(p.text ? 'Caption copied — opening scheduler' : 'Opening scheduler'); p.navigate(creatorHubPath('calendar')); } },
    { l: 'Download Report', i: Download, f: () => { if (p.result) downloadReport(p.result); } },
  ];
  return <div className="space-y-2">{A.map((a) => <button key={a.l} type="button" onClick={a.f} className={`${a.primary ? btnPrimary : btnGhost} w-full !justify-start whitespace-nowrap !px-3 !py-2`}><a.i className="h-4 w-4" />{a.l}</button>)}</div>;
}

function ContentTab({ r }: { r: AnalysisResult }) {
  const s = r.stats;
  const S: [string, string | number][] = [['Characters', s.chars], ['Words', s.words], ['Sentences', s.sentences], ['Words / sentence', s.avgWordsPerSentence], ['Emojis', s.emojis], ['Mentions', s.mentions.length], ['Links', s.links], ['Questions', s.questions], ['Uppercase', `${Math.round(s.capsRatio * 100)}%`], ['Script', s.script]];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <SectionTitle>Text statistics</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">{S.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"><div className="text-[11px] text-slate-500">{k}</div><div className="text-lg font-extrabold capitalize">{v}</div></div>)}</div>
        <div className="mb-2 mt-4 text-[15px] font-bold">Your text</div>
        <p className="whitespace-pre-wrap rounded-xl border border-slate-200/80 p-3 text-sm dark:border-white/[0.07]">{r.input.text || '—'}</p>
      </div>
      <div><SectionTitle>Content checks</SectionTitle><ul className="divide-y divide-slate-100 dark:divide-white/5">{r.checks.filter((c) => c.category === 'content' || c.category === 'readability').map((c, i) => <CheckRow key={c.id} c={c} i={i} />)}</ul></div>
    </div>
  );
}

function SeoTab({ r }: { r: AnalysisResult }) {
  const max = Math.max(1, ...r.keywords.map((k) => k.count));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <SectionTitle>Search preview</SectionTitle>
        <div className="rounded-xl border border-slate-200/80 p-4 dark:border-white/[0.07]">
          <div className="text-xs text-emerald-700 dark:text-emerald-400">{r.input.urlMeta?.domain || 'wevsoft'} › {PLATFORM_RULES[r.input.platform].label.toLowerCase()}</div>
          <div className="truncate text-lg font-medium text-blue-700 dark:text-blue-400">{r.input.title || 'Untitled'}</div>
          <div className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{(r.input.urlMeta?.description || r.input.text || '').slice(0, 160)}</div>
        </div>
        <div className="mb-2 mt-4 text-[15px] font-bold">Keywords</div>
        {r.keywords.length ? <ul className="space-y-1.5">{r.keywords.map((k) => <li key={k.term} className="flex items-center gap-2 text-sm"><span className="w-28 truncate font-medium">{k.term}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(k.count / max) * 100}%` }} /></span><span className="w-6 text-right text-xs tabular-nums text-slate-500">{k.count}</span>{k.inTitle ? <span className="rounded bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">title</span> : <span className="w-[30px]" />}</li>)}</ul> : <p className="text-sm text-slate-500">Not enough text for keyword extraction.</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">{r.stats.hashtags.map((h) => <span key={h} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{h}</span>)}</div>
      </div>
      <div><SectionTitle>SEO checks</SectionTitle><ul className="divide-y divide-slate-100 dark:divide-white/5">{r.checks.filter((c) => c.category === 'seo').map((c, i) => <CheckRow key={c.id} c={c} i={i} />)}</ul></div>
    </div>
  );
}

function AudienceTab(p: any) {
  const navigate = useNavigate();
  const r: AnalysisResult = p.result; const rules = PLATFORM_RULES[r.input.platform];
  const rows: [string, string][] = [['Caption length', `${rules.idealCaption[0]}–${rules.idealCaption[1]} chars (max ${rules.captionMax.toLocaleString()})`], ['Hashtags', `${rules.idealHashtags[0]}–${rules.idealHashtags[1]}`], ['Title max', `${rules.titleMax} chars`], ['Video length', rules.videoIdealSec ? `${fmtDuration(rules.videoIdealSec[0])}–${fmtDuration(rules.videoIdealSec[1])}` : '—']];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200/80 p-5 bg-card/60 backdrop-blur-xl dark:border-white/[0.07] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-foreground font-bold text-base mb-2">
            <Users className="h-5 w-5 text-indigo-400" /> Live Audience Demographics
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Explore complete Facebook Professional Dashboard-grade audience intelligence — including age brackets, gender ratios, top cities/countries, and active follower hours.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-black/10 dark:bg-white/5 p-3 rounded-lg border border-border/40">
            <div>• Age & Gender Analysis</div>
            <div>• Top Districts & Countries</div>
            <div>• 24h Peak Active Times</div>
            <div>• Non-Follower Reach %</div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className={`${btnPrimary} flex-1 justify-center`}
            onClick={() => navigate(`${creatorHubPath('analytics')}&sub=demographics`)}
          >
            Open Audience Demographics
          </button>
          <button type="button" className={btnGhost} onClick={() => p.go('performance')}>
            Performance
          </button>
        </div>
      </div>
      <div>
        <SectionTitle>{rules.label} guidelines used</SectionTitle>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 text-sm dark:divide-white/5 dark:border-white/[0.07]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between px-3 py-2.5"><span className="text-slate-500">{k}</span><span className="font-semibold">{v}</span></div>)}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">General platform guidance, not audience data.</p>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">{r.checks.filter((c) => c.id === 'audience').map((c, i) => <CheckRow key={c.id} c={c} i={i + 2} />)}</ul>
      </div>
    </div>
  );
}

function EngagementTab(p: any) {
  const r: AnalysisResult = p.result;
  const top = [...((p.perf || []) as PerfItem[])].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 5);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <SectionTitle>Engagement checks</SectionTitle>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">{r.checks.filter((c) => c.category === 'engagement').map((c, i) => <CheckRow key={c.id} c={c} i={i} />)}</ul>
        <div className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-500/10 dark:text-violet-200"><b>Engagement Potential:</b> {r.scores.engagement.reason}</div>
      </div>
      <div>
        <SectionTitle>Your real baseline</SectionTitle>
        {p.baseline ? <><BaselineChart baseline={p.baseline} height={150} /><div className="mt-2"><StatTiles baseline={p.baseline} /></div></> : <p className="text-sm text-slate-500">No history yet.</p>}
        {top.length > 0 && <><div className="mb-2 mt-4 text-[15px] font-bold">Your most engaging content</div><ul className="space-y-1.5">{top.map((t) => <li key={t.kind + t.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{t.title}</span><span className="flex shrink-0 items-center gap-2 text-xs text-slate-500"><Heart className="h-3 w-3" />{fmtCount(t.likes)}<MessageCircle className="h-3 w-3" />{fmtCount(t.comments)}<Share2 className="h-3 w-3" />{fmtCount(t.shares)}</span></li>)}</ul></>}
      </div>
    </div>
  );
}

function MediaTab({ r }: { r: AnalysisResult }) {
  const m = r.input.media;
  if (!m) return <Empty icon={<Film className="h-6 w-6" />} title="No media in this analysis" body="Upload an image or video under Upload File to get resolution, aspect ratio, duration and size checks." />;
  const rows: [string, string][] = [['File', m.name], ['Type', m.mime], ['Resolution', m.width ? `${m.width} × ${m.height}` : '—'], ['Duration', m.durationSec ? fmtDuration(m.durationSec) : '—'], ['Size', fmtBytes(m.sizeBytes)]];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <SectionTitle>File metadata</SectionTitle>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 text-sm dark:divide-white/5 dark:border-white/[0.07]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-3 py-2.5"><span className="text-slate-500">{k}</span><span className="truncate font-semibold">{v}</span></div>)}
        </div>
        {r.thumbDataUrl && <img src={r.thumbDataUrl} alt="" className="mt-3 max-h-48 rounded-xl" />}
      </div>
      <div><SectionTitle>Media checks</SectionTitle><ul className="divide-y divide-slate-100 dark:divide-white/5">{r.checks.filter((c) => c.category === 'media').map((c, i) => <CheckRow key={c.id} c={c} i={i} />)}</ul>
        <p className="mt-2 text-[11px] text-slate-500">Visual quality (lighting, faces, scene) needs AI vision and isn't scored.</p></div>
    </div>
  );
}

function RecommendationsPanel(p: any) {
  const r: AnalysisResult | null = p.result;
  if (!r) return <NeedResult go={p.go} />;
  const groups: ['high' | 'medium' | 'low', string, string][] = [['high', 'High priority', 'bg-rose-500'], ['medium', 'Worth improving', 'bg-amber-500'], ['low', 'Optional', 'bg-slate-400']];
  const aiFor: Record<string, string> = { hook: 'viral', cta: 'viral', caption_len: r.stats.chars < PLATFORM_RULES[r.input.platform].idealCaption[0] ? 'longer' : 'shorter', hashtags: 'seo', kw_title: 'seo', kw_first: 'seo', emoji: r.stats.emojis ? 'remove_emojis' : 'add_emojis', sentence_len: 'shorter', caps: 'professional', ai_grammar: 'grammar' };
  return (
    <div className="space-y-4">
      {!r.recommendations.length && <Empty icon={<CheckCircle2 className="h-6 w-6" />} title="Nothing to fix" body="All rule checks passed for this content." />}
      {groups.map(([k, l, dot]) => {
        const items = r.recommendations.filter((x) => x.priority === k);
        if (!items.length) return null;
        return (
          <div key={k}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className={`h-2 w-2 rounded-full ${dot}`} />{l}</div>
            <ul className="space-y-2">{items.map((x) => <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]"><Lightbulb className="h-4 w-4 shrink-0 text-amber-500" /><span className="min-w-0 flex-1 text-sm font-medium">{x.text}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-white/5">{x.category}</span>{aiFor[x.id] && <button type="button" onClick={() => p.go('improve', { action: aiFor[x.id] })} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300"><Wand2 className="h-3.5 w-3.5" />Fix with AI</button>}</li>)}</ul>
          </div>
        );
      })}
    </div>
  );
}

function PerformanceView(p: any) {
  const items: PerfItem[] | null = p.perf;
  const [kind, setKind] = useState<'all' | 'video' | 'post'>('all');
  const list = (items || []).filter((i) => kind === 'all' || i.kind === kind);
  const tot = list.reduce((a, i) => ({ views: a.views + i.views, likes: a.likes + i.likes, comments: a.comments + i.comments, shares: a.shares + i.shares }), { views: 0, likes: 0, comments: 0, shares: 0 });
  const tiles: [string, number, React.ElementType, string][] = [['Total views', tot.views, Eye, 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'], ['Total likes', tot.likes, Heart, 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'], ['Total comments', tot.comments, MessageCircle, 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'], ['Total shares', tot.shares, Share2, 'text-violet-600 bg-violet-50 dark:bg-violet-500/10']];
  return (
    <ViewShell title="Performance" sub="Real numbers from your latest posts and videos" back={() => p.go('analyze')} right={<div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">{(['all', 'video', 'post'] as const).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${kind === k ? 'bg-white shadow-sm dark:bg-white/10' : 'text-slate-500'}`}>{k === 'all' ? 'All' : k === 'video' ? 'Videos' : 'Posts'}</button>)}</div>}>
      {items == null ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></div> : !list.length ? <Empty icon={<BarChart3 className="h-6 w-6" />} title="No content yet" body={p.perfErr || 'Publish posts or videos to see performance.'} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(([k, v, I, c]) => <div key={k} className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]"><span className={`grid h-10 w-10 place-items-center rounded-xl ${c}`}><I className="h-5 w-5" /></span><div><div className="text-xs text-slate-500">{k}</div><div className="text-xl font-extrabold">{fmtCount(v)}</div></div></div>)}
          </div>
          {p.baseline && <div className="mt-4 rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]"><SectionTitle>Views across your recent content</SectionTitle><BaselineChart baseline={p.baseline} height={220} /></div>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2 font-semibold">Content</th><th>Type</th><th className="text-right">Views</th><th className="text-right">Likes</th><th className="text-right">Comments</th><th className="text-right">Shares</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">{list.map((i) => <tr key={i.kind + i.id}><td className="max-w-[260px] truncate py-2.5 font-medium">{i.title}</td><td><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] capitalize dark:bg-white/5">{i.kind}</span></td><td className="text-right tabular-nums">{fmtCount(i.views)}</td><td className="text-right tabular-nums">{fmtCount(i.likes)}</td><td className="text-right tabular-nums">{fmtCount(i.comments)}</td><td className="text-right tabular-nums">{fmtCount(i.shares)}</td><td className="pl-3 text-right"><button type="button" className="text-xs font-semibold text-blue-600 dark:text-blue-400" onClick={() => { p.setSource('text'); p.setTitle(i.title.slice(0, 80)); p.setText(i.kind === 'post' ? i.title : ''); p.go('analyze'); }}>Analyze</button></td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </ViewShell>
  );
}

const AI_ACTIONS: [string, string][] = [['rewrite', 'Rewrite'], ['viral', 'Generate caption'], ['seo', 'Optimize SEO'], ['grammar', 'Fix grammar'], ['shorter', 'Shorter'], ['longer', 'Longer'], ['professional', 'Professional'], ['add_emojis', 'Add emojis'], ['remove_emojis', 'Remove emojis'], ['translate_bn', 'To Bangla'], ['translate_en', 'To English']];
function ImproveView(p: any) {
  const [src, setSrc] = useState<string>(p.text || '');
  const [action, setAction] = useState<string>(p.initialAction || 'rewrite');
  const [out, setOut] = useState(''); const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<{ configured: boolean; reason: string | null } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (p.initialAction) setAction(p.initialAction); }, [p.initialAction]);
  useEffect(() => { fetchAiStatus().then(setAi).catch(() => setAi({ configured: false, reason: 'Could not check AI status.' })); }, []);
  const run = async () => {
    if (!ai?.configured) return;
    if (!src.trim()) { toast.error('Add some text first'); return; }
    setLoading(true); setErr(null); setOut('');
    try {
      const isTr = action.startsWith('translate_');
      const res = await aiImprove(src, isTr ? 'translate' : action, isTr ? action.slice(10) : undefined);
      setOut(res.content);
    } catch (e: any) {
      setErr(e.code === 'NOT_CONFIGURED' || /provider|api key|configur/i.test(e.message || '') ? 'AI is not configured for your account. Add an AI provider key in your AI settings to use this.' : e.message || 'AI request failed');
    } finally { setLoading(false); }
  };
  return (
    <ViewShell title="AI Improve" sub="Rewrite your caption with your configured AI model" back={() => p.go('analyze')}>
      {ai && !ai.configured && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><div><b>AI is not connected.</b> {ai.reason} Turn on your own AI key (BYOK) in AI settings to generate real rewrites — we won't show placeholder text.</div></div>}
      <div className="flex flex-wrap gap-1.5">{AI_ACTIONS.map(([k, l]) => <button key={k} type="button" onClick={() => setAction(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${action === k ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300'}`}>{l}</button>)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Original</div>
          <textarea className={`${input} min-h-[220px]`} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Paste or type your caption…" />
          <button type="button" className={`${btnPrimary} mt-2 w-full !bg-violet-600 hover:!bg-violet-700`} disabled={loading || !ai?.configured} onClick={run}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Improve</button>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Improved</div>
          <div className="min-h-[220px] whitespace-pre-wrap rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.02]">{loading ? <span className="text-slate-400">Generating…</span> : err ? <span className="text-rose-600 dark:text-rose-400">{err}</span> : out || <span className="text-slate-400">The AI result appears here. Nothing is generated without a real AI call.</span>}</div>
          {out && <div className="mt-2 flex gap-2"><button type="button" className={`${btnPrimary} flex-1`} onClick={() => { p.setText(out); p.go('analyze'); setTimeout(() => p.runAnalysis({ text: out }), 50); }}><CheckCircle2 className="h-4 w-4" />Use &amp; re-analyze</button><button type="button" className={btnGhost} onClick={() => { void navigator.clipboard?.writeText(out); toast.success('Copied'); }}>Copy</button></div>}
        </div>
      </div>
    </ViewShell>
  );
}

function BatchView({ platform, onSaved, navigate }: { platform: Platform; onSaved: () => void; navigate: (s: string) => void }) {
  const [rows, setRows] = useState<{ name: string; r: AnalysisResult; saved?: boolean }[]>([]);
  const [captions, setCaptions] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files) return; setBusy(true);
    const out: { name: string; r: AnalysisResult }[] = [];
    for (const f of Array.from(files).slice(0, 20)) { const m = await readMediaFile(f); URL.revokeObjectURL(m.previewUrl); if (m.meta.kind === 'other') continue; out.push({ name: f.name, r: analyzeContent({ sourceType: 'file', platform, title: f.name.replace(/\.[^.]+$/, ''), text: '', media: m.meta }, m.thumb) }); }
    setRows((x) => [...x, ...out]); setBusy(false);
  };
  const addCaptions = () => { const parts = captions.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 30); setRows((x) => [...x, ...parts.map((t, i) => ({ name: `Caption ${x.length + i + 1}`, r: analyzeContent({ sourceType: 'text', platform, title: t.split('\n')[0].slice(0, 70), text: t }) }))]); setCaptions(''); };
  const saveAll = async () => { setBusy(true); let n = 0; const next = rows.map((r) => ({ ...r })); for (const row of next) { if (row.saved) continue; try { await saveAnalysis(row.r); row.saved = true; n++; } catch { /* keep unsaved */ } } setRows(next); setBusy(false); onSaved(); toast.success(`Saved ${n} analyses`); };
  return (
    <ViewShell title="Batch Analysis" sub={`Analyze many files or captions at once · ${PLATFORM_RULES[platform].label} rules`} right={rows.length ? <div className="flex flex-wrap gap-2">{currentCreatorHubMode() === 'space' && <button type="button" className={btnGhost} onClick={() => navigate(creatorHubPath('batch'))}><CalendarClock className="h-4 w-4" />Batch scheduler</button>}<button type="button" className={btnPrimary} disabled={busy || rows.every((r) => r.saved)} onClick={saveAll}>Save all to history</button></div> : null}>
      <div className="grid gap-4 lg:grid-cols-2">
        <button type="button" onClick={() => ref.current?.click()} className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6 text-center transition hover:bg-orange-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"><Layers className="mx-auto h-8 w-8 text-orange-500" /><div className="mt-2 text-sm font-semibold">Choose up to 20 images/videos</div><div className="text-xs text-slate-500">Metadata is read locally in your browser</div></button>
        <input ref={ref} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
        <div><textarea className={`${input} min-h-[96px]`} value={captions} onChange={(e) => setCaptions(e.target.value)} placeholder="…or paste several captions separated by a blank line" /><button type="button" className={`${btnGhost} mt-2 w-full`} disabled={!captions.trim()} onClick={addCaptions}>Analyze captions</button></div>
      </div>
      {busy && <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Working…</div>}
      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Item</th><th>Quality</th><th>SEO</th><th>Readability</th><th>Overall</th><th>Top issue</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">{rows.map((row, i) => <tr key={i}><td className="py-2.5"><span className="flex items-center gap-2">{row.r.thumbDataUrl ? <img src={row.r.thumbDataUrl} alt="" className="h-9 w-12 rounded-md object-cover" /> : <FileText className="h-4 w-4 text-slate-400" />}<span className="max-w-[180px] truncate font-medium">{row.name}</span></span></td><td><ScorePill v={row.r.scores.quality.value} /></td><td><ScorePill v={row.r.scores.seo.value} /></td><td><ScorePill v={row.r.scores.readability.value} /></td><td><ScorePill v={overallOf(row.r)} /></td><td className="max-w-[200px] truncate text-xs text-slate-500">{row.r.recommendations[0]?.text || '—'}</td><td className="text-right">{row.saved ? <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" /> : <button type="button" aria-label="Remove" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><X className="h-4 w-4 text-slate-400" /></button>}</td></tr>)}</tbody>
          </table>
        </div>
      ) : !busy && <Empty icon={<Layers className="h-6 w-6" />} title="Nothing in the batch yet" body="Add files or captions. Each one is scored with the same rules as a single analysis." />}
    </ViewShell>
  );
}

function CompareView(p: any) {
  const recent: SavedSummary[] = p.recent;
  const [a, setA] = useState<string>(p.result ? 'current' : recent[1]?.id || '');
  const [b, setB] = useState<string>(p.result ? (recent.find((r) => r.id !== p.resultId)?.id || '') : recent[0]?.id || '');
  const [ra, setRa] = useState<AnalysisResult | null>(null); const [rb, setRb] = useState<AnalysisResult | null>(null);
  const load = (id: string, set: (r: AnalysisResult | null) => void) => { if (!id) { set(null); return; } if (id === 'current') { set(p.result); return; } getAnalysis(id).then((x) => set(x.result)).catch(() => set(null)); };
  useEffect(() => load(a, setRa), [a, p.result]);
  useEffect(() => load(b, setRb), [b]);
  const opts = <>{p.result && <option value="current">Current analysis</option>}{recent.map((r) => <option key={r.id} value={r.id}>{r.title} · {new Date(r.createdAt).toLocaleDateString()}</option>)}</>;
  const row = (l: string, va: number | null, vb: number | null) => { const d = va != null && vb != null ? vb - va : null; return <tr key={l}><td className="py-2.5 font-medium">{l}</td><td><ScorePill v={va} /></td><td><ScorePill v={vb} /></td><td className={`text-right text-xs font-bold ${d == null ? 'text-slate-400' : d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{d == null ? '—' : `${d > 0 ? '+' : ''}${d}`}</td></tr>; };
  return (
    <ViewShell title="Compare" sub="Compare two versions side by side" back={() => p.go('analyze')}>
      {!recent.length && !p.result ? <Empty icon={<GitCompareArrows className="h-6 w-6" />} title="Nothing to compare" body="Save at least two analyses (for example before and after AI Improve) to compare them." /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Version A<select className={`${input} mt-1`} value={a} onChange={(e) => setA(e.target.value)}><option value="">Select…</option>{opts}</select></label><label className="text-xs font-semibold">Version B<select className={`${input} mt-1`} value={b} onChange={(e) => setB(e.target.value)}><option value="">Select…</option>{opts}</select></label></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">{[ra, rb].map((r, i) => <div key={i} className="rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]">{r ? <><div className="flex items-center gap-3">{r.thumbDataUrl && <img src={r.thumbDataUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />}<div className="min-w-0"><div className="truncate font-bold"><span className="mr-1.5 rounded bg-sky-50 px-1.5 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{i ? 'B' : 'A'}</span>{r.input.title || 'Untitled'}</div><div className="text-xs text-slate-500">{PLATFORM_RULES[r.input.platform].label} · {new Date(r.analyzedAt).toLocaleString()}</div></div></div><p className="mt-2 line-clamp-4 text-sm text-slate-600 dark:text-slate-300">{r.input.text || '—'}</p></> : <p className="py-6 text-center text-sm text-slate-400">Select version {i ? 'B' : 'A'}</p>}</div>)}</div>
          {ra && rb && <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Metric</th><th>A</th><th>B</th><th className="text-right">Change</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/5">{row('Content Quality', ra.scores.quality.value, rb.scores.quality.value)}{row('SEO', ra.scores.seo.value, rb.scores.seo.value)}{row('Readability', ra.scores.readability.value, rb.scores.readability.value)}{row('Overall', overallOf(ra), overallOf(rb))}<tr><td className="py-2.5 font-medium">Engagement Potential</td><td colSpan={3} className="text-xs text-slate-400">Not available for either version</td></tr></tbody></table>}
        </>
      )}
    </ViewShell>
  );
}

function HistoryView(p: any) {
  const [q, setQ] = useState(''); const [items, setItems] = useState<SavedSummary[] | null>(null);
  const load = useCallback(() => listAnalyses(100, q).then((r) => setItems(r.items)).catch(() => setItems([])), [q]);
  useEffect(() => { const t = setTimeout(() => { void load(); }, 250); return () => clearTimeout(t); }, [load]);
  const del = async (id: string) => { if (!window.confirm('Delete this analysis?')) return; await deleteAnalysis(id).catch(() => {}); void load(); p.loadRecent(); };
  return (
    <ViewShell title="Analysis History" sub="All your saved analyses" back={() => p.go('analyze')} right={<div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${input} w-64 max-w-full pl-9`} placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} /></div>}>
      {items == null ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></div> : !items.length ? <Empty icon={<History className="h-6 w-6" />} title={q ? 'No matches' : 'No history yet'} body="Analyses you run with “Save to history” on appear here." /> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((r) => <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition hover:shadow-md dark:border-white/[0.07]"><RecentThumb r={r} /><button type="button" className="min-w-0 flex-1 text-left" onClick={() => p.go('analyze', { id: r.id })}><div className="truncate text-sm font-semibold">{r.title}</div><div className="text-[11px] text-slate-500">{PLATFORM_RULES[r.platform]?.label || r.platform} · {r.sourceType} · {ago(r.createdAt)}</div></button><ScorePill v={r.overallScore} /><button type="button" aria-label="Delete" onClick={() => del(r.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
      )}
    </ViewShell>
  );
}
