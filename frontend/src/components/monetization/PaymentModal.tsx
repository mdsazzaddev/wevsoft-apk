import React, { useState } from 'react';
import { X, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, planId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCheckout = () => {
    setIsProcessing(true);
    // Mock processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      toast.success('Payment successful!');
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={!isProcessing ? onClose : undefined}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {isSuccess ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                transition={{ type: 'spring' }}
                className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-black text-foreground mb-2">You're all set!</h2>
              <p className="text-muted-foreground">Your subscription to {planId} has been confirmed.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Checkout</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Plan: {planId.toUpperCase()}</p>
                </div>
                <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Card Information</label>
                  <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-transparent transition-all">
                    <input type="text" placeholder="Card number" className="w-full px-4 py-3 bg-muted/30 outline-none text-sm border-b border-border" />
                    <div className="flex">
                      <input type="text" placeholder="MM / YY" className="w-1/2 px-4 py-3 bg-muted/30 outline-none text-sm border-r border-border" />
                      <input type="text" placeholder="CVC" className="w-1/2 px-4 py-3 bg-muted/30 outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Name on card</label>
                  <input type="text" placeholder="John Doe" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-sm transition-all" />
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : `Pay & Subscribe`}
                  {!isProcessing && <Lock className="w-4 h-4" />}
                </button>
                
                <p className="text-center text-[10px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Payments are secure and encrypted
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
