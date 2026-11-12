import React, { useState } from 'react';
import { X, Send, CreditCard, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { sendFanMessage } from '../../lib/socialApi';
import { useStore } from '../../store';

interface FanMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  price: number;
}

export const FanMessageDialog: React.FC<FanMessageDialogProps> = ({ isOpen, onClose, creatorName, price }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const token = useStore(state => state.token);

  const handleSend = async () => {
    if (!message.trim() || !token) return;
    setIsSending(true);
    try {
      await sendFanMessage(token, 'creatorId', message, price);
      toast.success('Message sent! They will reply soon.');
      onClose();
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
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
          className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />
              Fan Message
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-foreground/80">
              Send a direct message to <span className="font-bold">{creatorName}</span>. 
              Paid messages are guaranteed to be seen.
            </p>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              className="w-full px-4 py-3 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent resize-none"
            />

            <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Priority Delivery</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Supports the creator</p>
                </div>
              </div>
              <span className="text-lg font-black text-foreground">${price}</span>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
            <button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSending ? 'Sending...' : 'Send Message'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
