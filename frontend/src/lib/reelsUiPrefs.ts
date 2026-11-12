import { useEffect, useState } from 'react';

/** Desktop visibility mode for Reels overlay chrome. */
export type ReelsUiMode = 'auto' | 'always' | 'hidden';
export type ReelsUiElement = 'sidebar' | 'volume' | 'wevchat' | 'notifications' | 'search';

/** Settings option ids (persisted in the account preferences blob). */
export const REELS_UI_PREF_IDS: Record<ReelsUiElement, string> = {
  sidebar: 'reels_ui_sidebar',
  volume: 'reels_ui_volume',
  wevchat: 'reels_ui_wevchat',
  notifications: 'reels_ui_notifications',
  search: 'reels_ui_search',
};

export const REELS_UI_MODE_LABELS: Record<ReelsUiMode, string> = {
  auto: 'Auto-hide (show on hover)',
  always: 'Always visible',
  hidden: 'Hidden',
};

const STORAGE_KEY = 'wev_reels_ui';
const EVENT = 'wev-reels-ui-change';
const DEFAULT_MODE: ReelsUiMode = 'auto';
/** Per-element defaults when the user hasn't chosen: top-right buttons and volume are always visible on desktop. */
export const REELS_UI_DEFAULT_MODES: Record<ReelsUiElement, ReelsUiMode> = {
  sidebar: 'auto',
  volume: 'always',
  wevchat: 'always',
  notifications: 'always',
  search: 'always',
};

export function parseReelsUiMode(v: unknown, fallback: ReelsUiMode = DEFAULT_MODE): ReelsUiMode {
  if (v === 'auto' || v === 'always' || v === 'hidden') return v;
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('always')) return 'always';
  if (s === 'hidden' || s === 'off') return 'hidden';
  if (s.startsWith('auto')) return 'auto';
  return fallback;
}

export function reelsUiModeLabel(m: ReelsUiMode): string {
  return REELS_UI_MODE_LABELS[m];
}

function readAll(): Partial<Record<ReelsUiElement, ReelsUiMode>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getReelsUiMode(el: ReelsUiElement): ReelsUiMode {
  return parseReelsUiMode(readAll()[el], REELS_UI_DEFAULT_MODES[el]);
}

export function setReelsUiMode(el: ReelsUiElement, mode: ReelsUiMode) {
  try {
    const next = { ...readAll(), [el]: parseReelsUiMode(mode) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch { /* ignore */ }
}

/** Sync from a settings option id + value (from the settings page / prefs blob). */
export function syncReelsUiPref(optionId: string, value: unknown): boolean {
  const entry = (Object.entries(REELS_UI_PREF_IDS) as [ReelsUiElement, string][]).find(([, id]) => id === optionId);
  if (!entry) return false;
  setReelsUiMode(entry[0], parseReelsUiMode(value));
  return true;
}

/** Live-updating hook (same tab via custom event, other tabs via storage event). */
export function useReelsUiMode(el: ReelsUiElement): ReelsUiMode {
  const [mode, setMode] = useState<ReelsUiMode>(() => getReelsUiMode(el));
  useEffect(() => {
    const update = () => setMode(getReelsUiMode(el));
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, [el]);
  return mode;
}
