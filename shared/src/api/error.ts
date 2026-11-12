/** Shared API error shapes — backward compatible with legacy `{ error: string }`. */

export type ApiErrorBody = {
  error: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

export function parseApiErrorMessage(data: unknown, fallback = 'Request failed'): string {
  if (!data || typeof data !== 'object') return fallback;
  const body = data as ApiErrorBody;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  return fallback;
}

export function apiErrorBody(
  message: string,
  code?: string,
  extra?: Record<string, unknown>,
): ApiErrorBody {
  return {
    error: message,
    ...(code ? { code } : {}),
    ...(extra || {}),
  };
}
