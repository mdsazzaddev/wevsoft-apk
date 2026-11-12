import React, { useEffect, useRef } from 'react';
import type { ReelEditState } from '../../../lib/reelEditState';
import {
  cssFilterFromEdit,
  objectFitFromEdit,
  videoTransformFromEdit,
} from '../../../lib/reelEditState';
import ReelSafeAreaOverlay from './ReelSafeAreaOverlay';

type Props = {
  src: string | null;
  edit: ReelEditState;
  className?: string;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  /** When true, respect trim window while playing. */
  enforceTrim?: boolean;
};

/**
 * Phone-frame (mobile) or centered desktop preview.
 * Frame chrome is preview-only — not part of the export.
 */
export default function ReelPreviewFrame({ src, edit, className, onVideoRef, enforceTrim = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMobile = edit.previewDevice !== 'desktop';

  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  }, [onVideoRef, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = edit.speed || 1;
    el.volume = edit.muted ? 0 : edit.volume;
    el.muted = edit.muted || (edit.music?.originalAudioMuted ?? false);
  }, [edit.speed, edit.volume, edit.muted, edit.music?.originalAudioMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !enforceTrim) return;
    const onTime = () => {
      const start = edit.trimStart || 0;
      const end = edit.trimEnd;
      if (el.currentTime < start) el.currentTime = start;
      if (end != null && end > start && el.currentTime >= end) {
        el.currentTime = start;
        if (!el.loop) el.pause();
      }
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [edit.trimStart, edit.trimEnd, enforceTrim]);

  const filter = cssFilterFromEdit(edit);
  const transform = videoTransformFromEdit(edit);
  const objectFit = objectFitFromEdit(edit);
  const objectPosition = `${50 + edit.reframeX * 40}% ${50 + edit.reframeY * 40}%`;

  const frame = (
    <div
      className={`relative overflow-hidden bg-black aspect-[9/16] h-full max-h-full w-auto max-w-full mx-auto flex items-center justify-center shrink-0 ${
        isMobile
          ? 'rounded-[1.75rem] border-[3px] border-neutral-700 shadow-2xl'
          : 'rounded-2xl border border-border shadow-xl'
      }`}
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          playsInline
          loop
          controls={false}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            filter,
            transform,
            objectFit,
            objectPosition,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">No video</div>
      )}

      {/* Fake notch for mobile mockup */}
      {isMobile && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-24 h-4 rounded-full bg-neutral-900/90 pointer-events-none" />
      )}

      {/* Text overlays */}
      {edit.textOverlays.map((t) => (
        <div
          key={t.id}
          className="absolute z-10 max-w-[80%] px-2 py-1 rounded-md pointer-events-none"
          style={{
            left: `${t.x * 100}%`,
            top: `${t.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: t.fontSize,
            color: t.color,
            background: t.bg,
            opacity: t.opacity,
            textAlign: t.align,
          }}
        >
          {t.text}
        </div>
      ))}

      {/* Stickers */}
      {edit.stickers.map((s) => (
        <div
          key={s.id}
          className="absolute z-10 pointer-events-none select-none"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
            fontSize: 28,
          }}
        >
          {s.emoji}
        </div>
      ))}

      {/* Vignette preview */}
      {(edit.adjustments.vignette || 0) > 0 && (
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{
            boxShadow: `inset 0 0 ${40 + edit.adjustments.vignette}px rgba(0,0,0,${0.15 + edit.adjustments.vignette / 200})`,
          }}
        />
      )}

      <ReelSafeAreaOverlay visible={edit.showSafeArea} compact={!isMobile} />
    </div>
  );

  return (
    <div className={`flex items-center justify-center h-full w-full min-h-0 overflow-hidden ${className || ''}`}>
      {isMobile ? (
        <div className="relative h-full max-h-full flex items-center justify-center p-1">
          {frame}
        </div>
      ) : (
        <div className="h-full max-h-full flex flex-col items-center justify-center gap-1.5 p-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Desktop preview</p>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {frame}
          </div>
        </div>
      )}
    </div>
  );
}
