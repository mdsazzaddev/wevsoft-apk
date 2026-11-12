/**
 * Shared primitives for the WevSpace Management dashboard (Master Prompt 2 §1).
 *
 * These are deliberately thin: they encode the design language already used by
 * SpaceOfferingsPanel / SpaceIdentity (bg-card + border-border + rounded-3xl
 * cards, rounded-2xl actions, text-xs font-extrabold labels, dashed empty
 * states, accent applied inline) so sixteen panels can stay consistent without
 * each one re-deriving it. No new visual system, no animation beyond the
 * skeleton pulse and the existing hover transitions.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { resolveAvatarUrl } from '../../UserAvatar';
import { spaceInitials } from '@wevsoft/shared/wevspace';

// ──────────────────────────────────────────────────────────────
// Data loading
// ──────────────────────────────────────────────────────────────

export interface PanelData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Optimistic local patch, so a row can update without a full refetch. */
  patch: (next: T | ((current: T) => T)) => void;
}

/**
 * The load/error/reload cycle every panel repeats. `deps` behaves like a
 * useEffect dependency list; the fetcher is re-run whenever it changes, and a
 * response that arrives after the deps moved on is discarded rather than
 * overwriting fresher state.
 */
export function usePanelData<T>(fetcher: () => Promise<T>, deps: React.DependencyList): PanelData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const fetcherRef = useRef(fetcher);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (generation.current === mine) setData(result);
    } catch (err: any) {
      if (generation.current === mine) {
        setError(err?.message || 'Could not load this section');
        setData(null);
      }
    } finally {
      if (generation.current === mine) setLoading(false);
    }
     
  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patch = useCallback((next: T | ((current: T) => T)) => {
    setData((current) => {
      if (typeof next === 'function') {
        return current === null ? current : (next as (c: T) => T)(current);
      }
      return next;
    });
  }, []);

  return { data, loading, error, reload, patch };
}

// ──────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────

export function PanelHeader({
  title,
  blurb,
  actions,
}: {
  title: string;
  blurb?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-black">{title}</h2>
        {blurb && <p className="mt-1 text-xs text-muted-foreground max-w-2xl">{blurb}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`bg-card border border-border rounded-3xl ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="text-sm font-black">{children}</h3>
      {right}
    </div>
  );
}

/** A single number. `hint` carries the unit or the comparison, never a promise. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span style={accent ? { color: accent } : undefined}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{hint}</p>}
    </>
  );
  if (!onClick) return <div className="bg-card border border-border rounded-3xl p-4">{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-card border border-border rounded-3xl p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      {inner}
    </button>
  );
}

export function PanelSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${tall ? 'h-40' : 'h-20'} rounded-3xl bg-muted animate-pulse`} />
      ))}
    </div>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 text-center">
      <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <AlertTriangle size={18} />
      </span>
      <p className="mt-3 text-sm font-bold">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  blurb,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  blurb?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-2 border-dashed border-border rounded-3xl p-8 sm:p-10 text-center">
      <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="mt-3 font-black text-sm">{title}</p>
      {blurb && <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">{blurb}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The one honest way to say "this exists but is not finished". MP1 forbids fake
 * buttons; a panel that cannot act yet says so here rather than rendering inert
 * controls.
 */
export function ComingLater({ what }: { what: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 border border-border px-3 py-2.5 text-[11px] font-bold text-muted-foreground">
      {what}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Controls
// ──────────────────────────────────────────────────────────────

type ButtonTone = 'accent' | 'plain' | 'ghost' | 'danger';

export interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  accent?: string;
  busy?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  full?: boolean;
  title?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

export function ActionButton({
  children,
  onClick,
  tone = 'plain',
  accent,
  busy = false,
  disabled = false,
  size = 'md',
  full = false,
  title,
  ariaLabel,
  type = 'button',
}: ActionButtonProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2.5 text-xs';
  const tones: Record<ButtonTone, string> = {
    accent: 'text-primary-foreground shadow-sm hover:opacity-90',
    plain: 'bg-muted hover:bg-black/5 dark:hover:bg-white/10',
    ghost: 'bg-transparent border border-border hover:bg-black/5 dark:hover:bg-white/5',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl font-extrabold transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${pad} ${tones[tone]} ${full ? 'w-full' : ''}`}
      style={tone === 'accent' ? { background: accent || 'var(--color-primary)' } : undefined}
    >
      {busy && <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  tone = 'plain',
  busy = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  tone?: 'plain' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled || busy}
      className={`p-2 rounded-xl transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        tone === 'danger'
          ? 'bg-muted text-red-500 hover:bg-red-500/10'
          : 'bg-muted hover:bg-black/5 dark:hover:bg-white/10'
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  count,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  count?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-xs font-extrabold">{label}</span>
        {count && <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{count}</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] font-bold text-red-500">{error}</span>}
    </label>
  );
}

export const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/40';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={`${inputClass} ${className}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea {...rest} className={`${inputClass} resize-none ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return <select {...rest} className={`${inputClass} ${className}`} />;
}

/** Row-shaped switch used by every settings section. */
export function ToggleRow({
  label,
  blurb,
  checked,
  onChange,
  disabled = false,
  accent,
}: {
  label: string;
  blurb?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        {blurb && <p className="mt-0.5 text-[11px] text-muted-foreground">{blurb}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          checked ? '' : 'bg-muted'
        }`}
        style={checked ? { background: accent || 'var(--color-primary)' } : undefined}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

/** Horizontal scrolling filter strip — on a phone this is the whole nav. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  accent,
  counts,
}: {
  /** Extra fields (e.g. `days`) are allowed; `value` drives the tab id type. */
  options: ReadonlyArray<{ id: string; label: string }>;
  value: T;
  onChange: React.Dispatch<React.SetStateAction<T>>;
  accent?: string;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
      {options.map((option) => {
        const active = option.id === value;
        const count = counts?.[option.id];
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id as T)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            style={active ? { background: accent || 'var(--color-primary)' } : undefined}
          >
            {option.label}
            {typeof count === 'number' && count > 0 && (
              <span
                className={`px-1.5 rounded-md text-[10px] tabular-nums ${
                  active ? 'bg-black/20' : 'bg-black/10 dark:bg-white/10'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({
  children,
  tone,
  accent,
}: {
  children: React.ReactNode;
  tone?: string;
  accent?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${
        tone || (accent ? '' : 'bg-muted text-muted-foreground')
      }`}
      style={!tone && accent ? { background: `${accent}1a`, color: accent } : undefined}
    >
      {children}
    </span>
  );
}

/** Tone classes for a status word, so every panel colours states alike. */
export function statusTone(status: unknown): string {
  const value = String(status || '').toUpperCase();
  if (['ACTIVE', 'PAID', 'PUBLISHED', 'VERIFIED', 'OFFICIAL', 'ACCEPTED', 'APPROVED', 'RESOLVED', 'VISIBLE'].includes(value)) {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  }
  if (['PENDING', 'PENDING_REVIEW', 'PENDING_PAYMENT', 'AWAITING_REVIEW', 'SCHEDULED', 'REQUESTED', 'DRAFT'].includes(value)) {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  }
  if (['REJECTED', 'FAILED', 'DISPUTED', 'SPAM', 'BANNED', 'REMOVED', 'DELETED', 'PENDING_DELETION', 'SUSPENDED'].includes(value)) {
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
  }
  if (['PAUSED', 'ARCHIVED', 'CANCELLED', 'EXPIRED', 'REVOKED', 'HIDDEN', 'TRASHED'].includes(value)) {
    return 'bg-muted text-muted-foreground';
  }
  return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
}

/**
 * Centred dialog on a desktop, bottom sheet on a phone — the shape already used
 * by SpaceOfferingsPanel's editor, so the dashboard's editors feel the same.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  wide = false,
  elevated = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  /**
   * Raises this sheet above an ordinary one, for a sheet that opens *on top of*
   * another sheet. Base sheets sit at z-[70] so they clear the mobile bottom nav
   * (also z-50); without that, footer actions like Composer Publish fail
   * elementFromPoint hit-tests even though they look in-viewport. A programmatic
   * `.click()` ignores hit-testing and would pass either way.
   */
  elevated?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    if (!root) return;

    const focusables = () =>
      [...root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');

    const list = focusables();
    (list[0] || root).focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (!nodes.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (!active || active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${elevated ? 'z-[80]' : 'z-[70]'} flex items-end justify-center bg-black/50 sm:items-center sm:p-4`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col bg-card border border-border rounded-t-3xl sm:rounded-3xl outline-none`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
          <h3 className="font-black text-base">{title}</h3>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Two-step destructive confirm. Reuses the platform's native confirm dialog. */
export function confirmAction(message: string): boolean {
  return typeof window === 'undefined' ? false : window.confirm(message);
}

// ──────────────────────────────────────────────────────────────
// People and time
// ──────────────────────────────────────────────────────────────

export interface PersonRef {
  id?: string;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
}

export function PersonAvatar({
  person,
  size = 36,
  accent,
}: {
  person: PersonRef | null | undefined;
  size?: number;
  accent?: string;
}) {
  const url = resolveAvatarUrl(person?.avatar || null);
  return (
    <span
      className="inline-grid place-items-center shrink-0 rounded-full overflow-hidden bg-muted"
      style={{ width: size, height: size, background: url ? undefined : accent }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span className="font-black text-white" style={{ fontSize: Math.round(size / 2.8) }}>
          {spaceInitials(person?.name || person?.username || '?')}
        </span>
      )}
    </span>
  );
}

export function PersonRow({
  person,
  meta,
  right,
  accent,
}: {
  person: PersonRef | null | undefined;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <PersonAvatar person={person} accent={accent} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{person?.name || 'Someone'}</p>
        {meta ? (
          <p className="text-[11px] text-muted-foreground truncate">{meta}</p>
        ) : person?.username ? (
          <p className="text-[11px] text-muted-foreground truncate">@{person.username}</p>
        ) : null}
      </div>
      {right && <div className="shrink-0 flex items-center gap-1.5">{right}</div>}
    </div>
  );
}

const NUMBER_FORMAT = new Intl.NumberFormat();

export function num(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? NUMBER_FORMAT.format(parsed) : '0';
}

export function money(amount: unknown, currency = 'USD'): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(parsed);
  } catch {
    // An unrecognised currency code must not blank out a revenue figure.
    return `${currency} ${NUMBER_FORMAT.format(parsed)}`;
  }
}

export function dateTime(value: unknown): string {
  const ms = Date.parse(String(value ?? ''));
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function dateOnly(value: unknown): string {
  const ms = Date.parse(String(value ?? ''));
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const RELATIVE_STEPS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60_000, 'second'],
  [3_600_000, 'minute'],
  [86_400_000, 'hour'],
  [604_800_000, 'day'],
  [2_629_800_000, 'week'],
  [31_557_600_000, 'month'],
];

export function relativeTime(value: unknown): string {
  const ms = Date.parse(String(value ?? ''));
  if (!Number.isFinite(ms)) return '';
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 45_000) return 'just now';
  for (const [limit, unit] of RELATIVE_STEPS) {
    if (abs < limit) {
      const divisor = limit / (unit === 'second' ? 1000 : unit === 'minute' ? 60 : unit === 'hour' ? 24 : unit === 'day' ? 7 : unit === 'week' ? 4.348 : 12);
      return formatter.format(Math.round(diff / divisor), unit);
    }
  }
  return formatter.format(Math.round(diff / 31_557_600_000), 'year');
}

/** Value for a `datetime-local` input, in the browser's own zone. */
export function toLocalInputValue(value: unknown): string {
  const ms = Date.parse(String(value ?? ''));
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Inline "saved" tick that fades itself out, for autosaving settings rows. */
export function SavedTick({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
      <Check size={12} /> Saved
    </span>
  );
}
