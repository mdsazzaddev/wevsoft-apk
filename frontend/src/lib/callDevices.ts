/** Media device helpers for 1:1 calls (Phase 3). */

export type CallDeviceInfo = {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
};

export function mapMediaDevices(list: MediaDeviceInfo[]): {
  audioInputs: CallDeviceInfo[];
  videoInputs: CallDeviceInfo[];
  audioOutputs: CallDeviceInfo[];
} {
  const audioInputs: CallDeviceInfo[] = [];
  const videoInputs: CallDeviceInfo[] = [];
  const audioOutputs: CallDeviceInfo[] = [];
  for (const d of list) {
    if (!d.deviceId) continue;
    const item = {
      deviceId: d.deviceId,
      label: d.label || `${d.kind} (${d.deviceId.slice(0, 6)})`,
      kind: d.kind,
    };
    if (d.kind === 'audioinput') audioInputs.push(item);
    else if (d.kind === 'videoinput') videoInputs.push(item);
    else if (d.kind === 'audiooutput') audioOutputs.push(item);
  }
  return { audioInputs, videoInputs, audioOutputs };
}

export function supportsAudioOutputSelect(): boolean {
  if (typeof HTMLMediaElement === 'undefined') return false;
  return typeof (HTMLMediaElement.prototype as any).setSinkId === 'function';
}

export async function listCallDevices(): Promise<{
  audioInputs: CallDeviceInfo[];
  videoInputs: CallDeviceInfo[];
  audioOutputs: CallDeviceInfo[];
}> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
  const list = await navigator.mediaDevices.enumerateDevices();
  return mapMediaDevices(list);
}

export function nextFacingMode(current: 'user' | 'environment'): 'user' | 'environment' {
  return current === 'user' ? 'environment' : 'user';
}
