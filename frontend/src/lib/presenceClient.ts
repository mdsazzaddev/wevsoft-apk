const RECENT_EVENT_MS = 5_000;

type Recent = { online: boolean; at: number };

/**
 * Live `user:online` / `user:offline` events win over a presence snapshot that
 * was computed just before them, so a peer who connects while the list is in
 * flight is not immediately marked offline again.
 */
export type PresenceTrack = {
  note(userId: string, online: boolean): void;
  applySnapshot(ids: readonly string[]): Set<string>;
};

export function createPresenceTrack(now: () => number = Date.now): PresenceTrack {
  const recent = new Map<string, Recent>();
  return {
    note(userId, online) {
      if (!userId) return;
      recent.set(userId, { online, at: now() });
    },
    applySnapshot(ids) {
      const next = new Set<string>();
      for (const id of ids) {
        if (id) next.add(id);
      }
      const t = now();
      for (const [id, rec] of recent) {
        if (t - rec.at > RECENT_EVENT_MS) {
          recent.delete(id);
          continue;
        }
        if (rec.online) next.add(id);
        else next.delete(id);
      }
      return next;
    },
  };
}
