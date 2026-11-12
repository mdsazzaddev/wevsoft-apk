import { describe, expect, it } from 'vitest';
import {
  connectDockFlags,
  formatCallDuration,
  outgoingStatusLabel,
  resolveConnectViewMode,
} from './connectUi.logic';

describe('connectUi.logic', () => {
  it('resolves view modes', () => {
    expect(resolveConnectViewMode({ callState: 'idle', callType: null })).toBe('hidden');
    expect(resolveConnectViewMode({ callState: 'incoming', callType: 'audio' })).toBe('incoming');
    expect(resolveConnectViewMode({ callState: 'outgoing', callType: 'video' })).toBe('outgoing');
    expect(resolveConnectViewMode({ callState: 'active', callType: 'audio' })).toBe('audio');
    expect(resolveConnectViewMode({ callState: 'active', callType: 'video' })).toBe('video');
    expect(
      resolveConnectViewMode({
        callState: 'active',
        callType: 'video',
        isScreenSharing: true,
      }),
    ).toBe('screen');
  });

  it('formats duration and outgoing labels', () => {
    expect(formatCallDuration(65)).toBe('01:05');
    expect(outgoingStatusLabel({ callState: 'outgoing', connectionLabel: 'connecting' })).toBe(
      'Connecting…',
    );
    expect(outgoingStatusLabel({ callState: 'outgoing' })).toBe('Ringing…');
  });

  it('exposes dock flags without decorative extras', () => {
    expect(connectDockFlags('incoming').showAcceptReject).toBe(true);
    expect(connectDockFlags('audio').showEnableVideo).toBe(true);
    expect(connectDockFlags('video').showCam).toBe(true);
    expect(connectDockFlags('outgoing').showScreen).toBe(false);
  });
});
