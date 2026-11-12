/**
 * Recently deleted apps (Phase 2 P2-8, amendment A12).
 * Data: GET /api/developer/apps-deleted (Phase 1; caller's own developer account, safe fields only).
 * Restore: POST /api/developer/apps/:id/restore, guarded by the existing step-up (lib/api prompts on 428).
 */
export interface DeletedApp {
  id: string;
  name: string;
  deletedAt: string;
  restorable: boolean;
}

export interface DeletedAppsResponse {
  apps: DeletedApp[];
  restoreWindowDays: number;
}

const DAY_MS = 86_400_000;

/** When the app is purged (end of the restore window), or null if the date is unreadable. */
export function purgeAt(deletedAt: string, windowDays: number): Date | null {
  const t = Date.parse(deletedAt);
  if (!Number.isFinite(t) || !Number.isFinite(windowDays)) return null;
  return new Date(t + windowDays * DAY_MS);
}

/** Whole days left to restore (0 when the window has passed). */
export function daysLeft(deletedAt: string, windowDays: number, now = Date.now()): number {
  const p = purgeAt(deletedAt, windowDays);
  if (!p) return 0;
  return Math.max(0, Math.ceil((p.getTime() - now) / DAY_MS));
}

/** User-facing message for a failed restore. Never echoes server payloads. */
export function restoreErrorMessage(status: number | undefined): string {
  if (status === 410) return 'The restore window for this app has passed.';
  if (status === 409) return 'This app is not deleted any more.';
  if (status === 403 || status === 428) return 'Restoring needs the account owner to confirm their identity.';
  if (status === 404) return 'App not found.';
  return 'Could not restore the app. Try again.';
}
