import React from 'react';

type Metric =
  | { available: true; value: number; unit?: string }
  | { available: false; reason: string };

export function GearRadial({
  label,
  metric,
  summary,
}: {
  label: string;
  metric: Metric | undefined;
  summary?: string;
}) {
  const available = metric?.available === true;
  const pct = available ? Math.max(0, Math.min(100, Number(metric.value) || 0)) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const text = available
    ? `${pct.toFixed(pct >= 10 ? 0 : 1)}${metric.unit === 'percent' || !metric.unit ? '%' : ` ${metric.unit}`}`
    : 'n/a';
  return (
    <figure className="flex flex-col items-center gap-2 p-4 rounded-3xl border border-border bg-card/60">
      <svg viewBox="0 0 108 108" className="w-28 h-28" role="img" aria-label={`${label}: ${available ? text : 'insufficient data'}`}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="10" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 54 54)"
        />
        <text x="54" y="58" textAnchor="middle" className="fill-foreground text-[18px] font-black">
          {text}
        </text>
      </svg>
      <figcaption className="text-center">
        <div className="text-sm font-semibold">{label}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {available ? summary || `${label} is ${text}` : 'Insufficient data'}
        </p>
      </figcaption>
    </figure>
  );
}

export function KpiCard({
  label,
  metric,
  hint,
}: {
  label: string;
  metric: Metric | undefined;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black">
        {metric?.available ? (
          <>
            {metric.unit === 'BDT' ? '৳' : ''}
            {Number(metric.value).toLocaleString()}
            {metric.unit && metric.unit !== 'BDT' && metric.unit !== 'percent' ? ` ${metric.unit}` : ''}
            {metric.unit === 'percent' ? '%' : ''}
          </>
        ) : (
          <span className="text-muted-foreground text-base font-medium">Unavailable</span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
