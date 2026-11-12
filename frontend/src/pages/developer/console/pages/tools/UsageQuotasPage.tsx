/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import { Link } from 'react-router-dom';
import { Gauge, Link2, Webhook } from 'lucide-react';
import { parseRedirectUris, type DeveloperApp } from '../../../devApi';
import { cx } from '../../../devUi';
import { useDevAccount } from '../../accountContext';
import { PLATFORM_LIMITS, compactNumber, useAppUsage, useConsoleWebhooks } from '../../consoleData';
import { AppSelect, Card, ConsolePage, LoadingRows, NoAppsState, StatTile, tdCls, thCls } from '../../ui';
import { useAppPicker } from './shared';

/* ------------------------------------------------------------------ */
/* Usage & Quotas (/developer/usage)                                   */
/* ------------------------------------------------------------------ */

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <span className="flex-1 h-[6px] rounded-full bg-[var(--dc-track)] overflow-hidden">
        <span className={cx('block h-full rounded-full', pct >= 100 ? 'bg-[var(--dc-red)]' : pct >= 80 ? 'bg-[var(--dc-amber)]' : 'bg-[var(--dc-blue)]')} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] text-[var(--dc-text-2)] min-w-[52px] text-right whitespace-nowrap">{compactNumber(used)} / {compactNumber(limit)}</span>
    </div>
  );
}
export function UsageQuotasPage() {
  const { apps, appsQuery } = useDevAccount();
  const hooks = useConsoleWebhooks(apps);
  return (
    <ConsolePage group="Developer Tools" title="Usage & Quotas" description="Platform limits that apply to your applications and how much of each you use.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : apps.length === 0 ? (
        <NoAppsState what="quotas" />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={Webhook} label="Webhook endpoints" value={hooks.webhooks.length} hint={`Limit ${PLATFORM_LIMITS.webhooksPerApp} per app`} />
            <StatTile icon={Link2} label="Redirect URIs" value={apps.reduce((n, a) => n + parseRedirectUris(a).length, 0)} hint={`Limit ${PLATFORM_LIMITS.redirectUrisPerApp} per app`} tone="green" />
            <StatTile icon={Gauge} label="Media upload size" value={`${PLATFORM_LIMITS.mediaUploadMb} MB`} hint="Per file" tone="gray" />
          </div>
          <Card title="Per-application limits" className="mt-4" bodyClassName="!px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className={thCls}>Application</th>
                    <th className={thCls}>Webhook endpoints</th>
                    <th className={thCls}>Redirect URIs</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a: DeveloperApp) => (
                    <tr key={a.id}>
                      <td className={tdCls}><Link to={`/developer/apps/${a.id}`} className="font-semibold text-[var(--dc-text)] hover:text-[var(--dc-blue)]">{a.name}</Link></td>
                      <td className={tdCls}><Meter used={hooks.webhooks.filter((w) => w.appId === a.id).length} limit={PLATFORM_LIMITS.webhooksPerApp} /></td>
                      <td className={tdCls}><Meter used={parseRedirectUris(a).length} limit={PLATFORM_LIMITS.redirectUrisPerApp} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <ApiQuotaCard apps={apps} />
        </>
      )}
    </ConsolePage>
  );
}
/** Monthly request quota + rate limit for one app (GET /usage). */
function ApiQuotaCard({ apps }: { apps: DeveloperApp[] }) {
  const picked = useAppPicker(apps);
  const usage = useAppUsage(picked.id);
  const u = usage.data;
  return (
    <Card title="API request quota" className="mt-4" action={<AppSelect apps={apps} value={picked.id} onChange={picked.setId} />}>
      {usage.isLoading ? (
        <LoadingRows rows={2} />
      ) : usage.isError || !u ? (
        <p className="text-[12px] text-[var(--dc-red)]">Could not load usage.</p>
      ) : (
        <div className="grid gap-4 min-[720px]:grid-cols-3">
          <div className="min-[720px]:col-span-2">
            <p className="text-[12px] mb-2">
              <span className="font-semibold">{u.totalRequests.toLocaleString('en-US')}</span> of {compactNumber(u.quotaLimit)} requests this month ({u.quotaPercent}%)
            </p>
            <Meter used={u.totalRequests} limit={u.quotaLimit} />
            <p className="mt-2 text-[11px] text-[var(--dc-muted)]">
              Requests over the quota or above {u.rateLimitPerMinute}/minute get HTTP 429. {picked.app?.mode === 'production' ? 'Production' : 'Development'} mode limits apply.
            </p>
          </div>
          <div className="text-[12px] space-y-1">
            <p>Last 7 days: <span className="font-semibold">{u.last7Days.requests.toLocaleString('en-US')}</span> requests</p>
            <p>Failed (4xx/5xx): <span className="font-semibold">{u.last7Days.failed.toLocaleString('en-US')}</span></p>
            <p>Avg. latency: <span className="font-semibold">{u.avgLatencyMs === null ? '—' : `${u.avgLatencyMs} ms`}</span></p>
          </div>
        </div>
      )}
    </Card>
  );
}
