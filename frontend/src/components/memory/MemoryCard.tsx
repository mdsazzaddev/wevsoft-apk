import React from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';

interface Memory {
  id: string;
  key: string;
  value: string;
  source: string;
  confidence: number;
}

interface MemoryCardProps {
  memory: Memory;
  onDelete: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onDelete }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-xl p-3 group relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {memory.key}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          Source: {memory.source}
        </span>
      </div>
      
      <p className="text-sm font-medium text-foreground mb-3 pr-6">
        {memory.value}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/70 rounded-full" 
            style={{ width: `${memory.confidence * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
          {Math.round(memory.confidence * 100)}% conf
        </span>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <button onClick={onDelete} className="p-1.5 bg-card/80 backdrop-blur-sm border border-border rounded hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
