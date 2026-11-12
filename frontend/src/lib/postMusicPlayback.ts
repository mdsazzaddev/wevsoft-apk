/**
 * One feed post soundtrack at a time — pauses when another post claims playback.
 * Suspend (ref-counted) stops music while the kept-alive Home feed is covered
 * (composer overlay, other routes) so IntersectionObserver alone cannot keep audio running.
 */
let active: HTMLAudioElement | null = null;
let activeKey: string | null = null;
let generation = 0;
let suspendCount = 0;
const suspendListeners = new Set<() => void>();

function notifySuspend() {
  suspendListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function isPostMusicSuspended(): boolean {
  return suspendCount > 0;
}

export function subscribePostMusicSuspend(fn: () => void): () => void {
  suspendListeners.add(fn);
  return () => {
    suspendListeners.delete(fn);
  };
}

/** Force-pause whoever is playing (does not change suspend flag). */
export function stopAllPostMusic() {
  if (active) {
    try {
      active.pause();
    } catch {
      /* ignore */
    }
  }
  active = null;
  activeKey = null;
  generation += 1;
}

/**
 * Ref-counted suspend. While count > 0, claimPostMusic no-ops and listeners pause.
 * Returns a release function — call it when the overlay/route no longer needs silence.
 */
export function acquirePostMusicSuspend(): () => void {
  suspendCount += 1;
  if (suspendCount === 1) {
    stopAllPostMusic();
    notifySuspend();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspendCount = Math.max(0, suspendCount - 1);
    if (suspendCount === 0) notifySuspend();
  };
}

/** @deprecated prefer acquirePostMusicSuspend — kept for simple one-shot toggles */
export function setPostMusicSuspended(next: boolean) {
  if (next) {
    if (suspendCount === 0) {
      suspendCount = 1;
      stopAllPostMusic();
      notifySuspend();
    }
    return;
  }
  if (suspendCount > 0) {
    suspendCount = 0;
    notifySuspend();
  }
}

export function releasePostMusic(el?: HTMLAudioElement | null, key?: string | null) {
  if (el && active !== el) return;
  if (key && activeKey !== key) return;
  if (active) {
    try {
      active.pause();
    } catch {
      /* ignore */
    }
  }
  active = null;
  activeKey = null;
  generation += 1;
}

export async function claimPostMusic(
  el: HTMLAudioElement,
  key: string,
): Promise<{ ok: boolean; blocked?: boolean }> {
  if (suspendCount > 0) return { ok: false };
  if (active && active !== el) {
    try {
      active.pause();
    } catch {
      /* ignore */
    }
  }
  active = el;
  activeKey = key;
  const gen = ++generation;
  try {
    await el.play();
  } catch (err: any) {
    const name = String(err?.name || '');
    if (name === 'NotAllowedError' || name === 'NotSupportedError') {
      return { ok: false, blocked: name === 'NotAllowedError' };
    }
    return { ok: false };
  }
  if (suspendCount > 0 || active !== el || generation !== gen) {
    try {
      el.pause();
    } catch {
      /* ignore */
    }
    return { ok: false };
  }
  return { ok: true };
}

export function isPostMusicActive(key: string): boolean {
  return suspendCount === 0 && activeKey === key && !!active && !active.paused;
}
