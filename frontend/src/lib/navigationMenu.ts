import { CREATOR_HUB_NAME, PERSONAL_CREATOR_HUB_PATH } from './creatorHub';
import type React from "react";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Calendar,
  Clapperboard,
  Clock,
  Code2,
  Compass,
  Film,
  GraduationCap,
  Home,
  Layers,
  Megaphone,
  Radio,
  Store,
  SquarePen,
  Trophy,
  Tv2,
  UserPlus,
  Users,
  ShieldCheck,
  Wallet,
  LineChart,
  Heart,
  Ghost,
  Landmark,
} from "lucide-react";
import { WevSpaceIcon } from "../components/wevspace/WevSpaceIcon";
import { WevChatIcon } from "../icons/WevChatIcon";

export type NavigationBadgeKey = "notifications";

export interface NavigationMenuItem {
  to: string;
  /** English fallback shown if the key is missing. */
  label: string;
  /** i18n key resolved at render time (never call t() at module scope). */
  labelKey: string;
  icon: React.ElementType;
  badgeKey?: NavigationBadgeKey;
}

export const DIRECT_NAVIGATION_ITEMS: NavigationMenuItem[] = [
  { to: "/home", label: "Home", labelKey: "nav.home", icon: Home },
  { to: "/friends", label: "Friends", labelKey: "nav.friends", icon: UserPlus },
  { to: "/messages", label: "WevChat", labelKey: "nav.wevchat", icon: WevChatIcon },
  { to: "/reels", label: "Reels", labelKey: "nav.reels", icon: Film },
  { to: "/wevmall", label: "WevMall", labelKey: "nav.wevmall", icon: Store },
  { to: "/donate", label: "Donate", labelKey: "nav.donate", icon: Landmark },
  { to: "/notifications", label: "Notifications", labelKey: "nav.notifications", icon: Bell, badgeKey: "notifications" },
  { to: "/groups", label: "Groups", labelKey: "nav.groups", icon: Users },
  { to: "/phantom", label: "Phantom", labelKey: "nav.phantom", icon: Ghost },
  { to: "/spaces", label: "Space", labelKey: "nav.space", icon: WevSpaceIcon },
  { to: "/live", label: "Live", labelKey: "nav.live", icon: Radio },
  { to: "/campus", label: "My Campus", labelKey: "nav.myCampus", icon: GraduationCap },
  { to: "/academic", label: "Academic", labelKey: "nav.academic", icon: BookOpen },
  { to: "/study", label: "AI Study", labelKey: "nav.aiStudy", icon: BrainCircuit },
  { to: PERSONAL_CREATOR_HUB_PATH, label: CREATOR_HUB_NAME, labelKey: "nav.creatorHub", icon: Clapperboard },
  { to: "/ai/post", label: "AI Post Creator", labelKey: "nav.aiPostCreator", icon: SquarePen },
  { to: "/jobs", label: "Jobs", labelKey: "nav.jobs", icon: Briefcase },
];

/** Personal-only routes — hidden from chrome and inaccessible while in Space / Business mode. */
export const SPACE_MODE_HIDDEN_NAV_PATHS = new Set<string>([
  "/phantom",
  "/friends",
  "/campus",
  "/academic",
  "/study",
  "/guardian",
  "/watch-party",
  "/rewards",
  "/bulletins",
  "/photos",
  "/videos",
]);

export function isSpaceModeHiddenNavPath(to: string | null | undefined): boolean {
  if (!to) return false;
  let raw = String(to);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* ignore malformed URI encoding */
  }
  const clean = raw
    .split("?")[0]
    .split("#")[0]
    .trim()
    .toLowerCase()
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "") || "/";

  if (SPACE_MODE_HIDDEN_NAV_PATHS.has(clean)) return true;
  for (const p of SPACE_MODE_HIDDEN_NAV_PATHS) {
    if (clean === p || clean.startsWith(`${p}/`)) return true;
  }
  return false;
}

import { Terminal } from "lucide-react";

export const DEVELOPER_CONSOLE_PATH = "/developer-console";

/**
 * True on the Developer Console itself: the `/developer-console` entry route
 * and the WevSpace dashboard section it redirects to
 * (`/space/:handle/manage/developer-console`).
 */
export function isDeveloperConsolePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === DEVELOPER_CONSOLE_PATH || pathname.startsWith(`${DEVELOPER_CONSOLE_PATH}/`)) return true;
  return /^\/space\/[^/]+\/manage\/developer-console(?:\/|$)/.test(pathname);
}

/**
 * Personal-chrome items that leave DashboardLayout for a full-screen shell
 * (WevDesk / Developer Console). Those must be plain `<a target="_blank">`
 * links — AppNavLink SPA transitions from the keep-alive Home shell do not
 * reliably mount the external route tree (WevChat already uses this pattern).
 */
export function isSpaceModeExternalNav(itemTo: string, isSpaceMode: boolean): boolean {
  if (itemTo === DEVELOPER_CONSOLE_PATH) return true;
  if (!isSpaceMode) return false;
  return itemTo === "/messages" || itemTo === "/notifications";
}

export function filterNavigationForSpaceMode(
  items: NavigationMenuItem[],
  isSpaceMode: boolean,
  /** Current route; the Developer Console link is dropped while already inside it. */
  currentPath?: string,
): NavigationMenuItem[] {
  if (!isSpaceMode) return items;

  const filtered = items.filter((item) => !isSpaceModeHiddenNavPath(item.to));



  return filtered;
}

/** Drop Donate from chrome when admin turned off `donationNavEnabled`. Missing flag = keep visible. */
export function filterNavigationForDonationNav(
  items: NavigationMenuItem[],
  donationNavEnabled: boolean | null | undefined,
): NavigationMenuItem[] {
  if (donationNavEnabled === false) {
    return items.filter((item) => item.to !== '/donate' && !item.to.startsWith('/donate?'));
  }
  return items;
}

/** True when a pinned shortcut path should be hidden because Donate nav is off. */
export function isDonationNavHiddenPath(
  to: string | undefined,
  donationNavEnabled: boolean | null | undefined,
): boolean {
  if (donationNavEnabled !== false || !to) return false;
  return to === '/donate' || to.startsWith('/donate/') || to.startsWith('/donate?');
}

export const MORE_NAVIGATION_ITEMS: NavigationMenuItem[] = [
  { to: "/explore", label: "Explore", labelKey: "nav.explore", icon: Compass },
  { to: "/events", label: "Events", labelKey: "nav.events", icon: Calendar },
  { to: "/watch-party", label: "Watch Party", labelKey: "nav.watchParty", icon: Tv2 },
  { to: "/rewards", label: "Rewards", labelKey: "nav.rewards", icon: Trophy },
  { to: "/wallet", label: "Wallet", labelKey: "nav.wallet", icon: Wallet },
  { to: "/creator-hub?tab=analytics", label: "Insights", labelKey: "nav.insights", icon: LineChart },
  { to: "/studio/content", label: "Content analytics", labelKey: "nav.contentAnalytics", icon: Clapperboard },
  { to: "/guardian", label: "Family & Guardian", labelKey: "nav.familyGuardian", icon: ShieldCheck },
  { to: "/bulletins", label: "Bulletins", labelKey: "nav.bulletins", icon: Megaphone },
];
