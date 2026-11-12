import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface VoiceWaveformProps {
  waveformData: number[];
  progress: number; // 0 to 1
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ waveformData, progress }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setMounted(true);
  }, []);

  // Ensure we have data
  const data = waveformData.length > 0 ? waveformData : Array(30).fill(0.1);

  return (
    <div className="w-full h-full flex items-center justify-between gap-[2px] relative overflow-hidden">
      {data.map((value, idx) => {
        const isPlayed = (idx / data.length) <= progress;
        const barHeight = Math.max(4, value * 100); // % height
        
        return (
          <motion.div
            key={idx}
            initial={{ height: '4px' }}
            animate={{ height: mounted ? `${barHeight}%` : '4px' }}
            transition={{ duration: 0.3, delay: idx * 0.01 }}
            className={`w-1 rounded-full transition-colors duration-150 ${
              isPlayed ? 'bg-primary' : 'bg-primary/30 dark:bg-primary/20'
            }`}
            style={{
              minHeight: '4px',
              maxHeight: '100%',
            }}
          />
        );
      })}
    </div>
  );
};
