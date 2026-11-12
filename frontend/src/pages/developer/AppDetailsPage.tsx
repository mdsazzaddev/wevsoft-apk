import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  Copy,
  Globe,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Trash2,
  X,
  BarChart3,
  Shield,
  ScrollText,
  Boxes,
} from 'lucide-react';
import api from '../../lib/api';
import {
  APP_CATEGORIES,
  DEV_KEYS,
  OAUTH_SCOPES,
  appOrigin,
  categoryLabel,
  isHttpUrl,
  parseRedirectUris,
  redirectUriError,
  type DeveloperApp,
} from './devApi';
import {
  AppAvatar,
  CodeBlock,
  ConfirmDialog,
  CopyButton,
  CopyField,
  FieldLabel,
  ModeBadge,
  SectionCard,
  Skeleton,
  StatusBadge,
  btnDanger,
  btnPrimary,
  btnSecondary,
  copyText,
  cx,
  inputCls,
} from './devUi';
import { WebhookManager } from './console/pages/ToolsPages';
import ApiAnalyticsDashboard from './console/pages/ApiAnalyticsDashboard';
import { ApiKeysCard } from './console/pages/AuthPages';
import AppProductsTab from './AppProductsTab';
import AppMembersPanel from './AppMembersPanel';
import SpaceApiActionsPanel from './SpaceApiActionsPanel';

type TabId = 'overview' | 'products' | 'analytics' | 'settings' | 'credentials' | 'oauth' | 'webhooks' | 'security' | 'audit' | 'danger';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'credentials', label: 'Credentials', icon: KeyRound },
  { id: 'oauth', label: 'OAuth', icon: Link2 },
  { id: 'webhooks', label: 'Webhooks', icon: Globe },
  { id: 'security', label: 'Security & IP', icon: Shield },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'danger', label: 'Danger zone', icon: ShieldAlert },
];

export default function AppDetailsPage() {
  const { id, section } = useParams<{ id: string; section?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const legacyTab = params.get('tab');
  const tab = (TABS.find((t) => t.id === (section || legacyTab))?.id || 'overview') as TabId;
  const tabPath = (next: TabId) => `/developer/apps/${id}${next === 'overview' ? '' : `/${next}`}`;
  // Every tab is its own URL (/developer/apps/:id/<tab>): Back, bookmarks and deep links work.
  const setTab = (next: TabId) => {
    if (next !== tab) navigate(tabPath(next));
  };
  // Old links (/developer/apps/:id?tab=x) move to the path form.
  useEffect(() => {
    if (section || !legacyTab) return;
    const p = new URLSearchParams(params);
    p.delete('tab');
    const rest = p.toString();
    navigate(`${tabPath(tab)}${rest ? `?${rest}` : ''}`, { replace: true, state: null });
     
  }, [section, legacyTab]);

  // A freshly created/rotated secret arrives via router state exactly once. Keep it in
  // memory and drop it from history so a reload or back-navigation can't reveal it again.
  const [revealedSecret, setRevealedSecret] = useState<string | null>(
    () => ((location.state as { newSecret?: string } | null)?.newSecret as string | undefined) || null,
  );
  useEffect(() => {
    if ((location.state as { newSecret?: string } | null)?.newSecret && (section || !legacyTab)) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
     
  }, []);

  const { data: app, isLoading, isError, error } = useQuery<DeveloperApp>({
    queryKey: DEV_KEYS.app(id),
    queryFn: async () => (await api.get(`/api/developer/apps/${id}`)).data,
    enabled: Boolean(id),
    retry: 1,
  });

  const tabLabel = TABS.find((t) => t.id === tab)?.label || 'Overview';
  useEffect(() => {
    document.title = `${app?.name || 'App'} · ${tabLabel} · WebSoft Developer Console`;
  }, [app?.name, tabLabel]);

  return (
    <div className="min-h-full">
      {/* Rendered inside the Developer Console shell (DeveloperConsoleLayout). */}
      <main className="px-4 sm:px-[22px] pt-[16px] pb-16">
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-[5px] text-[11.5px] text-[var(--dc-muted)]">
          <Link to="/developer" className="hover:text-[var(--dc-blue)]">Developer Console</Link>
          <ChevronRight size={11} />
          <Link to="/developer/apps" className="hover:text-[var(--dc-blue)]">My Apps</Link>
          <ChevronRight size={11} />
          {tab === 'overview' ? (
            <span className="text-[var(--dc-text-2)] font-medium truncate max-w-[220px]">{app?.name || 'App'}</span>
          ) : (
            <>
              <Link to={`/developer/apps/${id}`} className="hover:text-[var(--dc-blue)] truncate max-w-[220px]">{app?.name || 'App'}</Link>
              <ChevronRight size={11} />
              <span className="text-[var(--dc-text-2)] font-medium">{tabLabel}</span>
            </>
          )}
        </nav>
        <Link to="/developer/apps" className="lg:hidden inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> All apps
        </Link>

        {isLoading ? (
          <DetailsSkeleton />
        ) : isError || !app ? (
          <div className="mt-6 rounded-3xl border border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">App not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">{(error as Error)?.message || 'It may have been deleted, or you may not have access.'}</p>
            <Link to="/developer/apps" className={cx(btnSecondary, 'mt-6')}>Back to your apps</Link>
          </div>
        ) : (
          <>
            <AppHeader app={app} onGoToSettings={() => setTab('settings')} />

            {revealedSecret && <NewSecretBanner secret={revealedSecret} onDismiss={() => setRevealedSecret(null)} />}

            <div className="mt-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
              {/* Mobile: scrollable tabs. Desktop: sticky sidebar. */}
              <nav aria-label="App sections" className="lg:hidden -mx-4 px-4 border-b border-border mb-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-1 min-w-max">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cx(
                        'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                        tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                        t.id === 'danger' && tab !== t.id && 'text-red-600/80 dark:text-red-400/80',
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                      {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </nav>
              <aside className="hidden lg:block">
                <nav aria-label="App sections" className="sticky top-4 space-y-0.5">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cx(
                        t.id === 'danger' && 'mt-3 border-t border-border pt-3 rounded-none',
                        'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        tab === t.id
                          ? t.id === 'danger'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-muted text-foreground'
                          : t.id === 'danger'
                            ? 'text-red-600/80 dark:text-red-400/80 hover:bg-red-500/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                  <div className="pt-4 mt-4 border-t border-border">
                    <Link to="/developer/docs" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60">
                      <BookOpen className="w-4 h-4" /> OAuth guide
                    </Link>
                  </div>
                </nav>
              </aside>

              <div className="min-w-0 space-y-6">
                {tab === 'overview' && <OverviewTab app={app} goTo={setTab} />}
                {tab === 'products' && <AppProductsTab app={app} />}
                {tab === 'analytics' && <AnalyticsTab app={app} />}
                {tab === 'settings' && <SettingsTab app={app} />}
                {tab === 'credentials' && (
                  <CredentialsTab
                    app={app}
                    revealedSecret={revealedSecret}
                    onRevealed={(s) => setRevealedSecret(s)}
                    onRotated={(s) => setRevealedSecret(s)}
                  />
                )}
                {tab === 'oauth' && <OAuthTab app={app} />}
                {tab === 'webhooks' && <WebhooksTab app={app} />}
                {tab === 'security' && (
                  <>
                    <RequestSigningCard app={app} />
                    <SecurityTab app={app} />
                    <AppMembersPanel app={app} />
                  </>
                )}
                {tab === 'audit' && <AuditTab app={app} />}
                {tab === 'danger' && <DangerTab app={app} />}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AppModeControl({ app, onGoToSettings }: { app: DeveloperApp; onGoToSettings?: () => void }) {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<'production' | 'development' | null>(null);
  const [missingPrivacyModal, setMissingPrivacyModal] = useState(false);
  const [notLiveModal, setNotLiveModal] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${app.id}/toggle-mode`)).data as DeveloperApp,
    onSuccess: (updated) => {
      queryClient.setQueryData(DEV_KEYS.app(app.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      setConfirmTarget(null);
      toast.success(
        updated.mode === 'production'
          ? 'App is now Live! Accessible to all WevSoft users.'
          : 'App switched to In Development mode. Only app team members have access.',
      );
    },
    onError: (err: any) => {
      setConfirmTarget(null);
      toast.error(err.response?.data?.error || err.message || 'Could not change app mode');
    },
  });

  const isLive = app.mode === 'production';

  const handleRequestMode = (target: 'production' | 'development') => {
    if (app.mode === target) return;
    if (target === 'production') {
      if (app.status !== 'live') {
        setNotLiveModal(true);
        return;
      }
      if (!app.privacyPolicyUrl || !isHttpUrl(app.privacyPolicyUrl)) {
        setMissingPrivacyModal(true);
        return;
      }
    }
    setConfirmTarget(target);
  };

  return (
    <div className="flex items-center gap-3 self-start md:self-auto bg-card border border-border rounded-2xl p-1.5 shadow-sm">
      <div className="px-2.5 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-2">
        <span
          className={cx(
            'w-2 h-2 rounded-full',
            isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          )}
        />
        <span>App Mode:</span>
      </div>

      <div className="flex items-center bg-muted/60 p-0.5 rounded-xl text-xs font-medium border border-border/50">
        <button
          type="button"
          onClick={() => handleRequestMode('development')}
          disabled={toggleMutation.isPending}
          className={cx(
            'px-3 py-1.5 rounded-lg transition-all',
            !isLive
              ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          In Development
        </button>
        <button
          type="button"
          onClick={() => handleRequestMode('production')}
          disabled={toggleMutation.isPending}
          className={cx(
            'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
            isLive
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {toggleMutation.isPending && confirmTarget === 'production' && <Loader2 className="w-3 h-3 animate-spin" />}
          Live
        </button>
      </div>

      {/* Confirm Switch Dialog */}
      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => toggleMutation.mutate()}
        busy={toggleMutation.isPending}
        title={confirmTarget === 'production' ? 'Switch App to Live Mode?' : 'Switch App to Development Mode?'}
        description={
          confirmTarget === 'production' ? (
            <div className="space-y-2 text-xs sm:text-sm">
              <p>
                Switching to <strong>Live</strong> makes your app accessible to any public WevSoft user who authorizes it.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Your Privacy Policy and Terms will be linked on the authorization dialog.</li>
                <li>Live OAuth token requests and Webhook subscriptions will begin streaming.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2 text-xs sm:text-sm">
              <p>
                Switching to <strong>In Development</strong> restricts access to registered administrators, developers, and testers of this app.
              </p>
              <p className="text-muted-foreground">
                Public users trying to access or authorize this app will receive an &quot;App in development&quot; notification.
              </p>
            </div>
          )
        }
        confirmLabel={confirmTarget === 'production' ? 'Confirm & Go Live' : 'Switch to Development'}
        tone={confirmTarget === 'production' ? 'primary' : 'danger'}
      />

      {/* Missing Privacy Policy Prompt */}
      {missingPrivacyModal && (
        <ConfirmDialog
          open={missingPrivacyModal}
          onClose={() => setMissingPrivacyModal(false)}
          onConfirm={() => {
            setMissingPrivacyModal(false);
            onGoToSettings?.();
          }}
          title="Privacy Policy Required for Live Mode"
          description={
            <div className="space-y-2 text-xs sm:text-sm">
              <p>
                Meta and WevSoft developer policies require a public, valid <strong>Privacy Policy URL</strong> before an app can go <strong>Live</strong>.
              </p>
              <p className="text-muted-foreground">
                This ensures users can review how their data will be processed and retained. Please provide your Privacy Policy URL in the Settings tab.
              </p>
            </div>
          }
          confirmLabel="Go to App Settings"
          tone="primary"
        />
      )}

      {/* App Review Required Modal */}
      {notLiveModal && (
        <ConfirmDialog
          open={notLiveModal}
          onClose={() => setNotLiveModal(false)}
          onConfirm={() => {
            setNotLiveModal(false);
            window.location.href = '/developer/publishing';
          }}
          title="Admin Review Required for Live Mode"
          description={
            <div className="space-y-2 text-xs sm:text-sm">
              <p>
                To protect WevSoft users and ensure platform integrity, applications must complete <strong>Admin App Review</strong> and achieve <strong>Live Status</strong> before switching to Live Mode.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Current App Status: <span className="uppercase tracking-wide">{app.status}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Submit your app details and permissions in the Publishing section for reviewer evaluation.</p>
              </div>
            </div>
          }
          confirmLabel="Go to Publishing & Review"
          tone="primary"
        />
      )}
    </div>
  );
}

function AppHeader({ app, onGoToSettings }: { app: DeveloperApp; onGoToSettings?: () => void }) {
  return (
    <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <AppAvatar name={app.name} logoUrl={app.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{app.name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{categoryLabel(app.category)}</span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="inline-flex items-center gap-1 min-w-0">
              <code className="font-mono text-xs truncate max-w-[220px] sm:max-w-none">{app.clientId}</code>
              <CopyButton value={app.clientId} label="Copy client ID" toastLabel="Client ID copied" className="w-7 h-7" />
            </span>
          </div>
        </div>
      </div>

      <AppModeControl app={app} onGoToSettings={onGoToSettings} />
    </div>
  );
}

function NewSecretBanner({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <KeyRound className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">Copy your client secret now</h2>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/70 mt-0.5">
            For your security we only show it once. Store it in your server's secret manager. If you lose it, rotate it.
          </p>
          <CopyField value={secret} toastLabel="Client secret copied" className="mt-3 bg-background border-amber-500/30" />
          <button type="button" onClick={onDismiss} className="mt-3 text-sm font-medium text-amber-900 dark:text-amber-200 hover:underline">
            I've saved it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function useUpdateApp(app: DeveloperApp) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.put(`/api/developer/apps/${app.id}`, data)).data as DeveloperApp,
    onSuccess: (updated) => {
      queryClient.setQueryData(DEV_KEYS.app(app.id), updated);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
    },
  });
}

function OverviewTab({ app, goTo }: { app: DeveloperApp; goTo: (t: TabId) => void }) {
  const uris = parseRedirectUris(app);
  const checks: { done: boolean; label: string; tab: TabId }[] = [
    { done: uris.length > 0, label: 'Add at least one redirect URI', tab: 'oauth' },
    { done: Boolean(app.logoUrl), label: 'Upload an app logo', tab: 'settings' },
    { done: Boolean(app.privacyPolicyUrl), label: 'Add a privacy policy URL', tab: 'settings' },
    { done: Boolean(app.termsUrl), label: 'Add a terms of service URL', tab: 'settings' },
  ];
  const origin = appOrigin();
  const redirect = uris[0] || 'https://yourapp.com/callback';
  const authorizeUrl = `${origin}/oauth/authorize?response_type=code&client_id=${app.clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=profile&state=RANDOM_STATE`;

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Status', value: <StatusBadge status={app.status} /> },
          { label: 'Mode', value: <ModeBadge mode={app.mode} /> },
          { label: 'Redirect URIs', value: <span className="text-xl font-semibold tabular-nums">{uris.length}</span> },
          { label: 'Created', value: <span className="text-sm font-medium">{new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <div className="mt-2 min-h-7 flex items-center">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionCard title="Finish setting up" description="Complete these so people can recognise and trust your app on the consent screen.">
        <ul className="divide-y divide-border -my-2">
          {checks.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => goTo(c.tab)}
                className="w-full flex items-center gap-3 py-3 text-left group"
              >
                {c.done ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/50" />
                )}
                <span className={cx('flex-1 text-sm', c.done ? 'text-muted-foreground' : 'font-medium')}>{c.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Quick start"
        description={
          <>
            Send people to this URL to start the OAuth flow, then exchange the returned <code className="font-mono text-xs">code</code> on your server.{' '}
            <Link to="/developer/docs" className="text-primary font-medium hover:underline">Read the guide</Link>
          </>
        }
      >
        <CodeBlock
          tabs={[
            { label: 'Authorize URL', code: authorizeUrl },
            {
              label: 'Token exchange (curl)',
              code: `curl -X POST ${origin}/api/oauth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "grant_type": "authorization_code",\n    "code": "CODE_FROM_CALLBACK",\n    "redirect_uri": "${redirect}",\n    "client_id": "${app.clientId}",\n    "client_secret": "YOUR_CLIENT_SECRET"\n  }'`,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SettingsTab({ app }: { app: DeveloperApp }) {
  const initial = useMemo(
    () => ({
      name: app.name || '',
      logoUrl: app.logoUrl || '',
      category: app.category || 'other',
      privacyPolicyUrl: app.privacyPolicyUrl || '',
      termsUrl: app.termsUrl || '',
      deauthorizeUrl: app.deauthorizeUrl || '',
      dataDeletionUrl: app.dataDeletionUrl || '',
    }),
    [app],
  );
  const [form, setForm] = useState(initial);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setForm(initial), [initial]);
  const update = useUpdateApp(app);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const urlErr = (v: string) => (v.trim() && !isHttpUrl(v) ? 'Enter a full http(s) URL' : null);
  const errors = {
    name: form.name.trim() ? null : 'Name is required',
    logoUrl: urlErr(form.logoUrl),
    privacyPolicyUrl: urlErr(form.privacyPolicyUrl),
    termsUrl: urlErr(form.termsUrl),
    deauthorizeUrl: urlErr(form.deauthorizeUrl),
    dataDeletionUrl: urlErr(form.dataDeletionUrl),
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !dirty) return;
    update.mutate(
      {
        name: form.name.trim(),
        logoUrl: form.logoUrl.trim() || null,
        category: form.category,
        privacyPolicyUrl: form.privacyPolicyUrl.trim() || null,
        termsUrl: form.termsUrl.trim() || null,
        deauthorizeUrl: form.deauthorizeUrl.trim() || null,
        dataDeletionUrl: form.dataDeletionUrl.trim() || null,
      },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (err: any) => toast.error(err?.message || 'Could not save settings'),
      },
    );
  };

  const errCls = 'border-red-500 focus:border-red-500 focus:ring-red-500/15';
  return (
    <form onSubmit={save} className="space-y-6">
      <SectionCard
        title="App settings"
        description="Basic information shown to people when they connect your app."
        footer={
          <>
            {dirty && <span className="mr-auto text-xs text-muted-foreground">You have unsaved changes</span>}
            <button type="button" className={btnSecondary} disabled={!dirty || update.isPending} onClick={() => setForm(initial)}>
              Reset
            </button>
            <button type="submit" className={btnPrimary} disabled={!dirty || !valid || update.isPending}>
              {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <AppAvatar name={form.name || app.name} logoUrl={isHttpUrl(form.logoUrl) ? form.logoUrl : null} size="lg" />
            <div className="flex-1 min-w-0">
              <FieldLabel htmlFor="logoUrl" hint="Square image, at least 256×256. Public https URL.">Logo URL</FieldLabel>
              <input id="logoUrl" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://yourapp.com/logo.png" className={cx(inputCls, errors.logoUrl && errCls)} />
              {errors.logoUrl && <p className="text-xs text-red-500 mt-1">{errors.logoUrl}</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel htmlFor="name">App name</FieldLabel>
              <input id="name" value={form.name} maxLength={80} onChange={set('name')} className={cx(inputCls, errors.name && errCls)} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <select id="category" value={form.category} onChange={set('category')} className={inputCls}>
                {APP_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="privacyPolicyUrl" hint="Required for Live Mode">Privacy policy URL</FieldLabel>
              <input id="privacyPolicyUrl" value={form.privacyPolicyUrl} onChange={set('privacyPolicyUrl')} placeholder="https://yourapp.com/privacy" className={cx(inputCls, errors.privacyPolicyUrl && errCls)} />
              {errors.privacyPolicyUrl && <p className="text-xs text-red-500 mt-1">{errors.privacyPolicyUrl}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="termsUrl">Terms of service URL</FieldLabel>
              <input id="termsUrl" value={form.termsUrl} onChange={set('termsUrl')} placeholder="https://yourapp.com/terms" className={cx(inputCls, errors.termsUrl && errCls)} />
              {errors.termsUrl && <p className="text-xs text-red-500 mt-1">{errors.termsUrl}</p>}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Compliance & Data Protection (GDPR / Meta Parity)"
        description="Endpoints called when users revoke permissions or request their data to be purged."
      >
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel
                htmlFor="deauthorizeUrl"
                hint="Called when a user removes your app or revokes permissions in WevSoft settings."
              >
                Deauthorize Callback URL
              </FieldLabel>
              <input
                id="deauthorizeUrl"
                value={form.deauthorizeUrl}
                onChange={set('deauthorizeUrl')}
                placeholder="https://yourapp.com/webhooks/deauthorize"
                className={cx(inputCls, errors.deauthorizeUrl && errCls)}
              />
              {errors.deauthorizeUrl && <p className="text-xs text-red-500 mt-1">{errors.deauthorizeUrl}</p>}
            </div>
            <div>
              <FieldLabel
                htmlFor="dataDeletionUrl"
                hint="Endpoint or URL where users can request or confirm data deletion."
              >
                User Data Deletion URL
              </FieldLabel>
              <input
                id="dataDeletionUrl"
                value={form.dataDeletionUrl}
                onChange={set('dataDeletionUrl')}
                placeholder="https://yourapp.com/compliance/data-deletion"
                className={cx(inputCls, errors.dataDeletionUrl && errCls)}
              />
              {errors.dataDeletionUrl && <p className="text-xs text-red-500 mt-1">{errors.dataDeletionUrl}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Security & Signature Verification</span>
            </div>
            <p>
              When a deauthorization event or data deletion request occurs, WevSoft sends a signed POST request containing an{' '}
              <code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono text-[11px]">X-Wevsoft-Signature</code> header
              (HMAC-SHA256 signature signed using your App Secret). Validate this signature before deleting customer records.
            </p>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function CredentialsTab({
  app,
  revealedSecret,
  onRevealed,
  onRotated,
}: {
  app: DeveloperApp;
  revealedSecret: string | null;
  onRevealed: (secret: string) => void;
  onRotated: (secret: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const secret = revealedSecret || app.clientSecretRaw || null;

  const rotate = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${app.id}/rotate-secret`)).data as { clientSecretRaw: string },
    onSuccess: (data) => {
      setConfirmOpen(false);
      onRotated(data.clientSecretRaw);
      toast.success('New client secret generated');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('main-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Could not rotate the secret'),
  });

  const reveal = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${app.id}/reveal-secret`)).data as { clientSecretRaw: string },
    onSuccess: async (data) => {
      onRevealed(data.clientSecretRaw);
      await copyText(data.clientSecretRaw, 'Client secret copied');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Could not reveal the secret'),
  });

  return (
    <>
      <SectionCard title="Client ID" description="Identifies your app. It's public and safe to embed in mobile and browser apps.">
        <CopyField value={app.clientId} toastLabel="Client ID copied" />
      </SectionCard>

      <SectionCard
        title="Client secret"
        description="Authenticates your server when it exchanges authorization codes. Never ship it in a browser or mobile app."
        footer={
          <button type="button" className={cx(btnSecondary, 'text-red-600 dark:text-red-400')} onClick={() => setConfirmOpen(true)}>
            <RefreshCw className="w-4 h-4" /> Rotate secret
          </button>
        }
      >
        {secret ? (
          <>
            <CopyField value={secret} toastLabel="Client secret copied" />
            <p className="mt-3 text-xs text-muted-foreground">
              Keep this secret safe. If compromised, rotate it immediately.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 pl-3.5 pr-1.5 py-1.5">
              <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
              <code className="flex-1 font-mono text-[13px] tracking-widest text-muted-foreground truncate">{'•'.repeat(32)}</code>
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Hidden</span>
              <button
                type="button"
                aria-label="Reveal and copy client secret"
                title="Reveal and copy client secret"
                disabled={reveal.isPending}
                onClick={() => reveal.mutate()}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50"
              >
                {reveal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Owners can reveal and copy the current secret anytime. Store it on your server; rotate it if it leaks.
            </p>
          </>
        )}
      </SectionCard>

      <ApiKeysCard apps={[app]} fixedAppId={app.id} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => rotate.mutate()}
        busy={rotate.isPending}
        title="Rotate client secret?"
        description={
          <>
            A new secret is generated and the current one <span className="font-medium text-foreground">stops working immediately</span>. Update your
            server before users try to sign in.
          </>
        }
        confirmLabel="Rotate secret"
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function AnalyticsTab({ app }: { app: DeveloperApp }) {
  const uris = parseRedirectUris(app);
  let scopes: string[];
  try {
    scopes = JSON.parse((app as any).requestedScopes || '[]');
  } catch {
    scopes = [];
  }
  return (
    <div className="space-y-6">
      <SectionCard title="API Analytics & Usage" description="Monitor your application's API consumption, status codes, latency, and quota over time.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Redirect URIs</p>
            <div className="mt-2 text-2xl font-bold">{uris.length}</div>
          </div>
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested scopes</p>
            <div className="mt-2 text-2xl font-bold">{Array.from(new Set(['profile', ...scopes])).length}</div>
          </div>
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment</p>
            <div className="mt-2 text-2xl font-bold capitalize">{app.mode}</div>
          </div>
        </div>

        <ApiAnalyticsDashboard appId={app.id} />
      </SectionCard>
    </div>
  );
}

/** Tolerant reader for a list column that the API now returns as an array. */
function asStringList(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(/[\s,]+/).filter(Boolean);
  }
}

/** SHA-256 = 32 bytes. Accepts the colon-separated openssl form or bare hex. */
function fingerprintError(value: string): string | null {
  const hex = value.replace(/[^0-9a-fA-F]/g, '');
  if (!hex) return 'Enter a fingerprint';
  if (hex.length !== 64) return 'A SHA-256 fingerprint is 64 hex characters (colons optional)';
  return null;
}

/**
 * HMAC request signing and mTLS. Both are opt-in; the signing secret is shown
 * exactly once (at issue / rotation) and never returned again, so this card
 * keeps the freshly issued value in local state only.
 */
function RequestSigningCard({ app }: { app: DeveloperApp }) {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [fpInput, setFpInput] = useState('');
  const [fpError, setFpError] = useState<string | null>(null);

  const stored = useMemo(() => asStringList(app.clientCertFingerprints), [app.clientCertFingerprints]);
  const hasSecret = Boolean(app.hasSigningSecret);
  const signingRequired = Boolean(app.signingRequired);
  const mtlsRequired = Boolean(app.mtlsRequired);

  const applyApp = (updated: any) => {
    queryClient.setQueryData(DEV_KEYS.app(app.id), updated);
    queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
  };

  const rotate = useMutation({
    mutationFn: async () => (await api.post(`/api/developer/apps/${app.id}/signing-secret/rotate`)).data,
    onSuccess: (data: any) => {
      setRevealed(data.signingSecretRaw);
      queryClient.setQueryData(DEV_KEYS.app(app.id), { ...app, hasSigningSecret: true });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      toast.success('New signing secret issued — copy it now, it will not be shown again.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to issue a signing secret'),
  });

  const toggleRequired = useMutation({
    mutationFn: async (next: boolean) =>
      (await api.put(`/api/developer/apps/${app.id}/signing`, { signingRequired: next })).data,
    onSuccess: (data: any) => {
      applyApp(data);
      toast.success(data?.signingRequired ? 'Signed requests are now required.' : 'Signature enforcement turned off.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update signing'),
  });

  const saveMtls = useMutation({
    mutationFn: async (payload: { fingerprints: string[]; mtlsRequired: boolean }) =>
      (await api.put(`/api/developer/apps/${app.id}/mtls`, payload)).data,
    onSuccess: (data: any) => {
      applyApp(data);
      toast.success('mTLS configuration saved.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update mTLS'),
  });

  const addFingerprint = () => {
    const err = fingerprintError(fpInput);
    if (err) {
      setFpError(err);
      return;
    }
    const hex = fpInput.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    const normalized = hex.match(/.{2}/g)!.join(':');
    if (stored.includes(normalized)) {
      setFpError('That fingerprint is already on the list');
      return;
    }
    setFpError(null);
    setFpInput('');
    saveMtls.mutate({ fingerprints: [...stored, normalized], mtlsRequired });
  };

  const toggleMtlsRequired = (next: boolean) => {
    if (next && stored.length === 0) {
      toast.error('Add at least one certificate fingerprint before requiring mTLS.');
      return;
    }
    saveMtls.mutate({ fingerprints: stored, mtlsRequired: next });
  };

  const busy = rotate.isPending || toggleRequired.isPending || saveMtls.isPending;

  return (
    <SectionCard
      title="Request signing & mTLS"
      description="Prove a request really came from your servers, not just that it carried a valid API key. Signing and mutual TLS are independent and both optional."
    >
      <div className="space-y-4">
        <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> HMAC-SHA256 request signing
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Every request carries <code className="font-mono">X-Wevsoft-Timestamp</code> (unix ms) and{' '}
                <code className="font-mono">X-Wevsoft-Signature</code> — the hex HMAC-SHA256 of{' '}
                <code className="font-mono">{'{timestamp}.{rawBody}'}</code>, the same canonical form your outbound webhooks use.
              </p>
            </div>
            <span className={cx('shrink-0 text-[11px] px-2 py-0.5 rounded-full border', hasSecret ? 'border-emerald-500/40 text-emerald-600' : 'border-border text-muted-foreground')}>
              {hasSecret ? 'Secret configured' : 'No secret yet'}
            </span>
          </div>

          {revealed && (
            <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/5 space-y-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Copy this signing secret now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <input readOnly value={revealed} className={cx(inputCls, 'font-mono text-xs')} onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  className={cx(btnSecondary, 'shrink-0')}
                  onClick={() => {
                    navigator.clipboard?.writeText(revealed);
                    toast.success('Signing secret copied');
                  }}
                >
                  <Check className="w-4 h-4" /> Copy
                </button>
                <button type="button" className={cx(btnSecondary, 'shrink-0')} onClick={() => setRevealed(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => rotate.mutate()}>
              {rotate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {hasSecret ? 'Rotate signing secret' : 'Generate signing secret'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy || !hasSecret}
              onClick={() => toggleRequired.mutate(!signingRequired)}
              title={hasSecret ? undefined : 'Issue a signing secret first'}
            >
              {toggleRequired.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {signingRequired ? 'Stop requiring signatures' : 'Require signed requests'}
            </button>
            {signingRequired && (
              <span className="text-xs text-muted-foreground">Unsigned requests are refused with <code className="font-mono">401</code>.</span>
            )}
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl space-y-3 bg-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" /> mTLS client certificates
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Only certificates on this list may call the API. Fingerprints are SHA-256 digests; case and colons are normalised away. Your TLS edge must set{' '}
                <code className="font-mono">X-Client-Cert-Fingerprint</code> from the verified certificate and strip any client-supplied copy.
              </p>
            </div>
            <span className={cx('shrink-0 text-[11px] px-2 py-0.5 rounded-full border', mtlsRequired ? 'border-emerald-500/40 text-emerald-600' : 'border-border text-muted-foreground')}>
              {mtlsRequired ? 'Required' : 'Optional'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {stored.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No certificates allowlisted.</span>
            ) : (
              stored.map((fp) => (
                <span key={fp} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-background border border-border max-w-full">
                  <span className="truncate">{fp}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => saveMtls.mutate({ fingerprints: stored.filter((f) => f !== fp), mtlsRequired })}
                    className="text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="new-fingerprint-input">Add a SHA-256 certificate fingerprint</FieldLabel>
            <div className="flex gap-2">
              <input
                id="new-fingerprint-input"
                type="text"
                placeholder="AB:CD:EF:… or ABCDEF…"
                value={fpInput}
                onChange={(e) => {
                  setFpInput(e.target.value);
                  if (fpError) setFpError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFingerprint();
                  }
                }}
                className={cx(inputCls, 'font-mono text-xs')}
              />
              <button type="button" onClick={addFingerprint} disabled={busy} className={cx(btnSecondary, 'shrink-0')}>
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {fpError && <p className="text-xs text-red-500">{fpError}</p>}
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={mtlsRequired}
              disabled={busy}
              onChange={(e) => toggleMtlsRequired(e.target.checked)}
              className="mt-0.5"
            />
            Refuse requests that do not present a certificate from the list above.
          </label>
        </div>
      </div>
    </SectionCard>
  );
}

function SecurityTab({ app }: { app: DeveloperApp }) {
  const queryClient = useQueryClient();
  const initialIps = useMemo(() => asStringList(app.ipAllowlist), [app.ipAllowlist]);

  const [inputVal, setInputVal] = useState('');
  const [ips, setIps] = useState<string[]>(initialIps);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setIps(initialIps);
  }, [initialIps]);

  const IP_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?:\/(?:3[0-2]|[12]?\d))?|[0-9a-fA-F:]+:[0-9a-fA-F:.]*(?:\/(?:12[0-8]|1[01]\d|\d?\d))?)$/;

  const updateAllowlist = useMutation({
    mutationFn: async (newIps: string[]) => {
      const res = await api.put(`/api/developer/apps/${app.id}/ip-allowlist`, { ipAllowlist: newIps });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(DEV_KEYS.app(app.id), data);
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      toast.success(ips.length ? 'IP allowlist saved' : 'IP allowlist cleared');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || 'Failed to update IP allowlist');
    },
  });

  const handleAdd = () => {
    const raw = inputVal.trim();
    if (!raw) return;
    const candidates = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const invalid = candidates.find(c => !IP_RE.test(c));
    if (invalid) {
      toast.error(`Invalid IP or CIDR: ${invalid}`);
      return;
    }
    const merged = Array.from(new Set([...ips, ...candidates]));
    setIps(merged);
    setInputVal('');
  };

  const handleRemove = (target: string) => {
    setIps(ips.filter(ip => ip !== target));
  };

  const isDirty = JSON.stringify(ips) !== JSON.stringify(initialIps);

  return (
    <SectionCard title="Security & IP Whitelisting" description="Protect your application by restricting API access to known IP addresses or CIDR ranges.">
      <div className="space-y-4">
        <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Configured IP Allowlist</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              When configured, API-key and OAuth-token requests are restricted to these IP addresses only. Leave empty to allow requests from any IP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {ips.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No restrictions (all client IPs permitted).</span>
            ) : (
              ips.map((ip) => (
                <span key={ip} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-background border border-border">
                  {ip}
                  <button type="button" onClick={() => handleRemove(ip)} className="text-muted-foreground hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl space-y-3 bg-card">
          <FieldLabel htmlFor="new-ip-input">Add IP Address or CIDR Range</FieldLabel>
          <div className="flex gap-2">
            <input
              id="new-ip-input"
              type="text"
              placeholder="e.g. 192.168.1.1, 10.0.0.0/24"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className={inputCls}
            />
            <button type="button" onClick={handleAdd} className={cx(btnSecondary, 'shrink-0')}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {isDirty && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={updateAllowlist.isPending}
                onClick={() => updateAllowlist.mutate(ips)}
              >
                {updateAllowlist.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={updateAllowlist.isPending}
                onClick={() => {
                  setIps(initialIps);
                  setInputVal('');
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function AuditTab({ app }: { app: DeveloperApp }) {
  const apiKeys = useQuery<any[]>({
    queryKey: ['developerConsole', 'apiKeys', app.id],
    queryFn: async () => (await api.get(`/api/developer/apps/${app.id}/api-keys`)).data,
  });
  const webhooks = useQuery<any[]>({
    queryKey: ['developerConsole', 'webhooks', app.id],
    queryFn: async () => (await api.get(`/api/developer/apps/${app.id}/webhooks`)).data,
  });
  const logs = useQuery<{ data: any[] }>({
    queryKey: ['developerConsole', 'auditLogs', app.id],
    queryFn: async () => (await api.get(`/api/developer/apps/${app.id}/logs?limit=25`)).data,
  });

  const events = useMemo(() => {
    const items: { id: string; event: string; details: string; actor: string; date: string }[] = [
      {
        id: `created-${app.id}`,
        event: 'App Created',
        details: `Initial provision of ${app.name} (${app.mode} mode)`,
        actor: 'Owner',
        date: app.createdAt,
      },
    ];
    if (app.updatedAt && app.updatedAt !== app.createdAt) {
      items.push({
        id: `updated-${app.id}`,
        event: 'Configuration Updated',
        details: `App settings or credentials updated (status: ${app.status})`,
        actor: 'Owner / Admin',
        date: app.updatedAt,
      });
    }
    if (app.submittedAt) {
      items.push({
        id: `submitted-${app.id}`,
        event: 'App Review Submitted',
        details: 'Submitted for platform security & scope review',
        actor: 'Owner',
        date: app.submittedAt,
      });
    }
    if (app.reviewedAt) {
      items.push({
        id: `reviewed-${app.id}`,
        event: 'App Review Completed',
        details: app.reviewNotes || `Status set to ${app.status}`,
        actor: 'Platform Reviewer',
        date: app.reviewedAt,
      });
    }
    for (const k of apiKeys.data || []) {
      items.push({
        id: `key-create-${k.id}`,
        event: 'API Key Created',
        details: `Key "${k.name}" (${k.prefix}••••)`,
        actor: 'Developer',
        date: k.createdAt,
      });
      if (k.revokedAt) {
        items.push({
          id: `key-revoke-${k.id}`,
          event: 'API Key Revoked',
          details: `Key "${k.name}" (${k.prefix}••••) revoked`,
          actor: 'Developer',
          date: k.revokedAt,
        });
      }
    }
    for (const w of webhooks.data || []) {
      items.push({
        id: `wh-${w.id}`,
        event: 'Webhook Configured',
        details: `${w.endpointUrl} (${w.isActive ? 'Active' : 'Paused'})`,
        actor: 'Developer',
        date: w.createdAt,
      });
    }
    for (const l of logs.data?.data || []) {
      items.push({
        id: `log-${l.id}`,
        event: `API ${l.method} (${l.statusCode})`,
        details: `${l.endpoint} • ${l.durationMs}ms`,
        actor: l.ipAddress || 'API Client',
        date: l.createdAt,
      });
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [app, apiKeys.data, webhooks.data, logs.data]);

  return (
    <SectionCard title="Audit Logs" description="Review security events, API key changes, webhook configurations, and recent API activity.">
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b border-border/50 grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Event</div>
          <div className="col-span-5">Details</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-2 text-right">Date</div>
        </div>
        <div className="divide-y divide-border/50 bg-background/50 max-h-[480px] overflow-y-auto">
          {events.map((ev) => (
            <div key={ev.id} className="px-4 py-3 grid grid-cols-12 gap-4 text-sm items-center hover:bg-muted/20 transition-colors">
              <div className="col-span-3 font-medium text-foreground truncate">{ev.event}</div>
              <div className="col-span-5 text-muted-foreground truncate font-mono text-xs">{ev.details}</div>
              <div className="col-span-2 text-muted-foreground truncate text-xs">{ev.actor}</div>
              <div className="col-span-2 text-right text-muted-foreground text-xs">
                {new Date(ev.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function WebhooksTab({ app }: { app: DeveloperApp }) {
  // Real endpoints via /api/developer/apps/:id/webhooks (shared with /developer/webhooks).
  return (
    <div className="space-y-6">
      <WebhookManager fixedAppId={app.id} />
      <SpaceApiActionsPanel appId={app.id} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OAuthTab({ app }: { app: DeveloperApp }) {
  const saved = useMemo(() => parseRedirectUris(app), [app]);
  const savedScopes = useMemo(() => {
    try {
      return JSON.parse((app as any).requestedScopes || '[]');
    } catch {
      return [];
    }
  }, [app]);
  
  const [uris, setUris] = useState<string[]>(saved);
  const [scopes, setScopes] = useState<string[]>(savedScopes);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setUris(saved); setScopes(savedScopes); }, [saved, savedScopes]);
  const update = useUpdateApp(app);
  
  const dirty = JSON.stringify(uris) !== JSON.stringify(saved) || JSON.stringify(scopes) !== JSON.stringify(savedScopes);
  const origin = appOrigin();

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

  const save = () =>
    update.mutate(
      { redirectUris: uris, requestedScopes: scopes },
      {
        onSuccess: () => toast.success('OAuth settings saved'),
        onError: (e: any) => toast.error(e?.message || 'Could not save OAuth settings'),
      }
    );

  return (
    <div className="space-y-6">
      <SectionCard
        title="OAuth Scopes"
        description="Select the permissions your app requires. People see these titles on the consent screen."
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 list-none m-0 p-0">
          {OAUTH_SCOPES.map((sc: any) => {
            const on = Boolean(sc.always) || scopes.includes(sc.scope);
            return (
              <li key={sc.scope}>
                <label className={`flex items-start gap-2.5 text-sm ${sc.always ? 'cursor-default' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={on}
                    disabled={Boolean(sc.always)}
                    onChange={(e) => {
                      if (sc.always) return;
                      setScopes((prev) => (e.target.checked ? [...prev, sc.scope] : prev.filter((x) => x !== sc.scope)));
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground leading-snug">{sc.title}</span>
                    <span className="block text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{sc.description}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
          <div className="text-xs font-semibold text-foreground mb-1">Consent screen preview</div>
          <p className="text-[11.5px] text-muted-foreground mb-3">
            This is how selected permissions appear when someone connects your app.
          </p>
          <ul className="space-y-2">
            {OAUTH_SCOPES.filter((sc) => sc.always || scopes.includes(sc.scope)).map((sc) => (
              <li key={`preview-${sc.scope}`} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{sc.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{sc.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>
      <SectionCard
        title="Redirect URIs"
        description="Where Wevsoft sends people after they approve."
        footer={
          <>
            {dirty && <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>}
            <button type="button" className={btnSecondary} disabled={!dirty || update.isPending} onClick={() => { setUris(saved); setScopes(savedScopes); }}>
              Reset
            </button>
            <button type="button" className={btnPrimary} disabled={!dirty || update.isPending} onClick={save}>
              {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setErr(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="https://yourapp.com/callback"
            className={inputCls}
            maxLength={1024}
          />
          <button type="button" onClick={add} className={btnSecondary}>
            Add
          </button>
        </div>
        {err && <div className="text-red-500 text-sm mt-1">{err}</div>}
        {uris.length > 0 && (
          <ul className="mt-4 space-y-2">
            {uris.map((u) => (
              <li
                key={u}
                className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border text-sm break-all gap-3"
              >
                <span>{u}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUris((prev) => prev.filter((x) => x !== u));
                    setErr(null);
                  }}
                  className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

  /* ------------------------------------------------------------------ */




function DangerTab({ app }: { app: DeveloperApp }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: async () => (await api.delete(`/api/developer/apps/${app.id}`)).data,
    onSuccess: () => {
      setOpen(false);
      queryClient.removeQueries({ queryKey: DEV_KEYS.app(app.id) });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      toast.success(`${app.name} was deleted. You can restore it within 30 days.`);
      navigate('/developer', { replace: true });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not delete the app'),
  });

  return (
    <>
      <SectionCard
        tone="danger"
        title="Delete this app"
        description="Deletes the app and immediately revokes its API keys and access. The app can be restored by the owner for 30 days (revoked keys stay revoked); after that it is permanently removed."
        footer={
          <button type="button" className={btnDanger} onClick={() => setOpen(true)}>
            <Trash2 className="w-4 h-4" /> Delete app
          </button>
        }
      >
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Anyone signed in through {app.name} loses access right away.</li>
          <li>The client ID <code className="font-mono text-xs text-foreground">{app.clientId}</code> can't be reused.</li>
        </ul>
      </SectionCard>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => del.mutate()}
        busy={del.isPending}
        title={`Delete ${app.name}?`}
        description="The app will stop working right away and its API keys are revoked permanently. You can restore the app within 30 days."
        confirmLabel="Delete app"
        requireText={app.name}
      />
    </>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="mt-8 lg:grid lg:grid-cols-[220px_1fr] gap-8">
        <div className="hidden lg:block space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

