/**
 * Pure screen-share helpers for 1:1 calls (Phase 4).
 * Actual capture still requires an explicit getDisplayMedia user gesture.
 */

export type ScreenShareConstraints = {
  video: MediaTrackConstraints | boolean;
  audio: boolean | MediaTrackConstraints;
};

/** Prefer readable text over high motion for presentations. */
export function buildScreenShareConstraints(opts?: {
  withSystemAudio?: boolean;
  preferMotion?: boolean;
}): ScreenShareConstraints {
  const preferMotion = Boolean(opts?.preferMotion);
  const video: MediaTrackConstraints & { displaySurface?: string } = {
    frameRate: preferMotion ? { ideal: 30, max: 30 } : { ideal: 15, max: 20 },
    width: { ideal: preferMotion ? 1920 : 1600, max: 1920 },
    height: { ideal: preferMotion ? 1080 : 900, max: 1080 },
    displaySurface: 'monitor',
  };
  return {
    video,
    audio: opts?.withSystemAudio
      ? ({
          // Chromium may honor suppressLocalAudioPlayback; others ignore.
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints)
      : false,
  };
}

export function applyScreenTrackHints(track: MediaStreamTrack, preferMotion = false): void {
  try {
    (track as MediaStreamTrack & { contentHint?: string }).contentHint = preferMotion ? 'motion' : 'detail';
  } catch {
    /* ignore */
  }
}

export function isDisplayTrack(track: MediaStreamTrack | null | undefined): boolean {
  if (!track) return false;
  const settings = track.getSettings?.() as MediaTrackSettings & { displaySurface?: string };
  if (settings?.displaySurface) return true;
  const label = String(track.label || '').toLowerCase();
  return label.includes('screen') || label.includes('window') || label.includes('tab') || label.includes('display');
}

export type ScreenShareCapability = {
  supported: boolean;
  reason?: string;
};

export function detectScreenShareSupport(env: {
  isSecureContext?: boolean;
  hasGetDisplayMedia?: boolean;
  userAgent?: string;
}): ScreenShareCapability {
  if (env.isSecureContext === false) {
    return { supported: false, reason: 'Screen share requires HTTPS (or localhost).' };
  }
  if (!env.hasGetDisplayMedia) {
    return { supported: false, reason: 'This browser does not support screen sharing.' };
  }
  const ua = String(env.userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) && !env.hasGetDisplayMedia) {
    return { supported: false, reason: 'iOS browser screen share is not available.' };
  }
  return { supported: true };
}
