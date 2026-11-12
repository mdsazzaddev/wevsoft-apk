/** Client-side Watch Party sync helpers (mirrors backend drift rules). */

export const SYNC_DRIFT_SEC = 1.25;

export function shouldApplyRemoteSeek(
  localTime: number,
  remoteTime: number,
  driftSec = SYNC_DRIFT_SEC,
): boolean {
  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) return false;
  return Math.abs(localTime - remoteTime) > driftSec;
}

export function resolvePlaybackAction(status: string | null | undefined): 'play' | 'pause' | 'ignore' {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'playing' || s === 'play') return 'play';
  if (s === 'paused' || s === 'pause' || s === 'waiting' || s === 'ended') return 'pause';
  return 'ignore';
}

export function formatWatchTime(sec: number): string {
  const t = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
