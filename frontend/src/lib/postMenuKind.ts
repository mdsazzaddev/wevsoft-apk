import { isVideoMedia, parseLegacyMedia } from './postMedia';

export type PostMenuKind = 'text' | 'photo' | 'video' | 'reel' | 'share';

function parseSharedFrom(post: any): { type?: string; id?: string } | null {
  const meta = post?.shareMeta;
  if (meta?.kind === 'reel' || meta?.originalReel) return { type: 'reel', id: meta.originalReel?.id };
  if (meta?.originalPost) return { type: 'post', id: meta.originalPost?.id };
  const raw = post?.pollData;
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.sharedFrom?.type) return parsed.sharedFrom;
  } catch {
    /* ignore */
  }
  return null;
}

function mediaKind(post: any): PostMenuKind {
  const type = String(post?.type || '').toLowerCase();
  if (type === 'reel') return 'reel';
  if (type === 'video') return 'video';
  if (type === 'photo' || type === 'image') return 'photo';

  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  const urls = [
    ...related.map((m: any) => String(m?.url || '')),
    ...parseLegacyMedia(post?.media),
  ].filter(Boolean);
  const types = related.map((m: any) => String(m?.type || ''));
  const hasVideo = types.some((t) => isVideoMedia(t)) || urls.some((u) => isVideoMedia(u));
  const hasImage = related.some((m: any) => {
    const t = String(m?.type || '');
    const u = String(m?.url || '');
    return t === 'image' || t === 'photo' || (!isVideoMedia(t) && !isVideoMedia(u) && !!u);
  }) || urls.some((u) => !isVideoMedia(u));

  if (hasVideo && !hasImage) return 'video';
  if (hasImage) return hasVideo ? 'photo' : 'photo';
  if (hasVideo) return 'video';
  return 'text';
}

/** Canonical kind of the row itself (share stays share). */
export function detectPostKind(post: any): PostMenuKind {
  const type = String(post?.type || '').toLowerCase();
  const shared = parseSharedFrom(post);
  if (type === 'share' || post?.shareMeta || shared) return 'share';
  if (type === 'reel') return 'reel';
  return mediaKind(post);
}

/**
 * Kind used to pick menu sections.
 * Owners of a reshare see the compact Shared Post menu.
 * Everyone else sees options for the underlying content type.
 */
export function viewerMenuKind(post: any, isOwner: boolean): PostMenuKind {
  const kind = detectPostKind(post);
  if (kind !== 'share' || isOwner) return kind;

  if (post?.shareMeta?.originalReel || post?.shareMeta?.kind === 'reel') return 'reel';
  const original = post?.shareMeta?.originalPost;
  if (original) return mediaKind({ ...original, shareMeta: undefined, type: original.type || 'text' });
  const shared = parseSharedFrom(post);
  if (shared?.type === 'reel') return 'reel';
  return mediaKind(post);
}

export function firstMediaUrl(post: any): string | null {
  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  for (const m of related) {
    if (m?.url) return String(m.url);
  }
  const legacy = parseLegacyMedia(post?.media);
  return legacy[0] || null;
}

export function postHasVideo(post: any): boolean {
  const kind = viewerMenuKind(post, false);
  if (kind === 'video' || kind === 'reel') return true;
  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  if (related.some((m: any) => isVideoMedia(m?.type) || isVideoMedia(m?.url))) return true;
  return isVideoMedia(firstMediaUrl(post));
}

export function postHasPhoto(post: any): boolean {
  const kind = viewerMenuKind(post, false);
  return kind === 'photo';
}

export function allMediaUrls(post: any): string[] {
  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  if (related.length) return related.map((m: any) => String(m?.url || '')).filter(Boolean);
  return parseLegacyMedia(post?.media);
}

export const ADMIN_MENU_ROLES = new Set(['admin', 'superadmin', 'moderator']);

export function isAdminRole(role?: string | null) {
  return !!role && ADMIN_MENU_ROLES.has(String(role).toLowerCase());
}
