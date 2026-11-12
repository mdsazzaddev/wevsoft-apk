import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type HudState =
  | { type: 'volume'; value: number; muted: boolean }
  | { type: 'sound_state'; muted: boolean }
  | null;

export default function ReelHudIndicator({ state }: { state: HudState }) {
  const [visibleState, setVisibleState] = useState<HudState>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setVisibleState(state);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisibleState(null);
    }, 1200);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [state]);

  if (!visibleState) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={visibleState.type}
        initial={{ opacity: 0, scale: 0.85, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-none absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-white shadow-xl backdrop-blur-md"
        aria-live="polite"
      >
        {visibleState.type === 'volume' && (
          <>
            {visibleState.muted || visibleState.value <= 0 ? (
              <VolumeX size={18} strokeWidth={2.4} className="text-rose-400 shrink-0" />
            ) : (
              <Volume2 size={18} strokeWidth={2.4} className="text-white shrink-0" />
            )}
            <div className="flex flex-col gap-0.5 min-w-[70px]">
              <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-75"
                  style={{ width: `${visibleState.muted ? 0 : Math.round(visibleState.value * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] font-bold tabular-nums text-white/90">
              {visibleState.muted ? 'Muted' : `${Math.round(visibleState.value * 100)}%`}
            </span>
          </>
        )}


        {visibleState.type === 'sound_state' && (
          <>
            {visibleState.muted ? (
              <>
                <VolumeX size={18} strokeWidth={2.4} className="text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-white">Sound Off</span>
              </>
            ) : (
              <>
                <Volume2 size={18} strokeWidth={2.4} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white">Sound On</span>
              </>
            )}
          </>
        )}

      </motion.div>
    </AnimatePresence>
  );
}
