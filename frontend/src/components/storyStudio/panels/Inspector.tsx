import { useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Copy, Crop, Droplets, FlipHorizontal2, Italic, Link2, Link2Off, RotateCw, SlidersHorizontal, Sparkles, Trash2, Type, Underline, X, Circle, Image as ImageIcon, Layers as LayersIcon } from 'lucide-react';
import { FILTER_PRESETS, buildFilterCss } from '../model/filters';
import { BG_COLORS, FONT_FAMILIES, type Overlay, type Slide } from '../model/types';
import { slideDuration } from '../model/timing';
import { COMING_SOON, NumberField, Section, Slider, Tip, Toggle } from './ui';
import LayerList from './LayerList';
import { useStudio, type InspectorTab } from './StudioContext';
import PollEditorPanel from '../poll/PollEditorPanel';

const TABS: { id: InspectorTab; label: string; icon: typeof Type }[] = [
  { id: 'edit', label: 'Edit', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filters', icon: Droplets },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'effects', label: 'Effects', icon: Sparkles },
];

const card = 'rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]';

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[12px] font-medium text-[color:var(--ss-muted)]">
        <span>{label}</span>
        {value !== undefined ? <span className="tabular-nums text-[color:var(--ss-text)]">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StyleBtn({ pressed, onClick, label, children, disabled, tip }: { pressed?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; tip?: string }) {
  const btn = (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-[27px] items-center justify-center rounded-lg px-1 text-[color:var(--ss-text)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${pressed ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'hover:bg-[color:var(--ss-hover)]'}`}
    >
      {children}
    </button>
  );
  return tip ? <Tip label={tip}>{btn}</Tip> : btn;
}

function OverlayEditor({ slide, o }: { slide: Slide; o: Overlay }) {
  const s = useStudio();
  const [linked, setLinked] = useState(false);
  const patch = (p: Partial<Overlay>, coalesce?: string) => s.dispatch({ type: 'updateOverlay', slideId: slide.id, overlayId: o.id, patch: p, coalesce });
  const isText = o.kind === 'text';
  const setW = (w: number) => (linked && o.w ? patch({ w, h: Math.round((w / o.w) * o.h) }) : patch({ w }));
  const setH = (h: number) => (linked && o.h ? patch({ h, w: Math.round((h / o.h) * o.w) }) : patch({ h }));

  if (o.kind === 'poll') {
    return (
      <section className={`${card} mb-2`}>
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <h3 className="text-[14px] font-semibold text-[color:var(--ss-text)]">Poll sticker</h3>
          <button type="button" aria-label="Deselect layer" onClick={() => s.dispatch({ type: 'selectOverlay', id: null })} className="rounded p-1 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]">
            <X size={15} />
          </button>
        </div>
        <PollEditorPanel />
        <div className="border-t border-[color:var(--ss-border)] px-4 py-3">
          <Row label="Size" value={`${o.w}×${o.h}`}>
            <div className="flex items-center gap-2">
              <NumberField label="W" value={o.w} onChange={setW} />
              <NumberField label="H" value={o.h} onChange={setH} />
            </div>
          </Row>
          <Row label="Rotation" value={`${Math.round(o.rotation)}°`}>
            <Slider label="Rotation" min={-180} max={180} value={o.rotation} onChange={(v) => patch({ rotation: v }, 'rot')} />
          </Row>
          <button
            type="button"
            onClick={() => s.dispatch({ type: 'removeOverlay', slideId: slide.id, overlayId: o.id })}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-[12px] font-semibold text-red-500"
          >
            <Trash2 size={14} /> Remove poll
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={`${card} mb-2`}>
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <h3 className="text-[14px] font-semibold text-[color:var(--ss-text)]">{isText ? 'Text Editing' : 'Sticker'}</h3>
          <button type="button" aria-label="Deselect layer" onClick={() => s.dispatch({ type: 'selectOverlay', id: null })} className="rounded p-1 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]">
            <X size={15} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <textarea
            id="ss-text-input"
            aria-label={isText ? 'Text' : 'Emoji'}
            rows={isText ? 2 : 1}
            maxLength={isText ? 280 : 8}
            value={o.text}
            onChange={(e) => patch({ text: e.target.value }, 'text')}
            className="w-full resize-none rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-3 py-2 text-[13px] text-[color:var(--ss-text)] outline-none focus:border-[color:var(--ss-accent)]"
          />
          {isText ? (
            <>
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="relative min-w-[84px] flex-1">
                  <select
                    aria-label="Font"
                    value={o.fontFamily}
                    onChange={(e) => patch({ fontFamily: e.target.value })}
                    className="h-9 w-full min-w-[84px] appearance-none rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] pl-2.5 pr-7 text-[13px] text-[color:var(--ss-text)] outline-none focus:border-[color:var(--ss-accent)]"
                    style={{ fontFamily: `'${o.fontFamily}', sans-serif` }}
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--ss-muted)]" />
                </div>
                <div className="flex rounded-lg border border-[color:var(--ss-border)]">
                  <StyleBtn label="Bold" pressed={o.bold} onClick={() => patch({ bold: !o.bold })}><Bold size={15} /></StyleBtn>
                  <StyleBtn label="Italic" pressed={o.italic} onClick={() => patch({ italic: !o.italic })}><Italic size={15} /></StyleBtn>
                  <StyleBtn label="Underline" pressed={o.underline} onClick={() => patch({ underline: !o.underline })}><Underline size={15} /></StyleBtn>
                </div>
                <div className="flex rounded-lg border border-[color:var(--ss-border)]">
                  <StyleBtn label="Align left" pressed={o.align === 'left'} onClick={() => patch({ align: 'left' })}><AlignLeft size={15} /></StyleBtn>
                  <StyleBtn label="Align center" pressed={o.align === 'center'} onClick={() => patch({ align: 'center' })}><AlignCenter size={15} /></StyleBtn>
                  <StyleBtn label="Align right" pressed={o.align === 'right'} onClick={() => patch({ align: 'right' })}><AlignRight size={15} /></StyleBtn>
                </div>
              </div>
            </>
          ) : null}
          <div className="mt-3 flex items-center gap-3">
            <span className="w-8 text-[12px] font-medium text-[color:var(--ss-muted)]">{isText ? 'Font' : 'Size'}</span>
            <Slider label={isText ? 'Font size' : 'Sticker size'} min={isText ? 24 : 60} max={isText ? 300 : 600} value={o.fontSize} onChange={(v) => patch(isText ? { fontSize: v } : { fontSize: v, w: v, h: v }, 'size')} />
            <span className="w-8 text-right text-[13px] tabular-nums text-[color:var(--ss-text)]">{Math.round(o.fontSize)}</span>
            {isText ? (
              <label className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-[color:var(--ss-border)]" style={{ background: o.color }} title="Text colour">
                <input type="color" aria-label="Text colour" value={/^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#ffffff'} onChange={(e) => patch({ color: e.target.value }, 'color')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            ) : null}
          </div>
        </div>
      </section>

      {isText ? (
        <section className={`${card} mb-2 px-4 pb-3 pt-3.5`}>
          <h3 className="mb-2.5 text-[13px] font-semibold text-[color:var(--ss-text)]">Text Style</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'shadow', label: 'Shadow', icon: <Droplets size={18} /> },
              { k: 'outline', label: 'Outline', icon: <Type size={18} /> },
              { k: 'gradient', label: 'Gradient', icon: <Sparkles size={18} /> },
            ].map((b) => {
              const on = (o as any)[b.k] as boolean;
              return (
                <button
                  key={b.k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch({ [b.k]: !on } as Partial<Overlay>)}
                  className={`flex h-[62px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition-colors ${on ? 'border-[color:var(--ss-accent)] bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'border-[color:var(--ss-border)] bg-[color:var(--ss-field)] text-[color:var(--ss-text)] hover:border-[color:var(--ss-accent)]'}`}
                >
                  {b.icon}
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-[color:var(--ss-text)]"><Circle size={16} className="text-[color:var(--ss-muted)]" /> Background</span>
            <div className="flex items-center gap-2">
              {o.background ? (
                <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-[color:var(--ss-border)]" style={{ background: o.bgColor }} title="Background colour">
                  <input type="color" aria-label="Background colour" value={/^#[0-9a-f]{6}$/i.test(o.bgColor) ? o.bgColor : '#000000'} onChange={(e) => patch({ bgColor: e.target.value }, 'bg')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
              ) : null}
              <Toggle checked={o.background} onChange={(v) => patch({ background: v })} label="Text background" />
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${card} mb-2 px-4 pb-4 pt-3.5`}>
        <h3 className="mb-2.5 text-[13px] font-semibold text-[color:var(--ss-text)]">Position &amp; Size</h3>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
          <NumberField label="X" value={o.x} onChange={(v) => patch({ x: v }, 'x')} min={-1000} max={2000} />
          <NumberField label="Y" value={o.y} onChange={(v) => patch({ y: v }, 'y')} min={-1000} max={3000} />
          <NumberField label="W" value={o.w} onChange={setW} min={40} max={2400} />
          <NumberField label="H" value={o.h} onChange={setH} min={40} max={2400} />
          <Tip label={linked ? 'Unlink width and height' : 'Link width and height'}>
            <button type="button" aria-pressed={linked} aria-label="Link width and height" onClick={() => setLinked((v) => !v)} className={`mb-1.5 flex h-6 w-6 items-center justify-center ${linked ? 'text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-muted)]'}`}>
              {linked ? <Link2 size={16} /> : <Link2Off size={16} />}
            </button>
          </Tip>
        </div>
        <div className="mt-3">
          <Row label="Rotation" value={`${Math.round(o.rotation)}°`}>
            <Slider label="Rotation" min={-180} max={180} value={o.rotation} onChange={(v) => patch({ rotation: v }, 'rot')} />
          </Row>
          <Row label="Opacity" value={`${Math.round(o.opacity)}%`}>
            <Slider label="Opacity" min={0} max={100} value={o.opacity} onChange={(v) => patch({ opacity: v }, 'op')} />
          </Row>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => s.dispatch({ type: 'duplicateOverlay', slideId: slide.id, overlayId: o.id })} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--ss-border)] text-[12px] font-medium text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]"><Copy size={13} /> Duplicate</button>
          <button type="button" onClick={() => s.dispatch({ type: 'removeOverlay', slideId: slide.id, overlayId: o.id })} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--ss-border)] text-[12px] font-medium text-red-500 hover:bg-[color:var(--ss-hover)]"><Trash2 size={13} /> Delete</button>
        </div>
      </section>
    </>
  );
}

function SlideEditor({ slide }: { slide: Slide }) {
  const s = useStudio();
  const isVideo = slide.media?.type === 'video';
  const upd = (patch: Partial<Slide>, coalesce?: string) => s.dispatch({ type: 'updateSlide', id: slide.id, patch, coalesce });
  return (
    <section className={`${card} mb-2`}>
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-[color:var(--ss-text)]">{slide.kind === 'text' ? 'Text slide' : isVideo ? 'Video slide' : 'Photo slide'}</h3>
      </div>
      <div className="px-4 pb-4">
        <Row label="Duration" value={`${Math.round(slideDuration(slide))}s`}>
          <Slider label="Slide duration" min={1} max={15} value={isVideo ? Math.min(15, slideDuration(slide)) : slide.duration} disabled={isVideo} onChange={(v) => upd({ duration: v }, 'dur')} />
          {isVideo ? <p className="mt-1 text-[11px] text-[color:var(--ss-muted)]">Videos play at their natural length (trim is coming soon).</p> : null}
        </Row>
        {slide.kind === 'text' ? (
          <Row label="Background colour">
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Background ${c}`} aria-pressed={slide.bgColor === c} onClick={() => upd({ bgColor: c })} className={`h-7 w-7 rounded-full border-2 ${slide.bgColor === c ? 'border-[color:var(--ss-accent)]' : 'border-[color:var(--ss-border)]'}`} style={{ background: c }} />
              ))}
            </div>
          </Row>
        ) : (
          <>
            <Row label="Photo framing">
              <div className="flex gap-2">
                <div role="group" aria-label="Fit or fill" className="flex flex-1 rounded-lg border border-[color:var(--ss-border)] p-0.5">
                  {(['cover', 'contain'] as const).map((f) => (
                    <button key={f} type="button" aria-pressed={slide.fit === f} onClick={() => upd({ fit: f })} className={`h-8 flex-1 rounded-md text-[12px] font-medium ${slide.fit === f ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)]'}`}>
                      {f === 'cover' ? 'Fill' : 'Fit'}
                    </button>
                  ))}
                </div>
                <Tip label="Rotate 90°"><button type="button" aria-label="Rotate 90 degrees" onClick={() => upd({ rotate: ((slide.rotate + 90) % 360) as Slide['rotate'] })} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--ss-border)] text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]"><RotateCw size={15} /></button></Tip>
                <Tip label="Flip horizontally"><button type="button" aria-label="Flip horizontally" aria-pressed={slide.flipH} onClick={() => upd({ flipH: !slide.flipH })} className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--ss-border)] hover:bg-[color:var(--ss-hover)] ${slide.flipH ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)]'}`}><FlipHorizontal2 size={15} /></button></Tip>
              </div>
            </Row>
            <Row label="Zoom" value={`${slide.zoom.toFixed(2)}×`}>
              <Slider label="Zoom" min={1} max={3} step={0.01} value={slide.zoom} onChange={(v) => upd({ zoom: v }, 'zoom')} />
            </Row>
            {slide.offsetX !== 0 || slide.offsetY !== 0 ? (
              <button type="button" onClick={() => upd({ offsetX: 0, offsetY: 0 })} className="mb-2 text-[12px] font-medium text-[color:var(--ss-accent)] hover:underline">Reset position</button>
            ) : null}
            {!isVideo ? (
              <button type="button" onClick={s.openImageEditor} className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--ss-border)] text-[13px] font-medium text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]" data-testid="ss-open-image-editor">
                <Crop size={15} /> Crop &amp; advanced photo edit
              </button>
            ) : null}
          </>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => s.addText()} data-testid="ss-inspector-add-text" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[color:var(--ss-accent-soft)] text-[12.5px] font-semibold text-[color:var(--ss-accent)] hover:brightness-95"><Type size={14} /> Add text</button>
          <button type="button" onClick={() => { s.setLeftTab('stickers'); s.setLeftOpen(true); }} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[color:var(--ss-accent-soft)] text-[12.5px] font-semibold text-[color:var(--ss-accent)] hover:brightness-95">Add sticker</button>
        </div>
      </div>
    </section>
  );
}

function FiltersTab({ slide }: { slide: Slide }) {
  const s = useStudio();
  const upd = (patch: Partial<Slide>, coalesce?: string) => s.dispatch({ type: 'updateSlide', id: slide.id, patch, coalesce });
  const thumb = slide.media?.type === 'image' ? slide.media.url : null;
  return (
    <section className={`${card} mb-2 px-4 pb-4 pt-3.5`}>
      <h3 className="mb-2.5 text-[14px] font-semibold text-[color:var(--ss-text)]">Filters</h3>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Filter presets">
        {FILTER_PRESETS.map((p) => {
          const active = slide.filterId === p.id;
          const css = buildFilterCss({ filterId: p.id, filterIntensity: 100, adjust: { brightness: 100, contrast: 100, saturation: 100, temperature: 0 } });
          return (
            <button key={p.id} type="button" role="radio" aria-checked={active} aria-label={`${p.label} filter`} data-testid={`ss-filter-${p.id}`} onClick={() => upd({ filterId: p.id })} className="flex flex-col items-center gap-1">
              <span className={`block aspect-[3/4] w-full overflow-hidden rounded-lg border-2 ${active ? 'border-[color:var(--ss-accent)]' : 'border-transparent'}`} style={{ background: slide.kind === 'text' ? slide.bgColor : '#111' }}>
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" style={{ filter: css === 'none' ? undefined : css }} loading="lazy" /> : <span className="flex h-full items-center justify-center bg-gradient-to-br from-sky-300 via-amber-200 to-rose-300" style={{ filter: css === 'none' ? undefined : css }} />}
              </span>
              <span className={`text-[11px] font-medium ${active ? 'text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)]'}`}>{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Row label="Intensity" value={`${Math.round(slide.filterIntensity)}%`}>
          <Slider label="Filter intensity" min={0} max={100} value={slide.filterIntensity} disabled={slide.filterId === 'none'} onChange={(v) => upd({ filterIntensity: v }, 'fint')} />
        </Row>
      </div>
      <button type="button" disabled={slide.filterId === 'none'} onClick={() => upd({ filterId: 'none', filterIntensity: 100 })} className="mt-1 text-[12px] font-medium text-[color:var(--ss-accent)] hover:underline disabled:opacity-40">Remove filter</button>
    </section>
  );
}

function AdjustTab({ slide }: { slide: Slide }) {
  const s = useStudio();
  const a = slide.adjust;
  const set = (k: keyof Slide['adjust'], v: number) => s.dispatch({ type: 'updateSlide', id: slide.id, patch: { adjust: { ...a, [k]: v } }, coalesce: `adj-${k}` });
  const rows: { k: keyof Slide['adjust']; label: string; min: number; max: number; neutral: number }[] = [
    { k: 'brightness', label: 'Brightness', min: 0, max: 200, neutral: 100 },
    { k: 'contrast', label: 'Contrast', min: 0, max: 200, neutral: 100 },
    { k: 'saturation', label: 'Saturation', min: 0, max: 200, neutral: 100 },
    { k: 'temperature', label: 'Temperature', min: -100, max: 100, neutral: 0 },
  ];
  const changed = a.brightness !== 100 || a.contrast !== 100 || a.saturation !== 100 || a.temperature !== 0;
  return (
    <section className={`${card} mb-2 px-4 pb-4 pt-3.5`}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[color:var(--ss-text)]">Adjust</h3>
        <button
          type="button"
          onPointerDown={() => s.setCompare(true)}
          onPointerUp={() => s.setCompare(false)}
          onPointerLeave={() => s.setCompare(false)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && s.setCompare(true)}
          onKeyUp={() => s.setCompare(false)}
          onBlur={() => s.setCompare(false)}
          aria-label="Hold to compare with original"
          data-testid="ss-compare"
          className="rounded-md border border-[color:var(--ss-border)] px-2 py-1 text-[11px] font-medium text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]"
        >
          Hold: before/after
        </button>
      </div>
      {rows.map((r) => (
        <Row key={r.k} label={r.label} value={`${Math.round(a[r.k] - (r.k === 'temperature' ? 0 : 100))}`}>
          <div className="flex items-center gap-2">
            <Slider label={r.label} min={r.min} max={r.max} value={a[r.k]} onChange={(v) => set(r.k, v)} />
            <button type="button" aria-label={`Reset ${r.label}`} disabled={a[r.k] === r.neutral} onClick={() => set(r.k, r.neutral)} className="shrink-0 text-[11px] font-medium text-[color:var(--ss-accent)] disabled:opacity-30">Reset</button>
          </div>
        </Row>
      ))}
      {['Highlights', 'Shadows', 'Curves', 'HSL'].map((n) => (
        <Tip key={n} label={`${n} needs a pixel-accurate renderer · ${COMING_SOON}`}>
          <div aria-disabled="true" className="mb-2 flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-[color:var(--ss-field)] px-3 py-2 text-[12px] text-[color:var(--ss-muted)] opacity-70">
            <span>{n}</span>
            <span>{COMING_SOON}</span>
          </div>
        </Tip>
      ))}
      <button type="button" disabled={!changed && slide.filterId === 'none'} onClick={() => s.dispatch({ type: 'resetAdjust', id: slide.id })} className="mt-1 text-[12px] font-medium text-[color:var(--ss-accent)] hover:underline disabled:opacity-40" data-testid="ss-reset-adjust">Reset all</button>
    </section>
  );
}

function EffectsTab({ slide }: { slide: Slide }) {
  const s = useStudio();
  const e = slide.effects;
  const set = (k: 'vignette' | 'grain', v: number) => s.dispatch({ type: 'updateSlide', id: slide.id, patch: { effects: { ...e, [k]: v } }, coalesce: `fx-${k}` });
  return (
    <section className={`${card} mb-2 px-4 pb-4 pt-3.5`}>
      <h3 className="mb-2.5 text-[14px] font-semibold text-[color:var(--ss-text)]">Effects</h3>
      <Row label="Vignette" value={`${Math.round(e.vignette)}%`}>
        <Slider label="Vignette" min={0} max={100} value={e.vignette} onChange={(v) => set('vignette', v)} />
      </Row>
      <Row label="Film grain" value={`${Math.round(e.grain)}%`}>
        <Slider label="Film grain" min={0} max={100} value={e.grain} onChange={(v) => set('grain', v)} />
      </Row>
      {['Glow', 'Glitch', 'Light leaks', 'Motion animations'].map((n) => (
        <Tip key={n} label={COMING_SOON}>
          <div aria-disabled="true" className="mb-2 flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-[color:var(--ss-field)] px-3 py-2 text-[12px] text-[color:var(--ss-muted)] opacity-70">
            <span>{n}</span>
            <span>{COMING_SOON}</span>
          </div>
        </Tip>
      ))}
    </section>
  );
}

export default function Inspector() {
  const s = useStudio();
  const slide = s.slide;
  const overlay = s.overlay;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="ss-inspector">
      <div role="tablist" aria-label="Inspector" className={`${card} flex shrink-0 p-1.5`}>
        {TABS.map((t) => {
          const active = s.inspectorTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`ss-tab-${t.id}`}
              onClick={() => s.setInspectorTab(t.id)}
              className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${active ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]'}`}
            >
              <Icon size={15} />
              <span className="hidden min-[1500px]:inline lg:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 ss-scroll">
        {!slide ? (
          <section className={`${card} px-5 py-10 text-center`}>
            <ImageIcon size={26} className="mx-auto text-[color:var(--ss-muted)]" />
            <p className="mt-3 text-[13px] font-semibold text-[color:var(--ss-text)]">Nothing to edit yet</p>
            <p className="mt-1 text-[12px] text-[color:var(--ss-muted)]">Upload a photo or video, or start with a text slide. Its properties show up here.</p>
          </section>
        ) : s.inspectorTab === 'edit' ? (
          <>
            {overlay ? <OverlayEditor slide={slide} o={overlay} /> : <SlideEditor slide={slide} />}
            <section className={`${card} mb-2`}>
              <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[color:var(--ss-text)]"><LayersIcon size={15} className="text-[color:var(--ss-muted)]" /> Layer</h3>
              </div>
              <LayerList compact />
            </section>
          </>
        ) : s.inspectorTab === 'filters' ? (
          <FiltersTab slide={slide} />
        ) : s.inspectorTab === 'adjust' ? (
          <AdjustTab slide={slide} />
        ) : (
          <EffectsTab slide={slide} />
        )}
      </div>
    </div>
  );
}
