import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { BarChart2, Crop, FlipHorizontal2, Heart, Image as ImageIcon, MousePointer2, MoreHorizontal, Move, PenLine, Scan, Send, Shapes, Smartphone, Smile, Type, Upload, X, ChevronDown, Grid3x3, Maximize } from 'lucide-react';
import StorySlideCanvas from '../render/StorySlideCanvas';
import { CANVAS_H, CANVAS_W, DEFAULT_ADJUST, DEFAULT_EFFECTS, clamp, newDrawOverlay, uid, type DrawStroke, type Overlay, type Slide } from '../model/types';
import { slideOffsets } from '../model/timing';
import { COMING_SOON, Tip } from './ui';
import UserAvatar from '../../UserAvatar';
import { useStudio } from './StudioContext';

const toolBtn = 'flex h-[60px] [@media(max-height:760px)]:h-[38px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)] disabled:cursor-not-allowed disabled:opacity-45';

/**
 * Left tool rail. When the stage row is too short for a single column (short laptop /
 * tablet windows) it switches to a two-column icon grid (Photoshop style) instead of
 * overflowing on top of the timeline.
 */
function ToolStrip({ twoCol }: { twoCol: boolean }) {
  const s = useStudio();
  const [more, setMore] = useState(false);
  const slide = s.slide;
  const isImage = slide?.media?.type === 'image';
  const tools: { id: string; label: string; icon: typeof Type; run?: () => void; active?: boolean; soon?: boolean; disabled?: boolean; tip?: string }[] = [
    { id: 'select', label: 'Select', icon: MousePointer2, run: () => s.setTool('select'), active: s.tool === 'select' },
    { id: 'move', label: 'Move', icon: Move, run: () => s.setTool('move'), active: s.tool === 'move', disabled: !slide?.media, tip: 'Drag the photo/video inside the frame' },
    { id: 'text', label: 'Text', icon: Type, run: () => s.addText(), disabled: !slide },
    { id: 'sticker', label: 'Sticker', icon: Smile, run: () => { s.setLeftTab('stickers'); s.setLeftOpen(true); }, disabled: !slide },
    {
      id: 'poll',
      label: 'Poll',
      icon: BarChart2,
      run: () => s.addPoll(),
      disabled: !slide,
      tip: !slide ? 'Add a slide first' : 'Add an interactive poll sticker',
    },
    { id: 'shape', label: 'Shape', icon: Shapes, soon: true },
    {
      id: 'draw',
      label: 'Draw',
      icon: PenLine,
      run: () => {
        if (!slide) return;
        const existing = slide.overlays.find((o) => o.kind === 'draw');
        if (!existing) s.dispatch({ type: 'addOverlay', slideId: slide.id, overlay: newDrawOverlay() });
        s.setTool(s.tool === 'draw' ? 'select' : 'draw');
      },
      active: s.tool === 'draw',
      disabled: !slide,
      tip: !slide ? 'Add a slide first' : 'Draw on the canvas',
    },
    { id: 'crop', label: 'Crop', icon: Crop, run: s.openImageEditor, disabled: !isImage, tip: !isImage ? 'Crop is available for photo slides' : 'Crop & advanced photo edit' },
  ];
  return (
    <div
      className={`relative shrink-0 self-start rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] p-1.5 ${twoCol ? 'grid w-[84px] grid-cols-2 items-center gap-1' : 'flex w-[68px] flex-col items-center gap-0.5'}`}
      role="toolbar"
      aria-label="Canvas tools"
      aria-orientation="vertical"
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const dis = t.soon || t.disabled;
        return (
          <Tip key={t.id} side="right" label={t.soon ? `${t.label} · ${COMING_SOON}` : t.tip || t.label}>
            <button
              type="button"
              aria-label={t.label}
              aria-pressed={t.active}
              aria-disabled={dis || undefined}
              data-testid={`ss-tool-${t.id}`}
              onClick={() => !dis && t.run?.()}
              className={`${toolBtn} ${twoCol ? 'w-full' : 'w-[56px]'} ${t.active ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]'} ${dis ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : ''}`}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span className="[@media(max-height:760px)]:hidden">{t.label}</span>
            </button>
          </Tip>
        );
      })}
      {/* The Tip span is the grid/flex item, so it must wrap the menu too: a plain
          <div> wrapper would shrink-wrap the inline-flex span and leave a 19px button
          in a 33px grid cell. */}
      <Tip label="More" side="right">
        <button type="button" aria-label="More canvas actions" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((v) => !v)} className={`${toolBtn} ${twoCol ? 'w-full' : 'w-[56px]'} ${twoCol ? '' : '!h-[40px] [@media(max-height:760px)]:!h-[34px]'} text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]`}>
          <MoreHorizontal size={19} />
        </button>
        {more ? (
          <div role="menu" className="absolute left-full top-0 z-50 ml-2 w-48 overflow-hidden rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] py-1 shadow-xl" onMouseLeave={() => setMore(false)}>
            {[
              { label: 'Duplicate slide', run: () => slide && s.dispatch({ type: 'duplicateSlide', id: slide.id }), disabled: !slide },
              { label: 'Reset photo position & zoom', run: () => slide && s.dispatch({ type: 'updateSlide', id: slide.id, patch: { offsetX: 0, offsetY: 0, zoom: 1 } }), disabled: !slide?.media },
              { label: 'Delete slide', run: () => slide && s.dispatch({ type: 'removeSlide', id: slide.id }), disabled: !slide, danger: true },
            ].map((m) => (
              <button key={m.label} type="button" role="menuitem" disabled={m.disabled} onClick={() => { m.run(); setMore(false); }} className={`block w-full px-3 py-2 text-left text-[12.5px] hover:bg-[color:var(--ss-hover)] disabled:opacity-40 ${m.danger ? 'text-red-500' : 'text-[color:var(--ss-text)]'}`}>
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
      </Tip>
    </div>
  );
}

type DragMode =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number }
  | { kind: 'resize'; id: string; corner: 'nw' | 'ne' | 'sw' | 'se'; sx: number; sy: number; o: Overlay }
  | { kind: 'rotate'; id: string; cx: number; cy: number }
  | { kind: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { kind: 'draw'; overlayId: string; stroke: DrawStroke };

function Interaction({ slide, scale }: { slide: Slide; scale: number }) {
  const s = useStudio();
  const drag = useRef<DragMode | null>(null);
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const selId = s.state.selectedOverlayId;
  const inv = 1 / Math.max(scale, 0.05);
  const rootRef = useRef<HTMLDivElement>(null);

  const upd = (id: string, patch: Partial<Overlay>, key: string) => s.dispatch({ type: 'updateOverlay', slideId: slide.id, overlayId: id, patch, coalesce: key });

  const logicalFromEvent = (e: RPointerEvent) => {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * inv, y: (e.clientY - rect.top) * inv };
  };

  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'draw') {
      const pt = logicalFromEvent(e);
      d.stroke.points.push(pt);
      const layer = slide.overlays.find((o) => o.id === d.overlayId);
      if (!layer) return;
      upd(
        d.overlayId,
        { strokes: [...(layer.strokes || []).filter((x) => x.id !== d.stroke.id), { ...d.stroke, points: [...d.stroke.points] }] },
        `draw-${d.stroke.id}`,
      );
      return;
    }
    if (d.kind === 'pan') {
      s.dispatch({ type: 'updateSlide', id: slide.id, patch: { offsetX: clamp(d.ox + (e.clientX - d.sx) * inv, -2000, 2000), offsetY: clamp(d.oy + (e.clientY - d.sy) * inv, -3000, 3000) }, coalesce: 'pan' });
      return;
    }
    if (d.kind === 'move') {
      const o = slide.overlays.find((x) => x.id === d.id);
      if (!o) return;
      let nx = d.ox + (e.clientX - d.sx) * inv;
      let ny = d.oy + (e.clientY - d.sy) * inv;
      let sx = false;
      let sy = false;
      if (s.guides && !e.altKey) {
        const cx = nx + o.w / 2;
        const cy = ny + o.h / 2;
        if (Math.abs(cx - CANVAS_W / 2) < 14) {
          nx = CANVAS_W / 2 - o.w / 2;
          sx = true;
        }
        if (Math.abs(cy - CANVAS_H / 2) < 14) {
          ny = CANVAS_H / 2 - o.h / 2;
          sy = true;
        }
      }
      setSnap({ x: sx, y: sy });
      upd(d.id, { x: Math.round(nx), y: Math.round(ny) }, 'move');
      return;
    }
    if (d.kind === 'rotate') {
      const ang = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90;
      let a = ((ang + 540) % 360) - 180;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      upd(d.id, { rotation: Math.round(a) }, 'rot');
      return;
    }
    if (d.kind === 'resize') {
      const o = d.o;
      const th = (o.rotation * Math.PI) / 180;
      const dx = (e.clientX - d.sx) * inv;
      const dy = (e.clientY - d.sy) * inv;
      // into the layer's own axes
      const lx = dx * Math.cos(th) + dy * Math.sin(th);
      const ly = -dx * Math.sin(th) + dy * Math.cos(th);
      const sxn = d.corner.includes('e') ? 1 : -1;
      const syn = d.corner.includes('s') ? 1 : -1;
      let nw = Math.max(40, o.w + sxn * lx);
      let nh = Math.max(40, o.h + syn * ly);
      if (o.kind === 'sticker') {
        const size = Math.max(nw, nh);
        nw = size;
        nh = size;
      }
      const dw = nw - o.w;
      const dh = nh - o.h;
      const shiftX = (sxn * dw) / 2;
      const shiftY = (syn * dh) / 2;
      const cx = o.x + o.w / 2 + shiftX * Math.cos(th) - shiftY * Math.sin(th);
      const cy = o.y + o.h / 2 + shiftX * Math.sin(th) + shiftY * Math.cos(th);
      upd(d.id, { w: Math.round(nw), h: Math.round(nh), x: Math.round(cx - nw / 2), y: Math.round(cy - nh / 2), ...(o.kind === 'sticker' ? { fontSize: Math.round(nw) } : {}) }, 'resize');
    }
  };
  const end = (e: RPointerEvent) => {
    drag.current = null;
    setSnap({ x: false, y: false });
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const selected = slide.overlays.find((o) => o.id === selId && o.visible) || null;
  const hs = 26 * inv * 0.6 + 8; // handle size in logical px (≈ 14-18 css px)
  const bw = Math.max(3, 2 * inv);

  return (
    <div ref={rootRef} className="absolute inset-0" style={{ pointerEvents: 'auto' }} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end} data-testid="ss-interaction">
      {/* background: deselect / pan / draw */}
      <div
        className="absolute inset-0"
        style={{ cursor: s.tool === 'draw' ? 'crosshair' : s.tool === 'move' && slide.media ? 'grab' : 'default' }}
        onPointerDown={(e) => {
          if (s.tool === 'draw') {
            let layer = slide.overlays.find((o) => o.kind === 'draw');
            if (!layer) {
              const draw = newDrawOverlay();
              s.dispatch({ type: 'addOverlay', slideId: slide.id, overlay: draw });
              layer = draw;
            }
            const pt = logicalFromEvent(e);
            const stroke: DrawStroke = { id: uid('stk'), color: '#ffffff', width: 14, points: [pt] };
            drag.current = { kind: 'draw', overlayId: layer.id, stroke };
            upd(layer.id, { strokes: [...(layer.strokes || []), stroke] }, `draw-${stroke.id}`);
            (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
          if (s.tool === 'move' && slide.media) {
            drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: slide.offsetX, oy: slide.offsetY };
            (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
          } else {
            s.dispatch({ type: 'selectOverlay', id: null });
          }
        }}
      />
      {s.tool !== 'draw'
        ? slide.overlays
            .filter((o) => o.visible && o.kind !== 'draw')
            .map((o) => (
          <div
            key={o.id}
            data-testid="ss-overlay-hit"
            data-overlay={o.id}
            onPointerDown={(e) => {
              if (s.tool === 'move') return;
              e.stopPropagation();
              s.dispatch({ type: 'selectOverlay', id: o.id });
              if (o.locked) return;
              drag.current = { kind: 'move', id: o.id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y };
              (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onDoubleClick={() => o.kind === 'text' && window.dispatchEvent(new Event('ss:focus-text'))}
            style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, transform: `rotate(${o.rotation}deg)`, cursor: o.locked ? 'not-allowed' : 'move', outline: o.id === selId ? `${bw}px solid var(--ss-accent)` : undefined }}
          />
        ))
        : null}
      {selected && !selected.locked ? (
        <div style={{ position: 'absolute', left: selected.x, top: selected.y, width: selected.w, height: selected.h, transform: `rotate(${selected.rotation}deg)`, pointerEvents: 'none' }}>
          {(['nw', 'ne', 'sw', 'se'] as const).map((c) => (
            <span
              key={c}
              data-testid={`ss-handle-${c}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                drag.current = { kind: 'resize', id: selected.id, corner: c, sx: e.clientX, sy: e.clientY, o: selected };
                (e.currentTarget.closest('[data-testid="ss-interaction"]') as HTMLElement).setPointerCapture(e.pointerId);
              }}
              style={{
                position: 'absolute',
                width: hs,
                height: hs,
                borderRadius: '50%',
                background: '#fff',
                border: `${bw}px solid var(--ss-accent)`,
                left: c.includes('w') ? -hs / 2 : undefined,
                right: c.includes('e') ? -hs / 2 : undefined,
                top: c.includes('n') ? -hs / 2 : undefined,
                bottom: c.includes('s') ? -hs / 2 : undefined,
                cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize',
                pointerEvents: 'auto',
              }}
            />
          ))}
          <span
            data-testid="ss-handle-rotate"
            onPointerDown={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              drag.current = { kind: 'rotate', id: selected.id, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
              (e.currentTarget.closest('[data-testid="ss-interaction"]') as HTMLElement).setPointerCapture(e.pointerId);
            }}
            style={{ position: 'absolute', left: '50%', top: -hs * 3, width: hs, height: hs, marginLeft: -hs / 2, borderRadius: '50%', background: 'var(--ss-accent)', cursor: 'grab', pointerEvents: 'auto' }}
            title="Rotate"
          />
        </div>
      ) : null}

      {s.guides ? (
        <>
          <div style={{ position: 'absolute', left: CANVAS_W / 2 - 1.5 * inv, top: 0, bottom: 0, width: 3 * inv, background: snap.x ? '#f43f5e' : 'rgba(56,189,248,.85)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: CANVAS_H / 2 - 1.5 * inv, left: 0, right: 0, height: 3 * inv, background: snap.y ? '#f43f5e' : 'rgba(56,189,248,.85)', pointerEvents: 'none' }} />
          {[1 / 3, 2 / 3].map((f) => (
            <div key={`v${f}`} style={{ position: 'absolute', left: CANVAS_W * f, top: 0, bottom: 0, width: 2 * inv, background: 'rgba(255,255,255,.35)', pointerEvents: 'none' }} />
          ))}
          {[1 / 3, 2 / 3].map((f) => (
            <div key={`h${f}`} style={{ position: 'absolute', top: CANVAS_H * f, left: 0, right: 0, height: 2 * inv, background: 'rgba(255,255,255,.35)', pointerEvents: 'none' }} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function StoryChrome({ progress, count, index }: { progress: number; count: number; index: number }) {
  const s = useStudio();
  const name = s.spaceName || s.user?.name || 'You';
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', top: 36, left: 40, right: 40, display: 'flex', gap: 10 }}>
        {Array.from({ length: Math.max(1, count) }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 8, background: 'rgba(255,255,255,.4)', overflow: 'hidden' }}>
            <div style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`, height: '100%', background: '#fff' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 76, left: 44, right: 44, display: 'flex', alignItems: 'center', gap: 22, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '3px solid #fff', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700 }}>
          {s.user?.avatar ? <img src={s.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
        </div>
        <span style={{ fontSize: 40, fontWeight: 700 }}>{name}</span>
        <span style={{ fontSize: 36, opacity: 0.85 }}>now</span>
        <svg style={{ marginLeft: 'auto' }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </div>
      <div style={{ position: 'absolute', left: 48, right: 48, bottom: 56, display: 'flex', alignItems: 'center', gap: 36, color: '#fff' }}>
        <div style={{ flex: 1, height: 100, borderRadius: 60, border: '3px solid rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', paddingLeft: 40, fontSize: 38 }}>Send message...</div>
        <Heart size={64} strokeWidth={1.8} />
        <Send size={64} strokeWidth={1.8} />
      </div>
    </div>
  );
}

export default function CanvasStage() {
  const s = useStudio();
  const slide = s.slide;
  const regionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState({ w: 600, h: 600 });
  const [stageH, setStageH] = useState(0);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    const m = () => setRegion({ w: el.clientWidth, h: el.clientHeight });
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const m = () => setStageH(el.clientHeight);
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const factor = s.zoomMode === 'fit' ? 1 : s.zoomMode / 100;
  const pad = s.layout === 'mobile' ? 8 : 20;
  const fitH = Math.max(120, Math.min(region.h - pad, ((region.w - pad) * 16) / 9));
  const canvasH = Math.round(fitH * factor);
  const canvasW = Math.round((canvasH * 9) / 16);

  const offsets = useMemo(() => slideOffsets(s.state.doc.slides), [s.state.doc.slides]);
  const idx = s.state.doc.slides.findIndex((x) => x.id === slide?.id);
  const local = idx >= 0 ? s.time - offsets[idx] : 0;
  const dur = slide ? (slide.media?.type === 'video' ? slide.media.naturalDuration || 5 : slide.duration) : 5;
  const progress = clamp(local / Math.max(0.1, dur), 0, 1);

  const shown: Slide | null = slide
    ? s.compare
      ? { ...slide, filterId: 'none', adjust: { ...DEFAULT_ADJUST }, effects: { ...DEFAULT_EFFECTS } }
      : slide
    : null;

  // refocus text input on double click
  useEffect(() => {
    const h = () => (document.getElementById('ss-text-input') as HTMLTextAreaElement | null)?.focus();
    window.addEventListener('ss:focus-text', h);
    return () => window.removeEventListener('ss:focus-text', h);
  }, []);

  const pill = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] px-3 text-[13px] font-medium text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)]';

  return (
    <div ref={stageRef} className="flex min-h-0 min-w-0 flex-1 gap-2" data-testid="ss-stage">
      {s.layout !== 'mobile' ? <ToolStrip twoCol={stageH > 0 && stageH < 340} /> : null}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 px-1 pb-2">
          <label className="relative">
            <span className="sr-only">Aspect ratio</span>
            <select aria-label="Aspect ratio" defaultValue="9:16" className={`${pill} appearance-none pr-7`}>
              <option value="9:16">9:16</option>
              <option value="4:5" disabled>4:5 · {COMING_SOON}</option>
              <option value="1:1" disabled>1:1 · {COMING_SOON}</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--ss-muted)]" />
          </label>
          <button type="button" className={pill} onClick={() => s.setZoomMode('fit')} aria-pressed={s.zoomMode === 'fit'} data-testid="ss-zoom-fit">
            Fit
          </button>
          <label className="relative">
            <span className="sr-only">Zoom</span>
            <select aria-label="Zoom" value={s.zoomMode === 'fit' ? '100' : String(s.zoomMode)} onChange={(e) => s.setZoomMode(Number(e.target.value))} className={`${pill} appearance-none pr-7`}>
              {[50, 75, 100, 125, 150].map((z) => (
                <option key={z} value={z}>{z}%</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--ss-muted)]" />
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            {s.layout !== 'mobile' ? (
              <>
                <Tip label={s.chrome ? 'Hide story overlay (profile, progress, reply bar)' : 'Show story overlay (profile, progress, reply bar)'}>
                  <button type="button" aria-label="Toggle story overlay" aria-pressed={s.chrome} data-testid="ss-toggle-chrome" onClick={() => s.setChrome(!s.chrome)} className={`${pill} w-9 justify-center px-0 ${s.chrome ? '!bg-[color:var(--ss-accent-soft)] !text-[color:var(--ss-accent)]' : ''}`}>
                    {s.chrome ? <Smartphone size={15} /> : <Maximize size={15} />}
                  </button>
                </Tip>
                <Tip label="Safe area">
                  <button type="button" aria-label="Toggle safe area" aria-pressed={s.safeArea} data-testid="ss-toggle-safe-area" onClick={() => s.setSafeArea(!s.safeArea)} className={`${pill} w-9 justify-center px-0 ${s.safeArea ? '!bg-[color:var(--ss-accent-soft)] !text-[color:var(--ss-accent)]' : ''}`}>
                    <Scan size={15} />
                  </button>
                </Tip>
              </>
            ) : null}
            <Tip label="Flip photo horizontally">
              <button type="button" aria-label="Flip photo horizontally" disabled={!slide?.media} aria-pressed={!!slide?.flipH} onClick={() => slide && s.dispatch({ type: 'updateSlide', id: slide.id, patch: { flipH: !slide.flipH } })} className={`${pill} w-9 justify-center px-0 disabled:opacity-40`}>
                <FlipHorizontal2 size={15} />
              </button>
            </Tip>
            <Tip label={slide?.fit === 'contain' ? 'Fill frame' : 'Fit inside frame'}>
              <button type="button" aria-label="Toggle fit or fill" disabled={!slide?.media} onClick={() => slide && s.dispatch({ type: 'updateSlide', id: slide.id, patch: { fit: slide.fit === 'cover' ? 'contain' : 'cover' } })} className={`${pill} w-9 justify-center px-0 disabled:opacity-40`}>
                <ImageIcon size={15} />
              </button>
            </Tip>
            <Tip label="Guides & snapping">
              <button type="button" aria-label="Toggle guides" aria-pressed={s.guides} onClick={() => s.setGuides(!s.guides)} className={`${pill} w-9 justify-center px-0 ${s.guides ? '!bg-[color:var(--ss-accent-soft)] !text-[color:var(--ss-accent)]' : ''}`}>
                <Grid3x3 size={15} />
              </button>
            </Tip>
          </div>
        </div>

        <div ref={regionRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl ss-scroll" style={{ background: 'var(--ss-stage)' }}>
          {shown ? (
            <div className="m-auto shrink-0" style={{ width: canvasW, height: canvasH }}>
              <div className="relative h-full w-full rounded-[2px] shadow-[0_8px_40px_rgba(15,23,42,.25)]" data-testid="ss-canvas" style={{ outline: s.playing ? undefined : '1.5px solid var(--ss-accent)', outlineOffset: 0 }}>
                <StorySlideCanvas
                  slide={shown}
                  className="h-full w-full"
                  playing={s.playing}
                  time={local}
                  onScale={setScale}
                  onVideoMeta={(d) => {
                    if (slide?.media?.type === 'video' && !slide.media.naturalDuration) s.dispatch({ type: 'updateSlide', id: slide.id, patch: { media: { ...slide.media, naturalDuration: d } } });
                  }}
                >
                  {s.chrome ? <StoryChrome progress={progress} count={s.state.doc.slides.length} index={Math.max(0, idx)} /> : null}
                  {s.safeArea ? (
                    <div aria-hidden style={{ position: 'absolute', left: 54, right: 54, top: 250, bottom: 330, border: `${Math.max(3, 2 / Math.max(scale, 0.05))}px dashed rgba(255,255,255,.75)`, borderRadius: 24, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} />
                  ) : null}
                  {!s.playing ? <Interaction slide={slide!} scale={scale} /> : null}
                </StorySlideCanvas>
                {!s.playing && !s.state.selectedOverlayId ? (
                  <>
                    {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((p) => (
                      <span key={p} aria-hidden className={`pointer-events-none absolute ${p} h-2.5 w-2.5 rounded-full border-2 border-[color:var(--ss-accent)] bg-white`} />
                    ))}
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            /* Deliberately NOT sized to the 9:16 canvas box: on a short viewport that
               box is ~111x197 and this card overflowed it, pushing "Text slide" past
               the stage edge (and under whatever sits below). A content-sized card
               centred in the region always fits, on any window size. */
            <div className="m-auto flex w-full max-w-[440px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] p-4 text-center" data-testid="ss-empty-canvas">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]"><Smartphone size={20} /></div>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-[color:var(--ss-text)]">Start your story</p>
                <p className="text-[12px] leading-snug text-[color:var(--ss-muted)]">Add photos or videos, or begin with a text slide.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[color:var(--ss-accent)] px-4 text-[13px] font-semibold text-white hover:brightness-110">
                  <Upload size={15} /> Upload media
                  <input type="file" accept="image/*,video/*" multiple className="sr-only" data-testid="ss-file-input-empty" onChange={(e) => { if (e.target.files?.length) s.importFiles(e.target.files); e.target.value = ''; }} />
                </label>
                <button type="button" onClick={s.addTextSlide} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[color:var(--ss-border)] px-4 text-[13px] font-medium text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]"><Type size={15} /> Text slide</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
