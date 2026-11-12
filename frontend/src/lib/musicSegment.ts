/**
 * Shared post-music segment helpers (seconds). Used by MusicSegmentEditor.
 */

export const DEFAULT_POST_MUSIC_MIN_SEC = 1;
export const DEFAULT_POST_MUSIC_MAX_SEC = 60;

export function formatMusicClock(sec: number, longForm = false): string {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (longForm || h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/** Parse MM:SS or HH:MM:SS (also accepts M:SS). Returns null if invalid. */
export function parseMusicClock(raw: string): number | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
  if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  return null;
}

export type MusicSegmentLimits = {
  minSec: number;
  maxSec: number;
};

export type MusicSegment = {
  startTime: number;
  endTime: number;
};

export function normalizeMusicSegment(
  start: number,
  end: number,
  trackDuration: number,
  limits: MusicSegmentLimits = {
    minSec: DEFAULT_POST_MUSIC_MIN_SEC,
    maxSec: DEFAULT_POST_MUSIC_MAX_SEC,
  },
): MusicSegment {
  const dur = Math.max(0, Number(trackDuration) || 0);
  const minSec = Math.max(0.5, Number(limits.minSec) || DEFAULT_POST_MUSIC_MIN_SEC);
  const maxSec = Math.max(minSec, Number(limits.maxSec) || DEFAULT_POST_MUSIC_MAX_SEC);

  let s = Number.isFinite(start) ? Math.max(0, start) : 0;
  let e = Number.isFinite(end) ? Math.max(0, end) : Math.min(dur || maxSec, maxSec);

  if (dur > 0) {
    s = Math.min(s, Math.max(0, dur - minSec));
    e = Math.min(Math.max(e, s + minSec), dur);
  } else {
    e = Math.max(e, s + minSec);
  }

  if (e - s > maxSec) {
    e = s + maxSec;
    if (dur > 0 && e > dur) {
      e = dur;
      s = Math.max(0, e - maxSec);
    }
  }

  if (e - s < minSec) {
    e = Math.min(dur > 0 ? dur : s + minSec, s + minSec);
    if (dur > 0 && e - s < minSec) {
      s = Math.max(0, e - minSec);
    }
  }

  return { startTime: s, endTime: e };
}

export function validateMusicSegment(
  start: number,
  end: number,
  trackDuration: number,
  limits: MusicSegmentLimits = {
    minSec: DEFAULT_POST_MUSIC_MIN_SEC,
    maxSec: DEFAULT_POST_MUSIC_MAX_SEC,
  },
): string | null {
  if (!Number.isFinite(start) || start < 0) return 'Start time cannot be negative.';
  if (!Number.isFinite(end)) return 'End time is invalid.';
  if (start >= end) return 'Start time cannot be greater than end time.';
  const dur = Math.max(0, Number(trackDuration) || 0);
  if (dur > 0 && end > dur + 0.05) return 'End time cannot exceed the music duration.';
  const len = end - start;
  const minSec = Math.max(0.5, Number(limits.minSec) || DEFAULT_POST_MUSIC_MIN_SEC);
  const maxSec = Math.max(minSec, Number(limits.maxSec) || DEFAULT_POST_MUSIC_MAX_SEC);
  if (len + 0.001 < minSec) return 'Please select a longer music segment.';
  if (len - 0.05 > maxSec) return `Music clips can be up to ${Math.round(maxSec)} seconds.`;
  return null;
}

/** Deterministic bar heights for a track (avoids decoding full audio). */
export function buildWaveformBars(seed: string, count = 64): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const n = ((h >>> 0) % 1000) / 1000;
    bars.push(0.22 + n * 0.78);
  }
  return bars;
}
