import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useStore } from '../../store';

interface WebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue>({ socket: null, isConnected: false });

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentSocket: Socket | null = null;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    import('../../lib/socket').then(({ getSocket }) => {
      if (cancelled) return;
      const s = getSocket(user?.id);
      currentSocket = s;
      setSocket(s);
      setIsConnected(s.connected);
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
    });

    return () => {
      cancelled = true;
      if (currentSocket) {
        currentSocket.off('connect', onConnect);
        currentSocket.off('disconnect', onDisconnect);
      }
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
