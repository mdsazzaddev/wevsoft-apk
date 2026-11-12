import React from 'react';
import type { CreatorPublishSettings } from '../../../lib/creatorPublish';
import {
  estimateUploadBytes,
  formatBytes,
  qualityOptionsForSource,
  type ReelVideoAnalysis,
} from '../../../lib/reelVideoAnalysis';
import { FieldLabel } from '../../creator/CreatorPublishSteps';

type Props = {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
  analysis: ReelVideoAnalysis | null;
};

/**
 * Source-aware upload quality — never offers upscaling beyond the source.
 * Writes the same uploadQuality enum used by ContentPublishSettings.
 */
export default function ReelQualitySelector({ value, onChange, analysis }: Props) {
  const options = qualityOptionsForSource(analysis);
  const sourceLabel = analysis?.qualityTier && analysis.qualityTier !== 'unknown'
    ? `Source: ${analysis.qualityTier}`
    : analysis
      ? `Source: ${analysis.width}×${analysis.height}`
      : null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel>Upload Quality</FieldLabel>
        {sourceLabel && <span className="text-[10px] font-semibold text-muted-foreground">{sourceLabel}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((q) => {
          const selected = value.uploadQuality === q.value;
          const est = analysis ? estimateUploadBytes(analysis.fileSize, q.sizeFactor) : 0;
          return (
            <button
              key={q.value}
              type="button"
              onClick={() => onChange({ ...value, uploadQuality: q.value })}
              className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                selected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
            >
              <p className="text-xs font-bold">{q.label}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{q.hint}</p>
              {est > 0 && (
                <p className="text-[10px] mt-1 opacity-70">
                  ~{formatBytes(est)}
                  {q.sizeFactor >= 0.99 ? ' · best quality' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Estimated sizes are approximate. Exact size depends on encoding after upload.
      </p>
    </div>
  );
}
