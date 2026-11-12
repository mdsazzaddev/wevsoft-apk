/**
 * useUnreadNotifications
 *
 * Shared React Query hook that fetches the unread notification count from
 * /api/notifications/unread-count. Both DashboardLayout and MobileBottomNav
 * consume this hook — React Query deduplicates the network request so only
 * one HTTP call is made regardless of how many components are mounted.
 *
 * - Returns 0 when the user is unauthenticated (token is null).
 * - Does not poll. Re-fetches on window focus and when the auth token changes.
 * - On error, returns the previously cached value (staleTime handles this).
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../components/providers/WebSocketProvider';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { useStore } from '../store';

export interface UnreadNotificationsResult {
  /** Current unread notification count. 0 while loading or unauthenticated. */
  unread: number;
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
}

/** Stable query key — change the token or active space segment to invalidate on logout/login/switch. */
export const unreadNotificationsKey = (token: string | null, spaceScope: string = 'personal') =>
  ['notifications', 'unread-count', token, spaceScope] as const;

async function fetchUnreadCount(token: string, spaceScope: string): Promise<number> {
  const qs = spaceScope && spaceScope !== 'personal' ? `?spaceId=${encodeURIComponent(spaceScope)}` : '';
  const res = await fetch(`/api/notifications/unread-count${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Number(data?.unread) || 0;
}

export function useUnreadNotifications(): UnreadNotificationsResult {
  const token = useStore((s) => s.token);
  const { active, isSpaceMode } = useSpaceIdentities();
  const spaceScope = isSpaceMode && active?.kind === 'space' && active.id ? String(active.id) : 'personal';

  const { data, isLoading } = useQuery({
    queryKey: unreadNotificationsKey(token, spaceScope),
    queryFn: () => fetchUnreadCount(token!, spaceScope),
    // Do not run the query at all when unauthenticated.
    enabled: Boolean(token),
    // Keep the cached count for 30 s before treating it as stale.
    // This prevents a flash of "0" when navigating between pages.
    staleTime: 30_000,
    // On error, keep showing the last successful value.
    placeholderData: (prev) => prev,
    // Do not retry aggressively — a 401 after logout should fail fast.
    retry: 1,
  });

  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket || !token) return;

    const handleCount = (data: { unread: number; spaceId?: string | null }) => {
      if (spaceScope === 'personal') {
        queryClient.setQueryData(unreadNotificationsKey(token, 'personal'), data.unread);
      } else {
        void queryClient.invalidateQueries({ queryKey: unreadNotificationsKey(token, spaceScope) });
      }
    };

    socket.on('notification:count', handleCount);
    return () => {
      socket.off('notification:count', handleCount);
    };
  }, [socket, token, spaceScope, queryClient]);

  return {
    unread: data ?? 0,
    isLoading: isLoading && Boolean(token),
  };
}
