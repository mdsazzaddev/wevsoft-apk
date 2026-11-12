import type React from 'react';
import { Terminal } from "lucide-react";
import {
  DIRECT_NAVIGATION_ITEMS,
  MORE_NAVIGATION_ITEMS,
  type NavigationBadgeKey,
  type NavigationMenuItem,
  DEVELOPER_CONSOLE_PATH
} from './navigationMenu';

/** Settings → Desktop header shortcuts (`app_desktop_header_nav`). */
export const DESKTOP_HEADER_NAV_PREF_KEY = 'app_desktop_header_nav';

export const DESKTOP_HEADER_NAV_MAX = 6;

export const DEFAULT_DESKTOP_HEADER_NAV_IDS = [
  'home',
  'friends',
  'messages',
  'reels',
  'marketplace',
] as const;

const LEGACY_DEFAULT_DESKTOP_HEADER_NAV_IDS = ['home', 'friends', 'reels', 'groups'] as const;
const PREVIOUS_DEFAULT_WITH_GROUPS = [
  'home',
  'friends',
  'messages',
  'reels',
  'marketplace',
  'groups',
] as const;

export type DesktopHeaderNavId = string;

export interface DesktopHeaderNavEntry {
  id: DesktopHeaderNavId;
  to: string;
  label: string;
  labelKey?: string;
  icon: React.ElementType;
  badgeKey?: NavigationBadgeKey;
}

function routeToNavId(to: string): DesktopHeaderNavId {
  return to.replace(/^\//, '').replace(/\//g, '-') || 'home';
}

function navItemToEntry(item: NavigationMenuItem): DesktopHeaderNavEntry {
  return {
    id: routeToNavId(item.to),
    to: item.to,
    label: item.label,
    labelKey: item.labelKey,
    icon: item.icon,
    badgeKey: item.badgeKey,
  };
}

const CATALOG_LIST: DesktopHeaderNavEntry[] = [
  ...DIRECT_NAVIGATION_ITEMS.map(navItemToEntry),
  ...MORE_NAVIGATION_ITEMS.map(navItemToEntry),
  { id: "developer-console", to: DEVELOPER_CONSOLE_PATH, label: "Developer Console", labelKey: "nav.developerConsole", icon: Terminal }
];

const CATALOG_BY_ID = new Map(CATALOG_LIST.map((entry) => [entry.id, entry]));

export const DESKTOP_HEADER_NAV_CATALOG = CATALOG_LIST;

export function desktopHeaderNavEntry(id: DesktopHeaderNavId): DesktopHeaderNavEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

export function parseDesktopHeaderNavIds(value: unknown): DesktopHeaderNavId[] {
  if (!Array.isArray(value)) return [...DEFAULT_DESKTOP_HEADER_NAV_IDS];

  const seen = new Set<DesktopHeaderNavId>();
  const parsed: DesktopHeaderNavId[] = [];

  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || seen.has(id) || !CATALOG_BY_ID.has(id)) continue;
    seen.add(id);
    parsed.push(id);
    if (parsed.length >= DESKTOP_HEADER_NAV_MAX) break;
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_DESKTOP_HEADER_NAV_IDS];
}

/** Upgrade saved defaults when the built-in shortcut list changes. */
export function normalizeDesktopHeaderNavIds(value: unknown): DesktopHeaderNavId[] {
  const parsed = parseDesktopHeaderNavIds(value);
  if (
    parsed.length === LEGACY_DEFAULT_DESKTOP_HEADER_NAV_IDS.length &&
    LEGACY_DEFAULT_DESKTOP_HEADER_NAV_IDS.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_DESKTOP_HEADER_NAV_IDS];
  }
  if (
    parsed.length === PREVIOUS_DEFAULT_WITH_GROUPS.length &&
    PREVIOUS_DEFAULT_WITH_GROUPS.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_DESKTOP_HEADER_NAV_IDS];
  }
  return parsed;
}

export function desktopHeaderNavSummary(ids: DesktopHeaderNavId[]): string {
  const labels = ids
    .map((id) => desktopHeaderNavEntry(id)?.label)
    .filter(Boolean) as string[];
  return labels.length > 0 ? labels.join(', ') : 'Home, Friends, WevChat, Reels, WevMall';
}
