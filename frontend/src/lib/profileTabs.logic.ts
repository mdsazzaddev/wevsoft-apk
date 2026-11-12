/**
 * Owner profile tab bar (desktop lg+): priority order + pack as many chips as the
 * row width allows. Leftover tabs go under More. All / Posts / Reels stay first.
 * Mobile (≤lg) uses a full swipe strip in ProfilePage instead of this packer.
 */

export const OWNER_PROFILE_TAB_ORDER = [
  'all',
  'posts',
  'reels',
  'about',
  'reposts',
  'photos',
  'videos',
  'friends',
  'highlights',
  'wevspaces',
  'saved',
  'private',
  'archived',
] as const;

export type OwnerProfileTabId = (typeof OWNER_PROFILE_TAB_ORDER)[number];

/** Fallback More control width when not measured. */
export const OWNER_PROFILE_MORE_RESERVE_PX = 88;
/** Fallback chip width when a tab has not been measured yet. */
export const OWNER_PROFILE_TAB_CHIP_PX = 96;
/** Always try to keep All / Posts / Reels on the bar when possible. */
export const OWNER_PROFILE_MIN_VISIBLE = 3;

function resolveTabWidthPx(
  id: string,
  widths: Readonly<Record<string, number>> | undefined,
  fallback: number,
): number {
  const w = widths?.[id];
  return Number.isFinite(w) && (w as number) > 0 ? (w as number) : fallback;
}

function promoteActiveTab(
  barIds: string[],
  moreIds: string[],
  activeId: string,
): { barIds: string[]; moreIds: string[] } {
  if (!activeId || !moreIds.includes(activeId) || barIds.length === 0) {
    return { barIds, moreIds };
  }
  const demoted = barIds[barIds.length - 1];
  return {
    barIds: [...barIds.slice(0, -1), activeId],
    moreIds: [demoted, ...moreIds.filter((id) => id !== activeId)],
  };
}

/**
 * Pack ordered tabs into the row. Uses every free pixel; only overflow goes to More.
 * If everything fits, More is empty (no reserve needed).
 */
export function fitOwnerProfileTabs(opts: {
  orderedIds: readonly string[];
  rowWidthPx: number;
  activeId: string;
  tabWidthsPx?: Readonly<Record<string, number>>;
  moreWidthPx?: number;
  chipFallbackPx?: number;
  minVisible?: number;
}): { barIds: string[]; moreIds: string[] } {
  const ordered = opts.orderedIds.filter(Boolean);
  if (ordered.length === 0) return { barIds: [], moreIds: [] };

  const rowWidth = Math.max(0, Number.isFinite(opts.rowWidthPx) ? opts.rowWidthPx : 0);
  const chipFallback = opts.chipFallbackPx ?? OWNER_PROFILE_TAB_CHIP_PX;
  const moreWidth = Math.max(0, opts.moreWidthPx ?? OWNER_PROFILE_MORE_RESERVE_PX);
  const minVisible = Math.max(1, Math.min(opts.minVisible ?? OWNER_PROFILE_MIN_VISIBLE, ordered.length));
  const widths = opts.tabWidthsPx;

  const totalWithoutMore = ordered.reduce(
    (sum, id) => sum + resolveTabWidthPx(id, widths, chipFallback),
    0,
  );
  if (totalWithoutMore <= rowWidth) {
    return { barIds: [...ordered], moreIds: [] };
  }

  const usable = Math.max(0, rowWidth - moreWidth);
  const barIds: string[] = [];
  let used = 0;
  for (const id of ordered) {
    const w = resolveTabWidthPx(id, widths, chipFallback);
    if (barIds.length === 0) {
      barIds.push(id);
      used += w;
      continue;
    }
    if (used + w > usable) break;
    barIds.push(id);
    used += w;
  }

  while (barIds.length < minVisible) {
    const next = ordered[barIds.length];
    if (!next) break;
    barIds.push(next);
  }

  const moreIds = ordered.filter((id) => !barIds.includes(id));
  return promoteActiveTab(barIds, moreIds, String(opts.activeId || ''));
}

/** Slice by count (tests / simple callers), then promote active overflow tab. */
export function splitOwnerProfileTabs(opts: {
  orderedIds: readonly string[];
  visibleCount: number;
  activeId: string;
}): { barIds: string[]; moreIds: string[] } {
  const ordered = opts.orderedIds.filter(Boolean);
  if (ordered.length === 0) return { barIds: [], moreIds: [] };

  const visibleCount = Math.max(1, Math.min(opts.visibleCount, ordered.length));
  const barIds = ordered.slice(0, visibleCount);
  const moreIds = ordered.slice(visibleCount);
  return promoteActiveTab(barIds, moreIds, String(opts.activeId || ''));
}
