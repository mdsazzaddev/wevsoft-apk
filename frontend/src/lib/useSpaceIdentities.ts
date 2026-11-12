/**
 * The active WevSpace identity (Master Prompt 2 §2).
 *
 * "Never accidentally publish Space content from the personal account" is the
 * hard requirement, so this hook is the single place that answers "who am I
 * acting as right now". Everything that publishes, replies or uploads reads it
 * from here rather than keeping its own copy.
 *
 * Three deliberate choices:
 *  - the *list* of identities comes from the server (GET /api/spaces/manage/
 *    identities), because only the server knows a member's real permissions,
 *    including per-member overrides. Deriving them from a role client-side would
 *    let the switcher promise something the API then refuses;
 *  - the *choice* is remembered in localStorage per signed-in user, which is what
 *    the shared contract prescribes: it is a per-device UI preference, not Space
 *    state, so it deliberately does not go to the database;
 *  - a stored Space that the viewer has lost access to resolves back to personal
 *    via resolveActiveIdentity(), so a revoked teammate cannot keep acting as it.
 *
 * The identity list is cached at module level and de-duplicated while in flight,
 * because the switcher is mounted in several places at once — the sidebar, the
 * mobile bar, the composer, the dashboard — and none of them should cost their
 * own request (§28: nothing loads twice on first paint).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  activeIdentityStorageKey,
  personalIdentity,
  resolveActiveIdentity,
  type SpaceIdentityOption,
} from '@wevsoft/shared/wevspace';
import { fetchMyIdentities, type SpaceIdentityRow } from './wevspaceManageApi';
import { useStore } from '../store';

/** Fired when any surface switches identity, so every switcher stays in step. */
const IDENTITY_EVENT = 'wevspace:identity-changed';

/** Fired when the identity list itself is (re)loaded, for the same reason. */
const IDENTITY_LIST_EVENT = 'wevspace:identities-loaded';

// Shared across every mounted hook. Keyed by token so signing out or switching
// account cannot serve the previous person's Spaces.
let cachedToken: string | null = null;
let cachedRows: SpaceIdentityRow[] = [];
let inflight: Promise<SpaceIdentityRow[]> | null = null;

function forgetIdentities(): void {
  cachedToken = null;
  cachedRows = [];
  inflight = null;
}

/**
 * One request per token, shared by however many switchers are on screen.
 * `force` is for an explicit reload — after accepting an invitation, say — and
 * deliberately bypasses both the cache and any in-flight share.
 */
function loadIdentityRows(token: string, force: boolean): Promise<SpaceIdentityRow[]> {
  if (!force) {
    if (cachedToken === token) return Promise.resolve(cachedRows);
    if (inflight) return inflight;
  }
  const promise = fetchMyIdentities()
    .then((result) => {
      const rows = result.identities || [];
      cachedToken = token;
      cachedRows = rows;
      window.dispatchEvent(new CustomEvent(IDENTITY_LIST_EVENT, { detail: { rows } }));
      return rows;
    })
    .finally(() => {
      if (inflight === promise) inflight = null;
    });
  inflight = promise;
  return promise;
}

function readStored(userId: unknown): string | null {
  try {
    return window.localStorage.getItem(activeIdentityStorageKey(userId));
  } catch {
    // Private-mode Safari and locked-down browsers throw on localStorage.
    return null;
  }
}

function writeStored(userId: unknown, value: string): void {
  try {
    window.localStorage.setItem(activeIdentityStorageKey(userId), value);
  } catch {
    /* the choice simply will not survive a reload */
  }
}

/** Server row → the shared option shape the composer and switcher both consume. */
function toOption(row: SpaceIdentityRow): SpaceIdentityOption {
  return {
    kind: 'space',
    id: row.id,
    name: row.name,
    handle: row.handle,
    avatar: row.avatar,
    verified: row.verified,
    role: row.role,
    permissions: row.permissions || [],
    followersCount: row.followersCount,
    unreadCount: row.unreadCount,
  };
}

export interface SpaceIdentitiesState {
  /** Personal account first, then every Space this user may act as. */
  options: SpaceIdentityOption[];
  /** Space identities only — handy for "which Spaces can I post from?". */
  spaces: SpaceIdentityOption[];
  active: SpaceIdentityOption | null;
  /** True when the shell is soft-logged-in as a WevSpace (Facebook Page style). */
  isSpaceMode: boolean;
  loading: boolean;
  error: string | null;
  /** Pass a Space id, or null for the personal account. */
  setActive: (spaceId: string | null) => void;
  reload: () => Promise<void>;
  /** Raw rows, for callers that need `status` or `spaceType`. */
  rows: SpaceIdentityRow[];
}

export function useSpaceIdentities(): SpaceIdentitiesState {
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const userId = user?.id ?? null;

  const [rows, setRows] = useState<SpaceIdentityRow[]>(() =>
    token && cachedToken === token ? cachedRows : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sync-read on first render to avoid personal→space flicker on refresh ──
  // Reading localStorage here (in the initializer) runs synchronously before
  // the first paint, so the correct identity is applied immediately.
  const [storedId, setStoredId] = useState<string | null>(() => readStored(userId));

  // Signed-in user changed (login / account switch): re-read their stored choice,
  // which authStore resets to personal on every new session.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the signed-in user
    setStoredId(readStored(userId));
  }, [userId]);

  const load = useCallback(
    async (force: boolean) => {
      if (!token) {
        forgetIdentities();
        setRows([]);
        return;
      }
      if (!force && cachedToken === token) {
        setRows(cachedRows);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setRows(await loadIdentityRows(token, force));
      } catch (err: any) {
        setError(err?.message || 'Could not load your WevSpaces');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load(false);
  }, [load]);

  // Another switcher reloaded the list (accepted an invite, created a Space).
  useEffect(() => {
    const onRows = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setRows(Array.isArray(detail?.rows) ? detail.rows : []);
    };
    window.addEventListener(IDENTITY_LIST_EVENT, onRows);
    return () => window.removeEventListener(IDENTITY_LIST_EVENT, onRows);
  }, []);

  // Another switcher (sidebar, dashboard, composer) changed identity.
  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setStoredId(detail?.spaceId ?? null);
    };
    window.addEventListener(IDENTITY_EVENT, onChange);
    return () => window.removeEventListener(IDENTITY_EVENT, onChange);
  }, []);

  const options = useMemo(() => {
    if (!user) return [];
    return [personalIdentity(user), ...rows.map(toOption)];
  }, [user, rows]);

  const active = useMemo(() => {
    if (!options.length) return null;
    return resolveActiveIdentity(storedId, options);
  }, [storedId, options]);

  const isSpaceMode =
    active?.kind === 'space' ||
    (Boolean(storedId) && storedId !== 'personal' && (loading || rows.length === 0));

  // Mark the document so shell chrome can style business mode without prop drilling.
  useEffect(() => {
    const root = document.documentElement;
    if (isSpaceMode && active?.id) {
      root.classList.add('wevspace-space-mode');
      root.dataset.wevspaceActive = String(active.id);
    } else {
      root.classList.remove('wevspace-space-mode');
      delete root.dataset.wevspaceActive;
    }
  }, [isSpaceMode, active?.id]);

  const setActive = useCallback(
    (spaceId: string | null) => {
      const value = spaceId || 'personal';
      writeStored(userId, value);
      setStoredId(spaceId);
      window.dispatchEvent(new CustomEvent(IDENTITY_EVENT, { detail: { spaceId } }));
    },
    [userId],
  );

  const spaces = useMemo(() => options.filter((option) => option.kind === 'space'), [options]);

  return { options, spaces, active, isSpaceMode, loading, error, setActive, reload, rows };
}
