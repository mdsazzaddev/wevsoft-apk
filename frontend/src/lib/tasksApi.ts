export async function createTask(token: string, data: any) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function getTasks(token: string, projectId?: string) {
  const url = projectId ? `/api/tasks?projectId=${projectId}` : '/api/tasks';
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get tasks');
  return res.json();
}

export async function assignTask(token: string, taskId: string, assigneeId: string) {
  const res = await fetch(`/api/tasks/${taskId}/assign`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigneeId })
  });
  if (!res.ok) throw new Error('Failed to assign task');
  return res.json();
}
