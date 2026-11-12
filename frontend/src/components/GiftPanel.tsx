import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Send, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

interface GiftType {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
}

interface GiftPanelProps {
  receiverId: string;
  receiverName: string;
  streamId?: string;
  reelId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['all', 'basic', 'love', 'flowers', 'hype', 'premium', 'epic', 'celebration'];

export default function GiftPanel({ receiverId, receiverName, streamId, reelId, isOpen, onClose }: GiftPanelProps) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [flyingGift, setFlyingGift] = useState<{ emoji: string; id: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/gifts/types')
        .then(r => r.json())
        .then(setGifts)
        .catch(() => {});
    }
  }, [isOpen]);

  const filteredGifts = selectedCategory === 'all'
    ? gifts
    : gifts.filter(g => g.category === selectedCategory);

  const handleSend = async () => {
    if (!selectedGift || !user) return;
    setSending(true);

    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiverId,
          giftTypeId: selectedGift.id,
          streamId,
          reelId,
          message: message.trim() || null
        })
      });

      if (!res.ok) throw new Error('Failed to send gift');

      // Animate the gift flying
      const flyId = Date.now();
      setFlyingGift({ emoji: selectedGift.emoji, id: flyId });
      setTimeout(() => setFlyingGift(null), 1500);

      toast.success(`${selectedGift.emoji} Gift sent to ${receiverName}!`);
      setSelectedGift(null);
      setMessage('');
    } catch (e) {
      toast.error('Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      all: '✨ All', basic: '👍 Basic', love: '❤️ Love',
      flowers: '🌸 Flowers', hype: '🔥 Hype',
      premium: '💎 Premium', epic: '🚀 Epic', celebration: '🎉 Party'
    };
    return labels[cat] || cat;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute bottom-full mb-2 right-0 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50"
        >
          {/* Flying gift animation */}
          <AnimatePresence>
            {flyingGift && (
              <motion.div
                key={flyingGift.id}
                initial={{ bottom: 60, right: 20, scale: 1, opacity: 1 }}
                animate={{ bottom: 200, right: 20, scale: 2, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="fixed z-[9999] text-4xl pointer-events-none"
              >
                {flyingGift.emoji}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-violet-500" />
              <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                Send Gift to {receiverName}
              </span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-violet-500 text-foreground dark:text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Gift grid */}
          <div className="grid grid-cols-4 gap-2 px-3 pb-3 max-h-40 overflow-y-auto">
            {filteredGifts.length === 0 ? (
              <div className="col-span-4 text-center py-4 text-zinc-400 text-sm">No gifts available</div>
            ) : (
              filteredGifts.map(gift => (
                <motion.button
                  key={gift.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGift(gift)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    selectedGift?.id === gift.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                      : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <span className="text-2xl">{gift.emoji}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{gift.price}💰</span>
                </motion.button>
              ))
            )}
          </div>

          {/* Selected gift + send */}
          <AnimatePresence>
            {selectedGift && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-3 space-y-2"
              >
                <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2">
                  <span className="text-2xl">{selectedGift.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{selectedGift.name}</p>
                    <p className="text-xs text-violet-600 dark:text-violet-400">{selectedGift.price} coins</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-violet-500" />
                </div>

                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Add a message... (optional)"
                  maxLength={100}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : `Send ${selectedGift.emoji}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
