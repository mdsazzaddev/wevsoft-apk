import { describe, expect, it } from 'vitest';
import {
  qualityFromConnectionState,
  qualityFromStats,
  qualityLabel,
} from './callQuality.logic';

describe('callQuality.logic', () => {
  it('maps connection states', () => {
    expect(qualityFromConnectionState('connecting')).toBe('reconnecting');
    expect(qualityFromConnectionState('failed')).toBe('poor');
    expect(qualityFromConnectionState('connected')).toBeNull();
  });

  it('classifies rtt/loss/jitter without inventing values', () => {
    expect(qualityFromStats({})).toBe('unknown');
    expect(qualityFromStats({ rttMs: 40, packetLossPct: 0, jitterMs: 5 })).toBe('excellent');
    expect(qualityFromStats({ rttMs: 150, packetLossPct: 2.5 })).toBe('good');
    expect(qualityFromStats({ rttMs: 300, packetLossPct: 6 })).toBe('weak');
    expect(qualityFromStats({ rttMs: 600, packetLossPct: 15 })).toBe('poor');
    expect(qualityFromStats({ connectionState: 'disconnected' })).toBe('poor');
  });

  it('labels qualities', () => {
    expect(qualityLabel('excellent')).toBe('Excellent');
    expect(qualityLabel('reconnecting')).toBe('Reconnecting');
  });
});
