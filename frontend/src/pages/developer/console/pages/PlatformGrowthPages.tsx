import { useMemo, useState } from 'react';
import { BellRing, FileJson, Layers, PackageSearch, Send, Smartphone, Users } from 'lucide-react';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { pf, usePfMutation, usePfQuery } from '../platformApi';

const RUN_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = { success: 'green', partial: 'amber', failed: 'red', running: 'blue' };

/* ------------------------------------------------------------------ */
/* Webhook payloads & batching (/developer/webhook-schemas)             */
/* ------------------------------------------------------------------ */

export function WebhookSchemasPage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const schemas = usePfQuery<any>(['wh-schemas'], '/api/developer/webhooks/schemas');
  const hooks = usePfQuery<any>(['wh-delivery', appId], appId ? `/api/developer/platform/apps/${appId}/webhook-delivery` : null);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, { batchWindowSeconds: number; batchMaxEvents: number }>>({});
  const save = usePfMutation<{ id: string; body: any }>('PATCH', (v) => `/api/developer/platform/apps/${appId}/webhooks/${v.id}/delivery`, { invalidate: [['wh-delivery', appId]], bodyFor: (v) => v.body, success: 'Delivery settings saved' });
  const all = useMemo(() => [...(schemas.data?.events || []), ...(schemas.data?.system || [])], [schemas.data]);

  return (
    <ConsolePage group="Developer Tools" title="Webhook Payloads & Batching" description="JSON Schemas for every event payload, and per-endpoint batched delivery." actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}>
      <Card title="Delivery mode" description="Batched endpoints get one signed POST of type &quot;batch&quot; with up to N events, sent when it is full or the oldest event has waited the window. Retries and signatures work the same as single deliveries.">
        {apps.length === 0 ? <NoAppsState what="webhooks" /> : hooks.isLoading ? <LoadingRows rows={2} /> : hooks.isError ? <ErrorCard message={(hooks.error as Error)?.message} onRetry={() => hooks.refetch()} /> : !hooks.data?.webhooks?.length ? (
          <EmptyState icon={Layers} title="No webhooks on this app" body="Add an endpoint on the Webhooks page first." />
        ) : (
          <table className="w-full text-left">
            <thead><tr><th className={thCls}>Endpoint</th><th className={thCls}>Mode</th><th className={thCls}>Window (s)</th><th className={thCls}>Max events</th><th className={thCls}>Queued</th><th className={thCls} /></tr></thead>
            <tbody>
              {hooks.data.webhooks.map((w: any) => {
                const e = edit[w.id] || { batchWindowSeconds: w.batchWindowSeconds, batchMaxEvents: w.batchMaxEvents };
                const lim = hooks.data.limits;
                return (
                  <tr key={w.id}>
                    <td className={tdCls}><div className="max-w-[320px] truncate font-mono text-[12px]">{w.endpointUrl}</div><div className="text-[11px] text-[var(--dc-muted)]">{w.verificationState}{w.isActive ? '' : ' - inactive'}</div></td>
                    <td className={tdCls}><Pill tone={w.deliveryMode === 'batch' ? 'blue' : 'gray'}>{w.deliveryMode}</Pill></td>
                    <td className={tdCls}><input aria-label="Batch window seconds" type="number" min={lim.minWindow} max={lim.maxWindow} className={`${inputCls} w-20`} value={e.batchWindowSeconds} onChange={(ev) => setEdit({ ...edit, [w.id]: { ...e, batchWindowSeconds: Number(ev.target.value) } })} /></td>
                    <td className={tdCls}><input aria-label="Batch max events" type="number" min={lim.minEvents} max={lim.maxEvents} className={`${inputCls} w-20`} value={e.batchMaxEvents} onChange={(ev) => setEdit({ ...edit, [w.id]: { ...e, batchMaxEvents: Number(ev.target.value) } })} /></td>
                    <td className={tdCls}>{w.pendingBatchEvents}</td>
                    <td className={tdCls}>
                      <div className="flex gap-1">
                        <button className={btn.secondary} onClick={() => save.mutate({ id: w.id, body: { deliveryMode: w.deliveryMode === 'batch' ? 'single' : 'batch', ...e } })}>{w.deliveryMode === 'batch' ? 'Use single' : 'Use batch'}</button>
                        {w.deliveryMode === 'batch' && <button className={btn.secondary} onClick={() => save.mutate({ id: w.id, body: e })}>Save</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Event payload schemas" description="Served publicly at GET /api/developer/webhooks/schemas (JSON Schema 2020-12) and in the OpenAPI document's webhooks section." className="mt-4">
        {schemas.isLoading ? <LoadingRows rows={4} /> : schemas.isError ? <ErrorCard message={(schemas.error as Error)?.message} /> : (
          <>
            <div className="mb-3 text-[12px] text-[var(--dc-muted)]">Headers: {(schemas.data?.headers || []).map((h: any) => <code key={h.name} className="dc-code mr-2">{h.name}</code>)}</div>
            <div className="divide-y divide-[var(--dc-border)]">
              {all.map((d: any) => (
                <div key={d.type} className="py-2">
                  <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === d.type ? null : d.type)} aria-expanded={open === d.type}>
                    <span><code className="dc-code">{d.type}</code> <span className="ml-2 text-[12px] text-[var(--dc-muted)]">{d.description}</span></span>
                    <span className="text-[11px]">{d.scope ? <Pill tone="blue">{d.scope}</Pill> : <Pill tone="gray">system</Pill>}</span>
                  </button>
                  {open === d.type && (
                    <div className="mt-2 grid gap-3 min-[900px]:grid-cols-2">
                      <div><div className={labelCls}>Schema of data</div><pre className="dc-code max-h-[320px] overflow-auto whitespace-pre text-[11px]">{JSON.stringify(d.schema, null, 2)}</pre></div>
                      <div><div className={labelCls}>Example data</div><pre className="dc-code max-h-[320px] overflow-auto whitespace-pre text-[11px]">{JSON.stringify(d.example, null, 2)}</pre><div className="mt-1 text-[11px] text-[var(--dc-muted)]">Delivered for {d.audience}.</div></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Push notifications (/developer/push)                                 */
/* ------------------------------------------------------------------ */

export function PushPage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const q = usePfQuery<any>(['push', appId], appId ? `/api/developer/platform/apps/${appId}/push` : null);
  const [fcmJson, setFcmJson] = useState('');
  const [apns, setApns] = useState({ teamId: '', keyId: '', bundleId: '', privateKey: '', sandbox: true });
  const [result, setResult] = useState<any>(null);
  const inv = [['push', appId]];
  const saveFcm = usePfMutation<any>('PUT', () => `/api/developer/platform/apps/${appId}/push/fcm`, { invalidate: inv, success: 'FCM credentials saved (encrypted)', onDone: () => setFcmJson('') });
  const saveApns = usePfMutation<any>('PUT', () => `/api/developer/platform/apps/${appId}/push/apns`, { invalidate: inv, success: 'APNs credentials saved (encrypted)', onDone: () => setApns({ ...apns, privateKey: '' }) });
  const remove = usePfMutation<string>('DELETE', (p) => `/api/developer/platform/apps/${appId}/push/${p}`, { invalidate: inv, success: 'Credentials removed' });
  const test = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/push-test`, { invalidate: inv, onDone: (o) => setResult(o) });
  const d = q.data;

  return (
    <ConsolePage group="Developer Tools" title="Push Notifications" description="Register device tokens from your iOS / Android app and send notifications through your own FCM and APNs credentials." actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}>
      {apps.length === 0 ? <NoAppsState what="push notifications" /> : q.isLoading ? <LoadingRows rows={3} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : d && (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-4">
            <StatTile icon={Smartphone} label="Android devices" value={d.devices.activeByPlatform.android || 0} />
            <StatTile icon={Smartphone} label="iOS devices" value={d.devices.activeByPlatform.ios || 0} />
            <StatTile icon={Send} label="Sent (30 days)" value={d.last30Days.sent} hint={`${d.last30Days.sends} requests`} tone="green" />
            <StatTile icon={BellRing} label="Invalid tokens (30 days)" value={d.last30Days.invalidTokens} hint={`${d.last30Days.failed} failed`} tone="amber" />
          </div>
          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
            {d.providers.map((p: any) => (
              <Card key={p.provider} title={p.provider === 'fcm' ? 'Firebase Cloud Messaging (Android)' : 'Apple Push Notification service (iOS)'} description={p.status === 'active' ? `Configured ${p.updatedAt ? fmtDate(p.updatedAt) : ''}` : 'Not configured - sends to these devices report "not_configured".'}>
                <div className="mb-3 flex items-center gap-2"><Pill tone={p.status === 'active' ? 'green' : 'gray'}>{p.status === 'active' ? 'configured' : 'not configured'}</Pill>{p.status === 'active' && <button className={btn.secondary} onClick={() => remove.mutate(p.provider)}>Remove</button>}</div>
                {p.provider === 'fcm' ? (
                  <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); saveFcm.mutate({ serviceAccountJson: fcmJson }); }}>
                    <label className={labelCls} htmlFor="fcm-json">Service account JSON (Firebase console - Project settings - Service accounts)</label>
                    <textarea id="fcm-json" className={`${inputCls} font-mono text-[11px]`} rows={4} value={fcmJson} onChange={(e) => setFcmJson(e.target.value)} placeholder='{"type": "service_account", "project_id": ...}' />
                    <button className={btn.primary} disabled={!fcmJson.trim() || saveFcm.isPending}>Save FCM credentials</button>
                  </form>
                ) : (
                  <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); saveApns.mutate(apns); }}>
                    <div className="grid grid-cols-3 gap-2">
                      <input aria-label="Team ID" className={inputCls} placeholder="Team ID" value={apns.teamId} onChange={(e) => setApns({ ...apns, teamId: e.target.value })} />
                      <input aria-label="Key ID" className={inputCls} placeholder="Key ID" value={apns.keyId} onChange={(e) => setApns({ ...apns, keyId: e.target.value })} />
                      <input aria-label="Bundle ID" className={inputCls} placeholder="com.example.app" value={apns.bundleId} onChange={(e) => setApns({ ...apns, bundleId: e.target.value })} />
                    </div>
                    <textarea aria-label="APNs .p8 key" className={`${inputCls} font-mono text-[11px]`} rows={3} placeholder="Paste Apple APNs .p8 private key content here" value={apns.privateKey} onChange={(e) => setApns({ ...apns, privateKey: e.target.value })} />
                    <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={apns.sandbox} onChange={(e) => setApns({ ...apns, sandbox: e.target.checked })} /> Sandbox (development builds)</label>
                    <button className={btn.primary} disabled={!apns.teamId || !apns.keyId || !apns.bundleId || !apns.privateKey || saveApns.isPending}>Save APNs credentials</button>
                  </form>
                )}
              </Card>
            ))}
          </div>
          <Card title="Send a test" description="Sends to the devices you registered with this app using your own account's token." className="mt-4">
            <button className={btn.primary} disabled={test.isPending} onClick={() => test.mutate({})}><Send className="mr-1 inline h-4 w-4" />Send test to my devices</button>
            {result && <pre className="dc-code mt-3 whitespace-pre text-[11px]">{JSON.stringify(result, null, 2)}</pre>}
          </Card>
          <Card title="Integrate" className="mt-4">
            <pre className="dc-code overflow-x-auto whitespace-pre text-[11px]">{`# In your app, after the person signs in with OAuth (scope notifications.write):
POST /api/developer/push/devices   { "platform": "android", "token": "<FCM registration token>" }
# From your server (API key or app token):
POST /api/developer/push/send      { "userIds": ["<user id>"], "title": "Order shipped", "body": "Arrives Friday", "data": { "orderId": "o_1" } }`}</pre>
          </Card>
        </>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Product catalog feeds (/developer/catalog-feeds)                     */
/* ------------------------------------------------------------------ */

export function CatalogFeedsPage() {
  const q = usePfQuery<any>(['feeds'], '/api/developer/marketplace/feeds');
  const [sel, setSel] = useState<string | null>(null);
  const detail = usePfQuery<any>(['feed', sel], sel ? `/api/developer/marketplace/feeds/${sel}` : null);
  const [form, setForm] = useState({ name: '', sourceType: 'url', sourceUrl: '', format: 'json', schedule: 'manual' });
  const [content, setContent] = useState('');
  const [last, setLast] = useState<any>(null);
  const inv = [['feeds'], ['feed', sel]];
  const create = usePfMutation<any>('POST', () => '/api/developer/marketplace/feeds', { invalidate: inv, success: 'Feed created', onDone: (f) => { setSel(f.id); setForm({ ...form, name: '', sourceUrl: '' }); } });
  const patch = usePfMutation<{ id: string; body: any }>('PATCH', (v) => `/api/developer/marketplace/feeds/${v.id}`, { invalidate: inv, bodyFor: (v) => v.body, success: 'Feed updated' });
  const del = usePfMutation<string>('DELETE', (id) => `/api/developer/marketplace/feeds/${id}`, { invalidate: inv, success: 'Feed deleted', onDone: () => setSel(null) });
  const run = usePfMutation<{ id: string; content?: string }>('POST', (v) => `/api/developer/marketplace/feeds/${v.id}/run`, { invalidate: inv, bodyFor: (v) => (v.content !== undefined ? { content: v.content } : {}), onDone: (o) => setLast(o) });
  const f = detail.data;

  return (
    <ConsolePage group="Developer Tools" title="Product Catalog Feeds" description="Keep your marketplace shop in sync with a JSON or CSV product feed. Products are matched on the feed's id / sku.">
      <div className="grid gap-4 min-[1100px]:grid-cols-[1fr_1.3fr]">
        <Card title="Your feeds">
          {q.isLoading ? <LoadingRows rows={3} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : !q.data?.feeds?.length ? (
            <EmptyState icon={PackageSearch} title="No feeds yet" body="Create one below from an https URL or an uploaded file." />
          ) : (
            <ul className="divide-y divide-[var(--dc-border)]">
              {q.data.feeds.map((x: any) => (
                <li key={x.id}>
                  <button className={`flex w-full items-center justify-between py-2 text-left ${sel === x.id ? 'font-semibold' : ''}`} onClick={() => setSel(x.id)}>
                    <span>{x.name}<span className="ml-2 text-[11px] text-[var(--dc-muted)]">{x.format.toUpperCase()} - {x.sourceType} - {x.schedule}</span></span>
                    {x.lastStatus ? <Pill tone={RUN_TONE[x.lastStatus] || 'gray'}>{x.lastStatus}</Pill> : <Pill tone="gray">never run</Pill>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="mt-4 space-y-2 border-t border-[var(--dc-border)] pt-3" onSubmit={(e) => { e.preventDefault(); create.mutate(form.sourceType === 'url' ? form : { ...form, sourceUrl: undefined, schedule: 'manual' }); }}>
            <label className={labelCls} htmlFor="feed-name">New feed</label>
            <input id="feed-name" className={inputCls} placeholder="Main catalog" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Source" className={selectCls} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}><option value="url">URL</option><option value="upload">Upload</option></select>
              <select aria-label="Format" className={selectCls} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}><option value="json">JSON</option><option value="csv">CSV</option></select>
              <select aria-label="Schedule" className={selectCls} value={form.schedule} disabled={form.sourceType === 'upload'} onChange={(e) => setForm({ ...form, schedule: e.target.value })}><option value="manual">Manual</option><option value="hourly">Hourly</option><option value="daily">Daily</option></select>
            </div>
            {form.sourceType === 'url' && <input aria-label="Feed URL" className={inputCls} placeholder="https://shop.example/feed.json" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} required />}
            <button className={btn.primary} disabled={create.isPending}>Create feed</button>
          </form>
        </Card>
        <Card title={f ? f.name : 'Feed details'} description={f ? (f.sourceUrl || 'Uploaded feed') : 'Select a feed.'}>
          {!sel ? <EmptyState icon={FileJson} title="No feed selected" body="Columns: id or sku (required), title, price, sale_price, description, availability, stock, brand, condition, category, image_link. Max 5000 rows / 5 MB." /> : detail.isLoading ? <LoadingRows rows={3} /> : f && (
            <>
              <div className="flex flex-wrap gap-2">
                {f.sourceType === 'url' && <button className={btn.primary} disabled={run.isPending} onClick={() => run.mutate({ id: f.id })}>Run now</button>}
                <button className={btn.secondary} onClick={() => patch.mutate({ id: f.id, body: { status: f.status === 'active' ? 'paused' : 'active' } })}>{f.status === 'active' ? 'Pause' : 'Resume'}</button>
                <button className={btn.secondary} onClick={() => { if (window.confirm('Delete this feed? Imported products stay.')) del.mutate(f.id); }}>Delete</button>
              </div>
              {f.sourceType === 'upload' && (
                <div className="mt-3 space-y-2">
                  <label className={labelCls} htmlFor="feed-file">Choose a {f.format.toUpperCase()} file or paste its content</label>
                  <input id="feed-file" type="file" accept={f.format === 'csv' ? '.csv,text/csv' : '.json,application/json'} onChange={async (e) => { const file = e.target.files?.[0]; if (file) setContent(await file.text()); }} />
                  <textarea aria-label="Feed content" className={`${inputCls} font-mono text-[11px]`} rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
                  <button className={btn.primary} disabled={!content.trim() || run.isPending} onClick={() => run.mutate({ id: f.id, content })}>Import</button>
                </div>
              )}
              {last && <InfoNote className="mt-3">Last run: <strong>{last.status}</strong> - {last.created} created, {last.updated} updated, {last.skipped} skipped{last.error ? ` - ${last.error}` : ''}</InfoNote>}
              <table className="mt-3 w-full text-left">
                <thead><tr><th className={thCls}>Started</th><th className={thCls}>Status</th><th className={thCls}>Rows</th><th className={thCls}>Created</th><th className={thCls}>Updated</th><th className={thCls}>Skipped</th></tr></thead>
                <tbody>
                  {f.runs.length === 0 ? <tr><td className={tdCls} colSpan={6}>No runs yet.</td></tr> : f.runs.map((r: any) => (
                    <tr key={r.id} title={(r.errors || []).join('\n') || r.error || ''}>
                      <td className={tdCls}>{fmtDate(r.startedAt)}</td><td className={tdCls}><Pill tone={RUN_TONE[r.status] || 'gray'}>{r.status}</Pill></td><td className={tdCls}>{r.rows}</td><td className={tdCls}>{r.created}</td><td className={tdCls}>{r.updated}</td><td className={tdCls}>{r.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {f.runs[0]?.errors?.length > 0 && <pre className="dc-code mt-2 max-h-[160px] overflow-auto whitespace-pre-wrap text-[11px]">{f.runs[0].errors.join('\n')}</pre>}
            </>
          )}
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Custom audiences (/developer/audiences)                              */
/* ------------------------------------------------------------------ */

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hashes in the browser so raw emails / phones never leave this page. Same normalisation as the server. */
async function hashLines(text: string) {
  const out: Array<{ emailHash?: string; phoneHash?: string }> = [];
  for (const raw of text.split(/[\r\n,;]+/)) {
    const v = raw.trim();
    if (!v) continue;
    if (v.includes('@')) out.push({ emailHash: await sha256Hex(v.toLowerCase()) });
    else {
      const digits = v.replace(/\D/g, '');
      if (digits.length >= 6) out.push({ phoneHash: await sha256Hex(digits) });
    }
  }
  return out;
}

export function AudiencesPage() {
  const q = usePfQuery<any>(['audiences'], '/api/developer/ads/audiences');
  const [name, setName] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [list, setList] = useState('');
  const [upload, setUpload] = useState<any>(null);
  const [campaignId, setCampaignId] = useState('');
  const inv = [['audiences']];
  const create = usePfMutation<any>('POST', () => '/api/developer/ads/audiences', { invalidate: inv, success: 'Audience created', onDone: (a) => { setSel(a.id); setName(''); } });
  const del = usePfMutation<string>('DELETE', (id) => `/api/developer/ads/audiences/${id}`, { invalidate: inv, success: 'Audience deleted', onDone: () => setSel(null) });
  const link = usePfMutation<{ campaignId: string; audienceIds: string[] }>('PUT', (v) => `/api/developer/ads/campaigns/${encodeURIComponent(v.campaignId)}/audiences`, { invalidate: inv, bodyFor: (v) => ({ audienceIds: v.audienceIds }), success: (o: any) => (o.audienceIds.length ? 'Campaign now limited to this audience' : 'Restriction removed') });
  const [busy, setBusy] = useState(false);
  const a = q.data?.audiences?.find((x: any) => x.id === sel);

  const doUpload = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const identifiers = await hashLines(list);
      setUpload(await pf('POST', `/api/developer/ads/audiences/${sel}/members`, { identifiers }));
      setList('');
      q.refetch();
    } catch (e: any) {
      setUpload({ error: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsolePage group="Developer Tools" title="Custom Audiences" description="Reach your own customers with Wevsoft ads. Lists are hashed (SHA-256) in your browser before upload; sizes under 20 matched people are never shown or used.">
      <div className="grid gap-4 min-[1100px]:grid-cols-[1fr_1.3fr]">
        <Card title="Audiences">
          {q.isLoading ? <LoadingRows rows={3} /> : q.isError ? <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : !q.data?.audiences?.length ? (
            <EmptyState icon={Users} title="No audiences" body="Create one, upload a customer list, then limit a campaign to it." />
          ) : (
            <ul className="divide-y divide-[var(--dc-border)]">
              {q.data.audiences.map((x: any) => (
                <li key={x.id}><button className={`flex w-full items-center justify-between py-2 text-left ${sel === x.id ? 'font-semibold' : ''}`} onClick={() => setSel(x.id)}><span>{x.name}</span><span className="text-[12px]">{x.uploaded} uploaded - {x.belowMinimum ? `<${x.minimumSize} matched` : `${x.matched} matched`}</span></button></li>
              ))}
            </ul>
          )}
          <form className="mt-4 flex gap-2 border-t border-[var(--dc-border)] pt-3" onSubmit={(e) => { e.preventDefault(); create.mutate({ name }); }}>
            <input aria-label="Audience name" className={inputCls} placeholder="Newsletter subscribers" value={name} onChange={(e) => setName(e.target.value)} required />
            <button className={btn.primary} disabled={create.isPending}>Create</button>
          </form>
        </Card>
        <Card title={a ? a.name : 'Audience'} description={a ? `${a.uploaded} identifiers uploaded${a.lastUploadAt ? `, last ${fmtDate(a.lastUploadAt)}` : ''}` : 'Select an audience.'}>
          {!a ? <EmptyState icon={Users} title="Nothing selected" body="Pick an audience on the left." /> : (
            <>
              <div className="mb-3">{a.belowMinimum ? <Pill tone="amber">below minimum size ({a.minimumSize})</Pill> : <Pill tone="green">{a.matched} people matched</Pill>}</div>
              <label className={labelCls} htmlFor="aud-list">Emails or phone numbers, one per line</label>
              <textarea id="aud-list" className={`${inputCls} font-mono text-[11px]`} rows={6} value={list} onChange={(e) => setList(e.target.value)} placeholder={'ana@example.com\n+8801711000000'} />
              <div className="mt-2 flex gap-2">
                <button className={btn.primary} disabled={!list.trim() || busy} onClick={doUpload}>Hash &amp; upload</button>
                <button className={btn.secondary} onClick={() => { if (window.confirm('Delete this audience?')) del.mutate(a.id); }}>Delete audience</button>
              </div>
              {upload && <pre className="dc-code mt-3 whitespace-pre text-[11px]">{JSON.stringify(upload, null, 2)}</pre>}
              <div className="mt-4 border-t border-[var(--dc-border)] pt-3">
                <label className={labelCls} htmlFor="aud-campaign">Limit a campaign to this audience</label>
                <div className="flex gap-2">
                  <input id="aud-campaign" className={inputCls} placeholder="Campaign id (from the Ads API page)" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
                  <button className={btn.primary} disabled={!campaignId.trim() || link.isPending} onClick={() => link.mutate({ campaignId: campaignId.trim(), audienceIds: [a.id] })}>Limit</button>
                  <button className={btn.secondary} disabled={!campaignId.trim() || link.isPending} onClick={() => link.mutate({ campaignId: campaignId.trim(), audienceIds: [] })}>Remove limit</button>
                </div>
                <p className="mt-1 text-[11px] text-[var(--dc-muted)]">You need promotion.manage on the campaign's Space. Restricted campaigns are only shown to signed-in members of an audience with at least {a.minimumSize} matched people.</p>
              </div>
            </>
          )}
        </Card>
      </div>
    </ConsolePage>
  );
}
