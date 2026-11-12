import { describe, it, expect } from 'vitest';
import { pendingRebufferSamplesForReport, pendingTtffSamplesForReport } from './instantTtffReport';

describe('instantTtffReport', () => {
  it('returns only new samples up to max', () => {
    const samples = [
      { ttffMs: 100, at: 1 },
      { ttffMs: 200, at: 2 },
      { ttffMs: 300, at: 3 },
      { ttffMs: 400, at: 4 },
    ];
    expect(pendingTtffSamplesForReport(samples, 2, 2)).toEqual([
      { ttffMs: 300, at: 3 },
      { ttffMs: 400, at: 4 },
    ]);
    expect(pendingTtffSamplesForReport(samples, 4, 8)).toEqual([]);
  });

  it('pending rebuffer samples filter by cursor', () => {
    const samples = [
      { durationMs: 150, at: 1 },
      { durationMs: 220, at: 5 },
    ];
    expect(pendingRebufferSamplesForReport(samples, 1, 8)).toEqual([{ durationMs: 220, at: 5 }]);
  });
});
