/**
 * Shared contracts for WevSpace — the public-identity system.
 * Safe to import from client and server: no imports, no side effects, pure only.
 *
 * A WevSpace is an independent public identity owned by a normal Wevsoft
 * account. One account may own many Spaces. Content rows (Post / Reel / Story /
 * Media / Event) carry a nullable `spaceId`: set = Space identity, null =
 * personal profile. The identities are never merged implicitly.
 */

// ──────────────────────────────────────────────────────────────
// Space types
// ──────────────────────────────────────────────────────────────

/**
 * A type is a *starting point*, not a cage: it seeds the recommended tabs,
 * features and CTA, and the owner can change any of them afterwards (and can
 * change the type itself) — see spec "do NOT permanently lock the user".
 */
export const SPACE_TYPES = [
  {
    id: 'CREATOR',
    label: 'Creator',
    blurb: 'Publish reels, posts and videos under your own public name.',
    // lucide-react icon name — resolved to a component in the UI layer so this
    // module stays framework-free.
    icon: 'Sparkles',
    defaultTabs: ['home', 'posts', 'reels', 'videos', 'photos', 'about'],
    recommendedFeatures: ['posts', 'reels', 'videos', 'photos', 'messaging'],
    suggestedCta: 'FOLLOW',
  },
  {
    id: 'BUSINESS',
    label: 'Business',
    blurb: 'Local or online business with services, hours and contact details.',
    icon: 'Building2',
    defaultTabs: ['home', 'posts', 'offerings', 'reviews', 'photos', 'about'],
    recommendedFeatures: ['posts', 'photos', 'offerings', 'reviews', 'messaging'],
    suggestedCta: 'CONTACT',
  },
  {
    id: 'BRAND',
    label: 'Brand',
    blurb: 'A product or label with campaigns, launches and a catalog.',
    icon: 'BadgeCheck',
    defaultTabs: ['home', 'posts', 'reels', 'offerings', 'photos', 'about'],
    recommendedFeatures: ['posts', 'reels', 'photos', 'offerings', 'messaging'],
    suggestedCta: 'SHOP',
  },
  {
    id: 'COMMUNITY',
    label: 'Community',
    blurb: 'Bring people together around a shared interest or cause.',
    icon: 'Users',
    defaultTabs: ['home', 'posts', 'events', 'photos', 'about'],
    recommendedFeatures: ['posts', 'photos', 'events', 'messaging'],
    suggestedCta: 'JOIN',
  },
  {
    id: 'ORGANIZATION',
    label: 'Organization',
    blurb: 'NGOs, institutions and teams that need an official presence.',
    icon: 'Landmark',
    defaultTabs: ['home', 'posts', 'events', 'photos', 'about'],
    recommendedFeatures: ['posts', 'photos', 'events', 'messaging'],
    suggestedCta: 'CONTACT',
  },
  {
    id: 'STORE',
    label: 'Store',
    blurb: 'Sell products with a public catalog and buyer reviews.',
    icon: 'ShoppingBag',
    defaultTabs: ['home', 'offerings', 'posts', 'reviews', 'photos', 'about'],
    recommendedFeatures: ['offerings', 'posts', 'photos', 'reviews', 'messaging'],
    suggestedCta: 'SHOP',
  },
  {
    id: 'PROJECT',
    label: 'Project',
    blurb: 'Ship updates for a product, app, research effort or side project.',
    icon: 'Rocket',
    defaultTabs: ['home', 'posts', 'photos', 'about'],
    recommendedFeatures: ['posts', 'photos', 'messaging'],
    suggestedCta: 'WEBSITE',
  },
  {
    id: 'MEDIA',
    label: 'Media & News',
    blurb: 'Publications, channels and shows that post continuously.',
    icon: 'Newspaper',
    defaultTabs: ['home', 'posts', 'videos', 'reels', 'photos', 'about'],
    recommendedFeatures: ['posts', 'videos', 'reels', 'photos'],
    suggestedCta: 'FOLLOW',
  },
  {
    id: 'EDUCATION',
    label: 'Educational',
    blurb: 'Courses, tutoring and study resources with an events calendar.',
    icon: 'GraduationCap',
    defaultTabs: ['home', 'posts', 'offerings', 'events', 'videos', 'about'],
    recommendedFeatures: ['posts', 'videos', 'offerings', 'events', 'messaging'],
    suggestedCta: 'LEARN_MORE',
  },
  {
    id: 'GAMING',
    label: 'Gaming & Entertainment',
    blurb: 'Streams, clips, teams and events for players and fans.',
    icon: 'Gamepad2',
    defaultTabs: ['home', 'reels', 'videos', 'posts', 'events', 'about'],
    recommendedFeatures: ['reels', 'videos', 'posts', 'events'],
    suggestedCta: 'FOLLOW',
  },
  {
    id: 'PUBLIC_FIGURE',
    label: 'Personal / Public identity',
    blurb: 'A public version of you, kept separate from your private profile.',
    icon: 'UserRound',
    defaultTabs: ['home', 'posts', 'photos', 'reels', 'about'],
    recommendedFeatures: ['posts', 'photos', 'reels', 'messaging'],
    suggestedCta: 'FOLLOW',
  },
  {
    id: 'OTHER',
    label: 'Other',
    blurb: 'Start blank and enable exactly the sections you want.',
    icon: 'Shapes',
    defaultTabs: ['home', 'posts', 'about'],
    recommendedFeatures: ['posts', 'messaging'],
    suggestedCta: 'FOLLOW',
  },
] as const;

export type SpaceTypeDef = (typeof SPACE_TYPES)[number];
export type SpaceType = SpaceTypeDef['id'];

export const SPACE_TYPE_IDS = SPACE_TYPES.map((t) => t.id) as readonly SpaceType[];

export const DEFAULT_SPACE_TYPE: SpaceType = 'CREATOR';

export function isSpaceType(value: unknown): value is SpaceType {
  return typeof value === 'string' && (SPACE_TYPE_IDS as readonly string[]).includes(value);
}

export function spaceTypeDef(value: unknown): SpaceTypeDef {
  const found = SPACE_TYPES.find((t) => t.id === value);
  return found || SPACE_TYPES[0];
}

export function spaceTypeLabel(value: unknown): string {
  return spaceTypeDef(value).label;
}

// ──────────────────────────────────────────────────────────────
// Categories (free-form sub-classification inside a type)
// ──────────────────────────────────────────────────────────────

const COMMON_CATEGORIES = [
  'Technology',
  'Art & Design',
  'Music',
  'Food & Drink',
  'Health & Fitness',
  'Travel',
  'Education',
  'Sports',
  'Fashion & Beauty',
  'Photography',
  'Business & Finance',
  'Science',
  'Non-profit',
  'Local',
  'Other',
] as const;

export const SPACE_CATEGORIES: Record<SpaceType, readonly string[]> = {
  CREATOR: ['Video Creator', 'Writer & Blogger', 'Artist', 'Musician', 'Podcaster', 'Photographer', 'Comedian', 'Streamer', ...COMMON_CATEGORIES],
  BUSINESS: ['Restaurant & Café', 'Retail Shop', 'Agency', 'Salon & Spa', 'Clinic', 'Real Estate', 'Repair & Services', 'Transport', 'IT Services', ...COMMON_CATEGORIES],
  BRAND: ['Clothing', 'Electronics', 'Cosmetics', 'Food Brand', 'Software', 'Home & Living', 'Automotive', ...COMMON_CATEGORIES],
  COMMUNITY: ['Interest Group', 'Neighbourhood', 'Fan Club', 'Support Group', 'Cause & Activism', 'Alumni', 'Professional Network', ...COMMON_CATEGORIES],
  ORGANIZATION: ['NGO', 'Charity', 'Government', 'School', 'University', 'Religious Organization', 'Association', 'Club', ...COMMON_CATEGORIES],
  STORE: ['Online Store', 'Grocery', 'Bookstore', 'Handmade & Crafts', 'Digital Goods', 'Pharmacy', 'Furniture', ...COMMON_CATEGORIES],
  PROJECT: ['Open Source', 'Startup', 'Research', 'Event Project', 'Campaign', 'Portfolio', ...COMMON_CATEGORIES],
  MEDIA: ['News', 'Magazine', 'TV & Radio', 'Web Show', 'Newsletter', 'Sports Media', ...COMMON_CATEGORIES],
  EDUCATION: ['Course', 'Coaching Centre', 'Tutor', 'Study Group', 'Library', 'Workshop', ...COMMON_CATEGORIES],
  GAMING: ['Game', 'Esports Team', 'Streamer', 'Gaming Community', 'Film & Series', 'Events & Shows', ...COMMON_CATEGORIES],
  PUBLIC_FIGURE: ['Public Figure', 'Author', 'Speaker', 'Politician', 'Athlete', 'Model', 'Chef', ...COMMON_CATEGORIES],
  OTHER: [...COMMON_CATEGORIES],
};

export function categoriesForType(type: unknown): readonly string[] {
  return SPACE_CATEGORIES[spaceTypeDef(type).id];
}

// ──────────────────────────────────────────────────────────────
// Tabs & features
// ──────────────────────────────────────────────────────────────

/** Canonical display order for Space navigation. */
export const SPACE_TABS = [
  'home',
  'posts',
  'reels',
  'videos',
  'photos',
  'about',
  'events',
  'offerings',
  'reviews',
  'community',
] as const;

export type SpaceTab = (typeof SPACE_TABS)[number];

export const SPACE_TAB_LABELS: Record<SpaceTab, string> = {
  home: 'Home',
  posts: 'Posts',
  reels: 'Reels',
  videos: 'Videos',
  photos: 'Photos',
  about: 'About',
  events: 'Events',
  offerings: 'Products & Services',
  reviews: 'Reviews',
  community: 'Community',
};

/** Short labels for the mobile tab strip, where horizontal space is tight. */
export const SPACE_TAB_SHORT_LABELS: Record<SpaceTab, string> = {
  ...SPACE_TAB_LABELS,
  offerings: 'Shop',
};

/** Tabs the owner can never switch off — a Space always has an identity page. */
export const ALWAYS_ON_TABS: readonly SpaceTab[] = ['home', 'about'];

/** Toggleable capabilities. Every key except `messaging` maps to a tab. */
export const SPACE_FEATURES = [
  'posts',
  'reels',
  'videos',
  'photos',
  'events',
  'offerings',
  'reviews',
  'community',
  'messaging',
] as const;

export type SpaceFeature = (typeof SPACE_FEATURES)[number];

export const SPACE_FEATURE_LABELS: Record<SpaceFeature, string> = {
  posts: 'Posts',
  reels: 'Reels',
  videos: 'Videos',
  photos: 'Photos',
  events: 'Events',
  offerings: 'Products & Services',
  reviews: 'Reviews',
  community: 'Community',
  messaging: 'Messaging',
};

export type SpaceFeatureMap = Partial<Record<SpaceFeature, boolean>>;

export function isSpaceFeature(value: unknown): value is SpaceFeature {
  return typeof value === 'string' && (SPACE_FEATURES as readonly string[]).includes(value);
}

export function isSpaceTab(value: unknown): value is SpaceTab {
  return typeof value === 'string' && (SPACE_TABS as readonly string[]).includes(value);
}

/** Every feature off, then the type's recommendations on. */
export function defaultFeaturesForType(type: unknown): Record<SpaceFeature, boolean> {
  const def = spaceTypeDef(type);
  const out = {} as Record<SpaceFeature, boolean>;
  for (const key of SPACE_FEATURES) out[key] = false;
  for (const key of def.recommendedFeatures) {
    if (isSpaceFeature(key)) out[key] = true;
  }
  return out;
}

export function defaultTabsForType(type: unknown): SpaceTab[] {
  return spaceTypeDef(type).defaultTabs.filter(isSpaceTab);
}

export function parseFeatureMap(raw: unknown, type: unknown): Record<SpaceFeature, boolean> {
  const fallback = defaultFeaturesForType(type);
  const parsed = parseJsonObject(raw);
  if (!parsed) return fallback;
  const out = { ...fallback };
  for (const key of SPACE_FEATURES) {
    if (key in parsed) out[key] = parsed[key] === true;
  }
  return out;
}

/**
 * The single source of truth for which tabs a Space shows. Used by the public
 * page, the owner view and the live preview so all three agree — the spec
 * forbids a preview that differs from the real Space.
 *
 * Rules: never show a tab whose feature is off, always keep Home + About,
 * never show Community (Spaces are Pages — followers/team live in Manage, not a
 * personal-style Friends section on the profile), and always render in
 * canonical order regardless of stored order.
 */
export function resolveSpaceTabs(input: {
  spaceType?: unknown;
  tabs?: unknown;
  features?: unknown;
}): SpaceTab[] {
  const features = parseFeatureMap(input.features, input.spaceType);
  const stored = parseJsonArray(input.tabs)?.filter(isSpaceTab);
  const requested: SpaceTab[] = stored && stored.length ? stored : defaultTabsForType(input.spaceType);
  const wanted = new Set<SpaceTab>(requested);
  for (const tab of ALWAYS_ON_TABS) wanted.add(tab);
  // Facebook Page model: no Friends/Community people tab on the Space profile.
  wanted.delete('community');

  return SPACE_TABS.filter((tab) => {
    if (tab === 'community') return false;
    if (!wanted.has(tab)) return false;
    if (ALWAYS_ON_TABS.includes(tab)) return true;
    return isSpaceFeature(tab) ? features[tab] === true : true;
  });
}

/** Tabs beyond this many collapse into a "More" menu on desktop. */
export const SPACE_VISIBLE_TAB_LIMIT = 6;

// ──────────────────────────────────────────────────────────────
// Presentation
// ──────────────────────────────────────────────────────────────

/**
 * Theme presets are token-driven (no user-authored CSS). `accent` is the
 * default accent hex, `cover` is a Tailwind gradient used when no cover image
 * has been uploaded yet.
 */
export const SPACE_THEMES = [
  { id: 'default', label: 'Wevsoft', accent: '#2563eb', cover: 'from-blue-500/25 via-indigo-500/20 to-purple-500/25' },
  { id: 'midnight', label: 'Midnight', accent: '#6366f1', cover: 'from-slate-800 via-indigo-900 to-slate-900' },
  { id: 'sunset', label: 'Sunset', accent: '#f97316', cover: 'from-orange-500/30 via-rose-500/25 to-purple-600/30' },
  { id: 'forest', label: 'Forest', accent: '#16a34a', cover: 'from-emerald-500/25 via-green-600/20 to-teal-600/25' },
  { id: 'ocean', label: 'Ocean', accent: '#0891b2', cover: 'from-cyan-500/25 via-sky-500/20 to-blue-600/25' },
  { id: 'rose', label: 'Rose', accent: '#e11d48', cover: 'from-rose-500/25 via-pink-500/20 to-fuchsia-600/25' },
  { id: 'mono', label: 'Mono', accent: '#525252', cover: 'from-neutral-700 via-neutral-800 to-neutral-900' },
] as const;

export type SpaceThemeDef = (typeof SPACE_THEMES)[number];
export type SpaceThemeId = SpaceThemeDef['id'];

export function spaceThemeDef(id: unknown): SpaceThemeDef {
  return SPACE_THEMES.find((t) => t.id === id) || SPACE_THEMES[0];
}

export function isSpaceTheme(value: unknown): value is SpaceThemeId {
  return typeof value === 'string' && SPACE_THEMES.some((t) => t.id === value);
}

/** Resolved accent for a Space: explicit override, else the preset's accent. */
export function resolveSpaceAccent(input: { themePreset?: unknown; accentColor?: unknown }): string {
  const custom = normalizeHexColor(input.accentColor);
  return custom || spaceThemeDef(input.themePreset).accent;
}

export const SPACE_CTA_TYPES = [
  { id: 'FOLLOW', label: 'Follow', defaultLabel: 'Follow', needsUrl: false },
  { id: 'MESSAGE', label: 'Send message', defaultLabel: 'Message', needsUrl: false },
  { id: 'CONTACT', label: 'Contact', defaultLabel: 'Contact us', needsUrl: false },
  { id: 'CALL', label: 'Call', defaultLabel: 'Call now', needsUrl: false },
  { id: 'EMAIL', label: 'Email', defaultLabel: 'Email us', needsUrl: false },
  { id: 'WEBSITE', label: 'Visit website', defaultLabel: 'Visit website', needsUrl: true },
  { id: 'SHOP', label: 'Shop now', defaultLabel: 'Shop now', needsUrl: false },
  { id: 'BOOK', label: 'Book now', defaultLabel: 'Book now', needsUrl: true },
  { id: 'DONATE', label: 'Donate', defaultLabel: 'Donate', needsUrl: true },
  { id: 'JOIN', label: 'Join', defaultLabel: 'Join', needsUrl: false },
  { id: 'LEARN_MORE', label: 'Learn more', defaultLabel: 'Learn more', needsUrl: true },
  { id: 'NONE', label: 'No button', defaultLabel: '', needsUrl: false },
] as const;

export type SpaceCtaDef = (typeof SPACE_CTA_TYPES)[number];
export type SpaceCtaType = SpaceCtaDef['id'];

export function spaceCtaDef(id: unknown): SpaceCtaDef {
  return SPACE_CTA_TYPES.find((c) => c.id === id) || SPACE_CTA_TYPES[0];
}

export function isSpaceCtaType(value: unknown): value is SpaceCtaType {
  return typeof value === 'string' && SPACE_CTA_TYPES.some((c) => c.id === value);
}

export function resolveCtaLabel(input: { ctaType?: unknown; ctaLabel?: unknown }): string {
  const custom = typeof input.ctaLabel === 'string' ? input.ctaLabel.trim() : '';
  return custom || spaceCtaDef(input.ctaType).defaultLabel;
}

export const SPACE_LINK_PLATFORMS = [
  { id: 'website', label: 'Website', icon: 'Globe' },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook' },
  { id: 'instagram', label: 'Instagram', icon: 'Instagram' },
  { id: 'x', label: 'X', icon: 'Twitter' },
  { id: 'youtube', label: 'YouTube', icon: 'Youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' },
  { id: 'github', label: 'GitHub', icon: 'Github' },
  { id: 'tiktok', label: 'TikTok', icon: 'Music2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { id: 'telegram', label: 'Telegram', icon: 'Send' },
  { id: 'other', label: 'Other link', icon: 'Link' },
] as const;

export type SpaceLinkPlatform = (typeof SPACE_LINK_PLATFORMS)[number]['id'];

export function isSpaceLinkPlatform(value: unknown): value is SpaceLinkPlatform {
  return typeof value === 'string' && SPACE_LINK_PLATFORMS.some((p) => p.id === value);
}

export const MAX_SPACE_LINKS = 12;

// ──────────────────────────────────────────────────────────────
// Lifecycle, visibility, verification, moderation
// ──────────────────────────────────────────────────────────────

/**
 * `PENDING_DELETION` is a real status rather than a boolean beside one, so every
 * read path that already asks "is this PUBLISHED?" excludes a Space in its grace
 * period without being taught about deletion at all (§6). `ARCHIVED` is the
 * deactivate rung of the same ladder — hidden, reversible, nothing destroyed — so
 * §6's "deactivate" reuses it instead of adding a second off switch.
 */
export const SPACE_STATUSES = ['DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED', 'PENDING_DELETION'] as const;
export type SpaceStatus = (typeof SPACE_STATUSES)[number];

/**
 * How a status is written wherever a person reads it.
 *
 * Every status but one is a single word, so the badges got away with printing the
 * enum for a long time. `PENDING_DELETION` does not: it rendered as
 * "PENDING_DELETION" in the publishing pill, "Pending_deletion" in the status
 * tile, and — worse — as nothing at all on the owner's Space list, whose own
 * label map simply had no entry for it. That last one hid "this Space is being
 * deleted" on the one screen an owner scans to check up on their Spaces.
 *
 * The map covers all five so a sixth status cannot land in the same three places
 * again, and `spaceStatusLabel` never returns empty.
 */
export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
  PENDING_DELETION: 'Deleting',
};

/**
 * The one word a badge shows for a status.
 *
 * Kept deliberately short because every caller is a `Pill`-style badge, which
 * uppercases: "SCHEDULED FOR DELETION" in a chip sized for one word is worse
 * than "DELETING". The full sentence an owner needs is `spaceOwnerStatusNotice`'s
 * job, and the deletion card writes its own copy with the actual date.
 *
 * Falls back to a title-cased enum rather than the raw one, so an unmapped status
 * reads as words instead of shouting.
 */
export function spaceStatusLabel(status: unknown): string {
  const key = String(status || '') as SpaceStatus;
  return (
    SPACE_STATUS_LABELS[key] ||
    key
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') ||
    'Draft'
  );
}

export const SPACE_VISIBILITIES = ['public', 'followers', 'private'] as const;
export type SpaceVisibility = (typeof SPACE_VISIBILITIES)[number];

export const SPACE_VISIBILITY_LABELS: Record<SpaceVisibility, string> = {
  public: 'Public — anyone on the internet',
  followers: 'Followers only',
  private: 'Only me and my team',
};

/** Why a viewer cannot see a Space. Shared so the 403 screen and the server's
 *  own message come from one list. */
export const SPACE_ACCESS_REASONS = ['ok', 'not_published', 'followers_only', 'private', 'removed'] as const;
export type SpaceAccessReason = (typeof SPACE_ACCESS_REASONS)[number];

/**
 * The line an owner sees on their own Space when it is not live, and how loudly
 * to say it.
 *
 * Three surfaces showed this banner and all three ended in the same fallback:
 * `This WevSpace is ${status.toLowerCase()}` — which printed "This WevSpace is
 * pending_deletion." at a visitor-facing font size the moment §6 added a status.
 * One function, so a fourth status cannot reintroduce that.
 *
 * `tone` matters because these are not equally serious. A draft is a normal step;
 * a countdown to permanent deletion is not, and amber for both would say it is.
 */
export function spaceOwnerStatusNotice(
  space: { status?: unknown; deletion?: SpaceDeletionState | null } | null | undefined,
): { text: string; tone: 'caution' | 'danger' } | null {
  const status = String(space?.status || '');
  if (!status || status === 'PUBLISHED') return null;

  if (status === 'PENDING_DELETION') {
    const state = space?.deletion;
    // The date is what the owner has to act on, so lead with it when it is known.
    const when = state?.overdue
      ? 'Deletion is due now'
      : state?.daysLeft
        ? `It is deleted for good in ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`
        : state?.scheduledAt
          ? 'It is deleted for good within a day'
          : 'It is scheduled for permanent deletion';
    return {
      text: `Hidden from visitors and scheduled for deletion. ${when} — cancel it in Settings if you want to keep it.`,
      tone: 'danger',
    };
  }

  switch (status) {
    case 'DRAFT':
      return { text: 'This WevSpace is a draft — only you and your team can see it.', tone: 'caution' };
    case 'ARCHIVED':
      return {
        text: 'This WevSpace is archived — it is hidden from everyone, and nothing has been removed.',
        tone: 'caution',
      };
    case 'SUSPENDED':
      return {
        text: 'This WevSpace is suspended. Publishing, messaging and campaigns are switched off.',
        tone: 'danger',
      };
    default:
      // A status nobody has written copy for yet. Say the true thing — it is not
      // visible — rather than printing the enum at the owner.
      return { text: 'This WevSpace is not visible to visitors right now.', tone: 'caution' };
  }
}

export function spaceAccessMessage(reason: unknown): string {
  switch (reason) {
    case 'not_published':
      return 'This WevSpace is not published yet.';
    case 'followers_only':
      return 'Follow this WevSpace to see its content.';
    case 'private':
      return 'This WevSpace is private.';
    case 'removed':
      return 'This WevSpace is no longer available.';
    default:
      return 'This WevSpace is not available.';
  }
}

export const SPACE_VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'OFFICIAL'] as const;
export type SpaceVerificationStatus = (typeof SPACE_VERIFICATION_STATUSES)[number];

export function isVerifiedSpace(status: unknown): boolean {
  return status === 'VERIFIED' || status === 'OFFICIAL';
}

export const SPACE_MODERATION_STATUSES = ['clean', 'flagged', 'limited', 'removed'] as const;
export type SpaceModerationStatus = (typeof SPACE_MODERATION_STATUSES)[number];

// ──────────────────────────────────────────────────────────────
// Admin moderation vocabulary (§4, §5, §8)
// ──────────────────────────────────────────────────────────────

/**
 * How long a suspension lasts (§5). `warning` is in this list on purpose: from
 * the admin's point of view it is the lightest rung of the same ladder, even
 * though it restricts nothing — which is why it carries `restricts: false` and
 * every guard checks that instead of assuming "on the list = blocked".
 */
export const SPACE_SUSPENSION_DURATIONS = [
  { id: 'warning', label: 'Warning only', hours: 0, restricts: false },
  { id: '24h', label: '24 hours', hours: 24, restricts: true },
  { id: '3d', label: '3 days', hours: 72, restricts: true },
  { id: '7d', label: '7 days', hours: 168, restricts: true },
  { id: '1mo', label: '1 month', hours: 720, restricts: true },
  { id: 'custom', label: 'Custom end date', hours: null, restricts: true },
  { id: 'permanent', label: 'Permanent', hours: null, restricts: true },
] as const;

export type SpaceSuspensionDuration = (typeof SPACE_SUSPENSION_DURATIONS)[number]['id'];

export function spaceSuspensionDuration(id: unknown) {
  return SPACE_SUSPENSION_DURATIONS.find((d) => d.id === id) || null;
}

/**
 * Settings groups an admin can freeze (§4 "lock sensitive settings"). Locking is
 * deliberately coarse: the point is to stop a Space under review from renaming
 * itself out of a report or swapping its links for something worse, not to
 * micro-manage individual fields.
 */
export const SPACE_LOCKABLE_SETTINGS = [
  { id: 'identity', label: 'Name, handle & type', hint: 'Blocks renames and handle changes.' },
  { id: 'branding', label: 'Avatar, cover & theme', hint: 'Blocks image and theme changes.' },
  { id: 'links', label: 'Links & website', hint: 'Blocks outbound link edits.' },
  { id: 'contact', label: 'Contact details', hint: 'Blocks email, phone and address edits.' },
  { id: 'visibility', label: 'Visibility & discovery', hint: 'Blocks visibility and Explore opt-in changes.' },
  { id: 'team', label: 'Team & roles', hint: 'Blocks invites and role changes.' },
  { id: 'monetization', label: 'Monetization', hint: 'Blocks tier and payout changes.' },
] as const;

export type SpaceLockableSetting = (typeof SPACE_LOCKABLE_SETTINGS)[number]['id'];

export function isSpaceLockableSetting(value: unknown): value is SpaceLockableSetting {
  return SPACE_LOCKABLE_SETTINGS.some((s) => s.id === value);
}

/**
 * The §4 action list. One entry per thing an admin may do to a Space, with the
 * three facts every caller needs: does it need a reason, does the owner get told,
 * and is it destructive enough to need a typed confirmation.
 *
 * `reversedBy` names the action that undoes this one, so the UI can offer the
 * inverse instead of leaving an admin to guess.
 */
export const SPACE_ADMIN_ACTIONS = [
  {
    id: 'warn',
    label: 'Issue warning',
    description: 'Records a warning and notifies the owner. Restricts nothing.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'restrict',
    label: 'Restrict reach',
    description: 'Removes the Space from Explore, search and recommendations. It stays reachable by direct link.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: 'unrestrict',
  },
  {
    id: 'unrestrict',
    label: 'Lift reach restriction',
    description: 'Returns the Space to Explore and search.',
    requiresReason: false,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'suspend',
    label: 'Suspend',
    description: 'Blocks publishing, messaging and campaigns for the chosen window. Content is preserved.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: true,
    reversedBy: 'restore',
  },
  {
    id: 'restore',
    label: 'Restore',
    description: 'Ends the suspension and republishes the Space.',
    requiresReason: false,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'disable',
    label: 'Disable (remove from platform)',
    description: 'Marks the Space removed. Nobody but staff can reach it. Data is kept for appeals and legal records.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: true,
    reversedBy: 'enable',
  },
  {
    id: 'enable',
    label: 'Re-enable',
    description: 'Clears the removal and returns the Space to its previous visibility.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'set_visibility',
    label: 'Change visibility',
    description: 'Forces the Space to public, followers-only or private.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'revoke_verification',
    label: 'Revoke verification',
    description: 'Removes the badge and records why. The application history is kept.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: true,
    reversedBy: null,
  },
  {
    id: 'freeze_monetization',
    label: 'Freeze monetization',
    description: 'Blocks new tiers, support and payout requests. Existing records are untouched.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: 'unfreeze_monetization',
  },
  {
    id: 'unfreeze_monetization',
    label: 'Unfreeze monetization',
    description: 'Restores monetization.',
    requiresReason: false,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'stop_promotion',
    label: 'Stop all promotion',
    description: 'Rejects pending campaigns and stops anything running.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: true,
    reversedBy: null,
  },
  {
    id: 'require_handle_change',
    label: 'Force username change',
    description: 'The owner must pick a new @username before the Space can publish again.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: true,
    reversedBy: 'clear_handle_change',
  },
  {
    id: 'clear_handle_change',
    label: 'Cancel forced username change',
    description: 'Drops the requirement to rename.',
    requiresReason: false,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'lock_settings',
    label: 'Lock sensitive settings',
    description: 'Freezes the chosen setting groups so the Space cannot edit its way out of a review.',
    requiresReason: true,
    notifiesOwner: true,
    destructive: false,
    reversedBy: 'unlock_settings',
  },
  {
    id: 'unlock_settings',
    label: 'Unlock settings',
    description: 'Returns the chosen setting groups to the owner.',
    requiresReason: false,
    notifiesOwner: true,
    destructive: false,
    reversedBy: null,
  },
  {
    id: 'clear_flags',
    label: 'Mark reviewed & clear flags',
    description: 'Records that a human looked and found nothing actionable.',
    requiresReason: false,
    notifiesOwner: false,
    destructive: false,
    reversedBy: null,
  },
] as const;

export type SpaceAdminAction = (typeof SPACE_ADMIN_ACTIONS)[number]['id'];

export function spaceAdminAction(id: unknown) {
  return SPACE_ADMIN_ACTIONS.find((a) => a.id === id) || null;
}

/**
 * §5. Reads a Space row and says plainly whether it is restricted right now.
 * `expired` is the interesting one: a dated suspension whose window has passed is
 * still stored as SUSPENDED until something lifts it, so every caller must treat
 * `expired` as "not suspended any more" rather than trusting `status` alone.
 */
export interface SpaceSuspensionState {
  suspended: boolean;
  permanent: boolean;
  until: string | null;
  expired: boolean;
  reason: string | null;
}

export function spaceSuspensionState(
  row: {
    status?: unknown;
    suspendedUntil?: unknown;
    suspensionReason?: unknown;
  } | null | undefined,
  now: Date = new Date(),
): SpaceSuspensionState {
  const isSuspended = row?.status === 'SUSPENDED';
  const untilRaw = row?.suspendedUntil ? new Date(row.suspendedUntil as any) : null;
  const until = untilRaw && !Number.isNaN(untilRaw.getTime()) ? untilRaw : null;
  const expired = isSuspended && !!until && until.getTime() <= now.getTime();
  return {
    suspended: isSuspended && !expired,
    permanent: isSuspended && !until,
    until: until ? until.toISOString() : null,
    expired,
    reason: (row?.suspensionReason as string) || null,
  };
}

/**
 * `Report.targetType` for a Space report (`SpacePage.tsx` → `targetType="space"`).
 *
 * Shared because three places count the same rows — the admin console, the risk
 * scorer and §6's deletion record — and a typo in any one of them silently reads
 * zero reports rather than failing.
 */
export const SPACE_REPORT_TARGET = 'space';

// ──────────────────────────────────────────────────────────────
// §6 — the deletion lifecycle
// ──────────────────────────────────────────────────────────────

/**
 * How long a Space sits in `PENDING_DELETION` before the sweep purges it.
 *
 * Shared so the confirmation sheet promises exactly the window the server will
 * honour. A grace period the UI misstates is worse than none — the owner plans
 * around the wrong date.
 */
export const SPACE_DELETION_GRACE_DAYS = 30;

/**
 * The floor on how much of the grace period an owner must still have when a
 * suspension ends.
 *
 * A Space suspended mid-countdown leaves `PENDING_DELETION`, so the purge sweep
 * correctly skips it — but the clock on the *stored* date keeps running. Without
 * a floor, a Space restored after a 31-day investigation would purge on the next
 * tick with no notice at all, which is the one outcome a grace period exists to
 * prevent. On restore the window is pushed out to at least this many days.
 */
export const SPACE_DELETION_MIN_NOTICE_DAYS = 7;

/**
 * What deletion actually costs, as one list (§6 "show consequences").
 *
 * Here rather than in the sheet's JSX so the request screen, the scheduled-state
 * banner and anything added later cannot drift into describing different
 * outcomes for the same action.
 */
export const SPACE_DELETION_CONSEQUENCES = [
  'Every post, reel, story, event, product and review published by this Space.',
  'All followers, and the team memberships of everyone who helped run it.',
  'Every conversation this Space had with customers, on both sides.',
  'All insights, campaign history and monetization records.',
  'The @username, which returns to the pool once deletion completes.',
] as const;

/**
 * What survives, said plainly. Owners consistently misread "delete this Space" as
 * "delete my account", and a deletion they did not mean is exactly the accident
 * §6 asks us to prevent.
 */
export const SPACE_DELETION_PRESERVED = [
  'Your Wevsoft account, your personal profile and your personal posts.',
  'Your other Spaces.',
  'Records Wevsoft must keep for legal and safety reasons, which never include your content.',
] as const;

/**
 * §6. Reads a Space row and says where it sits in the deletion lifecycle.
 *
 * `overdue` is the counterpart of `spaceSuspensionState`'s `expired`: a Space
 * whose window has closed is still stored as PENDING_DELETION until the sweep
 * reaches it, so a caller must never render "3 days left" from a negative number.
 * Unlike a suspension, an elapsed deletion window does not change what the owner
 * may do — the data is still there until the purge runs, so cancelling still
 * works, which is the safe direction to be wrong in.
 */
export interface SpaceDeletionState {
  pending: boolean;
  requestedAt: string | null;
  scheduledAt: string | null;
  /** Whole days remaining, floored, never negative. 0 = purges today. */
  daysLeft: number;
  /** Hours remaining, floored, never negative — for the final day's copy. */
  hoursLeft: number;
  overdue: boolean;
  reason: string | null;
}

export function spaceDeletionState(
  row: {
    status?: unknown;
    deletionRequestedAt?: unknown;
    deletionScheduledAt?: unknown;
    deletionReason?: unknown;
  } | null | undefined,
  now: Date = new Date(),
): SpaceDeletionState {
  const pending = row?.status === 'PENDING_DELETION';
  const toDate = (raw: unknown) => {
    if (!raw) return null;
    const value = new Date(raw as any);
    return Number.isNaN(value.getTime()) ? null : value;
  };
  const requestedAt = toDate(row?.deletionRequestedAt);
  const scheduledAt = toDate(row?.deletionScheduledAt);
  const msLeft = scheduledAt ? scheduledAt.getTime() - now.getTime() : 0;
  return {
    pending,
    requestedAt: requestedAt ? requestedAt.toISOString() : null,
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    daysLeft: pending && msLeft > 0 ? Math.floor(msLeft / 86_400_000) : 0,
    hoursLeft: pending && msLeft > 0 ? Math.floor(msLeft / 3_600_000) : 0,
    overdue: pending && !!scheduledAt && msLeft <= 0,
    reason: (row?.deletionReason as string) || null,
  };
}

/**
 * Who ended a Space's life, recorded on the surviving deletion record.
 *
 * `grace_expired` is deliberately separate from `owner`: months later, the
 * difference between "the owner asked and the clock ran out" and "a person
 * pressed purge" is the whole point of keeping the record.
 */
export const SPACE_DELETION_ACTORS = ['owner', 'admin', 'grace_expired'] as const;
export type SpaceDeletionActor = (typeof SPACE_DELETION_ACTORS)[number];

// ──────────────────────────────────────────────────────────────
// Ownership transfer (MP4 §10)
// ──────────────────────────────────────────────────────────────

/**
 * An ownership offer's lifecycle.
 *
 * Ownership is offered, never pushed. The receiving account inherits
 * responsibility for everything the Space has ever published and spends one of
 * its own Space slots, so a straight `ownerUserId` swap would let anyone hand a
 * suspended or abusive Space to an unwitting stranger. `PENDING` is the offer;
 * ownership moves on `ACCEPTED` and nowhere else.
 *
 * `CANCELLED` (the sender withdrew) and `DECLINED` (the receiver refused) are
 * separate states rather than one "closed", because the activity log has to be
 * able to say which of the two people ended it.
 */
export const SPACE_OWNERSHIP_TRANSFER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type SpaceOwnershipTransferStatus = (typeof SPACE_OWNERSHIP_TRANSFER_STATUSES)[number];

export const SPACE_OWNERSHIP_TRANSFER_STATUS_LABELS: Record<SpaceOwnershipTransferStatus, string> = {
  PENDING: 'Waiting for reply',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Withdrawn',
  EXPIRED: 'Expired',
};

/**
 * How long an offer stays acceptable.
 *
 * Matches `SPACE_INVITE_TTL_DAYS` on purpose — both are "someone asked you to
 * take on a Space role, decide". An offer that never expires is a standing key to
 * a Space held by whoever once had access to that inbox.
 */
export const SPACE_OWNERSHIP_TRANSFER_TTL_DAYS = 14;

/**
 * What accepting actually does, shown to the receiver before they agree.
 *
 * Both lists live here rather than in the sheet's JSX so the sender's screen and
 * the receiver's screen cannot describe different consequences for the same
 * transfer.
 */
export const SPACE_OWNERSHIP_TRANSFER_CONSEQUENCES = [
  'You become the owner: full control of the Space, its content, its team and its settings.',
  'Everything the Space has published stays published, and stays attributed to the Space.',
  'This Space counts against your own limit of Spaces.',
  'Any monetization, payout and billing responsibility for the Space becomes yours.',
  'The transfer is permanent. Only the new owner can transfer it back.',
] as const;

/** What the outgoing owner keeps, and what they lose. */
export const SPACE_OWNERSHIP_TRANSFER_SENDER_EFFECTS = [
  'You stay on the team as an Admin, so you do not lose access to your work.',
  'You can no longer transfer, archive or delete the Space — only the new owner can.',
  'Your personal account, profile and personal posts are untouched.',
  'The new owner can change your role or remove you from the team.',
] as const;

/**
 * Reads a pending-offer row and says where it sits in its lifecycle.
 *
 * Same shape and same reasoning as `spaceDeletionState`: a row stays `PENDING` in
 * the database until the expiry sweep reaches it, so a caller must never render
 * "2 days left" from a negative number. `expired` is what the UI checks; the
 * server checks it too, because the sweep is a tidier, not a gate.
 */
export interface SpaceOwnershipTransferState {
  pending: boolean;
  status: SpaceOwnershipTransferStatus;
  /** Whole days until the offer lapses, floored, never negative. */
  daysLeft: number;
  hoursLeft: number;
  /** Still stored as PENDING, but past its deadline — no longer acceptable. */
  expired: boolean;
  /** True only for an offer that can still be accepted right now. */
  actionable: boolean;
}

export function ownershipTransferState(
  row: { status?: unknown; expiresAt?: unknown } | null | undefined,
  now: Date = new Date(),
): SpaceOwnershipTransferState {
  const raw = String(row?.status || '').toUpperCase();
  const status = (SPACE_OWNERSHIP_TRANSFER_STATUSES as readonly string[]).includes(raw)
    ? (raw as SpaceOwnershipTransferStatus)
    : 'EXPIRED';
  const pending = !!row && status === 'PENDING';
  const expiresAt = row?.expiresAt ? new Date(row.expiresAt as any) : null;
  const valid = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
  const msLeft = valid ? valid.getTime() - now.getTime() : 0;
  const expired = pending && !!valid && msLeft <= 0;
  return {
    pending,
    status,
    daysLeft: pending && msLeft > 0 ? Math.floor(msLeft / 86_400_000) : 0,
    hoursLeft: pending && msLeft > 0 ? Math.floor(msLeft / 3_600_000) : 0,
    expired,
    // A pending row with no deadline at all is treated as actionable rather than
    // dead: the offer was made, and refusing to honour it because a timestamp is
    // missing would strand the Space with an offer nobody can close.
    actionable: pending && !expired,
  };
}

/**
 * "in 3 days" / "in 5 hours" / "in under an hour" — the deadline in words.
 *
 * Shared rather than written at each call site because the sender's screen and the
 * receiver's screen show the same offer: two independently worded countdowns on
 * one deadline is how "you have 2 days" and "you have 1 day" end up on screen at
 * the same moment.
 */
export function ownershipTransferCountdown(
  state: Pick<SpaceOwnershipTransferState, 'daysLeft' | 'hoursLeft'>,
): string {
  if (state.daysLeft >= 1) return `in ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`;
  if (state.hoursLeft >= 1) return `in ${state.hoursLeft} ${state.hoursLeft === 1 ? 'hour' : 'hours'}`;
  return 'in under an hour';
}

/**
 * §8. Turns a risk score into a triage band. The bands exist to order a review
 * queue — nothing in the product may act on a band by itself.
 */
export const SPACE_RISK_BANDS = [
  { id: 'low', label: 'Low', min: 0 },
  { id: 'watch', label: 'Watch', min: 25 },
  { id: 'elevated', label: 'Elevated', min: 50 },
  { id: 'high', label: 'High', min: 75 },
] as const;

export type SpaceRiskBand = (typeof SPACE_RISK_BANDS)[number]['id'];

export function spaceRiskBand(score: unknown): SpaceRiskBand {
  const value = Number(score) || 0;
  let band: SpaceRiskBand = 'low';
  for (const row of SPACE_RISK_BANDS) if (value >= row.min) band = row.id;
  return band;
}

/** Statuses an admin may filter the §2 search by, including the derived ones. */
export const SPACE_ADMIN_STATUS_FILTERS = [
  { id: '', label: 'Any status' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'ARCHIVED', label: 'Archived' },
  { id: 'removed', label: 'Removed by staff' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'limited', label: 'Reach restricted' },
] as const;

/** Who may see the "WevSpaces" list on a user's public profile. */
export const SPACES_PROFILE_VISIBILITIES = ['everyone', 'followers', 'nobody'] as const;
export type SpacesProfileVisibility = (typeof SPACES_PROFILE_VISIBILITIES)[number];

export const SPACES_PROFILE_VISIBILITY_LABELS: Record<SpacesProfileVisibility, string> = {
  everyone: 'Everyone',
  followers: 'Followers only',
  nobody: 'Nobody',
};

export function isSpacesProfileVisibility(value: unknown): value is SpacesProfileVisibility {
  return typeof value === 'string' && (SPACES_PROFILE_VISIBILITIES as readonly string[]).includes(value);
}

/** Hard cap per account — abuse guard for bulk/spam Space creation. */
export const MAX_SPACES_PER_USER = 25;

// ──────────────────────────────────────────────────────────────
// Team roles & permissions
// ──────────────────────────────────────────────────────────────

/**
 * Granular permission keys (MP2 §3).
 *
 * The eleven keys from the first release are still here verbatim — stored
 * `WevSpaceMember.permissionsJson` overrides reference them by string, so
 * renaming any of them would silently strip a real member's access. New
 * finer-grained keys were added alongside, and `PERMISSION_IMPLIES` below maps
 * the older coarse keys onto them so an existing grant keeps working.
 */
export const SPACE_PERMISSIONS = [
  // Space identity
  'space.edit',
  'space.publish',
  'space.delete',
  // Content
  'content.create',
  'content.edit',
  'content.delete',
  'content.publish',
  'content.schedule',
  'comments.moderate',
  'reviews.moderate',
  // Messages
  'messages.read',
  'messages.reply',
  'messages.requests',
  'messages.assign',
  // Commerce & programming
  'offerings.manage',
  'events.manage',
  // Audience
  'followers.manage',
  // Insight
  'analytics.view',
  'analytics.export',
  // Configuration
  'settings.view',
  'settings.modify',
  // Team
  'members.manage',
  'team.invite',
  'team.remove',
  'team.role',
  // Money
  'monetization.view',
  'monetization.manage',
  'promotion.view',
  'promotion.manage',
  'finance.view',
  'finance.deposit',
  'finance.withdraw',
  // Safety
  'security.view',
  'security.manage',
] as const;

export type SpacePermission = (typeof SPACE_PERMISSIONS)[number];

/**
 * Holding the key on the left grants everything on the right. Keeps the role
 * tables short and lets a legacy coarse grant (`space.edit`, `members.manage`)
 * cover the granular keys that replaced it.
 */
export const PERMISSION_IMPLIES: Readonly<Record<string, readonly SpacePermission[]>> = {
  'space.edit': ['settings.view', 'settings.modify'],
  'settings.modify': ['settings.view'],
  'space.publish': ['content.publish'],
  'content.create': ['content.edit', 'content.schedule'],
  'content.publish': ['content.schedule'],
  'comments.moderate': ['security.view'],
  'messages.reply': ['messages.read'],
  'messages.requests': ['messages.read'],
  'messages.assign': ['messages.read'],
  'members.manage': ['team.invite', 'team.remove', 'team.role'],
  'team.invite': ['settings.view'],
  'analytics.export': ['analytics.view'],
  'monetization.manage': ['monetization.view'],
  'promotion.manage': ['promotion.view'],
  'finance.deposit': ['finance.view'],
  'finance.withdraw': ['finance.view', 'finance.deposit'],
  'security.manage': ['security.view'],
};

/**
 * Never grantable through a per-member override, whatever the role — the owner
 * keeps ultimate control (MP2 §3). Deleting the Space and moving money are the
 * two actions that cannot be delegated by editing a permission array.
 */
export const OWNER_ONLY_PERMISSIONS: readonly SpacePermission[] = ['space.delete'];

/** Expand a raw grant list through PERMISSION_IMPLIES until it stops growing. */
export function expandPermissions(granted: readonly string[]): Set<SpacePermission> {
  const out = new Set<SpacePermission>();
  const queue = [...granted];
  while (queue.length) {
    const key = queue.pop() as SpacePermission;
    if (!key || out.has(key)) continue;
    if (!(SPACE_PERMISSIONS as readonly string[]).includes(key)) continue;
    out.add(key);
    for (const implied of PERMISSION_IMPLIES[key] || []) {
      if (!out.has(implied)) queue.push(implied);
    }
  }
  return out;
}

export const SPACE_MEMBER_ROLES = [
  {
    id: 'OWNER',
    label: 'Owner',
    blurb: 'Full control, including deleting the Space and moving money.',
    permissions: SPACE_PERMISSIONS,
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    blurb: 'Everything except deleting the Space.',
    permissions: [
      'space.edit',
      'space.publish',
      'content.create',
      'content.delete',
      'comments.moderate',
      'reviews.moderate',
      'messages.reply',
      'messages.requests',
      'messages.assign',
      'offerings.manage',
      'events.manage',
      'followers.manage',
      'analytics.export',
      'members.manage',
      'monetization.manage',
      'promotion.manage',
      'finance.withdraw',
      'security.manage',
    ],
  },
  {
    id: 'EDITOR',
    label: 'Editor',
    blurb: 'Creates and schedules content, products and events.',
    permissions: [
      'content.create',
      'content.delete',
      'content.publish',
      'offerings.manage',
      'events.manage',
      'messages.reply',
      'analytics.view',
      'promotion.view',
      'settings.view',
    ],
  },
  {
    id: 'MODERATOR',
    label: 'Moderator',
    blurb: 'Handles comments, reviews, followers and reports.',
    permissions: [
      'comments.moderate',
      'reviews.moderate',
      'content.delete',
      'messages.reply',
      'messages.requests',
      'followers.manage',
      'security.manage',
      'settings.view',
    ],
  },
  {
    id: 'ANALYST',
    label: 'Analyst',
    blurb: 'Read-only insight, including exports.',
    permissions: ['analytics.export', 'promotion.view', 'monetization.view', 'finance.view', 'settings.view'],
  },
  {
    id: 'FINANCE_MANAGER',
    label: 'Finance manager',
    blurb: 'Deposits, withdrawals and ledgers. Cannot publish content or delete the Space.',
    permissions: [
      'finance.withdraw',
      'monetization.manage',
      'analytics.view',
      'settings.view',
    ],
  },
  {
    id: 'SUPPORT',
    label: 'Support',
    blurb: 'Works the inbox only — no content, settings or money.',
    permissions: ['messages.reply', 'messages.requests', 'messages.assign', 'settings.view'],
  },
] as const;

export type SpaceMemberRoleDef = (typeof SPACE_MEMBER_ROLES)[number];
export type SpaceMemberRole = SpaceMemberRoleDef['id'];

/**
 * Invitation lifecycle (MP2 §4). PENDING/ACTIVE/REMOVED are the original three
 * and keep their meaning; the rest distinguish *how* an invite ended so the
 * audit history can say so.
 */
export const SPACE_MEMBER_STATUSES = [
  'PENDING',
  'ACTIVE',
  'REMOVED',
  'DECLINED',
  'EXPIRED',
  'REVOKED',
] as const;
export type SpaceMemberStatus = (typeof SPACE_MEMBER_STATUSES)[number];

export const SPACE_MEMBER_STATUS_LABELS: Record<SpaceMemberStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REMOVED: 'Removed',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/** Statuses that grant no access at all — treated as "not a member". */
export const INACTIVE_MEMBER_STATUSES: readonly SpaceMemberStatus[] = [
  'REMOVED',
  'DECLINED',
  'EXPIRED',
  'REVOKED',
];

/** How long a team invitation stays open before it expires on its own. */
export const SPACE_INVITE_TTL_DAYS = 14;

export function isSpaceMemberStatus(value: unknown): value is SpaceMemberStatus {
  return typeof value === 'string' && (SPACE_MEMBER_STATUSES as readonly string[]).includes(value);
}

/** Roles an owner may hand out (OWNER itself is not assignable). */
export const ASSIGNABLE_SPACE_ROLES = SPACE_MEMBER_ROLES.filter((r) => r.id !== 'OWNER').map((r) => r.id) as readonly SpaceMemberRole[];

export function isSpaceMemberRole(value: unknown): value is SpaceMemberRole {
  return typeof value === 'string' && SPACE_MEMBER_ROLES.some((r) => r.id === value);
}

export function spaceRoleDef(role: unknown): SpaceMemberRoleDef | null {
  return SPACE_MEMBER_ROLES.find((r) => r.id === role) || null;
}

export function isSpacePermission(value: unknown): value is SpacePermission {
  return typeof value === 'string' && (SPACE_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Effective permission check. `extra` is the member's per-member override list
 * (WevSpaceMember.permissionsJson) which can only *add* to the role baseline —
 * never OWNER-only actions.
 */
export function hasSpacePermission(
  role: unknown,
  permission: SpacePermission,
  extra?: unknown,
): boolean {
  const def = spaceRoleDef(role);
  if (def && expandPermissions(def.permissions as readonly string[]).has(permission)) return true;
  if (OWNER_ONLY_PERMISSIONS.includes(permission)) return false;
  const overrides = parseJsonArray(extra);
  if (!overrides) return false;
  return expandPermissions(overrides).has(permission);
}

export function permissionsForRole(role: unknown, extra?: unknown): SpacePermission[] {
  return SPACE_PERMISSIONS.filter((p) => hasSpacePermission(role, p, extra));
}

/**
 * Sanitises a client-supplied override array before it is stored. Unknown keys
 * and owner-only keys are dropped rather than rejected, so a stale client
 * cannot lock an owner out of saving a role change.
 */
export function sanitizePermissionOverrides(raw: unknown): SpacePermission[] {
  const list = parseJsonArray(raw) || (Array.isArray(raw) ? raw.map(String) : []);
  const seen = new Set<SpacePermission>();
  for (const key of list) {
    if (!isSpacePermission(key)) continue;
    if (OWNER_ONLY_PERMISSIONS.includes(key)) continue;
    seen.add(key);
  }
  return SPACE_PERMISSIONS.filter((p) => seen.has(p));
}

/** Grouped for the team UI so 30 checkboxes are not one flat wall. */
export const SPACE_PERMISSION_GROUPS = [
  {
    id: 'content',
    label: 'Content',
    permissions: [
      'content.create',
      'content.edit',
      'content.delete',
      'content.publish',
      'content.schedule',
      'comments.moderate',
    ],
  },
  {
    id: 'messages',
    label: 'WevChat',
    permissions: ['messages.read', 'messages.reply', 'messages.requests', 'messages.assign'],
  },
  {
    id: 'audience',
    label: 'Audience & reviews',
    permissions: ['followers.manage', 'reviews.moderate'],
  },
  {
    id: 'commerce',
    label: 'Products & events',
    permissions: ['offerings.manage', 'events.manage'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    permissions: ['analytics.view', 'analytics.export'],
  },
  {
    id: 'settings',
    label: 'Space & settings',
    permissions: ['settings.view', 'settings.modify', 'space.edit', 'space.publish'],
  },
  {
    id: 'team',
    label: 'Team',
    permissions: ['members.manage', 'team.invite', 'team.remove', 'team.role'],
  },
  {
    id: 'money',
    label: 'Monetization & promotion',
    permissions: ['monetization.view', 'monetization.manage', 'promotion.view', 'promotion.manage', 'finance.view', 'finance.deposit', 'finance.withdraw'],
  },
  {
    id: 'security',
    label: 'Security',
    permissions: ['security.view', 'security.manage'],
  },
] as const;

export const SPACE_PERMISSION_LABELS: Record<SpacePermission, string> = {
  'space.edit': 'Edit Space identity',
  'space.publish': 'Publish / unpublish the Space',
  'space.delete': 'Delete the Space',
  'content.create': 'Create content',
  'content.edit': 'Edit content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',
  'content.schedule': 'Schedule content',
  'comments.moderate': 'Manage comments',
  'reviews.moderate': 'Manage reviews',
  'messages.read': 'Read messages',
  'messages.reply': 'Reply to messages',
  'messages.requests': 'Handle message requests',
  'messages.assign': 'Assign conversations',
  'offerings.manage': 'Manage products & services',
  'events.manage': 'Manage events',
  'followers.manage': 'Manage followers',
  'analytics.view': 'View analytics',
  'analytics.export': 'Export analytics',
  'settings.view': 'View settings',
  'settings.modify': 'Change settings',
  'members.manage': 'Manage the team',
  'team.invite': 'Invite team members',
  'team.remove': 'Remove team members',
  'team.role': 'Change roles',
  'monetization.view': 'View monetization',
  'monetization.manage': 'Manage monetization',
  'promotion.view': 'View promotions',
  'promotion.manage': 'Manage promotions',
  'finance.view': 'View wallet and transactions',
  'finance.deposit': 'Deposit to the business wallet',
  'finance.withdraw': 'Withdraw from the business wallet',
  'security.view': 'View security',
  'security.manage': 'Manage security',
};

// ──────────────────────────────────────────────────────────────
// Handles
// ──────────────────────────────────────────────────────────────

export const SPACE_HANDLE_MIN = 3;
export const SPACE_HANDLE_MAX = 30;
/** Same alphabet as user vanity handles so the two namespaces stay comparable. */
export const SPACE_HANDLE_RE = /^[a-z0-9_]{3,30}$/;

/**
 * Reserved handles for the Space namespace. Deliberately a superset of the
 * user-handle reserve list: the server unions this with RESERVED_HANDLES from
 * legacy-social/shared so a route name can never be shadowed, while the client
 * can pre-validate the wizard field without a round trip.
 */
export const SPACE_RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Platform + routes
  'admin', 'administrator', 'api', 'app', 'apps', 'auth', 'about', 'account', 'accounts',
  'assets', 'blog', 'campus', 'academic', 'cart', 'checkout', 'contact', 'creator', 'dashboard',
  'developer', 'developers', 'discover', 'explore', 'events', 'feed', 'files', 'friends',
  'groups', 'help', 'home', 'invite', 'jobs', 'legal', 'live', 'login', 'logout',
  'marketplace', 'me', 'media', 'memories', 'messages', 'wevchat', 'moderator',
  'new', 'news', 'notifications', 'null', 'undefined', 'official', 'onboarding', 'orders',
  'photos', 'privacy', 'profile', 'reels', 'register', 'reports', 'rewards', 'robots',
  'root', 'search', 'seller', 'sellers', 'settings', 'shop', 'signin', 'signup', 'site',
  'sitemap', 'static', 'staff', 'status', 'store', 'study', 'subscriptions', 'support',
  'system', 'terms', 'test', 'u', 'uploads', 'user', 'users', 'verify', 'videos', 'watch',
  'watch_party', 'welcome', 'www', 'you',
  // Brand + feature names (incl. the pre-rename brand, which must never be claimable)
  'sora', 'wev', 'wevsoft', 'wevspace', 'wevspaces', 'space', 'spaces',
  // Identity claims that would imply platform endorsement
  'verified', 'superadmin', 'moderation', 'security', 'billing', 'payments', 'team',
]);

/**
 * Words that imply the holder speaks *for the platform* rather than to it.
 *
 * Separated from `PROTECTED_BRAND_HANDLES` because the two carry opposite
 * error costs. Refusing `nike` to the wrong person blocks a legitimate business,
 * so that check stays deliberately conservative and leans on risk scoring for
 * the near-misses (§8). Refusing `wevsoft_support` blocks *nobody*: no
 * legitimate owner exists, staff use reserved handles, and the Space it would
 * create is a password-phishing surface. With no false-positive cost to weigh,
 * this list is matched on the strictest fold available.
 */
const PLATFORM_AUTHORITY_WORDS: readonly string[] = [
  'official', 'support', 'admin', 'administrator', 'moderator', 'moderation',
  'team', 'staff', 'security', 'help', 'helpdesk', 'billing', 'payments',
  'verify', 'verified', 'care', 'customercare',
];

/** The brand names an impersonator would pair one of those words with. */
const PLATFORM_BRAND_WORDS: readonly string[] = ['wevsoft', 'wevspace'];

/**
 * Every brand × authority pairing, in both orders.
 *
 * Generated rather than hand-listed because the hand-written list this replaced
 * held six entries and missed `wevsoftsecurity`, `wevsoftbilling` and
 * `wevsoft_customer_care` — the same attack with a different noun. A
 * cross-product cannot develop that kind of hole.
 */
export const PROHIBITED_HANDLE_FRAGMENTS: readonly string[] = PLATFORM_BRAND_WORDS.flatMap((brand) =>
  PLATFORM_AUTHORITY_WORDS.flatMap((word) => [`${brand}${word}`, `${word}${brand}`]),
);

/**
 * Well-known brands. A handle that resolves to one of these after confusable
 * folding is refused unless the Space is verified by staff — spec: "prevent
 * abuse of famous brand names".
 */
export const PROTECTED_BRAND_HANDLES: ReadonlySet<string> = new Set([
  'google', 'facebook', 'meta', 'instagram', 'whatsapp', 'youtube', 'twitter', 'tiktok',
  'apple', 'microsoft', 'amazon', 'netflix', 'openai', 'anthropic', 'claude', 'chatgpt',
  'samsung', 'nike', 'adidas', 'cocacola', 'pepsi', 'tesla', 'spotify', 'paypal', 'visa',
  'mastercard', 'bkash', 'nagad', 'daraz', 'pathao', 'grameenphone', 'robi', 'banglalink',
  'linkedin', 'snapchat', 'telegram', 'discord', 'reddit', 'pinterest', 'twitch', 'uber',
]);

export function normalizeSpaceHandle(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Fold visually confusable characters so `g00gle` and `g_o_o_g_l_e` both collapse
 * onto `google` for impersonation checks. Never used for storage or lookup —
 * comparison only.
 *
 * Conservative on purpose, and one gap is deliberate: it maps `1` to `l` but
 * leaves `i` alone, so `googie` and `netfl1x` do *not* meet their brands here.
 * Closing that would make this fold strict enough to refuse real businesses, and
 * this function backs a hard refusal. The i/l/1 family is closed one layer up
 * instead — see `confusableSkeleton`, which risk scoring reads to route those
 * near-misses to a human (§8) rather than blocking them outright.
 */
export function foldConfusables(handle: string): string {
  return handle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/ii/g, 'l')
    .replace(/(.)\1+/g, '$1');
}

/**
 * The strictest fold in the file: `foldConfusables` plus the i/l/1 collapse it
 * deliberately leaves open, so `netfl1x`, `googie` and `wevs0ft_adm1n` all reach
 * their targets.
 *
 * Too blunt to gate a refusal on by itself — it pairs genuinely different words —
 * so it has exactly two callers, both of which can afford that. Risk scoring uses
 * it because a false positive there costs a reviewer ten seconds, and the
 * platform-impersonation check uses it because that list has no legitimate
 * claimant to wrongly refuse.
 */
export function confusableSkeleton(value: string): string {
  return foldConfusables(value)
    .replace(/[li]/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Result of a handle check. Deliberately a single flat shape rather than a
 * discriminated union: the project compiles without `strictNullChecks`, where
 * TypeScript cannot narrow a `boolean` discriminant, so a union would force a
 * cast at every call site. `handle` is always the normalized value, even on
 * failure, so the wizard can echo back what it actually evaluated.
 */
export interface HandleCheck {
  ok: boolean;
  handle: string;
  error?: string;
  code?: HandleErrorCode;
}

export type HandleErrorCode =
  | 'required'
  | 'too_short'
  | 'too_long'
  | 'charset'
  | 'leading_digit_only'
  | 'reserved'
  | 'prohibited'
  | 'brand';

/**
 * Format + policy validation. Uniqueness is a database concern and lives in
 * wevspace.service.ts — this function is safe to run in the wizard on every
 * keystroke.
 */
export function validateSpaceHandleFormat(raw: unknown): HandleCheck {
  const handle = normalizeSpaceHandle(raw);
  if (!handle) return { ok: false, handle, error: 'Pick a username for your Space', code: 'required' };
  if (handle.length < SPACE_HANDLE_MIN) {
    return { ok: false, handle, error: `At least ${SPACE_HANDLE_MIN} characters`, code: 'too_short' };
  }
  if (handle.length > SPACE_HANDLE_MAX) {
    return { ok: false, handle, error: `At most ${SPACE_HANDLE_MAX} characters`, code: 'too_long' };
  }
  if (!SPACE_HANDLE_RE.test(handle)) {
    return { ok: false, handle, error: 'Use lowercase letters, numbers and underscore only', code: 'charset' };
  }
  if (/^[0-9_]+$/.test(handle)) {
    return { ok: false, handle, error: 'Include at least one letter', code: 'leading_digit_only' };
  }
  if (SPACE_RESERVED_HANDLES.has(handle)) {
    return { ok: false, handle, error: 'That username is reserved', code: 'reserved' };
  }
  const stripped = handle.replace(/_/g, '');
  if (SPACE_RESERVED_HANDLES.has(stripped)) {
    return { ok: false, handle, error: 'That username is reserved', code: 'reserved' };
  }
  // Platform impersonation, matched on the strict skeleton rather than on
  // `stripped`: with only underscores removed, `wevs0ftofficial` and
  // `adm1nwevsoft` walked straight through — and nothing downstream caught them,
  // because risk scoring only knows about third-party brands.
  const skeleton = confusableSkeleton(handle);
  for (const fragment of PROHIBITED_HANDLE_FRAGMENTS) {
    if (skeleton.includes(confusableSkeleton(fragment))) {
      return { ok: false, handle, error: 'That username is not allowed', code: 'prohibited' };
    }
  }
  const folded = foldConfusables(handle);
  for (const brand of PROTECTED_BRAND_HANDLES) {
    if (folded === foldConfusables(brand)) {
      return {
        ok: false,
        handle,
        error: 'This name is protected. Verified brand owners can request it from support.',
        code: 'brand',
      };
    }
  }
  return { ok: true, handle };
}

/** Suggest a handle from a Space name, e.g. "Dhaka Coffee Co." → "dhaka_coffee_co". */
export function suggestSpaceHandle(name: unknown): string {
  const base = String(name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, SPACE_HANDLE_MAX);
  if (!base) return '';
  return base.length >= SPACE_HANDLE_MIN ? base : `${base}_space`.slice(0, SPACE_HANDLE_MAX);
}

// ──────────────────────────────────────────────────────────────
// Public URLs
// ──────────────────────────────────────────────────────────────

/** In-app route for a Space. Matches the `@handle` convention already used for users. */
export function spacePublicPath(handle: unknown): string {
  const clean = normalizeSpaceHandle(handle);
  return clean ? `/space/@${clean}` : '/spaces';
}

/** Absolute public URL, for share sheets and the wizard's URL preview. */
export function spacePublicUrl(handle: unknown, origin?: string): string {
  const base = (origin || '').replace(/\/+$/, '');
  return `${base}${spacePublicPath(handle)}`;
}

/** Human-facing form shown in the wizard: `wevsoft.com/space/@handle`. */
export function spaceDisplayUrl(handle: unknown, host = 'wevsoft.com'): string {
  const clean = normalizeSpaceHandle(handle);
  return `${host}/space/@${clean || 'yourname'}`;
}

/** The Space directory root (§11). */
export const SPACES_DIRECTORY_PATH = '/spaces';

/**
 * `'Restaurant & Café'` → `'restaurant-cafe'`. A path segment, so it is stable,
 * lowercase and free of accents — the same label must always produce the same
 * slug or yesterday's indexed URL becomes a 404 (§12: clean URLs).
 */
export function spaceCategorySlug(category: unknown): string {
  return String(category || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Clean directory URL for one category: `/spaces/category/restaurant-and-cafe`. */
export function spaceCategoryPath(category: unknown): string {
  const slug = spaceCategorySlug(category);
  return slug ? `${SPACES_DIRECTORY_PATH}/category/${slug}` : SPACES_DIRECTORY_PATH;
}

/**
 * Every category label any Space type offers, deduped and sorted. Lets a slug in
 * a URL be resolved back to its canonical label without touching the database.
 */
export const ALL_SPACE_CATEGORIES: readonly string[] = Object.freeze(
  [...new Set(Object.values(SPACE_CATEGORIES).flat())].sort((a, b) => a.localeCompare(b)),
);

/** Reverse of {@link spaceCategorySlug}, or null when the slug names nothing. */
export function spaceCategoryFromSlug(slug: unknown): string | null {
  const wanted = spaceCategorySlug(slug);
  if (!wanted) return null;
  return ALL_SPACE_CATEGORIES.find((label) => spaceCategorySlug(label) === wanted) || null;
}

// ──────────────────────────────────────────────────────────────
// SEO / public web (§12)
// ──────────────────────────────────────────────────────────────

/**
 * Moderation states that remove a Space from every discovery surface — Explore,
 * search, the category directories and the sitemap (MP3 §4).
 *
 * `removed` hides the Space outright. `limited` is what the `restrict` action
 * writes: still reachable by direct link, so the owner can appeal and export, but
 * no longer promoted anywhere. Kept here as one list so the Prisma filters, the
 * SEO gate and `spaceIsIndexable` cannot drift apart.
 *
 * Deliberately mutable: Prisma's `notIn` will not accept a readonly tuple.
 */
export const HIDDEN_MODERATION_STATUSES: string[] = ['removed', 'limited'];

/**
 * Whether a Space may appear in search engines at all. Deliberately stricter
 * than "a visitor can open it": a `followers`-only Space is reachable by its
 * followers but must never be indexed, and `discoverable: false` is an explicit
 * "keep me out of Explore", which we read as "and out of Google too".
 *
 * Both admin-set terminal moderation states are excluded (MP3 §4). `removed`
 * hides the Space; `limited` — what the `restrict` action writes — keeps it
 * reachable by direct link but out of Explore, search and the directories, and a
 * restriction that left the page indexed would be undone by the next crawl.
 *
 * This is the single gate used by the crawler renderer, the sitemap and the
 * client's robots meta, so those three can never disagree (§12: never expose
 * private information through SEO).
 */
export function spaceIsIndexable(space: {
  status?: unknown;
  visibility?: unknown;
  moderationStatus?: unknown;
  discoverable?: unknown;
} | null | undefined): boolean {
  if (!space) return false;
  return (
    space.status === 'PUBLISHED' &&
    space.visibility === 'public' &&
    !HIDDEN_MODERATION_STATUSES.includes(String(space.moderationStatus)) &&
    space.discoverable !== false
  );
}

/** Collapses whitespace and trims to `max` on a word boundary where it can. */
function seoClamp(value: unknown, max: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/** `Padma Coffee House (@padmacoffee) · Restaurant & Café on Wevsoft` */
export function spaceSeoTitle(space: {
  name?: unknown;
  handle?: unknown;
  category?: unknown;
  spaceType?: unknown;
}): string {
  const name = String(space.name || 'WevSpace').trim();
  const handle = normalizeSpaceHandle(space.handle);
  const kind = String(space.category || '').trim() || spaceTypeLabel(space.spaceType);
  const who = handle ? `${name} (@${handle})` : name;
  return seoClamp(`${who} · ${kind} on Wevsoft`, 70);
}

/**
 * The description a search result shows. Falls back through what the owner
 * actually published, and never reaches for a private field: contact details are
 * already nulled out by the serializer when the owner hid them, but they are not
 * consulted here in any case.
 */
export function spaceSeoDescription(space: {
  name?: unknown;
  tagline?: unknown;
  bio?: unknown;
  description?: unknown;
  category?: unknown;
  spaceType?: unknown;
  location?: unknown;
}): string {
  const written = [space.tagline, space.bio, space.description].find(
    (value) => String(value || '').trim().length > 0,
  );
  if (written) return seoClamp(written, 200);
  const name = String(space.name || 'This WevSpace').trim();
  const kind = String(space.category || '').trim() || spaceTypeLabel(space.spaceType);
  const where = String(space.location || '').trim();
  return seoClamp(
    `${name} — ${kind} on Wevsoft${where ? ` · ${where}` : ''}. Follow for posts, updates and more.`,
    200,
  );
}

/**
 * schema.org type per Space type. `LocalBusiness` only where a physical place is
 * genuinely implied; everything else is an `Organization` or a `Person`, because
 * claiming a structured type the Space does not satisfy is what gets rich
 * results suppressed.
 */
export const SPACE_SCHEMA_TYPES: Record<SpaceType, string> = {
  CREATOR: 'Person',
  BUSINESS: 'LocalBusiness',
  BRAND: 'Brand',
  COMMUNITY: 'Organization',
  ORGANIZATION: 'Organization',
  STORE: 'Store',
  PROJECT: 'Organization',
  MEDIA: 'Organization',
  EDUCATION: 'EducationalOrganization',
  GAMING: 'Organization',
  PUBLIC_FIGURE: 'Person',
  OTHER: 'Organization',
};

export function spaceSchemaType(value: unknown): string {
  return SPACE_SCHEMA_TYPES[spaceTypeDef(value).id];
}

/**
 * JSON-LD for a public Space. Every branch is opt-in: a field is only emitted
 * when the Space published it, so a Space that hides its follower count or its
 * phone number does not leak either through structured data.
 */
export function spaceJsonLd(
  space: {
    name?: unknown;
    handle?: unknown;
    spaceType?: unknown;
    category?: unknown;
    tagline?: unknown;
    bio?: unknown;
    description?: unknown;
    location?: unknown;
    region?: unknown;
    country?: unknown;
    website?: unknown;
    contactEmail?: unknown;
    contactPhone?: unknown;
    followersCount?: unknown;
    createdAt?: unknown;
    links?: unknown;
  },
  context: { url: string; image?: string | null },
): Record<string, unknown> {
  const type = spaceSchemaType(space.spaceType);
  const handle = normalizeSpaceHandle(space.handle);

  // `sameAs` is the owner's own published elsewhere-links, nothing inferred.
  const sameAs = [
    String(space.website || '').trim(),
    ...(Array.isArray(space.links)
      ? space.links.map((link: any) => String(link?.url || '').trim())
      : []),
  ].filter((url) => /^https?:\/\//i.test(url));

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': context.url,
    url: context.url,
    name: String(space.name || '').trim() || `@${handle}`,
    description: spaceSeoDescription(space),
  };
  if (handle) node.alternateName = `@${handle}`;
  if (context.image) node[type === 'Person' ? 'image' : 'logo'] = context.image;
  if (sameAs.length) node.sameAs = [...new Set(sameAs)];
  if (String(space.category || '').trim()) {
    node[type === 'Person' ? 'jobTitle' : 'knowsAbout'] = String(space.category).trim();
  }
  if (String(space.contactEmail || '').trim()) node.email = String(space.contactEmail).trim();
  if (String(space.contactPhone || '').trim()) node.telephone = String(space.contactPhone).trim();

  const locality = String(space.location || '').trim();
  const region = String(space.region || '').trim();
  const country = String(space.country || '').trim();
  if (locality || region || country) {
    node.address = {
      '@type': 'PostalAddress',
      ...(locality ? { addressLocality: locality } : {}),
      ...(region ? { addressRegion: region } : {}),
      ...(country ? { addressCountry: country } : {}),
    };
  }

  // null means "the owner switched the count off" — then it is simply absent.
  if (typeof space.followersCount === 'number' && space.followersCount > 0) {
    node.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: space.followersCount,
    };
  }
  if (space.createdAt) {
    const iso = new Date(space.createdAt as any);
    if (!Number.isNaN(iso.getTime())) {
      node[type === 'Person' ? 'birthDate' : 'foundingDate'] = iso.toISOString().slice(0, 10);
    }
  }
  return node;
}

/** Breadcrumbs for a Space page and for a category directory page. */
export function spaceBreadcrumbJsonLd(
  origin: string,
  trail: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  const base = String(origin || '').replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: `${base}${step.path}`,
    })),
  };
}

/** Title and description for `/spaces/category/:slug` and the directory root. */
export function spaceDirectorySeo(
  category?: string | null,
  count?: number | null,
): { title: string; description: string } {
  if (!category) {
    return {
      title: 'Space directory · Wevsoft',
      description: seoClamp(
        'Browse creators, businesses, brands, communities and organizations on Wevsoft. ' +
          'Find a Space by category, location or name.',
        200,
      ),
    };
  }
  const many = typeof count === 'number' && count > 0 ? `${count} ` : '';
  return {
    title: seoClamp(`${category} Space · Wevsoft`, 70),
    description: seoClamp(
      `Discover ${many}${category} Space on Wevsoft — creators, businesses and ` +
        'communities you can follow, message and explore.',
      200,
    ),
  };
}

// ──────────────────────────────────────────────────────────────
// Field limits & sanitizers (mirrored by zod schemas on the server)
// ──────────────────────────────────────────────────────────────

export const SPACE_LIMITS = {
  name: { min: 2, max: 60 },
  tagline: { max: 80 },
  bio: { max: 200 },
  description: { max: 5000 },
  category: { max: 60 },
  location: { max: 120 },
  website: { max: 300 },
  contactEmail: { max: 160 },
  contactPhone: { max: 40 },
  linkLabel: { max: 40 },
  linkUrl: { max: 300 },
  offeringTitle: { max: 100 },
  offeringDescription: { max: 1000 },
  reviewText: { max: 1000 },
  /**
   * MP3 §4. The reason the owner is shown, and the internal note only staff read
   * — kept here beside every other length so the admin console's character
   * counters and the server's validation cannot drift apart.
   */
  adminReason: { max: 400 },
  adminNote: { max: 2000 },
} as const;

/** MP3 §5. Longer than this and "permanent" is the honest word (§5). */
export const MAX_CUSTOM_SUSPENSION_DAYS = 365;

export function normalizeHexColor(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const withHash = value.startsWith('#') ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [r, g, b] = withHash.slice(1).toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

/** Adds https:// when the owner typed a bare domain; returns null if unusable. */
export function normalizeWebsiteUrl(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function isValidContactEmail(raw: unknown): boolean {
  const value = String(raw ?? '').trim();
  return value.length > 3 && value.length <= SPACE_LIMITS.contactEmail.max && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ──────────────────────────────────────────────────────────────
// Business hours
// ──────────────────────────────────────────────────────────────

export const WEEK_DAYS = [
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
  { id: 'sun', label: 'Sunday', short: 'Sun' },
] as const;

export type WeekDayId = (typeof WEEK_DAYS)[number]['id'];

export type BusinessHoursDay = { open: string; close: string; closed: boolean };
export type BusinessHours = Record<WeekDayId, BusinessHoursDay>;

export function defaultBusinessHours(): BusinessHours {
  const out = {} as BusinessHours;
  for (const day of WEEK_DAYS) {
    out[day.id] = { open: '09:00', close: '18:00', closed: day.id === 'sun' };
  }
  return out;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseBusinessHours(raw: unknown): BusinessHours | null {
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const base = defaultBusinessHours();
  let touched = false;
  for (const day of WEEK_DAYS) {
    const entry = parsed[day.id];
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const open = typeof row.open === 'string' && TIME_RE.test(row.open) ? row.open : base[day.id].open;
    const close = typeof row.close === 'string' && TIME_RE.test(row.close) ? row.close : base[day.id].close;
    base[day.id] = { open, close, closed: row.closed === true };
    touched = true;
  }
  return touched ? base : null;
}

export function formatHourLabel(value: string): string {
  const match = TIME_RE.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${match[2]} ${suffix}`;
}

// ──────────────────────────────────────────────────────────────
// Offerings & reviews
// ──────────────────────────────────────────────────────────────

export const SPACE_OFFERING_KINDS = [
  { id: 'PRODUCT', label: 'Product' },
  { id: 'SERVICE', label: 'Service' },
  { id: 'PACKAGE', label: 'Package' },
  { id: 'DIGITAL', label: 'Digital item' },
] as const;

export type SpaceOfferingKind = (typeof SPACE_OFFERING_KINDS)[number]['id'];

export function isSpaceOfferingKind(value: unknown): value is SpaceOfferingKind {
  return typeof value === 'string' && SPACE_OFFERING_KINDS.some((k) => k.id === value);
}

export const MAX_SPACE_OFFERINGS = 200;

export const SPACE_REVIEW_STATUSES = ['visible', 'hidden', 'removed'] as const;
export type SpaceReviewStatus = (typeof SPACE_REVIEW_STATUSES)[number];

// ──────────────────────────────────────────────────────────────
// Discovery
// ──────────────────────────────────────────────────────────────

export const SPACE_DISCOVER_SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'trending', label: 'Trending' },
  { id: 'popular', label: 'Most followed' },
  { id: 'new', label: 'Newest' },
  { id: 'verified', label: 'Verified' },
  { id: 'friends', label: 'Followed by friends' },
  { id: 'nearby', label: 'Near me' },
] as const;

export type SpaceDiscoverSort = (typeof SPACE_DISCOVER_SORTS)[number]['id'];

export function isSpaceDiscoverSort(value: unknown): value is SpaceDiscoverSort {
  return typeof value === 'string' && SPACE_DISCOVER_SORTS.some((s) => s.id === value);
}

/**
 * Trend score with an age decay, so a brand-new Space with a burst of follows
 * can surface without a huge back catalogue dominating forever. Pure so the
 * ranking is unit-testable.
 */
export function spaceTrendScore(input: {
  followersCount?: number | null;
  viewsCount?: number | null;
  postsCount?: number | null;
  reelsCount?: number | null;
  createdAt?: Date | string | null;
  verified?: boolean;
  now?: Date;
}): number {
  const followers = Math.max(0, Number(input.followersCount) || 0);
  const views = Math.max(0, Number(input.viewsCount) || 0);
  const content = Math.max(0, Number(input.postsCount) || 0) + Math.max(0, Number(input.reelsCount) || 0);
  const base = followers * 3 + views * 0.15 + Math.min(content, 100) * 1.5 + (input.verified ? 25 : 0);
  const created = input.createdAt ? new Date(input.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) return base;
  const now = input.now || new Date();
  const ageDays = Math.max(0, (now.getTime() - created.getTime()) / 86_400_000);
  // Half-life of ~45 days keeps Explore fresh without erasing established Spaces.
  return base / Math.pow(1 + ageDays / 45, 0.6);
}

/**
 * A Space is only eligible for Explore / recommendations once it looks real.
 * Blocks empty spam shells from flooding discovery.
 */
export function isDiscoverable(space: {
  status?: unknown;
  visibility?: unknown;
  discoverable?: unknown;
  moderationStatus?: unknown;
  avatar?: unknown;
  bio?: unknown;
  description?: unknown;
  postsCount?: number | null;
  reelsCount?: number | null;
}): boolean {
  if (space.status !== 'PUBLISHED') return false;
  if (space.visibility !== 'public') return false;
  if (space.discoverable === false) return false;
  if (space.moderationStatus === 'removed' || space.moderationStatus === 'limited') return false;
  const hasIdentity = !!space.avatar || !!space.bio || !!space.description;
  const hasContent = (Number(space.postsCount) || 0) + (Number(space.reelsCount) || 0) > 0;
  return hasIdentity || hasContent;
}

// ──────────────────────────────────────────────────────────────
// Activity log actions (audit trail)
// ──────────────────────────────────────────────────────────────

export const SPACE_ACTIVITY_ACTIONS = [
  'space.created',
  'space.updated',
  'space.published',
  'space.unpublished',
  'space.archived',
  'space.handle_changed',
  'space.avatar_changed',
  'space.cover_changed',
  'space.theme_changed',
  'space.visibility_changed',
  'member.invited',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'links.updated',
  'offering.created',
  'offering.updated',
  'offering.deleted',
  'review.hidden',
  'media.uploaded',
  'verification.requested',
  // MP2 — every privileged action leaves a row so the activity log is complete.
  'member.declined',
  'member.revoked',
  'member.expired',
  'member.permissions_changed',
  // A teammate ending their own membership. Distinct from member.removed so the
  // log never implies somebody was thrown off the team.
  'member.left',
  'content.created',
  'content.updated',
  'content.deleted',
  'content.published',
  'content.scheduled',
  'content.pinned',
  'content.unpinned',
  'content.featured',
  'comment.hidden',
  'comment.approved',
  'comment.deleted',
  'comment.pinned',
  'moderation.settings_changed',
  'audience.restricted',
  'audience.banned',
  'audience.muted',
  'audience.cleared',
  'follower.removed',
  'thread.status_changed',
  'thread.assigned',
  'thread.labelled',
  'broadcast.created',
  'broadcast.cancelled',
  'chat.started',
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.cancelled',
  'canned.updated',
  'event.created',
  'event.updated',
  'event.cancelled',
  'review.replied',
  'review.restored',
  'review.removed',
  'settings.updated',
  'features.updated',
  'campaign.created',
  'campaign.submitted',
  'campaign.paused',
  'campaign.resumed',
  'campaign.cancelled',
  'campaign.reviewed',
  'monetization.enabled',
  'monetization.disabled',
  'monetization.tier_changed',
  'transaction.recorded',
  'transaction.status_changed',
  'payout.requested',
  'insights.exported',
  // MP3 §7 — the verification lifecycle. `verification.requested` is declared
  // further up; these are the states an application moves through afterwards.
  'verification.withdrawn',
  'verification.review_started',
  'verification.approved',
  'verification.rejected',
  'verification.revoked',
  // MP3 §4/§23 — staff actions. They live in the *owner's* activity log on
  // purpose: §23 wants "owner-relevant history in Space Management", and being
  // moderated is about as owner-relevant as it gets. The broader staff trail with
  // IP, device and internal notes goes to SystemAuditLog, which owners never see.
  'admin.warned',
  'admin.restricted',
  'admin.unrestricted',
  'admin.suspended',
  'admin.restored',
  'admin.disabled',
  'admin.enabled',
  'admin.visibility_forced',
  'admin.verification_revoked',
  'admin.monetization_frozen',
  'admin.monetization_unfrozen',
  'admin.promotion_stopped',
  'admin.handle_change_required',
  'admin.handle_change_cleared',
  'admin.settings_locked',
  'admin.settings_unlocked',
  'admin.reviewed',
  /// Written by the expiry sweep, not by a person — `actorUserId` is null.
  'admin.suspension_expired',
  // MP3 §6 — the deletion lifecycle. Note that `space.purged` cannot survive in
  // this log: WevSpaceActivity cascades on spaceId, so the row dies with the Space
  // it describes. The durable record is WevSpaceDeletionRecord, which holds no
  // foreign key for exactly that reason; the action name exists here so the staff
  // audit trail, which lives outside the Space, can name the same event.
  'space.deletion_requested',
  'space.deletion_cancelled',
  'space.purged',
  'space.exported',

  // Ownership transfer (§10). Five names for one flow because the whole value of
  // the trail is distinguishing how an offer ended: withdrawn by the sender,
  // refused by the receiver, or simply never answered. `space.ownership_transferred`
  // is the only one that means `ownerUserId` actually changed.
  'space.ownership_transfer_requested',
  'space.ownership_transfer_cancelled',
  'space.ownership_transfer_declined',
  'space.ownership_transfer_expired',
  'space.ownership_transferred',
] as const;

export type SpaceActivityAction = (typeof SPACE_ACTIVITY_ACTIONS)[number];

/**
 * Which activity row each §4 action writes. A total map rather than a string
 * built at the call site, so adding an admin action without deciding how it is
 * logged is a type error — §4 says *every* admin action creates an audit log,
 * and the compiler is the only reliable enforcer of "every".
 */
export const SPACE_ADMIN_ACTION_ACTIVITY: Record<SpaceAdminAction, SpaceActivityAction> = {
  warn: 'admin.warned',
  restrict: 'admin.restricted',
  unrestrict: 'admin.unrestricted',
  suspend: 'admin.suspended',
  restore: 'admin.restored',
  disable: 'admin.disabled',
  enable: 'admin.enabled',
  set_visibility: 'admin.visibility_forced',
  revoke_verification: 'admin.verification_revoked',
  freeze_monetization: 'admin.monetization_frozen',
  unfreeze_monetization: 'admin.monetization_unfrozen',
  stop_promotion: 'admin.promotion_stopped',
  require_handle_change: 'admin.handle_change_required',
  clear_handle_change: 'admin.handle_change_cleared',
  lock_settings: 'admin.settings_locked',
  unlock_settings: 'admin.settings_unlocked',
  clear_flags: 'admin.reviewed',
};

// ──────────────────────────────────────────────────────────────
// API payload shapes (single definition for client + server)
// ──────────────────────────────────────────────────────────────

/** Everything needed to render a Space header, tabs and About — the payload the
 *  live preview and the real public page both consume. */
export interface SpacePublicPayload {
  id: string;
  handle: string;
  name: string;
  spaceType: SpaceType;
  category: string | null;
  tagline: string | null;
  bio: string | null;
  description: string | null;
  avatar: string | null;
  cover: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Whether the owner publishes the contact details. Mirrored back so the edit
   *  form can round-trip the toggles; for non-privileged viewers the value above
   *  is already nulled out when the flag is false. */
  showEmail?: boolean;
  showPhone?: boolean;
  location: string | null;
  country: string | null;
  region: string | null;
  language: string;
  businessHours: BusinessHours | null;
  themePreset: SpaceThemeId | string;
  accentColor: string | null;
  /** Accent already resolved from theme + override, so consumers need not. */
  accent?: string;
  ctaType: SpaceCtaType | string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  tabs: SpaceTab[];
  features: Record<SpaceFeature, boolean>;
  featured: SpaceFeaturedRef[];
  status: SpaceStatus | string;
  visibility: SpaceVisibility | string;
  /** Opt-in to Explore / search. Non-public Spaces are excluded regardless. */
  discoverable?: boolean;
  verificationStatus: SpaceVerificationStatus | string;
  moderationStatus?: SpaceModerationStatus | string;
  /** null when the owner has switched `showFollowerCount` off — omit the stat. */
  followersCount: number | null;
  /** Whether this viewer may open the follower roster (`showFollowerList`). */
  canViewFollowerList?: boolean;
  postsCount: number;
  reelsCount: number;
  viewsCount: number;
  createdAt: string;
  publishedAt: string | null;
  /**
   * §6. Present only for the owner, the team and staff — a visitor is told the
   * Space is unavailable and learns nothing about a date. Absent, not null, on a
   * public payload.
   */
  deletion?: SpaceDeletionState;
  /** Human label for spaceType, precomputed by the server. */
  typeLabel?: string;
  owner: SpaceOwnerRef | null;
  links: SpaceLinkPayload[];
  /** Viewer-relative flags, absent for anonymous visitors. */
  viewer?: SpaceViewerState;
}

export interface SpaceViewerState {
  isOwner: boolean;
  isFollowing: boolean;
  role: SpaceMemberRole | null;
  permissions: SpacePermission[];
  canEdit: boolean;
  canPost: boolean;
  hasReviewed?: boolean;
}

export interface SpaceOwnerRef {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

export interface SpaceLinkPayload {
  id: string;
  platform: SpaceLinkPlatform | string;
  label: string | null;
  url: string;
  order: number;
}

export type SpaceFeaturedKind = 'post' | 'reel' | 'offering' | 'media' | 'event';

export interface SpaceFeaturedRef {
  kind: SpaceFeaturedKind;
  id: string;
}

/** Compact shape for the "My WevSpaces" cards and search results. */
/** One recent-post thumbnail on a Space card. `url` is the media file itself;
 *  for videos `poster` is an image to show instead (null when none exists). */
export interface SpaceRecentMedia {
  url: string;
  type?: 'image' | 'video' | string;
  poster?: string | null;
}

export interface SpaceCardPayload {
  id: string;
  handle: string;
  name: string;
  spaceType: SpaceType | string;
  category: string | null;
  tagline: string | null;
  avatar: string | null;
  cover: string | null;
  themePreset: string;
  accentColor: string | null;
  verificationStatus: string;
  status: string;
  visibility: string;
  /** null when the Space hides its follower count — see SpacePublicPayload. */
  followersCount: number | null;
  postsCount: number;
  isOwner?: boolean;
  isFollowing?: boolean;
  role?: SpaceMemberRole | null;
  
  // New rich features for 1B UI
  viewsCount?: number;
  activeStatus?: string;
  friendFollowers?: { id: string; avatar: string | null; name: string }[];
  /** Total friends of the viewer following (friendFollowers is capped at 3). */
  friendFollowersCount?: number;
  /** ISO time of the latest public post; null when none. */
  lastActiveAt?: string | null;
  recentMedia?: SpaceRecentMedia[];
  isFeatured?: boolean;
  isTrending?: boolean;
}

/** Draft state produced by the creation wizard; matches POST /api/spaces. */
export interface SpaceDraft {
  spaceType: SpaceType;
  name: string;
  handle: string;
  category: string;
  tagline: string;
  bio: string;
  description: string;
  avatar: string | null;
  cover: string | null;
  website: string;
  contactEmail: string;
  contactPhone: string;
  showEmail: boolean;
  showPhone: boolean;
  location: string;
  country: string;
  region: string;
  language: string;
  themePreset: SpaceThemeId;
  accentColor: string | null;
  ctaType: SpaceCtaType;
  ctaLabel: string;
  ctaUrl: string;
  tabs: SpaceTab[];
  features: Record<SpaceFeature, boolean>;
  links: Array<{ platform: SpaceLinkPlatform; label: string; url: string }>;
  businessHours: BusinessHours | null;
  visibility: SpaceVisibility;
  discoverable: boolean;
}

export function emptySpaceDraft(type: SpaceType = DEFAULT_SPACE_TYPE): SpaceDraft {
  return {
    spaceType: type,
    name: '',
    handle: '',
    category: '',
    tagline: '',
    bio: '',
    description: '',
    avatar: null,
    cover: null,
    website: '',
    contactEmail: '',
    contactPhone: '',
    showEmail: false,
    showPhone: false,
    location: '',
    country: '',
    region: '',
    language: 'en',
    themePreset: 'default',
    accentColor: null,
    ctaType: spaceTypeDef(type).suggestedCta as SpaceCtaType,
    ctaLabel: '',
    ctaUrl: '',
    tabs: defaultTabsForType(type),
    features: defaultFeaturesForType(type),
    links: [],
    businessHours: null,
    visibility: 'public',
    discoverable: true,
  };
}

/** Re-seed type-derived defaults when the wizard's type changes, keeping any
 *  identity the owner already typed. */
export function applySpaceTypeDefaults(draft: SpaceDraft, type: SpaceType): SpaceDraft {
  const def = spaceTypeDef(type);
  return {
    ...draft,
    spaceType: type,
    tabs: defaultTabsForType(type),
    features: defaultFeaturesForType(type),
    ctaType: def.suggestedCta as SpaceCtaType,
    category: (categoriesForType(type) as readonly string[]).includes(draft.category) ? draft.category : '',
    businessHours:
      draft.businessHours || (type === 'BUSINESS' || type === 'STORE' ? defaultBusinessHours() : null),
  };
}

// ──────────────────────────────────────────────────────────────
// Small formatting helpers shared by cards, headers and previews
// ──────────────────────────────────────────────────────────────

export function formatFollowerCount(value: unknown): string {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}K`;
  }
  const m = n / 1_000_000;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)}M`;
}

/** Offering price as shown on cards and the Shop tab. An offering with no price
 *  is legitimate ("Contact for pricing"), so null is a display state, not a gap. */
export function formatSpacePrice(
  price: unknown,
  currency: unknown = 'BDT',
  note?: unknown,
): string {
  const suffix = String(note ?? '').trim();
  if (price === null || price === undefined || price === '') {
    return suffix || 'Contact for pricing';
  }
  const amount = Number(price);
  if (!Number.isFinite(amount)) return suffix || 'Contact for pricing';
  const code = String(currency ?? 'BDT').trim().toUpperCase() || 'BDT';
  const rounded = Math.round(amount * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return suffix ? `${code} ${formatted} · ${suffix}` : `${code} ${formatted}`;
}

export function spaceInitials(name: unknown): string {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'W';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** Percentage of the identity fields a Space has filled in — drives the
 *  "finish setting up" nudge on the owner view. */
export function spaceCompletion(space: {
  avatar?: unknown;
  cover?: unknown;
  bio?: unknown;
  description?: unknown;
  category?: unknown;
  location?: unknown;
  website?: unknown;
  postsCount?: number | null;
}): { percent: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ['Profile image', !!space.avatar],
    ['Cover image', !!space.cover],
    ['Short bio', !!space.bio],
    ['Description', !!space.description],
    ['Category', !!space.category],
    ['Location', !!space.location],
    ['Website or link', !!space.website],
    ['First post', (Number(space.postsCount) || 0) > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

// ──────────────────────────────────────────────────────────────
// JSON helpers — DB columns are text (SQLite has no JSON type)
// ──────────────────────────────────────────────────────────────

export function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function parseJsonArray(raw: unknown): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

export function parseFeaturedRefs(raw: unknown): SpaceFeaturedRef[] {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!Array.isArray(value)) return [];
  const kinds: readonly string[] = ['post', 'reel', 'offering', 'media', 'event'];
  return value
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .filter((entry) => kinds.includes(String(entry.kind)) && typeof entry.id === 'string' && entry.id)
    .slice(0, 12)
    .map((entry) => ({ kind: String(entry.kind) as SpaceFeaturedKind, id: String(entry.id) }));
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Owner Control Center — dashboard section registry (MP2 §1)
// ──────────────────────────────────────────────────────────────

/**
 * One entry per section of "WevSpace Management". `permission` is the key the
 * viewer needs to open it, so the nav, the route guard and the server all agree
 * on who may see what. `feature` hides a section whose capability the owner
 * switched off — a Space with messaging disabled has no Messages tab at all.
 */
export const SPACE_DASHBOARD_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', permission: 'settings.view' },
  { id: 'content', label: 'Content', icon: 'FileText', permission: 'content.create' },
  { id: 'wevchat', label: 'WevChat', icon: 'MessageSquare', permission: 'messages.read', feature: 'messaging' },
  { id: 'followers', label: 'Followers', icon: 'Users', permission: 'settings.view' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', permission: 'settings.view' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', permission: 'analytics.view' },
  { id: 'events', label: 'Events', icon: 'CalendarDays', permission: 'events.manage', feature: 'events' },
  { id: 'products', label: 'Products', icon: 'ShoppingBag', permission: 'offerings.manage', feature: 'offerings' },
  { id: 'reviews', label: 'Reviews', icon: 'Star', permission: 'reviews.moderate', feature: 'reviews' },
  { id: 'team', label: 'Team', icon: 'UserCog', permission: 'settings.view' },
  { id: 'monetization', label: 'Monetization', icon: 'Wallet', permission: 'monetization.view' },
  { id: 'verification', label: 'Verification', icon: 'BadgeCheck', permission: 'settings.view' },
  { id: 'promotion', label: 'Ads', icon: 'Megaphone', permission: 'promotion.view' },
  { id: 'settings', label: 'Settings', icon: 'Settings', permission: 'settings.view' },
  { id: 'custom-profile', label: 'Custom profile', icon: 'Globe', permission: 'settings.view' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck', permission: 'security.view' },
  { id: 'activity', label: 'Activity log', icon: 'History', permission: 'settings.view' },
  { id: 'developer-console', label: 'Developer Console', icon: 'Terminal', permission: 'settings.view' },
] as const;

export type SpaceDashboardSectionDef = (typeof SPACE_DASHBOARD_SECTIONS)[number];
export type SpaceDashboardSection = SpaceDashboardSectionDef['id'];

export const DEFAULT_DASHBOARD_SECTION: SpaceDashboardSection = 'overview';

export function isSpaceDashboardSection(value: unknown): value is SpaceDashboardSection {
  return typeof value === 'string' && SPACE_DASHBOARD_SECTIONS.some((s) => s.id === value);
}

/**
 * Sections this viewer may open. Used to build the dashboard nav *and* to pick a
 * safe landing section — a SUPPORT member who can only see Messages should land
 * there rather than on an empty Overview.
 */
export function visibleDashboardSections(input: {
  permissions?: readonly string[];
  features?: unknown;
  spaceType?: unknown;
}): SpaceDashboardSectionDef[] {
  const held = new Set(input.permissions || []);
  const features = parseFeatureMap(input.features, input.spaceType);
  return SPACE_DASHBOARD_SECTIONS.filter((section) => {
    if (!held.has(section.permission)) return false;
    const feature = (section as { feature?: string }).feature;
    if (feature && isSpaceFeature(feature) && features[feature] !== true) return false;
    return true;
  });
}

/**
 * WevDesk — the Space's full-screen business workspace (home, unified inbox, …).
 * In Space mode every WevChat entry point opens it; `page` is a WevDesk sub-page.
 */
export function spaceDeskPath(handle: unknown, page?: string): string {
  const base = `/space/${normalizeSpaceHandle(handle)}/desk`;
  return page ? `${base}/${page}` : base;
}

/**
 * The old "Manage" page (/space/:handle/manage/:section) was replaced by WevDesk.
 * Sections with their own WevDesk page map to it; every other section renders the
 * same panel inside the WevDesk shell at /space/:handle/desk/s/:section.
 */
export const SPACE_DESK_PAGE_FOR_SECTION: Partial<Record<SpaceDashboardSection, string>> = {
  overview: '',
  wevchat: 'inbox',
  products: 'commerce',
  team: 'team',
  analytics: 'insights',
  promotion: 'ads',
  monetization: 'payments',
  reviews: 'reviews',
  settings: 'settings',
  'custom-profile': 'brand-kit',
  notifications: 'notifications',
};
/** Old section slugs that are not section ids any more. */
const LEGACY_SECTION_ALIASES: Record<string, SpaceDashboardSection> = { messages: 'wevchat', inbox: 'wevchat', insights: 'analytics', ads: 'promotion' };

/** Path for a dashboard section, now inside WevDesk. One place so every entry point links alike. */
export function spaceDashboardPath(handle: unknown, section?: unknown): string {
  const raw = typeof section === 'string' ? (LEGACY_SECTION_ALIASES[section] || section) : section;
  const id: SpaceDashboardSection = isSpaceDashboardSection(raw) ? raw : DEFAULT_DASHBOARD_SECTION;
  const page = SPACE_DESK_PAGE_FOR_SECTION[id];
  if (page !== undefined) return spaceDeskPath(handle, page || undefined);
  return spaceDeskPath(handle, `s/${id}`);
}

/**
 * Rewrites a legacy /space/:handle/manage[/:section][?query][#hash] URL (stored in
 * old notifications, payment return URLs, bookmarks) to its WevDesk replacement.
 * Any other URL is returned unchanged.
 */
export function mapLegacyManageUrl(url: string): string {
  if (typeof url !== 'string') return url;
  const m = url.match(/^(https?:\/\/[^/]+)?\/space\/([^/?#]+)\/manage(?:\/([^/?#]+))?\/?([?#].*)?$/);
  if (!m) return url;
  const [, origin = '', handle, section, rest = ''] = m;
  return `${origin}${spaceDashboardPath(decodeURIComponent(handle), section)}${rest}`;
}

// ---------------------------------------------------------------------------
// Custom profile / hosted live-content API
// ---------------------------------------------------------------------------

export const SPACE_CUSTOM_PROFILE_HOST_KINDS = ['GITHUB_PAGES', 'CUSTOM_SITE'] as const;
export type SpaceCustomProfileHostKind = (typeof SPACE_CUSTOM_PROFILE_HOST_KINDS)[number];

export function isSpaceCustomProfileHostKind(value: unknown): value is SpaceCustomProfileHostKind {
  return SPACE_CUSTOM_PROFILE_HOST_KINDS.includes(value as SpaceCustomProfileHostKind);
}

export const SPACE_LIVE_PUBLIC_API_PREFIX = '/api/v1/public/spaces';
export const SPACE_LIVE_KEY_HEADER = 'X-WevSpace-Key';
export const MAX_SPACE_CORS_ORIGINS = 10;

/**
 * https origin only, no path, no trailing slash. `https://User.GitHub.io/page`
 * is rejected (path is stored separately as hostPath).
 */
export function normalizeHostOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.search || url.hash) return null;
    if (url.pathname && url.pathname !== '/') return null;
    const host = url.host.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost')) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

export function isGithubPagesOrigin(origin: unknown): boolean {
  const normalized = normalizeHostOrigin(origin);
  if (!normalized) return false;
  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    return hostname === 'github.io' || hostname.endsWith('.github.io');
  } catch {
    return false;
  }
}

/**
 * Parses a JSON array, newline/comma list, or already-parsed array into at most
 * 10 unique https origins. Invalid entries are dropped.
 */
export function parseCorsOrigins(raw: unknown): string[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      items = Array.isArray(parsed) ? parsed : trimmed.split(/[\n,]/);
    } catch {
      items = trimmed.split(/[\n,]/);
    }
  } else {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const origin = normalizeHostOrigin(item);
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    out.push(origin);
    if (out.length >= MAX_SPACE_CORS_ORIGINS) break;
  }
  return out;
}

export function spaceLivePublicPath(handle: unknown): string {
  const normalized = typeof handle === 'string' ? handle.trim().replace(/^@/, '') : '';
  return `${SPACE_LIVE_PUBLIC_API_PREFIX}/${encodeURIComponent(normalized)}`;
}

/**
 * Soft business-account switch (Facebook Page style): remap personal shell routes
 * into the active WevSpace. Home/`/feed` stay on Wevsoft Home chrome (Space feed
 * is rendered inside HomePage). Messages/Notifications open Manage sections;
 * Profile opens the public Space page. Unmapped routes (Reels, Marketplace, …)
 * stay personal so the full Wevsoft UI remains available.
 */
export function spaceModeNavPath(
  personalPath: string,
  space: { handle?: string | null } | null | undefined,
): string {
  const handle = space?.handle ? normalizeSpaceHandle(space.handle) : '';
  if (!handle || handle === '@') return personalPath;
  const path = personalPath.split('?')[0] || personalPath;
  // Keep Home inside DashboardLayout — same chrome as personal Wevsoft.
  if (path === '/home' || path === '/feed') return path === '/feed' ? '/feed' : '/home';
  // Do not send /spaces to Manage — that felt like "Home = dashboard". Manage is
  // via the Manage chip / profile. Spaces directory stays the directory.
  // WevChat in Space mode opens WevDesk (its Unified Inbox is the Space inbox).
  if (path === '/messages' || path.startsWith('/messages/')) return spaceDeskPath(handle);
  if (path === '/notifications') return spaceDashboardPath(handle, 'notifications');
  if (path === '/profile') return spacePublicPath(handle);
  return personalPath;
}

// ──────────────────────────────────────────────────────────────
// Space content kinds (MP2 §6)
// ──────────────────────────────────────────────────────────────

/**
 * What a Space can publish. `storage` names the existing Wevsoft table that
 * backs it, because MP2 reuses the platform's content system rather than growing
 * a parallel one: Post already carries status / scheduledFor / pinned /
 * isFeatured / pollData / commentsDisabled, and Reel / Story / Event already
 * carry `spaceId`.
 */
export const SPACE_CONTENT_KINDS = [
  { id: 'TEXT', label: 'Text', icon: 'Type', storage: 'post', feature: 'posts', composer: true },
  { id: 'PHOTO', label: 'Photo', icon: 'Image', storage: 'post', feature: 'photos', composer: true },
  { id: 'CAROUSEL', label: 'Carousel', icon: 'Images', storage: 'post', feature: 'photos', composer: true },
  { id: 'VIDEO', label: 'Video', icon: 'Video', storage: 'post', feature: 'videos', composer: true },
  { id: 'GIF', label: 'GIF', icon: 'Film', storage: 'post', feature: 'posts', composer: true },
  { id: 'POLL', label: 'Poll', icon: 'BarChart2', storage: 'post', feature: 'posts', composer: true },
  { id: 'LINK', label: 'Link', icon: 'Link2', storage: 'post', feature: 'posts', composer: true },
  { id: 'ANNOUNCEMENT', label: 'Announcement', icon: 'Megaphone', storage: 'post', feature: 'posts', composer: true },
  { id: 'OFFERING_POST', label: 'Product post', icon: 'ShoppingBag', storage: 'post', feature: 'offerings', composer: true },
  { id: 'REEL', label: 'Reel', icon: 'Clapperboard', storage: 'reel', feature: 'reels', composer: false },
  { id: 'STORY', label: 'Story', icon: 'CirclePlus', storage: 'story', feature: 'posts', composer: false },
  { id: 'EVENT', label: 'Event', icon: 'CalendarDays', storage: 'event', feature: 'events', composer: false },
  { id: 'LIVE', label: 'Live', icon: 'Radio', storage: 'live', feature: 'videos', composer: false },
] as const;

export type SpaceContentKindDef = (typeof SPACE_CONTENT_KINDS)[number];
export type SpaceContentKind = SpaceContentKindDef['id'];

export function isSpaceContentKind(value: unknown): value is SpaceContentKind {
  return typeof value === 'string' && SPACE_CONTENT_KINDS.some((k) => k.id === value);
}

export function spaceContentKindDef(value: unknown): SpaceContentKindDef {
  return SPACE_CONTENT_KINDS.find((k) => k.id === value) || SPACE_CONTENT_KINDS[0];
}

/** Kinds the composer itself can produce, given the features this Space has on. */
export function composerKindsFor(input: { features?: unknown; spaceType?: unknown }): SpaceContentKindDef[] {
  const features = parseFeatureMap(input.features, input.spaceType);
  return SPACE_CONTENT_KINDS.filter((kind) => {
    if (!kind.composer) return false;
    return isSpaceFeature(kind.feature) ? features[kind.feature] === true : true;
  });
}

/** Lifecycle states the Space content manager filters by (Post.status values). */
export const SPACE_CONTENT_STATUSES = ['published', 'draft', 'scheduled', 'archived', 'trashed'] as const;
export type SpaceContentStatus = (typeof SPACE_CONTENT_STATUSES)[number];

export const SPACE_CONTENT_STATUS_LABELS: Record<SpaceContentStatus, string> = {
  published: 'Published',
  draft: 'Drafts',
  scheduled: 'Scheduled',
  archived: 'Archived',
  trashed: 'Trash',
};

export function isSpaceContentStatus(value: unknown): value is SpaceContentStatus {
  return typeof value === 'string' && (SPACE_CONTENT_STATUSES as readonly string[]).includes(value);
}

/** Who a Space post reaches. Mirrors the Post.privacy values already in use. */
export const SPACE_POST_AUDIENCES = [
  { id: 'public', label: 'Public', blurb: 'Anyone, on or off Wevsoft', icon: 'Globe' },
  { id: 'followers', label: 'Followers', blurb: 'Only people who follow this Space', icon: 'Users' },
  { id: 'private', label: 'Team only', blurb: 'Only you and your team can see it', icon: 'Lock' },
] as const;

export type SpacePostAudience = (typeof SPACE_POST_AUDIENCES)[number]['id'];

export function isSpacePostAudience(value: unknown): value is SpacePostAudience {
  return typeof value === 'string' && SPACE_POST_AUDIENCES.some((a) => a.id === value);
}

/**
 * A Space post is never wider than the Space itself: a followers-only Space
 * cannot publish something "public", because the page it lives on is gated.
 */
export function clampAudienceToVisibility(audience: unknown, visibility: unknown): SpacePostAudience {
  const wanted: SpacePostAudience = isSpacePostAudience(audience) ? audience : 'public';
  if (visibility === 'private') return 'private';
  if (visibility === 'followers' && wanted === 'public') return 'followers';
  return wanted;
}

export const SPACE_COMPOSER_LIMITS = {
  text: { max: 5000 },
  altText: { max: 400 },
  pollOption: { max: 80 },
  pollOptions: { min: 2, max: 8 },
  mediaPerPost: { max: 10 },
  hashtags: { max: 30 },
  scheduleMinLeadMinutes: 5,
  scheduleMaxDaysAhead: 365,
} as const;

// ──────────────────────────────────────────────────────────────
// Advanced composer (MP2 §7)
// ──────────────────────────────────────────────────────────────

/** Draft the composer round-trips. The server re-validates every field. */
export interface SpaceComposerDraft {
  spaceId: string;
  kind: SpaceContentKind;
  text: string;
  media: { url: string; type: string; altText?: string }[];
  pollOptions: string[];
  pollDurationHours: number | null;
  linkUrl: string | null;
  location: string | null;
  feeling: string | null;
  audience: SpacePostAudience;
  scheduledFor: string | null;
  publishAsDraft: boolean;
  pinned: boolean;
  commentsDisabled: boolean;
  sharingDisabled: boolean;
  allowDownload: boolean;
  isSensitive: boolean;
  hashtags: string[];
  ctaType: SpaceCtaType | null;
  ctaUrl: string | null;
  offeringId: string | null;
}

export function emptyComposerDraft(spaceId: string, kind: SpaceContentKind = 'TEXT'): SpaceComposerDraft {
  return {
    spaceId,
    kind,
    text: '',
    media: [],
    pollOptions: ['', ''],
    pollDurationHours: 24,
    linkUrl: null,
    location: null,
    feeling: null,
    audience: 'public',
    scheduledFor: null,
    publishAsDraft: false,
    pinned: false,
    commentsDisabled: false,
    sharingDisabled: false,
    allowDownload: true,
    isSensitive: false,
    hashtags: [],
    ctaType: null,
    ctaUrl: null,
    offeringId: null,
  };
}

export interface ComposerValidation {
  ok: boolean;
  errors: string[];
}

/**
 * The rules the publish route enforces. Running them client-side is a
 * convenience for instant feedback, never the gate — both sides call this exact
 * function so the messages match.
 */
export function validateComposerDraft(draft: SpaceComposerDraft, nowMs: number): ComposerValidation {
  const errors: string[] = [];
  const text = (draft.text || '').trim();
  const media = draft.media || [];
  const hasMedia = media.length > 0;

  if (text.length > SPACE_COMPOSER_LIMITS.text.max) {
    errors.push(`Keep the text under ${SPACE_COMPOSER_LIMITS.text.max} characters.`);
  }
  if (media.length > SPACE_COMPOSER_LIMITS.mediaPerPost.max) {
    errors.push(`You can attach up to ${SPACE_COMPOSER_LIMITS.mediaPerPost.max} files.`);
  }
  if (media.some((m) => (m.altText || '').length > SPACE_COMPOSER_LIMITS.altText.max)) {
    errors.push('One of the accessibility descriptions is too long.');
  }

  switch (draft.kind) {
    case 'PHOTO':
    case 'VIDEO':
    case 'GIF':
      if (!hasMedia) errors.push('Add a file to post this.');
      break;
    case 'CAROUSEL':
      if (media.length < 2) errors.push('A carousel needs at least two files.');
      break;
    case 'POLL': {
      const options = (draft.pollOptions || []).map((o) => (o || '').trim()).filter(Boolean);
      if (options.length < SPACE_COMPOSER_LIMITS.pollOptions.min) {
        errors.push('A poll needs at least two options.');
      }
      if (options.length > SPACE_COMPOSER_LIMITS.pollOptions.max) {
        errors.push(`A poll can have at most ${SPACE_COMPOSER_LIMITS.pollOptions.max} options.`);
      }
      if (options.some((o) => o.length > SPACE_COMPOSER_LIMITS.pollOption.max)) {
        errors.push('One of the poll options is too long.');
      }
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
        errors.push('Poll options must differ from each other.');
      }
      if (!text) errors.push('Add a question for the poll.');
      break;
    }
    case 'LINK':
      if (!normalizeWebsiteUrl(draft.linkUrl)) errors.push('Add a valid link.');
      break;
    case 'OFFERING_POST':
      if (!draft.offeringId) errors.push('Pick which product or service this is about.');
      break;
    default:
      if (!text && !hasMedia) errors.push('Write something or add a file.');
  }

  if (draft.scheduledFor) {
    const when = Date.parse(draft.scheduledFor);
    if (!Number.isFinite(when)) {
      errors.push('That schedule time is not valid.');
    } else {
      const minMs = nowMs + SPACE_COMPOSER_LIMITS.scheduleMinLeadMinutes * 60_000;
      const maxMs = nowMs + SPACE_COMPOSER_LIMITS.scheduleMaxDaysAhead * 86_400_000;
      if (when < minMs) {
        errors.push(`Schedule at least ${SPACE_COMPOSER_LIMITS.scheduleMinLeadMinutes} minutes ahead.`);
      }
      if (when > maxMs) errors.push('That is too far in the future.');
    }
    if (draft.publishAsDraft) errors.push('A post cannot be both a draft and scheduled.');
  }

  if (draft.ctaType && draft.ctaType !== 'NONE' && spaceCtaDef(draft.ctaType).needsUrl) {
    if (!normalizeWebsiteUrl(draft.ctaUrl)) errors.push('That button needs a valid link.');
  }

  if ((draft.hashtags || []).length > SPACE_COMPOSER_LIMITS.hashtags.max) {
    errors.push(`Use at most ${SPACE_COMPOSER_LIMITS.hashtags.max} hashtags.`);
  }

  return { ok: errors.length === 0, errors };
}

/** Resolves the Post.status column from the draft's stated intent. */
export function resolvePostStatus(draft: {
  publishAsDraft?: boolean;
  scheduledFor?: string | null;
}): 'published' | 'draft' | 'scheduled' {
  if (draft.publishAsDraft) return 'draft';
  if (draft.scheduledFor) return 'scheduled';
  return 'published';
}

/** Pull `#tags` from body text so composer and server agree on the tag list. */
export function extractHashtags(text: unknown): string[] {
  const value = String(text ?? '');
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /#([a-zA-Z0-9_À-ɏঀ-৿]{2,50})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const tag = match[1].toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= SPACE_COMPOSER_LIMITS.hashtags.max) break;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
// Comments & moderation (MP2 §8)
// ──────────────────────────────────────────────────────────────

/** Reuses PostComment.status values that already exist in the schema. */
export const SPACE_COMMENT_STATUSES = ['visible', 'pending', 'hidden', 'deleted'] as const;
export type SpaceCommentStatus = (typeof SPACE_COMMENT_STATUSES)[number];

export const SPACE_COMMENT_ACTIONS = [
  { id: 'hide', label: 'Hide', blurb: 'Only the author still sees it', icon: 'EyeOff' },
  { id: 'show', label: 'Unhide', blurb: 'Make it visible again', icon: 'Eye' },
  { id: 'approve', label: 'Approve', blurb: 'Publish a held comment', icon: 'Check' },
  { id: 'delete', label: 'Delete', blurb: 'Remove it from the Space', icon: 'Trash2' },
  { id: 'pin', label: 'Pin', blurb: 'Keep it at the top', icon: 'Pin' },
  { id: 'unpin', label: 'Unpin', blurb: 'Return it to normal order', icon: 'PinOff' },
] as const;

export type SpaceCommentAction = (typeof SPACE_COMMENT_ACTIONS)[number]['id'];

export function isSpaceCommentAction(value: unknown): value is SpaceCommentAction {
  return typeof value === 'string' && SPACE_COMMENT_ACTIONS.some((a) => a.id === value);
}

/**
 * What a Space can do to a person, short of a platform-level report. RESTRICTED
 * still lets them comment but nobody else sees it (no public humiliation, no
 * silent confusion for moderators); BANNED blocks interaction outright.
 */
export const SPACE_AUDIENCE_SANCTIONS = [
  {
    id: 'RESTRICTED',
    label: 'Restrict',
    blurb: 'Their comments stay hidden from everyone but them.',
    icon: 'UserMinus',
  },
  {
    id: 'BANNED',
    label: 'Ban',
    blurb: 'They cannot comment, review or message this Space.',
    icon: 'Ban',
  },
  {
    id: 'MUTED',
    label: 'Mute',
    blurb: 'They stay a follower but drop out of your notifications.',
    icon: 'BellOff',
  },
] as const;

export type SpaceSanction = (typeof SPACE_AUDIENCE_SANCTIONS)[number]['id'];

export function isSpaceSanction(value: unknown): value is SpaceSanction {
  return typeof value === 'string' && SPACE_AUDIENCE_SANCTIONS.some((s) => s.id === value);
}

/** Built-in filter lists an owner can switch on without writing words out. */
export const SPACE_KEYWORD_PRESETS = [
  {
    id: 'spam',
    label: 'Spam & scams',
    blurb: 'Get-rich pitches, fake giveaways, "DM me" bait.',
    words: [
      'make money fast',
      'get rich quick',
      'investment opportunity',
      'crypto giveaway',
      'double your',
      'click my bio',
      'dm me for',
      'whatsapp me',
      'forex signal',
      'binary option',
      'free followers',
      'promo code dm',
    ],
  },
  {
    id: 'abuse',
    label: 'Abuse & harassment',
    blurb: 'Common slurs and direct insults.',
    words: ['idiot', 'stupid', 'moron', 'loser', 'trash account', 'shut up', 'nobody asked', 'kill yourself'],
  },
  {
    id: 'links',
    label: 'Links',
    blurb: 'Any comment containing a URL is held for review.',
    words: [],
    matchesLinks: true,
  },
] as const;

export type SpaceKeywordPresetId = (typeof SPACE_KEYWORD_PRESETS)[number]['id'];

export function isSpaceKeywordPreset(value: unknown): value is SpaceKeywordPresetId {
  return typeof value === 'string' && SPACE_KEYWORD_PRESETS.some((p) => p.id === value);
}

/** What happens when a filter matches. Never a silent user-level punishment. */
export const KEYWORD_FILTER_ACTIONS = [
  { id: 'HOLD', label: 'Hold for review', blurb: 'Nobody sees it until you approve it.' },
  { id: 'HIDE', label: 'Hide automatically', blurb: 'Hidden from the Space, author keeps their copy.' },
  { id: 'FLAG', label: 'Flag only', blurb: 'Stays visible, appears in your moderation queue.' },
] as const;

export type KeywordFilterAction = (typeof KEYWORD_FILTER_ACTIONS)[number]['id'];

export function isKeywordFilterAction(value: unknown): value is KeywordFilterAction {
  return typeof value === 'string' && KEYWORD_FILTER_ACTIONS.some((a) => a.id === value);
}

export const MAX_SPACE_KEYWORDS = 300;
export const SPACE_KEYWORD_MAX_LEN = 60;

/** Moderation configuration, stored on the Space settings blob. */
export interface SpaceModerationSettings {
  requireApproval: boolean;
  presets: SpaceKeywordPresetId[];
  customWords: string[];
  filterAction: KeywordFilterAction;
  blockLinks: boolean;
  holdFromNonFollowers: boolean;
  hideOffensive: boolean;
}

export function defaultModerationSettings(): SpaceModerationSettings {
  return {
    requireApproval: false,
    presets: ['spam'],
    customWords: [],
    filterAction: 'HOLD',
    blockLinks: false,
    holdFromNonFollowers: false,
    hideOffensive: true,
  };
}

export function parseModerationSettings(raw: unknown): SpaceModerationSettings {
  const base = defaultModerationSettings();
  const parsed = parseJsonObject(raw);
  if (!parsed) return base;
  const presets = (parseJsonArray(parsed.presets) || []).filter(isSpaceKeywordPreset);
  const words = (parseJsonArray(parsed.customWords) || [])
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && w.length <= SPACE_KEYWORD_MAX_LEN)
    .slice(0, MAX_SPACE_KEYWORDS);
  return {
    requireApproval: parsed.requireApproval === true,
    presets: presets.length ? presets : [],
    customWords: Array.from(new Set(words)),
    filterAction: isKeywordFilterAction(parsed.filterAction) ? parsed.filterAction : base.filterAction,
    blockLinks: parsed.blockLinks === true,
    holdFromNonFollowers: parsed.holdFromNonFollowers === true,
    hideOffensive: parsed.hideOffensive !== false,
  };
}

/** Every word the current configuration watches for, presets expanded. */
export function activeKeywordList(settings: SpaceModerationSettings): string[] {
  const out = new Set<string>(settings.customWords);
  for (const preset of settings.presets) {
    const def = SPACE_KEYWORD_PRESETS.find((p) => p.id === preset);
    for (const word of def?.words || []) out.add(word);
  }
  return Array.from(out);
}

const URL_IN_TEXT_RE = /(https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(com|net|org|io|co|me|ru|xyz|top|shop|link|info|biz)\b/i;

export interface KeywordMatch {
  matched: boolean;
  /** The concrete word or rule that fired — recorded so a moderator can see
   *  *why* a comment was held rather than guessing. */
  reason: string | null;
  action: KeywordFilterAction | null;
}

/**
 * A single stored filter word that carries its own action, as opposed to the
 * blanket `customWords` list that shares the settings-level `filterAction`.
 */
export interface SpaceKeywordRule {
  word: string;
  action: KeywordFilterAction;
}

/**
 * Decide what a comment triggers. Deliberately explicit about the reason: the
 * spec forbids punishing people without clear moderation logic, so every
 * automatic action carries the rule that caused it into the audit record.
 *
 * `context.rules` are per-word rules with their own action. They are matched
 * here — rather than the caller inferring which rule fired from the returned
 * reason text — because that inference misfires: a rule for the word "link"
 * would claim the decision on a comment held for "contains a link" without the
 * word ever appearing.
 */
export function matchKeywordFilters(
  text: unknown,
  settings: SpaceModerationSettings,
  context?: { isFollower?: boolean; rules?: SpaceKeywordRule[] },
): KeywordMatch {
  const raw = String(text ?? '');
  const value = raw.toLowerCase();
  if (!value.trim()) return { matched: false, reason: null, action: null };

  // An explicit per-word rule is the most specific instruction the owner gave,
  // so it is checked before the blanket link and preset rules and keeps its own
  // action instead of inheriting `filterAction`.
  for (const rule of context?.rules || []) {
    const word = String(rule?.word || '').trim().toLowerCase();
    if (!word) continue;
    if (value.includes(word)) {
      return {
        matched: true,
        reason: `matched "${word}"`,
        action: isKeywordFilterAction(rule.action) ? rule.action : settings.filterAction,
      };
    }
  }

  if (settings.blockLinks && URL_IN_TEXT_RE.test(raw)) {
    return { matched: true, reason: 'contains a link', action: settings.filterAction };
  }
  if (settings.presets.includes('links') && URL_IN_TEXT_RE.test(raw)) {
    return { matched: true, reason: 'contains a link', action: settings.filterAction };
  }

  for (const word of activeKeywordList(settings)) {
    if (!word) continue;
    if (value.includes(word.toLowerCase())) {
      return { matched: true, reason: `matched "${word}"`, action: settings.filterAction };
    }
  }

  if (settings.holdFromNonFollowers && context && context.isFollower === false) {
    return { matched: true, reason: 'from someone who does not follow this Space', action: 'HOLD' };
  }

  return { matched: false, reason: null, action: null };
}

/** Maps a filter decision onto the PostComment.status column. */
export function statusForKeywordAction(action: KeywordFilterAction | null): SpaceCommentStatus {
  if (action === 'HOLD') return 'pending';
  if (action === 'HIDE') return 'hidden';
  return 'visible';
}

// ──────────────────────────────────────────────────────────────
// Space inbox (MP2 §9, §10, §11)
// ──────────────────────────────────────────────────────────────

/**
 * A Space conversation is `User → WevSpace`, never `User → owner's personal
 * account`. The Conversation row carries `spaceId`, and each outbound message
 * carries `authorType: 'SPACE'` plus the acting human in `senderId` so the
 * identity shown is the Space while the audit trail keeps the person.
 */
export const SPACE_MESSAGE_AUTHOR_TYPES = ['USER', 'SPACE'] as const;
export type SpaceMessageAuthorType = (typeof SPACE_MESSAGE_AUTHOR_TYPES)[number];

/** Folders in the owner-side inbox. */
export const SPACE_INBOX_FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'Inbox', blurb: 'Everything accepted and open' },
  { id: 'requests', label: 'Requests', icon: 'UserPlus', blurb: 'First-time senders awaiting acceptance' },
  { id: 'unread', label: 'Unread', icon: 'Mail', blurb: 'Not opened yet' },
  { id: 'assigned', label: 'Assigned', icon: 'UserCheck', blurb: 'Handed to a specific teammate' },
  { id: 'resolved', label: 'Resolved', icon: 'CheckCircle2', blurb: 'Closed conversations' },
  { id: 'spam', label: 'Spam', icon: 'ShieldAlert', blurb: 'Filtered or reported' },
] as const;

export type SpaceInboxFolder = (typeof SPACE_INBOX_FOLDERS)[number]['id'];

export function isSpaceInboxFolder(value: unknown): value is SpaceInboxFolder {
  return typeof value === 'string' && SPACE_INBOX_FOLDERS.some((f) => f.id === value);
}

/**
 * Thread state, stored on WevSpaceInboxThread. `PENDING` is a message request
 * the Space has not accepted; the sender still sees their own message, which is
 * why requests are a state rather than a hidden table.
 */
export const SPACE_THREAD_STATUSES = ['PENDING', 'OPEN', 'RESOLVED', 'SPAM', 'ARCHIVED'] as const;
export type SpaceThreadStatus = (typeof SPACE_THREAD_STATUSES)[number];

export const SPACE_THREAD_STATUS_LABELS: Record<SpaceThreadStatus, string> = {
  PENDING: 'Request',
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  SPAM: 'Spam',
  ARCHIVED: 'Archived',
};

export function isSpaceThreadStatus(value: unknown): value is SpaceThreadStatus {
  return typeof value === 'string' && (SPACE_THREAD_STATUSES as readonly string[]).includes(value);
}

/** Which statuses a folder shows — one definition for the UI and the query. */
export function threadStatusesForFolder(folder: SpaceInboxFolder): SpaceThreadStatus[] {
  switch (folder) {
    case 'requests':
      return ['PENDING'];
    case 'resolved':
      return ['RESOLVED'];
    case 'spam':
      return ['SPAM'];
    case 'unread':
    case 'assigned':
    case 'inbox':
    default:
      return ['OPEN'];
  }
}

/** Colour-coded labels a team can pin on a conversation. */
export const SPACE_THREAD_LABELS = [
  { id: 'question', label: 'Question', tone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { id: 'order', label: 'Order', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  { id: 'support', label: 'Support', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { id: 'lead', label: 'Lead', tone: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  { id: 'complaint', label: 'Complaint', tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  { id: 'follow_up', label: 'Follow up', tone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
] as const;

export type SpaceThreadLabel = (typeof SPACE_THREAD_LABELS)[number]['id'];

export function isSpaceThreadLabel(value: unknown): value is SpaceThreadLabel {
  return typeof value === 'string' && SPACE_THREAD_LABELS.some((l) => l.id === value);
}

export function spaceThreadLabelDef(id: unknown) {
  return SPACE_THREAD_LABELS.find((l) => l.id === id) || null;
}

export const MAX_THREAD_LABELS = 5;

export function sanitizeThreadLabels(raw: unknown): SpaceThreadLabel[] {
  const list = parseJsonArray(raw) || [];
  const seen = new Set<SpaceThreadLabel>();
  for (const value of list) {
    if (isSpaceThreadLabel(value)) seen.add(value);
    if (seen.size >= MAX_THREAD_LABELS) break;
  }
  return SPACE_THREAD_LABELS.filter((l) => seen.has(l.id)).map((l) => l.id);
}

/**
 * Canned message kinds (MP2 §10 business features). WELCOME and AWAY fire
 * automatically; QUICK_REPLY and FAQ are picked by a human.
 */
export const SPACE_CANNED_KINDS = [
  {
    id: 'KEYWORD_REPLY',
    label: 'Keyword reply',
    blurb: 'Sent automatically when a message contains specific keywords.',
    icon: 'MessageSquareShare',
    automatic: true,
    single: false,
  },
  {
    id: 'WELCOME',
    label: 'Welcome message',
    blurb: 'Sent once, the first time somebody messages this Space.',
    icon: 'HandHeart',
    automatic: true,
    single: true,
  },
  {
    id: 'AWAY',
    label: 'Away message',
    blurb: 'Sent outside your business hours so nobody waits in silence.',
    icon: 'MoonStar',
    automatic: true,
    single: true,
  },
  {
    id: 'FAQ',
    label: 'FAQ',
    blurb: 'A question and answer people can tap straight away.',
    icon: 'HelpCircle',
    automatic: false,
    single: false,
  },
  {
    id: 'QUICK_REPLY',
    label: 'Quick reply',
    blurb: 'A saved answer your team can insert in one tap.',
    icon: 'Zap',
    automatic: false,
    single: false,
  },
] as const;

export type SpaceCannedKind = (typeof SPACE_CANNED_KINDS)[number]['id'];

export function isSpaceCannedKind(value: unknown): value is SpaceCannedKind {
  return typeof value === 'string' && SPACE_CANNED_KINDS.some((k) => k.id === value);
}

export function spaceCannedKindDef(id: unknown) {
  return SPACE_CANNED_KINDS.find((k) => k.id === id) || null;
}

export const SPACE_CANNED_LIMITS = {
  title: { max: 120 },
  body: { max: 1000 },
  shortcut: { max: 30 },
  perKind: 50,
} as const;

/**
 * Are we inside the Space's published business hours right now? Drives the away
 * message. `nowMinutes` is minutes-since-midnight in the Space's own day and
 * `dayId` the weekday, both computed by the caller so this stays pure and
 * timezone-agnostic.
 */
export function isWithinBusinessHours(
  hours: BusinessHours | null,
  dayId: WeekDayId,
  nowMinutes: number,
): boolean {
  if (!hours) return true;
  const day = hours[dayId];
  if (!day || day.closed) return false;
  const toMinutes = (value: string): number | null => {
    const match = TIME_RE.exec(value);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open === null || close === null) return true;
  // A close time before the open time means the shift runs past midnight.
  if (close <= open) return nowMinutes >= open || nowMinutes < close;
  return nowMinutes >= open && nowMinutes < close;
}

/** Header line shown while composing as a Space, e.g. "Replying as ✓ Studio". */
export function actingAsLabel(input: {
  name?: unknown;
  verificationStatus?: unknown;
  verb?: string;
}): string {
  const verb = input.verb || 'Posting as';
  const tick = isVerifiedSpace(input.verificationStatus) ? '✓ ' : '';
  return `${verb}: ${tick}${String(input.name ?? 'this Space')}`;
}

// ──────────────────────────────────────────────────────────────
// Followers (MP2 §12)
// ──────────────────────────────────────────────────────────────

/** Where a follow came from, for the "follower source" breakdown. */
export const FOLLOWER_SOURCES = [
  { id: 'profile', label: 'Space page' },
  { id: 'explore', label: 'Explore' },
  { id: 'search', label: 'Search' },
  { id: 'post', label: 'A post' },
  { id: 'reel', label: 'A reel' },
  { id: 'story', label: 'A story' },
  { id: 'share', label: 'Shared link' },
  { id: 'suggestion', label: 'Suggested for you' },
  { id: 'event', label: 'An event' },
  { id: 'other', label: 'Elsewhere' },
] as const;

export type FollowerSource = (typeof FOLLOWER_SOURCES)[number]['id'];

export function isFollowerSource(value: unknown): value is FollowerSource {
  return typeof value === 'string' && FOLLOWER_SOURCES.some((s) => s.id === value);
}

export function normalizeFollowerSource(value: unknown): FollowerSource {
  return isFollowerSource(value) ? value : 'other';
}

export const FOLLOWER_LIST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'restricted', label: 'Restricted' },
  { id: 'muted', label: 'Muted' },
  { id: 'banned', label: 'Banned' },
] as const;

export type FollowerListFilter = (typeof FOLLOWER_LIST_FILTERS)[number]['id'];

export function isFollowerListFilter(value: unknown): value is FollowerListFilter {
  return typeof value === 'string' && FOLLOWER_LIST_FILTERS.some((f) => f.id === value);
}

/** Net growth over a window, computed from daily stat rows. */
export function netFollowerGrowth(days: readonly { newFollowers?: number; lostFollowers?: number }[]): {
  gained: number;
  lost: number;
  net: number;
} {
  let gained = 0;
  let lost = 0;
  for (const day of days) {
    gained += Number(day.newFollowers) || 0;
    lost += Number(day.lostFollowers) || 0;
  }
  return { gained, lost, net: gained - lost };
}

// ──────────────────────────────────────────────────────────────
// Events (MP2 §15)
// ──────────────────────────────────────────────────────────────

export const SPACE_EVENT_MODES = [
  { id: 'IN_PERSON', label: 'In person', icon: 'MapPin', needsLocation: true, needsUrl: false },
  { id: 'ONLINE', label: 'Online', icon: 'Video', needsLocation: false, needsUrl: true },
  { id: 'HYBRID', label: 'Both', icon: 'Globe2', needsLocation: true, needsUrl: true },
] as const;

export type SpaceEventMode = (typeof SPACE_EVENT_MODES)[number]['id'];

export function isSpaceEventMode(value: unknown): value is SpaceEventMode {
  return typeof value === 'string' && SPACE_EVENT_MODES.some((m) => m.id === value);
}

export function spaceEventModeDef(id: unknown) {
  return SPACE_EVENT_MODES.find((m) => m.id === id) || SPACE_EVENT_MODES[0];
}

export const SPACE_EVENT_VISIBILITIES = ['public', 'followers', 'private'] as const;
export type SpaceEventVisibility = (typeof SPACE_EVENT_VISIBILITIES)[number];

/** How people sign up. EXTERNAL hands off to the organiser's own form. */
export const EVENT_REGISTRATION_MODES = [
  { id: 'NONE', label: 'No registration', blurb: 'People just mark themselves as going.' },
  { id: 'RSVP', label: 'RSVP on Wevsoft', blurb: 'Track a guest list with a capacity limit.' },
  { id: 'EXTERNAL', label: 'External link', blurb: 'Send people to your own ticket or form page.' },
] as const;

export type EventRegistrationMode = (typeof EVENT_REGISTRATION_MODES)[number]['id'];

export function isEventRegistrationMode(value: unknown): value is EventRegistrationMode {
  return typeof value === 'string' && EVENT_REGISTRATION_MODES.some((m) => m.id === value);
}

/** Matches the existing EventAttendee.status values. */
export const EVENT_ATTENDEE_STATUSES = ['interested', 'going', 'not_going'] as const;
export type EventAttendeeStatus = (typeof EVENT_ATTENDEE_STATUSES)[number];

export function isEventAttendeeStatus(value: unknown): value is EventAttendeeStatus {
  return typeof value === 'string' && (EVENT_ATTENDEE_STATUSES as readonly string[]).includes(value);
}

export const EVENT_REMINDER_CHOICES = [
  { id: 0, label: 'No reminder' },
  { id: 15, label: '15 minutes before' },
  { id: 60, label: '1 hour before' },
  { id: 1440, label: '1 day before' },
  { id: 10080, label: '1 week before' },
] as const;

export const SPACE_EVENT_LIMITS = {
  title: { min: 3, max: 140 },
  description: { max: 5000 },
  location: { max: 200 },
  onlineUrl: { max: 500 },
  capacity: { max: 1_000_000 },
  /** Past events are kept forever; only the upcoming list is bounded. */
  maxUpcoming: 50,
} as const;

export interface SpaceEventDraft {
  title: string;
  description: string;
  cover: string | null;
  category: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  mode: SpaceEventMode;
  location: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  visibility: SpaceEventVisibility;
  registrationMode: EventRegistrationMode;
  registrationUrl: string | null;
  reminderMinutes: number;
}

/** Same checks the route runs; shared so both sides show identical messages. */
export function validateEventDraft(draft: SpaceEventDraft, nowMs: number): ComposerValidation {
  const errors: string[] = [];
  const title = (draft.title || '').trim();
  if (title.length < SPACE_EVENT_LIMITS.title.min) errors.push('Give the event a name.');
  if (title.length > SPACE_EVENT_LIMITS.title.max) errors.push('That name is too long.');
  if ((draft.description || '').length > SPACE_EVENT_LIMITS.description.max) {
    errors.push('The description is too long.');
  }

  const starts = Date.parse(draft.startsAt || '');
  if (!Number.isFinite(starts)) {
    errors.push('Pick when the event starts.');
  } else if (starts < nowMs - 86_400_000) {
    errors.push('That start time is in the past.');
  }

  if (draft.endsAt) {
    const ends = Date.parse(draft.endsAt);
    if (!Number.isFinite(ends)) errors.push('That end time is not valid.');
    else if (Number.isFinite(starts) && ends <= starts) errors.push('The event must end after it starts.');
  }

  const mode = spaceEventModeDef(draft.mode);
  if (mode.needsLocation && !(draft.location || '').trim()) {
    errors.push('Add where the event takes place.');
  }
  if (mode.needsUrl && !normalizeWebsiteUrl(draft.onlineUrl)) {
    errors.push('Add a valid link for people to join online.');
  }

  if (draft.registrationMode === 'EXTERNAL' && !normalizeWebsiteUrl(draft.registrationUrl)) {
    errors.push('Add a valid registration link.');
  }
  if (draft.registrationMode === 'RSVP' && draft.capacity !== null) {
    const capacity = Number(draft.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > SPACE_EVENT_LIMITS.capacity.max) {
      errors.push('Capacity must be a whole number of at least 1.');
    }
  }

  return { ok: errors.length === 0, errors };
}

/** True when RSVPs must be refused because the guest list is full. */
export function eventIsFull(event: {
  capacity?: number | null;
  goingCount?: number | null;
  registrationMode?: unknown;
}): boolean {
  if (event.registrationMode !== 'RSVP') return false;
  const capacity = Number(event.capacity) || 0;
  if (capacity <= 0) return false;
  return (Number(event.goingCount) || 0) >= capacity;
}

// ──────────────────────────────────────────────────────────────
// Reviews (MP2 §16)
// ──────────────────────────────────────────────────────────────

/**
 * Reviews only make sense where somebody bought, visited or attended something.
 * Asking people to rate a news channel or a personal identity is noise, so those
 * types cannot switch the feature on at all — the spec says not to force reviews
 * onto categories where they make no sense.
 */
export const REVIEWABLE_SPACE_TYPES: readonly SpaceType[] = [
  'BUSINESS',
  'STORE',
  'BRAND',
  'EDUCATION',
  'ORGANIZATION',
  'PROJECT',
];

export function reviewsMakeSenseFor(type: unknown): boolean {
  return REVIEWABLE_SPACE_TYPES.includes(spaceTypeDef(type).id);
}

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

export function isValidReviewRating(value: unknown): boolean {
  const num = Number(value);
  return Number.isInteger(num) && num >= REVIEW_RATING_MIN && num <= REVIEW_RATING_MAX;
}

/** Average plus a 1–5 histogram, for the reviews summary card. */
export function summarizeRatings(ratings: readonly number[]): {
  count: number;
  average: number;
  breakdown: Record<number, number>;
} {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let count = 0;
  for (const raw of ratings) {
    const value = Math.round(Number(raw));
    if (!isValidReviewRating(value)) continue;
    breakdown[value] += 1;
    total += value;
    count += 1;
  }
  return {
    count,
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    breakdown,
  };
}

// ──────────────────────────────────────────────────────────────
// Insights (MP2 §18)
// ──────────────────────────────────────────────────────────────

export const INSIGHT_RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '28d', label: '28 days', days: 28 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'custom', label: 'Custom', days: 0 },
] as const;

export type InsightRange = (typeof INSIGHT_RANGES)[number]['id'];

export const DEFAULT_INSIGHT_RANGE: InsightRange = '28d';

export function isInsightRange(value: unknown): value is InsightRange {
  return typeof value === 'string' && INSIGHT_RANGES.some((r) => r.id === value);
}

/** Longest custom window we will aggregate in one request. */
export const MAX_INSIGHT_DAYS = 400;

/**
 * Turn a range (or an explicit from/to pair) into a concrete day count and
 * bounds. `todayMs` is supplied so the function stays pure and testable.
 */
export function resolveInsightWindow(input: {
  range?: unknown;
  from?: unknown;
  to?: unknown;
  todayMs: number;
}): { range: InsightRange; days: number; fromMs: number; toMs: number } {
  const range: InsightRange = isInsightRange(input.range) ? input.range : DEFAULT_INSIGHT_RANGE;

  if (range === 'custom') {
    const from = Date.parse(String(input.from ?? ''));
    const to = Date.parse(String(input.to ?? ''));
    if (Number.isFinite(from) && Number.isFinite(to) && to >= from) {
      const days = Math.min(MAX_INSIGHT_DAYS, Math.floor((to - from) / 86_400_000) + 1);
      return { range, days, fromMs: to - (days - 1) * 86_400_000, toMs: to };
    }
    // Unusable custom bounds fall back to the default window rather than erroring
    // out — the dashboard should still render something.
    const fallback = INSIGHT_RANGES.find((r) => r.id === DEFAULT_INSIGHT_RANGE);
    const days = fallback ? fallback.days : 28;
    return { range: DEFAULT_INSIGHT_RANGE, days, fromMs: input.todayMs - (days - 1) * 86_400_000, toMs: input.todayMs };
  }

  const def = INSIGHT_RANGES.find((r) => r.id === range);
  const days = def && def.days > 0 ? def.days : 28;
  return { range, days, fromMs: input.todayMs - (days - 1) * 86_400_000, toMs: input.todayMs };
}

/** Panels of the Insights dashboard, each gated on the feature it reports on. */
export const INSIGHT_PANELS = [
  { id: 'overview', label: 'Overview', icon: 'Gauge' },
  { id: 'reach', label: 'Reach', icon: 'Radar' },
  { id: 'engagement', label: 'Engagement', icon: 'Heart' },
  { id: 'followers', label: 'Followers', icon: 'Users' },
  { id: 'content', label: 'Content', icon: 'FileText' },
  { id: 'videos', label: 'Videos', icon: 'Video', feature: 'reels' },
  { id: 'wevchat', label: 'WevChat', icon: 'MessageSquare', feature: 'messaging' },
  { id: 'events', label: 'Events', icon: 'CalendarDays', feature: 'events' },
  { id: 'products', label: 'Products', icon: 'ShoppingBag', feature: 'offerings' },
  { id: 'promotion', label: 'Ads', icon: 'Megaphone' },
  { id: 'revenue', label: 'Revenue', icon: 'Wallet' },
] as const;

export type InsightPanel = (typeof INSIGHT_PANELS)[number]['id'];

export function isInsightPanel(value: unknown): value is InsightPanel {
  return typeof value === 'string' && INSIGHT_PANELS.some((p) => p.id === value);
}

export function visibleInsightPanels(input: { features?: unknown; spaceType?: unknown }) {
  const features = parseFeatureMap(input.features, input.spaceType);
  return INSIGHT_PANELS.filter((panel) => {
    const feature = (panel as { feature?: string }).feature;
    if (!feature) return true;
    return isSpaceFeature(feature) ? features[feature] === true : true;
  });
}

/** One day of the timeseries every chart reads from. */
export interface InsightPoint {
  day: string;
  views: number;
  uniqueViewers: number;
  newFollowers: number;
  lostFollowers: number;
  posts: number;
  reels: number;
  engagements: number;
  ctaClicks: number;
  messages: number;
  profileVisits: number;
}

export function emptyInsightPoint(day: string): InsightPoint {
  return {
    day,
    views: 0,
    uniqueViewers: 0,
    newFollowers: 0,
    lostFollowers: 0,
    posts: 0,
    reels: 0,
    engagements: 0,
    ctaClicks: 0,
    messages: 0,
    profileVisits: 0,
  };
}

/** Period-over-period delta as a rounded percentage; null when there is no base. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Watch-through rate for the video panel, clamped to 0–100. */
export function completionRate(input: { views?: number; completions?: number }): number {
  const views = Number(input.views) || 0;
  if (views <= 0) return 0;
  const done = Number(input.completions) || 0;
  return Math.max(0, Math.min(100, Math.round((done / views) * 1000) / 10));
}

/** Engagement rate against reach, the figure the Overview card leads with. */
export function engagementRate(input: { engagements?: number; reach?: number }): number {
  const reach = Number(input.reach) || 0;
  if (reach <= 0) return 0;
  const engagements = Number(input.engagements) || 0;
  return Math.max(0, Math.round((engagements / reach) * 1000) / 10);
}

export const INSIGHT_EXPORT_FORMATS = ['csv', 'json'] as const;
export type InsightExportFormat = (typeof INSIGHT_EXPORT_FORMATS)[number];

export function isInsightExportFormat(value: unknown): value is InsightExportFormat {
  return typeof value === 'string' && (INSIGHT_EXPORT_FORMATS as readonly string[]).includes(value);
}

// ──────────────────────────────────────────────────────────────
// Promotion / boost (MP2 §19)
// ──────────────────────────────────────────────────────────────

export const CAMPAIGN_TARGET_KINDS = [
  { id: 'SPACE', label: 'This Space', icon: 'Layers', blurb: 'Win followers for the Space itself.' },
  { id: 'POST', label: 'A post', icon: 'FileText', blurb: 'Push one post further than usual.' },
  { id: 'REEL', label: 'A reel', icon: 'Clapperboard', blurb: 'Get a reel in front of more people.' },
  { id: 'OFFERING', label: 'A product', icon: 'ShoppingBag', blurb: 'Drive interest in one item.' },
  { id: 'EVENT', label: 'An event', icon: 'CalendarDays', blurb: 'Fill an event with attendees.' },
] as const;

export type CampaignTargetKind = (typeof CAMPAIGN_TARGET_KINDS)[number]['id'];

export function isCampaignTargetKind(value: unknown): value is CampaignTargetKind {
  return typeof value === 'string' && CAMPAIGN_TARGET_KINDS.some((k) => k.id === value);
}

export const CAMPAIGN_OBJECTIVES = [
  { id: 'WEBSITE_VISITS', label: 'Website visits', blurb: 'Send people to a site or landing page.', icon: 'Globe' },
  { id: 'PROFILE_VISITS', label: 'Profile visits', blurb: 'Drive people to this WevSpace.', icon: 'User' },
  { id: 'MESSAGES', label: 'WevChat', blurb: 'Start conversations in your inbox.', icon: 'MessageSquare' },
  { id: 'ENGAGEMENT', label: 'Engagement', blurb: 'Get reactions, comments and shares.', icon: 'Heart' },
  { id: 'FOLLOWERS', label: 'Followers', blurb: 'Grow the Space audience.', icon: 'UserPlus' },
  { id: 'VIDEO_VIEWS', label: 'Video views', blurb: 'Get more complete views on a reel or video.', icon: 'Play' },
  { id: 'LEADS', label: 'Leads', blurb: 'Collect enquiries from people who want to hear more.', icon: 'ClipboardList' },
  { id: 'PRODUCT_SALES', label: 'Product / sales', blurb: 'Drive interest in a product or checkout.', icon: 'ShoppingBag' },
  { id: 'APP_INSTALLS', label: 'App installs', blurb: 'Send people to download an app.', icon: 'Download' },
  // Legacy ids kept so older campaigns still validate.
  { id: 'REACH', label: 'Reach', blurb: 'Show it to as many people as possible.', icon: 'Radio' },
  { id: 'TRAFFIC', label: 'Traffic', blurb: 'Send people to a link.', icon: 'ExternalLink' },
] as const;

export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number]['id'];

export function isCampaignObjective(value: unknown): value is CampaignObjective {
  return typeof value === 'string' && CAMPAIGN_OBJECTIVES.some((o) => o.id === value);
}

/**
 * Campaign lifecycle. PENDING_REVIEW is mandatory: every campaign is moderated
 * by a platform admin before it can spend or serve (spec §19).
 */
export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  SUSPENDED: 'Suspended',
};

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === 'string' && (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

/** Statuses whose campaigns may actually serve impressions. */
export const SERVING_CAMPAIGN_STATUSES: readonly CampaignStatus[] = ['ACTIVE'];

/** Which owner-initiated transitions are legal. Admin review is separate. */
export const CAMPAIGN_OWNER_TRANSITIONS: Readonly<Record<CampaignStatus, readonly CampaignStatus[]>> = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['CANCELLED'],
  APPROVED: ['CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  SCHEDULED: ['PAUSED', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  SUSPENDED: [],
};

export function canOwnerTransitionCampaign(from: unknown, to: unknown): boolean {
  if (!isCampaignStatus(from) || !isCampaignStatus(to)) return false;
  return CAMPAIGN_OWNER_TRANSITIONS[from].includes(to);
}

export const AUDIENCE_AGE_BRACKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;
export type AudienceAgeBracket = (typeof AUDIENCE_AGE_BRACKETS)[number];

export const AUDIENCE_KINDS = [
  { id: 'BROAD', label: 'Broad', blurb: 'Let Wevsoft find the right people.' },
  { id: 'FOLLOWERS', label: 'Your followers', blurb: 'Only people who already follow this Space.' },
  { id: 'FOLLOWERS_OF_FOLLOWERS', label: 'Friends of followers', blurb: 'People connected to your audience.' },
  { id: 'CUSTOM', label: 'Custom', blurb: 'Pick locations, ages and interests yourself.' },
] as const;

export type AudienceKind = (typeof AUDIENCE_KINDS)[number]['id'];

export function isAudienceKind(value: unknown): value is AudienceKind {
  return typeof value === 'string' && AUDIENCE_KINDS.some((a) => a.id === value);
}

export interface CampaignTargeting {
  kind: AudienceKind;
  locations: string[];
  ages: AudienceAgeBracket[];
  interests: string[];
  languages: string[];
  gender: 'ALL' | 'MALE' | 'FEMALE';
  ageMin: number | null;
  ageMax: number | null;
  country: string | null;
  division: string | null;
  city: string | null;
  radiusKm: number | null;
}

export function defaultTargeting(): CampaignTargeting {
  return {
    kind: 'BROAD',
    locations: [],
    ages: [],
    interests: [],
    languages: [],
    gender: 'ALL',
    ageMin: 18,
    ageMax: 65,
    country: null,
    division: null,
    city: null,
    radiusKm: null,
  };
}

export const CAMPAIGN_LIMITS = {
  name: { min: 3, max: 100 },
  minDailyBudget: 1,
  maxDailyBudget: 10_000,
  minTotalBudget: 5,
  maxTotalBudget: 1_000_000,
  minDurationDays: 1,
  maxDurationDays: 90,
  maxLocations: 25,
  maxInterests: 30,
} as const;

/** Platform floors for Ads Manager (stricter than legacy campaign drafts). */
export const ADS_LIMITS = {
  minDailyBudget: 50,
  minTotalBudget: 200,
  minBidCpc: 0.1,
  minBidCpm: 1,
  minBidCpv: 0.05,
  maxHeadline: 40,
  maxPrimaryText: 220,
  maxDescription: 90,
  maxAltText: 125,
} as const;

export type AdsPricingFloors = {
  minDailyBudget: number;
  minTotalBudget: number;
  minBidCpc: number;
  minBidCpm: number;
  minBidCpv: number;
};

function positiveFloor(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Runtime SystemSettings override ADS_LIMITS; never invent floors in the UI. */
export function adsPricingFloors(overrides?: Partial<AdsPricingFloors> | null): AdsPricingFloors {
  return {
    minDailyBudget: positiveFloor(overrides?.minDailyBudget, ADS_LIMITS.minDailyBudget),
    minTotalBudget: positiveFloor(overrides?.minTotalBudget, ADS_LIMITS.minTotalBudget),
    minBidCpc: positiveFloor(overrides?.minBidCpc, ADS_LIMITS.minBidCpc),
    minBidCpm: positiveFloor(overrides?.minBidCpm, ADS_LIMITS.minBidCpm),
    minBidCpv: positiveFloor(overrides?.minBidCpv, ADS_LIMITS.minBidCpv),
  };
}

export const AD_FORMATS = [
  { id: 'SPONSORED_POST', label: 'Sponsored post', blurb: 'Appears in the feed with a Sponsored label.', placement: 'FEED' },
  { id: 'SPONSORED_REEL', label: 'Sponsored reel', blurb: 'Full-screen vertical, between organic reels.', placement: 'REELS' },
  { id: 'STORY', label: 'Story', blurb: 'Full-screen between Stories.', placement: 'STORY' },
  { id: 'SPACE_PROMOTE', label: 'Promote Space', blurb: 'Boost this WevSpace itself.', placement: 'FEED' },
  { id: 'EXTERNAL', label: 'External / website', blurb: 'Send people off-platform to a URL you control.', placement: 'FEED' },
] as const;

export type AdFormat = (typeof AD_FORMATS)[number]['id'];

export function isAdFormat(value: unknown): value is AdFormat {
  return typeof value === 'string' && AD_FORMATS.some((f) => f.id === value);
}

export function placementForFormat(format: AdFormat): AdPlacement {
  return AD_FORMATS.find((f) => f.id === format)?.placement ?? 'FEED';
}

export const AD_PLACEMENTS = [
  { id: 'FEED', label: 'Feed' },
  { id: 'REELS', label: 'Reels' },
  { id: 'STORY', label: 'Stories' },
  { id: 'WEVSPACE', label: 'WevSpace' },
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number]['id'];

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === 'string' && AD_PLACEMENTS.some((p) => p.id === value);
}

export const BILLING_MODELS = [
  { id: 'CPC', label: 'Cost per click', blurb: 'Pay when someone taps the ad.' },
  { id: 'CPM', label: 'Cost per 1,000 impressions', blurb: 'Pay for how many times it is shown.' },
  { id: 'CPV', label: 'Cost per view', blurb: 'Pay when a video is watched.' },
] as const;

export type AdBillingModel = (typeof BILLING_MODELS)[number]['id'];

export function isAdBillingModel(value: unknown): value is AdBillingModel {
  return typeof value === 'string' && BILLING_MODELS.some((b) => b.id === value);
}

export const AD_CTAS = [
  { id: 'LEARN_MORE', label: 'Learn more' },
  { id: 'SHOP_NOW', label: 'Shop now' },
  { id: 'SIGN_UP', label: 'Sign up' },
  { id: 'CONTACT_US', label: 'Contact us' },
  { id: 'WATCH_MORE', label: 'Watch more' },
  { id: 'DOWNLOAD', label: 'Download' },
  { id: 'BOOK_NOW', label: 'Book now' },
  { id: 'GET_OFFER', label: 'Get offer' },
  { id: 'MESSAGE', label: 'Send message' },
  { id: 'FOLLOW', label: 'Follow' },
] as const;

export type AdCta = (typeof AD_CTAS)[number]['id'];

export function isAdCta(value: unknown): value is AdCta {
  return typeof value === 'string' && AD_CTAS.some((c) => c.id === value);
}

export const AD_DESTINATION_TYPES = ['WESPACE', 'WEBSITE', 'PRODUCT', 'MESSAGE', 'APP'] as const;
export type AdDestinationType = (typeof AD_DESTINATION_TYPES)[number];

export function isAdDestinationType(value: unknown): value is AdDestinationType {
  return typeof value === 'string' && (AD_DESTINATION_TYPES as readonly string[]).includes(value);
}

export const ADVERTISER_ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'PENDING_REVIEW'] as const;
export type AdvertiserAccountStatus = (typeof ADVERTISER_ACCOUNT_STATUSES)[number];

export const AD_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED'] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export interface AdCreativeDraft {
  primaryText: string;
  headline: string;
  description: string;
  cta: AdCta;
  destinationType: AdDestinationType;
  destinationUrl: string | null;
  destinationId: string | null;
  mediaUrls: string[];
  thumbnailUrl: string | null;
  altText: string;
}

export function defaultAdCreative(): AdCreativeDraft {
  return {
    primaryText: '',
    headline: '',
    description: '',
    cta: 'LEARN_MORE',
    destinationType: 'WESPACE',
    destinationUrl: null,
    destinationId: null,
    mediaUrls: [],
    thumbnailUrl: null,
    altText: '',
  };
}

const BLOCKED_AD_URL_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'blob:', 'vbscript:', 'about:']);

function isPrivateAdDestinationHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

/** Only public http/https — never javascript:, data:, credentials, or private hosts. Optional host lists are fail-closed extras. */
export function sanitizeAdDestinationUrl(
  raw: unknown,
  policy?: AdDestinationReputationPolicy | null,
): { ok: true; url: string } | { ok: false; error: string } {
  if (raw == null || raw === '') return { ok: false, error: 'Add a destination URL.' };
  if (typeof raw !== 'string') return { ok: false, error: 'That destination URL is not valid.' };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Add a destination URL.' };
  if (/[\u0000-\u001f\u007f]/.test(trimmed) || trimmed.startsWith('//')) {
    return { ok: false, error: 'That destination URL is not valid.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'That destination URL is not valid.' };
  }
  if (BLOCKED_AD_URL_PROTOCOLS.has(parsed.protocol) || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
    return { ok: false, error: 'Destination URLs must start with http:// or https://.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Destination URLs cannot include credentials.' };
  }
  if (isPrivateAdDestinationHost(parsed.hostname)) {
    return { ok: false, error: 'Destination URLs cannot point at a private or local address.' };
  }
  const live = lookupAdDestinationReputation(parsed.hostname);
  if (live === 'block') {
    return { ok: false, error: 'That destination domain is blocked.' };
  }
  const reputation = evaluateAdDestinationReputation(parsed.hostname, policy);
  if (reputation.ok === false) return reputation;
  return { ok: true, url: parsed.toString() };
}

export interface AdDestinationReputationPolicy {
  blockedHosts?: readonly string[];
  allowedHosts?: readonly string[] | null;
}

function normalizeAdHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

export function hostMatchesAdList(hostname: string, list: readonly string[] | null | undefined): boolean {
  if (!list || !list.length) return false;
  const host = normalizeAdHost(hostname);
  return list.some((entry) => {
    const e = String(entry || '').trim().toLowerCase().replace(/^\*\./, '');
    if (!e) return false;
    return host === e || host.endsWith('.' + e);
  });
}

export function evaluateAdDestinationReputation(
  hostname: string,
  policy?: AdDestinationReputationPolicy | null,
): { ok: true } | { ok: false; error: string } {
  if (hostMatchesAdList(hostname, policy?.blockedHosts)) {
    return { ok: false, error: 'That destination domain is blocked.' };
  }
  const allowed = policy?.allowedHosts;
  if (allowed && allowed.length > 0 && !hostMatchesAdList(hostname, allowed)) {
    return { ok: false, error: 'That destination domain is not on the allowlist.' };
  }
  return { ok: true };
}

/** Live reputation APIs stay stubbed. unknown never overrides fail-closed sanitizer. */
export function lookupAdDestinationReputation(_hostname: string): 'allow' | 'block' | 'unknown' {
  return 'unknown';
}

export function destinationReputationFromSafetyPolicies(
  policies: Array<{ key?: string; isActive?: boolean; rulesJson?: string | null }>,
): AdDestinationReputationPolicy {
  const blocked: string[] = [];
  const allowed: string[] = [];
  for (const policy of policies) {
    if (policy.isActive === false) continue;
    let tokens: string[] = [];
    try {
      const parsed = policy.rulesJson ? JSON.parse(policy.rulesJson) : [];
      tokens = Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === 'string') : [];
    } catch {
      tokens = [];
    }
    const key = String(policy.key || '').toLowerCase();
    if (key === 'destination_blocklist' || key === 'blocked_hosts') blocked.push(...tokens);
    if (key === 'destination_allowlist' || key === 'allowed_hosts') allowed.push(...tokens);
  }
  return { blockedHosts: blocked, allowedHosts: allowed.length ? allowed : null };
}

export function validateAdCreative(draft: AdCreativeDraft, format?: AdFormat): ComposerValidation {
  const errors: string[] = [];
  const primary = (draft.primaryText || '').trim();
  if (!primary) errors.push('Write the primary text for this ad.');
  if (primary.length > ADS_LIMITS.maxPrimaryText) errors.push('Primary text is too long.');
  const headline = (draft.headline || '').trim();
  if (headline.length > ADS_LIMITS.maxHeadline) errors.push('Headline is too long.');
  const description = (draft.description || '').trim();
  if (description.length > ADS_LIMITS.maxDescription) errors.push('Description is too long.');
  if (!isAdCta(draft.cta)) errors.push('Choose a call to action.');
  if (!isAdDestinationType(draft.destinationType)) errors.push('Choose where this ad should send people.');
  const needsUrl = draft.destinationType === 'WEBSITE' || draft.destinationType === 'APP' || format === 'EXTERNAL';
  if (needsUrl || (draft.destinationUrl && String(draft.destinationUrl).trim())) {
    const url = sanitizeAdDestinationUrl(draft.destinationUrl);
    if (url.ok === false) errors.push(url.error);
  }
  const alt = (draft.altText || '').trim();
  if (alt.length > ADS_LIMITS.maxAltText) errors.push('Alt text is too long.');
  return { ok: errors.length === 0, errors };
}

export function validateAdsCampaignDraft(
  draft: CampaignDraft,
  creative?: AdCreativeDraft,
  floors?: Partial<AdsPricingFloors> | null,
): ComposerValidation {
  const limits = adsPricingFloors(floors);
  const base = validateCampaignDraft(draft);
  const errors = [...base.errors];
  if (!isAdFormat(draft.format)) errors.push('Choose an ad format.');
  if (!isAdBillingModel(draft.billingModel)) errors.push('Choose how you want to pay.');
  const daily = Number(draft.dailyBudget);
  if (Number.isFinite(daily) && daily < limits.minDailyBudget) {
    errors.push(`Ads daily budget must be at least ${limits.minDailyBudget}.`);
  }
  const total = Number(draft.totalBudget);
  if (Number.isFinite(total) && total < limits.minTotalBudget) {
    errors.push(`Ads total budget must be at least ${limits.minTotalBudget}.`);
  }
  if (draft.startsAt && draft.endsAt) {
    const start = Date.parse(draft.startsAt);
    const end = Date.parse(draft.endsAt);
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      errors.push('The end date must be on or after the start date.');
    }
  }
  const bid = draft.bidAmount == null ? null : Number(draft.bidAmount);
  if (bid != null && Number.isFinite(bid)) {
    const floor =
      draft.billingModel === 'CPM' ? limits.minBidCpm : draft.billingModel === 'CPV' ? limits.minBidCpv : limits.minBidCpc;
    if (bid < floor) errors.push(`Bid must be at least ${floor} for ${draft.billingModel}.`);
  }
  if (creative) {
    const c = validateAdCreative(creative, draft.format);
    if (c.ok === false) errors.push(...c.errors);
  }
  const seen = new Set<string>();
  const unique = errors.filter((e) => (seen.has(e) ? false : (seen.add(e), true)));
  return { ok: unique.length === 0, errors: unique };
}

export const AD_OBJECTIVES_FOR_UI = CAMPAIGN_OBJECTIVES.filter(
  (o) => o.id !== 'REACH' && o.id !== 'TRAFFIC',
);

// ── Ads Step 2: wallet, reports, delivery ─────────────────

export const AD_WALLET_TX_TYPES = [
  'DEPOSIT',
  'CAMPAIGN_RESERVATION',
  'RESERVATION_RELEASE',
  'IMPRESSION_CHARGE',
  'CLICK_CHARGE',
  'VIEW_CHARGE',
  'REFUND',
  'ADJUSTMENT',
] as const;
export type AdWalletTxType = (typeof AD_WALLET_TX_TYPES)[number];

export function isAdWalletTxType(value: unknown): value is AdWalletTxType {
  return typeof value === 'string' && (AD_WALLET_TX_TYPES as readonly string[]).includes(value);
}

export const AD_WALLET_TX_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'] as const;
export type AdWalletTxStatus = (typeof AD_WALLET_TX_STATUSES)[number];

export const AD_REPORT_REASONS = [
  { id: 'MISLEADING', label: 'Misleading' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'SCAM', label: 'Scam' },
  { id: 'OFFENSIVE', label: 'Offensive' },
  { id: 'IRRELEVANT', label: 'Irrelevant' },
  { id: 'UNSAFE', label: 'Unsafe' },
  { id: 'OTHER', label: 'Other' },
] as const;
export type AdReportReason = (typeof AD_REPORT_REASONS)[number]['id'];

export function isAdReportReason(value: unknown): value is AdReportReason {
  return typeof value === 'string' && AD_REPORT_REASONS.some((r) => r.id === value);
}

export const AD_USER_PREF_ACTIONS = ['HIDE', 'NOT_RELEVANT'] as const;
export type AdUserPrefAction = (typeof AD_USER_PREF_ACTIONS)[number];

export const AD_DELIVERY_EVENT_KINDS = ['impression', 'click', 'view'] as const;
export type AdDeliveryEventKind = (typeof AD_DELIVERY_EVENT_KINDS)[number];

export const ADS_RUNTIME_DEFAULTS = {
  frequencyCapPerDay: 3,
  feedGap: 4,
  impressionDwellMs: 1000,
  minDeposit: 100,
  maxDeposit: 500_000,
  clickDedupWindowMs: 30_000,
  servingEnabled: true,
  coldStartCtr: 0.01,
  qualityFloor: 0.5,
  qualityCeiling: 1.4,
  abMinImpressions: 200,
  pacingEarlyHourFraction: 0.2,
} as const;

/** Platform take-rate in basis points. 1500 = 15%. Existing ledger rows stay immutable. */
export const ADS_TAKE_RATE_DEFAULT_BPS = 0;
export const ADS_TAKE_RATE_MAX_BPS = 10_000;

export function clampAdsTakeRateBps(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return ADS_TAKE_RATE_DEFAULT_BPS;
  return Math.min(ADS_TAKE_RATE_MAX_BPS, Math.max(0, n));
}

export function adsTakeRatePercent(takeRateBps: number): number {
  return clampAdsTakeRateBps(takeRateBps) / 100;
}

/** Platform take from advertiser net spend. Never treats gross charges as revenue. */
export function platformTakeFromNetSpend(netSpend: number, takeRateBps: number): number {
  const spend = Math.max(0, Number(netSpend) || 0);
  const bps = clampAdsTakeRateBps(takeRateBps);
  return Math.round((spend * bps) / 100) / 100;
}

export const ADS_AUCTION = {
  /** Bid × estimatedActionRate × qualityFactor — never pick highest bid alone. */
  formula: 'bid * estimatedActionRate * qualityFactor * placementMultiplier',
} as const;

export interface AdAuctionInput {
  bid: number;
  estimatedActionRate: number;
  qualityFactor: number;
  placementMultiplier: number;
}

export function scoreAdCandidate(input: AdAuctionInput): number {
  const bid = Math.max(0, Number(input.bid) || 0);
  const rate = Math.max(0.0001, Number(input.estimatedActionRate) || ADS_RUNTIME_DEFAULTS.coldStartCtr);
  const quality = Math.min(
    ADS_RUNTIME_DEFAULTS.qualityCeiling,
    Math.max(ADS_RUNTIME_DEFAULTS.qualityFloor, Number(input.qualityFactor) || 1),
  );
  const multiplier = Math.max(0.1, Number(input.placementMultiplier) || 1);
  return bid * rate * quality * multiplier;
}

export function estimatedActionRate(impressions: number, clicks: number): number {
  const imps = Math.max(0, Number(impressions) || 0);
  const c = Math.max(0, Number(clicks) || 0);
  if (imps < 50) return ADS_RUNTIME_DEFAULTS.coldStartCtr;
  return Math.min(0.5, Math.max(0.0001, c / imps));
}

export function creativeQualityFactor(input: {
  hasPrimaryText?: boolean;
  hasMedia?: boolean;
  hasHeadline?: boolean;
  spaceVerified?: boolean;
  spacePublished?: boolean;
}): number {
  let q = 0.7;
  if (input.hasPrimaryText) q += 0.1;
  if (input.hasMedia) q += 0.15;
  if (input.hasHeadline) q += 0.05;
  if (input.spaceVerified) q += 0.15;
  if (input.spacePublished === false) q = ADS_RUNTIME_DEFAULTS.qualityFloor;
  return Math.min(ADS_RUNTIME_DEFAULTS.qualityCeiling, Math.max(ADS_RUNTIME_DEFAULTS.qualityFloor, q));
}

/**
 * Basic budget pacing: refuse to spend the whole daily budget in the first hours.
 * Returns a 0–1 delivery probability (1 = unconstrained).
 */
export function pacingAllowance(input: {
  dailyBudget: number;
  spentToday: number;
  hourOfDay: number;
  remainingTotal: number;
}): { allow: boolean; weight: number } {
  const daily = Math.max(0, Number(input.dailyBudget) || 0);
  const spent = Math.max(0, Number(input.spentToday) || 0);
  const remaining = Math.max(0, Number(input.remainingTotal) || 0);
  if (remaining <= 0) return { allow: false, weight: 0 };
  if (daily <= 0) return { allow: true, weight: 1 };
  if (spent >= daily) return { allow: false, weight: 0 };
  const hour = Math.min(23, Math.max(0, Number(input.hourOfDay) || 0));
  const elapsedFrac = (hour + 1) / 24;
  const expected = daily * Math.max(ADS_RUNTIME_DEFAULTS.pacingEarlyHourFraction, elapsedFrac);
  if (spent <= expected) return { allow: true, weight: 1 };
  const over = spent / expected;
  const weight = Math.max(0.05, Math.min(1, 1 / over));
  return { allow: true, weight };
}

export function abInsightStatus(impressions: number): 'insufficient_data' | 'comparable' {
  return Number(impressions) >= ADS_RUNTIME_DEFAULTS.abMinImpressions ? 'comparable' : 'insufficient_data';
}

export const AD_CONVERSION_KINDS = [
  'PAGE_VIEW',
  'SIGN_UP',
  'ADD_TO_CART',
  'PURCHASE',
  'LEAD',
  'MESSAGE',
  'FOLLOW',
] as const;
export type AdConversionKind = (typeof AD_CONVERSION_KINDS)[number];

export function isAdConversionKind(value: unknown): value is AdConversionKind {
  return typeof value === 'string' && (AD_CONVERSION_KINDS as readonly string[]).includes(value);
}

export const AD_PAID_CONVERSION_KINDS: readonly AdConversionKind[] = ['PURCHASE', 'LEAD', 'ADD_TO_CART'];

export const AD_CONVERSION_KIND_LABELS: Record<AdConversionKind, string> = {
  PAGE_VIEW: 'Page view',
  SIGN_UP: 'Sign up',
  ADD_TO_CART: 'Add to cart',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  MESSAGE: 'Message',
  FOLLOW: 'Follow',
};

export function parseEnabledConversionKinds(raw: unknown): AdConversionKind[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  const seen = new Set<AdConversionKind>();
  for (const item of list) {
    if (isAdConversionKind(item)) seen.add(item);
  }
  return AD_CONVERSION_KINDS.filter((kind) => seen.has(kind));
}

export const AD_REPORT_STATUSES = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] as const;
export type AdReportStatus = (typeof AD_REPORT_STATUSES)[number];

export function isAdReportStatus(value: unknown): value is AdReportStatus {
  return typeof value === 'string' && (AD_REPORT_STATUSES as readonly string[]).includes(value);
}

/** Map Step-2 leftovers so old rows/clients still resolve. */
export function normalizeAdReportStatus(raw: unknown): AdReportStatus {
  const v = String(raw || '').toUpperCase();
  if (v === 'OPEN') return 'PENDING';
  if (v === 'REVIEWED') return 'INVESTIGATING';
  if (v === 'ACTIONED') return 'RESOLVED';
  return isAdReportStatus(v) ? v : 'PENDING';
}

export const AD_SAFETY_CATEGORIES = ['ALLOWED', 'RESTRICTED', 'PROHIBITED'] as const;
export type AdSafetyCategory = (typeof AD_SAFETY_CATEGORIES)[number];

export function isAdSafetyCategory(value: unknown): value is AdSafetyCategory {
  return typeof value === 'string' && (AD_SAFETY_CATEGORIES as readonly string[]).includes(value);
}

export const AD_REFUND_REASONS = [
  { id: 'REJECTED_AFTER_PAYMENT', label: 'Campaign rejected after payment' },
  { id: 'TERMINATED', label: 'Campaign terminated' },
  { id: 'BILLING_ERROR', label: 'Billing error' },
  { id: 'ADJUSTMENT', label: 'Admin adjustment' },
] as const;
export type AdRefundReason = (typeof AD_REFUND_REASONS)[number]['id'];

export function isAdRefundReason(value: unknown): value is AdRefundReason {
  return typeof value === 'string' && AD_REFUND_REASONS.some((r) => r.id === value);
}

export const AD_CREATIVE_VARIANTS = ['A', 'B', 'C'] as const;
export type AdCreativeVariant = (typeof AD_CREATIVE_VARIANTS)[number];

export function isAdCreativeVariant(value: unknown): value is AdCreativeVariant {
  return typeof value === 'string' && (AD_CREATIVE_VARIANTS as readonly string[]).includes(value);
}

export function parsePlacementMultipliers(raw: unknown): Record<string, number> {
  const parsed = parseJsonObject(raw);
  const out: Record<string, number> = { FEED: 1, REELS: 1, STORY: 1, WEVSPACE: 1 };
  if (!parsed) return out;
  for (const key of Object.keys(out)) {
    const n = Number(parsed[key]);
    if (Number.isFinite(n) && n > 0) out[key] = Math.min(5, Math.max(0.1, n));
  }
  return out;
}

export function evaluateSafetyRules(
  policies: Array<{ category: string; isActive: boolean; rulesJson?: string | null }>,
  haystack: string,
): { category: AdSafetyCategory | null; keyHit: boolean } {
  const text = haystack.toLowerCase();
  let worst: AdSafetyCategory | null = null;
  for (const policy of policies) {
    if (!policy.isActive) continue;
    let tokens: string[] = [];
    try {
      const parsed = policy.rulesJson ? JSON.parse(policy.rulesJson) : [];
      tokens = Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === 'string') : [];
    } catch {
      tokens = [];
    }
    const hit = tokens.some((t) => t && text.includes(String(t).toLowerCase()));
    if (!hit) continue;
    if (policy.category === 'PROHIBITED') return { category: 'PROHIBITED', keyHit: true };
    if (policy.category === 'RESTRICTED') worst = 'RESTRICTED';
    else if (!worst) worst = 'ALLOWED';
  }
  return { category: worst, keyHit: !!worst };
}

export function opaqueRetargetingKey(spaceId: string, salt: string): string {
  let h = 2166136261;
  const s = `${spaceId}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cohort_${(h >>> 0).toString(16)}`;
}

export function walletBalancesAfterRefund(availableCents: number, reservedCents: number, refundCents: number) {
  const refund = Math.max(0, refundCents);
  const available = availableCents + refund;
  return { availableCents: available, reservedCents, balanceCents: available + reservedCents, refundedCents: refund };
}

/** Safe, non-sensitive explanations — never reveal scores or private strategy. */
export function whySeeingThisAd(input: {
  kind?: string | null;
  hasLocation?: boolean;
  hasInterests?: boolean;
}): string {
  if (input.hasLocation && input.hasInterests) {
    return 'You are seeing this ad because the advertiser selected your general location and interests.';
  }
  if (input.hasLocation) {
    return 'You are seeing this ad because the advertiser selected your general location.';
  }
  if (input.hasInterests) {
    return 'You are seeing this ad because the advertiser selected interests similar to yours.';
  }
  if (input.kind === 'FOLLOWERS' || input.kind === 'FOLLOWERS_OF_FOLLOWERS') {
    return 'You are seeing this ad because you follow this WevSpace or people connected to it.';
  }
  return 'You are seeing this ad because the advertiser chose a broad audience that includes people like you.';
}

/** Money helpers — always work in integer cents to avoid float drift in pure logic. */
export function toCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function walletBalancesAfterDeposit(availableCents: number, reservedCents: number, depositCents: number) {
  const available = availableCents + depositCents;
  return { availableCents: available, reservedCents, balanceCents: available + reservedCents };
}

export function walletBalancesAfterReserve(availableCents: number, reservedCents: number, reserveCents: number) {
  if (reserveCents <= 0) return { ok: true as const, availableCents, reservedCents, balanceCents: availableCents + reservedCents };
  if (availableCents < reserveCents) return { ok: false as const, error: 'INSUFFICIENT_BALANCE' as const };
  const available = availableCents - reserveCents;
  const reserved = reservedCents + reserveCents;
  return { ok: true as const, availableCents: available, reservedCents: reserved, balanceCents: available + reserved };
}

export function walletBalancesAfterRelease(availableCents: number, reservedCents: number, releaseCents: number) {
  const release = Math.min(Math.max(0, releaseCents), reservedCents);
  const reserved = reservedCents - release;
  const available = availableCents + release;
  return { availableCents: available, reservedCents: reserved, balanceCents: available + reserved, releasedCents: release };
}

export function walletBalancesAfterCharge(availableCents: number, reservedCents: number, chargeCents: number) {
  if (chargeCents <= 0) {
    return { ok: true as const, availableCents, reservedCents, balanceCents: availableCents + reservedCents, chargedCents: 0 };
  }
  if (reservedCents < chargeCents) return { ok: false as const, error: 'INSUFFICIENT_RESERVED' as const };
  const reserved = reservedCents - chargeCents;
  return {
    ok: true as const,
    availableCents,
    reservedCents: reserved,
    balanceCents: availableCents + reserved,
    chargedCents: chargeCents,
  };
}

export function chargeForBillingEvent(input: {
  billingModel: string;
  bidAmount: number | null;
  kind: AdDeliveryEventKind;
  /** Running impression count in this billing bucket before this event (for CPM). */
  impressionsBefore?: number;
}): { chargeCents: number; walletType: AdWalletTxType | null } {
  const bid = Math.max(0, Number(input.bidAmount) || 0);
  const bidCents = toCents(bid);
  if (input.billingModel === 'CPC' && input.kind === 'click') {
    return { chargeCents: bidCents || toCents(ADS_LIMITS.minBidCpc), walletType: 'CLICK_CHARGE' };
  }
  if (input.billingModel === 'CPV' && input.kind === 'view') {
    return { chargeCents: bidCents || toCents(ADS_LIMITS.minBidCpv), walletType: 'VIEW_CHARGE' };
  }
  if (input.billingModel === 'CPM' && input.kind === 'impression') {
    // Charge 1/1000 of CPM bid per impression (rounded).
    const per = Math.max(1, Math.round((bidCents || toCents(ADS_LIMITS.minBidCpm)) / 1000));
    return { chargeCents: per, walletType: 'IMPRESSION_CHARGE' };
  }
  return { chargeCents: 0, walletType: null };
}

export function adsDepositOrderId(txId: string): string {
  return `ads_deposit:${txId}`;
}

export function parseAdsDepositOrderId(orderId: unknown): string | null {
  if (typeof orderId !== 'string') return null;
  const m = /^ads_deposit:([a-zA-Z0-9_-]+)$/.exec(orderId.trim());
  return m ? m[1] : null;
}

export function parseTargeting(raw: unknown): CampaignTargeting {
  const base = defaultTargeting();
  const parsed = parseJsonObject(raw);
  if (!parsed) return base;
  const strings = (value: unknown, cap: number) =>
    Array.from(new Set((parseJsonArray(value) || []).map((v) => v.trim()).filter(Boolean))).slice(0, cap);
  const genderRaw = typeof parsed.gender === 'string' ? parsed.gender.toUpperCase() : 'ALL';
  const gender: CampaignTargeting['gender'] =
    genderRaw === 'MALE' || genderRaw === 'FEMALE' ? genderRaw : 'ALL';
  const ageMin = Number(parsed.ageMin);
  const ageMax = Number(parsed.ageMax);
  return {
    kind: isAudienceKind(parsed.kind) ? parsed.kind : base.kind,
    locations: strings(parsed.locations, CAMPAIGN_LIMITS.maxLocations),
    ages: (parseJsonArray(parsed.ages) || []).filter((a): a is AudienceAgeBracket =>
      (AUDIENCE_AGE_BRACKETS as readonly string[]).includes(a),
    ),
    interests: strings(parsed.interests, CAMPAIGN_LIMITS.maxInterests),
    languages: strings(parsed.languages, 12),
    gender,
    ageMin: Number.isFinite(ageMin) ? Math.min(65, Math.max(13, Math.round(ageMin))) : base.ageMin,
    ageMax: Number.isFinite(ageMax) ? Math.min(65, Math.max(13, Math.round(ageMax))) : base.ageMax,
    country: typeof parsed.country === 'string' && parsed.country.trim() ? parsed.country.trim().slice(0, 80) : null,
    division: typeof parsed.division === 'string' && parsed.division.trim() ? parsed.division.trim().slice(0, 80) : null,
    city: typeof parsed.city === 'string' && parsed.city.trim() ? parsed.city.trim().slice(0, 80) : null,
    radiusKm: Number.isFinite(Number(parsed.radiusKm)) ? Math.min(200, Math.max(1, Number(parsed.radiusKm))) : null,
  };
}

export interface CampaignDraft {
  name: string;
  targetKind: CampaignTargetKind;
  targetId: string | null;
  objective: CampaignObjective;
  dailyBudget: number;
  totalBudget: number;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  currency: string;
  targeting: CampaignTargeting;
  format: AdFormat;
  billingModel: AdBillingModel;
  bidAmount: number | null;
}

export function validateCampaignDraft(draft: CampaignDraft): ComposerValidation {
  const errors: string[] = [];
  const name = (draft.name || '').trim();
  if (name.length < CAMPAIGN_LIMITS.name.min) errors.push('Give the campaign a name.');
  if (name.length > CAMPAIGN_LIMITS.name.max) errors.push('That campaign name is too long.');

  if (!isCampaignTargetKind(draft.targetKind)) errors.push('Choose what you want to promote.');
  if (draft.targetKind !== 'SPACE' && !draft.targetId) {
    errors.push('Pick the exact item to promote.');
  }
  if (!isCampaignObjective(draft.objective)) errors.push('Choose a goal for this campaign.');

  const daily = Number(draft.dailyBudget);
  if (!Number.isFinite(daily) || daily < CAMPAIGN_LIMITS.minDailyBudget) {
    errors.push(`The daily budget must be at least ${CAMPAIGN_LIMITS.minDailyBudget}.`);
  } else if (daily > CAMPAIGN_LIMITS.maxDailyBudget) {
    errors.push('That daily budget is above the current limit.');
  }

  const total = Number(draft.totalBudget);
  if (!Number.isFinite(total) || total < CAMPAIGN_LIMITS.minTotalBudget) {
    errors.push(`The total budget must be at least ${CAMPAIGN_LIMITS.minTotalBudget}.`);
  } else if (total > CAMPAIGN_LIMITS.maxTotalBudget) {
    errors.push('That total budget is above the current limit.');
  }

  const days = Number(draft.durationDays);
  if (!Number.isInteger(days) || days < CAMPAIGN_LIMITS.minDurationDays) {
    errors.push('The campaign must run for at least a day.');
  } else if (days > CAMPAIGN_LIMITS.maxDurationDays) {
    errors.push(`A campaign can run for at most ${CAMPAIGN_LIMITS.maxDurationDays} days.`);
  }

  if (Number.isFinite(daily) && Number.isFinite(total) && Number.isInteger(days) && daily * days > total * 1.0001) {
    errors.push('The daily budget over that many days exceeds the total budget.');
  }

  if (draft.targeting && draft.targeting.kind === 'CUSTOM') {
    const t = draft.targeting;
    if (!t.locations.length && !t.ages.length && !t.interests.length && !t.languages.length) {
      errors.push('A custom audience needs at least one location, age range, interest or language.');
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Cost per result so far — the only performance figure worth leading with. */
export function costPerResult(input: { spent?: number; results?: number }): number | null {
  const results = Number(input.results) || 0;
  if (results <= 0) return null;
  const spent = Number(input.spent) || 0;
  return Math.round((spent / results) * 100) / 100;
}

// ──────────────────────────────────────────────────────────────
// Monetization (MP2 §20)
// ──────────────────────────────────────────────────────────────

/**
 * Wevsoft has no payment processor wired up yet, so nothing here charges a card.
 * These types are the ledger and the abstraction a processor will later slot
 * into: every money movement becomes a WevSpaceTransaction row with a provider,
 * a provider reference and an auditable status. The spec is explicit — build the
 * abstraction, do not fake a checkout.
 */
export const MONETIZATION_KINDS = [
  {
    id: 'SUBSCRIPTION',
    label: 'Subscriptions',
    blurb: 'Recurring support in exchange for member-only content.',
    icon: 'Repeat',
    recurring: true,
  },
  {
    id: 'TIP',
    label: 'Tips',
    blurb: 'One-off support from anyone who wants to say thanks.',
    icon: 'Coins',
    recurring: false,
  },
  {
    id: 'PAID_CONTENT',
    label: 'Paid content',
    blurb: 'Charge for a single post, video or download.',
    icon: 'Lock',
    recurring: false,
  },
  {
    id: 'SPONSORED',
    label: 'Sponsored content',
    blurb: 'Disclose and track paid partnerships.',
    icon: 'Handshake',
    recurring: false,
  },
  {
    id: 'PRODUCT_SALE',
    label: 'Product sales',
    blurb: 'Sell items from your catalog.',
    icon: 'ShoppingBag',
    recurring: false,
  },
] as const;

export type MonetizationKind = (typeof MONETIZATION_KINDS)[number]['id'];

export function isMonetizationKind(value: unknown): value is MonetizationKind {
  return typeof value === 'string' && MONETIZATION_KINDS.some((k) => k.id === value);
}

export function monetizationKindDef(id: unknown) {
  return MONETIZATION_KINDS.find((k) => k.id === id) || null;
}

/** Ledger states. PENDING_PAYMENT is where every row sits until a processor exists. */
export const TRANSACTION_STATUSES = [
  'PENDING_PAYMENT',
  'AWAITING_REVIEW',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
  'DISPUTED',
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  AWAITING_REVIEW: 'In review',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export function isTransactionStatus(value: unknown): value is TransactionStatus {
  return typeof value === 'string' && (TRANSACTION_STATUSES as readonly string[]).includes(value);
}

/** Only PAID rows count towards revenue figures. */
export function isRealisedRevenue(status: unknown): boolean {
  return status === 'PAID';
}

/**
 * Payment providers. `manual` is the only one enabled today: an owner records
 * that money arrived out-of-band and an admin confirms it. The rest are declared
 * so the column and the UI already speak the right vocabulary.
 */
export const PAYMENT_PROVIDERS = [
  { id: 'manual', label: 'Recorded manually', ready: true },
  { id: 'wallet', label: 'Wevsoft wallet', ready: false },
  { id: 'stripe', label: 'Card', ready: false },
  { id: 'bkash', label: 'bKash', ready: false },
  { id: 'nagad', label: 'Nagad', ready: false },
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]['id'];

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === 'string' && PAYMENT_PROVIDERS.some((p) => p.id === value);
}

/** True when a provider can actually take money right now. */
export function providerIsReady(id: unknown): boolean {
  const def = PAYMENT_PROVIDERS.find((p) => p.id === id);
  return !!def && def.ready;
}

/** Any live processor at all? Drives the "coming later" copy across the UI. */
export function anyPaymentProviderReady(): boolean {
  return PAYMENT_PROVIDERS.some((p) => p.ready && p.id !== 'manual');
}

export const PAYOUT_STATUSES = ['REQUESTED', 'APPROVED', 'PAID', 'REJECTED'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export function isPayoutStatus(value: unknown): value is PayoutStatus {
  return typeof value === 'string' && (PAYOUT_STATUSES as readonly string[]).includes(value);
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'AUD', 'CAD', 'JPY'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function normalizeCurrency(value: unknown): SupportedCurrency {
  const upper = String(value ?? '').toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}

export const MONETIZATION_LIMITS = {
  tierName: { min: 2, max: 60 },
  tierDescription: { max: 1000 },
  minPrice: 1,
  maxPrice: 100_000,
  maxTiers: 8,
  minPayout: 20,
} as const;

/** Platform share, held here so revenue maths is identical on both sides. */
export const PLATFORM_FEE_PERCENT = 10;

export function splitRevenue(gross: number, feePercent = PLATFORM_FEE_PERCENT): {
  gross: number;
  fee: number;
  net: number;
} {
  const amount = Math.max(0, Math.round((Number(gross) || 0) * 100) / 100);
  const fee = Math.round(amount * (feePercent / 100) * 100) / 100;
  return { gross: amount, fee, net: Math.round((amount - fee) * 100) / 100 };
}

export function validateMonetizationTier(input: {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
}): ComposerValidation {
  const errors: string[] = [];
  const name = String(input.name ?? '').trim();
  if (name.length < MONETIZATION_LIMITS.tierName.min) errors.push('Give the tier a name.');
  if (name.length > MONETIZATION_LIMITS.tierName.max) errors.push('That tier name is too long.');
  if (String(input.description ?? '').length > MONETIZATION_LIMITS.tierDescription.max) {
    errors.push('That description is too long.');
  }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < MONETIZATION_LIMITS.minPrice) {
    errors.push(`The price must be at least ${MONETIZATION_LIMITS.minPrice}.`);
  } else if (price > MONETIZATION_LIMITS.maxPrice) {
    errors.push('That price is above the current limit.');
  }
  if (input.currency !== undefined && !isSupportedCurrency(String(input.currency ?? '').toUpperCase())) {
    errors.push('That currency is not supported yet.');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Cheap velocity guard: a burst of transactions from one buyer in a short window
 * is the pattern worth holding for review. Real fraud scoring belongs to a
 * processor, but nothing should reach PAID without passing through here.
 */
export function shouldHoldForReview(input: {
  amount: number;
  recentCount: number;
  accountAgeDays: number;
}): boolean {
  if (input.amount >= 500) return true;
  if (input.recentCount >= 5) return true;
  if (input.accountAgeDays < 3 && input.amount >= 50) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────
// Space notifications (MP2 §21)
// ──────────────────────────────────────────────────────────────

/**
 * Space-scoped notification types. These are added to the platform's existing
 * notify() fan-out rather than replacing it — the row gains a `spaceId` so the
 * recipient can tell which identity the event belongs to, and Space events reach
 * the owner plus whichever team members hold the matching permission.
 */
export const SPACE_NOTIFY_TYPES = [
  { id: 'space_follow', label: 'New follower', permission: 'settings.view' },
  { id: 'space_comment', label: 'New comment', permission: 'comments.moderate' },
  { id: 'space_mention', label: 'Space mentioned', permission: 'settings.view' },
  { id: 'space_message', label: 'New message', permission: 'messages.read' },
  { id: 'space_review', label: 'New review', permission: 'reviews.moderate' },
  { id: 'space_event_rsvp', label: 'Event RSVP', permission: 'events.manage' },
  { id: 'space_team_invite', label: 'Team invitation', permission: null },
  { id: 'space_team_joined', label: 'Team member joined', permission: 'team.invite' },
  { id: 'space_verification', label: 'Verification update', permission: 'settings.view' },
  { id: 'space_promotion', label: 'Promotion update', permission: 'promotion.view' },
  { id: 'space_milestone', label: 'Analytics milestone', permission: 'analytics.view' },
  { id: 'space_monetization', label: 'Monetization event', permission: 'monetization.view' },
  { id: 'space_moderation', label: 'Moderation action', permission: 'security.view' },
] as const;

export type SpaceNotifyTypeDef = (typeof SPACE_NOTIFY_TYPES)[number];
export type SpaceNotifyType = SpaceNotifyTypeDef['id'];

export function isSpaceNotifyType(value: unknown): value is SpaceNotifyType {
  return typeof value === 'string' && SPACE_NOTIFY_TYPES.some((t) => t.id === value);
}

export function spaceNotifyDef(id: unknown): SpaceNotifyTypeDef | null {
  return SPACE_NOTIFY_TYPES.find((t) => t.id === id) || null;
}

/** The permission a teammate needs to be told about this kind of event. */
export function permissionForNotifyType(type: unknown): SpacePermission | null {
  const def = spaceNotifyDef(type);
  const key = def ? def.permission : null;
  return key && isSpacePermission(key) ? key : null;
}

/** Follower counts worth celebrating — the milestone notification's trigger. */
export const FOLLOWER_MILESTONES: readonly number[] = [
  10, 50, 100, 250, 500, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 500_000, 1_000_000,
];

/** The milestone just crossed by moving from `before` to `after`, if any. */
export function crossedMilestone(before: number, after: number): number | null {
  if (!(after > before)) return null;
  for (let i = FOLLOWER_MILESTONES.length - 1; i >= 0; i -= 1) {
    const mark = FOLLOWER_MILESTONES[i];
    if (before < mark && after >= mark) return mark;
  }
  return null;
}

/** Per-Space notification switches, stored on the Space settings blob. */
export type SpaceNotifyPrefs = Partial<Record<SpaceNotifyType, boolean>>;

export function parseSpaceNotifyPrefs(raw: unknown): Record<SpaceNotifyType, boolean> {
  const out = {} as Record<SpaceNotifyType, boolean>;
  const parsed = parseJsonObject(raw);
  for (const def of SPACE_NOTIFY_TYPES) {
    out[def.id] = parsed && def.id in parsed ? parsed[def.id] !== false : true;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
// Sharing & deep links (MP2 §22)
// ──────────────────────────────────────────────────────────────

export const SPACE_SHARE_TARGETS = [
  { id: 'copy', label: 'Copy link', icon: 'Link' },
  { id: 'native', label: 'Share…', icon: 'Share2' },
  { id: 'qr', label: 'QR code', icon: 'QrCode' },
  { id: 'wevsoft', label: 'Share on Wevsoft', icon: 'Send' },
  { id: 'message', label: 'Send in a message', icon: 'MessageSquare' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook' },
  { id: 'x', label: 'X', icon: 'Twitter' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' },
  { id: 'telegram', label: 'Telegram', icon: 'Send' },
  { id: 'email', label: 'Email', icon: 'Mail' },
] as const;

export type SpaceShareTarget = (typeof SPACE_SHARE_TARGETS)[number]['id'];

/**
 * Deep link for anything inside a Space. Every entry point builds its URL here so
 * a shared link always resolves to the exact Space (spec §22) rather than to a
 * generic feed.
 */
export function spaceDeepLink(input: {
  handle: unknown;
  kind?: 'space' | 'post' | 'reel' | 'event' | 'offering' | 'tab';
  id?: unknown;
  origin?: string;
}): string {
  const base = spacePublicUrl(input.handle, input.origin);
  if (!input.kind || input.kind === 'space' || !input.id) return base;
  if (input.kind === 'tab') return `${base}?tab=${encodeURIComponent(String(input.id))}`;
  return `${base}/${input.kind}/${encodeURIComponent(String(input.id))}`;
}

/**
 * Third-party share URL. Returns null for the targets handled in-app (copy,
 * native sheet, QR, Wevsoft itself) so callers cannot accidentally navigate away.
 */
export function externalShareUrl(target: SpaceShareTarget, url: string, text: string): string | null {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${t}%20${u}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'x':
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'telegram':
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case 'email':
      return `mailto:?subject=${t}&body=${u}`;
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Identity switcher (MP2 §2)
// ──────────────────────────────────────────────────────────────

/**
 * One entry in the Space switcher. The personal account is always present as
 * `kind: 'personal'` with a null id, so "who am I acting as" is a single value
 * across composer, wevchat and comments — the spec calls confusing the two
 * identities the worst possible failure.
 */
export interface SpaceIdentityOption {
  kind: 'personal' | 'space';
  id: string | null;
  name: string;
  handle: string | null;
  avatar: string | null;
  verified: boolean;
  role: SpaceMemberRole | null;
  permissions: SpacePermission[];
  followersCount?: number;
  unreadCount?: number;
}

export function personalIdentity(user: {
  id?: unknown;
  name?: unknown;
  username?: unknown;
  avatar?: unknown;
  isVerified?: unknown;
}): SpaceIdentityOption {
  return {
    kind: 'personal',
    id: null,
    name: String(user.name ?? 'Personal account'),
    handle: user.username ? String(user.username) : null,
    avatar: user.avatar ? String(user.avatar) : null,
    verified: user.isVerified === true,
    role: null,
    permissions: [],
  };
}

/** localStorage key for the last identity chosen, per signed-in user. */
export function activeIdentityStorageKey(userId: unknown): string {
  return `wevspace:active-identity:${String(userId ?? 'anon')}`;
}

/**
 * Resolve a remembered identity against the Spaces the viewer can actually act
 * as. A revoked member must fall back to personal rather than keep publishing as
 * a Space they no longer belong to.
 */
export function resolveActiveIdentity(
  stored: unknown,
  options: readonly SpaceIdentityOption[],
): SpaceIdentityOption {
  const personal = options.find((o) => o.kind === 'personal');
  const fallback = personal || options[0] || null;
  if (!stored || stored === 'personal') return fallback as SpaceIdentityOption;
  const match = options.find((o) => o.kind === 'space' && o.id === stored);
  return match || (fallback as SpaceIdentityOption);
}

/** Can this identity publish content right now? Gates the composer's target list. */
export function identityCanPost(option: SpaceIdentityOption): boolean {
  if (option.kind === 'personal') return true;
  return option.permissions.includes('content.create');
}

// ──────────────────────────────────────────────────────────────
// Owner-controlled feature switches (MP2 §25)
// ──────────────────────────────────────────────────────────────

/**
 * Every switch here is enforced on the server, not merely hidden in the UI: the
 * spec requires frontend state, backend state, database state and authorization
 * to agree. `enforcedBy` names the guard that rejects the request when the
 * switch is off, so the pairing is auditable from one place.
 */
export const SPACE_CONTROL_SWITCHES = [
  {
    id: 'messaging',
    label: 'Let people message this Space',
    blurb: 'Turning this off closes the inbox and hides the Message button.',
    enforcedBy: 'assertSpaceFeature(messaging) on every inbox route',
  },
  {
    id: 'reviews',
    label: 'Allow reviews',
    blurb: 'Existing reviews stay stored but nobody can add or see new ones.',
    enforcedBy: 'assertSpaceFeature(reviews) on review routes',
  },
  {
    id: 'events',
    label: 'Allow events',
    blurb: 'Hides the events tab and blocks new RSVPs.',
    enforcedBy: 'assertSpaceFeature(events)',
  },
  {
    id: 'offerings',
    label: 'Show products and services',
    blurb: 'Hides the catalog from visitors.',
    enforcedBy: 'assertSpaceFeature(offerings)',
  },
] as const;

/** Extra Space-level toggles that are not tab features. */
export interface SpaceControlSettings {
  allowComments: boolean;
  allowSharing: boolean;
  allowMentions: boolean;
  allowMessageRequests: boolean;
  showFollowerCount: boolean;
  showFollowerList: boolean;
  autoArchiveResolvedDays: number;
  /**
   * IANA zone the Space keeps its own clock in — business hours and the away
   * message are meaningless without it. Empty means "use the server's clock".
   */
  timezone: string;
}

export function defaultControlSettings(): SpaceControlSettings {
  return {
    allowComments: true,
    allowSharing: true,
    allowMentions: true,
    allowMessageRequests: true,
    showFollowerCount: true,
    showFollowerList: true,
    autoArchiveResolvedDays: 0,
    timezone: '',
  };
}

/** Zone names only, never an offset: offsets go stale twice a year. */
const TIMEZONE_RE = /^[A-Za-z][A-Za-z0-9+_-]*(\/[A-Za-z0-9+_-]+){0,2}$/;

export function normalizeTimezone(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value || value.length > 64 || !TIMEZONE_RE.test(value)) return '';
  return value;
}

export function parseControlSettings(raw: unknown): SpaceControlSettings {
  const base = defaultControlSettings();
  const parsed = parseJsonObject(raw);
  if (!parsed) return base;
  const days = Number(parsed.autoArchiveResolvedDays);
  return {
    allowComments: parsed.allowComments !== false,
    allowSharing: parsed.allowSharing !== false,
    allowMentions: parsed.allowMentions !== false,
    allowMessageRequests: parsed.allowMessageRequests !== false,
    showFollowerCount: parsed.showFollowerCount !== false,
    showFollowerList: parsed.showFollowerList !== false,
    autoArchiveResolvedDays: Number.isInteger(days) && days >= 0 && days <= 365 ? days : 0,
    timezone: normalizeTimezone(parsed.timezone),
  };
}

/**
 * Which revenue streams a Space has switched on, and in what currency. Kept in
 * the settings blob rather than a column because the answer is a set of opt-ins,
 * not one flag: an owner can take tips without opening subscriptions. Nothing
 * here charges anybody — see PAYMENT_PROVIDERS for why (§20).
 */
export interface SpaceMonetizationSettings {
  enabled: boolean;
  currency: SupportedCurrency;
  kinds: Record<MonetizationKind, boolean>;
  /** Bank last-4 or wallet handle. Never full credentials. */
  payoutDestination: string | null;
}

export function defaultMonetizationSettings(): SpaceMonetizationSettings {
  const kinds = {} as Record<MonetizationKind, boolean>;
  for (const kind of MONETIZATION_KINDS) kinds[kind.id] = false;
  return { enabled: false, currency: DEFAULT_CURRENCY, kinds, payoutDestination: null };
}

export function parseMonetizationSettings(raw: unknown): SpaceMonetizationSettings {
  const base = defaultMonetizationSettings();
  const parsed = parseJsonObject(raw);
  if (!parsed) return base;
  const kindsRaw = parseJsonObject(parsed.kinds) || {};
  const kinds = {} as Record<MonetizationKind, boolean>;
  for (const kind of MONETIZATION_KINDS) kinds[kind.id] = kindsRaw[kind.id] === true;
  const destination = String(parsed.payoutDestination ?? '').trim().slice(0, 200);
  return {
    enabled: parsed.enabled === true,
    currency: normalizeCurrency(parsed.currency),
    kinds,
    payoutDestination: destination || null,
  };
}

/** A stream is live only if the Space is monetizing at all and opted into it. */
export function monetizationKindIsLive(settings: SpaceMonetizationSettings, kind: unknown): boolean {
  if (!settings.enabled || !isMonetizationKind(kind)) return false;
  return settings.kinds[kind] === true;
}

/**
 * The whole settings blob (WevSpace.settingsJson), parsed once. Sub-objects are
 * kept separate so a partial save never clobbers an unrelated section.
 */
export interface SpaceSettingsBlob {
  moderation: SpaceModerationSettings;
  controls: SpaceControlSettings;
  notifications: Record<SpaceNotifyType, boolean>;
  monetization: SpaceMonetizationSettings;
}

export function parseSpaceSettings(raw: unknown): SpaceSettingsBlob {
  const parsed = parseJsonObject(raw) || {};
  return {
    moderation: parseModerationSettings(parsed.moderation),
    controls: parseControlSettings(parsed.controls),
    notifications: parseSpaceNotifyPrefs(parsed.notifications),
    monetization: parseMonetizationSettings(parsed.monetization),
  };
}

// ──────────────────────────────────────────────────────────────
// Verification (MP3 §7)
// ──────────────────────────────────────────────────────────────

/**
 * Two badges, deliberately few. VERIFIED means "this is really them"; OFFICIAL is
 * reserved for the single authoritative Space of an organisation, government body
 * or publication, where an ordinary tick would not settle which account is real.
 */
export const SPACE_VERIFICATION_TIERS = [
  {
    id: 'VERIFIED',
    label: 'Verified',
    blurb: 'Confirms this Space really is who it says it is.',
  },
  {
    id: 'OFFICIAL',
    label: 'Official',
    blurb: 'The one authoritative Space for an organisation, body or publication.',
  },
] as const;

export type SpaceVerificationTier = (typeof SPACE_VERIFICATION_TIERS)[number]['id'];

/** Who is applying. Drives which fields the application requires. */
export const VERIFICATION_ENTITY_TYPES = [
  { id: 'INDIVIDUAL', label: 'A person', requiresRegistration: false, requiresWebsite: false },
  { id: 'BUSINESS', label: 'A business', requiresRegistration: true, requiresWebsite: true },
  { id: 'ORGANIZATION', label: 'A non-profit or organisation', requiresRegistration: true, requiresWebsite: true },
  { id: 'GOVERNMENT', label: 'A government body', requiresRegistration: true, requiresWebsite: true },
  { id: 'MEDIA', label: 'A publication or broadcaster', requiresRegistration: false, requiresWebsite: true },
  { id: 'OTHER', label: 'Something else', requiresRegistration: false, requiresWebsite: false },
] as const;

export type VerificationEntityType = (typeof VERIFICATION_ENTITY_TYPES)[number]['id'];

export function isVerificationEntityType(value: unknown): value is VerificationEntityType {
  return typeof value === 'string' && VERIFICATION_ENTITY_TYPES.some((t) => t.id === value);
}

export function isVerificationTier(value: unknown): value is SpaceVerificationTier {
  return value === 'VERIFIED' || value === 'OFFICIAL';
}

/**
 * The life of one application. WITHDRAWN is the applicant's own doing; REVOKED is
 * a badge taken back after approval, recorded on the row it came from so the
 * history reads in order instead of losing the approval that preceded it.
 */
export const VERIFICATION_REQUEST_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'REVOKED',
  'WITHDRAWN',
] as const;

export type VerificationRequestStatus = (typeof VERIFICATION_REQUEST_STATUSES)[number];

export const VERIFICATION_REQUEST_STATUS_LABELS: Record<VerificationRequestStatus, string> = {
  PENDING: 'Waiting to be picked up',
  UNDER_REVIEW: 'Being reviewed',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  REVOKED: 'Badge removed',
  WITHDRAWN: 'Withdrawn',
};

export function isVerificationRequestStatus(value: unknown): value is VerificationRequestStatus {
  return typeof value === 'string' && (VERIFICATION_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** An application still on a reviewer's desk. Only one may be open per Space. */
export function isOpenVerificationRequest(status: unknown): boolean {
  return status === 'PENDING' || status === 'UNDER_REVIEW';
}

/** What a reviewer may do next, keyed by where the application already is. */
export const VERIFICATION_ADMIN_TRANSITIONS: Record<VerificationRequestStatus, readonly VerificationRequestStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['REVOKED'],
  REJECTED: [],
  REVOKED: [],
  WITHDRAWN: [],
};

/** Decisions the applicant must be given a reason for. */
export function verificationDecisionNeedsReason(status: unknown): boolean {
  return status === 'REJECTED' || status === 'REVOKED';
}

export const VERIFICATION_LIMITS = {
  legalName: { min: 2, max: 120 },
  registrationId: { max: 80 },
  country: { max: 60 },
  reason: { min: 40, max: 2000 },
  decisionReason: { min: 4, max: 1000 },
  internalNote: { max: 2000 },
  links: { max: 5, labelMax: 60 },
  documents: { max: 5, urlMax: 500 },
  /** How long after a decision the Space may apply again. */
  reapplyDays: 30,
} as const;

/** One supporting link: press coverage, an official directory entry, a profile. */
export interface VerificationLink {
  label: string;
  url: string;
}

/** What the owner's application form produces and the server accepts. */
export interface VerificationDraft {
  tier: SpaceVerificationTier;
  entityType: VerificationEntityType;
  legalName: string;
  registrationId: string;
  country: string;
  officialWebsite: string;
  contactEmail: string;
  reason: string;
  documents: string[];
  links: VerificationLink[];
}

export function emptyVerificationDraft(): VerificationDraft {
  return {
    tier: 'VERIFIED',
    entityType: 'INDIVIDUAL',
    legalName: '',
    registrationId: '',
    country: '',
    officialWebsite: '',
    contactEmail: '',
    reason: '',
    documents: [],
    links: [],
  };
}

export interface VerificationDraftCheck {
  ok: boolean;
  /** Field key → message. The form shows these inline; the server returns the first. */
  errors: Record<string, string>;
  /** Normalized values, safe to store: trimmed, URL-corrected, capped. */
  value: VerificationDraft;
}

/**
 * The single validator for an application, used by the form as the owner types and
 * by the route before anything is written. Same rules on both sides, so the form
 * can never promise something the server will refuse.
 */
export function checkVerificationDraft(input: unknown): VerificationDraftCheck {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const tier: SpaceVerificationTier = isVerificationTier(raw.tier) ? raw.tier : 'VERIFIED';
  const entityType: VerificationEntityType = isVerificationEntityType(raw.entityType) ? raw.entityType : 'INDIVIDUAL';
  const entity = VERIFICATION_ENTITY_TYPES.find((t) => t.id === entityType) || VERIFICATION_ENTITY_TYPES[0];

  const legalName = String(raw.legalName ?? '').trim().slice(0, VERIFICATION_LIMITS.legalName.max);
  const registrationId = String(raw.registrationId ?? '').trim().slice(0, VERIFICATION_LIMITS.registrationId.max);
  const country = String(raw.country ?? '').trim().slice(0, VERIFICATION_LIMITS.country.max);
  const reason = String(raw.reason ?? '').trim().slice(0, VERIFICATION_LIMITS.reason.max);
  const contactEmailRaw = String(raw.contactEmail ?? '').trim();
  const websiteRaw = String(raw.officialWebsite ?? '').trim();
  const officialWebsite = websiteRaw ? normalizeWebsiteUrl(websiteRaw) : null;

  if (legalName.length < VERIFICATION_LIMITS.legalName.min) {
    errors.legalName = 'Give the full legal name this Space belongs to.';
  }
  if (reason.length < VERIFICATION_LIMITS.reason.min) {
    errors.reason = `Say why in at least ${VERIFICATION_LIMITS.reason.min} characters — a reviewer has nothing else to go on.`;
  }
  if (entity.requiresRegistration && !registrationId) {
    errors.registrationId = 'A registration, charity or tax number is required for this kind of applicant.';
  }
  if (websiteRaw && !officialWebsite) {
    errors.officialWebsite = 'That does not look like a web address.';
  } else if (entity.requiresWebsite && !officialWebsite) {
    errors.officialWebsite = 'An official website is required for this kind of applicant.';
  }
  if (contactEmailRaw && !isValidContactEmail(contactEmailRaw)) {
    errors.contactEmail = 'That does not look like an email address.';
  }
  // "Official" settles which of several accounts is authoritative, which only
  // means something for an organisation — a person cannot be their own imposter.
  if (tier === 'OFFICIAL' && entityType === 'INDIVIDUAL') {
    errors.tier = 'The Official badge is for organisations, bodies and publications. Apply for Verified instead.';
  }

  const links: VerificationLink[] = [];
  const rawLinks = Array.isArray(raw.links) ? raw.links : [];
  for (const entry of rawLinks) {
    if (links.length >= VERIFICATION_LIMITS.links.max) break;
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const url = normalizeWebsiteUrl(row.url);
    if (!url) {
      if (String(row.url ?? '').trim()) errors.links = 'One of the supporting links is not a valid web address.';
      continue;
    }
    const label = String(row.label ?? '').trim().slice(0, VERIFICATION_LIMITS.links.labelMax);
    links.push({ label: label || websiteDomain(url) || url, url });
  }

  const documents: string[] = [];
  const rawDocs = Array.isArray(raw.documents) ? raw.documents : [];
  for (const entry of rawDocs) {
    if (documents.length >= VERIFICATION_LIMITS.documents.max) break;
    const value = String(entry ?? '').trim().slice(0, VERIFICATION_LIMITS.documents.urlMax);
    if (value) documents.push(value);
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      tier,
      entityType,
      legalName,
      registrationId,
      country,
      officialWebsite: officialWebsite || '',
      contactEmail: contactEmailRaw.slice(0, SPACE_LIMITS.contactEmail.max),
      reason,
      documents,
      links,
    },
  };
}

/**
 * What the owner is shown: the badge state and the application state folded into
 * one word, because "unverified with a rejected application from last week" and
 * "unverified, never applied" call for completely different screens.
 */
export const VERIFICATION_VIEW_STATES = [
  'NOT_APPLIED',
  'PENDING',
  'UNDER_REVIEW',
  'VERIFIED',
  'OFFICIAL',
  'REJECTED',
  'REVOKED',
  'WITHDRAWN',
] as const;

export type VerificationViewState = (typeof VERIFICATION_VIEW_STATES)[number];

/**
 * Derives that word. The badge column wins whenever it says verified: a Space
 * carrying a tick with no application on file (granted by staff directly, or
 * migrated) must never be told it has not applied.
 */
export function deriveVerificationViewState(
  spaceStatus: unknown,
  latestRequestStatus: unknown,
): VerificationViewState {
  if (spaceStatus === 'OFFICIAL') return 'OFFICIAL';
  if (spaceStatus === 'VERIFIED') return 'VERIFIED';
  if (latestRequestStatus === 'PENDING' || spaceStatus === 'PENDING') return 'PENDING';
  if (latestRequestStatus === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  if (latestRequestStatus === 'REJECTED') return 'REJECTED';
  if (latestRequestStatus === 'REVOKED') return 'REVOKED';
  if (latestRequestStatus === 'WITHDRAWN') return 'WITHDRAWN';
  return 'NOT_APPLIED';
}

/** Whether a new application may be started, and if not, why not. */
export function canApplyForVerification(
  state: VerificationViewState,
  lastDecisionAtMs: number | null,
  nowMs: number,
): { allowed: boolean; reason?: string; waitDays?: number } {
  if (state === 'VERIFIED' || state === 'OFFICIAL') {
    return { allowed: false, reason: 'This Space is already verified.' };
  }
  if (state === 'PENDING' || state === 'UNDER_REVIEW') {
    return { allowed: false, reason: 'An application is already with the review team.' };
  }
  if ((state === 'REJECTED' || state === 'REVOKED') && lastDecisionAtMs) {
    const waitMs = VERIFICATION_LIMITS.reapplyDays * 86_400_000;
    const elapsed = nowMs - lastDecisionAtMs;
    if (elapsed < waitMs) {
      const waitDays = Math.max(1, Math.ceil((waitMs - elapsed) / 86_400_000));
      return {
        allowed: false,
        reason: `You can apply again in ${waitDays} ${waitDays === 1 ? 'day' : 'days'}.`,
        waitDays,
      };
    }
  }
  return { allowed: true };
}

/**
 * Triage signals recorded at submission (§8). Advisory only: the score decides
 * which applications a reviewer sees first and nothing else. Nothing here rejects,
 * restricts or penalises a Space on its own.
 */
export interface VerificationRiskInput {
  spaceCreatedAtMs: number;
  nowMs: number;
  followersCount: number;
  postsCount: number;
  handle: string;
  spaceName: string;
  legalName: string;
  officialWebsite: string;
  /** Links already on the public Space profile, for a domain cross-check. */
  profileLinkUrls?: string[];
  /** Live moderation state of the Space: clean | flagged | limited | removed. */
  moderationStatus?: string;
}

export interface VerificationRiskResult {
  /** 0 (nothing unusual) to 100 (look at this one first). */
  score: number;
  /** Human-readable signals, in the order they were found. */
  signals: string[];
}

export function scoreVerificationRisk(input: VerificationRiskInput): VerificationRiskResult {
  const signals: string[] = [];
  let score = 0;

  const ageDays = Math.max(0, (input.nowMs - input.spaceCreatedAtMs) / 86_400_000);
  if (ageDays < 7) {
    score += 25;
    signals.push('Space created less than a week ago');
  } else if (ageDays < 30) {
    score += 12;
    signals.push('Space created less than a month ago');
  }

  if (input.postsCount <= 0) {
    score += 20;
    signals.push('Nothing published yet');
  }
  if (input.followersCount < 10) {
    score += 10;
    signals.push('Fewer than 10 followers');
  }

  if (!input.officialWebsite) {
    score += 10;
    signals.push('No official website given');
  } else {
    const domain = websiteDomain(input.officialWebsite);
    const onProfile = (input.profileLinkUrls || []).some((url) => websiteDomain(url) === domain);
    if (domain && !onProfile) {
      score += 8;
      signals.push('Website is not linked from the public Space');
    }
  }

  // A legal name sharing nothing with the public name is normal for a trading name
  // and suspicious for an impersonator, so it is a flag to read, not a verdict.
  if (input.legalName && !namesOverlap(input.spaceName, input.legalName)) {
    score += 12;
    signals.push('Legal name does not resemble the Space name');
  }

  if (input.moderationStatus && input.moderationStatus !== 'clean') {
    score += 20;
    signals.push(`Space is currently ${input.moderationStatus}`);
  }

  const handle = String(input.handle || '').toLowerCase();
  if (/\d{4,}$/.test(handle)) {
    score += 8;
    signals.push('Handle ends in a long run of digits');
  }
  if (/official|real|genuine/.test(handle) && !input.officialWebsite) {
    score += 10;
    signals.push('Handle claims to be official with no website to match');
  }

  return { score: Math.min(100, score), signals };
}

/** Bare hostname of a URL, or '' when it is not one. */
function websiteDomain(raw: unknown): string {
  const normalized = normalizeWebsiteUrl(raw);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Loose word overlap: one shared word of 3+ letters is enough to look related. */
function namesOverlap(a: unknown, b: unknown): boolean {
  const words = (value: unknown) =>
    new Set(
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3),
    );
  const left = words(a);
  if (!left.size) return true;
  for (const word of words(b)) if (left.has(word)) return true;
  return false;
}
