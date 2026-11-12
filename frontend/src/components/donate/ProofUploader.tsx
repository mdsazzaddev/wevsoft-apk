import React, { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const PROOF_MAX_COUNT = 3;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Up to 3 proof screenshots with previews and remove buttons. */
export function ProofUploader({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= PROOF_MAX_COUNT) {
        toast.error(`You can attach up to ${PROOF_MAX_COUNT} images`);
        break;
      }
      if (!ACCEPT.includes(f.type)) {
        toast.error(`${f.name}: only JPG, PNG or WebP images`);
        continue;
      }
      if (f.size > PROOF_MAX_BYTES) {
        toast.error(`${f.name}: larger than 5 MB`);
        continue;
      }
      next.push(f);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="relative size-24 overflow-hidden rounded-md border border-border bg-muted">
            <img src={previews[i]} alt={`Payment proof ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${f.name}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {files.length < PROOF_MAX_COUNT && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-caption text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
            Add image
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />
      <p className="mt-2 text-caption text-muted-foreground">
        Optional · up to {PROOF_MAX_COUNT} screenshots (JPG, PNG, WebP · 5 MB each).
      </p>
    </div>
  );
}

export default ProofUploader;
