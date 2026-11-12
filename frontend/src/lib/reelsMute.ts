/**
 * Global Reels mute/unmute state for the current session.
 * One shared state across every Reel — not per-item.
 */
const STORAGE_KEY = 'wev_reels_muted';

export function readReelsMuted(defaultMuted = true): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultMuted;
    return raw === '1' || raw === 'true';
  } catch {
    return defaultMuted;
  }
}

export function writeReelsMuted(muted: boolean) {
  try {
    sessionStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* private mode / quota */
  }
}

const VOLUME_KEY = 'wev_reels_volume';

/** Last Reels volume (0..1). Returns fallback when unset. */
export function readReelsVolume(fallback = 0.8): number {
  try {
    const raw = sessionStorage.getItem(VOLUME_KEY);
    if (raw === null) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  } catch {
    return fallback;
  }
}

export function writeReelsVolume(volume: number) {
  try {
    sessionStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
  } catch {
    /* private mode / quota */
  }
}
