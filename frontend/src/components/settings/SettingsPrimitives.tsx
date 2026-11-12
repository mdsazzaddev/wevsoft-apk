import { useSettingsTr } from '../../i18n/settingsBn';
/**
 * Reusable Settings Center primitives. Presentation only: none of these hold
 * settings state or talk to the API. Callers pass real values and handlers.
 */
import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Check, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

export function SettingsSection({ title, description, children, id }: { title?: string; description?: string; children: React.ReactNode; id?: string }) {
  const auto = useId();
  const hid = id || `settings-section-${auto}`;
  return (
    <section aria-labelledby={title ? hid : undefined} className="space-y-1.5">
      {title && <h2 id={hid} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{title}</h2>}
      {description && <p className="text-xs text-muted-foreground px-1">{description}</p>}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">{children}</div>
    </section>
  );
}

export function SettingsRow({ icon, title, description, trailing, onClick, danger, disabled, expanded }: {
  icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; trailing?: React.ReactNode;
  onClick?: () => void; danger?: boolean; disabled?: boolean; expanded?: boolean;
}) {
  const body = (
    <>
      {icon && <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-rose-500/10 text-rose-500' : 'bg-muted/60 text-muted-foreground'}`}>{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate ${danger ? 'text-rose-500' : 'text-foreground'}`}>{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      {trailing ?? (onClick ? <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" aria-hidden /> : null)}
    </>
  );
  const cls = 'w-full text-left px-4 py-3.5 flex items-center gap-4';
  if (onClick) {
    return <button type="button" aria-expanded={expanded} disabled={disabled} onClick={onClick} className={`${cls} hover:bg-muted/50 transition-colors motion-reduce:transition-none disabled:opacity-50 ${focusRing}`}>{body}</button>;
  }
  return <div className={cls}>{body}</div>;
}

export function SettingsSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors motion-reduce:transition-none disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted'} ${focusRing}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function SettingsSelect({ value, options, onChange, label, disabled }: { value: string; options: string[]; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
      className={`bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-sm text-foreground ${focusRing}`}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function SettingsStatusBadge({ tone, children }: { tone: 'ok' | 'warn' | 'neutral'; children: React.ReactNode }) {
  const t = tone === 'ok' ? 'bg-emerald-500/15 text-emerald-600' : tone === 'warn' ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t}`}>{children}</span>;
}

export function SettingsEmptyState({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export function SettingsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 bg-muted/30 rounded-2xl animate-pulse motion-reduce:animate-none" />)}
    </div>
  );
}

export function SettingsErrorState({ message, onRetry, retryLabel = 'Try again' }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="bg-card border border-rose-500/30 rounded-2xl p-5 flex items-center gap-3 text-sm">
      <AlertTriangle size={18} className="text-rose-500 flex-shrink-0" aria-hidden />
      <span className="flex-1 text-foreground">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className={`inline-flex items-center gap-1 text-xs font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 ${focusRing}`}><RefreshCw size={13} aria-hidden />{retryLabel}</button>}
    </div>
  );
}

export function SettingsSaveIndicator({ state, savingLabel = 'Saving...', savedLabel = 'Saved' }: { state: 'idle' | 'saving' | 'saved'; savingLabel?: string; savedLabel?: string }) {
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1 text-xs text-muted-foreground min-h-[1rem]">
      {state === 'saving' && <><Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />{savingLabel}</>}
      {state === 'saved' && <><Check size={12} className="text-emerald-500" aria-hidden />{savedLabel}</>}
    </span>
  );
}

/** Accessible confirm dialog: Esc cancels, focus moves to Cancel on open. */
export function SettingsConfirmDialog({ open, title, body, confirmLabel, cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }: {
  open: boolean; title: string; body?: React.ReactNode; confirmLabel: string; cancelLabel?: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const tid = useId();
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!busy) onCancel(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={tid} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-xl space-y-3">
        <h3 id={tid} className="text-base font-bold text-foreground">{title}</h3>
        {body && <div className="text-sm text-muted-foreground">{body}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className={`px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted ${focusRing}`}>{cancelLabel}</button>
          <button type="button" disabled={busy} onClick={onConfirm}
            className={`px-3 py-1.5 text-sm font-semibold rounded-xl text-white disabled:opacity-60 ${danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary hover:opacity-90'} ${focusRing}`}>
            {busy ? <Loader2 size={14} className="inline animate-spin motion-reduce:animate-none" aria-hidden /> : null} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}