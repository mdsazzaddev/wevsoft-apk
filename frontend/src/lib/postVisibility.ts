/**
 * Granular post audience flags (frontend).
 * Maps to backend Post.privacy: private|friends|followers|public|custom|close_friends
 * Hide-from list is stored in customAudience.excludedUserIds (not a privacy level).
 */

export type VisibilityFlags = {
  /** Always true internally — default when no broader audience is chosen. Not shown as a row. */
  onlyMe: boolean;
  friends: boolean;
  followers: boolean;
  public: boolean;
  /** Explicit allow-list (specific people). */
  custom: boolean;
  /** Explicit block-list on top of Friends / Followers / Public. */
  hideFrom: boolean;
  /** Close friends list only. */
  closeFriends: boolean;
};

export type AudienceUser = {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
};

export const DEFAULT_VISIBILITY_FLAGS: VisibilityFlags = {
  onlyMe: true,
  friends: false,
  followers: false,
  public: false,
  custom: false,
  hideFrom: false,
  closeFriends: false,
};

export function audienceSummaryLabel(
  flags: VisibilityFlags,
  customCount = 0,
  hideFromCount = 0,
): string {
  if (flags.public) {
    return hideFromCount > 0 ? `Public · hide ${hideFromCount}` : 'Public';
  }
  if (flags.closeFriends) {
    return hideFromCount > 0 ? `Close Friends · hide ${hideFromCount}` : 'Close Friends';
  }
  const parts: string[] = [];
  if (flags.friends) parts.push('Friends');
  if (flags.followers) parts.push('Followers');
  if (flags.custom && customCount > 0) parts.push(`${customCount} people`);
  else if (flags.custom) parts.push('Custom');
  if (flags.hideFrom && hideFromCount > 0) parts.push(`Hide ${hideFromCount}`);
  else if (flags.hideFrom) parts.push('Hide from…');
  if (parts.length === 0) return 'Only Me';
  return parts.join(' · ');
}

/** Highest-priority privacy string for display / legacy single-value fields. */
export function privacyFromFlags(flags: VisibilityFlags, hasCustomUsers: boolean): string {
  if (flags.public) return 'public';
  if (flags.closeFriends) return 'close_friends';
  if (flags.friends) return 'friends';
  if (flags.followers) return 'followers';
  if (flags.custom && hasCustomUsers) return 'custom';
  return 'private';
}

export function flagsFromPrivacy(
  privacy: string | null | undefined,
  hasCustomUsers = false,
  hasHideFrom = false,
): VisibilityFlags {
  const p = (privacy || 'private').toLowerCase();
  return {
    onlyMe: true,
    public: p === 'public' || p === 'unlisted',
    friends: p === 'friends',
    followers: p === 'followers',
    custom: p === 'custom' || (hasCustomUsers && p !== 'close_friends'),
    hideFrom: hasHideFrom,
    closeFriends: p === 'close_friends' || p === 'closefriends',
  };
}

/** Normalize modal draft before Done. */
export function normalizeAudienceSelection(
  flags: VisibilityFlags,
  customUsers: AudienceUser[],
  hideFromUsers: AudienceUser[],
): {
  flags: VisibilityFlags;
  customUsers: AudienceUser[];
  hideFromUsers: AudienceUser[];
  privacy: string;
} {
  const nextFlags: VisibilityFlags = { ...flags, onlyMe: true };
  if (nextFlags.closeFriends) {
    nextFlags.friends = false;
    nextFlags.followers = false;
    nextFlags.public = false;
    nextFlags.custom = false;
  }
  if (
    nextFlags.custom &&
    customUsers.length === 0 &&
    !nextFlags.friends &&
    !nextFlags.followers &&
    !nextFlags.public &&
    !nextFlags.closeFriends
  ) {
    nextFlags.custom = false;
  }
  if (nextFlags.hideFrom && hideFromUsers.length === 0) {
    nextFlags.hideFrom = false;
  }
  const nextCustom = nextFlags.custom ? customUsers : [];
  const nextHide = nextFlags.hideFrom ? hideFromUsers : [];
  return {
    flags: nextFlags,
    customUsers: nextCustom,
    hideFromUsers: nextHide,
    privacy: privacyFromFlags(nextFlags, nextCustom.length > 0),
  };
}
