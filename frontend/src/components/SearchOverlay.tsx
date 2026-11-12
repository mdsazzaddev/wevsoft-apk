import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import SmartSearchBar from './SmartSearchBar';

/** Full-width search sheet — reuses SmartSearchBar so results use the portal dropdown. */
export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={onClose}
    >
      <div
        className="fixed left-1/2 top-3 md:top-16 w-[min(calc(100vw-1.5rem),32rem)] -translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-2xl bg-card/95 p-3 shadow-2xl border border-border backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-1 -top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
          <SmartSearchBar autoFocus className="w-full" onResultNavigate={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
