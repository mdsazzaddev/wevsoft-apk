/**
 * useSystemSettings
 *
 * Shared React Query hook that fetches global system settings from
 * /api/settings/system. This replaces the one-off fetch in App.tsx for
 * read access so any component can consume the data without a raw useEffect.
 *
 * Note: App.tsx still owns the *initial* fetch and the side-effects
 * (document.title, favicon) because those are global DOM mutations that must
 * happen once on app load. This hook is for read-only consumers elsewhere
 * (e.g., settings panels, branding components) that want cached access.
 *
 * The hook is disabled (returns null) when data is not yet available, so
 * callers must handle the null case.
 */

import { useQuery } from "@tanstack/react-query";
import { hydrateNavIconAdminDefaults } from "../lib/navIconStyleState";

export interface SystemSettingsData {
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
  sidebarLogo?: string;
  loginCalligraphyEnabled?: boolean;
  /** Admin kill-switch for Face ID / Passkey on the login page. Missing/false = OFF. */
  loginPasskeyEnabled?: boolean;
  /**
   * Donation Center: show Donate in home sidebar / mobile menu.
   * Missing = treat as ON (legacy). Explicit false = hide.
   */
  donationNavEnabled?: boolean;
  oauthConsentMascotEnabled?: boolean;
  /** Admin: which feed post action chips are visible (react/comment/repost/share/views). */
  feedPostActions?: {
    react?: boolean;
    comment?: boolean;
    repost?: boolean;
    share?: boolean;
    views?: boolean;
  };
  /** Admin platform default nav icon style for light and dark appearance. */
  navIconStyleDefaults?: {
    light?: string;
    dark?: string;
  };
  [key: string]: unknown;
}

export const SYSTEM_SETTINGS_QUERY_KEY = ["settings", "system"] as const;

async function fetchSystemSettings(): Promise<SystemSettingsData> {
  const ac = new AbortController();
  const kill = window.setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch("/api/settings/system", { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as SystemSettingsData;
    hydrateNavIconAdminDefaults(data.navIconStyleDefaults);
    return data;
  } finally {
    window.clearTimeout(kill);
  }
}

/**
 * Read-only access to system settings. Returns null during the initial load.
 * Does not fire side-effects — those stay in App.tsx.
 */
export function useSystemSettings(): SystemSettingsData | null {
  const { data } = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: fetchSystemSettings,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // Keep the last value when revalidating to prevent flash-of-null.
    placeholderData: (prev) => prev,
    // No auth needed — public endpoint.
    retry: 2,
  });

  return data ?? null;
}
