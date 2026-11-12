import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CoverUploadAborted, removeCover, uploadCover, validateCoverFile, type CoverAdjustments, type CoverCrop, type UploadCoverResult } from './coverApi';

export type CoverUploadStatus = 'idle' | 'editing' | 'uploading' | 'error';
export type CoverSubmitPayload = { file: File; crop: CoverCrop | null; adjustments: CoverAdjustments | null };

/**
 * idle -> pickFile -> editing -> submit -> uploading -> (ok) idle
 *                                              \-> error -> retry | close
 * uploading -> cancelUpload -> editing
 */
export function useCoverUpload({ token, onSaved, onRemoved }: {
  token: string | null | undefined;
  onSaved: (r: UploadCoverResult) => void;
  onRemoved?: (user?: any) => void;
}) {
  const [status, setStatus] = useState<CoverUploadStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<CoverSubmitPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const problem = validateCoverFile(f);
    if (problem) { toast.error(problem); return; }
    setError(null); setProgress(0); setFile(f); setStatus('editing');
  }, []);

  const run = useCallback(async (p: CoverSubmitPayload) => {
    last.current = p;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('uploading'); setError(null); setProgress(0);
    try {
      const r = await uploadCover(p.file, p.file.name, { token, crop: p.crop, adjustments: p.adjustments, signal: ctrl.signal, onProgress: setProgress });
      setFile(null); setStatus('idle');
      onSaved(r);
      toast.success('Cover photo updated');
    } catch (e: any) {
      if (e instanceof CoverUploadAborted) { setStatus('editing'); return; }
      setError(e?.message || 'Upload failed'); setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, [token, onSaved]);

  const submit = useCallback((p: CoverSubmitPayload) => void run(p), [run]);
  const retry = useCallback(() => { if (last.current) void run(last.current); }, [run]);
  const cancelUpload = useCallback(() => abortRef.current?.abort(), []);
  const closeEditor = useCallback(() => { abortRef.current?.abort(); setFile(null); setError(null); setStatus('idle'); }, []);
  const remove = useCallback(async () => {
    if (!window.confirm('Remove your cover photo?')) return;
    try {
      const r = await removeCover(token);
      onRemoved?.(r.user);
      toast.success('Cover photo removed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove cover photo');
    }
  }, [token, onRemoved]);

  return { status, file, progress, error, isOpen: status !== 'idle' && !!file, isUploading: status === 'uploading', pickFile, submit, retry, cancelUpload, closeEditor, remove };
}