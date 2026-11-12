import React, { useCallback, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

/**
 * Desktop Reels volume control: speaker icon always visible (no pill background).
 * The level track expands only while the pointer is over the control (or while
 * dragging / keyboard-focused). Mobile callers should not mount this at all.
 */
export default function ReelVolumeSlider({
  volume,
  muted,
  onChange,
  onToggleMute,
  className = '',
  labels = { volume: 'Volume', mute: 'Mute', unmute: 'Unmute' },
}: {
  volume: number;
  muted: boolean;
  /** 0..1 — 0 means muted. */
  onChange: (v: number) => void;
  onToggleMute: () => void;
  className?: string;
  labels?: { volume: string; mute: string; unmute: string };
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const level = muted ? 0 : Math.min(1, Math.max(0, volume));
  const pct = Math.round(level * 100);
  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;
  const showTrack = hovering || dragging || focused;

  const setFromX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    const v = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(Math.round(v * 100) / 100);
  }, [onChange]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (draggingRef.current) setFromX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    draggingRef.current = false;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = level + 0.05;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = level - 0.05;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    if (next === null) return;
    // Keep the reels hotkeys (Up/Down = next/prev reel) from also firing.
    e.preventDefault();
    e.stopPropagation();
    onChange(Math.round(Math.min(1, Math.max(0, next)) * 100) / 100);
  };

  return (
    <div
      data-reel-volume
      className={`flex h-10 items-center gap-1.5 select-none touch-none ${className}`}
      onClick={stop}
      onDoubleClick={stop}
      onPointerDown={stop}
      onTouchStart={stop}
      onTouchEnd={stop}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovering(true); }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !draggingRef.current) setHovering(false);
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        title={level === 0 ? labels.unmute : labels.mute}
        aria-label={level === 0 ? labels.unmute : labels.mute}
        aria-pressed={level > 0}
        className="flex h-9 w-9 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white shadow-none outline-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] transition-transform hover:scale-110 hover:bg-transparent active:scale-95 focus:bg-transparent focus-visible:outline-none"
      >
        <Icon size={22} strokeWidth={2.4} className={level === 0 ? 'text-white/85' : 'text-white'} />
      </button>
      <div
        className={`overflow-hidden transition-[width,opacity] duration-200 motion-reduce:transition-none ${
          showTrack ? 'w-[108px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div
          ref={trackRef}
          role="slider"
          tabIndex={showTrack ? 0 : -1}
          aria-label={labels.volume}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct}%`}
          aria-hidden={!showTrack}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="relative h-8 w-[108px] cursor-pointer outline-none group focus-visible:[&>span:last-child]:ring-2 focus-visible:[&>span:last-child]:ring-white/60"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/35 shadow-[0_0_2px_rgba(0,0,0,0.5)]" aria-hidden="true" />
          <span
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-transform group-active:scale-125"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
