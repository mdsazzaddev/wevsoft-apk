import { useStore } from '../store';

export type WevChatSearchOptions = {
  conversationId?: string;
  scope?: 'global' | 'conversation';
  type?: 'all' | 'text' | 'image' | 'video' | 'audio' | 'file' | 'link';
  senderId?: string;
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
};

export function authHeaders(json = true): HeadersInit {
  const token = useStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export class WevChatApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'WevChatApiError';
    this.status = status;
    this.code = code;
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const data = await res.json();
      message = data.error || message;
      code = typeof data.code === 'string' ? data.code : undefined;
    } catch {
      /* ignore */
    }
    throw new WevChatApiError(message, res.status, code);
  }
  return res.json();
}

export type WevChatStorageMode = 'WEBSOFT' | 'GOOGLE_DRIVE' | 'HYBRID';

export type WevChatStorageSettings = {
  storageMode: WevChatStorageMode;
  availableModes: WevChatStorageMode[];
  driveConnected: boolean;
  googleEmail: string | null;
  syncStatus: string;
  syncError: string | null;
  lastSyncAt: string | null;
  oauthEnabled: boolean;
};

export const wevchatApi = {

  // --- Phase 1-3 Storage Management APIs ---
  async getGoogleAccounts(): Promise<any[]> {
    return handle(await fetch('/api/wevchat/storage/google/accounts', { headers: authHeaders() }));
  },
  async disconnectGoogleAccount(connectionId: string): Promise<any> {
    return handle(await fetch(`/api/wevchat/storage/google/disconnect/${connectionId}`, {
      method: 'POST',
      headers: authHeaders()
    }));
  },
  async getStorageRules(): Promise<any[]> {
    return handle(await fetch('/api/wevchat/storage/rules', { headers: authHeaders() }));
  },
  async addStorageRule(rule: any): Promise<any> {
    return handle(await fetch('/api/wevchat/storage/rules', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(rule)
    }));
  },
  async deleteStorageRule(ruleId: string): Promise<any> {
    return handle(await fetch(`/api/wevchat/storage/rules/${ruleId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }));
  },
  async getMigrations(): Promise<any[]> {
    return handle(await fetch('/api/wevchat/storage/migrations', { headers: authHeaders() }));
  },
  async startMigration(payload: any): Promise<any> {
    return handle(await fetch('/api/wevchat/storage/migrate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    }));
  },
  
  // existing storage methods (we append inside the wevchatApi object below)


  uploadPublicKey: (publicKey: string) => fetch('/api/wevchat/keys', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ publicKey }) }).then(handle),
  getPublicKey: (userId: string) => fetch(`/api/wevchat/keys/${userId}`, { headers: authHeaders(false) }).then(handle),

  getConversations: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    const qs = params.toString();
    return fetch(`/api/wevchat/conversations${qs ? '?' + qs : ''}`, { headers: authHeaders(false) }).then(handle);
  },

  getMessageRequests: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    const qs = params.toString();
    return fetch(`/api/wevchat/conversations/requests${qs ? '?' + qs : ''}`, { headers: authHeaders(false) }).then(handle);
  },

  acceptMessageRequest: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/requests/accept`, {
      method: 'POST',
      headers: authHeaders(false),
    }).then(handle),

  declineMessageRequest: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/requests/decline`, {
      method: 'POST',
      headers: authHeaders(false),
    }).then(handle),

  getMessages: (conversationId: string, before?: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`, {
      headers: authHeaders(false),
    }).then(handle),

  getOrCreateDirect: (userId: string) =>
    fetch('/api/wevchat/conversations/direct', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ userId }) }).then(handle),

  createGroup: (name: string, userIds: string[]) =>
    fetch('/api/wevchat/groups', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, userIds }) }).then(handle),

  sendMessage: (payload: Record<string, any>) =>
    fetch('/api/wevchat/messages', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) }).then(handle),

  scheduleMessage: (payload: Record<string, any>) =>
    fetch('/api/wevchat/messages/schedule', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) }).then(handle),

  getScheduled: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/scheduled`, { headers: authHeaders(false) }).then(handle),

  updateScheduled: (id: string, payload: { text?: string; scheduledFor?: string }) =>
    fetch(`/api/wevchat/scheduled/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) }).then(handle),

  cancelScheduled: (id: string) =>
    fetch(`/api/wevchat/scheduled/${id}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  sendScheduledNow: (id: string) =>
    fetch(`/api/wevchat/scheduled/${id}/send-now`, { method: 'POST', headers: authHeaders(false) }).then(handle),

  editMessage: (messageId: string, text: string) =>
    fetch(`/api/wevchat/messages/${messageId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ text }) }).then(handle),

  deleteMessage: (messageId: string) =>
    fetch(`/api/wevchat/messages/${messageId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  deleteForMe: (messageId: string) =>
    fetch(`/api/wevchat/messages/${messageId}/delete-for-me`, { method: 'POST', headers: authHeaders(false) }).then(handle),

  pinMessage: (messageId: string) =>
    fetch(`/api/wevchat/messages/${messageId}/pin`, { method: 'PUT', headers: authHeaders(false) }).then(handle),

  reactToMessage: (messageId: string, emoji: string) =>
    fetch(`/api/wevchat/messages/${messageId}/react`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ emoji }) }).then(handle),

  starMessage: (messageId: string) =>
    fetch(`/api/wevchat/messages/${messageId}/star`, { method: 'POST', headers: authHeaders(false) }).then(handle),

  unstarMessage: (messageId: string) =>
    fetch(`/api/wevchat/messages/${messageId}/star`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getStarred: () => fetch('/api/wevchat/starred', { headers: authHeaders(false) }).then(handle),

  reportMessage: (messageId: string, reason: string, description?: string) =>
    fetch(`/api/wevchat/messages/${messageId}/report`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ reason, description }) }).then(handle),

  markRead: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/read`, { method: 'POST', headers: authHeaders(false) }).then(handle),

  muteConversation: (conversationId: string, muted?: boolean, hours?: number) =>
    fetch(`/api/wevchat/conversations/${conversationId}/mute`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ muted, hours }) }).then(handle),

  archiveConversation: (conversationId: string, archived?: boolean) =>
    fetch(`/api/wevchat/conversations/${conversationId}/archive`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ archived }) }).then(handle),

  pinConversation: (conversationId: string, pinned?: boolean) =>
    fetch(`/api/wevchat/conversations/${conversationId}/pin`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ pinned }) }).then(handle),

  setNickname: (conversationId: string, nickname: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/nickname`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ nickname }) }).then(handle),

  deleteConversation: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getConversationMedia: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/media`, { headers: authHeaders(false) }).then(handle),

  getConversationInfo: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/info`, { headers: authHeaders(false) }).then(handle),

  patchConversationSettings: (conversationId: string, payload: Record<string, unknown>) =>
    fetch(`/api/wevchat/conversations/${conversationId}/settings`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload) }).then(handle),

  getMessageOnDate: (conversationId: string, date: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/on-date?date=${encodeURIComponent(date)}`, { headers: authHeaders(false) }).then(handle),

  exportConversation: (conversationId: string, includeAi = true) =>
    fetch(`/api/wevchat/conversations/${conversationId}/export?includeAi=${includeAi ? '1' : '0'}`, { headers: authHeaders(false) }).then(handle),

  search: (q: string, conversationIdOrOptions?: string | WevChatSearchOptions) => {
    const options: WevChatSearchOptions = typeof conversationIdOrOptions === 'string'
      ? { conversationId: conversationIdOrOptions, scope: 'conversation' }
      : (conversationIdOrOptions || {});
    const params = new URLSearchParams({ q });
    Object.entries(options).forEach(([key, value]) => {
      if (key !== 'signal' && value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return fetch(`/api/v1/search?${params.toString()}`, { headers: authHeaders(false), signal: options.signal }).then(handle);
  },

  getPinned: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/pinned`, { headers: authHeaders(false) }).then(handle),

  getStorageSettings: (): Promise<WevChatStorageSettings> =>
    fetch('/api/wevchat/storage/settings', { headers: authHeaders(false) }).then(handle),

  updateStorageSettings: (storageMode: WevChatStorageMode): Promise<WevChatStorageSettings> =>
    fetch('/api/wevchat/storage/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ storageMode }),
    }).then(handle),

  connectGoogleDrive: (): Promise<{ url: string }> =>
    fetch('/api/wevchat/storage/google/connect', { headers: authHeaders(false) }).then(handle),

  disconnectGoogleDrive: (): Promise<WevChatStorageSettings & { ok: boolean }> =>
    fetch('/api/wevchat/storage/google/disconnect', { method: 'POST', headers: authHeaders(false) }).then(handle),

  uploadMedia: (file: File, conversationId?: string) => {
    const token = useStore.getState().token;
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversationId', conversationId);
    return fetch('/api/wevchat/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }).then(handle);
  },

  uploadVoice: (file: File, conversationId?: string) => {
    const token = useStore.getState().token;
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversationId', conversationId);
    return fetch('/api/wevchat/voice/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }).then(handle);
  },

  searchUsers: (q: string) => fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(false) }).then(handle),

  getAllUsers: () => fetch('/api/users', { headers: authHeaders(false) }).then(handle),

  addGroupMembers: (conversationId: string, userIds: string[]) =>
    fetch(`/api/wevchat/groups/${conversationId}/members`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ userIds }) }).then(handle),

  removeGroupMember: (conversationId: string, userId: string) =>
    fetch(`/api/wevchat/groups/${conversationId}/members/${userId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  updateGroup: (conversationId: string, data: { name?: string; photo?: string }) =>
    fetch(`/api/wevchat/groups/${conversationId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  aiAssist: (action: string, text: string, extra?: { targetLanguage?: string; conversationId?: string }) =>
    fetch('/api/wevchat/ai/assist', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ action, text, ...extra }) }).then(handle),

  blockUser: (blockedId: string) =>
    fetch('/api/settings/blocks', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ blockedId }) }).then(handle),

  unblockUser: (blockedId: string) =>
    fetch(`/api/settings/blocks/${blockedId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getPrivateChat: (conversationId: string) =>
    fetch(`/api/wevchat/conversations/${conversationId}/private-chat`, { headers: authHeaders(false) }).then(handle),

  togglePrivateChat: (conversationId: string, enabled: boolean) =>
    fetch(`/api/wevchat/conversations/${conversationId}/private-chat`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled }),
    }).then(handle),
};
