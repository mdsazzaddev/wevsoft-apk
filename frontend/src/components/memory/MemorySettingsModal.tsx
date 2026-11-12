import React, { useState } from 'react';
import { BrainCircuit, X, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { updateMemorySettings, clearMemory } from '../../lib/memoryApi';

interface MemorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemorySettingsModal: React.FC<MemorySettingsModalProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState('30');
  const [isClearing, setIsClearing] = useState(false);
  const token = useStore(state => state.token);

  const handleSave = async () => {
    if (!token) return;
    try {
      await updateMemorySettings(token, { enabled, retentionDays: parseInt(retentionDays) });
      toast.success('Memory settings saved');
      onClose();
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleClearMemory = async () => {
    if (!token || !window.confirm('Are you sure you want to clear all AI memory? This cannot be undone.')) return;
    setIsClearing(true);
    try {
      await clearMemory(token);
      toast.success('AI Memory cleared');
    } catch (err) {
      toast.error('Failed to clear memory');
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-card border border-border shadow-xl rounded-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              AI Memory Settings
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-semibold text-foreground text-sm">Enable AI Memory</span>
                <span className="text-xs text-muted-foreground">Allow AI to remember facts about you to personalize responses.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className={!enabled ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
              <label className="block text-sm font-semibold text-foreground mb-1">Retention Period</label>
              <select 
                value={retentionDays}
                onChange={e => setRetentionDays(e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-xl text-sm text-foreground outline-none border border-border appearance-none cursor-pointer"
              >
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
                <option value="9999">Forever</option>
              </select>
            </div>

            <div className="pt-4 border-t border-border">
              <button 
                onClick={handleClearMemory}
                disabled={isClearing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/50 text-red-500 hover:bg-red-500/10 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isClearing ? 'Clearing...' : 'Clear All AI Memory'}
              </button>
              <div className="flex items-start gap-1 mt-2">
                <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">Your memory data is private to your account. Clearing memory removes all learned context.</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-transform active:scale-95"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
