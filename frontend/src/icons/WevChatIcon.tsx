import { forwardRef, useId } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * WevChatIcon - the WevChat (wevchat) icon used in navigation.
 *
 * A round speech bubble with a rounded tail at the bottom left and an open
 * gap at the top right, with three vertical "voice" bars inside
 * (source artwork: 24x24 grid, supplied by the product owner).
 * Drawn in currentColor with round caps so it matches the lucide nav icons.
 *
 * `filled` renders a solid bubble with the bars knocked out
 * (true transparency via a mask, so it works on any background).
 */

// Bubble outline: open at the top right between (17, 3.34) and (20.66, 7).
const BUBBLE =
  'M17 3.33782C15.5291 2.48697 13.8214 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22C17.5228 22 22 17.5228 22 12C22 10.1786 21.513 8.47087 20.6622 7';
// Same outline with the gap closed along the circle, for the solid variant.
const BUBBLE_SOLID = `${BUBBLE}A10 10 0 0 0 17 3.33782Z`;
const BARS = ['M12 16V8', 'M8 14V10', 'M16 14V10'];

export interface WevChatIconProps extends LucideProps {
  filled?: boolean;
}

export const WevChatIcon = forwardRef<SVGSVGElement, WevChatIconProps>(
  (
    { color = 'currentColor', size = 24, strokeWidth = 1.5, className = '', filled = false, absoluteStrokeWidth: _abs, ...props },
    ref,
  ) => {
    const maskId = `wevchat-knock-${useId().replace(/:/g, '')}`;
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
        {filled ? (
          <>
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="#fff" />
                {BARS.map((d) => (
                  <path key={d} d={d} stroke="#000" />
                ))}
              </mask>
            </defs>
            <path d={BUBBLE_SOLID} fill={color} stroke="none" mask={`url(#${maskId})`} />
          </>
        ) : (
          <>
            <path d={BUBBLE} />
            {BARS.map((d) => (
              <path key={d} d={d} />
            ))}
          </>
        )}
      </svg>
    );
  },
);

WevChatIcon.displayName = 'WevChatIcon';

export default WevChatIcon;