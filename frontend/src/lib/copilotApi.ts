export async function getCredits(token: string) {
  // In a real app, this calls the backend. 
  // Mocking for now as per instructions.
  return Promise.resolve({ credits: 85 });
}

export async function rewriteText(token: string, text: string, tone: string) {
  const res = await fetch('/api/copilot/rewrite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tone })
  });
  if (!res.ok) throw new Error('Rewrite failed');
  return res.json();
}

export async function fixGrammar(token: string, text: string) {
  const res = await fetch('/api/copilot/grammar', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Grammar fix failed');
  return res.json();
}

export async function generateReplies(token: string, conversationId: string) {
  const res = await fetch(`/api/copilot/replies/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to generate replies');
  return res.json();
}

export async function getAutocomplete(token: string, text: string) {
  const res = await fetch('/api/copilot/autocomplete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Autocomplete failed');
  return res.json();
}
