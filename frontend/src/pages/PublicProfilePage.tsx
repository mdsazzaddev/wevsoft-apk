import React, { useEffect, useRef, useState } from 'react';
import { openShare } from '../lib/share/openShare';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { formatCompactCount, formatExactCount } from '../components/profile/personalProfileFormat';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import {
  MapPin, Heart, GraduationCap, Briefcase, Globe, Github, Twitter, Linkedin,
  Facebook, Youtube, Instagram, Video, User, MessageCircle, Share2, CheckCircle, MoreHorizontal,
} from 'lucide-react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import PublicSpacesSection from '../components/wevspace/PublicSpacesSection';
import PersonalProfileChrome, { type FriendAct } from '../components/profile/PersonalProfileChrome';
import ProfileHighlightsRow from '../components/profile/ProfileHighlightsRow';
import ProfileAlbumsSection from '../components/profile/ProfileAlbumsSection';
import ProfileWallSection from '../components/profile/ProfileWallSection';
import ProfileTestimonialsSection from '../components/profile/ProfileTestimonialsSection';
import ProfileMusicSection from '../components/profile/ProfileMusicSection';
import PersonalNoteSheet from '../components/profile/PersonalNoteSheet';
import { MutualFriendsButton } from '../components/social/MutualFriendsButton';
import { PresenceDot } from '../components/social/PresenceDot';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { toastSpaceModeFriendsBlocked } from '../lib/spaceModeFriends';
import { UnifiedPostCard } from '../components/feed/UnifiedFeed';
import PostMediaGrid from '../components/social/PostMediaGrid';
import PostBackgroundMusic from '../components/social/PostBackgroundMusic';
import ExpandableText from '../components/ExpandableText';
import { parseLegacyMedia } from '../lib/postMedia';
import { goBackOr, readSessionString, writeSessionString } from '../lib/appNavigation';
import { wevchatApi } from '../lib/wevchatApi';
import { useOverlayBack } from '../hooks/useOverlayBack';
import { acquirePostMusicSuspend } from '../lib/postMusicPlayback';
import { pauseExclusivePlayback } from '../lib/exclusiveMediaPlayback';
import { stopReelPreview } from '../lib/reelPreviewPlayback';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

const SOCIAL_ICONS: any = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  x: Twitter,
  youtube: Youtube,
};

const PUBLIC_PROFILE_TAB_IDS = ['posts', 'about', 'photos', 'videos'] as const;

const TAB_LABELS: Record<string, string> = {
  posts: 'Posts',
  about: 'About',
  photos: 'Photos',
  videos: 'Videos',
};

function coverBackground(url?: string | null, cfg?: { zoom?: number; cropX?: number; cropY?: number } | null) {
  if (!url) return undefined;
  const zoom = cfg?.zoom || 1;
  const x = cfg?.cropX ?? 0.5;
  const y = cfg?.cropY ?? 0.5;
  // Always fill the frame (the cover is 16:9 on phones and 820:312 on desktop),
  // then zoom around the chosen focal point - no empty bands at any aspect.
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
    backgroundSize: 'cover',
    backgroundPosition: `${x * 100}% ${y * 100}%`,
    backgroundRepeat: 'no-repeat' as const,
    ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: `${x * 100}% ${y * 100}%` } : {}),
  };
}

function PublicPostCard({ post, profile }: { post: any; profile: any }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPostMusic = Boolean(post.postMusic?.audioUrl || post.music?.audioUrl || post.postMusic?.audioUrlSnapshot);
  const media = post.postMedia || post.media || [];
  const hasMedia = Array.isArray(media) && media.length > 0;
  const isPinned = !!(post.pinned || post.isPinned);
  const created = post.createdAt ? new Date(post.createdAt) : null;
  const timeLabel = created && isValid(created)
    ? format(created, 'MMM d \'at\' h:mm a')
    : formatDistanceToNow(created || new Date()) + ' ago';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      {isPinned && (
        <div className="px-4 pt-3 flex items-center gap-1.5 text-[11px] font-bold text-violet-600">
          <span aria-hidden>📌</span> Pinned Post
        </div>
      )}
      {!hasMedia ? <PostBackgroundMusic postId={post.id} post={post} rootRef={cardRef} /> : null}
      <div className={`px-4 sm:px-5 ${isPinned ? 'pt-2' : 'pt-4'} pb-3 flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-fuchsia-500">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
              {profile.name?.charAt(0)?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate text-foreground flex items-center gap-1">
            {profile.name}
            {(profile.verified || profile.verifiedBadge) && (
              <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" strokeWidth={0} />
            )}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {timeLabel}
            <Globe className="w-3 h-3 opacity-70" />
          </p>
        </div>
        <button onClick={() => {}} type="button" className="p-1.5 rounded-full hover:bg-muted text-muted-foreground" aria-label="Post options">
          <MoreHorizontal size={16} />
        </button>
      </div>
      {post.content && (
        <ExpandableText text={post.content} className="px-4 sm:px-5 pb-3 text-sm leading-relaxed text-foreground/90" />
      )}
      {hasMedia ? (
        <div className="relative">
          <PostMediaGrid
            media={media}
            template={post.templateType}
            legacyMedia={parseLegacyMedia(post.media)}
            forceMuteVideos={!!post.postMusic?.originalAudioMuted}
            hideVideoMuteControl={hasPostMusic}
          />
          <PostBackgroundMusic postId={post.id} post={post} rootRef={cardRef} />
        </div>
      ) : null}
      <div className="px-4 sm:px-5 py-2.5 flex items-center gap-4 text-xs font-semibold text-muted-foreground border-t border-border">
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4" /> <span title={formatExactCount(post._count?.likes ?? post.counts?.likes ?? 0)}>{formatCompactCount(post._count?.likes ?? post.counts?.likes ?? 0)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" /> <span title={formatExactCount(post._count?.comments ?? post.counts?.comments ?? 0)}>{formatCompactCount(post._count?.comments ?? post.counts?.comments ?? 0)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="w-4 h-4" /> <span title={formatExactCount(post._count?.shares ?? post.counts?.shares ?? 0)}>{formatCompactCount(post._count?.shares ?? post.counts?.shares ?? 0)}</span>
        </span>
      </div>
      <div className="px-2 pb-2 grid grid-cols-3 gap-1 border-t border-border">
        {['Like', 'Comment', 'Share'].map((label) => (
          <button onClick={() => {}}
            key={label}
            type="button"
            className="h-9 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted flex items-center justify-center gap-1.5"
          >
            {label === 'Like' && <Heart className="w-4 h-4" />}
            {label === 'Comment' && <MessageCircle className="w-4 h-4" />}
            {label === 'Share' && <Share2 className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function PublicProfilePage({
  overlayUsername,
  onOverlayClose,
}: {
  overlayUsername?: string;
  onOverlayClose?: () => void;
} = {}) {
  const params = useParams();
  const username = overlayUsername || params.username;
  const isOverlay = typeof onOverlayClose === 'function';
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { isSpaceMode } = useSpaceIdentities();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tabKey = isOverlay ? `tab:overlay:${username || ''}` : `tab:${location.pathname}`;
  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get('tab');
    return fromUrl && (PUBLIC_PROFILE_TAB_IDS as readonly string[]).includes(fromUrl) ? fromUrl : readSessionString(tabKey, 'posts');
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState(-1);

  useOverlayBack(isOverlay, () => onOverlayClose?.());

  useEffect(() => {
    if (!isOverlay) return;
    const release = acquirePostMusicSuspend();
    pauseExclusivePlayback();
    stopReelPreview();
    const scrollEl = document.getElementById('main-scroll-area');
    const prevOverflow = scrollEl?.style.overflowY ?? '';
    const prevBody = document.body.style.overflow;
    if (scrollEl) scrollEl.style.overflowY = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      release();
      if (scrollEl) scrollEl.style.overflowY = prevOverflow;
      document.body.style.overflow = prevBody;
    };
  }, [isOverlay]);

  useEffect(() => {
    writeSessionString(tabKey, activeTab);
  }, [activeTab, tabKey]);

  useEffect(() => {
    if (!username) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setError('User not found');
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requested = String(username);

    (async () => {
      try {
        setLoading(true);
        setError('');
        setProfile(null);
        const res = await fetch(`/api/u/${encodeURIComponent(requested)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 404) setError('User not found');
          else if (res.status === 403) setError('You cannot view this profile');
          else setError('Failed to load profile');
          setProfile(null);
        } else {
          const data = await res.json();
          if (cancelled) return;
          if (data.redirect) {
            if (!isOverlay) navigate(data.redirect, { replace: true });
            else {
              const m = String(data.redirect).match(/\/u\/([^/?#]+)/i);
              if (m?.[1]) setError(''); // username history — host should reopen; fall through soft
            }
          } else if (data.blocked) {
            setError('You cannot view this profile');
            setProfile(null);
          } else {
            if (import.meta.env.DEV) {
              console.debug('[public-profile]', {
                requested,
                viewerId: user?.id ?? null,
                endpoint: `/api/u/${requested}`,
                profileId: data?.id ?? null,
                username: data?.username ?? null,
                hasAvatar: Boolean(data?.avatar),
                hasCover: Boolean(data?.cover),
                profileLocked: Boolean(data?.profileLocked),
              });
            }
            setProfile(data);
          }
        }
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, token, navigate, user?.id]);

  useEffect(() => {
    if (!(PUBLIC_PROFILE_TAB_IDS as readonly string[]).includes(activeTab as any)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setActiveTab(PUBLIC_PROFILE_TAB_IDS[0]);
    }
  }, [activeTab]);

  // Viewing your own profile: hand off to the owner page (/profile). In overlay
  // mode close the overlay first (and replace its same-URL history entry),
  // otherwise it would render the viewer's own profile in visitor mode.
  const viewingSelf = Boolean(
    user?.id != null && profile?.id != null && String(user.id) === String(profile.id),
  );
  useEffect(() => {
    if (!viewingSelf) return;
    if (isOverlay) onOverlayClose?.();
    navigate('/profile', { replace: true });
  }, [viewingSelf, navigate, isOverlay, onOverlayClose]);

  // fetchProfile kept for retry buttons / friend-action refresh
  const fetchProfile = async () => {
    if (!username) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/u/${encodeURIComponent(username)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        if (res.status === 404) setError('User not found');
        else if (res.status === 403) setError('You cannot view this profile');
        else setError('Failed to load profile');
        setProfile(null);
      } else {
        const data = await res.json();
        if (data.redirect) {
          navigate(data.redirect, { replace: true });
        } else if (data.blocked) {
          setError('You cannot view this profile');
          setProfile(null);
        } else {
          setProfile(data);
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.username || profile.profileLocked) return;
    let cancelled = false;
    (async () => {
      setPostsLoading(true);
      try {
        const res = await fetch(`/api/u/${encodeURIComponent(profile.username)}/posts`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.username, profile?.profileLocked, token]);

  const runFriendAction = async (explicit?: FriendAct) => {
    if (!token || !profile?.id) return;
    if (isSpaceMode) {
      toastSpaceModeFriendsBlocked();
      return;
    }
    const status = profile.friendStatus || 'none';
    const action: FriendAct =
      explicit ??
      (status === 'pending_sent'
        ? 'cancel'
        : status === 'pending_received'
          ? 'accept'
          : status === 'accepted'
            ? 'remove'
            : 'request');
    if (action === 'remove' && !confirm('Remove this friend?')) return;
    setFriendBusy(true);
    try {
      const res = await fetch(`/api/friends/${action}/${profile.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Could not update friendship');
        return;
      }
      // Facebook-style: sending a request also follows (backend doesn't auto-follow;
      // /users/:id/follow is a toggle, so only call it when not already following).
      if (action === 'request' && !(profile.isFollower || profile.isFollowing)) {
        await fetch(`/api/users/${profile.id}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
      }
      await fetchProfile();
    } catch {
      toast.error('Network error');
    } finally {
      setFriendBusy(false);
    }
  };

  const runFollowToggle = async () => {
    if (!token || !profile?.id) return;
    setFollowBusy(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Could not update follow');
        return;
      }
      const data = await res.json();
      setProfile((p: any) => ({
        ...p,
        isFollower: !!data.following,
        _count: {
          ...p._count,
          followers: Math.max(0, (p._count?.followers || 0) + (data.following ? 1 : -1)),
        },
      }));
    } catch {
      toast.error('Network error');
    } finally {
      setFollowBusy(false);
    }
  };

  const startMessage = async () => {
    if (!token || !profile?.id) return;
    try {
      // Open (or reuse) the DM only. Do not post a greeting — the user has not typed one.
      const convo = await wevchatApi.getOrCreateDirect(profile.id);
      navigate(convo?.id ? `/messages/${convo.id}` : '/messages');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to start conversation');
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!token || !profile?.id) return;
    try {
      const convo = await wevchatApi.getOrCreateDirect(profile.id);
      if (!convo?.id) {
        toast.error('Could not open chat for call');
        return;
      }
      navigate(`/messages/${convo.id}?call=${type}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to start call');
    }
  };

  if (loading) {
    const node = (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
    if (!isOverlay) return node;
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 z-[90] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Profile">
        <div className="min-h-0 flex-1 overflow-y-auto">{node}</div>
      </div>,
      document.body,
    );
  }
  if (error) {
    const node = (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold mb-2">{error}</h2>
        <button
          type="button"
          onClick={() => (isOverlay ? onOverlayClose?.() : goBackOr(navigate, '/home'))}
          className="mt-4 px-5 py-2 rounded-xl bg-muted font-semibold"
        >
          Go back
        </button>
      </div>
    );
    if (!isOverlay) return node;
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 z-[90] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Profile">
        <div className="min-h-0 flex-1 overflow-y-auto">{node}</div>
      </div>,
      document.body,
    );
  }
  if (!profile) return null;

  const isSelf = viewingSelf;
  const isLocked = profile.profileLocked && !profile.isFriend && !isSelf;

  const socialLinks = (() => {
    try {
      return profile.socialLinks && profile.socialLinks !== 'null' ? JSON.parse(profile.socialLinks) || {} : {};
    } catch {
      return {};
    }
  })();

  const photoItems = posts.flatMap((p) => {
    const media = p.postMedia || p.media || [];
    return (Array.isArray(media) ? media : [])
      .filter((m: any) => String(m.type || '').toLowerCase() !== 'video')
      .map((m: any) => ({ url: m.url, post: p }));
  });
  const videoItems = posts.flatMap((p) => {
    const media = p.postMedia || p.media || [];
    return (Array.isArray(media) ? media : [])
      .filter((m: any) => String(m.type || '').toLowerCase() === 'video')
      .map((m: any) => ({ url: m.url, post: p }));
  });

  const page = (
    <div className="pb-24 space-y-0 bg-background min-h-full overflow-x-hidden">
      <PersonalProfileChrome
        profile={profile}
        isOwner={false}
        token={token}
        postsCount={profile._count?.posts ?? posts.length}
        onPostsClick={() => setActiveTab('posts')}
        friendsCount={profile._count?.friends ?? 0}
        followersCount={profile._count?.followers ?? 0}
        followingCount={profile._count?.following ?? 0}
        onBack={isOverlay ? () => onOverlayClose?.() : undefined}
        coverBackgroundStyle={
          profile.cover
            ? coverBackground(profile.cover, profile.coverPhotoConfig || profile.coverConfig)
            : undefined
        }
        onFriendAction={runFriendAction}
        onFollowToggle={runFollowToggle}
        onMessage={startMessage}
        onStartCall={startCall}
        friendBusy={friendBusy}
        followBusy={followBusy}
        onShare={() =>
          openShare({
            url: `/u/${profile.username || profile.id}`,
            title: profile.name || profile.username || 'Profile',
            targetType: 'profile',
            targetId: profile.id,
          })
        }
      />

      {!isSelf && token ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-5 mt-2 flex flex-wrap items-center gap-3">
          <PresenceDot userId={profile.id} showLabel />
          {!isSpaceMode ? <MutualFriendsButton targetUserId={profile.id} /> : null}
          <PersonalNoteSheet targetId={profile.id} targetName={profile.name} />
        </div>
      ) : null}

      {!isLocked && (
        <ProfileHighlightsRow userId={profile.id} isOwner={false} token={token} />
      )}

      {isLocked ? (
        <div className="max-w-3xl mx-auto px-4 mt-6 bg-card border border-border p-10 text-center rounded-3xl shadow-sm">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold mb-2">This profile is locked.</h2>
          <p className="text-sm text-muted-foreground">
            You must be friends with {profile.name} to view their full profile.
          </p>
        </div>
      ) : (
        <>
          {profile.username && (
            <div className="max-w-3xl mx-auto px-4 sm:px-5 mt-4">
              <PublicSpacesSection username={profile.username} displayName={profile.name} />
            </div>
          )}

          <div id="profile-tabs" className="max-w-3xl mx-auto mt-2 sticky top-12 z-30 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex gap-0 overflow-x-auto no-scrollbar scroll-smooth px-3">
              {PUBLIC_PROFILE_TAB_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === id ? 'text-violet-600' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TAB_LABELS[id]}
                  {activeTab === id && (
                    <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-full bg-violet-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-5 mt-4 pb-8">
            <AnimatePresence mode="wait">
              {activeTab === 'posts' && (
                <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <ProfileWallSection
                    handle={profile.username || profile.profileSlug || profile.id}
                    isOwner={false}
                  />
                  <ProfileMusicSection userId={profile.id} isOwner={false} />
                  {postsLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No posts yet.</div>
                  ) : (
                    <div className="space-y-2 md:space-y-3 -mx-4 sm:-mx-5">
                      {posts.map((post) => (
                        <UnifiedPostCard
                          key={post.id}
                          variant="card"
                          post={{
                            ...post,
                            user: profile,
                            userId: profile.id,
                            _count: post._count || post.counts,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'about' && (
                <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <ProfileMusicSection userId={profile.id} isOwner={false} />
                  <ProfileWallSection
                    handle={profile.username || profile.profileSlug || profile.id}
                    isOwner={false}
                  />
                  <ProfileTestimonialsSection
                    profileId={profile.id}
                    isOwner={false}
                    canWrite={!!token && !isSelf}
                  />
                  <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                      <User size={14} /> Basic Information
                    </h3>
                    {(profile.bio || profile.intro) && (
                      <p className="text-sm mb-4 whitespace-pre-wrap">{profile.bio || profile.intro}</p>
                    )}
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      {profile.work && (
                        <div className="flex items-center gap-3">
                          <Briefcase size={16} /> Works at <strong className="text-foreground">{profile.work}</strong>
                        </div>
                      )}
                      {profile.collegeName && (
                        <div className="flex items-center gap-3">
                          <GraduationCap size={16} /> Studied at <strong className="text-foreground">{profile.collegeName}</strong>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-3">
                          <MapPin size={16} /> Lives in <strong className="text-foreground">{profile.location}</strong>
                        </div>
                      )}
                      {profile.relationshipStatus && (
                        <div className="flex items-center gap-3">
                          <Heart size={16} /> {profile.relationshipStatus}
                        </div>
                      )}
                      {profile.createdAt && isValid(new Date(profile.createdAt)) && (
                        <div className="flex items-center gap-3">
                          Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  {Object.keys(socialLinks).length > 0 && (
                    <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                      <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Social Links</h3>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(socialLinks).map(([platform, link]: any) => {
                          if (!link) return null;
                          const Icon = SOCIAL_ICONS[platform] || Globe;
                          return (
                            <a
                              key={platform}
                              href={String(link).includes('http') ? link : `https://${link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-muted rounded-full hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
                            >
                              <Icon size={20} />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'photos' && (
                <motion.div key="photos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {profile?.id && <ProfileAlbumsSection userId={profile.id} />}
                  {photoItems.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No photos yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photoItems.map((item, i) => (
                        <button
                          key={`${item.post.id}-${i}`}
                          type="button"
                          onClick={() => setPhotoLightboxIndex(i)}
                          className="relative aspect-square rounded-2xl overflow-hidden bg-muted"
                        >
                          <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'videos' && (
                <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {videoItems.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No videos yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {videoItems.map((item, i) => (
                        <a
                          key={`${item.post.id}-${i}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted group"
                        >
                          <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30">
                            <Video className="w-8 h-8 text-white drop-shadow" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {photoLightboxIndex >= 0 && (
        <Lightbox
          open
          close={() => setPhotoLightboxIndex(-1)}
          index={photoLightboxIndex}
          slides={photoItems.map((p) => ({ src: p.url }))}
        />
      )}
    </div>
  );

  if (!isOverlay) return page;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{page}</div>
    </div>,
    document.body,
  );
}
