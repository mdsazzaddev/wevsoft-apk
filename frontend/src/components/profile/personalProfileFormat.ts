/** Compact count formatting for profile stats (128, 1.2K, 15.7K). */
/** Shared compact count: 999 -> 999, 1000 -> 1K, 1500 -> 1.5K, 1000000 -> 1M, 1200000000 -> 1.2B.
 * Always K/M/B (en) as requested; pass a locale to localise. Truncates so 999999 shows 999.9K, never "1000K". */
const compactFmt = new Map<string, Intl.NumberFormat>();
export function formatCompactCount(n: number | null | undefined, locale = 'en'): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v < 1000) return String(v);
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  if (locale === 'en') {
    for (const [base, suffix] of units) {
      if (v >= base) {
        const x = Math.floor((v / base) * 10) / 10;
        return x >= 1000 && suffix !== 'T' ? formatCompactCount(base * 1000, locale) : `${String(x).replace(/\.0$/, '')}${suffix}`;
      }
    }
  }
  let f = compactFmt.get(locale);
  if (!f) {
    try { f = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }); } catch { f = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }); }
    compactFmt.set(locale, f);
  }
  return f.format(v);
}

/** Full exact number for title/tooltip attributes, e.g. 12,345. */
export function formatExactCount(n: number | null | undefined): string {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en');
}

export function parseSocialLinks(raw: unknown): Record<string, string> {
  try {
    if (!raw || raw === 'null') return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, string>;
    return JSON.parse(String(raw)) || {};
  } catch {
    return {};
  }
}

export function websiteFromProfile(profile: {
  website?: string | null;
  socialLinks?: unknown;
}): { href: string; label: string } | null {
  const links = parseSocialLinks(profile.socialLinks);
  const raw = String(profile.website || links.website || '').trim();
  if (!raw) return null;
  const href = raw.startsWith('http') ? raw : `https://${raw}`;
  const label = raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return { href, label };
}
