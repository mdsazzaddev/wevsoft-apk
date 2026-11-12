/**
 * uiStore.ts
 *
 * Domain store for transient UI state that does not persist to localStorage:
 * chat active flag, sidebar compact mode, gamification snapshot.
 *
 * COMPATIBILITY: The monolithic store.ts continues to hold these fields and
 * re-exports them. New code should prefer importing from this store.
 *
 * Usage:
 *   import { useUiStore } from "../stores/uiStore";
 *   const isChatActive = useUiStore((s) => s.isChatActive);
 */

import { create } from "zustand";

interface GamificationState {
  xp: number;
  coins: number;
  level: number;
  tier: string;
  streak: number;
}

interface UiState {
  isChatActive: boolean;
  sidebarCompact: boolean;
  gamification: GamificationState | null;
  /** Desktop glass WevChat window floating over the current route (usually home feed). */
  wevChatDesktopFloat: boolean;
  wevChatFloatConversationId: string | null;
  /** First open from nav starts as the bottom-right minimized pill. */
  wevChatOpenMinimized: boolean;
  /** Profile page sections (e.g. Friends tab) that want the app top bar even though /profile is header-off. */
  profileTopBarVisible: boolean;
  setProfileTopBarVisible: (visible: boolean) => void;
  setIsChatActive: (active: boolean) => void;
  setSidebarCompact: (compact: boolean) => void;
  setGamification: (state: GamificationState) => void;
  openWevChatDesktopFloat: (
    conversationId?: string | null,
    opts?: { minimized?: boolean },
  ) => void;
  setWevChatFloatConversationId: (conversationId: string | null) => void;
  setWevChatOpenMinimized: (minimized: boolean) => void;
  closeWevChatDesktopFloat: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isChatActive: false,
  sidebarCompact: false,
  gamification: null,
  wevChatDesktopFloat: false,
  wevChatFloatConversationId: null,
  wevChatOpenMinimized: false,
  profileTopBarVisible: false,
  setProfileTopBarVisible: (visible) => set({ profileTopBarVisible: visible }),

  setIsChatActive: (active) => set({ isChatActive: active }),
  setSidebarCompact: (compact) => set({ sidebarCompact: compact }),
  setGamification: (state) => set({ gamification: state }),
  openWevChatDesktopFloat: (conversationId = null, opts) =>
    set({
      wevChatDesktopFloat: true,
      wevChatFloatConversationId: conversationId ?? null,
      wevChatOpenMinimized: !!opts?.minimized,
      isChatActive: true,
    }),
  setWevChatFloatConversationId: (conversationId) =>
    set({ wevChatFloatConversationId: conversationId }),
  setWevChatOpenMinimized: (minimized) => set({ wevChatOpenMinimized: minimized }),
  closeWevChatDesktopFloat: () =>
    set({
      wevChatDesktopFloat: false,
      wevChatFloatConversationId: null,
      wevChatOpenMinimized: false,
      isChatActive: false,
    }),
}));
