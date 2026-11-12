/**
 * Client-safe post media helpers (no Prisma fragments).
 * Server-only `videoPostWhere()` lives in backend `utils/post-media.ts`.
 */

export const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|avi|mkv|webm|ogv|3gp|mpeg|mpg|flv|wmv)$/i;
export const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif)$/i;

export interface ResolvedMediaItem {
  id?: string;
  url: string;
  type: 'image' | 'video';
}

export function isGifMedia(input?: string | null): boolean {
  if (!input) return false;
  const v = input.toLowerCase().trim();
  if (v === 'gif' || v === 'image/gif') return true;
  if (/\.gif(\?|#|$)/i.test(v)) return true;
  return false;
}

export function isVideoMedia(input?: string | null): boolean {
  if (!input) return false;
  // Never treat GIF posts / Tenor URLs as video (FeedAutoplayVideo path).
  if (isGifMedia(input)) return false;
  const v = input.toLowerCase();
  if (v.startsWith('image/')) return false;
  if (v.startsWith('video/') || v === 'video') return true;
  if (v.includes('video')) return true;
  return VIDEO_EXTENSIONS.test(v);
}

export function normalizeMediaType(type?: string | null, url?: string | null): 'image' | 'video' {
  if (isGifMedia(type) || isGifMedia(url)) return 'image';
  if (isVideoMedia(type) || isVideoMedia(url)) return 'video';
  return 'image';
}

export function parseLegacyMedia(media: unknown): string[] {
  if (!media) return [];
  if (Array.isArray(media)) return media.map(String).filter(Boolean);
  if (typeof media !== 'string') return [];
  const trimmed = media.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (typeof parsed === 'string' && parsed) return [parsed];
  } catch {
    /* bare path */
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('http')) return [trimmed];
  return [];
}

export function resolveVideoUrl(post: {
  media?: unknown;
  postMedia?: Array<{ url?: string | null; type?: string | null }>;
}): string | null {
  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  const videoRow = related.find((m) => normalizeMediaType(m.type, m.url) === 'video');
  if (videoRow?.url) return videoRow.url;

  const legacy = parseLegacyMedia(post?.media);
  return legacy.find((url) => isVideoMedia(url)) || null;
}

export function resolvePostMediaItems(post: {
  media?: unknown;
  postMedia?: Array<{ id?: string; url?: string | null; type?: string | null }>;
}): ResolvedMediaItem[] {
  const related = Array.isArray(post?.postMedia) ? post.postMedia : [];
  if (related.length > 0) {
    return related
      .filter((m) => m?.url)
      .map((m) => ({
        id: m.id,
        url: m.url!,
        type: normalizeMediaType(m.type, m.url),
      }));
  }
  return parseLegacyMedia(post?.media).map((url) => ({
    url,
    type: normalizeMediaType(null, url),
  }));
}
