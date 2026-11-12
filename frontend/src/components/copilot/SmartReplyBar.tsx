import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SmartReplyBarProps {
  replies: string[];
  onSelect: (reply: string) => void;
  isVisible: boolean;
}

export const SmartReplyBar: React.FC<SmartReplyBarProps> = ({ replies, onSelect, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && replies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1"
        >
          <div className="flex items-center justify-center p-1.5 bg-primary/10 rounded-full shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          {replies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(reply)}
              className="px-4 py-1.5 bg-card border border-primary/20 text-foreground hover:bg-primary/10 rounded-full text-sm font-medium whitespace-nowrap transition-colors shadow-sm"
            >
              {reply}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
