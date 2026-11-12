import { useSyncExternalStore, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { isReducedMotionApplied, motionConfigReducedMotion, subscribeReducedMotion } from '../lib/reducedMotion';

/** Applies Settings → Reduce screen motion (and OS prefers-reduced-motion) to motion/react animations. */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribeReducedMotion, isReducedMotionApplied, () => false);
  return <MotionConfig reducedMotion={motionConfigReducedMotion(enabled)}>{children}</MotionConfig>;
}
