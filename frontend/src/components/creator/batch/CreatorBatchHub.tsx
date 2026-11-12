/**
 * Creator Hub → Batch (Space mode only).
 * Panes: Upload / History / Facebook Cleanup / ADU (auto-import placeholder).
 */
import { lazy, Suspense, useMemo } from 'react';
import { FolderInput, History, Layers, Trash2 } from 'lucide-react';
import { HubPageHeader } from '../hub/HubUI';
import { useCreatorSpace } from '../../../lib/creatorSpaceContext';
import { BATCH_CREATE_PATH, BATCH_HISTORY_PATH } from '../../../lib/batchStudio';

const ContentBatchCreate = lazy(() => import('../../contentAnalyze/ContentBatchCreate'));
const ContentBatchQueue = lazy(() => import('../../contentAnalyze/ContentBatchQueue'));
const FacebookCleanupPanel = lazy(() => import('./FacebookCleanupPanel'));

export type BatchHubPane = 'upload' | 'history' | 'cleanup' | 'adu';

const PANES: { id: BatchHubPane; label: string; icon: typeof Layers; blurb: string }[] = [
  { id: 'upload', label: 'Upload', icon: Layers, blurb: 'Create and schedule many posts for this Space' },
  { id: 'history', label: 'History', icon: History, blurb: 'Queued, scheduled, and published deliveries' },
  { id: 'cleanup', label: 'Cleanup', icon: Trash2, blurb: 'Bulk-delete posts from a Facebook Page' },
  { id: 'adu', label: 'ADU', icon: FolderInput, blurb: 'Auto-import watches into the Space batch queue' },
];

export function resolveBatchHubPane(raw: string | null | undefined): BatchHubPane {
  if (raw === 'history' || raw === 'cleanup' || raw === 'adu' || raw === 'upload') return raw;
  return 'upload';
}

function AduPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-12 text-center">
      <FolderInput className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">ADU auto-import</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted-foreground">
        Watch public media URLs and enqueue them into this Space’s Batch queue. Coming next after Facebook Cleanup and native schedule.
      </p>
    </div>
  );
}

export default function CreatorBatchHub({
  pane: rawPane,
  onPaneChange,
}: {
  pane?: string | null;
  onPaneChange: (pane: BatchHubPane) => void;
}) {
  const { spaceName } = useCreatorSpace();
  const pane = resolveBatchHubPane(rawPane);
  const active = useMemo(() => PANES.find((p) => p.id === pane) || PANES[0], [pane]);

  return (
    <div className="space-y-4">
      <HubPageHeader
        title="Batch"
        description={spaceName ? `Publish and clean up as ${spaceName}` : 'Space batch tools — upload, history, Facebook cleanup'}
      />

      <div className="flex flex-wrap gap-1.5">
        {PANES.map((p) => {
          const Icon = p.icon;
          const on = p.id === pane;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPaneChange(p.id)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition ${
                on ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={p.blurb}
            >
              <Icon className="h-3.5 w-3.5" />
              {p.label}
            </button>
          );
        })}
        {(pane === 'upload' || pane === 'history') && (
          <a
            href={pane === 'history' ? BATCH_HISTORY_PATH : BATCH_CREATE_PATH}
            className="ml-auto inline-flex h-8 items-center rounded-full border border-border px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Open fullscreen
          </a>
        )}
      </div>

      <p className="text-[12.5px] text-muted-foreground">{active.blurb}</p>

      <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
        {pane === 'upload' && <ContentBatchCreate />}
        {pane === 'history' && <ContentBatchQueue />}
        {pane === 'cleanup' && <FacebookCleanupPanel />}
        {pane === 'adu' && <AduPlaceholder />}
      </Suspense>
    </div>
  );
}
