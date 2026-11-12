/** Distance from the bottom of a message scroller before we treat it as "at the latest". */
export const MESSAGE_LIST_BOTTOM_PX = 96;

export type ScrollMetrics = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

export function messageListGap(metrics: ScrollMetrics): number {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
}

/**
 * True when the latest messages are already in view.
 * A list that fits the pane is at the bottom even if scrollTop is 0
 * (Virtuoso `alignToBottom` reports that as "not at bottom").
 * An unmeasured pane (clientHeight 0) is treated as at the bottom so the
 * jump button does not flash before layout.
 */
export function isMessageListAtBottom(
  metrics: ScrollMetrics,
  threshold = MESSAGE_LIST_BOTTOM_PX,
): boolean {
  if (!(metrics.clientHeight > 0)) return true;
  if (metrics.scrollHeight <= metrics.clientHeight + 1) return true;
  return messageListGap(metrics) <= threshold;
}

/** Follow new messages only after the opening scroll, and only while pinned to the tail. */
export function shouldFollowTail(opts: {
  initialScrollDone: boolean;
  virtuosoAtBottom: boolean;
  stuckToBottom: boolean;
}): 'auto' | false {
  if (!opts.initialScrollDone) return false;
  if (opts.virtuosoAtBottom || opts.stuckToBottom) return 'auto';
  return false;
}

export type PresenceDot = 'online' | 'offline' | 'hidden';

/**
 * Avatar dot for the open direct chat.
 * Typing proves the person is active, so the dot is green — unless they hide
 * online status, in which case we show no dot rather than a grey "offline".
 */
export function peerPresenceDot(opts: {
  presenceKnown: boolean;
  listedOnline: boolean;
  typing: boolean;
  presenceVisible: boolean;
}): PresenceDot {
  if (opts.typing && opts.presenceVisible) return 'online';
  if (opts.typing && !opts.presenceVisible) return 'hidden';
  if (!opts.presenceKnown) return 'hidden';
  return opts.listedOnline ? 'online' : 'offline';
}
