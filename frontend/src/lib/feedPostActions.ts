/** Mirrors backend feed-post-actions.logic — which action chips the feed may show. */

export const FEED_POST_ACTION_KEYS = [
  'react',
  'comment',
  'repost',
  'share',
  'views',
] as const;

export type FeedPostActionKey = (typeof FEED_POST_ACTION_KEYS)[number];

export type FeedPostActionsConfig = Record<FeedPostActionKey, boolean>;

export const DEFAULT_FEED_POST_ACTIONS: FeedPostActionsConfig = {
  react: true,
  comment: true,
  repost: true,
  share: true,
  views: true,
};

export function normalizeFeedPostActions(raw: unknown): FeedPostActionsConfig {
  const out: FeedPostActionsConfig = { ...DEFAULT_FEED_POST_ACTIONS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of FEED_POST_ACTION_KEYS) {
    if (typeof obj[key] === 'boolean') out[key] = obj[key];
  }
  return out;
}
