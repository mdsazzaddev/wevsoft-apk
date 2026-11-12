import { getProfileThemeById, type ProfileTheme } from '../../lib/profileThemes';
import { CURATED_BACKGROUNDS, contrastRatio, HEX_COLOR_RE, type BackgroundConfig, type Density, type ThemeConfigPayload } from '../shared';

export interface AppliedTheme {
  preset: ProfileTheme;
  accent: string;
  density: Density;
  radius: string;
  pad: string;
  background: string;
  contrastWarn: boolean;
  avatarShape?: string;
  avatarFrameId?: string;
  customAccentColor?: string;
  glassEnabled?: boolean;
  glassOpacity?: number;
  glassBlur?: number;
  themeMode?: string;
}

function curatedCss(id?: string) {
  return CURATED_BACKGROUNDS.find((b) => b.id === id)?.css || '';
}

export function applyThemeConfig(theme: Partial<ThemeConfigPayload> | null | undefined): AppliedTheme {
  const preset = getProfileThemeById(theme?.presetId);
  const accent = (theme?.accentColor && HEX_COLOR_RE.test(theme.accentColor) ? theme.accentColor : preset.accent);
  const density: Density = theme?.density === 'compact' ? 'compact' : 'comfortable';
  const bg = theme?.background as BackgroundConfig | undefined;
  let background = '';
  if (bg?.kind === 'solid' && bg.solid) background = bg.solid;
  else if (bg?.kind === 'gradient' && bg.gradientFrom && bg.gradientTo) {
    background = `linear-gradient(160deg, ${bg.gradientFrom}, ${bg.gradientTo})`;
  } else if (bg?.kind === 'image') {
    if (bg.imageUrl) background = `center / cover no-repeat url("${bg.imageUrl.replace(/"/g, '')}")`;
    else if (bg.curatedId) {
      const css = curatedCss(bg.curatedId);
      background = bg.curatedId === 'dots'
        ? `${css} 0 0 / 18px 18px`
        : css;
    }
  }

  const surface = '#f4f4f5';
  const contrastWarn = HEX_COLOR_RE.test(accent) && contrastRatio(accent, surface) < 3;

  return {
    preset,
    accent,
    density,
    radius: density === 'compact' ? '0.9rem' : '1.5rem',
    pad: density === 'compact' ? '0.9rem' : '1.35rem',
    background,
    contrastWarn,
    avatarShape: theme?.avatarShape,
    avatarFrameId: theme?.avatarFrameId,
    customAccentColor: theme?.customAccentColor,
    glassEnabled: theme?.glassEnabled,
    glassOpacity: theme?.glassOpacity,
    glassBlur: theme?.glassBlur,
    themeMode: theme?.themeMode,
  };
}

export function widgetColClass(size: string) {
  if (size === 'sm' || size === 'half') return 'col-span-6 sm:col-span-3';
  if (size === 'third') return 'col-span-6 sm:col-span-2';
  if (size === 'two_third') return 'col-span-6 sm:col-span-4';
  if (size === 'auto') return 'col-span-6 sm:col-auto flex-1';
  return 'col-span-6';
}

export function widgetMinH(size: string) {
  if (size === 'sm') return 'min-h-[88px]';
  if (size === 'tall') return 'min-h-[280px]';
  return 'min-h-[140px]';
}
