/**
 * App chrome accent palettes (Settings → Accent color theme).
 * Safe to import from the browser and the Express API.
 */

export const ACCENT_PREF_KEY = 'app_accent_color';

export const ACCENT_THEMES = [
  { name: 'Wevsoft Blue (#2563EB)', hex: '#2563EB', foreground: '#ffffff' },
  { name: 'Cyan Glass (#06B6D4)', hex: '#06B6D4', foreground: '#082f49' },
  { name: 'Midnight Rose', hex: '#be185d', foreground: '#ffffff' },
  { name: 'Emerald Gold', hex: '#047857', foreground: '#ffffff' },
] as const;

export type AccentThemeName = (typeof ACCENT_THEMES)[number]['name'];

export const ACCENT_THEME_NAMES: AccentThemeName[] = ACCENT_THEMES.map((t) => t.name);

/**
 * Names persisted by older builds (localStorage `accentTheme`, pref `app_accent_color`).
 * Kept so a rename never silently drops a user's saved accent.
 */
const LEGACY_ALIASES: Record<string, AccentThemeName> = {
  'sora blue (#2563eb)': 'Wevsoft Blue (#2563EB)',
};

const BY_NAME = new Map<string, (typeof ACCENT_THEMES)[number]>(
  ACCENT_THEMES.map((t) => [t.name.toLowerCase(), t]),
);

/** Resolve a stored name (current or legacy) to its canonical map key. */
function canonicalKey(name: string) {
  const key = name.trim().toLowerCase();
  const alias = LEGACY_ALIASES[key];
  return alias ? alias.toLowerCase() : key;
}

export function isAllowedAccentName(name: unknown): name is AccentThemeName {
  return typeof name === 'string' && BY_NAME.has(canonicalKey(name));
}

/** Map a stored (possibly legacy) name onto the current canonical name. */
export function normalizeAccentName(name?: string | null): AccentThemeName {
  return resolveAccentTheme(name).name;
}

export function resolveAccentTheme(name?: string | null) {
  if (!name || typeof name !== 'string') return ACCENT_THEMES[0];
  return BY_NAME.get(canonicalKey(name)) || ACCENT_THEMES[0];
}

/** Apply (or clear) --primary on <html>. User accent wins; admin brandColor is fallback. */
export function applyAccentToDocument(accentName?: string | null, brandFallback?: string | null) {
  const doc = (globalThis as any).document; if (!doc) return;
  const root = doc.documentElement;
  if (accentName && isAllowedAccentName(accentName)) {
    const theme = resolveAccentTheme(accentName);
    root.style.setProperty('--primary', theme.hex);
    root.style.setProperty('--primary-foreground', theme.foreground);
    return;
  }
  if (brandFallback && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brandFallback.trim())) {
    root.style.setProperty('--primary', brandFallback.trim());
    root.style.setProperty('--primary-foreground', '#ffffff');
    return;
  }
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
}
