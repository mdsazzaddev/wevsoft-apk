import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, BadgeCheck, Boxes, Briefcase, CalendarCheck, Check, CheckCircle2, Circle, FlaskConical, Gamepad2, GraduationCap, Layers, Loader2,
  PackagePlus, Rocket, RotateCcw, Search, Settings, Trash2, Users, Wrench, X,
} from 'lucide-react';
import api from '../../../../lib/api';
import { useStore } from '../../../../store';
import { APP_CATEGORIES, DEV_KEYS, categoryLabel, parseRedirectUris, type DeveloperApp } from '../../devApi';
import { AppAvatar, cx } from '../../devUi';
import { useDevAccount } from '../accountContext';
import { appStatusMeta, appTypeLabel, envLabel, PLATFORM_LIMITS } from '../consoleData';
import { daysLeft, purgeAt, restoreErrorMessage, type DeletedAppsResponse } from '../deletedApps';
import { devQueryKeys, errorStatus } from '../queryPolicy';
import { useDevT } from '../i18n/developerI18n';
import {
  Card, ConsolePage, CopyInline, EmptyState, InfoNote, LoadingRows, NoAppsState, NotConfigured, Pill, StatTile, btn, fmtDate, inputCls, labelCls,
  selectCls, tdCls, thCls,
} from '../ui';

/* ------------------------------------------------------------------ */
/* My Apps (/developer/apps)                                           */
/* ------------------------------------------------------------------ */

export function MyAppsPage() {
  const { apps, appsQuery, openCreate } = useDevAccount();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [env, setEnv] = useState('all');

  const shown = apps.filter((a) => {
    if (status !== 'all' && (status === 'draft' ? !['live', 'in_review'].includes(a.status) : a.status !== status)) return false;
    if (env !== 'all' && (env === 'production') !== (a.mode === 'production')) return false;
    const s = q.trim().toLowerCase();
    return !s || a.name.toLowerCase().includes(s) || a.clientId.toLowerCase().includes(s) || categoryLabel(a.category).toLowerCase().includes(s);
  });

  return (
    <ConsolePage
      group="Applications"
      title="My Apps"
      description="Every application registered under your developer account."
      actions={
        <button type="button" onClick={openCreate} className={btn.primary}>
          <PackagePlus size={14} /> Create New App
        </button>
      }
    >
      <Card bodyClassName="!p-0">
        <div className="flex flex-wrap items-center gap-2 px-[16px] py-[12px]">
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, client ID or category" className={cx(inputCls, '!pl-[30px] !h-[32px]')} />
          </div>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={cx(selectCls, '!h-[32px] !w-auto')}>
            <option value="all">All statuses</option>
            <option value="live">Published</option>
            <option value="in_review">In review</option>
            <option value="draft">Draft / development</option>
          </select>
          <select aria-label="Environment" value={env} onChange={(e) => setEnv(e.target.value)} className={cx(selectCls, '!h-[32px] !w-auto')}>
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="development">Development</option>
          </select>
          <span className="ml-auto text-[11.5px] text-[var(--dc-muted)]">{shown.length} of {apps.length}</span>
        </div>
        {appsQuery.isLoading ? (
          <div className="px-4 pb-4"><LoadingRows rows={4} /></div>
        ) : appsQuery.isError ? (
          <div className="px-4 pb-4 text-[12px] text-[var(--dc-red)]">{(appsQuery.error as Error)?.message || 'Failed to load apps'}</div>
        ) : apps.length === 0 ? (
          <div className="px-4 pb-4"><NoAppsState what="credentials, OAuth and webhooks" /></div>
        ) : shown.length === 0 ? (
          <div className="px-4 pb-4"><EmptyState icon={Search} title="No matching applications" body="Try a different search or filter." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed">
              <thead>
                <tr>
                  <th className={cx(thCls, 'w-[22%]')}>Application</th>
                  <th className={cx(thCls, 'w-[24%]')}>Client ID</th>
                  <th className={cx(thCls, 'w-[14%]')}>Type</th>
                  <th className={cx(thCls, 'w-[12%]')}>Environment</th>
                  <th className={cx(thCls, 'w-[12%]')}>Status</th>
                  <th className={cx(thCls, 'w-[10%]')}>Created</th>
                  <th className={cx(thCls, 'w-[12%] text-right')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => {
                  const st = appStatusMeta(a);
                  return (
                    <tr key={a.id} className="hover:bg-[var(--dc-hover)]">
                      <td className={cx(tdCls, 'overflow-hidden')}>
                        <Link to={`/developer/apps/${a.id}`} className="flex items-center gap-[10px] min-w-0 group">
                          <AppAvatar name={a.name} logoUrl={a.logoUrl} size="sm" className="!w-[30px] !h-[30px] !rounded-[6px] !text-[10px] shrink-0" />
                          <span className="min-w-0 overflow-hidden">
                            <span className="block font-semibold text-[var(--dc-text)] group-hover:text-[var(--dc-blue)] truncate">{a.name}</span>
                            <span className="block text-[10.5px] text-[var(--dc-muted)] truncate">{categoryLabel(a.category)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={cx(tdCls, 'overflow-hidden')}>
                        <CopyInline value={a.clientId} label="Client ID copied" className="w-full" />
                      </td>
                      <td className={tdCls}>{appTypeLabel(a, parseRedirectUris(a))}</td>
                      <td className={tdCls}>{envLabel(a)}</td>
                      <td className={tdCls}><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className={tdCls}>{fmtDate(a.createdAt)}</td>
                      <td className={cx(tdCls, 'text-right whitespace-nowrap')}>
                        <Link to={`/developer/apps/${a.id}`} className={cx(btn.secondary, btn.sm)}>Manage</Link>
                        <Link to={`/developer/apps/${a.id}/settings`} aria-label={`${a.name} settings`} className={cx(btn.secondary, btn.sm, 'ml-1.5 !px-[7px]')}>
                          <Settings size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <RecentlyDeletedCard />
    </ConsolePage>
  );
}

/** Soft-deleted apps still inside the restore window (Phase 2 P2-8). Hidden when there are none. */
function RecentlyDeletedCard() {
  const t = useDevT();
  const qc = useQueryClient();
  const deletedQuery = useQuery<DeletedAppsResponse>({
    queryKey: devQueryKeys.deletedApps(),
    queryFn: async () => (await api.get('/api/developer/apps-deleted')).data,
    staleTime: 30_000,
  });
  const restore = useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/developer/apps/${encodeURIComponent(id)}/restore`)).data,
    onSuccess: () => {
      toast.success(t('deleted.restored'));
      qc.invalidateQueries({ queryKey: devQueryKeys.deletedApps() });
      qc.invalidateQueries({ queryKey: DEV_KEYS.apps });
    },
    onError: (err) => toast.error(restoreErrorMessage(errorStatus(err))),
  });
  const data = deletedQuery.data;
  if (!data || data.apps.length === 0) return null;
  const windowDays = data.restoreWindowDays;
  return (
    <Card title={t('deleted.title')} description={t('deleted.description', { days: windowDays })}>
      <ul className="divide-y divide-[var(--dc-border)]">
        {data.apps.map((a) => {
          const left = daysLeft(a.deletedAt, windowDays);
          const purge = purgeAt(a.deletedAt, windowDays);
          const busy = restore.isPending && restore.variables === a.id;
          return (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="w-7 h-7 rounded-md grid place-items-center bg-[var(--dc-hover)] text-[var(--dc-muted)] shrink-0">
                <Trash2 size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[var(--dc-text)]">{a.name}</span>
                <span className="block text-[11px] text-[var(--dc-muted)]">
                  Deleted {fmtDate(a.deletedAt)}
                  {a.restorable && purge ? ` � ${left} day${left === 1 ? '' : 's'} left (until ${fmtDate(purge.toISOString())})` : ' � restore window passed'}
                </span>
              </span>
              <button
                type="button"
                disabled={!a.restorable || restore.isPending}
                onClick={() => restore.mutate(a.id)}
                className={cx(btn.secondary, btn.sm, 'inline-flex items-center gap-1.5')}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} {t('deleted.restore')}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Create App (/developer/apps/new)                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  social: Users,
  games: Gamepad2,
  productivity: CalendarCheck,
  business: Briefcase,
  education: GraduationCap,
  utilities: Wrench,
  other: Boxes,
};

export function CreateAppPage() {
  const { linkSpaceId } = useDevAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('social');
  const [linkSpace, setLinkSpace] = useState(true);
  const trimmed = name.trim();
  const nameError = trimmed.length > PLATFORM_LIMITS.appNameMax ? `Max ${PLATFORM_LIMITS.appNameMax} characters` : null;

  const create = useMutation({
    mutationFn: async () =>
      (await api.post('/api/developer/apps', { name: trimmed, category, wevspaceId: linkSpace && linkSpaceId ? linkSpaceId : undefined })).data as DeveloperApp & {
        clientSecretRaw: string;
      },
    onSuccess: (app) => {
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      toast.success(`${app.name} created`);
      // Same hand-off as CreateAppModal: the secret is shown once on the credentials tab.
      navigate(`/developer/apps/${app.id}/credentials`, { state: { newSecret: app.clientSecretRaw } });
    },
    onError: (e: Error) => toast.error(e?.message || 'Could not create the app'),
  });

  return (
    <ConsolePage group="Applications" title="Create App" description="Register a new application to get OAuth 2.0 credentials for Sign in with Wevsoft.">
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="Application details" description="You can change these later in the app's settings.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (trimmed && !nameError && !create.isPending) create.mutate();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="new-app-name" className={labelCls}>App name</label>
              <input id="new-app-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My WebSoft App" maxLength={PLATFORM_LIMITS.appNameMax} className={inputCls} autoFocus />
              <p className={cx('mt-1 text-[10.5px]', nameError ? 'text-[var(--dc-red)]' : 'text-[var(--dc-muted)]')}>
                {nameError || 'Shown to people on the consent screen.'} <span className="float-right">{trimmed.length}/{PLATFORM_LIMITS.appNameMax}</span>
              </p>
            </div>
            <div>
              <p className={labelCls}>Category</p>
              <div className="grid gap-2 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
                {APP_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c.value] || Boxes;
                  const on = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      aria-pressed={on}
                      className={cx('flex items-start gap-[10px] p-[10px] rounded-[8px] border text-left transition-colors', on ? 'border-[var(--dc-blue)] bg-[var(--dc-blue-soft)]' : 'border-[var(--dc-border-2)] hover:bg-[var(--dc-hover)]')}
                    >
                      <span className={cx('w-[28px] h-[28px] rounded-[6px] grid place-items-center shrink-0', on ? 'bg-[var(--dc-blue)] text-white' : 'bg-[var(--dc-hover)] text-[var(--dc-muted)]')}>
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold text-[var(--dc-text)]">{c.label}</span>
                        <span className="block text-[10.5px] text-[var(--dc-muted)]">{c.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {linkSpaceId && (
              <label className="flex items-start gap-[10px] p-[10px] rounded-[8px] border border-[var(--dc-border-2)] cursor-pointer">
                <input type="checkbox" checked={linkSpace} onChange={(e) => setLinkSpace(e.target.checked)} className="mt-[2px] accent-[var(--dc-blue)]" />
                <span>
                  <span className="block text-[12px] font-semibold">Link to the WevSpace you are acting as</span>
                  <span className="block text-[10.5px] text-[var(--dc-muted)]">The app will appear in that Space's developer console. Only Space owners can link apps.</span>
                </span>
              </label>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={!trimmed || Boolean(nameError) || create.isPending} className={btn.primary}>
                {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />} Create application
              </button>
              <Link to="/developer/apps" className={btn.secondary}>Cancel</Link>
            </div>
          </form>
        </Card>
        <Card title="What happens next">
          <ol className="space-y-3">
            {[
              ['Get your credentials', 'A client ID and a client secret are generated. The secret is shown once, copy it right away.'],
              ['Add redirect URIs', 'Tell Wevsoft where to send people after they approve your app.'],
              ['Choose scopes', 'Request only the permissions your app needs.'],
              ['Go live', 'Complete your app profile and submit it for review.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-[10px]">
                <span className="w-[20px] h-[20px] rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] text-[10.5px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                <span>
                  <span className="block text-[12px] font-semibold">{t}</span>
                  <span className="block text-[11px] text-[var(--dc-muted)]">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link to="/developer/docs#create-app" className="mt-4 inline-block text-[11.5px] font-semibold text-[var(--dc-blue)] hover:underline">Read the guide</Link>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* App Environments (/developer/environments)                          */
/* ------------------------------------------------------------------ */

function isLocalUri(u: string) {
  try {
    const h = new URL(u).hostname;
    return ['localhost', '127.0.0.1', '[::1]'].includes(h);
  } catch {
    return false;
  }
}

export function EnvironmentsPage() {
  const { apps, appsQuery } = useDevAccount();
  const queryClient = useQueryClient();
  const [selectedEnvAppId, setSelectedEnvAppId] = useState('');
  const prod = apps.filter((a) => a.mode === 'production');
  const dev = apps.filter((a) => a.mode !== 'production');

  const toggleMode = useMutation({
    mutationFn: async (targetId: string) => (await api.post(`/api/developer/apps/${targetId}/toggle-mode`)).data as DeveloperApp,
    onSuccess: (updated) => {
      queryClient.setQueryData(DEV_KEYS.app(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      toast.success(`Switched ${updated.name} to ${updated.mode} mode`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Failed to toggle mode'),
  });

  const handleToggleMode = () => {
    if (!selectedEnvAppId) return;
    const app = apps.find((a) => a.id === selectedEnvAppId);
    if (app?.mode === 'development' && !app.privacyPolicyUrl) {
      toast.error('Privacy Policy URL is required for Production mode. Update it in App Settings.');
      return;
    }
    toggleMode.mutate(selectedEnvAppId);
  };

  const column = (title: string, list: DeveloperApp[], tone: 'green' | 'blue', blurb: string) => (
    <Card title={<>{title} <Pill tone={tone}>{list.length}</Pill></>} description={blurb}>
      {list.length === 0 ? (
        <EmptyState icon={Layers} title={`No ${title.toLowerCase()} apps`} className="!py-7" />
      ) : (
        <ul className="divide-y divide-[var(--dc-border)]">
          {list.map((a) => {
            const uris = parseRedirectUris(a);
            const local = uris.filter(isLocalUri).length;
            return (
              <li key={a.id} className="py-[10px] flex items-center gap-3">
                <AppAvatar name={a.name} logoUrl={a.logoUrl} size="sm" className="!w-[30px] !h-[30px] !rounded-[6px] !text-[10px]" />
                <div className="min-w-0 flex-1">
                  <Link to={`/developer/apps/${a.id}`} className="block text-[12.5px] font-semibold truncate hover:text-[var(--dc-blue)]">{a.name}</Link>
                  <p className="text-[10.5px] text-[var(--dc-muted)]">
                    {uris.length} redirect URI{uris.length === 1 ? '' : 's'}
                    {local > 0 && <> • {local} localhost</>}
                  </p>
                </div>
                {a.mode === 'production' && local > 0 && <Pill tone="amber">localhost in production</Pill>}
                <Link to={`/developer/apps/${a.id}/oauth`} className={cx(btn.secondary, btn.sm)}>Redirect URIs</Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  return (
    <ConsolePage group="Applications" title="App Environments" description="Development and production environments for your applications.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : apps.length === 0 ? (
        <NoAppsState what="environments" />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={FlaskConical} label="Development" value={dev.length} hint="Only you and testers can sign in" />
            <StatTile icon={Rocket} label="Production" value={prod.length} hint="Available to every Wevsoft user" tone="green" />
            <StatTile icon={Layers} label="Total" value={apps.length} tone="gray" />
          </div>
          <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
            {column('Development', dev, 'blue', 'New apps start here. http://localhost redirect URIs are allowed for local testing.')}
            {column('Production', prod, 'green', 'Apps approved for everyone. Use https redirect URIs only.')}
          </div>
          <div className="mt-4 p-4 border rounded-[8px] border-[var(--dc-border-2)] bg-[var(--dc-card)]">
            <h3 className="font-semibold text-[13px] mb-2 flex items-center gap-2">
              <Settings size={14} /> Manage Environments
            </h3>
            <p className="text-[11.5px] text-[var(--dc-muted)] mb-4">
              Switch your app's environment mode. Apps moving to production must have a configured privacy policy URL and live approval.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                id="env-app-select"
                value={selectedEnvAppId}
                onChange={(e) => setSelectedEnvAppId(e.target.value)}
                className={selectCls}
                style={{ maxWidth: '300px' }}
              >
                <option value="" disabled>Select an application...</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.mode})</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedEnvAppId || toggleMode.isPending}
                className={btn.primary}
                onClick={handleToggleMode}
              >
                {toggleMode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />} Toggle Environment Mode
              </button>
            </div>
          </div>
        </>
      )}
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* App Reviews & Publishing (/developer/publishing)                    */
/* ------------------------------------------------------------------ */

function readiness(app: DeveloperApp) {
  const uris = parseRedirectUris(app);
  return [
    { label: 'App name', ok: Boolean(app.name), tab: 'settings' },
    { label: 'Logo', ok: Boolean(app.logoUrl), tab: 'settings' },
    { label: 'Category', ok: Boolean(app.category), tab: 'settings' },
    { label: 'Privacy policy URL', ok: Boolean(app.privacyPolicyUrl), tab: 'settings' },
    { label: 'Terms of service URL', ok: Boolean(app.termsUrl), tab: 'settings' },
    { label: 'At least one https redirect URI', ok: uris.some((u) => u.startsWith('https://')), tab: 'oauth' },
    { label: 'Requested scopes saved', ok: (() => { try { const v = JSON.parse((app as any).requestedScopes || '[]'); return Array.isArray(v) && v.length > 0; } catch { return false; } })(), tab: 'oauth' },
  ];
}

function ChecklistModal({ appId, onClose }: { appId: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['reviewChecklist', appId],
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/review-checklist`)).data,
  });

  const data = query.data?.checklist;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--dc-card)] border border-[var(--dc-border)] rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--dc-border)] pb-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="text-[var(--dc-blue)]" size={18} />
            <h3 className="font-semibold text-sm">App Store Readiness Checklist</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--dc-muted)] hover:text-[var(--dc-text)]">
            <X size={16} />
          </button>
        </div>

        {query.isLoading ? (
          <LoadingRows rows={4} />
        ) : query.isError ? (
          <p className="text-xs text-rose-500">Failed to load readiness checklist</p>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dc-track)] border border-[var(--dc-border)]">
              <div>
                <span className="text-xs text-[var(--dc-muted)]">Readiness Score</span>
                <p className="text-lg font-bold text-[var(--dc-text)]">{data.scorePercent}%</p>
              </div>
              <Pill tone={data.isReady ? 'green' : 'amber'}>
                {data.isReady ? 'Ready for Review' : `${data.blockers.length} Blocker(s)`}
              </Pill>
            </div>

            <div className="space-y-2">
              {data.criteria.map((c: any) => (
                <div key={c.id} className="p-2.5 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] flex items-start gap-2.5">
                  {c.status === 'passed' ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : c.status === 'warning' ? (
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <X size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--dc-text)]">{c.label}</span>
                      <span className="text-[10px] uppercase font-mono text-[var(--dc-muted)]">{c.status}</span>
                    </div>
                    <p className="text-[11px] text-[var(--dc-muted)] mt-0.5">{c.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pt-2 border-t border-[var(--dc-border)] flex justify-end">
          <button type="button" onClick={onClose} className={cx(btn.secondary, btn.sm)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewActions({ app, ready }: { app: DeveloperApp; ready: boolean }) {
  const queryClient = useQueryClient();
  const [showChecklist, setShowChecklist] = useState(false);
  const action = useMutation({
    mutationFn: async (kind: 'submit' | 'withdraw') =>
      (await api.post(`/api/developer/apps/${app.id}/${kind === 'submit' ? 'submit-review' : 'withdraw-review'}`)).data as DeveloperApp,
    onSuccess: (updated, kind) => {
      queryClient.setQueryData(DEV_KEYS.app(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: ['adminAppReviews'] });
      toast.success(kind === 'submit' ? 'Submitted for review' : 'Review withdrawn');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Could not update review'),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setShowChecklist(true)}
        className={cx(btn.secondary, btn.sm)}
      >
        <BadgeCheck size={13} /> View Checklist
      </button>

      {app.status === 'live' ? (
        <span className="text-[11px] text-[var(--dc-green)] font-semibold">
          Approved{app.reviewedAt ? ` on ${fmtDate(app.reviewedAt)}` : ''}. Switch to production mode to let everyone sign in.
        </span>
      ) : app.status === 'in_review' ? (
        <>
          <span className="text-[11px] text-[var(--dc-muted)]">
            Submitted{app.submittedAt ? ` ${fmtDate(app.submittedAt)}` : ''}. A Wevsoft admin will review it.
          </span>
          <button
            type="button"
            className={cx(btn.secondary, btn.sm)}
            disabled={action.isPending}
            onClick={() => action.mutate('withdraw')}
          >
            Withdraw
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={!ready || action.isPending}
            className={btn.primary}
            onClick={() => action.mutate('submit')}
          >
            {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Submit for review
          </button>
          {app.status === 'rejected' && (
            <span className="text-[11px] text-[var(--dc-red)]">
              Rejected{app.reviewNotes ? `: ${app.reviewNotes}` : ''}. Fix and resubmit.
            </span>
          )}
          {!ready && (
            <span className="text-[11px] text-[var(--dc-muted)]">Complete the requirements above to submit.</span>
          )}
        </>
      )}

      {showChecklist && <ChecklistModal appId={app.id} onClose={() => setShowChecklist(false)} />}
    </div>
  );
}

function StaffAppReviewQueueCard() {
  const queryClient = useQueryClient();
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [badgesById, setBadgesById] = useState<Record<string, string>>({});
  const queue = useQuery<DeveloperApp[]>({
    queryKey: ['adminAppReviews', 'in_review'],
    queryFn: async () => (await api.get('/api/admin/developer/app-reviews?status=in_review')).data,
  });

  const decide = useMutation({
    mutationFn: async ({ id, decision, notes, trustBadge }: { id: string; decision: 'approve' | 'reject'; notes?: string; trustBadge?: string }) =>
      (await api.post(`/api/admin/developer/apps/${id}/review`, { decision, notes, trustBadge })).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['adminAppReviews'] });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      toast.success(vars.decision === 'approve' ? 'Application approved' : 'Application rejected');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not record review decision'),
  });

  if (queue.isError) return null;
  const pending = queue.data || [];

  return (
    <Card
      title={<><BadgeCheck size={15} className="text-[var(--dc-blue)]" /> Platform Staff Review Queue ({pending.length})</>}
      description="Admin-only view: approve or reject submitted developer applications."
      className="mt-4"
    >
      {queue.isLoading ? (
        <LoadingRows rows={2} />
      ) : pending.length === 0 ? (
        <p className="text-[12px] text-[var(--dc-muted)]">No applications are currently waiting for review.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <div key={item.id} className="p-3 rounded-[8px] border border-[var(--dc-border)] bg-[var(--dc-bg)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[12.5px]">{item.name}</span>
                  <span className="ml-2 text-[11px] text-[var(--dc-muted)]">({categoryLabel(item.category)})</span>
                </div>
                <span className="text-[11px] text-[var(--dc-muted)]">Submitted {fmtDate(item.submittedAt, true)}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={notesById[item.id] || ''}
                  onChange={(e) => setNotesById((p) => ({ ...p, [item.id]: e.target.value }))}
                  placeholder="Review notes or rejection reason (optional)"
                  className={cx(inputCls, 'flex-1')}
                />
                <select
                  value={badgesById[item.id] || 'standard'}
                  onChange={(e) => setBadgesById((p) => ({ ...p, [item.id]: e.target.value }))}
                  className={cx(selectCls, 'w-auto')}
                >
                  <option value="standard">Standard Approved</option>
                  <option value="verified_app">Verified App (Blue Check)</option>
                  <option value="official_partner">Official Partner (Gold Star)</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: item.id, decision: 'approve', notes: notesById[item.id], trustBadge: badgesById[item.id] || 'standard' })}
                    className={cx(btn.primary, btn.sm)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: item.id, decision: 'reject', notes: notesById[item.id] })}
                    className={cx(btn.danger, btn.sm)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function PublishingPage() {
  const { apps, appsQuery } = useDevAccount();
  const user = useStore((s) => s.user) as { role?: string } | null;
  const isStaff = user?.role === 'admin' || user?.role === 'superadmin';
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => apps.map((a) => ({ app: a, checks: readiness(a) })), [apps]);

  return (
    <ConsolePage group="Applications" title="App Reviews & Publishing" description="Get your app ready for review so it can be published to every Wevsoft user.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : apps.length === 0 ? (
        <NoAppsState what="publishing" />
      ) : (
        <>
          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <StatTile icon={CheckCircle2} label="Published" value={apps.filter((a) => a.status === 'live').length} tone="green" />
            <StatTile icon={BadgeCheck} label="In review" value={apps.filter((a) => a.status === 'in_review').length} tone="amber" />
            <StatTile icon={Circle} label="Draft" value={apps.filter((a) => !['live', 'in_review'].includes(a.status)).length} tone="blue" />
          </div>
          <div className="mt-4 space-y-3">
            {rows.map(({ app, checks }) => {
              const done = checks.filter((c) => c.ok).length;
              const st = appStatusMeta(app);
              const open = openId === app.id;
              return (
                <Card key={app.id} bodyClassName="!p-0">
                  <button type="button" onClick={() => setOpenId(open ? null : app.id)} aria-expanded={open} className="w-full flex items-center gap-3 px-[16px] py-[12px] text-left">
                    <AppAvatar name={app.name} logoUrl={app.logoUrl} size="sm" className="!w-[32px] !h-[32px] !rounded-[6px] !text-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold truncate">{app.name}</span>
                      <span className="block text-[11px] text-[var(--dc-muted)]">{done} of {checks.length} requirements complete</span>
                    </span>
                    <span className="hidden min-[560px]:block w-[140px] h-[6px] rounded-full bg-[var(--dc-track)] overflow-hidden">
                      <span className="block h-full bg-[var(--dc-blue)]" style={{ width: `${(done / checks.length) * 100}%` }} />
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </button>
                  {open && (
                    <div className="border-t border-[var(--dc-border)] px-[16px] py-[12px]">
                      <ul className="grid gap-[6px] min-[700px]:grid-cols-2">
                        {checks.map((c) => (
                          <li key={c.label} className="flex items-center gap-[8px] text-[12px]">
                            {c.ok ? <Check size={14} className="text-[var(--dc-green)]" /> : <X size={14} className="text-[var(--dc-red)]" />}
                            <span className={c.ok ? 'text-[var(--dc-text-2)]' : 'text-[var(--dc-text)] font-medium'}>{c.label}</span>
                            {!c.ok && (
                              <Link to={`/developer/apps/${app.id}/${c.tab}`} className="ml-auto text-[11px] font-semibold text-[var(--dc-blue)] hover:underline">Fix</Link>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ReviewActions app={app} ready={done === checks.length} />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {isStaff && <StaffAppReviewQueueCard />}
          <InfoNote className="mt-4">
            Apps in <b>development</b> (or not yet approved) can only be authorized by you and your developer team. Complete every requirement, submit for review,
            and once an admin approves it switch the app to production mode.
          </InfoNote>
        </>
      )}
    </ConsolePage>
  );
}
