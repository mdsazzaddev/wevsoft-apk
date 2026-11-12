/**
 * Pick the single feed/Reels clip that should play.
 * Desktop: hovered clip wins. Otherwise: most visible toward viewport center.
 */

type VisibleCandidate = {
  key: string;
  score: number;
  minScore: number;
  claim: () => void;
  release: () => void;
};

const candidates = new Map<string, VisibleCandidate>();
let winner: { key: string; release: () => void } | null = null;
let hoveredKey: string | null = null;
let scheduled = 0;
/** Ref-counted: overlays (account menu, etc.) keep feed/reels autoplay silent. */
let suspendCount = 0;

/** Score used while the pointer is over a clip — always beats center-visibility. */
export const HOVER_MEDIA_SCORE = 10;

/** Higher = closer to viewport center and more on-screen. */
export function visibilityCenterScore(
  rect: DOMRectReadOnly,
  intersectionRatio: number,
): number {
  if (intersectionRatio <= 0) return 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;
  const vw = typeof window !== 'undefined' ? window.innerWidth || 1 : 1;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = Math.abs(cx - vw / 2) / vw;
  const dy = Math.abs(cy - vh / 2) / vh;
  const centerFactor = 1 - Math.min(1, Math.hypot(dx * 0.85, dy));
  return intersectionRatio * (0.3 + 0.7 * centerFactor);
}

function pickWinner() {
  if (suspendCount > 0) {
    if (winner) {
      winner.release();
      winner = null;
    }
    return;
  }

  let best: VisibleCandidate | null = null;

  if (hoveredKey) {
    const hovered = candidates.get(hoveredKey);
    // Hover wins as long as the clip is still a registered candidate (on-screen).
    if (hovered && hovered.score > 0) {
      best = hovered;
    }
  }

  if (!best) {
    for (const entry of candidates.values()) {
      if (entry.score < entry.minScore) continue;
      if (!best || entry.score > best.score) best = entry;
    }

    // Prefer the current winner when scores are close (avoids flicker).
    if (winner && best && winner.key !== best.key) {
      const current = candidates.get(winner.key);
      if (current && current.score >= current.minScore && best.score - current.score < 0.05) {
        best = current;
      }
    }
  }

  if (!best) {
    if (winner) {
      winner.release();
      winner = null;
    }
    return;
  }

  if (winner?.key === best.key) {
    best.claim();
    return;
  }

  if (winner) winner.release();
  winner = { key: best.key, release: best.release };
  best.claim();
}

function schedulePick() {
  if (scheduled) return;
  scheduled = requestAnimationFrame(() => {
    scheduled = 0;
    pickWinner();
  });
}

/** Re-run the auction (e.g. after a hover preview releases exclusive playback). */
export function refreshVisibleMedia() {
  schedulePick();
}

/**
 * Desktop hover: pin this key as the playback winner while the pointer is over it.
 * Pass null on mouse leave.
 */
export function setHoveredMedia(key: string | null) {
  if (hoveredKey === key) return;
  hoveredKey = key;
  schedulePick();
}

export function getHoveredMediaKey(): string | null {
  return hoveredKey;
}

/** Report (or clear with score 0) a clip competing for exclusive autoplay. */
export function reportVisibleMedia(candidate: VisibleCandidate) {
  if (candidate.score <= 0) {
    candidates.delete(candidate.key);
    if (hoveredKey === candidate.key) hoveredKey = null;
  } else {
    candidates.set(candidate.key, candidate);
  }
  schedulePick();
}

export function clearVisibleMedia(key: string) {
  candidates.delete(key);
  if (hoveredKey === key) hoveredKey = null;
  if (winner?.key === key) {
    winner.release();
    winner = null;
  }
  schedulePick();
}

/** Release the current autoplay winner (e.g. tab hidden). Does not clear candidates. */
export function suspendVisibleMediaPlayback() {
  if (!winner) return;
  winner.release();
  winner = null;
}

export function isVisibleMediaSuspended(): boolean {
  return suspendCount > 0;
}

/**
 * Ref-counted suspend for overlays. While held, feed/reels autoplay cannot reclaim.
 * Returns a release fn — call when the overlay closes so the winner auction resumes.
 */
export function acquireVisibleMediaSuspend(): () => void {
  suspendCount += 1;
  if (suspendCount === 1) {
    suspendVisibleMediaPlayback();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspendCount = Math.max(0, suspendCount - 1);
    if (suspendCount === 0) schedulePick();
  };
}

/** Test helper — reset module auction state. */
export function resetVisibleMediaPlaybackForTests() {
  candidates.clear();
  winner = null;
  hoveredKey = null;
  suspendCount = 0;
  if (scheduled) {
    cancelAnimationFrame(scheduled);
    scheduled = 0;
  }
}
