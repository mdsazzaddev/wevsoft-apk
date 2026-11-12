/**
 * Browser autoplay policy helpers.
 * Unmuted play is often blocked; fall back to muted play, then remute when
 * sticky/transient user activation exists or the next pointer/key gesture lands.
 */

export type PlayAutoplayResult = 'ok' | 'muted' | 'failed';

/** True when the browser may allow unmuted media (transient or sticky). */
export function mediaGestureAllowsUnmute(
  nav: { userActivation?: { isActive?: boolean; hasBeenActive?: boolean } } | null | undefined = typeof navigator !== 'undefined' ? navigator : null,
): boolean {
  try {
    const ua = nav?.userActivation;
    if (!ua) return false;
    return Boolean(ua.isActive || ua.hasBeenActive);
  } catch {
    return false;
  }
}

export function applyVideoUnmute(el: HTMLVideoElement, volume = 1): void {
  el.muted = false;
  el.volume = Math.min(1, Math.max(0, volume));
}

/**
 * Play respecting autoplay policy.
 * When wantMuted is false: try unmuted → muted fallback → sticky remute attempt.
 */
export async function playWithAutoplayFallback(
  el: HTMLVideoElement,
  opts: { wantMuted: boolean; volume?: number },
): Promise<PlayAutoplayResult> {
  const volume = Math.min(1, Math.max(0, opts.volume ?? 1));
  el.volume = volume;

  if (opts.wantMuted) {
    el.muted = true;
    try {
      await el.play();
      return 'ok';
    } catch {
      return 'failed';
    }
  }

  el.muted = false;
  try {
    await el.play();
    return 'ok';
  } catch {
    // Blocked unmuted autoplay — start muted, then remute if gesture budget remains.
    el.muted = true;
    try {
      await el.play();
    } catch {
      return 'failed';
    }
    if (mediaGestureAllowsUnmute()) {
      applyVideoUnmute(el, volume);
      try {
        if (el.paused) await el.play();
        return el.muted ? 'muted' : 'ok';
      } catch {
        el.muted = true;
        return 'muted';
      }
    }
    return 'muted';
  }
}

type UnmuteArm = {
  el: HTMLVideoElement;
  getVolume: () => number;
  shouldUnmute: () => boolean;
  cleanup: () => void;
};

let activeArm: UnmuteArm | null = null;

function clearArm(): void {
  activeArm?.cleanup();
  activeArm = null;
}

/**
 * One-shot window gesture → unmute the given element (if still desired).
 * Replaces any prior arm so only the active reel listens.
 */
export function armUnmuteOnGesture(
  el: HTMLVideoElement,
  opts: { getVolume?: () => number; shouldUnmute?: () => boolean } = {},
): () => void {
  clearArm();
  const getVolume = opts.getVolume ?? (() => 1);
  const shouldUnmute = opts.shouldUnmute ?? (() => true);

  const run = () => {
    if (!shouldUnmute()) {
      clearArm();
      return;
    }
    if (!el.isConnected) {
      clearArm();
      return;
    }
    applyVideoUnmute(el, getVolume());
    if (el.paused) void el.play().catch(() => {});
    clearArm();
  };

  const optsCapture: AddEventListenerOptions = { capture: true };
  window.addEventListener('pointerdown', run, optsCapture);
  window.addEventListener('touchstart', run, optsCapture);
  window.addEventListener('keydown', run, optsCapture);

  const cleanup = () => {
    window.removeEventListener('pointerdown', run, optsCapture);
    window.removeEventListener('touchstart', run, optsCapture);
    window.removeEventListener('keydown', run, optsCapture);
  };

  activeArm = { el, getVolume, shouldUnmute, cleanup };
  return () => {
    if (activeArm?.el === el) clearArm();
  };
}

/** Session flag: entry gesture (feed/nav) already happened before Reels mounted. */
const UNLOCK_KEY = 'wev_reels_audio_unlock';

export function markReelsAudioUnlockIntent(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function consumeReelsAudioUnlockIntent(maxAgeMs = 15_000): boolean {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(UNLOCK_KEY);
    const t = Number(raw);
    if (!Number.isFinite(t) || Date.now() - t > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}
