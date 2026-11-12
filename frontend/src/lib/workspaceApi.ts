export async function createWorkspace(token: string, data: any) {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create workspace');
  return res.json();
}

export async function addMember(token: string, workspaceId: string, email: string, role: string) {
  const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) throw new Error('Failed to add member');
  return res.json();
}

export async function getWorkspaces(token: string) {
  const res = await fetch('/api/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get workspaces');
  return res.json();
}
