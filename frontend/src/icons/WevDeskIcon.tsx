import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * WevDeskIcon - the WevDesk workspace mark.
 *
 * A rounded monitor with a stand and desk line; the screen carries a
 * subtle "W" stroke. Drawn in currentColor so it matches lucide icons.
 */
export const WevDeskIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 1.75, className = '', absoluteStrokeWidth: _abs, ...props }, ref) => (
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
      <rect x="2.5" y="3.5" width="19" height="13" rx="3" />
      <path d="M7 8l1.7 5 1.65-3.6L12 13l1.65-3.6L15.3 13 17 8" />
      <path d="M12 16.5V20" />
      <path d="M7.5 20.5h9" />
    </svg>
  ),
);

WevDeskIcon.displayName = 'WevDeskIcon';

export default WevDeskIcon;