export type FeedInteraction = {
  targetId: string;
  targetType: 'POST' | 'REEL' | 'PRODUCT';
  categoryId?: string | null;
  actionType: 'VIEW' | 'LIKE' | 'CLICK' | 'COMMENT' | 'SHARE' | 'SAVE';
  timestamp?: string;
  durationMs?: number;
};

const MAX_QUEUE_SIZE = 250;
const queue: FeedInteraction[] = [];
let flushTimer: number | null = null;
let pagehideBound = false;

function token() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem('token');
}

async function flush() {
  const authToken = token();
  if (!authToken || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  try {
    const response = await fetch('/api/v1/interactions', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(batch),
    });
    if (!response.ok && queue.length < MAX_QUEUE_SIZE) {
      queue.unshift(...batch.slice(0, MAX_QUEUE_SIZE - queue.length));
    }
  } catch {
    if (queue.length < MAX_QUEUE_SIZE) {
      queue.unshift(...batch.slice(0, MAX_QUEUE_SIZE - queue.length));
    }
  }
}

function handlePageHide() {
  void flush();
}

export function startAnalyticsTracker() {
  if (typeof window === 'undefined') return;
  if (!pagehideBound) {
    window.addEventListener('pagehide', handlePageHide, { once: false });
    pagehideBound = true;
  }
  if (flushTimer) return;
  flushTimer = window.setInterval(() => {
    void flush();
  }, 7000);
}

export function trackFeedInteraction(event: FeedInteraction) {
  if (typeof window === 'undefined' || !event.targetId) return;
  startAnalyticsTracker();
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }
  queue.push({ ...event, timestamp: event.timestamp || new Date().toISOString() });
  if (queue.length >= 50) void flush();
}

type DwellRecord = {
  event: Omit<FeedInteraction, 'actionType' | 'durationMs'>;
  enteredAt: number;
  viewed: boolean;
};

const dwellMap = new WeakMap<Element, DwellRecord>();
let sharedDwellObserver: IntersectionObserver | null = null;

function getSharedDwellObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
  if (sharedDwellObserver) return sharedDwellObserver;
  sharedDwellObserver = new IntersectionObserver(
    (entries) => {
      const now = Date.now();
      for (const entry of entries) {
        const rec = dwellMap.get(entry.target);
        if (!rec) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!rec.enteredAt) rec.enteredAt = now;
          continue;
        }
        if (rec.enteredAt && !rec.viewed) {
          const durationMs = now - rec.enteredAt;
          rec.viewed = true;
          trackFeedInteraction({ ...rec.event, actionType: 'VIEW', durationMs });
        }
        rec.enteredAt = 0;
      }
    },
    { threshold: [0, 0.5] },
  );
  return sharedDwellObserver;
}

/** Observe viewport dwell using a single shared IntersectionObserver pool. */
export function observeFeedDwell(
  element: Element,
  event: Omit<FeedInteraction, 'actionType' | 'durationMs'>,
) {
  const observer = getSharedDwellObserver();
  if (!observer) return () => {};
  const record: DwellRecord = { event, enteredAt: 0, viewed: false };
  dwellMap.set(element, record);
  observer.observe(element);
  return () => {
    observer.unobserve(element);
    dwellMap.delete(element);
    if (record.enteredAt && !record.viewed) {
      record.viewed = true;
      trackFeedInteraction({ ...record.event, actionType: 'VIEW', durationMs: Date.now() - record.enteredAt });
    }
  };
}

export function stopAnalyticsTracker() {
  if (flushTimer && typeof window !== 'undefined') window.clearInterval(flushTimer);
  flushTimer = null;
  void flush();
}
