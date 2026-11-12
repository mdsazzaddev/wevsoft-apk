export async function getFeed(token: string) {
  const res = await fetch('/api/social/feed', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get feed');
  return res.json();
}

export async function getChannel(token: string, channelId: string) {
  const res = await fetch(`/api/social/channels/${channelId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get channel');
  return res.json();
}

export async function subscribe(token: string, channelId: string) {
  const res = await fetch(`/api/social/channels/${channelId}/subscribe`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to subscribe');
  return res.json();
}

export async function createCommunity(token: string, data: any) {
  const res = await fetch('/api/social/communities', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create community');
  return res.json();
}

export async function sendFanMessage(token: string, creatorId: string, message: string, amount: number) {
  const res = await fetch(`/api/social/creators/${creatorId}/fan-message`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, amount })
  });
  if (!res.ok) throw new Error('Failed to send fan message');
  return res.json();
}
