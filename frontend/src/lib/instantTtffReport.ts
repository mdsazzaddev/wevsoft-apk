/**
 * IP9/IP10 — drain local TTFF + rebuffer rings and POST sampled batches.
 */
import { getApiBaseUrl } from './apiBase';
import {
  isInstantPlaybackEnabled,
  readInstantRebufferSamples,
  readInstantTtffSamples,
  type InstantRebufferSample,
  type InstantTtffSample,
} from './instantPlayback';

function envFlag(name: string, fallback: boolean): boolean {
  try {
    const v = String((import.meta as any).env?.[name] ?? '').trim().toLowerCase();
    if (!v) return fallback;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  } catch {
    return fallback;
  }
}

export function isInstantTtffReportEnabled(): boolean {
  if (!isInstantPlaybackEnabled()) return false;
  return envFlag('VITE_VIDEO_INSTANT_TTFF_REPORT', true);
}

let sentTtffUntilAt = 0;
let sentRebUntilAt = 0;
let lastFlushAt = 0;

export function resetInstantTtffReportForTests(): void {
  sentTtffUntilAt = 0;
  sentRebUntilAt = 0;
  lastFlushAt = 0;
}

export function pendingTtffSamplesForReport(
  samples: readonly InstantTtffSample[],
  afterAt: number,
  max = 8,
): InstantTtffSample[] {
  const pending = samples.filter((s) => s.at > afterAt && Number.isFinite(s.ttffMs));
  return pending.slice(-max);
}

export function pendingRebufferSamplesForReport(
  samples: readonly InstantRebufferSample[],
  afterAt: number,
  max = 8,
): InstantRebufferSample[] {
  const pending = samples.filter((s) => s.at > afterAt && Number.isFinite(s.durationMs));
  return pending.slice(-max);
}

async function postBatch(
  token: string,
  ttff: InstantTtffSample[],
  rebuffers: InstantRebufferSample[],
): Promise<boolean> {
  if ((!ttff.length && !rebuffers.length) || !token) return false;
  // Sample ~35% of flushes to keep ingest cheap.
  if (Math.random() > 0.35) {
    if (ttff.length) sentTtffUntilAt = Math.max(sentTtffUntilAt, ...ttff.map((s) => s.at));
    if (rebuffers.length) sentRebUntilAt = Math.max(sentRebUntilAt, ...rebuffers.map((s) => s.at));
    return true;
  }
  try {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${base}/api/video/instant-ttff`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        samples: ttff.map((s) => ({
          ttffMs: s.ttffMs,
          reelId: s.reelId || undefined,
        })),
        rebuffers: rebuffers.map((s) => ({
          durationMs: s.durationMs,
          reelId: s.reelId || undefined,
        })),
      }),
      credentials: 'omit',
      keepalive: true,
    });
    if (res.ok || res.status === 204) {
      if (ttff.length) sentTtffUntilAt = Math.max(sentTtffUntilAt, ...ttff.map((s) => s.at));
      if (rebuffers.length) sentRebUntilAt = Math.max(sentRebUntilAt, ...rebuffers.map((s) => s.at));
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function flushInstantTtffReport(token: string | null | undefined): Promise<void> {
  if (!isInstantTtffReportEnabled() || !token) return;
  const now = Date.now();
  if (now - lastFlushAt < 25_000) return;
  const ttff = pendingTtffSamplesForReport(readInstantTtffSamples(), sentTtffUntilAt, 8);
  const rebuffers = pendingRebufferSamplesForReport(readInstantRebufferSamples(), sentRebUntilAt, 8);
  if (!ttff.length && !rebuffers.length) return;
  lastFlushAt = now;
  await postBatch(token, ttff, rebuffers);
}

export function startInstantTtffReporter(getToken: () => string | null | undefined): () => void {
  if (!isInstantTtffReportEnabled() || typeof window === 'undefined') {
    return () => undefined;
  }

  const tick = () => {
    void flushInstantTtffReport(getToken());
  };

  const intervalId = window.setInterval(tick, 45_000);
  const onHide = () => {
    void flushInstantTtffReport(getToken());
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide();
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onVisibility);
  const boot = window.setTimeout(tick, 12_000);

  return () => {
    window.clearTimeout(boot);
    window.clearInterval(intervalId);
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
