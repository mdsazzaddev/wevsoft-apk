import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle, AlertTriangle, AppWindow, ArrowRight, ArrowUp, BookOpen, Briefcase, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, CircleArrowDown, CircleCheck, Command, File, FileText, Gauge, Globe, Info, Key, KeyRound, LayoutGrid, Loader2,
  MoreHorizontal, PackagePlus, Plus, Settings, Shield, ShieldAlert, ShieldCheck, SquareCode, Users, Webhook, Zap,
} from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import { useStore } from '../../store';
import {
  DEV_KEYS, DOCS_READ_KEY, OAUTH_SCOPES, categoryLabel, isHttpUrl, parseRedirectUris, type DeveloperApp,
} from './devApi';
import { AppAvatar, CopyButton, cx } from './devUi';
import { useConsole } from './console/DeveloperConsoleShell';
import { useDevAccount } from './console/accountContext';
import {
  CONSOLE_KEY_GENERATED, appStatusMeta, appTypeLabel, compactNumber, envLabel, lastUsedLabel, readLocal,
  useAllAppsUsage, useConnectedPlatforms, useConsoleWebhooks, usageSeries, writeLocal, type ConnectedPlatform, type ConsoleWebhook, type UsageRange, type UsageTotals,
} from './console/consoleData';
import { PLATFORM_BRANDS } from './console/BrandIcons';
import { DeveloperQuickstartModal } from './console/components/DeveloperQuickstartModal';

/**
 * WebSoft Developer Console — dashboard (/developer).
 * Shell (top bar, sidebar, footer) lives in ./console/DeveloperConsoleShell, mounted once by
 * ./console/DeveloperConsoleLayout for every /developer/* route.
 */
export default function DeveloperDashboard() {
  // Account, apps, the Create App modal and the console shell come from DeveloperConsoleLayout.
  const { me, registered, appsQuery: apps, openCreate } = useDevAccount();

  return (
    <main className="px-4 sm:px-[22px] pt-[20px] pb-8">
      {me.isLoading ? (
        <DashboardSkeleton />
      ) : me.isError ? (
        <ErrorPanel message={(me.error as Error)?.message} onRetry={() => me.refetch()} />
      ) : !registered ? (
        <RegisterView />
      ) : (
        <DashboardBody
          apps={apps.data || []}
          loading={apps.isLoading}
          error={apps.isError ? (apps.error as Error)?.message || 'Failed to load apps' : null}
          onRetry={() => apps.refetch()}
          onCreate={openCreate}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function Card({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cx('dc-card scroll-mt-4 min-w-0', className)}>
      {children}
    </section>
  );
}

function CardHead({ title, action, className }: { title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center justify-between gap-2 px-[14px] pt-[13px] pb-[10px]', className)}>
      <h2 className="flex items-center gap-[9px] text-[12.5px] font-bold text-[var(--dc-text)] tracking-[-0.005em]">{title}</h2>
      {action}
    </div>
  );
}

function ViewAll({ onClick, to, label = 'View all', small }: { onClick?: () => void; to?: string; label?: string; small?: boolean }) {
  const cls = (small ? 'text-[9px] ' : 'text-[10.5px] ') + 'font-medium text-[var(--dc-blue)] hover:underline whitespace-nowrap';
  return to ? <Link to={to} className={cls}>{label}</Link> : <button type="button" onClick={onClick} className={cls}>{label}</button>;
}

const PILL_TONES = {
  green: 'bg-[var(--dc-green-soft)] text-[#15803d]',
  blue: 'bg-[var(--dc-blue-soft)] text-[#1d4ed8]',
  amber: 'bg-[var(--dc-amber-soft)] text-[#b45309]',
  gray: 'bg-[var(--dc-hover)] text-[var(--dc-muted)]',
  red: 'bg-[var(--dc-red-soft)] text-[#dc2626]',
} as const;

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: React.ReactNode }) {
  return <span className={cx('inline-flex items-center h-[17px] px-[8px] rounded-[4px] text-[9.5px] font-semibold whitespace-nowrap', PILL_TONES[tone])}>{children}</span>;
}

const CATEGORY_SUBTITLE: Record<string, string> = {
  social: 'Social Media Integration',
  games: 'Gaming Application',
  productivity: 'Productivity Tools',
  business: 'Business Integration',
  education: 'Education Platform',
  utilities: 'Utility Integration',
};

function appSubtitle(app: DeveloperApp): string {
  return (app.category && CATEGORY_SUBTITLE[app.category]) || (app.mode === 'production' ? `${categoryLabel(app.category)} Application` : 'Testing & Development');
}

function AppGlyph({ app, dark }: { app: DeveloperApp; dark?: boolean }) {
  if (app.logoUrl) return <AppAvatar name={app.name} logoUrl={app.logoUrl} size="sm" className="!w-[30px] !h-[30px] !rounded-[6px]" />;
  return (
    <span className={cx('w-[30px] h-[30px] rounded-[6px] grid place-items-center shrink-0', dark ? 'bg-[#0f1d3a] text-[#38bdf8] ring-2 ring-[#1e3a8a]' : 'bg-[var(--dc-blue-soft)] text-[var(--dc-blue)]')}>
      <AppWindow size={15} strokeWidth={2} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard body                                                       */
/* ------------------------------------------------------------------ */

interface BodyProps {
  apps: DeveloperApp[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
}

function DashboardBody({ apps, loading, error, onRetry, onCreate }: BodyProps) {
  const [showQuickstart, setShowQuickstart] = useState(false);
  const platforms = useConnectedPlatforms();
  const hooks = useConsoleWebhooks(apps);
  const usage = useAllAppsUsage(apps);
  const platformList = platforms.data || [];

  return (
    <>
      <div className="grid grid-cols-1 min-[1340px]:grid-cols-[minmax(0,1fr)_266px] gap-x-[18px] gap-y-[14px]">
        {/* ---------- Left / main column ---------- */}
        <div className="min-w-0">
          <DashboardHeader onCreate={onCreate} onOpenQuickstart={() => setShowQuickstart(true)} />
          <StatCards apps={apps} platforms={platformList} webhookHealth={hooks.health} usage={usage} />
          {error ? (
            <div className="mt-[14px]"><ErrorPanel message={error} onRetry={onRetry} /></div>
          ) : (
            <div className="mt-[14px] grid grid-cols-1 min-[1340px]:grid-cols-[minmax(0,1fr)_170px] gap-[11px]">
              <div className="min-w-0 flex flex-col gap-[11px]">
                <div className="grid grid-cols-1 lg:grid-cols-[520fr_285fr] gap-[11px]">
                  <YourApplications apps={apps} loading={loading} onCreate={onCreate} />
                  <RecentlyUsed apps={apps} loading={loading} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[520fr_285fr] gap-[11px]">
                  <ApiUsageCard usage={usage} />
                  <IntegrationOverview platforms={platformList} loading={platforms.isLoading} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[11px]">
                  <RecentActivityCard apps={apps} platforms={platformList} webhooks={hooks.webhooks} />
                  <SecurityAlertsCard apps={apps} webhookHealth={hooks.health} />
                </div>
              </div>
              <div className="min-w-0 grid grid-cols-1 sm:grid-cols-3 min-[1340px]:flex min-[1340px]:flex-col gap-[11px] min-[1340px]:gap-[15px]">
                <QuickActionsCard variant="compact" />
                <ChecklistCard variant="compact" apps={apps} platforms={platformList} webhooks={hooks.webhooks} />
                <LatestDocsCard />
              </div>
            </div>
          )}
        </div>

        {/* ---------- Right column ---------- */}
        <div className="min-w-0 grid grid-cols-1 md:grid-cols-2 min-[1340px]:flex min-[1340px]:flex-col gap-[14px] min-[1340px]:gap-[19px] min-[1340px]:pt-[5px] content-start">
          <QuickActionsCard variant="wide" />
          <ChecklistCard variant="wide" apps={apps} platforms={platformList} webhooks={hooks.webhooks} />
        </div>
      </div>

      <DeveloperQuickstartModal
        isOpen={showQuickstart}
        onClose={() => setShowQuickstart(false)}
        apps={apps}
      />
    </>
  );
}

function DashboardHeader({ onCreate, onOpenQuickstart }: { onCreate: () => void; onOpenQuickstart: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 min-h-[52px]">
      <div className="min-w-0 pl-[4px]">
        <h1 className="flex items-center gap-[10px] text-[18.5px] leading-[26px] font-bold text-[var(--dc-text)] tracking-[-0.01em]">
          <span className="text-[22px] leading-none" aria-hidden>👋</span> Developer Dashboard
        </h1>
        <p className="mt-[3px] pl-[1px] text-[11.5px] text-[var(--dc-text-2)]">Manage your applications, integrations, and API usage all in one place.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-[7px]">
        <button
          type="button"
          onClick={onOpenQuickstart}
          className="inline-flex items-center gap-[6px] h-[31px] px-[13px] rounded-[6px] border border-[var(--dc-border-2)] bg-[var(--dc-card)] hover:bg-[var(--dc-hover)] text-[var(--dc-text)] text-[11.5px] font-semibold transition-colors"
        >
          <Zap size={14} className="text-amber-500 fill-amber-500" /> Quickstart Wizard
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-[8px] h-[31px] px-[15px] rounded-[6px] bg-[var(--dc-blue)] hover:bg-[#0f56dc] text-white text-[11.5px] font-semibold shadow-[0_2px_6px_rgba(22,99,242,0.35)] transition-colors"
        >
          <Plus size={15} strokeWidth={2.4} /> Create New App
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat cards                                                           */
/* ------------------------------------------------------------------ */

type Tone = 'blue' | 'green' | 'red';
const ICON_TONES: Record<Tone, string> = {
  blue: 'bg-[var(--dc-blue-soft)] text-[var(--dc-blue)]',
  green: 'bg-[var(--dc-green-soft)] text-[var(--dc-green)]',
  red: 'bg-[var(--dc-red-soft)] text-[var(--dc-red)]',
};

interface Stat {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: Tone;
  sub: React.ReactNode;
  delta?: { value: string; good: boolean };
  progress?: number;
  onClick: () => void;
}

function StatCards({ apps, platforms, webhookHealth, usage }: { apps: DeveloperApp[]; platforms: ConnectedPlatform[]; webhookHealth: number | null; usage: UsageTotals }) {
  const { runTarget, goAppTab } = useConsole();
  const total = apps.length;
  const published = apps.filter((a) => a.status === 'live').length;
  const development = total - published;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const connected = platforms.filter((p) => p.isConnected && !p.connection?.needsReconnect).length;
  const available = platforms.length;
  const health = usage.webhookHealth ?? webhookHealth;
  const fmtDelta = (d: number | null) => (d === null ? undefined : `${d > 0 ? '+' : ''}${d}%`);

  const stats: Stat[] = [
    { title: 'Total Applications', value: String(total), icon: LayoutGrid, tone: 'blue', sub: <>{published} published <span className="mx-[3px]">•</span> {development} development</>, onClick: () => runTarget({ kind: 'route', to: '/developer/apps' }) },
    { title: 'Published Applications', value: String(published), icon: Briefcase, tone: 'blue', sub: `${pct(published)}% of total`, onClick: () => runTarget({ kind: 'hash', id: 'all-applications' }) },
    { title: 'Development Applications', value: String(development), icon: SquareCode, tone: 'blue', sub: `${pct(development)}% of total`, onClick: () => runTarget({ kind: 'hash', id: 'all-applications' }) },
    { title: 'Connected Integrations', value: String(connected), icon: Command, tone: 'green', sub: `of ${available} available`, onClick: () => runTarget({ kind: 'route', to: '/developer/integrations/connected' }) },
    { title: 'API Requests', value: usage.loading ? '…' : usage.requests7.toLocaleString('en-US'), icon: CircleArrowDown, tone: 'blue', delta: fmtDelta(usage.requestsDelta) ? { value: fmtDelta(usage.requestsDelta)!, good: (usage.requestsDelta ?? 0) >= 0 } : undefined, sub: usage.requests7 ? 'last 7 days' : 'No API traffic in the last 7 days', onClick: () => runTarget({ kind: 'route', to: '/developer/analytics' }) },
    { title: 'Failed Requests', value: usage.loading ? '…' : usage.failed7.toLocaleString('en-US'), icon: CircleAlert, tone: 'red', delta: fmtDelta(usage.failedDelta) ? { value: fmtDelta(usage.failedDelta)!, good: (usage.failedDelta ?? 0) <= 0 } : undefined, sub: 'HTTP 4xx/5xx, last 7 days', onClick: () => runTarget({ kind: 'route', to: '/developer/analytics' }) },
    { title: 'Webhook Health', value: health === null ? '—' : `${health}%`, icon: Webhook, tone: 'green', sub: health === null ? 'No deliveries yet' : 'successful deliveries (30 days)', onClick: () => runTarget({ kind: 'route', to: '/developer/webhooks' }) },
    { title: 'API Quota Usage', value: usage.quotaLimit ? `${usage.quotaPercent}%` : '—', icon: Gauge, tone: 'blue', progress: usage.quotaPercent, sub: usage.quotaLimit ? `${compactNumber(usage.monthRequests)} of ${compactNumber(usage.quotaLimit)} requests this month` : 'Create an app to get a quota', onClick: () => runTarget({ kind: 'route', to: '/developer/usage' }) },
  ];

  return (
    <div className="mt-[10px] grid grid-cols-1 min-[640px]:grid-cols-2 min-[1340px]:grid-cols-4 gap-x-[12px] gap-y-[12px]">
      {stats.map((s) => (
        <button
          key={s.title}
          type="button"
          onClick={s.onClick}
          className="dc-card group text-left flex items-start gap-[13px] px-[14px] pt-[14px] pb-[12px] hover:border-[var(--dc-border-2)] hover:shadow-md transition-shadow min-w-0"
        >
          <span className={cx('w-[32px] h-[32px] rounded-[7px] grid place-items-center shrink-0', ICON_TONES[s.tone])}>
            <s.icon size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[10.6px] font-medium text-[var(--dc-text-2)]">{s.title}</span>
              <ArrowRight size={13} className="shrink-0 text-[var(--dc-muted)] group-hover:translate-x-0.5 transition-transform" />
            </span>
            <span className="mt-[5px] flex items-center gap-[12px]">
              <span className="text-[20px] leading-[24px] font-bold text-[var(--dc-text)] tracking-[-0.01em]">{s.value}</span>
              {s.delta && (
                <span className={cx('inline-flex items-center gap-[2px] text-[10px] font-semibold', s.delta.good ? 'text-[var(--dc-green)]' : 'text-[var(--dc-red)]')}>
                  <ArrowUp size={11} strokeWidth={2.6} /> {s.delta.value}
                </span>
              )}
            </span>
            {typeof s.progress === 'number' && (
              <span className="mt-[4px] block h-[5px] rounded-full bg-[var(--dc-track)] overflow-hidden">
                <span className="block h-full rounded-full bg-[var(--dc-blue)]" style={{ width: `${s.progress}%` }} />
              </span>
            )}
            <span className={cx('block truncate text-[10.2px] text-[var(--dc-muted)]', typeof s.progress === 'number' ? 'mt-[4px]' : 'mt-[7px]')}>{s.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Applications                                                         */
/* ------------------------------------------------------------------ */

function YourApplications({ apps, loading, onCreate }: { apps: DeveloperApp[]; loading: boolean; onCreate: () => void }) {
  const { runTarget } = useConsole();
  const navigate = useNavigate();
  const rows = apps.slice(0, 3);
  const border = (i: number) => (i > 0 ? 'border-t border-[var(--dc-border)]' : '');
  return (
    <Card id="your-applications" className="pb-[10px]">
      <CardHead title="Your Applications" action={<ViewAll to="/developer/apps" />} className="pt-[15px] pb-[11px]" />
      <div className="px-[10px] overflow-x-auto">
        <table className="w-full min-w-[460px] text-left border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] font-medium text-[var(--dc-text-2)]">
              <th className="bg-[var(--dc-card-2)] rounded-l-[5px] h-[28px] pl-[6px] font-medium w-[44%]">App Name</th>
              <th className="bg-[var(--dc-card-2)] font-medium w-[20%]">Type</th>
              <th className="bg-[var(--dc-card-2)] font-medium w-[19%]">Environment</th>
              <th className="bg-[var(--dc-card-2)] font-medium">Status</th>
              <th className="bg-[var(--dc-card-2)] rounded-r-[5px] w-[22px]" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0, 1].map((i) => (
                <tr key={i}>
                  <td colSpan={5} className="py-[10px]"><div className="h-[30px] rounded-md bg-[var(--dc-hover)] animate-pulse" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <KeyRound size={26} className="mx-auto text-[var(--dc-faint)]" />
                  <p className="mt-2 text-[11.5px] text-[var(--dc-muted)]">No apps yet. Create your first OAuth app to get started.</p>
                  <button type="button" onClick={onCreate} className="mt-3 inline-flex items-center gap-1.5 h-[28px] px-3 rounded-[6px] bg-[var(--dc-blue)] text-white text-[11px] font-semibold">
                    <Plus size={13} /> Create New App
                  </button>
                </td>
              </tr>
            ) : (
              rows.map((app, i) => {
                const uris = parseRedirectUris(app);
                const status = appStatusMeta(app);
                return (
                  <tr key={app.id} onClick={() => navigate(`/developer/apps/${app.id}`)} className="group cursor-pointer text-[10.5px] text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]">
                    <td className={cx('pl-[6px] py-[11px]', border(i))}>
                      <div className="flex items-center gap-[12px] min-w-0">
                        <AppGlyph app={app} dark={i % 2 === 1} />
                        <div className="min-w-0">
                          <Link to={`/developer/apps/${app.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[11.2px] font-semibold text-[var(--dc-text)] group-hover:text-[var(--dc-blue)]">
                            {app.name}
                          </Link>
                          <p className="truncate text-[10.2px] text-[var(--dc-muted)] mt-[2px]">{appSubtitle(app)}</p>
                        </div>
                      </div>
                    </td>
                    <td className={border(i)}>{appTypeLabel(app, uris)}</td>
                    <td className={border(i)}>{envLabel(app)}</td>
                    <td className={border(i)}><Pill tone={status.tone}>{status.label}</Pill></td>
                    <td className={cx('text-[var(--dc-muted)]', border(i))}><ChevronRight size={14} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RecentlyUsed({ apps, loading }: { apps: DeveloperApp[]; loading: boolean }) {
  const { runTarget } = useConsole();
  const recent = useMemo(
    () => [...apps].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3),
    [apps],
  );
  return (
    <Card className="pb-[6px]">
      <CardHead title="Recently Used Applications" action={<ViewAll to="/developer/apps" />} className="pt-[15px] pb-[6px]" />
      {loading ? (
        <div className="px-[14px] space-y-2 py-2">{[0, 1, 2].map((i) => <div key={i} className="h-[36px] rounded-md bg-[var(--dc-hover)] animate-pulse" />)}</div>
      ) : recent.length === 0 ? (
        <p className="px-[14px] py-8 text-center text-[11px] text-[var(--dc-muted)]">Apps you open will show up here.</p>
      ) : (
        <ul>
          {recent.map((app, i) => (
            <li key={app.id}>
              <Link to={`/developer/apps/${app.id}`} className={cx('flex items-center gap-[10px] px-[12px] py-[10px] hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
                <span className="w-[26px] h-[26px] rounded-[6px] grid place-items-center bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] shrink-0">
                  {app.logoUrl ? <AppAvatar name={app.name} logoUrl={app.logoUrl} size="sm" className="!w-[26px] !h-[26px] !rounded-[6px]" /> : <AppWindow size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-[var(--dc-text)]">{app.name}</span>
                  <span className="block truncate text-[9.6px] text-[var(--dc-muted)] mt-[2px]">Last used {lastUsedLabel(app.updatedAt)}</span>
                </span>
                <Pill tone={app.mode === 'production' ? 'green' : 'blue'}>{envLabel(app)}</Pill>
                <ChevronRight size={14} className="text-[var(--dc-muted)] shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions + checklist                                            */
/* ------------------------------------------------------------------ */

function useQuickActions() {
  const { openCreate, goAppTab } = useConsole();
  const navigate = useNavigate();
  return [
    { label: 'Create New App', icon: PackagePlus, run: openCreate },
    { label: 'Configure OAuth', icon: Shield, run: () => navigate('/developer/oauth/clients') },
    {
      label: 'Generate API Key',
      icon: KeyRound,
      run: () => {
        writeLocal(CONSOLE_KEY_GENERATED, '1');
        navigate('/developer/credentials');
      },
    },
    { label: 'Explore APIs', icon: File, run: () => navigate('/developer/api-explorer') },
    { label: 'Add Webhook', icon: Webhook, run: () => navigate('/developer/webhooks') },
    { label: 'View Documentation', icon: FileText, run: () => navigate('/developer/docs') },
  ];
}

function QuickActionsCard({ variant }: { variant: 'wide' | 'compact' }) {
  const actions = useQuickActions();
  if (variant === 'wide') {
    return (
      <Card className="px-[20px] pt-[15px] pb-[16px]">
        <h2 className="flex items-center gap-[14px] text-[13.5px] font-bold text-[var(--dc-text)] mb-[12px]">
          <Zap size={19} className="text-[var(--dc-blue)] fill-[var(--dc-blue)]" /> Quick Actions
        </h2>
        <div className="space-y-[9px]">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.run}
              className="w-full h-[34px] flex items-center gap-[16px] px-[12px] rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-card)] hover:border-[var(--dc-border-2)] hover:bg-[var(--dc-hover)] text-left transition-colors"
            >
              <a.icon size={16} strokeWidth={1.9} className="text-[var(--dc-blue)] shrink-0" />
              <span className="flex-1 text-[11px] font-medium text-[var(--dc-text)]">{a.label}</span>
              <ChevronRight size={14} className="text-[var(--dc-text-2)]" />
            </button>
          ))}
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="flex items-center gap-[12px] px-[14px] h-[38px] text-[12px] font-bold text-[var(--dc-text)] border-b border-[var(--dc-border)]">
        <Zap size={15} className="text-[var(--dc-blue)]" /> Quick Actions
      </h2>
      <ul>
        {actions.map((a, i) => (
          <li key={a.label}>
            <button type="button" onClick={a.run} className={cx('w-full h-[34px] flex items-center gap-[10px] px-[12px] text-left hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
              <a.icon size={14} strokeWidth={1.9} className="text-[var(--dc-blue)] shrink-0" />
              <span className="flex-1 truncate text-[9.8px] font-medium text-[var(--dc-text)]">{a.label}</span>
              <ChevronRight size={12} className="text-[var(--dc-muted)]" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function useChecklist(apps: DeveloperApp[], platforms: ConnectedPlatform[], webhooks: ConsoleWebhook[]) {
  const { openCreate, goAppTab, runTarget } = useConsole();
  const navigate = useNavigate();
  return [
    { label: 'Create your first application', done: apps.length > 0, run: openCreate },
    { label: 'Configure OAuth 2.0', done: apps.some((a) => parseRedirectUris(a).length > 0), run: () => goAppTab('oauth') },
    { label: 'Generate API key', done: readLocal(CONSOLE_KEY_GENERATED) === '1', run: () => { writeLocal(CONSOLE_KEY_GENERATED, '1'); goAppTab('credentials'); } },
    { label: 'Connect an integration', done: platforms.some((p) => p.isConnected), run: () => runTarget({ kind: 'route', to: '/developer/integrations/connected' }) },
    { label: 'Set up webhooks', done: webhooks.length > 0, run: () => goAppTab('webhooks') },
    { label: 'Read the documentation', done: readLocal(DOCS_READ_KEY) === '1', run: () => navigate('/developer/docs') },
  ];
}

function ChecklistCard({ variant, apps, platforms, webhooks }: { variant: 'wide' | 'compact'; apps: DeveloperApp[]; platforms: ConnectedPlatform[]; webhooks: ConsoleWebhook[] }) {
  const items = useChecklist(apps, platforms, webhooks);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const wide = variant === 'wide';
  return (
    <Card className={wide ? 'px-[20px] pt-[19px] pb-[14px]' : 'px-[12px] pt-[13px] pb-[8px]'}>
      <h2 className={cx('font-bold text-[var(--dc-text)]', wide ? 'text-[13px]' : 'text-[11px]')}>Getting Started Checklist</h2>
      <p className={cx('mt-[5px]', wide ? 'text-[11px] text-[var(--dc-muted)]' : 'text-[10px] text-[var(--dc-blue)]')}>{done} of {items.length} completed</p>
      <div className={cx('rounded-full bg-[var(--dc-track)] overflow-hidden mt-[9px] h-[5px]', !wide && 'w-[95%]')}>
        <div className="h-full rounded-full bg-[var(--dc-blue)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className={wide ? 'mt-[14px] space-y-[3px]' : 'mt-[10px]'}>
        {items.map((it) => (
          <li key={it.label}>
            <button type="button" onClick={it.run} className={cx('w-full flex items-center text-left rounded-md hover:bg-[var(--dc-hover)]', wide ? 'gap-[14px] h-[26.5px] px-[2px]' : 'gap-[9px] h-[19.5px]')}>
              {it.done ? (
                <CheckCircle2 size={wide ? 17 : 13} className="shrink-0 text-white fill-[#16a34a]" strokeWidth={2.4} />
              ) : (
                <span className={cx('shrink-0 rounded-full border-[1.5px] border-[var(--dc-border-2)] mx-[0.5px]', wide ? 'w-[16px] h-[16px]' : 'w-[12px] h-[12px]')} />
              )}
              <span className={cx('truncate text-[var(--dc-text-2)]', wide ? 'text-[11.2px]' : 'text-[8.8px]')}>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* API usage chart                                                      */
/* ------------------------------------------------------------------ */

function ApiUsageCard({ usage }: { usage: UsageTotals }) {
  const [range, setRange] = useState<UsageRange>(7);
  const data = useMemo(() => usageSeries(usage.daily, range), [usage.daily, range]);
  const max = Math.max(0, ...data.map((d) => d.successful + d.failed));
  const step = max <= 10 ? 2 : max <= 100 ? 20 : max <= 1000 ? 200 : 1000;
  const top = Math.max(step * 4, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const empty = !usage.loading && data.every((d) => d.successful === 0 && d.failed === 0);
  return (
    <Card id="api-usage" className="flex flex-col">
      <div className="flex items-center gap-[12px] px-[14px] pt-[12px]">
        <h2 className="text-[12.5px] font-bold text-[var(--dc-text)]">API Usage</h2>
        <label className="relative">
          <span className="sr-only">Range</span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as UsageRange)}
            className="appearance-none h-[21px] pl-[8px] pr-[22px] rounded-[5px] border border-[var(--dc-border)] bg-[var(--dc-card)] text-[9.8px] font-medium text-[var(--dc-text-2)] outline-none focus:border-[var(--dc-blue)]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-[6px] top-1/2 -translate-y-1/2 text-[var(--dc-muted)]" />
        </label>
      </div>
      <div className="flex items-center justify-end gap-[16px] px-[14px] mt-[4px] text-[9.5px] text-[var(--dc-text-2)]">
        <span className="flex items-center gap-[6px]"><span className="w-[10px] h-[3px] rounded-full bg-[var(--dc-blue-2)]" /> Successful</span>
        <span className="flex items-center gap-[6px]"><span className="w-[10px] h-[3px] rounded-full bg-[var(--dc-red)]" /> Failed</span>
      </div>
      <div className="relative h-[158px] pr-[14px] pl-[2px] pb-[8px]">
        {empty && (
          <p className="absolute inset-0 z-[1] grid place-items-center text-[11px] text-[var(--dc-muted)] pointer-events-none">
            No API requests in this period yet
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="dcUsageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f6bf2" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2f6bf2" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dc-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={range === 7 ? 0 : 'preserveStartEnd'}
              tick={{ fontSize: 9, fill: 'var(--dc-muted)' }}
              tickFormatter={(v: string, i: number) => (range === 7 && i === 0 ? '' : v)}
              dy={6}
            />
            <YAxis
              ticks={ticks}
              domain={[0, top]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: 'var(--dc-muted)' }}
              tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}K` : String(v))}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--dc-border)', background: 'var(--dc-card)', color: 'var(--dc-text)' }}
              formatter={(v: unknown, name: unknown) => [Number(v).toLocaleString('en-US'), name === 'successful' ? 'Successful' : 'Failed']}
            />
            <Area type="linear" dataKey="successful" stroke="#2f6bf2" strokeWidth={1.8} fill="url(#dcUsageFill)" dot={{ r: 2.6, fill: '#2f6bf2', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line type="linear" dataKey="failed" stroke="#ef4444" strokeWidth={1.6} dot={{ r: 2.4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Integrations                                                         */
/* ------------------------------------------------------------------ */

function IntegrationOverview({ platforms, loading }: { platforms: ConnectedPlatform[]; loading: boolean }) {
  const rows = ['google', 'facebook', 'youtube', 'wevchat'].map((key) => {
    const p = platforms.find((x) => x.platform.toLowerCase() === key);
    let status: { label: string; dot: string; text: string };
    if (p?.isConnected && !p.connection?.needsReconnect) status = { label: 'Connected', dot: 'bg-[#16a34a]', text: 'text-[#15803d]' };
    else if (p?.isConnected && p.connection?.needsReconnect) status = { label: 'Disconnected', dot: 'bg-[#ef4444]', text: 'text-[#dc2626]' };
    else status = { label: 'Not Connected', dot: 'bg-[#94a3b8]', text: 'text-[var(--dc-muted)]' };
    return { key, ...PLATFORM_BRANDS[key], status };
  });
  return (
    <Card id="integration-overview">
      <CardHead title="Integration Overview" action={<ViewAll to="/developer/integrations/connected" />} className="pt-[15px] pb-[6px]" />
      <ul>
        {rows.map((r, i) => (
          <li key={r.key}>
            <Link to="/settings?opt=acc_connected_accounts" className={cx('flex items-center gap-[14px] px-[14px] h-[41.5px] hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
              <r.Icon className="w-[19px] h-[19px] shrink-0" />
              <span className="flex-1 text-[11px] font-semibold text-[var(--dc-text)]">{r.name}</span>
              {loading ? (
                <span className="h-[10px] w-[60px] rounded bg-[var(--dc-hover)] animate-pulse" />
              ) : (
                <span className={cx('flex items-center gap-[6px] text-[9.8px] font-medium', r.status.text)}>
                  <span className={cx('w-[5px] h-[5px] rounded-full', r.status.dot)} /> {r.status.label}
                </span>
              )}
              <ChevronRight size={13} className="text-[var(--dc-muted)] ml-[10px]" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Activity, security, docs                                             */
/* ------------------------------------------------------------------ */

interface ActivityItem {
  title: string;
  time: number | null;
  tag: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  color: string;
  to?: string;
}

function RecentActivityCard({ apps, platforms, webhooks }: { apps: DeveloperApp[]; platforms: ConnectedPlatform[]; webhooks: ConsoleWebhook[] }) {
  const docsRead = readLocal(DOCS_READ_KEY) === '1';
  const items = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];
    const appName = (id: string) => apps.find((a) => a.id === id)?.name || 'App';
    for (const a of apps) {
      const created = new Date(a.createdAt).getTime();
      const updated = new Date(a.updatedAt).getTime();
      out.push({ title: 'Created new application', time: created, tag: a.name, icon: PackagePlus, color: 'text-[#16a34a]', to: `/developer/apps/${a.id}` });
      if (updated - created > 60_000) out.push({ title: 'Updated OAuth settings', time: updated, tag: a.name, icon: Settings, color: 'text-[#16a34a]', to: `/developer/apps/${a.id}/oauth` });
    }
    for (const w of webhooks) out.push({ title: 'Added webhook endpoint', time: new Date(w.createdAt).getTime(), tag: appName(w.appId), icon: Webhook, color: 'text-[#2563eb]', to: `/developer/apps/${w.appId}/webhooks` });
    for (const p of platforms) {
      if (p.isConnected && p.connection?.connectedAt) {
        const name = PLATFORM_BRANDS[p.platform.toLowerCase()]?.name || p.platform;
        out.push({ title: `Connected ${name} integration`, time: new Date(p.connection.connectedAt).getTime(), tag: 'Integrations', icon: Globe, color: 'text-[#2563eb]', to: '/settings?opt=acc_connected_accounts' });
      }
    }
    out.sort((a, b) => (b.time || 0) - (a.time || 0));
    const list = out.slice(0, docsRead ? 3 : 4);
    if (docsRead) list.push({ title: 'Viewed API documentation', time: null, tag: 'User Activity', icon: BookOpen, color: 'text-[#2563eb]', to: '/developer/docs' });
    return list;
  }, [apps, platforms, webhooks, docsRead]);

  return (
    <Card id="recent-activity" className="pb-[6px]">
      <CardHead title="Recent Developer Activity" action={<ViewAll to="/developer/activity" />} className="pt-[13px] pb-[6px]" />
      {items.length === 0 ? (
        <p className="px-[14px] py-8 text-center text-[11px] text-[var(--dc-muted)]">No developer activity yet.</p>
      ) : (
        <ul>
          {items.map((it, i) => (
            <li key={`${it.title}-${it.tag}-${i}`}>
              <Link to={it.to || '/developer'} className={cx('flex items-center gap-[12px] px-[14px] h-[37px] hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
                <it.icon size={15} strokeWidth={2} className={cx('shrink-0', it.color)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10.5px] font-medium text-[var(--dc-text)]">{it.title}</span>
                  <span className="block truncate text-[9.5px] text-[var(--dc-muted)] mt-[1px]">{it.time ? lastUsedLabel(new Date(it.time).toISOString()) : 'Recently'}</span>
                </span>
                <span className={cx('shrink-0 max-w-[45%] truncate h-[17px] leading-[17px] px-[8px] rounded-[4px] text-[9.3px] font-medium', it.tag === 'User Activity' || it.tag === 'Integrations' ? 'bg-[var(--dc-hover)] text-[var(--dc-text-2)]' : 'bg-[var(--dc-blue-soft)] text-[#1d4ed8]')}>
                  {it.tag}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface AlertItem {
  level: 'warning' | 'info' | 'ok' | 'critical';
  title: string;
  body: string;
  time: string;
  run: () => void;
}

const ALERT_ICONS: Record<AlertItem['level'], React.ReactNode> = {
  warning: <AlertTriangle size={17} className="text-white fill-[#f59e0b]" strokeWidth={2.2} />,
  critical: <ShieldAlert size={17} className="text-[#dc2626]" strokeWidth={2} />,
  info: <Info size={17} className="text-white fill-[#2563eb]" strokeWidth={2.2} />,
  ok: <CircleCheck size={17} className="text-[#16a34a]" strokeWidth={2.2} />,
};

function SecurityAlertsCard({ apps, webhookHealth }: { apps: DeveloperApp[]; webhookHealth: number | null }) {
  const { goAppTab } = useConsole();
  const navigate = useNavigate();
  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];
    const noUris = apps.filter((a) => parseRedirectUris(a).length === 0);
    if (noUris.length) {
      const a = noUris[0];
      out.push({
        level: 'warning',
        title: 'OAuth redirect URI not verified',
        body: noUris.length > 1 ? `${noUris.length} apps need verified redirect URIs for production.` : 'Please verify your redirect URIs for production.',
        time: lastUsedLabel(a.updatedAt),
        run: () => navigate(`/developer/apps/${a.id}/oauth`),
      });
    }
    const stale = apps
      // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
      .map((a) => ({ a, days: Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / 86_400_000) }))
      .filter((x) => x.days >= 76)
      .sort((x, y) => y.days - x.days)[0];
    if (stale) {
      out.push({
        level: 'info',
        title: 'API key rotation recommended',
        body: `Your API key will expire in ${Math.max(0, 90 - stale.days)} days.`,
        time: lastUsedLabel(stale.a.updatedAt),
        run: () => navigate(`/developer/apps/${stale.a.id}/credentials`),
      });
    }
    if (webhookHealth != null && webhookHealth < 95) {
      out.push({ level: 'critical', title: 'Webhook deliveries failing', body: `Only ${webhookHealth}% of recent deliveries succeeded.`, time: 'Just now', run: () => goAppTab('webhooks') });
    }
    if (!out.some((x) => x.level === 'critical')) {
      out.push({ level: 'ok', title: 'No critical security issues', body: 'All systems are running normally.', time: 'Just now', run: () => goAppTab('security') });
    }
    return out.slice(0, 3);
  }, [apps, webhookHealth, goAppTab, navigate]);

  return (
    <Card className="pb-[6px]">
      <CardHead title="Security Alerts" action={<ViewAll to="/developer/security" />} className="pt-[13px] pb-[6px]" />
      <ul>
        {alerts.map((al, i) => (
          <li key={al.title}>
            <button type="button" onClick={al.run} className={cx('w-full flex items-start gap-[12px] px-[14px] py-[10px] text-left hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
              <span className="mt-[1px] shrink-0">{ALERT_ICONS[al.level]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10.5px] font-semibold text-[var(--dc-text)]">{al.title}</span>
                  <span className="shrink-0 text-[9.5px] text-[var(--dc-muted)]">{al.time}</span>
                </span>
                <span className="block truncate text-[9.6px] text-[var(--dc-muted)] mt-[3px]">{al.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LatestDocsCard() {
  const navigate = useNavigate();
  const docs = [
    { title: 'Quick Start Guide', sub: 'Get started in 5 minutes', run: () => navigate('/developer/docs#overview') },
    { title: 'OAuth 2.0 Setup', sub: 'Configure authentication', run: () => navigate('/developer/oauth') },
    { title: 'API Reference', sub: 'Explore all endpoints', run: () => navigate('/developer/api-reference') },
    { title: 'Webhook Guide', sub: 'Real-time event integration', run: () => navigate('/developer/api-reference#webhooks') },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between px-[9px] pt-[10px] pb-[4px]">
        <h2 className="text-[10px] font-bold text-[var(--dc-text)] whitespace-nowrap">Latest Documentation</h2>
        <ViewAll to="/developer/docs" small />
      </div>
      <ul className="pb-[4px]">
        {docs.map((d, i) => (
          <li key={d.title}>
            <button type="button" onClick={d.run} className={cx('w-full flex items-center gap-[8px] px-[9px] h-[30px] text-left hover:bg-[var(--dc-hover)]', i > 0 && 'border-t border-[var(--dc-border)]')}>
              <span className="w-[18px] h-[18px] rounded-[4px] grid place-items-center bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] shrink-0">
                <FileText size={11} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[9.2px] font-semibold text-[var(--dc-text)] leading-[11px]">{d.title}</span>
                <span className="block truncate text-[8.6px] text-[var(--dc-muted)] leading-[11px]">{d.sub}</span>
              </span>
              <ChevronRight size={11} className="text-[var(--dc-muted)] shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* All applications (full management grid, below the fold)              */
/* ------------------------------------------------------------------ */

type AppFilter = 'all' | 'live' | 'development';

export function AllApplications({ apps, loading, error, onRetry, onCreate }: BodyProps) {
  const [filter, setFilter] = useState<AppFilter>('all');
  const live = apps.filter((a) => a.status === 'live');
  const dev = apps.filter((a) => a.status !== 'live');
  const list = filter === 'live' ? live : filter === 'development' ? dev : apps;
  const chip = (id: AppFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={cx(
        'h-[26px] px-3 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors',
        filter === id ? 'bg-[var(--dc-blue)] text-white' : 'bg-[var(--dc-hover)] text-[var(--dc-text-2)] hover:bg-[var(--dc-blue-soft)]',
      )}
    >
      {label} ({count})
    </button>
  );
  return (
    <Card id="all-applications" className="mt-[18px]">
      <div className="px-[16px] pt-[15px] pb-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--dc-border)]">
        <div>
          <h2 className="text-[13px] font-bold text-[var(--dc-text)]">All Applications</h2>
          <p className="text-[11px] text-[var(--dc-muted)] mt-[2px]">Manage every app, its credentials and OAuth settings in one place.</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 h-[30px] px-[14px] rounded-[6px] bg-[var(--dc-blue)] text-white text-[11.5px] font-semibold shrink-0">
          <Plus size={14} /> Connect New App
        </button>
      </div>
      <div className="px-[16px] py-[10px] flex items-center gap-2 overflow-x-auto border-b border-[var(--dc-border)]">
        {chip('all', 'All', apps.length)}
        {chip('live', 'Live', live.length)}
        {chip('development', 'Development', dev.length)}
      </div>
      <div className="p-[16px]">
        {error ? (
          <ErrorPanel message={error} onRetry={onRetry} />
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-[132px] rounded-lg bg-[var(--dc-hover)] animate-pulse" />)}</div>
        ) : !list.length ? (
          <div className="text-center py-10 text-[12px] text-[var(--dc-muted)] flex flex-col items-center">
            <KeyRound size={30} className="mb-3 text-[var(--dc-faint)]" />
            {apps.length ? 'No apps match this filter.' : 'No apps found. Create your first OAuth app to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((app) => {
              const status = appStatusMeta(app);
              return (
                <div key={app.id} className="rounded-lg border border-[var(--dc-border)] bg-[var(--dc-card)] p-[14px] hover:border-[var(--dc-border-2)] hover:shadow-sm transition group flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AppAvatar name={app.name} logoUrl={app.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <h3 className="text-[12.5px] font-bold text-[var(--dc-text)] truncate group-hover:text-[var(--dc-blue)]">{app.name}</h3>
                        <p className="text-[10.5px] text-[var(--dc-muted)] truncate mt-[1px]">{categoryLabel(app.category) || 'App Integration'}</p>
                      </div>
                    </div>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </div>
                  <div className="text-[10.5px] text-[var(--dc-muted)] mb-3 font-mono bg-[var(--dc-card-2)] border border-[var(--dc-border)] pl-2.5 pr-1 py-1 rounded-md flex items-center justify-between">
                    <span className="truncate">Client ID: {app.clientId.substring(0, 16)}...</span>
                    <CopyButton value={app.clientId} toastLabel="Client ID copied" className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <Link to={`/developer/apps/${app.id}`} className="flex-1 h-[28px] rounded-md bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] text-[11px] font-bold flex items-center justify-center gap-1.5 hover:brightness-95">
                      <Settings size={13} /> Manage
                    </Link>
                    <Link to={`/developer/apps/${app.id}/settings`} className="flex-1 h-[28px] rounded-md bg-[var(--dc-hover)] text-[var(--dc-text-2)] text-[11px] font-bold flex items-center justify-center gap-1.5 hover:brightness-95">
                      <Key size={13} /> Settings
                    </Link>
                    <Link to={`/developer/apps/${app.id}/credentials`} aria-label="Credentials" title="Credentials" className="w-[28px] h-[28px] rounded-md bg-[var(--dc-hover)] text-[var(--dc-muted)] grid place-items-center hover:brightness-95">
                      <MoreHorizontal size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Developer resources (OAuth config, keys, webhooks, security, quota)  */
/* ------------------------------------------------------------------ */

export function DeveloperResources({ apps, webhooks, usage }: { apps: DeveloperApp[]; webhooks: ConsoleWebhook[]; usage: UsageTotals }) {
  const { selectedApp, goAppTab } = useConsole();
  const uris = selectedApp ? parseRedirectUris(selectedApp) : [];
  const box = 'dc-card p-[14px] flex flex-col min-w-0';
  const head = (title: string, badge: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 mb-[12px]">
      <h3 className="text-[12.5px] font-bold text-[var(--dc-text)]">{title}</h3>
      {badge}
    </div>
  );
  const footBtn = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="text-[11px] font-bold text-[var(--dc-blue)] hover:underline inline-flex items-center gap-1">
      {label} <ArrowRight size={12} />
    </button>
  );
  const usedPct = usage.quotaPercent;
  return (
    <div id="developer-resources" className="mt-[14px] grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-[12px] scroll-mt-4">
      <div className={box}>
        {head('OAuth 2.0 Config', <Pill tone={uris.length ? 'green' : 'amber'}>{uris.length ? 'Configured' : 'Needs setup'}</Pill>)}
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dc-faint)]">Redirect URI</p>
            <p className="mt-1 text-[10.5px] font-mono text-[var(--dc-text-2)] truncate bg-[var(--dc-card-2)] border border-[var(--dc-border)] px-2 py-1 rounded">{uris[0] || 'No redirect URI yet'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dc-faint)]">Allowed Scopes</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {OAUTH_SCOPES.map((s) => <Pill key={s.scope} tone="green">{s.scope}</Pill>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--dc-border)]">
          <button type="button" onClick={() => goAppTab('oauth')} className="flex-1 h-[28px] rounded-md bg-[var(--dc-hover)] text-[11px] font-bold text-[var(--dc-text-2)]">Edit Config</button>
          <Link to="/developer/docs#authorize" className="flex-1 h-[28px] rounded-md bg-[var(--dc-hover)] text-[11px] font-bold text-[var(--dc-text-2)] grid place-items-center">View Docs</Link>
        </div>
      </div>

      <div className={box}>
        {head('API Keys & Secrets', <Pill tone="amber">{apps.length} Client ID{apps.length === 1 ? '' : 's'}</Pill>)}
        <div className="space-y-2 flex-1">
          {apps.length === 0 && <p className="text-[11px] text-[var(--dc-muted)]">Create an app to get a Client ID and secret.</p>}
          {apps.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-[var(--dc-text-2)] w-24 truncate">{a.name}</span>
              <span className="text-[10.5px] font-mono text-[var(--dc-muted)] truncate">{a.clientId.slice(0, 10)}…</span>
              <CopyButton value={a.clientId} toastLabel="Client ID copied" className="w-6 h-6 shrink-0" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--dc-border)] text-center">{footBtn('Manage All Keys', () => goAppTab('credentials'))}</div>
      </div>

      <div className={box}>
        {head('Webhook Endpoints', <Pill tone="green">{webhooks.length} Active</Pill>)}
        <div className="space-y-2 flex-1">
          {webhooks.length === 0 && <p className="text-[11px] text-[var(--dc-muted)]">No webhook endpoints yet.</p>}
          {webhooks.slice(0, 4).map((w) => (
            <Link key={w.id} to={`/developer/apps/${w.appId}/webhooks`} className="flex items-center justify-between gap-2 group">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--dc-blue)] shrink-0" />
                <span className="text-[10.5px] font-mono text-[var(--dc-text-2)] truncate group-hover:text-[var(--dc-blue)]">{w.endpointUrl}</span>
              </span>
              <span className="text-[10px] font-bold text-[var(--dc-green)] flex items-center gap-1 shrink-0"><ShieldCheck size={12} /> Active</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--dc-border)] text-center">{footBtn('Manage Webhooks', () => goAppTab('webhooks'))}</div>
      </div>

      <div className={box}>
        {head('Security & Access', <Pill tone="green">Secure</Pill>)}
        <div className="space-y-2.5 flex-1">
          {['Hashed client secrets', 'PKCE (S256 only)', 'HTTPS-only redirect URIs', 'Signed webhook payloads'].map((name) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-[10.8px] text-[var(--dc-text-2)] flex items-center gap-2"><ShieldAlert size={13} className="text-[var(--dc-faint)]" /> {name}</span>
              <Check size={14} className="text-[var(--dc-green)]" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--dc-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--dc-green)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[var(--dc-green)] rounded-full animate-pulse" /> All systems operational</span>
          {footBtn('Settings', () => goAppTab('security'))}
        </div>
      </div>

      <div className={box}>
        {head('API Quota', <Pill tone="blue">Monthly</Pill>)}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-[78px] h-[78px] shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path stroke="var(--dc-track)" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="var(--dc-blue)" strokeWidth="3.5" strokeDasharray={`${usedPct}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[15px] font-bold text-[var(--dc-text)]">{usedPct}%</span>
          </div>
          <div className="text-[10.5px] text-[var(--dc-muted)] space-y-1.5">
            <p><span className="inline-block w-2 h-2 rounded-full bg-[var(--dc-blue)] mr-1.5" />Used · {compactNumber(usage.monthRequests)}</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-[var(--dc-track)] mr-1.5" />Remaining · {compactNumber(Math.max(0, usage.quotaLimit - usage.monthRequests))}</p>
            <p>{usage.quotaLimit ? `of ${compactNumber(usage.quotaLimit)} requests this month` : 'No apps yet'}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--dc-border)] text-center">{footBtn('View Usage', () => goAppTab('analytics'))}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registration, loading, errors                                        */
/* ------------------------------------------------------------------ */

function RegisterView() {
  const queryClient = useQueryClient();
  const user = useStore((s) => s.user) as { name?: string | null } | null;
  const [companyName, setCompanyName] = useState(user?.name || '');
  const [website, setWebsite] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);

  const websiteInvalid = website.trim() !== '' && !isHttpUrl(website);
  const canSubmit = companyName.trim().length > 0 && !websiteInvalid && accepted;

  const register = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/developer/register', {
          companyName: companyName.trim(),
          website: website.trim() || undefined,
          acceptTerms: accepted,
        })
      ).data,
    onSuccess: () => {
      toast.success('Welcome to Wevsoft for Developers');
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
    },
    onError: (err: any) => toast.error(err?.message || 'Registration failed'),
  });

  const input = 'w-full h-[40px] px-3.5 rounded-lg bg-[var(--dc-card)] border border-[var(--dc-border-2)] text-[13px] text-[var(--dc-text)] focus:border-[var(--dc-blue)] focus:ring-2 focus:ring-[var(--dc-blue)]/15 outline-none transition';

  return (
    <section className="dc-card max-w-5xl mx-auto mt-6 overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_400px] gap-10 p-8 sm:p-10">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dc-blue-soft)] px-3 py-1 text-[11px] font-bold text-[var(--dc-blue)]">
            <Zap size={13} className="fill-[var(--dc-blue)]" /> WebSoft Platform
          </span>
          <h1 className="mt-5 text-[34px] font-black tracking-tight text-[var(--dc-text)] leading-tight">
            Build with <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">WebSoft</span>
          </h1>
          <p className="mt-3 text-[var(--dc-muted)] text-[14px] max-w-xl leading-relaxed">
            Register a developer account to create apps, get OAuth credentials and connect your product to the ecosystem.
          </p>
          <ul className="mt-8 space-y-3">
            {[{ icon: Users, t: 'Sign in with WebSoft', d: 'Let people use their account seamlessly.' }, { icon: ShieldCheck, t: 'Secure by default', d: 'Hashed secrets and PKCE security.' }].map((f) => (
              <li key={f.t} className="flex gap-4 p-4 rounded-lg bg-[var(--dc-card-2)] border border-[var(--dc-border)]">
                <div className="w-10 h-10 rounded-lg bg-[var(--dc-blue-soft)] grid place-items-center shrink-0">
                  <f.icon className="text-[var(--dc-blue)] w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[13px] text-[var(--dc-text)]">{f.t}</p>
                  <p className="text-[12px] text-[var(--dc-muted)] mt-0.5">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (canSubmit && !register.isPending) register.mutate();
          }}
          className="rounded-xl border border-[var(--dc-border)] bg-[var(--dc-card-2)] p-6 self-start"
          noValidate
        >
          <h2 className="text-[17px] font-bold text-[var(--dc-text)]">Developer Account</h2>
          <p className="text-[12px] text-[var(--dc-muted)] mt-1 mb-5">It's free and takes a few seconds.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--dc-text-2)] mb-1.5">Company or developer name</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={input} placeholder="Acme Inc." />
              {touched && !companyName.trim() && <p className="mt-1 text-[11px] text-[var(--dc-red)]">Enter a name</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--dc-text-2)] mb-1.5">Website (optional)</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={input} placeholder="https://acme.com" />
              {websiteInvalid && <p className="mt-1 text-[11px] text-[var(--dc-red)]">Use a full http(s) URL</p>}
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-card)] p-3.5 cursor-pointer hover:border-[var(--dc-border-2)]">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-blue-600" />
              <span className="text-[12px] text-[var(--dc-muted)] leading-relaxed">I agree to the <Link to="/developer/docs#platform-terms" className="text-[var(--dc-blue)] hover:underline">Terms</Link> and will protect people's data.</span>
            </label>
            {touched && !accepted && <p className="-mt-2 text-[11px] text-[var(--dc-red)]">Please accept the terms</p>}
          </div>
          <button type="submit" disabled={register.isPending} className="w-full mt-6 h-[40px] bg-[var(--dc-blue)] hover:bg-[#0f56dc] text-white text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
            {register.isPending && <Loader2 className="animate-spin w-4 h-4" />} Register as Developer
          </button>
        </form>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  const b = 'rounded-lg bg-[var(--dc-card)] border border-[var(--dc-border)]';
  return (
    <div className="animate-pulse grid grid-cols-1 min-[1340px]:grid-cols-[minmax(0,1fr)_266px] gap-[18px]">
      <div className="space-y-[12px]">
        <div className="h-[58px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={cx(b, 'h-[92px]')} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[520fr_285fr_170fr] gap-[11px]">
          <div className={cx(b, 'h-[194px]')} />
          <div className={cx(b, 'h-[194px]')} />
          <div className={cx(b, 'h-[244px]')} />
        </div>
      </div>
      <div className="space-y-[19px]">
        <div className={cx(b, 'h-[308px]')} />
        <div className={cx(b, 'h-[263px]')} />
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="bg-[var(--dc-red-soft)] border border-[var(--dc-border)] text-[#dc2626] p-5 rounded-lg flex items-center justify-between gap-4 max-w-2xl mx-auto mt-6">
      <div className="flex items-center gap-3"><AlertCircle size={22} /> <p className="font-semibold text-[13px]">{message || 'An error occurred loading the dashboard.'}</p></div>
      <button type="button" onClick={onRetry} className="px-4 h-[32px] bg-white/60 hover:bg-white rounded-md font-bold text-[12px]">Retry</button>
    </div>
  );
}
