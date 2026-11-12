/**
 * Facebook-style photo actions for avatars and covers.
 *
 * - <PhotoActionMenu>: compact popover anchored at the click point on desktop,
 *   bottom sheet on phones. Closes on Escape, outside click, or after an action.
 * - <PhotoViewer>: minimal fullscreen viewer used by "View photo" and by visitors.
 * - photoTriggerProps(): makes a non-<button> surface (the cover) clickable and
 *   keyboard accessible (role=button, Enter / Space).
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type PhotoMenuAnchor = { x: number; y: number };

export type PhotoMenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

/** Anchor point for the menu: the pointer position, or the element centre for keyboard use. */
export function anchorFromEvent(e: React.MouseEvent | React.KeyboardEvent): PhotoMenuAnchor {
  const me = e as React.MouseEvent;
  if (typeof me.clientX === 'number' && (me.clientX !== 0 || me.clientY !== 0)) {
    return { x: me.clientX, y: me.clientY };
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** role=button + Enter/Space for a clickable div (e.g. the cover, which contains other buttons). */
export function photoTriggerProps(
  label: string,
  activate: (anchor: PhotoMenuAnchor) => void,
): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    'aria-haspopup': 'menu',
    onClick: (e) => activate(anchorFromEvent(e)),
    onKeyDown: (e) => {
      // Only when the surface itself is focused, not a nested button.
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(anchorFromEvent(e));
      }
    },
  };
}

const MENU_W = 240;

export function PhotoActionMenu({
  open,
  anchor,
  title,
  items,
  onClose,
}: {
  open: boolean;
  anchor: PhotoMenuAnchor | null;
  title: string;
  items: PhotoMenuItem[];
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => firstRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isDesktop = vw >= 768;
  const estH = 52 + items.length * 44;
  const left = anchor ? Math.min(Math.max(8, anchor.x - MENU_W / 2), vw - MENU_W - 8) : (vw - MENU_W) / 2;
  let top = anchor ? anchor.y + 10 : vh / 2 - estH / 2;
  if (top + estH > vh - 8) top = Math.max(8, (anchor ? anchor.y - 10 : vh) - estH);

  const list = (
    <div role="menu" aria-label={title} className="py-1">
      {items.map((item, i) => (
        <button
          key={item.key}
          ref={i === 0 ? firstRef : undefined}
          type="button"
          role="menuitem"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            item.onSelect();
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-muted focus:bg-muted focus:outline-none transition-colors ${
            item.danger ? 'text-red-500' : 'text-foreground'
          }`}
        >
          <span className="shrink-0 w-5 grid place-items-center opacity-80">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[120]"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {isDesktop ? (
        <div
          className="absolute rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          style={{ left, top, width: MENU_W }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
          {list}
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/40 flex items-end">
          <div
            className="w-full rounded-t-3xl border-t border-border bg-card shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <p className="px-4 pt-1 pb-1 text-xs font-bold text-muted-foreground">{title}</p>
            {list}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

export function PhotoViewer({ src, alt = '', onClose }: { src: string | null; alt?: string; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo'}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        autoFocus
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
