/**
 * Who a feed card names as its author.
 *
 * A post or reel can be published *by a person* or *by a WevSpace*, and on a Space's
 * row the server deliberately drops `user`/`userId`: `post.userId` there is only the
 * team member who pressed publish, and printing them would map a Space back to the
 * humans behind it (MP2 §9). See `src/server/social/space-attribution.ts` for the
 * payload contract this file consumes.
 *
 * The consequence for the client is the part that is easy to get wrong: when `space`
 * is missing there is **no fallback to `post.user`**. A row that says it belongs to a
 * Space renders as a Space or renders anonymously — never as whoever happens to be
 * left in the payload. `resolveContentAuthor` is the only place that decision lives,
 * so a new surface cannot re-introduce the leak by writing `post.user?.name` again.
 *
 * Kept free of JSX so the branching is testable with `npx tsx --test`; the feed
 * surfaces keep their own markup and share only this decision.
 */

import { isVerifiedSpace, resolveSpaceAccent, spaceInitials, spacePublicPath, spaceTypeLabel } from './wevspace';

export type ContentAuthorSpace = {
  id?: string | null;
  handle?: string | null;
  name?: string | null;
  avatar?: string | null;
  accentColor?: string | null;
  spaceType?: string | null;
  verificationStatus?: string | null;
};

export type ContentAuthorUser = {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  profileSlug?: string | null;
  avatar?: string | null;
  role?: string | null;
  verified?: boolean | null;
  status?: string | null;
  /** Staff account masked by the server - render as a non-link "WevSoft Team" chip. */
  officialTeam?: boolean | null;
  isSuspended?: boolean | null;
};

/** Any post/reel/share row, however few of the fields a given endpoint ships. */
export type ContentAuthorRow = {
  authorKind?: string | null;
  spaceId?: string | null;
  space?: ContentAuthorSpace | null;
  user?: ContentAuthorUser | null;
  userId?: string | null;
};

export type ResolvedSpaceAuthor = {
  kind: 'space';
  id: string | null;
  /** Display name. Falls back to the handle, then to a neutral label. */
  name: string;
  handle: string | null;
  /** `@handle` when known — the secondary line most cards show under the name. */
  at: string | null;
  /** In-app route, or null when there is nothing safe to link to. */
  href: string | null;
  avatar: string | null;
  accent: string;
  initials: string;
  verified: boolean;
  /** "Business", "Community", … — the Space's own type label, not a role. */
  typeLabel: string;
  /**
   * The Space row could not be resolved, so the card is deliberately anonymous.
   * Surfaces may show a quieter treatment; they must not substitute a person.
   */
  unavailable: boolean;
};

export type ResolvedUserAuthor = {
  kind: 'user';
  id: string | null;
  name: string;
  handle: string | null;
  at: string | null;
  href: string | null;
  avatar: string | null;
  verified: boolean;
  isAdmin: boolean;
  /**
   * User payload missing or unlinkable — surfaces show a quiet fallback and must
   * not invent a profile route.
   */
  unavailable: boolean;
  /** Passed through for `UserAvatar` / `SuspendedBadge`, which take the raw user. */
  user: ContentAuthorUser | null;
};

export type ResolvedContentAuthor = ResolvedSpaceAuthor | ResolvedUserAuthor;

/**
 * Whether a row belongs to a Space.
 *
 * Accepts a bare `spaceId` as well as the explicit `authorKind`, because a cached
 * payload written before attribution existed still has to fail closed rather than
 * fall through to the personal branch.
 */
export function isSpaceAuthored(row: ContentAuthorRow | null | undefined): boolean {
  if (!row) return false;
  return row.authorKind === 'space' || !!row.spaceId;
}

/**
 * In-app profile route for a person, matching the `/u/:slug` convention.
 *
 * Lives here rather than in `lib/profileLinks.ts` because `shared/` is the layer the
 * server may import and `lib/` is not, and because this one has to know about the
 * viewer: the self case is `/profile`, not `/u/me`. `PostOptionsMenu` used to carry a
 * private third copy of this; it now reads `resolveContentAuthor(...).href`.
 */
export function personProfilePath(
  user: ContentAuthorUser | null | undefined,
  viewerId?: string | null,
): string | null {
  if (!user || user.officialTeam) return null;
  const id = user.id ? String(user.id) : '';
  if (id && viewerId && id === String(viewerId)) return '/profile';
  const slug = user.profileSlug || user.username || id;
  return slug ? `/u/${slug}` : null;
}

export function resolveContentAuthor(
  row: ContentAuthorRow | null | undefined,
  viewerId?: string | null,
): ResolvedContentAuthor {
  if (isSpaceAuthored(row)) {
    const space = row?.space || null;
    const handle = space?.handle ? String(space.handle) : null;
    const name = String(space?.name || handle || 'WevSpace');
    return {
      kind: 'space',
      id: space?.id ? String(space.id) : null,
      name,
      handle,
      at: handle ? `@${handle}` : null,
      href: handle ? spacePublicPath(handle) : null,
      avatar: space?.avatar ?? null,
      accent: resolveSpaceAccent(space || {}),
      initials: spaceInitials(space?.name || handle),
      verified: isVerifiedSpace(space?.verificationStatus),
      typeLabel: spaceTypeLabel(space?.spaceType),
      unavailable: !space?.id || !handle,
    };
  }

  const user = row?.user || null;
  if (user?.officialTeam) {
    return {
      kind: 'user',
      id: user.id ? String(user.id) : null,
      name: 'WevSoft Team',
      handle: null,
      at: null,
      href: null,
      avatar: null,
      verified: false,
      isAdmin: false,
      unavailable: false,
      user,
    };
  }
  const username = user?.username ? String(user.username) : null;
  const href = personProfilePath(user, viewerId);
  const unavailable = !user?.id || !href;
  return {
    kind: 'user',
    id: user?.id ? String(user.id) : row?.userId ? String(row.userId) : null,
    name: String(user?.name || username || (unavailable ? 'Unavailable account' : 'User')),
    handle: username,
    at: username ? `@${username}` : null,
    href,
    avatar: user?.avatar ?? null,
    verified: !!user?.verified,
    isAdmin: user?.role === 'admin',
    unavailable,
    user,
  };
}

/**
 * The id a *person-level* client control may act on — mute creator, hide creator,
 * block, restrict.
 *
 * Null on a Space's row, and that is the whole point: these controls used to read
 * `post.user.id`, which offered a visitor the chance to block a team member they
 * were never shown. Callers must treat null as "this control does not apply".
 */
export function personAuthorId(row: ContentAuthorRow | null | undefined): string | null {
  if (isSpaceAuthored(row)) return null;
  const id = row?.user?.id ?? row?.userId ?? null;
  return id ? String(id) : null;
}

/** Author name for share sheets, confirm dialogs and `navigator.share` titles. */
export function contentAuthorLabel(row: ContentAuthorRow | null | undefined): string {
  return resolveContentAuthor(row).name;
}
