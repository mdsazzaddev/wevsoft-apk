import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Film, Play, Pause, Scissors } from 'lucide-react';
import {
  formatVideoTime,
  MIN_TRIM_DURATION_SEC,
} from '../../lib/video-trim';

interface VideoEditorModalProps {
  file: File;
  onClose: () => void;
  onSave: (trimStart: number, trimEnd: number) => void;
}

export default function VideoEditorModal({ file, onClose, onSave }: VideoEditorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const trimDuration = trimEnd - trimStart;
  const isTrimValid = trimDuration >= MIN_TRIM_DURATION_SEC && trimStart < trimEnd;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration);
    setTrimEnd(video.duration);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (isPlaying && video.currentTime >= trimEnd) {
      video.pause();
      setIsPlaying(false);
      video.currentTime = trimStart;
    }
  };

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleTrimStartChange = (val: number) => {
    const safe = Math.max(0, Math.min(val, trimEnd - 0.1));
    setTrimStart(safe);
    seekTo(safe);
  };

  const handleTrimEndChange = (val: number) => {
    const safe = Math.min(duration, Math.max(val, trimStart + 0.1));
    setTrimEnd(safe);
    seekTo(safe - 0.1);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      video.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSave = () => {
    if (!isTrimValid) return;
    onSave(trimStart, trimEnd);
  };

  const timelinePercent = (sec: number) => (duration ? (sec / duration) * 100 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-background rounded-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Film size={20} className="text-primary" />
            Trim Video
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 bg-neutral-950 relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border min-h-[220px]">
            {previewUrl && (
              <video
                ref={videoRef}
                src={previewUrl}
                className="max-h-[40vh] md:max-h-full max-w-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                playsInline
              />
            )}

            <button
              onClick={togglePlay}
              disabled={!duration}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-black/60 hover:bg-black/30 dark:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors disabled:opacity-50"
              title={isPlaying ? 'Pause' : 'Play selection'}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
          </div>

          <div className="w-full md:w-80 p-4 flex flex-col gap-5 overflow-y-auto shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Scissors size={14} /> Selection
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {formatVideoTime(trimStart)} - {formatVideoTime(trimEnd)}
                  {duration > 0 && ` / ${formatVideoTime(duration)}`}
                </span>
              </div>

              {duration > 0 && (
                <div className="relative h-3 bg-muted rounded-full mb-4 overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-primary/30 rounded-full"
                    style={{
                      left: `${timelinePercent(trimStart)}%`,
                      width: `${timelinePercent(trimEnd - trimStart)}%`,
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Start</label>
                    <span className="text-xs font-mono">{formatVideoTime(trimStart)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                    disabled={!duration}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">End</label>
                    <span className="text-xs font-mono">{formatVideoTime(trimEnd)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                    disabled={!duration}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {!isTrimValid && duration > 0 && (
                <p className="text-xs text-red-500 mt-2">Selection must be at least {MIN_TRIM_DURATION_SEC} second.</p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              Drag start/end handles to trim. Play previews only the selected range.
            </p>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-background border border-border rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isTrimValid || !duration}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={18} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
