/**
 * One Home/Feed video at a time: post clips and Reels tray share this lock.
 * Stale play() promises must not restart a video after visibility changes.
 */

let active: HTMLVideoElement | null = null;
let generation = 0;
const listeners = new Set<(el: HTMLVideoElement | null) => void>();

function emit(el: HTMLVideoElement | null) {
  listeners.forEach((fn) => fn(el));
}

export function subscribeExclusivePlayback(fn: (el: HTMLVideoElement | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isFinePointerHover(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function isExclusivePlaying(el: HTMLVideoElement | null): boolean {
  return !!el && active === el;
}

export function isExclusiveIdle(): boolean {
  return !active || active.paused;
}

export function releaseExclusivePlayback(el: HTMLVideoElement) {
  if (active !== el) return;
  active = null;
  generation += 1;
  emit(null);
}

export function pauseExclusivePlayback(el?: HTMLVideoElement | null) {
  const target = el ?? active;
  if (!target) return;
  try {
    target.pause();
  } catch {
    /* ignore */
  }
  if (active === target) {
    active = null;
    generation += 1;
    emit(null);
  }
}

/** Pause whoever is playing, then play `el`. Returns false if play failed or was stolen. */
export async function claimExclusivePlayback(el: HTMLVideoElement): Promise<boolean> {
  if (active === el) {
    if (!el.paused && !el.ended) return true;
    const gen = generation;
    try {
      await el.play();
    } catch {
      return false;
    }
    return active === el && generation === gen && !el.paused;
  }

  const previous = active;
  active = el;
  const gen = ++generation;
  emit(el);

  if (previous && previous !== el) {
    try {
      previous.pause();
    } catch {
      /* ignore */
    }
  }

  try {
    await el.play();
  } catch {
    if (active === el && generation === gen) return false;
    return false;
  }

  if (active !== el || generation !== gen) {
    try {
      el.pause();
    } catch {
      /* ignore */
    }
    return false;
  }

  return true;
}
