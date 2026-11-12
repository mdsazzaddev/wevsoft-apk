/**
 * settingsStore.ts
 *
 * Domain store for user-configurable display and preference state:
 * theme, accent, glass effects, font scale, nav items, etc.
 * All fields persist to localStorage (same keys as before).
 *
 * COMPATIBILITY: The monolithic store.ts continues to hold these fields and
 * re-exports them. New code should prefer importing from this store.
 *
 * Usage:
 *   import { useSettingsStore } from "../stores/settingsStore";
 *   const theme = useSettingsStore((s) => s.theme);
 */

import { create } from "zustand";
import { normalizeAccentName } from "@wevsoft/shared/accentThemes";
import { parseDesktopHeaderNavIds, normalizeDesktopHeaderNavIds } from "../lib/desktopHeaderNav";
import { normalizeMobileBottomNavIds } from "../lib/mobileBottomNav";
import {
  DEFAULT_MOBILE_TOP_HEADER_STYLE,
  parseMobileTopHeaderStyle,
  type MobileTopHeaderStyle,
} from "../lib/mobileTopHeader";
import {
  DEFAULT_REELS_BOTTOM_NAV_MODE,
  parseReelsBottomNavMode,
  type ReelsBottomNavMode,
} from "../lib/reelsBottomNav";
import {
  DEFAULT_MOBILE_BOTTOM_NAV_STYLE,
  parseMobileBottomNavStyle,
  styleFromLegacyTransparent,
  type MobileBottomNavStyle,
} from "../lib/mobileBottomNavStyle";
import {
  DEFAULT_MOBILE_TOP_HEADER_CHROME,
  parseMobileTopHeaderChrome,
  type MobileTopHeaderChrome,
} from "../lib/mobileTopHeaderChrome";
import {
  applyDisplayModeToDocument,
  resolveThemeLabelForPaint,
} from "../lib/statusBarTheme";

interface SystemSettings {
  websiteName?: string;
  websiteDescription?: string;
  websiteLogo?: string;
  favicon?: string;
  websiteIcon?: string;
  theme?: string;
  brandColor?: string;
  footerInfo?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  [key: string]: unknown;
}

interface SettingsState {
  theme: string;
  accentTheme: string;
  glassEffects: boolean;
  showDesktopHeader: boolean;
  desktopHeaderNavFloating: boolean;
  mobileNavTransparent: boolean;
  mobileBottomNavStyle: MobileBottomNavStyle;
  reelsBottomNav: ReelsBottomNavMode;
  showMobileTopHeader: boolean;
  mobileTopHeaderChrome: MobileTopHeaderChrome;
  mobileTopHeaderStyle: MobileTopHeaderStyle;
  fontScale: string;
  showWevAssistant: boolean;
  mobileNavItems: string[];
  desktopHeaderNavIds: string[];
  aiLanguage: string;
  systemSettings: SystemSettings | null;
  setTheme: (theme: string) => void;
  setAccentTheme: (accentTheme: string) => void;
  setGlassEffects: (enabled: boolean) => void;
  setShowDesktopHeader: (enabled: boolean) => void;
  setDesktopHeaderNavFloating: (enabled: boolean) => void;
  setMobileNavTransparent: (enabled: boolean) => void;
  setMobileBottomNavStyle: (style: MobileBottomNavStyle) => void;
  setReelsBottomNav: (mode: ReelsBottomNavMode) => void;
  setShowMobileTopHeader: (enabled: boolean) => void;
  setMobileTopHeaderChrome: (chrome: MobileTopHeaderChrome) => void;
  setMobileTopHeaderStyle: (style: MobileTopHeaderStyle) => void;
  setFontScale: (fontScale: string) => void;
  setShowWevAssistant: (show: boolean) => void;
  setMobileNavItems: (items: string[]) => void;
  setDesktopHeaderNavIds: (ids: string[]) => void;
  setAiLanguage: (lang: string) => void;
  setSystemSettings: (settings: SystemSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: localStorage.getItem("theme") || "Light mode",
  accentTheme: normalizeAccentName(localStorage.getItem("accentTheme")),
  glassEffects: localStorage.getItem("glassEffects") !== "false",
  showDesktopHeader: localStorage.getItem("showDesktopHeader") !== "false",
  desktopHeaderNavFloating: localStorage.getItem("desktopHeaderNavFloating") === "true",
  // Default Off → show bottom-nav plate; only transparent when explicitly "true".
  mobileNavTransparent: localStorage.getItem("mobileNavTransparent") === "true",
  mobileBottomNavStyle: (() => {
    const raw = localStorage.getItem("mobileBottomNavStyle");
    if (raw) return parseMobileBottomNavStyle(raw);
    return styleFromLegacyTransparent(localStorage.getItem("mobileNavTransparent") === "true");
  })() || DEFAULT_MOBILE_BOTTOM_NAV_STYLE,
  reelsBottomNav: parseReelsBottomNavMode(
    localStorage.getItem("reelsBottomNav") || DEFAULT_REELS_BOTTOM_NAV_MODE,
  ),
  showMobileTopHeader: localStorage.getItem("showMobileTopHeader") !== "false",
  mobileTopHeaderChrome: parseMobileTopHeaderChrome(
    localStorage.getItem("mobileTopHeaderChrome") || DEFAULT_MOBILE_TOP_HEADER_CHROME,
  ),
  mobileTopHeaderStyle: parseMobileTopHeaderStyle((() => {
    try {
      return JSON.parse(localStorage.getItem("mobileTopHeaderStyle") || "null");
    } catch {
      return DEFAULT_MOBILE_TOP_HEADER_STYLE;
    }
  })()),
  fontScale: localStorage.getItem("fontScale") || "Standard size (100%)",
  showWevAssistant: localStorage.getItem("showWevAssistant") !== "false",
  mobileNavItems: (() => {
    const sanitized = normalizeMobileBottomNavIds(
      JSON.parse(localStorage.getItem("mobileNavItems") || "null"),
    );
    try {
      localStorage.setItem("mobileNavItems", JSON.stringify(sanitized));
    } catch {
      /* ignore */
    }
    return sanitized;
  })(),
  desktopHeaderNavIds: normalizeDesktopHeaderNavIds(
    JSON.parse(localStorage.getItem("desktopHeaderNavIds") || "null")
  ),
  aiLanguage: localStorage.getItem("wev_ai_language") || "default",
  systemSettings: null,

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    set({ theme });
    // Immediate — don't wait for React effects (Android PWA status bar).
    // System uses platform default / last paint so refresh never flashes OS-light.
    try {
      const platform = get().systemSettings?.theme;
      applyDisplayModeToDocument(resolveThemeLabelForPaint(theme, platform));
    } catch {
      /* ignore SSR / early boot */
    }
  },
  setAccentTheme: (accentTheme) => {
    const name = normalizeAccentName(accentTheme);
    localStorage.setItem("accentTheme", name);
    set({ accentTheme: name });
  },
  setGlassEffects: (enabled) => {
    localStorage.setItem("glassEffects", enabled ? "true" : "false");
    set({ glassEffects: enabled });
  },
  setShowDesktopHeader: (enabled) => {
    localStorage.setItem("showDesktopHeader", enabled ? "true" : "false");
    set({ showDesktopHeader: enabled });
  },
  setDesktopHeaderNavFloating: (enabled) => {
    localStorage.setItem("desktopHeaderNavFloating", enabled ? "true" : "false");
    set({ desktopHeaderNavFloating: enabled });
  },
  setMobileNavTransparent: (enabled) => {
    localStorage.setItem("mobileNavTransparent", enabled ? "true" : "false");
    const style = styleFromLegacyTransparent(enabled);
    localStorage.setItem("mobileBottomNavStyle", style);
    set({ mobileNavTransparent: enabled, mobileBottomNavStyle: style });
  },
  setMobileBottomNavStyle: (style) => {
    const next = parseMobileBottomNavStyle(style);
    localStorage.setItem("mobileBottomNavStyle", next);
    const transparent = next === "transparent";
    localStorage.setItem("mobileNavTransparent", transparent ? "true" : "false");
    set({ mobileBottomNavStyle: next, mobileNavTransparent: transparent });
  },
  setReelsBottomNav: (mode) => {
    const next = parseReelsBottomNavMode(mode);
    localStorage.setItem("reelsBottomNav", next);
    set({ reelsBottomNav: next });
  },
  setShowMobileTopHeader: (enabled) => {
    localStorage.setItem("showMobileTopHeader", enabled ? "true" : "false");
    set({ showMobileTopHeader: enabled });
  },
  setMobileTopHeaderChrome: (chrome) => {
    const next = parseMobileTopHeaderChrome(chrome);
    localStorage.setItem("mobileTopHeaderChrome", next);
    set({ mobileTopHeaderChrome: next });
  },
  setMobileTopHeaderStyle: (style) => {
    const next = parseMobileTopHeaderStyle(style);
    localStorage.setItem("mobileTopHeaderStyle", JSON.stringify(next));
    set({ mobileTopHeaderStyle: next });
  },
  setFontScale: (fontScale) => {
    localStorage.setItem("fontScale", fontScale);
    set({ fontScale });
  },
  setShowWevAssistant: (show) => {
    localStorage.setItem("showWevAssistant", show.toString());
    set({ showWevAssistant: show });
  },
  setMobileNavItems: (items) => {
    const sanitized = normalizeMobileBottomNavIds(items);
    localStorage.setItem("mobileNavItems", JSON.stringify(sanitized));
    set({ mobileNavItems: sanitized });
  },
  setDesktopHeaderNavIds: (ids) => {
    const sanitized = normalizeDesktopHeaderNavIds(ids);
    localStorage.setItem("desktopHeaderNavIds", JSON.stringify(sanitized));
    set({ desktopHeaderNavIds: sanitized });
  },
  setAiLanguage: (lang) => {
    localStorage.setItem("wev_ai_language", lang);
    set({ aiLanguage: lang });
  },
  setSystemSettings: (settings) => set({ systemSettings: settings }),
}));
