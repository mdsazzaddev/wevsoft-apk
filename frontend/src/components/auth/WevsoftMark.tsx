/**
 * The Wevsoft geometric "W" mark.
 *
 * Inlined as SVG rather than loaded from /logo.svg so the brand mark paints with
 * the first frame — no network round trip, no flash of a missing logo — and it
 * stays crisp at any size in every browser. Keep the geometry in step with
 * public/logo.svg, which is the same artwork for the favicon and app icons.
 */
import { useId } from 'react';

const SHAPE_1 = "344,5 343,6 338,6 334,7 329,9 324,12 319,16 315,21 312,27 312,36 313,39 315,43 335,67 338,72 342,77 346,81 348,82 350,82 352,81 353,80 360,65 360,63 369,45 373,36 375,29 375,25 373,18 371,15 368,12 365,10 361,8 354,6 349,6 348,5";
const SHAPE_2 = "200,10 194,16 189,25 187,34 187,40 188,45 191,53 201,66 251,127 266,144 283,166 295,179 302,183 308,185 316,186 327,184 336,179 343,172 346,167 349,158 349,147 346,137 334,121 243,11 239,8 233,5 225,3 217,3 212,4";
const SHAPE_3 = "7,9 2,17 0,25 1,36 5,44 12,51 21,55 28,56 61,56 69,60 83,75 91,86 165,176 172,182 182,186 196,186 206,182 215,175 220,168 223,160 223,145 220,137 119,13 110,4 100,0 24,0 13,4";

/** `label` is the accessible name (the SVG equivalent of an img alt). */
export default function WevsoftMark({ className = '', label = 'Wevsoft' }: { className?: string; label?: string }) {
  const uid = useId().replace(/:/g, '');
  const face = `wev-face-${uid}`;
  const gloss = `wev-gloss-${uid}`;

  return (
    <svg
      viewBox="0 0 375 186"
      fill="none"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={face} x1="0" y1="0" x2="375" y2="186" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.48" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="375" y2="186" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shadow underlay */}
      <polygon points={SHAPE_1} fill="#0b1f4a" opacity="0.9" transform="translate(0, 4)" />
      <polygon points={SHAPE_2} fill="#0b1f4a" opacity="0.9" transform="translate(0, 4)" />
      <polygon points={SHAPE_3} fill="#0b1f4a" opacity="0.9" transform="translate(0, 4)" />

      {/* Main face */}
      <polygon points={SHAPE_1} fill={`url(#${face})`} />
      <polygon points={SHAPE_2} fill={`url(#${face})`} />
      <polygon points={SHAPE_3} fill={`url(#${face})`} />

      {/* Gloss overlay */}
      <polygon points={SHAPE_1} fill={`url(#${gloss})`} />
      <polygon points={SHAPE_2} fill={`url(#${gloss})`} />
      <polygon points={SHAPE_3} fill={`url(#${gloss})`} />
    </svg>
  );
}
