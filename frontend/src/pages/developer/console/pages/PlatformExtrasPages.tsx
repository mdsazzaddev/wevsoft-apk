import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FlaskConical, Globe2, KeyRound, Loader2, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import api from '../../../../lib/api';
import { ConfirmDialog, cx } from '../../devUi';
import { useDevAccount } from '../accountContext';
import { useConsoleApp } from '../DeveloperConsoleShell';
import {
  AppSelect, Card, CodeBox, ConsolePage, CopyInline, EmptyState, ErrorCard, InfoNote, LoadingRows, NoAppsState, Pill, SecretField, Toggle,
  btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls,
} from '../ui';

function errMsg(e: unknown): string {
  const any = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return any?.response?.data?.message || any?.response?.data?.error || any?.message || 'Request failed';
}

/** Selected app, shared by the platform-extras pages. */
function useSelectedApp() {
  // Follows the app in the URL / the top-bar app switcher.
  const { apps, app, appId, setAppId } = useConsoleApp();
  return { apps, appId, setAppId, app: app || undefined };
}

/* ------------------------------------------------------------------ */
/* Test Users (/developer/test-users)                                  */
/* ------------------------------------------------------------------ */

interface TestUserRow {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  friends: number;
  following: number;
  followers: number;
  activeTokens: number;
}

export function TestUsersPage() {
  const { appsQuery } = useDevAccount();
  const { apps, appId, setAppId } = useSelectedApp();
  const qc = useQueryClient();
  const key = ['dev-test-users', appId];
  const list = useQuery({
    queryKey: key,
    enabled: Boolean(appId),
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/test-users`)).data as { mode: string; limit: number; data: TestUserRow[] },
  });
  const [count, setCount] = useState(3);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [relation, setRelation] = useState<'both' | 'friends' | 'follow'>('both');
  const [token, setToken] = useState<{ user: string; value: string; scope: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setSelected(new Set()); setToken(null); }, [appId]);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${appId}/test-users`, { count })).data,
    onSuccess: (d: { data: unknown[] }) => { toast.success(`Created ${d.data.length} test user(s)`); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const connect = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${appId}/test-users/connect`, { userIds: [...selected], relation })).data,
    onSuccess: (d: { friendshipsCreated: number; followsCreated: number }) => { toast.success(`${d.friendshipsCreated} friendships, ${d.followsCreated} follows created`); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const issue = useMutation({
    mutationFn: async (u: TestUserRow) => ({ u, d: (await api.post(`/api/developer/apps/${appId}/test-users/${u.id}/token`, {})).data }),
    onSuccess: ({ u, d }: { u: TestUserRow; d: { access_token: string; scope: string } }) => { setToken({ user: u.name, value: d.access_token, scope: d.scope }); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/developer/apps/${appId}/test-users/${id}`)).data,
    onSuccess: () => { toast.success('Test user deleted'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const removeAll = useMutation({
    mutationFn: async () => (await api.delete(`/api/developer/apps/${appId}/test-users`)).data,
    onSuccess: (d: { deleted: number; failed: string[] }) => {
      if (d.failed.length) toast.error(`${d.failed.length} could not be deleted`); else toast.success(`Deleted ${d.deleted} test user(s)`);
      setConfirmAll(false); setSelected(new Set()); refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const rows = list.data?.data || [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <ConsolePage
      group="Developer Tools"
      title="Test Users"
      description="Synthetic users that belong to one app. Use them to exercise OAuth-protected APIs without touching real accounts."
    >
      {appsQuery.isLoading ? <LoadingRows /> : !apps.length ? <NoAppsState what="test users" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <label className={labelCls}>Application</label>
              <AppSelect apps={apps} value={appId} onChange={setAppId} />
            </div>
            {list.data && <Pill tone={list.data.mode === 'development' ? 'blue' : 'amber'}>{list.data.mode === 'development' ? 'Development mode' : 'Production mode'}</Pill>}
          </div>
          {list.data && list.data.mode !== 'development' && (
            <InfoNote>Test users only work while the app is in Development mode. Their tokens are rejected in Production.</InfoNote>
          )}
          <InfoNote>
            Test users have no email, phone or password, cannot sign in to Wevsoft, and never appear in real people&apos;s search results or feeds.
            They can only call the API through access tokens issued here for this app.
          </InfoNote>

          <Card title="Create test users" description={`Up to ${list.data?.limit ?? 50} per app.`}>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelCls} htmlFor="tu-count">How many</label>
                <input id="tu-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={cx(inputCls, '!w-[100px]')} />
              </div>
              <button type="button" className={btn.primary} disabled={!appId || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create test users
              </button>
            </div>
          </Card>

          {token && (
            <Card title={`Access token for ${token.user}`} description={`Shown once. Valid for 24 hours. Scopes: ${token.scope}`} action={<button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => setToken(null)}>Done</button>}>
              <SecretField value={token.value} label="Token copied" />
            </Card>
          )}

          <Card
            title={`Test users${rows.length ? ` (${rows.length})` : ''}`}
            bodyClassName="!p-0"
            action={rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Relationship" value={relation} onChange={(e) => setRelation(e.target.value as typeof relation)} className={cx(selectCls, '!h-[26px] !w-auto !text-[11px]')}>
                  <option value="both">Friends + follow</option>
                  <option value="friends">Friends only</option>
                  <option value="follow">Follow only</option>
                </select>
                <button type="button" className={cx(btn.secondary, btn.sm)} disabled={selected.size < 2 || connect.isPending} onClick={() => connect.mutate()}>
                  <UserPlus size={12} /> Connect selected ({selected.size})
                </button>
                <button type="button" className={cx(btn.danger, btn.sm)} onClick={() => setConfirmAll(true)}>
                  <Trash2 size={12} /> Delete all
                </button>
              </div>
            )}
          >
            {list.isLoading ? <div className="p-4"><LoadingRows /></div> : list.isError ? <div className="p-4"><ErrorCard message={errMsg(list.error)} onRetry={() => list.refetch()} /></div> : !rows.length ? (
              <EmptyState icon={FlaskConical} title="No test users yet" body="Create a few, connect them, then issue a token to call the API as one of them." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thCls}><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                      <th className={thCls}>User</th>
                      <th className={thCls}>Friends</th>
                      <th className={thCls}>Following / Followers</th>
                      <th className={thCls}>Active tokens</th>
                      <th className={thCls}>Created</th>
                      <th className={thCls} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={tdCls}><input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                        <td className={tdCls}>
                          <div className="font-semibold text-[var(--dc-text)]">{r.name}</div>
                          <div className="dc-code text-[10.5px] text-[var(--dc-muted)]">@{r.username} · {r.id}</div>
                        </td>
                        <td className={tdCls}>{r.friends}</td>
                        <td className={tdCls}>{r.following} / {r.followers}</td>
                        <td className={tdCls}>{r.activeTokens}</td>
                        <td className={tdCls}>{fmtDate(r.createdAt, true)}</td>
                        <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                          <button type="button" className={cx(btn.secondary, btn.sm)} disabled={issue.isPending || list.data?.mode !== 'development'} onClick={() => issue.mutate(r)}>
                            <KeyRound size={12} /> Get token
                          </button>{' '}
                          <button type="button" className={cx(btn.danger, btn.sm)} aria-label={`Delete ${r.name}`} disabled={remove.isPending} onClick={() => remove.mutate(r.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
      <ConfirmDialog
        open={confirmAll}
        title="Delete all test users?"
        description="Every test user of this app, their posts, friendships, follows and tokens are deleted. This cannot be undone."
        confirmLabel="Delete all"
        busy={removeAll.isPending}
        onConfirm={() => removeAll.mutate()}
        onClose={() => setConfirmAll(false)}
      />
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Shared: domains + embed settings for an app                         */
/* ------------------------------------------------------------------ */

interface DomainRow {
  id: string;
  domain: string;
  verified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  createdAt: string;
  record: { type: 'TXT'; host: string; value: string };
}
interface DomainsPayload {
  mode: string;
  requireVerifiedDomain: boolean;
  embedOrigins: string[];
  unverifiedTargets: string[];
  data: DomainRow[];
}

function useDomains(appId: string) {
  return useQuery({
    queryKey: ['dev-domains', appId],
    enabled: Boolean(appId),
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/domains`)).data as DomainsPayload,
  });
}

/* ------------------------------------------------------------------ */
/* Embed Widgets (/developer/embed)                                    */
/* ------------------------------------------------------------------ */

type WidgetKind = 'share' | 'follow' | 'post' | 'chat' | 'onetap';
const WIDGETS: { id: WidgetKind; label: string; help: string }[] = [
  { id: 'share', label: 'Share button', help: 'Opens the Wevsoft share dialog for a URL.' },
  { id: 'follow', label: 'Follow button', help: 'Opens a Wevsoft window where the visitor confirms following a profile.' },
  { id: 'post', label: 'Embedded post', help: 'Shows one public post in an auto-sizing iframe.' },
  { id: 'chat', label: 'WevChat bubble', help: 'Floating chat button that opens your Space on Wevsoft.' },
  { id: 'onetap', label: 'One-Tap sign-in', help: 'Sign-in prompt that runs OAuth 2.0 + PKCE in a popup.' },
];

function esc(v: string) {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function EmbedWidgetsPage() {
  const { appsQuery } = useDevAccount();
  const { apps, appId, setAppId, app } = useSelectedApp();
  const qc = useQueryClient();
  const domains = useDomains(appId);
  const [originsText, setOriginsText] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (domains.data) setOriginsText(domains.data.embedOrigins.join('\n')); }, [domains.data]);
  const save = useMutation({
    mutationFn: async () => (await api.put(`/api/developer/apps/${appId}/embed-settings`, { embedOrigins: originsText.split(/\s+/).map((s) => s.trim()).filter(Boolean) })).data,
    onSuccess: () => { toast.success('Embed origins saved'); qc.invalidateQueries({ queryKey: ['dev-domains', appId] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const [kind, setKind] = useState<WidgetKind>('share');
  const [shareUrl, setShareUrl] = useState('https://example.com/article');
  const [username, setUsername] = useState('');
  const [postId, setPostId] = useState('');
  const [space, setSpace] = useState('');
  const [redirectUri, setRedirectUri] = useState('https://example.com/wevsoft-callback.html');
  const [scopes, setScopes] = useState('profile');

  const host = typeof window !== 'undefined' ? window.location.origin : '';
  const clientId = app?.clientId || 'YOUR_CLIENT_ID';
  const loader = `<script src="${host}/sdk/wevsoft.js" data-client-id="${esc(clientId)}" async></script>`;
  const snippet = (() => {
    switch (kind) {
      case 'share': return `<div data-wevsoft="share" data-href="${esc(shareUrl)}"></div>\n${loader}`;
      case 'follow': return `<div data-wevsoft="follow" data-username="${esc(username || 'username')}"></div>\n${loader}`;
      case 'post': return `<div data-wevsoft="post" data-post-id="${esc(postId || 'POST_ID')}" data-width="520"></div>\n${loader}`;
      case 'chat': return `<div data-wevsoft="chat" data-space="${esc(space || 'your-space-handle')}"></div>\n${loader}`;
      case 'onetap':
        return `${loader}
<script>
  window.addEventListener('load', async () => {
    try {
      const { code, codeVerifier, redirectUri } = await Wevsoft.oneTap({
        redirectUri: '${esc(redirectUri)}',
        scopes: ${JSON.stringify(scopes.split(/[\s,]+/).filter(Boolean))},
      });
      // Send code + codeVerifier to your server and exchange them at ${host}/api/oauth/token
      await fetch('/auth/wevsoft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier, redirectUri }) });
    } catch (e) { /* dismissed or blocked */ }
  });
</script>

<!-- ${esc(redirectUri)} (same origin, also registered as a redirect URI) -->
<script src="${host}/sdk/wevsoft.js" data-client-id="${esc(clientId)}"></script>
<script>Wevsoft.completeSignIn();</script>`;
    }
  })();

  return (
    <ConsolePage group="Developer Tools" title="Embed Widgets" description="Drop Wevsoft buttons, posts, chat and sign-in into your website with one script tag.">
      {appsQuery.isLoading ? <LoadingRows /> : !apps.length ? <NoAppsState what="embed widgets" /> : (
        <div className="space-y-4">
          <div className="min-w-[240px] max-w-[360px]">
            <label className={labelCls}>Application</label>
            <AppSelect apps={apps} value={appId} onChange={setAppId} />
          </div>
          <Card title="Allowed embed origins" description="Widgets only load on these exact origins (scheme + host + port). One per line. http is allowed for localhost only.">
            {domains.isLoading ? <LoadingRows rows={2} /> : domains.isError ? <ErrorCard message={errMsg(domains.error)} onRetry={() => domains.refetch()} /> : (
              <div className="space-y-3">
                <textarea aria-label="Allowed embed origins" value={originsText} onChange={(e) => setOriginsText(e.target.value)} rows={4} spellCheck={false} placeholder={'https://www.example.com\nhttp://localhost:5173'} className={cx(inputCls, '!h-auto py-2 dc-code !text-[11.5px] leading-[18px]')} />
                {domains.data?.requireVerifiedDomain && <InfoNote>This app requires verified domains: in Production, origins outside a verified domain are refused.</InfoNote>}
                <button type="button" className={btn.primary} disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save origins
                </button>
              </div>
            )}
          </Card>
          <div className="grid gap-4 min-[1200px]:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <Card title="Code generator">
              <div className="space-y-3">
                <div>
                  <label className={labelCls} htmlFor="wg-kind">Widget</label>
                  <select id="wg-kind" value={kind} onChange={(e) => setKind(e.target.value as WidgetKind)} className={selectCls}>
                    {WIDGETS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                  <p className="mt-1 text-[10.5px] text-[var(--dc-muted)]">{WIDGETS.find((w) => w.id === kind)?.help}</p>
                </div>
                {kind === 'share' && <div><label className={labelCls} htmlFor="wg-url">URL to share</label><input id="wg-url" value={shareUrl} onChange={(e) => setShareUrl(e.target.value)} className={inputCls} /></div>}
                {kind === 'follow' && <div><label className={labelCls} htmlFor="wg-user">Wevsoft username</label><input id="wg-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={inputCls} /></div>}
                {kind === 'post' && <div><label className={labelCls} htmlFor="wg-post">Public post ID</label><input id="wg-post" value={postId} onChange={(e) => setPostId(e.target.value)} placeholder="Post ID" className={cx(inputCls, 'dc-code')} /></div>}
                {kind === 'chat' && <div><label className={labelCls} htmlFor="wg-space">Space handle</label><input id="wg-space" value={space} onChange={(e) => setSpace(e.target.value)} placeholder="your-space" className={inputCls} /></div>}
                {kind === 'onetap' && (
                  <>
                    <div><label className={labelCls} htmlFor="wg-redirect">Callback page (redirect URI)</label><input id="wg-redirect" value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls} htmlFor="wg-scopes">Scopes</label><input id="wg-scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} className={inputCls} /></div>
                    <InfoNote>The callback page must be on the embedding site&apos;s origin and registered as a redirect URI of this app. The popup uses the normal Wevsoft consent screen; state and PKCE are checked in the browser and the code is exchanged on your server.</InfoNote>
                  </>
                )}
              </div>
            </Card>
            <div className="space-y-4 min-w-0">
              <Card title="Snippet"><CodeBox code={snippet} /></Card>
              <Card title="How it stays safe">
                <ul className="list-disc pl-5 space-y-1 text-[12px] text-[var(--dc-text-2)]">
                  <li>The loader asks Wevsoft for a short-lived signed embed token; the browser-set <code className="dc-code">Origin</code> header must be on your allowlist.</li>
                  <li>Widget windows only <code className="dc-code">postMessage</code> to the origin inside that token, and the loader only accepts messages from Wevsoft windows it opened.</li>
                  <li>Following and signing in always happen in a top-level Wevsoft window, never inside an iframe, so they cannot be clickjacked.</li>
                  <li>One-Tap checks <code className="dc-code">state</code> and uses PKCE S256; your client secret never reaches the browser.</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Domain Verification (/developer/domains)                            */
/* ------------------------------------------------------------------ */

export function DomainsPage() {
  const { appsQuery } = useDevAccount();
  const { apps, appId, setAppId } = useSelectedApp();
  const qc = useQueryClient();
  const domains = useDomains(appId);
  const [domain, setDomain] = useState('');
  const [removing, setRemoving] = useState<DomainRow | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-domains', appId] });

  const add = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${appId}/domains`, { domain })).data,
    onSuccess: () => { setDomain(''); toast.success('Domain added. Publish the TXT record, then verify.'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const verify = useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/developer/apps/${appId}/domains/${id}/verify`)).data as DomainRow,
    onSuccess: (d) => { if (d.verified) toast.success(`${d.domain} verified`); else toast.error(d.lastError || 'Not verified yet'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/developer/apps/${appId}/domains/${id}`)).data,
    onSuccess: () => { toast.success('Domain removed'); setRemoving(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const setRequire = useMutation({
    mutationFn: async (v: boolean) => (await api.put(`/api/developer/apps/${appId}/embed-settings`, { requireVerifiedDomain: v })).data,
    onSuccess: () => refresh(),
    onError: (e) => toast.error(errMsg(e)),
  });

  const d = domains.data;
  return (
    <ConsolePage group="Authentication & Security" title="Domain Verification" description="Prove you own the domains your app redirects to and embeds on, with a DNS TXT record.">
      {appsQuery.isLoading ? <LoadingRows /> : !apps.length ? <NoAppsState what="domain verification" /> : (
        <div className="space-y-4">
          <div className="min-w-[240px] max-w-[360px]">
            <label className={labelCls}>Application</label>
            <AppSelect apps={apps} value={appId} onChange={setAppId} />
          </div>
          {domains.isLoading ? <LoadingRows /> : domains.isError ? <ErrorCard message={errMsg(domains.error)} onRetry={() => domains.refetch()} /> : d && (
            <>
              <Card title="Require verified domains in Production" description="When on, a Production app can only use redirect URIs and embed origins on a verified domain or its subdomains. Native-app custom schemes are not affected.">
                <div className="space-y-3">
                  <Toggle checked={d.requireVerifiedDomain} disabled={setRequire.isPending} onChange={(v) => setRequire.mutate(v)} label="Require verified domain" />
                  {d.unverifiedTargets.length > 0 ? (
                    <InfoNote>
                      Not covered by a verified domain yet: {d.unverifiedTargets.map((t) => <code key={t} className="dc-code mr-1">{t}</code>)}
                    </InfoNote>
                  ) : (
                    <p className="text-[11.5px] text-[var(--dc-muted)]">Every redirect URI and embed origin is on a verified domain.</p>
                  )}
                </div>
              </Card>
              <Card title="Add a domain">
                <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (domain.trim()) add.mutate(); }}>
                  <div className="min-w-[260px]">
                    <label className={labelCls} htmlFor="dom-new">Domain</label>
                    <input id="dom-new" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputCls} />
                  </div>
                  <button type="submit" className={btn.primary} disabled={!domain.trim() || add.isPending}>
                    {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add domain
                  </button>
                </form>
              </Card>
              <Card title={`Domains${d.data.length ? ` (${d.data.length})` : ''}`} bodyClassName="!p-0">
                {!d.data.length ? (
                  <EmptyState icon={Globe2} title="No domains yet" body="Add the domain your website or redirect URIs live on." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className={thCls}>Domain</th>
                          <th className={thCls}>Status</th>
                          <th className={thCls}>TXT record</th>
                          <th className={thCls}>Last check</th>
                          <th className={thCls} />
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.map((row) => (
                          <tr key={row.id}>
                            <td className={cx(tdCls, 'font-semibold text-[var(--dc-text)]')}>{row.domain}</td>
                            <td className={tdCls}><Pill tone={row.verified ? 'green' : 'amber'}>{row.verified ? 'Verified' : 'Pending'}</Pill></td>
                            <td className={tdCls}>
                              <div className="text-[10.5px] text-[var(--dc-muted)]">Host</div>
                              <CopyInline value={row.record.host} />
                              <div className="mt-1 text-[10.5px] text-[var(--dc-muted)]">Value</div>
                              <CopyInline value={row.record.value} />
                            </td>
                            <td className={tdCls}>
                              {row.lastCheckedAt ? fmtDate(row.lastCheckedAt, true) : 'Never'}
                              {row.lastError && !row.verified && <div className="mt-1 text-[11px] text-[var(--dc-red)] max-w-[260px]">{row.lastError}</div>}
                            </td>
                            <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                              <button type="button" className={cx(btn.secondary, btn.sm)} disabled={verify.isPending} onClick={() => verify.mutate(row.id)}>
                                <RefreshCw size={12} /> {row.verified ? 'Re-check' : 'Verify'}
                              </button>{' '}
                              <button type="button" className={cx(btn.danger, btn.sm)} aria-label={`Remove ${row.domain}`} onClick={() => setRemoving(row)}><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this domain?"
        description={<>Redirect URIs and embed origins on <b>{removing?.domain}</b> will stop counting as verified.</>}
        confirmLabel="Remove domain"
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </ConsolePage>
  );
}
