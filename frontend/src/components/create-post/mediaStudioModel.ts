/**
 * Media Studio edit model (post composer).
 * Photos: everything here is baked into a new image file on Save (canvas export).
 * Videos: preview is live (CSS); on Save the full edit (edit list, filters, overlays, audio,
 * captions, stabilize, denoise) is rendered server-side by FFmpeg (/api/media-studio/render).
 */

export type AdjustKey =
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'highlights'
  | 'shadows'
  | 'temperature'
  | 'sharpness';

export const ADJUST_KEYS: Array<{ key: AdjustKey; label: string }> = [
  { key: 'exposure', label: 'Exposure' },
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'shadows', label: 'Shadows' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'sharpness', label: 'Sharpness' },
];

export type PresetId = 'original' | 'vivid' | 'warm' | 'cinematic' | 'mono' | 'cool' | 'fade' | 'noir';
export const PRESETS: Array<{ id: PresetId; label: string; css: string }> = [
  { id: 'original', label: 'Original', css: '' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.4) contrast(1.1)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.28) saturate(1.25) hue-rotate(-8deg)' },
  { id: 'cinematic', label: 'Cinematic', css: 'contrast(1.2) saturate(0.85) sepia(0.15) hue-rotate(-12deg)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.1) hue-rotate(12deg) brightness(1.03)' },
  { id: 'fade', label: 'Fade', css: 'contrast(0.85) brightness(1.08) saturate(0.8)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.4) brightness(0.9)' },
];
export const MAIN_PRESETS: PresetId[] = ['original', 'vivid', 'warm', 'cinematic', 'mono'];

export type EffectId = 'blur' | 'vintage' | 'bw' | 'glow' | 'sharpen' | 'soft' | 'dramatic' | 'mist';
export const EFFECTS: Array<{ id: EffectId; label: string; css: string }> = [
  { id: 'blur', label: 'Blur', css: 'blur(2px)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(0.9) saturate(0.9)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1)' },
  { id: 'glow', label: 'Glow', css: 'brightness(1.12) saturate(1.15)' },
  { id: 'sharpen', label: 'Sharpen', css: 'contrast(1.18)' },
  { id: 'soft', label: 'Soft', css: 'brightness(1.06) contrast(0.92) saturate(0.95)' },
  { id: 'dramatic', label: 'Dramatic', css: 'contrast(1.35) saturate(1.2) brightness(0.95)' },
  { id: 'mist', label: 'Mist', css: 'brightness(1.1) contrast(0.88) blur(0.6px)' },
];

export type AspectId = 'original' | '1:1' | '4:5' | '16:9' | '9:16';
export const ASPECTS: Array<{ id: AspectId; label: string; ratio: number | null }> = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

export type Rect = { x: number; y: number; w: number; h: number };

/** start/end are in OUTPUT seconds (video only); null = whole clip. */
export type TextLayer = { id: string; text: string; x: number; y: number; size: number; color: string; start?: number | null; end?: number | null };
export type StickerLayer = { id: string; emoji: string; x: number; y: number; size: number; start?: number | null; end?: number | null };
/** Edit-list entry, source seconds. */
export type Segment = { id: string; start: number; end: number };
/** Caption cue, OUTPUT seconds. */
export type Caption = { id: string; start: number; end: number; text: string };
export type Spot = { x: number; y: number; r: number };
export type Retouch = { smooth: number; spots: Spot[]; redEye: Spot[] };
export type BackgroundEdit = { mode: 'none' | 'blur' | 'color'; color: string; amount: number };
export type MusicTrack = { url: string; name: string; volume: number };

export interface MediaEdit {
  adjust: Record<AdjustKey, number>;
  preset: PresetId;
  effects: EffectId[];
  aspect: AspectId;
  fit: 'fit' | 'fill';
  crop: Rect;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  texts: TextLayer[];
  stickers: StickerLayer[];
  /** Video only (seconds). end null = to the end. */
  trimStart: number;
  trimEnd: number | null;
  speed: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  /** Video edit list (source seconds). null = single segment from trimStart..trimEnd. */
  segments: Segment[] | null;
  /** Source audio volume, percent (100 = original). */
  volume: number;
  audioFadeIn: number;
  audioFadeOut: number;
  music: MusicTrack | null;
  captions: Caption[];
  stabilize: boolean;
  denoise: number;
  /** Fit letterbox fill: '#rrggbb' or 'blur'. */
  padFill: string;
  retouch: Retouch;
  background: BackgroundEdit;
}

export const FULL_RECT: Rect = { x: 0, y: 0, w: 1, h: 1 };

export function defaultEdit(): MediaEdit {
  return {
    adjust: {
      exposure: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      highlights: 0,
      shadows: 0,
      temperature: 0,
      sharpness: 0,
    },
    preset: 'original',
    effects: [],
    aspect: 'original',
    fit: 'fit',
    crop: { ...FULL_RECT },
    rotation: 0,
    flipH: false,
    texts: [],
    stickers: [],
    trimStart: 0,
    trimEnd: null,
    speed: 1,
    fadeIn: 0,
    fadeOut: 0,
    muted: false,
    segments: null,
    volume: 100,
    audioFadeIn: 0,
    audioFadeOut: 0,
    music: null,
    captions: [],
    stabilize: false,
    denoise: 0,
    padFill: '#000000',
    retouch: { smooth: 0, spots: [], redEye: [] },
    background: { mode: 'none', color: '#ffffff', amount: 60 },
  };
}

/** Fill in fields missing from older autosaves. */
export function normalizeEdit(e: Partial<MediaEdit> | null | undefined): MediaEdit {
  const d = defaultEdit();
  const x = { ...d, ...(e || {}) } as MediaEdit;
  x.adjust = { ...d.adjust, ...(e?.adjust || {}) };
  x.retouch = { ...d.retouch, ...(e?.retouch || {}) };
  x.background = { ...d.background, ...(e?.background || {}) };
  x.captions = Array.isArray(x.captions) ? x.captions : [];
  return x;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.002;

export function isRectFull(r: Rect) {
  return near(r.x, 0) && near(r.y, 0) && near(r.w, 1) && near(r.h, 1);
}

export function isDefaultEdit(e: MediaEdit): boolean {
  const d = defaultEdit();
  return (
    Object.values(e.adjust).every((v) => v === 0) &&
    e.preset === 'original' &&
    e.effects.length === 0 &&
    e.aspect === d.aspect &&
    isRectFull(e.crop) &&
    e.rotation === 0 &&
    !e.flipH &&
    e.texts.length === 0 &&
    e.stickers.length === 0 &&
    e.trimStart === 0 &&
    e.trimEnd == null &&
    e.speed === 1 &&
    e.fadeIn === 0 &&
    e.fadeOut === 0 &&
    !e.muted &&
    !e.segments &&
    (e.volume ?? 100) === 100 &&
    !e.audioFadeIn &&
    !e.audioFadeOut &&
    !e.music &&
    !(e.captions || []).length &&
    !e.stabilize &&
    !e.denoise &&
    (!e.retouch || (!e.retouch.smooth && !e.retouch.spots.length && !e.retouch.redEye.length)) &&
    (!e.background || e.background.mode === 'none')
  );
}

/** Adjustments → CSS filter functions (also used by canvas ctx.filter for export). */
export function adjustCss(a: Record<AdjustKey, number>): string {
  const parts: string[] = [];
  const bright = 1 + (a.brightness + a.exposure * 0.6 + a.highlights * 0.15 + a.shadows * 0.2) / 100;
  const contrast = 1 + (a.contrast + a.sharpness * 0.25 + a.highlights * 0.1 - a.shadows * 0.15) / 100;
  const sat = 1 + a.saturation / 100;
  if (!near(bright, 1)) parts.push(`brightness(${bright.toFixed(3)})`);
  if (!near(contrast, 1)) parts.push(`contrast(${contrast.toFixed(3)})`);
  if (!near(sat, 1)) parts.push(`saturate(${Math.max(0, sat).toFixed(3)})`);
  if (a.temperature > 0) parts.push(`sepia(${(a.temperature / 220).toFixed(3)})`);
  if (a.temperature < 0) parts.push(`hue-rotate(${(a.temperature * 0.25).toFixed(1)}deg) saturate(${(1 - a.temperature / 400).toFixed(3)})`);
  return parts.join(' ');
}

export function presetCss(id: PresetId): string {
  return PRESETS.find((p) => p.id === id)?.css || '';
}

export function effectsCss(ids: EffectId[]): string {
  return ids.map((id) => EFFECTS.find((e) => e.id === id)?.css || '').filter(Boolean).join(' ');
}

export function editCss(e: MediaEdit): string {
  return [adjustCss(e.adjust), presetCss(e.preset), effectsCss(e.effects)].filter(Boolean).join(' ') || 'none';
}

/** Largest centred rect with the given pixel aspect inside a w×h media (normalised). */
export function rectForAspect(ratio: number, mediaW: number, mediaH: number): Rect {
  if (!mediaW || !mediaH) return { ...FULL_RECT };
  const mediaRatio = mediaW / mediaH;
  if (ratio > mediaRatio) {
    const h = mediaRatio / ratio;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = ratio / mediaRatio;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

export function aspectRatioOf(id: AspectId): number | null {
  return ASPECTS.find((a) => a.id === id)?.ratio ?? null;
}

export function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export function isVideoFile(f: File): boolean {
  return f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/** Rotate / flip a photo into a new object URL (working source for further edits). */
export async function orientImage(src: string, rotation: number, flipH: boolean): Promise<string> {
  if (!rotation && !flipH) return src;
  const img = await loadImage(src);
  const swap = rotation === 90 || rotation === 270;
  const c = document.createElement('canvas');
  c.width = swap ? img.naturalHeight : img.naturalWidth;
  c.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipH) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
  return URL.createObjectURL(blob);
}

/** Bake a photo edit into a new File (filters, overlays, crop, aspect letterbox). */
export async function exportPhoto(srcFile: File, workingSrc: string, e: MediaEdit): Promise<File> {
  const img = await loadImage(workingSrc);
  const rawW = img.naturalWidth;
  const rawH = img.naturalHeight;
  const isRot90 = e.rotation % 180 === 90;
  const W = isRot90 ? rawH : rawW;
  const H = isRot90 ? rawW : rawH;
  const full = document.createElement('canvas');
  full.width = W;
  full.height = H;
  const fctx = full.getContext('2d')!;
  fctx.filter = editCss(e);
  if (e.rotation || e.flipH) {
    fctx.save();
    fctx.translate(W / 2, H / 2);
    if (e.rotation) fctx.rotate((e.rotation * Math.PI) / 180);
    if (e.flipH) fctx.scale(-1, 1);
    fctx.drawImage(img, -rawW / 2, -rawH / 2);
    fctx.restore();
  } else {
    fctx.drawImage(img, 0, 0);
  }
  fctx.filter = 'none';
  const base = Math.min(W, H);
  for (const t of e.texts) {
    const px = Math.round((t.size / 100) * base);
    fctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
    fctx.textAlign = 'center';
    fctx.textBaseline = 'middle';
    fctx.lineWidth = Math.max(2, px / 10);
    fctx.strokeStyle = 'rgba(0,0,0,0.55)';
    fctx.strokeText(t.text, t.x * W, t.y * H);
    fctx.fillStyle = t.color;
    fctx.fillText(t.text, t.x * W, t.y * H);
  }
  for (const s of e.stickers) {
    const px = Math.round((s.size / 100) * base);
    fctx.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    fctx.textAlign = 'center';
    fctx.textBaseline = 'middle';
    fctx.fillText(s.emoji, s.x * W, s.y * H);
  }
  const cx = Math.round(e.crop.x * W);
  const cy = Math.round(e.crop.y * H);
  const cw = Math.max(1, Math.round(e.crop.w * W));
  const ch = Math.max(1, Math.round(e.crop.h * H));
  const ratio = aspectRatioOf(e.aspect);
  const out = document.createElement('canvas');
  if (ratio && e.fit === 'fit' && Math.abs(cw / ch - ratio) > 0.01) {
    // Letterbox the crop into the chosen aspect.
    if (cw / ch > ratio) {
      out.width = cw;
      out.height = Math.round(cw / ratio);
    } else {
      out.height = ch;
      out.width = Math.round(ch * ratio);
    }
    const octx = out.getContext('2d')!;
    if (e.padFill === 'blur') {
      // blurred, cover-scaled copy of the crop behind the letterboxed media
      const sc = Math.max(out.width / cw, out.height / ch);
      octx.filter = `blur(${Math.round(Math.max(out.width, out.height) / 40)}px) brightness(0.92)`;
      octx.drawImage(full, cx, cy, cw, ch, (out.width - cw * sc) / 2, (out.height - ch * sc) / 2, cw * sc, ch * sc);
      octx.filter = 'none';
    } else {
      octx.fillStyle = /^#[0-9a-f]{6}$/i.test(e.padFill || '') ? e.padFill : '#000';
      octx.fillRect(0, 0, out.width, out.height);
    }
    octx.drawImage(full, cx, cy, cw, ch, (out.width - cw) / 2, (out.height - ch) / 2, cw, ch);
  } else {
    out.width = cw;
    out.height = ch;
    out.getContext('2d')!.drawImage(full, cx, cy, cw, ch, 0, 0, cw, ch);
  }
  const type = srcFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((r) => out.toBlob((b) => r(b!), type, 0.92));
  const name = srcFile.name.replace(/(\.[a-z0-9]+)?$/i, type === 'image/png' ? '-edited.png' : '-edited.jpg');
  return new File([blob], name, { type, lastModified: Date.now() });
}

/** Video edit → post media metadata understood by the publish worker (video-bake.ts). */
export function videoEditMeta(e: MediaEdit) {
  const a = e.adjust;
  return {
    trim: e.trimStart > 0 || e.trimEnd != null ? { start: e.trimStart, end: e.trimEnd } : null,
    filters: {
      // Read by the FFmpeg bake worker.
      trimStart: e.trimStart,
      trimEnd: e.trimEnd,
      speed: e.speed,
      rotation: e.rotation,
      flipH: e.flipH,
      muted: e.muted,
      volume: e.muted ? 0 : 1,
      adjustments: {
        exposure: a.exposure,
        brightness: 100 + a.brightness,
        contrast: 100 + a.contrast,
        saturation: 100 + a.saturation,
        sharpness: a.sharpness,
      },
      // Stored for re-editing / client preview (not baked by FFmpeg yet).
      preset: e.preset === 'original' ? null : e.preset,
      effects: e.effects,
      fadeIn: e.fadeIn,
      fadeOut: e.fadeOut,
      aspect: e.aspect,
      css: editCss(e),
    },
  };
}
