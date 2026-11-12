import React from 'react';
import type { NavIconStyle } from '@wevsoft/shared/nav-icon-style';
import { useNavIconStyle } from '../../hooks/useNavIconStyle';
import { getNavIconSrc } from '../../lib/navIconAssets';
import { resolveNavIconKey } from '../../lib/navIconKey';

type NavGlyphProps = {
  icon: React.ElementType;
  to?: string | null;
  id?: string | null;
  iconKey?: string | null;
  /** Override Appearance setting (e.g. top-bar shortcuts force clean Lucide outline). */
  forceStyle?: NavIconStyle;
  size?: number;
  className?: string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  title?: string;
};

export function NavGlyph({
  icon: Icon,
  to,
  id,
  iconKey,
  forceStyle,
  size = 22,
  className,
  strokeWidth,
  absoluteStrokeWidth,
  title,
}: NavGlyphProps) {
  const prefStyle = useNavIconStyle();
  const style = forceStyle || prefStyle;
  const key = resolveNavIconKey({ to, id, iconKey });
  const src = getNavIconSrc(style, key);

  if (src) {
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt=""
        title={title}
        draggable={false}
        className={`shrink-0 select-none ${className || ''}`.trim()}
        style={{ width: size, height: size }}
        data-nav-icon-key={key || undefined}
        data-nav-icon-set={style}
      />
    );
  }

  return (
    <Icon
      size={size}
      className={className}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
    />
  );
}

export default NavGlyph;
