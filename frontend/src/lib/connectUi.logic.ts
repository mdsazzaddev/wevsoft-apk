/**
 * Pure WebSoft Connect UI helpers (Wave 1).
 */

export type ConnectViewMode = 'hidden' | 'incoming' | 'outgoing' | 'audio' | 'video' | 'screen';

export type ConnectChromeMode = 'full' | 'mini' | 'bar';

export function resolveConnectViewMode(input: {
  callState: string;
  callType: 'audio' | 'video' | null;
  isScreenSharing?: boolean;
  peerScreenSharing?: boolean;
}): ConnectViewMode {
  if (input.callState === 'idle' || input.callState === 'ended') return 'hidden';
  if (input.callState === 'incoming') return 'incoming';
  if (input.callState === 'outgoing') return 'outgoing';
  if (input.callState === 'active') {
    if (input.isScreenSharing || input.peerScreenSharing) return 'screen';
    if (input.callType === 'video') return 'video';
    return 'audio';
  }
  return 'hidden';
}

export function formatCallDuration(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(Math.max(0, sec) % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function outgoingStatusLabel(input: {
  callState: string;
  connectionLabel?: string | null;
}): string {
  if (input.callState !== 'outgoing') return '';
  if (input.connectionLabel === 'connecting') return 'Connecting…';
  if (input.connectionLabel === 'connected') return 'Connected';
  return 'Ringing…';
}

/** Which dock controls to show for a given view (no decorative extras). */
export function connectDockFlags(view: ConnectViewMode): {
  showMic: boolean;
  showCam: boolean;
  showEnableVideo: boolean;
  showFlip: boolean;
  showScreen: boolean;
  showDevices: boolean;
  showEnd: boolean;
  showAcceptReject: boolean;
} {
  if (view === 'incoming') {
    return {
      showMic: false,
      showCam: false,
      showEnableVideo: false,
      showFlip: false,
      showScreen: false,
      showDevices: false,
      showEnd: false,
      showAcceptReject: true,
    };
  }
  if (view === 'outgoing') {
    return {
      showMic: true,
      showCam: false,
      showEnableVideo: false,
      showFlip: false,
      showScreen: false,
      showDevices: false,
      showEnd: true,
      showAcceptReject: false,
    };
  }
  if (view === 'audio') {
    return {
      showMic: true,
      showCam: false,
      showEnableVideo: true,
      showFlip: false,
      showScreen: true,
      showDevices: true,
      showEnd: true,
      showAcceptReject: false,
    };
  }
  // video | screen
  return {
    showMic: true,
    showCam: true,
    showEnableVideo: false,
    showFlip: true,
    showScreen: true,
    showDevices: true,
    showEnd: true,
    showAcceptReject: false,
  };
}
