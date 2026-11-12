export async function generateSummary(token: string, conversationId: string) {
  const res = await fetch(`/api/summaries/${conversationId}/generate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to generate summary');
  return res.json();
}

export async function getSummaries(token: string, conversationId: string) {
  const res = await fetch(`/api/summaries/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get summaries');
  return res.json();
}

export async function extractActionItems(token: string, conversationId: string) {
  const res = await fetch(`/api/summaries/${conversationId}/action-items/extract`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to extract action items');
  return res.json();
}

export async function getActionItems(token: string, conversationId: string) {
  const res = await fetch(`/api/summaries/${conversationId}/action-items`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get action items');
  return res.json();
}
