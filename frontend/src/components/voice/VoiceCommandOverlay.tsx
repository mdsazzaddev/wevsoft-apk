import React, { useEffect, useState } from 'react';
import { Mic, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { executeVoiceCommand } from '../../lib/voiceApi';
import { useStore } from '../../store';

interface VoiceCommandOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'listening' | 'processing' | 'done'>('listening');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const token = useStore(state => state.token);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStatus('listening');
      setTranscript('');
      setFeedback('');
      
      // Simulate listening and then processing for demo purposes
      // In reality, this would connect to SpeechRecognition API
      const listenTimer = setTimeout(() => {
        setTranscript('Send a message to Sarah saying hello');
        setStatus('processing');
        
        setTimeout(async () => {
          if (token) {
            try {
              // Simulated API call
              // const res = await executeVoiceCommand(token, 'Send a message to Sarah saying hello');
              // setFeedback(res.message);
              setFeedback('Message ready to send');
            } catch (err) {
              setFeedback('Command failed');
            }
          } else {
             setFeedback('Authentication required');
          }
          setStatus('done');
          
          setTimeout(() => {
             onClose();
          }, 2000);
        }, 1500);
      }, 2000);

      return () => {
        clearTimeout(listenTimer);
      };
    }
  }, [isOpen, token, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
        onClick={onClose}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
          <div className="relative mb-12">
            {status === 'listening' && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-primary/30 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute -inset-4 bg-primary/20 rounded-full"
                />
              </>
            )}
            
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 z-10 ${
              status === 'done' ? 'bg-green-500' : 'bg-primary'
            }`}>
              {status === 'done' ? (
                <CheckCircle2 className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-4">
            {status === 'listening' && "Listening..."}
            {status === 'processing' && "Processing..."}
            {status === 'done' && "Done"}
          </h3>

          <div className="h-16 flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {transcript && status !== 'done' && (
                <motion.p
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg text-muted-foreground font-medium italic"
                >
                  "{transcript}"
                </motion.p>
              )}
              {status === 'done' && feedback && (
                <motion.p
                  key="feedback"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-lg text-green-500 font-semibold"
                >
                  {feedback}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
