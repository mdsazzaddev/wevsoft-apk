import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { getApiBaseUrl } from './apiBase';
import { idleDelayMs } from './presenceIdle.logic';

let socket: Socket | null = null;
let currentUserId: string | undefined = undefined;
let unbindPresence: (() => void) | null = null;

const ACTIVE_PING_MS = 25_000;

function isCoarsePointer(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Tell the server whether this tab is actually in use. Socket.io pings keep the
 * connection up while a phone is locked; without this, peers stay "Online"
 * after the person has left, and a chat opened later never learns who is active.
 */
function bindPresenceActivity(sock: Socket): void {
  if (unbindPresence || typeof document === 'undefined' || typeof window === 'undefined') return;

  let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let lastState: 'active' | 'idle' | null = null;
  let openedHidden = document.hidden;

  const clearHiddenTimer = () => {
    if (hiddenTimer) clearTimeout(hiddenTimer);
    hiddenTimer = undefined;
  };
  const stopPing = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = undefined;
  };
  const emitState = (state: 'active' | 'idle') => {
    if (!sock.connected) return;
    if (state === 'idle' && lastState === 'idle') return;
    lastState = state;
    sock.emit('presence:activity', { state });
  };
  const startPing = () => {
    stopPing();
    if (document.hidden) return;
    pingTimer = setInterval(() => {
      if (!document.hidden) emitState('active');
    }, ACTIVE_PING_MS);
  };
  const armIdle = () => {
    clearHiddenTimer();
    stopPing();
    const wait = idleDelayMs({ openedHidden, coarsePointer: isCoarsePointer() });
    hiddenTimer = setTimeout(() => emitState('idle'), wait);
  };
  const markActive = () => {
    openedHidden = false;
    clearHiddenTimer();
    emitState('active');
    startPing();
  };
  const onVis = () => {
    if (document.hidden) armIdle();
    else markActive();
  };
  const onConnect = () => {
    lastState = null;
    if (document.hidden) armIdle();
    else markActive();
  };

  document.addEventListener('visibilitychange', onVis);
  sock.on('connect', onConnect);
  if (sock.connected) onConnect();

  unbindPresence = () => {
    document.removeEventListener('visibilitychange', onVis);
    sock.off('connect', onConnect);
    clearHiddenTimer();
    stopPing();
    unbindPresence = null;
  };
}

function socketOrigin(): string {
  const base = getApiBaseUrl();
  return base || window.location.origin;
}

/**
 * Returns a singleton Socket.io client connected to the backend API origin.
 */
export function getSocket(userId?: string): Socket {
  if (!socket) {
    socket = io(socketOrigin(), {
      auth: { token: useStore.getState().token || undefined },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    // Server rejects joins whose JWT does not match; refresh the handshake token and reconnect once.
    let lastRetry = 0;
    socket.on('join-denied', () => {
      if (!socket || Date.now() - lastRetry < 30000) return;
      lastRetry = Date.now();
      socket.auth = { token: useStore.getState().token || undefined };
      socket.disconnect().connect();
    });

    socket.on('connect', () => {
      if (currentUserId) {
        socket?.emit('join', currentUserId);
      }
    });
    bindPresenceActivity(socket);
  }

  // Keep the auth token current after login/refresh without replacing the singleton.
  socket.auth = { token: useStore.getState().token || undefined };

  if (userId && userId !== currentUserId) {
    currentUserId = userId;
    if (socket.connected) {
      socket.emit('join', userId);
    }
  }

  return socket;
}

export function disconnectSocket(): void {
  unbindPresence?.();
  socket?.disconnect();
  socket = null;
  currentUserId = undefined;
}
