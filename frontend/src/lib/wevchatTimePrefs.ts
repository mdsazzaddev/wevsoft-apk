const KEY = (conversationId: string) => `wev_chat_inline_send_time:${conversationId}`;

/** Gap between messages that gets a centered time chip when inline timestamps are off. */
export const MESSAGE_TIME_GAP_MS = 2.5 * 60 * 1000;

export function getShowInlineSendTime(conversationId: string): boolean {
  if (!conversationId) return false;
  try {
    const raw = localStorage.getItem(KEY(conversationId));
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    return false;
  } catch {
    return false;
  }
}

export function setShowInlineSendTime(conversationId: string, show: boolean): void {
  if (!conversationId) return;
  try {
    localStorage.setItem(KEY(conversationId), show ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}
