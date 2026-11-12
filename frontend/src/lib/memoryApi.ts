export async function getLongTermMemories(token: string) {
  const res = await fetch('/api/memory/long-term', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get memories');
  return res.json();
}

export async function deleteMemory(token: string, memoryId: string) {
  const res = await fetch(`/api/memory/long-term/${memoryId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete memory');
  return res.json();
}

export async function updateMemorySettings(token: string, settings: { enabled: boolean; retentionDays: number }) {
  const res = await fetch('/api/memory/settings', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function clearMemory(token: string) {
  const res = await fetch('/api/memory/clear', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to clear memory');
  return res.json();
}

export async function getConversationSummary(token: string, conversationId: string) {
  const res = await fetch(`/api/memory/summary/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get summary');
  return res.json();
}
