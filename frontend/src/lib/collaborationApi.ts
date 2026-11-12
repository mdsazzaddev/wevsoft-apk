export async function createPoll(token: string, conversationId: string, data: any) {
  const res = await fetch(`/api/collaboration/polls/${conversationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create poll');
  return res.json();
}

export async function vote(token: string, pollId: string, optionIds: string[]) {
  const res = await fetch(`/api/collaboration/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIds })
  });
  if (!res.ok) throw new Error('Failed to vote');
  return res.json();
}

export async function getPolls(token: string, conversationId: string) {
  const res = await fetch(`/api/collaboration/polls/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get polls');
  return res.json();
}

export async function createEvent(token: string, conversationId: string, data: any) {
  const res = await fetch(`/api/collaboration/events/${conversationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function rsvpEvent(token: string, eventId: string, status: 'going' | 'maybe' | 'declined') {
  const res = await fetch(`/api/collaboration/events/${eventId}/rsvp`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to RSVP');
  return res.json();
}

export async function createNote(token: string, conversationId: string, data: any) {
  const res = await fetch(`/api/collaboration/notes/${conversationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(token: string, noteId: string, data: any) {
  const res = await fetch(`/api/collaboration/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function getNotes(token: string, conversationId: string) {
  const res = await fetch(`/api/collaboration/notes/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get notes');
  return res.json();
}

export async function uploadFile(token: string, conversationId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`/api/collaboration/files/${conversationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

export async function getFiles(token: string, conversationId: string) {
  const res = await fetch(`/api/collaboration/files/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get files');
  return res.json();
}

export async function createTask(token: string, conversationId: string, data: any) {
  const res = await fetch(`/api/collaboration/tasks/${conversationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTaskStatus(token: string, taskId: string, status: string) {
  const res = await fetch(`/api/collaboration/tasks/${taskId}/status`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update task status');
  return res.json();
}

export async function getTasks(token: string, conversationId: string) {
  const res = await fetch(`/api/collaboration/tasks/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get tasks');
  return res.json();
}
