export async function createSession(token: string, agentId: string) {
  const res = await fetch('/api/voice-ai/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function endSession(token: string, sessionId: string) {
  const res = await fetch(`/api/voice-ai/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to end session');
  return res.json();
}

export async function addTurn(token: string, sessionId: string, audioBlob: Blob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'turn.webm');
  
  const res = await fetch(`/api/voice-ai/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Failed to process turn');
  return res.json();
}

export async function getSessions(token: string) {
  const res = await fetch('/api/voice-ai/sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function getSessionDetails(token: string, sessionId: string) {
  const res = await fetch(`/api/voice-ai/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch session details');
  return res.json();
}
