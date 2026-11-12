import React from 'react';

export default function ReelNavIndicator({
  index,
  total,
  desktop,
}: {
  index: number;
  total: number;
  desktop: boolean;
}) {
  if (total < 2) return null;
  const windowSize = 7;
  let start = Math.max(0, index - Math.floor(windowSize / 2));
  const end = Math.min(total, start + windowSize);
  start = Math.max(0, end - windowSize);
  const dots = [];
  for (let i = start; i < end; i++) dots.push(i);

  if (desktop) {
    return (
      <div className="hidden md:flex flex-col items-center gap-1.5 px-1" aria-hidden>
        {start > 0 && <span className="w-1 h-1 rounded-full bg-white/25" />}
        {dots.map((i) => (
          <span
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === index ? 'w-2 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'w-1.5 h-1.5 bg-white/30'
            }`}
          />
        ))}
        {end < total && <span className="w-1 h-1 rounded-full bg-white/25" />}
      </div>
    );
  }

  return (
    <p className="md:hidden text-[10px] font-semibold text-white/80 tracking-wide tabular-nums">
      {index + 1} of {total}
    </p>
  );
}
