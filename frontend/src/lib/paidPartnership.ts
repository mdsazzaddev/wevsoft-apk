/**
 * "Paid partnership" labels for feed cards. A post gets the label when a brand approved it as
 * branded content (Business Suite -> Creators). Lookups are batched (one request per ~50 cards)
 * and cached for the session.
 */
import { useEffect, useState } from 'react';

export type PartnershipLabel = { brand: { id: string; name?: string | null; username?: string | null } | null } | null;

const cache = new Map<string, PartnershipLabel>();
const waiting = new Map<string, Array<(v: PartnershipLabel) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Splits ids into request-sized chunks (server accepts 50). */
export function chunkIds(ids: string[], size = 50): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** Fills `cache` from a /growth/branded response; ids without a label are cached as null. */
export function applyLabels(ids: string[], labels: Record<string, PartnershipLabel> | undefined, into = cache) {
  for (const id of ids) into.set(id, labels?.[id] ?? null);
  return into;
}

async function flush(fetcher: typeof fetch = fetch) {
  timer = null;
  const ids = [...waiting.keys()];
  for (const chunk of chunkIds(ids)) {
    let labels: Record<string, PartnershipLabel> | undefined;
    try {
      const r = await fetcher(`/api/business-suite/growth/branded?ids=${encodeURIComponent(chunk.join(','))}`);
      if (r.ok) labels = (await r.json())?.labels;
    } catch { /* label is best effort */ }
    applyLabels(chunk, labels);
    for (const id of chunk) { for (const cb of waiting.get(id) || []) cb(cache.get(id) ?? null); waiting.delete(id); }
  }
}

export function loadPartnershipLabel(postId: string): Promise<PartnershipLabel> {
  if (cache.has(postId)) return Promise.resolve(cache.get(postId) ?? null);
  return new Promise((resolve) => {
    const list = waiting.get(postId) || [];
    list.push(resolve);
    waiting.set(postId, list);
    if (!timer) timer = setTimeout(() => void flush(), 40);
  });
}

export function usePartnershipLabel(postId: string | undefined | null): PartnershipLabel {
  const [label, setLabel] = useState<PartnershipLabel>(() => (postId ? cache.get(postId) ?? null : null));
  useEffect(() => {
    if (!postId) return;
    let alive = true;
    void loadPartnershipLabel(postId).then((v) => { if (alive) setLabel(v); });
    return () => { alive = false; };
  }, [postId]);
  return label;
}
