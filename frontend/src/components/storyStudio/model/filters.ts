import { clamp, type Adjust, type Effects, type Slide } from './types';

export interface FilterParams {
  brightness: number; // 1 = neutral
  contrast: number;
  saturate: number;
  sepia: number; // 0..1
  grayscale: number; // 0..1
  hue: number; // deg
  blur: number; // px
}

const NEUTRAL: FilterParams = { brightness: 1, contrast: 1, saturate: 1, sepia: 0, grayscale: 0, hue: 0, blur: 0 };

export interface FilterPreset {
  id: string;
  label: string;
  params: FilterParams;
  /** UI chip gradient (not baked into media). */
  swatch?: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'Original', params: NEUTRAL, swatch: 'linear-gradient(135deg,#94a3b8,#e2e8f0)' },
  { id: 'vivid', label: 'Vivid', params: { ...NEUTRAL, contrast: 1.12, saturate: 1.55 }, swatch: 'linear-gradient(135deg,#f43f5e,#f97316,#eab308)' },
  { id: 'pop', label: 'Pop', params: { ...NEUTRAL, contrast: 1.2, saturate: 1.75, brightness: 1.05 }, swatch: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
  { id: 'warm', label: 'Warm', params: { ...NEUTRAL, sepia: 0.28, saturate: 1.2, hue: -8, brightness: 1.04 }, swatch: 'linear-gradient(135deg,#fb923c,#fbbf24)' },
  { id: 'golden', label: 'Golden', params: { ...NEUTRAL, sepia: 0.35, saturate: 1.35, brightness: 1.08, contrast: 1.08 }, swatch: 'linear-gradient(135deg,#f59e0b,#fde68a)' },
  { id: 'cool', label: 'Cool', params: { ...NEUTRAL, hue: 12, saturate: 1.08, brightness: 1.02, contrast: 1.04 }, swatch: 'linear-gradient(135deg,#38bdf8,#6366f1)' },
  { id: 'arctic', label: 'Arctic', params: { ...NEUTRAL, hue: 18, saturate: 0.95, brightness: 1.08, contrast: 1.1 }, swatch: 'linear-gradient(135deg,#67e8f9,#a5b4fc)' },
  { id: 'fade', label: 'Fade', params: { ...NEUTRAL, contrast: 0.86, brightness: 1.1, saturate: 0.82 }, swatch: 'linear-gradient(135deg,#fda4af,#c4b5fd)' },
  { id: 'pastel', label: 'Pastel', params: { ...NEUTRAL, brightness: 1.12, contrast: 0.9, saturate: 1.15 }, swatch: 'linear-gradient(135deg,#f9a8d4,#a5f3fc)' },
  { id: 'drama', label: 'Drama', params: { ...NEUTRAL, contrast: 1.35, saturate: 1.15, brightness: 0.92 }, swatch: 'linear-gradient(135deg,#7c2d12,#1e1b4b)' },
  { id: 'cinema', label: 'Cinema', params: { ...NEUTRAL, contrast: 1.28, saturate: 0.95, brightness: 0.94, hue: -4 }, swatch: 'linear-gradient(135deg,#0f172a,#334155)' },
  { id: 'vintage', label: 'Vintage', params: { ...NEUTRAL, sepia: 0.5, contrast: 1.15, saturate: 1.3 }, swatch: 'linear-gradient(135deg,#a16207,#78350f)' },
  { id: 'retro', label: 'Retro', params: { ...NEUTRAL, sepia: 0.4, hue: -15, saturate: 1.4, contrast: 1.1 }, swatch: 'linear-gradient(135deg,#f472b6,#fb923c)' },
  { id: 'mono', label: 'B&W', params: { ...NEUTRAL, grayscale: 1, contrast: 1.1 }, swatch: 'linear-gradient(135deg,#111,#bbb)' },
  { id: 'noir', label: 'Noir', params: { ...NEUTRAL, grayscale: 1, contrast: 1.45, brightness: 0.9 }, swatch: 'linear-gradient(135deg,#000,#444)' },
  { id: 'dream', label: 'Dream', params: { ...NEUTRAL, brightness: 1.08, saturate: 1.2, blur: 0.8, contrast: 0.95 }, swatch: 'linear-gradient(135deg,#c084fc,#67e8f9)' },
  { id: 'glow', label: 'Glow', params: { ...NEUTRAL, brightness: 1.14, saturate: 1.35, contrast: 1.05, blur: 0.4 }, swatch: 'linear-gradient(135deg,#f0abfc,#fde68a)' },
  { id: 'neon', label: 'Neon', params: { ...NEUTRAL, saturate: 1.85, contrast: 1.25, hue: 25, brightness: 1.02 }, swatch: 'linear-gradient(135deg,#22d3ee,#e879f9,#f43f5e)' },
  { id: 'sunset', label: 'Sunset', params: { ...NEUTRAL, sepia: 0.22, hue: -18, saturate: 1.45, brightness: 1.05 }, swatch: 'linear-gradient(135deg,#f97316,#db2777,#7c3aed)' },
  { id: 'forest', label: 'Forest', params: { ...NEUTRAL, hue: 40, saturate: 1.25, contrast: 1.12 }, swatch: 'linear-gradient(135deg,#16a34a,#065f46)' },
];

/** Quick effect templates (vignette / grain / temperature) layered on filters. */
export interface EffectTemplate {
  id: string;
  label: string;
  swatch: string;
  filterId?: string;
  filterIntensity?: number;
  effects?: Partial<Effects>;
  adjust?: Partial<Adjust>;
}

export const EFFECT_TEMPLATES: EffectTemplate[] = [
  { id: 'clear', label: 'Clear', swatch: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', filterId: 'none', effects: { vignette: 0, grain: 0 }, adjust: { brightness: 100, contrast: 100, saturation: 100, temperature: 0 } },
  { id: 'soft', label: 'Soft', swatch: 'linear-gradient(135deg,#fbcfe8,#ddd6fe)', filterId: 'pastel', filterIntensity: 80, effects: { vignette: 20, grain: 8 }, adjust: { brightness: 108, contrast: 95, saturation: 110, temperature: 10 } },
  { id: 'film', label: 'Film', swatch: 'linear-gradient(135deg,#78716c,#44403c)', filterId: 'cinema', filterIntensity: 100, effects: { vignette: 45, grain: 35 }, adjust: { brightness: 96, contrast: 110, saturation: 95, temperature: -5 } },
  { id: 'party', label: 'Party', swatch: 'linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8)', filterId: 'neon', filterIntensity: 90, effects: { vignette: 15, grain: 5 }, adjust: { brightness: 105, contrast: 112, saturation: 130, temperature: 5 } },
  { id: 'mood', label: 'Mood', swatch: 'linear-gradient(135deg,#1e3a8a,#7c3aed)', filterId: 'cool', filterIntensity: 100, effects: { vignette: 55, grain: 12 }, adjust: { brightness: 92, contrast: 115, saturation: 105, temperature: -25 } },
  { id: 'sunny', label: 'Sunny', swatch: 'linear-gradient(135deg,#fbbf24,#fb923c)', filterId: 'golden', filterIntensity: 100, effects: { vignette: 18, grain: 6 }, adjust: { brightness: 110, contrast: 105, saturation: 115, temperature: 35 } },
  { id: 'night', label: 'Night', swatch: 'linear-gradient(135deg,#0f172a,#312e81)', filterId: 'drama', filterIntensity: 100, effects: { vignette: 70, grain: 20 }, adjust: { brightness: 88, contrast: 120, saturation: 90, temperature: -15 } },
  { id: 'blush', label: 'Blush', swatch: 'linear-gradient(135deg,#fb7185,#fda4af)', filterId: 'warm', filterIntensity: 85, effects: { vignette: 25, grain: 10 }, adjust: { brightness: 105, contrast: 100, saturation: 120, temperature: 20 } },
];

export function getPreset(id: string): FilterPreset {
  return FILTER_PRESETS.find((p) => p.id === id) || FILTER_PRESETS[0];
}

function mix(neutral: number, target: number, amount: number): number {
  return neutral + (target - neutral) * amount;
}

/** Interpolate a preset toward neutral by intensity (0..100). */
export function presetAtIntensity(id: string, intensity: number): FilterParams {
  const p = getPreset(id).params;
  const k = clamp(intensity, 0, 100) / 100;
  return {
    brightness: mix(1, p.brightness, k),
    contrast: mix(1, p.contrast, k),
    saturate: mix(1, p.saturate, k),
    sepia: mix(0, p.sepia, k),
    grayscale: mix(0, p.grayscale, k),
    hue: mix(0, p.hue, k),
    blur: mix(0, p.blur, k),
  };
}

function r(n: number, d = 3): number {
  return Number(n.toFixed(d));
}

/** The CSS `filter` for a slide: preset (with intensity) combined with the manual adjustments. */
export function buildFilterCss(slide: Pick<Slide, 'filterId' | 'filterIntensity' | 'adjust'>): string {
  const p = presetAtIntensity(slide.filterId, slide.filterIntensity);
  const a = slide.adjust;
  const brightness = p.brightness * (a.brightness / 100);
  const contrast = p.contrast * (a.contrast / 100);
  const saturate = p.saturate * (a.saturation / 100);
  const parts: string[] = [];
  if (r(brightness) !== 1) parts.push(`brightness(${r(brightness)})`);
  if (r(contrast) !== 1) parts.push(`contrast(${r(contrast)})`);
  if (r(saturate) !== 1) parts.push(`saturate(${r(saturate)})`);
  if (p.sepia > 0.001) parts.push(`sepia(${r(p.sepia)})`);
  if (p.grayscale > 0.001) parts.push(`grayscale(${r(p.grayscale)})`);
  if (Math.abs(p.hue) > 0.01) parts.push(`hue-rotate(${r(p.hue, 1)}deg)`);
  if (p.blur > 0.01) parts.push(`blur(${r(p.blur, 2)}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

/** Warm/cool tint drawn over the media (temperature has no native CSS filter). */
export function temperatureTint(temperature: number): { color: string; opacity: number } | null {
  const t = clamp(temperature, -100, 100);
  if (Math.abs(t) < 1) return null;
  const opacity = r((Math.abs(t) / 100) * 0.45, 3);
  return t > 0 ? { color: '#ff9a3c', opacity } : { color: '#3c8cff', opacity };
}

export function vignetteCss(effects: Pick<Effects, 'vignette'>): string | null {
  const v = clamp(effects.vignette, 0, 100);
  if (v < 1) return null;
  const a = r((v / 100) * 0.85, 3);
  return `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${a}) 100%)`;
}

export function isAdjusted(a: Adjust): boolean {
  return a.brightness !== 100 || a.contrast !== 100 || a.saturation !== 100 || a.temperature !== 0;
}
