import React from 'react';

/** Instagram-story-style segment bars across the top of the active reel. */
export default function ReelStoryProgress({
  index,
  total,
  percent,
}: {
  index: number;
  total: number;
  percent: number;
}) {
  if (total < 1) return null;
  const windowSize = Math.min(total, 12);
  let start = Math.max(0, index - Math.floor(windowSize / 2));
  const end = Math.min(total, start + windowSize);
  start = Math.max(0, end - windowSize);
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="absolute top-0 left-0 right-0 z-40 pointer-events-none pl-2.5 pr-[6.75rem] pt-[max(10px,env(safe-area-inset-top))] flex gap-[3px]"
      aria-hidden
    >
      {Array.from({ length: end - start }, (_, k) => {
        const i = start + k;
        const fill = i < index ? 100 : i === index ? clamped : 0;
        return (
          <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/25 overflow-hidden">
            <div
              className={`h-full rounded-full ${i === index ? 'bg-white' : 'bg-white/85'}`}
              style={{
                width: `${fill}%`,
                transition: i === index ? 'width 120ms linear' : 'width 200ms ease',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
