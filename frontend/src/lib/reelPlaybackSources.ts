/**
 * Reel playback URL ladder.
 *
 * `fetch` rewrites `/media` and `/uploads` onto the API origin. `<video src>`
 * does not, so a relative path hits the SPA host (HTML 200) and a CDN absolute
 * URL 404s when the file only exists on the API tunnel. Try the API copy
 * first, then the URL the feed returned, then progressive renditions.
 */
import { isDashUrl } from './videoAbrPrefs';
import { isHlsUrl } from './hlsPlayback';
import { pickVideoSrc, type ReelsSettings } from './reelsPrefs';

const LOCAL_PREFIXES = ['/media/', '/uploads/', '/live-media/', '/api/media/'];

export function localMediaRequestPath(url: string | null | undefined): string | null {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('blob:') || raw.startsWith('data:')) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    const pathOnly = raw.split('?')[0] || '';
    return LOCAL_PREFIXES.some((p) => pathOnly.startsWith(p)) ? raw : null;
  }
  try {
    const parsed = new URL(raw);
    if (!LOCAL_PREFIXES.some((p) => parsed.pathname.startsWith(p))) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/** Point a local media path at the API origin. External URLs stay unchanged. */
export function preferApiMediaUrl(url: string | null | undefined, apiBase: string): string {
  const raw = String(url || '').trim();
  const path = localMediaRequestPath(raw);
  if (!path) return raw;
  const base = String(apiBase || '').replace(/\/$/, '');
  if (!base) return path;
  if (raw === base || raw.startsWith(`${base}/`)) return raw;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function pushUnique(out: string[], seen: Set<string>, url: string) {
  const next = url.trim();
  if (!next || seen.has(next)) return;
  seen.add(next);
  out.push(next);
}

function isProgressiveFile(file: { url?: string | null; kind?: string | null }): boolean {
  const url = String(file.url || '');
  if (!url) return false;
  const kind = String(file.kind || '');
  if (kind === 'hls' || kind === 'hls_fmp4' || kind === 'dash' || kind === 'cmaf') return false;
  if (isHlsUrl(url) || isDashUrl(url)) return false;
  return true;
}

export function buildReelPlaybackSources(
  reel: {
    videoUrl?: string | null;
    hlsUrl?: string | null;
    mediaFiles?: Array<{ url?: string | null; quality?: string | null; kind?: string | null }> | null;
  },
  settings: ReelsSettings,
  apiBase: string,
): string[] {
  const preferred = String(pickVideoSrc(reel, settings) || '').trim();
  const seeds: string[] = [];
  if (preferred) seeds.push(preferred);
  if (reel?.videoUrl) seeds.push(String(reel.videoUrl));
  const files = Array.isArray(reel?.mediaFiles) ? reel.mediaFiles : [];
  for (const file of files) {
    if (isProgressiveFile(file) && file.url) seeds.push(String(file.url));
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const seed of seeds) {
    const api = preferApiMediaUrl(seed, apiBase);
    pushUnique(out, seen, api);
    if (api !== seed.trim()) pushUnique(out, seen, seed);
  }
  return out;
}
