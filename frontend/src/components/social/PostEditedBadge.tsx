import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

type Edit = { id: string; previousContent: string | null; createdAt: string };

/** "Edited" marker on a post. The author can open earlier versions; others only see the marker. */
export default function PostEditedBadge({ postId, editedAt, isOwner, token }: { postId: string; editedAt?: string | null; isOwner: boolean; token?: string | null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ current?: string | null; edits: Edit[] } | null>(null);
  if (!editedAt) return null;
  const label = <span title={`Edited ${new Date(editedAt).toLocaleString()}`}>· Edited</span>;
  if (!isOwner || !token) return label;
  const show = async () => {
    setOpen(true);
    try {
      const r = await fetch(`/api/posts/${postId}/edits`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Could not load edit history');
      setData({ current: j.current, edits: j.edits || [] });
    } catch (e: any) { toast.error(e.message); setOpen(false); }
  };
  return (
    <>
      <button type="button" className="hover:underline" onClick={show}>· Edited</button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md max-h-[70vh] overflow-y-auto rounded-2xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Edit history</h3>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <ol className="space-y-3 text-sm">
                <li><p className="text-xs font-semibold text-muted-foreground">Current</p><p className="whitespace-pre-wrap">{data.current || '—'}</p></li>
                {data.edits.map((e) => (
                  <li key={e.id} className="border-t border-border/60 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">Before {new Date(e.createdAt).toLocaleString()}</p>
                    <p className="whitespace-pre-wrap">{e.previousContent || '—'}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}