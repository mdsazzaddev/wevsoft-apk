import { memo, useEffect, useMemo, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import {
  DEFAULT_POSE_TRANSITION,
  MASCOT_POSES,
  MOUTH_PATHS,
  POSE_TRANSITIONS,
  type MascotState,
} from './mascotPoses';
import {
  useCoarsePointer,
  useDocumentVisible,
  useLiteAuthScene,
  useOnScreen,
} from '../useSceneActivity';

/**
 * Wevsoft's login companion.
 *
 * A soft squircle head behind a glossy visor, two oversized capsule eyes, a
 * bobbing antenna and a pair of floating mitten paws. Every part is its own
 * animated node so the pose table can drive them independently, and the whole
 * thing is inline SVG (no image, video or Lottie payload) so it costs nothing
 * on first paint and never blocks the form.
 *
 * Three transform layers per moving part, outermost first:
 *   1. the pose — springs to whatever `state` asks for;
 *   2. idle life — slow head drift and eye saccades on a randomised timer;
 *   3. cursor tracking — follows the pointer.
 * Layers 2 and 3 are driven entirely by motion values, so a mousemove or a
 * fidget never triggers a React render. The component only re-renders when the
 * pose or the blink flag actually changes, and the SVG is never remounted.
 *
 * Everything ambient is gated on `playing`: a backgrounded tab, a mascot
 * scrolled out of view, or `prefers-reduced-motion` all bring the loops to a
 * stop without unmounting the scene.
 *
 * SECURITY: the only inputs are a pose enum and a blink flag. No credential
 * value reaches this component, by construction.
 */

type Props = {
  state: MascotState;
  /** True for the ~110ms a blink lasts; composes on top of the pose's eyeOpen. */
  blinking?: boolean;
  className?: string;
};

const EYES = {
  l: { x: 100, y: 118 },
  r: { x: 160, y: 118 },
};

/**
 * Resting anchors for the floating paws. Chosen so the cover-the-eyes offsets in
 * the pose table land the paws exactly on the eye centres.
 */
const PAWS = {
  l: { x: 64, y: 230 },
  r: { x: 196, y: 230 },
};

/** Cursor-tracking travel, in viewBox units. Small on purpose — a glance, not a lunge. */
const PUPIL_RANGE = 5.5;
const HEAD_RANGE = 4;
const HEAD_TILT_RANGE = 2.5;

/**
 * Motion writes `transform-box: fill-box` on every SVG node it transforms, so
 * `transform-origin` is resolved against that node's *own* fill box — not the
 * viewBox. Origins here are therefore fractions of the part's own box, and any
 * part whose pivot is simply its own centre leaves Motion's default (0.5, 0.5)
 * alone. Passing viewBox coordinates as px would fling the part across the
 * canvas the moment it scales or rotates.
 *
 * The head pivots on the bottom edge of its box — the shell's base at y=196 —
 * so a tilt leans on the neck instead of spinning in place.
 */
const NECK = { originX: 0.5, originY: 1 } as const;

/** Idle-life tuning. Long, uneven gaps are what keep it from reading as a loop. */
const FIDGET_FIRST_MIN = 1200;
const FIDGET_FIRST_SPREAD = 1800;
const FIDGET_GAP_MIN = 1900;
const FIDGET_GAP_SPREAD = 3600;
const SACCADE_HOLD_MIN = 420;
const SACCADE_HOLD_SPREAD = 640;

function WevMascotImpl({ state, blinking = false, className }: Props) {
  const reduceMotion = useReducedMotion();
  const pose = MASCOT_POSES[state];
  // Module-level constants, so identity is stable per state.
  const spring = POSE_TRANSITIONS[state] ?? DEFAULT_POSE_TRANSITION;

  const rootRef = useRef<SVGSVGElement>(null);
  const documentVisible = useDocumentVisible();
  const onScreen = useOnScreen(rootRef);
  const lite = useLiteAuthScene();
  const coarsePointer = useCoarsePointer();

  /** Master gate for every ambient loop, timer and listener in the scene. */
  const playing = !reduceMotion && documentVisible && onScreen;
  /** Amplitude scale — phones / modest hardware get the same character, quieter. */
  const calm = lite ? 0.45 : 1;

  const transition = useMemo(
    () =>
      reduceMotion
        ? ({ duration: 0.12, ease: 'easeOut' } as const)
        : ({ type: 'spring', ...spring } as const),
    [reduceMotion, spring],
  );

  /** Blinks have to snap shut; pose changes ride the softer spring above. */
  const lidTransition = useMemo(
    () =>
      reduceMotion
        ? ({ duration: 0.08 } as const)
        : ({ type: 'spring', stiffness: 900, damping: 34 } as const),
    [reduceMotion],
  );

  // ── Cursor tracking ──────────────────────────────────────────────────────
  const aimX = useMotionValue(0);
  const aimY = useMotionValue(0);
  const smoothAimX = useSpring(aimX, { stiffness: 120, damping: 18, mass: 0.6 });
  const smoothAimY = useSpring(aimY, { stiffness: 120, damping: 18, mass: 0.6 });

  // Read by the pointer listener so changing pose never re-attaches it.
  const trackRef = useRef(pose.track);
  useEffect(() => {
    trackRef.current = reduceMotion ? 0 : pose.track;
    if (trackRef.current === 0) {
      // Eyes covered, submitting, celebrating: recentre and stop following.
      aimX.set(0);
      aimY.set(0);
    }
  }, [pose.track, reduceMotion, aimX, aimY]);

  useEffect(() => {
    // No cursor to follow on a touch screen, and nothing to follow it with while
    // the scene is parked — either way, skip the listener entirely.
    if (!playing || coarsePointer) return;
    const el = rootRef.current;
    if (!el) return;

    // Cache the box and refresh it on resize/scroll instead of measuring on
    // every move — a layout read per mousemove would be the expensive part.
    let box = el.getBoundingClientRect();
    const remeasure = () => {
      box = el.getBoundingClientRect();
    };
    const observer = new ResizeObserver(remeasure);
    observer.observe(el);
    window.addEventListener('scroll', remeasure, { passive: true });
    window.addEventListener('resize', remeasure);

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return; // Throttle to one update per frame.
      const { clientX, clientY } = e;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const strength = trackRef.current;
        if (strength === 0 || !box.width || !box.height) return;
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        aimX.set(clamp((clientX - (box.left + box.width / 2)) / (box.width / 2)) * strength);
        aimY.set(clamp((clientY - (box.top + box.height / 2)) / (box.height / 2)) * strength);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', remeasure);
      window.removeEventListener('resize', remeasure);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [playing, coarsePointer, aimX, aimY]);

  const pupilTrackX = useTransform(smoothAimX, (v) => v * PUPIL_RANGE);
  const pupilTrackY = useTransform(smoothAimY, (v) => v * PUPIL_RANGE * 0.8);
  const headTrackX = useTransform(smoothAimX, (v) => v * HEAD_RANGE);
  const headTrackY = useTransform(smoothAimY, (v) => v * HEAD_RANGE * 0.55);
  const headTrackTilt = useTransform(smoothAimX, (v) => v * HEAD_TILT_RANGE);

  // ── Idle life: saccades and a slow head wander ───────────────────────────
  // Both ride motion values on a randomised timer rather than repeating
  // keyframes, so nothing here is periodic and nothing here re-renders React.
  const saccadeX = useMotionValue(0);
  const saccadeY = useMotionValue(0);
  const driftX = useMotionValue(0);
  const driftTilt = useMotionValue(0);
  // Eyes dart, so this spring is stiff; the head ambles, so its spring is not.
  const eyeDartX = useSpring(saccadeX, { stiffness: 620, damping: 26, mass: 0.4 });
  const eyeDartY = useSpring(saccadeY, { stiffness: 620, damping: 26, mass: 0.4 });
  const headDriftX = useSpring(driftX, { stiffness: 24, damping: 15, mass: 1.2 });
  const headDriftTilt = useSpring(driftTilt, { stiffness: 22, damping: 15, mass: 1.2 });

  // Only fidget out of a resting pose. Mid-reaction the pose table owns the
  // face, and a stray offset would fight whatever it is trying to say.
  const restingRef = useRef(pose.track > 0);
  useEffect(() => {
    restingRef.current = pose.track > 0;
  }, [pose.track]);

  useEffect(() => {
    const park = () => {
      saccadeX.set(0);
      saccadeY.set(0);
      driftX.set(0);
      driftTilt.set(0);
    };
    // Phones / low-power skip the fidget layer (still get pose changes + blink).
    if (!playing || lite) {
      park();
      return;
    }

    let timer = 0;
    let cancelled = false;
    const at = (fn: () => void, delay: number) => {
      timer = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };
    const gap = () => FIDGET_GAP_MIN + Math.random() * FIDGET_GAP_SPREAD;

    const beat = () => {
      if (restingRef.current) {
        const roll = Math.random();
        if (roll < 0.34) {
          // Glance somewhere and come back. This is the beat that reads as alive.
          const dir = Math.random() < 0.5 ? -1 : 1;
          saccadeX.set(dir * (1.4 + Math.random() * 1.6));
          saccadeY.set((Math.random() - 0.62) * 1.5);
          at(
            () => {
              saccadeX.set(0);
              saccadeY.set(0);
              at(beat, gap());
            },
            SACCADE_HOLD_MIN + Math.random() * SACCADE_HOLD_SPREAD,
          );
          return;
        }
        if (roll < 0.62) {
          // Settle the head somewhere new and just stay there. No return trip,
          // so the resting pose never resolves into a repeating figure.
          driftX.set((Math.random() - 0.5) * 3.4);
          driftTilt.set((Math.random() - 0.5) * 2.6);
        }
        // The remaining ~38% of beats do nothing at all. The stillness between
        // gestures is what keeps this calm instead of twitchy.
      }
      at(beat, gap());
    };

    at(beat, FIDGET_FIRST_MIN + Math.random() * FIDGET_FIRST_SPREAD);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      park();
    };
  }, [playing, lite, saccadeX, saccadeY, driftX, driftTilt]);

  // ── Ambient breathing ────────────────────────────────────────────────────
  // Infinite SVG transform loops are a common mobile jank source on this page.
  const float = playing && !lite ? pose.float * calm : 0;
  const breathe = useMemo(
    () =>
      float === 0
        ? { y: 0, scale: 1 }
        : { y: [0, -4.5 * float, 0], scale: [1, 1 + 0.012 * float, 1] },
    [float],
  );
  const breatheTransition = useMemo(
    () =>
      float === 0
        ? ({ duration: 0.45, ease: 'easeOut' } as const)
        : ({
            duration: 4.2 / Math.max(0.4, float),
            repeat: Infinity,
            ease: 'easeInOut',
          } as const),
    [float],
  );

  const lidOpen = blinking ? 0.05 : pose.eyeOpen;
  const mouthPath = pose.mouth === 'open' ? MOUTH_PATHS.neutral : MOUTH_PATHS[pose.mouth];
  const waving = playing && (state === 'SUCCESS' || state === 'SIGNUP');
  // The core beats fast while a login is in flight and idles slowly otherwise.
  const pulse = state === 'SUBMITTING' ? 1 : 3.4;
  /** Antenna sway is the first thing to go on phones / modest hardware. */
  const swaying = playing && !lite;

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 260 292"
      className={`wev-mascot ${className ?? ''}`}
      // Current pose, exposed for tests and debugging. Purely an enum name —
      // never anything derived from what the user typed.
      data-mascot-state={state}
      // Decorative: every mood it expresses is also stated in the page copy,
      // so announcing it again would just be noise for a screen reader.
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="wev-shell" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="var(--wev-shell-hi)" />
          <stop offset="100%" stopColor="var(--wev-shell-lo)" />
        </linearGradient>
        <linearGradient id="wev-visor" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="var(--wev-visor-hi)" />
          <stop offset="100%" stopColor="var(--wev-visor-lo)" />
        </linearGradient>
        <linearGradient id="wev-eye" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="var(--wev-eye-lo)" />
        </linearGradient>
        <radialGradient id="wev-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.13" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wev-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ambient glow — brightens while thinking, drains on failure. */}
      <motion.ellipse
        cx="130"
        cy="150"
        rx="126"
        ry="132"
        fill="url(#wev-glow)"
        animate={{ opacity: pose.glow, scale: 0.9 + pose.glow * 0.22 }}
        transition={transition}
      />

      {/* Colour drains for the disappointed beat after a failed login.
          Skip live CSS `filter` on lite scenes — filter compositing is costly on phones. */}
      <motion.g
        animate={
          lite
            ? { opacity: 1 - pose.pale * 0.28 }
            : { opacity: 1 - pose.pale * 0.18, filter: `saturate(${1 - pose.pale * 0.8})` }
        }
        transition={transition}
      >
        {/* Breathing + floating, shared by the whole figure. */}
        <motion.g animate={breathe} transition={breatheTransition}>
          {/* ── Body ── */}
          <motion.g
            animate={{ y: pose.body.y, scale: pose.body.scale }}
            transition={transition}
            // Bottom-weighted: y=250 within the 182→270 shell.
            style={{ originX: 0.5, originY: 0.77 }}
          >
            {/* Top 14px tuck behind the head, so the junction reads as shoulders
                rather than a gap between two separate blobs. */}
            <rect x="80" y="182" width="100" height="88" rx="38" fill="url(#wev-shell)" />
            <rect
              x="80"
              y="182"
              width="100"
              height="88"
              rx="38"
              fill="none"
              stroke="var(--wev-edge)"
              strokeWidth="1.5"
            />
            {/* Chest core */}
            <circle cx="130" cy="228" r="15" fill="var(--wev-visor-lo)" opacity="0.85" />
            <motion.circle
              cx="130"
              cy="228"
              r="8"
              fill="var(--primary)"
              animate={
                playing ? { opacity: [0.55, 0.95, 0.55], scale: [0.94, 1.06, 0.94] } : { opacity: 0.85, scale: 1 }
              }
              transition={
                playing
                  ? { duration: pulse, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
          </motion.g>

          {/* ── Head: pose → idle drift → cursor glance ── */}
          <motion.g
            animate={{ x: pose.head.x, y: pose.head.y, rotate: pose.head.tilt }}
            transition={transition}
            style={NECK}
          >
            <motion.g style={{ x: headDriftX, rotate: headDriftTilt, ...NECK }}>
              <motion.g
                style={{ x: headTrackX, y: headTrackY, rotate: headTrackTilt, ...NECK }}
              >
                {/* Antenna */}
                <motion.g
                  animate={swaying ? { rotate: [-4, 4, -4] } : { rotate: 0 }}
                  transition={
                    swaying
                      ? { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.4 }
                  }
                  style={{ originX: 0.5, originY: 0.95 }}
                >
                  <rect x="127.5" y="26" width="5" height="24" rx="2.5" fill="var(--wev-shell-lo)" />
                  <motion.circle
                    cx="130"
                    cy="22"
                    r="9"
                    fill="var(--primary)"
                    animate={
                      playing ? { opacity: [0.72, 1, 0.72], scale: [0.92, 1.08, 0.92] } : { opacity: 1, scale: 1 }
                    }
                    transition={
                      playing
                        ? { duration: pulse * 0.85, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.3 }
                    }
                  />
                  <circle cx="126.6" cy="18.6" r="2.6" fill="#ffffff" opacity="0.75" />
                </motion.g>

                {/* Side pods */}
                <rect x="30" y="104" width="18" height="46" rx="9" fill="url(#wev-shell)" />
                <rect x="212" y="104" width="18" height="46" rx="9" fill="url(#wev-shell)" />
                <rect x="35" y="118" width="8" height="18" rx="4" fill="var(--primary)" opacity="0.55" />
                <rect x="217" y="118" width="8" height="18" rx="4" fill="var(--primary)" opacity="0.55" />

                {/* Shell */}
                <rect x="44" y="46" width="172" height="150" rx="56" fill="url(#wev-shell)" />
                <rect
                  x="44"
                  y="46"
                  width="172"
                  height="150"
                  rx="56"
                  fill="none"
                  stroke="var(--wev-edge)"
                  strokeWidth="1.5"
                />
                <path d="M 60 96 A 56 56 0 0 1 116 48 L 96 48 A 56 56 0 0 0 44 102 Z" fill="url(#wev-sheen)" />

                {/* Visor */}
                <rect x="62" y="72" width="136" height="102" rx="46" fill="url(#wev-visor)" />
                <rect
                  x="62"
                  y="72"
                  width="136"
                  height="102"
                  rx="46"
                  fill="none"
                  stroke="var(--wev-visor-edge)"
                  strokeWidth="1.5"
                />

                {/* Eyebrows — luminous bars that tilt with the mood. */}
                {(['l', 'r'] as const).map((side) => {
                  const eye = EYES[side];
                  const dir = side === 'l' ? 1 : -1;
                  return (
                    <motion.rect
                      key={`brow-${side}`}
                      x={eye.x - 15}
                      y="90"
                      width="30"
                      height="5"
                      rx="2.5"
                      fill="var(--primary)"
                      opacity="0.7"
                      animate={{ y: pose.brow.y, rotate: pose.brow.angle * dir }}
                      transition={transition}
                    />
                  );
                })}

                {/* Eyes: widen layer → lid layer → capsule + saccade + tracked pupil. */}
                {(['l', 'r'] as const).map((side) => {
                  const eye = EYES[side];
                  return (
                    <motion.g
                      key={`eye-${side}`}
                      animate={{ scale: pose.eyeWide }}
                      transition={transition}
                    >
                      <motion.g animate={{ scaleY: lidOpen }} transition={lidTransition}>
                        <rect
                          x={eye.x - 15}
                          y={eye.y - 17}
                          width="30"
                          height="34"
                          rx="15"
                          fill="url(#wev-eye)"
                        />
                        <motion.g
                          animate={{ x: pose.pupil.x, y: pose.pupil.y }}
                          transition={transition}
                        >
                          <motion.g style={{ x: eyeDartX, y: eyeDartY }}>
                            <motion.g style={{ x: pupilTrackX, y: pupilTrackY }}>
                              <motion.circle
                                cx={eye.x}
                                cy={eye.y + 1}
                                r="7.6"
                                fill="var(--wev-pupil)"
                                animate={{ scale: pose.pupilScale }}
                                transition={transition}
                              />
                              <circle cx={eye.x - 3.4} cy={eye.y - 3.4} r="2.8" fill="#ffffff" opacity="0.92" />
                              <circle cx={eye.x + 3} cy={eye.y + 5} r="1.5" fill="#ffffff" opacity="0.5" />
                            </motion.g>
                          </motion.g>
                        </motion.g>
                      </motion.g>
                    </motion.g>
                  );
                })}

                {/* Mouth — one tweenable curve, cross-faded with an open shape.
                    `initial` seeds the path so motion always has a valid origin to
                    interpolate from; a static `d` prop would leave it reading the
                    attribute before React has written it. */}
                <motion.path
                  fill="none"
                  stroke="var(--wev-mouth)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  initial={{ d: MOUTH_PATHS.neutral, opacity: 1 }}
                  animate={{ d: mouthPath, opacity: pose.mouth === 'open' ? 0 : 1 }}
                  transition={transition}
                />
                <motion.ellipse
                  cx="130"
                  cy="152"
                  rx="8"
                  ry="10"
                  fill="var(--wev-mouth)"
                  animate={{ opacity: pose.mouth === 'open' ? 0.9 : 0 }}
                  transition={transition}
                />

                {/* Cheeks warm up with the happier poses. */}
                <motion.g
                  animate={{
                    opacity: pose.mouth === 'grin' ? 0.5 : pose.mouth === 'smile' ? 0.3 : 0.12,
                  }}
                  transition={transition}
                >
                  <ellipse cx="78" cy="146" rx="11" ry="7" fill="var(--primary)" />
                  <ellipse cx="182" cy="146" rx="11" ry="7" fill="var(--primary)" />
                </motion.g>

                {/* Scan line — only while Wevsoft is actually checking the login. */}
                {state === 'SUBMITTING' && playing && (
                  <motion.rect
                    x="64"
                    width="132"
                    height="3"
                    rx="1.5"
                    fill="var(--primary)"
                    opacity="0.7"
                    initial={{ y: 78 }}
                    animate={{ y: [78, 164, 78] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </motion.g>
            </motion.g>
          </motion.g>

          {/* ── Floating paws ── */}
          {(['l', 'r'] as const).map((side) => {
            const anchor = PAWS[side];
            const target = pose.paws[side];
            const wave = waving && side === 'r';
            return (
              <motion.g
                key={`paw-${side}`}
                animate={{ x: target.x, y: target.y, rotate: target.rotate, scale: target.scale }}
                transition={transition}
              >
                {/* The waving paw oscillates on top of whatever pose put it there. */}
                <motion.g
                  animate={wave ? { rotate: [-12, 12, -12] } : { rotate: 0 }}
                  transition={
                    wave ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : transition
                  }
                  // Swings from a wrist near the top of the paw, not its middle.
                  style={{ originX: 0.5, originY: 0.19 }}
                >
                  <ellipse
                    cx={anchor.x}
                    cy={anchor.y}
                    rx="17.5"
                    ry="19.5"
                    fill="url(#wev-shell)"
                    stroke="var(--wev-edge)"
                    strokeWidth="1.5"
                  />
                  <ellipse cx={anchor.x} cy={anchor.y + 4} rx="9" ry="8" fill="var(--primary)" opacity="0.22" />
                </motion.g>
              </motion.g>
            );
          })}
        </motion.g>
      </motion.g>
    </svg>
  );
}

const WevMascot = memo(WevMascotImpl);
export default WevMascot;
