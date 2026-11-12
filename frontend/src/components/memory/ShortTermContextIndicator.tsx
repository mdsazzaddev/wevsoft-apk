import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShortTermContextIndicatorProps {
  memoryCount: number;
}

export const ShortTermContextIndicator: React.FC<ShortTermContextIndicatorProps> = ({ memoryCount }) => {
  if (memoryCount === 0) return null;

  return (
    <div className="relative group flex items-center">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg text-primary hover:bg-primary/20 transition-colors cursor-help">
        <BrainCircuit className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold">{memoryCount}</span>
      </div>
      
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-card border border-border shadow-lg rounded-lg p-2 text-xs text-muted-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center">
        AI remembers {memoryCount} things from recent conversation context.
      </div>
    </div>
  );
};
