/** Settings → Bottom nav on Reels (`app_reels_bottom_nav`). Mobile only. */

export const REELS_BOTTOM_NAV_PREF_KEY = 'app_reels_bottom_nav';

export const REELS_BOTTOM_NAV_MODES = ['Transparent', 'Frosted blur', 'Hidden'] as const;

export type ReelsBottomNavModeLabel = (typeof REELS_BOTTOM_NAV_MODES)[number];

/** Runtime mode used by MobileBottomNav. */
export type ReelsBottomNavMode = 'transparent' | 'blur' | 'hidden';

export const DEFAULT_REELS_BOTTOM_NAV_MODE: ReelsBottomNavMode = 'hidden';

const LABEL_TO_MODE: Record<string, ReelsBottomNavMode> = {
  Transparent: 'transparent',
  'Frosted blur': 'blur',
  Hidden: 'hidden',
  transparent: 'transparent',
  blur: 'blur',
  hidden: 'hidden',
  frosted: 'blur',
  'frosted blur': 'blur',
};

const MODE_TO_LABEL: Record<ReelsBottomNavMode, ReelsBottomNavModeLabel> = {
  transparent: 'Transparent',
  blur: 'Frosted blur',
  hidden: 'Hidden',
};

export function parseReelsBottomNavMode(value: unknown): ReelsBottomNavMode {
  if (typeof value === 'string') {
    const hit = LABEL_TO_MODE[value] || LABEL_TO_MODE[value.trim()] || LABEL_TO_MODE[value.toLowerCase()];
    if (hit) return hit;
  }
  return DEFAULT_REELS_BOTTOM_NAV_MODE;
}

export function reelsBottomNavLabel(mode: ReelsBottomNavMode): ReelsBottomNavModeLabel {
  return MODE_TO_LABEL[mode] || MODE_TO_LABEL[DEFAULT_REELS_BOTTOM_NAV_MODE];
}
