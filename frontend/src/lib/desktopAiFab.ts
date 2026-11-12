/** Settings → Show desktop AI FAB (`app_desktop_ai_fab`). Desktop / web preview (md+) only. */

export const DESKTOP_AI_FAB_PREF_KEY = 'app_desktop_ai_fab';

export function parseDesktopAiFabEnabled(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}
