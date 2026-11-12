/**
 * W5 — ABR / packaging preference for VOD playback.
 * Prefer CMAF HLS-fMP4 when present; optional DASH; always fall back to TS HLS / progressive.
 */

export type VideoAbrMode = 'auto' | 'cmaf' | 'dash' | 'hls';

export type MediaFileChip = {
  url?: string | null;
  quality?: string | null;
  kind?: string | null;
};

const LS_KEY = 'wev_video_abr';

function envFlag(name: string, fallback = false): boolean {
  try {
    const v = String((import.meta as any).env?.[name] ?? '').trim().toLowerCase();
    if (!v) return fallback;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  } catch {
    return fallback;
  }
}

/** Prefer CMAF HLS-fMP4 over MPEG-TS when both exist (default on). */
export function isPreferCmafEnabled(): boolean {
  return envFlag('VITE_VIDEO_PREFER_CMAF', true);
}

/** Allow picking DASH MPD when packaged (default on — dash.js dynamic import). */
export function isDashPlaybackEnabled(): boolean {
  return envFlag('VITE_VIDEO_ENABLE_DASH', true);
}

export function readAbrModeOverride(): VideoAbrMode | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = String(localStorage.getItem(LS_KEY) || '').trim().toLowerCase();
    if (raw === 'auto' || raw === 'cmaf' || raw === 'dash' || raw === 'hls') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAbrModeOverride(mode: VideoAbrMode | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!mode || mode === 'auto') localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function resolveAbrMode(): VideoAbrMode {
  const override = readAbrModeOverride();
  if (override) return override;
  if (isDashPlaybackEnabled()) return 'auto'; // auto may pick dash when present if prefer order allows
  if (isPreferCmafEnabled()) return 'auto';
  return 'hls';
}

export function isDashUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url);
  return /\.mpd(\?|#|$)/i.test(u) || /\/dash\//i.test(u);
}

export function isCmafHlsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url);
  return /\/cmaf\//i.test(u) && /\.m3u8(\?|#|$)/i.test(u);
}

export function findMediaMaster(
  files: MediaFileChip[] | null | undefined,
  kind: string,
): string | null {
  if (!Array.isArray(files)) return null;
  const auto = files.find(
    (m) => m.kind === kind && (m.quality === 'auto' || !m.quality) && m.url,
  );
  if (auto?.url) return String(auto.url);
  const any = files.find((m) => m.kind === kind && m.url);
  return any?.url ? String(any.url) : null;
}

/**
 * Choose adaptive master URL before falling back to reel.hlsUrl (TS).
 * Order for `auto`: dash (if enabled) → cmaf fMP4 → null (caller uses TS).
 */
export function pickPreferredAdaptiveUrl(
  reel: {
    hlsUrl?: string | null;
    mediaFiles?: MediaFileChip[] | null;
  },
  opts: { preferCmaf?: boolean; enableDash?: boolean; mode?: VideoAbrMode } = {},
): string | null {
  const mode = opts.mode ?? resolveAbrMode();
  const preferCmaf = opts.preferCmaf ?? isPreferCmafEnabled();
  const enableDash = opts.enableDash ?? isDashPlaybackEnabled();
  const files = reel.mediaFiles;

  if (mode === 'hls') return null;

  // auto: CMAF fMP4 first (hls.js), then optional DASH, else caller uses TS hlsUrl.
  if (mode === 'cmaf' || (mode === 'auto' && preferCmaf)) {
    const cmaf = findMediaMaster(files, 'hls_fmp4');
    if (cmaf) return cmaf;
    if (mode === 'cmaf') return null;
  }

  if (mode === 'dash' || (mode === 'auto' && enableDash)) {
    const dash = findMediaMaster(files, 'dash');
    if (dash) return dash;
    if (mode === 'dash') return null;
  }

  return null;
}
