import { useStore } from '../store';

export type AISourceType = 'POST' | 'COMMENT' | 'MESSAGE' | 'CAPTION' | 'BIO';
export type AIActionType = 'TRANSLATION' | 'SUMMARY';

function authHeaders(): HeadersInit {
  const token = useStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export const aiApi = {
  process: (payload: {
    sourceId: string;
    sourceType: AISourceType;
    actionType: AIActionType;
    targetLanguage?: string;
    originalText?: string;
  }) =>
    fetch('/api/ai/process', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handle) as Promise<{ success: boolean; data: { content: string; cached: boolean } }>,
};
