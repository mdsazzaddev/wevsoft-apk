import React from 'react';
import { Sparkles, History, ChevronRight } from 'lucide-react';

interface ConversationSummaryCardProps {
  summary: string;
  messageCount: number;
  dateRange: string;
}

export const ConversationSummaryCard: React.FC<ConversationSummaryCardProps> = ({
  summary, messageCount, dateRange
}) => {
  return (
    <div className="mx-auto w-full max-w-lg my-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Previously
        </span>
        <div className="h-px bg-border flex-1" />
      </div>

      <div className="bg-card border border-primary/20 shadow-sm shadow-primary/5 rounded-2xl p-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
          <Sparkles className="w-24 h-24 text-primary" />
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground">AI Recap</h4>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
            {messageCount} messages
          </span>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed mb-3 pr-8 relative z-10">
          {summary}
        </p>

        <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border/50">
          <span className="text-muted-foreground">{dateRange}</span>
          <button className="text-primary font-medium hover:underline flex items-center">
            View full history
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
