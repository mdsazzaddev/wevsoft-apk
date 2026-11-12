/** Thin authenticated helpers for /api/sfu (Phase 5 group rooms). */

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `SFU request failed (${res.status})`);
  }
  return data;
}

export async function sfuRaiseHand(token: string, roomId: string) {
  return parseJson(
    await fetch(`/api/sfu/rooms/${encodeURIComponent(roomId)}/raise-hand`, {
      method: 'POST',
      headers: authHeaders(token),
      body: '{}',
    }),
  );
}

export async function sfuLowerHand(token: string, roomId: string, userId?: string) {
  return parseJson(
    await fetch(`/api/sfu/rooms/${encodeURIComponent(roomId)}/lower-hand`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(userId ? { userId } : {}),
    }),
  );
}

export async function sfuApproveSpeaker(token: string, roomId: string, userId: string) {
  return parseJson(
    await fetch(`/api/sfu/rooms/${encodeURIComponent(roomId)}/approve-speaker`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ userId }),
    }),
  );
}

export async function sfuRemoveParticipant(token: string, roomId: string, userId: string) {
  return parseJson(
    await fetch(`/api/sfu/rooms/${encodeURIComponent(roomId)}/remove-participant`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ userId }),
    }),
  );
}

export async function sfuSetHlsUrl(token: string, roomId: string, hlsPlaybackUrl: string | null) {
  return parseJson(
    await fetch(`/api/sfu/rooms/${encodeURIComponent(roomId)}/hls`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ hlsPlaybackUrl }),
    }),
  );
}
