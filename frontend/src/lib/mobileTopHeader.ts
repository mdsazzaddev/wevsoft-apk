/**
 * Settings → Mobile top header (`app_mobile_top_header` + appearance blob).
 * Mobile / tablet (below md) only — never rendered on desktop.
 */

export const MOBILE_TOP_HEADER_PREF_KEY = 'app_mobile_top_header';
export const MOBILE_TOP_HEADER_STYLE_PREF_KEY = 'app_mobile_top_header_style';
/** Real phone/tablet screen — not browser window width (see `phoneLayout.ts`). */
export const MOBILE_MD_MAX_QUERY = '(max-device-width: 767px)';

/** Bump when default surface changes so old `card` prefs remap once. */
export const MOBILE_TOP_HEADER_SHELL_V = 2;

export type MobileHeaderBgMode = 'auto' | 'card' | 'background' | 'primary' | 'custom';
export type MobileHeaderLogoColor = 'auto' | 'foreground' | 'primary' | 'custom';

export type MobileTopHeaderStyle = {
  transparent: boolean;
  background: MobileHeaderBgMode;
  customBackground: string;
  blur: boolean;
  blurIntensity: number;
  border: boolean;
  borderOpacity: number;
  shadow: boolean;
  height: number;
  paddingX: number;
  logoSize: number;
  logoColor: MobileHeaderLogoColor;
  customLogoColor: string;
  profileSize: number;
  profileBorder: boolean;
  profileBg: boolean;
  profileOpacity: number;
  opacity: number;
  /** Internal: prefs saved after shell v2 keep explicit `card` if the user picks it. */
  shellV?: number;
};

export const DEFAULT_MOBILE_TOP_HEADER_STYLE: MobileTopHeaderStyle = {
  // Match page + status-bar shell (`--background`) so Dark/OLED don't show a
  // charcoal `--card` strip under a black notch / feed.
  transparent: false,
  background: 'background',
  customBackground: '',
  blur: true,
  blurIntensity: 16,
  border: true,
  borderOpacity: 0.35,
  shadow: false,
  height: 48,
  paddingX: 14,
  logoSize: 18,
  logoColor: 'primary',
  customLogoColor: '',
  profileSize: 34,
  profileBorder: true,
  profileBg: true,
  profileOpacity: 1,
  opacity: 1,
  shellV: MOBILE_TOP_HEADER_SHELL_V,
};

export function parseMobileTopHeaderEnabled(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

export function clamp(n: number, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/** Stamp current shell version so future migrations don't clobber user choices. */
export function stampMobileTopHeaderStyle(style: MobileTopHeaderStyle): MobileTopHeaderStyle {
  return { ...style, shellV: MOBILE_TOP_HEADER_SHELL_V };
}

export function parseMobileTopHeaderStyle(raw: unknown): MobileTopHeaderStyle {
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) || {};
    } catch {
      obj = {};
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }

  const shellV = Number(obj.shellV) || 0;
  const bgRaw = String(obj.background ?? '');
  let bg = bgRaw || DEFAULT_MOBILE_TOP_HEADER_STYLE.background;
  // Pre-v2 defaults used `card` / `auto→card`, which mismatched Dark/OLED shells.
  if (shellV < MOBILE_TOP_HEADER_SHELL_V && (bg === 'card' || bg === 'auto' || !bgRaw)) {
    bg = 'background';
  }

  const logoColor = String(obj.logoColor || DEFAULT_MOBILE_TOP_HEADER_STYLE.logoColor);

  return stampMobileTopHeaderStyle({
    transparent:
      typeof obj.transparent === 'boolean'
        ? obj.transparent
        : DEFAULT_MOBILE_TOP_HEADER_STYLE.transparent,
    background: (['auto', 'card', 'background', 'primary', 'custom'].includes(bg)
      ? bg
      : 'auto') as MobileHeaderBgMode,
    customBackground: String(obj.customBackground || ''),
    blur: typeof obj.blur === 'boolean' ? obj.blur : DEFAULT_MOBILE_TOP_HEADER_STYLE.blur,
    blurIntensity: clamp(obj.blurIntensity as number, 0, 40, DEFAULT_MOBILE_TOP_HEADER_STYLE.blurIntensity),
    border: typeof obj.border === 'boolean' ? obj.border : DEFAULT_MOBILE_TOP_HEADER_STYLE.border,
    borderOpacity: clamp(obj.borderOpacity as number, 0, 1, DEFAULT_MOBILE_TOP_HEADER_STYLE.borderOpacity),
    shadow: obj.shadow === true,
    height: clamp(obj.height as number, 40, 64, DEFAULT_MOBILE_TOP_HEADER_STYLE.height),
    paddingX: clamp(obj.paddingX as number, 8, 24, DEFAULT_MOBILE_TOP_HEADER_STYLE.paddingX),
    logoSize: clamp(obj.logoSize as number, 14, 24, DEFAULT_MOBILE_TOP_HEADER_STYLE.logoSize),
    logoColor: (['auto', 'foreground', 'primary', 'custom'].includes(logoColor)
      ? logoColor
      : 'primary') as MobileHeaderLogoColor,
    customLogoColor: String(obj.customLogoColor || ''),
    profileSize: clamp(obj.profileSize as number, 28, 44, DEFAULT_MOBILE_TOP_HEADER_STYLE.profileSize),
    profileBorder: obj.profileBorder !== false,
    profileBg: obj.profileBg !== false,
    profileOpacity: clamp(obj.profileOpacity as number, 0.4, 1, DEFAULT_MOBILE_TOP_HEADER_STYLE.profileOpacity),
    opacity: clamp(obj.opacity as number, 0.5, 1, DEFAULT_MOBILE_TOP_HEADER_STYLE.opacity),
  });
}

export function isMobilePreviewViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MD_MAX_QUERY).matches;
}

/** Resolve fill color used for status-bar / safe-area sync. */
export function resolveMobileHeaderThemeColor(
  style: MobileTopHeaderStyle,
  opts: { primary: string; card: string; background: string; isDark: boolean },
): string {
  if (style.transparent) {
    return opts.background;
  }
  switch (style.background) {
    case 'primary':
      return opts.primary || '#8b5cf6';
    case 'card':
      return opts.card || opts.background;
    case 'custom':
      return style.customBackground || opts.background;
    case 'background':
    case 'auto':
    default:
      return opts.background;
  }
}

export function readCssColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  // Tailwind v4 often stores channels; prefer --primary as already applied hex via accentThemes.
  if (raw.startsWith('#') || raw.startsWith('rgb') || raw.startsWith('hsl')) return raw;
  return fallback;
}
