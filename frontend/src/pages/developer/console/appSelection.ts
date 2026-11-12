/**
 * App switcher selection (Phase 2 P2-3, amendment A8). Pure so it can be unit tested.
 */
/** Stored when the user is on "All apps" (explicitly, or after a stale id was dropped). */
export const ALL_APPS = '__all__';

export interface SelectableApp {
  id: string;
  deletedAt?: string | null;
  status?: string | null;
}

/** Apps that can be selected in the switcher; soft-deleted apps are excluded. */
export function liveApps<T extends SelectableApp>(apps: readonly T[]): T[] {
  return apps.filter((a) => !a.deletedAt && a.status !== 'deleted');
}

/**
 * - stored id present and live -> that app
 * - stored id present but stale (deleted / not yours) -> null ("All apps") and the caller clears it
 * - nothing stored -> first live app (unchanged behaviour for new sessions)
 */
export function resolveSelectedApp<T extends SelectableApp>(apps: readonly T[], storedId: string | null): { app: T | null; stale: boolean } {
  const live = liveApps(apps);
  if (storedId === ALL_APPS) return { app: null, stale: false };
  if (storedId) {
    const hit = live.find((a) => a.id === storedId);
    if (hit) return { app: hit, stale: false };
    // Apps not loaded yet: don't call the stored id stale.
    if (apps.length === 0) return { app: null, stale: false };
    return { app: null, stale: true };
  }
  return { app: live[0] || null, stale: false };
}

/** Same section for another app, keeping ?search and #hash. */
export function appSwitchTarget(path: string | null, search: string, hash: string): string | null {
  return path ? `${path}${search}${hash}` : null;
}

/** Roving keyboard index for the switcher listbox. */
export function nextOptionIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === 'ArrowDown') return (current + 1 + count) % count;
  if (key === 'ArrowUp') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
