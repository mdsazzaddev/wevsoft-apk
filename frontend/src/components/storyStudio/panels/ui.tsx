import { useState, type ReactNode } from 'react';

/** Hover/focus tooltip (also used to explain disabled "Coming soon" tools). */
export function Tip({ label, children, side = 'bottom' }: { label: string; children: ReactNode; side?: 'bottom' | 'top' | 'right' | 'left' }) {
  const pos =
    side === 'top'
      ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
      : side === 'right'
        ? 'left-full top-1/2 ml-1.5 -translate-y-1/2'
        : side === 'left'
          ? 'right-full top-1/2 mr-1.5 -translate-y-1/2'
          : 'top-full left-1/2 mt-1.5 -translate-x-1/2';
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[80] hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover/tip:block group-focus-within/tip:block dark:bg-slate-100 dark:text-slate-900 ${pos}`}
      >
        {label}
      </span>
    </span>
  );
}

export const COMING_SOON = 'Coming soon';

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[color:var(--ss-accent)]' : 'bg-[color:var(--ss-toggle-off)]'}`}
    >
      <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[21px]' : 'left-[3px]'}`} />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled,
  className = '',
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`ss-range w-full ${className}`}
      style={{ ['--ss-pct' as string]: `${pct}%` }}
    />
  );
}

export function Section({ title, children, right, className = '' }: { title: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`border-b border-[color:var(--ss-border)] px-4 py-3.5 last:border-b-0 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[color:var(--ss-text)]">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    setDraft(null);
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Math.round(n))));
  };
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-[color:var(--ss-muted)]">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        disabled={disabled}
        value={draft ?? String(Math.round(value))}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => draft !== null && commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setDraft(null);
        }}
        className="h-9 w-full min-w-0 rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-2.5 text-[13px] font-medium text-[color:var(--ss-text)] outline-none focus:border-[color:var(--ss-accent)] disabled:opacity-50"
      />
      {suffix ? <span className="sr-only">{suffix}</span> : null}
    </label>
  );
}

export const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--ss-text)] transition-colors hover:bg-[color:var(--ss-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
