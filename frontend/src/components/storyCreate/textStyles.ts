import type { Overlay } from '../storyStudio/model/types';

/** Instagram-inspired text style chips mapped onto existing overlay flags + fonts. */
export type IgTextStyleId = 'classic' | 'modern' | 'neon' | 'strong' | 'typewriter';

export interface IgTextStyle {
  id: IgTextStyleId;
  label: string;
  patch: Partial<Overlay>;
}

export const IG_TEXT_STYLES: IgTextStyle[] = [
  {
    id: 'classic',
    label: 'Classic',
    patch: {
      fontFamily: 'Poppins',
      bold: true,
      italic: false,
      background: false,
      outline: false,
      shadow: true,
      gradient: false,
      color: '#ffffff',
    },
  },
  {
    id: 'modern',
    label: 'Modern',
    patch: {
      fontFamily: 'Space Grotesk',
      bold: true,
      italic: false,
      background: true,
      bgColor: '#ffffff',
      outline: false,
      shadow: false,
      gradient: false,
      color: '#0f172a',
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    patch: {
      fontFamily: 'Poppins',
      bold: true,
      italic: false,
      background: false,
      outline: false,
      shadow: true,
      gradient: true,
      color: '#f0abfc',
    },
  },
  {
    id: 'strong',
    label: 'Strong',
    patch: {
      fontFamily: 'Inter',
      bold: true,
      italic: false,
      background: true,
      bgColor: '#000000',
      outline: false,
      shadow: false,
      gradient: false,
      color: '#ffffff',
      fontSize: 96,
    },
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    patch: {
      fontFamily: 'JetBrains Mono',
      bold: false,
      italic: false,
      background: false,
      outline: true,
      shadow: false,
      gradient: false,
      color: '#ffffff',
    },
  },
];

export function detectTextStyle(o: Overlay): IgTextStyleId {
  if (o.gradient) return 'neon';
  if (o.fontFamily === 'JetBrains Mono' || o.outline) return 'typewriter';
  if (o.background && o.bgColor === '#ffffff') return 'modern';
  if (o.background && (o.bgColor === '#000000' || o.fontSize >= 90)) return 'strong';
  return 'classic';
}
