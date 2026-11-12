import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useEnBn } from '../../lib/useEnBn';

/**
 * Warn the browser before a tab close / reload while `active` (unsaved post edits).
 * Posts never save drafts, so leaving the page would lose the work.
 */
export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}

/**
 * "Discard changes?" confirm for the post composer / post editors.
 * Posts have no drafts: Discard throws the work away, Continue editing goes back.
 * Accessible: alertdialog, focus starts on Continue, Tab is trapped, Esc = Continue.
 */
export default function CreatePostUnsavedBar({
  open,
  onContinue,
  onDiscard,
  editing = false,
}: {
  open: boolean;
  /** Close the dialog and return to the editor unchanged. */
  onContinue: () => void;
  /** Throw everything away and exit (nothing is saved). */
  onDiscard: () => void;
  /** Editing an existing post (copy changes slightly). */
  editing?: boolean;
}) {
  const { t } = useEnBn();
  const boxRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => continueRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture phase: the editor underneath must not treat this Esc as another close.
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onContinueRef.current();
        return;
      }
      if (e.key === 'Tab' && boxRef.current) {
        const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!boxRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey, true);
      if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) prevFocus.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => {
        // Clicking outside the dialog = keep editing (never a silent discard).
        if (e.target === e.currentTarget) onContinue();
      }}
      data-testid="post-discard-dialog"
    >
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="post-discard-title"
        aria-describedby="post-discard-desc"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="post-discard-title" className="text-base font-bold text-foreground">
              {editing ? t('Discard your changes?', 'পরিবর্তনগুলো বাদ দেবেন?') : t('Discard this post?', 'পোস্টটি বাদ দেবেন?')}
            </h2>
            <p id="post-discard-desc" className="mt-1 text-sm leading-snug text-muted-foreground">
              {editing
                ? t('If you leave now, your changes will be lost. Nothing is saved.', 'এখন বের হলে আপনার পরিবর্তনগুলো হারিয়ে যাবে। কিছুই সেভ হবে না।')
                : t('If you leave now, this post will be lost. Drafts are not saved.', 'এখন বের হলে পোস্টটি হারিয়ে যাবে। কোনো ড্রাফট সেভ হয় না।')}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('Discard', 'বাদ দিন')}
          </button>
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('Continue editing', 'এডিট চালিয়ে যান')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}