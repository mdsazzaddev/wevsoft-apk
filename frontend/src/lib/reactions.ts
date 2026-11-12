export const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionDef = { id: ReactionType; emoji: string; image: string; label: string; color: string; };

/**
 * `image` points at the glossy 3D art in /public/reactions (cut from the design reference).
 * Animated faces live in components/reactions (ReactionIcon / ReactionBar) — keys/API values are unchanged.
 */
export const REACTIONS: ReactionDef[] = [
  { id: 'like', emoji: '👍', image: '/reactions/love.webp', label: 'Like', color: 'text-blue-500' },
  { id: 'love', emoji: '❤️', image: '/reactions/love.webp', label: 'Love', color: 'text-rose-500' },
  { id: 'haha', emoji: '😆', image: '/reactions/haha.webp', label: 'Haha', color: 'text-amber-500' },
  { id: 'wow', emoji: '😮', image: '/reactions/wow.webp', label: 'Wow', color: 'text-sky-500' },
  { id: 'sad', emoji: '😢', image: '/reactions/sad.webp', label: 'Crying', color: 'text-amber-400' },
  { id: 'angry', emoji: '😡', image: '/reactions/angry.webp', label: 'Angry', color: 'text-orange-600' },
];

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && REACTION_TYPES.includes(value as ReactionType);
}

export const POST_REACTIONS = REACTIONS.filter(r => r.id !== 'like');

export function isPostReaction(value: unknown): value is ReactionType {
  return isReactionType(value);
}

/**
 * The viewer's reaction as the feed/post APIs describe it. Those endpoints report a
 * plain `like` (from Reels or the legacy like toggle) as `myReaction: null` while
 * still listing the viewer in `likes`; treat that as `like` so the button shows the
 * reaction the server actually has (and a click removes it) instead of looking empty.
 */
export function viewerPostReaction(
  post:
    | {
        myReaction?: unknown;
        likes?: unknown[];
        reactions?: Array<{ type?: unknown }>;
      }
    | null
    | undefined,
): ReactionType | null {
  if (!post) return null;
  if (isPostReaction(post.myReaction)) {
    return post.myReaction === 'like' ? 'love' : post.myReaction;
  }
  if (Array.isArray(post.reactions) && post.reactions.length > 0) {
    const candidate = post.reactions[0]?.type;
    if (isPostReaction(candidate)) {
      return candidate === 'like' ? 'love' : candidate;
    }
  }
  return Array.isArray(post.likes) && post.likes.length > 0 ? 'love' : null;
}

export function reactionDef(id: ReactionType | null | undefined): ReactionDef | null {
  if (!id) return null;
  return REACTIONS.find((r) => r.id === id) || null;
}
