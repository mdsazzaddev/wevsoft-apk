/**
 * Wevsoft Profile Manager catalog — owner ⋯ More sheet rows.
 * Pure data + helpers; UI maps icons and handlers separately.
 */

export type ProfileManagerActionKind =
  | 'callback'
  | 'navigate'
  | 'settingsOpt'
  | 'creatorTab'
  | 'profileTab'
  | 'viewAs'
  | 'placeholder';

export type ProfileManagerRowId =
  | 'edit_profile'
  | 'view_as'
  | 'professional_mode'
  | 'creator_hub'
  | 'insights'
  | 'mentions'
  | 'boost'
  | 'invite'
  | 'copyright'
  | 'advertising'
  | 'verification'
  | 'action_buttons'
  | 'highlights'
  | 'archive'
  | 'trash'
  | 'activity'
  | 'standing'
  | 'privacy'
  | 'profile_search'
  | 'share'
  | 'avatar_frame'
  | 'settings';

export type ProfileManagerSectionId =
  | 'profile'
  | 'professional'
  | 'content'
  | 'privacy_safety'
  | 'account';

export type ProfileManagerRow = {
  id: ProfileManagerRowId;
  section: ProfileManagerSectionId;
  labelKey: string;
  /** English fallback when i18n missing. */
  label: string;
  descriptionKey?: string;
  description?: string;
  kind: ProfileManagerActionKind;
  /** Path, settings opt id, creator tab, profile tab, or viewAs role. */
  target?: string;
  /** Hide until Professional Mode or later phases wire it. */
  phase?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Requires onOpenFrame from host. */
  needsFrame?: boolean;
};

export const PROFILE_MANAGER_SECTIONS: {
  id: ProfileManagerSectionId;
  labelKey: string;
  label: string;
}[] = [
  { id: 'profile', labelKey: 'profile.manager.section.profile', label: 'Profile' },
  { id: 'professional', labelKey: 'profile.manager.section.professional', label: 'Professional' },
  { id: 'content', labelKey: 'profile.manager.section.content', label: 'Content' },
  { id: 'privacy_safety', labelKey: 'profile.manager.section.privacy', label: 'Privacy & safety' },
  { id: 'account', labelKey: 'profile.manager.section.account', label: 'Account' },
];

/** Full catalog. Phase 0 ships working rows; later phases unlock more. */
export const PROFILE_MANAGER_ROWS: ProfileManagerRow[] = [
  {
    id: 'edit_profile',
    section: 'profile',
    labelKey: 'profile.manager.edit',
    label: 'Edit profile',
    kind: 'callback',
    phase: 0,
  },
  {
    id: 'view_as',
    section: 'profile',
    labelKey: 'profile.manager.viewAs',
    label: 'View as',
    description: 'Preview how others see your profile',
    descriptionKey: 'profile.manager.viewAsDesc',
    kind: 'viewAs',
    target: 'public',
    phase: 1,
  },
  {
    id: 'action_buttons',
    section: 'profile',
    labelKey: 'profile.manager.actionButtons',
    label: 'Action buttons',
    kind: 'navigate',
    target: '/profile/manage/action-buttons',
    phase: 2,
  },
  {
    id: 'highlights',
    section: 'profile',
    labelKey: 'profile.manager.highlights',
    label: 'Highlights',
    kind: 'profileTab',
    target: 'highlights',
    phase: 0,
  },
  {
    id: 'share',
    section: 'profile',
    labelKey: 'profile.manager.share',
    label: 'Share profile',
    kind: 'callback',
    phase: 0,
  },
  {
    id: 'avatar_frame',
    section: 'profile',
    labelKey: 'profile.manager.avatarFrame',
    label: 'Avatar frame',
    kind: 'callback',
    needsFrame: true,
    phase: 0,
  },
  {
    id: 'professional_mode',
    section: 'professional',
    labelKey: 'profile.manager.professionalMode',
    label: 'Professional mode',
    kind: 'navigate',
    target: '/profile/manage/professional-mode',
    phase: 4,
  },
  {
    id: 'creator_hub',
    section: 'professional',
    labelKey: 'profile.manager.creatorHub',
    label: 'Creator Hub',
    kind: 'creatorTab',
    target: 'overview',
    phase: 0,
  },
  {
    id: 'insights',
    section: 'professional',
    labelKey: 'profile.manager.insights',
    label: 'Insights',
    kind: 'creatorTab',
    target: 'analytics',
    phase: 0,
  },
  {
    id: 'mentions',
    section: 'professional',
    labelKey: 'profile.manager.mentions',
    label: 'Mentions & tags',
    kind: 'creatorTab',
    target: 'mentions',
    phase: 0,
  },
  {
    id: 'boost',
    section: 'professional',
    labelKey: 'profile.manager.boost',
    label: 'Boost & promote',
    kind: 'creatorTab',
    target: 'boost',
    phase: 0,
  },
  {
    id: 'advertising',
    section: 'professional',
    labelKey: 'profile.manager.advertising',
    label: 'Advertising Center',
    kind: 'navigate',
    target: '/profile/manage/ads',
    phase: 6,
  },
  {
    id: 'invite',
    section: 'professional',
    labelKey: 'profile.manager.invite',
    label: 'Invite people',
    kind: 'creatorTab',
    target: 'invite',
    phase: 0,
  },
  {
    id: 'verification',
    section: 'professional',
    labelKey: 'profile.manager.verification',
    label: 'Profile verification',
    kind: 'navigate',
    target: '/profile/manage/verification',
    phase: 5,
  },
  {
    id: 'copyright',
    section: 'professional',
    labelKey: 'profile.manager.copyright',
    label: 'Copyright & rights',
    kind: 'creatorTab',
    target: 'security',
    phase: 0,
  },
  {
    id: 'archive',
    section: 'content',
    labelKey: 'profile.manager.archive',
    label: 'Archive',
    kind: 'settingsOpt',
    target: 'post_archive_vault',
    phase: 0,
  },
  {
    id: 'trash',
    section: 'content',
    labelKey: 'profile.manager.trash',
    label: 'Trash',
    kind: 'settingsOpt',
    target: 'post_trash',
    phase: 0,
  },
  {
    id: 'profile_search',
    section: 'content',
    labelKey: 'profile.manager.search',
    label: 'Search your profile',
    kind: 'callback',
    phase: 3,
  },
  {
    id: 'activity',
    section: 'privacy_safety',
    labelKey: 'profile.manager.activity',
    label: 'Activity log',
    kind: 'settingsOpt',
    target: 'sec_activity_log',
    phase: 0,
  },
  {
    id: 'standing',
    section: 'privacy_safety',
    labelKey: 'profile.manager.standing',
    label: 'Account standing',
    kind: 'settingsOpt',
    target: 'acc_standing',
    phase: 0,
  },
  {
    id: 'privacy',
    section: 'privacy_safety',
    labelKey: 'profile.manager.privacy',
    label: 'Privacy & security',
    kind: 'navigate',
    target: '/settings?cat=privacy_security',
    phase: 0,
  },
  {
    id: 'settings',
    section: 'account',
    labelKey: 'profile.manager.settings',
    label: 'Settings',
    kind: 'navigate',
    target: '/settings',
    phase: 0,
  },
];

export type ProfileManagerVisibilityOpts = {
  /** Max phase to include (inclusive). Default 0 for Phase 0 ship. */
  maxPhase?: number;
  hasFrame?: boolean;
  /** When true, show phase 4+ professional rows even if maxPhase lower for hub links — unused; prefer maxPhase. */
  professionalMode?: boolean;
};

/** Rows visible for the current product phase + host capabilities. */
export function visibleProfileManagerRows(
  opts: ProfileManagerVisibilityOpts = {},
): ProfileManagerRow[] {
  const maxPhase = opts.maxPhase ?? 0;
  return PROFILE_MANAGER_ROWS.filter((row) => {
    const phase = row.phase ?? 0;
    if (phase > maxPhase) return false;
    if (row.needsFrame && !opts.hasFrame) return false;
    return true;
  });
}

export function groupProfileManagerRows(
  rows: ProfileManagerRow[],
): { section: (typeof PROFILE_MANAGER_SECTIONS)[number]; rows: ProfileManagerRow[] }[] {
  return PROFILE_MANAGER_SECTIONS.map((section) => ({
    section,
    rows: rows.filter((r) => r.section === section.id),
  })).filter((g) => g.rows.length > 0);
}

export function settingsOptPath(optId: string): string {
  return `/settings?opt=${encodeURIComponent(optId)}`;
}

export type ViewAsRole = 'public' | 'follower' | 'friend';

export function resolveViewAs(raw: string | null | undefined): ViewAsRole | null {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'public' || v === 'follower' || v === 'friend') return v;
  return null;
}

export function viewAsQueryPath(role: ViewAsRole): string {
  return `/profile?viewAs=${role}`;
}

export function exitViewAsPath(): string {
  return '/profile';
}
