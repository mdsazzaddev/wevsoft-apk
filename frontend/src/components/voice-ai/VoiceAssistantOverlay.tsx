import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Settings2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceAssistantOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  agentName?: string;
}

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({ isOpen, onClose, agentName = 'Wevsoft AI' }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking'>('connecting');
  const [transcript, setTranscript] = useState("Hi there! I'm Wevsoft. How can I help you today?");

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setIsMinimized(false);
      setStatus('connecting');
      const timer = setTimeout(() => {
        setStatus('speaking');
        setTimeout(() => setStatus('listening'), 3000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          ...(isMinimized 
            ? { width: '300px', height: '100px', bottom: '20px', right: '20px', left: 'auto', top: 'auto', borderRadius: '16px' }
            : { width: '100%', height: '100%', top: 0, left: 0, borderRadius: 0 }
          )
        }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed z-50 bg-background/95 backdrop-blur-xl border border-border shadow-2xl flex flex-col ${isMinimized ? 'bottom-5 right-5 w-[300px] h-[100px] rounded-2xl' : 'inset-0'}`}
      >
        <div className={`flex items-center justify-between p-4 ${isMinimized ? 'pb-2' : 'border-b border-border/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-foreground text-sm tracking-wide uppercase">
              {agentName}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isMinimized && (
              <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                <Settings2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => setIsMinimized(!isMinimized)} 
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isMinimized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
              {/* Outer glowing rings */}
              <motion.div
                animate={{ 
                  scale: status === 'speaking' ? [1, 1.4, 1] : status === 'listening' ? [1, 1.1, 1] : 1,
                  opacity: status === 'speaking' ? [0.3, 0.6, 0.3] : 0.3
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-primary rounded-full blur-3xl opacity-30"
              />
              
              <motion.div
                animate={{ 
                  scale: status === 'speaking' ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-4 bg-primary/20 rounded-full blur-xl"
              />
              
              {/* Inner orb */}
              <div className="relative w-32 h-32 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-full shadow-[0_0_40px_rgba(168,85,247,0.5)] overflow-hidden flex items-center justify-center">
                {status === 'connecting' && <span className="text-white text-xs font-bold uppercase tracking-widest">Connecting</span>}
                {status === 'listening' && (
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        animate={{ height: ['4px', '24px', '4px'] }} 
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 bg-white rounded-full" 
                      />
                    ))}
                  </div>
                )}
                {status === 'speaking' && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                        animate={{ height: ['8px', `${Math.random() * 40 + 20}px`, '8px'] }} 
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1.5 bg-white rounded-full" 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="max-w-xl text-center min-h-[100px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={transcript}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-2xl font-medium text-foreground/90 leading-relaxed"
                >
                  {transcript}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center px-4 overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground truncate flex-1">
              {status === 'speaking' ? 'Wevsoft is speaking...' : 'Listening...'}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className={`flex items-center justify-center gap-4 ${isMinimized ? 'absolute right-4 bottom-3' : 'pb-12'}`}>
          {!isMinimized && (
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full transition-colors ${
                isMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          )}
          
          <button 
            onClick={onClose}
            className={`bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform active:scale-95 flex items-center justify-center ${
              isMinimized ? 'w-8 h-8' : 'w-16 h-16 shadow-lg shadow-red-500/20'
            }`}
          >
            <PhoneOff className={isMinimized ? 'w-4 h-4' : 'w-6 h-6'} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
