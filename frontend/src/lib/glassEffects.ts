/** Settings → Glassmorphism & blur effects (`app_glass_effects`). */

export const GLASS_PREF_KEY = 'app_glass_effects';
export const NO_GLASS_CLASS = 'no-glass-effects';

export function parseGlassEnabled(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

export function applyGlassEffectsToDocument(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(NO_GLASS_CLASS, !enabled);
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  applyGlassEffectsToDocument(localStorage.getItem('glassEffects') !== 'false');
}
