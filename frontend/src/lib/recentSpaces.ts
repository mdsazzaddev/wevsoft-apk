/** Recently opened Spaces, kept on this device only (sidebar "Recent Spaces"). */
export interface RecentSpace {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  accent: string;
}

const KEY = 'wev.recentSpaces.v1';
const MAX = 8;
export const RECENT_SPACES_EVENT = 'wev:recent-spaces';

export function getRecentSpaces(): RecentSpace[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s) => s && s.id && s.handle && s.name) : [];
  } catch {
    return [];
  }
}

export function pushRecentSpace(space: RecentSpace) {
  try {
    const next = [space, ...getRecentSpaces().filter((s) => s.id !== space.id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_SPACES_EVENT));
  } catch {
    /* storage unavailable: nothing to remember */
  }
}
