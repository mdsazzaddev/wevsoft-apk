import React from 'react';
import type { ReelVideoAnalysis } from '../../../lib/reelVideoAnalysis';
import { formatBytes, formatDurationLabel } from '../../../lib/reelVideoAnalysis';

type Props = {
  analysis: ReelVideoAnalysis | null;
  analyzing?: boolean;
  error?: string | null;
};

/** Compact “Video detected” card — keep visually light (master prompt §2). */
export default function ReelVideoInfoCard({ analysis, analyzing, error }: Props) {
  if (analyzing) {
    return (
      <div className="rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Video detected</p>
        <p className="text-sm text-muted-foreground mt-1">Analyzing…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-3.5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Couldn’t analyze</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!analysis) return null;

  const dims =
    analysis.width > 0 && analysis.height > 0
      ? `${analysis.width} × ${analysis.height}`
      : 'Resolution unknown';
  const orient =
    analysis.orientation === 'portrait'
      ? 'Portrait'
      : analysis.orientation === 'landscape'
        ? 'Landscape'
        : 'Square';
  const fps = analysis.fps && analysis.fps > 0 ? `${analysis.fps} FPS` : null;
  const dur = formatDurationLabel(analysis.durationSec);
  const quality = analysis.qualityTier !== 'unknown' ? `${analysis.qualityTier} Quality` : null;

  return (
    <div className="rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Video detected</p>
        <p className="text-[10px] text-muted-foreground truncate">{formatBytes(analysis.fileSize)}</p>
      </div>
      <p className="text-sm font-semibold text-foreground mt-1.5 tabular-nums">{dims}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {analysis.aspectLabel} {orient}
        {fps ? ` · ${fps}` : ''}
        {dur ? ` · ${dur}` : ''}
      </p>
      {quality && <p className="text-xs font-medium text-foreground/80 mt-1">{quality}</p>}
      {analysis.hasAudio === false && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">No audio track detected</p>
      )}
    </div>
  );
}
