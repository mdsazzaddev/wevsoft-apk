import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface SummarizeButtonProps {
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const SummarizeButton: React.FC<SummarizeButtonProps> = ({
  active,
  loading,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    title={active ? 'Show original' : 'Summarize'}
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 ${
      active
        ? 'bg-amber-500/15 text-amber-400'
        : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
    }`}
  >
    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
    <span>{active ? 'Full post' : 'Summarize'}</span>
  </button>
);
