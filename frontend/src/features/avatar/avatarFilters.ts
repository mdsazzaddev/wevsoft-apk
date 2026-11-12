/** Shared avatar filter model: presets + adjustment sliders, rendered as a CSS/canvas filter string. */
export type AvatarFilterPreset = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'warm' | 'cool' | 'vivid' | 'fade';

export type AvatarAdjustments = {
  preset: AvatarFilterPreset;
  brightness: number; // 50-150 (%)
  contrast: number; // 50-150 (%)
  saturation: number; // 0-200 (%)
};

export const DEFAULT_ADJUSTMENTS: AvatarAdjustments = { preset: 'none', brightness: 100, contrast: 100, saturation: 100 };

export const AVATAR_FILTER_PRESETS: { key: AvatarFilterPreset; label: string; css: string }[] = [
  { key: 'none', label: 'Normal', css: '' },
  { key: 'grayscale', label: 'B & W', css: 'grayscale(100%)' },
  { key: 'sepia', label: 'Sepia', css: 'sepia(100%)' },
  { key: 'vintage', label: 'Vintage', css: 'sepia(50%) contrast(120%) saturate(140%)' },
  { key: 'warm', label: 'Warm', css: 'sepia(25%) saturate(130%) hue-rotate(-10deg)' },
  { key: 'cool', label: 'Cool', css: 'saturate(110%) hue-rotate(15deg) brightness(102%)' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(160%) contrast(110%)' },
  { key: 'fade', label: 'Fade', css: 'contrast(85%) brightness(110%) saturate(80%)' },
];

export function avatarFilterCss(a: AvatarAdjustments): string {
  const preset = AVATAR_FILTER_PRESETS.find((p) => p.key === a.preset)?.css || '';
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) ${preset}`.trim();
}

export function isDefaultAdjustments(a: AvatarAdjustments): boolean {
  return a.preset === 'none' && a.brightness === 100 && a.contrast === 100 && a.saturation === 100;
}
