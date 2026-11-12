import { describe, expect, it } from 'vitest';
import { applyLabels, chunkIds } from './paidPartnership';

describe('paidPartnership', () => {
  it('chunks ids to the server limit', () => {
    const ids = Array.from({ length: 120 }, (_, i) => 'p' + i);
    expect(chunkIds(ids).map((c) => c.length)).toEqual([50, 50, 20]);
  });
  it('caches labelled and unlabelled ids', () => {
    const m = applyLabels(['a', 'b'], { a: { brand: { id: 'u1', name: 'Acme' } } }, new Map());
    expect(m.get('a')?.brand?.name).toBe('Acme');
    expect(m.has('b')).toBe(true);
    expect(m.get('b')).toBeNull();
  });
});
