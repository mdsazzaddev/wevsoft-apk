/**
 * authStore.ts
 *
 * Domain store for authentication state: the JWT token and the authenticated
 * User object. Extracted from the monolithic store.ts.
 *
 * COMPATIBILITY: The monolithic store.ts continues to hold these fields and
 * re-exports them so all existing consumers using `import { useStore } from
 * "../store"` continue to work without modification. New code should prefer
 * importing directly from this store to avoid subscribing to unrelated state.
 *
 * Usage:
 *   import { useAuthStore } from "../stores/authStore";
 *   const token = useAuthStore((s) => s.token);
 */

import { create } from "zustand";
import { findSavedAccount, rememberSignedOutAccount, removeSavedAccount, upsertSavedAccount } from "../lib/savedAccounts";
import { isAdminRole } from "@wevsoft/shared/types/roles";
import { useSettingsStore } from "./settingsStore";
import { activeIdentityStorageKey } from "@wevsoft/shared/wevspace";
import { cookieOnlyClient, migrateStoredToken, storableToken } from "@wevsoft/shared/api/cookie-auth";

/**
 * Every sign-in (and sign-out) lands on the personal account: Space mode is only
 * entered by an explicit switch during the session. Clears the remembered
 * WevSpace identity for this user and tells mounted switchers to reset.
 */
function resetActiveIdentity(userId: unknown): void {
  try {
    if (userId) localStorage.removeItem(activeIdentityStorageKey(userId));
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(new CustomEvent("wevspace:identity-changed", { detail: { spaceId: null } }));
  } catch {
    /* non-browser */
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  theme: string;
  role?: string;
  avatar?: string;
  username?: string;
  [key: string]: unknown;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  beginAddAccount: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // WS7b: in cookie-only mode a stored JWT is replaced by a non-secret marker.
  token: migrateStoredToken("token", localStorage),
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as AuthUser | null;
    } catch {
      return null;
    }
  })(),

  setAuth: (rawToken, user) => {
    const prev = useAuthStore.getState();
    // Block admin bootstrap into the consumer app, but still allow same-user profile
    // re-sync (name/avatar/bio) so edits show in the top bar after save.
    if (isAdminRole(user?.role) && prev.user?.id !== user?.id) return;
    const token = storableToken(rawToken) || rawToken;
    // A new session (fresh login / account switch), not a profile re-sync of the same token.
    if (token && (token !== prev.token || prev.user?.id !== user?.id)) resetActiveIdentity(user?.id);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    const incomingTheme = typeof user.theme === 'string' ? user.theme.trim() : '';
    // Only apply when the profile actually carries a theme — never clobber OLED/Dark
    // with a missing/stale default during /api/profile sync.
    if (incomingTheme) {
      try {
        useSettingsStore.getState().setTheme(incomingTheme);
      } catch {
        localStorage.setItem('theme', incomingTheme);
      }
    }
    if (user?.id && token) {
      upsertSavedAccount({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        theme: incomingTheme || useSettingsStore.getState().theme || 'Light mode',
        // Cookie-only: never persist a JWT for quick switch (re-login instead).
        token: cookieOnlyClient() ? "" : token,
      });
    }
    set({ token, user });
  },

  logout: async () => {
    const currentId = useAuthStore.getState().user?.id;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (currentId) {
      rememberSignedOutAccount(findSavedAccount(currentId));
      removeSavedAccount(currentId);
    }
    resetActiveIdentity(currentId);
    set({ token: null, user: null });
  },

  beginAddAccount: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));
