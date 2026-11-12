/**
 * Client-side reel video analysis for Creator Studio (Phase 1).
 * Uses HTMLVideoElement metadata — no re-encode. Server still re-probes on upload.
 */

export type ReelOrientation = 'portrait' | 'landscape' | 'square';

export type ReelQualityTier =
  | '360p'
  | '480p'
  | '720p'
  | '1080p'
  | '1440p'
  | '2160p'
  | 'unknown';

export interface ReelVideoAnalysis {
  width: number;
  height: number;
  durationSec: number;
  fps: number | null;
  aspectLabel: string;
  orientation: ReelOrientation;
  qualityTier: ReelQualityTier;
  hasAudio: boolean | null;
  fileSize: number;
  mimeType: string;
  fileName: string;
  estimatedUploadBytes: number;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|avi|mkv|webm|ogv|3gp|mpeg|mpg|flv|wmv)$/i;

/** Prefer MIME; fall back to extension when browser reports empty/octet-stream. */
export function isLikelyVideoFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  if (mime === 'application/octet-stream' || !mime) return VIDEO_EXT.test(file.name);
  return false;
}

export function formatDurationLabel(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Snap width:height to common reel ratios; otherwise return reduced fraction. */
export function aspectLabelOf(width: number, height: number): string {
  if (!(width > 0) || !(height > 0)) return '—';
  const r = width / height;
  const known: Array<[string, number]> = [
    ['9:16', 9 / 16],
    ['4:5', 4 / 5],
    ['3:4', 3 / 4],
    ['1:1', 1],
    ['4:3', 4 / 3],
    ['16:9', 16 / 9],
    ['21:9', 21 / 9],
  ];
  let best = known[0];
  let bestDiff = Math.abs(r - best[1]);
  for (const entry of known) {
    const d = Math.abs(r - entry[1]);
    if (d < bestDiff) {
      best = entry;
      bestDiff = d;
    }
  }
  if (bestDiff < 0.04) return best[0];
  const g = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width / g)}:${Math.round(height / g)}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function orientationOf(width: number, height: number): ReelOrientation {
  if (!(width > 0) || !(height > 0)) return 'portrait';
  const r = width / height;
  if (r > 0.95 && r < 1.05) return 'square';
  return r < 1 ? 'portrait' : 'landscape';
}

/** Prefer the shorter edge so 1080×1920 reports 1080p (not 1440p). */
export function qualityTierOf(width: number, height: number): ReelQualityTier {
  const short = Math.min(width || 0, height || 0);
  if (short >= 2000) return '2160p';
  if (short >= 1400) return '1440p';
  if (short >= 1000) return '1080p';
  if (short >= 700) return '720p';
  if (short >= 450) return '480p';
  if (short >= 300) return '360p';
  return 'unknown';
}

/**
 * Upload quality choices capped at source resolution (no upscale offers).
 * Maps onto existing CreatorPublishSettings.uploadQuality values.
 */
export type SourceAwareQualityOption = {
  value: 'standard' | 'hd' | 'full_hd' | '2k' | '4k';
  label: string;
  hint: string;
  targetTier: ReelQualityTier;
  /** Rough size factor vs original file (not a promise). */
  sizeFactor: number;
};

export function qualityOptionsForSource(analysis: ReelVideoAnalysis | null): SourceAwareQualityOption[] {
  const rawTier = analysis?.qualityTier || '1080p';
  const tier: ReelQualityTier = rawTier === 'unknown' ? '1080p' : rawTier;
  const order: ReelQualityTier[] = ['2160p', '1440p', '1080p', '720p', '480p', '360p'];
  const rank = (t: ReelQualityTier) => {
    const i = order.indexOf(t);
    return i < 0 ? order.indexOf('1080p') : i;
  };
  const sourceRank = rank(tier);

  const byTier: Record<string, SourceAwareQualityOption> = {
    '2160p': { value: '4k', label: 'Original — 4K', hint: 'Best quality · largest upload', targetTier: '2160p', sizeFactor: 1 },
    '1440p': { value: '2k', label: 'Original — 1440p', hint: 'High detail', targetTier: '1440p', sizeFactor: 1 },
    '1080p': { value: 'full_hd', label: 'Original — 1080p', hint: 'Full HD source', targetTier: '1080p', sizeFactor: 1 },
    '720p': { value: 'hd', label: 'Original — 720p', hint: 'HD source', targetTier: '720p', sizeFactor: 1 },
    '480p': { value: 'standard', label: 'Original — 480p', hint: 'Source quality', targetTier: '480p', sizeFactor: 1 },
    '360p': { value: 'standard', label: 'Original — 360p', hint: 'Source quality', targetTier: '360p', sizeFactor: 1 },
  };

  const out: SourceAwareQualityOption[] = [];
  const source = byTier[tier] || byTier['1080p'];
  out.push({
    ...source,
    label: `Original — ${tier}`,
    hint: analysis ? `Source ${analysis.width}×${analysis.height}` : source.hint,
    sizeFactor: 1,
  });

  // High = one step down when possible (no upscale).
  if (sourceRank < rank('720p')) {
    out.push({
      value: 'full_hd',
      label: 'High — 1080p optimized',
      hint: '~smaller than original · recommended',
      targetTier: '1080p',
      sizeFactor: 0.75,
    });
  } else if (sourceRank < rank('480p')) {
    out.push({
      value: 'hd',
      label: 'High — 720p',
      hint: 'Balanced size & quality',
      targetTier: '720p',
      sizeFactor: 0.55,
    });
  }

  if (sourceRank < rank('480p') && !out.some((o) => o.value === 'hd') && out[0].value !== 'hd') {
    out.push({
      value: 'hd',
      label: 'Standard — 720p',
      hint: 'Good on mobile data',
      targetTier: '720p',
      sizeFactor: 0.55,
    });
  }

  if (out[0].value !== 'standard') {
    out.push({
      value: 'standard',
      label: 'Data Saver — 480p',
      hint: 'Fastest upload',
      targetTier: '480p',
      sizeFactor: 0.3,
    });
  }

  // Deduplicate by value, keep first labels.
  const seen = new Set<string>();
  return out.filter((o) => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  }).slice(0, 4);
}

export function estimateUploadBytes(fileSize: number, sizeFactor: number): number {
  if (!(fileSize > 0)) return 0;
  return Math.max(1024, Math.round(fileSize * Math.min(1, Math.max(0.05, sizeFactor))));
}

export function pickDefaultQuality(analysis: ReelVideoAnalysis | null): SourceAwareQualityOption['value'] {
  const opts = qualityOptionsForSource(analysis);
  // Prefer "High" when distinct from original; else original.
  if (opts.length >= 2) return opts[1].value;
  return opts[0]?.value || 'hd';
}

function probeFps(video: HTMLVideoElement): Promise<number | null> {
  return new Promise((resolve) => {
    const anyVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };
    if (typeof anyVideo.requestVideoFrameCallback !== 'function') {
      resolve(null);
      return;
    }
    let frames = 0;
    let first = 0;
    let last = 0;
    let id = 0;
    const timeout = window.setTimeout(() => {
      if (id && anyVideo.cancelVideoFrameCallback) anyVideo.cancelVideoFrameCallback(id);
      resolve(frames >= 2 && last > first ? Math.round((frames - 1) / (last - first)) : null);
    }, 900);
    const tick = (_now: number, meta: { mediaTime: number }) => {
      if (frames === 0) first = meta.mediaTime;
      last = meta.mediaTime;
      frames += 1;
      if (frames >= 12 && last > first) {
        window.clearTimeout(timeout);
        if (id && anyVideo.cancelVideoFrameCallback) anyVideo.cancelVideoFrameCallback(id);
        resolve(Math.round((frames - 1) / (last - first)));
        return;
      }
      id = anyVideo.requestVideoFrameCallback!(tick);
    };
    try {
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
      id = anyVideo.requestVideoFrameCallback(tick);
    } catch {
      window.clearTimeout(timeout);
      resolve(null);
    }
  });
}

function probeAudio(video: HTMLVideoElement): boolean | null {
  try {
    const anyVideo = video as HTMLVideoElement & { mozHasAudio?: boolean; audioTracks?: { length: number } };
    if (typeof anyVideo.mozHasAudio === 'boolean') return anyVideo.mozHasAudio;
    if (anyVideo.audioTracks && typeof anyVideo.audioTracks.length === 'number') {
      return anyVideo.audioTracks.length > 0;
    }
    // WebKit: capture stream tracks when available
    const capture = (video as any).captureStream?.() as MediaStream | undefined;
    if (capture) {
      const has = capture.getAudioTracks().length > 0;
      capture.getTracks().forEach((t) => t.stop());
      return has;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Analyze a local File via a temporary <video>. Revokes the object URL when done.
 */
export async function analyzeReelVideoFile(file: File): Promise<ReelVideoAnalysis> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const onMeta = () => resolve();
      const onErr = () => reject(new Error('Could not read this video. It may be corrupted or unsupported.'));
      video.addEventListener('loadedmetadata', onMeta, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });

    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    const durationSec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

    let fps: number | null = null;
    try {
      fps = await probeFps(video);
    } catch {
      fps = null;
    }
    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      /* ignore */
    }

    const hasAudio = probeAudio(video);
    const qualityTier = qualityTierOf(width, height);

    return {
      width,
      height,
      durationSec,
      fps,
      aspectLabel: aspectLabelOf(width, height),
      orientation: orientationOf(width, height),
      qualityTier,
      hasAudio,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name,
      estimatedUploadBytes: file.size,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function analysisSnapshot(a: ReelVideoAnalysis | null): Record<string, unknown> | null {
  if (!a) return null;
  return {
    width: a.width,
    height: a.height,
    durationSec: a.durationSec,
    fps: a.fps,
    aspectLabel: a.aspectLabel,
    orientation: a.orientation,
    qualityTier: a.qualityTier,
    hasAudio: a.hasAudio,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    fileName: a.fileName,
  };
}
