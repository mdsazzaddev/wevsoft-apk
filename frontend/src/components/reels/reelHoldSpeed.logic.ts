/** Bottom fraction of the reel stage that arms hold-to-2× (Instagram-style). */
export const REEL_HOLD_SPEED_BOTTOM_FRACTION = 0.42;

/** Delay before 2× kicks in — short enough to feel instant, long enough to not fight taps. */
export const REEL_HOLD_SPEED_DELAY_MS = 160;

/** Movement before the hold timer fires cancels speed-up (so vertical scroll still works). */
export const REEL_HOLD_SPEED_CANCEL_PX = 14;

export function isReelHoldSpeedZone(
  clientY: number,
  rect: { top: number; height: number },
  bottomFraction = REEL_HOLD_SPEED_BOTTOM_FRACTION,
): boolean {
  if (!(rect.height > 0)) return false;
  const y = clientY - rect.top;
  return y >= rect.height * (1 - bottomFraction);
}
