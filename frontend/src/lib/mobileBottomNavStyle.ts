/**
 * Settings → Bottom nav style (`app_mobile_bottom_nav_style`).
 * Mobile / Mobile Preview bar appearance. Solid keeps today’s plate;
 * Feed blend frosts into the feed; Icons only is the old transparent toggle.
 */

export const MOBILE_BOTTOM_NAV_STYLE_PREF_KEY = 'app_mobile_bottom_nav_style';

export const MOBILE_BOTTOM_NAV_STYLE_LABELS = ['Solid bar', 'Feed blend', 'Icons only'] as const;

export type MobileBottomNavStyleLabel = (typeof MOBILE_BOTTOM_NAV_STYLE_LABELS)[number];

export type MobileBottomNavStyle = 'classic' | 'blend' | 'transparent';

export const DEFAULT_MOBILE_BOTTOM_NAV_STYLE: MobileBottomNavStyle = 'classic';

const LABEL_TO_STYLE: Record<string, MobileBottomNavStyle> = {
  'Solid bar': 'classic',
  'Feed blend': 'blend',
  'Icons only': 'transparent',
  classic: 'classic',
  solid: 'classic',
  blend: 'blend',
  feed: 'blend',
  'feed blend': 'blend',
  transparent: 'transparent',
  icons: 'transparent',
  'icons only': 'transparent',
};

const STYLE_TO_LABEL: Record<MobileBottomNavStyle, MobileBottomNavStyleLabel> = {
  classic: 'Solid bar',
  blend: 'Feed blend',
  transparent: 'Icons only',
};

export function parseMobileBottomNavStyle(value: unknown): MobileBottomNavStyle {
  if (typeof value === 'string') {
    const hit =
      LABEL_TO_STYLE[value] ||
      LABEL_TO_STYLE[value.trim()] ||
      LABEL_TO_STYLE[value.toLowerCase()];
    if (hit) return hit;
  }
  return DEFAULT_MOBILE_BOTTOM_NAV_STYLE;
}

export function mobileBottomNavStyleLabel(style: MobileBottomNavStyle): MobileBottomNavStyleLabel {
  return STYLE_TO_LABEL[style] || STYLE_TO_LABEL[DEFAULT_MOBILE_BOTTOM_NAV_STYLE];
}

/** Migrate legacy Transparent navbar boolean → style. */
export function styleFromLegacyTransparent(transparent: boolean): MobileBottomNavStyle {
  return transparent ? 'transparent' : 'classic';
}
