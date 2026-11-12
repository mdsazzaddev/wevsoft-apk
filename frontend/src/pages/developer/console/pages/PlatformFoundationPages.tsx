import { useMemo, useState } from 'react';
import { Activity, BellRing, ExternalLink, Gauge, GitBranch, Layers, Rss, ScrollText, ShieldAlert, Trash2 } from 'lucide-react';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { cx } from '../../devUi';
import { usePfMutation, usePfQuery } from '../platformApi';
import { ChangelogFollowPanel } from './Phase5Pages';

/* ------------------------------------------------------------------ */
/* API Versions & Changelog (/developer/changelog)                      */
/* ------------------------------------------------------------------ */

const CATEGORY_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'gray'> = {
  added: 'green',
  changed: 'blue',
  deprecated: 'amber',
  removed: 'red',
  fixed: 'gray',
  security: 'red',
};

export function VersionsChangelogPage() {
  const { apps, app, appId, setAppId } = useConsoleApp();
  const [category, setCategory] = useState('');
  const versions = usePfQuery<any>(['versions'], '/api/developer/versions');
  const changelog = usePfQuery<any>(['changelog', category], `/api/developer/changelog${category ? `?category=${category}` : ''}`);
  const discovery = usePfQuery<any>(['discovery'], '/api/developer/discovery');
  const pinned = usePfQuery<any>(['version', appId], appId ? `/api/developer/platform/apps/${appId}/version` : null);
  const [choice, setChoice] = useState<string | null>(null);
  const pin = usePfMutation<string | null>('PUT', () => `/api/developer/platform/apps/${appId}/version`, {
    bodyFor: (v) => ({ version: v }),
    invalidate: [['version', appId]],
    success: 'API version updated',
    onDone: () => setChoice(null),
  });
  const selected = choice ?? (pinned.data?.pinned || '');

  return (
    <ConsolePage group="Developer Tools" title="API Versions & Changelog" description="Dated API versions, the deprecation policy, the public changelog and the service discovery index.">
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={GitBranch} label="Latest version" value={versions.data?.latest || '-'} hint="Send Wevsoft-Version to opt in" />
        <StatTile icon={Layers} label="Baseline version" value={versions.data?.baseline || '-'} hint="Used when nothing is pinned" tone="gray" />
        <StatTile icon={ShieldAlert} label="Active deprecations" value={versions.data?.deprecations?.length ?? '-'} hint={`${versions.data?.policy?.minimumNoticeDays ?? 90} days minimum notice`} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
        <Card title="Versions" description="Pick a version per request with the Wevsoft-Version header, or pin one on an app.">
          {versions.isLoading ? (
            <LoadingRows rows={3} />
          ) : versions.isError ? (
            <ErrorCard message={(versions.error as Error)?.message} onRetry={() => versions.refetch()} />
          ) : (
            <ul className="space-y-3">
              {versions.data.versions.map((v: any) => (
                <li key={v.id} className="rounded-[8px] border border-[var(--dc-border)] p-3">
                  <div className="flex items-center gap-2">
                    <code className="dc-code">{v.id}</code>
                    <Pill tone={v.status === 'current' ? 'green' : 'gray'}>{v.status === 'current' ? 'Current' : 'Supported'}</Pill>
                    <span className="text-[11px] text-[var(--dc-muted)]">{v.label}</span>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-[12px] text-[var(--dc-text-2)] space-y-1">
                    {v.changes.map((c: string) => <li key={c}>{c}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {versions.data?.policy && (
            <InfoNote className="mt-3">
              {versions.data.policy.breakingChanges} {versions.data.policy.deprecation}
            </InfoNote>
          )}
        </Card>

        <Card title="Pin a version to an app" description="Requests from this app use the pinned version unless they send Wevsoft-Version.">
          {apps.length === 0 ? (
            <NoAppsState what="versions" />
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Application</label>
                <AppSelect apps={apps} value={appId} onChange={(id) => { setChoice(null); setAppId(id); }} className="w-full !h-[34px]" />
              </div>
              <div>
                <label className={labelCls} htmlFor="pin-version">Pinned version</label>
                <select id="pin-version" className={selectCls} value={selected} onChange={(e) => setChoice(e.target.value)}>
                  <option value="">Not pinned (baseline {versions.data?.baseline})</option>
                  {(versions.data?.versions || []).map((v: any) => <option key={v.id} value={v.id}>{v.id}{v.status === 'current' ? ' (current)' : ''}</option>)}
                </select>
              </div>
              <p className="text-[11.5px] text-[var(--dc-muted)]">
                Effective version for {app?.name}: <code className="dc-code">{pinned.data?.effective || '...'}</code>
              </p>
              <button type="button" className={btn.primary} disabled={pin.isPending || choice === null || selected === (pinned.data?.pinned || '')} onClick={() => pin.mutate(selected || null)}>
                {pin.isPending ? 'Saving...' : 'Save version'}
              </button>
            </div>
          )}
        </Card>
      </div>

      <ChangelogFollowPanel />

      <Card
        className="mt-4"
        title="Changelog"
        description="Every change to the public developer platform."
        action={
          <div className="flex items-center gap-2">
            <select aria-label="Filter category" className={cx(selectCls, '!h-[30px] !w-auto !text-[12px]')} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <a className={cx(btn.secondary, btn.sm)} href="/api/developer/changelog?format=rss" target="_blank" rel="noreferrer"><Rss size={13} /> RSS</a>
          </div>
        }
      >
        {changelog.isLoading ? (
          <LoadingRows rows={4} />
        ) : changelog.isError ? (
          <ErrorCard message={(changelog.error as Error)?.message} onRetry={() => changelog.refetch()} />
        ) : changelog.data.entries.length === 0 ? (
          <EmptyState icon={ScrollText} title="No changelog entries" body="Nothing has been published for this filter yet." />
        ) : (
          <ul className="divide-y divide-[var(--dc-border)]">
            {changelog.data.entries.map((e: any) => (
              <li key={e.id} id={e.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={CATEGORY_TONE[e.category] || 'gray'}>{e.category}</Pill>
                  {e.breaking && <Pill tone="red">Breaking</Pill>}
                  {e.version && <code className="dc-code">{e.version}</code>}
                  <span className="text-[11px] text-[var(--dc-muted)]">{fmtDate(e.publishedAt)}</span>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-[var(--dc-text)]">{e.title}</p>
                <p className="mt-0.5 text-[12px] text-[var(--dc-text-2)]">{e.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4" title="Deprecations" description="Deprecated endpoints answer with Deprecation, Sunset and Link headers.">
        {(versions.data?.deprecations || []).length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Nothing is deprecated" body="No endpoint has a scheduled removal." className="!py-7" />
        ) : (
          <table className="w-full">
            <thead><tr><th className={thCls}>Endpoint</th><th className={thCls}>Method</th><th className={thCls}>Sunset</th><th className={thCls}>Use instead</th></tr></thead>
            <tbody>
              {versions.data.deprecations.map((d: any) => (
                <tr key={d.id}>
                  <td className={tdCls}><code className="dc-code">{d.pathPrefix}</code><div className="text-[11px] text-[var(--dc-muted)]">{d.message}</div></td>
                  <td className={tdCls}>{d.method || 'any'}</td>
                  <td className={tdCls}>{d.sunsetAt ? fmtDate(d.sunsetAt) : 'Not scheduled'}</td>
                  <td className={tdCls}>{d.replacement ? <code className="dc-code">{d.replacement}</code> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        className="mt-4"
        title="Service discovery"
        description="Machine-readable index of every API service, its scopes and its OpenAPI document."
        action={<a className={cx(btn.secondary, btn.sm)} href="/api/developer/discovery" target="_blank" rel="noreferrer"><ExternalLink size={13} /> discovery.json</a>}
        bodyClassName="!px-0"
      >
        {discovery.isLoading ? (
          <div className="px-4"><LoadingRows rows={4} /></div>
        ) : discovery.isError ? (
          <div className="px-4"><ErrorCard message={(discovery.error as Error)?.message} onRetry={() => discovery.refetch()} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr><th className={thCls}>Service</th><th className={thCls}>Base URL</th><th className={thCls}>Scopes</th><th className={thCls}>Spec</th></tr></thead>
              <tbody>
                {discovery.data.services.map((s: any) => (
                  <tr key={s.id}>
                    <td className={tdCls}><span className="font-semibold text-[var(--dc-text)]">{s.name}</span><div className="text-[11px] text-[var(--dc-muted)]">{s.description}</div></td>
                    <td className={tdCls}><code className="dc-code">{s.baseUrl.replace(/^https?:\/\/[^/]+/, '')}</code></td>
                    <td className={tdCls}>{s.scopes.length ? s.scopes.map((x: string) => <Pill key={x} tone="gray" className="mr-1 mb-1">{x}</Pill>) : '-'}</td>
                    <td className={tdCls}><a className="text-[var(--dc-blue)] hover:underline" href={s.openapi.replace(/^https?:\/\/[^/]+/, '')} target="_blank" rel="noreferrer">OpenAPI</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Limits & Alerts (/developer/limits)                                   */
/* ------------------------------------------------------------------ */

function Meter({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const tone = p >= 90 ? 'bg-[var(--dc-red)]' : p >= 70 ? 'bg-[#d97706]' : 'bg-[var(--dc-blue)]';
  return (
    <div className="h-[8px] w-full rounded-full bg-[var(--dc-hover)] overflow-hidden" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', tone)} style={{ width: `${p}%` }} />
    </div>
  );
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red'> = { approved: 'green', pending: 'amber', rejected: 'red' };

export function LimitsAlertsPage() {
  const { apps, app, appId, setAppId } = useConsoleApp();
  const limits = usePfQuery<any>(['limits', appId], appId ? `/api/developer/platform/apps/${appId}/limits` : null);
  const [plan, setPlan] = useState('standard');
  const [useCase, setUseCase] = useState('');
  const [expected, setExpected] = useState('');
  const [metric, setMetric] = useState('month_quota_percent');
  const [threshold, setThreshold] = useState('80');
  const [windowMinutes, setWindowMinutes] = useState('15');
  const [cooldown, setCooldown] = useState('60');
  const inv = [['limits', appId]];

  const requestQuota = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/quota-requests`, {
    invalidate: inv,
    success: 'Request sent for review',
    onDone: () => { setUseCase(''); setExpected(''); },
  });
  const addRule = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/alerts`, { invalidate: inv, success: 'Alert rule created' });
  const toggleRule = usePfMutation<{ id: string; enabled: boolean }>('PATCH', (v) => `/api/developer/platform/apps/${appId}/alerts/${v.id}`, { invalidate: inv, bodyFor: (v) => ({ enabled: v.enabled }) });
  const delRule = usePfMutation<string>('DELETE', (id) => `/api/developer/platform/apps/${appId}/alerts/${id}`, { invalidate: inv, success: 'Rule deleted' });
  const evaluate = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/alerts/evaluate`, {
    invalidate: inv,
    success: (o) => `Evaluated ${o.evaluated} rule(s); ${o.results.filter((r: any) => r.fired).length} fired`,
  });

  const d = limits.data;
  const pending = (d?.quotaRequests || []).some((r: any) => r.status === 'pending');
  const metrics = d?.alertMetrics || {};
  const higherTiers = useMemo(() => (d?.tiers || []).filter((t: any) => t.id !== 'free' && t.id !== d?.tier), [d]);

  return (
    <ConsolePage
      group="Developer Tools"
      title="Limits & Alerts"
      description="Your app's tier, rate limits and monthly quota, requests for more capacity, and alerts before you hit a limit."
      actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}
    >
      {apps.length === 0 ? (
        <NoAppsState what="limits" />
      ) : limits.isLoading ? (
        <LoadingRows rows={5} />
      ) : limits.isError ? (
        <ErrorCard message={(limits.error as Error)?.message} onRetry={() => limits.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={Layers} label="Tier" value={<span className="capitalize">{d.tier}</span>} hint={d.plan ? `Plan: ${d.plan}` : `Default for ${app?.mode} mode`} />
            <StatTile icon={Gauge} label="Rate limit" value={`${d.limits.perMinute}/min`} hint="Per app, rolling minute" tone="green" />
            <StatTile icon={Activity} label="Monthly quota used" value={`${d.usage.monthlyPercent}%`} hint={`${d.usage.monthlyUsed.toLocaleString()} of ${d.limits.monthly.toLocaleString()}`} tone={d.usage.monthlyPercent >= 80 ? 'red' : 'amber'} />
          </div>
          <Card className="mt-4" title="Monthly quota" description="Authenticated responses also carry an X-App-Usage header with these percentages.">
            <Meter percent={d.usage.monthlyPercent} />
            <p className="mt-2 text-[11.5px] text-[var(--dc-muted)]">{d.usage.monthlyPercent}% of {d.limits.monthly.toLocaleString()} requests used this month.</p>
          </Card>

          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
            <Card title="Request more capacity" description="Reviewed by the Wevsoft team. Approval raises your app's tier immediately.">
              <table className="w-full mb-3">
                <thead><tr><th className={thCls}>Tier</th><th className={thCls}>Per minute</th><th className={thCls}>Per month</th></tr></thead>
                <tbody>
                  {d.tiers.map((t: any) => (
                    <tr key={t.id}>
                      <td className={tdCls}><span className="font-semibold capitalize">{t.label}</span>{t.id === d.tier && <Pill tone="blue" className="ml-2">Current</Pill>}</td>
                      <td className={tdCls}>{t.perMinute.toLocaleString()}</td>
                      <td className={tdCls}>{t.monthly.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {higherTiers.length === 0 ? (
                <InfoNote>This app is already on the highest tier.</InfoNote>
              ) : pending ? (
                <InfoNote>A request for this app is waiting for review.</InfoNote>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    requestQuota.mutate({ requestedPlan: plan, useCase: useCase.trim(), expectedMonthlyRequests: Number(expected) } as any);
                  }}
                >
                  <div className="grid gap-3 min-[600px]:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor="q-plan">Tier</label>
                      <select id="q-plan" className={selectCls} value={plan} onChange={(e) => setPlan(e.target.value)}>
                        {higherTiers.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="q-exp">Expected requests per month</label>
                      <input id="q-exp" type="number" min={1} className={inputCls} value={expected} onChange={(e) => setExpected(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="q-use">What is the extra capacity for? (30+ characters)</label>
                    <textarea id="q-use" rows={4} className={cx(inputCls, '!h-auto py-2')} value={useCase} onChange={(e) => setUseCase(e.target.value)} minLength={30} maxLength={2000} required />
                  </div>
                  <button type="submit" className={btn.primary} disabled={requestQuota.isPending || useCase.trim().length < 30 || !expected}>
                    {requestQuota.isPending ? 'Sending...' : 'Submit request'}
                  </button>
                  <p className="text-[11px] text-[var(--dc-muted)]">Requires the admin role on the app.</p>
                </form>
              )}
              {d.quotaRequests.length > 0 && (
                <ul className="mt-4 divide-y divide-[var(--dc-border)]">
                  {d.quotaRequests.map((r: any) => (
                    <li key={r.id} className="py-2 text-[12px]">
                      <div className="flex items-center gap-2"><Pill tone={STATUS_TONE[r.status] || 'gray'}>{r.status}</Pill><span className="capitalize font-semibold">{r.requestedPlan}</span><span className="text-[var(--dc-muted)]">{fmtDate(r.createdAt)}</span></div>
                      {r.adminNote && <p className="mt-1 text-[var(--dc-text-2)]">Reviewer: {r.adminNote}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title={<><BellRing size={15} className="text-[var(--dc-blue)]" /> Alert thresholds</>}
              description="You are notified in the console once per cooldown when a rule is crossed."
              action={d.alertRules.length > 0 ? <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => evaluate.mutate(undefined as any)} disabled={evaluate.isPending}>Evaluate now</button> : undefined}
            >
              <form
                className="grid gap-3 min-[600px]:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addRule.mutate({ metric, threshold: Number(threshold), windowMinutes: Number(windowMinutes), cooldownMinutes: Number(cooldown) });
                }}
              >
                <div className="min-[600px]:col-span-2">
                  <label className={labelCls} htmlFor="a-metric">Metric</label>
                  <select id="a-metric" className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value)}>
                    {Object.entries(metrics).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-[var(--dc-muted)]">{metrics[metric]?.description}</p>
                </div>
                <div><label className={labelCls} htmlFor="a-th">Threshold (%)</label><input id="a-th" type="number" min={1} max={100} className={inputCls} value={threshold} onChange={(e) => setThreshold(e.target.value)} required /></div>
                <div><label className={labelCls} htmlFor="a-win">Window (minutes)</label><input id="a-win" type="number" min={5} max={1440} className={inputCls} value={windowMinutes} onChange={(e) => setWindowMinutes(e.target.value)} /></div>
                <div><label className={labelCls} htmlFor="a-cd">Cooldown (minutes)</label><input id="a-cd" type="number" min={5} max={10080} className={inputCls} value={cooldown} onChange={(e) => setCooldown(e.target.value)} /></div>
                <div className="flex items-end"><button type="submit" className={btn.primary} disabled={addRule.isPending}>Add rule</button></div>
              </form>
              {d.alertRules.length === 0 ? (
                <EmptyState icon={BellRing} title="No alert rules yet" body="Add a rule to be told before you run out of quota." className="mt-4 !py-6" />
              ) : (
                <ul className="mt-4 divide-y divide-[var(--dc-border)]">
                  {d.alertRules.map((r: any) => (
                    <li key={r.id} className="py-2 flex items-center gap-3 text-[12px]">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--dc-text)]">{metrics[r.metric]?.label || r.metric} &ge; {r.threshold}%</p>
                        <p className="text-[11px] text-[var(--dc-muted)]">Window {r.windowMinutes}m, cooldown {r.cooldownMinutes}m{r.lastTriggeredAt ? `, last fired ${fmtDate(r.lastTriggeredAt, true)}` : ''}</p>
                      </div>
                      <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => toggleRule.mutate({ id: r.id, enabled: !r.enabled })}>{r.enabled ? 'Pause' : 'Resume'}</button>
                      <button type="button" aria-label="Delete rule" className={cx(btn.danger, btn.sm)} onClick={() => delRule.mutate(r.id)}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {d.alertEvents.length > 0 && (
                <div className="mt-4">
                  <p className={labelCls}>Recent alerts</p>
                  <ul className="space-y-1">
                    {d.alertEvents.map((ev: any) => (
                      <li key={ev.id} className="text-[11.5px] text-[var(--dc-text-2)]"><span className="text-[var(--dc-muted)]">{fmtDate(ev.createdAt, true)}</span> {ev.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </ConsolePage>
  );
}
