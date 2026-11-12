/**
 * Insights (MP2 §18, MP3 §21).
 *
 * Every number on this screen comes from `GET /manage/:id/insights`, which reads
 * the daily-stat rows, and the CSV button downloads *that same* payload from the
 * same route with `format=csv` — so the file and the charts can never disagree.
 *
 * Two deliberate omissions, both because §35 forbids inventing data:
 *
 *  - The shared INSIGHT_PANELS vocabulary lists Promotion and Revenue tabs. The
 *    daily-stat table holds nothing for them, so instead of drawing empty charts
 *    this panel points at the sections that own those numbers for real.
 *  - Period-over-period deltas are a second real request for the window directly
 *    before this one, not a guess. When that request has not arrived (or the
 *    Space is younger than two windows) the tiles simply show no delta.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, Eye, FileText, Heart, Megaphone, Users, Wallet, MessageCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DEFAULT_INSIGHT_RANGE,
  FOLLOWER_SOURCES,
  INSIGHT_RANGES,
  engagementRate,
  percentChange,
  spaceDashboardPath,
  type InsightRange,
  type SpaceDashboardSection,
} from '@wevsoft/shared/wevspace';
import { exportInsightsCsv, fetchInsights } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  SegmentedTabs,
  StatTile,
  TextInput,
  dateOnly,
  num,
  usePanelData,
} from './manageUi';

const DAY_MS = 86_400_000;

/** Chart palette. Series 1 is always the Space accent; the rest stay fixed so a
 *  loud accent cannot make "followers lost" look like a good thing. */
const C_SECOND = '#94a3b8';
const C_THIRD = '#8b5cf6';
const C_GAIN = '#22c55e';
const C_LOSS = '#ef4444';
const C_CTA = '#f59e0b';

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: '11px',
} as const;

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  FOLLOWER_SOURCES.map((source) => [source.id, source.label]),
);

export default function AnalyticsPanel() {
  const { spaceId, accent, space } = useManage();
  const [range, setRange] = useState<InsightRange>(DEFAULT_INSIGHT_RANGE);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  // A custom window only becomes a request once both ends are filled in; until
  // then the server would silently fall back to 28 days and the header would lie.
  const customReady = range !== 'custom' || (from !== '' && to !== '' && from <= to);
  const params = useMemo(
    () => (range === 'custom' ? { range, from, to } : { range }),
    [range, from, to],
  );

  const insights = usePanelData(
    () => (customReady ? fetchInsights(spaceId, params) : Promise.resolve(null)),
    [spaceId, params, customReady],
  );

  const data = insights.data;

  // The window immediately before the one on screen, for the deltas. Derived from
  // what the server actually resolved, not from what was asked for.
  const previousParams = useMemo(() => {
    if (!data) return null;
    const startMs = Date.parse(`${data.from}T00:00:00Z`);
    if (!Number.isFinite(startMs) || !data.days) return null;
    const prevTo = new Date(startMs - DAY_MS).toISOString().slice(0, 10);
    const prevFrom = new Date(startMs - data.days * DAY_MS).toISOString().slice(0, 10);
    return { range: 'custom' as InsightRange, from: prevFrom, to: prevTo };
  }, [data]);

  const previous = usePanelData(
    () => (previousParams ? fetchInsights(spaceId, previousParams) : Promise.resolve(null)),
    [spaceId, previousParams],
  );

  const totals = data?.totals || {};
  const before = previous.data?.totals;
  const series = data?.series || [];
  const hasAnyData = series.some((point) => Object.entries(point).some(([key, value]) => key !== 'day' && Number(value) > 0));

  const delta = (key: string) => (before ? percentChange(Number(totals[key] || 0), Number(before[key] || 0)) : null);

  const download = async () => {
    setExporting(true);
    try {
      const file = await exportInsightsCsv(spaceId, params);
      const url = URL.createObjectURL(new Blob([file.body], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch (error: any) {
      toast.error(error?.message || 'Could not export those numbers');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Insights"
        blurb={`How people find and use ${space?.name || 'this Space'}. Nobody outside your team sees any of this.`}
        actions={
          data?.canExport ? (
            <ActionButton busy={exporting} onClick={download} title="Download this window as CSV">
              <Download size={13} /> Export CSV
            </ActionButton>
          ) : undefined
        }
      />

      <SegmentedTabs options={INSIGHT_RANGES} value={range} onChange={setRange} accent={accent} />

      {range === 'custom' && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="From" hint="Up to 400 days in one window.">
              <TextInput
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
          </div>
          {!customReady && (
            <p className="mt-2 text-[11px] font-bold text-muted-foreground">
              Pick both dates to load a custom window.
            </p>
          )}
        </Card>
      )}

      {insights.loading && !data ? (
        <PanelSkeleton rows={3} tall />
      ) : insights.error ? (
        <PanelError message={insights.error} onRetry={insights.reload} />
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 size={18} />}
          title="Choose a window"
          blurb="Set a start and end date above to see insights for that period."
        />
      ) : (
        <>
          <p className="text-[11px] font-bold text-muted-foreground">
            {dateOnly(data.from)} – {dateOnly(data.to)} · {data.days} {data.days === 1 ? 'day' : 'days'}
            {before ? ' · compared with the window before it' : ''}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile
              label="Views"
              value={num(totals.views)}
              hint={deltaHint(delta('views'))}
              icon={<Eye size={15} />}
              accent={accent}
            />
            <StatTile
              label="Reach"
              value={num(totals.uniqueViewers)}
              hint="People, not view counts"
              icon={<Users size={15} />}
              accent={accent}
            />
            <StatTile
              label="Engagements"
              value={num(totals.engagements)}
              hint={`${engagementRate({ engagements: totals.engagements, reach: totals.uniqueViewers })}% of reach`}
              icon={<Heart size={15} />}
              accent={accent}
            />
            <StatTile
              label="Net followers"
              value={`${Number(totals.netFollowers) > 0 ? '+' : ''}${num(totals.netFollowers)}`}
              hint={`${num(totals.newFollowers)} gained · ${num(totals.lostFollowers)} lost`}
              icon={<Users size={15} />}
              accent={accent}
            />
          </div>

          {!hasAnyData ? (
            <EmptyState
              icon={<BarChart3 size={18} />}
              title="Nothing recorded in this window"
              blurb="Insights start filling in once people visit the Space. Try a longer window, or post something and share it."
            />
          ) : (
            <>
              <Card>
                <CardTitle right={<Pill accent={accent}>{data.days}d</Pill>}>Reach over time</CardTitle>
                <ChartFrame label={`Views, unique viewers and profile visits over ${data.days} days`}>
                  <AreaChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wsViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={axisDay} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis {...AXIS} width={44} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={axisDay} />
                    <Legend {...LEGEND} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke={accent}
                      strokeWidth={2}
                      fill="url(#wsViews)"
                    />
                    <Area
                      type="monotone"
                      dataKey="uniqueViewers"
                      name="Unique viewers"
                      stroke={C_SECOND}
                      strokeWidth={2}
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="profileVisits"
                      name="Profile visits"
                      stroke={C_THIRD}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      fill="none"
                    />
                  </AreaChart>
                </ChartFrame>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card>
                  <CardTitle>Followers gained and lost</CardTitle>
                  <ChartFrame label={`Followers gained and lost each day over ${data.days} days`} height="h-56">
                    <BarChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={axisDay} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis {...AXIS} width={40} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={axisDay} />
                      <Legend {...LEGEND} />
                      <Bar dataKey="newFollowers" name="Gained" fill={C_GAIN} radius={[3, 3, 0, 0]} stackId="f" />
                      <Bar dataKey="lostFollowers" name="Lost" fill={C_LOSS} radius={[3, 3, 0, 0]} stackId="f" />
                    </BarChart>
                  </ChartFrame>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    {num(totals.followersNow)} following right now.
                  </p>
                </Card>

                <Card>
                  <CardTitle>Actions people took</CardTitle>
                  <ChartFrame label={`Engagements, CTA clicks and link clicks over ${data.days} days`} height="h-56">
                    <AreaChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={axisDay} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis {...AXIS} width={40} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={axisDay} />
                      <Legend {...LEGEND} />
                      <Area type="monotone" dataKey="engagements" name="Engagements" stroke={accent} strokeWidth={2} fill="none" />
                      <Area type="monotone" dataKey="ctaClicks" name="CTA clicks" stroke={C_CTA} strokeWidth={2} fill="none" />
                      <Area type="monotone" dataKey="linkClicks" name="Link clicks" stroke={C_THIRD} strokeWidth={2} fill="none" />
                    </AreaChart>
                  </ChartFrame>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                    <span>{num(totals.ctaClicks)} CTA clicks</span>
                    <span>{num(totals.linkClicks)} link clicks</span>
                    <span>{num(totals.conversations)} conversations started</span>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <FollowerSources rows={data.followerSources} accent={accent} />
                <TopPosts rows={data.topPosts} accent={accent} />
              </div>
            </>
          )}

          <Card>
            <CardTitle>Numbers that live elsewhere</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Campaign spend and results are recorded per campaign, and earnings per transaction, so they are reported where
              they happen rather than copied here.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ElsewhereLink to="promotion" icon={<Megaphone size={13} />} label="Ads results" />
              <ElsewhereLink to="monetization" icon={<Wallet size={13} />} label="Earnings" />
              <ElsewhereLink to="content" icon={<FileText size={13} />} label="Per-post numbers" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────

const AXIS = {
  tick: { fontSize: 10, fill: 'var(--muted-foreground)' },
  stroke: 'var(--border)',
  tickLine: false,
} as const;

const LEGEND = {
  iconType: 'plainline' as const,
  iconSize: 10,
  wrapperStyle: { fontSize: '11px', fontWeight: 700, paddingTop: '4px' },
};

/** `role="img"` + a summary, because a chart with no text alternative is unusable
 *  with a screen reader (§27). */
function ChartFrame({
  label,
  height = 'h-64',
  children,
}: {
  label: string;
  height?: string;
  children: React.ReactElement;
}) {
  return (
    <div className={`${height} w-full`} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function FollowerSources({ rows, accent }: { rows: Array<{ source: string; count: number }>; accent: string }) {
  const sorted = useMemo(
    () => [...(rows || [])].filter((row) => row.count > 0).sort((a, b) => b.count - a.count),
    [rows],
  );
  const total = sorted.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardTitle>Where new followers came from</CardTitle>
      {sorted.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No new followers in this window.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((row) => {
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={row.source}>
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="truncate">{SOURCE_LABELS[row.source] || String(row.source).replace(/_/g, ' ')}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {num(row.count)} · {share}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${share}%`, background: accent }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TopPosts({ rows, accent }: { rows: any[]; accent: string }) {
  return (
    <Card>
      <CardTitle>Best posts in this window</CardTitle>
      {!rows || rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Nothing published in this window.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((post) => (
            <li key={post.id} className="flex items-start gap-2">
              <span
                className="mt-0.5 grid place-items-center w-7 h-7 rounded-xl shrink-0"
                style={{ background: `${accent}14`, color: accent }}
              >
                <FileText size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold break-words line-clamp-2">
                  {post.excerpt || <span className="text-muted-foreground">No caption</span>}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {dateOnly(post.createdAt)} · {num(post.likes)} likes · {num(post.comments)} comments
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ElsewhereLink({
  to,
  icon,
  label,
}: {
  to: SpaceDashboardSection;
  icon: React.ReactNode;
  label: string;
}) {
  const { handle } = useManage();
  return (
    <Link
      to={spaceDashboardPath(handle, to)}
      replace
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

// ── helpers ──────────────────────────────────────────────

function axisDay(day: string): string {
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(day);
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function deltaHint(change: number | null): string | undefined {
  if (change === null) return undefined;
  if (change === 0) return 'Flat on the previous window';
  return `${change > 0 ? '+' : ''}${change}% vs previous window`;
}
