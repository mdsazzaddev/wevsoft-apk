import React, { useState, useEffect } from 'react';
import { Zap, X, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCredits } from '../../lib/copilotApi';
import { useStore } from '../../store';

export const AICreditDisplay: React.FC = () => {
  const [credits, setCredits] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token = useStore(state => state.token);

  useEffect(() => {
    if (token) {
      getCredits(token).then(res => setCredits(res.credits)).catch(() => {});
    }
  }, [token]);

  const isLow = credits < 20;

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
          isLow ? 'bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
        }`}
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        {credits}
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border shadow-xl rounded-2xl overflow-hidden p-5"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary fill-current" />
                  AI Credits
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-6 border-b border-border">
                <span className={`text-5xl font-black mb-2 ${isLow ? 'text-red-500' : 'text-primary'}`}>
                  {credits}
                </span>
                <span className="text-sm font-medium text-muted-foreground">Credits Remaining</span>
              </div>

              <div className="py-4 space-y-3">
                <p className="text-xs text-muted-foreground">Credits are used for AI features like Smart Reply, Grammar Fix, Summarization, and Transcription.</p>
                
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
                  <CreditCard className="w-4 h-4" />
                  Purchase Credits
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
