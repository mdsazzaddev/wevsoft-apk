import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';
import { HubLink, HubPageHeader, HubSection, HubSkeleton, HubStatRow, hubBtnPrimary, hubBtnSecondary } from './hub/HubUI';

type Totals = { posts: number; likes: number; comments: number; videos: number; images: number };

export const AiGrowthCoach = () => {
  const token = useStore((s) => s.token);
  // Space hub: coach the selected Space's content (backend /creator/content honours ?spaceId=).
  const { spaceId } = useCreatorSpace();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
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
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTotals(data.totals || null);
      } catch {
        /* keep empty coach state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, spaceId]);

  const engagement = (totals?.likes || 0) + (totals?.comments || 0);
  const posts = totals?.posts || 0;
  const engRate = posts > 0 ? Math.min(99, Math.round((engagement / Math.max(posts, 1)) * 10)) : 0;
  const action =
    posts === 0
      ? 'Publish your first post or reel this week — consistency unlocks better reach recommendations.'
      : engagement < posts
        ? 'Add a stronger hook in the first line of your next post, then reply to every new comment within an hour.'
        : 'Double down on what worked: create a follow-up post or reel that expands your top-performing topic.';

  return (
    <div className="space-y-5">
      <HubPageHeader title="AI Coach" description="Next steps based on your published content." />
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <HubSkeleton className="h-[150px]" />
          <HubSkeleton className="h-[86px]" />
        </div>
      ) : (
        <>
          <HubSection title="Next step">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground"><Lightbulb size={18} /></span>
              <p className="pt-1.5 text-[15px] leading-relaxed text-foreground">{action}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 pl-12">
              <Link to={spaceId ? '/business/batch' : '/ai/post'} className={hubBtnPrimary}>Generate draft</Link>
              <Link to={creatorHubPath('inspiration')} className={hubBtnSecondary}>Inspiration Hub</Link>
            </div>
          </HubSection>
          <HubStatRow
            stats={[
              { label: 'Posts', value: posts },
              { label: 'Likes', value: totals?.likes ?? 0 },
              { label: 'Comments', value: totals?.comments ?? 0 },
              { label: 'Engagement score', value: `${engRate}%`, hint: 'Relative to your published content' },
            ]}
          />
          <div><HubLink to={creatorHubPath('analytics')}>Open Insights</HubLink></div>
        </>
      )}
    </div>
  );
};
