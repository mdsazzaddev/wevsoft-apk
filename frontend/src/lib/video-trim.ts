export function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export const MAX_VIDEO_UPLOAD_BYTES = 150 * 1024 * 1024;
export const WARN_TRIM_FILE_BYTES = 100 * 1024 * 1024;
export const MIN_TRIM_DURATION_SEC = 1;
