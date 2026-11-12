/**
 * Non-destructive reel editor state (Phase 2).
 * Preview-only until Phase 3 server bake — originals stay untouched.
 */

export const REEL_EDIT_STATE_VERSION = 1 as const;

export type ReelAspectMode = 'fit' | 'crop' | 'original';
export type ReelPreviewDevice = 'mobile' | 'desktop';
export type ReelCropAspect = '9:16' | '4:5' | '1:1' | '16:9' | 'free';

export type ReelFilterPreset =
  | 'none'
  | 'natural'
  | 'warm'
  | 'cool'
  | 'cinematic'
  | 'vintage'
  | 'bw'
  | 'bright'
  | 'contrast'
  | 'soft';

export interface ReelEditAdjustments {
  brightness: number; // 100 = normal
  contrast: number;
  saturation: number;
  exposure: number; // mapped to brightness boost
  highlights: number;
  shadows: number;
  temperature: number; // -100..100 → sepia/hue bias
  sharpness: number; // 0..100 (preview via contrast)
  fade: number;
  vignette: number;
}

export interface ReelTextOverlay {
  id: string;
  text: string;
  x: number; // 0–1
  y: number;
  fontSize: number;
  color: string;
  bg: string;
  opacity: number;
  align: 'left' | 'center' | 'right';
  startSec: number;
  endSec: number | null;
}

export interface ReelStickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  startSec: number;
  endSec: number | null;
}

export interface ReelMusicEdit {
  musicId: string;
  startTime: number;
  endTime: number | null;
  volume: number;
  originalAudioMuted: boolean;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl: string;
  duration: number;
}

export interface ReelEditState {
  version: typeof REEL_EDIT_STATE_VERSION;
  trimStart: number;
  trimEnd: number | null;
  aspectMode: ReelAspectMode;
  cropAspect: ReelCropAspect;
  /** Pan within crop frame, -1..1 */
  reframeX: number;
  reframeY: number;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  speed: number;
  volume: number;
  muted: boolean;
  filterPreset: ReelFilterPreset;
  filterIntensity: number; // 0–100
  adjustments: ReelEditAdjustments;
  coverTimeSec: number | null;
  coverDataUrl: string | null;
  music: ReelMusicEdit | null;
  textOverlays: ReelTextOverlay[];
  stickers: ReelStickerOverlay[];
  previewDevice: ReelPreviewDevice;
  showSafeArea: boolean;
}

export const DEFAULT_ADJUSTMENTS: ReelEditAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  sharpness: 0,
  fade: 0,
  vignette: 0,
};

export const DEFAULT_REEL_EDIT_STATE: ReelEditState = {
  version: REEL_EDIT_STATE_VERSION,
  trimStart: 0,
  trimEnd: null,
  aspectMode: 'fit',
  cropAspect: '9:16',
  reframeX: 0,
  reframeY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  speed: 1,
  volume: 1,
  muted: false,
  filterPreset: 'none',
  filterIntensity: 100,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  coverTimeSec: null,
  coverDataUrl: null,
  music: null,
  textOverlays: [],
  stickers: [],
  previewDevice: 'mobile',
  showSafeArea: true,
};

export const FILTER_PRESETS: Array<{ id: ReelFilterPreset; label: string; css: string }> = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'natural', label: 'Natural', css: 'saturate(1.05) contrast(1.02)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.15) brightness(1.03)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(15deg) saturate(0.95) brightness(1.02)' },
  { id: 'cinematic', label: 'Cinematic', css: 'contrast(1.15) saturate(0.9) brightness(0.95)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(0.95) brightness(1.05)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'bright', label: 'Bright', css: 'brightness(1.12) saturate(1.05)' },
  { id: 'contrast', label: 'Contrast', css: 'contrast(1.25) saturate(1.05)' },
  { id: 'soft', label: 'Soft', css: 'brightness(1.05) contrast(0.92) saturate(0.95)' },
];

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function createReelEditState(partial?: Partial<ReelEditState>): ReelEditState {
  return {
    ...DEFAULT_REEL_EDIT_STATE,
    ...partial,
    adjustments: { ...DEFAULT_ADJUSTMENTS, ...(partial?.adjustments || {}) },
    textOverlays: partial?.textOverlays ? [...partial.textOverlays] : [],
    stickers: partial?.stickers ? [...partial.stickers] : [],
  };
}

export function parseReelEditState(raw: unknown): ReelEditState | null {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  return createReelEditState({
    trimStart: Number(obj.trimStart) || 0,
    trimEnd: obj.trimEnd == null ? null : Number(obj.trimEnd),
    aspectMode: obj.aspectMode === 'crop' || obj.aspectMode === 'original' ? obj.aspectMode : 'fit',
    cropAspect: ['9:16', '4:5', '1:1', '16:9', 'free'].includes(obj.cropAspect) ? obj.cropAspect : '9:16',
    reframeX: clamp(Number(obj.reframeX) || 0, -1, 1),
    reframeY: clamp(Number(obj.reframeY) || 0, -1, 1),
    rotation: ([0, 90, 180, 270] as const).includes(obj.rotation) ? obj.rotation : 0,
    flipH: !!obj.flipH,
    flipV: !!obj.flipV,
    speed: Number(obj.speed) > 0 ? Number(obj.speed) : 1,
    volume: clamp(Number(obj.volume), 0, 1),
    muted: !!obj.muted,
    filterPreset: FILTER_PRESETS.some((f) => f.id === obj.filterPreset) ? obj.filterPreset : 'none',
    filterIntensity: clamp(Number(obj.filterIntensity), 0, 100),
    adjustments: { ...DEFAULT_ADJUSTMENTS, ...(obj.adjustments || {}) },
    coverTimeSec: obj.coverTimeSec == null ? null : Number(obj.coverTimeSec),
    coverDataUrl: typeof obj.coverDataUrl === 'string' ? obj.coverDataUrl : null,
    music: obj.music && obj.music.musicId
      ? {
          musicId: String(obj.music.musicId),
          startTime: Number(obj.music.startTime) || 0,
          endTime: obj.music.endTime == null ? null : Number(obj.music.endTime),
          volume: clamp(Number(obj.music.volume), 0, 1),
          originalAudioMuted: !!obj.music.originalAudioMuted,
          title: String(obj.music.title || 'Music'),
          artist: obj.music.artist ?? null,
          coverImage: obj.music.coverImage ?? null,
          audioUrl: String(obj.music.audioUrl || ''),
          duration: Number(obj.music.duration) || 0,
        }
      : null,
    textOverlays: Array.isArray(obj.textOverlays) ? obj.textOverlays : [],
    stickers: Array.isArray(obj.stickers) ? obj.stickers : [],
    previewDevice: obj.previewDevice === 'desktop' ? 'desktop' : 'mobile',
    showSafeArea: obj.showSafeArea !== false,
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Build CSS filter string for live preview (non-destructive). */
export function cssFilterFromEdit(state: ReelEditState): string {
  const parts: string[] = [];
  const preset = FILTER_PRESETS.find((f) => f.id === state.filterPreset);
  const intensity = (state.filterIntensity ?? 100) / 100;
  if (preset && preset.id !== 'none' && preset.css !== 'none') {
    if (intensity >= 0.99) parts.push(preset.css);
    else parts.push(`opacity(${0.35 + intensity * 0.65})`); // soft blend hint; full stack below
    if (intensity < 0.99) parts.push(preset.css);
  }

  const a = state.adjustments;
  const brightness = ((a.brightness || 100) + (a.exposure || 0) * 0.4) / 100;
  const contrast = (a.contrast || 100) / 100 + (a.sharpness || 0) / 400;
  const saturate = (a.saturation || 100) / 100;
  parts.push(`brightness(${brightness.toFixed(3)})`);
  parts.push(`contrast(${contrast.toFixed(3)})`);
  parts.push(`saturate(${saturate.toFixed(3)})`);
  if (a.temperature) {
    const t = a.temperature / 100;
    if (t > 0) parts.push(`sepia(${(t * 0.35).toFixed(3)})`);
    else parts.push(`hue-rotate(${(t * -25).toFixed(1)}deg)`);
  }
  if (a.fade > 0) parts.push(`opacity(${(1 - a.fade / 200).toFixed(3)})`);
  return parts.join(' ') || 'none';
}

export function videoTransformFromEdit(state: ReelEditState): string {
  const flips = `${state.flipH ? 'scaleX(-1)' : ''} ${state.flipV ? 'scaleY(-1)' : ''}`.trim();
  const rot = state.rotation ? `rotate(${state.rotation}deg)` : '';
  return [flips, rot].filter(Boolean).join(' ') || 'none';
}

export function objectFitFromEdit(state: ReelEditState): 'contain' | 'cover' {
  if (state.aspectMode === 'crop') return 'cover';
  return 'contain';
}

export function editNeedsHeavyProcess(state: ReelEditState): boolean {
  if (state.trimStart > 0.05 || (state.trimEnd != null && state.trimEnd > 0)) return true;
  if (state.rotation !== 0 || state.flipH || state.flipV) return true;
  if (state.speed !== 1) return true;
  if (state.filterPreset !== 'none') return true;
  if (state.aspectMode === 'crop') return true;
  if (state.music) return true;
  if (state.textOverlays.length || state.stickers.length) return true;
  const a = state.adjustments;
  const changed = Object.entries(DEFAULT_ADJUSTMENTS).some(([k, v]) => (a as any)[k] !== v);
  return changed;
}

export function newOverlayId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
