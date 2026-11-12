import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import AIPostPanel from '../social/AIPostPanel';

/**
 * AI Generate experience opened from Create Post.
 * Reuses AIPostPanel (captions / improve / ideas) with a studio back affordance.
 */
export default function AiGenerateStudio({
  open,
  onClose,
  currentContent,
  onApplyContent,
  onApplyHashtags,
  embedded = false,
}: {
  open: boolean;
  onClose: () => void;
  currentContent?: string;
  onApplyContent: (content: string) => void;
  onApplyHashtags?: (hashtags: string[]) => void;
  embedded?: boolean;
}) {
  if (!open) return null;

  const body = (
    <div className="relative flex h-full min-h-0 flex-col bg-card">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur transition-colors hover:bg-black/40"
        aria-label="Back to Create Post"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="min-h-0 flex-1 overflow-hidden pt-0">
        <AIPostPanel
          variant="drawer"
          currentContent={currentContent}
          onApplyContent={(text) => {
            onApplyContent(text);
            onClose();
          }}
          onApplyHashtags={onApplyHashtags}
          onClose={onClose}
        />
      </div>
    </div>
  );

  if (embedded) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        className="absolute inset-0 z-20 overflow-hidden rounded-[inherit] bg-card"
      >
        {body}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="AI Generate"
    >
      {body}
    </motion.div>
  );
}