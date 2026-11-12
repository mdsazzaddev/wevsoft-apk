/** Auth headers for viewer-aware profile / public portfolio list endpoints. */
export function profileListFetchInit(): RequestInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

/** Strip `{ success, data }` envelopes so callers can read `items` / `total` directly. */
export function unwrapProfileApiPayload(json: any): any {
  if (json == null || typeof json !== 'object') return json ?? {};
  return json.data ?? json;
}

/** List rows from an envelope or already-unwrapped `{ items }` / array payload. */
export function unwrapProfileListItems(json: any): any[] {
  const data = unwrapProfileApiPayload(json);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function fetchProfileListJson(path: string): Promise<any> {
  const res = await fetch(path, profileListFetchInit());
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return unwrapProfileApiPayload(json);
}
