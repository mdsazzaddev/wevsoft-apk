/**
 * Pure helpers for 1:1 call network quality (Phase 3).
 * Metrics come from WebRTC getStats — never invent packet samples.
 */

export type CallNetworkQuality = 'excellent' | 'good' | 'weak' | 'poor' | 'reconnecting' | 'unknown';

export type CallStatSample = {
  rttMs?: number | null;
  packetLossPct?: number | null;
  jitterMs?: number | null;
  connectionState?: string | null;
};

export function qualityFromConnectionState(state: string | null | undefined): CallNetworkQuality | null {
  if (!state) return null;
  if (state === 'connecting' || state === 'checking') return 'reconnecting';
  if (state === 'disconnected' || state === 'failed') return 'poor';
  return null;
}

/**
 * Map aggregated RTT / loss / jitter to a coarse label.
 * Thresholds are conservative for Bangladesh mobile networks.
 */
export function qualityFromStats(sample: CallStatSample): CallNetworkQuality {
  const fromState = qualityFromConnectionState(sample.connectionState);
  if (fromState === 'reconnecting' || fromState === 'poor') return fromState;

  const rtt = sample.rttMs ?? null;
  const loss = sample.packetLossPct ?? null;
  const jitter = sample.jitterMs ?? null;

  if (rtt == null && loss == null && jitter == null) return 'unknown';

  if ((loss != null && loss >= 12) || (rtt != null && rtt >= 500) || (jitter != null && jitter >= 80)) {
    return 'poor';
  }
  if ((loss != null && loss >= 5) || (rtt != null && rtt >= 250) || (jitter != null && jitter >= 40)) {
    return 'weak';
  }
  if ((loss != null && loss >= 2) || (rtt != null && rtt >= 120) || (jitter != null && jitter >= 25)) {
    return 'good';
  }
  return 'excellent';
}

export function qualityLabel(q: CallNetworkQuality): string {
  switch (q) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'weak':
      return 'Weak';
    case 'poor':
      return 'Poor';
    case 'reconnecting':
      return 'Reconnecting';
    default:
      return 'Network';
  }
}

/** Extract a single sample from an RTCStatsReport (browser WebRTC). */
export function sampleFromRtcStats(
  report: RTCStatsReport,
  connectionState?: string | null,
): CallStatSample {
  let rttMs: number | null = null;
  let jitterMs: number | null = null;
  let packetsLost = 0;
  let packetsReceived = 0;

  report.forEach((stat) => {
    const s = stat as Record<string, unknown>;
    const type = String(s.type || '');
    if (type === 'candidate-pair' && s.state === 'succeeded' && typeof s.currentRoundTripTime === 'number') {
      rttMs = Math.round(Number(s.currentRoundTripTime) * 1000);
    }
    if (type === 'remote-inbound-rtp' && typeof s.roundTripTime === 'number') {
      const ms = Math.round(Number(s.roundTripTime) * 1000);
      if (rttMs == null || ms < rttMs) rttMs = ms;
    }
    if (type === 'inbound-rtp') {
      if (typeof s.jitter === 'number') {
        jitterMs = Math.round(Number(s.jitter) * 1000);
      }
      if (typeof s.packetsLost === 'number') packetsLost += Number(s.packetsLost);
      if (typeof s.packetsReceived === 'number') packetsReceived += Number(s.packetsReceived);
    }
  });

  const total = packetsLost + packetsReceived;
  const packetLossPct = total > 0 ? (packetsLost / total) * 100 : null;

  return {
    rttMs,
    packetLossPct,
    jitterMs,
    connectionState: connectionState ?? null,
  };
}
