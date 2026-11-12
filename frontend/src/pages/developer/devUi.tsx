import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Copy, AlertTriangle, Loader2, X, BookOpen, LayoutGrid, Plus } from 'lucide-react';
import WevsoftMark from '../../components/auth/WevsoftMark';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Brand + app identity                                                */
/* ------------------------------------------------------------------ */

const AVATAR_GRADIENTS = [
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-fuchsia-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function appInitials(name: string): string {
  name = typeof name === 'string' ? name : '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const AVATAR_SIZES = {
  sm: 'w-9 h-9 text-xs rounded-lg',
  md: 'w-12 h-12 text-sm rounded-xl',
  lg: 'w-16 h-16 text-lg rounded-2xl',
  xl: 'w-20 h-20 text-2xl rounded-3xl',
};

export function AppAvatar({
  name,
  logoUrl,
  size = 'md',
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setBroken(false), [logoUrl]);
  const gradient = AVATAR_GRADIENTS[hashString(name || '?') % AVATAR_GRADIENTS.length];
  return (
    <div
      className={cx(
        'relative shrink-0 overflow-hidden flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        AVATAR_SIZES[size],
        logoUrl && !broken ? 'bg-muted' : `bg-gradient-to-br ${gradient}`,
        className,
      )}
    >
      {logoUrl && !broken ? (
        <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="tracking-tight">{appInitials(name)}</span>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; dot: string; pill: string }> = {
  live: { label: 'Live', dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20' },
  in_review: { label: 'In review', dot: 'bg-sky-500', pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/20' },
  draft: { label: 'Draft', dot: 'bg-amber-500', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS_STYLES[status] || { label: status || 'Unknown', dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground ring-border' };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', s.pill, className)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  const prod = mode === 'production';
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
        prod ? 'bg-primary/10 text-primary ring-primary/20' : 'bg-muted text-muted-foreground ring-border',
      )}
    >
      {prod ? 'Production' : 'Development'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export async function copyText(text: string, label = 'Copied to clipboard'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    toast.error('Could not copy. Select the text and copy it manually.');
    return false;
  }
}

export function CopyButton({
  value,
  label = 'Copy',
  toastLabel,
  className,
  showLabel = false,
}: {
  value: string;
  label?: string;
  toastLabel?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (await copyText(value, toastLabel)) setDone(true);
      }}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        showLabel ? 'px-2.5 py-1.5 text-xs font-medium' : 'w-8 h-8',
        className,
      )}
    >
      {done ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      {showLabel && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
}

/** Read-only monospace value with a copy button (client IDs, URLs, secrets). */
export function CopyField({
  value,
  display,
  toastLabel,
  className,
}: {
  value: string;
  display?: React.ReactNode;
  toastLabel?: string;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center gap-2 rounded-xl border border-border bg-muted/40 pl-3.5 pr-1.5 py-1.5 min-w-0', className)}>
      <code className="flex-1 min-w-0 truncate font-mono text-[13px] text-foreground">{display ?? value}</code>
      <CopyButton value={value} toastLabel={toastLabel} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-muted', className)} />;
}

export function AppCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3.5">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-9 w-full mt-5 rounded-xl" />
      <div className="flex justify-between mt-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose} />
      <div
        className={cx(
          'relative w-full bg-card text-card-foreground border border-border shadow-2xl rounded-t-3xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto',
          'animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 pb-[env(safe-area-inset-bottom)]',
          className || 'sm:max-w-md',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  busy = false,
  requireText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  /** When set, the user must type this exact text to enable the confirm button. */
  requireText?: string;
}) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (open) setTyped('');
  }, [open]);
  const blocked = Boolean(requireText) && typed.trim() !== requireText;
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} labelledBy="confirm-title">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={cx('w-11 h-11 rounded-full flex items-center justify-center shrink-0', tone === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary')}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
            <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</div>
          </div>
        </div>
        {requireText && (
          <label className="block mt-5">
            <span className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{requireText}</span> to confirm
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={cx(inputCls, 'mt-2')}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || blocked}
            className={tone === 'danger' ? btnDanger : btnPrimary}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

export const inputCls =
  'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 disabled:opacity-50 disabled:pointer-events-none';
export const btnPrimary = `${btnBase} bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-primary/25`;
export const btnSecondary = `${btnBase} border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-primary/15`;
export const btnDanger = `${btnBase} bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-500/25`;
export const btnGhost = `${btnBase} text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-primary/15`;

export function FieldLabel({ children, hint, htmlFor }: { children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">{children}</label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  footer,
  tone = 'default',
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
}) {
  return (
    <section
      className={cx(
        'rounded-2xl border bg-card shadow-sm overflow-hidden',
        tone === 'danger' ? 'border-red-500/30' : 'border-border',
        className,
      )}
    >
      {(title || description) && (
        <header className="px-5 sm:px-6 pt-5 sm:pt-6">
          {title && <h2 className={cx('text-base font-semibold', tone === 'danger' && 'text-red-600 dark:text-red-400')}>{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </header>
      )}
      {children && <div className="px-5 sm:px-6 py-5">{children}</div>}
      {footer && (
        <footer className={cx('px-5 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-end gap-2.5', tone === 'danger' ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-border bg-muted/30')}>
          {footer}
        </footer>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Code                                                                */
/* ------------------------------------------------------------------ */

export function CodeBlock({ tabs, className }: { tabs: { label: string; code: string }[]; className?: string }) {
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)];
  return (
    <div className={cx('rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm', className)}>
      <div className="flex items-center gap-1 px-2 border-b border-white/10 bg-white/[0.03]">
        <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setActive(i)}
              className={cx(
                'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                i === active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CopyButton value={current.code} className="text-slate-400 hover:text-white hover:bg-white/10" toastLabel="Code copied" />
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed overflow-x-auto font-mono"><code>{current.code}</code></pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Portal chrome                                                       */
/* ------------------------------------------------------------------ */

export function DevPortalBar({ onCreate, right }: { onCreate?: () => void; right?: React.ReactNode }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cx(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
      isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
    );
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link to="/developer" className="flex items-center gap-2 shrink-0 mr-1" aria-label="Wevsoft for Developers">
          <WevsoftMark className="h-4 w-auto" />
          <span className="font-semibold tracking-tight text-[15px] hidden sm:inline">
            Wevsoft <span className="text-muted-foreground font-normal">for Developers</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <NavLink to="/developer" end className={tab}>
            <LayoutGrid className="w-4 h-4" /> Apps
          </NavLink>
          <NavLink to="/developer/docs" className={tab}>
            <BookOpen className="w-4 h-4" /> Docs
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {right}
          {onCreate && (
            <button type="button" onClick={onCreate} className={cx(btnPrimary, 'py-2 px-3 sm:px-3.5')}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create app</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useMediaQuery(query: string): boolean {
  const mql = useMemo(() => (typeof window !== 'undefined' ? window.matchMedia(query) : null), [query]);
  const [matches, setMatches] = useState(() => Boolean(mql?.matches));
  useEffect(() => {
    if (!mql) return;
    const fn = () => setMatches(mql.matches);
    fn();
    mql.addEventListener('change', fn);
    return () => mql.removeEventListener('change', fn);
  }, [mql]);
  return matches;
}

export function IconClose({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="w-9 h-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
      <X className="w-5 h-5" />
    </button>
  );
}
