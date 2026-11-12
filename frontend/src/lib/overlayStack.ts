type OverlayState = { wevOverlays?: string[] };

export function getOverlays(state: unknown): string[] {
  if (!state || typeof state !== 'object') return [];
  const list = (state as OverlayState).wevOverlays;
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
}

export function withOverlay(state: unknown, id: string) {
  const base = state && typeof state === 'object' ? { ...(state as object) } : {};
  const current = getOverlays(state);
  if (current.includes(id)) return { ...base, wevOverlays: current };
  return { ...base, wevOverlays: [...current, id] };
}
