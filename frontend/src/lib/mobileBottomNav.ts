import type React from 'react';
import { Bell } from 'lucide-react';
import {
  DIRECT_NAVIGATION_ITEMS,
  MORE_NAVIGATION_ITEMS,
  type NavigationBadgeKey,
  type NavigationMenuItem,
} from './navigationMenu';
import { WevsoftMenuIcon } from '../icons/WevsoftMenuIcon';

/** Settings → Mobile bottom nav (`app_mobile_bottom_nav`). Mobile / tablet only. */
export const MOBILE_BOTTOM_NAV_PREF_KEY = 'app_mobile_bottom_nav';

export const MOBILE_BOTTOM_NAV_MAX = 6;

export const DEFAULT_MOBILE_BOTTOM_NAV_IDS = [
  'home',
  'messages',
  'reels',
  'wevmall',
  'menu',
] as const;

export type MobileBottomNavId = string;

/** `menu` opens the main slide-out nav drawer (routes / settings / more). */
export type MobileBottomNavKind = 'route' | 'menu';

export interface MobileBottomNavEntry {
  id: MobileBottomNavId;
  kind: MobileBottomNavKind;
  to?: string;
  label: string;
  labelKey?: string;
  icon: React.ElementType;
  badgeKey?: NavigationBadgeKey;
}

function routeToNavId(to: string): MobileBottomNavId {
  return to.replace(/^\//, '').replace(/\//g, '-') || 'home';
}

function navItemToEntry(item: NavigationMenuItem): MobileBottomNavEntry {
  return {
    id: routeToNavId(item.to),
    kind: 'route',
    to: item.to,
    label: item.label,
    labelKey: item.labelKey,
    icon: item.icon,
    badgeKey: item.badgeKey,
  };
}

const SPECIAL_ENTRIES: MobileBottomNavEntry[] = [
  {
    id: 'notifications',
    kind: 'route',
    to: '/notifications',
    label: 'Notifications',
    labelKey: 'nav.notifications',
    icon: Bell,
    badgeKey: 'notifications',
  },
  {
    id: 'menu',
    kind: 'menu',
    label: 'Menu',
    labelKey: 'nav.menu',
    icon: WevsoftMenuIcon,
  },
];

const CATALOG_LIST: MobileBottomNavEntry[] = [
  ...DIRECT_NAVIGATION_ITEMS.map(navItemToEntry),
  ...MORE_NAVIGATION_ITEMS.map(navItemToEntry),
  ...SPECIAL_ENTRIES.filter((entry) => entry.id === 'menu'),
];

// Prefer the special Notifications / Menu entries over any catalog duplicate.
const CATALOG_BY_ID = new Map<MobileBottomNavId, MobileBottomNavEntry>();
for (const entry of CATALOG_LIST) CATALOG_BY_ID.set(entry.id, entry);
for (const entry of SPECIAL_ENTRIES) CATALOG_BY_ID.set(entry.id, entry);

export const MOBILE_BOTTOM_NAV_CATALOG = Array.from(CATALOG_BY_ID.values());

export function mobileBottomNavEntry(id: MobileBottomNavId): MobileBottomNavEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

export function parseMobileBottomNavIds(value: unknown): MobileBottomNavId[] {
  if (!Array.isArray(value)) return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];

  const seen = new Set<MobileBottomNavId>();
  const parsed: MobileBottomNavId[] = [];

  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    // Legacy profile pin → Menu; marketplace alias → WevMall.
    let id = raw.trim();
    if (id === 'profile') id = 'menu';
    if (id === 'marketplace') id = 'wevmall';
    if (!id || seen.has(id) || !CATALOG_BY_ID.has(id)) continue;
    seen.add(id);
    parsed.push(id);
    if (parsed.length >= MOBILE_BOTTOM_NAV_MAX) break;
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];
}

/** Upgrade legacy store defaults (profile pin → Menu; notifications pin → WevMall). */
export function normalizeMobileBottomNavIds(value: unknown): MobileBottomNavId[] {
  const parsed = parseMobileBottomNavIds(value);
  if (parsed.length === 0) return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];

  const legacyFour = ['home', 'friends', 'reels', 'messages'] as const;
  if (
    parsed.length === legacyFour.length &&
    legacyFour.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];
  }
  const previousWithoutPins = ['home', 'messages', 'reels'] as const;
  if (
    parsed.length === previousWithoutPins.length &&
    previousWithoutPins.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];
  }
  const previousWithNotifications = [
    'home',
    'messages',
    'reels',
    'notifications',
    'menu',
  ] as const;
  if (
    parsed.length === previousWithNotifications.length &&
    previousWithNotifications.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];
  }
  const previousWithMarketplaceAndNotifications = [
    'home',
    'messages',
    'reels',
    'wevmall',
    'notifications',
    'menu',
  ] as const;
  if (
    parsed.length === previousWithMarketplaceAndNotifications.length &&
    previousWithMarketplaceAndNotifications.every((id, index) => parsed[index] === id)
  ) {
    return [...DEFAULT_MOBILE_BOTTOM_NAV_IDS];
  }

  // Swap a lone notifications pin for WevMall when mall is not already present.
  if (parsed.includes('notifications') && !parsed.includes('wevmall')) {
    return parsed.map((id) => (id === 'notifications' ? 'wevmall' : id));
  }
  if (parsed.includes('notifications') && parsed.includes('wevmall')) {
    return parsed.filter((id) => id !== 'notifications');
  }
  return parsed;
}

export function mobileBottomNavSummary(ids: MobileBottomNavId[]): string {
  const labels = ids
    .map((id) => mobileBottomNavEntry(id)?.label)
    .filter(Boolean) as string[];
  return labels.length > 0
    ? labels.join(', ')
    : 'Home, WevChat, Reels, WevMall, Menu';
}

export function mobileBottomNavGridClass(count: number): string {
  if (count <= 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-4';
  if (count === 5) return 'grid-cols-5';
  return 'grid-cols-6';
}
