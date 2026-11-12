/**
 * The Space header + tab strip. This is the ONE renderer used by the real public
 * page, the owner view and the wizard's live preview (spec §8) — if it changes
 * here, all three change together.
 *
 * `layout` decides whether the responsive breakpoints apply ('auto', used by the
 * real page) or a device shape is forced ('mobile'/'desktop', used by the
 * preview so a phone layout can be shown inside a desktop viewport).
 */

import { useCallback, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  Eye,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  PhotoActionMenu,
  PhotoViewer,
  photoTriggerProps,
  type PhotoMenuAnchor,
  type PhotoMenuItem,
} from '../profile/PhotoActionMenu';
import {
  SPACE_TAB_LABELS,
  SPACE_TAB_SHORT_LABELS,
  SPACE_VISIBLE_TAB_LIMIT,
  formatFollowerCount,
  isVerifiedSpace,
  resolveSpaceAccent,
  spaceInitials,
  spaceOwnerStatusNotice,
  spaceThemeDef,
  spaceTypeDef,
  spaceTypeLabel,
  type SpacePublicPayload,
  type SpaceTab,
} from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../UserAvatar';
import { spaceIcon } from './spaceIcons';

export type SpaceLayout = 'auto' | 'desktop' | 'mobile';

export interface SpaceIdentityProps {
  space: SpacePublicPayload;
  activeTab: SpaceTab;
  onTabChange?: (tab: SpaceTab) => void;
  layout?: SpaceLayout;
  /** 'owner' shows management affordances; 'public' shows what visitors see. */
  viewMode?: 'public' | 'owner';
  /** false renders the real chrome with actions inert — used by the preview. */
  interactive?: boolean;
  followPending?: boolean;
  onFollow?: () => void;
  onMessage?: () => void;
  onCta?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onMore?: () => void;
  onPickAvatar?: () => void;
  onPickCover?: () => void;
  /** Owner view: "Remove" in the photo menu (omitted when not provided). */
  onRemoveAvatar?: () => void;
  onRemoveCover?: () => void;
  /** Shows a spinner over the avatar / cover while an upload is in flight. */
  photoBusy?: 'avatar' | 'cover' | null;
  /**
   * Full-page mode (the real public page): no card chrome, edge-to-edge cover,
   * and the identity block + tabs centred in a wide container. Only meaningful
   * with layout 'auto'; the previews keep the card.
   */
  fullBleed?: boolean;
  className?: string;
}

function pick(layout: SpaceLayout, mobile: string, desktop: string, auto: string): string {
  if (layout === 'mobile') return mobile;
  if (layout === 'desktop') return desktop;
  return auto;
}

export default function SpaceIdentity({
  space,
  activeTab,
  onTabChange,
  layout = 'auto',
  viewMode = 'public',
  interactive = true,
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
  fullBleed = false,
  className = '',
}: SpaceIdentityProps) {
  const [tabsOpen, setTabsOpen] = useState(false);
  const [photoMenu, setPhotoMenu] = useState<{ kind: 'cover' | 'avatar'; anchor: PhotoMenuAnchor } | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const closePhotoMenu = useCallback(() => setPhotoMenu(null), []);
  const closeViewer = useCallback(() => setViewerSrc(null), []);
  const accent = useMemo(() => resolveSpaceAccent(space), [space.themePreset, space.accentColor]);
  const theme = spaceThemeDef(space.themePreset);
  const TypeIcon = spaceIcon(spaceTypeDef(space.spaceType).icon);

  const isOwnerView = viewMode === 'owner' && !!space.viewer?.canEdit;
  const statusNotice = spaceOwnerStatusNotice(space);
  const following = !!space.viewer?.isFollowing;
  const coverUrl = resolveAvatarUrl(space.cover);
  const avatarUrl = resolveAvatarUrl(space.avatar);
  const verified = isVerifiedSpace(space.verificationStatus);

  // Click-anywhere photo behaviour (real page only; previews stay inert):
  // owner -> Facebook-style menu, visitor -> viewer when there is a photo.
  const coverOwnerClick = interactive && isOwnerView && !!onPickCover;
  const avatarOwnerClick = interactive && isOwnerView && !!onPickAvatar;
  const coverClickable = coverOwnerClick || (interactive && !isOwnerView && !!coverUrl);
  const avatarClickable = avatarOwnerClick || (interactive && !isOwnerView && !!avatarUrl);
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

  const tabs = space.tabs || [];
  const visibleTabs = tabs.slice(0, SPACE_VISIBLE_TAB_LIMIT);
  const overflowTabs = tabs.slice(SPACE_VISIBLE_TAB_LIMIT);
  // FOLLOW duplicates the Follow button and NONE means the owner turned it off.
  const showsCta = space.ctaType !== 'FOLLOW' && space.ctaType !== 'NONE' && !!space.ctaLabel;

  const handleTab = (tab: SpaceTab) => {
    setTabsOpen(false);
    onTabChange?.(tab);
  };

  /**
   * In preview mode the action row is shown (it is part of the layout) but made
   * inert and removed from the tab order, rather than rendered as buttons that
   * silently do nothing when clicked.
   */
  const inertActions = interactive ? '' : 'pointer-events-none select-none';
  const actionAttrs: Record<string, unknown> = interactive ? {} : { tabIndex: -1, 'aria-hidden': true };

  const actionsRow = pick(
    layout,
    'flex flex-col gap-2 w-full',
    'flex flex-row items-center gap-2',
    'flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto',
  );
  const actionButton = pick(layout, 'w-full justify-center', '', 'w-full justify-center sm:w-auto');

  return (
    <div
      className={
        fullBleed
          ? `bg-card border-b border-border ${className}`
          : `bg-card border border-border rounded-3xl overflow-hidden ${className}`
      }
    >
      <PhotoActionMenu
        open={!!photoMenu && photoMenuItems.length > 0}
        anchor={photoMenu?.anchor ?? null}
        title={photoMenu?.kind === 'cover' ? 'Cover photo' : 'Profile photo'}
        items={photoMenuItems}
        onClose={closePhotoMenu}
      />
      <PhotoViewer src={viewerSrc} alt={space.name} onClose={closeViewer} />
      {/* Cover — theme gradient stands in until an image is uploaded */}
      <div
        className={`relative w-full ${
          fullBleed
            ? // Facebook-style: 16:9 edge to edge on phones; 820:312 in a centred
              // 1250px frame with rounded bottom corners from md up.
              'aspect-[16/9] overflow-hidden md:aspect-[820/312] md:max-w-[1250px] md:mx-auto md:rounded-b-xl'
            : // Previews (wizard / customize 'Desktop' + 'Mobile', composer) use the
              // same Facebook ratios as the real page so the preview is honest.
              pick(layout, 'aspect-[16/9]', 'aspect-[820/312]', 'aspect-[16/9] md:aspect-[820/312]')
        } ${
          coverUrl ? '' : `bg-gradient-to-br ${theme.cover}`
        } ${
          coverClickable
            ? `${coverOwnerClick ? 'cursor-pointer group/cover' : 'cursor-zoom-in'} focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/50`
            : ''
        }`}
        {...(coverClickable
          ? photoTriggerProps(coverOwnerClick ? 'Change cover photo' : 'View cover photo', (anchor) => openPhoto('cover', anchor))
          : {})}
      >
        {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
        {/* Scrim only matters over a photo; over the light theme gradient it just greys it. */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${coverUrl ? 'from-black/40' : 'from-black/10'} via-transparent to-transparent`}
        />
        {coverOwnerClick && (
          // Desktop hover hint; pointer-events-none so the cover itself takes the click.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover/cover:bg-black/30 group-hover/cover:opacity-100"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/55 text-white text-sm font-semibold backdrop-blur-[2px] shadow-lg">
              <Camera size={16} /> Change cover photo
            </span>
          </div>
        )}
        {photoBusy === 'cover' && (
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <Loader2 size={26} className="animate-spin text-white" />
          </div>
        )}
        {isOwnerView && onPickCover && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPickCover();
            }}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-bold backdrop-blur hover:bg-black/70 transition-colors"
          >
            <Camera size={14} /> Cover
          </button>
        )}
      </div>

      {/* Identity block */}
      <div
        className={
          fullBleed
            ? 'max-w-6xl mx-auto px-4 pb-5 sm:px-6 lg:px-8 lg:pb-6'
            : pick(layout, 'px-4 pb-4', 'px-6 pb-5', 'px-4 pb-4 sm:px-6 sm:pb-5')
        }
      >
        <div
          className={
            fullBleed
              ? // Only the avatar overlaps the cover; name/actions start below the cover
                // edge so they stay readable on dark covers and cover photos.
                'flex flex-col items-center text-center -mt-12 sm:flex-row sm:items-start sm:text-left sm:gap-6 sm:-mt-16 lg:-mt-[4.5rem]'
              : pick(
                  layout,
                  'flex flex-col items-center text-center -mt-12',
                  'flex flex-row items-start gap-5 -mt-14',
                  'flex flex-col items-center text-center -mt-12 sm:flex-row sm:items-end sm:text-left sm:gap-5 sm:-mt-14',
                )
          }
        >
          <div className="relative shrink-0">
            <div
              {...(avatarClickable
                ? photoTriggerProps(avatarOwnerClick ? 'Change profile photo' : 'View profile photo', (anchor) => openPhoto('avatar', anchor))
                : {})}
              className={`relative rounded-full overflow-hidden border-4 border-card bg-muted grid place-items-center shadow-lg ${
                avatarClickable
                  ? `${avatarOwnerClick ? 'cursor-pointer group/avatar' : 'cursor-zoom-in'} focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50`
                  : ''
              } ${
                fullBleed ? 'w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36' : pick(layout, 'w-24 h-24', 'w-32 h-32', 'w-24 h-24 sm:w-32 sm:h-32')
              }`}
              style={avatarUrl ? undefined : { background: accent }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={space.name} className="w-full h-full object-cover" />
              ) : (
                <span className={`font-black text-white ${pick(layout, 'text-2xl', 'text-3xl', 'text-2xl sm:text-3xl')}`}>
                  {spaceInitials(space.name)}
                </span>
              )}
              {avatarOwnerClick && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 hidden md:flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/0 text-white opacity-0 transition-all duration-150 group-hover/avatar:bg-black/45 group-hover/avatar:opacity-100"
                >
                  <Camera size={18} />
                  <span className="px-2 text-[10px] font-bold leading-tight text-center">Change profile photo</span>
                </span>
              )}
              {photoBusy === 'avatar' && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
                  <Loader2 size={22} className="animate-spin text-white" />
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
                className="absolute right-0.5 bottom-0.5 p-2 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-card hover:opacity-90 transition-opacity"
              >
                <Camera size={14} />
              </button>
            )}
          </div>

          <div
            className={`flex-1 min-w-0 w-full ${
              fullBleed
                ? 'mt-3 sm:mt-[4.75rem] lg:mt-[5.25rem]'
                : pick(layout, 'mt-3', 'mt-[4.25rem]', 'mt-3 sm:mt-0')
            }`}
          >
            <div
              className={pick(
                layout,
                'flex items-center justify-center gap-1.5',
                'flex items-center gap-1.5',
                'flex items-center justify-center gap-1.5 sm:justify-start',
              )}
            >
              <h1
                className={`font-black truncate ${
                  fullBleed ? 'text-2xl sm:text-3xl tracking-tight' : pick(layout, 'text-xl', 'text-2xl', 'text-xl sm:text-2xl')
                }`}
              >
                {space.name}
              </h1>
              {verified && (
                <span title="Verified WevSpace" className="shrink-0" style={{ color: accent }}>
                  <BadgeCheck size={20} />
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground font-semibold mt-0.5 truncate">@{space.handle}</p>

            <div
              className={pick(
                layout,
                'flex flex-wrap items-center justify-center gap-2 mt-2',
                'flex flex-wrap items-center gap-2 mt-2',
                'flex flex-wrap items-center justify-center gap-2 mt-2 sm:justify-start',
              )}
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: `${accent}1a`, color: accent }}
              >
                {/* eslint-disable-next-line react-hooks/static-components -- inline component kept as-is (existing behavior) */}
                <TypeIcon size={12} /> {spaceTypeLabel(space.spaceType)}
              </span>
              {space.category && (
                <span className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                  {space.category}
                </span>
              )}
              {space.location && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <MapPin size={12} /> {space.location}
                </span>
              )}
            </div>

            {(space.tagline || space.bio) && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-2xl">
                {space.tagline || space.bio}
              </p>
            )}

            <div
              className={pick(
                layout,
                'flex items-center justify-center gap-4 mt-3',
                'flex items-center gap-5 mt-3',
                'flex items-center justify-center gap-4 mt-3 sm:justify-start sm:gap-5',
              )}
            >
              {/* null when the owner has hidden the count — the stat is dropped
                  rather than rendered as a misleading zero. */}
              {typeof space.followersCount === 'number' && (
                <span className="text-sm">
                  <b className="font-black">{formatFollowerCount(space.followersCount)}</b>{' '}
                  <span className="text-muted-foreground font-semibold">followers</span>
                </span>
              )}
              <span className="text-sm">
                <b className="font-black">{formatFollowerCount(space.postsCount)}</b>{' '}
                <span className="text-muted-foreground font-semibold">posts</span>
              </span>
              {isOwnerView && typeof space.viewsCount === 'number' && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-semibold">
                  <Eye size={14} /> {formatFollowerCount(space.viewsCount)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className={`${actionsRow} ${inertActions} shrink-0 ${
              fullBleed
                ? 'mt-4 sm:mt-[4.75rem] lg:mt-[5.25rem]'
                : pick(layout, 'mt-4', 'mt-[4.25rem]', 'mt-4 sm:mt-0')
            }`}
          >
            {isOwnerView ? (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  {...actionAttrs}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-primary-foreground shadow-md hover:opacity-90 transition-opacity ${actionButton}`}
                  style={{ background: accent }}
                >
                  <Pencil size={15} /> Customize
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  {...actionAttrs}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${actionButton}`}
                >
                  <Share2 size={15} /> Share
                </button>
              </>
            ) : (
              <>
                {showsCta && (
                  <button
                    type="button"
                    onClick={onCta}
                    {...actionAttrs}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-primary-foreground shadow-md hover:opacity-90 transition-opacity ${actionButton}`}
                    style={{ background: accent }}
                  >
                    {space.ctaLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onFollow}
                  disabled={followPending}
                  {...actionAttrs}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold transition-colors disabled:opacity-60 ${
                    following || showsCta
                      ? 'bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5'
                      : 'text-primary-foreground shadow-md hover:opacity-90'
                  } ${actionButton}`}
                  style={!following && !showsCta ? { background: accent } : undefined}
                >
                  {followPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : following ? (
                    <Check size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  {following ? 'Following' : 'Follow'}
                </button>
                {space.features?.messaging && (
                  <button
                    type="button"
                    onClick={onMessage}
                    {...actionAttrs}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${actionButton}`}
                  >
                    <MessageCircle size={15} /> Message
                  </button>
                )}
                <button
                  type="button"
                  onClick={onMore}
                  {...actionAttrs}
                  aria-label="More options"
                  className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${pick(layout, 'w-full', '', 'w-full sm:w-auto')}`}
                >
                  <MoreHorizontal size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {statusNotice && isOwnerView && (
          <div
            className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold ${
              statusNotice.tone === 'danger'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            <ShieldCheck size={14} className="shrink-0" />
            {statusNotice.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div
          className={`flex items-center gap-1 ${
            fullBleed
              ? 'max-w-6xl mx-auto px-2 overflow-x-auto no-scrollbar sm:px-4 sm:overflow-visible lg:px-6'
              : pick(layout, 'px-2 overflow-x-auto no-scrollbar', 'px-4', 'px-2 overflow-x-auto no-scrollbar sm:px-4 sm:overflow-visible')
          }`}
        >
          {visibleTabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTab(tab)}
                aria-current={active ? 'page' : undefined}
                className={`relative shrink-0 px-3.5 py-3 text-sm font-extrabold transition-colors ${
                  active ? '' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={active ? { color: accent } : undefined}
              >
                {pick(layout, SPACE_TAB_SHORT_LABELS[tab], SPACE_TAB_LABELS[tab], SPACE_TAB_SHORT_LABELS[tab])}
                {active && (
                  <span
                    className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: accent }}
                  />
                )}
              </button>
            );
          })}

          {overflowTabs.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setTabsOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-3.5 py-3 text-sm font-extrabold text-muted-foreground hover:text-foreground transition-colors"
              >
                More <ChevronDown size={14} />
              </button>
              {tabsOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-40 p-1.5 rounded-2xl bg-card border border-border shadow-xl">
                  {overflowTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTab(tab)}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {SPACE_TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
