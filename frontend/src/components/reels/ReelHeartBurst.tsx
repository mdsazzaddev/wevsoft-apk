import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

export default function ReelHeartBurst({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  const sparks = [0, 72, 144, 216, 288];
  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute"
        style={{ left: x, top: y }}
        initial={{ scale: 0.2, opacity: 0, x: '-50%', y: '-50%' }}
        animate={{ scale: [0.2, 1.25, 1.05], opacity: [0, 1, 1] }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Heart size={92} strokeWidth={0} className="fill-rose-500 text-rose-500 drop-shadow-[0_8px_24px_rgba(244,63,94,0.7)]" />
      </motion.div>
      {sparks.map((deg) => (
        <motion.span
          key={deg}
          className="absolute w-2 h-2 rounded-full bg-rose-400"
          style={{ left: x, top: y }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos((deg * Math.PI) / 180) * 48,
            y: Math.sin((deg * Math.PI) / 180) * 48,
            scale: 0.2,
          }}
          transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute"
        style={{ left: x, top: y }}
        initial={{ opacity: 1, x: '-50%', y: '-50%', scale: 1.05 }}
        animate={{ opacity: 0, scale: 1.45, y: '-70%' }}
        transition={{ duration: 0.45, delay: 0.32 }}
        onAnimationComplete={onDone}
      >
        <Heart size={92} strokeWidth={0} className="fill-rose-500/80" />
      </motion.div>
    </div>
  );
}
