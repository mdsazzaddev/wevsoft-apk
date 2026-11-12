const HEARTBEAT_MS = 4000;

export function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function postReelWatch(
  token: string | null,
  reelId: string,
  payload: {
    positionSec: number;
    durationSec: number;
    percent: number;
    completed?: boolean;
    viaBoost?: boolean;
  },
) {
  if (!token || !reelId) return;
  fetch(`/api/reels/${reelId}/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export function postReelView(token: string | null, reelId: string, source: string) {
  if (!token || source !== 'reel') return;
  fetch(`/api/reels/${reelId}/view`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export function createWatchHeartbeat(
  token: string | null,
  getState: () => {
    reelId: string;
    source: string;
    positionSec: number;
    durationSec: number;
    viaBoost?: boolean;
  } | null,
) {
  const timer = window.setInterval(() => {
    const s = getState();
    if (!s || s.source !== 'reel' || s.durationSec <= 0) return;
    const percent = Math.min(100, (s.positionSec / s.durationSec) * 100);
    postReelWatch(token, s.reelId, {
      positionSec: s.positionSec,
      durationSec: s.durationSec,
      percent,
      completed: percent >= 95,
      viaBoost: !!s.viaBoost,
    });
  }, HEARTBEAT_MS);
  return () => window.clearInterval(timer);
}
