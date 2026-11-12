/**
 * Single source of truth for the user-facing product name.
 * Safe to import from the browser and the Express API.
 */

export const BRAND_NAME = 'Wevsoft';

export const BRAND_TAGLINE = 'Your space. Your people. Your world.';

/**
 * Names shipped as the `SystemSettings.websiteName` default by earlier builds.
 * The schema default only applies to new rows, so installs created before the
 * rename still hold the old value - map it forward at the display boundary
 * instead of mutating admin-editable data in a migration.
 */
const LEGACY_NAMES = new Set(['sora', 'wevsoftupdated', 'wevsoft updater', 'wevsoft update']);

/**
 * Resolve the admin-configured site name for display.
 * Pass `fallback: ''` when an empty field should stay empty (e.g. admin inputs).
 */
export function resolveWebsiteName(
  name?: string | null,
  fallback: string = BRAND_NAME,
): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return fallback;
  return LEGACY_NAMES.has(trimmed.toLowerCase()) ? BRAND_NAME : trimmed;
}
