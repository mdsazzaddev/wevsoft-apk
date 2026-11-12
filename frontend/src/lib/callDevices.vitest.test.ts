import { describe, expect, it } from 'vitest';
import { mapMediaDevices, nextFacingMode } from './callDevices';

describe('callDevices', () => {
  it('maps MediaDeviceInfo lists', () => {
    const mapped = mapMediaDevices([
      { deviceId: 'a1', kind: 'audioinput', label: 'Mic', groupId: '' } as MediaDeviceInfo,
      { deviceId: 'v1', kind: 'videoinput', label: 'Cam', groupId: '' } as MediaDeviceInfo,
      { deviceId: 'o1', kind: 'audiooutput', label: 'Speaker', groupId: '' } as MediaDeviceInfo,
      { deviceId: '', kind: 'audioinput', label: 'skip', groupId: '' } as MediaDeviceInfo,
    ]);
    expect(mapped.audioInputs).toHaveLength(1);
    expect(mapped.videoInputs[0].label).toBe('Cam');
    expect(mapped.audioOutputs[0].deviceId).toBe('o1');
  });

  it('toggles facing mode', () => {
    expect(nextFacingMode('user')).toBe('environment');
    expect(nextFacingMode('environment')).toBe('user');
  });
});
