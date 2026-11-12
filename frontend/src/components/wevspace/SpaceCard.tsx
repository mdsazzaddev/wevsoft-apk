import { createElement, useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BadgeCheck, Check, ExternalLink, Flame, LayoutList, Link2, Loader2, Lock, MoreHorizontal, Play, Plus, Share2, Star, Users } from 'lucide-react';
import {
  formatFollowerCount,
  resolveSpaceAccent,
  spaceInitials,
  spacePublicPath,
  spaceRoleDef,
  spaceStatusLabel,
  spaceTypeDef,
  spaceTypeLabel,
  type SpaceCardPayload,
} from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../UserAvatar';
import { spaceIcon } from './spaceIcons';
import { useStore } from '../../store';
import { followSpace, unfollowSpace } from '../../lib/wevspaceApi';
import { openShare } from '../../lib/share/openShare';
import { copyToClipboard } from '../../lib/share/shareUtils';
import { spaceTypeLabelBn } from './spaceTypeBn';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

/** Extension fallback for old string payloads / items without a type. */
const VIDEO_URL_RE = /\.(mp4|m4v|mov|webm|ogv|mkv|avi|3gp|m3u8)(?:[?#]|$)/i;

/** Bangla relative label from lastActiveAt (the server's activeStatus is English). */
function activeStatusBn(iso: string | null | undefined, formatNum: (v: string | number) => string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 5) return 'এখন সক্রিয়';
  if (mins < 60) return `${formatNum(mins)} মিনিট আগে সক্রিয়`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${formatNum(hours)} ঘণ্টা আগে সক্রিয়`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${formatNum(days)} দিন আগে সক্রিয়`;
  if (days < 30) return `${formatNum(Math.floor(days / 7))} সপ্তাহ আগে সক্রিয়`;
  return 'বেশ কিছুদিন আগে সক্রিয়';
}

interface Props {
  key?: string;
  space: SpaceCardPayload & {
    membershipStatus?: string;
    viewsCount?: number;
    activeStatus?: string;
    friendFollowers?: { id: string; avatar: string | null; name: string }[];
    /** Objects from the API; plain strings still accepted from older payloads. */
  recentMedia?: (string | { url: string; type?: string; poster?: string | null })[];
    isFeatured?: boolean;
    isTrending?: boolean;
  };
  showOwnerMeta?: boolean;
  /** 'compact' (default) for sections/strips; 'wide' for the main Explore grid. */
  variant?: 'compact' | 'wide' | 'dense';
  footer?: ReactNode;
  className?: string;
}

/**
 * Directory card. Compact layout on the app's tokens (bg-card, border, primary);
 * the cover fallback is derived from the Space's own accent colour. The view
 * count is no longer shown on the card (data unchanged).
 */
export default function SpaceCard({ space, showOwnerMeta = false, variant = 'compact', footer, className = '' }: Props) {
  const wide = variant === 'wide';
  const dense = variant === 'dense';
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const { t, isBn, formatNum } = useMarketplaceLang();
  const accent = resolveSpaceAccent(space);
  const typeIcon = createElement(spaceIcon(spaceTypeDef(space.spaceType).icon), { size: 11 });
  const avatarUrl = resolveAvatarUrl(space.avatar);
  const coverUrl = resolveAvatarUrl(space.cover);
  const href = spacePublicPath(space.handle);

  const pendingDeletion = space.status === 'PENDING_DELETION';
  const statusLabel = showOwnerMeta && space.status !== 'PUBLISHED' ? spaceStatusLabel(space.status) : null;
  const roleLabel = showOwnerMeta && space.role && space.role !== 'OWNER' ? spaceRoleDef(space.role)?.label : null;

  const isFeatured = space.isFeatured || false;
  const isTrending = space.isTrending || false;
  // Real label from the API; '' (no public post yet) hides the indicator.
  // In Bangla never fall back to the server's English string; no timestamp hides the label.
  const activeStatus = isBn ? activeStatusBn(space.lastActiveAt, formatNum) : space.activeStatus || '';
  const friendFollowers = space.friendFollowers || [];
  // friendFollowers is capped at 3 avatars; the count is the real total.
  const friendCount = Math.max(space.friendFollowersCount ?? 0, friendFollowers.length);
  // Normalize to { src, video }: src is an <img>-safe URL (image or poster), null for a poster-less video.
  const recentMedia = (space.recentMedia || [])
    .map((m) => {
      const item = typeof m === 'string' ? { url: m } : m;
      const url = resolveAvatarUrl(item?.url);
      if (!url) return null;
      const type = (item.type || '').toLowerCase();
      const video = type ? type === 'video' || type.startsWith('video/') : VIDEO_URL_RE.test(url);
      return { src: video ? resolveAvatarUrl(item.poster) : url, video };
    })
    .filter((m): m is { src: string | null; video: boolean } => !!m)
    .slice(0, wide ? 4 : 3);

  // Follow (was a no-op "Join"): optimistic with rollback, hidden for the owner/team.
  const canFollow = !space.isOwner && !space.role;
  const [following, setFollowing] = useState(!!space.isFollowing);
  const [followers, setFollowers] = useState<number | null>(space.followersCount);
  const [busy, setBusy] = useState(false);
  // Re-sync when the parent hands over fresher data (render-time, no effect).
  const sourceKey = `${space.id}:${space.isFollowing}:${space.followersCount}`;
  const [syncedKey, setSyncedKey] = useState(sourceKey);
  if (syncedKey !== sourceKey) {
    setSyncedKey(sourceKey);
    setFollowing(!!space.isFollowing);
    setFollowers(space.followersCount);
  }

  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleFollow = async (e: MouseEvent) => {
    stop(e);
    if (busy) return;
    if (!token) {
      navigate(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const prev = { following, followers };
    const next = !following;
    setBusy(true);
    setFollowing(next);
    setFollowers((n) => (typeof n === 'number' ? Math.max(0, n + (next ? 1 : -1)) : n));
    try {
      const res = next ? await followSpace(space.id) : await unfollowSpace(space.id);
      setFollowing(!!res.following);
      if (typeof res.followersCount === 'number' || res.followersCount === null) setFollowers(res.followersCount);
    } catch (err: any) {
      setFollowing(prev.following);
      setFollowers(prev.followers);
      toast.error(err?.message || t('Could not update that follow', 'ফলো আপডেট করা যায়নি'));
    } finally {
      setBusy(false);
    }
  };

  // ⋮ menu (was a no-op): open, share, copy link.
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (ev: Event) => {
      if (!menuRef.current?.contains(ev.target as Node)) setMenu(false);
    };
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const coverStyle = coverUrl
    ? undefined
    : {
        background: `radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, ${accent} 35%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, white), color-mix(in srgb, ${accent} 70%, black))`,
      };

  const menuItem =
    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium hover:bg-muted transition-colors text-left';

  return (
    <div
      className={`group relative bg-card border border-border rounded-2xl overflow-visible shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <Link to={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <div className={`relative ${wide ? 'h-32' : dense ? 'h-14' : 'h-20'} w-full overflow-hidden rounded-t-2xl`} style={coverStyle}>
          {coverUrl && (
            <img src={coverUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          )}
          {coverUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />}
          {wide && (isFeatured || isTrending) && (
            <div className="absolute top-2 left-2 flex items-center gap-1">
              {isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur text-[11px] font-semibold text-white">
                  <Star size={10} className="text-amber-300 fill-amber-300" /> {t('Featured', 'ফিচার্ড')}
                </span>
              )}
              {isTrending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur text-[11px] font-semibold text-white">
                  <Flame size={10} className="text-rose-300 fill-rose-300" /> {t('Trending', 'ট্রেন্ডিং')}
                </span>
              )}
            </div>
          )}
          {!wide && (isFeatured || isTrending) && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur text-[11px] font-semibold text-white">
              {isFeatured ? (
                <>
                  <Star size={10} className="text-amber-300 fill-amber-300" /> {t('Featured', 'ফিচার্ড')}
                </>
              ) : (
                <>
                  <Flame size={10} className="text-rose-300 fill-rose-300" /> {t('Trending', 'ট্রেন্ডিং')}
                </>
              )}
            </span>
          )}
        </div>

        <div className={wide ? 'px-4 pb-4' : dense ? 'px-3 pb-2.5' : 'px-3.5 pb-3.5'}>
          <div className={`flex items-end justify-between ${wide ? '-mt-8' : dense ? '-mt-5' : '-mt-6'} relative z-10`}>
            <div
              className={`${wide ? 'w-16 h-16 rounded-2xl' : dense ? 'w-10 h-10 rounded-lg' : 'w-12 h-12 rounded-xl'} shrink-0 overflow-hidden ring-[3px] ring-card grid place-items-center shadow-sm`}
              style={avatarUrl ? undefined : { background: accent }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={space.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-[15px] font-bold text-white tracking-tight">{spaceInitials(space.name)}</span>
              )}
            </div>
            <div className="w-7" />
          </div>

          {(statusLabel || roleLabel) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {statusLabel && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                    pendingDeletion ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {statusLabel}
                </span>
              )}
              {roleLabel && (
                <span className="px-1.5 py-0.5 rounded-md bg-muted text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{roleLabel}</span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1 min-w-0">
            <h3 className="font-bold text-[14.5px] leading-tight truncate">{space.name}</h3>
            {(space.verificationStatus === 'VERIFIED' || space.verificationStatus === 'OFFICIAL') && (
              <BadgeCheck size={14} className="shrink-0 text-primary" />
            )}
            {showOwnerMeta && space.visibility === 'private' && <Lock size={12} className="shrink-0 text-muted-foreground" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[11.5px] text-muted-foreground">
            <span className="truncate">@{space.handle}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 shrink-0 font-medium" style={{ color: accent }}>
              {typeIcon} {t(spaceTypeLabel(space.spaceType), spaceTypeLabelBn(space.spaceType))}
            </span>
            {space.category && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{space.category}</span>
              </>
            )}
          </div>

          {space.tagline && <p className={`mt-1.5 text-[12.5px] text-foreground/80 ${wide ? 'line-clamp-3' : 'line-clamp-2'} leading-snug`}>{space.tagline}</p>}

          <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1" title={t('Followers', 'ফলোয়ার')}>
              <Users size={12} />
              <b className="font-semibold text-foreground">{typeof followers === 'number' ? formatFollowerCount(followers) : '-'}</b>
            </span>
            <span className="inline-flex items-center gap-1" title={t('Posts', 'পোস্ট')}>
              <LayoutList size={12} />
              <b className="font-semibold text-foreground">{formatFollowerCount(space.postsCount)}</b>
            </span>
            {activeStatus && (
              <span className="inline-flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {activeStatus}
              </span>
            )}
          </div>

          <div className={`${dense ? 'mt-2 pt-2' : 'mt-3 pt-2.5'} border-t border-border/60 flex items-center justify-between gap-2 min-h-[30px]`}>
            {friendCount > 0 ? (
              <div className="flex items-center min-w-0">
                <div className="flex -space-x-1.5 shrink-0">
                  {friendFollowers.slice(0, 3).map((f) => {
                    const friendAvatar = resolveAvatarUrl(f.avatar);
                    return (
                      <div key={f.id} title={f.name} className={`${wide ? 'w-6 h-6' : 'w-5 h-5'} rounded-full ring-[1.5px] ring-card bg-muted overflow-hidden`}>
                        {friendAvatar ? <img src={friendAvatar} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
                      </div>
                    );
                  })}
                </div>
                <span className="ml-1.5 text-[11px] text-muted-foreground truncate">{isBn ? `${formatNum(friendCount)} জন বন্ধু ফলো করেন` : `${friendCount} ${friendCount === 1 ? 'friend follows' : 'friends follow'}`}</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">{t('No friends yet', 'এখনো কোনো বন্ধু নেই')}</span>
            )}
            {recentMedia.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {recentMedia.map((m, i) => (
                  <div key={i} className={`relative ${wide ? 'w-11 h-11 rounded-lg' : 'w-6 h-6 rounded-md'} overflow-hidden bg-muted`}>
                    {m.src ? (
                      <img src={m.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                    {m.video ? (
                      <span className={`absolute inset-0 grid place-items-center ${m.src ? 'bg-black/25 text-white' : 'bg-muted text-muted-foreground'}`} aria-hidden="true">
                        <Play size={wide ? 16 : 10} className="fill-current" />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Actions sit over the card (outside the link) so they never navigate. */}
      <div className={`absolute right-3 ${wide ? 'top-[136px]' : dense ? 'top-[60px]' : 'top-[86px]'} z-20 flex items-center gap-1.5`} ref={menuRef}>
        {canFollow && (
          <button
            type="button"
            onClick={(e) => void toggleFollow(e)}
            disabled={busy}
            aria-pressed={following}
            className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors disabled:opacity-70 ${
              following ? 'bg-muted text-foreground hover:bg-muted/70' : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : following ? <Check size={12} /> : <Plus size={12} />}
            {following ? t('Following', 'ফলো করছেন') : t('Follow', 'ফলো')}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setMenu((v) => !v);
          }}
          aria-label={t('More options', 'আরও অপশন')}
          aria-expanded={menu}
          className="inline-grid place-items-center w-7 h-7 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 top-8 w-44 p-1 rounded-xl bg-card border border-border shadow-lg">
            <Link to={href} role="menuitem" className={menuItem} onClick={() => setMenu(false)}>
              <ExternalLink size={14} /> {t('Open Space', 'স্পেস খুলুন')}
            </Link>
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenu(false);
                openShare({ url: href, title: space.name, targetType: 'space', targetId: space.handle, preview: { type: 'space', authorName: space.name, title: space.tagline || `@${space.handle}` } });
              }}
            >
              <Share2 size={14} /> {t('Share', 'শেয়ার')}
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={async () => {
                setMenu(false);
                if (await copyToClipboard(`${window.location.origin}${href}`)) toast.success(t('Link copied', 'লিংক কপি হয়েছে'));
                else toast.error(t('Could not copy the link', 'লিংক কপি করা যায়নি'));
              }}
            >
              <Link2 size={14} /> {t('Copy link', 'লিংক কপি')}
            </button>
          </div>
        )}
      </div>

      {footer && <div className={`${dense ? 'px-3 pb-2.5' : 'px-3.5 pb-3.5'} -mt-1 relative z-10`}>{footer}</div>}
    </div>
  );
}
