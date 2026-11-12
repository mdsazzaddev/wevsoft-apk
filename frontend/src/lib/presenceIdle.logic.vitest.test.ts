import { describe, expect, it } from 'vitest';
import {
  IDLE_HIDDEN_DESKTOP_MS,
  IDLE_HIDDEN_MOBILE_MS,
  IDLE_OPENED_HIDDEN_DESKTOP_MS,
  IDLE_OPENED_HIDDEN_MOBILE_MS,
  idleDelayMs,
} from './presenceIdle.logic';

describe('presenceIdle.logic', () => {
  it('goes idle quickly on phones', () => {
    expect(idleDelayMs({ openedHidden: false, coarsePointer: true })).toBe(IDLE_HIDDEN_MOBILE_MS);
    expect(idleDelayMs({ openedHidden: true, coarsePointer: true })).toBe(IDLE_OPENED_HIDDEN_MOBILE_MS);
  });

  it('keeps overlapped desktop windows online much longer', () => {
    expect(idleDelayMs({ openedHidden: false, coarsePointer: false })).toBe(IDLE_HIDDEN_DESKTOP_MS);
    expect(idleDelayMs({ openedHidden: true, coarsePointer: false })).toBe(IDLE_OPENED_HIDDEN_DESKTOP_MS);
    expect(IDLE_HIDDEN_DESKTOP_MS).toBeGreaterThan(IDLE_HIDDEN_MOBILE_MS);
  });
});
