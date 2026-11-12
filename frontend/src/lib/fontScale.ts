/** Settings → Text size and spacing (`app_font_scale`). Scales rem-based type and spacing. */

export const FONT_SCALE_PREF_KEY = 'app_font_scale';
export const FONT_SCALE_DEFAULT = 'Standard size (100%)';

export const FONT_SCALE_OPTIONS = [
  { name: 'Compact (90%)', percent: 90 },
  { name: 'Standard size (100%)', percent: 100 },
  { name: 'Comfortable (110%)', percent: 110 },
  { name: 'Large text (125%)', percent: 125 },
] as const;

export type FontScaleName = (typeof FONT_SCALE_OPTIONS)[number]['name'];

export const FONT_SCALE_NAMES: FontScaleName[] = FONT_SCALE_OPTIONS.map((o) => o.name);

const BY_NAME = new Map<string, (typeof FONT_SCALE_OPTIONS)[number]>(
  FONT_SCALE_OPTIONS.map((o) => [o.name.toLowerCase(), o]),
);

export function isAllowedFontScale(name: unknown): name is FontScaleName {
  return typeof name === 'string' && BY_NAME.has(name.toLowerCase());
}

export function resolveFontScale(name?: string | null) {
  if (!name || typeof name !== 'string') return FONT_SCALE_OPTIONS[1];
  return BY_NAME.get(name.toLowerCase()) || FONT_SCALE_OPTIONS[1];
}

export function applyFontScaleToDocument(name?: string | null) {
  if (typeof document === 'undefined') return;
  const { percent } = resolveFontScale(name);
  if (percent === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.fontSize = `${percent}%`;
  }
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  applyFontScaleToDocument(localStorage.getItem('fontScale') || FONT_SCALE_DEFAULT);
}
