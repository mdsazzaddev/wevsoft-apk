/**
 * Avatar / cover picker for a Space.
 *
 * Uploads immediately so the live preview shows the real image (not a blob URL
 * that would vanish on reload). Before the Space exists the wizard uploads via
 * the platform endpoint and the server re-parents the Media row to the Space on
 * create — see claimDraftMedia() in wevspace.service.ts.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadDraftImage, uploadSpaceImage } from '../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../UserAvatar';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  shape: 'avatar' | 'cover';
  /** When set, the upload is attributed to this Space instead of the draft. */
  spaceId?: string;
  label: string;
  hint?: string;
}

const MAX_BYTES = 12 * 1024 * 1024;

export default function SpaceImagePicker({ value, onChange, shape, spaceId, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = resolveAvatarUrl(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Images must be 12MB or smaller');
      return;
    }
    setBusy(true);
    try {
      const uploaded = spaceId ? await uploadSpaceImage(spaceId, file) : await uploadDraftImage(file);
      onChange(uploaded);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const frame =
    shape === 'avatar'
      ? 'w-24 h-24 rounded-full'
      : 'w-full aspect-[820/312] rounded-2xl'; // same shape as the desktop Space cover

  return (
    <div>
      <span className="block text-sm font-extrabold mb-1.5">{label}</span>
      <div className={shape === 'avatar' ? 'flex items-center gap-3' : 'space-y-2'}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`${frame} relative overflow-hidden border-2 border-dashed border-border grid place-items-center bg-muted/40 hover:border-primary/60 transition-colors disabled:opacity-60`}
        >
          {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          {busy ? (
            <Loader2 size={20} className="animate-spin relative z-10 text-white drop-shadow" />
          ) : (
            !url && <ImagePlus size={20} className="text-muted-foreground" />
          )}
        </button>

        <div className={shape === 'avatar' ? 'flex flex-col gap-1.5' : 'flex items-center gap-2'}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
          >
            {url ? 'Replace' : 'Upload'}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
}
