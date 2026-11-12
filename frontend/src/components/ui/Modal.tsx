import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** 'center' = dialog; 'bottom' = mobile-style sheet; 'right' = side drawer. */
  placement?: 'center' | 'bottom' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlay?: boolean;
  hideCloseButton?: boolean;
  closeLabel?: string;
  className?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', full: 'max-w-none' } as const;

const PLACEMENT = {
  center: { wrap: 'items-center justify-center p-gutter', panel: 'w-full rounded-xl max-h-[90dvh]' },
  bottom: { wrap: 'items-end justify-center', panel: 'w-full rounded-t-xl max-h-[90dvh] pb-[env(safe-area-inset-bottom)]' },
  right: { wrap: 'items-stretch justify-end', panel: 'h-full w-full rounded-l-xl' },
} as const;

/**
 * Accessible dialog / sheet: portal, overlay, Escape to close, focus moved in,
 * Tab trapped inside, focus restored on close, body scroll locked.
 */
export function Modal({
  open, onClose, title, description, children, footer, placement = 'center', size = 'md',
  closeOnOverlay = true, hideCloseButton = false, closeLabel = 'Close', className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;
  const p = PLACEMENT[placement];
  const fullBleed = size === 'full' && placement === 'center';

  return createPortal(
    <div className={cn('fixed inset-0 z-(--z-modal) flex', fullBleed ? 'items-stretch justify-center p-0 sm:items-center sm:p-gutter' : p.wrap)}>
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        aria-hidden="true"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-2xl outline-none',
          fullBleed ? 'h-full max-h-[100dvh] w-full rounded-none sm:rounded-xl' : p.panel,
          placement !== 'bottom' && SIZES[size],
          className,
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-3 px-section pt-section pb-3">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="text-title font-bold">{title}</h2>}
              {description && <p id={descId} className="mt-1 text-body-sm text-muted-foreground">{description}</p>}
            </div>
            {!hideCloseButton && (
              <IconButton label={closeLabel} icon={<X className="size-5" />} size="sm" onClick={onClose} />
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-section pb-section">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-section py-gutter">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Convenience alias: a bottom sheet (mobile) — same behaviour as Modal. */
export function Sheet(props: Omit<ModalProps, 'placement'> & { side?: 'bottom' | 'right' }) {
  const { side = 'bottom', ...rest } = props;
  return <Modal {...rest} placement={side} />;
}

export default Modal;
