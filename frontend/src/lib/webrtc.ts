/**
 * Legacy ICE helper — QUARANTINED (Phase 1).
 *
 * Do NOT put TURN host/username/password in the frontend.
 * Production and Messenger calls must use short-lived credentials from:
 *   GET /api/v1/turn/credentials  (see frontend/src/hooks/useCall.ts)
 *
 * Hardcoded turn.sora.app / sora_user / sora_pass defaults were removed.
 */

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

/** STUN-only fallback. Never includes TURN secrets. */
export function getIceServers(): IceServer[] {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

/**
 * @deprecated Prefer useCall / LiveKit client. Kept for accidental imports only.
 */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: getIceServers(),
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });
}
