import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FolderKanban,
  Image as ImageIcon,
  Video,
  FileText,
  Loader2,
  Heart,
  MessageCircle,
  Images,
  Download,
  LayoutGrid,
  Table2,
  Eye,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { CreatorPublishLibraryPanel } from './AdminPublishSettingsPanel';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';

type CreatorPost = {
  id: string;
  content?: string | null;
  type: 'video' | 'image' | 'text' | 'reel' | 'story' | 'academic' | string;
  media?: string | null;
  href?: string | null;
  createdAt: string;
  status?: string;
  scheduledFor?: string | null;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  sharesCount?: number;
  engagementCount?: number;
  _count?: { likes?: number; comments?: number; views?: number; shares?: number };
};

type LibraryMode = 'posts' | 'media' | 'reels' | 'videos' | 'stories' | 'academic';

function libraryModeFromSub(sub: string | null): LibraryMode {
  if (sub === 'media' || sub === 'reels' || sub === 'videos' || sub === 'stories' || sub === 'academic') return sub;
  return 'posts';
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'reel' || type === 'video') return <Video size={28} className="text-indigo-400" />;
  if (type === 'image' || type === 'story') return <ImageIcon size={28} className="text-emerald-400" />;
  return <FileText size={28} className="text-muted-foreground" />;
}

function itemHref(post: CreatorPost): string {
  if (post.href) return post.href;
  if (post.type === 'reel') return `/reels/${post.id}`;
  return `/posts/${post.id}`;
}

function mediaThumb(media?: string | null): string | null {
  if (!media) return null;
  const raw = media.trim();
  if (!raw) return null;
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed[0]?.url || parsed[0] || null;
      return parsed?.url || parsed?.path || null;
    } catch {
      /* fall through */
    }
  }
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(raw)) return null;
  return raw;
}

function hasMedia(post: CreatorPost): boolean {
  if (post.type === 'video' || post.type === 'image') return true;
  return Boolean(mediaThumb(post.media) || (post.media && String(post.media).trim()));
}

function csvEscape(v: string | number | null | undefined) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const ContentLibraryView = () => {
  const token = useStore((s) => s.token);
  const { spaceId } = useCreatorSpace();
  const [params] = useSearchParams();
  const mode = libraryModeFromSub(params.get('sub'));
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [layout, setLayout] = useState<'grid' | 'table'>('table');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/content', spaceId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('Failed to load content library');
          return;
        }
        const data = await res.json();
        if (!cancelled) setPosts(data.posts || []);
      } catch {
        if (!cancelled) toast.error('Failed to load content library');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, spaceId]);

  const visible = useMemo(() => {
    let base = posts;
    if (mode === 'media') base = posts.filter(hasMedia);
    else if (mode === 'reels') base = posts.filter((p) => p.type === 'reel');
    else if (mode === 'videos') base = posts.filter((p) => p.type === 'video' || p.type === 'reel');
    else if (mode === 'stories') base = posts.filter((p) => p.type === 'story');
    else if (mode === 'academic') base = posts.filter((p) => p.type === 'academic');
    else base = posts.filter((p) => p.type !== 'reel' && p.type !== 'story'); // Posts
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((p) => (p.content || '').toLowerCase().includes(needle) || p.type.toLowerCase().includes(needle));
  }, [mode, posts, q]);

  const exportCsv = () => {
    const header = ['id', 'type', 'status', 'content', 'views', 'likes', 'comments', 'shares', 'engagement', 'createdAt'];
    const rows = visible.map((p) => [
      p.id,
      p.type,
      p.status || '',
      (p.content || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      p.viewsCount ?? p._count?.views ?? 0,
      p.likesCount ?? p._count?.likes ?? 0,
      p.commentsCount ?? p._count?.comments ?? 0,
      p.sharesCount ?? p._count?.shares ?? 0,
      p.engagementCount ?? (p.likesCount || 0) + (p.commentsCount || 0),
      p.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wevsoft-content-library-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} rows`);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-indigo-400" size={28} />
        <span className="text-sm">Loading content library...</span>
      </div>
    );
  }

  const TitleIcon = mode === 'media' || mode === 'reels' || mode === 'videos' ? Images : FolderKanban;
  const title =
    mode === 'media' ? 'Media Library'
      : mode === 'reels' ? 'Reels'
        : mode === 'videos' ? 'Videos'
          : mode === 'stories' ? 'Stories'
            : mode === 'academic' ? 'Academic'
              : 'Posts';
  const countLabel =
    mode === 'media' ? 'media items'
      : mode === 'reels' ? 'reels'
        : mode === 'videos' ? 'videos'
          : mode === 'stories' ? 'stories'
            : mode === 'academic' ? 'academic posts'
              : 'posts';
  const emptyTitle =
    mode === 'media' ? 'No media yet'
      : mode === 'reels' ? 'No reels yet'
        : mode === 'videos' ? 'No videos yet'
          : mode === 'stories' ? 'No stories yet'
            : mode === 'academic' ? 'No academic posts yet'
              : 'No posts yet';
  const emptySub =
    mode === 'media' ? 'Upload images or videos to see them here.'
      : mode === 'reels' ? 'Create a Reel from Content Studio to see it here.'
        : mode === 'stories' ? 'Add to your story to see it here.'
          : 'Publish content to build your library.';

  return (
    <div className="space-y-6">
      <div className="bg-card dark:bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-sm dark:shadow-2xl min-h-[600px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <TitleIcon className="text-indigo-400" /> {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {visible.length} {countLabel}
              {q ? ' matching search' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts..."
              className="h-9 w-44 rounded-xl border border-border bg-slate-50 dark:bg-black/20 px-3 text-[12.5px] text-foreground placeholder:text-muted-foreground"
            />
            <div className="inline-flex rounded-xl border border-border bg-slate-50 dark:bg-black/20 p-0.5">
              <button
                type="button"
                onClick={() => setLayout('table')}
                className={`h-8 px-2.5 rounded-lg ${layout === 'table' ? 'bg-indigo-600 text-white' : 'text-muted-foreground'}`}
                title="Table"
              >
                <Table2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setLayout('grid')}
                className={`h-8 px-2.5 rounded-lg ${layout === 'grid' ? 'bg-indigo-600 text-white' : 'text-muted-foreground'}`}
                title="Grid"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-white/5 disabled:opacity-40"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl text-muted-foreground">
            <TitleIcon size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">{emptyTitle}</p>
            <p className="text-xs mt-1 opacity-70">{emptySub}</p>
          </div>
        ) : layout === 'table' ? (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead className="bg-slate-100 dark:bg-black/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Preview</th>
                  <th className="px-3 py-2.5 font-bold">Views</th>
                  <th className="px-3 py-2.5 font-bold">Engagement</th>
                  <th className="px-3 py-2.5 font-bold">Likes</th>
                  <th className="px-3 py-2.5 font-bold">Comments</th>
                  <th className="px-3 py-2.5 font-bold">Shares</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((post) => {
                  const thumb = mediaThumb(post.media);
                  const likes = post.likesCount ?? post._count?.likes ?? 0;
                  const comments = post.commentsCount ?? post._count?.comments ?? 0;
                  const views = post.viewsCount ?? post._count?.views ?? 0;
                  const shares = post.sharesCount ?? post._count?.shares ?? 0;
                  const eng = post.engagementCount ?? likes + comments + shares;
                  const snippet = (post.content || '').trim() || `${post.type} post`;
                  return (
                    <tr key={post.id} className="hover:bg-slate-200 dark:hover:bg-white/[0.03]">
                      <td className="px-3 py-2.5">
                        <Link to={itemHref(post)} className="flex items-center gap-2.5 min-w-0">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/40 grid place-items-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <TypeIcon type={post.type} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-foreground line-clamp-1">{snippet}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">{post.type}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Eye size={11} className="opacity-50" />{views}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold">{eng}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Heart size={11} className="opacity-50" />{likes}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1"><MessageCircle size={11} className="opacity-50" />{comments}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Share2 size={11} className="opacity-50" />{shares}</span>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">{post.status || 'published'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visible.map((post) => {
              const thumb = mediaThumb(post.media);
              const likes = post.likesCount ?? post._count?.likes ?? 0;
              const comments = post.commentsCount ?? post._count?.comments ?? 0;
              const views = post.viewsCount ?? post._count?.views ?? 0;
              const snippet = (post.content || '').trim() || `${post.type} post`;
              return (
                <Link
                  key={post.id}
                  to={itemHref(post)}
                  className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex flex-col"
                >
                  <div className="aspect-square bg-black/40 flex items-center justify-center relative">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <TypeIcon type={post.type} />
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-[10px] font-bold uppercase tracking-wide">
                      {post.type}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-semibold line-clamp-2 text-foreground">{snippet}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Eye size={10} /> {views}</span>
                      <span className="inline-flex items-center gap-1"><Heart size={10} /> {likes}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle size={10} /> {comments}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Publish settings list is per user (/api/creator/publish/mine has no Space scope): personal hub only. */}
        {!spaceId && (
          <div className="mt-8 pt-6 border-t border-border">
            <CreatorPublishLibraryPanel />
          </div>
        )}
      </div>
    </div>
  );
};
