/**
 * Shared creator publish settings — labels, enums, defaults.
 * Used by upload forms, creator dashboard, and admin UI.
 * Existing Post/Reel fields are not replaced; these are additive.
 */

export const CONTENT_CATEGORIES = [
  { slug: 'gaming', name: 'Gaming' },
  { slug: 'movies-tv', name: 'Movies & TV' },
  { slug: 'music', name: 'Music' },
  { slug: 'education', name: 'Education' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'ai-innovation', name: 'AI & Innovation' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'news-politics', name: 'News & Politics' },
  { slug: 'comedy', name: 'Comedy' },
  { slug: 'entertainment', name: 'Entertainment' },
  { slug: 'lifestyle', name: 'Lifestyle' },
  { slug: 'travel', name: 'Travel' },
  { slug: 'food-cooking', name: 'Food & Cooking' },
  { slug: 'fashion-beauty', name: 'Fashion & Beauty' },
  { slug: 'science', name: 'Science' },
  { slug: 'business-finance', name: 'Business & Finance' },
  { slug: 'art-design', name: 'Art & Design' },
  { slug: 'photography', name: 'Photography' },
  { slug: 'animation', name: 'Animation' },
  { slug: 'podcasts', name: 'Podcasts' },
  { slug: 'pets-animals', name: 'Pets & Animals' },
  { slug: 'health-fitness', name: 'Health & Fitness' },
  { slug: 'kids-family', name: 'Kids & Family' },
  { slug: 'automotive', name: 'Automotive' },
  { slug: 'diy-crafts', name: 'DIY & Crafts' },
  { slug: 'nature-wildlife', name: 'Nature & Wildlife' },
] as const;

export const VISIBILITY_TYPES = [
  { value: 'public', label: 'Public', hint: 'Anyone can find and watch this' },
  { value: 'followers', label: 'Followers Only', hint: 'Only people who follow you' },
  { value: 'private', label: 'Private', hint: 'Only you can see this' },
  { value: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link, hidden from feeds' },
] as const;

/** Includes granular post-audience values used by AudienceSelectorModal. */
export type VisibilityType =
  | (typeof VISIBILITY_TYPES)[number]['value']
  | 'friends'
  | 'custom';

export const UPLOAD_QUALITIES = [
  { value: 'standard', label: 'Standard', hint: 'Faster upload, 480p' },
  { value: 'hd', label: 'HD', hint: '720p — recommended' },
  { value: 'full_hd', label: 'Full HD', hint: '1080p original quality' },
  { value: '2k', label: '2K', hint: '1440p' },
  { value: '4k', label: '4K', hint: '2160p original quality' },
  { value: 'hdr', label: 'HDR', hint: 'High dynamic range when available' },
] as const;

export const DISCLOSURE_TYPES = [
  { value: 'none', label: 'No Disclosure Required' },
  { value: 'ai_generated', label: 'AI Generated' },
  { value: 'ai_assisted', label: 'AI Assisted' },
  { value: 'sponsored', label: 'Sponsored Content' },
  { value: 'paid_partnership', label: 'Paid Partnership' },
  { value: 'brand_collaboration', label: 'Brand Collaboration' },
] as const;

export const COPYRIGHT_TYPES = [
  { value: 'original', label: 'Original Content' },
  { value: 'licensed', label: 'Licensed Content' },
] as const;

export const CONTENT_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'Bangla' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'id', label: 'Indonesian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
] as const;

export type ContentCategorySlug = (typeof CONTENT_CATEGORIES)[number]['slug'];
export type UploadQuality = (typeof UPLOAD_QUALITIES)[number]['value'];
export type DisclosureType = (typeof DISCLOSURE_TYPES)[number]['value'];
export type CopyrightType = (typeof COPYRIGHT_TYPES)[number]['value'];

export interface CreatorPublishSettings {
  contentCategory: string;
  visibilityType: VisibilityType;
  enableComments: boolean;
  allowRemix: boolean;
  allowDuets: boolean;
  allowDownloads: boolean;
  allowSharing: boolean;
  allowEmbeds: boolean;
  contentDisclosureType: DisclosureType;
  isAiGenerated: boolean;
  isAiAssisted: boolean;
  isSponsoredContent: boolean;
  isPaidPartnership: boolean;
  isBrandCollaboration: boolean;
  isSensitiveContent: boolean;
  isAgeRestricted: boolean;
  uploadQuality: UploadQuality;
  autoCaptionsEnabled: boolean;
  captionText: string;
  altText: string;
  audioDescriptionEnabled: boolean;
  title: string;
  description: string;
  hashtags: string;
  tags: string;
  language: string;
  location: string;
  monetizationEnabled: boolean;
  revenueShareEligible: boolean;
  copyrightType: CopyrightType;
  copyrightNotes: string;
  scheduledPublishAt: string;
  pinToProfile: boolean;
  featuredContent: boolean;
  crossPostPlatforms: string[];
}

export const DEFAULT_PUBLISH_SETTINGS: CreatorPublishSettings = {
  contentCategory: '',
  visibilityType: 'public',
  enableComments: true,
  allowRemix: true,
  allowDuets: true,
  allowDownloads: true,
  allowSharing: true,
  allowEmbeds: true,
  contentDisclosureType: 'none',
  isAiGenerated: false,
  isAiAssisted: false,
  isSponsoredContent: false,
  isPaidPartnership: false,
  isBrandCollaboration: false,
  isSensitiveContent: false,
  isAgeRestricted: false,
  uploadQuality: 'hd',
  autoCaptionsEnabled: true,
  captionText: '',
  altText: '',
  audioDescriptionEnabled: false,
  title: '',
  description: '',
  hashtags: '',
  tags: '',
  language: 'en',
  location: '',
  monetizationEnabled: false,
  revenueShareEligible: false,
  copyrightType: 'original',
  copyrightNotes: '',
  scheduledPublishAt: '',
  pinToProfile: false,
  featuredContent: false,
  crossPostPlatforms: [],
};

export function applyDisclosureFlags(settings: CreatorPublishSettings): CreatorPublishSettings {
  const type = settings.contentDisclosureType;
  return {
    ...settings,
    isAiGenerated: type === 'ai_generated' || settings.isAiGenerated,
    isAiAssisted: type === 'ai_assisted' || settings.isAiAssisted,
    isSponsoredContent: type === 'sponsored' || settings.isSponsoredContent,
    isPaidPartnership: type === 'paid_partnership' || settings.isPaidPartnership,
    isBrandCollaboration: type === 'brand_collaboration' || settings.isBrandCollaboration,
  };
}

export function appendPublishSettings(formData: FormData, settings: CreatorPublishSettings) {
  formData.append('publishSettings', JSON.stringify(applyDisclosureFlags(settings)));
}

export function mergePublishSettings(
  partial?: Partial<CreatorPublishSettings> | null,
): CreatorPublishSettings {
  return { ...DEFAULT_PUBLISH_SETTINGS, ...(partial || {}) };
}

export const PUBLISH_TIMEZONES = [
  { value: 'auto', label: 'Device timezone' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (GMT+5:30)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Chicago', label: 'Chicago' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
] as const;

export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone || timeZone === 'auto') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }
  return timeZone;
}

/** Convert a wall-clock date+time in `timeZone` to an ISO UTC string. */
export function wallClockToIso(date: string, time: string, timeZone?: string | null): string {
  if (!date || !time) return '';
  const tz = resolveTimeZone(timeZone);
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) return '';

  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utc));
    const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    let h = num('hour');
    if (h === 24) h = 0;
    const asUtc = Date.UTC(num('year'), num('month') - 1, num('day'), h, num('minute'), num('second'));
    utc += target - asUtc;
  }
  return new Date(utc).toISOString();
}

export function disclosureLabels(settings: CreatorPublishSettings): string[] {
  const labels: string[] = [];
  if (settings.isAiGenerated || settings.contentDisclosureType === 'ai_generated') labels.push('AI Generated');
  if (settings.isAiAssisted || settings.contentDisclosureType === 'ai_assisted') labels.push('AI Assisted');
  if (settings.isSponsoredContent || settings.contentDisclosureType === 'sponsored') labels.push('Sponsored Content');
  if (settings.isPaidPartnership || settings.contentDisclosureType === 'paid_partnership') labels.push('Paid Partnership');
  if (settings.isBrandCollaboration || settings.contentDisclosureType === 'brand_collaboration') labels.push('Brand Collaboration');
  return labels;
}
