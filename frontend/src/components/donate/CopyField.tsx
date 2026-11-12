import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export async function copyText(value: string, label = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error('Could not copy — select the text and copy manually');
  }
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-caption text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-body-sm font-semibold text-foreground">{value}</p>
      </div>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          await copyText(value, `${label} copied`);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
        className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      >
        {done ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

export default CopyField;
