import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';

/** fetch helper for the developer-platform endpoints (the shared `api` helper has no PATCH). */
export async function pf<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
  const token = useStore.getState().token;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const e = data?.error;
    const message = typeof e === 'string' ? e : e?.message || data?.message || `Request failed (${res.status})`;
    const err: any = new Error(message);
    err.status = res.status;
    err.traceId = data?.traceId || e?.traceId;
    throw err;
  }
  return data as T;
}

export function usePfQuery<T = any>(key: QueryKey, url: string | null, opts: { refetchInterval?: number } = {}) {
  return useQuery<T>({
    queryKey: ['developerPlatform', ...key],
    queryFn: () => pf<T>('GET', url as string),
    enabled: !!url,
    retry: 0,
    ...opts,
  });
}

export function usePfMutation<TVars = any, TOut = any>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  urlFor: (v: TVars) => string,
  opts: { invalidate?: QueryKey[]; success?: string | ((out: TOut) => string); bodyFor?: (v: TVars) => unknown; onDone?: (out: TOut) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation<TOut, Error, TVars>({
    mutationFn: (v) => pf<TOut>(method, urlFor(v), opts.bodyFor ? opts.bodyFor(v) : method === 'DELETE' ? undefined : v),
    onSuccess: (out) => {
      for (const k of opts.invalidate || []) qc.invalidateQueries({ queryKey: ['developerPlatform', ...k] });
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(out) : opts.success);
      opts.onDone?.(out);
    },
    onError: (e: any) => toast.error(e?.message || 'Something went wrong'),
  });
}
