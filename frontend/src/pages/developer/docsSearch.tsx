// W5: docs search over the public OpenAPI operation index. Results open the API Explorer.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface OperationHit {
  method: string;
  path: string;
  operationId: string;
  summary: string;
  tags: string[];
  deprecated: boolean;
}
interface OperationSearchResponse { versions: string[]; total: number; results: OperationHit[] }

export function explorerHref(op: Pick<OperationHit, 'method' | 'path'> & { operationId?: string }): string {
  const p = new URLSearchParams({ method: op.method, path: `/api${op.path}` });
  if (op.operationId) p.set('op', op.operationId);
  return `/developer/api-explorer?${p.toString()}`;
}

export function useOperationSearch(q: string, limit = 8) {
  const [term, setTerm] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);
  return useQuery<OperationSearchResponse>({
    queryKey: ['openapi-operations', term, limit],
    enabled: term.length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get(`/api/developer/openapi/operations?q=${encodeURIComponent(term)}&limit=${limit}`);
      return res.data as OperationSearchResponse;
    },
  });
}

export function OperationSearchBox() {
  const [q, setQ] = useState('');
  const { data, isFetching } = useOperationSearch(q, 10);
  const versions = data?.versions || [];
  return (
    <div data-testid="docs-op-search" className="mb-8 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search API endpoints (e.g. posts, spaces, webhook)"
          aria-label="Search API endpoints"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {/* D6: only show a version picker when more than one version exists. */}
        {versions.length > 1 && (
          <select aria-label="API version" className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
            {versions.map((v) => <option key={v}>{v}</option>)}
          </select>
        )}
      </div>
      {q.trim().length >= 2 && (
        <ul className="mt-3 space-y-1">
          {isFetching && !data && <li className="text-xs text-muted-foreground">Searching...</li>}
          {data && data.results.length === 0 && <li className="text-xs text-muted-foreground">No endpoints match.</li>}
          {data?.results.map((op) => (
            <li key={`${op.method} ${op.path}`}>
              <Link to={explorerHref(op)} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                <span className="w-14 shrink-0 font-mono text-xs font-semibold">{op.method}</span>
                <span className="truncate font-mono text-xs">{op.path}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{op.deprecated ? 'Deprecated - ' : ''}{op.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}