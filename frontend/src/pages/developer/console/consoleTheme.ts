/**
 * Phase 2 P2-1/P2-2: one theme source for the Developer Console.
 * The console follows the global display mode (html.dark / html.oled, set by
 * applyDisplayModeToDocument in lib/statusBarTheme.ts), so the --dc-* tokens and Tailwind
 * `dark:` utilities (bound to .dark in index.css) can never disagree.
 * Pure helpers only (unit-tested); the shell mirrors the mode onto .dc-root.
 */

export type ConsoleThemeMode = 'light' | 'dark' | 'oled';

/** Display-mode labels understood by resolveStatusBarMode / the main app's settings. */
export const CONSOLE_THEME_LABELS: Record<ConsoleThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  oled: 'OLED True Black',
};

/** The old console-only toggle key (pre Phase 2). Read once for migration, then removed. */
export const LEGACY_CONSOLE_THEME_KEY = 'wev-dev-console-theme';

/** Theme mode from the <html> class list (same rule as resolveStatusBarModeFromDocument). */
export function modeFromClassList(cl: { contains(token: string): boolean } | null | undefined): ConsoleThemeMode {
  if (!cl) return 'light';
  if (cl.contains('oled') || cl.contains('theme-oled')) return 'oled';
  return cl.contains('dark') ? 'dark' : 'light';
}

/** Classes mirrored onto .dc-root: OLED = dark tokens + the .dc-oled overrides. */
export function consoleRootClasses(mode: ConsoleThemeMode): string[] {
  if (mode === 'oled') return ['dc-dark', 'dc-oled'];
  return mode === 'dark' ? ['dc-dark'] : [];
}

type MiniStorage = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * One-time migration of the old console-only toggle. Always removes the legacy key.
 * Returns the global display-mode label to apply, or null for "leave the global mode alone":
 * a legacy "dark" only applies when the global mode is currently light (never downgrades OLED);
 * a legacy "light" never overrides a global dark/OLED choice.
 */
export function migrateLegacyConsoleTheme(storage: MiniStorage, currentMode: ConsoleThemeMode): string | null {
  let legacy: string | null = null;
  try {
    legacy = storage.getItem(LEGACY_CONSOLE_THEME_KEY);
  } catch {
    return null;
  }
  if (legacy === null) return null;
  try {
    storage.removeItem(LEGACY_CONSOLE_THEME_KEY);
  } catch {
    /* ignore */
  }
  return legacy === 'dark' && currentMode === 'light' ? CONSOLE_THEME_LABELS.dark : null;
}

/**
 * Profile re-sync guard (amendment A2): the console theme toggle is browser-local, so a
 * later /api/profile sync must not flip it back unless the profile value itself changed.
 * Returns the theme to hand to setAuth (undefined = keep whatever is applied locally).
 */
export function themeForProfileSync(profileTheme: unknown, lastSeenProfileTheme: string | null): string | undefined {
  const t = typeof profileTheme === 'string' ? profileTheme.trim() : '';
  if (!t) return undefined;
  return t === lastSeenProfileTheme ? undefined : t;
}
