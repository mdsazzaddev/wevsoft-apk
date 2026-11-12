import React from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const FloatingAIAssistant: React.FC = () => {
  const navigate = useNavigate();
  // Using the store to toggle the floating assistant, or just routing to /ai
  const setShowWevAssistant = useStore(state => state.setShowWevAssistant);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={() => {
        // Toggle the global AI assistant widget if it exists, or route to /ai
        setShowWevAssistant(true);
      }}
      className="hidden md:flex fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] items-center justify-center text-white hover:scale-110 transition-transform z-50 group border-2 border-white/20 dark:border-white/10"
      title="Wevsoft AI Assistant"
    >
      <Sparkles size={28} className="group-hover:animate-spin-slow" />
      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
      
      {/* Tooltip */}
      <div className="absolute right-full mr-4 bg-black/80 dark:bg-white/90 text-white dark:text-black text-sm font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg backdrop-blur-md">
        Ask Wevsoft AI
      </div>
    </motion.button>
  );
};
