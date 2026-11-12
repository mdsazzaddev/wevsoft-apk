import { useStore } from '../store';

const BASE = '/api/v1/wev-enterprise-ai';

function authHeaders(json = true): HeadersInit {
  const token = useStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let body: any = null;
    try {
      body = await res.json();
      message = body?.error || message;
    } catch {
      /* ignore */
    }
    const err: any = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

export interface WevAgentAudienceMember {
  id: string;
  targetUserId: string;
  targetUser?: { id: string; name: string; avatar?: string | null } | null;
}

export interface WevAgent {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  personality?: string | null;
  instructions?: string | null;
  systemPrompt?: string | null;
  status: string;
  audienceType: string;
  aiProvider: string;
  aiModel: string;
  isEnabled: boolean;
  memoryTurnLimit: number;
  summaryEnabled: boolean;
  useOwnerProfile: boolean;
  scheduleEnabled: boolean;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  scheduleDays: string;
  providerConnectionId?: string | null;
  replyDelayMs: number;
  cooldownSeconds: number;
  dailyReplyCap: number;
  createdAt: string;
  updatedAt: string;
  assignedUsers?: WevAgentAudienceMember[];
  memories?: { id: string; content: string; category: string }[];
  tools?: { id: string; toolName: string; isEnabled: boolean }[];
  _count?: { runLogs: number; conversationStates: number };
}

export interface WevAgentConversationStateEntry {
  id: string;
  agentId: string;
  ownerId: string;
  senderId: string;
  summary: string | null;
  turnCount: number;
  lastInboundAt: string | null;
  lastReplyAt: string | null;
  lastSummarizedAt: string | null;
  repliesToday: number;
  repliesTodayDate: string | null;
  contact: { id: string; name: string; avatar?: string | null } | null;
}

export interface WevOwnerProfile {
  fullName: string | null;
  businessName: string | null;
  role: string | null;
  contactInfo: string | null;
  aboutText: string | null;
  faqText: string | null;
}

export interface WevAgentRunLogEntry {
  id: string;
  status: 'SENT' | 'SKIPPED' | 'ERROR';
  skipReason?: string | null;
  errorCode?: string | null;
  provider?: string | null;
  model?: string | null;
  senderId: string;
  createdAt: string;
}

export interface WevProviderConnection {
  id: string;
  providerType: string;
  apiKeyMasked: string;
  baseUrl?: string | null;
  status: string;
  health?: string;
  lastTested?: string | null;
  models: { id: string; modelId: string; name: string; contextWindow?: number }[];
}

/** Admin-configured platform LLM keys (no secrets). Used by Platform Default mode. */
export interface PlatformProviderOption {
  id: string;
  displayName: string;
  providerType: string;
  isDefault: boolean;
  label: string;
  allowedModels: string[];
}

export type WevToolKind =
  | 'WIKIPEDIA'
  | 'DOCUMENTS'
  | 'CUSTOM_TABLE'
  | 'GOOGLE_SHEETS'
  | 'GOOGLE_DOCS'
  | 'GOOGLE_DRIVE'
  | 'WEBHOOK'
  | 'SAVE_RECORDS';

export interface WevGoogleFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface WevIntegrationStatus {
  enabled: Record<string, boolean>;
  googleConfigured: boolean;
}

export type WevRecordStatus = 'NEW' | 'CONFIRMED' | 'DONE' | 'CANCELLED';

export interface WevSavedRecord {
  id: string;
  userId: string;
  toolConnectionId: string;
  agentId: string | null;
  conversationId: string | null;
  contactId: string | null;
  contactName: string | null;
  template: string;
  title: string | null;
  data: string;
  summary: string | null;
  status: WevRecordStatus;
  notes: string | null;
  sheetSyncStatus: string | null;
  sheetSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WevSavedRecordDetail extends WevSavedRecord {
  fields: { key: string; label: string; type: string }[];
  toolLabel: string | null;
  agentName: string | null;
}

export interface WevRecordFilters {
  q?: string;
  status?: WevRecordStatus | '';
  agentId?: string;
  toolId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface WevToolRunEntry {
  id: string;
  agentId: string | null;
  toolConnectionId: string | null;
  toolKind: string;
  functionName: string;
  status: 'SUCCESS' | 'ERROR';
  input: string | null;
  output: string | null;
  errorMessage: string | null;
  latencyMs: number;
  conversationId: string | null;
  createdAt: string;
}

function toQuery(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export interface WevToolConnection {
  id: string;
  userId: string;
  scope: 'USER' | 'AGENT';
  agentId?: string | null;
  kind: WevToolKind;
  label: string;
  config: string;
  status: string;
  oauthCredentialId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number; agentTools: number };
  table?: { id: string; name: string; _count?: { rows: number } } | null;
}

/** Opens Google's consent screen in a new tab for a GOOGLE_SHEETS/GOOGLE_DRIVE tool. Relies on the same-origin auth cookie. */
export function googleOAuthStartUrl(toolId: string): string {
  return `${BASE}/oauth/google/start?toolId=${encodeURIComponent(toolId)}`;
}

export interface WevToolDocument {
  id: string;
  toolId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
  status: 'PENDING' | 'READY' | 'FAILED';
  createdAt: string;
}

export interface WevTableColumn {
  key: string;
  label: string;
  type?: string;
}

export interface WevCustomTableRow {
  id: string;
  tableId: string;
  data: string;
  position: number;
}

export interface WevCustomTable {
  id: string;
  toolId: string;
  name: string;
  columns: string;
  rows: WevCustomTableRow[];
}

export interface WevAgentToolJoin {
  id: string;
  agentId: string;
  toolConnectionId: string | null;
  toolName?: string;
  isEnabled: boolean;
  /** JSON: { useInfo?: boolean, useSave?: boolean } */
  config?: string | null;
  toolConnection?: WevToolConnection | null;
}

export interface WevAgentBuiltinTool {
  id: string;
  toolName: string;
  isEnabled: boolean;
}

export const automationApi = {
  getAgents: (): Promise<WevAgent[]> => fetch(`${BASE}/agents`, { headers: authHeaders(false) }).then(handle),

  getAgent: (id: string): Promise<WevAgent> => fetch(`${BASE}/agents/${id}`, { headers: authHeaders(false) }).then(handle),

  createAgent: (data: Partial<WevAgent> & { name: string; assignedTargetUserIds?: string[] }): Promise<WevAgent> =>
    fetch(`${BASE}/agents`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  updateAgent: (id: string, data: Partial<WevAgent> & { assignedTargetUserIds?: string[] }): Promise<WevAgent> =>
    fetch(`${BASE}/agents/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  deleteAgent: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/agents/${id}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  toggleAgent: (id: string, isEnabled: boolean): Promise<WevAgent> =>
    fetch(`${BASE}/agents/${id}/toggle`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ isEnabled }) }).then(handle),

  getAgentRuns: (id: string, cursor?: string): Promise<{ runs: WevAgentRunLogEntry[]; nextCursor: string | null }> =>
    fetch(`${BASE}/agents/${id}/runs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { headers: authHeaders(false) }).then(handle),

  getProviders: (): Promise<WevProviderConnection[]> => fetch(`${BASE}/providers`, { headers: authHeaders(false) }).then(handle),

  getPlatformProviders: (): Promise<PlatformProviderOption[]> =>
    fetch(`${BASE}/platform-providers`, { headers: authHeaders(false) }).then(handle),

  deleteProvider: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/providers/${id}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  verifyProvider: (id: string): Promise<{ ok: boolean; status?: string }> =>
    fetch(`${BASE}/providers/${id}/verify`, { method: 'POST', headers: authHeaders() }).then(handle),

  syncModels: (id: string): Promise<{ message: string; models: { id: string; modelId: string; name: string }[] }> =>
    fetch(`${BASE}/providers/${id}/sync-models`, { method: 'POST', headers: authHeaders() }).then(handle),

  getTimezone: (): Promise<{ timezone: string }> => fetch(`${BASE}/timezone`, { headers: authHeaders(false) }).then(handle),

  setTimezone: (timezone: string): Promise<{ timezone: string }> =>
    fetch(`${BASE}/timezone`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ timezone }) }).then(handle),

  getAgentStates: (agentId: string): Promise<WevAgentConversationStateEntry[]> =>
    fetch(`${BASE}/agents/${agentId}/states`, { headers: authHeaders(false) }).then(handle),

  resetAgentState: (agentId: string, senderId: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/agents/${agentId}/states/${senderId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getOwnerProfile: (): Promise<WevOwnerProfile> => fetch(`${BASE}/owner-profile`, { headers: authHeaders(false) }).then(handle),

  updateOwnerProfile: (data: Partial<WevOwnerProfile>): Promise<WevOwnerProfile> =>
    fetch(`${BASE}/owner-profile`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  getTools: (): Promise<WevToolConnection[]> => fetch(`${BASE}/tools`, { headers: authHeaders(false) }).then(handle),

  createTool: (data: { kind: WevToolKind; label: string; scope?: 'USER' | 'AGENT'; agentId?: string; config?: any }): Promise<WevToolConnection & { table?: WevCustomTable }> =>
    fetch(`${BASE}/tools`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  updateTool: (id: string, data: { label?: string; config?: any; status?: string }): Promise<WevToolConnection> =>
    fetch(`${BASE}/tools/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  deleteTool: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/tools/${id}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getToolDocuments: (toolId: string): Promise<WevToolDocument[]> =>
    fetch(`${BASE}/tools/${toolId}/documents`, { headers: authHeaders(false) }).then(handle),

  uploadToolDocument: (toolId: string, file: File): Promise<WevToolDocument> => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/tools/${toolId}/documents`, { method: 'POST', headers: authHeaders(false), body: form }).then(handle);
  },

  deleteToolDocument: (toolId: string, docId: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/tools/${toolId}/documents/${docId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getToolTable: (toolId: string): Promise<WevCustomTable> => fetch(`${BASE}/tools/${toolId}/table`, { headers: authHeaders(false) }).then(handle),

  updateToolTable: (toolId: string, data: { name?: string; columns?: WevTableColumn[] }): Promise<WevCustomTable> =>
    fetch(`${BASE}/tools/${toolId}/table`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  addTableRow: (toolId: string, data: Record<string, any>): Promise<WevCustomTableRow> =>
    fetch(`${BASE}/tools/${toolId}/table/rows`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ data }) }).then(handle),

  updateTableRow: (toolId: string, rowId: string, data: Record<string, any>): Promise<WevCustomTableRow> =>
    fetch(`${BASE}/tools/${toolId}/table/rows/${rowId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ data }) }).then(handle),

  deleteTableRow: (toolId: string, rowId: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/tools/${toolId}/table/rows/${rowId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  getAgentTools: (agentId: string): Promise<{ attached: WevAgentToolJoin[]; own: WevToolConnection[]; builtins: WevAgentBuiltinTool[] }> =>
    fetch(`${BASE}/agents/${agentId}/tools`, { headers: authHeaders(false) }).then(handle),

  attachAgentTool: (agentId: string, toolConnectionId: string): Promise<WevAgentToolJoin> =>
    fetch(`${BASE}/agents/${agentId}/tools`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ toolConnectionId }) }).then(handle),

  setAgentBuiltinTool: (
    agentId: string,
    toolName: string,
    isEnabled: boolean
  ): Promise<WevAgentBuiltinTool & { attached?: WevAgentToolJoin | null }> =>
    fetch(`${BASE}/agents/${agentId}/builtin-tools`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ toolName, isEnabled }),
    }).then(handle),

  detachAgentTool: (agentId: string, agentToolId: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/agents/${agentId}/tools/${agentToolId}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  updateAgentTool: (
    agentId: string,
    agentToolId: string,
    data: { useInfo?: boolean; useSave?: boolean; isEnabled?: boolean }
  ): Promise<WevAgentToolJoin> =>
    fetch(`${BASE}/agents/${agentId}/tools/${agentToolId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handle),

  // --- Integrations / Google pickers -------------------------------------
  getIntegrations: (): Promise<WevIntegrationStatus> => fetch(`${BASE}/integrations`, { headers: authHeaders(false) }).then(handle),

  listGoogleFiles: (toolId: string, type: 'sheets' | 'docs', q?: string): Promise<WevGoogleFile[]> =>
    fetch(`${BASE}/tools/${toolId}/google/files${toQuery({ type, q })}`, { headers: authHeaders(false) }).then(handle),

  getSheetTabs: (toolId: string, spreadsheetId: string): Promise<{ title: string; tabs: { title: string; rows?: number; columns?: number }[] }> =>
    fetch(`${BASE}/tools/${toolId}/google/sheet-tabs${toQuery({ spreadsheetId })}`, { headers: authHeaders(false) }).then(handle),

  disconnectGoogle: (toolId: string): Promise<WevToolConnection> =>
    fetch(`${BASE}/tools/${toolId}/oauth/disconnect`, { method: 'POST', headers: authHeaders() }).then(handle),

  // --- Saved records ------------------------------------------------------
  getRecords: (
    filters: WevRecordFilters = {}
  ): Promise<{ items: WevSavedRecord[]; total: number; page: number; pageSize: number; counts: Record<string, number> }> =>
    fetch(`${BASE}/records${toQuery(filters)}`, { headers: authHeaders(false) }).then(handle),

  getRecord: (id: string): Promise<WevSavedRecordDetail> => fetch(`${BASE}/records/${id}`, { headers: authHeaders(false) }).then(handle),

  updateRecord: (id: string, data: { status?: WevRecordStatus; notes?: string; title?: string; data?: Record<string, any> }): Promise<WevSavedRecord> =>
    fetch(`${BASE}/records/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  deleteRecord: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/records/${id}`, { method: 'DELETE', headers: authHeaders(false) }).then(handle),

  /** Downloads the filtered records as CSV or Excel (auth header, so fetched as a blob). */
  exportRecords: async (format: 'csv' | 'xlsx', filters: WevRecordFilters = {}): Promise<void> => {
    const { page: _p, pageSize: _ps, ...rest } = filters;
    const res = await fetch(`${BASE}/records/export${toQuery({ ...rest, format })}`, { headers: authHeaders(false) });
    if (!res.ok) await handle(res);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  // --- Tool run audit log -------------------------------------------------
  getToolRuns: (params: { agentId?: string; toolId?: string; status?: string; cursor?: string; limit?: number } = {}): Promise<{
    items: WevToolRunEntry[];
    nextCursor: string | null;
  }> => fetch(`${BASE}/tool-runs${toQuery(params)}`, { headers: authHeaders(false) }).then(handle),
};
