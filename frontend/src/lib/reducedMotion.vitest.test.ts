import { afterEach, describe, expect, it } from 'vitest';
import { applyReducedMotionToDocument, isReducedMotionApplied, motionConfigReducedMotion, parseReducedMotion, subscribeReducedMotion } from './reducedMotion';

describe('reducedMotion', () => {
  afterEach(() => applyReducedMotionToDocument(false));
  it('parses saved values', () => {
    expect(parseReducedMotion(true)).toBe(true);
    expect(parseReducedMotion('true')).toBe(true);
    expect(parseReducedMotion(false)).toBe(false);
    expect(parseReducedMotion(undefined)).toBe(false);
  });
  it('toggles the html class', () => {
    applyReducedMotionToDocument(true);
    expect(isReducedMotionApplied()).toBe(true);
    applyReducedMotionToDocument(false);
    expect(isReducedMotionApplied()).toBe(false);
  });
  it('maps the preference to the MotionConfig value', () => {
    expect(motionConfigReducedMotion(true)).toBe('always');
    expect(motionConfigReducedMotion(false)).toBe('user');
  });
  it('notifies subscribers only when the value changes', () => {
    applyReducedMotionToDocument(false);
    let n = 0;
    const off = subscribeReducedMotion(() => { n++; });
    applyReducedMotionToDocument(true);
    applyReducedMotionToDocument(true);
    expect(n).toBe(1);
    off();
    applyReducedMotionToDocument(false);
    expect(n).toBe(1);
  });
});
