/**
 * Social-style compact counts: 999 -> "999", 1000 -> "1k", 1250 -> "1.2k",
 * 15_400 -> "15.4k", 250_000 -> "250k", 1_000_000 -> "1m", 2_300_000_000 -> "2.3b".
 * Rounds DOWN (never overstates) and drops a trailing ".0".
 */
export function formatSocialCount(n: number | null | undefined): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v < 1000) return String(v);
  const units: [number, string][] = [[1e9, 'b'], [1e6, 'm'], [1e3, 'k']];
  for (const [size, suffix] of units) {
    if (v >= size) {
      const x = v / size;
      const shown = x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10;
      return `${String(shown).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return String(v);
}
