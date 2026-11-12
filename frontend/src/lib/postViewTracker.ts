import { formatSocialCount } from './formatCount';
/**
 * Client-side post view recording — IntersectionObserver + silent POST.
 * Never toasts on failure. Dedupes locally before hitting the API.
 */

const VIEW_SESSION_KEY = 'wev_view_session';
const sent = new Map<string, number>();
const CLIENT_DEDUP_MS = 5 * 60_000;

let cachedMinVisibleMs = 1000;
let cachedVideoMinPlayMs = 3000;
let thresholdsLoaded = false;

const batchQueue: any[] = [];
let batchTimer: any = null;

function flushBatch() {
  if (batchQueue.length === 0) return;
  const views = [...batchQueue];
  batchQueue.length = 0; // Clear the queue

  const auth = token();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const session = getViewSessionId();
  if (session) headers['X-View-Session'] = session;

  fetch('/api/posts/views/batch', {
    method: 'POST',
    keepalive: true,
    headers,
    body: JSON.stringify({ views }),
  }).catch(() => {});
}

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

/** Stable anonymous session id (sessionStorage — clears when the tab session ends). */
export function getViewSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(VIEW_SESSION_KEY);
    if (!id || id.length < 16) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
      window.sessionStorage.setItem(VIEW_SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function formatCompactViews(n: number): string {
  return formatSocialCount(n);
}

async function ensureThresholds() {
  if (thresholdsLoaded || typeof window === 'undefined') return;
  thresholdsLoaded = true;
  // Thresholds are also enforced server-side; client values are advisory.
  // Use defaults — avoid an extra round-trip on every feed load.
  cachedMinVisibleMs = 1000;
  cachedVideoMinPlayMs = 3000;
}

export type RecordClientViewOpts = {
  postId: string;
  source?: string;
  visibleMs?: number;
  playMs?: number;
  isVideoLike?: boolean;
  onCounted?: (views: number) => void;
};

/** Fire-and-forget view record. Returns whether a network call was made. */
export async function recordClientPostView(opts: RecordClientViewOpts): Promise<boolean> {
  if (!opts.postId || typeof window === 'undefined') return false;
  await ensureThresholds();

  const now = Date.now();
  const prev = sent.get(opts.postId);
  if (prev && now - prev < CLIENT_DEDUP_MS) return false;
  sent.set(opts.postId, now);

  const visibleMs = opts.visibleMs ?? 0;
  if (visibleMs > 0 && visibleMs < cachedMinVisibleMs) return false;
  if (opts.isVideoLike && typeof opts.playMs === 'number' && opts.playMs < cachedVideoMinPlayMs) {
    return false;
  }

  batchQueue.push({
    postId: opts.postId,
    source: opts.source || 'feed',
    visibleMs: opts.visibleMs,
    playMs: opts.playMs,
    isVideo: !!opts.isVideoLike,
  });

  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushBatch();
    }, 2000); // Batch views every 2 seconds
  }

  // Optimistic bump for UI — batch API does not return per-post totals.
  if (typeof opts.onCounted === 'function') {
    void fetch(`/api/posts/${encodeURIComponent(opts.postId)}/views`, {
      headers: (() => {
        const h: Record<string, string> = {};
        const auth = token();
        if (auth) h.Authorization = `Bearer ${auth}`;
        return h;
      })(),
    })
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        const views = typeof d.views === 'number' ? d.views : typeof d.viewCount === 'number' ? d.viewCount : null;
        if (typeof views === 'number') opts.onCounted?.(views);
      })
      .catch(() => {});
  }
  return true;
}

/**
 * Observe a post card: after meaningful visibility, record one view.
 * Does not fire on mount alone — requires intersection ≥ 50% for minVisibleMs.
 */
export function observePostView(
  element: Element,
  opts: {
    postId: string;
    source?: string;
    isVideoLike?: boolean;
    getPlayMs?: () => number;
    onCounted?: (views: number) => void;
  },
): () => void {
  let enteredAt = 0;
  let recorded = false;
  let timer: number | null = null;

  const tryRecord = () => {
    if (recorded || !enteredAt) return;
    const visibleMs = Date.now() - enteredAt;
    if (visibleMs < cachedMinVisibleMs) return;
    recorded = true;
    void recordClientPostView({
      postId: opts.postId,
      source: opts.source || 'feed',
      visibleMs,
      playMs: opts.getPlayMs?.(),
      isVideoLike: opts.isVideoLike,
      onCounted: opts.onCounted,
    });
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!enteredAt) enteredAt = Date.now();
        if (timer == null) {
          void ensureThresholds();
          timer = window.setTimeout(() => {
            timer = null;
            tryRecord();
          }, cachedMinVisibleMs + 50);
        }
        return;
      }
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      // Leaving viewport after enough dwell also records once.
      tryRecord();
      enteredAt = 0;
    },
    { threshold: [0, 0.5, 0.75] },
  );

  observer.observe(element);
  return () => {
    observer.disconnect();
    if (timer != null) window.clearTimeout(timer);
    tryRecord();
  };
}
