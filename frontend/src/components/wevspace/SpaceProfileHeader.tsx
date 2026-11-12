/**
 * Compact public Space profile header (approved v2 concept). Used by the real
 * Space page only; the wizard preview and edit drawer keep <SpaceIdentity>.
 * Views are never shown here. Rating appears only when real reviews exist.
 */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Eye,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { PhotoActionMenu, PhotoViewer, photoTriggerProps, type PhotoMenuAnchor, type PhotoMenuItem } from '../profile/PhotoActionMenu';
import {
  SPACE_TAB_LABELS,
  formatFollowerCount,
  isVerifiedSpace,
  resolveSpaceAccent,
  spaceDashboardPath,
  spaceDeskPath,
  spaceInitials,
  spaceOwnerStatusNotice,
  spaceTypeLabel,
  type SpaceTab,
} from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../UserAvatar';
import type { SpaceIdentityProps } from './SpaceIdentity';
import WevDeskMark from './WevDeskMark';

const VISIBLE_TABS = 6;

export default function SpaceProfileHeader({
  space,
  activeTab,
  onTabChange,
  viewMode = 'public',
  followPending = false,
  onFollow,
  onMessage,
  onCta,
  onShare,
  onEdit,
  onMore,
  onPickAvatar,
  onPickCover,
  onRemoveAvatar,
  onRemoveCover,
  photoBusy = null,
  rating = null,
}: SpaceIdentityProps & { rating?: { average: number; total: number } | null }) {
  const [tabsOpen, setTabsOpen] = useState(false);
  const [photoMenu, setPhotoMenu] = useState<{ kind: 'cover' | 'avatar'; anchor: PhotoMenuAnchor } | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const closePhotoMenu = useCallback(() => setPhotoMenu(null), []);
  const closeViewer = useCallback(() => setViewerSrc(null), []);

  const accent = resolveSpaceAccent(space);
  const isOwnerView = viewMode === 'owner' && !!space.viewer?.canEdit;
  const isTeam = !!space.viewer?.isOwner || !!space.viewer?.role;
  const following = !!space.viewer?.isFollowing;
  const coverUrl = resolveAvatarUrl(space.cover);
  const avatarUrl = resolveAvatarUrl(space.avatar);
  const verified = isVerifiedSpace(space.verificationStatus);
  const statusNotice = spaceOwnerStatusNotice(space);
  const showsCta = space.ctaType !== 'FOLLOW' && space.ctaType !== 'NONE' && !!space.ctaLabel;

  const coverOwnerClick = isOwnerView && !!onPickCover;
  const avatarOwnerClick = isOwnerView && !!onPickAvatar;
  const openPhoto = (kind: 'cover' | 'avatar', anchor: PhotoMenuAnchor) => {
    const owner = kind === 'cover' ? coverOwnerClick : avatarOwnerClick;
    const url = kind === 'cover' ? coverUrl : avatarUrl;
    if (owner) setPhotoMenu({ kind, anchor });
    else if (url) setViewerSrc(url);
  };
  const photoMenuItems: PhotoMenuItem[] = [];
  if (photoMenu) {
    const cover = photoMenu.kind === 'cover';
    const url = cover ? coverUrl : avatarUrl;
    const pickFn = cover ? onPickCover : onPickAvatar;
    const removeFn = cover ? onRemoveCover : onRemoveAvatar;
    if (pickFn) photoMenuItems.push({ key: 'upload', label: 'Upload photo', icon: <Upload size={16} />, onSelect: pickFn });
    if (url) photoMenuItems.push({ key: 'view', label: cover ? 'View cover photo' : 'View profile photo', icon: <Eye size={16} />, onSelect: () => setViewerSrc(url) });
    if (url && removeFn) photoMenuItems.push({ key: 'remove', label: cover ? 'Remove cover photo' : 'Remove profile photo', icon: <Trash2 size={16} />, onSelect: removeFn, danger: true });
  }
  const coverClickable = coverOwnerClick || !!coverUrl;
  const avatarClickable = avatarOwnerClick || !!avatarUrl;

  const tabs = space.tabs || [];
  const visibleTabs = tabs.slice(0, VISIBLE_TABS);
  const overflowTabs = tabs.slice(VISIBLE_TABS);
  const pickTab = (tab: SpaceTab) => {
    setTabsOpen(false);
    onTabChange?.(tab);
  };

  const btn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-60';
  const ghost = `${btn} bg-card border border-border hover:bg-muted`;
  const primary = `${btn} bg-primary text-primary-foreground shadow-sm hover:opacity-90`;
  const website = space.website ? space.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  const joined = space.publishedAt || space.createdAt;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 min-w-0">
      <PhotoActionMenu
        open={!!photoMenu && photoMenuItems.length > 0}
        anchor={photoMenu?.anchor ?? null}
        title={photoMenu?.kind === 'cover' ? 'Cover photo' : 'Profile photo'}
        items={photoMenuItems}
        onClose={closePhotoMenu}
      />
      <PhotoViewer src={viewerSrc} alt={space.name} onClose={closeViewer} />

      {/* Cover */}
      <div
        className={`relative h-[120px] sm:h-[150px] rounded-2xl overflow-hidden ${coverClickable ? (coverOwnerClick ? 'cursor-pointer' : 'cursor-zoom-in') : ''}`}
        style={
          coverUrl
            ? undefined
            : {
                background: `radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, ${accent} 40%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, white), color-mix(in srgb, ${accent} 70%, black))`,
              }
        }
        {...(coverClickable ? photoTriggerProps(coverOwnerClick ? 'Change cover photo' : 'View cover photo', (a) => openPhoto('cover', a)) : {})}
      >
        {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
        {photoBusy === 'cover' && (
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
        )}
        {isOwnerView && onPickCover && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPickCover();
            }}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/55 text-white text-[11.5px] font-semibold backdrop-blur hover:bg-black/70"
          >
            <Camera size={13} /> Cover
          </button>
        )}
      </div>

      {/* Identity row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 px-1 sm:px-4 -mt-9 relative">
        <div className="relative shrink-0 self-start">
          <div
            className={`w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-[20px] overflow-hidden grid place-items-center text-white text-2xl font-extrabold ring-4 ring-background shadow-md ${
              avatarClickable ? (avatarOwnerClick ? 'cursor-pointer' : 'cursor-zoom-in') : ''
            }`}
            style={avatarUrl ? undefined : { background: accent }}
            {...(avatarClickable ? photoTriggerProps(avatarOwnerClick ? 'Change profile photo' : 'View profile photo', (a) => openPhoto('avatar', a)) : {})}
          >
            {avatarUrl ? <img src={avatarUrl} alt={space.name} className="w-full h-full object-cover" /> : spaceInitials(space.name)}
            {photoBusy === 'avatar' && (
              <span className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 size={20} className="animate-spin text-white" />
              </span>
            )}
          </div>
          {isOwnerView && onPickAvatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickAvatar();
              }}
              aria-label="Change profile image"
              className="absolute -right-1 -bottom-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background"
            >
              <Camera size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 sm:pb-1">
          <h1 className="flex items-center gap-1.5 text-xl sm:text-[22px] font-extrabold tracking-tight">
            <span className="truncate">{space.name}</span>
            {verified && <BadgeCheck size={19} className="shrink-0 text-primary" aria-label="Verified Space" />}
          </h1>
          <p className="text-[13px] text-muted-foreground truncate">
            @{space.handle} <span className="opacity-60">·</span>{' '}
            <span className="font-semibold" style={{ color: accent }}>
              {space.typeLabel || spaceTypeLabel(space.spaceType)}
            </span>
            {space.category && (
              <>
                {' '}
                <span className="opacity-60">·</span> {space.category}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:pb-1">
          {isTeam ? (
            <>
              <Link to={spaceDeskPath(space.handle)} className={`${btn} bg-teal-600 text-white hover:bg-teal-700`}>
                <WevDeskMark size={16} /> WevDesk
              </Link>
              <Link to={spaceDashboardPath(space.handle)} className={ghost}>
                <Settings2 size={15} /> Manage
              </Link>
              {isOwnerView && onEdit && (
                <button type="button" onClick={onEdit} className={ghost}>
                  <Pencil size={14} /> Customize
                </button>
              )}
            </>
          ) : (
            <>
              {showsCta && (
                <button type="button" onClick={onCta} className={primary}>
                  {space.ctaLabel}
                </button>
              )}
              <button type="button" onClick={onFollow} disabled={followPending} aria-pressed={following} className={following || showsCta ? ghost : primary}>
                {followPending ? <Loader2 size={14} className="animate-spin" /> : following ? <Check size={15} /> : <Plus size={15} />}
                {following ? 'Following' : 'Follow'}
              </button>
              {space.features?.messaging && (
                <button type="button" onClick={onMessage} className={ghost}>
                  <MessageCircle size={15} /> Message
                </button>
              )}
            </>
          )}
          <button type="button" onClick={onShare} className={ghost}>
            <Share2 size={15} /> Share
          </button>
          <button type="button" onClick={onMore} aria-label="More options" className={`${ghost} !px-0 w-9`}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Bio + meta + stats */}
      <div className="px-1 sm:px-4">
        {(space.bio || space.tagline) && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/85 max-w-2xl line-clamp-3">{space.bio || space.tagline}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
          {space.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {space.location}
            </span>
          )}
          {website && (
            <a href={space.website!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
              <Link2 size={13} /> {website}
            </a>
          )}
          {joined && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} /> Joined {new Date(joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
          {typeof space.followersCount === 'number' && (
            <span>
              <b className="text-[15px] font-bold text-foreground">{formatFollowerCount(space.followersCount)}</b> followers
            </span>
          )}
          <span>
            <b className="text-[15px] font-bold text-foreground">{formatFollowerCount(space.postsCount)}</b> posts
          </span>
          {rating && rating.total > 0 && (
            <button type="button" onClick={() => tabs.includes('reviews') && pickTab('reviews')} className="inline-flex items-center gap-1">
              <b className="text-[15px] font-bold text-foreground">{rating.average.toFixed(1)}</b>
              <Star size={13} className="text-amber-500 fill-amber-500" /> rating ({rating.total})
            </button>
          )}
        </div>
        {statusNotice && isOwnerView && (
          <div
            className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              statusNotice.tone === 'danger' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            <ShieldCheck size={14} /> {statusNotice.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-3 border-b border-border flex items-center gap-0.5 overflow-x-auto no-scrollbar sm:overflow-visible px-1 sm:px-3">
        {visibleTabs.map((tab) => {
          const on = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => pickTab(tab)}
              aria-current={on ? 'page' : undefined}
              className={`relative shrink-0 px-3 py-2.5 text-[13px] transition-colors ${on ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium hover:text-foreground'}`}
            >
              {SPACE_TAB_LABELS[tab]}
              {on && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
        {overflowTabs.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTabsOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium ${overflowTabs.includes(activeTab) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {overflowTabs.includes(activeTab) ? SPACE_TAB_LABELS[activeTab] : 'More'} <ChevronDown size={13} />
            </button>
            {tabsOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-40 p-1 rounded-xl bg-card border border-border shadow-lg">
                {overflowTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => pickTab(tab)} className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-muted">
                    {SPACE_TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
