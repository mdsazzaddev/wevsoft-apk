import type { ConversationSummary, MessageData } from '../types';

export function displayName(c: ConversationSummary): string {
  if (c.nickname) return c.nickname;
  if (c.type === 'group') return c.name || 'Group Chat';
  return c.otherUser?.name || c.name || 'Unknown User';
}

export function safeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function groupDateLabel(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}

export function previewText(m?: MessageData | null): string {
  if (!m) return 'No messages yet';
  if (m.isDeleted) return 'This message was deleted';
  if (m.privateSessionId) return '🔒 Private message';
  if (m.mediaType === 'story_reply' || (m.fileName && m.fileName.startsWith('story:'))) {
    return m.text ? `Story reply: ${m.text}` : 'Replied to a story';
  }
  if (m.mediaType === 'location' || (m.fileName && m.fileName.startsWith('location:'))) {
    return m.text || 'Location';
  }
  if (m.isAiGenerated || m.mediaType === 'ai_generation') {
    return m.text ? `✨ ${m.text}` : 'AI generation';
  }
  return m.text || '[media]';
}

export function normalizeConversation(chat: ConversationSummary, currentUserId?: string): ConversationSummary {
  const members = Array.isArray(chat.members) ? chat.members : [];
  const otherUser =
    chat.otherUser ||
    members.find((mem) => mem?.userId !== currentUserId)?.user ||
    null;
  return { ...chat, members, otherUser };
}

export const SIDEBAR_WIDTH_KEY = 'wev_wevchat_sidebar_width';
export const SIDEBAR_DEFAULT = 400;
export const SIDEBAR_MIN = 340;
export const SIDEBAR_MAX = 560;
export const CONVERSATION_MIN = 360;
export const APP_NAV_WIDTH = 260;

export function wevchatAvailWidth(viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920): number {
  if (viewportWidth < 768) return viewportWidth;
  return Math.max(320, viewportWidth - APP_NAV_WIDTH);
}

export function sidebarMaxForViewport(viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920): number {
  const avail = wevchatAvailWidth(viewportWidth);
  const maxForConv = avail - CONVERSATION_MIN - 4;
  const softCap = Math.floor(avail * 0.46);
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.min(maxForConv, softCap)));
}

export function clampSidebarWidth(n: number, viewportWidth?: number): number {
  const max = sidebarMaxForViewport(viewportWidth);
  const min = Math.min(SIDEBAR_MIN, max);
  return Math.min(max, Math.max(min, n));
}

/** Min width the conversation pane may shrink to inside a narrow floating shell. */
export const FLOAT_CONVERSATION_MIN = 200;

export function clampSidebarWidthInShell(n: number, shellWidth: number): number {
  // Prefer keeping the chat-list at ≥ SIDEBAR_MIN; let the conversation pane
  // absorb narrow shells (floating glass window) instead of crushing the list/tabs.
  const convFloor =
    shellWidth < SIDEBAR_MIN + CONVERSATION_MIN
      ? Math.max(FLOAT_CONVERSATION_MIN, shellWidth - SIDEBAR_MIN - 4)
      : CONVERSATION_MIN;
  const maxForConv = shellWidth - convFloor - 4;
  // 46% soft-cap only on wide shells — on narrow floats it was shrinking the list.
  const softCap = shellWidth >= 900 ? Math.floor(shellWidth * 0.46) : SIDEBAR_MAX;
  const max = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.min(maxForConv, softCap)));
  const min = Math.min(SIDEBAR_MIN, max);
  return Math.min(max, Math.max(min, n));
}

export function readSidebarWidth(): number {
  try {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n)) return clampSidebarWidth(n);
    }
  } catch {
    /* ignore */
  }
  return clampSidebarWidth(SIDEBAR_DEFAULT);
}

export function chatAvatar(chat: ConversationSummary): string | null {
  return chat.photo || chat.otherUser?.avatar || null;
}

export function makeClientId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sameContent(a: MessageData, b: MessageData): boolean {
  const aText = (typeof a.sendPayload?.text === 'string' ? a.sendPayload.text : a.text) || '';
  const bText = (typeof b.sendPayload?.text === 'string' ? b.sendPayload.text : b.text) || '';
  return (
    aText === bText &&
    (a.imageUrl || '') === (b.imageUrl || '') &&
    (a.videoUrl || '') === (b.videoUrl || '') &&
    (a.audioUrl || '') === (b.audioUrl || '') &&
    (a.fileUrl || '') === (b.fileUrl || '')
  );
}

export const ACTIVE_CHAT_STORAGE_KEY = 'wev_active_chat_id';

export function writeStoredActiveChatId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
    else sessionStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
