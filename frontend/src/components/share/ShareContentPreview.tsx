import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import UserAvatar from '../UserAvatar';
import { formatDistanceToNow } from 'date-fns';

interface PreviewData {
  id?: string;
  type?: 'post' | 'reel' | 'marketplace' | 'profile' | string;
  title?: string;
  image?: string;
  authorName?: string;
  authorAvatar?: string;
  authorUsername?: string;
  badge?: boolean;
  time?: string;
  price?: string | null;
  meta?: string | null;
  /** Audience label (Public, Friends, …) when the API exposes it. */
  privacy?: string | null;
}

export type SharePreview = PreviewData;

const PRIVACY_LABEL: Record<string, string> = { public: 'Public', friends: 'Friends', followers: 'Followers', private: 'Only me', custom: 'Custom', close_friends: 'Close friends', group: 'Group' };

function money(v: unknown): string | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `৳${n.toLocaleString()}`;
}

export default function ShareContentPreview({
  targetId,
  targetType,
  fallbackTitle,
  preview,
}: {
  targetId?: string | null;
  targetType?: string;
  fallbackTitle?: string;
  /** Caller-supplied preview (Spaces, groups, events…); also shown while the fetch runs. */
  preview?: SharePreview | null;
}) {
  const token = useStore((s) => s.token);
  const [data, setData] = useState<PreviewData | null>(preview || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !targetId || !targetType) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        let endpoint = '';
        if (targetType === 'post') endpoint = `/api/posts/${targetId}`;
        else if (targetType === 'reel') endpoint = `/api/reels/${targetId}`;
        else if (targetType === 'marketplace' || targetType === 'product') endpoint = `/api/marketplace/products/${targetId}`;
        else if (targetType === 'profile') endpoint = `/api/users/${targetId}`;

        if (!endpoint) return;

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();

        if (targetType === 'profile') {
          setData({
            id: json.id,
            type: 'profile',
            title: json.bio || json.headline || fallbackTitle || 'Profile',
            image: json.avatar || json.cover || null,
            authorName: json.name || json.username,
            authorAvatar: json.avatar,
            authorUsername: json.username,
            badge: !!(json.verified || json.isVerified),
          });
          return;
        }

        if (targetType === 'marketplace' || targetType === 'product') {
          setData({
            id: json.id,
            type: 'marketplace',
            title: json.title || json.name || fallbackTitle,
            image:
              json.thumbnailUrl ||
              json.coverImage ||
              (Array.isArray(json.images) ? json.images[0] : null) ||
              (Array.isArray(json.media) ? json.media[0]?.url : null),
            authorName: json.seller?.displayName || json.seller?.name || json.user?.name,
            authorAvatar: json.seller?.logo || json.seller?.avatar || json.user?.avatar,
            authorUsername: json.seller?.username || json.user?.username,
            badge: !!(json.seller?.isVerified || json.user?.verified),
            price: money(json.price ?? json.salePrice),
            meta: json.location || json.condition || null,
          });
          return;
        }

        setData({
          id: json.id,
          type: targetType,
          title: json.caption || json.content || json.description || json.title || fallbackTitle,
          image:
            json.thumbnailUrl ||
            (Array.isArray(json.media) ? json.media[0]?.url : null) ||
            (Array.isArray(json.images) ? json.images[0] : null) ||
            null,
          authorName: json.user?.name || json.space?.name || json.seller?.name,
          authorAvatar: json.user?.avatar || json.space?.avatar || json.seller?.avatar,
          authorUsername: json.user?.username || json.space?.handle || json.seller?.username,
          badge: !!(json.user?.verified || json.user?.isVerified || json.space?.verificationStatus === 'VERIFIED'),
          time: json.createdAt,
          meta: targetType === 'reel' && json.durationSec ? `${Math.round(json.durationSec)}s` : null,
          privacy: typeof json.privacy === 'string' ? json.privacy : null,
        });
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [targetId, targetType, token, fallbackTitle]);

  if (loading) {
    return (
      <div className="flex gap-3 items-center p-3 border border-border bg-muted/20 rounded-2xl animate-pulse shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-2 w-32 bg-muted rounded" />
        </div>
        <div className="w-14 h-14 rounded-lg bg-muted" />
      </div>
    );
  }

  if (!data && !fallbackTitle) return null;

  const timeLabel =
    data?.time &&
    (() => {
      try {
        return formatDistanceToNow(new Date(data.time), { addSuffix: true });
      } catch {
        return null;
      }
    })();

  return (
    <div className="flex gap-3 items-start p-3 border border-border/70 bg-muted/15 rounded-2xl shrink-0">
      {data?.authorName && (
        <UserAvatar
          user={{ name: data.authorName, avatar: data.authorAvatar }}
          className="w-10 h-10 text-xs shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        {data?.authorName && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-bold text-sm truncate">{data.authorName}</span>
            {data.badge && (
              <span className="text-primary text-xs shrink-0" title="Verified">
                ✓
              </span>
            )}
            {timeLabel && (
              <span className="text-[11px] text-muted-foreground truncate">· {timeLabel}</span>
            )}
            {data.privacy && (
              <span className="text-[11px] text-muted-foreground shrink-0">· {PRIVACY_LABEL[String(data.privacy).toLowerCase()] || data.privacy}</span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {data?.title || fallbackTitle}
        </p>
        {(data?.price || data?.meta) && (
          <p className="text-[11px] font-semibold text-foreground/80 mt-1 truncate">
            {[data.price, data.meta].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {data?.image && (
        <div
          className={`rounded-lg overflow-hidden shrink-0 bg-muted ${
            data.type === 'reel' ? 'w-11 h-16' : 'w-14 h-14'
          }`}
        >
          <img src={data.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
