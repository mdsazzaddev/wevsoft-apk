import SafeImage from '../ui/SafeImage';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { goBackOr } from '../../lib/appNavigation';
import {
  ArrowLeft, Search, MoreHorizontal, Camera, CheckCircle, Calendar,
  Plus, Pencil, UserPlus, UserCheck, MessageSquare, Star, Settings, Share2, Sparkles, X, Check,
  Eye, Move, Trash2, Upload, Clock3, UserMinus, ChevronDown, Bell, BellOff,
  MessageCircle, Phone, Mail, UserRound, Play, Video, Globe, ShoppingBag,
  Clapperboard,
} from 'lucide-react';
import { presetForType } from '../../lib/profileActionButtons';
import {
  PhotoActionMenu,
  PhotoViewer,
  anchorFromEvent,
  photoTriggerProps,
  type PhotoMenuAnchor,
  type PhotoMenuItem,
} from './PhotoActionMenu';
import SuspendedBadge from '../SuspendedBadge';
import SearchOverlay from '../SearchOverlay';
import { formatCompactCount, formatExactCount } from './personalProfileFormat';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import { toastSpaceModeFriendsBlocked } from '../../lib/spaceModeFriends';
import ProfileStatsSheet, { type StatsSheetMode } from './ProfileStatsSheet';
import ProfileManagerSheet from './ProfileManagerSheet';
import ProfileContentSearchOverlay from './ProfileContentSearchOverlay';
import type { ViewAsRole } from '../../lib/profileManager.logic';
import { CREATOR_HUB_NAME, personalCreatorHubPath } from '../../lib/creatorHub';

export type FriendAct = 'request' | 'cancel' | 'accept' | 'reject' | 'remove';

export type PersonalProfileChromeProps = {
  profile: any;
  isOwner: boolean;
  token?: string | null;
  /** null while the posts list is still loading (rendered as a dash). */
  postsCount: number | null;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  /** Overlay / custom back (Facebook-style sheet). */
  onBack?: () => void;
  onEditCover?: () => void;
  onEditAvatar?: () => void;
  onRepositionCover?: () => void;
  /** Owner only: clear the cover / avatar (shown as "Remove" in the photo menu). */
  onRemoveCover?: () => void;
  onRemoveAvatar?: () => void;
  uploadingCover?: boolean;
  /** Avatar upload progress 0-100 while uploading (null/undefined when idle). */
  avatarUploadProgress?: number | null;
  coverBackgroundStyle?: React.CSSProperties;
  selectedFrameCss?: string;
  onAddToStory?: () => void;
  onEditProfile?: () => void;
  onOpenFrame?: () => void;
  onShare?: () => void;
  /** Owner Profile Manager: switch profile content tab (e.g. highlights). */
  onProfileTab?: (tab: string) => void;
  /** Owner Profile Manager: open profile-scoped search. */
  onProfileSearch?: () => void;
  /** Owner Profile Manager: enter View As preview. */
  onViewAsPick?: (role: ViewAsRole) => void;
  /** Relationship action; without an argument the host picks the default for the current status. */
  onFriendAction?: (action?: FriendAct) => void;
  onFollowToggle?: () => void;
  onMessage?: () => void;
  /** Friends-only 1:1 call entry (audio/video). */
  onStartCall?: (type: 'audio' | 'video') => void;
  friendBusy?: boolean;
  followBusy?: boolean;
  /** Stats row → Posts: host switches to its posts tab. */
  onPostsClick?: () => void;
};

function coverFallback() {
  return 'bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30';
}

function AvatarRing({
  profile,
  selectedFrameCss,
  isOwner,
  onEditAvatar,
  onOpenMenu,
  onView,
  uploadProgress,
}: {
  profile: any;
  uploadProgress?: number | null;
  selectedFrameCss: string;
  isOwner: boolean;
  onEditAvatar?: () => void;
  /** Owner: click anywhere on the photo opens the photo menu. */
  onOpenMenu?: (anchor: PhotoMenuAnchor) => void;
  /** Visitor: click opens the photo viewer (only when there is a photo). */
  onView?: () => void;
}) {
  const inner = (
    <span className="block w-full h-full rounded-full overflow-hidden border-0 bg-muted">
      {profile.avatar ? (
        <SafeImage src={profile.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-foreground bg-muted-foreground/60">
          {profile.name?.charAt(0).toUpperCase()}
        </span>
      )}
      {uploadProgress != null && (
        <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-black/50 text-white text-xs font-bold" aria-live="polite">
          {uploadProgress}%
        </span>
      )}
    </span>
  );

  return (
    <div className="relative w-fit">
      {isOwner && (onOpenMenu || onEditAvatar) ? (
        <button
          type="button"
          onClick={(e) => (onOpenMenu ? onOpenMenu(anchorFromEvent(e)) : onEditAvatar?.())}
          className={`group relative block w-24 h-24 min-[380px]:w-28 min-[380px]:h-28 md:w-[144px] md:h-[144px] rounded-full p-1 bg-card shadow-md ring-1 ring-border md:ring-0 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/40 ${selectedFrameCss}`}
          aria-label="Change profile photo"
          aria-haspopup={onOpenMenu ? 'menu' : undefined}
        >
          {inner}
          {/* Desktop hover hint (touch devices go straight to the menu on tap). */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] hidden md:flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/0 text-white opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100"
          >
            <Camera size={18} />
            <span className="px-2 text-[11px] font-bold leading-tight text-center">Change profile photo</span>
          </span>
        </button>
      ) : !isOwner && profile.avatar && onView ? (
        <button
          type="button"
          onClick={onView}
          className={`relative block w-24 h-24 min-[380px]:w-28 min-[380px]:h-28 md:w-[144px] md:h-[144px] rounded-full p-1 bg-card shadow-md ring-1 ring-border md:ring-0 cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/40 ${selectedFrameCss}`}
          aria-label="View profile photo"
        >
          {inner}
        </button>
      ) : (
        <div className={`relative w-24 h-24 min-[380px]:w-28 min-[380px]:h-28 md:w-[144px] md:h-[144px] rounded-full p-1 bg-card shadow-md ring-1 ring-border md:ring-0 ${selectedFrameCss}`}>
          {inner}
        </div>
      )}
      {isOwner && onEditAvatar && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditAvatar();
          }}
          className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-muted"
          aria-label="Upload photo"
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  );
}

export default function PersonalProfileChrome({
  profile,
  isOwner,
  token,
  postsCount,
  friendsCount,
  followersCount,
  followingCount,
  onBack,
  onEditCover,
  onEditAvatar,
  onRepositionCover,
  onRemoveCover,
  onRemoveAvatar,
  uploadingCover,
  avatarUploadProgress,
  coverBackgroundStyle,
  selectedFrameCss = '',
  onAddToStory,
  onEditProfile,
  onOpenFrame,
  onShare,
  onProfileTab,
  onProfileSearch,
  onViewAsPick,
  onFriendAction,
  onFollowToggle,
  onMessage,
  onStartCall,
  friendBusy,
  followBusy,
  onPostsClick,
}: PersonalProfileChromeProps) {
  const navigate = useNavigate();
  const { isSpaceMode } = useSpaceIdentities();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileSearchOpen, setProfileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [actionButtons, setActionButtons] = useState<
    { id: string; type: string; label: string; url?: string | null }[]
  >([]);
  /** Facebook-style relationship dropdown (Respond / Request sent / Friends). */
  const [relOpen, setRelOpen] = useState(false);

  useEffect(() => {
    const uid = String(profile?.id || '');
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
      setActionButtons([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/profile/action-buttons?userId=${encodeURIComponent(uid)}`, {
          headers,
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.buttons)) setActionButtons(data.buttons);
      } catch {
        if (!cancelled) setActionButtons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, token]);
  // Stats row: union Friends & Followers + Reactions come from /api/u/:username/stats.
  const [stats, setStats] = useState<{ friendsAndFollowers: number; following: number; reactions: number; canSeeFriends: boolean; followers: number } | null>(null);
  const [statsSheet, setStatsSheet] = useState<StatsSheetMode | null>(null);
  const handle = String(profile.username || profile.profileSlug || profile.id || '');
  // Desktop first visit: gently scroll so the identity row + tabs/posts are visible.
  // Once per profile per session, skipped with a #hash, if the user already scrolled, or on mobile.
  const headerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash) return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    const key = `wev:profile-autoscroll:${handle}`;
    try { if (sessionStorage.getItem(key)) return; } catch { return; }
    const t = window.setTimeout(() => {
      const el = headerRef.current;
      if (!el) return;
      let sc: HTMLElement | null = null;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) { sc = p; break; }
      }
      const cur = sc ? sc.scrollTop : window.scrollY;
      if (cur > 8) return;
      try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
      const cover = el.firstElementChild as HTMLElement | null;
      const baseTop = sc ? sc.getBoundingClientRect().top : 0;
      const top = Math.max(0, Math.round(cur + el.getBoundingClientRect().top - baseTop + (cover?.offsetHeight ?? 300) * 0.45));
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (sc) sc.scrollTo({ top, behavior }); else window.scrollTo({ top, behavior });
    }, 450);
    return () => window.clearTimeout(t);
  }, [handle]);
  React.useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    fetch(`/api/u/${encodeURIComponent(handle)}/stats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStats(d); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [handle, token, friendsCount, followersCount, followingCount]);
  const closeStatsSheet = React.useCallback(() => setStatsSheet(null), []);
  // Facebook-style photo menu (owner) + fullscreen viewer (everyone).
  const [photoMenu, setPhotoMenu] = useState<{ kind: 'cover' | 'avatar'; anchor: PhotoMenuAnchor } | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const closePhotoMenu = React.useCallback(() => setPhotoMenu(null), []);
  const closeViewer = React.useCallback(() => setViewerSrc(null), []);
  const coverIsVideo =
    !!profile.coverVideo ||
    /\.(mp4|webm|mov)(\?|$)/i.test(String(profile.cover || '')) ||
    (profile as any).coverType === 'video';
  const viewableCover: string | null = profile.cover && !coverIsVideo ? String(profile.cover) : null;
  const coverClickable = (isOwner && !!onEditCover) || (!isOwner && !!viewableCover);
  const openCover = (anchor: PhotoMenuAnchor) => {
    if (isOwner && onEditCover) setPhotoMenu({ kind: 'cover', anchor });
    else if (viewableCover) setViewerSrc(viewableCover);
  };
  const photoMenuItems: PhotoMenuItem[] = [];
  if (photoMenu?.kind === 'cover') {
    if (onEditCover) photoMenuItems.push({ key: 'upload', label: 'Upload photo', icon: <Upload size={16} />, onSelect: onEditCover });
    if (viewableCover && onRepositionCover) photoMenuItems.push({ key: 'reposition', label: 'Reposition', icon: <Move size={16} />, onSelect: onRepositionCover });
    if (viewableCover) photoMenuItems.push({ key: 'view', label: 'View cover photo', icon: <Eye size={16} />, onSelect: () => setViewerSrc(viewableCover) });
    // PUT /api/profile clears `cover`, not `coverVideo`, so Remove is image-only.
    if (viewableCover && onRemoveCover) photoMenuItems.push({ key: 'remove', label: 'Remove cover photo', icon: <Trash2 size={16} />, onSelect: onRemoveCover, danger: true });
  } else if (photoMenu?.kind === 'avatar') {
    if (onEditAvatar) photoMenuItems.push({ key: 'upload', label: 'Upload photo', icon: <Upload size={16} />, onSelect: onEditAvatar });
    if (profile.avatar) photoMenuItems.push({ key: 'view', label: 'View profile photo', icon: <Eye size={16} />, onSelect: () => setViewerSrc(String(profile.avatar)) });
    if (profile.avatar && onRemoveAvatar) photoMenuItems.push({ key: 'remove', label: 'Remove profile photo', icon: <Trash2 size={16} />, onSelect: onRemoveAvatar, danger: true });
  }
  const verified = !!(profile.verified || profile.verifiedBadge);
  const isFollowing = !!profile.isFollower || !!profile.isFollowing;
  const friendStatus = profile.friendStatus || 'none';

  const friendLabel = (() => {
    if (friendStatus === 'accepted') return 'Friends';
    if (friendStatus === 'pending_sent') return 'Request sent';
    if (friendStatus === 'pending_received') return 'Respond';
    return 'Add Friend';
  })();
  const runFriend = (action: FriendAct) => {
    setRelOpen(false);
    if (isSpaceMode) {
      toastSpaceModeFriendsBlocked();
      return;
    }
    onFriendAction?.(action);
  };
  const relItem =
    'w-full px-3.5 py-2.5 text-left text-sm font-semibold hover:bg-muted flex items-center gap-2.5 disabled:opacity-60';

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    goBackOr(navigate, '/home');
  };

  return (
    <>
      <SearchOverlay open={searchOpen && !isOwner} onClose={() => setSearchOpen(false)} />
      <ProfileContentSearchOverlay
        open={profileSearchOpen || (searchOpen && isOwner)}
        onClose={() => {
          setProfileSearchOpen(false);
          setSearchOpen(false);
        }}
      />
      <PhotoActionMenu
        open={!!photoMenu && photoMenuItems.length > 0}
        anchor={photoMenu?.anchor ?? null}
        title={photoMenu?.kind === 'cover' ? 'Cover photo' : 'Profile photo'}
        items={photoMenuItems}
        onClose={closePhotoMenu}
      />
      <PhotoViewer src={viewerSrc} alt={profile.name || ''} onClose={closeViewer} />

      {/* 1. Top bar — overlays cover (sticky + negative margin pulls cover underneath) */}
      <div className="sticky top-0 z-40 -mb-12 flex h-12 items-center gap-0.5 px-2 bg-transparent">
        <button
          type="button"
          onClick={goBack}
          className="p-2 shrink-0 touch-manipulation text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] hover:opacity-90"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2.75} />
        </button>
        <div className="flex-1 min-w-0" aria-hidden />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="p-2 shrink-0 touch-manipulation text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] hover:opacity-90"
          aria-label="Search"
        >
          <Search size={22} strokeWidth={2.75} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (isOwner) setManagerOpen(true);
            else setMenuOpen((v) => !v);
          }}
          className="p-2 shrink-0 touch-manipulation text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] hover:opacity-90"
          aria-label={isOwner ? 'Profile Manager' : 'More'}
        >
          <MoreHorizontal size={22} strokeWidth={2.75} />
        </button>
      </div>

      {isOwner && (
        <ProfileManagerSheet
          open={managerOpen}
          onClose={() => setManagerOpen(false)}
          handlers={{
            onEditProfile,
            onShare,
            onOpenFrame,
            onProfileTab,
            onProfileSearch: onProfileSearch || (() => setProfileSearchOpen(true)),
            onViewAsPick,
          }}
        />
      )}

      {!isOwner && menuOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="fixed right-3 top-12 z-50 w-48 rounded-2xl border border-border bg-card shadow-xl py-1.5 overflow-hidden">
            {onFollowToggle && !isSpaceMode && (
              <button type="button" disabled={followBusy || !token} className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-muted flex items-center gap-2 disabled:opacity-60" onClick={() => { setMenuOpen(false); onFollowToggle(); }}>
                {isFollowing ? <BellOff size={16} /> : <Bell size={16} />} {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {onShare && (
              <button type="button" className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-muted flex items-center gap-2" onClick={() => { setMenuOpen(false); onShare(); }}>
                <Share2 size={16} /> Share profile
              </button>
            )}
          </div>
        </>
      )}

      {/* 2. Profile header layers: cover → white section → avatar (boundary) → info (in white) */}
      <div ref={headerRef} className="relative bg-card">
        {/* Layer 1 — cover media (full width, no text overlay from white section) */}
        <div
          // Facebook-style cover: 16:9 edge to edge on phones; 820:312 inside a
          // centred 1250px frame with rounded bottom corners from md up.
          className={`relative z-0 w-full aspect-[16/9] overflow-hidden bg-muted md:mx-auto md:aspect-auto md:h-[clamp(200px,22vw,300px)] md:max-w-[1100px] md:rounded-b-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-500/50 ${
            coverClickable ? (isOwner ? 'cursor-pointer group' : 'cursor-zoom-in') : ''
          }`}
          {...(coverClickable
            ? photoTriggerProps(isOwner ? 'Change cover photo' : 'View cover photo', openCover)
            : {})}
        >
          {profile.coverVideo || profile.cover ? (
            profile.coverVideo || /\.(mp4|webm|mov)(\?|$)/i.test(String(profile.cover)) || (profile as any).coverType === 'video' ? (
              <video
                src={profile.coverVideo || profile.cover}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
                loop
                preload="metadata"
              />
            ) : coverBackgroundStyle ? (
              // Fill the cover frame without distortion (no scale transform); layout of sibling chrome unchanged.
              <div
                className="w-full h-full"
                style={{
                  ...coverBackgroundStyle,
                  backgroundSize: 'cover', // keep aspect ratio; '100% 100%' stretched/smeared the wide desktop banner
                  transform: 'none',
                  transformOrigin: undefined,
                }}
              />
            ) : (
              <SafeImage src={profile.cover} alt="" className="w-full h-full object-cover" iconSize={32} />
            )
          ) : (
            <div className={`w-full h-full ${coverFallback()}`} />
          )}
          {isOwner && onEditCover && (
            // Desktop hover hint; pointer-events-none so the cover itself gets the click.
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden md:flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/10 group-hover:opacity-100"
            >
              <span className="sr-only">
                <Camera size={16} /> Change cover photo
              </span>
            </div>
          )}
          {isOwner && (onEditCover || (profile.cover && onRepositionCover)) && (
            <div className="absolute bottom-10 right-3 md:bottom-4 md:right-4 z-10 flex items-center gap-2">
              {profile.cover && onRepositionCover && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRepositionCover();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg bg-black/55 md:bg-card text-white md:text-foreground text-xs md:text-sm font-semibold shadow-md hover:md:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Reposition
                </button>
              )}
              {onEditCover && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCover();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg bg-black/55 md:bg-card text-white md:text-foreground text-xs md:text-sm font-semibold shadow-md hover:md:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera size={16} />
                  {uploadingCover ? 'Uploading...' : 'Edit cover photo'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Layer 2 — white sheet overlaps cover slightly so rounded-t corners show over the photo */}
        {/* Phones: the sheet tucks over the cover with rounded top corners. md+: the
            framed cover keeps its own rounded bottom, so the sheet starts below it. */}
        <div className="relative z-10 -mt-6 rounded-t-3xl bg-card md:mt-0 md:rounded-none">
          <div className="relative px-4 md:px-8 max-w-[1250px] md:max-w-[1100px] mx-auto">
            {/* Avatar at cover/card boundary; identity stays in the card flow */}
            <div className="flex items-start gap-3 md:items-end md:gap-4 md:pb-3 md:border-b md:border-border">
              {/* Layer 3 — profile picture only overlaps upward into cover */}
              <div className="relative z-30 -mt-12 min-[380px]:-mt-14 md:-mt-[72px] shrink-0">
                <AvatarRing
                  profile={profile}
                  selectedFrameCss={selectedFrameCss}
                  isOwner={isOwner}
                  onEditAvatar={onEditAvatar}
                  onOpenMenu={isOwner && onEditAvatar ? (anchor) => setPhotoMenu({ kind: 'avatar', anchor }) : undefined}
                  onView={profile.avatar ? () => setViewerSrc(String(profile.avatar)) : undefined}
                  uploadProgress={avatarUploadProgress}
                />
              </div>

              {/* Layer 4 — name/stats inside white (flex start = white top, never over cover) */}
              <div className="min-w-0 flex-1 pt-2 sm:pt-2.5 md:pt-0 md:pb-1 lg:pr-[340px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-[20px] sm:text-[22px] md:text-[28px] font-bold text-foreground tracking-tight leading-tight md:leading-[1.15]">
                    {profile.name}
                  </h1>
                  {verified && (
                    <CheckCircle className="w-[18px] h-[18px] text-blue-500 shrink-0" fill="currentColor" strokeWidth={0} />
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] md:text-[15px] text-muted-foreground font-medium truncate">
                    @{profile.username || profile.email?.split('@')[0] || 'user'}
                  </p>
                  <SuspendedBadge user={profile} />
                  {verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                      <Star size={10} className="fill-current" />
                      WevSpace Verified
                    </span>
                  )}
                </div>

                <div className="mt-2.5 md:mt-2 flex flex-wrap gap-x-1 md:gap-x-3 gap-y-1 -ml-1.5">
                  {[
                    {
                      key: 'posts',
                      value: postsCount,
                      label: postsCount === 1 ? 'Post' : 'Posts',
                      onClick: () => {
                        onPostsClick?.();
                        requestAnimationFrame(() => document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                      },
                    },
                    {
                      key: 'people',
                      // Unique people: friends ∪ followers (server de-dups); fallback before stats load.
                      value: stats?.friendsAndFollowers ?? (isSpaceMode ? followersCount : Math.max(friendsCount, followersCount)),
                      label: (stats?.friendsAndFollowers ?? (isSpaceMode ? followersCount : Math.max(friendsCount, followersCount))) === 1 ? 'Follower' : 'Followers',
                      onClick: () => setStatsSheet('people'),
                    },
                    { key: 'following', value: stats?.following ?? followingCount, label: 'Following', onClick: () => setStatsSheet('following') },
                    { key: 'reactions', value: stats?.reactions ?? 0, label: (stats?.reactions ?? 0) === 1 ? 'Reaction' : 'Reactions', onClick: () => setStatsSheet('reactions') },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={s.onClick}
                      className="rounded-lg px-1.5 py-1 text-left hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                    >
                      <div className="text-[14px] md:text-[16px] font-semibold text-foreground leading-none" title={s.value == null ? undefined : formatExactCount(s.value)}>{s.value == null ? '–' : formatCompactCount(s.value)}</div>
                      <div className="text-[11px] md:text-[13px] text-muted-foreground mt-0.5 font-normal whitespace-nowrap">{s.label}</div>
                    </button>
                  ))}
                </div>
                {statsSheet && handle && (
                  <ProfileStatsSheet
                    username={handle}
                    token={token}
                    mode={statsSheet}
                    initialTab="followers"
                    canSeeFriends={!isSpaceMode && (stats?.canSeeFriends ?? true)}
                    onClose={closeStatsSheet}
                  />
                )}
              </div>
            </div>

            {/* Bio · actions — intro meta (location/gender/joined) lives on About */}
            <div className="mt-3 pb-1 md:mt-2 md:pb-3">
              {profile.bio ? (
                <p className="wev-profile-bio text-[13px] sm:text-sm md:text-[15px] text-foreground/90 leading-relaxed md:max-w-[680px]">
                  {profile.bio}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-2 md:max-w-[560px] lg:absolute lg:right-8 lg:top-0.5 lg:mt-0 lg:max-w-[440px] lg:justify-end lg:[&>*]:flex-none lg:[&>button]:h-9 lg:[&>button:not([aria-label])]:px-3 lg:[&>div>button:first-child]:h-9 lg:[&>div>button:first-child]:px-4">
                {isOwner ? (
                  <>
                    {/* Stories live on Home (StoryBar); the profile only shows saved
                        highlights. The button renders only if a host still opts in. */}
                    {onAddToStory && (
                      <button
                        type="button"
                        onClick={onAddToStory}
                        className="flex-1 h-10 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        Add to Story
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onEditProfile}
                      className={
                        onAddToStory
                          ? 'flex-1 min-w-0 h-10 rounded-lg bg-card border border-border hover:bg-muted/60 text-foreground text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 px-2'
                          : 'flex-1 min-w-0 h-10 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] text-white text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 px-2'
                      }
                    >
                      <Pencil size={14} className="shrink-0" />
                      <span className="truncate">Edit Profile</span>
                    </button>
                    {/* Facebook-style Professional dashboard shortcut beside Edit. */}
                    <button
                      type="button"
                      onClick={() => { navigate(personalCreatorHubPath()); }}
                      className="group flex-1 min-w-0 h-10 rounded-lg bg-gradient-to-r from-sky-500/12 via-blue-500/10 to-indigo-500/12 hover:from-sky-500/18 hover:via-blue-500/15 hover:to-indigo-500/18 border border-sky-500/25 hover:border-sky-500/40 text-sky-700 dark:text-sky-300 text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors"
                      aria-label={CREATOR_HUB_NAME}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/20 group-hover:bg-sky-500/25">
                        <Clapperboard size={12} strokeWidth={2.25} />
                      </span>
                      <span className="truncate">{CREATOR_HUB_NAME}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManagerOpen(true)}
                      className="h-10 w-10 shrink-0 rounded-lg bg-card border border-border hover:bg-muted/60 flex items-center justify-center text-foreground"
                      aria-label="Profile Manager"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    {isSpaceMode ? (
                      /* Space identities can't befriend people — Follow is the only relationship. */
                      <button
                        type="button"
                        disabled={followBusy || !token}
                        onClick={onFollowToggle}
                        className={`flex-1 min-w-0 h-10 rounded-lg disabled:opacity-60 text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 ${
                          isFollowing ? 'bg-card border border-border hover:bg-muted/60 text-foreground' : 'bg-[#1877f2] hover:bg-[#166fe5] text-white'
                        }`}
                      >
                        {isFollowing ? <Check size={16} /> : <Plus size={16} />}
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : friendStatus === 'none' ? (
                      <button
                        type="button"
                        disabled={friendBusy || !token}
                        onClick={() => runFriend('request')}
                        className="flex-1 min-w-0 h-10 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] disabled:opacity-60 text-white text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={16} />
                        {friendLabel}
                      </button>
                    ) : (
                      <div className="relative flex-1 min-w-0">
                        <button
                          type="button"
                          disabled={friendBusy || !token}
                          onClick={() => setRelOpen((v) => !v)}
                          aria-haspopup="menu"
                          aria-expanded={relOpen}
                          className={`w-full h-10 rounded-lg disabled:opacity-60 text-[12px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 ${
                            friendStatus === 'pending_received'
                              ? 'bg-[#1877f2] hover:bg-[#166fe5] text-white'
                              : 'bg-card border border-border hover:bg-muted/60 text-foreground'
                          }`}
                        >
                          {friendStatus === 'accepted' ? <UserCheck size={16} /> : friendStatus === 'pending_sent' ? <Clock3 size={16} /> : <UserPlus size={16} />}
                          <span className="truncate">{friendLabel}</span>
                          <ChevronDown size={14} className="shrink-0 opacity-70" />
                        </button>
                        {relOpen && (
                          <>
                            <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setRelOpen(false)} />
                            <div role="menu" className="absolute left-0 top-11 z-50 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card py-1.5 shadow-xl">
                              {friendStatus === 'pending_received' && (
                                <>
                                  <button type="button" role="menuitem" className={relItem} onClick={() => runFriend('accept')}>
                                    <Check size={16} /> Confirm
                                  </button>
                                  <button type="button" role="menuitem" className={relItem} onClick={() => runFriend('reject')}>
                                    <X size={16} /> Delete request
                                  </button>
                                </>
                              )}
                              {friendStatus === 'pending_sent' && (
                                <button type="button" role="menuitem" className={relItem} onClick={() => runFriend('cancel')}>
                                  <X size={16} /> Cancel request
                                </button>
                              )}
                              {friendStatus === 'accepted' && (
                                <>
                                  {onStartCall && (
                                    <>
                                      <button type="button" role="menuitem" className={relItem} onClick={() => { setRelOpen(false); onStartCall('audio'); }}>
                                        <Phone size={16} /> Audio call
                                      </button>
                                      <button type="button" role="menuitem" className={relItem} onClick={() => { setRelOpen(false); onStartCall('video'); }}>
                                        <Video size={16} /> Video call
                                      </button>
                                    </>
                                  )}
                                  {onFollowToggle && (
                                    <button type="button" role="menuitem" disabled={followBusy} className={relItem} onClick={() => { setRelOpen(false); onFollowToggle(); }}>
                                      {isFollowing ? <BellOff size={16} /> : <Bell size={16} />} {isFollowing ? 'Unfollow' : 'Follow'}
                                    </button>
                                  )}
                                  <button type="button" role="menuitem" className={`${relItem} text-destructive`} onClick={() => runFriend('remove')}>
                                    <UserMinus size={16} /> Unfriend
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!token}
                      onClick={onMessage}
                      className={`flex-1 min-w-0 h-10 px-3 rounded-lg disabled:opacity-60 flex items-center justify-center gap-1.5 text-[12px] sm:text-sm font-semibold ${
                        friendStatus === 'accepted' && !isSpaceMode
                          ? 'bg-[#1877f2] hover:bg-[#166fe5] text-white'
                          : 'bg-card border border-border hover:bg-muted/60 text-foreground'
                      }`}
                      aria-label="Message"
                    >
                      <MessageSquare size={16} />
                      <span className="hidden min-[360px]:inline">Message</span>
                    </button>
                    {friendStatus === 'accepted' && !isSpaceMode && onStartCall ? (
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => onStartCall('audio')}
                        className="h-10 w-10 shrink-0 rounded-lg bg-card border border-border hover:bg-muted/60 flex items-center justify-center text-foreground disabled:opacity-60"
                        aria-label="Audio call"
                        title="Audio call"
                      >
                        <Phone size={16} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="h-10 w-10 shrink-0 rounded-lg bg-card border border-border hover:bg-muted/60 flex items-center justify-center text-foreground"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </>
                )}
              </div>

              {actionButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {actionButtons.map((btn) => {
                    const preset = presetForType(btn.type);
                    const Icon =
                      preset.icon === 'Phone'
                        ? Phone
                        : preset.icon === 'Mail'
                          ? Mail
                          : preset.icon === 'UserRound'
                            ? UserRound
                            : preset.icon === 'UserPlus'
                              ? UserPlus
                              : preset.icon === 'Play'
                                ? Play
                                : preset.icon === 'Globe'
                                  ? Globe
                                  : preset.icon === 'ShoppingBag'
                                    ? ShoppingBag
                                    : preset.icon === 'Calendar'
                                      ? Calendar
                                      : preset.icon === 'Bell'
                                        ? Bell
                                        : preset.icon === 'Sparkles'
                                          ? Sparkles
                                          : MessageCircle;
                    const run = () => {
                      if ((btn.type === 'MESSAGE' || btn.type === 'WEVCHAT') && onMessage) {
                        onMessage();
                        return;
                      }
                      if (btn.url) {
                        if (btn.url.startsWith('mailto:') || btn.url.startsWith('tel:')) {
                          window.location.href = btn.url;
                        } else {
                          window.open(btn.url, '_blank', 'noopener,noreferrer');
                        }
                      }
                    };
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={run}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors hover:brightness-95 ${preset.accent}`}
                      >
                        <Icon size={15} strokeWidth={2.25} />
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {verified && (
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-3.5 py-3 shadow-sm">
                  <CheckCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">WevSpace Verified</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      This personal account is verified by WevSpace.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
