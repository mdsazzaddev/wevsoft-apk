import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Fingerprint, KeyRound, Server, ShieldCheck, Smartphone } from 'lucide-react';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { cx } from '../../devUi';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';
import { pf, usePfMutation, usePfQuery } from '../platformApi';

const STATE_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = { active: 'green', disabled: 'gray', revoked: 'red', expired: 'amber' };
const API_SCOPES = ['profile', 'posts.read', 'posts.write', 'groups.read', 'events.read', 'livestream.read', 'marketplace.read', 'reels.read', 'search.read', 'insights.read', 'notifications.read', 'ads.read'];

function ScopeChecks({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {API_SCOPES.map((s) => (
        <label key={s} className="flex items-center gap-1 text-[12px]">
          <input type="checkbox" checked={value.includes(s)} onChange={(e) => onChange(e.target.checked ? [...value, s] : value.filter((x) => x !== s))} /> {s}
        </label>
      ))}
    </div>
  );
}

function NewSecret({ title, secret, onClose }: { title: string; secret: string; onClose: () => void }) {
  return (
    <InfoNote className="mb-3">
      <strong>{title}</strong> - copy it now, it is shown only once.
      <code className="dc-code mt-1 block break-all select-all">{secret}</code>
      <button className={`${btn.secondary} mt-2`} onClick={onClose}>I have copied it</button>
    </InfoNote>
  );
}

/* ------------------------------------------------------------------ */
/* Service accounts, staging keys, JWT keys (/developer/service-accounts) */
/* ------------------------------------------------------------------ */

export function ServiceAccountsPage() {
  const { apps, appId, setAppId } = useConsoleApp();
  const accounts = usePfQuery<any[]>(['sa', appId], appId ? `/api/developer/platform/apps/${appId}/service-accounts` : null);
  const creds = usePfQuery<any[]>(['creds', appId], appId ? `/api/developer/platform/apps/${appId}/credentials` : null);
  const jwtKeys = usePfQuery<any[]>(['jwtkeys', appId], appId ? `/api/developer/platform/apps/${appId}/jwt-keys` : null);
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);
  const [saName, setSaName] = useState('');
  const [saScopes, setSaScopes] = useState<string[]>(['profile']);
  const [stgName, setStgName] = useState('');
  const [stgScopes, setStgScopes] = useState<string[]>(['profile']);
  const [pem, setPem] = useState('');
  const [label, setLabel] = useState('');
  const inv = [['sa', appId], ['creds', appId], ['jwtkeys', appId]];

  const createSa = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/service-accounts`, { invalidate: inv, success: 'Service account created', onDone: () => setSaName('') });
  const patchSa = usePfMutation<{ id: string; status: string }>('PATCH', (v) => `/api/developer/platform/apps/${appId}/service-accounts/${v.id}`, { invalidate: inv, bodyFor: (v) => ({ status: v.status }), success: 'Updated' });
  const delSa = usePfMutation<string>('DELETE', (id) => `/api/developer/platform/apps/${appId}/service-accounts/${id}`, { invalidate: inv, success: 'Service account deleted and its credentials revoked' });
  const saKey = usePfMutation<string>('POST', (id) => `/api/developer/platform/apps/${appId}/service-accounts/${id}/keys`, { invalidate: inv, bodyFor: () => ({}), onDone: (o: any) => setSecret({ title: 'Service account key', value: o.rawKey }) });
  const stgKey = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/staging-keys`, { invalidate: inv, onDone: (o: any) => { setSecret({ title: 'Staging key', value: o.rawKey }); setStgName(''); } });
  const revoke = usePfMutation<string>('POST', (id) => `/api/developer/platform/apps/${appId}/credentials/${id}/revoke`, { invalidate: inv, bodyFor: () => ({}), success: 'Key revoked' });
  const addJwt = usePfMutation<any>('POST', () => `/api/developer/platform/apps/${appId}/jwt-keys`, { invalidate: inv, success: 'Public key registered', onDone: () => { setPem(''); setLabel(''); } });
  const delJwt = usePfMutation<string>('DELETE', (id) => `/api/developer/platform/apps/${appId}/jwt-keys/${id}`, { invalidate: inv, success: 'Public key revoked' });

  return (
    <ConsolePage
      group="Developer Tools"
      title="Service Accounts & Staging"
      description="Independent, individually revocable server identities; read-only staging keys; and public keys for the JWT bearer grant."
      actions={apps.length > 0 ? <AppSelect apps={apps} value={appId} onChange={setAppId} /> : undefined}
    >
      {apps.length === 0 ? (
        <NoAppsState what="service accounts" />
      ) : (
        <>
          {secret && <NewSecret title={secret.title} secret={secret.value} onClose={() => setSecret(null)} />}
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={Server} label="Service accounts" value={accounts.data?.filter((a) => a.status === 'active').length ?? '-'} hint="Max 10 per app" />
            <StatTile icon={KeyRound} label="Staging keys" value={creds.data?.filter((k) => k.env === 'staging' && !k.revokedAt).length ?? '-'} hint="Read-only, free-tier limits" tone="amber" />
            <StatTile icon={Fingerprint} label="JWT public keys" value={jwtKeys.data?.filter((k) => k.status === 'active').length ?? '-'} hint="For the jwt-bearer grant" tone="gray" />
          </div>

          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
            <Card title="Service accounts" description="Each account has its own scopes (never more than the app is approved for) and its own keys. Disabling one revokes its keys and tokens at once.">
              {accounts.isLoading ? <LoadingRows rows={2} /> : accounts.isError ? <ErrorCard message={(accounts.error as Error)?.message} onRetry={() => accounts.refetch()} /> : !accounts.data?.length ? (
                <EmptyState icon={Server} title="No service accounts" body="Create one for each backend job so you can revoke them independently." />
              ) : (
                <table className="w-full text-left">
                  <thead><tr><th className={thCls}>Name</th><th className={thCls}>State</th><th className={thCls}>Keys</th><th className={thCls} /></tr></thead>
                  <tbody>
                    {accounts.data.map((a) => (
                      <tr key={a.id}>
                        <td className={tdCls}><div className="font-medium">{a.name}</div><div className="text-[11px] text-[var(--dc-muted)]">{a.scopes.join(', ')}</div><div className="text-[11px] text-[var(--dc-muted)]">sub: <code className="dc-code">{a.subject}</code>{a.lastUsedAt ? ` - used ${fmtDate(a.lastUsedAt)}` : ''}</div></td>
                        <td className={tdCls}><Pill tone={STATE_TONE[a.status] || 'gray'}>{a.status}</Pill></td>
                        <td className={tdCls}>{a.activeKeys}</td>
                        <td className={tdCls}>
                          <div className="flex flex-wrap gap-1">
                            {a.status === 'active' && <button className={btn.secondary} onClick={() => saKey.mutate(a.id)}>New key</button>}
                            <button className={btn.secondary} onClick={() => patchSa.mutate({ id: a.id, status: a.status === 'active' ? 'disabled' : 'active' })}>{a.status === 'active' ? 'Disable' : 'Enable'}</button>
                            <button className={btn.secondary} onClick={() => { if (window.confirm(`Delete ${a.name} and revoke its credentials?`)) delSa.mutate(a.id); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <form className="mt-4 space-y-2 border-t border-[var(--dc-border)] pt-3" onSubmit={(e) => { e.preventDefault(); createSa.mutate({ name: saName, scopes: saScopes }); }}>
                <label className={labelCls} htmlFor="sa-name">New service account</label>
                <input id="sa-name" className={inputCls} placeholder="nightly-sync" maxLength={60} value={saName} onChange={(e) => setSaName(e.target.value)} required />
                <ScopeChecks value={saScopes} onChange={setSaScopes} />
                <button className={btn.primary} type="submit" disabled={createSa.isPending || !saName.trim() || !saScopes.length}>Create</button>
              </form>
            </Card>

            <Card title="Staging keys" description="Prefix wev_stg_. Read-only (writes return 403 staging_read_only, except /developer/sandbox seed and reset), 60 requests/minute in a separate bucket, responses labelled X-Wevsoft-Environment: staging.">
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); stgKey.mutate({ name: stgName, scopes: stgScopes }); }}>
                <input aria-label="Staging key name" className={inputCls} placeholder="ci-staging" maxLength={60} value={stgName} onChange={(e) => setStgName(e.target.value)} required />
                <ScopeChecks value={stgScopes} onChange={setStgScopes} />
                <button className={btn.primary} type="submit" disabled={stgKey.isPending || !stgName.trim()}>Create staging key</button>
              </form>
              <InfoNote className="mt-3">Staging shares your app's data; it is a safe way to build and test integrations without write access. Seed demo content with POST /developer/sandbox/seed.</InfoNote>
            </Card>
          </div>

          <Card title="All keys" description="Production, staging and service-account keys on this app." className="mt-4">
            {creds.isLoading ? <LoadingRows rows={3} /> : !creds.data?.length ? (
              <EmptyState icon={KeyRound} title="No keys" body="Create keys on the API keys page, or above." />
            ) : (
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Name</th><th className={thCls}>Environment</th><th className={thCls}>Owner</th><th className={thCls}>State</th><th className={thCls}>Last used</th><th className={thCls} /></tr></thead>
                <tbody>
                  {creds.data.map((k) => {
                    const state = k.revokedAt ? 'revoked' : k.expiresAt && new Date(k.expiresAt) < new Date() ? 'expired' : 'active';
                    return (
                      <tr key={k.id}>
                        <td className={tdCls}>{k.name}<div className="text-[11px] text-[var(--dc-muted)]"><code className="dc-code">{k.prefix}</code></div></td>
                        <td className={tdCls}><Pill tone={k.env === 'staging' ? 'amber' : 'blue'}>{k.env}</Pill></td>
                        <td className={tdCls}>{k.serviceAccountId ? (accounts.data?.find((a) => a.id === k.serviceAccountId)?.name || 'service account') : 'App'}</td>
                        <td className={tdCls}><Pill tone={STATE_TONE[state]}>{state}</Pill></td>
                        <td className={tdCls}>{k.lastUsedAt ? fmtDate(k.lastUsedAt) : 'never'}</td>
                        <td className={tdCls}>{state === 'active' && <button className={btn.secondary} onClick={() => revoke.mutate(k.id)}>Revoke</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="JWT bearer public keys" description="Sign a short-lived assertion with your private key and exchange it at the token endpoint. Only the public key is stored." className="mt-4">
            {jwtKeys.isLoading ? <LoadingRows rows={2} /> : !jwtKeys.data?.length ? (
              <EmptyState icon={Fingerprint} title="No public keys" body="Register an RSA (2048+ bit) or EC P-256 public key to use grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer." />
            ) : (
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Key ID</th><th className={thCls}>Alg</th><th className={thCls}>Label</th><th className={thCls}>State</th><th className={thCls}>Last used</th><th className={thCls} /></tr></thead>
                <tbody>
                  {jwtKeys.data.map((k) => (
                    <tr key={k.id}>
                      <td className={tdCls}><code className="dc-code">{k.kid}</code></td><td className={tdCls}>{k.alg}</td><td className={tdCls}>{k.label || '-'}</td>
                      <td className={tdCls}><Pill tone={STATE_TONE[k.status] || 'gray'}>{k.status}</Pill></td><td className={tdCls}>{k.lastUsedAt ? fmtDate(k.lastUsedAt) : 'never'}</td>
                      <td className={tdCls}>{k.status === 'active' && <button className={btn.secondary} onClick={() => delJwt.mutate(k.id)}>Revoke</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form className="mt-4 space-y-2 border-t border-[var(--dc-border)] pt-3" onSubmit={(e) => { e.preventDefault(); addJwt.mutate({ publicKeyPem: pem, label }); }}>
              <label className={labelCls} htmlFor="jwt-pem">Public key (PEM)</label>
              <textarea id="jwt-pem" className={`${inputCls} font-mono text-[11px]`} rows={5} placeholder="-----BEGIN PUBLIC KEY-----" value={pem} onChange={(e) => setPem(e.target.value)} required />
              <input aria-label="Key label" className={inputCls} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
              <button className={btn.primary} type="submit" disabled={addJwt.isPending || !pem.trim()}>Register public key</button>
            </form>
            <pre className="dc-code mt-3 overflow-x-auto whitespace-pre text-[11px]">{`// iss = client_id; sub = client_id (the app), "sa:<service account id>" or a person's user id
// aud = https://<host>/api/oauth/token ; exp <= 5 minutes ; jti unique per assertion
curl -X POST https://<host>/api/oauth/token \\
  -d grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer \\
  -d assertion=$SIGNED_JWT -d scope="profile posts.read"`}</pre>
          </Card>
        </>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Token debugger (/developer/token-debugger) — Meta Parity            */
/* ------------------------------------------------------------------ */

export function TokenDebuggerPage() {
  const [params] = useSearchParams();
  const queryToken = params.get('token') || params.get('access_token') || '';
  const [token, setToken] = useState(queryToken);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const runWithToken = async (tok: string) => {
    if (!tok.trim()) return;
    setBusy(true);
    setErr('');
    setOut(null);
    try {
      setOut(await pf('POST', '/api/developer/platform/token-debug', { token: tok.trim() }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (queryToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      runWithToken(queryToken);
    }
  }, [queryToken]);

  const rows: [string, any][] = out && out.type !== 'unknown'
    ? [
        ['Type', out.type],
        ['Kind', out.kind],
        ['Environment', out.environment],
        ['Status', out.status],
        ['App', out.app ? `${out.app.name} (${out.app.clientId})` : '-'],
        ['User', out.userId],
        ['Service account', out.serviceAccount ? `${out.serviceAccount.name}` : null],
        ['Name', out.name],
        ['Scopes', (out.scopes || []).join(', ')],
        ['Issued', out.issuedAt ? fmtDate(out.issuedAt) : null],
        ['Expires', out.expiresAt ? fmtDate(out.expiresAt) : null],
        ['Last used', out.lastUsedAt ? fmtDate(out.lastUsedAt) : null],
        ['Signature', out.signature],
      ]
    : [];

  return (
    <ConsolePage
      group="Developer Tools"
      title="Access Token Debugger"
      description="Inspect access tokens, refresh tokens, API keys, or id_tokens from your apps to verify validity, granted scopes, and expiration."
      requiresAccount={false}
      actions={
        <Link to="/developer/api-explorer" className={cx(btn.secondary, btn.sm)}>
          Open API Explorer
        </Link>
      }
    >
      <Card title="Token Inspector">
        <label className={labelCls} htmlFor="td-token">Access Token or API Key</label>
        <textarea
          id="td-token"
          className={`${inputCls} font-mono text-[11px]`}
          rows={4}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste access_token, spk_..., or wev_live_... to debug"
          spellCheck={false}
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              className={btn.primary}
              disabled={busy || !token.trim()}
              onClick={() => runWithToken(token)}
            >
              {busy ? 'Inspecting...' : 'Debug Token'}
            </button>
            {token.trim() && (
              <button
                type="button"
                onClick={() => {
                  setToken('');
                  setOut(null);
                  setErr('');
                }}
                className={cx(btn.secondary, btn.sm)}
              >
                Clear
              </button>
            )}
          </div>
          <span className="text-[11px] text-[var(--dc-muted)]">
            Tokens are inspected securely against the authorization server and never persisted in database logs.
          </span>
        </div>
      </Card>

      {err && <ErrorCard message={err} />}
      {out && out.type === 'unknown' && <InfoNote className="mt-4">{out.message}</InfoNote>}

      {out && out.type !== 'unknown' && (
        <Card
          title="Token Information"
          className="mt-4"
          description={out.active ? 'This credential is valid and active.' : 'This credential is expired or inactive.'}
          action={
            <div className="flex items-center gap-2">
              <Pill tone={out.active ? 'green' : 'red'}>{out.active ? 'Active' : out.status}</Pill>
              {out.active && (
                <Link
                  to={`/developer/api-explorer`}
                  className={cx(btn.primary, btn.sm, 'text-[11.5px]')}
                >
                  Try in API Explorer
                </Link>
              )}
            </div>
          }
        >
          <dl className="grid gap-x-6 gap-y-3 min-[700px]:grid-cols-2">
            {rows.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
              <div key={k} className="p-2 rounded-[6px] bg-[var(--dc-side)] border border-[var(--dc-border)]">
                <dt className="text-[10.5px] font-semibold text-[var(--dc-muted)] uppercase tracking-wider">{k}</dt>
                <dd className="text-[12.5px] font-mono text-[var(--dc-text)] break-all mt-0.5">{String(v)}</dd>
              </div>
            ))}
          </dl>

          {/* Meta Token Extension Architecture Guide */}
          <div className="mt-4 p-3 rounded-[8px] bg-[var(--dc-side)] border border-[var(--dc-border)] text-[12px] space-y-1">
            <span className="font-semibold text-[var(--dc-text)] block">Token Lifetime & Refresh Rules</span>
            <p className="text-[var(--dc-muted)]">
              Short-lived user tokens expire in 1 to 2 hours. Confidential server apps can exchange a valid authorization code or refresh token for a 60-day long-lived access token via <code className="dc-code">POST /api/oauth/token</code> with <code className="dc-code">grant_type=refresh_token</code>.
            </p>
          </div>

          {out.claims && (
            <div className="mt-4 space-y-1">
              <span className="text-[11px] font-semibold text-[var(--dc-faint)] uppercase tracking-wider">
                Decoded JWT Claims & Headers
              </span>
              <pre className="dc-code overflow-x-auto whitespace-pre text-[11px] p-3 rounded-[8px] bg-[var(--dc-side)] border border-[var(--dc-border)]">
                {JSON.stringify({ header: out.header, claims: out.claims }, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Device verification (/device) - where a person types the code        */
/* ------------------------------------------------------------------ */

export function DeviceVerificationPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('user_code') || '');
  const [info, setInfo] = useState<any>(null);
  const [result, setResult] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const lookup = async () => {
    setBusy(true);
    setErr('');
    setInfo(null);
    try {
      setInfo(await pf('GET', `/api/oauth/device/lookup?user_code=${encodeURIComponent(code)}`));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const decide = async (approve: boolean) => {
    setBusy(true);
    setErr('');
    try {
      const r: any = await pf('POST', '/api/oauth/device/decision', { user_code: code, approve });
      setResult(r.status === 'approved' ? 'Done. You can return to your device.' : 'Denied. The device was not signed in.');
      setInfo(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-full flex items-start sm:items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px] bg-card border border-border rounded-3xl shadow-xl p-7">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Smartphone className="w-4 h-4" /> Sign in on another device</div>
        <h1 className="mt-2 text-xl font-semibold">Enter the code shown on your device</h1>
        {result ? (
          <p role="status" className="mt-6 text-sm">{result}</p>
        ) : !info ? (
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
            <label className="text-xs text-muted-foreground" htmlFor="dv-code">Code</label>
            <input id="dv-code" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-2xl tracking-[0.3em] font-mono uppercase" placeholder="ABCD-EFGH" maxLength={9} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={busy || code.replace(/[^A-Za-z]/g, '').length !== 8} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">Continue</button>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm"><strong>{info.app.name}</strong> wants to sign in to your Wevsoft account on a device. Only approve if you started this on your own device.</p>
            <ul className="space-y-1 text-sm">
              {info.scopes.map((s: string) => <li key={s} className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> <code>{s}</code></li>)}
            </ul>
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => decide(false)} className="flex-1 rounded-xl border border-border py-3 font-semibold">Deny</button>
              <button disabled={busy} onClick={() => decide(true)} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-semibold">Approve</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
