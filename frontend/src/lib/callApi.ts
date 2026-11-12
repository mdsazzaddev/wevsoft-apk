import { apiFetch } from './apiBase';

export type CallMediaType = 'audio' | 'video';

export type CallDto = {
  id: string;
  conversationId?: string | null;
  callerId: string;
  receiverId: string;
  type: string;
  duration: number;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
}

async function parseJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function createCallRequest(input: {
  receiverId: string;
  type: CallMediaType;
  conversationId?: string | null;
}): Promise<{ ok: true; call: CallDto; ringTimeoutMs: number } | { ok: false; status: number; error: string; code?: string; call?: CallDto }> {
  const res = await apiFetch('/api/calls', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body?.error || 'Failed to start call',
      code: body?.code,
      call: body?.call || undefined,
    };
  }
  return {
    ok: true,
    call: body.call,
    ringTimeoutMs: Number(body.ringTimeoutMs) || 45_000,
  };
}

async function callAction(
  callId: string,
  action: 'accept' | 'reject' | 'cancel' | 'miss' | 'end',
  body?: Record<string, unknown>,
): Promise<{ ok: true; call: CallDto } | { ok: false; status: number; error: string; code?: string }> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(callId)}/${action}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, status: res.status, error: data?.error || `Failed to ${action}`, code: data?.code };
  }
  return { ok: true, call: data.call };
}

export const acceptCallRequest = (callId: string) => callAction(callId, 'accept');
export const rejectCallRequest = (callId: string) => callAction(callId, 'reject');
export const cancelCallRequest = (callId: string) => callAction(callId, 'cancel');
export const missCallRequest = (callId: string) => callAction(callId, 'miss');
export const endCallRequest = (callId: string, duration?: number) =>
  callAction(callId, 'end', { duration: duration ?? 0 });

export async function fetchCallHistory(limit = 20): Promise<{
  items: Array<CallDto & { caller?: any; receiver?: any }>;
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const res = await apiFetch(`/api/calls/history?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) return { items: [], nextCursor: null, hasMore: false };
  return parseJson(res);
}
