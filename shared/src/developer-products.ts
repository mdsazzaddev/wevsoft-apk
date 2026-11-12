/**
 * Wevsoft products a developer app can connect to (ids only). Shared by the
 * console (lib/wevsoftProducts.ts adds names/icons) and the backend, which
 * validates PUT /developer/apps/:id/products against this list.
 */
export const DEVELOPER_PRODUCT_IDS = [
  'wevchat',
  'feed',
  'reels',
  'wevmall',
  'live',
  'watch-party',
  'wevspaces',
  'wevdesk',
  'groups',
  'events',
  'jobs',
  'campus',
  'academic',
  'ai-study',
  'creator-hub',
  'wallet',
] as const;

export type DeveloperProductId = (typeof DEVELOPER_PRODUCT_IDS)[number];

const KNOWN = new Set<string>(DEVELOPER_PRODUCT_IDS);

export function isDeveloperProductId(v: unknown): v is DeveloperProductId {
  return typeof v === 'string' && KNOWN.has(v);
}

/** Validate a products list: array of known ids, de-duplicated, order kept. */
export function parseDeveloperProducts(raw: unknown): { ok: true; products: DeveloperProductId[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'products must be an array' };
  if (raw.length > DEVELOPER_PRODUCT_IDS.length * 2) return { ok: false, error: 'Too many products' };
  const out: DeveloperProductId[] = [];
  for (const v of raw) {
    if (!isDeveloperProductId(v)) return { ok: false, error: `Unknown product: ${String(v).slice(0, 40)}` };
    if (!out.includes(v)) out.push(v);
  }
  return { ok: true, products: out };
}

/** Read the stored JSON column; anything invalid becomes an empty list. */
export function readStoredDeveloperProducts(stored: unknown): DeveloperProductId[] {
  try {
    const v = typeof stored === 'string' ? JSON.parse(stored || '[]') : stored;
    return Array.isArray(v) ? v.filter(isDeveloperProductId) : [];
  } catch {
    return [];
  }
}