/**
 * Pure decisions for the WevChat thread: composer placeholder, typing vs
 * presence, and whether the virtualized list is actually at the bottom.
 */

export function messageComposerPlaceholder(value: string, isPrivate: boolean): string {
  // A non-empty value must not keep the native placeholder. Light-mode CSS
  // forces `::placeholder { opacity: 1 !important }`, which some engines paint
  // on top of the typed text.
  if (value.length > 0) return '';
  return isPrivate ? 'Private message…' : 'Type a message…';
}

/**
 * Typing proves the person is active. Callers still pass `activityVisible`
 * from the server (`mayBroadcastPresence`) so a hidden status stays hidden.
 * Missing flag (older payloads) is treated as visible.
 */
export function typingMarksPeerActive(activityVisible: boolean | undefined): boolean {
  return activityVisible !== false;
}

export function listIsPinnedToBottom(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number } | null,
  thresholdPx: number,
): boolean | null {
  if (!el || el.clientHeight <= 0) return null;
  const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (el.scrollHeight <= el.clientHeight + 1) return true;
  return gap <= thresholdPx;
}

/** Absolute Virtuoso index. `firstItemIndex` shifts the list, so `'LAST'` misses. */
export function virtuosoBottomIndex(firstItemIndex: number, count: number): number | null {
  if (count <= 0 || !Number.isFinite(firstItemIndex)) return null;
  return firstItemIndex + count - 1;
}

export function shouldFollowThreadOutput(virtuosoAtBottom: boolean, pinned: boolean): 'auto' | false {
  return virtuosoAtBottom || pinned ? 'auto' : false;
}
