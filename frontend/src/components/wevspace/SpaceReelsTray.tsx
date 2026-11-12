/**
 * Space-scoped Reels tray — same chrome as personal `FeedReelsTray` /
 * `ReelsCarousel`, but data comes from `GET /api/spaces/:id/posts?kind=reel`.
 */

import { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import type { SpacePublicPayload } from '@wevsoft/shared/wevspace';
import { fetchSpacePosts } from '../../lib/wevspaceApi';
import { resolvePostMediaItems } from '../../lib/postMedia';
import ReelsCarousel, { type FeedReel } from '../feed/ReelsCarousel';

function videoFromSpacePost(post: {
  id: string;
  content: string | null;
  postMedia: Array<{ id?: string; url: string; type?: string }>;
  media: string | null;
}): FeedReel | null {
  const items = resolvePostMediaItems(post);
  const video = items.find((m) => m.type === 'video');
  if (!video?.url) return null;
  const thumb = items.find((m) => m.type === 'image')?.url || null;
  return {
    id: post.id,
    videoUrl: video.url,
    thumbnailUrl: thumb,
    caption: post.content || undefined,
    user: null,
    source: 'post',
  };
}

type Props = {
  space: SpacePublicPayload;
  /** Remount / bump after publish. */
  refreshKey?: number;
  title?: string;
};

export default function SpaceReelsTray({
  space,
  refreshKey = 0,
  title = 'Reels',
}: Props) {
  const [reels, setReels] = useState<FeedReel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchSpacePosts(space.id, { kind: 'reel', limit: 20, offset: 0 });
        if (cancelled) return;
        const mapped = (data.posts || [])
          .map(videoFromSpacePost)
          .filter((r): r is FeedReel => !!r);
        setReels(mapped);
      } catch {
        if (!cancelled) setReels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [space.id, refreshKey]);

  if (loading && reels.length === 0) {
    return (
      <section className="rounded-3xl border border-border/60 bg-card/50 p-3 sm:p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Clapperboard size={18} className="text-primary" />
          <h2 className="text-sm font-extrabold">{title}</h2>
        </div>
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 w-28 shrink-0 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!reels.length) return null;

  return <ReelsCarousel reels={reels} title={title} />;
}
