import { useState } from 'react';
import { CheckCircle2, Fingerprint, KeyRound, Link2, ShieldCheck, Trash2 } from 'lucide-react';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { usePfMutation, usePfQuery } from '../platformApi';

const REVIEW_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'gray'> = { approved: 'green', pending: 'amber', rejected: 'red', revoked: 'red', withdrawn: 'gray' };
const HOOK_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'gray'> = { verified: 'green', legacy: 'gray', pending: 'amber', failed: 'red' };

/* ------------------------------------------------------------------ */
/* Permissions & Review (/developer/permissions)                        */
/* ------------------------------------------------------------------ */

export function PermissionsReviewPage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const q = usePfQuery<any>(['scope-reviews', appId], appId ? `/api/developer/platform/apps/${appId}/scope-reviews` : null);
  const [scope, setScope] = useState('');
  const [justification, setJustification] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const inv = [['scope-reviews', appId]];
  const request = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/scope-reviews`, {
    invalidate: inv,
    success: 'Review requested',
    onDone: () => { setJustification(''); setDemoUrl(''); setScope(''); },
  });
  const withdraw = usePfMutation<string>('POST', (id) => `/api/developer/platform/apps/${appId}/scope-reviews/${id}/withdraw`, { invalidate: inv, success: 'Request withdrawn', bodyFor: () => ({}) });
  const d = q.data;
  const sensitive = (d?.catalog || []).filter((c: any) => c.sensitive);
  const requested: string[] = d?.requested || [];
  const approved: string[] = d?.approved || [];
  const needing = sensitive.filter((c: any) => requested.includes(c.scope) && !approved.includes(c.scope));
  const open = new Set((d?.reviews || []).filter((r: any) => r.status === 'pending').map((r: any) => r.scope));

  return (
    <ConsolePage
      group="Developer Tools"
      title="Permissions & Review"
      description="Sensitive scopes are reviewed one by one. App approval alone never grants them."
      actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}
    >
      {apps.length === 0 ? (
        <NoAppsState what="permissions" />
      ) : q.isLoading ? (
        <LoadingRows rows={4} />
      ) : q.isError ? (
        <ErrorCard message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={KeyRound} label="Requested scopes" value={requested.length} hint="Set on the app's settings" tone="gray" />
            <StatTile icon={CheckCircle2} label="Approved scopes" value={approved.length} hint="Usable by production tokens" tone="green" />
            <StatTile icon={ShieldCheck} label="Waiting for review" value={needing.length} hint="Sensitive and not yet approved" tone="amber" />
          </div>

          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-[3fr_2fr]">
            <Card title="Scopes" description="Every scope the app requests, and whether it can be used.">
              {requested.length === 0 ? (
                <EmptyState icon={KeyRound} title="No scopes requested" body="Add scopes in the app settings, then come back to request review for sensitive ones." />
              ) : (
                <table className="w-full text-left">
                  <thead><tr><th className={thCls}>Scope</th><th className={thCls}>Type</th><th className={thCls}>State</th></tr></thead>
                  <tbody>
                    {requested.map((s) => {
                      const meta = (d.catalog || []).find((c: any) => c.scope === s);
                      const isApproved = approved.includes(s);
                      return (
                        <tr key={s}>
                          <td className={tdCls}><code className="dc-code">{s}</code>{meta?.reason && <div className="text-[11px] text-[var(--dc-muted)]">{meta.reason}</div>}</td>
                          <td className={tdCls}>{meta?.sensitive ? <Pill tone="amber">Sensitive</Pill> : <Pill tone="gray">Standard</Pill>}</td>
                          <td className={tdCls}>{isApproved ? <Pill tone="green">Approved</Pill> : open.has(s) ? <Pill tone="amber">In review</Pill> : meta?.sensitive ? <Pill tone="red">Needs review</Pill> : <Pill tone="gray">With app review</Pill>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Request review" description="Explain what the scope is for and what you do with the data.">
              {needing.filter((c: any) => !open.has(c.scope)).length === 0 ? (
                <p className="text-[12px] text-[var(--dc-muted)]">Nothing to request. Sensitive scopes you add to the app will show up here.</p>
              ) : (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    request.mutate({ scope, justification, demoUrl: demoUrl || undefined });
                  }}
                >
                  <div>
                    <label className={labelCls} htmlFor="sr-scope">Scope</label>
                    <select id="sr-scope" className={selectCls} value={scope} onChange={(e) => setScope(e.target.value)} required>
                      <option value="">Choose a scope</option>
                      {needing.filter((c: any) => !open.has(c.scope)).map((c: any) => <option key={c.scope} value={c.scope}>{c.scope}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="sr-why">Why does the app need it? ({justification.trim().length}/40 minimum)</label>
                    <textarea id="sr-why" className={inputCls} rows={4} maxLength={2000} value={justification} onChange={(e) => setJustification(e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="sr-demo">Demo or test instructions (https, optional)</label>
                    <input id="sr-demo" className={inputCls} placeholder="https://" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} />
                  </div>
                  <button type="submit" className={btn.primary} disabled={request.isPending || !scope || justification.trim().length < 40}>Send for review</button>
                </form>
              )}
            </Card>
          </div>

          <Card title="Review history" className="mt-4">
            {!d?.reviews?.length ? (
              <EmptyState icon={ShieldCheck} title="No reviews yet" body="Requests and decisions for this app appear here." />
            ) : (
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Scope</th><th className={thCls}>Status</th><th className={thCls}>Reviewer note</th><th className={thCls}>Requested</th><th className={thCls} /></tr></thead>
                <tbody>
                  {d.reviews.map((r: any) => (
                    <tr key={r.id}>
                      <td className={tdCls}><code className="dc-code">{r.scope}</code></td>
                      <td className={tdCls}><Pill tone={REVIEW_TONE[r.status] || 'gray'}>{r.status}</Pill></td>
                      <td className={tdCls}>{r.adminNote || '-'}</td>
                      <td className={tdCls}>{fmtDate(r.createdAt)}</td>
                      <td className={tdCls}>{r.status === 'pending' && <button className={btn.secondary} onClick={() => withdraw.mutate(r.id)}>Withdraw</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Webhook verification + lifecycle callbacks (/developer/callbacks)    */
/* ------------------------------------------------------------------ */

export function CallbacksPage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const hooks = usePfQuery<any[]>(['hooks', appId], appId ? `/api/developer/platform/apps/${appId}/webhooks` : null);
  const cb = usePfQuery<any>(['callbacks', appId], appId ? `/api/developer/platform/apps/${appId}/callbacks` : null);
  const reqs = usePfQuery<any[]>(['deletions', appId], appId ? `/api/developer/platform/apps/${appId}/data-deletion-requests` : null);
  const [deauth, setDeauth] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const verify = usePfMutation<string>('POST', (id) => `/api/developer/platform/apps/${appId}/webhooks/${id}/verify`, {
    invalidate: [['hooks', appId]],
    bodyFor: () => ({}),
    success: (o: any) => (o.state === 'verified' ? 'Endpoint verified' : `Verification failed: ${o.error || 'no reply'}`),
  });
  const save = usePfMutation<any>('PUT', () => `/api/developer/platform/apps/${appId}/callbacks`, { invalidate: [['callbacks', appId]], success: 'Callback URLs saved', onDone: () => { setDeauth(null); setDel(null); } });
  const test = usePfMutation<'deauthorize' | 'data_deletion'>('POST', () => `/api/developer/platform/apps/${appId}/callbacks/test`, {
    bodyFor: (k) => ({ kind: k }),
    onDone: (o: any) => setTestResult(o.ok ? `OK - your endpoint answered HTTP ${o.status}` : `Failed: ${o.error || `HTTP ${o.status}`}`),
  });
  const dv = deauth ?? cb.data?.deauthorizeUrl ?? '';
  const dd = del ?? cb.data?.dataDeletionUrl ?? '';

  return (
    <ConsolePage
      group="Developer Tools"
      title="Webhook Verification & Callbacks"
      description="Prove you own each webhook endpoint, and handle people removing your app or asking you to delete their data."
      actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}
    >
      {apps.length === 0 ? (
        <NoAppsState what="callbacks" />
      ) : (
        <>
          <Card title="Webhook endpoint verification" description="New endpoints receive a signed webhook.challenge and must echo the value before real events are delivered.">
            {hooks.isLoading ? <LoadingRows rows={2} /> : hooks.isError ? <ErrorCard message={(hooks.error as Error)?.message} onRetry={() => hooks.refetch()} /> : !hooks.data?.length ? (
              <EmptyState icon={Link2} title="No webhooks" body="Create a webhook under Webhooks. It is verified automatically, and you can re-run the check here." />
            ) : (
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Endpoint</th><th className={thCls}>State</th><th className={thCls}>Detail</th><th className={thCls} /></tr></thead>
                <tbody>
                  {hooks.data.map((h) => (
                    <tr key={h.id}>
                      <td className={tdCls}><code className="dc-code break-all">{h.endpointUrl}</code></td>
                      <td className={tdCls}><Pill tone={HOOK_TONE[h.verificationState] || 'gray'}>{h.verificationState === 'legacy' ? 'Not required (created before verification)' : h.verificationState}</Pill></td>
                      <td className={tdCls}>{h.verifiedAt ? `Verified ${fmtDate(h.verifiedAt)}` : h.challengeError || (h.challengeAttemptedAt ? '-' : 'Check queued')}</td>
                      <td className={tdCls}><button className={btn.secondary} disabled={verify.isPending} onClick={() => verify.mutate(h.id)}>Verify now</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <pre className="dc-code mt-3 overflow-x-auto whitespace-pre text-[11px]">{`// Express: answer the challenge, then verify X-Wevsoft-Signature as usual
app.post('/wevsoft/webhook', express.json(), (req, res) => {
  if (req.body.type === 'webhook.challenge') return res.json({ challenge: req.body.data.challenge });
  // ...handle real events
});`}</pre>
          </Card>

          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
            <Card title="Lifecycle callbacks" description="Called with a signed_request (HMAC-SHA256 with your client secret).">
              {cb.isLoading ? <LoadingRows rows={2} /> : (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ deauthorizeUrl: dv, dataDeletionUrl: dd }); }}>
                  <div>
                    <label className={labelCls} htmlFor="cb-deauth">Deauthorize callback URL</label>
                    <input id="cb-deauth" className={inputCls} placeholder="https://example.com/wevsoft/deauthorize" value={dv} onChange={(e) => setDeauth(e.target.value)} />
                    <p className="mt-1 text-[11px] text-[var(--dc-muted)]">Called when a person removes your app from their account.</p>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cb-del">Data deletion callback URL</label>
                    <input id="cb-del" className={inputCls} placeholder="https://example.com/wevsoft/delete" value={dd} onChange={(e) => setDel(e.target.value)} />
                    <p className="mt-1 text-[11px] text-[var(--dc-muted)]">Called when a person asks you to delete their data. Confirm later with POST /api/oauth/data-deletion/&#123;code&#125;/complete.</p>
                  </div>
                  {cb.data && !cb.data.canSign && <InfoNote>This app has no recoverable client secret, so callbacks cannot be signed. Rotate the client secret first.</InfoNote>}
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className={btn.primary} disabled={save.isPending}>Save</button>
                    <button type="button" className={btn.secondary} disabled={test.isPending || !cb.data?.deauthorizeUrl} onClick={() => test.mutate('deauthorize')}>Send test deauthorize</button>
                    <button type="button" className={btn.secondary} disabled={test.isPending || !cb.data?.dataDeletionUrl} onClick={() => test.mutate('data_deletion')}>Send test deletion</button>
                  </div>
                  {testResult && <p className="text-[12px]" role="status">{testResult}</p>}
                </form>
              )}
            </Card>

            <Card title="Data deletion requests" description="People who asked this app to delete their data.">
              {reqs.isLoading ? <LoadingRows rows={2} /> : !reqs.data?.length ? (
                <EmptyState icon={Trash2} title="No requests" body="Requests appear here with the confirmation code you must report back." />
              ) : (
                <table className="w-full text-left">
                  <thead><tr><th className={thCls}>Code</th><th className={thCls}>State</th><th className={thCls}>When</th></tr></thead>
                  <tbody>
                    {reqs.data.map((r) => (
                      <tr key={r.id}>
                        <td className={tdCls}><code className="dc-code">{r.confirmationCode}</code></td>
                        <td className={tdCls}><Pill tone={r.status === 'completed' ? 'green' : r.status === 'pending' ? 'amber' : 'red'}>{r.status.replace('_', ' ')}</Pill>{r.error && <div className="text-[11px] text-[var(--dc-muted)]">{r.error}</div>}</td>
                        <td className={tdCls}>{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* OpenID Connect (/developer/oidc)                                     */
/* ------------------------------------------------------------------ */

export function OpenIdConnectPage() {
  const conf = usePfQuery<any>(['oidc-conf'], '/api/.well-known/openid-configuration');
  const jwks = usePfQuery<any>(['oidc-jwks'], '/api/oauth/jwks');
  const c = conf.data;
  return (
    <ConsolePage group="Developer Tools" title="OpenID Connect" description="Sign people in with a standard id_token. Add the openid scope to your app, then verify the token with our published keys.">
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Fingerprint} label="Signing algorithm" value={c?.id_token_signing_alg_values_supported?.[0] || '-'} hint="Asymmetric: verify with the JWKS" tone="gray" />
        <StatTile icon={KeyRound} label="Published keys" value={jwks.data?.keys?.length ?? '-'} hint="Rotated keys stay listed until they expire" />
        <StatTile icon={ShieldCheck} label="PKCE" value={c?.code_challenge_methods_supported?.join(', ') || '-'} hint="Required for public clients" tone="green" />
      </div>
      <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
        <Card title="Endpoints" description="Everything an OIDC library needs is in the discovery document.">
          {conf.isLoading ? <LoadingRows rows={4} /> : conf.isError ? <ErrorCard message={(conf.error as Error)?.message} onRetry={() => conf.refetch()} /> : (
            <ul className="space-y-2 text-[12px]">
              {['issuer', 'authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri'].map((k) => (
                <li key={k}><span className="text-[var(--dc-muted)]">{k}</span><br /><code className="dc-code break-all">{c[k]}</code></li>
              ))}
              <li><span className="text-[var(--dc-muted)]">Discovery</span><br /><code className="dc-code break-all">{`${window.location.origin}/api/.well-known/openid-configuration`}</code></li>
              <li><span className="text-[var(--dc-muted)]">Claims</span><br />{(c.claims_supported || []).join(', ')}</li>
            </ul>
          )}
        </Card>
        <Card title="Verify an id_token" description="Node example using the jose library.">
          <pre className="dc-code overflow-x-auto whitespace-pre text-[11px]">{`import { createRemoteJWKSet, jwtVerify } from 'jose';
const jwks = createRemoteJWKSet(new URL('${c?.jwks_uri || '<jwks_uri>'}'));
const { payload } = await jwtVerify(idToken, jwks, {
  issuer: '${c?.issuer || '<issuer>'}',
  audience: process.env.WEVSOFT_CLIENT_ID,
});
if (payload.nonce !== expectedNonce) throw new Error('nonce mismatch');`}</pre>
          <InfoNote className="mt-3">Send <code className="dc-code">scope=openid profile email</code> and a random <code className="dc-code">nonce</code> to the authorization endpoint. Without <code className="dc-code">email</code> the token carries no email claim. <code className="dc-code">at_hash</code> binds the id_token to the access token.</InfoNote>
        </Card>
      </div>
    </ConsolePage>
  );
}
