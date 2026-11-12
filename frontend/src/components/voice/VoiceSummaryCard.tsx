import React from 'react';
import { Sparkles, Copy, Share, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceSummaryCardProps {
  summary: string;
  durationStr: string; // e.g. "2:30"
}

export const VoiceSummaryCard: React.FC<VoiceSummaryCardProps> = ({ summary, durationStr }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Voice Note Summary',
        text: summary,
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl p-4 max-w-sm w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-primary/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">AI Summary</h4>
          <p className="text-[10px] text-muted-foreground">Based on {durationStr} voice note</p>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed mb-4">
        {summary}
      </p>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          Copy
        </button>
        <button 
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Share className="w-3.5 h-3.5 text-muted-foreground" />
          Share
        </button>
        <button 
          className="px-3 py-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Save to Notes"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
