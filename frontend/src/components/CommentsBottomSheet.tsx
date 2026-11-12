import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useOverlayBack } from '../hooks/useOverlayBack';

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

function SheetShell({
  onClose,
  title,
  count,
  children,
}: {
  onClose: () => void;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const dragControls = useDragControls();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.55 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 120 || info.velocity.y > 700) onClose();
      }}
      className="fixed inset-x-0 bottom-0 z-[81] flex h-[70dvh] max-h-[70dvh] flex-col rounded-t-[20px] border-t border-border bg-background shadow-2xl"
    >
      <div
        className="flex shrink-0 touch-none flex-col items-center pt-2 pb-1"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="h-1 w-10 rounded-full bg-muted-foreground/35" aria-hidden />
      </div>
      <div
        className="flex shrink-0 touch-none items-center justify-between border-b border-border px-4 pb-3 pt-1"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <h3 className="text-[15px] font-bold">
          {title}
          {typeof count === 'number' && count > 0 ? ` (${count})` : ''}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-muted/80 p-2 transition-colors hover:bg-muted"
          aria-label="Close comments"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </motion.div>
  );
}

/** Instagram-style comments: bottom sheet on mobile, inline children on desktop. */
export default function CommentsBottomSheet({
  open,
  onClose,
  title = 'Comments',
  count,
  children,
  inline,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  count?: number;
  children: ReactNode;
  /** Desktop / non-sheet fallback (usually the same children). */
  inline?: ReactNode;
}) {
  const isMobile = useIsMobileSheet();
  useOverlayBack(open && isMobile, onClose);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    window.addEventListener('wev:close-post-overlays', close);
    return () => window.removeEventListener('wev:close-post-overlays', close);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  if (!isMobile) {
    if (!open) return null;
    return <>{inline ?? children}</>;
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50"
            onClick={onClose}
          />
          <SheetShell onClose={onClose} title={title} count={count}>
            {children}
          </SheetShell>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
