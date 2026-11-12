import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, LayoutGrid, Play, ShoppingBag } from 'lucide-react';
import { profileListFetchInit, unwrapProfileListItems } from '../../lib/profileApiFetch';
import { ProductGrid } from '../marketplace/commerce/ProductCard';
import SafeImage, { VideoUnavailable } from '../ui/SafeImage';
import { useValueChanged } from '../../hooks/useValueChanged';

/** Inline post video that shows a placeholder when the file is missing (404). */
function PostVideo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  // New src → retry (adjusted during render, not in an effect).
  const srcChanged = useValueChanged(src);
  if (srcChanged && failed) setFailed(false);
  if (failed) return <VideoUnavailable className="max-h-80 aspect-video" />;
  return <video src={src} className="w-full max-h-80 object-cover bg-black" controls playsInline onError={() => setFailed(true)} />;
}

type AllFeedProps = {
  username?: string | null;
  posts?: any[];
  reels?: any[];
  videos?: any[];
  products?: any[];
  loading?: boolean;
  /** Render each post as a full feed card (author row, caption, media, actions). */
  renderPost?: (post: any) => ReactNode;
};

async function fetchProfilePosts(username: string): Promise<any[]> {
  const res = await fetch(
    `/api/u/${encodeURIComponent(username)}/posts`,
    profileListFetchInit(),
  );
  if (!res.ok) return [];
  return unwrapProfileListItems(await res.json());
}

function postText(post: any) {
  return post?.content || post?.caption || '';
}

function postMedia(post: any): Array<{ url: string; type?: string }> {
  if (Array.isArray(post?.media) && post.media.length) return post.media;
  if (Array.isArray(post?.postMedia) && post.postMedia.length) return post.postMedia;
  return [];
}

function isReelPost(post: any) {
  return String(post?.type || '').toLowerCase() === 'reel';
}

function hasVideoMedia(post: any) {
  return postMedia(post).some((m) => String(m.type || '').toLowerCase() === 'video');
}

function splitPosts(items: any[]) {
  const reels: any[] = [];
  const videos: any[] = [];
  const posts: any[] = [];
  for (const item of items) {
    if (isReelPost(item)) {
      reels.push({
        ...item,
        videoUrl: postMedia(item).find((m) => String(m.type || '').toLowerCase() === 'video')?.url
          || postMedia(item)[0]?.url
          || '',
        caption: postText(item),
      });
    } else if (hasVideoMedia(item) || String(item?.type || '').toLowerCase() === 'video') {
      videos.push({
        ...item,
        videoUrl: postMedia(item).find((m) => String(m.type || '').toLowerCase() === 'video')?.url
          || postMedia(item)[0]?.url
          || '',
        caption: postText(item),
      });
    } else {
      posts.push(item);
    }
  }
  return { posts, reels, videos };
}

function reelVideo(item: any) {
  return item.videoUrl || item.url || '';
}

function reelThumb(item: any) {
  return item.thumbnail || item.thumbnailUrl || '';
}

export default function ProfileAllFeed({
  username,
  posts: postsProp,
  reels: reelsProp,
  videos: videosProp,
  products = [],
  loading = false,
  renderPost,
}: AllFeedProps) {
  const navigate = useNavigate();
  const [remotePosts, setRemotePosts] = useState<any[]>([]);
  const [remoteReels, setRemoteReels] = useState<any[]>([]);
  const [remoteVideos, setRemoteVideos] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  const useRemote = postsProp === undefined && !!username;

  useEffect(() => {
    if (!useRemote || !username) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setFetching(true);
    fetchProfilePosts(username)
      .then((items) => {
        if (cancelled) return;
        const split = splitPosts(items);
        setRemotePosts(split.posts);
        setRemoteReels(split.reels);
        setRemoteVideos(split.videos);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useRemote, username]);

  const posts = postsProp ?? remotePosts;
  const reels = reelsProp ?? remoteReels;
  const videos = videosProp ?? remoteVideos;
  const busy = loading || fetching;

  const videoTiles = [
    ...reels.map((item) => ({ kind: 'reel' as const, item })),
    ...videos.map((item) => ({ kind: 'video' as const, item })),
  ];

  const empty = posts.length === 0 && videoTiles.length === 0 && products.length === 0;

  // Feed mode (own profile): one chronological list of everything the user made.
  // Posts (text / photo / video / shares) render as full cards; reels from
  // /api/reels/mine are added as tiles. Video posts that /api/reels/mine or the
  // videos prop also return are the same post, so they are deduped by id / URL.
  const feedMode = !!renderPost;
  const ts = (x: any) => new Date(x?.createdAt || x?.updatedAt || 0).getTime() || 0;
  const postIds = new Set(posts.map((p: any) => p?.id).filter(Boolean));
  const postVideoUrls = new Set(
    posts.flatMap((p: any) => postMedia(p).filter((m) => String(m.type || '').toLowerCase() === 'video').map((m) => m.url)),
  );
  const feedItems: Array<{ kind: 'post' | 'reel' | 'video'; item: any }> = [];
  if (feedMode) {
    const seen = new Set<string>();
    const push = (kind: 'post' | 'reel' | 'video', item: any) => {
      const key = `${kind === 'post' ? 'post' : item?.source === 'post' ? 'post' : kind}:${item?.id || item?.postId || reelVideo(item)}`;
      if (seen.has(key)) return;
      seen.add(key);
      feedItems.push({ kind, item });
    };
    posts.forEach((p: any) => push('post', p));
    reels.forEach((r: any) => {
      if (r?.source === 'post' || postIds.has(r?.id) || postVideoUrls.has(reelVideo(r))) return;
      push('reel', r);
    });
    videos.forEach((v: any) => {
      if (postIds.has(v?.postId) || postIds.has(v?.id) || postVideoUrls.has(reelVideo(v))) return;
      push('video', v);
    });
    feedItems.sort((a, b) => ts(b.item) - ts(a.item));
  }

  if (busy && empty) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Loading posts, videos, and reels…
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-2">
        <LayoutGrid className="w-10 h-10 mx-auto text-muted-foreground/70" />
        <h3 className="text-lg font-bold">Nothing here yet</h3>
        <p className="text-sm text-muted-foreground">
          Posts, videos, and reels will show up in All.
        </p>
      </div>
    );
  }

  if (feedMode) {
    return (
      <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
        {feedItems.map(({ kind, item }, i) => {
          if (kind === 'post') return <div key={`post-${item.id}`} data-all-kind="post">{renderPost!(item)}</div>;
          const src = reelVideo(item);
          const poster = reelThumb(item);
          const caption = item.caption || item.description || item.content || '';
          return (
            <div key={`${kind}-${item.id || i}`} data-all-kind={kind} className="rounded-3xl border border-border bg-card p-3">
              <button
                type="button"
                onClick={() => navigate('/reels')}
                className="relative block w-full max-w-[280px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden group bg-black text-left"
              >
                {poster ? <SafeImage src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
                {src ? (
                  <video src={src} poster={poster || undefined} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Play size={22} className="text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white">
                  {kind}
                </span>
                {caption ? (
                  <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white line-clamp-2 drop-shadow">{caption}</p>
                ) : null}
              </button>
            </div>
          );
        })}
        {products.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShoppingBag size={16} /> WevMall
            </h3>
            <ProductGrid products={products} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Posts</h3>
          <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
            {posts.map((post: any) => {
              if (renderPost) return <div key={post.id}>{renderPost(post)}</div>;
              const media = postMedia(post);
              const text = postText(post);
              return (
                <article key={post.id} className="rounded-3xl border border-border bg-card overflow-hidden">
                  {text ? (
                    <p className="px-5 pt-5 pb-3 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="h-4" />
                  )}
                  {media.length > 0 && (
                    <div className={`grid gap-1 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {media.slice(0, 4).map((m: any, i: number) =>
                        (m.type === 'video' ? (
                          <PostVideo key={m.id || m.url || i} src={m.url} />
                        ) : (
                          <SafeImage key={m.id || m.url || i} src={m.url} alt="" className="w-full max-h-80 object-cover" fallbackClassName="w-full h-40" />
                        )),
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {videoTiles.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clapperboard size={16} /> Videos & Reels
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {videoTiles.map(({ kind, item }, i) => {
              const src = reelVideo(item);
              const poster = reelThumb(item);
              const caption = item.caption || item.description || item.content || '';
              return (
                <button
                  key={`${kind}-${item.id || item.postId || i}`}
                  type="button"
                  onClick={() => navigate('/reels')}
                  className="relative aspect-[9/16] min-h-[180px] rounded-2xl overflow-hidden group bg-black text-left border border-border"
                >
                  {poster ? <SafeImage src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
                  {src ? (
                    <video src={src} poster={poster || undefined} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <Play size={22} className="text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white">
                    {kind}
                  </span>
                  {caption ? (
                    <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white line-clamp-2 drop-shadow">{caption}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShoppingBag size={16} /> WevMall
          </h3>
          <ProductGrid products={products} />
        </section>
      )}
    </div>
  );
}
