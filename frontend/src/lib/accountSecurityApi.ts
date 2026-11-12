/**
 * Account-level security reads: the signed-in person's own devices and sign-in
 * history.
 *
 * These wrap the endpoints that already exist on /api/security (see
 * src/server/modules/security.ts) rather than introducing Space-scoped copies. A
 * WevSpace has no sessions of its own — people sign in, not Spaces — so the Space
 * dashboard consumes these and labels them as account-level.
 */

function authHeaders(): Record<string, string> {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!res.ok) throw Object.assign(new Error(body?.error || `Request failed (${res.status})`), { status: res.status });
  return body as T;
}

export interface DeviceSessionRow {
  id: string;
  device: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  /** Resolved server-side from the refresh cookie, so it survives a token swap. */
  isCurrent: boolean;
}

export interface LoginHistoryRow {
  id: string;
  ipAddress: string | null;
  device: string | null;
  /** 'success' or 'failed' — a wrong password writes a row too. */
  status: string;
  createdAt: string;
}

export function fetchDeviceSessions() {
  return request<DeviceSessionRow[]>('/api/security/sessions');
}

export function revokeDeviceSession(id: string) {
  return request<{ success: boolean }>(`/api/security/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Newest 20 attempts, successes and failures mixed — the server caps the page. */
export function fetchLoginHistory() {
  return request<LoginHistoryRow[]>('/api/security/login-history');
}
