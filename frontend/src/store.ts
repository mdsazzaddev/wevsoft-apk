import { create } from 'zustand';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';
import type { AuthUser } from './stores/authStore';

// Re-export User type for legacy consumers
export type User = AuthUser;

// Define SystemSettings explicitly to match the old shape and satisfy TS checks
export interface SystemSettings {
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
  donationQrbKash?: string;
  donationQrNagad?: string;
  donationQrUpay?: string;
  sidebarLogo?: string;
  /** Admin toggle (FeatureFlag `creator_pro_enabled`): Creator Studio Upgrade page + Pro buttons. Missing = off. */
  creatorProEnabled?: boolean;
  [key: string]: any;
}

export interface AppState {
  token: string | null;
  user: User | null;
  theme: string;
  accentTheme: string;
  glassEffects: boolean;
  showDesktopHeader: boolean;
  desktopHeaderNavFloating: boolean;
  mobileNavTransparent: boolean;
  mobileBottomNavStyle: import('./lib/mobileBottomNavStyle').MobileBottomNavStyle;
  reelsBottomNav: import('./lib/reelsBottomNav').ReelsBottomNavMode;
  showMobileTopHeader: boolean;
  mobileTopHeaderChrome: import('./lib/mobileTopHeaderChrome').MobileTopHeaderChrome;
  mobileTopHeaderStyle: any;
  fontScale: string;
  systemSettings: SystemSettings | null;
  showWevAssistant: boolean;
  mobileNavItems: string[];
  desktopHeaderNavIds: string[];
  isChatActive: boolean;
  sidebarCompact: boolean;
  aiLanguage: string;
  gamification: any | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  beginAddAccount: () => void;
  setTheme: (theme: string) => void;
  setAccentTheme: (accentTheme: string) => void;
  setGlassEffects: (enabled: boolean) => void;
  setShowDesktopHeader: (enabled: boolean) => void;
  setDesktopHeaderNavFloating: (enabled: boolean) => void;
  setMobileNavTransparent: (enabled: boolean) => void;
  setMobileBottomNavStyle: (style: import('./lib/mobileBottomNavStyle').MobileBottomNavStyle) => void;
  setReelsBottomNav: (mode: import('./lib/reelsBottomNav').ReelsBottomNavMode) => void;
  setShowMobileTopHeader: (enabled: boolean) => void;
  setMobileTopHeaderChrome: (chrome: import('./lib/mobileTopHeaderChrome').MobileTopHeaderChrome) => void;
  setMobileTopHeaderStyle: (style: any) => void;
  setFontScale: (fontScale: string) => void;
  setSystemSettings: (settings: any) => void;
  setShowWevAssistant: (show: boolean) => void;
  setMobileNavItems: (items: string[]) => void;
  setDesktopHeaderNavIds: (ids: string[]) => void;
  setIsChatActive: (active: boolean) => void;
  setSidebarCompact: (compact: boolean) => void;
  setAiLanguage: (lang: string) => void;
  setGamification: (state: any) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state derived from the domain stores
  ...useAuthStore.getState(),
  ...useUiStore.getState(),
  ...useSettingsStore.getState(),

  // Proxy actions to domain stores
  setAuth: (token, user) => useAuthStore.getState().setAuth(token, user),
  logout: () => useAuthStore.getState().logout(),
  beginAddAccount: () => useAuthStore.getState().beginAddAccount(),

  setTheme: (theme) => useSettingsStore.getState().setTheme(theme),
  setAccentTheme: (accentTheme) => useSettingsStore.getState().setAccentTheme(accentTheme),
  setGlassEffects: (enabled) => useSettingsStore.getState().setGlassEffects(enabled),
  setShowDesktopHeader: (enabled) => useSettingsStore.getState().setShowDesktopHeader(enabled),
  setDesktopHeaderNavFloating: (enabled) => useSettingsStore.getState().setDesktopHeaderNavFloating(enabled),
  setMobileNavTransparent: (enabled) => useSettingsStore.getState().setMobileNavTransparent(enabled),
  setMobileBottomNavStyle: (style) => useSettingsStore.getState().setMobileBottomNavStyle(style),
  setReelsBottomNav: (mode) => useSettingsStore.getState().setReelsBottomNav(mode),
  setShowMobileTopHeader: (enabled) => useSettingsStore.getState().setShowMobileTopHeader(enabled),
  setMobileTopHeaderChrome: (chrome) => useSettingsStore.getState().setMobileTopHeaderChrome(chrome),
  setMobileTopHeaderStyle: (style) => useSettingsStore.getState().setMobileTopHeaderStyle(style),
  setFontScale: (fontScale) => useSettingsStore.getState().setFontScale(fontScale),
  setShowWevAssistant: (show) => useSettingsStore.getState().setShowWevAssistant(show),
  setMobileNavItems: (items) => useSettingsStore.getState().setMobileNavItems(items),
  setDesktopHeaderNavIds: (ids) => useSettingsStore.getState().setDesktopHeaderNavIds(ids),
  setAiLanguage: (lang) => useSettingsStore.getState().setAiLanguage(lang),
  setSystemSettings: (settings) => useSettingsStore.getState().setSystemSettings(settings),

  setIsChatActive: (active) => useUiStore.getState().setIsChatActive(active),
  setSidebarCompact: (compact) => useUiStore.getState().setSidebarCompact(compact),
  setGamification: (state) => useUiStore.getState().setGamification(state),
}));

// Sync domain stores into the legacy facade store
useAuthStore.subscribe((state) => useStore.setState(state));
useUiStore.subscribe((state) => useStore.setState(state));
useSettingsStore.subscribe((state) => useStore.setState(state));
