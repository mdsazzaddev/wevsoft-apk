export async function getBases(token: string) {
  const res = await fetch('/api/knowledge/bases', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get knowledge bases');
  return res.json();
}

export async function getArticles(token: string, baseId: string) {
  const res = await fetch(`/api/knowledge/bases/${baseId}/articles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get articles');
  return res.json();
}

export async function createArticle(token: string, baseId: string, data: any) {
  const res = await fetch(`/api/knowledge/bases/${baseId}/articles`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create article');
  return res.json();
}

export async function searchKnowledge(token: string, query: string) {
  const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to search knowledge base');
  return res.json();
}
