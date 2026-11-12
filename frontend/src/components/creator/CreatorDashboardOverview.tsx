import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronRight, ImageOff, MessageCircle, Play, PlaySquare, Radio, Sparkles, UserPlus,
  LayoutTemplate, DollarSign, Layers,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useStore } from '../../store';
import {
  BarChart3 as HubInsightsIcon,
  ScanSearch as HubAnalyzeIcon,
  UploadCloud as HubUploadIcon,
  CalendarDays as HubPlannerIcon,
  Wallet as HubWalletIcon,
  MessageSquare as HubCommentsIcon,
  Coins as HubEarnIcon,
  Layers as HubBatchIcon,
} from 'lucide-react';
import { CREATOR_HUB_NAME } from '../../lib/creatorHub';
import { resolveAvatarUrl } from '../UserAvatar';
import { quickCreateFor } from './studio/CreatorTopBar';
import type { CreatorTab } from './studio/CreatorSidebar';
import { useCreatorProEnabled } from './studio/useCreatorProEnabled';
import { isCreatorTabAllowed } from '../../lib/creatorHubTools';
import { useCreatorHubMode } from '../../lib/creatorSpaceContext';
import { openCreatorHref } from '../../lib/creatorBusinessNav';
import type { CreatorHubMode } from '../../lib/creatorHub';
import {
  formatCompact, timeAgo, KIND_LABEL,
  type CreatorDashboardData, type DashItem, type DashKind, type DashStat,
} from './studio/useCreatorDashboard';
import { HubEmpty, HubLink, HubPageHeader, HubSection, HubSkeleton, chartColors, hubBtnSecondary, hubCard } from './hub/HubUI';

const muted = 'text-muted-foreground';
const statGridBase = 'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4';
const axisTick = { fontSize: 11, fill: chartColors.axis };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

/* Small pieces */

function Sparkline({ data, id }: { data: number[]; id: string }) {
  const w = 72;
  const h = 28;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.length > 1 ? data : [0, 0];
  const step = w / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, max === min ? h - 3 : h - 3 - ((v - min) / span) * (h - 8)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible text-primary" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Change({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
      {up ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
      {Math.abs(pct)}%
    </span>
  );
}

function StatCell({ label, stat, days }: { label: string; stat?: DashStat; days: number }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">{formatCompact(stat?.value)}</span>
            <Change pct={stat?.changePct ?? null} />
          </div>
          <span className={`mt-0.5 block truncate text-xs ${muted}`}>
            {stat?.changePct == null ? 'No prior data' : `vs previous ${days} days`}
          </span>
        </div>
        <div className="hidden shrink-0 pb-0.5 sm:block">
          <Sparkline data={stat?.series?.length ? stat.series : [0, 0]} id={`sp-${label.replace(/\s/g, '')}`} />
        </div>
      </div>
    </div>
  );
}

function Thumb({ item, className = '' }: { item: DashItem; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (item.thumbnail && !broken) {
    return <img src={item.thumbnail} alt="" loading="lazy" onError={() => setBroken(true)} className={`h-full w-full object-cover ${className}`} />;
  }
  if (item.videoUrl && !broken) {
    return (
      <video
        src={`${item.videoUrl}#t=0.5`}
        muted
        playsInline
        preload="metadata"
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-muted p-1.5 text-center ${className}`}>
      {item.title ? (
        <span className="line-clamp-2 text-[10px] font-medium leading-snug text-muted-foreground">{item.title}</span>
      ) : (
        <ImageOff size={14} className="text-muted-foreground" />
      )}
    </div>
  );
}

/* Main component */

interface Props {
  data: CreatorDashboardData | null;
  loading: boolean;
  error?: string | null;
  days: number;
  onDaysChange: (d: number) => void;
  onSelectTab: (tab: CreatorTab) => void;
}

/** Shortcut to a Creator Hub workspace that already has real data behind it. */
type Shortcut = { label: string; sub: string; icon: React.FC<any>; to?: string; tab?: CreatorTab; modes?: readonly CreatorHubMode[] };

/** Shortcuts this hub actually has (tab tools follow creatorHubTools; `to` shortcuts set `modes`). */
function shortcutsFor(list: Shortcut[], mode: CreatorHubMode): Shortcut[] {
  return list.filter((s) => (s.modes ? s.modes.includes(mode) : true) && (!s.tab || isCreatorTabAllowed(s.tab, mode)));
}

const HUB_SHORTCUTS: Shortcut[] = [
  { label: 'Insights', sub: 'Reach & audience', icon: HubInsightsIcon, tab: 'analytics' },
  { label: 'Content Analyze', sub: 'Check & improve', icon: HubAnalyzeIcon, tab: 'content_studio' },
  { label: 'Bulk upload', sub: 'Many files at once', icon: HubUploadIcon, to: 'business:batch', modes: ['space'] },
  { label: 'Batches', sub: 'Queued posts', icon: HubBatchIcon, tab: 'batch' },
  { label: 'Planner', sub: 'Your calendar', icon: HubPlannerIcon, tab: 'calendar' },
  { label: 'Earnings', sub: 'Monetization', icon: HubEarnIcon, tab: 'monetization' },
  { label: 'Wallet', sub: 'Balance & payouts', icon: HubWalletIcon, tab: 'monetization' },
  { label: 'Comments', sub: 'Reply to fans', icon: HubCommentsIcon, tab: 'community' },
];

const TOOLS: Shortcut[] = [
  { label: 'Go Live', sub: 'Stream with OBS', icon: Radio, tab: 'live_studio' },
  { label: 'Batch', sub: 'Bulk manage', icon: Layers, tab: 'batch' },
  { label: 'Batch Upload', sub: 'Bulk publish', icon: Layers, to: 'business:batch', modes: ['space'] },
  { label: 'AI Assistant', sub: 'Write and remix with AI', icon: Sparkles, tab: 'ai_assistant' },
  { label: 'Media Library', sub: 'Manage files', icon: PlaySquare, tab: 'content_library' },
  { label: 'Templates', sub: 'Ready to use', icon: LayoutTemplate, tab: 'content_studio' },
  { label: 'Monetization', sub: 'Earnings and payouts', icon: DollarSign, tab: 'monetization' },
];

const KINDS: DashKind[] = ['reel', 'post', 'story', 'video', 'academic'];

export const CreatorDashboardOverview = ({ data, loading, error, days, onDaysChange, onSelectTab }: Props) => {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const mode = useCreatorHubMode();
  // Upgrade (Creator Pro) is a personal-hub page only.
  const proEnabled = useCreatorProEnabled() && isCreatorTabAllowed('upgrade', mode);
  const hubShortcuts = shortcutsFor(HUB_SHORTCUTS, mode);
  const hubTools = shortcutsFor(TOOLS, mode);
  const quickCreate = quickCreateFor(mode);
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'Creator';
  const goShortcut = (to?: string, tab?: CreatorTab) => {
    if (tab) { onSelectTab(tab); return; }
    if (!to) return;
    if (to === 'business:batch') {
      navigate('/business/batch');
      return;
    }
    if (to.startsWith('http')) {
      window.location.assign(to);
      return;
    }
    void import('../../lib/creatorBusinessNav').then(({ applyBusinessCreatorNav }) => {
      if (!applyBusinessCreatorNav(to, { navigate, selectTab: onSelectTab })) navigate(to);
    });
  };

  const chartData = useMemo(
    () =>
      (data?.series || []).map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
    [data],
  );

  const mix = useMemo(() => {
    const by = data?.breakdown.byKind || { reel: 0, post: 0, story: 0, video: 0, academic: 0 };
    const total = data?.breakdown.total || 0;
    return KINDS.map((k) => ({
      kind: k,
      name: k === 'story' ? 'Stories' : `${KIND_LABEL[k]}${k === 'academic' ? '' : 's'}`,
      value: by[k] || 0,
      pct: total > 0 ? Math.round(((by[k] || 0) / total) * 100) : 0,
    }));
  }, [data]);

  const content = data?.content || [];
  const lvl = data?.level;
  const createFirst = () => (mode === 'space' ? goShortcut('business:batch') : goShortcut(undefined, 'content_studio'));
  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your creator dashboard">
        <HubSkeleton className="h-12 w-72" />
        <HubSkeleton className="h-[92px]" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"><HubSkeleton className="h-[340px]" /><HubSkeleton className="h-[340px]" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HubPageHeader
        title={`${greeting()}, ${firstName}`}
        description={`${CREATOR_HUB_NAME} · ${mode === 'space' ? 'content and audience for this Space' : 'your content, audience and earnings'}`}
        actions={
          <label className="relative">
            <span className="sr-only">Date range</span>
            <select
              value={days}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              className={`${hubBtnSecondary} appearance-none pr-8 font-medium`}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </label>
        }
      />

      {error && !data && (
        <div className={`${hubCard} px-4 py-3 text-[13px] text-destructive`}>
          Couldn't load your creator stats ({error}). Numbers show as zero until it loads.
        </div>
      )}

      <div className={statGridBase}>
        <StatCell label="Views" stat={data?.stats.views} days={days} />
        <StatCell label="Reach" stat={data?.stats.reach} days={days} />
        <StatCell label="Engagement" stat={data?.stats.engagement} days={days} />
        <StatCell label="Followers" stat={data?.stats.followers} days={days} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <HubSection title="Performance" action={<HubLink onClick={() => onSelectTab('analytics')}>Insights</HubLink>}>
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-primary" />Views</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-muted-foreground" />Reach</span>
              <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-muted-foreground" />Engagement</span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pvViews" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} tickFormatter={(v) => formatCompact(v)} width={44} />
                  <Tooltip
                    cursor={{ stroke: chartColors.grid }}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="views" name="Views" stroke={chartColors.primary} strokeWidth={2} fill="url(#pvViews)" dot={false} />
                  <Line type="monotone" dataKey="reach" name="Reach" stroke={chartColors.secondary} strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="engagement" name="Engagement" stroke={chartColors.secondary} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </HubSection>

          <HubSection title="Recent content" action={<HubLink onClick={() => onSelectTab('content_library')}>See all</HubLink>} flush>
            {content.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Content</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Views</th>
                      <th className="px-3 py-2 text-right font-medium">Comments</th>
                      <th className="px-4 py-2 text-right font-medium">Likes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {content.slice(0, 6).map((item) => (
                      <tr key={`${item.kind}-${item.id}`} onClick={() => openCreatorHref(item.href, navigate)} className="cursor-pointer hover:bg-surface-hover">
                        <td className="px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                              <Thumb item={item} />
                              {item.videoUrl && !item.thumbnail && <Play size={13} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/85" fill="currentColor" />}
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-1 font-semibold text-foreground">{item.title || `Untitled ${KIND_LABEL[item.kind].toLowerCase()}`}</span>
                              <span className="block text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatCompact(item.views)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatCompact(item.comments)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCompact(item.likes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <HubEmpty text="No content yet." action={<button type="button" onClick={createFirst} className={hubBtnSecondary}>Create your first post</button>} />
            )}
          </HubSection>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HubSection title="Recent activity" action={<HubLink onClick={() => onSelectTab('community')}>See all</HubLink>} flush>
              {data?.activity.length ? (
                <ul className="divide-y divide-border">
                  {data.activity.slice(0, 5).map((a) => {
                    const url = resolveAvatarUrl(a.actor?.avatar || null);
                    const who = a.actor?.name || 'Someone';
                    const text =
                      a.type === 'follow'
                        ? `${who} started following ${mode === 'space' ? 'this Space' : 'you'}`
                        : `${who} commented on your ${a.type === 'reel_comment' ? 'reel' : 'post'}${a.text ? `: "${a.text.slice(0, 40)}"` : ''}`;
                    const Icon = a.type === 'follow' ? UserPlus : MessageCircle;
                    return (
                      <li key={a.id}>
                        <button type="button" onClick={() => openCreatorHref(a.href, navigate)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover">
                          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-foreground">
                            {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Icon size={16} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[13px] text-foreground">{text}</span>
                            <span className={`block text-xs ${muted}`}>{timeAgo(a.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <HubEmpty text="New comments and followers will show up here." />
              )}
            </HubSection>

            <HubSection title="Scheduled" action={<HubLink onClick={() => onSelectTab('calendar')}>Planner</HubLink>} flush>
              {data?.upcoming.length ? (
                <ul className="divide-y divide-border">
                  {data.upcoming.slice(0, 4).map((u) => {
                    const d = new Date(u.scheduledFor!);
                    return (
                      <li key={`${u.kind}-${u.id}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-border leading-none">
                          <span className="text-[14px] font-semibold text-foreground">{d.getDate()}</span>
                          <span className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">{d.toLocaleString(undefined, { month: 'short' })}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-[13px] font-semibold text-foreground">{u.title || `Untitled ${KIND_LABEL[u.kind].toLowerCase()}`}</span>
                          <span className={`block text-xs ${muted}`}>{KIND_LABEL[u.kind]} · {d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <HubEmpty text="Nothing scheduled." action={<button type="button" onClick={() => onSelectTab('calendar')} className={hubBtnSecondary}>Open Planner</button>} />
              )}
            </HubSection>
          </div>

          <HubSection title="Shortcuts" action={<HubLink onClick={() => onSelectTab('tools')}>All tools</HubLink>}>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {hubShortcuts.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => goShortcut(t.to, t.tab)}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-hover"
                >
                  <t.icon size={18} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">{t.label}</span>
                    <span className={`block truncate text-xs ${muted}`}>{t.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </HubSection>
        </div>

        {/* Right column */}
        <aside className="min-w-0 space-y-4">
          <HubSection title="Create" flush>
            <ul className="divide-y divide-border">
              {quickCreate.map((q) => (
                <li key={q.id}>
                  <Link to={q.to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground"><q.icon size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-foreground">{q.label}</span>
                      <span className={`block text-xs ${muted}`}>{q.sub}</span>
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </HubSection>

          {lvl && mode === 'personal' && (
            <HubSection title="Creator level" action={<Link to="/rewards" className="text-[13px] font-semibold text-primary hover:underline">Rewards</Link>}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold text-foreground">Level {lvl.level} · {lvl.tierLabel}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{lvl.progressPct ?? 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, lvl.progressPct ?? 0)}%` }} />
              </div>
              <p className={`mt-2 text-xs ${muted}`}>
                {formatCompact(data?.xp ?? 0)}
                {lvl.nextTierAtXp ? ` / ${formatCompact(lvl.nextTierAtXp)} XP to ${lvl.nextTier ? lvl.nextTier[0].toUpperCase() + lvl.nextTier.slice(1) : 'next tier'}` : ' XP · top tier'}
              </p>
            </HubSection>
          )}

          <HubSection title="Top content" action={<HubLink onClick={() => onSelectTab('analytics')}>See all</HubLink>} flush>
            {data?.topContent.length ? (
              <ul className="divide-y divide-border">
                {data.topContent.slice(0, 4).map((t) => (
                  <li key={`${t.kind}-${t.id}`}>
                    <button type="button" onClick={() => openCreatorHref(t.href, navigate)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted"><Thumb item={t} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-[13px] font-semibold text-foreground">{t.title || `Untitled ${KIND_LABEL[t.kind].toLowerCase()}`}</span>
                        <span className={`block text-xs ${muted}`}>{formatCompact(t.views)} views · <span title="Engagement rate (likes + comments / views)">{t.engagementRate ?? 0}% engagement</span></span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <HubEmpty text="Your best performers show up once content gets views." />
            )}
          </HubSection>

          <HubSection title="Content mix" description={`${formatCompact(data?.breakdown.total)} items`}>
            <ul className="space-y-2.5">
              {mix.map((d) => (
                <li key={d.kind}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-foreground">{d.name}</span>
                    <span className="tabular-nums text-muted-foreground">{d.value} · {d.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          </HubSection>

          <HubSection title="Tools" flush>
            <ul className="divide-y divide-border">
              {hubTools.map((t) => (
                <li key={t.label}>
                  <button type="button" onClick={() => goShortcut(t.to, t.tab)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover">
                    <t.icon size={18} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-foreground">{t.label}</span>
                      <span className={`block text-xs ${muted}`}>{t.sub}</span>
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </HubSection>

          {proEnabled && (
            <div className={`${hubCard} flex items-center justify-between gap-3 px-4 py-3.5`}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Creator Pro</div>
                <div className={`text-xs ${muted}`}>Compare plans and limits.</div>
              </div>
              <button type="button" onClick={() => onSelectTab('upgrade')} className={hubBtnSecondary}>See plans</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};