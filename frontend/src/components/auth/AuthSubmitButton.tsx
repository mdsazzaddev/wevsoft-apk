import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';

/**
 * The primary auth action. Three phases — idle, working, done — cross-faded so
 * the button never changes size and the layout never jumps.
 *
 * Label sits in a CSS grid cell (not absolute), so height comes from `h-12`
 * plus in-flow content — never collapses if a utility is missing.
 */
export default function AuthSubmitButton({
  label,
  loadingLabel = 'Logging in…',
  loading = false,
  done = false,
  disabled = false,
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  done?: boolean;
  disabled?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const phase = done ? 'done' : loading ? 'loading' : 'idle';
  const busy = loading || done;
  const interactive = !busy && !disabled && !reduceMotion;

  return (
    <motion.button
      type="submit"
      disabled={busy || disabled}
      aria-busy={loading}
      whileHover={interactive ? { scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`auth-submit relative grid h-12 w-full place-items-center overflow-hidden rounded-xl text-[15px] font-semibold tracking-tight text-[var(--auth-primary-fg)] transition-shadow duration-200 disabled:cursor-not-allowed ${
        done ? 'is-done' : ''
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={phase}
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
          className="col-start-1 row-start-1 flex items-center justify-center gap-2"
        >
          {phase === 'loading' && (
            <>
              {!reduceMotion && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {loadingLabel}
            </>
          )}
          {phase === 'done' && (
            <>
              <Check size={20} strokeWidth={3} aria-hidden="true" />
              Welcome back
            </>
          )}
          {phase === 'idle' && label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
