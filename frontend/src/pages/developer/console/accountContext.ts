import { createContext, useContext } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DeveloperApp, DeveloperMe } from '../devApi';

/** Developer account + apps, loaded once by DeveloperConsoleLayout for every /developer/* page. */
export interface DevAccount {
  me: UseQueryResult<DeveloperMe>;
  registered: boolean;
  appsQuery: UseQueryResult<DeveloperApp[]>;
  apps: DeveloperApp[];
  openCreate: () => void;
  /** Space the next app is linked to (active WevSpace you own), else null. */
  linkSpaceId: string | null;
}

export const DevAccountCtx = createContext<DevAccount | null>(null);

export function useDevAccount(): DevAccount {
  const v = useContext(DevAccountCtx);
  if (!v) throw new Error('useDevAccount must be used inside <DeveloperConsoleLayout>');
  return v;
}
