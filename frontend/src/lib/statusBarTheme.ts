/**
 * PWA / mobile status-bar (notch) — follow Display mode.
 *
 * Android Chrome / WebAPK often ignore live meta updates or fall back to white
 * when theme-color metas are deleted. We therefore:
 *  1) update theme-color in place (never leave a gap with zero metas)
 *  2) pin light+dark media variants to the SAME app color (OS preference cannot
 *     inject a white bar while the app is Dark/OLED)
 *  3) set html color-scheme (CSS + meta) so the OS paints the correct chrome
 *  4) keep a single stable link[rel=manifest] (swapping manifests kills Chrome
 *     “Install app” and leaves only “Create shortcut”)
 *  5) paint html/body + StatusBarChrome safe-area strip
 */

export const STATUS_BAR_COLORS = {
  light: '#ffffff',
  dark: '#0b0e11',
  /** Match `.oled` --background — true black for AMOLED. */
  oled: '#000000',
} as const;

export type StatusBarMode = 'light' | 'dark' | 'oled';

/** Last resolved paint mode — boot-theme.js reads this for System to avoid light FOUC. */
export const THEME_PAINT_STORAGE_KEY = 'wev_theme_paint';

/** Stable install manifest — do not swap by theme (breaks Android Install app). */
export const PWA_MANIFEST_HREF = '/manifest.json?v=20260912e';

export function readPersistedThemePaint(): StatusBarMode | null {
  try {
    const raw = String(localStorage.getItem(THEME_PAINT_STORAGE_KEY) || '').toLowerCase();
    if (raw === 'light' || raw === 'dark' || raw === 'oled') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function persistThemePaint(mode: StatusBarMode): void {
  try {
    localStorage.setItem(THEME_PAINT_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Map a paint mode back to a Display-mode label for applyDisplayModeToDocument. */
export function themeLabelForPaintMode(mode: StatusBarMode): string {
  if (mode === 'oled') return 'OLED True Black';
  if (mode === 'dark') return 'Dark mode';
  return 'Light mode';
}

/**
 * Resolve System → platform default (admin) when present, else keep last paint so
 * refresh does not flash OS-light while platform default is Dark.
 */
export function resolveThemeLabelForPaint(
  themeLabel?: string | null,
  platformTheme?: string | null,
): string {
  const raw = String(themeLabel || 'Light mode');
  if (!/system/i.test(raw)) return raw;
  if (platformTheme && !/system/i.test(String(platformTheme))) {
    return String(platformTheme);
  }
  const paint = readPersistedThemePaint();
  if (paint) return themeLabelForPaintMode(paint);
  return raw;
}

export function resolveStatusBarMode(
  theme: string | null | undefined,
  prefersDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false,
): StatusBarMode {
  const raw = String(theme || 'Light mode').toLowerCase();
  if (raw.includes('oled') || raw.includes('true black') || raw.includes('amoled')) return 'oled';
  if (raw.includes('dark')) return 'dark';
  if (raw.includes('system')) return prefersDark ? 'dark' : 'light';
  return 'light';
}

export function resolveStatusBarModeFromDocument(
  root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null,
): StatusBarMode {
  if (!root) return 'light';
  if (root.classList.contains('oled') || root.classList.contains('theme-oled')) return 'oled';
  if (root.classList.contains('dark')) return 'dark';
  return 'light';
}

export function statusBarColorForMode(mode: StatusBarMode): string {
  return STATUS_BAR_COLORS[mode];
}

export function appleStatusBarStyleForMode(mode: StatusBarMode): 'default' | 'black-translucent' {
  return mode === 'light' ? 'default' : 'black-translucent';
}

/** Ensure one stable manifest link — never point at mode-specific JSON. */
function ensureStableManifestLink(): void {
  let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== PWA_MANIFEST_HREF) {
    link.setAttribute('href', PWA_MANIFEST_HREF);
  }
}

function ensureThemeColorMeta(media: string | null): HTMLMetaElement {
  const all = Array.from(document.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[];
  const found = all.find((el) => {
    const m = el.getAttribute('media');
    if (media == null) return m == null || m === '';
    return m === media;
  });
  if (found) return found;
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  if (media) meta.setAttribute('media', media);
  // Keep theme-color metas near the top of <head> (Chrome reads early).
  const first = document.head.firstChild;
  if (first) document.head.insertBefore(meta, first);
  else document.head.appendChild(meta);
  return meta;
}

/**
 * Write theme-color without deleting first — Android falls back to white while
 * zero metas exist. Also pin prefers-color-scheme variants to the app color so
 * a light OS cannot force a white strip over a dark app.
 */
function setThemeColorContent(color: string): void {
  const light = ensureThemeColorMeta('(prefers-color-scheme: light)');
  const dark = ensureThemeColorMeta('(prefers-color-scheme: dark)');
  const any = ensureThemeColorMeta(null);
  light.content = color;
  dark.content = color;
  any.content = color;

  // Drop leftover theme-color metas (unknown media) that could still win.
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    if (el !== light && el !== dark && el !== any) el.remove();
  });
}

function setNamedMeta(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  if (meta.content !== content) meta.content = content;
}

function applyColorSchemeToDocument(mode: StatusBarMode): void {
  const scheme = mode === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.style.colorScheme = scheme;
  setNamedMeta('color-scheme', scheme);
}

/**
 * Apply html theme classes + status bar + shell backgrounds in one place.
 */
export function applyDisplayModeToDocument(themeLabel?: string | null): StatusBarMode {
  if (typeof document === 'undefined') return 'light';

  const mode = resolveStatusBarMode(themeLabel);
  const root = document.documentElement;
  const color = statusBarColorForMode(mode);

  root.classList.remove('dark', 'oled', 'theme-oled', 'theme-light');
  if (mode === 'oled') {
    root.classList.add('dark', 'oled', 'theme-oled');
  } else if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    // Explicit light class — boot-shell.css defaults to dark to avoid refresh FOUC.
    root.classList.add('theme-light');
  }

  root.style.backgroundColor = color;
  if (document.body) document.body.style.backgroundColor = color;
  root.style.setProperty('--wev-status-bar-bg', color);

  applyColorSchemeToDocument(mode);
  ensureStableManifestLink();
  setThemeColorContent(color);
  setNamedMeta('apple-mobile-web-app-status-bar-style', appleStatusBarStyleForMode(mode));
  // Some Android OEMs also read this legacy Microsoft meta.
  setNamedMeta('msapplication-navbutton-color', color);
  persistThemePaint(mode);

  // Re-assert after layout — WebAPK / Chrome sometimes sample too early.
  window.setTimeout(() => setThemeColorContent(color), 30);
  window.setTimeout(() => setThemeColorContent(color), 300);
  window.requestAnimationFrame(() => setThemeColorContent(color));

  return mode;
}

export function applyStatusBarTheme(opts?: {
  color?: string;
  mode?: StatusBarMode;
  themeLabel?: string | null;
  allowAccent?: boolean;
}): string {
  if (typeof document === 'undefined') return STATUS_BAR_COLORS.light;

  const mode =
    opts?.mode ??
    (opts?.themeLabel != null
      ? resolveStatusBarMode(opts.themeLabel)
      : resolveStatusBarModeFromDocument());

  const fallback = statusBarColorForMode(mode);
  const color = opts?.allowAccent && opts.color ? opts.color : fallback;

  applyColorSchemeToDocument(mode);
  ensureStableManifestLink();
  setThemeColorContent(color);
  setNamedMeta('apple-mobile-web-app-status-bar-style', appleStatusBarStyleForMode(mode));
  setNamedMeta('msapplication-navbutton-color', color);
  document.documentElement.style.setProperty('--wev-status-bar-bg', color);
  window.setTimeout(() => setThemeColorContent(color), 30);

  return color;
}

export function syncStatusBarToDisplayMode(themeLabel?: string | null): string {
  if (themeLabel != null) {
    applyDisplayModeToDocument(themeLabel);
    return statusBarColorForMode(resolveStatusBarMode(themeLabel));
  }
  applyDisplayModeToDocument(
    document.documentElement.classList.contains('oled') ||
      document.documentElement.classList.contains('theme-oled')
      ? 'OLED True Black'
      : document.documentElement.classList.contains('dark')
        ? 'Dark mode'
        : 'Light mode',
  );
  return statusBarColorForMode(resolveStatusBarModeFromDocument());
}
