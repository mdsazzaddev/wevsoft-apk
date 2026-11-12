/** Prefer a finite media duration; fall back to seekable end, then server metadata. */
export function resolveMediaDuration(
  reported: number,
  fallback = 0,
  seekableEnd = 0,
): number {
  if (Number.isFinite(reported) && reported > 0) return reported;
  if (Number.isFinite(seekableEnd) && seekableEnd > 0) return seekableEnd;
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

export function readVideoDuration(el: HTMLMediaElement, fallback = 0): number {
  let seekableEnd = 0;
  try {
    if (el.seekable && el.seekable.length > 0) {
      seekableEnd = el.seekable.end(el.seekable.length - 1);
    }
  } catch {
    /* ignore */
  }
  return resolveMediaDuration(el.duration, fallback, seekableEnd);
}
