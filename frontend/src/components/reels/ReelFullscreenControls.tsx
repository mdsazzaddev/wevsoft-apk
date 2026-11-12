import React, { useEffect, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Minimize2,
  RotateCcw, RotateCw,
} from 'lucide-react';

export function formatReelTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function enterReelFullscreen(node: HTMLElement) {
  const anyNode = node as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  if (isIOSDevice()) throw new Error('ios-css-fs');
  if (node.requestFullscreen) {
    try {
      await node.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    } catch {
      await node.requestFullscreen();
    }
    return;
  }
  if (anyNode.webkitRequestFullscreen) {
    await anyNode.webkitRequestFullscreen();
    return;
  }
  if (anyNode.msRequestFullscreen) {
    await anyNode.msRequestFullscreen();
    return;
  }
  throw new Error('no-fullscreen');
}

export async function exitReelFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  if (getFullscreenElement()) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
  }
}

export default function ReelFullscreenControls({
  visible,
  playing,
  current,
  duration,
  volume,
  muted,
  title,
  creator,
  onTogglePlay,
  onSeekBy,
  onSeekRatio,
  onVolume,
  onToggleMute,
  onExit,
}: {
  visible: boolean;
  playing: boolean;
  current: number;
  duration: number;
  volume: number;
  muted: boolean;
  title: string;
  creator: string;
  onTogglePlay: () => void;
  onSeekBy: (delta: number) => void;
  onSeekRatio: (ratio: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onExit: () => void;
}) {
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = React.useRef(false);
  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  const onScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    onSeekRatio(ratio);
  };

  const startScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    scrubbingRef.current = true;
    setScrubbing(true);
    onScrub(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const moveScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    if (e.pointerType === 'mouse' && (e.buttons & 1) !== 1) return;
    onScrub(e);
  };

  const endScrub = () => {
    scrubbingRef.current = false;
    setScrubbing(false);
  };

  return (
    <div
      className={`absolute inset-0 z-[60] transition-opacity duration-300 ${
        visible ? 'opacity-100 pointer-events-none' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 pt-[max(12px,env(safe-area-inset-top))] pb-16 px-4 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white text-[15px] font-semibold truncate drop-shadow">{title || 'Reel'}</p>
            {creator ? (
              <p className="text-white/75 text-[13px] truncate mt-0.5">{creator}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExit}
            title="Exit fullscreen"
            aria-label="Exit fullscreen"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 border border-white/15 text-white"
          >
            <Minimize2 size={18} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-14 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}
      >
        <div
          data-reel-scrub
          role="slider"
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="h-6 flex items-center cursor-pointer select-none touch-none group mb-1.5"
          onPointerDown={startScrub}
          onPointerMove={moveScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onLostPointerCapture={endScrub}
        >
          <div className="w-full h-[3px] group-hover:h-[6px] rounded-full bg-white/25 transition-[height] duration-150">
            <div className="relative h-full rounded-full bg-[#f1f1f1]" style={{ width: `${percent}%` }}>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-white">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => onSeekBy(-10)}
            aria-label="Rewind 10 seconds"
            title="Rewind 10 seconds"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <RotateCcw size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => onSeekBy(10)}
            aria-label="Forward 10 seconds"
            title="Forward 10 seconds"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <RotateCw size={18} strokeWidth={2.2} />
          </button>

          <div className="flex items-center gap-1.5 min-w-0 group/vol">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 group-hover/vol:w-20 md:w-20 h-1 accent-white cursor-pointer transition-[width] duration-200"
            />
          </div>

          <span className="text-[12px] font-semibold tabular-nums text-white/90 ml-1">
            {formatReelTime(current)} / {formatReelTime(duration)}
          </span>

          <span className="flex-1" />

          <button
            type="button"
            onClick={onExit}
            aria-label="Exit fullscreen"
            title="Exit fullscreen"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <Minimize2 size={18} strokeWidth={2.3} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useNativeFullscreen(targetRef: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      const el = getFullscreenElement();
      setOn(!!el && (!targetRef.current || el === targetRef.current));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, [targetRef]);

  return on;
}
