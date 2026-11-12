import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Copy, Eye, EyeOff, Info, Loader2, PackagePlus, RefreshCw, UserPlus } from 'lucide-react';
import { copyText, cx } from '../devUi';
import type { DeveloperApp } from '../devApi';
import { useDevAccount } from './accountContext';

/* Console design primitives shared by every /developer/* page. */

export const btnBase =
  'inline-flex items-center justify-center gap-[6px] h-[34px] px-[14px] rounded-[10px] text-[12.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue)]/30';
export const btn = {
  primary: `${btnBase} bg-[var(--dc-blue)] text-white hover:brightness-110 shadow-[0_1px_2px_rgba(79,70,229,0.25)]`,
  secondary: `${btnBase} border border-[var(--dc-border-2)] bg-[var(--dc-card)] text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]`,
  danger: `${btnBase} border border-[var(--dc-red-soft)] bg-[var(--dc-card)] text-[var(--dc-red)] hover:bg-[var(--dc-red-soft)]`,
  ghost: `${btnBase} text-[var(--dc-blue)] hover:bg-[var(--dc-blue-soft)]`,
  sm: '!h-[28px] !px-[10px] !text-[11.5px] !rounded-[8px]',
};

export const inputCls =
  'w-full h-[36px] px-[12px] rounded-[10px] border border-[var(--dc-border)] bg-[var(--dc-card-2)] text-[12.5px] text-[var(--dc-text)] placeholder:text-[var(--dc-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--dc-blue)]/20 focus:border-[var(--dc-blue)] focus:bg-[var(--dc-card)]';
export const selectCls = `${inputCls} pr-8 appearance-auto`;
export const labelCls = 'block text-[11.5px] font-semibold text-[var(--dc-text-2)] mb-[5px]';

export const thCls = 'text-left text-[11px] font-medium text-[var(--dc-muted)] px-[16px] py-[9px] bg-[var(--dc-card-2)] border-y border-[var(--dc-border)] whitespace-nowrap';
export const tdCls = 'px-[16px] py-[11px] text-[12.5px] text-[var(--dc-text-2)] border-b border-[var(--dc-border)] align-middle';

/* ------------------------------------------------------------------ */

export function PageLoading() {
  return (
    <div className="px-4 sm:px-[22px] pt-[20px] pb-8 animate-pulse">
      <div className="h-6 w-56 rounded bg-[var(--dc-track)]" />
      <div className="mt-2 h-3.5 w-80 max-w-full rounded bg-[var(--dc-track)]" />
      <div className="mt-6 grid gap-3 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dc-card h-[86px]" />
        ))}
      </div>
      <div className="mt-4 dc-card h-[260px]" />
    </div>
  );
}

function RegisterGate() {
  return (
    <Card className="max-w-[640px]">
      <div className="p-6 flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center">
          <UserPlus size={22} />
        </span>
        <h2 className="mt-3 text-[15px] font-bold">Register as a developer to use this page</h2>
        <p className="mt-1 text-[12.5px] text-[var(--dc-muted)] max-w-[420px]">
          Registration is free and takes a few seconds. Afterwards you can create apps, manage credentials and configure webhooks.
        </p>
        <Link to="/developer" className={cx(btn.primary, 'mt-4')}>Register now</Link>
      </div>
    </Card>
  );
}

/**
 * Standard console page: breadcrumb, title, description, actions and body.
 * `requiresAccount` (default true) shows a register prompt for non-developers.
 */
export function ConsolePage({
  group,
  title,
  description,
  actions,
  children,
  requiresAccount = true,
}: {
  group: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  requiresAccount?: boolean;
}) {
  const { me, registered, apps } = useDevAccount();
  // App-scoped pages (/developer/apps/:id/<section>) show the app in the breadcrumb: App › Feature.
  const { id: routeAppId } = useParams<{ id?: string }>();
  const scopedApp = routeAppId ? apps.find((a) => a.id === routeAppId) : undefined;
  useEffect(() => {
    document.title = `${scopedApp ? `${scopedApp.name} · ` : ''}${title} · WebSoft Developer Console`;
  }, [title, scopedApp]);
  const gated = requiresAccount && !registered;
  return (
    <main className="px-4 sm:px-[28px] pt-[22px] pb-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-[5px] text-[11.5px] text-[var(--dc-muted)]">
        <Link to="/developer" className="hover:text-[var(--dc-blue)]">Developer Console</Link>
        <ChevronRight size={11} />
        {scopedApp ? (
          <Link to={`/developer/apps/${scopedApp.id}`} className="hover:text-[var(--dc-blue)] truncate max-w-[220px]">{scopedApp.name}</Link>
        ) : (
          <span>{group}</span>
        )}
        <ChevronRight size={11} />
        <span className="text-[var(--dc-text-2)] font-medium">{title}</span>
      </nav>
      <header className="mt-[8px] flex flex-col min-[900px]:flex-row min-[900px]:items-end gap-3 justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-[28px] font-bold tracking-[-0.015em] text-[var(--dc-text)]">{title}</h1>
          {description && <p className="mt-[4px] text-[12.5px] text-[var(--dc-muted)] max-w-[760px]">{description}</p>}
        </div>
        {actions && !gated && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </header>
      <div className="mt-[20px]">
        {requiresAccount && me.isLoading ? (
          <div className="dc-card h-[240px] grid place-items-center"><Loader2 className="animate-spin text-[var(--dc-muted)]" /></div>
        ) : requiresAccount && me.isError ? (
          <ErrorCard message={(me.error as Error)?.message} onRetry={() => me.refetch()} />
        ) : gated ? (
          <RegisterGate />
        ) : (
          children
        )}
      </div>
    </main>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx('dc-card min-w-0 scroll-mt-4', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-[18px] pt-[16px] pb-[12px]">
          <div className="min-w-0">
            {title && <h2 className="flex items-center gap-[8px] text-[14px] font-semibold text-[var(--dc-text)]">{title}</h2>}
            {description && <p className="mt-[2px] text-[11.5px] text-[var(--dc-muted)]">{description}</p>}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cx(title || action ? 'px-[18px] pb-[18px]' : 'p-[18px]', bodyClassName)}>{children}</div>
    </section>
  );
}

export const PILL_TONES = {
  green: 'bg-[var(--dc-green-soft)] text-[var(--dc-green-text)]',
  blue: 'bg-[var(--dc-blue-soft)] text-[var(--dc-blue-text)]',
  amber: 'bg-[var(--dc-amber-soft)] text-[var(--dc-amber-text)]',
  gray: 'bg-[var(--dc-hover)] text-[var(--dc-muted)]',
  red: 'bg-[var(--dc-red-soft)] text-[var(--dc-red-text)]',
} as const;
export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-[4px] h-[20px] px-[9px] rounded-full text-[10.5px] font-semibold whitespace-nowrap', PILL_TONES[tone], className)}>
      {children}
    </span>
  );
}

const TILE_TONES = {
  blue: 'bg-[var(--dc-blue-soft)] text-[var(--dc-blue)]',
  green: 'bg-[var(--dc-green-soft)] text-[var(--dc-green)]',
  amber: 'bg-[var(--dc-amber-soft)] text-[#d97706]',
  red: 'bg-[var(--dc-red-soft)] text-[var(--dc-red)]',
  gray: 'bg-[var(--dc-hover)] text-[var(--dc-muted)]',
} as const;

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'blue',
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TILE_TONES;
}) {
  return (
    <div className="dc-card px-[16px] py-[14px] flex items-start gap-[12px] min-w-0">
      <span className={cx('w-[34px] h-[34px] rounded-[8px] grid place-items-center shrink-0', TILE_TONES[tone])}>
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[var(--dc-muted)] truncate">{label}</p>
        <p className="mt-[2px] text-[20px] leading-[26px] font-bold text-[var(--dc-text)]">{value}</p>
        {hint && <p className="mt-[1px] text-[10.5px] text-[var(--dc-muted)] truncate">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-[8px] border border-dashed border-[var(--dc-border-2)] bg-[var(--dc-card-2)] px-6 py-10 flex flex-col items-center text-center', className)}>
      <span className="w-11 h-11 rounded-full bg-[var(--dc-card)] border border-[var(--dc-border)] text-[var(--dc-muted)] grid place-items-center">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[13px] font-semibold text-[var(--dc-text)]">{title}</p>
      {body && <p className="mt-1 text-[12px] text-[var(--dc-muted)] max-w-[440px]">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Amber banner for capabilities whose backend does not exist yet. Never pretends to succeed. */
export function NotConfigured({ title = 'Not configured yet', children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start gap-[10px] rounded-[8px] border border-[#fde68a] bg-[var(--dc-amber-soft)] px-[14px] py-[11px]', className)}>
      <Info size={15} className="text-[#d97706] shrink-0 mt-[1px]" />
      <div className="min-w-0 text-[11.5px] text-[var(--dc-text-2)]">
        <p className="font-semibold text-[#b45309]">{title}</p>
        <div className="mt-[2px]">{children}</div>
      </div>
    </div>
  );
}

export function InfoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start gap-[10px] rounded-[8px] border border-[#bfdbfe] bg-[var(--dc-blue-soft)] px-[14px] py-[10px] text-[11.5px] text-[var(--dc-text-2)]', className)}>
      <Info size={15} className="text-[var(--dc-blue)] shrink-0 mt-[1px]" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="dc-card px-5 py-8 flex flex-col items-center text-center">
      <AlertTriangle size={22} className="text-[var(--dc-red)]" />
      <p className="mt-2 text-[13px] font-semibold">Something went wrong</p>
      <p className="mt-1 text-[12px] text-[var(--dc-muted)]">{message || 'Could not load this data.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={cx(btn.secondary, 'mt-3')}>
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[38px] rounded-[6px] bg-[var(--dc-track)]" />
      ))}
    </div>
  );
}

/** Shown on app-scoped pages when the developer has no apps yet. */
export function NoAppsState({ what }: { what: string }) {
  const { openCreate } = useDevAccount();
  return (
    <EmptyState
      icon={PackagePlus}
      title="No applications yet"
      body={`Create your first application to manage ${what}.`}
      action={
        <button type="button" onClick={openCreate} className={btn.primary}>
          <PackagePlus size={14} /> Create App
        </button>
      }
    />
  );
}

export function AppSelect({
  apps,
  value,
  onChange,
  allowAll,
  className,
}: {
  apps: DeveloperApp[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
  className?: string;
}) {
  return (
    <select id="developer-app-selector" name="developer_app_id" aria-label="Application" value={value} onChange={(e) => onChange(e.target.value)} className={cx(selectCls, '!h-[30px] !text-[12px] w-auto min-w-[180px]', className)}>
      {allowAll && <option value="all">All applications</option>}
      {apps.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

export function CopyInline({ value, label = 'Copied', mono = true, className }: { value: string; label?: string; mono?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex max-w-full items-center gap-[6px] min-w-0', className)}>
      <span className={cx('min-w-0 truncate', mono && 'dc-code text-[11.5px]')} title={value}>{value}</span>
      <button type="button" onClick={() => copyText(value, label)} aria-label="Copy" className="shrink-0 w-[22px] h-[22px] grid place-items-center rounded text-[var(--dc-muted)] hover:text-[var(--dc-blue)] hover:bg-[var(--dc-hover)]">
        <Copy size={12} />
      </button>
    </span>
  );
}

export function SecretField({ value, label = 'Secret copied' }: { value: string | null | undefined; label?: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-[11.5px] text-[var(--dc-faint)]">Not available</span>;
  return (
    <span className="inline-flex items-center gap-[6px] min-w-0">
      <span className="dc-code text-[11.5px] truncate">{show ? value : '•'.repeat(Math.min(32, value.length))}</span>
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Reveal'} className="shrink-0 w-[22px] h-[22px] grid place-items-center rounded text-[var(--dc-muted)] hover:text-[var(--dc-blue)] hover:bg-[var(--dc-hover)]">
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button type="button" onClick={() => copyText(value, label)} aria-label="Copy" className="shrink-0 w-[22px] h-[22px] grid place-items-center rounded text-[var(--dc-muted)] hover:text-[var(--dc-blue)] hover:bg-[var(--dc-hover)]">
        <Copy size={12} />
      </button>
    </span>
  );
}

export function CodeBox({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cx('relative rounded-[8px] bg-[#0b1a30] text-[#dbe6f7] text-[11.5px] leading-[18px]', className)}>
      <button type="button" onClick={() => copyText(code, 'Copied')} aria-label="Copy code" className="absolute top-2 right-2 w-[26px] h-[26px] grid place-items-center rounded text-white/60 hover:text-white hover:bg-white/10">
        <Copy size={13} />
      </button>
      <pre className="dc-code overflow-x-auto p-[14px] pr-10 whitespace-pre">{code}</pre>
    </div>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-[9px] border-b border-[var(--dc-border)] last:border-b-0 min-w-0">
      <span className="text-[11.5px] text-[var(--dc-muted)] shrink-0">{label}</span>
      <span className="text-[12px] text-[var(--dc-text)] font-medium min-w-0 text-right truncate">{children}</span>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative w-[34px] h-[19px] rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed', checked ? 'bg-[var(--dc-blue)]' : 'bg-[var(--dc-border-2)]')}
    >
      <span className={cx('absolute top-[2px] w-[15px] h-[15px] rounded-full bg-white shadow transition-all', checked ? 'left-[17px]' : 'left-[2px]')} />
    </button>
  );
}

export function fmtDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, withTime ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function parseJsonList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const v = JSON.parse(String(raw || '[]'));
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function appScopes(app: DeveloperApp): string[] {
  return parseJsonList((app as DeveloperApp & { requestedScopes?: string }).requestedScopes);
}
