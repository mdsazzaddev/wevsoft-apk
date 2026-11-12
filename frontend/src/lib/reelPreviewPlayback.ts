/**
 * Home/feed Reels tray playback helpers.
 * Visibility (most toward screen center) drives autoplay via `visibleMediaPlayback`;
 * this module owns poster seek + exclusive play/stop with sound when a gesture allows it.
 */

import {
  claimExclusivePlayback,
  isExclusivePlaying,
  isFinePointerHover,
  pauseExclusivePlayback,
} from './exclusiveMediaPlayback';

export { isFinePointerHover, isExclusivePlaying };

export function reelPreviewPosterTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0.5;
  return Math.min(Math.max(duration * 0.5, 0.15), Math.max(0.15, duration - 0.12));
}

export function seekReelPreviewPoster(video?: HTMLVideoElement | null) {
  if (!video) return;
  try {
    video.currentTime = reelPreviewPosterTime(video.duration);
  } catch {
    /* ignore */
  }
}

/** True when a thumbnail is almost entirely black (first-frame / empty poster). */
export function isMostlyBlackImage(img: HTMLImageElement): boolean {
  const w = Math.min(48, img.naturalWidth || 0);
  const h = Math.min(48, img.naturalHeight || 0);
  if (w < 2 || h < 2) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let dark = 0;
    const samples = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (luma < 22) dark++;
    }
    return dark / samples > 0.86;
  } catch {
    return false;
  }
}

export function stopReelPreview(video?: HTMLVideoElement | null) {
  const target = video;
  if (!target) {
    pauseExclusivePlayback();
    return;
  }
  pauseExclusivePlayback(target);
  try {
    target.currentTime = 0;
  } catch {
    /* ignore */
  }
  target.muted = true;
}

export async function playReelPreviewWithSound(video: HTMLVideoElement): Promise<void> {
  try {
    video.currentTime = 0;
  } catch {
    /* ignore */
  }
  video.muted = false;
  video.volume = 1;

  let ok = await claimExclusivePlayback(video);
  if (ok) return;
  // Hover is not always a user-gesture; retry muted so the preview still starts.
  if (!isExclusivePlaying(video)) return;
  video.muted = true;
  ok = await claimExclusivePlayback(video);
  if (ok && isExclusivePlaying(video)) {
    video.muted = false;
  }
}

export function isActiveReelPreview(video: HTMLVideoElement | null): boolean {
  return isExclusivePlaying(video);
}
