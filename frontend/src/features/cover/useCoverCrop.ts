import { useCallback, useMemo, useRef, useState } from 'react';
import type { CoverCrop } from './coverApi';

export const COVER_MIN_ZOOM = 1;
export const COVER_MAX_ZOOM = 4;
type Size = { w: number; h: number };
type Pt = { x: number; y: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function dims(natural: Size, rotation: number) {
  const swap = rotation % 180 !== 0;
  return { rw: swap ? natural.h : natural.w, rh: swap ? natural.w : natural.h };
}

/** Pure rectangular crop math (exported for tests). Offsets are viewport px from centre. */
export function computeCoverCrop(natural: Size, vw: number, vh: number, zoom: number, rotation: number, offset: Pt): CoverCrop {
  const { rw, rh } = dims(natural, rotation);
  const scale = Math.max(vw / rw, vh / rh) * zoom;
  const cw = vw / scale;
  const ch = vh / scale;
  const x = clamp(rw / 2 - offset.x / scale - cw / 2, 0, Math.max(0, rw - cw));
  const y = clamp(rh / 2 - offset.y / scale - ch / 2, 0, Math.max(0, rh - ch));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(cw), height: Math.round(ch), rotation };
}

export function clampCoverOffset(natural: Size, vw: number, vh: number, zoom: number, rotation: number, o: Pt): Pt {
  const { rw, rh } = dims(natural, rotation);
  const scale = Math.max(vw / rw, vh / rh) * zoom;
  const maxX = Math.max(0, (rw * scale - vw) / 2);
  const maxY = Math.max(0, (rh * scale - vh) / 2);
  return { x: clamp(o.x, -maxX, maxX), y: clamp(o.y, -maxY, maxY) };
}

/** Rectangular crop interaction: drag/pinch/wheel/keyboard, 90-degree rotate, reset. */
export function useCoverCrop(vw: number, vh: number) {
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoomRaw] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const fit = useCallback((z: number, r: number, o: Pt) => (natural ? clampCoverOffset(natural, vw, vh, z, r, o) : o), [natural, vw, vh]);

  const setZoom = useCallback((z: number) => {
    const nz = clamp(z, COVER_MIN_ZOOM, COVER_MAX_ZOOM);
    setZoomRaw(nz);
    setOffset((o) => fit(nz, rotation, o));
  }, [fit, rotation]);

  const rotate = useCallback(() => {
    const nr = (rotation + 90) % 360;
    setRotation(nr);
    setOffset((o) => fit(zoom, nr, o));
  }, [rotation, zoom, fit]);

  const reset = useCallback(() => { setZoomRaw(1); setRotation(0); setOffset({ x: 0, y: 0 }); }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoom(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / (pinch.current.dist || 1)));
      return;
    }
    setOffset(fit(zoom, rotation, { x: offset.x + next.x - prev.x, y: offset.y + next.y - prev.y }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = e.shiftKey ? 20 : 6;
    const m: Record<string, [number, number]> = { ArrowLeft: [s, 0], ArrowRight: [-s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] };
    if (m[e.key]) { e.preventDefault(); setOffset(fit(zoom, rotation, { x: offset.x + m[e.key][0], y: offset.y + m[e.key][1] })); }
    else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.1);
    else if (e.key === '-') setZoom(zoom - 0.1);
  };

  const imageStyle = useMemo<React.CSSProperties>(() => {
    if (!natural) return { visibility: 'hidden' };
    const { rw, rh } = dims(natural, rotation);
    const s = Math.max(vw / rw, vh / rh) * zoom;
    return {
      position: 'absolute', left: '50%', top: '50%', width: natural.w * s, height: natural.h * s, maxWidth: 'none',
      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
      userSelect: 'none', pointerEvents: 'none',
    };
  }, [natural, vw, vh, zoom, rotation, offset]);

  const crop = useMemo(() => (natural ? computeCoverCrop(natural, vw, vh, zoom, rotation, offset) : null), [natural, vw, vh, zoom, rotation, offset]);

  return {
    natural, setNatural, zoom, setZoom, rotation, rotate, reset, crop, imageStyle,
    isDirty: zoom !== 1 || rotation !== 0 || offset.x !== 0 || offset.y !== 0,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel, onKeyDown },
  };
}