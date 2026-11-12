import { describe, expect, it } from 'vitest';
import { resolveBatchHubPane } from './CreatorBatchHub';

describe('resolveBatchHubPane', () => {
  it('defaults to upload and accepts known panes', () => {
    expect(resolveBatchHubPane(null)).toBe('upload');
    expect(resolveBatchHubPane('history')).toBe('history');
    expect(resolveBatchHubPane('cleanup')).toBe('cleanup');
    expect(resolveBatchHubPane('adu')).toBe('adu');
    expect(resolveBatchHubPane('nope')).toBe('upload');
  });
});
