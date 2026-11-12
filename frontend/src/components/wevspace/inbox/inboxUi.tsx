/** Small presentational pieces shared by the Space Inbox screens. */

import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { resolveAvatarUrl } from '../../UserAvatar';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const AVATAR_TONES = ['#1663f2', '#0f9d76', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#4f46e5', '#65a30d'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] || '' : '')).toUpperCase();
}

/** Round avatar with an initials fallback and an optional presence dot. */
export function Avatar({
  person,
  size = 40,
  presence,
  square = false,
}: {
  person: { id?: string; name?: string | null; username?: string | null; avatar?: string | null } | null | undefined;
  size?: number;
  presence?: 'online' | 'offline' | null;
  square?: boolean;
}) {
  const url = resolveAvatarUrl(person?.avatar || null);
  const name = person?.name || person?.username || 'Someone';
  const seed = (person?.id || name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dot = Math.max(8, Math.round(size * 0.26));
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span
        className={cx('grid place-items-center w-full h-full overflow-hidden text-white font-semibold', square ? 'rounded-[10px]' : 'rounded-full')}
        style={{ background: url ? 'var(--si-hover)' : AVATAR_TONES[seed % AVATAR_TONES.length], fontSize: Math.max(10, size * 0.36) }}
      >
        {url ? <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" /> : initials(name)}
      </span>
      {presence && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--si-card)]"
          style={{ width: dot, height: dot, background: presence === 'online' ? 'var(--si-green)' : 'var(--si-faint)' }}
          aria-label={presence === 'online' ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}

/** Square icon button with a native tooltip; disabled buttons keep the tooltip (wrapped in a span). */
export function IconBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  tip,
  badge,
  className,
  size = 16,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  tip?: string;
  badge?: number;
  className?: string;
  size?: number;
}) {
  return (
    <span title={tip || label} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cx(
          'relative inline-grid place-items-center w-9 h-9 rounded-lg transition-colors',
          active ? 'bg-[var(--si-blue-soft)] text-[var(--si-blue)]' : 'text-[var(--si-muted)] hover:bg-[var(--si-hover)] hover:text-[var(--si-text)]',
          disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[var(--si-muted)]',
          className,
        )}
      >
        <Icon size={size} />
        {typeof badge === 'number' && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--si-red)] text-white text-[9.5px] font-bold leading-4 text-center tabular-nums">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    </span>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--si-blue)] text-white text-[13px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition',
  secondary:
    'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--si-border-2)] bg-[var(--si-card)] text-[var(--si-text)] text-[13px] font-semibold hover:bg-[var(--si-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition',
  small:
    'inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg border border-[var(--si-border-2)] bg-[var(--si-card)] text-[var(--si-text)] text-[12px] font-semibold hover:bg-[var(--si-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition',
  smallPrimary:
    'inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-[var(--si-blue)] text-white text-[12px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition',
};

/** Closes a popover on outside click / Escape. */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onClose);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) cb.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cb.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return ref;
}

export function Popover({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'absolute z-50 rounded-xl border border-[var(--si-border)] bg-[var(--si-card)] shadow-[0_12px_32px_rgba(15,29,58,0.16)] py-1.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onClick,
  disabled,
  tone,
  tip,
  right,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'danger';
  tip?: string;
  right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={tip}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
        tone === 'danger' ? 'text-[var(--si-red)]' : 'text-[var(--si-text)]',
        disabled ? 'opacity-45 cursor-not-allowed' : 'hover:bg-[var(--si-hover)]',
      )}
    >
      {Icon && <Icon size={15} className={tone === 'danger' ? '' : 'text-[var(--si-muted)]'} />}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {right}
    </button>
  );
}

/** Honest "not built yet" panel — used for nav items and features without a backend. */
export function ComingNext({
  icon: Icon,
  title,
  blurb,
  points,
  children,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  points?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto si-scroll p-4 sm:p-6">
      <div className="si-card max-w-2xl mx-auto p-6 sm:p-8 text-center">
        <span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-[var(--si-blue-soft)] text-[var(--si-blue)]">
          <Icon size={26} />
        </span>
        <span className="mt-4 inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--si-amber-soft)] text-[var(--si-amber)] text-[11px] font-bold uppercase tracking-wide">
          Coming in the next phase
        </span>
        <h2 className="mt-3 text-[20px] font-bold text-[var(--si-text)]">{title}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--si-muted)]">{blurb}</p>
        {points && points.length > 0 && (
          <ul className="mt-5 text-left grid gap-2 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex gap-2 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] px-3 py-2.5 text-[12.5px] text-[var(--si-text-2)]">
                <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-[var(--si-blue)]" />
                {p}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 text-[11.5px] text-[var(--si-faint)]">Nothing here is simulated — this screen fills in once its backend ships.</p>
        {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyBlock({ icon: Icon, title, blurb, children }: { icon: LucideIcon; title: string; blurb?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <span className="grid place-items-center w-11 h-11 rounded-xl bg-[var(--si-hover)] text-[var(--si-muted)]">
        <Icon size={20} />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold text-[var(--si-text)]">{title}</p>
      {blurb && <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-[var(--si-muted)]">{blurb}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
