import { createContext, useContext, useEffect, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useCall } from '../../hooks/useCall';
import { ConnectCallShell } from './ConnectCallShell';
import type { UseCallReturn } from './connectTypes';

const ConnectCallContext = createContext<UseCallReturn | null>(null);

/**
 * App-shell singleton for 1:1 WebSoft Connect sessions.
 * Mount once under DashboardLayout so calls survive route changes.
 */
export function ConnectCallProvider({ children }: { children: ReactNode }) {
  const call = useCall();

  useEffect(() => {
    if (!call.lastError) return;
    toast.error(call.lastError);
    call.clearLastError();
  }, [call.lastError, call.clearLastError]);

  return (
    <ConnectCallContext.Provider value={call}>
      {children}
      <ConnectCallShell call={call} />
    </ConnectCallContext.Provider>
  );
}

export function useConnectCall(): UseCallReturn {
  const ctx = useContext(ConnectCallContext);
  if (!ctx) {
    throw new Error('useConnectCall must be used within ConnectCallProvider');
  }
  return ctx;
}

/** Soft accessor for optional chrome (never throws). */
export function useConnectCallOptional(): UseCallReturn | null {
  return useContext(ConnectCallContext);
}
