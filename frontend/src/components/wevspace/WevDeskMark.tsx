import { useId } from 'react';

/**
 * WevDesk mark: a teal tile holding a small desk window (title bar + trend line)
 * on a stand. Drawn on a 32px grid with 2px strokes so it sits with lucide icons.
 */
export default function WevDeskMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`wdm${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" fill={`url(#wdm${id})`} />
      <rect x="7" y="8" width="18" height="12.5" rx="2.6" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M7 12.2h18" stroke="#fff" strokeWidth="2" />
      <circle cx="9.6" cy="10.1" r=".9" fill="#fff" />
      <circle cx="12.2" cy="10.1" r=".9" fill="#fff" />
      <path d="M11.5 17l2.4-2.2 2.2 1.6 3.6-3" fill="none" stroke="#ccfbf1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 24.5h8M16 20.5v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
