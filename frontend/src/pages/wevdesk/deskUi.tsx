/** WevDesk building blocks, sized to the reference design. */

import React from 'react';
import { Link } from 'react-router-dom';
import { WevDeskIcon } from '../../icons/WevDeskIcon';

/** Developer Console routes open in a new browser tab from outside the console. */
export function isDevConsolePath(to?: string | null): boolean {
  return Boolean(to && /^\/developer(?:[/?#]|$)/.test(to));
}

export function newTabProps(to?: string | null): { target?: string; rel?: string } {
  return isDevConsolePath(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function WevDeskLogo({ className }: { className?: string }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <span className="grid place-items-center wd-logo-mark w-[30px] h-[30px] rounded-[9px] bg-blue-600 text-white shadow-sm shadow-blue-600/30 dark:bg-blue-500"><WevDeskIcon size={18} strokeWidth={2} /></span>
      <span className="text-[17px] font-bold tracking-[-0.01em] text-[var(--wd-text)]">WevDesk</span>
    </span>
  );
}

export function DeskCard({
  title,
  subtitle,
  to,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Title links here (the full page for this tile). */
  to?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('wd-card wd-tile p-[18px] pb-4 flex flex-col', className)}>
      <h3 className="wd-tile-title text-[15px] font-semibold text-[var(--wd-text)] leading-tight tracking-[-0.01em]">
        {to ? (
          <Link to={to} {...newTabProps(to)} className="wd-tile-link hover:text-[var(--wd-teal)] transition-colors">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {subtitle && <p className="mt-0.5 text-[11.5px] text-[var(--wd-muted)]">{subtitle}</p>}
      <div className="mt-2 flex-1 flex flex-col">{children}</div>
    </section>
  );
}

/** One label/value line inside a card, separated by hairlines like the reference. */
export function Row({ label, children, tall }: { label: React.ReactNode; children?: React.ReactNode; tall?: boolean }) {
  return (
    <div className={cx('flex items-center gap-3 border-t border-[var(--wd-line)] first:border-t-0', tall ? 'py-2.5' : 'py-[9px]')}>
      <span className="flex-1 min-w-0 text-[12.5px] text-[var(--wd-text-2)]">{label}</span>
      {children !== undefined && <span className="shrink-0 flex items-center">{children}</span>}
    </div>
  );
}

export function Num({ value }: { value: number | string }) {
  return <span className="text-[12.5px] font-semibold text-[var(--wd-text)] tabular-nums">{value}</span>;
}

/** Muted right-hand hint; a link when `to` is given. */
export function Hint({ children, to, title }: { children: React.ReactNode; to?: string; title?: string }) {
  const cls = 'text-[11.5px] text-[var(--wd-muted)]';
  return to ? (
    <Link to={to} title={title} {...newTabProps(to)} className={cx(cls, 'hover:text-[var(--wd-teal)] hover:underline underline-offset-2')}>
      {children}
    </Link>
  ) : (
    <span title={title} className={cls}>
      {children}
    </span>
  );
}

export function Pill({ children, tone = 'green', title }: { children: React.ReactNode; tone?: 'green' | 'ai' | 'grey'; title?: string }) {
  const tones = {
    green: 'bg-[var(--wd-green-soft)] text-[var(--wd-green)]',
    ai: 'wd-pill-ai bg-[var(--wd-ai)] text-white',
    grey: 'bg-[var(--wd-chip)] text-[var(--wd-muted)]',
  };
  return (
    <span title={title} className={cx('wd-pill inline-flex items-center h-[22px] px-2.5 rounded-full text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  );
}

const BTN =
  'wd-btn inline-flex items-center justify-center gap-1.5 h-[34px] px-3.5 rounded-[10px] border border-[var(--wd-btn-border)] bg-white text-[12.5px] font-medium text-[var(--wd-text)] whitespace-nowrap transition-colors';

/** Outlined button. `to` → navigation; `disabled` keeps the tooltip so people learn why. */
export function DeskButton({
  children,
  to,
  onClick,
  disabled,
  title,
  className,
}: {
  children?: React.ReactNode;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  if (to && !disabled) {
    return (
      <Link to={to} title={title} {...newTabProps(to)} className={cx(BTN, 'hover:bg-[#f6f7f9]', className)}>
        {children}
      </Link>
    );
  }
  return (
    <span title={title} className="inline-flex">
      <button type="button" onClick={onClick} disabled={disabled} className={cx(BTN, disabled ? 'opacity-55 cursor-not-allowed' : 'hover:bg-[#f6f7f9]', className)}>
        {children}
      </button>
    </span>
  );
}

/** Switch — pass `disabled` when the caller cannot edit (defaults enabled). */
export function Toggle({ on = false, disabled = false, title, onChange }: { on?: boolean; disabled?: boolean; title?: string; onChange?: (v: boolean) => void }) {
  return (
    <span title={title} className="inline-flex">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange?.(!on)}
        className={cx(
          'wd-switch relative w-[32px] h-[18px] rounded-full transition-colors',
          on && !disabled ? 'bg-[var(--wd-teal)]' : 'bg-[var(--wd-toggle)]',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span className={cx('absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
      </button>
    </span>
  );
}

export function Chip({ children, active, disabled, onClick, title }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void; title?: string }) {
  return (
    <span title={title} className="inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cx(
          'wd-chip h-[26px] px-3 rounded-full text-[11.5px] font-medium transition-colors',
          active ? 'bg-[var(--wd-text)] text-white' : 'bg-[var(--wd-chip)] text-[var(--wd-text-2)]',
          disabled ? 'cursor-not-allowed opacity-80' : !active && 'hover:bg-[#e3e6ea]',
        )}
      >
        {children}
      </button>
    </span>
  );
}

export const SOON = 'Coming soon — this part of WevDesk has no backend yet';

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(undefined, { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
}

/** Header card for WevDesk sub-pages. */
export function PageHeader({ icon: Icon, title, subtitle, actions, badge }: { icon: React.ComponentType<{ size?: number }>; title: string; subtitle: string; actions?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <section className="wd-card wd-pagehead p-[18px] sm:p-5 flex flex-wrap items-start gap-4">
      <span className="grid place-items-center wd-iconchip w-11 h-11 rounded-[12px] bg-[#e7f3f0] text-[var(--wd-teal)] shrink-0"><Icon size={20} /></span>
      <div className="flex-1 min-w-[220px]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
          {badge}
        </div>
        <p className="mt-0.5 text-[12.5px] text-[var(--wd-muted)] max-w-2xl">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="wd-card wd-stat px-[18px] py-4">
      <p className="text-[12px] font-medium text-[var(--wd-text-2)]">{label}</p>
      <p className="mt-1.5 text-[24px] leading-none font-bold tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11.5px] text-[var(--wd-muted)]">{sub}</p>
    </div>
  );
}

export function EmptyNote({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="wd-empty rounded-[12px] border border-dashed border-[var(--wd-btn-border)] bg-[#fafbfc] px-5 py-8 text-center">
      <p className="text-[13.5px] font-semibold">{title}</p>
      {children && <p className="mt-1 text-[12px] text-[var(--wd-muted)] max-w-md mx-auto">{children}</p>}
    </div>
  );
}
