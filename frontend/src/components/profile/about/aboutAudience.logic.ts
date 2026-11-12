/**
 * About-item audience: multi-select VisibilityFlags (+ optional custom / hide-from lists).
 * Stored under privacySettings[`about_${key}`] (legacy string still accepted).
 */
import {
  DEFAULT_VISIBILITY_FLAGS,
  flagsFromPrivacy,
  privacyFromFlags,
  type AudienceUser,
  type VisibilityFlags,
} from '../../../lib/postVisibility';

export type AboutAudiencePayload = {
  flags: VisibilityFlags;
  customUsers: AudienceUser[];
  hideFromUsers: AudienceUser[];
};

export function parseAboutAudience(value: unknown): AboutAudiencePayload {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    const flags: VisibilityFlags = {
      onlyMe: true,
      friends: !!raw.friends,
      followers: !!raw.followers,
      public: !!raw.public,
      custom: !!raw.custom,
      hideFrom: !!raw.hideFrom,
      closeFriends: !!raw.closeFriends,
    };
    const customUsers = Array.isArray(raw.customUsers)
      ? (raw.customUsers as AudienceUser[]).filter((u) => u && typeof u.id === 'string')
      : [];
    const hideFromUsers = Array.isArray(raw.hideFromUsers)
      ? (raw.hideFromUsers as AudienceUser[]).filter((u) => u && typeof u.id === 'string')
      : [];
    // Legacy single-string wrapped as { privacy: 'friends' }
    if (
      typeof raw.privacy === 'string' &&
      !flags.friends &&
      !flags.followers &&
      !flags.public &&
      !flags.custom &&
      !flags.closeFriends
    ) {
      return {
        flags: flagsFromPrivacy(raw.privacy, customUsers.length > 0, hideFromUsers.length > 0),
        customUsers,
        hideFromUsers,
      };
    }
    if (hideFromUsers.length > 0) flags.hideFrom = true;
    if (customUsers.length > 0) flags.custom = true;
    return { flags, customUsers, hideFromUsers };
  }
  if (typeof value === 'string' && value) {
    const legacy =
      value === 'onlyMe' || value === 'only_me' || value === 'private'
        ? 'private'
        : value === 'close_friends' || value === 'closefriends'
          ? 'close_friends'
          : value;
    return {
      flags: flagsFromPrivacy(legacy),
      customUsers: [],
      hideFromUsers: [],
    };
  }
  return {
    flags: { ...DEFAULT_VISIBILITY_FLAGS, public: true, onlyMe: true },
    customUsers: [],
    hideFromUsers: [],
  };
}

export function serializeAboutAudience(payload: AboutAudiencePayload): Record<string, unknown> {
  const { flags, customUsers, hideFromUsers } = payload;
  return {
    ...flags,
    onlyMe: true,
    privacy: privacyFromFlags(flags, customUsers.length > 0),
    customUsers: flags.custom ? customUsers : [],
    hideFromUsers: flags.hideFrom ? hideFromUsers : [],
  };
}

/** Visitors without a relation graph only see Public items (owner always sees all). */
export function aboutItemVisibleToVisitor(value: unknown, isOwner: boolean): boolean {
  if (isOwner) return true;
  const { flags } = parseAboutAudience(value);
  return !!flags.public;
}

/** @deprecated single-value helper — prefer parseAboutAudience */
export type AboutAudience = 'public' | 'friends' | 'only_me' | 'followers' | 'close_friends';

export function normalizeAudience(value: unknown): AboutAudience {
  const { flags } = parseAboutAudience(value);
  if (flags.public) return 'public';
  if (flags.closeFriends) return 'close_friends';
  if (flags.friends) return 'friends';
  if (flags.followers) return 'followers';
  return 'only_me';
}
