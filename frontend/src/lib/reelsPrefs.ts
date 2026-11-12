import { canUseHlsPlayback, isHlsUrl } from './hlsPlayback';
import { isDashUrl, pickPreferredAdaptiveUrl } from './videoAbrPrefs';

export type ReelsSettings = {
  autoplayMode: 'always' | 'wifi' | 'off';
  soundMode: 'remember' | 'muted' | 'sound' | 'auto_unmute';
  defaultVolume: number;
  playbackSpeed: number;
  loopVideo: boolean;
  autoNext: boolean;
  dataSaver: boolean;
  hdOnlyWifi: boolean;
  disablePreload: boolean;
  autoCaptions: boolean;
  captionLanguage: string;
  captionFontSize: string;
  highContrast: boolean;
  infiniteScroll: boolean;
  showWatched: boolean;
  cinematicMode: boolean;
  showNavIndicator: boolean;
  showProgressBar: boolean;
  autoHideChrome: boolean;
  preferredQuality: string;
  platform?: {
    enabled: boolean;
    globalAutoplay: boolean;
    allowDownload: boolean;
    allowPip: boolean;
    allowCaptions: boolean;
  };
};

const DEFAULTS: ReelsSettings = {
  autoplayMode: 'wifi',
  soundMode: 'remember',
  defaultVolume: 0.8,
  playbackSpeed: 1,
  loopVideo: true,
  autoNext: false,
  dataSaver: false,
  hdOnlyWifi: true,
  disablePreload: false,
  autoCaptions: false,
  captionLanguage: 'en',
  captionFontSize: 'md',
  highContrast: false,
  infiniteScroll: true,
  showWatched: true,
  cinematicMode: false,
  showNavIndicator: true,
  showProgressBar: true,
  autoHideChrome: false,
  preferredQuality: 'Auto',
};

let cached: ReelsSettings | null = null;

export function onWifi(): boolean {
  const conn = (navigator as any).connection || (navigator as any).mozConnection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.type === 'wifi' || conn.type === 'ethernet') return true;
  if (!conn.type && conn.effectiveType === '4g') return true;
  return conn.type === 'wifi';
}

export function shouldAutoplay(settings: ReelsSettings): boolean {
  if (settings.platform && settings.platform.globalAutoplay === false) return false;
  if (settings.autoplayMode === 'off') return false;
  if (settings.autoplayMode === 'always') return true;
  return onWifi();
}

/**
 * Lightweight source for feed tray / carousel previews.
 * Prefer 480p progressive — never pull a full HLS ladder for a tiny tile.
 */
function isAdaptiveKind(kind: string | null | undefined): boolean {
  const k = String(kind || '');
  return k === 'hls' || k === 'hls_fmp4' || k === 'dash' || k === 'cmaf';
}

export function pickPreviewVideoSrc(reel: {
  videoUrl?: string | null;
  mediaFiles?: Array<{ url?: string; quality?: string; kind?: string }> | null;
}): string {
  const files = Array.isArray(reel.mediaFiles) ? reel.mediaFiles : [];
  const low = files.find(
    (m) =>
      m.quality === '480p'
      && !isAdaptiveKind(m.kind)
      && !isHlsUrl(m.url)
      && !isDashUrl(m.url),
  );
  if (low?.url) return low.url;
  const anyProg = files.find(
    (m) => m.kind === 'progressive' && m.url && !isHlsUrl(m.url) && !isDashUrl(m.url),
  );
  if (anyProg?.url) return anyProg.url;
  return String(reel.videoUrl || '');
}

export function pickVideoSrc(reel: any, settings: ReelsSettings): string {
  const canHls = canUseHlsPlayback();
  const saver = settings.dataSaver || (settings.hdOnlyWifi && !onWifi());
  const want = settings.preferredQuality && settings.preferredQuality !== 'Auto' ? settings.preferredQuality : '';
  if (want && Array.isArray(reel.mediaFiles)) {
    const hit = reel.mediaFiles.find(
      (m: any) =>
        m.quality === want
        && !isHlsUrl(m.url)
        && !isDashUrl(m.url)
        && !isAdaptiveKind(m.kind),
    );
    if (hit?.url) return hit.url;
    const hlsHit = reel.mediaFiles.find(
      (m: any) =>
        m.quality === want
        && (m.kind === 'hls' || m.kind === 'hls_fmp4' || isHlsUrl(m.url)),
    );
    if (canHls && hlsHit?.url) return hlsHit.url;
  }
  if (saver && Array.isArray(reel.mediaFiles)) {
    const lowProg = reel.mediaFiles.find(
      (m: any) =>
        m.quality === '480p'
        && !isAdaptiveKind(m.kind)
        && !isHlsUrl(m.url)
        && !isDashUrl(m.url),
    );
    if (lowProg?.url) return lowProg.url;
    const lowHls = reel.mediaFiles.find(
      (m: any) =>
        m.quality === '480p'
        && (m.kind === 'hls' || m.kind === 'hls_fmp4' || isHlsUrl(m.url)),
    );
    if (canHls && lowHls?.url) return lowHls.url;
  }
  // W5: prefer CMAF fMP4 (or DASH if enabled) when packaged; else MPEG-TS hlsUrl.
  if (!saver) {
    const preferred = pickPreferredAdaptiveUrl(reel);
    if (preferred) {
      if (isDashUrl(preferred)) return preferred;
      if (canHls) return preferred;
    }
    if (canHls && reel.hlsUrl) return reel.hlsUrl;
  }
  return reel.videoUrl;
}

const VIEW_KEYS = ['cinematicMode', 'showNavIndicator', 'showProgressBar', 'autoHideChrome', 'preferredQuality'] as const;

function readViewPrefs(): Partial<ReelsSettings> {
  try {
    const raw = localStorage.getItem('wev_reels_view');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeViewPrefs(patch: Partial<ReelsSettings>) {
  try {
    const next = { ...readViewPrefs(), ...patch };
    const slim: Record<string, unknown> = {};
    for (const k of VIEW_KEYS) {
      if (next[k] !== undefined) slim[k] = next[k];
    }
    localStorage.setItem('wev_reels_view', JSON.stringify(slim));
  } catch { /* ignore */ }
}

export async function loadReelsSettings(token: string | null): Promise<ReelsSettings> {
  const view = readViewPrefs();
  if (!token) return { ...DEFAULTS, ...view };
  try {
    const res = await fetch('/api/reels/settings', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ...DEFAULTS, ...view };
    const data = await res.json();
    cached = { ...DEFAULTS, ...data, ...view };
    return cached;
  } catch {
    return { ...DEFAULTS, ...view };
  }
}

export function getCachedReelsSettings(): ReelsSettings {
  return cached || { ...DEFAULTS, ...readViewPrefs() };
}

export async function saveReelsSettings(token: string | null, patch: Partial<ReelsSettings>) {
  writeViewPrefs(patch);
  cached = { ...getCachedReelsSettings(), ...patch };
  if (!token) return;
  await fetch('/api/reels/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
