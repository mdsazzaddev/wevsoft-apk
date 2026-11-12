import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export type ProcessStepStatus = 'pending' | 'active' | 'done' | 'error';

export type ProcessStep = {
  id: string;
  label: string;
  status: ProcessStepStatus;
};

type Props = {
  steps: ProcessStep[];
  title?: string;
  subtitle?: string;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
};

/** Post-publish / in-flight processing panel (Phase 3). */
export default function ReelProcessingScreen({
  steps,
  title = 'Preparing your Reel…',
  subtitle,
  error,
  onRetry,
  onDismiss,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
      <div>
        <h3 className="text-base font-extrabold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <ul className="space-y-2.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 flex items-center justify-center shrink-0">
              {s.status === 'done' && <Check size={16} className="text-emerald-500" />}
              {s.status === 'active' && <Loader2 size={16} className="text-primary animate-spin" />}
              {s.status === 'error' && <AlertCircle size={16} className="text-rose-500" />}
              {s.status === 'pending' && <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />}
            </span>
            <span
              className={
                s.status === 'done'
                  ? 'text-foreground'
                  : s.status === 'active'
                    ? 'font-semibold text-foreground'
                    : s.status === 'error'
                      ? 'text-rose-500'
                      : 'text-muted-foreground'
              }
            >
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 space-y-2">
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          <div className="flex gap-2">
            {onRetry && (
              <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                Retry
              </button>
            )}
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="px-3 py-1.5 rounded-full border border-border text-xs font-bold">
                Keep editing
              </button>
            )}
          </div>
        </div>
      )}
      {!error && (
        <p className="text-[11px] text-muted-foreground">
          You can leave this page after upload finishes — thumbnail and streaming variants continue in the background.
        </p>
      )}
    </div>
  );
}
