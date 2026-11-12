import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDownRight, ArrowUpRight, Bell, Calendar, Check, ChevronDown, ChevronRight, Download, LayoutGrid, Loader2,
  Moon, Play, Search, Sun, TrendingUp, UserPlus, Users, Video, Layers,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../store';
import { batchCreateAppUrl } from '../../lib/batchStudio';
import { creatorHubPath, personalCreatorHubUrl } from '../../lib/creatorHub';
import { openCreatorHref } from '../../lib/creatorBusinessNav';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import WevsoftMark from '../auth/WevsoftMark';
import { HubEmpty, HubPageHeader, HubSection, HubSkeleton, HubTabs, chartColors, hubBtnPrimary, hubBtnSecondary, hubCard } from '../creator/hub/HubUI';
import { useDepsChanged } from '../../hooks/useValueChanged';
type Kpi = { value: number; prev: number | null; delta: number | null } | null;
interface Item { src: string; id: string; kind: string; title: string; thumb: string | null; thumbType: string | null; createdAt: string; href: string | null; reach: number | null; engagement: number; engagementDelta: number | null }
interface Rows { withData: number; rows: { name: string; count: number }[] }
type InsightSection = 'overview' | 'views' | 'earnings' | 'engagement' | 'audience';
const SECTIONS: { id: InsightSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'views', label: 'Views' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'audience', label: 'Audience' },
];
function normalizeSection(raw?: string | null): InsightSection {
  const s = String(raw || 'overview').toLowerCase();
  if (s === 'demographics') return 'audience';
  if (SECTIONS.some((x) => x.id === s)) return s as InsightSection;
  return 'overview';
}
interface InsightsData {
  from: string; to: string; days: number; tz: string;
  kpis: { reach: Kpi; impressions: Kpi; engagements: Kpi; followers: Kpi; linkClicks: Kpi };
  series: { date: string; reach: number; engagement: number; followers: number; linkClicks?: number }[];
  scope?: { type: 'personal' | 'space'; id?: string; name?: string | null };
  byType: Record<string, { engagement: number; reach: number; items: number; active: number; published?: number }>;
  top: Item[];
  audience: {
    totalFollowers: number; newFollowers: Kpi; trend: { date: string; total: number }[]; sample: number;
    locations: Rows | null; age: Rows | null; gender: Rows | null;
    followerSplit?: { followers: number; nonFollowers: number; total: number };
    traffic?: { source: string; count: number }[];
  };
  views?: {
    postViews: number; reelViews: number; totalViews: number; watchSec: number; avgWatchSec: number;
    completedViews: number; plays: number; followerSplit: { followers: number; nonFollowers: number };
  };
  engagementBreakdown?: { reactions: number; comments: number; shares: number };
  earnings?: { stars: number; usd: number; prevUsd: number | null; delta: number | null; note: string };
  bestTime: { total: number; minRequired: number; cells: { dow: number; hour: number; count: number }[] };
  notes: Record<string, string>;
}

const tok = () => useStore.getState().token;
async function api<T = any>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok()}` } });
  const b = await r.json().catch(() => null);
  if (!r.ok) throw new Error(b?.error || `Request failed (${r.status})`);
  return b as T;
}
const card = hubCard;
const fmt = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(v));
const dLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const TYPE: Record<string, { label: string; color: string }> = {
  video: { label: 'Videos', color: chartColors.primary }, photo: { label: 'Photos', color: chartColors.primary }, reel: { label: 'Reels', color: chartColors.primary },
  story: { label: 'Stories', color: chartColors.primary }, link: { label: 'Links', color: chartColors.primary }, text: { label: 'Text', color: chartColors.primary },
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
/** Secondary series colour: neutral, so the accent stays the only colour on the page. */
const SECOND = 'var(--muted-foreground)';
const axisTick = { fontSize: 11, fill: chartColors.axis };
/** One card split into cells by 1px gaps (border colour shows through). Odd last cell spans the row. */
const statGridBase = 'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1';

function Delta({ v, className = '' }: { v: number | null; className?: string }) {
  if (v == null) return null;
  const up = v >= 0;
  return <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'} ${className}`}>{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(v)}%</span>;
}
function Spark({ data, k, id }: { data: any[]; k: string; id: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.18} /><stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} /></linearGradient></defs>
        <Area type="monotone" dataKey={k} stroke={chartColors.primary} strokeWidth={1.6} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
/** Flat "no data" line used inside a section. */
function NotTracked({ text, small }: { text: string; small?: boolean }) {
  return <p className={small ? 'text-xs text-muted-foreground' : 'py-8 text-center text-[13px] text-muted-foreground'}>{text}</p>;
}
/** Label + thin accent bar + percentage. */
function Bars({ rows, total }: { rows: { name: string; count: number }[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => { const p = total ? Math.round((r.count / total) * 100) : 0; return (
        <li key={r.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="truncate text-foreground" title={r.name}>{r.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{p}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} /></div>
        </li>
      ); })}
    </ul>
  );
}
function Heatmap({ grid, max }: { grid: number[][]; max: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[300px]">
        {grid.map((row, d) => (
          <div key={d} className="mb-[3px] flex items-center gap-[3px]">
            <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{DAYS[d]}</span>
            {row.map((v, b) => (
              <span
                key={b}
                title={`${DAYS[d]} ${hourLabel(b * 2)}-${hourLabel((b * 2 + 2) % 24)}: ${v} interactions`}
                className="h-4 flex-1 rounded-[3px] bg-muted"
                style={v ? { background: `color-mix(in srgb, var(--primary) ${Math.round(15 + 85 * (v / max))}%, transparent)` } : undefined}
              />
            ))}
          </div>
        ))}
        <div className="ml-[35px] mt-1 flex justify-between text-[11px] text-muted-foreground">{[0, 4, 8, 12, 16, 20].map((h) => <span key={h}>{hourLabel(h)}</span>)}</div>
      </div>
    </div>
  );
}
export default function InsightsDashboard(props: {
  spaceId?: string;
  spaceName?: string;
  embedded?: boolean;
  /** Facebook-style Insights tab: overview | views | earnings | engagement | audience */
  section?: string | null;
  onSectionChange?: (section: InsightSection) => void;
} = {}) {
  const navigate = useNavigate();
  const ident = useSpaceIdentities();
  const spaceId = props.spaceId || (ident.isSpaceMode ? ident.active?.id : undefined);
  const spaceName = props.spaceName || (ident.isSpaceMode ? ident.active?.name : undefined);
  const embedded = !!props.embedded;
  const [localSection, setLocalSection] = useState<InsightSection>(() => normalizeSection(props.section));
  const rawSection = props.onSectionChange ? normalizeSection(props.section) : localSection;
  // Space hub: earnings are Space monetization (Business ? Monetization), not personal Stars.
  const section: InsightSection = spaceId && rawSection === 'earnings' ? 'overview' : rawSection;
  const sections = spaceId ? SECTIONS.filter((s) => s.id !== 'earnings') : SECTIONS;
  const setSection = (s: InsightSection) => {
    if (props.onSectionChange) props.onSectionChange(s);
    else setLocalSection(s);
  };
  const sectionPropChanged = useDepsChanged([props.section, props.onSectionChange]);
  if (sectionPropChanged && !props.onSectionChange) setLocalSection(normalizeSection(props.section));
  const user = useStore((s: any) => s.user);
  const theme = useStore((s: any) => s.theme) as string;
  const setTheme = useStore((s: any) => s.setTheme) as (t: string) => void;
  const isDark = /dark|oled/i.test(theme || '');
  const [days, setDays] = useState(30);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const reqSeq = React.useRef(0);
  const load = useCallback(async () => {
    const my = ++reqSeq.current; // identity can switch personal -> Space while loading; drop stale responses
    setLoading(true); setErr(null);
    try { const d = await api<InsightsData>(`/api/content-insights?days=${days}&tz=${encodeURIComponent(tz)}${spaceId ? `&spaceId=${encodeURIComponent(spaceId)}` : ''}`); if (my === reqSeq.current) setData(d); } catch (e: any) { if (my === reqSeq.current) setErr(e.message); } finally { if (my === reqSeq.current) setLoading(false); }
  }, [days, tz, spaceId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { api<any>('/api/notifications?limit=1').then((r) => setUnread(Number(r?.unread ?? r?.unreadCount ?? 0) || 0)).catch(() => {}); }, []);

  const rangeText = data ? `${new Date(data.from).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(data.to).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : `Last ${days} days`;
  const initials = (user?.name || 'U').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();

  const types = useMemo(() => {
    if (!data) return [];
    const order = ['video', 'photo', 'reel', 'story', 'link', 'text'];
    const rows = order.map((k) => ({ k, ...TYPE[k], engagement: data.byType[k]?.engagement || 0, items: data.byType[k]?.items || 0 })).filter((r) => r.items > 0 && (r.k !== 'text' || r.engagement > 0));
    const total = rows.reduce((a, r) => a + r.engagement, 0);
    return rows.map((r) => ({ ...r, pct: total ? Math.round((r.engagement / total) * 100) : 0 }));
  }, [data]);
  const typeTotal = types.reduce((a, r) => a + r.engagement, 0);

  const heat = useMemo(() => {
    const grid = DAYS.map(() => Array(12).fill(0) as number[]);
    data?.bestTime.cells.forEach((c) => { grid[c.dow - 1][Math.floor(c.hour / 2)] += c.count; });
    const max = Math.max(1, ...grid.flat());
    let best = { d: 0, b: 0, v: 0 }; grid.forEach((row, d) => row.forEach((v, b) => { if (v > best.v) best = { d, b, v }; }));
    // best 2-hour window across all days
    const cols = Array.from({ length: 12 }, (_, b) => grid.reduce((a, r) => a + r[b], 0));
    const bestCol = cols.indexOf(Math.max(...cols));
    return { grid, max, best, bestCol };
  }, [data]);
  const heatOk = !!data && data.bestTime.total >= data.bestTime.minRequired;

  const recs = useMemo(() => {
    if (!data) return [];
    const out: { icon: React.ElementType; tone: string; title: string; text: string; cta: string; to: string }[] = [];
    const avg = Object.entries(data.byType).filter(([, v]) => v.items > 0 && v.engagement > 0).map(([k, v]) => ({ k, avg: v.engagement / v.items })).sort((a, b) => b.avg - a.avg);
    if (avg.length >= 2) {
      const [a, b] = avg; const x = Math.round((a.avg / b.avg) * 10) / 10;
      out.push({ icon: Video, tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', title: `Your ${TYPE[a.k].label.toLowerCase()} are performing best`, text: `${TYPE[a.k].label} got ${x}x more engagement per item than ${TYPE[b.k].label.toLowerCase()} in this period. Consider posting more.`, cta: `Create ${TYPE[a.k].label.replace(/s$/, '')}`, to: a.k === 'reel' ? '/reels' : '/create-post' });
    } else if (avg.length === 1) {
      out.push({ icon: Video, tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', title: `Only ${TYPE[avg[0].k].label.toLowerCase()} got engagement`, text: 'Try another format to learn what your audience likes most.', cta: 'Create Post', to: '/create-post' });
    }
    if (heatOk) {
      const s = heat.bestCol * 2;
      out.push({ icon: Users, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', title: `Your audience is most active at ${hourLabel(s)}-${hourLabel((s + 2) % 24)}`, text: `Based on ${data.bestTime.total} interactions in the last 90 days. Schedule posts in this window.`, cta: spaceId ? 'Schedule Post' : 'Create Post', to: spaceId ? batchCreateAppUrl() : '/create-post' });
    }
    const r = data.kpis.reach;
    if (r && r.delta != null) out.push({ icon: TrendingUp, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', title: `Reach is ${r.delta >= 0 ? 'up' : 'down'} ${Math.abs(r.delta)}%`, text: r.delta >= 0 ? 'Keep the momentum. Check which posts drove it.' : 'Analyze your recent posts to see what to improve.', cta: 'Analyze Content', to: '/studio/content?view=analyze' });
    const f = data.kpis.followers;
    if (f && f.value > 0) out.push({ icon: UserPlus, tone: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', title: `You have ${f.value} new follower${f.value === 1 ? '' : 's'}!`, text: f.delta != null ? `That is ${f.delta >= 0 ? `${f.delta}% more` : `${Math.abs(f.delta)}% fewer`} than the previous ${data.days} days.` : `In the last ${data.days} days. Say thanks with a new post.`, cta: 'Thank Followers', to: '/create-post' });
    if (!out.length) out.push({ icon: Layers, tone: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', title: 'Not enough data yet', text: 'Publish a few posts to unlock personalised recommendations.', cta: spaceId ? 'Bulk Upload' : 'Create Post', to: spaceId ? batchCreateAppUrl() : '/create-post' });
    return out.slice(0, 4);
  }, [data, heat, heatOk, spaceId]);

  const exportCsv = () => {
    if (!data) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const L: string[] = [];
    L.push(`Wevsoft Insights,${esc(rangeText)}`, '', 'Metric,Value,Previous period,Change %');
    const k = (n: string, x: Kpi) => L.push(x ? [n, x.value, x.prev ?? '', x.delta ?? ''].map(esc).join(',') : [n, 'Not tracked', '', ''].map(esc).join(','));
    k('Total Reach', data.kpis.reach); k('Total Impressions', data.kpis.impressions); k('Engagements', data.kpis.engagements); k('New Followers', data.kpis.followers); k('Link Clicks', data.kpis.linkClicks);
    L.push(['Total Followers', data.audience.totalFollowers, '', ''].map(esc).join(','), '', 'Date,Reach,Engagement,New followers');
    data.series.forEach((r) => L.push([r.date, r.reach, r.engagement, r.followers].join(',')));
    L.push('', 'Content type,Items,Engagement,Share %'); types.forEach((t) => L.push([t.label, t.items, t.engagement, t.pct].map(esc).join(',')));
    L.push('', 'Top content,Type,Reach,Engagement,Created'); data.top.forEach((t) => L.push([t.title, TYPE[t.kind]?.label || t.kind, t.reach ?? '', t.engagement, t.createdAt].map(esc).join(',')));
    const blob = new Blob(['\ufeff' + L.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wevsoft-insights-${data.days}d-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    toast.success('Report exported');
  };

  const kpiCards = data ? [
    { label: 'Total Reach', k: data.kpis.reach, key: 'reach', note: 'Impressions' },
    { label: 'Total Impressions', k: data.kpis.impressions, key: '', note: 'Repeat views aren’t recorded' },
    { label: 'Engagements', k: data.kpis.engagements, key: 'engagement', note: '' },
    { label: 'New Followers', k: data.kpis.followers, key: 'followers', note: '' },
    { label: 'Link Clicks', k: data.kpis.linkClicks, key: 'linkClicks', note: 'Link clicks on personal posts aren’t recorded' },
  ].filter((c) => c.k) : [];

  const TipBox = ({ active, payload, label }: any) => active && payload?.length ? (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg">
      <div className="mb-1 font-semibold">{new Date(`${label}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      {payload.map((p: any) => <div key={p.dataKey} className="flex items-center justify-between gap-6"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span><b className="tabular-nums">{fmt(p.value)}</b></div>)}
    </div>
  ) : null;

  const go = (to: string) => { if (/^https?:\/\//i.test(to)) window.location.assign(to); else navigate(to); };

  const topList = (items: Item[], limit = 6) => items.length ? (
    <ul className="divide-y divide-border">
      {items.slice(0, limit).map((t, i) => (
        <li key={t.src + t.id}>
          <button type="button" onClick={() => openCreatorHref(t.href, navigate)} disabled={!t.href} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover disabled:cursor-default disabled:hover:bg-transparent">
            <span className="w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {t.thumb ? (t.thumbType === 'video' ? <video src={`${t.thumb}#t=0.5`} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={t.thumb} alt="" className="h-full w-full object-cover" />) : <span className="grid h-full place-items-center text-[10px] text-muted-foreground">{TYPE[t.kind]?.label}</span>}
              {(t.kind === 'video' || t.kind === 'reel') && t.thumb && <span className="absolute inset-0 grid place-items-center"><Play className="h-3.5 w-3.5 fill-white text-white drop-shadow" /></span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-foreground">{t.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{TYPE[t.kind]?.label || t.kind}{t.reach != null ? ` · ${fmt(t.reach)} reach` : ''} · {fmt(t.engagement)} engagement</span>
            </span>
            <Delta v={t.engagementDelta} />
          </button>
        </li>
      ))}
    </ul>
  ) : <NotTracked text="No reach or engagement on your content in this period." />;

  const demographics = data ? (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div>
        <div className="mb-3 text-[13px] font-medium text-muted-foreground">Top locations</div>
        {data.audience.locations ? <><Bars rows={data.audience.locations.rows} total={data.audience.locations.withData} /><p className="mt-2 text-xs text-muted-foreground">From {data.audience.locations.withData} of {data.audience.sample} profiles</p></> : <NotTracked small text="Followers haven't added a location." />}
      </div>
      <div>
        <div className="mb-3 text-[13px] font-medium text-muted-foreground">Age range</div>
        {data.audience.age ? <><Bars rows={data.audience.age.rows} total={data.audience.age.withData} /><p className="mt-2 text-xs text-muted-foreground">From {data.audience.age.withData} of {data.audience.sample} birthdays</p></> : <NotTracked small text="Followers haven't shared a birthday." />}
      </div>
      <div>
        <div className="mb-3 text-[13px] font-medium text-muted-foreground">Gender</div>
        {data.audience.gender ? <Bars rows={data.audience.gender.rows} total={data.audience.gender.withData} /> : <NotTracked small text="Followers haven't set a gender." />}
      </div>
    </div>
  ) : null;

  const bestTime = data ? (
    <HubSection title="Best time to post" description={`When your audience is most active · last 90 days · ${tz}`}>
      {heatOk ? (
        <>
          <Heatmap grid={heat.grid} max={heat.max} />
          <p className="mt-3 text-[13px] text-muted-foreground">Busiest window: <span className="font-semibold text-foreground">{hourLabel(heat.bestCol * 2)}–{hourLabel((heat.bestCol * 2 + 2) % 24)}</span></p>
        </>
      ) : <NotTracked text={`Needs at least ${data.bestTime.minRequired} interactions from your audience (have ${data.bestTime.total}).`} />}
    </HubSection>
  ) : null;

  const statCell = (label: string, value: React.ReactNode, sub?: React.ReactNode, spark?: React.ReactNode) => (
    <div key={label} className="min-w-0 bg-card px-4 py-3.5">
      <div className="truncate text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">{value}</div>
          {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        {spark && <div className="h-8 w-[38%] max-w-[96px] shrink-0">{spark}</div>}
      </div>
    </div>
  );
  const statGrid = (n: number) => `${statGridBase} ${n >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : n === 4 ? 'lg:grid-cols-4' : n === 3 ? 'sm:grid-cols-3' : ''}`;

  return (
    <div className={embedded ? 'text-foreground' : 'flex min-h-screen flex-col bg-background text-foreground'}>
      {!embedded && <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2"><WevsoftMark className="h-5 w-auto" /><span className="hidden text-lg font-black tracking-tight sm:block">Wevsoft</span></Link>
          <form className="relative mx-auto hidden w-full max-w-[380px] md:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search anything" className="h-10 w-full rounded-full border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30" />
          </form>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link to="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface-hover"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</Link>
            <button type="button" aria-label="Toggle theme" onClick={() => setTheme(isDark ? 'Light mode' : 'Dark mode')} className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface-hover">{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <Link to="/home" aria-label="Apps" className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface-hover"><LayoutGrid className="h-5 w-5" /></Link>
            <Link to="/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-surface-hover">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-bold text-foreground">{initials}</span>}
              <span className="hidden leading-tight lg:block"><span className="block text-sm font-semibold">{user?.name}</span><span className="block text-xs text-muted-foreground">@{user?.username}</span></span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
            </Link>
          </div>
        </div>
      </header>}

      <main className={embedded ? 'space-y-5' : 'mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6'}>
        <HubPageHeader
          title="Insights"
          description={spaceId ? <>Space insights for <span className="font-semibold text-foreground">{data?.scope?.name || spaceName || 'Space'}</span></> : 'How your content and audience are doing.'}
          actions={<>
            <div className="relative">
              <button type="button" onClick={() => setRangeOpen((o) => !o)} className={`${hubBtnSecondary} min-w-[200px] justify-start font-medium`}>
                <Calendar size={15} className="text-muted-foreground" /><span className="flex-1 truncate text-left">{rangeText}</span><ChevronDown size={15} className="text-muted-foreground" />
              </button>
              {rangeOpen && <>
                <div className="fixed inset-0 z-30" onClick={() => setRangeOpen(false)} />
                <div className="absolute right-0 z-40 mt-1.5 w-full min-w-[180px] rounded-xl border border-border bg-card p-1.5 shadow-lg">
                  {[7, 30, 90].map((d) => (
                    <button key={d} type="button" onClick={() => { setDays(d); setRangeOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface-hover ${d === days ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      Last {d} days{d === days && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </>}
            </div>
            <button type="button" disabled={!data} onClick={exportCsv} className={hubBtnPrimary}><Download size={15} />Export</button>
          </>}
        />

        <HubTabs<InsightSection> label="Insights sections" items={sections} value={section} onChange={setSection} />

        {err && <div className={`${card} flex items-center justify-between gap-3 px-4 py-3 text-sm`}><span className="text-destructive">{err}</span><button type="button" className="font-semibold text-primary hover:underline" onClick={load}>Retry</button></div>}
        {loading && !data && (
          <div className="space-y-4" aria-busy="true">
            <HubSkeleton className="h-[92px]" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"><HubSkeleton className="h-[300px]" /><HubSkeleton className="h-[300px]" /></div>
          </div>
        )}
        {loading && data && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</div>}

        {data && section === 'views' && (() => {
          const v = data.views;
          const fol = v?.followerSplit.followers || 0;
          const non = v?.followerSplit.nonFollowers || 0;
          const splitTot = fol + non || 1;
          return (
            <div className="space-y-4">
              <div className={statGrid(4)}>
                {statCell('Total views', fmt(v?.totalViews ?? 0), 'Posts + Reels in this period')}
                {statCell('Post views', fmt(v?.postViews ?? 0), 'Recorded post views')}
                {statCell('Reel views', fmt(v?.reelViews ?? 0), 'From Reel analytics')}
                {statCell('Avg. watch time', `${fmt(v?.avgWatchSec ?? 0)}s`, `${fmt(v?.watchSec || 0)}s total · ${fmt(v?.plays || 0)} plays`)}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <HubSection title="Followers vs non-followers" description="Who viewed your posts in this period">
                  <Bars rows={[{ name: 'Followers', count: fol }, { name: 'Non-followers', count: non }]} total={splitTot} />
                  <p className="mt-3 text-xs text-muted-foreground">{fmt(fol)} follower views · {fmt(non)} non-follower views</p>
                </HubSection>
                <HubSection title="Watch quality" description="Reel plays and completion">
                  <div className="grid grid-cols-3 divide-x divide-border">
                    {[['Plays', fmt(v?.plays || 0)], ['Completed', fmt(v?.completedViews || 0)], ['Completion', `${v?.plays ? Math.round(((v?.completedViews || 0) / v.plays) * 100) : 0}%`]].map(([l, val]) => (
                      <div key={l} className="px-3 first:pl-0"><div className="text-[13px] text-muted-foreground">{l}</div><div className="mt-1 text-[22px] font-semibold tabular-nums">{val}</div></div>
                    ))}
                  </div>
                </HubSection>
              </div>
            </div>
          );
        })()}

        {data && section === 'earnings' && (() => {
          const e = data.earnings;
          return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
              <HubSection title="Estimated earnings" description={e?.note || 'Stars and gifts in this period'}>
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <div className="text-[13px] text-muted-foreground">USD estimate</div>
                    <div className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums">${(e?.usd ?? 0).toFixed(2)}</div>
                    <div className="mt-2 text-xs">{e?.delta != null ? <><Delta v={e.delta} /><span className="ml-1 text-muted-foreground">vs previous {data.days} days</span></> : <span className="text-muted-foreground">No prior data</span>}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-muted-foreground">Stars received</div>
                    <div className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums">{fmt(e?.stars ?? 0)}</div>
                  </div>
                </div>
                <button type="button" onClick={() => (spaceId ? window.location.assign(personalCreatorHubUrl('monetization', 'stars')) : navigate(creatorHubPath('monetization', 'stars')))} className={`${hubBtnPrimary} mt-5`}>{spaceId ? 'Open personal Stars & gifting' : 'Open Stars & gifting'}</button>
              </HubSection>
              <HubSection title="How earnings are counted" action={spaceId ? undefined : <Link to={creatorHubPath('monetization')} className="text-[13px] font-semibold text-primary hover:underline">Monetization</Link>}>
                <ul className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                  <li>1 Star ≈ $0.01 estimated value before platform fees.</li>
                  <li>Live gifts, Reel gifts and tips in this date range are included.</li>
                  <li>Cashout and payouts are under Monetization → Stars.</li>
                </ul>
              </HubSection>
            </div>
          );
        })()}

        {data && section === 'engagement' && (() => {
          const b = data.engagementBreakdown || { reactions: 0, comments: 0, shares: 0 };
          const total = b.reactions + b.comments + b.shares;
          return (
            <div className="space-y-4">
              <div className={statGrid(4)}>
                {statCell('Total engagements', fmt(data.kpis.engagements?.value || 0), data.kpis.engagements?.delta != null ? <><Delta v={data.kpis.engagements.delta} /> vs previous {data.days} days</> : 'No prior data')}
                {statCell('Reactions', fmt(b.reactions), total ? `${Math.round((b.reactions / total) * 100)}% of total` : undefined)}
                {statCell('Comments', fmt(b.comments), total ? `${Math.round((b.comments / total) * 100)}% of total` : undefined)}
                {statCell('Shares', fmt(b.shares), total ? `${Math.round((b.shares / total) * 100)}% of total` : undefined)}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
                <HubSection title="Engagement over time" description={data.notes.engagements}>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <defs><linearGradient id="gEngOnly" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.16} /><stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid vertical={false} stroke={chartColors.grid} />
                        <XAxis dataKey="date" tickFormatter={dLabel} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
                        <YAxis tickFormatter={fmt} tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                        <Tooltip content={<TipBox />} />
                        <Area type="monotone" name="Engagement" dataKey="engagement" stroke={chartColors.primary} strokeWidth={2} fill="url(#gEngOnly)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </HubSection>
                <HubSection title="Top engaging content" action={<Link to={creatorHubPath('content_library')} className="text-[13px] font-semibold text-primary hover:underline">See all</Link>} flush>
                  {topList(data.top)}
                </HubSection>
              </div>
            </div>
          );
        })()}

        {data && section === 'audience' && (
          <div className="space-y-4">
            <div className={statGrid(4)}>
              {statCell('Total followers', fmt(data.audience.totalFollowers), <>+{data.audience.newFollowers?.value || 0} new <Delta v={data.audience.newFollowers?.delta ?? null} /></>, <Spark data={data.audience.trend} k="total" id="sp-fol-aud" />)}
              {statCell('Follower post views', fmt(data.audience.followerSplit?.followers || 0))}
              {statCell('Non-follower views', fmt(data.audience.followerSplit?.nonFollowers || 0))}
              {statCell('Audience sample', fmt(data.audience.sample), 'Profiles used for demographics')}
            </div>
            <HubSection title="Demographics" description="Based on what followers share on their profiles">{demographics}</HubSection>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <HubSection title="Where views come from" description="Traffic sources on your posts">
                {(data.audience.traffic?.length ?? 0) > 0 ? (
                  <Bars rows={(data.audience.traffic || []).map((t) => ({ name: t.source, count: t.count }))} total={(data.audience.traffic || []).reduce((a, t) => a + t.count, 0)} />
                ) : <NotTracked text="No traffic-source data in this period yet." />}
              </HubSection>
              {bestTime}
            </div>
          </div>
        )}

        {data && section === 'overview' && (
          <div className="space-y-4">
            <div className={statGrid(kpiCards.length)}>
              {kpiCards.map((c) => c.k
                ? statCell(c.label, fmt(c.k.value), c.k.delta != null ? <><Delta v={c.k.delta} /> vs previous {data.days} days</> : 'No prior data', c.key ? <Spark data={data.series} k={c.key} id={`sp-${c.key}`} /> : undefined)
                : statCell(c.label, '—', c.note))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
              <HubSection
                title="Performance"
                description={data.notes.reach}
                action={
                  <div className="flex rounded-lg border border-border p-0.5">
                    {[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${d === days ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{d}d</button>)}
                  </div>
                }
              >
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-primary" />Reach</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: SECOND }} />Engagement</span>
                  {data.kpis.linkClicks && <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded border-t border-dashed" style={{ borderColor: SECOND }} />Link clicks</span>}
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.16} /><stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke={chartColors.grid} />
                      <XAxis dataKey="date" tickFormatter={dLabel} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis tickFormatter={fmt} tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                      {/* eslint-disable-next-line react-hooks/static-components -- inline component kept as-is (existing behavior) */}
                      <Tooltip content={<TipBox />} />
                      <Area type="monotone" name="Reach" dataKey="reach" stroke={chartColors.primary} strokeWidth={2} fill="url(#gR)" />
                      <Line type="monotone" name="Engagement" dataKey="engagement" stroke={SECOND} strokeWidth={1.8} dot={false} />
                      {data.kpis.linkClicks && <Line type="monotone" name="Link clicks" dataKey="linkClicks" stroke={SECOND} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </HubSection>

              <HubSection title="Top content" action={<Link to={creatorHubPath('content_library')} className="text-[13px] font-semibold text-primary hover:underline">See all</Link>} flush>
                {topList(data.top, 5)}
              </HubSection>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <HubSection title="By content type" description="Share of engagement in this period">
                {typeTotal > 0 ? (
                  <>
                    <Bars rows={types.map((t) => ({ name: `${t.label} · ${fmt(t.engagement)}`, count: t.engagement }))} total={typeTotal} />
                    <p className="mt-3 text-xs text-muted-foreground">{fmt(typeTotal)} engagements across {types.reduce((a, t) => a + t.items, 0)} items</p>
                  </>
                ) : <NotTracked text="No engagement on your content in this period yet." />}
              </HubSection>
              <HubSection title="Audience" action={<button type="button" onClick={() => setSection('audience')} className="text-[13px] font-semibold text-primary hover:underline">Details</button>}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[13px] text-muted-foreground">Total followers</div>
                    <div className="mt-1 text-[22px] font-semibold tabular-nums">{fmt(data.audience.totalFollowers)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{data.audience.newFollowers?.delta != null ? <><Delta v={data.audience.newFollowers.delta} /> new followers</> : `+${data.audience.newFollowers?.value || 0} in ${data.days} days`}</div>
                  </div>
                  <div className="h-10 w-28"><Spark data={data.audience.trend} k="total" id="sp-fol" /></div>
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-3 text-[13px] font-medium text-muted-foreground">Top locations</div>
                  {data.audience.locations ? <Bars rows={data.audience.locations.rows.slice(0, 4)} total={data.audience.locations.withData} /> : <NotTracked small text="Followers haven't added a location." />}
                </div>
              </HubSection>
              {bestTime}
            </div>

            <HubSection title="Recommendations" description="Based on your own data" flush>
              {recs.length ? (
                <ul className="divide-y divide-border">
                  {recs.map((r) => (
                    <li key={r.title}>
                      <button type="button" onClick={() => go(r.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground"><r.icon size={18} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">{r.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{r.text}</span>
                        </span>
                        <span className="hidden shrink-0 text-[13px] font-semibold text-primary sm:inline">{r.cta}</span>
                        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <HubEmpty text="Publish a few posts to unlock recommendations." />}
            </HubSection>
          </div>
        )}
      </main>
    </div>
  );
}