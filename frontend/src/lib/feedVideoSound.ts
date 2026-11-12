/**
 * Session preference for feed post video sound.
 * Desktop: muted until the user unmutes once — then later feed videos stay unmuted.
 * Phone / mobile preview: unmuted by default, but the volume icon can mute/unmute
 * for the rest of the session (same as desktop after the first gesture).
 */

import { isPhoneDevice } from './phoneLayout';

/** null = use platform default (phone unmuted, desktop muted). */
let preferMutedOverride: boolean | null = null;

export function resetFeedVideoSoundPreferenceForTests() {
  preferMutedOverride = null;
}

/** Whether new feed videos should start muted. */
export function getFeedVideoPreferMuted(isPhone: boolean = isPhoneDevice()): boolean {
  if (preferMutedOverride !== null) return preferMutedOverride;
  return isPhone ? false : true;
}

/** Persist unmute/mute for subsequent feed videos (phone + desktop). */
export function setFeedVideoPreferMuted(
  muted: boolean,
  _isPhone: boolean = isPhoneDevice(),
): void {
  preferMutedOverride = muted;
}

/** Feed videos play at full volume when unmuted (including mobile). */
export function getFeedVideoVolume(): number {
  return 1;
}

/** Apply session sound prefs onto a video element. Returns whether it is muted. */
export function applyFeedVideoSound(
  video: Pick<HTMLVideoElement, 'muted' | 'volume'>,
  opts: { forceMuted?: boolean; isPhone?: boolean } = {},
): boolean {
  const isPhone = opts.isPhone ?? isPhoneDevice();
  if (opts.forceMuted) {
    video.muted = true;
    video.volume = 0;
    return true;
  }
  const muted = getFeedVideoPreferMuted(isPhone);
  video.muted = muted;
  video.volume = muted ? 0 : getFeedVideoVolume();
  return muted;
}
