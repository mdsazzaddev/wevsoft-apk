import React from 'react';

type Props = {
  visible: boolean;
  /** compact = thinner guides for small previews */
  compact?: boolean;
};

/**
 * Preview-only safe-area guides — never baked into the uploaded video.
 * Approximates title / profile / bottom action chrome on a 9:16 reel.
 */
export default function ReelSafeAreaOverlay({ visible, compact }: Props) {
  if (!visible) return null;
  const pad = compact ? 'text-[8px]' : 'text-[9px]';
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      {/* Top status / notch */}
      <div className="absolute inset-x-0 top-0 h-[8%] bg-gradient-to-b from-black/45 to-transparent" />
      <div className={`absolute top-[2.5%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/35 text-white/80 ${pad} font-semibold tracking-wide`}>
        Safe · title
      </div>
      {/* Caption / username band */}
      <div className="absolute left-[4%] right-[22%] bottom-[18%] border border-dashed border-white/25 rounded-lg min-h-[12%]" />
      <div className={`absolute left-[5%] bottom-[19%] text-white/70 ${pad} font-semibold`}>Caption zone</div>
      {/* Right action rail */}
      <div className="absolute right-[3%] bottom-[22%] w-[12%] h-[38%] border border-dashed border-white/20 rounded-full" />
      {/* Bottom nav / home indicator */}
      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-black/50 to-transparent" />
      <div className={`absolute bottom-[3%] left-1/2 -translate-x-1/2 text-white/70 ${pad} font-semibold`}>Actions</div>
    </div>
  );
}
