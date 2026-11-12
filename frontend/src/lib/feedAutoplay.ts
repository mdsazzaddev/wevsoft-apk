/**
 * Feed / media autoplay helpers.
 * Reuses AccountSettings fields via useSettings option IDs
 * (media_autoplay_mode, media_autoplay_scope, etc.).
 */

import {
  claimExclusivePlayback,
  releaseExclusivePlayback,
} from './exclusiveMediaPlayback';

export type AutoplayMode =
  | 'Autoplay everywhere'
  | 'Autoplay on Wi-Fi only'
  | 'Autoplay on Mobile Data only'
  | 'Never Autoplay'
  | string;

export type AutoplayScope =
  | 'Feed, Stories & Reels'
  | 'Stories & Reels only'
  | 'Stories only'
  | 'Reels only'
  | 'WevChat only'
  | 'Wev Chat only'
  | 'WevChat / Chat only'
  | string;

function isMobileDataConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  if (!conn) return false; // unknown → treat as non-cellular (allow Wi-Fi modes)
  const type = String(conn.type || '').toLowerCase();
  const effective = String(conn.effectiveType || '').toLowerCase();
  if (type === 'cellular') return true;
  if (type === 'wifi' || type === 'ethernet' || type === 'wimax') return false;
  // effectiveType alone is not definitive; only treat known cellular save-data hints
  if (conn.saveData) return true;
  return false;
}

/** Whether Feed autoplay is allowed given persisted settings + connection. */
export function shouldAutoplayFeedVideos(settings: {
  media_autoplay_mode?: AutoplayMode;
  media_autoplay_scope?: AutoplayScope;
  app_data_saver?: boolean;
}): boolean {
  const mode = settings.media_autoplay_mode || 'Autoplay on Wi-Fi only';

  if (mode === 'Never Autoplay') return false;
  if (settings.app_data_saver) return false;

  const scope = settings.media_autoplay_scope || 'Feed, Stories & Reels';
  const feedInScope =
    scope === 'Feed, Stories & Reels' ||
    // legacy / unknown scopes that still mention feed
    /feed/i.test(String(scope));
  if (!feedInScope) return false;

  const onCellular = isMobileDataConnection();
  if (mode === 'Autoplay everywhere') return true;
  if (mode === 'Autoplay on Wi-Fi only') return !onCellular;
  if (mode === 'Autoplay on Mobile Data only') return onCellular;
  // Unknown mode → fail open only when not explicitly never
  return mode !== 'Never Autoplay';
}

export function shouldLoopFeedVideos(settings: { media_loop_videos?: boolean }): boolean {
  return settings.media_loop_videos !== false;
}

export function shouldPauseOnScroll(settings: { media_pause_on_scroll?: boolean }): boolean {
  return settings.media_pause_on_scroll !== false;
}

/** Ensure only one Home/Feed video plays at a time (posts + Reels tray). */
export function claimFeedVideoPlayback(el: HTMLVideoElement): Promise<boolean> {
  return claimExclusivePlayback(el);
}

export function releaseFeedVideoPlayback(el: HTMLVideoElement) {
  releaseExclusivePlayback(el);
}
