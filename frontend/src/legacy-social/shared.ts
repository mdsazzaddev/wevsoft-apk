/**
 * Shared contracts for Legacy Social. Safe to import from client and server.
 * All customization is structured JSON — never raw HTML/CSS/JS from users.
 */

export const LEGACY_FLAG_KEYS = [
  'legacy_social',
  'legacy_themes',
  'legacy_widgets',
  'legacy_top_friends',
  'legacy_wall',
  'legacy_status',
  'legacy_intro_media',
  'legacy_bulletins',
  'legacy_view_counter',
  'legacy_vanity_url',
  'legacy_avatar_shapes',
  'legacy_avatar_frames',
  'legacy_custom_color',
  'legacy_glass_effect',
  'legacy_cover_editor',
] as const;

export type LegacyFlagKey = (typeof LEGACY_FLAG_KEYS)[number];

export const WIDGET_TYPES = [
  'about',
  'top_friends',
  'photos',
  'status',
  'intro_media',
  'wall',
  'featured_post',
  'portfolio',
  'shop',
  'links',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_SIZES = ['sm', 'half', 'full', 'tall', 'third', 'two_third', 'auto'] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const DENSITIES = ['compact', 'comfortable'] as const;
export type Density = (typeof DENSITIES)[number];

export const WALL_PERMISSIONS = ['everyone', 'friends', 'none'] as const;
export type WallPermission = (typeof WALL_PERMISSIONS)[number];

export const BACKGROUND_KINDS = ['solid', 'gradient', 'image'] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

export const CURATED_BACKGROUNDS = [
  { id: 'none', label: 'None', css: '' },
  { id: 'mesh-dawn', label: 'Dawn mesh', css: 'radial-gradient(at 20% 20%, rgba(251,191,36,0.35), transparent 50%), radial-gradient(at 80% 0%, rgba(244,114,182,0.28), transparent 45%)' },
  { id: 'mesh-ocean', label: 'Ocean mesh', css: 'radial-gradient(at 10% 80%, rgba(14,165,233,0.35), transparent 50%), radial-gradient(at 90% 20%, rgba(99,102,241,0.28), transparent 45%)' },
  { id: 'mesh-forest', label: 'Forest mesh', css: 'radial-gradient(at 30% 30%, rgba(16,185,129,0.32), transparent 50%), radial-gradient(at 80% 70%, rgba(132,204,22,0.22), transparent 45%)' },
  { id: 'mesh-night', label: 'Night mesh', css: 'radial-gradient(at 50% 0%, rgba(139,92,246,0.4), transparent 55%), radial-gradient(at 0% 100%, rgba(14,165,233,0.2), transparent 40%)' },
  { id: 'dots', label: 'Soft dots', css: 'radial-gradient(rgba(127,127,127,0.18) 1px, transparent 1px)' },
] as const;

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  position: number;
  size: WidgetSize;
  visibility?: 'public' | 'friends' | 'private';
  settings: Record<string, unknown>;
}

export interface BackgroundConfig {
  kind: BackgroundKind;
  solid?: string;
  gradientFrom?: string;
  gradientTo?: string;
  curatedId?: string;
  imageUrl?: string;
}

export interface ThemeConfigPayload {
  presetId: string;
  accentColor: string | null;
  background: BackgroundConfig;
  density: Density;
  avatarShape?: string;
  avatarFrameId?: string;
  customAccentColor?: string;
  glassEnabled?: boolean;
  glassOpacity?: number;
  glassBlur?: number;
  themeMode?: string;
}

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'w-status', type: 'status', position: 0, size: 'full', settings: {} },
  { id: 'w-intro', type: 'intro_media', position: 1, size: 'half', settings: {} },
  { id: 'w-friends', type: 'top_friends', position: 2, size: 'half', settings: {} },
  { id: 'w-about', type: 'about', position: 3, size: 'half', settings: {} },
  { id: 'w-photos', type: 'photos', position: 4, size: 'half', settings: {} },
  { id: 'w-wall', type: 'wall', position: 5, size: 'full', settings: {} },
];

export const DEFAULT_BACKGROUND: BackgroundConfig = { kind: 'solid' };

export const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/;
export const MAX_TOP_FRIENDS_DEFAULT = 8;
export const MAX_TOP_FRIENDS_CAP = 16;
export const WALL_MAX_LEN = 280;
export const STATUS_MAX_LEN = 80;
export const BULLETIN_MAX_LEN = 280;
export const LINK_LABEL_MAX = 40;
export const MAX_CUSTOM_LINKS = 12;
export const VANITY_MIN = 3;
export const VANITY_MAX = 30;
export const VANITY_COOLDOWN_DAYS = 30;
export const WALL_RATE_MAX = 8;
export const BULLETIN_RATE_MAX = 6;
export const STATUS_TTL_OPTIONS = [24, 48, 72, 0] as const; // 0 = never

export const RESERVED_HANDLES = new Set([
  'admin', 'api', 'help', 'support', 'settings', 'login', 'logout', 'signup',
  'auth', 'u', 'profile', 'feed', 'home', 'messages', 'notifications', 'reels',
  'marketplace', 'shop', 'seller', 'jobs', 'events', 'groups', 'campus',
  'academic', 'creator', 'live', 'watch', 'search', 'about', 'privacy',
  'terms', 'legal', 'status', 'system', 'null', 'undefined', 'me', 'you',
  // `sora` stays reserved after the Wevsoft rename — the old brand handle must not
  // become claimable by a random account.
  'sora', 'wevsoft', 'wev', 'www', 'static', 'assets', 'media', 'uploads', 'robots', 'sitemap',
  'moderator', 'staff', 'official', 'root', 'superadmin',
  // WevSpace routes — `/space/@handle`, `/spaces` must never be shadowed by a
  // user vanity handle, and the feature name itself stays unclaimable.
  'space', 'spaces', 'wevspace', 'wevspaces',
]);

export const VANITY_RE = /^[a-z0-9_]{3,30}$/;

export function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && (WIDGET_TYPES as readonly string[]).includes(value);
}

export function isWidgetSize(value: unknown): value is WidgetSize {
  return typeof value === 'string' && (WIDGET_SIZES as readonly string[]).includes(value);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const l1 = lum(hexA);
  const l2 = lum(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
