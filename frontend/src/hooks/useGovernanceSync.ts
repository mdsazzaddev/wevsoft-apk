import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useStore } from '../store';

export interface GovernanceSyncPayload {
  scope: 'global' | 'user';
  userId?: string;
  reason: string;
  at: string;
}

/**
 * Subscribes to `governance:policy-updated` and calls `onRefresh` when the
 * active user's feed/reels policy may have changed.
 */
export function useGovernanceSync(onRefresh: () => void): void {
  const user = useStore((s) => s.user);
  const onRefreshRef = useRef(onRefresh);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);
    const handler = (payload: GovernanceSyncPayload) => {
      if (payload.scope === 'global' || payload.userId === user.id) {
        onRefreshRef.current();
      }
    };
    socket.on('governance:policy-updated', handler);
    return () => {
      socket.off('governance:policy-updated', handler);
    };
  }, [user?.id]);
}
