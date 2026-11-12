import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type TapHeart = { id: number; x: number; y: number; rot: number };

/** TikTok-style hearts: pop in at the touch point, tilt, float up and fade (~800ms). */
export default function ReelTapHearts({ hearts, onDone }: { hearts: TapHeart[]; onDone: (id: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            className="absolute transform-gpu will-change-transform"
            style={{ left: h.x - 48, top: h.y - 48, width: 96, height: 96 }}
            initial={{ opacity: 0, scale: 0.3, rotate: h.rot, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.2, 1, 1.3], y: [0, 0, -30, -110] }}
            transition={{ duration: 0.8, times: [0, 0.18, 0.45, 1], ease: 'easeOut' }}
            onAnimationComplete={() => onDone(h.id)}
          >
            <svg viewBox="0 0 24 24" width="96" height="96" className="drop-shadow-[0_6px_18px_rgba(244,63,94,0.6)]">
              <defs>
                <linearGradient id={`th-${h.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff5e7e" />
                  <stop offset="1" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <path fill={`url(#th-${h.id})`} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
