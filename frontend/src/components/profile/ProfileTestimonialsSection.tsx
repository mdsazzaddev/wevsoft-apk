import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quote, Check, EyeOff, Trash2, Send, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { profilePathFor } from '../../lib/profileLinks';

type Testimonial = {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  authorId: string;
  author?: { id: string; name?: string; username?: string; avatar?: string };
};

type Props = {
  profileId: string;
  isOwner?: boolean;
  /** Viewer can write if not owner. */
  canWrite?: boolean;
};

export default function ProfileTestimonialsSection({ profileId, isOwner, canWrite }: Props) {
  const token = useStore((s) => s.token);
  const me = useStore((s) => s.user);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/testimonials/user/${profileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(Array.isArray(data.testimonials) ? data.testimonials : []);
      const mine = (data.testimonials || []).find((t: Testimonial) => t.authorId === me?.id);
      if (mine) setDraft(mine.body);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, token, me?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const submit = async () => {
    if (!token || !draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ profileId, body: draft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Testimonial submitted for review');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const moderate = async (id: string, action: 'approve' | 'hide' | 'delete' | 'reject') => {
    try {
      const res = await fetch(`/api/testimonials/${id}/${action}`, {
        method: 'POST',
        headers: headers(),
        body: '{}',
      });
      if (!res.ok) throw new Error('Failed');
      await load();
    } catch {
      toast.error('Action failed');
    }
  };

  const visible = isOwner ? items : items.filter((t) => t.status === 'approved');

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Quote size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">Testimonials</h3>
      </div>

      {canWrite && token && !isOwner && (
        <div className="mb-4 rounded-xl bg-muted/40 border border-border p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 800))}
            rows={3}
            placeholder="Write a recommendation…"
            className="w-full text-sm bg-transparent border-0 resize-none focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !draft.trim()}
              onClick={submit}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send size={12} /> Submit
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No testimonials yet.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border border-border/60 bg-muted/20 p-3 ${
                t.status === 'pending' ? 'border-amber-500/40' : t.status === 'hidden' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex gap-3">
                <Link to={profilePathFor(t.author) || '#'}>
                  <img
                    src={t.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.authorId}`}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={profilePathFor(t.author) || '#'} className="text-sm font-semibold hover:underline">
                      {t.author?.name || 'User'}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                    </span>
                    {isOwner && t.status !== 'approved' && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-600 font-bold">{t.status}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                  {isOwner && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {t.status !== 'approved' && (
                        <button type="button" onClick={() => moderate(t.id, 'approve')} className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <Check size={11} /> Approve
                        </button>
                      )}
                      <button type="button" onClick={() => moderate(t.id, 'hide')} className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <EyeOff size={11} /> {t.status === 'hidden' ? 'Unhide' : 'Hide'}
                      </button>
                      {t.status === 'pending' && (
                        <button type="button" onClick={() => moderate(t.id, 'reject')} className="text-[11px] text-muted-foreground">
                          Reject
                        </button>
                      )}
                      <button type="button" onClick={() => moderate(t.id, 'delete')} className="text-[11px] text-red-500 flex items-center gap-1">
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                  {!isOwner && token && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/testimonials/${t.id}/report`, {
                          method: 'POST',
                          headers: headers(),
                          body: JSON.stringify({ reason: 'other' }),
                        });
                        toast.success('Reported');
                      }}
                      className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 mt-1"
                    >
                      <Flag size={10} /> Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
