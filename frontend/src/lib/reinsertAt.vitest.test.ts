import { describe, it, expect } from 'vitest';
import { reinsertAt } from './reinsertAt';

describe('reinsertAt', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  it('restores at the original position', () => {
    expect(reinsertAt([a, c], b, 1)).toEqual([a, b, c]);
  });
  it('clamps an index past the end', () => {
    expect(reinsertAt([a], c, 9)).toEqual([a, c]);
  });
  it('does not duplicate a row already present', () => {
    const list = [a, b];
    expect(reinsertAt(list, b, 0)).toBe(list);
  });
});
