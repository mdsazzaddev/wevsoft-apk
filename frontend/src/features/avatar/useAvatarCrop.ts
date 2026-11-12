import { useCallback, useMemo, useRef, useState } from 'react';
import type { AvatarCrop } from './avatarApi';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

type Size = { w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pure crop math (exported for tests). Offsets are viewport px from centre. */
export function computeAvatarCrop(natural: Size, viewport: number, zoom: number, rotation: number, offset: { x: number; y: number }): AvatarCrop {
  const swap = rotation % 180 !== 0;
  const rw = swap ? natural.h : natural.w;
  const rh = swap ? natural.w : natural.h;
  const scale = (viewport / Math.min(rw, rh)) * zoom;
  const size = viewport / scale;
  const cx = rw / 2 - offset.x / scale;
  const cy = rh / 2 - offset.y / scale;
  const x = clamp(cx - size / 2, 0, Math.max(0, rw - size));
  const y = clamp(cy - size / 2, 0, Math.max(0, rh - size));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(size), height: Math.round(size), rotation };
}

export function clampOffset(natural: Size, viewport: number, zoom: number, rotation: number, o: { x: number; y: number }) {
  const swap = rotation % 180 !== 0;
  const rw = swap ? natural.h : natural.w;
  const rh = swap ? natural.w : natural.h;
  const scale = (viewport / Math.min(rw, rh)) * zoom;
  const maxX = Math.max(0, (rw * scale - viewport) / 2);
  const maxY = Math.max(0, (rh * scale - viewport) / 2);
  return { x: clamp(o.x, -maxX, maxX), y: clamp(o.y, -maxY, maxY) };
}

/**
 * Circular-crop interaction: drag (mouse/touch/pen via Pointer Events), pinch + wheel zoom,
 * 90-degree rotation, reset. Image always covers the circle.
 */
export function useAvatarCrop(viewport: number) {
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoomRaw] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const apply = useCallback(
    (z: number, r: number, o: { x: number; y: number }) => {
      if (!natural) return;
      setOffset(clampOffset(natural, viewport, z, r, o));
    },
    [natural, viewport],
  );

  const setZoom = useCallback(
    (z: number) => {
      const nz = clamp(z, MIN_ZOOM, MAX_ZOOM);
      setZoomRaw(nz);
      setOffset((o) => (natural ? clampOffset(natural, viewport, nz, rotation, o) : o));
    },
    [natural, viewport, rotation],
  );

  const rotate = useCallback(() => {
    const nr = (rotation + 90) % 360;
    setRotation(nr);
    apply(zoom, nr, offset);
  }, [rotation, zoom, offset, apply]);

  const reset = useCallback(() => {
    setZoomRaw(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(pinchStart.current.zoom * (dist / (pinchStart.current.dist || 1)));
      return;
    }
    apply(zoom, rotation, { x: offset.x + (next.x - prev.x), y: offset.y + (next.y - prev.y) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 6;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      apply(zoom, rotation, { x: offset.x + moves[e.key][0], y: offset.y + moves[e.key][1] });
    } else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.1);
    else if (e.key === '-') setZoom(zoom - 0.1);
  };

  /** Rendered size/transform for the preview <img>. */
  const imageStyle = useMemo<React.CSSProperties>(() => {
    if (!natural) return { visibility: 'hidden' };
    const swap = rotation % 180 !== 0;
    const base = viewport / Math.min(swap ? natural.h : natural.w, swap ? natural.w : natural.h);
    const s = base * zoom;
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: natural.w * s,
      height: natural.h * s,
      maxWidth: 'none',
      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
      userSelect: 'none',
      pointerEvents: 'none',
    };
  }, [natural, viewport, zoom, rotation, offset]);

  const crop = useMemo(() => (natural ? computeAvatarCrop(natural, viewport, zoom, rotation, offset) : null), [natural, viewport, zoom, rotation, offset]);

  return {
    natural,
    setNatural,
    zoom,
    setZoom,
    rotation,
    rotate,
    reset,
    crop,
    imageStyle,
    isDirty: zoom !== 1 || rotation !== 0 || offset.x !== 0 || offset.y !== 0,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel, onKeyDown },
  };
}
