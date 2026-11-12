export async function uploadVoiceNote(token: string, conversationId: string, audioBlob: Blob, duration: number) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voicenote.webm');
  formData.append('duration', duration.toString());
  
  const res = await fetch(`/api/voice/notes/${conversationId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload voice note');
  return res.json();
}

export async function getVoiceNotes(token: string, conversationId: string, page: number = 1) {
  const res = await fetch(`/api/voice/notes/${conversationId}?page=${page}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch voice notes');
  return res.json();
}

export async function transcribeVoiceNote(token: string, noteId: string) {
  const res = await fetch(`/api/voice/notes/${noteId}/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to transcribe voice note');
  return res.json();
}

export async function summarizeVoiceNote(token: string, noteId: string) {
  const res = await fetch(`/api/voice/notes/${noteId}/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to summarize voice note');
  return res.json();
}

export async function translateVoiceNote(token: string, noteId: string, targetLang: string) {
  const res = await fetch(`/api/voice/notes/${noteId}/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetLang })
  });
  if (!res.ok) throw new Error('Failed to translate voice note');
  return res.json();
}

export async function markListened(token: string, noteId: string) {
  const res = await fetch(`/api/voice/notes/${noteId}/listened`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to mark voice note as listened');
  return res.json();
}

export async function executeVoiceCommand(token: string, command: string) {
  const res = await fetch(`/api/voice/command`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command })
  });
  if (!res.ok) throw new Error('Failed to execute voice command');
  return res.json();
}

export async function updatePlaybackSpeed(token: string, noteId: string, speed: number) {
  const res = await fetch(`/api/voice/notes/${noteId}/speed`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ speed })
  });
  if (!res.ok) throw new Error('Failed to update playback speed');
  return res.json();
}
