/**
 * Navigation icon style preferences.
 *
 * Users can pick Colorful A, Colorful B, Outline, or "Use default" separately
 * for light and dark appearance. Resolution order per theme:
 *   user choice (when not "default") > admin platform default > hardcoded default
 * Hardcoded: light = colorful-a, dark = outline.
 */
export const NAV_ICON_STYLES = ['colorful-a', 'colorful-b', 'outline'] as const;
export type NavIconStyle = (typeof NAV_ICON_STYLES)[number];

export const NAV_ICON_PREF_VALUES = ['default', ...NAV_ICON_STYLES] as const;
export type NavIconPref = (typeof NAV_ICON_PREF_VALUES)[number];

export const NAV_ICON_STYLE_LIGHT_PREF_KEY = 'app_nav_icon_style_light';
export const NAV_ICON_STYLE_DARK_PREF_KEY = 'app_nav_icon_style_dark';

export const NAV_ICON_PREF_LABELS: Record<NavIconPref, string> = {
  default: 'Use default',
  'colorful-a': 'Colorful A',
  'colorful-b': 'Colorful B',
  outline: 'Outline',
};

export const NAV_ICON_STYLE_OPTION_LABELS = [
  NAV_ICON_PREF_LABELS.default,
  NAV_ICON_PREF_LABELS['colorful-a'],
  NAV_ICON_PREF_LABELS['colorful-b'],
  NAV_ICON_PREF_LABELS.outline,
] as const;

export const HARDCODED_NAV_ICON_DEFAULTS: { light: NavIconStyle; dark: NavIconStyle } = {
  light: 'colorful-a',
  dark: 'outline',
};

export type AppearanceTheme = 'light' | 'dark';

export type NavIconStyleDefaults = {
  light: NavIconStyle;
  dark: NavIconStyle;
};

export type NavIconUserPrefs = {
  light: NavIconPref;
  dark: NavIconPref;
};

const STYLE_ALIASES: Record<string, NavIconStyle> = {
  'colorful-a': 'colorful-a',
  'colorful_a': 'colorful-a',
  'colorfula': 'colorful-a',
  'colorful a': 'colorful-a',
  'colorful a (reference-matched)': 'colorful-a',
  'reference-matched': 'colorful-a',
  'reference matched': 'colorful-a',
  a: 'colorful-a',
  'colorful-b': 'colorful-b',
  'colorful_b': 'colorful-b',
  'colorfulb': 'colorful-b',
  'colorful b': 'colorful-b',
  'colorful b (fluent official)': 'colorful-b',
  'fluent official': 'colorful-b',
  'fluent-official': 'colorful-b',
  b: 'colorful-b',
  outline: 'outline',
  lucide: 'outline',
  monochrome: 'outline',
  current: 'outline',
};

const PREF_ALIASES: Record<string, NavIconPref> = {
  ...STYLE_ALIASES,
  default: 'default',
  'use default': 'default',
  'use-default': 'default',
  'platform default': 'default',
  'admin default': 'default',
};

function norm(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isNavIconStyle(value: unknown): value is NavIconStyle {
  return (NAV_ICON_STYLES as readonly string[]).includes(String(value));
}

export function isNavIconPref(value: unknown): value is NavIconPref {
  return (NAV_ICON_PREF_VALUES as readonly string[]).includes(String(value));
}

export function parseNavIconStyle(raw: unknown): NavIconStyle | null {
  if (raw == null || raw === '') return null;
  const key = norm(raw);
  return STYLE_ALIASES[key] ?? null;
}

export function parseNavIconPref(raw: unknown): NavIconPref | null {
  if (raw == null || raw === '') return null;
  const key = norm(raw);
  return PREF_ALIASES[key] ?? null;
}

export function parseNavIconStyleDefaults(raw: unknown): NavIconStyleDefaults {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    light: parseNavIconStyle(src.light) ?? HARDCODED_NAV_ICON_DEFAULTS.light,
    dark: parseNavIconStyle(src.dark) ?? HARDCODED_NAV_ICON_DEFAULTS.dark,
  };
}

export function parseNavIconUserPrefs(raw: unknown): NavIconUserPrefs {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    light: parseNavIconPref(src.light) ?? 'default',
    dark: parseNavIconPref(src.dark) ?? 'default',
  };
}

/**
 * Resolve the effective appearance used for icon style.
 * OLED / True Black follow the dark setting. "System default" follows prefers-color-scheme.
 */
export function resolveAppearanceTheme(
  themePref: string | null | undefined,
  prefersDark = false,
): AppearanceTheme {
  const raw = String(themePref || 'Light mode').toLowerCase();
  if (raw.includes('oled') || raw.includes('true black') || raw.includes('amoled')) return 'dark';
  if (raw.includes('dark')) return 'dark';
  if (raw.includes('system')) return prefersDark ? 'dark' : 'light';
  return 'light';
}

export function resolveNavIconStyle(input: {
  theme: AppearanceTheme;
  userLight?: unknown;
  userDark?: unknown;
  adminDefaults?: unknown;
}): NavIconStyle {
  const userRaw = input.theme === 'light' ? input.userLight : input.userDark;
  const userPref = parseNavIconPref(userRaw);
  if (userPref && userPref !== 'default') return userPref;
  const admin = parseNavIconStyleDefaults(input.adminDefaults);
  return admin[input.theme];
}
