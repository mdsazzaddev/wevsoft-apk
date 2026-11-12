import { useStore } from '../store';

function authHeaders(json = true): HeadersInit {
  const token = useStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export const campusApi = {
  institutions: (q = '') =>
    fetch(`/api/v1/campus/institutions${q ? `?q=${encodeURIComponent(q)}` : ''}`, { headers: authHeaders(false) }).then(handle),

  me: () => fetch('/api/v1/campus/me', { headers: authHeaders(false) }).then(handle),

  hub: () => fetch('/api/v1/campus/hub', { headers: authHeaders(false) }).then(handle),

  join: (body: Record<string, unknown>) =>
    fetch('/api/v1/campus/join', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  sendVerifyEmail: (membershipId: string, academicEmail?: string) =>
    fetch('/api/v1/campus/verify-email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ membershipId, academicEmail }),
    }).then(handle),

  confirmEmail: (membershipId: string, code: string) =>
    fetch('/api/v1/campus/verify-email/confirm', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ membershipId, code }),
    }).then(handle),

  feed: (scope: 'campus' | 'batch' = 'campus', limit = 20) =>
    fetch(`/api/v1/campus/feed?scope=${scope}&limit=${limit}`, { headers: authHeaders(false) }).then(handle),

  notices: () => fetch('/api/v1/campus/notices', { headers: authHeaders(false) }).then(handle),

  createNotice: (body: Record<string, unknown>) =>
    fetch('/api/v1/campus/notices', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  routine: () => fetch('/api/v1/campus/routine', { headers: authHeaders(false) }).then(handle),

  createRoutine: (body: Record<string, unknown>) =>
    fetch('/api/v1/campus/routine', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  people: (q = '', batch = false) =>
    fetch(`/api/v1/campus/people?q=${encodeURIComponent(q)}&batch=${batch ? '1' : '0'}`, { headers: authHeaders(false) }).then(handle),

  adminMemberships: (status = 'pending') =>
    fetch(`/api/v1/campus/admin/memberships?status=${encodeURIComponent(status)}`, { headers: authHeaders(false) }).then(handle),

  reviewMembership: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
    fetch(`/api/v1/campus/admin/memberships/${id}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action, reason }),
    }).then(handle),
};
