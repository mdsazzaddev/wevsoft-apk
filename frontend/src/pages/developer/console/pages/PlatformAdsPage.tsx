import { useEffect, useMemo, useState } from 'react';
import { Megaphone, MousePointerClick, Target, Wallet } from 'lucide-react';
import { Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { usePfMutation, usePfQuery } from '../platformApi';

const STATUS_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'gray'> = {
  ACTIVE: 'green',
  APPROVED: 'green',
  PENDING_REVIEW: 'amber',
  DRAFT: 'gray',
  PAUSED: 'blue',
  REJECTED: 'red',
  CANCELLED: 'red',
  COMPLETED: 'gray',
};

const money = (n: unknown, c = 'BDT') => `${c} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function AdsApiPage() {
  const spaces = usePfQuery<any>(['ads-spaces'], '/api/developer/ads/spaces');
  const options = usePfQuery<any>(['ads-options'], '/api/developer/ads/options');
  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!spaceId && spaces.data?.spaces?.length) setSpaceId(spaces.data.spaces[0].id);
  }, [spaces.data, spaceId]);
  const space = useMemo(() => spaces.data?.spaces?.find((s: any) => s.id === spaceId), [spaces.data, spaceId]);
  const base = spaceId ? `/api/developer/ads/spaces/${spaceId}` : null;
  const hasAccount = !!space?.advertiserAccount;
  const overview = usePfQuery<any>(['ads-overview', spaceId], hasAccount ? `${base}/overview` : null);
  const campaigns = usePfQuery<any>(['ads-campaigns', spaceId], hasAccount ? `${base}/campaigns` : null);
  const analytics = usePfQuery<any>(['ads-analytics', spaceId], hasAccount ? `${base}/analytics` : null);
  const pixel = usePfQuery<any>(['ads-pixel', spaceId], hasAccount ? `${base}/pixel` : null);
  const conversions = usePfQuery<any>(['ads-conversions', spaceId], hasAccount ? `${base}/conversions?limit=10` : null);

  const createAccount = usePfMutation<void>('POST', () => `${base}/account`, { invalidate: [['ads-spaces']], success: 'Advertiser account created', bodyFor: () => ({}) });
  const transition = usePfMutation<{ id: string; status: string }>('POST', (v) => `/api/developer/ads/campaigns/${v.id}/transition`, {
    invalidate: [['ads-campaigns', spaceId], ['ads-overview', spaceId]],
    success: 'Campaign updated',
    bodyFor: (v) => ({ status: v.status }),
  });
  const [form, setForm] = useState({ name: '', objective: 'TRAFFIC', dailyBudget: '100', totalBudget: '1000', durationDays: '7', bidAmount: '5', primaryText: '', headline: '', destinationUrl: '' });
  const create = usePfMutation<typeof form>('POST', () => `${base}/campaigns`, {
    invalidate: [['ads-campaigns', spaceId], ['ads-overview', spaceId]],
    success: 'Draft campaign created',
    bodyFor: (f) => ({
      name: f.name,
      targetKind: 'SPACE',
      targetId: spaceId,
      objective: f.objective,
      dailyBudget: Number(f.dailyBudget),
      totalBudget: Number(f.totalBudget),
      durationDays: Number(f.durationDays),
      bidAmount: Number(f.bidAmount),
      format: 'SPACE_PROMOTE',
      billingModel: 'CPC',
      currency: space?.advertiserAccount?.currency || 'BDT',
      primaryText: f.primaryText,
      headline: f.headline,
      destinationType: f.destinationUrl ? 'EXTERNAL' : 'WESPACE',
      destinationUrl: f.destinationUrl || undefined,
    }),
    onDone: () => setForm((f) => ({ ...f, name: '', primaryText: '', headline: '', destinationUrl: '' })),
  });
  const [kinds, setKinds] = useState<string[] | null>(null);
  const savePixel = usePfMutation<string[]>('PUT', () => `${base}/pixel`, { invalidate: [['ads-pixel', spaceId]], success: 'Conversion kinds saved', bodyFor: (k) => ({ enabledKinds: k }) });
  const activeKinds = kinds ?? pixel.data?.enabledKinds ?? [];
  const owner = options.data?.ownerTransitions || {};
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ConsolePage group="Developer Tools" title="Ads & Marketing API" description="Manage WevSpace advertiser accounts, campaigns, analytics and server-side conversions with the same rules as the Ads dashboard.">
      <InfoNote className="mb-3">Campaigns can be created and submitted for review through the API, but only Wevsoft reviewers can activate them. Billing, deposits and pricing are never editable from here.</InfoNote>

      {spaces.isLoading ? (
        <LoadingRows rows={3} />
      ) : spaces.isError ? (
        <ErrorCard message={(spaces.error as Error)?.message} onRetry={() => spaces.refetch()} />
      ) : !spaces.data?.spaces?.length ? (
        <EmptyState icon={Megaphone} title="No Spaces to advertise for" body="You need a WevSpace you own or manage with promotion permission. Create one in WevSpace, then come back." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className={labelCls} htmlFor="ads-space">Space</label>
            <select id="ads-space" className={selectCls} value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              {spaces.data.spaces.map((s: any) => <option key={s.id} value={s.id}>{s.name} (@{s.handle})</option>)}
            </select>
            {hasAccount ? <Pill tone="green">Advertiser account {space.advertiserAccount.status}</Pill> : <Pill tone="gray">No advertiser account</Pill>}
          </div>

          {!hasAccount ? (
            <Card title="Advertiser account" description="An advertiser account holds the Space's balance and campaigns.">
              <button className={btn.primary} disabled={createAccount.isPending} onClick={() => createAccount.mutate()}>Create advertiser account</button>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4">
                <StatTile icon={Wallet} label="Available balance" value={money(overview.data?.availableBalance, space.advertiserAccount.currency)} hint="Deposits happen in the Ads dashboard" tone="gray" />
                <StatTile icon={Megaphone} label="Active campaigns" value={overview.data?.activeCount ?? '-'} hint={`${overview.data?.adCount ?? 0} ads total`} />
                <StatTile icon={MousePointerClick} label="Clicks (30d)" value={analytics.data?.overview?.clicks ?? '-'} hint={`${analytics.data?.overview?.impressions ?? 0} impressions`} tone="blue" />
                <StatTile icon={Target} label="Verified conversions (30d)" value={analytics.data?.overview?.conversions ?? '-'} hint={`Value ${money(analytics.data?.overview?.conversionValue, space.advertiserAccount.currency)}`} tone="green" />
              </div>

              <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-[3fr_2fr]">
                <Card title="Campaigns" description="Owner actions follow the same transitions as the dashboard.">
                  {campaigns.isLoading ? (
                    <LoadingRows rows={3} />
                  ) : campaigns.isError ? (
                    <ErrorCard message={(campaigns.error as Error)?.message} onRetry={() => campaigns.refetch()} />
                  ) : !campaigns.data?.campaigns?.length ? (
                    <EmptyState icon={Megaphone} title="No campaigns yet" body="Create a draft with the form, or POST to /api/developer/ads/spaces/{space}/campaigns." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr><th className={thCls}>Name</th><th className={thCls}>Status</th><th className={thCls}>Budget</th><th className={thCls}>Clicks</th><th className={thCls}>Actions</th></tr></thead>
                        <tbody>
                          {campaigns.data.campaigns.map((c: any) => (
                            <tr key={c.id}>
                              <td className={tdCls}><div className="font-medium">{c.name}</div><div className="text-[11px] text-[var(--dc-muted)]">{c.objective} - {fmtDate(c.createdAt)}</div>{c.rejectionNote && <div className="text-[11px] text-red-600">Rejected: {c.rejectionNote}</div>}</td>
                              <td className={tdCls}><Pill tone={STATUS_TONE[c.status] || 'gray'}>{c.status.replace('_', ' ')}</Pill></td>
                              <td className={tdCls}>{money(c.dailyBudget, c.currency)}/day<div className="text-[11px] text-[var(--dc-muted)]">total {money(c.totalBudget, c.currency)}</div></td>
                              <td className={tdCls}>{c.clicks}</td>
                              <td className={tdCls}>
                                <div className="flex flex-wrap gap-1">
                                  {(owner[c.status] || []).map((to: string) => (
                                    <button key={to} className={btn.secondary} disabled={transition.isPending} onClick={() => transition.mutate({ id: c.id, status: to })}>{to === 'PENDING_REVIEW' ? 'Submit for review' : to.charAt(0) + to.slice(1).toLowerCase().replace('_', ' ')}</button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card title="New draft campaign" description="Space promotion, pay per click. Budgets must meet the platform floors.">
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      create.mutate(form);
                    }}
                  >
                    <div><label className={labelCls} htmlFor="c-name">Name</label><input id="c-name" className={inputCls} required maxLength={100} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelCls} htmlFor="c-obj">Objective</label>
                        <select id="c-obj" className={selectCls} value={form.objective} onChange={(e) => set('objective', e.target.value)}>
                          {(options.data?.objectives || []).map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select></div>
                      <div><label className={labelCls} htmlFor="c-days">Days</label><input id="c-days" type="number" min={1} className={inputCls} value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} /></div>
                      <div><label className={labelCls} htmlFor="c-daily">Daily budget</label><input id="c-daily" type="number" min={0} className={inputCls} value={form.dailyBudget} onChange={(e) => set('dailyBudget', e.target.value)} /></div>
                      <div><label className={labelCls} htmlFor="c-total">Total budget</label><input id="c-total" type="number" min={0} className={inputCls} value={form.totalBudget} onChange={(e) => set('totalBudget', e.target.value)} /></div>
                      <div><label className={labelCls} htmlFor="c-bid">Bid per click</label><input id="c-bid" type="number" min={0} step="0.01" className={inputCls} value={form.bidAmount} onChange={(e) => set('bidAmount', e.target.value)} /></div>
                    </div>
                    <div><label className={labelCls} htmlFor="c-head">Headline</label><input id="c-head" className={inputCls} maxLength={60} value={form.headline} onChange={(e) => set('headline', e.target.value)} /></div>
                    <div><label className={labelCls} htmlFor="c-text">Primary text</label><textarea id="c-text" className={inputCls} rows={2} maxLength={500} value={form.primaryText} onChange={(e) => set('primaryText', e.target.value)} /></div>
                    <div><label className={labelCls} htmlFor="c-url">Destination URL (optional)</label><input id="c-url" className={inputCls} placeholder="https://" value={form.destinationUrl} onChange={(e) => set('destinationUrl', e.target.value)} /></div>
                    <button type="submit" className={btn.primary} disabled={create.isPending || !form.name.trim()}>Create draft</button>
                  </form>
                </Card>
              </div>

              <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
                <Card title="Conversions API" description="Send server-side events. Only events from people who clicked or viewed the ad in the last 7 days count.">
                  {pixel.isLoading ? <LoadingRows rows={2} /> : (
                    <>
                      <p className="text-[12px] text-[var(--dc-text-2)]">Pixel ID <code className="dc-code">{pixel.data?.pixelId || 'created on first save'}</code> - endpoint <code className="dc-code">POST /api/developer/ads/conversions</code></p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(pixel.data?.kinds || []).map((k: string) => (
                          <label key={k} className="flex items-center gap-1 text-[12px]">
                            <input type="checkbox" checked={activeKinds.includes(k)} onChange={(e) => setKinds(e.target.checked ? [...activeKinds, k] : activeKinds.filter((x: string) => x !== k))} /> {k}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--dc-muted)]">No kinds selected means every kind is accepted.</p>
                      <button className={`${btn.secondary} mt-2`} disabled={savePixel.isPending} onClick={() => savePixel.mutate(activeKinds)}>Save kinds</button>
                      <pre className="dc-code mt-3 overflow-x-auto whitespace-pre text-[11px]">{`curl -X POST https://<host>/api/developer/ads/conversions \\
  -H "X-API-Key: $WEVSOFT_KEY" -H "Content-Type: application/json" \\
  -d '{"events":[{"eventId":"order-1042","kind":"PURCHASE",
       "campaignId":"<campaign id>","value":1999,"currency":"BDT",
       "user":{"email":"buyer@example.com"}}]}'`}</pre>
                    </>
                  )}
                </Card>
                <Card title="Recent conversions" description="Latest events across this Space. Unverified events are stored but not counted.">
                  {conversions.isLoading ? <LoadingRows rows={3} /> : !conversions.data?.events?.length ? (
                    <EmptyState icon={Target} title="No conversions yet" body="Events sent to the Conversions API appear here." />
                  ) : (
                    <table className="w-full text-left">
                      <thead><tr><th className={thCls}>Kind</th><th className={thCls}>Campaign</th><th className={thCls}>Value</th><th className={thCls}>State</th><th className={thCls}>When</th></tr></thead>
                      <tbody>
                        {conversions.data.events.map((e: any) => (
                          <tr key={e.id}><td className={tdCls}>{e.kind}</td><td className={tdCls}>{e.campaignName}</td><td className={tdCls}>{e.value ?? '-'}</td><td className={tdCls}>{e.verified ? <Pill tone="green">Verified</Pill> : <Pill tone="gray">Unverified</Pill>}</td><td className={tdCls}>{fmtDate(e.createdAt)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </ConsolePage>
  );
}
