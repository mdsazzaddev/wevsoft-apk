import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, RefreshCw, RotateCcw, RotateCw, SlidersHorizontal, Crop, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useAvatarCrop, MAX_ZOOM, MIN_ZOOM } from './useAvatarCrop';
import { cropToBlob } from './cropToBlob';
import {
  AVATAR_FILTER_PRESETS,
  DEFAULT_ADJUSTMENTS,
  avatarFilterCss,
  isDefaultAdjustments,
  type AvatarAdjustments,
} from './avatarFilters';
import type { AvatarPostPrivacy } from './avatarApi';
import type { AvatarSubmitPayload, AvatarUploadStatus } from './useAvatarUpload';

const VIEWPORT = 280;

type Props = {
  file: File;
  status: AvatarUploadStatus;
  progress: number;
  error: string | null;
  frameCss?: string;
  onSubmit: (payload: AvatarSubmitPayload) => void;
  onCancelUpload: () => void;
  onRetry: () => void;
  onClose: () => void;
};

export default function AvatarEditorModal({ file, status, progress, error, frameCss = '', onSubmit, onCancelUpload, onRetry, onClose }: Props) {
  const [src, setSrc] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [tab, setTab] = useState<'crop' | 'filters'>('crop');
  const [adj, setAdj] = useState<AvatarAdjustments>(DEFAULT_ADJUSTMENTS);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [privacy, setPrivacy] = useState<AvatarPostPrivacy>('friends');
  const [caption, setCaption] = useState('');
  const [openFramePrompt, setOpenFramePrompt] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const crop = useAvatarCrop(VIEWPORT);
  const uploading = status === 'uploading';
  const busy = uploading || preparing;
  const filterCss = avatarFilterCss(adj);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle: created and revoked with the file, state follows the resource
    setSrc(url);
    setPreviewError(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const save = async () => {
    const common = { shareToFeed, privacy, caption: caption.trim() || undefined, openFramePrompt };
    if (previewError || !imgRef.current || !crop.crop) {
      // Browser can't decode (e.g. HEIC): send original, server centre-crops.
      onSubmit({ ...common, blob: file, fileName: file.name, crop: null });
      return;
    }
    if (isDefaultAdjustments(adj)) {
      // No filter: send the original + crop so sharp crops once at full quality.
      onSubmit({ ...common, blob: file, fileName: file.name, crop: crop.crop });
      return;
    }
    setPreparing(true);
    try {
      const blob = await cropToBlob(imgRef.current, crop.crop, filterCss);
      onSubmit({ ...common, blob, fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg', crop: null });
    } finally {
      setPreparing(false);
    }
  };

  const slider = (label: string, key: 'brightness' | 'contrast' | 'saturation', min: number, max: number) => (
    <label className="block">
      <span className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
        <span>{label}</span><span>{adj[key]}%</span>
      </span>
      <input type="range" min={min} max={max} value={adj[key]} disabled={busy}
        onChange={(e) => setAdj({ ...adj, [key]: Number(e.target.value) })} className="w-full accent-primary" />
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-label="Edit profile picture">
      <div className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto bg-card text-foreground rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-lg">Edit profile picture</h2>
          <button type="button" onClick={onClose} disabled={busy} className="p-2 rounded-full hover:bg-muted disabled:opacity-40" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-full bg-muted touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            tabIndex={0}
            aria-label="Drag to reposition, use the slider or pinch to zoom"
            {...(busy ? {} : crop.handlers)}
          >
            {src && !previewError && (
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={(e) => crop.setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setPreviewError(true)}
                style={{ ...crop.imageStyle, filter: filterCss }}
              />
            )}
            {previewError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
                Preview isn't available for this format. You can still upload it; it will be centre-cropped.
              </div>
            )}
            <div className={`pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 ${frameCss}`} />
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                <Loader2 className="animate-spin" size={28} />
                <span className="mt-2 text-sm font-bold">{progress}%</span>
              </div>
            )}
          </div>

          <div className="flex w-full gap-1 rounded-xl bg-muted p-1">
            <button type="button" onClick={() => setTab('crop')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${tab === 'crop' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Crop size={13} /> Crop</button>
            <button type="button" onClick={() => setTab('filters')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${tab === 'filters' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><SlidersHorizontal size={13} /> Filters</button>
          </div>

          {tab === 'crop' ? (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" disabled={busy} onClick={() => crop.setZoom(crop.zoom - 0.2)} aria-label="Zoom out" className="p-1.5 rounded-full hover:bg-muted"><ZoomOut size={16} /></button>
                <input type="range" aria-label="Zoom" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={crop.zoom} disabled={busy}
                  onChange={(e) => crop.setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
                <button type="button" disabled={busy} onClick={() => crop.setZoom(crop.zoom + 0.2)} aria-label="Zoom in" className="p-1.5 rounded-full hover:bg-muted"><ZoomIn size={16} /></button>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={crop.rotate} className="flex-1 py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1 hover:bg-muted"><RotateCw size={14} /> Rotate</button>
                <button type="button" disabled={busy || (!crop.isDirty && isDefaultAdjustments(adj))} onClick={() => { crop.reset(); setAdj(DEFAULT_ADJUSTMENTS); }} className="flex-1 py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1 hover:bg-muted disabled:opacity-40"><RotateCcw size={14} /> Reset</button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_FILTER_PRESETS.map((p) => (
                  <button key={p.key} type="button" disabled={busy} onClick={() => setAdj({ ...adj, preset: p.key })}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1 border text-[11px] font-bold ${adj.preset === p.key ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                    {src && !previewError ? (
                      <img src={src} alt="" className="w-12 h-12 rounded-full object-cover" style={{ filter: p.css || undefined }} />
                    ) : <span className="w-12 h-12 rounded-full bg-muted" />}
                    {p.label}
                  </button>
                ))}
              </div>
              {slider('Brightness', 'brightness', 50, 150)}
              {slider('Contrast', 'contrast', 50, 150)}
              {slider('Saturation', 'saturation', 0, 200)}
            </div>
          )}

          <div className="w-full space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>Share update to feed</span>
              <input type="checkbox" checked={shareToFeed} disabled={busy} onChange={(e) => setShareToFeed(e.target.checked)} className="accent-primary w-4 h-4" />
            </label>
            {shareToFeed && (
              <>
                <select value={privacy} disabled={busy} onChange={(e) => setPrivacy(e.target.value as AvatarPostPrivacy)} aria-label="Post audience"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="followers">Followers</option>
                  <option value="private">Only me</option>
                </select>
                <textarea value={caption} disabled={busy} onChange={(e) => setCaption(e.target.value)} maxLength={2000} rows={2} placeholder="Say something about your new photo (optional)"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm resize-none" />
              </>
            )}
            <p className="text-[11px] text-muted-foreground">The photo is also added to your "Profile Pictures" album.</p>
            <label className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>Choose a profile frame after saving</span>
              <input type="checkbox" checked={openFramePrompt} disabled={busy} onChange={(e) => setOpenFramePrompt(e.target.checked)} className="accent-primary w-4 h-4" />
            </label>
          </div>

          {status === 'error' && error && (
            <div className="w-full rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-2 flex items-center justify-between gap-2" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onRetry} className="flex items-center gap-1 font-bold"><RefreshCw size={14} /> Retry</button>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border">
          {uploading ? (
            <button type="button" onClick={onCancelUpload} className="flex-1 py-2.5 rounded-xl border border-border font-bold hover:bg-muted">Cancel upload</button>
          ) : (
            <button type="button" onClick={onClose} disabled={preparing} className="flex-1 py-2.5 rounded-xl border border-border font-bold hover:bg-muted">Cancel</button>
          )}
          <button type="button" onClick={() => void save()} disabled={busy || (!crop.natural && !previewError)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
