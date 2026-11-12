import React, { useState } from 'react';
import { Wand2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { rewriteText } from '../../lib/copilotApi';
import { useStore } from '../../store';
import toast from 'react-hot-toast';

interface ToneAdjustMenuProps {
  text: string;
  onReplace: (newText: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ToneAdjustMenu: React.FC<ToneAdjustMenuProps> = ({ text, onReplace, isOpen, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const token = useStore(state => state.token);

  const tones = [
    { id: 'professional', label: 'Professional', icon: '👔' },
    { id: 'casual', label: 'Casual', icon: '😎' },
    { id: 'direct', label: 'Direct', icon: '🎯' },
    { id: 'friendly', label: 'Friendly', icon: '👋' },
    { id: 'empathetic', label: 'Empathetic', icon: '❤️' }
  ];

  const handleRewrite = async (tone: string) => {
    if (!text.trim() || !token) return;
    setIsProcessing(true);
    const toastId = toast.loading('Rewriting...');
    try {
      const res = await rewriteText(token, text, tone);
      onReplace(res.text);
      toast.success('Text rewritten', { id: toastId });
      onClose();
    } catch (err) {
      toast.error('Failed to rewrite', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rewrite as...</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-1">
            {tones.map(tone => (
              <button
                key={tone.id}
                onClick={() => handleRewrite(tone.id)}
                disabled={isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 text-left"
              >
                <span>{tone.icon}</span>
                {tone.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
