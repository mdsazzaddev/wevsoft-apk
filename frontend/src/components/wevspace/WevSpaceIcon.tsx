import { forwardRef, useId } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * WevSpaceIcon - the official icon for WevSpaces across navigation, headers,
 * and profiles: a ringed planet (Saturn-style) with a small sparkle star.
 *
 * Same family as WevChatIcon (lucide 24x24 grid, stroke 2, currentColor, round
 * caps/joins). The ring is a tilted ellipse split into a back arc (hidden
 * where it passes behind the planet) and a front arc (drawn over the planet,
 * with a small gap cut into the planet outline so the ring reads as in front).
 *
 * `filled` renders a solid planet with the same ring gap knocked out.
 */

const PLANET_R = 7.5;
// Ellipse rx 11 / ry 3 around (12, 12), tilted -20deg.
const RING_TILT = 'rotate(-20 12 12)';
const RING_BACK = 'M1 12A11 3 0 0 1 23 12';
const RING_FRONT = 'M23 12A11 3 0 0 1 1 12';
// Small four-point star, top-left.
const SPARKLE = 'M4 1.6Q4.35 3.65 6.4 4Q4.35 4.35 4 6.4Q3.65 4.35 1.6 4Q3.65 3.65 4 1.6Z';

export interface WevSpaceIconProps extends LucideProps {
  filled?: boolean;
}

export const WevSpaceIcon = forwardRef<SVGSVGElement, WevSpaceIconProps>(
  (
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      className = '',
      filled = false,
      absoluteStrokeWidth: _abs,
      ...props
    },
    ref,
  ) => {
    const uid = useId().replace(/:/g, '');
    const gapMask = `wevspace-gap-${uid}`;
    const behindMask = `wevspace-behind-${uid}`;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={['wev-icon', className].filter(Boolean).join(' ')}
        aria-hidden="true"
        {...props}
      >
        <defs>
          {/* Cuts a gap into the planet where the front of the ring crosses it. */}
          <mask id={gapMask} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" />
            <path d={RING_FRONT} transform={RING_TILT} stroke="#000" strokeWidth={4.2} fill="none" />
          </mask>
          {/* Hides the back of the ring where the planet covers it. */}
          <mask id={behindMask} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" />
            <circle cx="12" cy="12" r={PLANET_R + 0.9} fill="#000" stroke="none" />
          </mask>
        </defs>
        <circle cx="12" cy="12" r={PLANET_R} fill={filled ? color : 'none'} mask={`url(#${gapMask})`} />
        <path d={RING_BACK} transform={RING_TILT} mask={`url(#${behindMask})`} />
        <path d={RING_FRONT} transform={RING_TILT} />
        <path d={SPARKLE} fill={color} stroke="none" />
      </svg>
    );
  },
);

WevSpaceIcon.displayName = 'WevSpaceIcon';

export default WevSpaceIcon;