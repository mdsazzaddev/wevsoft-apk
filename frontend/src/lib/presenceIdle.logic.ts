/**
 * How long a backgrounded tab keeps counting as "online" before the server is told it is idle.
 *
 * Phones: a locked / backgrounded app keeps its socket alive but nobody is looking → go idle fast.
 * Desktop: an overlapped, side-by-side or unfocused window reports `document.hidden`, yet the person
 * is still in the chat. A short delay made one of two chatting users show Offline to the other.
 */
export const IDLE_HIDDEN_MOBILE_MS = 45_000;
export const IDLE_HIDDEN_DESKTOP_MS = 5 * 60_000;
export const IDLE_OPENED_HIDDEN_MOBILE_MS = 10_000;
export const IDLE_OPENED_HIDDEN_DESKTOP_MS = 2 * 60_000;

export function idleDelayMs(opts: { openedHidden: boolean; coarsePointer: boolean }): number {
  if (opts.coarsePointer) {
    return opts.openedHidden ? IDLE_OPENED_HIDDEN_MOBILE_MS : IDLE_HIDDEN_MOBILE_MS;
  }
  return opts.openedHidden ? IDLE_OPENED_HIDDEN_DESKTOP_MS : IDLE_HIDDEN_DESKTOP_MS;
}
