import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { MascotState } from './mascotPoses';
import { useDocumentVisible } from '../useSceneActivity';

/**
 * Decides which pose Wevsoft wears, and when.
 *
 * SECURITY (spec §28): every field below is a derived UI flag — a boolean, an
 * enum, or a monotonic counter. The director knows *that* the password field is
 * focused and *that* a keystroke happened; it never receives, stores or inspects
 * the value. `identifierValidity` is resolved by the caller so even the username
 * string stays in the form.
 */
export type MascotSignals = {
  /** Which auth view is on screen — drives the resting personality. */
  view: 'login' | 'register' | 'forgot' | 'oauth_setup' | '2fa';
  identifierFocused: boolean;
  /** Caller's verdict on the username/email field. Never the text itself. */
  identifierValidity: 'unknown' | 'valid' | 'invalid';
  /** Bump once per keystroke. Value is meaningless; only the change matters. */
  identifierTypingNonce: number;
  /** Focus-within of the password group, so the toggle button counts too. */
  passwordFocused: boolean;
  passwordTypingNonce: number;
  passwordVisible: boolean;
  submitting: boolean;
  /** Bump on each rejected attempt; reset to 0 when the user edits a field. */
  failureNonce: number;
  success: boolean;
  /** Link the cursor is currently over, for the little courtesy reactions. */
  hover: 'forgot' | 'signup' | null;
};

export type MascotDirection = {
  state: MascotState;
  blinking: boolean;
  /**
   * False during the run-up to a failed login, so the page can let Wevsoft react
   * before the error text lands. Always true immediately under reduced motion.
   */
  errorVisible: boolean;
};

/** How long a field stays "being typed in" after the last keystroke. */
const TYPING_LINGER = 700;
/** Quiet stretch before Wevsoft starts to doze. */
const DROWSY_AFTER = 24_000;

const BLINK_MIN = 2400;
const BLINK_SPREAD = 3800;
const BLINK_CLOSED = 110;
const DOUBLE_BLINK_CHANCE = 0.24;
const DOUBLE_BLINK_GAP = 130;

/** Poses where a blink would read as a glitch — eyes already shut or shielded. */
const EYES_UNAVAILABLE: ReadonlySet<MascotState> = new Set<MascotState>([
  'PASSWORD_FOCUSED',
  'PASSWORD_PROTECTED',
  'SUBMITTING',
  'SUCCESS',
  'SLEEPY',
]);

/**
 * Tracks a nonce that "settles" a while after it last changed, giving a derived
 * is-typing boolean without ever setting state from an effect body.
 */
function useSettling(nonce: number, delay: number): boolean {
  const [settled, setSettled] = useState(nonce);
  useEffect(() => {
    if (nonce === settled) return;
    const timer = window.setTimeout(() => setSettled(nonce), delay);
    return () => window.clearTimeout(timer);
  }, [nonce, settled, delay]);
  return nonce !== settled;
}

export function useMascotDirector(signals: MascotSignals): MascotDirection {
  const reduceMotion = useReducedMotion();
  const documentVisible = useDocumentVisible();
  const {
    view,
    identifierFocused,
    identifierValidity,
    identifierTypingNonce,
    passwordFocused,
    passwordTypingNonce,
    passwordVisible,
    submitting,
    failureNonce,
    success,
    hover,
  } = signals;

  const identifierTyping = useSettling(identifierTypingNonce, TYPING_LINGER);
  const passwordTyping = useSettling(passwordTypingNonce, TYPING_LINGER);

  // ── Failed login: look up, register it, then sink ────────────────────────
  // Beat 1 is derived rather than scheduled, so a fresh failure can never flash
  // the previous attempt's final beat before the timers take over.
  const [failureBeat, setFailureBeat] = useState({ nonce: 0, beat: 0 });
  useEffect(() => {
    if (!failureNonce) return;
    const timers = [
      window.setTimeout(() => setFailureBeat({ nonce: failureNonce, beat: 2 }), 280),
      window.setTimeout(() => setFailureBeat({ nonce: failureNonce, beat: 3 }), 640),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [failureNonce]);

  let errorBeat = 0;
  if (failureNonce > 0) {
    // Reduced motion skips the choreography entirely — the message must not wait.
    errorBeat = reduceMotion ? 3 : failureBeat.nonce === failureNonce ? failureBeat.beat : 1;
  }

  // ── Drowsiness ───────────────────────────────────────────────────────────
  const [stir, setStir] = useState(0);
  // Any change to this key counts as activity and restarts the idle countdown.
  // Tab visibility is in here too, so coming back to the page wakes the mascot
  // instead of leaving it mid-doze.
  const activity = useMemo(
    () =>
      [
        view,
        identifierFocused,
        identifierValidity,
        identifierTypingNonce,
        passwordFocused,
        passwordTypingNonce,
        passwordVisible,
        submitting,
        failureNonce,
        success,
        hover,
        documentVisible,
        stir,
      ].join('|'),
    [
      view,
      identifierFocused,
      identifierValidity,
      identifierTypingNonce,
      passwordFocused,
      passwordTypingNonce,
      passwordVisible,
      submitting,
      failureNonce,
      success,
      hover,
      documentVisible,
      stir,
    ],
  );

  const [drowsySince, setDrowsySince] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDrowsySince(activity), DROWSY_AFTER);
    return () => window.clearTimeout(timer);
  }, [activity]);
  const drowsy = drowsySince === activity;

  // Listeners only exist while dozing, so idle browsing costs nothing.
  useEffect(() => {
    if (!drowsy) return;
    const wake = () => setStir((n) => n + 1);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('pointermove', wake, { once: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('pointermove', wake);
    };
  }, [drowsy]);

  // ── Blinking ─────────────────────────────────────────────────────────────
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    // A backgrounded tab gets no blink timer at all; it would only queue
    // renders nobody can see.
    if (reduceMotion || !documentVisible) return;
    let timer = 0;
    let cancelled = false;
    const at = (fn: () => void, delay: number) => {
      timer = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };
    const close = () => {
      setBlinking(true);
      at(() => {
        setBlinking(false);
        // Every so often Wevsoft blinks twice, which is what makes it read as alive.
        if (Math.random() < DOUBLE_BLINK_CHANCE) {
          at(() => {
            setBlinking(true);
            at(() => {
              setBlinking(false);
              schedule();
            }, BLINK_CLOSED - 10);
          }, DOUBLE_BLINK_GAP);
        } else {
          schedule();
        }
      }, BLINK_CLOSED);
    };
    const schedule = () => at(close, BLINK_MIN + Math.random() * BLINK_SPREAD);
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Never leave the eyes stuck shut if the tab hides mid-blink.
      setBlinking(false);
    };
  }, [reduceMotion, documentVisible]);

  // ── Resolve the pose ─────────────────────────────────────────────────────
  let state: MascotState;
  if (success) state = 'SUCCESS';
  else if (submitting) state = 'SUBMITTING';
  else if (errorBeat === 1) state = 'CURIOUS';
  else if (errorBeat === 2) state = 'USERNAME_INVALID';
  else if (errorBeat >= 3) state = 'LOGIN_ERROR';
  // Revealing the password is deliberate, so peek through the fingers rather
  // than sealing them shut.
  else if (passwordFocused) {
    if (passwordVisible) state = 'PASSWORD_VISIBLE';
    else state = passwordTyping ? 'PASSWORD_PROTECTED' : 'PASSWORD_FOCUSED';
  } else if (identifierFocused) {
    if (identifierTyping) state = 'USERNAME_TYPING';
    else if (identifierValidity === 'valid') state = 'USERNAME_VALID';
    else if (identifierValidity === 'invalid') state = 'USERNAME_INVALID';
    else state = 'USERNAME_FOCUSED';
  }
  // Keep peeking with focus elsewhere — the password stays on screen until it's
  // toggled back — but never at the expense of watching the user type.
  else if (passwordVisible) state = 'PASSWORD_VISIBLE';
  else if (hover === 'forgot') state = 'FORGOT_PASSWORD';
  else if (hover === 'signup') state = 'SIGNUP';
  else if (view === 'forgot') state = 'FORGOT_PASSWORD';
  else if (view === 'register' || view === 'oauth_setup') state = 'SIGNUP';
  else if (drowsy) state = 'SLEEPY';
  else state = 'IDLE';

  return {
    state,
    blinking: blinking && !EYES_UNAVAILABLE.has(state),
    errorVisible: failureNonce === 0 || errorBeat >= 3,
  };
}
