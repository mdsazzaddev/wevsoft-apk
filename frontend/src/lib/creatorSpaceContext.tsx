/**
 * When Creator Hub runs inside Business Suite, API calls should scope to the
 * selected Space (not the personal account). Outside Business, spaceId is null.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { isBusinessAppHost } from './consumerAppUrl';
import type { CreatorHubMode } from './creatorHub';

export type CreatorSpaceCtx = {
  spaceId: string | null;
  spaceName: string | null;
  spaceHandle: string | null;
  /** Space profile image (Business Suite / identities); used by Creator Hub switcher. */
  spaceAvatar: string | null;
};

const Ctx = createContext<CreatorSpaceCtx>({
  spaceId: null,
  spaceName: null,
  spaceHandle: null,
  spaceAvatar: null,
});

export function CreatorSpaceProvider({
  value,
  children,
}: {
  value: CreatorSpaceCtx;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCreatorSpace(): CreatorSpaceCtx {
  return useContext(Ctx);
}

/** Personal hub on :3000 vs Space hub on Business Suite. */
export function useCreatorHubMode(): CreatorHubMode {
  const { spaceId } = useCreatorSpace();
  if (isBusinessAppHost() || spaceId) return 'space';
  return 'personal';
}

/** Append ?spaceId= when a Space is selected. */
export function withCreatorSpaceQuery(path: string, spaceId: string | null | undefined): string {
  if (!spaceId) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}spaceId=${encodeURIComponent(spaceId)}`;
}
