const KEY = 'wev_aff';
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type AffiliateRef = {
  creatorId: string;
  reelId: string;
  productId: string;
  ts: number;
};

export function saveAffiliate(data: { creatorId: string; reelId: string; productId: string }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function readAffiliate(productId?: string): AffiliateRef | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AffiliateRef;
    if (!data?.creatorId || !data?.reelId || !data?.productId) return null;
    if (Date.now() - Number(data.ts || 0) > WINDOW_MS) return null;
    if (productId && data.productId !== productId) return null;
    return data;
  } catch {
    return null;
  }
}
