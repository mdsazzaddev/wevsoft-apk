import { buildFilterCss, EFFECT_TEMPLATES, FILTER_PRESETS, type EffectTemplate } from '../storyStudio/model/filters';
import type { Adjust, Effects } from '../storyStudio/model/types';
import { DEFAULT_ADJUST, DEFAULT_EFFECTS } from '../storyStudio/model/types';

export interface CaptureLook {
  filterId: string;
  filterIntensity: number;
  effects: Effects;
  adjust: Adjust;
  templateId?: string;
}

export const DEFAULT_CAPTURE_LOOK: CaptureLook = {
  filterId: 'none',
  filterIntensity: 100,
  effects: { ...DEFAULT_EFFECTS },
  adjust: { ...DEFAULT_ADJUST },
};

export function lookToCssFilter(look: CaptureLook): string {
  return buildFilterCss({
    filterId: look.filterId,
    filterIntensity: look.filterIntensity,
    adjust: look.adjust,
  });
}

export function applyEffectTemplate(t: EffectTemplate): CaptureLook {
  return {
    filterId: t.filterId || 'none',
    filterIntensity: t.filterIntensity ?? 100,
    effects: { ...DEFAULT_EFFECTS, ...(t.effects || {}) },
    adjust: { ...DEFAULT_ADJUST, ...(t.adjust || {}) },
    templateId: t.id,
  };
}

function FilterThumb({
  active,
  label,
  previewSrc,
  cssFilter,
  fallback,
  mirrored,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  previewSrc?: string | null;
  cssFilter: string;
  fallback: string;
  mirrored?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden rounded-full border-2 shadow-lg transition-transform ${
        active ? 'h-[72px] w-[72px] border-white scale-110' : 'h-[56px] w-[56px] border-white/30 opacity-95'
      }`}
      style={{ background: fallback }}
    >
      {previewSrc ? (
        <img
          src={previewSrc}
          alt=""
          className="h-full w-full object-cover"
          style={{
            filter: cssFilter === 'none' ? undefined : cssFilter,
            transform: mirrored ? 'scaleX(-1)' : undefined,
          }}
        />
      ) : null}
    </button>
  );
}

/** Phone-camera style circular filter wheel — each chip shows a photo preview with that look. */
export function CircularFilterCarousel({
  look,
  onChange,
  previewSrc,
  mirrored,
}: {
  look: CaptureLook;
  onChange: (look: CaptureLook) => void;
  /** Live camera / gallery snapshot for filter chips. */
  previewSrc?: string | null;
  mirrored?: boolean;
}) {
  const activeLabel =
    EFFECT_TEMPLATES.find((t) => t.id === look.templateId)?.label ||
    FILTER_PRESETS.find((p) => p.id === look.filterId)?.label ||
    'Original';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex max-w-full items-end gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_PRESETS.map((p) => {
          const active = look.filterId === p.id && !look.templateId;
          const chipLook: CaptureLook = {
            ...DEFAULT_CAPTURE_LOOK,
            filterId: p.id,
            filterIntensity: 100,
          };
          return (
            <FilterThumb
              key={p.id}
              testId={`ig-cam-filter-${p.id}`}
              label={p.label}
              active={active}
              previewSrc={previewSrc}
              cssFilter={lookToCssFilter(chipLook)}
              fallback={p.swatch || '#444'}
              mirrored={mirrored}
              onClick={() =>
                onChange({
                  ...look,
                  filterId: p.id,
                  filterIntensity: 100,
                  templateId: undefined,
                })
              }
            />
          );
        })}
        {EFFECT_TEMPLATES.filter((t) => t.id !== 'clear').map((t) => {
          const active = look.templateId === t.id;
          const chipLook = applyEffectTemplate(t);
          return (
            <FilterThumb
              key={`t-${t.id}`}
              testId={`ig-cam-template-${t.id}`}
              label={t.label}
              active={active}
              previewSrc={previewSrc}
              cssFilter={lookToCssFilter(chipLook)}
              fallback={t.swatch}
              mirrored={mirrored}
              onClick={() => onChange(chipLook)}
            />
          );
        })}
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/15">
        <SparklesIcon />
        <span className="text-[13px] font-semibold tracking-wide text-white">{activeLabel}</span>
        {look.filterId !== 'none' || look.templateId ? (
          <button
            type="button"
            aria-label="Clear look"
            className="ml-0.5 rounded-full p-0.5 text-white/70 hover:text-white"
            onClick={() => onChange(DEFAULT_CAPTURE_LOOK)}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3L12 3z"
        fill="currentColor"
        className="text-amber-300"
      />
    </svg>
  );
}

/** Colourful filter + effect template strip for edit tray (photo thumbs when previewSrc set). */
export function CaptureLooksStrip({
  look,
  onChange,
  mode = 'both',
  previewSrc,
}: {
  look: CaptureLook;
  onChange: (look: CaptureLook) => void;
  mode?: 'filters' | 'templates' | 'both';
  previewSrc?: string | null;
}) {
  return (
    <div className="space-y-3">
      {mode !== 'templates' ? (
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">Filters</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_PRESETS.map((p) => {
              const active = look.filterId === p.id && !look.templateId;
              const css = lookToCssFilter({ ...DEFAULT_CAPTURE_LOOK, filterId: p.id, filterIntensity: 100 });
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`ig-look-filter-${p.id}`}
                  onClick={() =>
                    onChange({
                      ...look,
                      filterId: p.id,
                      filterIntensity: 100,
                      templateId: undefined,
                    })
                  }
                  className="flex w-[64px] shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={`block aspect-[3/4] w-full overflow-hidden rounded-xl border-2 ${active ? 'border-white scale-105' : 'border-transparent'} shadow-md`}
                    style={{ background: p.swatch || '#333' }}
                  >
                    {previewSrc ? (
                      <img src={previewSrc} alt="" className="h-full w-full object-cover" style={{ filter: css === 'none' ? undefined : css }} />
                    ) : null}
                  </span>
                  <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-white/65'}`}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode !== 'filters' ? (
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">Looks</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EFFECT_TEMPLATES.map((t) => {
              const active = look.templateId === t.id;
              const chip = applyEffectTemplate(t);
              const css = lookToCssFilter(chip);
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`ig-look-template-${t.id}`}
                  onClick={() => onChange(chip)}
                  className="flex w-[72px] shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={`relative flex aspect-square w-full items-end justify-center overflow-hidden rounded-2xl border-2 text-[10px] font-bold text-white shadow-lg ${
                      active ? 'border-white scale-105' : 'border-white/20'
                    }`}
                    style={{ background: t.swatch }}
                  >
                    {previewSrc ? (
                      <img src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: css === 'none' ? undefined : css }} />
                    ) : null}
                    <span className="relative z-[1] rounded bg-black/45 px-1.5 py-0.5">{t.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
