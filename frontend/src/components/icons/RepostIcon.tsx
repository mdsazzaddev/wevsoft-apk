import type { SVGProps } from 'react';

/**
 * Repost — two cycling arrows (retweet / reshare style).
 */
export default function RepostIcon({
  size = 22,
  className,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  const sw = Number(strokeWidth) || 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['wev-icon', className].filter(Boolean).join(' ')}
      aria-hidden
      {...props}
    >
      {/* Top path → arrow right */}
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      {/* Bottom path → arrow left */}
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
