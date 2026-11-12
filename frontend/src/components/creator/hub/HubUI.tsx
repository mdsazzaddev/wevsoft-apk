/**
 * Creator Hub presentation primitives. They use the main app's tokens only
 * (bg-card / border-border / text-muted-foreground / primary, Inter scale from index.css)
 * so hub pages read like the rest of Wevsoft: plain headers, flat cards, one accent colour.
 * Content library filters (Posts / Reels / Videos / Stories) stay inside the hub — see ContentLibraryView.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../ui/cn';

export const hubCard = 'rounded-2xl border border-border bg-card text-card-foreground';
export const hubMuted = 'text-muted-foreground';
export const hubBtnPrimary =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
export const hubBtnSecondary =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
export const hubBtnGhost =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground';
export const hubInput =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30';

/** Page title row: h1 + one line of description + actions on the right. */
export function HubPageHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type HubTabItem<T extends string> = { id: T; label: string; count?: number | null };

/** Underlined tab strip, same as the profile page tabs. */
export function HubTabs<T extends string>({ items, value, onChange, className, label = 'Sections' }: { items: HubTabItem<T>[]; value: T; onChange: (id: T) => void; className?: string; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 [scrollbar-width:none] overflow-x-auto border-b border-border', className)}>
      {items.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Flat card section with a plain title row. */
export function HubSection({ title, description, action, children, className, bodyClassName, flush }: {
  title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
  className?: string; bodyClassName?: string; flush?: boolean;
}) {
  return (
    <section className={cn(hubCard, 'min-w-0', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? 'pt-2' : 'p-4', title || action ? (flush ? '' : 'pt-3') : '', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Text link used as a section action ("See all"). */
export function HubLink({ to, children, onClick }: { to?: string; children: React.ReactNode; onClick?: () => void }) {
  const cls = 'text-[13px] font-semibold text-primary hover:underline';
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

export type HubStat = { label: string; value: React.ReactNode; hint?: React.ReactNode; delta?: number | null };

/** One card, several numbers separated by dividers (instead of a card per number). */
export function HubStatRow({ stats, className }: { stats: HubStat[]; className?: string }) {
  const cols = ({ 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6' } as Record<number, string>)[stats.length] || 'sm:grid-cols-4';
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1', cols, className)}>
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 bg-card px-4 py-3.5">
          <div className="truncate text-[13px] text-muted-foreground">{s.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-semibold leading-tight tracking-tight text-foreground tabular-nums">{s.value}</span>
            {s.delta != null && <HubDelta value={s.delta} />}
          </div>
          {s.hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export function HubDelta({ value }: { value: number }) {
  const up = value >= 0;
  return <span className={cn('text-xs font-semibold tabular-nums', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{up ? '+' : '−'}{Math.abs(value)}%</span>;
}

/** Flat empty state: one line + at most one action. */
export function HubEmpty({ text, action, className }: { text: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-10 text-center', className)}>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

/** Settings-style list row: icon, title, description, trailing slot. */
export function HubRow({ icon: Icon, iconClassName, title, description, trailing, onClick, to }: {
  icon?: React.ElementType;
  /** Extra classes on the icon chip (e.g. `bg-gradient-to-br from-sky-400 to-blue-600 text-white`). */
  iconClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const body = (
    <>
      {Icon && (
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground', iconClassName)}>
          <Icon size={18} strokeWidth={iconClassName ? 2.1 : 2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors';
  if (to) return <Link to={to} className={cn(cls, 'hover:bg-surface-hover')}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(cls, 'hover:bg-surface-hover')}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

export function HubSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-muted', className)} />;
}

/** Recharts colours from the theme so charts follow the accent and dark mode. */
export const chartColors = {
  primary: 'var(--primary)',
  secondary: 'var(--muted-foreground)',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
};