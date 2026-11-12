/** Put a row back at `index` (clamped) unless a row with the same id is already present. */
export function reinsertAt<T extends { id?: unknown }>(list: T[], row: T, index: number): T[] {
  if (list.some((r) => r.id === row.id)) return list;
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, row);
  return next;
}
