/**
 * Universal Share helpers: canonical URLs, clipboard (with fallback), device
 * share sheet, external platform URLs and recent destinations.
 *
 * Honesty rules: a platform is only "web share" when it has a documented share
 * URL; apps without one (Instagram, TikTok, …) go through the device share sheet
 * when the browser offers it, otherwise we say so and copy the link. Nothing here
 * detects installed apps or reads the user agent.
 */

export type ShareTargetType = 'post' | 'reel' | 'marketplace' | 'product' | 'profile' | 'space' | 'group' | 'event' | 'link';

/** Canonical in-app path (matches App.tsx routes and the backend's canonicalSharePath). */
export function canonicalSharePath(type: ShareTargetType | string, ref: { id?: string | null; username?: string | null; handle?: string | null }): string | null {
  const id = ref.id ? encodeURIComponent(ref.id) : '';
  switch (type) {
    case 'post':
      return id ? `/posts/${id}` : null;
    case 'reel':
      return id ? `/reels/${id}` : null;
    case 'marketplace':
    case 'product':
      return id ? `/wevmall/product/${id}` : null;
    case 'profile':
      return ref.username ? `/u/${encodeURIComponent(ref.username)}` : id ? `/u/${id}` : null;
    case 'space': {
      const h = String(ref.handle || '').replace(/^@/, '');
      return h ? `/space/@${encodeURIComponent(h)}` : null;
    }
    case 'group':
      return id ? `/groups/${id}` : null;
    case 'event':
      return id ? `/events/${id}` : null;
    default:
      return null;
  }
}

export function absoluteUrl(url: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Clipboard API first; falls back to a hidden textarea + execCommand('copy'). Resolves true only when a copy happened. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && (typeof window === 'undefined' || window.isSecureContext !== false)) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  const prevFocus = document.activeElement as HTMLElement | null;
  ta.select();
  let ok: boolean;
  try {
    ok = typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  prevFocus?.focus?.();
  return ok;
}

export type DeviceShareResult = 'shared' | 'cancelled' | 'unsupported' | 'failed';

export function canUseDeviceShare(data?: ShareData): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (data?.files && data.files.length) return typeof navigator.canShare === 'function' && navigator.canShare(data);
  return true;
}

/**
 * Opens the device share sheet. 'shared' only when the browser resolved the
 * promise (the user picked a target); AbortError is the user cancelling.
 */
export async function shareWithDevice(data: ShareData): Promise<DeviceShareResult> {
  if (!canUseDeviceShare(data)) return 'unsupported';
  try {
    if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
      const { files: _files, ...rest } = data;
      if (!navigator.canShare(rest)) return 'unsupported';
      await navigator.share(rest);
    } else {
      await navigator.share(data);
    }
    return 'shared';
  } catch (err) {
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

export type PlatformMode = 'web' | 'device' | 'internal';

export interface SharePlatform {
  key: string;
  label: string;
  /** web = documented share URL; device = only through the OS share sheet; internal = inside WebSoft. */
  mode: PlatformMode;
  keywords?: string;
}

export const PLATFORMS: SharePlatform[] = [
  { key: 'fb', label: 'Facebook', mode: 'web' },
  { key: 'wa', label: 'WhatsApp', mode: 'web' },
  { key: 'tg', label: 'Telegram', mode: 'web' },
  { key: 'x', label: 'X', mode: 'web', keywords: 'twitter' },
  { key: 'messenger', label: 'Messenger', mode: 'device', keywords: 'facebook chat' },
  { key: 'ig', label: 'Instagram', mode: 'device' },
  { key: 'tt', label: 'TikTok', mode: 'device' },
  { key: 'email', label: 'Email', mode: 'web', keywords: 'mail mailto' },
  { key: 'gmail', label: 'Gmail', mode: 'web', keywords: 'google mail' },
  { key: 'in', label: 'LinkedIn', mode: 'web' },
  { key: 'rd', label: 'Reddit', mode: 'web' },
  { key: 'pin', label: 'Pinterest', mode: 'web' },
  { key: 'threads', label: 'Threads', mode: 'web' },
  { key: 'bsky', label: 'Bluesky', mode: 'web' },
  { key: 'viber', label: 'Viber', mode: 'device' },
  { key: 'snap', label: 'Snapchat', mode: 'device' },
  { key: 'dc', label: 'Discord', mode: 'device' },
  { key: 'yt', label: 'YouTube', mode: 'device' },
  { key: 'msg', label: 'WevChat', mode: 'internal', keywords: 'chat message friend' },
];

export const platformByKey = (key: string) => PLATFORMS.find((p) => p.key === key);

/** Documented web share URLs only. Returns null for device-only platforms. */
export function platformShareUrl(key: string, url: string, title: string): string | null {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const both = encodeURIComponent(title ? `${title} ${url}` : url);
  switch (key) {
    case 'fb':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'wa':
      return `https://wa.me/?text=${both}`;
    case 'tg':
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case 'x':
      return `https://x.com/intent/post?url=${u}&text=${t}`;
    case 'email':
      return `mailto:?subject=${t}&body=${both}`;
    case 'gmail':
      return `https://mail.google.com/mail/?view=cm&fs=1&su=${t}&body=${both}`;
    case 'in':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'rd':
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case 'pin':
      return `https://www.pinterest.com/pin/create/button/?url=${u}&description=${t}`;
    case 'threads':
      return `https://www.threads.net/intent/post?text=${both}`;
    case 'bsky':
      return `https://bsky.app/intent/compose?text=${both}`;
    case 'msg':
      return `/wevchat?shareUrl=${u}&shareTitle=${t}`;
    default:
      return null;
  }
}

/** How a platform will work in this browser right now (drives the label under each icon). */
export function platformAvailability(p: SharePlatform, deviceShare: boolean): 'web' | 'device' | 'internal' | 'unsupported' {
  if (p.mode === 'web' || p.mode === 'internal') return p.mode;
  return deviceShare ? 'device' : 'unsupported';
}

export const AVAILABILITY_LABEL = {
  web: 'Web share',
  device: 'Via device share sheet',
  internal: 'In WebSoft',
  unsupported: 'Not supported here',
} as const;

// ── Recent destinations (localStorage) ─────────────────────────

export const RECENT_KEY = 'wev_share_recent_v1';
const MAX_RECENT = 8;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getRecentDestinations(): string[] {
  try {
    const raw = storage()?.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((k) => typeof k === 'string' && platformByKey(k)).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function pushRecentDestination(key: string): string[] {
  if (!platformByKey(key)) return getRecentDestinations();
  const next = [key, ...getRecentDestinations().filter((k) => k !== key)].slice(0, MAX_RECENT);
  try {
    storage()?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota: recents are optional */
  }
  return next;
}

export function clearRecentDestinations(): void {
  try {
    storage()?.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

export function searchPlatforms(query: string, list: SharePlatform[] = PLATFORMS): SharePlatform[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) => p.label.toLowerCase().includes(q) || (p.keywords || '').includes(q));
}
