import { useReducedMotion, motion } from 'motion/react';
import { useDocumentVisible, useLiteAuthScene } from './useSceneActivity';

/**
 * Auth backdrop — calm tint only. No grid, grain, or particle fields.
 * Heavy effects are a mobile jank source; the card carries the UI weight.
 */

export default function AuthBackground() {
  const reduceMotion = useReducedMotion();
  const documentVisible = useDocumentVisible();
  const lite = useLiteAuthScene();

  const drifting = !reduceMotion && documentVisible && !lite;

  const drift = (dx: number, dy: number, seconds: number) =>
    drifting
      ? {
          animate: { x: [0, dx, 0], y: [0, dy, 0] },
          transition: { duration: seconds, repeat: Infinity, ease: 'easeInOut' as const },
        }
      : {};

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden auth-bg-root">
      <div className="absolute inset-0 auth-bg-base" />
      <div className="absolute inset-0 auth-bg-tint" />
      {!lite && (
        <motion.div
          {...drift(12, -10, 28)}
          className="auth-bg-orb absolute -left-20 top-[12%] h-72 w-72 rounded-full opacity-40 blur-3xl md:h-96 md:w-96"
          style={{ background: 'var(--auth-page-tint, transparent)' }}
        />
      )}
    </div>
  );
}
