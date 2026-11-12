import { useStore } from '../store';

async function lsFetch(path: string, init: RequestInit = {}) {
  const token = useStore.getState().token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api/legacy-social${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const legacySocialApi = {
  flags: () => lsFetch('/flags'),
  canvas: (handle: string) => lsFetch(`/canvas/${encodeURIComponent(handle)}`),
  presets: () => lsFetch('/presets'),
  saveTheme: (body: unknown) => lsFetch('/theme', { method: 'PUT', body: JSON.stringify(body) }),
  saveLayout: (layout: unknown) => lsFetch('/layout', { method: 'PUT', body: JSON.stringify({ layout }) }),
  resetLayout: () => lsFetch('/layout/reset', { method: 'POST', body: '{}' }),
  saveSettings: (body: unknown) => lsFetch('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  uploadBackground: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return lsFetch('/theme/background', { method: 'POST', body: fd });
  },
  friendCandidates: () => lsFetch('/friends/candidates'),
  saveTopFriends: (friendIds: string[]) => lsFetch('/top-friends', { method: 'PUT', body: JSON.stringify({ friendIds }) }),
  postWall: (handle: string, content: string) => lsFetch(`/wall/${encodeURIComponent(handle)}`, { method: 'POST', body: JSON.stringify({ content }) }),
  listWall: (handle: string) => lsFetch(`/wall/${encodeURIComponent(handle)}`),
  hideWall: (id: string) => lsFetch(`/wall/${id}/hide`, { method: 'POST', body: '{}' }),
  deleteWall: (id: string) => lsFetch(`/wall/${id}/delete`, { method: 'POST', body: '{}' }),
  reportWall: (id: string, reason: string) => lsFetch(`/wall/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
  saveStatus: (body: unknown) => lsFetch('/status', { method: 'PUT', body: JSON.stringify(body) }),
  clearStatus: () => lsFetch('/status', { method: 'DELETE' }),
  uploadIntro: async (file: File, title?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    return lsFetch('/intro', { method: 'POST', body: fd });
  },
  clearIntro: () => lsFetch('/intro', { method: 'DELETE' }),
  bulletins: () => lsFetch('/bulletins'),
  postBulletin: (body: unknown) => lsFetch('/bulletins', { method: 'POST', body: JSON.stringify(body) }),
  hideBulletin: (id: string) => lsFetch(`/bulletins/${id}`, { method: 'DELETE' }),
  reportBulletin: (id: string, reason: string) => lsFetch(`/bulletins/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
  views: () => lsFetch('/views'),
  vanity: () => lsFetch('/vanity'),
  saveVanity: (username: string) => lsFetch('/vanity', { method: 'PUT', body: JSON.stringify({ username }) }),
};
