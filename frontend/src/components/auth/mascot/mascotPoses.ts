/**
 * Wevsoft's login companion — centralized pose table.
 *
 * Every expression the mascot can wear lives here, so the animation surface is
 * one lookup table rather than dozens of ad-hoc tweens scattered through the
 * auth page. `WevMascot` renders a pose; `useMascotDirector` decides which one.
 *
 * SECURITY: a pose is described purely in geometry. Nothing in this module — or
 * anything downstream of it — ever receives a credential value. The director is
 * handed derived flags (focused / validity / submitting) and nothing else.
 */

export type MascotState =
  | 'IDLE'
  | 'CURIOUS'
  | 'USERNAME_FOCUSED'
  | 'USERNAME_TYPING'
  | 'USERNAME_VALID'
  | 'USERNAME_INVALID'
  | 'PASSWORD_FOCUSED'
  | 'PASSWORD_PROTECTED'
  | 'PASSWORD_VISIBLE'
  | 'SUBMITTING'
  | 'LOGIN_ERROR'
  | 'SUCCESS'
  | 'FORGOT_PASSWORD'
  | 'SIGNUP'
  | 'SLEEPY';

export type MouthShape = 'flat' | 'neutral' | 'smile' | 'grin' | 'confused' | 'sad' | 'open';

/** Mouth variants share one `M x y Q cx cy x y` signature so `d` can tween. */
export const MOUTH_PATHS: Record<Exclude<MouthShape, 'open'>, string> = {
  flat: 'M 117 152 Q 130 152 143 152',
  neutral: 'M 117 150 Q 130 156 143 150',
  smile: 'M 114 148 Q 130 161 146 148',
  grin: 'M 110 146 Q 130 168 150 146',
  confused: 'M 117 155 Q 130 147 143 151',
  sad: 'M 117 157 Q 130 147 143 157',
};

export type PawPose = {
  /** Offset from the paw's resting anchor, in viewBox units. */
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

export type MascotPose = {
  /** Vertical squash of the eye capsules — 1 is fully open, 0 is shut. */
  eyeOpen: number;
  /** Uniform eye scale, for widening in surprise. */
  eyeWide: number;
  /** Base pupil offset before cursor tracking is added. */
  pupil: { x: number; y: number };
  pupilScale: number;
  brow: { y: number; angle: number };
  mouth: MouthShape;
  head: { x: number; y: number; tilt: number };
  body: { y: number; scale: number };
  paws: { l: PawPose; r: PawPose };
  /** Ambient glow strength, 0–1. */
  glow: number;
  /** 0 keeps full colour, 1 goes pale — used for the disappointed error beat. */
  pale: number;
  /** How strongly the pupils chase the cursor, 0–1. */
  track: number;
  /** Idle float amplitude multiplier — 0 pins the mascot still. */
  float: number;
};

const REST_PAW: PawPose = { x: 0, y: 0, rotate: 0, scale: 1 };

/** Paws lifted onto the visor, shielding both eyes. */
const COVER_PAWS = {
  l: { x: 36, y: -108, rotate: -16, scale: 1.08 },
  r: { x: -36, y: -108, rotate: 16, scale: 1.08 },
};

const IDLE: MascotPose = {
  eyeOpen: 1,
  eyeWide: 1,
  pupil: { x: 0, y: 0 },
  pupilScale: 1,
  brow: { y: 0, angle: 0 },
  mouth: 'neutral',
  head: { x: 0, y: 0, tilt: 0 },
  body: { y: 0, scale: 1 },
  paws: { l: REST_PAW, r: REST_PAW },
  glow: 0.4,
  pale: 0,
  track: 1,
  float: 1,
};

type PoseOverride = {
  [K in keyof MascotPose]?: MascotPose[K] extends object
    ? Partial<MascotPose[K]>
    : MascotPose[K];
};

function pose(override: PoseOverride): MascotPose {
  return {
    ...IDLE,
    ...override,
    pupil: { ...IDLE.pupil, ...override.pupil },
    brow: { ...IDLE.brow, ...override.brow },
    head: { ...IDLE.head, ...override.head },
    body: { ...IDLE.body, ...override.body },
    paws: {
      l: { ...REST_PAW, ...override.paws?.l },
      r: { ...REST_PAW, ...override.paws?.r },
    },
  } as MascotPose;
}

/**
 * The form sits to the mascot's lower right on desktop, so "looking at the
 * input" means a small down-right glance rather than a measured DOM position —
 * cheap, and it reads correctly at every breakpoint.
 */
const GLANCE_FORM = { x: 3.2, y: 2.6 };

export const MASCOT_POSES: Record<MascotState, MascotPose> = {
  IDLE,

  CURIOUS: pose({
    eyeWide: 1.06,
    brow: { y: -2.5, angle: 3 },
    mouth: 'neutral',
    head: { tilt: -3 },
    glow: 0.5,
  }),

  USERNAME_FOCUSED: pose({
    eyeWide: 1.12,
    pupil: GLANCE_FORM,
    brow: { y: -3.5, angle: 4 },
    mouth: 'neutral',
    head: { x: 3, tilt: 4 },
    glow: 0.55,
  }),

  USERNAME_TYPING: pose({
    eyeOpen: 0.94,
    eyeWide: 1.08,
    pupil: { x: 3.6, y: 3.2 },
    pupilScale: 0.94,
    brow: { y: -1.5, angle: 6 },
    // A trace of a smile while following along — encouraging, not a reaction.
    mouth: 'neutral',
    head: { x: 4, y: 1, tilt: 5 },
    glow: 0.5,
    track: 0.35,
  }),

  USERNAME_VALID: pose({
    eyeOpen: 0.9,
    pupil: { x: 2.4, y: 1.6 },
    brow: { y: -2 },
    mouth: 'smile',
    head: { x: 2, tilt: 2 },
    glow: 0.62,
  }),

  USERNAME_INVALID: pose({
    eyeOpen: 0.96,
    eyeWide: 1.04,
    pupil: { x: 2.8, y: 2.2 },
    brow: { y: -4, angle: -9 },
    mouth: 'confused',
    head: { x: 2, tilt: -7 },
    glow: 0.42,
    track: 0.4,
  }),

  // Eyes shut and shielded the moment the password field is live. The head also
  // leans a couple of degrees away — small enough that the paws still cover, big
  // enough to read as "not looking".
  PASSWORD_FOCUSED: pose({
    eyeOpen: 0.06,
    pupil: { x: 0, y: 1 },
    brow: { y: 2, angle: -4 },
    mouth: 'smile',
    head: { y: 2, tilt: -2 },
    body: { y: 1 },
    paws: COVER_PAWS,
    glow: 0.34,
    track: 0,
    float: 0.6,
  }),

  PASSWORD_PROTECTED: pose({
    eyeOpen: 0.05,
    pupil: { x: 0, y: 1.5 },
    brow: { y: 3, angle: -6 },
    mouth: 'smile',
    head: { y: 3, tilt: -2.5 },
    body: { y: 2, scale: 0.99 },
    paws: {
      l: { ...COVER_PAWS.l, y: -110, rotate: -19 },
      r: { ...COVER_PAWS.r, y: -110, rotate: 19 },
    },
    glow: 0.3,
    track: 0,
    float: 0.5,
  }),

  // Password revealed: one paw slides down and the mascot peeks, curious.
  PASSWORD_VISIBLE: pose({
    eyeOpen: 1.04,
    eyeWide: 1.1,
    pupil: { x: 2.6, y: 2.8 },
    brow: { y: -4, angle: 5 },
    mouth: 'neutral',
    head: { x: 2, y: 1, tilt: 5 },
    paws: {
      l: { ...COVER_PAWS.l, x: 30, y: -66, rotate: -26, scale: 1.02 },
      r: { x: -12, y: -22, rotate: 12, scale: 1 },
    },
    glow: 0.5,
    track: 0.5,
    float: 0.7,
  }),

  SUBMITTING: pose({
    eyeOpen: 0.72,
    eyeWide: 1.02,
    pupil: { x: 0.6, y: 2.4 },
    pupilScale: 0.86,
    brow: { y: -1, angle: 2 },
    mouth: 'flat',
    head: { y: -1, tilt: 0 },
    glow: 0.95,
    track: 0,
    float: 0.35,
  }),

  LOGIN_ERROR: pose({
    eyeOpen: 1.02,
    eyeWide: 1.14,
    pupil: { x: 0, y: 3 },
    pupilScale: 1.08,
    brow: { y: -5, angle: -12 },
    mouth: 'sad',
    head: { y: 3, tilt: -9 },
    body: { y: 3, scale: 0.98 },
    glow: 0.16,
    pale: 1,
    track: 0.2,
    float: 0.4,
  }),

  SUCCESS: pose({
    eyeOpen: 0.62,
    eyeWide: 1.16,
    pupil: { x: 0, y: -1 },
    brow: { y: -6, angle: 8 },
    mouth: 'grin',
    head: { y: -4, tilt: 5 },
    body: { y: -4, scale: 1.03 },
    // Right paw thrown up in a wave.
    paws: {
      l: { x: 4, y: -6, rotate: -8, scale: 1 },
      r: { x: 10, y: -84, rotate: -28, scale: 1.1 },
    },
    glow: 1,
    track: 0,
    float: 1.4,
  }),

  FORGOT_PASSWORD: pose({
    eyeOpen: 0.92,
    eyeWide: 1.04,
    pupil: { x: 2, y: 1.4 },
    brow: { y: -3, angle: 7 },
    mouth: 'smile',
    head: { x: 3, tilt: 8 },
    // A gentle open-palm gesture toward the recovery form.
    paws: {
      l: REST_PAW,
      r: { x: -20, y: -46, rotate: -22, scale: 1.05 },
    },
    glow: 0.6,
  }),

  SIGNUP: pose({
    eyeOpen: 0.98,
    eyeWide: 1.14,
    pupil: { x: 0, y: -0.6 },
    brow: { y: -6, angle: 6 },
    mouth: 'grin',
    head: { y: -2, tilt: -4 },
    body: { y: -2, scale: 1.02 },
    paws: {
      l: { x: 2, y: -10, rotate: -10, scale: 1.02 },
      r: { x: 6, y: -70, rotate: -24, scale: 1.08 },
    },
    glow: 0.78,
    float: 1.3,
  }),

  SLEEPY: pose({
    eyeOpen: 0.2,
    eyeWide: 0.96,
    pupil: { x: 0, y: 3 },
    brow: { y: 3, angle: -3 },
    mouth: 'flat',
    head: { y: 4, tilt: -8 },
    body: { y: 3, scale: 0.99 },
    glow: 0.2,
    track: 0.25,
    float: 0.5,
  }),
};

/**
 * Per-state transition feel. Sharper springs for reactive beats (paws snapping
 * over the eyes), softer ones for ambient shifts.
 */
export const POSE_TRANSITIONS: Partial<Record<MascotState, { stiffness: number; damping: number }>> = {
  PASSWORD_FOCUSED: { stiffness: 420, damping: 24 },
  PASSWORD_PROTECTED: { stiffness: 260, damping: 26 },
  PASSWORD_VISIBLE: { stiffness: 320, damping: 22 },
  LOGIN_ERROR: { stiffness: 200, damping: 18 },
  SUCCESS: { stiffness: 380, damping: 16 },
  SIGNUP: { stiffness: 340, damping: 18 },
  SLEEPY: { stiffness: 90, damping: 22 },
};

export const DEFAULT_POSE_TRANSITION = { stiffness: 230, damping: 24 };
