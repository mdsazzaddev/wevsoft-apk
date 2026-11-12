import { createContext, useContext } from 'react';
import type { SpaceDashboardSection, SpacePermission } from '@wevsoft/shared/wevspace';
import type { ManageOverview } from '../../lib/wevspaceManageApi';

/** What every WevDesk page needs: the Space overview (same payload as the Space dashboard) and permission helpers. */
export interface DeskContextValue {
  overview: ManageOverview;
  space: any;
  spaceId: string;
  handle: string;
  /** Dashboard sections this viewer may open (drives sidebar links). */
  sectionIds: SpaceDashboardSection[];
  can: (permission: SpacePermission) => boolean;
  /** /space/:handle/desk[/page] */
  deskPath: (page?: string) => string;
  /** /space/:handle/manage/:section */
  managePath: (section: SpaceDashboardSection) => string;
  refresh: () => Promise<void>;
}

export const DeskCtx = createContext<DeskContextValue | null>(null);

export function useDesk(): DeskContextValue {
  const v = useContext(DeskCtx);
  if (!v) throw new Error('useDesk() must be used inside <WevDeskLayout>');
  return v;
}
