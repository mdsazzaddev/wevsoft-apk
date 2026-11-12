import type { ViewAsRole } from './profileManager.logic';

/** Owner tabs that a public visitor would never see on their own profile. */
const OWNER_ONLY_TABS = new Set(['saved', 'private', 'archived']);

/** Tabs a friend/follower preview may still hide (owner vaults). */
export function profileTabsForViewAs(
  orderedIds: readonly string[],
  role: ViewAsRole | null,
): string[] {
  if (!role) return [...orderedIds];
  return orderedIds.filter((id) => !OWNER_ONLY_TABS.has(id));
}

/** Whether owner chrome (edit, manager, uploads) should render. */
export function showOwnerChrome(isOwner: boolean, viewAs: ViewAsRole | null): boolean {
  return isOwner && !viewAs;
}

export function viewAsBannerLabel(role: ViewAsRole): string {
  if (role === 'follower') return 'Follower';
  if (role === 'friend') return 'Friend';
  return 'Public';
}

/** Fields typically hidden from public (client preview hint only — server remains source of truth). */
export function shouldHideSensitiveMeta(viewAs: ViewAsRole | null): boolean {
  return viewAs === 'public' || viewAs === 'follower';
}

function normalizePrivacy(raw: unknown): string {
  return String(raw || 'public').trim().toLowerCase().replace(/-/g, '_');
}

/**
 * Client-side preview filter for posts the chosen audience would typically see.
 * Owner vaults (only_me / private) stay hidden from every View As role.
 */
export function postVisibleForViewAs(
  privacy: unknown,
  role: ViewAsRole | null,
): boolean {
  if (!role) return true;
  const p = normalizePrivacy(privacy);
  if (p === 'only_me' || p === 'private' || p === 'onlyme') return false;
  if (role === 'public') return p === 'public' || p === '' || p === 'everyone';
  if (role === 'follower') {
    return (
      p === 'public' ||
      p === '' ||
      p === 'everyone' ||
      p === 'followers' ||
      p === 'followers_only'
    );
  }
  // friend: public + followers + friends
  return (
    p === 'public' ||
    p === '' ||
    p === 'everyone' ||
    p === 'followers' ||
    p === 'followers_only' ||
    p === 'friends' ||
    p === 'friends_only'
  );
}

export function filterPostsForViewAs<T extends { privacy?: unknown }>(
  posts: T[],
  role: ViewAsRole | null,
): T[] {
  if (!role) return posts;
  return posts.filter((p) => postVisibleForViewAs(p.privacy, role));
}
