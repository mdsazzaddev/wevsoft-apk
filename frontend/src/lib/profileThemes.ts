/**
 * Profile themes — shared between ProfilePage (renders the theme) and
 * SettingsPage (lets the user pick one). Persisted on User.profileTheme.
 */

export interface ProfileTheme {
  id: string;
  name: string;
  desc: string;
  cover: string;
  accent: string;
  accentLight: string;
  accentBorder: string;
  glow: string;
  glowSm: string;
  textGrad: string;
  swatchFrom: string;
  swatchTo: string;
  badge: string;
  card: string;
  avatarRing: string;
  particles: string[];
}

// Removed noisy fur/texture presets (plush-tactile, furry-neumorphism, skeuomorphic-fur)
// and near-duplicate palettes (cherry → blossom, crystal → classic, velvet → midnight).
const THEME_ALIASES: Record<string, string> = {
  'plush-tactile': 'none',
  'furry-neumorphism': 'blossom',
  'skeuomorphic-fur': 'peach',
  cherry: 'blossom',
  crystal: 'classic',
  velvet: 'midnight',
  '☁️ Plush Tactile UI': 'none',
  '🌸 Furry Neumorphism': 'blossom',
  '🐻 Skeuomorphic Fur': 'peach',
  '🍒 Cherry Blossom': 'blossom',
  '🔮 Crystal Ice': 'classic',
  '🌺 Velvet Rose': 'midnight',
};

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: 'none',
    name: '⚪ None',
    desc: 'Simple Minimal',
    cover: 'from-muted/20 via-muted/10 to-transparent',
    accent: '#71717a',
    accentLight: 'transparent',
    accentBorder: 'rgba(113,113,122,0.2)',
    glow: 'none',
    glowSm: 'none',
    textGrad: 'from-foreground to-foreground',
    swatchFrom: '#f4f4f5',
    swatchTo: '#52525b',
    badge: 'bg-muted text-muted-foreground border-border',
    card: 'backdrop-blur-none bg-card border border-border',
    avatarRing: 'ring-2 ring-border shadow-none',
    particles: [],
  },
  {
    id: 'classic',
    name: '🌐 Classic Wevsoft',
    desc: 'Default Theme',
    cover: 'from-blue-500/20 via-purple-500/20 to-indigo-500/20',
    accent: '#3b82f6',
    accentLight: 'rgba(59,130,246,0.12)',
    accentBorder: 'rgba(59,130,246,0.3)',
    glow: '0 0 25px rgba(59,130,246,0.3)',
    glowSm: '0 0 10px rgba(59,130,246,0.2)',
    textGrad: 'from-blue-600 via-indigo-600 to-purple-600',
    swatchFrom: '#3b82f6',
    swatchTo: '#8b5cf6',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    card: 'backdrop-blur-xl bg-card border border-border',
    avatarRing: 'ring-4 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    particles: ['✨', '⭐', '💫', '🌐', '⚡'],
  },
  {
    id: 'blossom',
    name: '🌸 Soft Blossom',
    desc: 'Feminine Pink',
    cover: 'from-pink-300 via-rose-200 to-pink-400',
    accent: '#ec4899',
    accentLight: 'rgba(236,72,153,0.15)',
    accentBorder: 'rgba(236,72,153,0.35)',
    glow: '0 0 30px rgba(236,72,153,0.4)',
    glowSm: '0 0 12px rgba(236,72,153,0.3)',
    textGrad: 'from-pink-500 via-rose-400 to-pink-600',
    swatchFrom: '#f9a8d4',
    swatchTo: '#ec4899',
    badge: 'bg-pink-100 text-pink-700 border-pink-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-pink-200/50 dark:border-pink-800/40',
    avatarRing: 'ring-4 ring-pink-400/60 shadow-[0_0_25px_rgba(236,72,153,0.5)]',
    particles: ['🌸', '🌹', '💕', '🦋', '✨'],
  },
  {
    id: 'lavender',
    name: '💜 Lavender Dreams',
    desc: 'Feminine Lilac',
    cover: 'from-violet-300 via-purple-200 to-indigo-300',
    accent: '#8b5cf6',
    accentLight: 'rgba(139,92,246,0.15)',
    accentBorder: 'rgba(139,92,246,0.35)',
    glow: '0 0 30px rgba(139,92,246,0.4)',
    glowSm: '0 0 12px rgba(139,92,246,0.3)',
    textGrad: 'from-violet-500 via-purple-400 to-violet-600',
    swatchFrom: '#c4b5fd',
    swatchTo: '#7c3aed',
    badge: 'bg-violet-100 text-violet-700 border-violet-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-violet-200/50 dark:border-violet-800/40',
    avatarRing: 'ring-4 ring-violet-400/60 shadow-[0_0_25px_rgba(139,92,246,0.5)]',
    particles: ['💜', '🔮', '✨', '🌙', '💫'],
  },
  {
    id: 'rosegold',
    name: '🌹 Rose Gold',
    desc: 'Luxury Feminine',
    cover: 'from-rose-300 via-amber-100 to-pink-300',
    accent: '#f59e0b',
    accentLight: 'rgba(245,158,11,0.15)',
    accentBorder: 'rgba(245,158,11,0.35)',
    glow: '0 0 30px rgba(245,158,11,0.4)',
    glowSm: '0 0 12px rgba(245,158,11,0.3)',
    textGrad: 'from-rose-500 via-amber-500 to-rose-600',
    swatchFrom: '#fde68a',
    swatchTo: '#f59e0b',
    badge: 'bg-amber-100 text-amber-700 border-amber-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-amber-200/50 dark:border-amber-800/40',
    avatarRing: 'ring-4 ring-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.5)]',
    particles: ['🌹', '✨', '💫', '🌟', '💛'],
  },
  {
    id: 'peach',
    name: '🍑 Sunset Peach',
    desc: 'Warm Peach',
    cover: 'from-orange-200 via-amber-100 to-rose-200',
    accent: '#f97316',
    accentLight: 'rgba(249,115,22,0.15)',
    accentBorder: 'rgba(249,115,22,0.35)',
    glow: '0 0 30px rgba(249,115,22,0.4)',
    glowSm: '0 0 12px rgba(249,115,22,0.3)',
    textGrad: 'from-orange-500 via-amber-500 to-rose-500',
    swatchFrom: '#ffedd5',
    swatchTo: '#f97316',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-orange-200/50 dark:border-orange-800/40',
    avatarRing: 'ring-4 ring-orange-400/60 shadow-[0_0_25px_rgba(249,115,22,0.5)]',
    particles: ['🍑', '🌅', '✨', '🍊', '💫'],
  },
  {
    id: 'aurora',
    name: '🌌 Aurora Teal',
    desc: 'Magical Cyan',
    cover: 'from-teal-400 via-cyan-300 to-violet-400',
    accent: '#06b6d4',
    accentLight: 'rgba(6,182,212,0.15)',
    accentBorder: 'rgba(6,182,212,0.35)',
    glow: '0 0 30px rgba(6,182,212,0.5)',
    glowSm: '0 0 12px rgba(6,182,212,0.3)',
    textGrad: 'from-teal-400 via-cyan-400 to-violet-500',
    swatchFrom: '#67e8f9',
    swatchTo: '#7c3aed',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    card: 'backdrop-blur-xl bg-white/30 dark:bg-zinc-900/40 border border-cyan-200/40 dark:border-cyan-800/40',
    avatarRing: 'ring-4 ring-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.6)]',
    particles: ['🌌', '⭐', '✨', '🌊', '💫'],
  },
  {
    id: 'sage',
    name: '🌿 Sage Garden',
    desc: 'Nature Mint',
    cover: 'from-emerald-300 via-green-200 to-teal-300',
    accent: '#10b981',
    accentLight: 'rgba(16,185,129,0.15)',
    accentBorder: 'rgba(16,185,129,0.35)',
    glow: '0 0 30px rgba(16,185,129,0.4)',
    glowSm: '0 0 12px rgba(16,185,129,0.3)',
    textGrad: 'from-emerald-500 via-green-400 to-teal-500',
    swatchFrom: '#6ee7b7',
    swatchTo: '#059669',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-emerald-200/50 dark:border-emerald-800/40',
    avatarRing: 'ring-4 ring-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.5)]',
    particles: ['🌿', '🍃', '✨', '🌸', '🌱'],
  },
  {
    id: 'starlight',
    name: '⭐ Starlight Gold',
    desc: 'Dark Gold',
    cover: 'from-slate-800 via-indigo-900 to-slate-900',
    accent: '#f59e0b',
    accentLight: 'rgba(245,158,11,0.15)',
    accentBorder: 'rgba(245,158,11,0.35)',
    glow: '0 0 30px rgba(245,158,11,0.5)',
    glowSm: '0 0 12px rgba(245,158,11,0.3)',
    textGrad: 'from-yellow-300 via-amber-400 to-yellow-500',
    swatchFrom: '#fbbf24',
    swatchTo: '#1e293b',
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    card: 'backdrop-blur-xl bg-amber-50/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-400/20',
    avatarRing: 'ring-4 ring-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.6)]',
    particles: ['⭐', '🌟', '✨', '💫', '🌙'],
  },
  {
    id: 'midnight',
    name: '🌙 Midnight Bloom',
    desc: 'Dark Feminine',
    cover: 'from-purple-900 via-rose-900 to-slate-900',
    accent: '#f43f5e',
    accentLight: 'rgba(244,63,94,0.15)',
    accentBorder: 'rgba(244,63,94,0.35)',
    glow: '0 0 30px rgba(244,63,94,0.4)',
    glowSm: '0 0 12px rgba(244,63,94,0.3)',
    textGrad: 'from-rose-400 via-pink-400 to-purple-400',
    swatchFrom: '#fb7185',
    swatchTo: '#4c1d95',
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    card: 'backdrop-blur-xl bg-rose-50/80 dark:bg-slate-900/70 border border-rose-200 dark:border-rose-400/20',
    avatarRing: 'ring-4 ring-rose-400/60 shadow-[0_0_30px_rgba(244,63,94,0.6)]',
    particles: ['🌙', '🌸', '💜', '✨', '🦋'],
  },
  {
    id: 'cyber',
    name: '⚡ Cyberpunk Neon',
    desc: 'Neon Cyber',
    cover: 'from-purple-900 via-pink-900 to-cyan-900',
    accent: '#a855f7',
    accentLight: 'rgba(168,85,247,0.18)',
    accentBorder: 'rgba(168,85,247,0.4)',
    glow: '0 0 35px rgba(168,85,247,0.6)',
    glowSm: '0 0 15px rgba(168,85,247,0.4)',
    textGrad: 'from-cyan-400 via-fuchsia-400 to-pink-500',
    swatchFrom: '#22d3ee',
    swatchTo: '#e879f9',
    badge: 'bg-fuchsia-100 dark:bg-purple-950 text-fuchsia-700 dark:text-purple-300 border-fuchsia-300 dark:border-purple-600',
    card: 'backdrop-blur-xl bg-fuchsia-50/80 dark:bg-black/80 border border-fuchsia-200 dark:border-fuchsia-500/30',
    avatarRing: 'ring-4 ring-fuchsia-500 shadow-[0_0_35px_rgba(236,72,153,0.7)]',
    particles: ['⚡', '👾', '🚀', '🌌', '✨'],
  },
  {
    id: 'ocean',
    name: '🌊 Ocean Breeze',
    desc: 'Deep Blue',
    cover: 'from-blue-400 via-teal-300 to-indigo-400',
    accent: '#0284c7',
    accentLight: 'rgba(2,132,199,0.15)',
    accentBorder: 'rgba(2,132,199,0.35)',
    glow: '0 0 30px rgba(2,132,199,0.4)',
    glowSm: '0 0 12px rgba(2,132,199,0.3)',
    textGrad: 'from-sky-500 via-blue-500 to-teal-500',
    swatchFrom: '#38bdf8',
    swatchTo: '#0369a1',
    badge: 'bg-sky-100 text-sky-700 border-sky-300',
    card: 'backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border border-sky-200/50 dark:border-sky-800/40',
    avatarRing: 'ring-4 ring-sky-400/60 shadow-[0_0_25px_rgba(2,132,199,0.5)]',
    particles: ['🌊', '🐬', '💧', '✨', '🐚'],
  },
];

export const DEFAULT_PROFILE_THEME = PROFILE_THEMES[0];

export function getProfileThemeById(id?: string | null): ProfileTheme {
  const resolved = THEME_ALIASES[id || ''] || id;
  return PROFILE_THEMES.find(t => t.id === resolved) || DEFAULT_PROFILE_THEME;
}

export function getProfileThemeByName(name?: string | null): ProfileTheme {
  const byName = PROFILE_THEMES.find(t => t.name === name);
  if (byName) return byName;
  const resolved = THEME_ALIASES[name || ''];
  return PROFILE_THEMES.find(t => t.id === resolved) || DEFAULT_PROFILE_THEME;
}

/** Drops every border-* utility from a theme class string so the element renders edge-less. */
export function withoutBorderClasses(classes: string): string {
  return classes
    .split(/\s+/)
    .filter(cls => cls && !/(?:^|:)border(?:-|$)/.test(cls))
    .join(' ');
}

/** Theme cards use overflow-hidden for texture overlays; strip it where children must overlap (avatar over cover). */
export function withoutOverflowHidden(classes: string): string {
  return classes
    .split(/\s+/)
    .filter(cls => cls && !/(?:^|:)overflow-hidden(?:-|$)/.test(cls))
    .join(' ');
}
