import { useState } from 'react';

/**
 * "Adjust some state when a prop changes" without an effect
 * (react.dev › You Might Not Need an Effect). Returns true during the render
 * in which `value` differs from the previous render's value; the caller sets
 * its own state in that same render, which React applies before committing,
 * so there is no extra paint with stale state. Returns false on mount.
 */
export function useValueChanged<T>(value: T, isEqual: (a: T, b: T) => boolean = Object.is): boolean {
  const [prev, setPrev] = useState(value);
  if (!isEqual(prev, value)) {
    setPrev(value);
    return true;
  }
  return false;
}

const sameDeps = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/** Same as useValueChanged for an effect-style dependency list (element-wise Object.is). */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  return useValueChanged(deps, sameDeps);
}
