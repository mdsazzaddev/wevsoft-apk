export async function globalSearch(token: string, query: string, filters?: any, page: number = 1, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });
  
  const res = await fetch(`/api/search/global?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function inChatSearch(token: string, conversationId: string, query: string) {
  const res = await fetch(`/api/search/chat/${conversationId}?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('In-chat search failed');
  return res.json();
}

export async function mediaSearch(token: string, query: string, filters?: any) {
  const params = new URLSearchParams({ q: query, ...filters });
  const res = await fetch(`/api/search/media?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Media search failed');
  return res.json();
}

export async function linkSearch(token: string, query: string, filters?: any) {
  const params = new URLSearchParams({ q: query, ...filters });
  const res = await fetch(`/api/search/links?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Link search failed');
  return res.json();
}

export async function documentSearch(token: string, query: string, filters?: any) {
  const params = new URLSearchParams({ q: query, ...filters });
  const res = await fetch(`/api/search/documents?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Document search failed');
  return res.json();
}

export async function searchSuggestions(token: string, query: string) {
  const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Suggestions failed');
  return res.json();
}

export async function getSearchHistory(token: string) {
  const res = await fetch(`/api/search/history`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('History fetch failed');
  return res.json();
}

export async function deleteSearchHistory(token: string, id?: string) {
  const url = id ? `/api/search/history/${id}` : '/api/search/history';
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('History deletion failed');
  return res.json();
}
