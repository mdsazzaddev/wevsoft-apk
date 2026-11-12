import React from 'react';
import { Clock, Sparkles, Calendar, Share2, Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

interface AIMemoryWidgetProps {
  title?: string;
  subtitle?: string;
  yearAgo?: string;
  imageUrl?: string;
  compact?: boolean;
}

export const AIMemoryWidget: React.FC<AIMemoryWidgetProps> = ({
  title = "1 Year Ago Today",
  subtitle = "You shared memorable moments with your batchmates on campus.",
  yearAgo = "2025",
  imageUrl = "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop",
  compact = false,
}) => {
  const handleShareMemory = () => {
    toast.success('✨ Memory reshared to your active feed!');
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-purple-500/15 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 shadow-xl shadow-teal-500/10 space-y-3 group hover:border-teal-400/50 transition-all">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-500"></div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400 font-black text-xs uppercase tracking-wider">
            <div className="p-1 rounded-lg bg-teal-500/20 text-teal-300">
              <Sparkles size={13} className="animate-pulse" />
            </div>
            <span>AI Memory • {title}</span>
          </div>
          <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm">
            {yearAgo}
          </span>
        </div>

        <div className="flex gap-3.5 items-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-cyan-600 via-purple-600 to-pink-600 overflow-hidden shrink-0 border border-teal-400/30 shadow-md relative group-hover:scale-105 transition-transform flex items-center justify-center">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Memory" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center -z-0">
              <Clock size={20} className="text-white/80" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">{subtitle}</p>
            <button
              onClick={handleShareMemory}
              className="mt-2 text-[11px] font-black text-teal-300 hover:text-white bg-teal-500/20 hover:bg-teal-500/40 border border-teal-500/40 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 shadow-sm group-hover:scale-105"
            >
              <Share2 size={12} /> Share to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-teal-500/30 shadow-2xl bg-card/60 backdrop-blur-xl"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-purple-500"></div>
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-teal-400 font-extrabold text-xs uppercase tracking-widest">
            <Sparkles size={16} className="animate-pulse" />
            <span>AI Memory Highlight</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">{title}</h2>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          <button
            onClick={handleShareMemory}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/25 hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Share2 size={15} />
            <span>Share Memory to Feed</span>
          </button>
        </div>

        <div className="w-full md:w-1/2 aspect-video bg-black rounded-2xl overflow-hidden relative shadow-xl border border-border group">
          <img src={imageUrl} alt="Memory" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/60 backdrop-blur-md text-white border border-border">
            {yearAgo}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
