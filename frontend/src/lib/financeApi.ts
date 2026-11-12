import { authHeadersFromStorage } from '@wevsoft/shared/api/client';

export class FinanceApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'FinanceApiError';
    this.status = status;
    this.data = data || null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/finance${path}`, init);
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!res.ok) {
    throw new FinanceApiError(body?.error || `Request failed (${res.status})`, res.status, body);
  }
  return body as T;
}

function get<T>(path: string) {
  return request<T>(path, { headers: authHeadersFromStorage() });
}

function send<T>(method: string, path: string, body?: unknown) {
  return request<T>(path, {
    method,
    headers: authHeadersFromStorage(true),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function qs(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

export const fetchWallets = () => get<any>('/wallets');
export const fetchUnifiedWallet = () => get<any>('/wallets/unified');
export const startDeposit = (body: Record<string, unknown>) => send<any>('POST', '/deposits', body);
export const confirmDepositSandbox = (body: Record<string, unknown>) => send<any>('POST', '/deposits/confirm-sandbox', body);
export const fetchTransactions = (params: Record<string, unknown> = {}) => get<any>(`/transactions${qs(params)}`);
export const fetchStatementUrl = (params: Record<string, unknown> = {}) => `/api/finance/statements${qs(params)}`;
export const fetchStatementPdfUrl = (params: Record<string, unknown> = {}) => `/api/finance/statements${qs({ ...params, format: 'pdf' })}`;
export const trackAnalytics = (body: Record<string, unknown>) => send<any>('POST', '/track', body);
export const previewWithdrawal = (body: Record<string, unknown>) => send<any>('POST', '/withdrawals/preview', body);
export const requestWithdrawal = (body: Record<string, unknown>) => send<any>('POST', '/withdrawals', body);
export const fetchWithdrawals = (params: Record<string, unknown> = {}) => get<any>(`/withdrawals${qs(params)}`);
export const cancelWithdrawal = (id: string) => send<any>('POST', `/withdrawals/${id}/cancel`);
export const fetchPayoutMethods = () => get<any>('/payout-methods');
export const savePayoutMethod = (body: Record<string, unknown>) => send<any>('POST', '/payout-methods', body);
export const fetchInsights = (params: Record<string, unknown> = {}) => get<any>(`/insights${qs(params)}`);
export const fetchMonetization = (params: Record<string, unknown> = {}) => get<any>(`/monetization${qs(params)}`);
export const fetchContentLibrary = (params: Record<string, unknown> = {}) => get<any>(`/content${qs(params)}`);
export const fetchVideoAnalytics = (id: string) => get<any>(`/content/${id}`);
export const patchVideo = (id: string, body: Record<string, unknown>) => send<any>('PATCH', `/content/${id}`, body);
