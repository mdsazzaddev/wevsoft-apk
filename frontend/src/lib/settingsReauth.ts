/**
 * fetch() for Settings actions the server guards with step-up confirmation
 * (common/reauth.ts). Adds confirmPassword / confirmCode to the JSON body when a
 * confirmation is supplied, and rejects with the shape reauthChallengeOf() reads
 * ({ message, data: { code, reauth } }) so useIdentityConfirmation can prompt.
 */
import type { SpaceConfirmation } from './wevspaceApi';

export class SettingsApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'SettingsApiError';
    this.status = status;
    this.data = data;
  }
}

export function withSettingsConfirmation(body: Record<string, unknown> | undefined, confirm?: SpaceConfirmation) {
  const out: Record<string, unknown> = { ...(body || {}) };
  if (confirm?.confirmPassword) out.confirmPassword = confirm.confirmPassword;
  if (confirm?.confirmCode) out.confirmCode = confirm.confirmCode.trim();
  return out;
}

export async function settingsReauthFetch<T = any>(
  url: string,
  init: RequestInit & { jsonBody?: Record<string, unknown> } = {},
  confirm?: SpaceConfirmation,
): Promise<T> {
  const { jsonBody, ...rest } = init;
  const body = withSettingsConfirmation(jsonBody, confirm);
  const res = await fetch(url, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(rest.headers as Record<string, string> | undefined) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new SettingsApiError(data?.error || 'Request failed', res.status, data);
  return data as T;
}

/** Same as settingsReauthFetch but for file downloads (data export): resolves with the blob and server file name. */
export async function settingsReauthBlobFetch(
  url: string,
  init: RequestInit & { jsonBody?: Record<string, unknown> } = {},
  confirm?: SpaceConfirmation,
): Promise<{ blob: Blob; filename: string | null }> {
  const { jsonBody, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(rest.headers as Record<string, string> | undefined) },
    body: JSON.stringify(withSettingsConfirmation(jsonBody, confirm)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    throw new SettingsApiError(data?.error || `Export failed (${res.status})`, res.status, data);
  }
  const filename = /filename=([^;]+)/.exec(res.headers.get('Content-Disposition') || '')?.[1] || null;
  return { blob: await res.blob(), filename };
}
