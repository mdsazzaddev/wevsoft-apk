import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { getSocket } from '../../lib/socket';

type CoarsePresence = 'online' | 'recently_active' | 'offline' | 'hidden';

type Props = {
  userId: string;
  className?: string;
  /** Show text label next to the dot */
  showLabel?: boolean;
};

const POLL_MS = 40_000;

export function PresenceDot({ userId, className = '', showLabel = false }: Props) {
  const token = useStore((s) => s.token);
  const selfId = useStore((s) => s.user?.id);
  const [status, setStatus] = useState<CoarsePresence>('hidden');

  useEffect(() => {
    if (!token || !userId || userId === selfId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStatus('hidden');
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/presence`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus((data.status as CoarsePresence) || 'hidden');
      } catch {
        /* ignore */
      }
    };

    void load();
    const poll = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void load();
    }, POLL_MS);

    const socket = getSocket();
    const onOnline = (p: { userId?: string }) => {
      if (p?.userId === userId) setStatus('online');
    };
    const onOffline = (p: { userId?: string }) => {
      if (p?.userId === userId) setStatus('offline');
    };
    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, userId, selfId]);

  if (status === 'hidden' || status === 'offline') {
    if (!showLabel || status === 'hidden') return null;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        Offline
      </span>
    );
  }

  const label = status === 'online' ? 'Active now' : 'Active recently';
  const color = status === 'online' ? 'bg-emerald-500' : 'bg-amber-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span className={`w-2 h-2 rounded-full ${color} shrink-0`} aria-hidden />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}
