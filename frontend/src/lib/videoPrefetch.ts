/**
 * IP2 — warm HLS/progressive URLs so the next reel's first segments hit HTTP cache.
 * Pure playlist helpers are unit-tested; network warm is best-effort and abortable.
 */

import { isHlsUrl } from './hlsPlayback';
import { canWarmPrefetch } from './instantPlayback';

/** Resolve a playlist-relative URI against the playlist URL. */
export function resolvePlaylistUri(baseUrl: string, uri: string): string {
  const trimmed = String(uri || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) {
    try {
      return new URL(trimmed, baseUrl).href;
    } catch {
      return trimmed;
    }
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

/**
 * From a media playlist, return up to `limit` media segment URLs (skip EXT-X-MAP).
 */
export function extractMediaSegmentUrls(
  playlistText: string,
  playlistUrl: string,
  limit = 2,
): string[] {
  const out: string[] = [];
  const lines = String(playlistText || '').split(/\r?\n/);
  for (let i = 0; i < lines.length && out.length < limit; i++) {
    const line = lines[i]?.trim() || '';
    if (!line || line.startsWith('#')) continue;
    const abs = resolvePlaylistUri(playlistUrl, line);
    if (abs) out.push(abs);
  }
  return out;
}

type VariantRow = { bandwidth: number; uri: string };

/**
 * From a master playlist, pick the lowest-bandwidth variant URL (fast first frame).
 * Returns null if this looks like a media playlist (no variants).
 */
export function pickLowestVariantUrl(masterText: string, masterUrl: string): string | null {
  const lines = String(masterText || '').split(/\r?\n/);
  const variants: VariantRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || '';
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const bwMatch = /BANDWIDTH=(\d+)/i.exec(line);
    const bandwidth = bwMatch ? Number(bwMatch[1]) : Number.MAX_SAFE_INTEGER;
    const next = lines[i + 1]?.trim() || '';
    if (!next || next.startsWith('#')) continue;
    const uri = resolvePlaylistUri(masterUrl, next);
    if (uri) variants.push({ bandwidth, uri });
  }
  if (!variants.length) return null;
  variants.sort((a, b) => a.bandwidth - b.bandwidth);
  return variants[0]?.uri || null;
}

export type WarmPlaybackOpts = {
  signal?: AbortSignal;
  maxSegments?: number;
  disablePreload?: boolean;
  dataSaver?: boolean;
  saveData?: boolean;
};

let inflight = 0;
const MAX_INFLIGHT = 2;
const warmed = new Set<string>();
const WARMED_CAP = 48;

function rememberWarmed(url: string) {
  warmed.add(url);
  if (warmed.size > WARMED_CAP) {
    const first = warmed.values().next().value;
    if (first) warmed.delete(first);
  }
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      mode: 'cors',
      signal,
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchWarm(url: string, signal?: AbortSignal): Promise<void> {
  try {
    await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      mode: 'cors',
      signal,
      cache: 'force-cache',
    });
  } catch {
    /* ignore abort / network */
  }
}

/**
 * Warm a playback URL: HLS → lowest variant + first segments; progressive → range-less GET.
 */
export async function warmPlaybackUrl(url: string, opts: WarmPlaybackOpts = {}): Promise<void> {
  const src = String(url || '').trim();
  if (!src) return;
  if (!canWarmPrefetch(opts)) return;
  if (warmed.has(src)) return;
  if (inflight >= MAX_INFLIGHT) return;
  if (opts.signal?.aborted) return;

  inflight += 1;
  try {
    if (!isHlsUrl(src)) {
      await fetchWarm(src, opts.signal);
      rememberWarmed(src);
      return;
    }

    const masterText = await fetchText(src, opts.signal);
    if (!masterText || opts.signal?.aborted) return;

    let mediaUrl = src;
    const variant = pickLowestVariantUrl(masterText, src);
    if (variant) {
      mediaUrl = variant;
      const mediaText = await fetchText(mediaUrl, opts.signal);
      if (!mediaText || opts.signal?.aborted) return;
      const segs = extractMediaSegmentUrls(mediaText, mediaUrl, opts.maxSegments ?? 2);
      for (const seg of segs) {
        if (opts.signal?.aborted) return;
        await fetchWarm(seg, opts.signal);
      }
    } else {
      const segs = extractMediaSegmentUrls(masterText, src, opts.maxSegments ?? 2);
      for (const seg of segs) {
        if (opts.signal?.aborted) return;
        await fetchWarm(seg, opts.signal);
      }
    }
    rememberWarmed(src);
  } finally {
    inflight = Math.max(0, inflight - 1);
  }
}

/** Test helper — clear warm memo / inflight. */
export function resetVideoPrefetchStateForTests(): void {
  warmed.clear();
  inflight = 0;
}
