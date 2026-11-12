import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowRight, CheckCircle2, KeyRound, Link2, Loader2, Lock, Plus, RefreshCw, Server, ShieldCheck, Smartphone, Trash2, UserCheck,
} from 'lucide-react';
import api from '../../../../lib/api';
import { DEV_KEYS, OAUTH_SCOPES, useDeveloperFeatures, appOrigin, parseRedirectUris, redirectUriError, type DeveloperApp } from '../../devApi';
import { AppAvatar, ConfirmDialog, Modal, cx } from '../../devUi';
import { useDevAccount } from '../accountContext';
import { useConsoleApp } from '../DeveloperConsoleShell';
import { envLabel, useConsoleWebhooks } from '../consoleData';
import {
  AppSelect, Card, CodeBox, ConsolePage, CopyInline, EmptyState, InfoNote, KV, LoadingRows, NoAppsState, NotConfigured, Pill, SecretField, StatTile, Toggle,
  appScopes, btn, fmtDate, inputCls, tdCls, thCls,
} from '../ui';

function useUpdateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => (await api.put(`/api/developer/apps/${id}`, data)).data as DeveloperApp,
    onSuccess: (updated) => {
      queryClient.setQueryData(DEV_KEYS.app(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
    },
  });
}

/** Remembers the app picked on app-scoped pages (defaults to the first app). */
function usePickedApp(apps: DeveloperApp[]) {
  // Follows the app in the URL / the top-bar app switcher.
  const c = useConsoleApp();
  const app = (c.app && apps.find((a) => a.id === c.app!.id)) || apps[0] || null;
  return { app, id: app?.id || '', setId: c.setAppId };
}

/* ------------------------------------------------------------------ */
/* OAuth 2.0 (/developer/oauth)                                        */
/* ------------------------------------------------------------------ */

export function OAuthOverviewPage() {
  const { apps, registered } = useDevAccount();
  const origin = appOrigin();
  const endpoints = [
    { label: 'Authorization endpoint', method: 'GET', url: `${origin}/oauth/authorize`, note: 'Open in the browser' },
    { label: 'Token endpoint', method: 'POST', url: `${origin}/api/oauth/token`, note: 'Call from your server' },
    { label: 'UserInfo endpoint', method: 'GET', url: `${origin}/api/oauth/userinfo`, note: 'Bearer access token' },
  ];
  const configured = apps.filter((a) => parseRedirectUris(a).length > 0).length;
  return (
    <ConsolePage
      group="Authentication & Security"
      title="OAuth 2.0"
      description="Sign in with Wevsoft uses the standard OAuth 2.0 authorization code flow, with PKCE for mobile and single-page apps."
      requiresAccount={false}
      actions={<Link to="/developer/docs" className={btn.secondary}>Full guide</Link>}
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={KeyRound} label="OAuth clients" value={registered ? apps.length : '—'} hint="One per application" />
        <StatTile icon={Link2} label="Clients with redirect URIs" value={registered ? configured : '—'} hint="Required before people can sign in" tone="green" />
        <StatTile icon={ShieldCheck} label="Supported grants" value={<span className="text-[14px]">authorization_code, refresh_token</span>} hint="PKCE S256, revoke & introspect" tone="gray" />
      </div>
      <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Endpoints">
          <ul className="divide-y divide-[var(--dc-border)]">
            {endpoints.map((e) => (
              <li key={e.label} className="py-[10px] flex flex-wrap items-center gap-x-3 gap-y-1">
                <Pill tone={e.method === 'GET' ? 'green' : 'blue'} className="w-[44px] justify-center">{e.method}</Pill>
                <span className="text-[12px] font-semibold w-[170px]">{e.label}</span>
                <CopyInline value={e.url} label="Endpoint copied" className="flex-1 min-w-[220px]" />
                <span className="text-[10.5px] text-[var(--dc-muted)]">{e.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] font-semibold">Authorization request</p>
          <CodeBox
            className="mt-2"
            code={`${origin}/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Foauth%2Fcallback
  &scope=profile%20email
  &state=RANDOM_STATE
  &code_challenge=BASE64URL_SHA256_OF_VERIFIER   # PKCE (optional for servers)
  &code_challenge_method=S256`}
          />
        </Card>
        <Card title="The flow">
          <ol className="space-y-3">
            {[
              { icon: KeyRound, t: 'Authorize', d: 'Redirect the person to /oauth/authorize with your client ID, redirect URI and scopes.' },
              { icon: UserCheck, t: 'Approve', d: 'They review the consent screen and approve the permissions.' },
              { icon: ArrowRight, t: 'Callback', d: 'Wevsoft redirects back with ?code and your state.' },
              { icon: Server, t: 'Exchange', d: 'POST the code to /api/oauth/token from your server (or with PKCE).' },
              { icon: Smartphone, t: 'Call APIs', d: 'Use the access token as a Bearer token, e.g. /api/oauth/userinfo.' },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-[10px]">
                <span className="w-[24px] h-[24px] rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center shrink-0 text-[11px] font-bold">{i + 1}</span>
                <span>
                  <span className="block text-[12px] font-semibold">{s.t}</span>
                  <span className="block text-[11px] text-[var(--dc-muted)]">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/developer/oauth/clients" className={cx(btn.primary, btn.sm)}>Manage clients</Link>
            <Link to="/developer/api-explorer" className={cx(btn.secondary, btn.sm)}>Try the API</Link>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* OAuth Clients (/developer/oauth/clients)                            */
/* ------------------------------------------------------------------ */

function RedirectUriEditor({ app }: { app: DeveloperApp }) {
  const saved = useMemo(() => parseRedirectUris(app), [app]);
  const [uris, setUris] = useState<string[]>(saved);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const update = useUpdateApp();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setUris(saved), [saved]);
  const dirty = JSON.stringify(uris) !== JSON.stringify(saved);

  const add = () => {
    const v = draft.trim();
    const e = redirectUriError(v);
    if (e) return setErr(e);
    if (uris.includes(v)) return setErr('That URI is already in the list');
    if (uris.length >= 20) return setErr('You can add up to 20 redirect URIs');
    setUris((u) => [...u, v]);
    setDraft('');
    setErr(null);
  };

  return (
    <div>
      {uris.length === 0 ? (
        <p className="text-[11.5px] text-[var(--dc-muted)]">No redirect URIs yet. People can't sign in until you add one.</p>
      ) : (
        <ul className="space-y-[6px]">
          {uris.map((u) => (
            <li key={u} className="flex items-center gap-2 rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-card-2)] px-[10px] h-[32px]">
              <span className="dc-code text-[11.5px] truncate flex-1">{u}</span>
              {u.startsWith('http://') && <Pill tone="amber">http</Pill>}
              <button type="button" aria-label={`Remove ${u}`} onClick={() => setUris((x) => x.filter((y) => y !== u))} className="text-[var(--dc-muted)] hover:text-[var(--dc-red)]">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="https://yourapp.com/oauth/callback"
          className={cx(inputCls, '!h-[32px]')}
          aria-label="New redirect URI"
        />
        <button type="button" onClick={add} className={cx(btn.secondary, '!h-[32px]')}>
          <Plus size={13} /> Add
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] text-[var(--dc-red)]">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate(
              { id: app.id, data: { redirectUris: uris } },
              { onSuccess: () => toast.success('Redirect URIs saved'), onError: (e: Error) => toast.error(e?.message || 'Could not save') },
            )
          }
          className={cx(btn.primary, btn.sm)}
        >
          {update.isPending && <Loader2 size={12} className="animate-spin" />} Save changes
        </button>
        {dirty && (
          <button type="button" onClick={() => setUris(saved)} className={cx(btn.secondary, btn.sm)}>
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

export function OAuthClientsPage() {
  const { apps, appsQuery } = useDevAccount();
  return (
    <ConsolePage group="Authentication & Security" title="OAuth Clients" description="Client IDs and redirect URIs for each of your applications.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={3} />
      ) : apps.length === 0 ? (
        <NoAppsState what="OAuth clients" />
      ) : (
        <div className="space-y-4">
          {apps.map((a) => (
            <Card
              key={a.id}
              title={
                <>
                  <AppAvatar name={a.name} logoUrl={a.logoUrl} size="sm" className="!w-[24px] !h-[24px] !rounded-[5px] !text-[9px]" /> {a.name}
                  <Pill tone={a.mode === 'production' ? 'green' : 'blue'}>{envLabel(a)}</Pill>
                </>
              }
              action={<Link to={`/developer/apps/${a.id}/oauth`} className={cx(btn.secondary, btn.sm)}>Open in app</Link>}
            >
              <div className="grid gap-5 min-[1000px]:grid-cols-[300px_minmax(0,1fr)]">
                <div>
                  <KV label="Client ID"><CopyInline value={a.clientId} label="Client ID copied" /></KV>
                  <KV label="Client type">{parseRedirectUris(a).some((u) => !/^https?:/i.test(u)) ? 'Native / public' : 'Web / confidential'}</KV>
                  <KV label="Scopes">{['profile', ...appScopes(a).filter((s) => s !== 'profile')].join(', ')}</KV>
                  <KV label="Created">{fmtDate(a.createdAt)}</KV>
                </div>
                <div>
                  <p className="text-[11.5px] font-semibold text-[var(--dc-text-2)] mb-[6px]">Authorized redirect URIs</p>
                  <RedirectUriEditor app={a} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* API Keys & Secrets (/developer/credentials)                         */
/* ------------------------------------------------------------------ */

export function CredentialsPage() {
  const { apps, appsQuery } = useDevAccount();
  const queryClient = useQueryClient();
  const [rotateFor, setRotateFor] = useState<DeveloperApp | null>(null);
  const [fresh, setFresh] = useState<{ appId: string; secret: string } | null>(null);

  const rotate = useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/developer/apps/${id}/rotate-secret`)).data as { clientSecretRaw: string },
    onSuccess: (data, id) => {
      setFresh({ appId: id, secret: data.clientSecretRaw });
      setRotateFor(null);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.app(id) });
      toast.success('Client secret rotated');
    },
    onError: (e: Error) => toast.error(e?.message || 'Could not rotate the secret'),
  });

  return (
    <ConsolePage group="Authentication & Security" title="API Keys & Secrets" description="Client credentials used by your servers to exchange authorization codes for tokens.">
      <InfoNote className="mb-4">
        Keep client secrets on your server only. Rotating a secret immediately invalidates the old one; update your deployments right after.
      </InfoNote>
      {appsQuery.isLoading ? (
        <LoadingRows rows={3} />
      ) : apps.length === 0 ? (
        <NoAppsState what="API keys" />
      ) : (
        <Card bodyClassName="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className={thCls}>Application</th>
                  <th className={thCls}>Client ID</th>
                  <th className={thCls}>Client secret</th>
                  <th className={thCls}>Last changed</th>
                  <th className={cx(thCls, 'text-right')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  // Secrets are only ever returned once (on create / rotate); the list API never includes them.
                  const secret = fresh?.appId === a.id ? fresh.secret : null;
                  return (
                    <tr key={a.id}>
                      <td className={tdCls}>
                        <Link to={`/developer/apps/${a.id}/credentials`} className="font-semibold text-[var(--dc-text)] hover:text-[var(--dc-blue)]">{a.name}</Link>
                        <span className="block text-[10.5px] text-[var(--dc-muted)]">{envLabel(a)}</span>
                      </td>
                      <td className={cx(tdCls, 'w-[220px] max-w-[220px] overflow-hidden')}>
                        <CopyInline value={a.clientId} label="Client ID copied" className="w-full" />
                      </td>
                      <td className={cx(tdCls, 'max-w-[280px]')}>
                        {secret ? (
                          <SecretField value={secret} label="Client secret copied" />
                        ) : (
                          <span className="text-[11.5px] text-[var(--dc-faint)]" title="Client secrets are shown only once. Rotate to get a new one.">•••••••••••• <span className="text-[10.5px]">(hidden, rotate to reveal a new one)</span></span>
                        )}
                        {fresh?.appId === a.id && <span className="block mt-[2px] text-[10px] font-semibold text-[var(--dc-green)]">New secret — copy it now</span>}
                      </td>
                      <td className={tdCls}>{fmtDate(a.updatedAt)}</td>
                      <td className={cx(tdCls, 'text-right')}>
                        <button type="button" onClick={() => setRotateFor(a)} className={cx(btn.secondary, btn.sm)}>
                          <RefreshCw size={12} /> Rotate secret
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {apps.length > 0 && <ApiKeysCard apps={apps} />}
      <ConfirmDialog
        open={Boolean(rotateFor)}
        onClose={() => setRotateFor(null)}
        onConfirm={() => rotateFor && rotate.mutate(rotateFor.id)}
        title={`Rotate secret for ${rotateFor?.name || 'app'}?`}
        description="The current client secret stops working immediately. Any server using it will fail token exchanges until you deploy the new secret."
        confirmLabel="Rotate secret"
        busy={rotate.isPending}
      />
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Scopes & Permissions (/developer/scopes)                            */
/* ------------------------------------------------------------------ */

export function ScopesPage() {
  const { apps, appsQuery, registered } = useDevAccount();
  const { app, id, setId } = usePickedApp(apps);
  const saved = useMemo(() => (app ? appScopes(app) : []), [app]);
  const [scopes, setScopes] = useState<string[]>(saved);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setScopes(saved), [saved]);
  const update = useUpdateApp();
  const dirty = JSON.stringify([...scopes].sort()) !== JSON.stringify([...saved].sort());

  return (
    <ConsolePage group="Authentication & Security" title="Scopes & Permissions" description="Scopes decide what your app may access. Request only what you need — people see every scope on the consent screen." requiresAccount={false}>
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Available scopes" bodyClassName="!px-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Scope</th>
                <th className={thCls}>Consent screen text</th>
                <th className={thCls}>Access</th>
              </tr>
            </thead>
            <tbody>
              {OAUTH_SCOPES.map((s) => (
                <tr key={s.scope}>
                  <td className={tdCls}><code className="dc-code text-[11.5px] font-semibold text-[var(--dc-blue)]">{s.scope}</code></td>
                  <td className={tdCls}>
                    <span className="block font-medium text-[var(--dc-text)]">{s.title}</span>
                    <span className="block text-[11px] text-[var(--dc-muted)]">{s.description}</span>
                  </td>
                  <td className={tdCls}>{s.always ? <Pill tone="gray">Always granted</Pill> : s.scope.endsWith('.write') ? <Pill tone="amber">Write</Pill> : <Pill tone="green">Read</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 pt-3 text-[11px] text-[var(--dc-muted)]">
            An authorize request may only ask for scopes saved under “Requested by app”; anything else is rejected with <code className="dc-code">invalid_scope</code>.
            The <code className="dc-code">email</code> claim is returned by <code className="dc-code">/api/oauth/userinfo</code> only when that scope was granted.
            Apps in development (or not yet approved) can only be authorized by you and your team. API keys use the same scopes except <code className="dc-code">email</code>.
          </p>
        </Card>
        <Card title="Requested by app" action={registered && apps.length > 0 ? <AppSelect apps={apps} value={id} onChange={setId} /> : undefined}>
          {!registered ? (
            <EmptyState icon={Lock} title="Register to configure scopes" action={<Link to="/developer" className={btn.primary}>Register</Link>} />
          ) : appsQuery.isLoading ? (
            <LoadingRows />
          ) : !app ? (
            <NoAppsState what="scopes" />
          ) : (
            <>
              <ul className="space-y-[8px]">
                {OAUTH_SCOPES.map((s) => {
                  const on = s.always || scopes.includes(s.scope);
                  return (
                    <li key={s.scope} className="flex items-center gap-3 rounded-[6px] border border-[var(--dc-border)] px-[10px] py-[8px]">
                      <span className="min-w-0 flex-1">
                        <code className="dc-code text-[11.5px] font-semibold">{s.scope}</code>
                        <span className="block text-[10.5px] text-[var(--dc-muted)] truncate">{s.title}</span>
                      </span>
                      <Toggle
                        label={s.scope}
                        checked={on}
                        disabled={s.always}
                        onChange={(v) => setScopes((x) => (v ? [...x.filter((y) => y !== s.scope), s.scope] : x.filter((y) => y !== s.scope)))}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!dirty || update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: app.id, data: { requestedScopes: scopes } },
                      { onSuccess: () => toast.success('Scopes saved'), onError: (e: Error) => toast.error(e?.message || 'Could not save scopes') },
                    )
                  }
                  className={cx(btn.primary, btn.sm)}
                >
                  {update.isPending && <Loader2 size={12} className="animate-spin" />} Save scopes
                </button>
                {dirty && <button type="button" onClick={() => setScopes(saved)} className={cx(btn.secondary, btn.sm)}>Discard</button>}
              </div>
            </>
          )}
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Authorized Applications (/developer/authorized-apps)                */
/* ------------------------------------------------------------------ */

export function AuthorizedAppsPage() {
  return (
    <ConsolePage
      group="Authentication & Security"
      title="Authorized Applications"
      description="Third-party apps you have allowed to access your Wevsoft account with Sign in with Wevsoft."
      requiresAccount={false}
    >
      <AuthorizedAppsList />
      <div className="mt-4 grid gap-4 min-[900px]:grid-cols-2">
        <Card title="What apps can see">
          <ul className="space-y-2">
            {OAUTH_SCOPES.map((s) => (
              <li key={s.scope} className="flex items-start gap-2 text-[12px]">
                <CheckCircle2 size={14} className="text-[var(--dc-green)] mt-[1px] shrink-0" />
                <span>
                  <span className="font-semibold">{s.title}</span> <code className="dc-code text-[10.5px] text-[var(--dc-muted)]">{s.scope}</code>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Account security">
          <p className="text-[12px] text-[var(--dc-muted)]">Change your password, review sessions and turn on two-step verification from your account settings.</p>
          <Link to="/settings" className={cx(btn.secondary, 'mt-3')}>Open account settings</Link>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Security & Access (/developer/security)                             */
/* ------------------------------------------------------------------ */

interface Finding {
  level: 'high' | 'medium' | 'ok';
  app: DeveloperApp;
  title: string;
  fix: string;
  to: string;
}

export function SecurityPage() {
  const { apps, appsQuery } = useDevAccount();
  const hooks = useConsoleWebhooks(apps);

  const findings = useMemo(() => {
    const out: Finding[] = [];
    for (const a of apps) {
      const uris = parseRedirectUris(a);
      const prod = a.mode === 'production';
      if (uris.length === 0) out.push({ level: 'medium', app: a, title: 'No redirect URIs configured', fix: 'Add your callback URL.', to: `/developer/apps/${a.id}/oauth` });
      if (prod && uris.some((u) => u.startsWith('http://'))) out.push({ level: 'high', app: a, title: 'Plain http redirect URI in production', fix: 'Use https only.', to: `/developer/apps/${a.id}/oauth` });
      if (!a.privacyPolicyUrl) out.push({ level: 'medium', app: a, title: 'Missing privacy policy URL', fix: 'Required on the consent screen.', to: `/developer/apps/${a.id}/settings` });
      const writes = appScopes(a).filter((s) => s.endsWith('.write'));
      if (writes.length) out.push({ level: 'medium', app: a, title: `Requests write access (${writes.join(', ')})`, fix: 'Make sure your app needs it.', to: '/developer/scopes' });
    }
    for (const w of hooks.webhooks) {
      const a = apps.find((x) => x.id === w.appId);
      if (a && w.endpointUrl.startsWith('http://')) out.push({ level: 'high', app: a, title: `Webhook endpoint uses http (${w.endpointUrl})`, fix: 'Use an https endpoint.', to: '/developer/webhooks' });
    }
    return out;
  }, [apps, hooks.webhooks]);

  const high = findings.filter((f) => f.level === 'high').length;

  return (
    <ConsolePage group="Authentication & Security" title="Security & Access" description="Security checks computed from your app configuration, plus access controls.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : apps.length === 0 ? (
        <NoAppsState what="security settings" />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={high ? AlertTriangle : ShieldCheck} label="High-risk findings" value={high} tone={high ? 'red' : 'green'} />
            <StatTile icon={AlertTriangle} label="Recommendations" value={findings.length - high} tone="amber" />
            <StatTile icon={ShieldCheck} label="Applications checked" value={apps.length} tone="blue" />
          </div>
          <Card title="Findings" className="mt-4" bodyClassName="!px-0">
            {findings.length === 0 ? (
              <div className="px-4"><EmptyState icon={ShieldCheck} title="No issues found" body="Every application passes the configuration checks." /></div>
            ) : (
              <ul>
                {findings.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 px-[16px] py-[10px] border-t border-[var(--dc-border)]">
                    <Pill tone={f.level === 'high' ? 'red' : 'amber'}>{f.level === 'high' ? 'High' : 'Medium'}</Pill>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold truncate">{f.title}</span>
                      <span className="block text-[11px] text-[var(--dc-muted)]">{f.app.name} • {f.fix}</span>
                    </span>
                    <Link to={f.to} className={cx(btn.secondary, btn.sm)}>Fix</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="mt-4 grid gap-4 min-[900px]:grid-cols-2">
            <IpAllowlistCard apps={apps} />
            <Card title="Webhook signatures">
              <p className="text-[12px] text-[var(--dc-muted)]">
                Every delivery carries <code className="dc-code">X-Wevsoft-Signature</code> — an HMAC-SHA256 of <code className="dc-code">{'`${timestamp}.${body}`'}</code> using the
                endpoint's signing secret — and <code className="dc-code">X-Wevsoft-Timestamp</code>. Verify both before trusting a payload.
              </p>
              <Link to="/developer/api-reference#webhooks" className={cx(btn.secondary, btn.sm, 'mt-3')}>Verification guide</Link>
            </Card>
          </div>
        </>
      )}
    </ConsolePage>
  );
}




/* ------------------------------------------------------------------ */
/* Per-app API keys (scopes + expiry), used on /developer/credentials   */
/* ------------------------------------------------------------------ */

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  rotatedFromId?: string | null;
}

const API_KEY_SCOPE_OPTIONS = OAUTH_SCOPES.filter((s) => s.scope !== 'email');

/** Key that was replaced by a rotation and is living out its grace window. */
function rotatedAway(k: ApiKeyRow): boolean {
  return !k.revokedAt && currentKeyList.some((o) => o.rotatedFromId === k.id && !o.revokedAt);
}
let currentKeyList: ApiKeyRow[] = [];

const GRACE_OPTIONS = [
  { value: '0', label: 'No grace: revoke the old key now' },
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours (recommended)' },
  { value: '72', label: '3 days' },
  { value: '168', label: '7 days (maximum)' },
];

function keyState(k: ApiKeyRow): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (k.revokedAt) return { label: 'Revoked', tone: 'red' };
  if (k.expiresAt && new Date(k.expiresAt).getTime() <= Date.now()) return { label: 'Expired', tone: 'amber' };
  if (rotatedAway(k)) return { label: 'Rotating out', tone: 'amber' };
  return { label: 'Active', tone: 'green' };
}

export function ApiKeysCard({ apps, fixedAppId }: { apps: DeveloperApp[]; fixedAppId?: string }) {
  const queryClient = useQueryClient();
  const picked = usePickedApp(apps);
  const appId = fixedAppId || picked.id;
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeFor, setRevokeFor] = useState<ApiKeyRow | null>(null);
  const [rotateFor, setRotateFor] = useState<ApiKeyRow | null>(null);
  const [graceHours, setGraceHours] = useState<string>('24');
  const features = useDeveloperFeatures();
  const [created, setCreated] = useState<{ name: string; rawKey: string } | null>(null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(API_KEY_SCOPE_OPTIONS.map((s) => s.scope));
  const [expiry, setExpiry] = useState<string>('90');

  const keysKey = ['developerConsole', 'apiKeys', appId];
  const keys = useQuery<ApiKeyRow[]>({
    queryKey: keysKey,
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/api-keys`)).data,
    enabled: !!appId,
  });

  const create = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/developer/apps/${appId}/api-keys`, {
        name: name.trim(),
        scopes,
        expiresInDays: expiry === 'never' ? null : Number(expiry),
      })).data as ApiKeyRow & { rawKey: string },
    onSuccess: (data) => {
      setCreated({ name: data.name, rawKey: data.rawKey });
      setCreateOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: keysKey });
      toast.success('API key created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Could not create the API key'),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/developer/apps/${appId}/api-keys/${id}`)).data,
    onSuccess: () => {
      setRevokeFor(null);
      queryClient.invalidateQueries({ queryKey: keysKey });
      toast.success('API key revoked');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not revoke the key'),
  });

  const rotate = useMutation({
    mutationFn: async ({ id, grace }: { id: string; grace: number }) =>
      (await api.post(`/api/developer/apps/${appId}/api-keys/${id}/rotate`, { graceHours: grace })).data as ApiKeyRow & { rawKey: string; previous?: ApiKeyRow },
    onSuccess: (data) => {
      setCreated({ name: data.name, rawKey: data.rawKey });
      setRotateFor(null);
      queryClient.invalidateQueries({ queryKey: keysKey });
      toast.success(data.previous?.revokedAt ? 'Key rotated; the old key was revoked' : 'Key rotated; the old key keeps working until its grace window ends');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Could not rotate the key'),
  });
  currentKeyList = Array.isArray(keys.data) ? keys.data : [];

  const toggleScope = (scope: string) =>
    setScopes((cur) => (cur.includes(scope) ? cur.filter((s) => s !== scope) : [...cur, scope]));

  return (
    <Card
      title="API keys"
      description="Server-to-server keys for the developer API (messages, stories, media, posts). Keys act as you, are limited to their scopes and never work on account or admin endpoints."
      className="mt-4"
      action={
        <>
          {!fixedAppId && <AppSelect apps={apps} value={appId} onChange={picked.setId} />}
          <button type="button" className={cx(btn.primary, btn.sm)} onClick={() => setCreateOpen(true)}>
            <Plus size={12} /> New API key
          </button>
        </>
      }
      bodyClassName="!px-0"
    >
      {created && (
        <div className="mx-[16px] mb-3 p-3 rounded-[8px] border border-[var(--dc-green)]/30 bg-[var(--dc-green-soft)]">
          <p className="text-[12px] font-semibold text-[var(--dc-text)]">Copy “{created.name}” now. It will not be shown again.</p>
          <div className="mt-2"><SecretField value={created.rawKey} label="API key copied" /></div>
          <button type="button" className={cx(btn.ghost, btn.sm, 'mt-2')} onClick={() => setCreated(null)}>I have saved it</button>
        </div>
      )}
      {keys.isLoading ? (
        <div className="px-[16px]"><LoadingRows rows={2} /></div>
      ) : keys.isError ? (
        <p className="px-[16px] text-[12px] text-[var(--dc-red)]">Could not load API keys.</p>
      ) : !Array.isArray(keys.data) || !keys.data.length ? (
        <div className="px-[16px]"><EmptyState icon={KeyRound} title="No API keys yet" body="Create a key to call the developer API from your server." /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Key</th>
                <th className={thCls}>Scopes</th>
                <th className={thCls}>Expires</th>
                <th className={thCls}>Last used</th>
                <th className={thCls}>Status</th>
                <th className={cx(thCls, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.data.map((k) => {
                const st = keyState(k);
                return (
                  <tr key={k.id}>
                    <td className={tdCls}><span className="font-semibold text-[var(--dc-text)]">{k.name}</span><span className="block text-[10.5px] text-[var(--dc-muted)]">Created {fmtDate(k.createdAt)}</span></td>
                    <td className={cx(tdCls, 'font-mono')}>{k.prefix}</td>
                    <td className={tdCls}><div className="flex flex-wrap gap-1 max-w-[260px]">{(Array.isArray(k.scopes) ? k.scopes : []).map((sc) => <Pill key={sc} tone="blue">{sc}</Pill>)}</div></td>
                    <td className={tdCls}>{k.expiresAt ? fmtDate(k.expiresAt) : 'Never'}</td>
                    <td className={tdCls}>{k.lastUsedAt ? fmtDate(k.lastUsedAt, true) : 'Never'}</td>
                    <td className={tdCls}><Pill tone={st.tone}>{st.label}</Pill></td>
                    <td className={cx(tdCls, 'text-right')}>
                      {!k.revokedAt && features.keyRotation && st.label === 'Active' && (
                        <button type="button" className={cx(btn.secondary, btn.sm, 'mr-1.5')} onClick={() => { setGraceHours('24'); setRotateFor(k); }} data-testid="api-key-rotate">
                          <RefreshCw size={12} /> Rotate
                        </button>
                      )}
                      {!k.revokedAt && (
                        <button type="button" className={cx(btn.danger, btn.sm)} onClick={() => setRevokeFor(k)}>
                          <Trash2 size={12} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => !create.isPending && setCreateOpen(false)} labelledBy="new-key-title" className="sm:max-w-lg">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !scopes.length) return;
            create.mutate();
          }}
        >
          <h2 id="new-key-title" className="text-base font-semibold">New API key for {picked.app?.name}</h2>
          <label className="block mt-4">
            <span className="block text-[12px] font-semibold mb-1">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputCls} placeholder="e.g. Production server" />
          </label>
          <fieldset className="mt-4">
            <legend className="text-[12px] font-semibold mb-1">Scopes</legend>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {API_KEY_SCOPE_OPTIONS.map((s) => (
                <label key={s.scope} className="flex items-start gap-2 text-[12px] p-2 rounded-md border border-[var(--dc-border)] cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s.scope)} onChange={() => toggleScope(s.scope)} className="mt-0.5" />
                  <span><span className="font-mono font-semibold">{s.scope}</span><span className="block text-[11px] text-[var(--dc-muted)]">{s.title}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block mt-4">
            <span className="block text-[12px] font-semibold mb-1">Expiry</span>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls}>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="never">Never expires</option>
            </select>
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btn.secondary} onClick={() => setCreateOpen(false)} disabled={create.isPending}>Cancel</button>
            <button type="submit" className={btn.primary} disabled={create.isPending || !name.trim() || !scopes.length}>
              {create.isPending && <Loader2 size={13} className="animate-spin" />} Create key
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeFor)}
        onClose={() => setRevokeFor(null)}
        onConfirm={() => revokeFor && revoke.mutate(revokeFor.id)}
        title={`Revoke “${revokeFor?.name || ''}”?`}
        description="Requests using this key will be rejected immediately. This cannot be undone."
        confirmLabel="Revoke key"
        busy={revoke.isPending}
      />
      <Modal open={Boolean(rotateFor)} onClose={() => !rotate.isPending && setRotateFor(null)} labelledBy="rotate-key-title" className="sm:max-w-md">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (rotateFor) rotate.mutate({ id: rotateFor.id, grace: Number(graceHours) });
          }}
        >
          <h2 id="rotate-key-title" className="text-base font-semibold">Rotate {rotateFor?.name}</h2>
          <p className="mt-2 text-[12px] text-[var(--dc-muted)]">A new key with the same scopes is created and shown once. The old key keeps working during the grace window so you can deploy the new one without downtime.</p>
          <label className="block mt-4">
            <span className="block text-[12px] font-semibold mb-1">Grace window for the old key</span>
            <select value={graceHours} onChange={(e) => setGraceHours(e.target.value)} className={inputCls} data-testid="api-key-grace">
              {GRACE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btn.secondary} onClick={() => setRotateFor(null)} disabled={rotate.isPending}>Cancel</button>
            <button type="submit" className={btn.primary} disabled={rotate.isPending}>
              {rotate.isPending && <Loader2 size={13} className="animate-spin" />} Rotate key
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}


/* ------------------------------------------------------------------ */
/* IP allowlist (controlled, per selected app)                          */
/* ------------------------------------------------------------------ */

function safeJsonList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw.split(/[\s,]+/).filter(Boolean);
  }
}

const IP_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?:\/(?:3[0-2]|[12]?\d))?|[0-9a-fA-F:]+:[0-9a-fA-F:.]*(?:\/(?:12[0-8]|1[01]\d|\d?\d))?)$/;

export function IpAllowlistCard({ apps }: { apps: DeveloperApp[] }) {
  const queryClient = useQueryClient();
  const picked = usePickedApp(apps);
  const saved = useMemo(() => safeJsonList(picked.app?.ipAllowlist).join(', '), [picked.app?.ipAllowlist]);
  const [draft, setDraft] = useState<{ appId: string; value: string } | null>(null);
  const value = draft && draft.appId === picked.id ? draft.value : saved;
  const entries = value.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  const invalid = entries.filter((x) => !IP_RE.test(x));

  const save = useMutation({
    mutationFn: async () => (await api.put(`/api/developer/apps/${picked.id}/ip-allowlist`, { ipAllowlist: entries })).data as DeveloperApp,
    onSuccess: (updated) => {
      queryClient.setQueryData(DEV_KEYS.app(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      setDraft(null);
      toast.success(entries.length ? 'IP allowlist saved' : 'IP allowlist cleared');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not save the allowlist'),
  });

  return (
    <Card title="IP allowlist" action={<AppSelect apps={apps} value={picked.id} onChange={(id) => { picked.setId(id); setDraft(null); }} />}>
      <p className="text-[12px] text-[var(--dc-muted)] mb-2">
        When set, API-key and OAuth-token requests for this app are accepted only from these IPv4/IPv6 addresses or CIDR ranges. Leave empty to allow any address.
      </p>
      <label htmlFor="ip-allowlist-input" className="sr-only">Allowed IPs</label>
      <div className="flex gap-2">
        <input
          id="ip-allowlist-input"
          type="text"
          className={inputCls}
          placeholder="e.g. 203.0.113.10, 198.51.100.0/24"
          value={value}
          onChange={(e) => setDraft({ appId: picked.id, value: e.target.value })}
        />
        <button type="button" className={btn.secondary} disabled={save.isPending || invalid.length > 0 || value === saved} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 size={12} className="animate-spin" />} Save
        </button>
      </div>
      {invalid.length > 0 ? (
        <p className="mt-2 text-[11px] text-[var(--dc-red)]">Not a valid IP or CIDR: {invalid.join(', ')}</p>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--dc-muted)]">{entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : 'No restriction'} • Checked against the client IP as seen by the server (behind a proxy, configure trust proxy).</p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Authorized apps list (GET/DELETE /api/oauth/authorized-apps)         */
/* ------------------------------------------------------------------ */

interface AuthorizedAppRow {
  app: { id: string; name: string; logoUrl: string | null; privacyPolicyUrl: string | null };
  scopes: string[];
  authorizedAt: string;
  lastTokenAt: string;
}

function AuthorizedAppsList() {
  const queryClient = useQueryClient();
  const [revokeFor, setRevokeFor] = useState<AuthorizedAppRow | null>(null);
  const list = useQuery<AuthorizedAppRow[]>({
    queryKey: ['oauthAuthorizedApps'],
    queryFn: async () => (await api.get('/api/oauth/authorized-apps')).data,
  });
  const revoke = useMutation({
    mutationFn: async (appId: string) => (await api.delete(`/api/oauth/authorized-apps/${appId}`)).data,
    onSuccess: () => {
      setRevokeFor(null);
      queryClient.invalidateQueries({ queryKey: ['oauthAuthorizedApps'] });
      toast.success('Access revoked');
    },
    onError: () => toast.error('Could not revoke access'),
  });

  return (
    <Card title="Apps with access to your account" bodyClassName="!px-0">
      {list.isLoading ? (
        <div className="px-4"><LoadingRows rows={2} /></div>
      ) : list.isError ? (
        <p className="px-4 text-[12px] text-[var(--dc-red)]">Could not load authorized apps.</p>
      ) : !list.data?.length ? (
        <div className="px-4"><EmptyState icon={UserCheck} title="No apps have access" body="Apps you approve with Sign in with Wevsoft will appear here with their permissions." /></div>
      ) : (
        <ul>
          {list.data.map((row) => (
            <li key={row.app.id} className="flex items-center gap-3 px-[16px] py-[12px] border-t border-[var(--dc-border)]">
              <AppAvatar name={row.app.name} logoUrl={row.app.logoUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold truncate">{row.app.name}</span>
                <span className="block text-[11px] text-[var(--dc-muted)]">Authorized {fmtDate(row.authorizedAt)} • last token {fmtDate(row.lastTokenAt, true)}</span>
                <span className="mt-1 flex flex-wrap gap-1">{row.scopes.map((sc) => <Pill key={sc} tone="blue">{sc}</Pill>)}</span>
              </span>
              <button type="button" className={cx(btn.danger, btn.sm)} onClick={() => setRevokeFor(row)}>Revoke access</button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(revokeFor)}
        onClose={() => setRevokeFor(null)}
        onConfirm={() => revokeFor && revoke.mutate(revokeFor.app.id)}
        title={`Revoke access for ${revokeFor?.app.name || 'this app'}?`}
        description="All of its access and refresh tokens stop working immediately. The app will have to ask for permission again."
        confirmLabel="Revoke access"
        busy={revoke.isPending}
      />
    </Card>
  );
}
