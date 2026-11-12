import ApiAnalyticsDashboard from './ApiAnalyticsDashboard';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AppWindow, CheckCircle2, Clock, Link2, LayoutGrid, Pencil, PackagePlus, Rocket, Webhook, XCircle, Download, FileCode, Gauge, Zap } from 'lucide-react';
import { useDevAccount } from '../accountContext';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { useConnectedPlatforms, useConsoleWebhooks, appStatusMeta, envLabel, lastUsedLabel, useDeveloperMeteringSummary } from '../consoleData';
import { cx } from '../../devUi';
import { AppSelect, Card, ConsolePage, EmptyState, LoadingRows, NoAppsState, NotConfigured, Pill, StatTile, fmtDate, tdCls, thCls } from '../ui';
import type { DeveloperApp } from '../../devApi';

/** Detailed request analytics for the app picked here (not just the first app). */
function AnalyticsForApp({ apps }: { apps: DeveloperApp[] }) {
  // Follows the top-bar app switcher.
  const c = useConsoleApp();
  const app = (c.app && apps.find((a) => a.id === c.app!.id)) || apps[0];
  return (
    <>
      <div className="mb-3 flex items-center justify-end"><AppSelect apps={apps} value={app.id} onChange={c.setAppId} /></div>
      <ApiAnalyticsDashboard key={app.id} appId={app.id} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics (/developer/analytics)                                    */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

export function AnalyticsPage() {
  const { apps, appsQuery } = useDevAccount();
  const hooks = useConsoleWebhooks(apps);
  const { data: metering, isLoading: isMeteringLoading } = useDeveloperMeteringSummary(true);
  const [activeTab, setActiveTab] = useState<'metering' | 'webhooks'>('metering');
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const live = apps.filter((a) => a.status === 'live').length;
  const settled = hooks.deliveries.filter((d) => d.status === 'success' || d.status === 'failed');
  const failed = settled.filter((d) => d.status === 'failed').length;

  const webhookSeries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: range }, (_, i) => {
      const d = new Date(today.getTime() - (range - 1 - i) * DAY);
      return { key: d.getTime(), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), successful: 0, failed: 0, pending: 0 };
    });
    for (const d of hooks.deliveries) {
      const t = new Date(d.createdAt);
      t.setHours(0, 0, 0, 0);
      const row = days.find((x) => x.key === t.getTime());
      if (!row) continue;
      if (d.status === 'success') row.successful++;
      else if (d.status === 'failed') row.failed++;
      else row.pending++;
    }
    return days;
  }, [hooks.deliveries, range]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- manual memoization kept as-is (existing behavior)
  const meteringDailySeries = useMemo(() => {
    if (!metering?.daily) return [];
    return metering.daily.slice(-range).map((d) => ({
      label: d.date.slice(5),
      requests: d.requests,
      successful: Math.max(0, d.requests - d.errors),
      errors: d.errors,
      avgLatencyMs: d.avgLatencyMs,
    }));
  }, [metering?.daily, range]);

  const totalSuccessRequests = metering ? (metering.statusClasses['2xx'] || 0) : 0;
  const totalErrorRequests = metering ? (metering.statusClasses['4xx'] || 0) + (metering.statusClasses['5xx'] || 0) : 0;
  const totalSettledRequests = totalSuccessRequests + totalErrorRequests;
  const successRate = totalSettledRequests > 0
    ? Math.round((totalSuccessRequests / totalSettledRequests) * 1000) / 10
    : 100;

  const perApp = apps.map((a) => {
    const appHooks = hooks.webhooks.filter((w) => w.appId === a.id);
    const ids = new Set(appHooks.map((w) => w.id));
    const ds = hooks.deliveries.filter((d) => ids.has(d.webhookId));
    const s = ds.filter((d) => d.status === 'success' || d.status === 'failed');
    const ok = s.filter((d) => d.status === 'success').length;
    return { app: a, webhooks: appHooks.length, deliveries: ds.length, rate: s.length ? Math.round((ok / s.length) * 1000) / 10 : null };
  });

  return (
    <ConsolePage
      group="Overview"
      title="Analytics & Quota Metering"
      description="Live metrics for API request traffic, monthly quota limits, and webhook health across your applications."
      actions={
        <div className="flex items-center gap-2">
          <a
            href="/api/developer/openapi.json"
            download="wevsoft-openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[var(--dc-border-2)] text-xs font-semibold text-[var(--dc-text)] hover:bg-[var(--dc-hover)] transition-colors"
          >
            <FileCode size={13} className="text-[var(--dc-blue)]" />
            <span>OpenAPI (JSON)</span>
          </a>
          <a
            href="/api/developer/openapi.yaml"
            download="wevsoft-openapi.yaml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--dc-blue)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Download size={13} />
            <span>OpenAPI (YAML)</span>
          </a>
        </div>
      }
    >
      {/* Dual Tab Mode Switcher */}
      <div className="flex border-b border-[var(--dc-border)] mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('metering')}
          className={cx(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
            activeTab === 'metering'
              ? 'border-[var(--dc-blue)] text-[var(--dc-blue)]'
              : 'border-transparent text-[var(--dc-muted)] hover:text-[var(--dc-text)]'
          )}
        >
          <Gauge size={14} />
          <span>API Traffic & Quotas</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={cx(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
            activeTab === 'webhooks'
              ? 'border-[var(--dc-blue)] text-[var(--dc-blue)]'
              : 'border-transparent text-[var(--dc-muted)] hover:text-[var(--dc-text)]'
          )}
        >
          <Webhook size={14} />
          <span>Webhook Deliveries</span>
        </button>
      </div>

      {activeTab === 'metering' ? (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
            <StatTile
              icon={Activity}
              label="Requests This Month"
              value={metering?.totalRequests != null ? metering.totalRequests.toLocaleString() : '—'}
              hint={`${metering?.month || 'Current'} • ${metering?.daysRemainingInMonth || 0} days until reset`}
              tone="blue"
            />
            <StatTile
              icon={Gauge}
              label="Monthly Quota Used"
              value={metering?.quotaUsedPercent != null ? `${metering.quotaUsedPercent}%` : '0%'}
              hint={`${metering?.remainingRequests?.toLocaleString() || '0'} requests remaining of ${metering?.quotaLimit?.toLocaleString() || '10,000'}`}
              tone={metering?.quotaUsedPercent && metering.quotaUsedPercent > 80 ? 'amber' : 'green'}
            />
            <StatTile
              icon={CheckCircle2}
              label="Success Rate (2xx)"
              value={`${successRate}%`}
              hint={`${metering?.statusClasses['4xx'] || 0} client errors • ${metering?.statusClasses['5xx'] || 0} server errors`}
              tone={successRate >= 95 ? 'green' : 'amber'}
            />
            <StatTile
              icon={Clock}
              label="Average API Latency"
              value={metering?.avgLatencyMs != null ? `${metering.avgLatencyMs}ms` : '—'}
              hint="30-day aggregate across all endpoints"
              tone="blue"
            />
          </div>

          <div className="mt-4 grid gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_340px]">
            <Card
              title="API Request Volume"
              description="Daily successful requests vs errors."
              action={
                <div className="flex rounded-[6px] border border-[var(--dc-border-2)] overflow-hidden" role="group" aria-label="Range">
                  {([7, 14, 30] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={cx(
                        'h-[26px] px-[10px] text-[11px] font-semibold',
                        range === r ? 'bg-[var(--dc-blue)] text-white' : 'text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]'
                      )}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
              }
            >
              {meteringDailySeries.length === 0 || metering?.totalRequests === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No API traffic recorded yet"
                  body="Make requests using your API Key or OAuth token to see real-time volume metrics and latency trends."
                />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={meteringDailySeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--dc-border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dc-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--dc-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--dc-border)' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="successful" name="Success (2xx)" stackId="a" fill="#2f6bf2" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="errors" name="Errors (4xx/5xx)" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Top API Endpoints" description="Most frequently called platform routes.">
              {metering?.topEndpoints && metering.topEndpoints.length > 0 ? (
                <div className="space-y-2.5">
                  {metering.topEndpoints.map((ep) => (
                    <div key={ep.endpoint} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--dc-text)] truncate max-w-[200px]" title={ep.endpoint}>
                        {ep.endpoint}
                      </span>
                      <span className="font-semibold text-[var(--dc-muted)] bg-[var(--dc-hover)] px-2 py-0.5 rounded">
                        {ep.count.toLocaleString()} calls
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--dc-muted)] py-8 text-center">No endpoint traffic logged yet</p>
              )}
            </Card>
          </div>

          <Card title="Usage Breakdown by Application" className="mt-4 min-w-0" bodyClassName="!px-0 overflow-x-auto">
            {isMeteringLoading ? (
              <div className="px-4"><LoadingRows /></div>
            ) : apps.length === 0 ? (
              <div className="px-4"><NoAppsState what="metering" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <th className={thCls}>Application</th>
                      <th className={thCls}>Mode</th>
                      <th className={thCls}>Monthly Quota</th>
                      <th className={thCls}>Requests (Month)</th>
                      <th className={thCls}>Errors</th>
                      <th className={thCls}>Error Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metering?.appsBreakdown || []).map((appRow) => (
                      <tr key={appRow.appId} className="hover:bg-[var(--dc-hover)]">
                        <td className={tdCls}>
                          <Link to={`/developer/apps/${appRow.appId}`} className="font-semibold text-[var(--dc-text)] hover:text-[var(--dc-blue)]">
                            {appRow.appName}
                          </Link>
                        </td>
                        <td className={tdCls}>
                          <Pill tone={appRow.mode === 'production' ? 'green' : 'blue'}>
                            {appRow.mode}
                          </Pill>
                        </td>
                        <td className={tdCls}>{appRow.quotaLimit.toLocaleString()} / mo</td>
                        <td className={tdCls}>{appRow.requests.toLocaleString()}</td>
                        <td className={tdCls}>{appRow.errors.toLocaleString()}</td>
                        <td className={tdCls}>{appRow.errorRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
            <StatTile icon={LayoutGrid} label="Applications" value={apps.length} hint={`${live} published • ${apps.length - live} in development`} />
            <StatTile icon={Webhook} label="Webhook endpoints" value={hooks.webhooks.length} hint="Across all applications" tone="green" />
            <StatTile icon={Activity} label="Webhook deliveries" value={hooks.deliveries.length} hint={`Latest ${50} per endpoint`} tone="blue" />
            <StatTile
              icon={hooks.health == null || hooks.health >= 95 ? CheckCircle2 : XCircle}
              label="Delivery success rate"
              value={hooks.health == null ? '—' : `${hooks.health}%`}
              hint={settled.length ? `${failed} failed of ${settled.length} completed` : 'No completed deliveries yet'}
              tone={hooks.health == null ? 'gray' : hooks.health >= 95 ? 'green' : 'red'}
            />
          </div>

          <div className="mt-4 grid gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_340px]">
            <Card
              title="Webhook deliveries"
              description="Per day, by result."
              action={
                <div className="flex rounded-[6px] border border-[var(--dc-border-2)] overflow-hidden" role="group" aria-label="Range">
                  {([7, 14, 30] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRange(r)} className={cx('h-[26px] px-[10px] text-[11px] font-semibold', range === r ? 'bg-[var(--dc-blue)] text-white' : 'text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]')}>
                      {r}d
                    </button>
                  ))}
                </div>
              }
            >
              {hooks.deliveries.length === 0 ? (
                <EmptyState icon={Webhook} title="No deliveries yet" body="Deliveries appear here once one of your webhook endpoints receives an event." action={<Link to="/developer/webhooks" className="text-[12px] font-semibold text-[var(--dc-blue)] hover:underline">Configure webhooks</Link>} />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={webhookSeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--dc-border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dc-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--dc-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--dc-border)' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="successful" name="Successful" stackId="a" fill="#2f6bf2" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card title="By application" className="mt-4 min-w-0" bodyClassName="!px-0 overflow-x-auto">
            {appsQuery.isLoading ? (
              <div className="px-4"><LoadingRows /></div>
            ) : apps.length === 0 ? (
              <div className="px-4"><NoAppsState what="analytics" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <th className={thCls}>Application</th>
                      <th className={thCls}>Environment</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Webhooks</th>
                      <th className={thCls}>Deliveries</th>
                      <th className={thCls}>Success rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perApp.map(({ app, webhooks, deliveries, rate }) => {
                      const st = appStatusMeta(app);
                      return (
                        <tr key={app.id} className="hover:bg-[var(--dc-hover)]">
                          <td className={tdCls}>
                            <Link to={`/developer/apps/${app.id}`} className="font-semibold text-[var(--dc-text)] hover:text-[var(--dc-blue)]">{app.name}</Link>
                          </td>
                          <td className={tdCls}>{envLabel(app)}</td>
                          <td className={tdCls}><Pill tone={st.tone}>{st.label}</Pill></td>
                          <td className={tdCls}>{webhooks}</td>
                          <td className={tdCls}>{deliveries}</td>
                          <td className={tdCls}>{rate == null ? '—' : `${rate}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {apps.length > 0 && <div className="mt-6 min-w-0"><AnalyticsForApp apps={apps} /></div>}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity (/developer/activity)                               */
/* ------------------------------------------------------------------ */

type ActivityKind = 'apps' | 'webhooks' | 'integrations';

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  title: string;
  detail: string;
  at: string;
  to?: string;
}

const FILTERS: { id: 'all' | ActivityKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'apps', label: 'Applications' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'integrations', label: 'Integrations' },
];

export function RecentActivityPage() {
  const { apps, appsQuery } = useDevAccount();
  const hooks = useConsoleWebhooks(apps);
  const platforms = useConnectedPlatforms();
  const [filter, setFilter] = useState<'all' | ActivityKind>('all');

  const items = useMemo(() => {
    const out: ActivityItem[] = [];
    const appName = (id: string) => apps.find((a) => a.id === id)?.name || 'App';
    for (const a of apps) {
      out.push({ id: `c-${a.id}`, kind: 'apps', icon: PackagePlus, tone: 'text-[var(--dc-blue)] bg-[var(--dc-blue-soft)]', title: 'Created application', detail: a.name, at: a.createdAt, to: `/developer/apps/${a.id}` });
      if (a.updatedAt && Math.abs(new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) > 60_000) {
        out.push({ id: `u-${a.id}`, kind: 'apps', icon: Pencil, tone: 'text-[var(--dc-muted)] bg-[var(--dc-hover)]', title: 'Updated application settings', detail: a.name, at: a.updatedAt, to: `/developer/apps/${a.id}/settings` });
      }
      if (a.status === 'live') {
        out.push({ id: `l-${a.id}`, kind: 'apps', icon: Rocket, tone: 'text-[var(--dc-green)] bg-[var(--dc-green-soft)]', title: 'Application is published', detail: a.name, at: a.updatedAt, to: `/developer/apps/${a.id}` });
      }
    }
    for (const w of hooks.webhooks) {
      out.push({ id: `w-${w.id}`, kind: 'webhooks', icon: Webhook, tone: 'text-[var(--dc-blue)] bg-[var(--dc-blue-soft)]', title: 'Added webhook endpoint', detail: `${appName(w.appId)} • ${w.endpointUrl}`, at: w.createdAt, to: '/developer/webhooks' });
    }
    for (const d of hooks.deliveries.slice(0, 200)) {
      const ok = d.status === 'success';
      const hook = hooks.webhooks.find((w) => w.id === d.webhookId);
      out.push({
        id: `d-${d.id}`,
        kind: 'webhooks',
        icon: ok ? CheckCircle2 : d.status === 'failed' ? XCircle : Clock,
        tone: ok ? 'text-[var(--dc-green)] bg-[var(--dc-green-soft)]' : d.status === 'failed' ? 'text-[var(--dc-red)] bg-[var(--dc-red-soft)]' : 'text-[#d97706] bg-[var(--dc-amber-soft)]',
        title: `Webhook ${d.eventType} ${ok ? 'delivered' : d.status === 'failed' ? 'failed' : 'pending'}${d.httpStatus ? ` (HTTP ${d.httpStatus})` : ''}`,
        detail: hook ? `${appName(hook.appId)} • ${hook.endpointUrl}` : 'Webhook endpoint',
        at: d.createdAt,
        to: '/developer/logs',
      });
    }
    for (const p of platforms.data || []) {
      if (p.isConnected && p.connection?.connectedAt) {
        out.push({ id: `p-${p.platform}`, kind: 'integrations', icon: Link2, tone: 'text-[var(--dc-green)] bg-[var(--dc-green-soft)]', title: `Connected ${p.platform}`, detail: p.connection.needsReconnect ? 'Needs reconnect' : 'Connected account', at: p.connection.connectedAt, to: '/developer/integrations/connected' });
      }
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [apps, hooks.webhooks, hooks.deliveries, platforms.data]);

  const shown = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  return (
    <ConsolePage group="Overview" title="Recent Activity" description="A timeline of what happened across your applications, webhooks and connected integrations.">
      <Card
        title={<><AppWindow size={15} className="text-[var(--dc-blue)]" /> Activity</>}
        action={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={cx('h-[26px] px-[10px] rounded-full text-[11px] font-semibold border', filter === f.id ? 'bg-[var(--dc-blue)] border-[var(--dc-blue)] text-white' : 'border-[var(--dc-border-2)] text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]')}>
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {appsQuery.isLoading ? (
          <LoadingRows rows={5} />
        ) : shown.length === 0 ? (
          <EmptyState icon={Clock} title="No activity yet" body="Create an application, add a webhook or connect an integration and it will show up here." />
        ) : (
          <ol className="relative">
            {shown.slice(0, 150).map((it) => (
              <li key={it.id} className="flex items-start gap-3 py-[10px] border-b border-[var(--dc-border)] last:border-b-0">
                <span className={cx('w-[28px] h-[28px] rounded-full grid place-items-center shrink-0', it.tone)}>
                  <it.icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[var(--dc-text)]">{it.title}</p>
                  <p className="text-[11.5px] text-[var(--dc-muted)] truncate">{it.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-[var(--dc-text-2)]">{lastUsedLabel(it.at)}</p>
                  <p className="text-[10px] text-[var(--dc-faint)]">{fmtDate(it.at, true)}</p>
                </div>
                {it.to && (
                  <Link to={it.to} className="shrink-0 self-center text-[11px] font-semibold text-[var(--dc-blue)] hover:underline">
                    View
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </ConsolePage>
  );
}
