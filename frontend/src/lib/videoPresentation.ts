import React from 'react';
export type VideoContext = 'reels-mobile' | 'reels-desktop' | 'feed' | 'fullscreen';

export type VideoPresentation = {
  /** How the `<video>` element fits into its surface container. */
  mode: 'cover' | 'contain' | 'adaptive';
  /** The background treatment for areas not covered by the video (letterbox/pillarbox). */
  background: 'none' | 'blur' | 'solid';
  /** The natural aspect ratio of the video, falling back to 16/9 if unknown. */
  aspectRatio: number;
};

export const FEED_VIDEO_MAX_H_PX = 560;
export const FEED_PORTRAIT_RATIO = 0.95; // < 0.95 is considered portrait
export const REEL_COVER_CROP_TOLERANCE = 0.12;

export function isPortraitRatio(ratio: number | null | undefined): boolean {
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 && ratio < FEED_PORTRAIT_RATIO;
}

export function readVideoRatio(el: HTMLVideoElement | null | undefined): number | null {
  if (!el?.videoWidth || !el.videoHeight) return null;
  return el.videoWidth / el.videoHeight;
}

export function getVideoPresentationMode(
  videoRatio: number | null | undefined,
  context: VideoContext,
  containerRatio?: number | null
): VideoPresentation {
  const ar = (typeof videoRatio === 'number' && Number.isFinite(videoRatio) && videoRatio > 0.05) ? videoRatio : 16 / 9;

  if (context === 'reels-mobile') {
    if (containerRatio) {
      const lo = Math.min(ar, containerRatio);
      const hi = Math.max(ar, containerRatio);
      const cropWaste = 1 - (lo / hi);
      // Only cover if it perfectly matches the screen (allow max 2% crop)
      if (cropWaste <= 0.02) {
        return { mode: 'cover', background: 'none', aspectRatio: ar };
      }
    } else {
      // Fallback: only cover if very close to 9:16
      if (Math.abs(ar - 0.5625) <= 0.02) {
        return { mode: 'cover', background: 'none', aspectRatio: ar };
      }
    }
    // For anything else (4:5, square, landscape), just contain and fill empty space with solid black
    return { mode: 'contain', background: 'solid', aspectRatio: ar };
  }

  if (context === 'reels-desktop') {
    // Desktop keeps a fixed phone-shaped frame; mismatched clips letterbox with
    // solid black only — never a tinted blur wash behind the floating nav.
    if (containerRatio) {
      const lo = Math.min(ar, containerRatio);
      const hi = Math.max(ar, containerRatio);
      const cropWaste = 1 - (lo / hi);
      if (cropWaste > REEL_COVER_CROP_TOLERANCE) {
        return { mode: 'contain', background: 'solid', aspectRatio: ar };
      }
      return { mode: 'cover', background: 'none', aspectRatio: ar };
    }
    return { mode: 'contain', background: 'solid', aspectRatio: ar };
  }

  if (context === 'feed') {
    return { mode: 'adaptive', background: 'blur', aspectRatio: ar };
  }

  if (context === 'fullscreen') {
    return { mode: 'contain', background: 'solid', aspectRatio: ar };
  }

  return { mode: 'adaptive', background: 'none', aspectRatio: ar };
}

export function nativeFeedVideoStyle(ratio: number): React.CSSProperties {
  const ar = Number.isFinite(ratio) && ratio > 0.05 && ratio < 20 ? ratio : 16 / 9;
  if (ar >= FEED_PORTRAIT_RATIO) {
    return {
      width: '100%',
      maxWidth: '100%',
      height: 'auto',
      maxHeight: `min(60vh, ${FEED_VIDEO_MAX_H_PX}px)`,
      aspectRatio: String(ar),
    };
  }
  return {
    width: `min(100%, calc(min(60vh, ${FEED_VIDEO_MAX_H_PX}px) * ${ar}))`,
    maxWidth: '100%',
    height: 'auto',
    maxHeight: `min(60vh, ${FEED_VIDEO_MAX_H_PX}px)`,
    aspectRatio: String(ar),
    marginInline: 'auto',
  };
}

export function feedVideoPlaceholderStyle(): React.CSSProperties {
  return {
    width: '100%',
    maxWidth: '100%',
    maxHeight: `min(60vh, ${FEED_VIDEO_MAX_H_PX}px)`,
    aspectRatio: '4 / 5',
    marginInline: 'auto',
  };
}



export function isLandscapeReelVideo(ratio: number | null | undefined): boolean {
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 1.1;
}

