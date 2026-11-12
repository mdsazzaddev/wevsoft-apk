import type { NavigateFunction } from 'react-router-dom';
import { isInstantPlaybackEnabled } from './instantPlayback';
import { warmPlaybackUrl } from './videoPrefetch';
import { markReelsAudioUnlockIntent } from './videoAutoplay';

export type OpenReelPayload = {
  id: string;
  source?: 'reel' | 'post';
  videoUrl?: string | null;
  hlsUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  user?: any;
  /** IP7 — resume roughly where the feed player was. */
  watchPosition?: number | null;
  /** Exact feed <video> src at click time (poster continuity / warm). */
  handoffSrc?: string | null;
  /** Epoch ms when handoff was captured. */
  handoffAt?: number | null;
  mediaFiles?: Array<{ url?: string | null; quality?: string | null; kind?: string | null }> | null;
};

export type FeedHandoffSnapshot = {
  src: string;
  currentTime: number;
  poster?: string | null;
  capturedAt: number;
};

const KEY = 'wev_open_reel';
const HANDOFF_KEY = 'wev_open_reel_handoff';
const HANDOFF_TTL_MS = 8_000;

export function isHandoffFresh(capturedAt: number, now = Date.now(), ttlMs = HANDOFF_TTL_MS): boolean {
  if (!Number.isFinite(capturedAt) || capturedAt <= 0) return false;
  return now - capturedAt <= ttlMs;
}

/** Snapshot from the feed player right before navigate (IP7). */
export function stashFeedHandoffSnapshot(snap: {
  src?: string | null;
  currentTime?: number | null;
  poster?: string | null;
}): void {
  if (!isInstantPlaybackEnabled()) return;
  const src = String(snap.src || '').trim();
  if (!src) return;
  const currentTime = Number(snap.currentTime);
  const payload: FeedHandoffSnapshot = {
    src,
    currentTime: Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0,
    poster: snap.poster ? String(snap.poster) : null,
    capturedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
  // Best-effort warm so Reels lands on a hot cache.
  void warmPlaybackUrl(src, { maxSegments: 2 });
}

export function takeFeedHandoffSnapshot(): FeedHandoffSnapshot | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as FeedHandoffSnapshot;
    if (!parsed?.src || !isHandoffFresh(Number(parsed.capturedAt))) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Pure merge — used by openFeedVideoInReels and unit tests. */
export function mergeOpenReelHandoff(
  payload: OpenReelPayload,
  handoff: FeedHandoffSnapshot | null | undefined,
  now = Date.now(),
): OpenReelPayload {
  if (!payload || !handoff || !isHandoffFresh(handoff.capturedAt, now)) return payload;
  const watch =
    Number.isFinite(handoff.currentTime) && handoff.currentTime > 0.25
      ? Math.min(handoff.currentTime, 1e7)
      : null;
  return {
    ...payload,
    videoUrl: payload.videoUrl || handoff.src || null,
    thumbnailUrl: payload.thumbnailUrl || handoff.poster || null,
    watchPosition: watch ?? payload.watchPosition ?? null,
    handoffSrc: handoff.src,
    handoffAt: handoff.capturedAt,
  };
}

export function stashOpenReel(payload: OpenReelPayload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export function takeStashedReel(): OpenReelPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as OpenReelPayload;
  } catch {
    return null;
  }
}

/**
 * Apply stashed handoff fields onto a feed/API reel row (IP7).
 * Pure — safe for tests.
 */
export function applyOpenReelHandoffToReel<T extends Record<string, any>>(
  reel: T,
  stashed: OpenReelPayload | null | undefined,
): T {
  if (!reel || !stashed) return reel;
  if (String(reel.id) !== String(stashed.id)) return reel;
  const next: Record<string, any> = { ...reel };
  if (stashed.thumbnailUrl && !next.thumbnailUrl) next.thumbnailUrl = stashed.thumbnailUrl;
  if (stashed.videoUrl && !next.videoUrl) next.videoUrl = stashed.videoUrl;
  if (stashed.hlsUrl && !next.hlsUrl) next.hlsUrl = stashed.hlsUrl;
  if (stashed.mediaFiles && !next.mediaFiles) next.mediaFiles = stashed.mediaFiles;
  if (stashed.watchPosition != null && Number(stashed.watchPosition) > 0.25) {
    next.watchPosition = Number(stashed.watchPosition);
  }
  if (stashed.handoffSrc) next._handoffSrc = stashed.handoffSrc;
  if (stashed.handoffAt) next._handoffAt = stashed.handoffAt;
  if (stashed.thumbnailUrl || stashed.handoffSrc) next._handoffPoster = stashed.thumbnailUrl || null;
  return next as T;
}

export function payloadFromFeedVideo(opts: {
  post: any;
  item?: { url?: string } | null;
  originalReel?: any | null;
}): OpenReelPayload {
  const { post, item, originalReel } = opts;
  if (originalReel?.id) {
    return {
      id: originalReel.id,
      source: 'reel',
      videoUrl: originalReel.videoUrl || item?.url,
      hlsUrl: originalReel.hlsUrl || null,
      thumbnailUrl: originalReel.thumbnailUrl || null,
      caption: originalReel.caption || post?.content || null,
      user: originalReel.user || post?.user,
      mediaFiles: originalReel.mediaFiles || null,
    };
  }
  return {
    id: post.id,
    source: 'post',
    videoUrl: item?.url,
    thumbnailUrl: null,
    caption: post?.content || null,
    user: post?.user,
  };
}

export function openFeedVideoInReels(navigate: NavigateFunction, payload: OpenReelPayload) {
  // Entry click is a user gesture — Reels should remute after muted autoplay fallback.
  markReelsAudioUnlockIntent();
  if (!payload?.id) {
    navigate('/reels');
    return;
  }
  const merged = mergeOpenReelHandoff(payload, takeFeedHandoffSnapshot());
  stashOpenReel(merged);
  const warmUrl = merged.handoffSrc || merged.hlsUrl || merged.videoUrl;
  if (warmUrl && isInstantPlaybackEnabled()) {
    void warmPlaybackUrl(String(warmUrl), { maxSegments: 2 });
  }
  const src = merged.source || 'reel';
  const qs = src !== 'reel' ? `?src=${encodeURIComponent(src)}` : '';
  navigate(`/reels/${encodeURIComponent(merged.id)}${qs}`);
}
