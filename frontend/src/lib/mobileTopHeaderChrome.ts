/**
 * Settings → Top header style (`app_mobile_top_header_chrome`).
 * Mirrors bottom nav: Solid plate · Feed blend (frost fades into feed) · Icons only.
 */

export const MOBILE_TOP_HEADER_CHROME_PREF_KEY = 'app_mobile_top_header_chrome';

export const MOBILE_TOP_HEADER_CHROME_LABELS = ['Solid bar', 'Feed blend', 'Icons only'] as const;

export type MobileTopHeaderChromeLabel = (typeof MOBILE_TOP_HEADER_CHROME_LABELS)[number];

export type MobileTopHeaderChrome = 'classic' | 'blend' | 'transparent';

export const DEFAULT_MOBILE_TOP_HEADER_CHROME: MobileTopHeaderChrome = 'classic';

/** Extra fade length below the content row when Feed blend is on. */
export const MOBILE_TOP_HEADER_BLEND_FADE_PX = 20;

const LABEL_TO_CHROME: Record<string, MobileTopHeaderChrome> = {
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
  minimal: 'transparent',
};

const CHROME_TO_LABEL: Record<MobileTopHeaderChrome, MobileTopHeaderChromeLabel> = {
  classic: 'Solid bar',
  blend: 'Feed blend',
  transparent: 'Icons only',
};

export function parseMobileTopHeaderChrome(value: unknown): MobileTopHeaderChrome {
  if (typeof value === 'string') {
    const hit =
      LABEL_TO_CHROME[value] ||
      LABEL_TO_CHROME[value.trim()] ||
      LABEL_TO_CHROME[value.toLowerCase()];
    if (hit) return hit;
  }
  return DEFAULT_MOBILE_TOP_HEADER_CHROME;
}

export function mobileTopHeaderChromeLabel(chrome: MobileTopHeaderChrome): MobileTopHeaderChromeLabel {
  return CHROME_TO_LABEL[chrome] || CHROME_TO_LABEL[DEFAULT_MOBILE_TOP_HEADER_CHROME];
}
