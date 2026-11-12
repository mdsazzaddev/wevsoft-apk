import React from 'react';

export const AIContentSkeleton: React.FC<{ lines?: number }> = ({ lines = 2 }) => (
  <div className="mt-2 space-y-1.5 animate-pulse" aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-2.5 rounded-full bg-current/15 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);
