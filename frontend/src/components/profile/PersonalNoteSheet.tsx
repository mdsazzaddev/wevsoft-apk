import React, { useEffect, useState } from 'react';
import { StickyNote, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type Props = {
  targetId: string;
  targetName?: string;
};

/** Owner-only private note about another user — never on public DTOs. */
export default function PersonalNoteSheet({ targetId, targetName }: Props) {
  const token = useStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [hasNote, setHasNote] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !targetId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/personal-notes?targetId=${encodeURIComponent(targetId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.note?.body) {
          setBody(data.note.body);
          setHasNote(true);
        } else {
          setBody('');
          setHasNote(false);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, targetId]);

  if (!token) return null;

  const save = async () => {
    setSaving(true);
    try {
      if (!body.trim()) {
        await fetch(`/api/personal-notes?targetId=${encodeURIComponent(targetId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasNote(false);
        toast.success('Note cleared');
        setOpen(false);
        return;
      }
      const res = await fetch('/api/personal-notes', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, body: body.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setHasNote(true);
      toast.success('Note saved (only you can see this)');
      setOpen(false);
    } catch {
      toast.error('Could not save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Private note (only you)"
      >
        <StickyNote size={13} />
        {hasNote ? 'Edit note' : 'Add note'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md mx-3 mb-6 sm:mb-0 rounded-2xl bg-card border border-border shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <StickyNote size={16} className="text-violet-600" />
                Private note{targetName ? ` · ${targetName}` : ''}
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Only you can see this. Never shown on their profile.</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Reminders, how you met, context…"
              className="w-full text-sm rounded-xl border border-border bg-muted/30 px-3 py-2 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-muted-foreground">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
