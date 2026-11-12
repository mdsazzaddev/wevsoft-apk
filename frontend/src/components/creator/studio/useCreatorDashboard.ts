import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../../store';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../../lib/creatorSpaceContext';

export type DashKind = 'post' | 'reel' | 'story' | 'video' | 'academic';

export interface DashStat {
  value: number;
  previous: number;
  changePct: number | null;
  series: number[];
  gained?: number;
}

export interface DashItem {
  id: string;
  kind: DashKind;
  title: string;
  thumbnail: string | null;
  videoUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  status: string;
  scheduledFor: string | null;
  href: string;
  engagementRate?: number;
}

export interface DashActivity {
  id: string;
  type: 'comment' | 'reel_comment' | 'follow';
  createdAt: string;
  actor: { id: string; name: string | null; avatar: string | null } | null;
  text: string;
  target: string;
  href: string;
}

export interface CreatorDashboardData {
  days: number;
  rangeStart: string;
  stats: { views: DashStat; reach: DashStat; engagement: DashStat; followers: DashStat };
  series: Array<{ date: string; views: number; reach: number; engagement: number; followersGained: number }>;
  breakdown: { total: number; byKind: Record<DashKind, number> };
  counts: Record<'posts' | 'reels' | 'stories' | 'videos' | 'academic', number>;
  content: DashItem[];
  topContent: DashItem[];
  upcoming: DashItem[];
  activity: DashActivity[];
  recentComments: number;
  level: {
    level: number;
    tierLabel: string;
    tierColor: string;
    nextTier: string | null;
    nextTierAtXp: number | null;
    progressPct: number;
    xpForNextLevel: number;
  };
  xp: number;
}

/** GET /api/v1/jobs-creator/creator/dashboard — the Creator Studio overview payload. */
export function useCreatorDashboard(days: number) {
  const token = useStore((s) => s.token);
  const { spaceId } = useCreatorSpace();
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(withCreatorSpaceQuery(`/api/v1/jobs-creator/creator/dashboard?days=${days}`, spaceId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, days, nonce, spaceId]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

export function formatCompact(n?: number | null): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export const KIND_LABEL: Record<DashKind, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  video: 'Video',
  academic: 'Academic',
};