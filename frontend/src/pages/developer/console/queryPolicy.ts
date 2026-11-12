/**
 * React Query policy for the Developer Console (Phase 2 P2-6, amendment A6).
 * - Client errors are final: never retry 4xx (incl. 401/403/404 and 428 step-up), except 408/429.
 * - Other failures (network, 5xx) retry once, as before.
 * - Mutations never retry (set in the QueryClient defaults).
 * Step-up / one-time secret responses come from mutations and stay in component state, never in the cache.
 */
export const MAX_QUERY_RETRIES = 1;

export function errorStatus(error: unknown): number | undefined {
  const e = error as { status?: unknown; response?: { status?: unknown } } | null | undefined;
  const s = e?.response?.status ?? e?.status;
  return typeof s === 'number' ? s : undefined;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = errorStatus(error);
  if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

/** Query keys for console data owned by the developer app shell. */
export const devQueryKeys = {
  all: ['developer'] as const,
  status: () => ['developer', 'status'] as const,
  deletedApps: () => ['developer', 'apps', 'deleted'] as const,
};
