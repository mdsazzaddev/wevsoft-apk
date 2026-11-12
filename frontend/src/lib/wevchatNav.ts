/** Desktop WevChat entry: open a right-docked glass panel instead of /messages. */

import type { MouseEvent } from 'react';
import { isDesktopMd } from './desktopHeader';
import { useUiStore } from '../stores/uiStore';

export const WEVCHAT_DOCK_RIGHT_KEY = 'wev_wevchat_dock_right';
export const WEVCHAT_LIST_ONLY_KEY = 'wev_wevchat_list_only';
/** Matches `ACTIVE_CHAT_STORAGE_KEY` in wevchat utils — clear so first open is list-only. */

/**
 * Sidebar / menu click handler for WevChat.
 * Personal mode: ONE click opens the fullscreen /messages page. (Previously the
 * first click only spawned a minimized bottom-right pill and a second click was
 * needed to expand it.) Any open floating panel is closed so the page owns chat.
 * WevSpace mode and mobile keep their normal navigation.
 */
export function handleWevChatNavClick(_event: MouseEvent) {
  if (!isDesktopMd()) return;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('wevspace-space-mode')) {
    return;
  }
  const ui = useUiStore.getState();
  if (ui.wevChatDesktopFloat) ui.closeWevChatDesktopFloat();
  try {
    sessionStorage.removeItem(WEVCHAT_LIST_ONLY_KEY);
    sessionStorage.removeItem(WEVCHAT_DOCK_RIGHT_KEY);
    sessionStorage.removeItem('wev_wevchat_start_minimized');
  } catch {
    /* ignore */
  }
  // Let the link navigate to /messages (fullscreen, maximized WevChat).
}

export function isWevChatNavPath(to: string | undefined | null): boolean {
  if (!to) return false;
  const path = to.split('?')[0].split('#')[0];
  return path === '/messages' || path === '/wevchat';
}
