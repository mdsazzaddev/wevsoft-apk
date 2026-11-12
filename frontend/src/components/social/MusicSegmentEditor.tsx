import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  buildWaveformBars,
  formatMusicClock,
  normalizeMusicSegment,
  parseMusicClock,
  validateMusicSegment,
  type MusicSegmentLimits,
  DEFAULT_POST_MUSIC_MAX_SEC,
  DEFAULT_POST_MUSIC_MIN_SEC,
} from '../../lib/musicSegment';

export type SegmentEditorTrack = {
  id: string;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl: string;
  duration: number;
};

export type SegmentEditorValue = {
  startTime: number;
  endTime: number;
  volume: number;
  originalAudioMuted: boolean;
};

type Props = {
  track: SegmentEditorTrack;
  initial: SegmentEditorValue;
  limits?: MusicSegmentLimits;
  onBack: () => void;
  onCancel: () => void;
  onSave: (value: SegmentEditorValue) => void;
  onRemove?: () => void;
};

type DragKind = 'start' | 'end' | 'playhead' | null;

export default function MusicSegmentEditor({
  track,
  initial,
  limits,
  onBack,
  onCancel,
  onSave,
  onRemove,
}: Props) {
  const clipLimits = limits || {
    minSec: DEFAULT_POST_MUSIC_MIN_SEC,
    maxSec: DEFAULT_POST_MUSIC_MAX_SEC,
  };
  const trackDur = Math.max(1, Number(track.duration) || 30);
  const longForm = trackDur >= 3600;

  const seeded = useMemo(
    () =>
      normalizeMusicSegment(
        initial.startTime,
        initial.endTime,
        trackDur,
        clipLimits,
      ),
     
    [track.id],
  );

  const [startTime, setStartTime] = useState(seeded.startTime);
  const [endTime, setEndTime] = useState(seeded.endTime);
  const [volume, setVolume] = useState(initial.volume);
  const [originalMuted, setOriginalMuted] = useState(initial.originalAudioMuted);
  const [currentTime, setCurrentTime] = useState(seeded.startTime);
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startInput, setStartInput] = useState(formatMusicClock(seeded.startTime, longForm));
  const [endInput, setEndInput] = useState(formatMusicClock(seeded.endTime, longForm));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragKind>(null);
  const bars = useMemo(() => buildWaveformBars(`${track.id}:${track.audioUrl}`, 72), [track.id, track.audioUrl]);

  const selectedLen = Math.max(0, endTime - startTime);
  const validationError = validateMusicSegment(startTime, endTime, trackDur, clipLimits);
  const canSave = !validationError;

  const applySegment = useCallback(
    (nextStart: number, nextEnd: number) => {
      const n = normalizeMusicSegment(nextStart, nextEnd, trackDur, clipLimits);
      setStartTime(n.startTime);
      setEndTime(n.endTime);
      setStartInput(formatMusicClock(n.startTime, longForm));
      setEndInput(formatMusicClock(n.endTime, longForm));
      setCurrentTime((t) => Math.min(Math.max(t, n.startTime), n.endTime));
      const audio = audioRef.current;
      if (audio) {
        if (audio.currentTime < n.startTime || audio.currentTime > n.endTime) {
          audio.currentTime = n.startTime;
        }
      }
    },
    [clipLimits, longForm, trackDur],
  );

  const seekTo = useCallback((t: number) => {
    const clamped = Math.min(endTime, Math.max(startTime, t));
    const audio = audioRef.current;
    if (audio) audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [endTime, startTime]);

  const playFromStart = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      setLoadError('Music preview is unavailable right now.');
      return;
    }
    try {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
      await audio.play();
      setPlaying(true);
      setLoadError(null);
    } catch {
      setLoadError('Music preview is unavailable right now.');
      setPlaying(false);
    }
  }, [startTime]);

  useEffect(() => {
    const audio = new Audio(track.audioUrl);
    audio.preload = 'auto';
    audio.volume = Math.min(1, Math.max(0, volume));
    audioRef.current = audio;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoadError(null);
    setPlaying(false);

    const onError = () => setLoadError('Unable to load this music. Please try again.');
    const onEnded = () => {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    const tryAutoplay = () => {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
      void audio
        .play()
        .then(() => {
          setPlaying(true);
          setLoadError(null);
        })
        .catch(() => {
          // Autoplay may be blocked until a gesture; restart button still works.
          setPlaying(false);
        });
    };

    if (audio.readyState >= 2) tryAutoplay();
    else audio.addEventListener('canplay', tryAutoplay, { once: true });

    return () => {
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplay', tryAutoplay);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // Recreate only when track changes
     
  }, [track.audioUrl, track.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = Math.min(1, Math.max(0, volume));
  }, [volume]);

  // Loop within the selected segment; keep auto-preview running.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.currentTime >= endTime - 0.04) {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
        if (audio.paused) {
          void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
      } else {
        setCurrentTime(audio.currentTime);
      }
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [startTime, endTime]);

  // When the user changes the segment, restart auto-preview from the new start.
  const segmentKeyRef = useRef(`${seeded.startTime}:${seeded.endTime}`);
  useEffect(() => {
    const key = `${startTime.toFixed(2)}:${endTime.toFixed(2)}`;
    if (segmentKeyRef.current === key) return;
    segmentKeyRef.current = key;
    if (dragRef.current) return; // wait until drag ends
    void playFromStart();
  }, [startTime, endTime, playFromStart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 1;
        seekTo(Math.max(startTime, currentTime - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 1;
        seekTo(Math.min(endTime, currentTime + step));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startTime, endTime, currentTime, seekTo]);

  const restartSegment = () => {
    void playFromStart();
  };

  const timeFromClientX = (clientX: number) => {
    const rail = railRef.current;
    if (!rail) return 0;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * trackDur;
  };

  const onPointerDown = (kind: DragKind) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
    dragRef.current = kind;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
    if (kind === 'playhead') seekTo(timeFromClientX(e.clientX));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const kind = dragRef.current;
      if (!kind) return;
      const t = timeFromClientX(e.clientX);
      if (kind === 'start') applySegment(t, endTime);
      else if (kind === 'end') applySegment(startTime, t);
      else if (kind === 'playhead') seekTo(t);
    };
    const onUp = () => {
      const wasDragging = dragRef.current;
      dragRef.current = null;
      if (wasDragging === 'start' || wasDragging === 'end') {
        void playFromStart();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
     
  }, [startTime, endTime, applySegment, playFromStart, seekTo]);

  const startPct = (startTime / trackDur) * 100;
  const endPct = (endTime / trackDur) * 100;
  const playPct = (currentTime / trackDur) * 100;

  const commitStartInput = () => {
    const parsed = parseMusicClock(startInput);
    if (parsed == null) {
      setStartInput(formatMusicClock(startTime, longForm));
      return;
    }
    applySegment(parsed, endTime);
  };

  const commitEndInput = () => {
    const parsed = parseMusicClock(endInput);
    if (parsed == null) {
      setEndInput(formatMusicClock(endTime, longForm));
      return;
    }
    applySegment(startTime, parsed);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            onBack();
          }}
          className="text-sm font-bold text-primary hover:underline shrink-0 pt-0.5"
        >
          ← Back
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold leading-tight">Add Music</h2>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Choose the part of the song you want to use
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 composer-scrollbar">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted shrink-0 ring-1 ring-border">
            {track.coverImage ? (
              <img src={track.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                Music
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-sm sm:text-base truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist || 'Unknown artist'}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
              {formatMusicClock(trackDur, longForm)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Select music segment
          </p>
          <div
            ref={railRef}
            className="relative h-16 sm:h-20 rounded-xl bg-muted/50 border border-border overflow-hidden touch-none select-none"
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset?.bar) return;
              dragRef.current = 'playhead';
              seekTo(timeFromClientX(e.clientX));
            }}
            role="slider"
            aria-label="Music segment waveform"
            aria-valuemin={0}
            aria-valuemax={trackDur}
            aria-valuenow={currentTime}
          >
            <div className="absolute inset-0 flex items-end gap-[2px] px-1 py-1.5 pointer-events-none">
              {bars.map((h, i) => {
                const t = (i / bars.length) * trackDur;
                const inRange = t >= startTime && t <= endTime;
                return (
                  <div
                    key={i}
                    data-bar="1"
                    className={`flex-1 rounded-sm ${inRange ? 'bg-primary/80' : 'bg-muted-foreground/25'}`}
                    style={{ height: `${h * 100}%` }}
                  />
                );
              })}
            </div>

            <div
              className="absolute inset-y-0 bg-primary/15 pointer-events-none"
              style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
            />

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none z-[2]"
              style={{ left: `${playPct}%` }}
            />

            <button
              type="button"
              aria-label="Start handle"
              onPointerDown={onPointerDown('start')}
              className="absolute top-0 bottom-0 z-[3] w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize"
              style={{ left: `${startPct}%` }}
            >
              <span className="h-10 w-1.5 rounded-full bg-primary shadow-md ring-2 ring-background" />
            </button>
            <button
              type="button"
              aria-label="End handle"
              onPointerDown={onPointerDown('end')}
              className="absolute top-0 bottom-0 z-[3] w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize"
              style={{ left: `${endPct}%` }}
            >
              <span className="h-10 w-1.5 rounded-full bg-primary shadow-md ring-2 ring-background" />
            </button>
          </div>

          <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
            <span>{formatMusicClock(startTime, longForm)}</span>
            <span>{formatMusicClock(endTime, longForm)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Start</span>
            <input
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={commitStartInput}
              onKeyDown={(e) => e.key === 'Enter' && commitStartInput()}
              inputMode="numeric"
              aria-label="Start time"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">End</span>
            <input
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={commitEndInput}
              onKeyDown={(e) => e.key === 'Enter' && commitEndInput()}
              inputMode="numeric"
              aria-label="End time"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            Selected:{' '}
            <span className="text-foreground tabular-nums">{formatMusicClock(selectedLen, longForm)}</span>
            <span className="text-muted-foreground">
              {' '}
              · max {Math.round(clipLimits.maxSec)}s
            </span>
            {playing && (
              <span className="ml-1.5 text-primary font-bold">· Playing</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => restartSegment()}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground"
            aria-label="Restart segment"
            title="Restart segment"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="text-[11px] font-semibold tabular-nums text-muted-foreground flex items-center gap-2">
          <span>{formatMusicClock(currentTime, longForm)}</span>
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/80 rounded-full"
              style={{
                width: `${selectedLen > 0 ? ((currentTime - startTime) / selectedLen) * 100 : 0}%`,
              }}
            />
          </div>
          <span>{formatMusicClock(endTime, longForm)}</span>
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Music volume · {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full mt-2"
            aria-label="Music volume"
          />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5 text-sm">
          <span className="font-semibold">Mute original clip audio</span>
          <input
            type="checkbox"
            checked={originalMuted}
            onChange={(e) => setOriginalMuted(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </label>

        {validationError && (
          <p className="text-xs font-semibold text-rose-500" role="alert">
            {validationError}
          </p>
        )}
        {loadError && (
          <p className="text-xs font-semibold text-rose-500" role="alert">
            {loadError}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 flex flex-wrap items-center gap-2">
        {onRemove && (
          <button
            type="button"
            onClick={() => {
              audioRef.current?.pause();
              onRemove();
            }}
            className="text-xs font-bold text-rose-500 hover:underline mr-auto"
          >
            Remove Music
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            onCancel();
          }}
          className="flex-1 min-w-[7rem] py-2.5 rounded-xl border border-border font-bold text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            audioRef.current?.pause();
            onSave({
              startTime,
              endTime,
              volume,
              originalAudioMuted: originalMuted,
            });
          }}
          className="flex-1 min-w-[7rem] py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40"
        >
          Save Music
        </button>
      </div>
    </div>
  );
}
