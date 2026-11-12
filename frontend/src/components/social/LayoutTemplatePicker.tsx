import React from 'react';
import {
  LAYOUT_TEMPLATE_META,
  layoutsForPhotoCount,
  type PostLayoutTemplate,
} from '@wevsoft/shared/post-media-layout';

interface LayoutTemplatePickerProps {
  photoCount: number;
  value: PostLayoutTemplate | null;
  onChange: (template: PostLayoutTemplate) => void;
  /** Optional preview URLs (object URLs or remote) — first N used in thumbnails. */
  previewUrls?: string[];
  className?: string;
  /** Compact horizontal strip under the media thumbnails. */
  compact?: boolean;
}

function PreviewThumb({
  templateId,
  previewUrls,
}: {
  templateId: PostLayoutTemplate;
  previewUrls: string[];
}) {
  const urls = previewUrls.filter(Boolean);
  const slot = (i: number) =>
    urls[i] ? (
      <img src={urls[i]} alt="" className="h-full w-full object-cover" />
    ) : (
      <div className="h-full w-full bg-muted/80" />
    );
  const box = (i: number, className = '') => (
    <div key={i} className={`overflow-hidden rounded-[2px] ${className}`}>
      {slot(i)}
    </div>
  );

  switch (templateId) {
    case 'split_2':
      return <div className="grid h-full w-full grid-cols-2 gap-0.5">{box(0)}{box(1)}</div>;
    case 'main_2side':
      return (
        <div className="grid h-full w-full grid-cols-3 gap-0.5">
          {box(0, 'col-span-2')}
          <div className="grid grid-rows-2 gap-0.5">
            {box(1)}
            {box(2)}
          </div>
        </div>
      );
    case 'grid_4':
    case 'windowpane':
      return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          {[0, 1, 2, 3].map((i) => box(i))}
        </div>
      );
    case 'column':
      // Same clean photo style as other templates — staggered vertical columns.
      return (
        <div className="flex h-full w-full items-end gap-0.5">
          <div className="h-[72%] min-w-0 flex-1 overflow-hidden rounded-[2px]">{slot(0)}</div>
          <div className="h-[96%] min-w-0 flex-1 overflow-hidden rounded-[2px]">{slot(1)}</div>
          <div className="h-[72%] min-w-0 flex-1 overflow-hidden rounded-[2px]">{slot(2)}</div>
        </div>
      );
    case 'row':
      return (
        <div className="flex h-full w-full flex-row gap-0.5">
          {[0, 1, 2, 3].map((i) => box(i, 'min-w-0 flex-1'))}
        </div>
      );
    case 'frame':
      return (
        <div className="relative h-full w-full overflow-hidden rounded-[2px] ring-1 ring-border">
          <div className="absolute inset-[14%] z-[1] overflow-hidden rounded-[1px]">{slot(0)}</div>
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-90">
            {[1, 2, 3, 1, null, 2, 3, 1, 2].map((i, idx) =>
              i == null ? <div key={idx} /> : <div key={idx} className="overflow-hidden">{slot(i)}</div>,
            )}
          </div>
        </div>
      );
    case 'feature_stick':
      return (
        <div className="relative h-full w-full overflow-hidden rounded-[2px] bg-muted/40">
          <div className="absolute bottom-0.5 left-0.5 top-0.5 z-[1] w-[62%] overflow-hidden rounded-[2px] shadow-sm">
            {slot(0)}
          </div>
          <div className="absolute right-1 top-1 z-[2] h-[42%] w-[38%] rotate-3 overflow-hidden rounded-[2px] border border-white/80 shadow">
            {slot(1)}
          </div>
          <div className="absolute bottom-1 right-0.5 z-[2] h-[40%] w-[36%] -rotate-2 overflow-hidden rounded-[2px] border border-white/80 shadow">
            {slot(2)}
          </div>
        </div>
      );
    case 'mosaic':
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5">
          {box(0, 'col-span-2 row-span-2')}
          {box(1)}
          {box(2)}
          {box(3, 'col-span-2')}
          {box(4)}
        </div>
      );
    case 'triptych':
      return (
        <div className="flex h-full w-full flex-col gap-0.5">
          {[0, 1, 2].map((i) => box(i, 'min-h-0 flex-1'))}
        </div>
      );
    case 'hero_strip':
      return (
        <div className="grid h-full w-full grid-rows-[2fr_1fr] gap-0.5">
          {box(0)}
          <div className="grid grid-cols-3 gap-0.5">{[1, 2, 3].map((i) => box(i))}</div>
        </div>
      );
    case 'l_shape':
      return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          {box(0, 'row-span-2')}
          {box(1)}
          {box(2)}
        </div>
      );
    case 'magazine':
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-0.5">
          {box(0, 'col-span-2 row-span-2')}
          {box(1)}
          {box(2)}
        </div>
      );
    case 'brick':
      return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-0.5">
          {box(0, 'row-span-2')}
          {box(1)}
          {box(2)}
          {box(3)}
          {box(4)}
        </div>
      );
    case 'spotlight':
      return (
        <div className="grid h-full w-full grid-cols-3 gap-0.5">
          {box(0)}
          {box(1, 'scale-105 ring-1 ring-background')}
          {box(2)}
        </div>
      );
    case 'banner_duo':
      return (
        <div className="grid h-full w-full grid-rows-2 gap-0.5">
          {box(0)}
          <div className="grid grid-cols-2 gap-0.5">{box(1)}{box(2)}</div>
        </div>
      );
    case 'quad_hero':
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5">
          {box(0, 'col-span-2 row-span-3')}
          {box(1)}
          {box(2)}
          {box(3)}
        </div>
      );
    case 'waterfall':
      return (
        <div className="grid h-full w-full grid-cols-2 gap-0.5">
          <div className="flex flex-col gap-0.5">{box(0, 'flex-[1.3]')}{box(2, 'flex-1')}</div>
          <div className="flex flex-col gap-0.5 pt-2">{box(1, 'flex-1')}{box(3, 'flex-[1.3]')}</div>
        </div>
      );
    case 'diagonal':
    case 'cluster':
      return (
        <div className="relative h-full w-full overflow-hidden bg-muted/30">
          <div className="absolute left-[6%] top-[8%] h-[55%] w-[48%] -rotate-2 overflow-hidden rounded-[2px] shadow">{slot(0)}</div>
          <div className="absolute right-[6%] top-[14%] h-[48%] w-[44%] rotate-3 overflow-hidden rounded-[2px] shadow">{slot(1)}</div>
          <div className="absolute bottom-[8%] left-[18%] h-[38%] w-[42%] rotate-1 overflow-hidden rounded-[2px] shadow">{slot(2)}</div>
        </div>
      );
    case 'captain':
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5">
          {[0, 1, 2, 3, 0, 4, 1, 2, 3].map((i, idx) => box(i, idx === 4 ? 'scale-105 ring-1 ring-background' : ''))}
        </div>
      );
    case 'carousel':
    default:
      return (
        <div className="relative h-full w-full overflow-hidden rounded-[2px]">
          {slot(0)}
          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
      );
  }
}

/**
 * Shown after 2+ photos are added. Visual thumbnails of each layout option.
 */
export default function LayoutTemplatePicker({
  photoCount,
  value,
  onChange,
  previewUrls = [],
  className,
  compact = false,
}: LayoutTemplatePickerProps) {
  const options = layoutsForPhotoCount(photoCount);
  if (options.length === 0) return null;

  const meta = LAYOUT_TEMPLATE_META.filter((m) => options.includes(m.id));

  if (compact) {
    return (
      <div className={className ?? 'mt-2'}>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {meta.map((item) => {
            const selected = value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`group flex w-[72px] shrink-0 flex-col gap-1 rounded-lg border p-1 text-left transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                    : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
                }`}
                aria-pressed={selected}
                title={item.label}
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border/60 bg-background">
                  <PreviewThumb templateId={item.id} previewUrls={previewUrls} />
                </div>
                <span
                  className={`truncate px-0.5 text-[9px] font-bold leading-none ${
                    selected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? 'mx-4 mt-2 mb-1'}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Layout
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {meta.map((item) => {
          const selected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`group flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                  : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
              }`}
              aria-pressed={selected}
              title={item.label}
            >
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/60 bg-background">
                <PreviewThumb templateId={item.id} previewUrls={previewUrls} />
              </div>
              <span
                className={`px-0.5 text-[10px] font-bold ${
                  selected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
