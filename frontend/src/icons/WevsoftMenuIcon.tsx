import type { SVGProps } from 'react';

export type WevsoftMenuIconProps = SVGProps<SVGSVGElement> & {
  /** Pixel size (width & height). Default 22 to match bottom-nav icons. */
  size?: number;
};

/**
 * Wevsoft menu mark: 3 slim rows — each is one fused path (dot + bar, no gap).
 */
export function WevsoftMenuIcon({
  size = 22,
  className,
  ...rest
}: WevsoftMenuIconProps) {
  const r = 1.85;
  const h = r * 2;
  const totalW = 19;
  const left = (24 - totalW) / 2;
  const right = left + totalW;
  const rowGap = 3.4;
  const top = (24 - (3 * h + 2 * rowGap)) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="nonzero"
      xmlns="http://www.w3.org/2000/svg"
      className={['wev-icon', className].filter(Boolean).join(' ')}
      aria-hidden
      {...rest}
    >
      {[0, 1, 2].map((i) => {
        const cy = top + r + i * (h + rowGap);
        const cx = left + r;
        // Full circle + bar body sharing the circle’s vertical diameter (no gap).
        const d = [
          // circle
          `M ${cx - r} ${cy}`,
          `a ${r} ${r} 0 1 1 ${r * 2} 0`,
          `a ${r} ${r} 0 1 1 ${-r * 2} 0`,
          // bar fused at circle center-line
          `M ${cx} ${cy - r}`,
          `H ${right - r}`,
          `a ${r} ${r} 0 0 1 0 ${h}`,
          `H ${cx}`,
          'Z',
        ].join(' ');
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}

export default WevsoftMenuIcon;
