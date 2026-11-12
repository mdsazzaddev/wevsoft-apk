/** Build a stable public profile URL segment for any user-like object. */
export function profileHandleFor(user?: {
  id?: string;
  username?: string | null;
  profileSlug?: string | null;
  officialTeam?: boolean | null;
} | null): string | null {
  if (!user?.id) return null;
  // Staff accounts are shown as the neutral "WevSoft Team" chip and never link.
  if (user.officialTeam) return null;
  return user.profileSlug || user.username || user.id;
}

export function profilePathFor(user?: {
  id?: string;
  username?: string | null;
  profileSlug?: string | null;
  officialTeam?: boolean | null;
} | null): string | null {
  const handle = profileHandleFor(user);
  return handle ? `/u/${encodeURIComponent(handle)}` : null;
}

export function profileAbsoluteUrl(
  user?: {
    id?: string;
    username?: string | null;
    profileSlug?: string | null;
  } | null,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
) {
  const path = profilePathFor(user);
  return path ? `${origin}${path}` : origin;
}
