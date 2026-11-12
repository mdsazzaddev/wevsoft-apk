import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRightLeft, BookOpen, Building2, Contrast, Edit2, FileText, LifeBuoy, Loader2, Mail, Moon, Send, Shield, Sun, Terminal, Users } from 'lucide-react';
import api from '../../../../lib/api';
import { fetchMembers, type SpaceMember } from '../../../../lib/wevspaceApi';
import { useSpaceIdentities } from '../../../../lib/useSpaceIdentities';
import { useStore } from '../../../../store';
import { spaceDashboardPath } from '@wevsoft/shared/wevspace';
import { AppAvatar, ConfirmDialog, cx } from '../../devUi';
import { DEV_KEYS } from '../../devApi';
import { useDevAccount } from '../accountContext';
import { useConsole } from '../DeveloperConsoleShell';
import { CONSOLE_VERSION } from '../consoleData';
import { AppSelect, Card, ConsolePage, EmptyState, ErrorCard, InfoNote, KV, LoadingRows, NotConfigured, Pill, btn, fmtDate, inputCls, labelCls, selectCls, tdCls, thCls } from '../ui';

/* ------------------------------------------------------------------ */
/* Team & Access (/developer/team)                                     */
/* ------------------------------------------------------------------ */

export function TeamAccessPage() {
  const { isSpaceMode, active, loading } = useSpaceIdentities();
  const user = useStore((s) => s.user) as { name?: string; username?: string; email?: string; avatar?: string | null } | null;
  const { apps } = useDevAccount();
  const spaceId = isSpaceMode && active?.id ? active.id : null;
  const members = useQuery({
    queryKey: ['developerConsole', 'spaceMembers', spaceId],
    queryFn: async () => (await fetchMembers(spaceId!)).members,
    enabled: Boolean(spaceId),
    retry: 0,
  });
  const linked = spaceId ? apps.filter((a) => a.wevspaceId === spaceId) : [];

  return (
    <ConsolePage
      group="Platform & Account"
      title="Team & Access"
      description={spaceId ? `People who help run ${active?.name || 'this Space'} and its developer apps.` : 'Who can manage your developer account and apps.'}
      requiresAccount={false}
      actions={spaceId && active?.handle ? <Link to={spaceDashboardPath(active.handle, 'team')} className={btn.primary}><Users size={14} /> Manage team</Link> : undefined}
    >
      {loading ? (
        <LoadingRows rows={3} />
      ) : !spaceId ? (
        <div className="grid gap-4 min-[1000px]:grid-cols-[minmax(0,1fr)_340px]">
          <Card title="Members">
            <ul>
              <li className="flex items-center gap-3 py-[6px]">
                <AppAvatar name={user?.name || 'You'} logoUrl={user?.avatar || null} size="sm" className="!w-[32px] !h-[32px] !rounded-full !text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold">{user?.name || 'You'}</span>
                  <span className="block text-[11px] text-[var(--dc-muted)]">{user?.email || (user?.username ? `@${user.username}` : '')}</span>
                </span>
                <Pill tone="blue">Owner</Pill>
              </li>
            </ul>
          </Card>
          <DeveloperTeamCard />
          <Card title="Work as a team">
            <p className="text-[12px] text-[var(--dc-muted)]">WevSpaces have roles and per-member permissions. Apps created while acting as a Space you own are linked to it.</p>
            <Link to="/spaces" className={cx(btn.secondary, 'mt-3')}><Building2 size={13} /> Go to WevSpaces</Link>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
          <Card title={`${active?.name || 'Space'} team`} bodyClassName="!px-0">
            {members.isLoading ? (
              <div className="px-4"><LoadingRows /></div>
            ) : members.isError ? (
              <div className="px-4"><ErrorCard message={(members.error as Error)?.message} onRetry={() => members.refetch()} /></div>
            ) : (members.data || []).length === 0 ? (
              <div className="px-4"><EmptyState icon={Users} title="No members yet" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className={thCls}>Member</th>
                      <th className={thCls}>Role</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(members.data || []).map((m: SpaceMember) => (
                      <tr key={m.id}>
                        <td className={tdCls}>
                          <span className="flex items-center gap-[10px]">
                            <AppAvatar name={m.user.name} logoUrl={m.user.avatar} size="sm" className="!w-[28px] !h-[28px] !rounded-full !text-[9px]" />
                            <span>
                              <span className="block font-semibold text-[var(--dc-text)]">{m.user.name}</span>
                              {m.user.username && <span className="block text-[10.5px] text-[var(--dc-muted)]">@{m.user.username}</span>}
                            </span>
                          </span>
                        </td>
                        <td className={tdCls}><Pill tone={m.isOwner ? 'blue' : 'gray'}>{m.isOwner ? 'Owner' : m.role.charAt(0) + m.role.slice(1).toLowerCase()}</Pill></td>
                        <td className={tdCls}><Pill tone={m.status === 'ACTIVE' ? 'green' : 'amber'}>{m.status.toLowerCase()}</Pill></td>
                        <td className={tdCls}>{fmtDate(m.acceptedAt || m.invitedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Apps linked to this Space">
            {linked.length === 0 ? (
              <p className="text-[12px] text-[var(--dc-muted)]">No apps are linked to this Space yet. {active?.role === 'OWNER' ? 'Apps you create now will be linked.' : 'Only the Space owner can link apps.'}</p>
            ) : (
              <ul className="divide-y divide-[var(--dc-border)]">
                {linked.map((a) => (
                  <li key={a.id} className="py-[8px]"><Link to={`/developer/apps/${a.id}`} className="text-[12px] font-semibold hover:text-[var(--dc-blue)]">{a.name}</Link></li>
                ))}
              </ul>
            )}
            {active?.handle && (
              <Link to={spaceDashboardPath(active.handle, 'developer-console')} className={cx(btn.secondary, btn.sm, 'mt-3')}>Space developer console</Link>
            )}
          </Card>
        </div>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Developer Settings (/developer/settings)                            */
/* ------------------------------------------------------------------ */

export function DeveloperSettingsPage() {
  const { me, apps } = useDevAccount();
  const { themeMode, setThemeMode, selectedApp, selectApp } = useConsole();
  const account = me.data?.account;
  return (
    <ConsolePage group="Platform & Account" title="Developer Settings" description="Your developer account and console preferences.">
      <div className="grid gap-4 min-[1100px]:grid-cols-2">
        <Card title="Developer account">
          <KV label="Developer / company name">{account?.companyName || '—'}</KV>
          <KV label="Status"><Pill tone={account?.status === 'ACTIVE' ? 'green' : 'amber'}>{account?.status || '—'}</Pill></KV>
          <KV label="Member since">{fmtDate(account?.createdAt)}</KV>
          <KV label="Applications">{me.data?.appsCount ?? apps.length}</KV>
          <KV label="Account ID"><span className="dc-code text-[11px]">{account?.id || '—'}</span></KV>
          <DeveloperAccountForm account={account || null} />
          <Link to="/settings" className={cx(btn.secondary, btn.sm, 'mt-3')}>Account settings</Link>
        </Card>
        <Card title="Console preferences" description="Saved in this browser. The theme is shared with the WebSoft display mode on this device.">
          <div className="space-y-4">
            <div>
              <p className={labelCls}>Theme</p>
              <div className="inline-flex rounded-[6px] border border-[var(--dc-border-2)] overflow-hidden">
                {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['oled', Contrast, 'OLED']] as const).map(([m, Icon, label]) => (
                  <button key={m} type="button" onClick={() => setThemeMode(m)} aria-pressed={themeMode === m} className={cx('h-[30px] px-3 text-[12px] font-semibold flex items-center gap-1.5', themeMode === m ? 'bg-[var(--dc-blue)] text-white' : 'text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]')}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={labelCls}>Default application</p>
              {apps.length ? (
                <AppSelect apps={apps} value={selectedApp?.id || ''} onChange={selectApp} />
              ) : (
                <p className="text-[12px] text-[var(--dc-muted)]">Create an app to choose a default.</p>
              )}
              <p className="mt-1 text-[10.5px] text-[var(--dc-muted)]">Used by the app switcher in the top bar.</p>
            </div>
            <KV label="Console version">{CONSOLE_VERSION}</KV>
          </div>
        </Card>
      </div>
      <Card title="Notifications" className="mt-4">
        <p className="text-[12px] text-[var(--dc-muted)]">Developer alerts are delivered through your regular Wevsoft notifications.</p>
        <Link to="/notifications" className={cx(btn.secondary, btn.sm, 'mt-3')}>View notifications</Link>
      </Card>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* Support (/developer/support)                                        */
/* ------------------------------------------------------------------ */

const TOPICS = ['OAuth & sign-in', 'Credentials & secrets', 'Webhooks', 'App review & publishing', 'API errors', 'Billing & quotas', 'Other'];

export function DeveloperSupportPage() {
  const { apps, registered } = useDevAccount();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [appId, setAppId] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sentId, setSentId] = useState<string | null>(null);
  const app = apps.find((a) => a.id === (appId || apps[0]?.id));

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/v1/business/support/tickets', {
          subject: `[Developer] ${topic}: ${subject.trim()}`,
          description: `${details.trim()}\n\n---\nTopic: ${topic}${app ? `\nApp: ${app.name} (${app.clientId})` : ''}`,
          priority,
        })
      ).data as { id?: string },
    onSuccess: (t) => {
      setSentId(t?.id || 'sent');
      setSubject('');
      setDetails('');
      toast.success('Support request sent');
    },
    onError: (e: Error) => toast.error(e?.message || 'Could not send your request'),
  });

  const resources = [
    { icon: BookOpen, title: 'Documentation', body: 'Guides for OAuth, scopes and security.', to: '/developer/docs' },
    { icon: FileText, title: 'API Reference', body: 'Every endpoint with examples.', to: '/developer/api-reference' },
    { icon: Terminal, title: 'API Explorer', body: 'Send live requests.', to: '/developer/api-explorer' },
    { icon: LifeBuoy, title: 'Help center', body: 'General Wevsoft help and contact options.', to: '/support' },
  ];

  return (
    <ConsolePage group="Platform & Account" title="Support" description="Get help with building on Wevsoft." requiresAccount={false}>
      <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
        {resources.map((r) => (
          <Link key={r.title} to={r.to} className="dc-card p-[14px] flex items-start gap-3 hover:border-[var(--dc-blue)]/40 transition-colors">
            <span className="w-[32px] h-[32px] rounded-[8px] bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center shrink-0"><r.icon size={16} /></span>
            <span>
              <span className="block text-[12.5px] font-semibold">{r.title}</span>
              <span className="block text-[11px] text-[var(--dc-muted)]">{r.body}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
        <Card title={<><Mail size={15} className="text-[var(--dc-blue)]" /> Contact developer support</>} description="Creates a support ticket for the Wevsoft team.">
          {sentId ? (
            <div className="text-center py-6">
              <Send size={22} className="mx-auto text-[var(--dc-green)]" />
              <p className="mt-2 text-[13px] font-semibold">Request sent</p>
              <p className="text-[12px] text-[var(--dc-muted)]">We'll reply through your Wevsoft notifications.{sentId !== 'sent' && <> Ticket <code className="dc-code">{sentId}</code>.</>}</p>
              <button type="button" onClick={() => setSentId(null)} className={cx(btn.secondary, btn.sm, 'mt-3')}>Send another</button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (subject.trim() && details.trim() && !submit.isPending) submit.mutate();
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 min-[700px]:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="sup-topic">Topic</label>
                  <select id="sup-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={selectCls}>
                    {TOPICS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Application</label>
                  {registered && apps.length ? <AppSelect apps={apps} value={app?.id || ''} onChange={setAppId} className="w-full !h-[34px]" /> : <p className="h-[34px] flex items-center text-[12px] text-[var(--dc-muted)]">No apps</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="sup-priority">Priority</label>
                  <select id="sup-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="sup-subject">Subject</label>
                <input id="sup-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="Short summary of the problem" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="sup-details">Details</label>
                <textarea id="sup-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={6} placeholder="What did you try, what happened, and any error messages or request IDs." className={cx(inputCls, '!h-auto py-2')} />
              </div>
              <p className="text-[10.5px] text-[var(--dc-muted)]">Never include client secrets or access tokens.</p>
              <button type="submit" disabled={!subject.trim() || !details.trim() || submit.isPending} className={btn.primary}>
                {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send request
              </button>
            </form>
          )}
        </Card>
        <Card title="Before you write">
          <ul className="space-y-2 text-[12px] text-[var(--dc-text-2)]">
            <li>• Check <Link to="/developer/logs" className="text-[var(--dc-blue)] hover:underline">Logs &amp; Monitoring</Link> for webhook failures.</li>
            <li>• Run <Link to="/developer/security" className="text-[var(--dc-blue)] hover:underline">Security &amp; Access</Link> checks.</li>
            <li>• OAuth errors are explained in the <Link to="/developer/docs#errors" className="text-[var(--dc-blue)] hover:underline">docs</Link>.</li>
          </ul>
          <InfoNote className="mt-3">System status is shown in the console footer.</InfoNote>
        </Card>
      </div>
    </ConsolePage>
  );
}


/* ------------------------------------------------------------------ */
/* Developer account edit (PUT /api/developer/me)                       */
/* ------------------------------------------------------------------ */

function DeveloperAccountForm({ account }: { account: { companyName: string | null; website?: string | null; description?: string | null } | null }) {
  const queryClient = useQueryClient();
  const initial = { companyName: account?.companyName || '', website: account?.website || '', description: account?.description || '' };
  const [draft, setDraft] = useState<typeof initial | null>(null);
  const form = draft || initial;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(initial);
  const save = useMutation({
    mutationFn: async () => (await api.put('/api/developer/me', { companyName: form.companyName, website: form.website || null, description: form.description || null })).data,
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      toast.success('Developer account saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not save'),
  });
  if (!account) return null;
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...form, [k]: e.target.value });
  return (
    <form className="mt-4 space-y-3 border-t border-[var(--dc-border)] pt-4" onSubmit={(e) => { e.preventDefault(); if (dirty) save.mutate(); }}>
      <label className="block"><span className={labelCls}>Developer / company name</span><input className={inputCls} value={form.companyName} onChange={set('companyName')} maxLength={100} required /></label>
      <label className="block"><span className={labelCls}>Website</span><input className={inputCls} value={form.website} onChange={set('website')} placeholder="https://example.com" type="url" /></label>
      <label className="block"><span className={labelCls}>Description</span><textarea className={cx(inputCls, '!h-auto py-2')} rows={3} value={form.description} onChange={set('description')} maxLength={500} /></label>
      <div className="flex gap-2">
        <button type="submit" className={cx(btn.primary, btn.sm)} disabled={!dirty || save.isPending}>{save.isPending && <Loader2 size={12} className="animate-spin" />} Save</button>
        {dirty && <button type="button" className={cx(btn.secondary, btn.sm)} onClick={() => setDraft(null)}>Discard</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Developer team (GET/POST/DELETE /api/developer/team)                 */
/* ------------------------------------------------------------------ */

interface TeamMemberRow {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar?: string | null };
}

function getRoleTone(role: string): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  switch (role) {
    case 'owner':
    case 'admin':
      return 'blue';
    case 'billing':
      return 'green';
    case 'support':
      return 'amber';
    case 'developer':
      return 'blue';
    default:
      return 'gray';
  }
}

function DeveloperTeamCard() {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('developer');
  const [removeFor, setRemoveFor] = useState<TeamMemberRow | null>(null);
  const [editRoleFor, setEditRoleFor] = useState<TeamMemberRow | null>(null);
  const [newRole, setNewRole] = useState<string>('developer');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');

  const team = useQuery<{
    owner?: { userId: string; companyName: string | null } | null;
    members: TeamMemberRow[];
    roles: string[];
  }>({
    queryKey: ['developerConsole', 'team'],
    queryFn: async () => (await api.get('/api/developer/team')).data,
    retry: 0,
  });

  const add = useMutation({
    mutationFn: async () => (await api.post('/api/developer/team', { identifier, role })).data,
    onSuccess: () => {
      setIdentifier('');
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'team'] });
      toast.success('Team member added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not add member'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, updatedRole }: { id: string; updatedRole: string }) =>
      (await api.put(`/api/developer/team/${id}/role`, { role: updatedRole })).data,
    onSuccess: () => {
      setEditRoleFor(null);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'team'] });
      toast.success('Member role updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not update role'),
  });

  const transferMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/developer/team/transfer-ownership', {
          targetUserId: transferTargetId,
          confirmation: transferConfirm.trim(),
        })
      ).data,
    onSuccess: () => {
      setShowTransfer(false);
      setTransferTargetId('');
      setTransferConfirm('');
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'team'] });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      toast.success('Account ownership transferred successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not transfer ownership'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/developer/team/${id}`)).data,
    onSuccess: () => {
      setRemoveFor(null);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'team'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Could not remove member'),
  });

  if (team.isError) return null; // not registered as a developer yet
  const availableRoles = team.data?.roles || ['admin', 'developer', 'billing', 'support', 'viewer'];
  const members = team.data?.members || [];

  return (
    <Card
      title="Developer Organization & Team"
      description="Enterprise RBAC controls permissions across App Publishing, Monetization Payouts, and Support."
      action={
        members.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowTransfer((p) => !p)}
            className={cx(btn.secondary, btn.sm, 'text-[11px]')}
          >
            <ArrowRightLeft size={12} /> Transfer Ownership
          </button>
        ) : undefined
      }
    >
      {team.isLoading ? (
        <LoadingRows rows={2} />
      ) : (
        <>
          {showTransfer && (
            <div className="mb-4 p-3 rounded-[8px] border border-amber-500/30 bg-amber-500/5 space-y-2">
              <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                <Shield size={13} /> Transfer Primary Account Ownership
              </p>
              <p className="text-[11.5px] text-[var(--dc-muted)]">
                Select an active team member to become the new primary owner. You will retain Administrator access.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className={cx(selectCls, 'flex-1')}
                >
                  <option value="">Select target team member...</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name || m.user.username} ({m.role})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder='Type "TRANSFER" to confirm'
                  value={transferConfirm}
                  onChange={(e) => setTransferConfirm(e.target.value)}
                  className={cx(inputCls, 'w-full sm:w-[190px]')}
                />
                <button
                  type="button"
                  disabled={!transferTargetId || transferConfirm.trim() !== 'TRANSFER' || transferMutation.isPending}
                  onClick={() => transferMutation.mutate()}
                  className={cx(btn.primary, btn.sm, 'whitespace-nowrap')}
                >
                  {transferMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}

          {members.length === 0 ? (
            <p className="text-[12px] text-[var(--dc-muted)]">No team members yet. Invite developers or billing admins below.</p>
          ) : (
            <ul className="divide-y divide-[var(--dc-border)]">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-[8px]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <AppAvatar
                      name={m.user.name || m.user.username || 'User'}
                      logoUrl={m.user.avatar || null}
                      size="sm"
                      className="!w-[28px] !h-[28px] !rounded-full !text-[10px]"
                    />
                    <div className="min-w-0">
                      <span className="block text-[12.5px] font-semibold truncate">{m.user.name || m.user.username}</span>
                      {m.user.username && <span className="block text-[10.5px] text-[var(--dc-muted)]">@{m.user.username}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editRoleFor?.id === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className={cx(selectCls, '!py-0.5 !text-[11px] w-auto')}
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={updateRoleMutation.isPending}
                          onClick={() => updateRoleMutation.mutate({ id: m.id, updatedRole: newRole })}
                          className={cx(btn.primary, btn.sm, '!px-2 !py-0.5 !text-[10.5px]')}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRoleFor(null)}
                          className={cx(btn.secondary, btn.sm, '!px-2 !py-0.5 !text-[10.5px]')}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <Pill tone={getRoleTone(m.role)}>{m.role}</Pill>
                        <button
                          type="button"
                          title="Edit member role"
                          className={cx(btn.secondary, btn.sm, '!p-1')}
                          onClick={() => {
                            setEditRoleFor(m);
                            setNewRole(m.role);
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className={cx(btn.danger, btn.sm, '!px-2 !py-0.5 !text-[10.5px]')}
                          onClick={() => setRemoveFor(m)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[var(--dc-border)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (identifier.trim()) add.mutate();
            }}
          >
            <input
              className={cx(inputCls, 'flex-1 min-w-[160px]')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email to invite..."
              aria-label="Username or email"
            />
            <select
              className={cx(selectCls, 'w-auto')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Role"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={btn.primary}
              disabled={!identifier.trim() || add.isPending}
            >
              {add.isPending && <Loader2 size={12} className="animate-spin" />} Invite Member
            </button>
          </form>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removeFor)}
        onClose={() => setRemoveFor(null)}
        onConfirm={() => removeFor && remove.mutate(removeFor.id)}
        title="Remove team member?"
        description="They will immediately lose access to this developer account, its apps, and API credentials."
        confirmLabel="Remove"
        busy={remove.isPending}
      />
    </Card>
  );
}
