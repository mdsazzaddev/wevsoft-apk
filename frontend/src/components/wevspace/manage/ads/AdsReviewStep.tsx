import React from 'react';
import { AD_CTAS, AD_FORMATS, BILLING_MODELS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@wevsoft/shared/wevspace';
import { ActionButton } from '../manageUi';

export interface AdsReviewModel {
  name: string;
  objective: string;
  format: string;
  billingModel: string;
  dailyBudget: number;
  totalBudget: number;
  durationDays: number;
  currency: string;
  cta: string;
  destinationUrl?: string | null;
  status?: CampaignStatus | null;
  hasAbVariants?: boolean;
}

export default function AdsReviewStep({
  model,
  accent,
  busy,
  canManage,
  errors,
  onBack,
  onSaveDraft,
  onSubmit,
}: {
  model: AdsReviewModel;
  accent?: string;
  busy?: boolean;
  canManage: boolean;
  errors: string[];
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const objective = CAMPAIGN_OBJECTIVES.find((item) => item.id === model.objective)?.label || model.objective;
  const format = AD_FORMATS.find((item) => item.id === model.format)?.label || model.format;
  const billing = BILLING_MODELS.find((item) => item.id === model.billingModel)?.label || model.billingModel;
  const cta = AD_CTAS.find((item) => item.id === model.cta)?.label || model.cta;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-4 space-y-2 text-sm">
        <Row label="Campaign" value={model.name || 'Untitled'} />
        <Row label="Goal" value={objective} />
        <Row label="Format" value={format} />
        <Row label="Billing" value={billing} />
        <Row label="Daily budget" value={`${model.dailyBudget} ${model.currency}`} />
        <Row label="Total budget" value={`${model.totalBudget} ${model.currency}`} />
        <Row label="Duration" value={`${model.durationDays} days`} />
        <Row label="Call to action" value={cta} />
        {model.destinationUrl ? <Row label="Destination" value={model.destinationUrl} /> : null}
        {model.status ? <Row label="Status" value={CAMPAIGN_STATUS_LABELS[model.status]} /> : null}
        {model.hasAbVariants ? (
          <Row label="A/B test" value="Insufficient data until variants each reach the impression threshold." />
        ) : null}
      </div>
      <p className="text-[11px] font-semibold text-muted-foreground">
        Submitting sends this to Wevsoft review. It will not start running, and nothing is charged, until a reviewer
        approves it.
      </p>
      {errors.length > 0 && (
        <ul className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 space-y-1">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onBack} disabled={busy}>
            Back
          </ActionButton>
          <ActionButton onClick={onSaveDraft} busy={busy} disabled={busy}>
            Save draft
          </ActionButton>
          <ActionButton tone="accent" accent={accent} onClick={onSubmit} busy={busy} disabled={busy}>
            Submit for review
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}
