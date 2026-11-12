/**
 * Shared state for the WevSpace Management dashboard (Master Prompt 2 §1).
 *
 * The shell resolves the Space and the viewer's real permissions once, then every
 * panel reads them from here. Two rules this encodes:
 *  - `can()` is a *rendering* aid only. The server re-checks every permission on
 *    every call (§24), so a panel may hide a button but must never assume hiding
 *    it was the protection.
 *  - panels never re-fetch the overview themselves; they call `refresh()` so the
 *    counts in the nav and the panel body cannot drift apart.
 */

import React, { createContext, useContext } from 'react';
import type { SpaceDashboardSection, SpaceMemberRole, SpacePermission } from '@wevsoft/shared/wevspace';
import type { ManageMeta, SpaceStanding } from '../../../lib/wevspaceManageApi';

export interface ManageContextValue {
  /** Serialized Space card: id, handle, name, avatar, cover, accent, counts… */
  space: any;
  /** Canonical Space id. Handles work on the API too, but ids never change. */
  spaceId: string;
  handle: string;
  accent: string;
  permissions: Record<string, boolean>;
  features: Record<string, boolean>;
  isOwner: boolean;
  role: SpaceMemberRole | null;
  counts: Record<string, number>;
  recentActivity: any[];
  /**
   * Where the Space stands with moderation (MP3 §4/§5), as the owner may see it.
   * In the shared context rather than only in Overview because a suspension is the
   * reason half the other panels will refuse to save, and each of them should be
   * able to say so instead of surfacing a bare error.
   */
  standing: SpaceStanding | null;
  /** Server vocabularies (roles, statuses, limits). Null until /meta lands. */
  meta: ManageMeta | null;
  section: SpaceDashboardSection;
  /** Re-reads the overview so nav badges follow a panel's mutation. */
  refresh: () => Promise<void>;
  /** Navigate to another section without a full page load. */
  goto: (section: SpaceDashboardSection) => void;
  can: (permission: SpacePermission) => boolean;
}

const ManageContext = createContext<ManageContextValue | null>(null);

export function ManageProvider({ value, children }: { value: ManageContextValue; children: React.ReactNode }) {
  return <ManageContext.Provider value={value}>{children}</ManageContext.Provider>;
}

/** Throws rather than returning a hollow object: a panel outside the shell is a bug. */
export function useManage(): ManageContextValue {
  const value = useContext(ManageContext);
  if (!value) throw new Error('useManage() must be used inside the WevSpace management dashboard');
  return value;
}
