import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crop, Loader2, RefreshCw, RotateCcw, RotateCw, SlidersHorizontal, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCoverCrop, COVER_MAX_ZOOM, COVER_MIN_ZOOM } from './useCoverCrop';
import { COVER_ASPECT, COVER_DESKTOP_ASPECT, DEFAULT_COVER_ADJUSTMENTS, coverFilterCss, isDefaultCoverAdjustments, type CoverAdjustments } from './coverApi';
import type { CoverSubmitPayload, CoverUploadStatus } from './useCoverUpload';

type Props = {
  file: File;
  status: CoverUploadStatus;
  progress: number;
  error: string | null;
  onSubmit: (p: CoverSubmitPayload) => void;
  onCancelUpload: () => void;
  onRetry: () => void;
  onClose: () => void;
};

/** Fraction of the 16:9 image visible in the desktop (820:312) header band. */
const DESKTOP_BAND = COVER_ASPECT / COVER_DESKTOP_ASPECT;

export default function CoverEditorModal({ file, status, progress, error, onSubmit, onCancelUpload, onRetry, onClose }: Props) {
  const [vw] = useState(() => Math.round(Math.min(640, (typeof window !== 'undefined' ? window.innerWidth : 640) - 32)));
  const vh = Math.round(vw / COVER_ASPECT);
  const crop = useCoverCrop(vw, vh);
  const [src, setSrc] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [tab, setTab] = useState<'crop' | 'adjust'>('crop');
  const [adj, setAdj] = useState<CoverAdjustments>(DEFAULT_COVER_ADJUSTMENTS);
  const uploading = status === 'uploading';
  const filterCss = coverFilterCss(adj);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle: created and revoked with the file, state follows the resource
    setSrc(url); setPreviewError(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !uploading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [uploading, onClose]);

  // Always send the original; the server crops + adjusts once (no double crop).
  const save = () => onSubmit({
    file,
    crop: previewError ? null : crop.crop,
    adjustments: isDefaultCoverAdjustments(adj) ? null : adj,
  });

  const slider = (label: string, key: keyof CoverAdjustments, min: number, max: number) => (
    <label className="block">
      <span className="flex justify-between text-xs font-semibold text-muted-foreground mb-1"><span>{label}</span><span>{adj[key]}%</span></span>
      <input type="range" min={min} max={max} value={adj[key]} disabled={uploading}
        onChange={(e) => setAdj({ ...adj, [key]: Number(e.target.value) })} className="w-full accent-primary" />
    </label>
  );

  const bandPad = ((1 - DESKTOP_BAND) / 2) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-label="Edit cover photo">
      <div className="w-full sm:w-auto max-h-[95vh] overflow-y-auto bg-card text-foreground rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-lg">Edit cover photo</h2>
          <button type="button" onClick={onClose} disabled={uploading} className="p-2 rounded-full hover:bg-muted disabled:opacity-40" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-lg bg-muted touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            style={{ width: vw, height: vh }}
            tabIndex={0}
            aria-label="Drag to reposition, use the slider or pinch to zoom"
            {...(uploading ? {} : crop.handlers)}
          >
            {src && !previewError && (
              <img src={src} alt="" draggable={false}
                onLoad={(e) => crop.setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setPreviewError(true)}
                style={{ ...crop.imageStyle, filter: filterCss || undefined }} />
            )}
            {previewError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
                Preview isn't available for this format. You can still upload it; it will be centre-cropped.
              </div>
            )}
            {/* Desktop header shows the middle band; mobile shows the full 16:9 frame. */}
            <div className="pointer-events-none absolute inset-x-0 border-y border-dashed border-white/80" style={{ top: `${bandPad}%`, bottom: `${bandPad}%` }} />
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/25" style={{ height: `${bandPad}%` }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/25" style={{ height: `${bandPad}%` }} />
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                <Loader2 className="animate-spin" size={28} />
                <span className="mt-2 text-sm font-bold">{progress}%</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2 self-start">Dashed lines: area visible on desktop. The full frame is shown on phones.</p>

          <div className="flex w-full gap-1 rounded-xl bg-muted p-1">
            <button type="button" onClick={() => setTab('crop')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${tab === 'crop' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Crop size={13} /> Crop</button>
            <button type="button" onClick={() => setTab('adjust')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${tab === 'adjust' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><SlidersHorizontal size={13} /> Adjust</button>
          </div>

          {tab === 'crop' ? (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" disabled={uploading} onClick={() => crop.setZoom(crop.zoom - 0.2)} aria-label="Zoom out" className="p-1.5 rounded-full hover:bg-muted"><ZoomOut size={16} /></button>
                <input type="range" aria-label="Zoom" min={COVER_MIN_ZOOM} max={COVER_MAX_ZOOM} step={0.01} value={crop.zoom} disabled={uploading}
                  onChange={(e) => crop.setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
                <button type="button" disabled={uploading} onClick={() => crop.setZoom(crop.zoom + 0.2)} aria-label="Zoom in" className="p-1.5 rounded-full hover:bg-muted"><ZoomIn size={16} /></button>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={uploading} onClick={crop.rotate} className="flex-1 py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1 hover:bg-muted"><RotateCw size={14} /> Rotate</button>
                <button type="button" disabled={uploading || (!crop.isDirty && isDefaultCoverAdjustments(adj))} onClick={() => { crop.reset(); setAdj(DEFAULT_COVER_ADJUSTMENTS); }} className="flex-1 py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1 hover:bg-muted disabled:opacity-40"><RotateCcw size={14} /> Reset</button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {slider('Brightness', 'brightness', 50, 150)}
              {slider('Contrast', 'contrast', 50, 150)}
              {slider('Saturation', 'saturation', 0, 200)}
            </div>
          )}

          {status === 'error' && error && (
            <div className="w-full rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-2 flex items-center justify-between gap-2" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onRetry} className="flex items-center gap-1 font-bold"><RefreshCw size={14} /> Retry</button>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border">
          {uploading
            ? <button type="button" onClick={onCancelUpload} className="flex-1 py-2.5 rounded-xl border border-border font-bold hover:bg-muted">Cancel upload</button>
            : <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border font-bold hover:bg-muted">Cancel</button>}
          <button type="button" onClick={save} disabled={uploading || (!crop.natural && !previewError)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1 disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}