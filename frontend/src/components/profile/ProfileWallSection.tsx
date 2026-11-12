import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, EyeOff, Trash2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { profilePathFor } from '../../lib/profileLinks';
import { legacySocialApi } from '../../legacy-social/api';

type WallPost = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  authorUserId?: string;
  author?: { id: string; name?: string; username?: string; avatar?: string };
};

type Props = {
  /** Username, slug, or user id for wall APIs. */
  handle: string;
  isOwner?: boolean;
  className?: string;
};

/**
 * Compact scrapbook wall under About/Posts.
 * Uses /api/legacy-social/wall/* (no legacy_wall flag required).
 */
export default function ProfileWallSection({ handle, isOwner, className = '' }: Props) {
  const token = useStore((s) => s.token);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !handle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await legacySocialApi.listWall(handle);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setCanPost(!!data.canPostWall);
    } catch {
      setPosts([]);
      setCanPost(false);
    } finally {
      setLoading(false);
    }
  }, [token, handle]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await legacySocialApi.postWall(handle, text.trim());
      setText('');
      toast.success('Posted to wall');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not post');
    } finally {
      setSending(false);
    }
  };

  if (!token) return null;

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle size={16} className="text-violet-600" />
        <h3 className="text-sm font-bold text-foreground">Scrapbook</h3>
      </div>

      {canPost && (
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            rows={2}
            placeholder="Leave a public note…"
            className="w-full text-sm bg-muted/40 border border-border rounded-xl px-3 py-2 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-muted-foreground">{text.length}/280</span>
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={submit}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send size={12} /> Post
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No notes yet.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {posts.map((p) => (
            <div key={p.id} className={`flex gap-3 ${p.status === 'hidden' ? 'opacity-50' : ''}`}>
              <Link to={profilePathFor(p.author) || '#'}>
                <img
                  src={p.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.authorUserId || p.id}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={profilePathFor(p.author) || '#'} className="font-semibold hover:underline">
                    {p.author?.name || 'User'}
                  </Link>
                  <span className="text-muted-foreground text-xs ml-2">
                    {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                  </span>
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words">{p.content}</p>
                {isOwner && (
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await legacySocialApi.hideWall(p.id);
                        await load();
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <EyeOff size={10} /> {p.status === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await legacySocialApi.deleteWall(p.id);
                        await load();
                      }}
                      className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  </div>
                )}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await legacySocialApi.reportWall(p.id, 'other');
                        toast.success('Reported');
                      } catch {
                        toast.error('Could not report');
                      }
                    }}
                    className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 mt-1"
                  >
                    <Flag size={10} /> Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
