/**
 * Turns the wizard's in-progress draft into exactly the payload the real Space
 * page consumes, so the live preview renders through the same component tree.
 *
 * Spec §8 forbids a preview that looks different from the finished Space — the
 * only way to guarantee that is to share the renderer, which means sharing the
 * data shape too. Tab and accent resolution reuse the same shared functions the
 * server calls in serializeSpace().
 */

import {
  emptySpaceDraft,
  isSpaceCtaType,
  isSpaceTheme,
  isSpaceType,
  permissionsForRole,
  resolveCtaLabel,
  resolveSpaceAccent,
  resolveSpaceTabs,
  spaceCtaDef,
  type SpaceDraft,
  type SpaceLinkPlatform,
  type SpacePublicPayload,
  type SpaceVisibility,
} from '@wevsoft/shared/wevspace';

export function draftToSpacePayload(
  draft: SpaceDraft,
  owner?: { id: string; name: string; username: string | null; avatar: string | null } | null,
): SpacePublicPayload {
  const ctaDef = spaceCtaDef(draft.ctaType);
  return {
    id: 'preview',
    handle: draft.handle || 'yourname',
    name: draft.name || 'Your WevSpace',
    spaceType: draft.spaceType,
    category: draft.category || null,
    tagline: draft.tagline || null,
    bio: draft.bio || null,
    description: draft.description || null,
    avatar: draft.avatar || null,
    cover: draft.cover || null,
    website: draft.website || null,
    contactEmail: draft.showEmail ? draft.contactEmail || null : null,
    contactPhone: draft.showPhone ? draft.contactPhone || null : null,
    location: draft.location || null,
    country: draft.country || null,
    region: draft.region || null,
    language: draft.language || 'en',
    businessHours: draft.businessHours,
    themePreset: draft.themePreset,
    accentColor: draft.accentColor,
    ctaType: draft.ctaType,
    ctaLabel: resolveCtaLabel(draft),
    ctaUrl: ctaDef.needsUrl ? draft.ctaUrl || null : null,
    tabs: resolveSpaceTabs({
      spaceType: draft.spaceType,
      tabs: draft.tabs,
      features: draft.features,
    }),
    features: draft.features,
    featured: [],
    status: 'PUBLISHED',
    visibility: draft.visibility,
    verificationStatus: 'UNVERIFIED',
    followersCount: 0,
    postsCount: 0,
    reelsCount: 0,
    viewsCount: 0,
    createdAt: '',
    publishedAt: null,
    owner: owner || null,
    links: draft.links
      .filter((link) => !!link.url)
      .map((link, index) => ({
        id: `preview-${index}`,
        platform: link.platform,
        label: link.label || null,
        url: link.url,
        order: index,
      })),
    // The person previewing is by definition the owner, so the owner-view toggle
    // in the preview has the same flags to work from as the real page would.
    viewer: {
      isOwner: true,
      isFollowing: false,
      role: 'OWNER',
      permissions: permissionsForRole('OWNER'),
      canEdit: true,
      canPost: true,
    },
  };
}

/** Accent for a draft, without building the whole payload (used by swatches). */
export function draftAccent(draft: Pick<SpaceDraft, 'themePreset' | 'accentColor'>): string {
  return resolveSpaceAccent(draft);
}

/**
 * The inverse of draftToSpacePayload: a saved Space becomes editable draft state.
 *
 * The edit screen reuses SpaceCustomizeForm, which is controlled over a
 * SpaceDraft, so the loaded payload has to be converted rather than a second
 * form being written for the same fields (spec §13 — no duplicate UI).
 *
 * Two payload fields are lossy on the way out and are recovered here:
 * `ctaLabel` arrives already resolved, so a label matching the CTA's default is
 * read back as "not customised" (it renders identically either way), and
 * `contactEmail`/`contactPhone` are nulled by the server for viewers who may
 * not see them — only a privileged fetch round-trips them intact.
 */
export function spacePayloadToDraft(space: SpacePublicPayload): SpaceDraft {
  const spaceType = isSpaceType(space.spaceType) ? space.spaceType : emptySpaceDraft().spaceType;
  const base = emptySpaceDraft(spaceType);
  const ctaType = isSpaceCtaType(space.ctaType) ? space.ctaType : base.ctaType;
  const storedLabel = (space.ctaLabel || '').trim();
  const isDefaultLabel = storedLabel === spaceCtaDef(ctaType).defaultLabel;

  return {
    ...base,
    spaceType,
    name: space.name || '',
    handle: space.handle || '',
    category: space.category || '',
    tagline: space.tagline || '',
    bio: space.bio || '',
    description: space.description || '',
    avatar: space.avatar || null,
    cover: space.cover || null,
    website: space.website || '',
    contactEmail: space.contactEmail || '',
    contactPhone: space.contactPhone || '',
    showEmail: space.showEmail === true,
    showPhone: space.showPhone === true,
    location: space.location || '',
    country: space.country || '',
    region: space.region || '',
    language: space.language || 'en',
    themePreset: isSpaceTheme(space.themePreset) ? space.themePreset : base.themePreset,
    accentColor: space.accentColor || null,
    ctaType,
    ctaLabel: isDefaultLabel ? '' : storedLabel,
    ctaUrl: space.ctaUrl || '',
    tabs: Array.isArray(space.tabs) && space.tabs.length > 0 ? [...space.tabs] : base.tabs,
    features: space.features ? { ...base.features, ...space.features } : base.features,
    links: (space.links || []).map((link) => ({
      platform: link.platform as SpaceLinkPlatform,
      label: link.label || '',
      url: link.url || '',
    })),
    businessHours: space.businessHours || null,
    visibility: (space.visibility as SpaceVisibility) || base.visibility,
    // Absent on payloads built for anonymous viewers; only the owner edits it.
    discoverable: space.discoverable !== false,
  };
}

/**
 * The subset of a draft that PATCH /api/spaces/:id accepts. Links are saved
 * through their own endpoint, so they are deliberately left out.
 */
export function draftToUpdatePayload(draft: SpaceDraft): Record<string, unknown> {
  const ctaDef = spaceCtaDef(draft.ctaType);
  return {
    name: draft.name.trim(),
    handle: draft.handle,
    category: draft.category.trim(),
    tagline: draft.tagline.trim(),
    bio: draft.bio.trim(),
    description: draft.description.trim(),
    avatar: draft.avatar,
    cover: draft.cover,
    website: draft.website.trim(),
    contactEmail: draft.contactEmail.trim(),
    contactPhone: draft.contactPhone.trim(),
    showEmail: draft.showEmail,
    showPhone: draft.showPhone,
    location: draft.location.trim(),
    country: draft.country.trim(),
    region: draft.region.trim(),
    language: draft.language.trim() || 'en',
    spaceType: draft.spaceType,
    themePreset: draft.themePreset,
    accentColor: draft.accentColor,
    ctaType: draft.ctaType,
    ctaLabel: draft.ctaLabel.trim(),
    ctaUrl: ctaDef.needsUrl ? draft.ctaUrl.trim() : '',
    tabs: draft.tabs,
    features: draft.features,
    businessHours: draft.businessHours,
    visibility: draft.visibility,
    discoverable: draft.discoverable,
  };
}
