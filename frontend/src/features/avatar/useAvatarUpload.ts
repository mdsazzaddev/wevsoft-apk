import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AvatarUploadAborted,
  removeAvatar,
  uploadAvatar,
  validateAvatarFile,
  type AvatarCrop,
  type AvatarPostPrivacy,
  type UploadAvatarResult,
} from './avatarApi';

export type AvatarUploadStatus = 'idle' | 'editing' | 'uploading' | 'success' | 'error';

export type AvatarSubmitPayload = {
  blob: Blob;
  fileName: string;
  /** Only when sending the original for server-side crop. */
  crop?: AvatarCrop | null;
  shareToFeed: boolean;
  privacy: AvatarPostPrivacy;
  caption?: string;
  /** Open the profile-frame picker after a successful save. */
  openFramePrompt: boolean;
};

type Options = {
  token: string | null | undefined;
  onSaved: (result: UploadAvatarResult, payload: AvatarSubmitPayload) => void;
  onRemoved?: (user?: any) => void;
};

/**
 * Avatar upload state machine:
 *   idle -> (pickFile) -> editing -> (submit) -> uploading -> success -> idle
 *                                         \-> error -> (retry) uploading | (closeEditor) idle
 *   uploading -> (cancelUpload) -> editing
 */
export function useAvatarUpload({ token, onSaved, onRemoved }: Options) {
  const [status, setStatus] = useState<AvatarUploadStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastPayload = useRef<AvatarSubmitPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const problem = validateAvatarFile(f);
    if (problem) {
      toast.error(problem);
      return;
    }
    setError(null);
    setProgress(0);
    setFile(f);
    setStatus('editing');
  }, []);

  const run = useCallback(
    async (payload: AvatarSubmitPayload) => {
      lastPayload.current = payload;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus('uploading');
      setError(null);
      setProgress(0);
      try {
        const result = await uploadAvatar(payload.blob, payload.fileName, {
          token,
          crop: payload.crop,
          shareToFeed: payload.shareToFeed,
          privacy: payload.privacy,
          caption: payload.caption,
          signal: ctrl.signal,
          onProgress: setProgress,
        });
        setStatus('success');
        setFile(null);
        onSaved(result, payload);
        toast.success(payload.shareToFeed ? 'Profile photo updated and shared' : 'Profile photo updated');
        setStatus('idle');
      } catch (e: any) {
        if (e instanceof AvatarUploadAborted) {
          setStatus('editing');
          return;
        }
        setError(e?.message || 'Upload failed');
        setStatus('error');
      } finally {
        abortRef.current = null;
      }
    },
    [token, onSaved],
  );

  const submit = useCallback((payload: AvatarSubmitPayload) => void run(payload), [run]);
  const retry = useCallback(() => { if (lastPayload.current) void run(lastPayload.current); }, [run]);
  const cancelUpload = useCallback(() => abortRef.current?.abort(), []);
  const closeEditor = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setError(null);
    setStatus('idle');
  }, []);

  const remove = useCallback(async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    try {
      const res = await removeAvatar(token);
      onRemoved?.(res.user);
      toast.success('Profile photo removed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove profile photo');
    }
  }, [token, onRemoved]);

  return {
    status,
    file,
    progress,
    error,
    isOpen: status !== 'idle' && !!file,
    isUploading: status === 'uploading',
    pickFile,
    submit,
    retry,
    cancelUpload,
    closeEditor,
    remove,
  };
}
