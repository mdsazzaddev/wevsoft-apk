/**
 * Batch Upload lives in Business Suite:
 *   /business/batch           — create / edit
 *   /business/batch/history   — scheduled & history
 *
 * Main-app `/studio/content?view=batch-*` redirects there.
 */
import { getBusinessAppUrl } from './businessAppUrl';

export const BATCH_CREATE_PATH = '/business/batch';
export const BATCH_HISTORY_PATH = '/business/batch/history';
export const BATCH_STUDIO_VIEWS = ['batch-create', 'batch-queue'] as const;
export type BatchStudioView = (typeof BATCH_STUDIO_VIEWS)[number];

export function isBatchCreatePath(pathname: string): boolean {
  return pathname === BATCH_CREATE_PATH || pathname === `${BATCH_CREATE_PATH}/`;
}

export function isBatchHistoryPath(pathname: string): boolean {
  return pathname === BATCH_HISTORY_PATH || pathname.startsWith(`${BATCH_HISTORY_PATH}/`);
}

/** True for Business Batch Upload routes (fullscreen shell). */
export function isBatchStudioPath(pathname: string, _search = ''): boolean {
  return isBatchCreatePath(pathname) || isBatchHistoryPath(pathname)
    || pathname === '/studio/content' || pathname.startsWith('/studio/content/');
}

export function batchCreatePath(opts?: { id?: string | null; date?: string | null; new?: string | null }): string {
  const q = new URLSearchParams();
  if (opts?.id) q.set('id', opts.id);
  if (opts?.date) q.set('date', opts.date);
  if (opts?.new && !opts?.id) q.set('new', opts.new);
  const qs = q.toString();
  return qs ? `${BATCH_CREATE_PATH}?${qs}` : BATCH_CREATE_PATH;
}

export function batchHistoryPath(): string {
  return BATCH_HISTORY_PATH;
}

export function batchCreateAppUrl(opts?: { id?: string | null; date?: string | null; new?: string | null }): string {
  return getBusinessAppUrl(batchCreatePath(opts));
}

export function batchHistoryAppUrl(): string {
  return getBusinessAppUrl(BATCH_HISTORY_PATH);
}

/** Map legacy `/studio/content?view=batch-*` onto Business Batch paths. */
export function legacyBatchRedirectPath(search = ''): string {
  const view = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('view');
  if (view === 'batch-queue') return BATCH_HISTORY_PATH;
  return BATCH_CREATE_PATH;
}
