import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import StorySlideCanvas from '../render/StorySlideCanvas';
import { slideDuration } from '../model/timing';
import type { Slide } from '../model/types';

export function Modal({ title, onClose, children, width = 'max-w-md' }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', k, true);
    return () => {
      window.removeEventListener('keydown', k, true);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] p-5 text-[color:var(--ss-text)] shadow-2xl outline-none`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl/⌘ + Z', 'Undo'],
  ['Ctrl/⌘ + Shift + Z  or  Ctrl + Y', 'Redo'],
  ['Space', 'Play / pause the timeline'],
  ['T', 'Add text to the current slide'],
  ['Ctrl/⌘ + D', 'Duplicate the selected layer (or slide)'],
  ['Delete / Backspace', 'Delete the selected layer (or slide)'],
  ['Arrow keys', 'Nudge the selected layer 1px (Shift = 10px)'],
  ['[  and  ]', 'Previous / next slide'],
  ['Esc', 'Deselect layer'],
  ['Alt (while dragging)', 'Disable snapping'],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <ul className="divide-y divide-[color:var(--ss-border)]">
        {SHORTCUTS.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-4 py-2 text-[13px]">
            <span>{v}</span>
            <kbd className="whitespace-nowrap rounded-md border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-2 py-0.5 text-[11.5px] font-medium">{k}</kbd>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-[color:var(--ss-muted)]">Your project is saved automatically on this device and recovered if the page is interrupted.</p>
    </Modal>
  );
}

export function ConfirmDialog({ title, body, confirm, danger, onConfirm, onCancel, extra }: { title: string; body: string; confirm: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; extra?: { label: string; run: () => void } }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-[13px] leading-snug text-[color:var(--ss-muted)]">{body}</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-[color:var(--ss-border)] px-4 text-[13px] font-medium hover:bg-[color:var(--ss-hover)]">Cancel</button>
        {extra ? <button type="button" onClick={extra.run} className="h-9 rounded-lg border border-[color:var(--ss-border)] px-4 text-[13px] font-medium hover:bg-[color:var(--ss-hover)]">{extra.label}</button> : null}
        <button type="button" onClick={onConfirm} data-testid="ss-confirm" className={`h-9 rounded-lg px-4 text-[13px] font-semibold text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[color:var(--ss-accent)] hover:brightness-110'}`}>{confirm}</button>
      </div>
    </Modal>
  );
}

/** Full-screen playback of the project exactly as the shared renderer draws it. */
export function PreviewOverlay({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [p, setP] = useState(0);
  const slide = slides[i];
  const dur = slide ? slideDuration(slide) : 1;

  const pRef = useRef(0);
  useEffect(() => {
    pRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setP(0);
  }, [i]);

  useEffect(() => {
    if (paused || !slide) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      pRef.current += dt;
      if (pRef.current >= dur) {
        if (i < slides.length - 1) {
          setI(i + 1);
        } else {
          setP(dur);
          setPaused(true);
        }
        return;
      }
      setP(pRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, slide, dur, slides.length, i]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((c) => Math.min(slides.length - 1, c + 1));
      if (e.key === 'ArrowLeft') setI((c) => Math.max(0, c - 1));
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, slides.length]);

  if (!slide) return null;
  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Story preview" data-testid="ss-preview">
      <div className="relative h-full max-h-[min(100%,calc((100vw-2rem)*16/9))] aspect-[9/16] overflow-hidden rounded-2xl shadow-2xl">
        <StorySlideCanvas slide={slide} className="h-full w-full" playing={!paused} time={p} muted={false} />
        <div className="absolute left-3 right-3 top-3 flex gap-1" aria-hidden>
          {slides.map((sl, k) => (
            <div key={sl.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
              <div className="h-full bg-white" style={{ width: `${k < i ? 100 : k === i ? Math.min(100, (p / dur) * 100) : 0}%` }} />
            </div>
          ))}
        </div>
        <button type="button" aria-label="Previous slide" className="absolute inset-y-0 left-0 w-1/3" onClick={() => setI((c) => Math.max(0, c - 1))} />
        <button type="button" aria-label="Next slide" className="absolute inset-y-0 right-0 w-1/3" onClick={() => setI((c) => Math.min(slides.length - 1, c + 1))} />
      </div>
      <div className="absolute right-4 top-4 flex gap-2">
        <button type="button" aria-label={paused ? 'Play' : 'Pause'} onClick={() => setPaused((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">{paused ? <Play size={18} /> : <Pause size={18} />}</button>
        <button type="button" aria-label="Close preview" onClick={onClose} autoFocus className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><X size={18} /></button>
      </div>
    </div>
  );
}
