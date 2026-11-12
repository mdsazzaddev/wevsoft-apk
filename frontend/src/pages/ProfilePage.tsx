import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../stores/uiStore';
import { openShare } from '../lib/share/openShare';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  MapPin, Calendar, Image as ImageIcon, Users, Grid, Book,
  GraduationCap, Briefcase, Award, Phone, Heart, Camera, X, CheckCircle,
  Share2, Globe, Github, Twitter, Linkedin, Facebook, Youtube, Instagram,
  FileText, User, Star, Copy, Zap, Settings,
  Clock, ShieldCheck, MessageCircle, Lock, Archive, Play, Clapperboard, Repeat,
  Video, LayoutList, ChevronDown, Search, MoreHorizontal, Plus, Pencil,
  Flame, Building2
} from 'lucide-react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { profileAbsoluteUrl, profilePathFor } from '../lib/profileLinks';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import ProfileEditModal from '../components/profile/ProfileEditModal';
import ImageEditorModal from '../components/profile/ImageEditorModal';
import { AvatarEditorModal, useAvatarUpload, AVATAR_ACCEPT } from '../features/avatar';
import { CoverEditorModal, useCoverUpload, COVER_INPUT_ACCEPT } from '../features/cover';
import { CoverPhotoEditor } from '../components/profile/CoverPhotoEditor';
import PersonalProfileChrome from '../components/profile/PersonalProfileChrome';
import SafeImage from '../components/ui/SafeImage';
import { resolveAvatarUrl } from '../components/UserAvatar';
import ProfileHighlightsRow from '../components/profile/ProfileHighlightsRow';
import ProfileAlbumsSection from '../components/profile/ProfileAlbumsSection';
import ProfileWallSection from '../components/profile/ProfileWallSection';
import ProfileTestimonialsSection from '../components/profile/ProfileTestimonialsSection';
import ProfileMusicSection from '../components/profile/ProfileMusicSection';
import MusicPlaylistsPanel from '../components/profile/MusicPlaylistsPanel';
import { formatCompactCount, formatExactCount } from '../components/profile/personalProfileFormat';
import { UnifiedPostCard } from '../components/feed/UnifiedFeed';
import PostMediaGrid from '../components/social/PostMediaGrid';
import PostBackgroundMusic from '../components/social/PostBackgroundMusic';
import { AIMemoryWidget } from '../components/social/AIMemoryWidget';
import ProductivityCard from '../components/governance/ProductivityCard';
import {
  DEFAULT_PROFILE_THEME,
  getProfileThemeById,
  type ProfileTheme,
} from '../lib/profileThemes';
import { parseLegacyMedia, resolvePostMediaItems } from '../lib/postMedia';
import toast from 'react-hot-toast';
import ExpandableText from '../components/ExpandableText';
import ProfileAllFeed from '../components/profile/ProfileAllFeed';
import ProfileAllIdentityCards from '../components/profile/ProfileAllIdentityCards';
import MySpacesSection from '../components/wevspace/MySpacesSection';
import { readSessionString, writeSessionString } from '../lib/appNavigation';
import {
  OWNER_PROFILE_MORE_RESERVE_PX,
  OWNER_PROFILE_TAB_ORDER,
  fitOwnerProfileTabs,
} from '../lib/profileTabs.logic';
import {
  exitViewAsPath,
  resolveViewAs,
  viewAsQueryPath,
} from '../lib/profileManager.logic';
import {
  filterPostsForViewAs,
  profileTabsForViewAs,
  showOwnerChrome,
  viewAsBannerLabel,
} from '../lib/profileViewAs.logic';

/** Priority order: All → Posts → Reels first; pack until the row is full → More. */
const PRIMARY_OWNER_TABS = OWNER_PROFILE_TAB_ORDER;

const ProfileCanvas = lazy(() => import('../legacy-social/ProfileCanvas'));


const FRAMES = [
  { id: 'none', name: 'No Frame', css: '' },
  { id: 'gold', name: '✨ Gold', css: 'ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]' },
  { id: 'diamond', name: '💎 Diamond', css: 'ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)]' },
  { id: 'rose', name: '🌹 Rose', css: 'ring-4 ring-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.6)]' },
  { id: 'neon', name: '⚡ Neon', css: 'ring-4 ring-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.7)]' },
];

function frameById(id?: string | null) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

function coverBackground(url?: string | null, cfg?: { zoom?: number; cropX?: number; cropY?: number } | null) {
  const resolved = resolveAvatarUrl(url);
  if (!resolved) return undefined;
  const zoom = cfg?.zoom || 1;
  const x = cfg?.cropX ?? 0.5;
  const y = cfg?.cropY ?? 0.5;
  // Always fill the frame (the cover is 16:9 on phones and 820:312 on desktop),
  // then zoom around the chosen focal point - no empty bands at any aspect.
  return {
    backgroundImage: `url(${JSON.stringify(resolved)})`,
    backgroundSize: 'cover',
    backgroundPosition: `${x * 100}% ${y * 100}%`,
    backgroundRepeat: 'no-repeat' as const,
    ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: `${x * 100}% ${y * 100}%` } : {}),
  };
}

const SOCIAL_ICONS: any = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin,
  github: Github, x: Twitter, youtube: Youtube,
};

// ─── Floating Particle ──────────────────────────────────
// Decorative particles disabled for performance (infinite animations); renders nothing so layout is unchanged.
function FloatingParticle(_props: { emoji: string; delay: number; key?: React.Key }) {
  return null;
}

// ─── Glass Pill Button ──────────────────────────────────
function GlassButton({
  children, onClick, className = '', theme, variant = 'secondary', size = 'md'
}: {
  children: React.ReactNode; onClick?: () => void; className?: string;
  theme: ProfileTheme; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = { sm: 'px-4 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };

  if (variant === 'primary') {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`, boxShadow: theme.glowSm }}
        className={`${sizeClasses[size]} rounded-full font-semibold text-foreground dark:text-white transition-all duration-200 flex items-center gap-2 ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  if (variant === 'ghost') {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${className}`}
        style={{ color: theme.accent }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03, boxShadow: theme.glowSm }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, backdropFilter: 'blur(12px)', color: theme.accent }}
      className={`${sizeClasses[size]} rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ─── Glass Card ─────────────────────────────────────────
function GlassCard({ children, className = '', theme, hover = true }: {
  children: React.ReactNode; className?: string; theme: ProfileTheme; hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: theme.glowSm } : undefined}
      transition={{ duration: 0.2 }}
      className={`rounded-3xl p-6 ${theme.card} ${className}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stat Card ───────────────────────────────────────────
function StatCard({ value, label, theme }: { value: number | string; label: string; theme: ProfileTheme }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: theme.glow }}
      style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, backdropFilter: 'blur(16px)' }}
      className="flex flex-col items-center px-5 py-3 rounded-2xl min-w-[75px]"
    >
      <span className="text-xl font-semibold" style={{ color: theme.accent }}>{value}</span>
      <span className="text-xs text-zinc-500 font-medium mt-0.5">{label}</span>
    </motion.div>
  );
}

// ─── Post media helpers ──────────────────────────────────
const POST_TABS = ['all', 'posts', 'photos', 'reels', 'videos', 'reposts', 'private', 'archived'];

interface ProfileMediaItem {
  url: string;
  type: 'image' | 'video';
  post: any;
}

function extractPostMedia(post: any): ProfileMediaItem[] {
  return resolvePostMediaItems(post).map((m) => ({
    url: m.url,
    type: m.type,
    post,
  }));
}

// ─── Tab states ──────────────────────────────────────────
function TabSpinner({ theme }: { theme: ProfileTheme }) {
  return (
    <div className="flex justify-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-4 border-t-transparent"
        style={{ borderColor: `${theme.accent} transparent transparent transparent` }}
      />
    </div>
  );
}

function EmptyTab({ theme, icon: Icon, title, subtitle }: {
  theme: ProfileTheme; icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div
      className="text-center py-20 rounded-3xl"
      style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
    >
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
      >
        <Icon className="w-6 h-6" style={{ color: theme.accent }} />
      </div>
      <h3 className="text-xl font-bold mb-2 text-zinc-600 dark:text-zinc-300">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{subtitle}</p>
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────
function ProfilePostCard({ post, profile, theme }: {
  post: any; profile: any; theme: ProfileTheme; key?: React.Key;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPostMusic = Boolean(post.postMusic?.audioUrl || post.music?.audioUrl || post.postMusic?.audioUrlSnapshot);
  const hasMedia = Boolean(post.postMedia?.length || post.media);
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
      className={`relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm`}
    >
      {isPinned && (
        <div className="px-4 pt-3 flex items-center gap-1.5 text-[11px] font-bold text-violet-600">
          <span aria-hidden>📌</span> Pinned Post
        </div>
      )}
      {!hasMedia ? (
        <PostBackgroundMusic postId={post.id} post={post} rootRef={cardRef} />
      ) : null}
      <div className={`px-4 sm:px-5 ${isPinned ? 'pt-2' : 'pt-4'} pb-3 flex items-center gap-3`}>
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br from-violet-600 to-fuchsia-500"
        >
          {profile.avatar
            ? <img src={resolveAvatarUrl(profile.avatar) || undefined} alt="" className="w-full h-full object-cover" />
            : profile.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate text-foreground flex items-center gap-1">
            {profile.name}
            {(profile.verified || profile.verifiedBadge) && (
              <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" strokeWidth={0} />
            )}
          </p>
          {(post.postMusic?.title || post.music?.title || post.postMusic?.titleSnapshot) ? (
            <p className="mt-0.5 text-[11px] font-semibold text-violet-500 truncate">
              ♪ {post.postMusic?.title || post.postMusic?.titleSnapshot || post.music?.title}
              {(post.postMusic?.artist || post.postMusic?.artistSnapshot || post.music?.artist)
                ? ` · ${post.postMusic?.artist || post.postMusic?.artistSnapshot || post.music?.artist}`
                : ''}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
            {timeLabel}
            {post.privacy && post.privacy !== 'public' ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Globe className="w-3 h-3 opacity-70" />
            )}
          </p>
        </div>
        <button onClick={() => {}} type="button" className="p-1.5 rounded-full hover:bg-muted text-muted-foreground" aria-label="Post options">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {post.content && (
        <ExpandableText
          text={post.content}
          className="px-4 sm:px-5 pb-3 text-sm leading-relaxed text-foreground/90"
        />
      )}

      {hasMedia ? (
        <div className="relative">
          <PostMediaGrid
            media={post.postMedia || post.media || []}
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

// ─── MAIN COMPONENT ──────────────────────────────────────
// ─── Hoisted helpers (module-level to keep identity stable) ─────────
/** Build a public profile href from a user object. */
function profileHref(u: any): string {
  return `/u/${u.profileSlug || u.username || u.id}`;
}


const ProfilePhotosTab = React.lazy(() => import('../components/profile/ProfilePhotosTab'));
const ProfileReelsTab = React.lazy(() => import('../components/profile/ProfileReelsTab'));
const ProfileSavedTab = React.lazy(() => import('../components/profile/ProfileSavedTab'));
const ProfileAboutTab = React.lazy(() => import('../components/profile/ProfileAboutTab'));
const ProfileFriendsTab = React.lazy(() => import('../components/profile/ProfileFriendsTab'));

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBn = String(i18n?.language || '').toLowerCase().startsWith('bn');
  const location = useLocation();
  const viewAsRole = resolveViewAs(new URLSearchParams(location.search).get('viewAs'));
  const ownerChrome = showOwnerChrome(true, viewAsRole);
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const setAuth = useStore((s) => s.setAuth);
  const gamification = useStore((s) => s.gamification);
  const [profile, setProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get('tab');
    if (fromUrl && (PRIMARY_OWNER_TABS as readonly string[]).includes(fromUrl)) return fromUrl;
    const saved = readSessionString(`tab:${location.pathname}`, 'all');
    return (PRIMARY_OWNER_TABS as readonly string[]).includes(saved) ? saved : 'all';
  });
  const [theme, setTheme] = useState<ProfileTheme>(DEFAULT_PROFILE_THEME);
  const [frameModalOpen, setFrameModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorType, setEditorType] = useState<'avatar' | 'cover'>('avatar');
  const [coverRepositionUrl, setCoverRepositionUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  /** Server total for the same filter as /api/profile/posts, when the API provides it. */
  const [postsTotal, setPostsTotal] = useState<number | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsFetched, setPostsFetched] = useState(false);
  const [myReels, setMyReels] = useState<any[]>([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [reelsFetched, setReelsFetched] = useState(false);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedReels, setSavedReels] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedFetched, setSavedFetched] = useState(false);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState(-1);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [tabsMoreOpen, setTabsMoreOpen] = useState(false);
  /** Below lg: swipe all tabs. lg+: pack + More (matches profile grid breakpoint). */
  const [tabsSwipeMode, setTabsSwipeMode] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : true,
  );
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tabsBarRef = useRef<HTMLDivElement>(null);
  const tabsMeasureRef = useRef<HTMLDivElement>(null);
  const [tabsBarWidth, setTabsBarWidth] = useState(720);
  const [tabChipWidths, setTabChipWidths] = useState<Record<string, number>>({});
  const [moreChipWidth, setMoreChipWidth] = useState(OWNER_PROFILE_MORE_RESERVE_PX);
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; right: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => {
      const swipe = mq.matches;
      setTabsSwipeMode(swipe);
      if (swipe) setTabsMoreOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    if (tabsSwipeMode) return;
    const el = tabsBarRef.current;
    if (!el) return;
    const measureRow = () => setTabsBarWidth(Math.round(el.getBoundingClientRect().width));
    measureRow();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureRow) : null;
    ro?.observe(el);
    window.addEventListener('resize', measureRow);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measureRow);
    };
  }, [profile?.id, tabsSwipeMode]);

  useLayoutEffect(() => {
    if (tabsSwipeMode) return;
    const root = tabsMeasureRef.current;
    if (!root) return;
    const measureChips = () => {
      const next: Record<string, number> = {};
      let moreW = OWNER_PROFILE_MORE_RESERVE_PX;
      root.querySelectorAll<HTMLElement>('[data-profile-tab-measure]').forEach((node) => {
        const id = node.getAttribute('data-profile-tab-measure');
        if (!id) return;
        const w = Math.ceil(node.getBoundingClientRect().width);
        if (id === '__more__') moreW = Math.max(OWNER_PROFILE_MORE_RESERVE_PX, w);
        else next[id] = w;
      });
      setMoreChipWidth(moreW);
      setTabChipWidths(next);
    };
    measureChips();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureChips) : null;
    ro?.observe(root);
    return () => ro?.disconnect();
  }, [profile?.id, i18n.language, tabsSwipeMode]);

  useLayoutEffect(() => {
    if (!tabsMoreOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- layout measurement: position is computed from the DOM after render
      setMoreMenuPos(null);
      return;
    }
    const GAP = 6;
    const PAD = 8;
    const place = () => {
      const el = moreBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menu = moreMenuRef.current;
      const menuW = Math.max(menu?.offsetWidth || 0, 216);
      const naturalH = menu?.scrollHeight || Math.min(vh * 0.7, 28 * 16);
      const spaceBelow = Math.max(0, vh - r.bottom - PAD - GAP);
      const spaceAbove = Math.max(0, r.top - PAD - GAP);
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(vh * 0.7, 28 * 16, openUp ? spaceAbove : spaceBelow),
      );
      const usedH = Math.min(naturalH, maxHeight);
      let top = openUp
        ? Math.max(PAD, Math.round(r.top - GAP - usedH))
        : Math.round(r.bottom + GAP);
      if (!openUp && top + usedH > vh - PAD) {
        top = Math.max(PAD, vh - PAD - usedH);
      }
      let right = Math.max(PAD, Math.round(vw - r.right));
      if (vw - right - menuW < PAD) {
        right = Math.max(PAD, Math.round(vw - menuW - PAD));
      }
      setMoreMenuPos({ top, right, maxHeight: Math.round(maxHeight) });
    };
    place();
    // Double rAF: portal mounts after first paint, then clamp with real menu size.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(place);
    });
    // Keep page scrollable while open: no full-screen blocker. Outside click / scroll closes.
    const close = () => setTabsMoreOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (moreBtnRef.current?.contains(t)) return;
      if (moreMenuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    // Cursor over the menu still scrolls the page (or the menu list when it overflows).
    const onWheel = (e: WheelEvent) => {
      const menu = moreMenuRef.current;
      const overMenu = !!(menu && e.target instanceof Node && menu.contains(e.target));
      if (overMenu && menu) {
        const canUp = menu.scrollTop > 0;
        const canDown = menu.scrollTop + menu.clientHeight < menu.scrollHeight - 1;
        if ((e.deltaY < 0 && canUp) || (e.deltaY > 0 && canDown)) return;
      }
      const scroller = document.getElementById('main-scroll-area');
      if (!scroller) return;
      e.preventDefault();
      scroller.scrollTop += e.deltaY;
      close();
    };
    window.addEventListener('resize', place);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    const scroller = document.getElementById('main-scroll-area');
    scroller?.addEventListener('scroll', close, { passive: true });
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('resize', place);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel, true);
      scroller?.removeEventListener('scroll', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [tabsMoreOpen]);

  useEffect(() => {
    // Only the profile itself is fetched on mount — posts and friends
    // are loaded lazily when the user first visits those tabs (see below).
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchProfile();
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setTheme(getProfileThemeById(profile?.profileTheme));
    if (profile?.profileFrame) setSelectedFrame(frameById(profile.profileFrame));
  }, [profile?.profileTheme, profile?.profileFrame]);

  const fetchProfile = async () => {
    try {
      setProfileError(null);
      // Seed from the Zustand store immediately so the page renders
      // without a blank loading state while the full profile loads.
      const storeUser = useStore.getState().user;
      if (storeUser && !profile) setProfile(storeUser);
      const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch profile (Server Error)');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProfile(data);
    } catch (err: any) {
      console.error(err);
      // Only show error if we have no data at all to display.
      if (!profile) setProfileError(err.message || 'Network error');
    }
  };

  const fetchFriendsData = async () => {
    if (!token) return;
    setFriendsLoading(true);
    try {
      const [friendsRes, outgoingRes] = await Promise.all([
        fetch('/api/friends/list', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/friends/requests/outgoing', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (outgoingRes.ok) setOutgoingRequests(await outgoingRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load friends');
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    writeSessionString(`tab:${location.pathname}`, activeTab);
  }, [activeTab, location.pathname]);

  // Leave owner-only tabs when entering View As preview.
  if (viewAsRole && activeTab !== 'all' && !profileTabsForViewAs(PRIMARY_OWNER_TABS, viewAsRole).includes(activeTab)) {
    setActiveTab('all');
  }

  // Friends tab shows the app top navigation bar (rest of the profile stays header-off).
  const setProfileTopBarVisible = useUiStore((s) => s.setProfileTopBarVisible);
  useEffect(() => {
    setProfileTopBarVisible(activeTab === 'friends');
    return () => setProfileTopBarVisible(false);
  }, [activeTab, setProfileTopBarVisible]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (activeTab === 'friends') fetchFriendsData();
  }, [activeTab, token]);

  // ?tab= deep links (e.g. /profile?tab=friends): shareable, and Back returns to the previous tab.
  const hadTabParam = useRef(false);
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync tab with the URL (Back/Forward)
    if (tab && (PRIMARY_OWNER_TABS as readonly string[]).includes(tab)) setActiveTab(tab);
    else if (hadTabParam.current) setActiveTab(PRIMARY_OWNER_TABS[0]);
    hadTabParam.current = !!tab;
  }, [location.search]);
  const openTabLink = (tab: string) => {
    navigate({ search: `?tab=${tab}` });
    setActiveTab(tab);
    requestAnimationFrame(() => document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openAboutSection = (section?: 'intro' | 'personal' | 'contact' | 'work' | 'education') => {
    const q = new URLSearchParams();
    q.set('tab', 'about');
    if (section) q.set('section', section);
    navigate({ search: `?${q.toString()}` });
    setActiveTab('about');
    requestAnimationFrame(() => document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Random 9 (or all, if fewer) for the sidebar preview; reshuffled on every page load.
  const friendsPreview = useMemo(() => {
    const list = [...friends];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, 9);
  }, [friends]);

  // Left column shows a friends preview, so load the list once on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load for the friends preview card
    void fetchFriendsData();
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'saved' || savedFetched || savedLoading || !token) return;
    const loadSaved = async () => {
      setSavedLoading(true);
      try {
        const res = await fetch('/api/profile/saved', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load saved items');
        const data = await res.json();
        setSavedPosts(Array.isArray(data.posts) ? data.posts : []);
        setSavedReels(Array.isArray(data.reels) ? data.reels : []);
        setSavedFetched(true);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load saved items');
      } finally {
        setSavedLoading(false);
      }
    };
    loadSaved();
  }, [activeTab, token, savedFetched, savedLoading]);

  const fetchPosts = async () => {
    if (!token) return;
    setPostsLoading(true);
    try {
      // Paginated endpoint: returns { posts, hasMore, nextCursor }. Follow the
      // cursor so All / Posts show every post, not just the first page (capped
      // at 10 pages of 50 as a safety net).
      const all: any[] = [];
      let cursor: string | null = null;
      let total: number | null = null;
      for (let page = 0; page < 10; page++) {
        const qs: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
        const res = await fetch(`/api/profile/posts?limit=50${qs}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load posts');
        const data = await res.json();
        // Support both old array format and new paginated format
        const batch = Array.isArray(data) ? data : Array.isArray(data?.posts) ? data.posts : [];
        all.push(...batch);
        if (typeof data?.total === 'number') total = data.total;
        if (Array.isArray(data) || !data?.hasMore || !data?.nextCursor) break;
        cursor = data.nextCursor;
      }
      const seen = new Set<string>();
      setPosts(all.filter((p) => (p?.id && !seen.has(p.id) ? (seen.add(p.id), true) : false)));
      setPostsTotal(total);
      setPostsFetched(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your posts');
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchMyReels = async () => {
    if (!token) return;
    setReelsLoading(true);
    try {
      const res = await fetch('/api/reels/mine', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load reels');
      const data = await res.json();
      setMyReels(Array.isArray(data) ? data : []);
      setReelsFetched(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your reels');
    } finally {
      setReelsLoading(false);
    }
  };

  useEffect(() => {
    // Always load own posts once: the header Posts count and the left Photos card
    // both derive from this list, whatever tab the page opened on.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronises with an external system (network/media/DOM)
    if (!postsFetched && !postsLoading) fetchPosts();
  }, [activeTab, token]);

  useEffect(() => {
    if ((activeTab === 'reels' || activeTab === 'videos' || activeTab === 'all') && !reelsFetched && !reelsLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      fetchMyReels();
    }
  }, [activeTab, token]);

  // Keep above loading/error early returns (Rules of Hooks).
  useEffect(() => {
    if (!(PRIMARY_OWNER_TABS as readonly string[]).includes(activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setActiveTab(PRIMARY_OWNER_TABS[0]);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!tabsSwipeMode) return;
    const root = tabScrollRef.current;
    if (!root) return;
    const activeBtn = root.querySelector<HTMLElement>(`[data-profile-tab="${activeTab}"]`);
    activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab, tabsSwipeMode, profile?.id]);

  const handleFriendAction = async (userId: string, action: 'cancel' | 'remove') => {
    try {
      const res = await fetch(`/api/friends/${action}/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Failed to update');
        return;
      }
      toast.success(action === 'cancel' ? 'Request cancelled' : 'Friend removed');
      fetchFriendsData();
    } catch {
      toast.error('Network error');
    }
  };

  // FriendCard and profileHref are defined at module level (below) to prevent
  // React from creating a new component type on every render.

  const handleUpdate = async (updatedData: any) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update profile');
        return;
      }
      // Prefer server DTO, keep local-only keys the PUT may omit.
      setProfile((prev: any) => ({ ...prev, ...updatedData, ...data }));
      setIsEditing(false);
      toast.success('Profile updated');
      if (token && user) setAuth(token, { ...user, ...data });
      // Re-fetch so chrome/nav match DB (covers cache races + media URL normalization).
      void fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Network error');
      console.error(err);
    }
  };

  /** "Remove" from the photo menu: PUT /api/profile accepts null for avatar / cover. */
  const handleRemovePhoto = async (field: 'avatar' | 'cover') => {
    const label = field === 'cover' ? 'cover photo' : 'profile photo';
    if (!window.confirm(`Remove your ${label}?`)) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Could not remove ${label}`);
        return;
      }
      setProfile((prev: any) => ({ ...prev, ...data, [field]: null }));
      setAuth(token, { ...user, ...data, [field]: null });
      toast.success(field === 'cover' ? 'Cover photo removed' : 'Profile photo removed');
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
  };

  // Rebuilt avatar flow (features/avatar): crop + filters -> POST /api/profile/avatar
  // -> "Profile Pictures" album entry (+ optional feed post) -> optional frame prompt.
  const avatarUpload = useAvatarUpload({
    token,
    onSaved: (result, payload) => {
      const updates = { avatar: result.avatar };
      setProfile((prev: any) => (result.user ? { ...prev, ...result.user, ...updates } : { ...prev, ...updates }));
      setAuth(token, { ...user, ...updates });
      if (result.postId) setPostsFetched(false);
      if (payload.openFramePrompt) setFrameModalOpen(true);
    },
    onRemoved: (serverUser) => {
      setProfile((prev: any) => ({ ...prev, ...(serverUser || {}), avatar: null }));
      setAuth(token, { ...user, avatar: null });
    },
  });

  // Rebuilt cover flow (features/cover): rect crop + adjustments -> POST /api/profile/cover (sharp crops once).
  const coverUpload = useCoverUpload({
    token,
    onSaved: (result) => {
      const updates = { cover: result.cover };
      setProfile((prev: any) => ({ ...prev, ...(result.user || {}), ...updates, coverPhotoConfig: result.coverPhotoConfig ?? result.user?.coverPhotoConfig ?? null }));
      setAuth(token, { ...user, ...updates });
    },
    onRemoved: (serverUser) => {
      setProfile((prev: any) => ({ ...prev, ...(serverUser || {}), cover: null, coverPhotoConfig: null }));
      setAuth(token, { ...user, cover: null });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (type === 'avatar') {
      avatarUpload.pickFile(file);
      return;
    }
    if (type === 'cover' && !file.type.startsWith('video/')) {
      coverUpload.pickFile(file);
      return;
    }
    if (file.type.startsWith('video/')) {
       setUploadingCover(true);
       try {
         const formData = new FormData();
         formData.append('file', file);
         formData.append('kind', 'coverVideo');
         const uploadRes = await fetch('/api/profile/photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
         });
         if (!uploadRes.ok) throw new Error('Upload failed');
         const mediaData = await uploadRes.json();
         const updates = { coverVideo: mediaData.path };
         const nextProfile = mediaData.user ? { ...profile, ...mediaData.user, ...updates } : { ...profile, ...updates };
         setProfile(nextProfile as any);
         setAuth(token, { ...user, ...updates } as any);
       } catch (error: any) {
         toast.error(error.message || 'Failed to upload video');
       } finally {
         setUploadingCover(false);
       }
       return;
    }
    
    let editorTargetType = type;
    if (editorTargetType === 'coverVideo') editorTargetType = 'cover';
    
    setEditorType(editorTargetType as 'avatar' | 'cover');
    setEditorFile(file);
  };

  const handleSaveEditedImage = async (editedFile: File) => {
    const type = editorType;
    setEditorFile(null);
    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', editedFile);
      formData.append('kind', type);

      const uploadRes = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Upload failed');
      }
      const mediaData = await uploadRes.json();
      const realUrl = mediaData.path as string;
      const updates = type === 'avatar' ? { avatar: realUrl } : { cover: realUrl };
      const nextProfile = mediaData.user ? { ...profile, ...mediaData.user, ...updates } : { ...profile, ...updates };
      setProfile(nextProfile);
      setAuth(token, { ...user, ...updates });
      if (type === 'avatar') setFrameModalOpen(true);
      if (type === 'cover') setCoverRepositionUrl(realUrl);
      toast.success(type === 'avatar' ? 'Profile photo saved' : 'Cover photo saved');
    } catch (err: any) { 
      console.error(err);
      toast.error(err?.message || 'Failed to upload image');
    }
    finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="text-red-500 bg-red-500/10 p-4 rounded-full"><X size={32} /></div>
        <h2 className="text-xl font-bold">Profile Unavailable</h2>
        <p className="text-muted-foreground">{profileError}</p>
        <button onClick={fetchProfile} className="px-6 py-2 bg-primary text-foreground dark:text-white rounded-xl mt-4 font-semibold hover:bg-primary/90 transition-colors">Try Again</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${DEFAULT_PROFILE_THEME.accent} transparent transparent transparent` }}
        />
      </div>
    );
  }

  const socialLinks = (() => {
    try { return profile.socialLinks && profile.socialLinks !== 'null' ? JSON.parse(profile.socialLinks) || {} : {}; }
    catch { return {}; }
  })();
  const activeSocials = Object.entries(socialLinks).filter(([_, val]) => val);

  const fieldsToCheck = ['name', 'bio', 'location', 'avatar', 'cover', 'mobile', 'schoolName', 'collegeName', 'interests', 'skills'];
  const completedFields = fieldsToCheck.filter(f => profile[f]).length;
  const completionScore = Math.round((completedFields / fieldsToCheck.length) * 100);

  const livePostsAll = posts.filter(p => !p.isArchived);
  const livePosts = filterPostsForViewAs(livePostsAll, viewAsRole);
  const archivedPosts = posts.filter(p => p.isArchived);
  const reposts = livePosts.filter(p => p.type === 'share' || !!p.shareMeta);
  // Posts tab: every regular post (text, photo, video, shares). Reels have their own tab.
  const regularPosts = livePosts.filter(p => String(p.type || '').toLowerCase() !== 'reel');
  const privatePosts = posts.filter(p => p.privacy === 'only_me' || p.privacy === 'private');
  const liveMedia = livePosts.flatMap(extractPostMedia);
  const photoItems = liveMedia.filter(m => m.type === 'image');
  const videoItems = liveMedia.filter(m => m.type === 'video');

  const TABS = [
    { id: 'all', icon: LayoutList, label: 'All' },
    { id: 'posts', icon: Grid, label: 'Posts' },
    { id: 'reels', icon: Clapperboard, label: 'Reels' },
    { id: 'about', icon: User, label: 'About' },
    { id: 'reposts', icon: Repeat, label: 'Reposts' },
    { id: 'photos', icon: ImageIcon, label: 'Photos' },
    { id: 'videos', icon: Video, label: 'Videos' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'highlights', icon: Star, label: 'Highlights' },
    { id: 'wevspaces', icon: Building2, label: 'Spaces' },
    { id: 'saved', icon: Book, label: 'Saved' },
    { id: 'private', icon: Lock, label: 'Private' },
    { id: 'archived', icon: FileText, label: 'Archived' },
  ];

  const visibleOwnerTabIds = profileTabsForViewAs(PRIMARY_OWNER_TABS, viewAsRole);
  // Mobile: show every tab in a swipe strip. Desktop: pack free pixels; overflow under More.
  const packed = tabsSwipeMode
    ? { barIds: [...visibleOwnerTabIds], moreIds: [] as string[] }
    : fitOwnerProfileTabs({
        orderedIds: visibleOwnerTabIds,
        // px-2 on the chip strip (~16px) is not usable for tabs.
        rowWidthPx: Math.max(0, tabsBarWidth - 16),
        activeId: activeTab,
        tabWidthsPx: tabChipWidths,
        moreWidthPx: moreChipWidth,
      });
  const barIds = packed.barIds;
  const moreIds = packed.moreIds;
  const barTabs = barIds.map((id) => TABS.find((tb) => tb.id === id)!).filter(Boolean);
  const moreTabs = moreIds.map((id) => TABS.find((tb) => tb.id === id)!).filter(Boolean);
  const moreTabActive = moreTabs.some((tab) => tab.id === activeTab);
  const selectProfileTab = (tabId: string) => {
    setActiveTab(tabId);
    setTabsMoreOpen(false);
    if (new URLSearchParams(location.search).has('tab')) {
      navigate({ search: `?tab=${tabId}` }, { replace: true });
    }
  };

  // profile._count.posts counts every Post row (Space posts, trashed, drafts, archived),
  // while the Posts tab lists only live personal posts - so the header jumped 10 -> 6
  // once posts loaded. Use the list's own server total (or its length); null = loading.
  const postsCount: number | null = postsFetched
    ? (postsTotal ?? livePosts.length)
    : null;
  const friendsCount = friends.length || profile._count?.friends || 0;
  const followersCount = profile._count?.followers || 0;
  const followingCount = profile._count?.following || 0;
  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const streak = gamification?.streak ?? 0;
  const tierLabel = gamification?.tier
    ? String(gamification.tier).charAt(0).toUpperCase() + String(gamification.tier).slice(1)
    : 'Explorer';
  const xpIntoLevel = xp % 100;
  const xpLevelMax = 100;
  const levelProgress = Math.min(100, Math.round((xpIntoLevel / xpLevelMax) * 100));

  return (
    <div className="pb-24 min-h-full w-full overflow-x-hidden bg-background text-foreground">
      {viewAsRole && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm text-foreground backdrop-blur-sm">
          <span className="font-semibold">
            {t('profile.viewAs.banner', { role: viewAsBannerLabel(viewAsRole) })}
          </span>
          <div className="flex items-center gap-2">
            {(['public', 'follower', 'friend'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => navigate(viewAsQueryPath(role), { replace: true })}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  viewAsRole === role ? 'bg-foreground text-background' : 'bg-card border border-border'
                }`}
              >
                {viewAsBannerLabel(role)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate(exitViewAsPath(), { replace: true })}
              className="rounded-md bg-card border border-border px-2.5 py-1 text-[12px] font-bold"
            >
              {t('profile.viewAs.exit')}
            </button>
          </div>
        </div>
      )}
      <div className="bg-card border-b border-border">
        <PersonalProfileChrome
          profile={profile}
          isOwner={ownerChrome}
          token={token}
          postsCount={postsCount}
          onPostsClick={() => setActiveTab('posts')}
          friendsCount={friendsCount}
          followersCount={followersCount}
          followingCount={followingCount}
          uploadingCover={ownerChrome ? uploadingCover || coverUpload.isUploading : false}
          coverBackgroundStyle={profile.cover ? coverBackground(profile.cover, profile.coverPhotoConfig) : undefined}
          selectedFrameCss={selectedFrame.css}
          onEditCover={ownerChrome ? () => coverInputRef.current?.click() : undefined}
          onEditAvatar={ownerChrome ? () => avatarInputRef.current?.click() : undefined}
          onRepositionCover={ownerChrome ? () => setCoverRepositionUrl(profile.cover) : undefined}
          onRemoveCover={ownerChrome ? () => void coverUpload.remove() : undefined}
          onRemoveAvatar={ownerChrome ? () => void avatarUpload.remove() : undefined}
          avatarUploadProgress={ownerChrome && avatarUpload.isUploading ? avatarUpload.progress : null}
          onEditProfile={ownerChrome ? () => setIsEditing(true) : undefined}
          onOpenFrame={ownerChrome ? () => setFrameModalOpen(true) : undefined}
          onProfileTab={ownerChrome ? (tab) => setActiveTab(tab) : undefined}
          onViewAsPick={
            ownerChrome
              ? (role) => navigate(viewAsQueryPath(role), { replace: true })
              : undefined
          }
          onShare={() =>
            openShare({
              url: profilePathFor(profile) || `/u/${profile.username || profile.id}`,
              title: profile.name || 'Profile',
              targetType: 'profile',
              targetId: profile.id,
            })
          }
        />
      </div>
      <input type="file" accept={COVER_INPUT_ACCEPT} className="hidden" ref={coverInputRef} onChange={(e) => handleFileSelect(e, 'cover')} />
      <input type="file" accept={AVATAR_ACCEPT} className="hidden" ref={avatarInputRef} onChange={(e) => handleFileSelect(e, 'avatar')} />

      {/* Light, two-column owner layout: left = identity + friends, right = content */}
      <div className="mx-auto w-full max-w-[1400px] md:max-w-[1100px] px-3 sm:px-6 md:px-8 mt-3 lg:mt-4 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)] gap-3 lg:gap-4 items-start">
        {/* All tab mobile order: identity → friends → highlights → … then posts (content order-3). */}
        <aside className={`space-y-3 min-w-0 ${activeTab === 'all' ? 'order-2 lg:order-none' : 'order-3 lg:order-none hidden lg:block'}`}>
          {activeTab === 'all' ? (
            <ProfileAllIdentityCards
              profile={profile}
              isOwner
              onSeeAbout={openAboutSection}
              onEdit={() => setIsEditing(true)}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="text-sm font-semibold text-foreground mb-2">{t('profile.aboutMe')}</h2>
              {profile.intro || profile.bio ? (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">
                  {profile.intro || profile.bio}
                </p>
              ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="text-sm font-medium text-primary hover:underline">
                  {t('profile.addBio')}
                </button>
              )}
              {(profile.location || profile.createdAt) && (
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {profile.location && (
                    <p className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground/70 shrink-0" /> <span className="truncate">{profile.location}</span></p>
                  )}
                  {profile.createdAt && isValid(new Date(profile.createdAt)) && (
                    <p className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground/70 shrink-0" /> {t('profile.joined', { date: format(new Date(profile.createdAt), 'MMM yyyy') })}</p>
                  )}
                </div>
              )}
              <button type="button" onClick={() => openAboutSection()} className="mt-3 text-xs font-medium text-primary hover:underline underline-offset-2 transition-colors">
                {t('profile.seeFullAbout')}
              </button>
            </div>
          )}

          {/* Friends (before Highlights on All — FB-style preview from /api/friends/list) */}
          <div className="rounded-xl border border-border bg-card text-card-foreground p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{t('profile.friendsTitle')}</h2>
                <p className="text-xs text-muted-foreground" title={`${formatExactCount(friendsCount)} ${friendsCount === 1 ? 'friend' : 'friends'}`}>{isBn ? `${formatCompactCount(friendsCount)} জন বন্ধু` : `${formatCompactCount(friendsCount)} ${friendsCount === 1 ? 'friend' : 'friends'}`}</p>
              </div>
              {friends.length > 0 && (
                <button type="button" onClick={() => openTabLink('friends')} className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline">
                  {isBn ? 'সব দেখুন' : 'See all'}
                </button>
              )}
            </div>
            {friendsLoading && friends.length === 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('profile.noFriends')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {friendsPreview.map((f) => (
                  <Link key={f.id} to={profileHref(f)} className="group min-w-0">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {f.avatar ? (
                        <SafeImage src={f.avatar} alt="" loading="lazy" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" fallback={<div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">{(f.name || '?').charAt(0).toUpperCase()}</div>} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                          {(f.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-foreground truncate group-hover:underline">{f.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ProfileHighlightsRow userId={profile.id} isOwner token={token} card />

          {/* Photos (FB-style 3x3), from the same photoItems the Photos tab and lightbox use */}
          <div className="rounded-xl border border-border bg-card text-card-foreground p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Photos</h2>
              {photoItems.length > 0 && (
                <button type="button" onClick={() => openTabLink('photos')} className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline">
                  {isBn ? 'সব দেখুন' : 'See all'}
                </button>
              )}
            </div>
            {postsLoading && !postsFetched ? (
              <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square bg-muted animate-pulse" />)}
              </div>
            ) : photoItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No photos yet. Photos from your posts will show here.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                {photoItems.slice(0, 9).map((item, i) => (
                  <button
                    key={`${item.post?.id ?? 'p'}-${i}`}
                    type="button"
                    onClick={() => setPhotoLightboxIndex(i)}
                    className="relative aspect-square bg-muted overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <SafeImage src={item.url} alt="" loading="lazy" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 !p-3">
              <p className="text-[11px] font-medium text-muted-foreground">{t('profile.level')}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 truncate">Lv. {level} {tierLabel}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-foreground/80" style={{ width: `${levelProgress}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{xpIntoLevel} / {xpLevelMax} XP</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 !p-3">
              <p className="text-[11px] font-medium text-muted-foreground">{t('profile.streak')}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1">
                <Flame size={14} className="text-orange-500" /> {t('profile.streakDays', { count: streak })}
              </p>
              <button type="button" onClick={() => navigate('/rewards')} className="mt-2 text-[11px] font-medium text-primary hover:underline">
                {t('profile.viewBadges')}
              </button>
            </div>
          </div>

          {completionScore < 100 && (
            <div className="rounded-xl border border-border bg-card p-4 !p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs font-medium text-foreground mb-1">
                  <span>{t('profile.completion')}</span>
                  <span>{completionScore}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${completionScore}%` }} />
                </div>
              </div>
              <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0 hover:underline">
                {t('profile.complete')}
              </button>
            </div>
          )}

          <MySpacesSection compact className="rounded-xl border border-border bg-card p-3" />
        </aside>

        {/* Below lg: tabs order-1; All tab puts identity cards (order-2) before posts (order-3). */}
        <section className="contents lg:block min-w-0 lg:space-y-4">

          {/* Tabs — mobile: swipe all chips; lg+: pack free pixels, overflow under More. */}
          <div id="profile-tabs" className="order-1 lg:order-none sticky top-0 z-30 overflow-visible rounded-xl border border-border bg-card">
            {/* Off-screen measurer so desktop packing uses real chip widths (locale-aware). */}
            {!tabsSwipeMode && (
              <div
                ref={tabsMeasureRef}
                className="pointer-events-none absolute -left-[9999px] top-0 flex whitespace-nowrap opacity-0"
                aria-hidden
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    tabIndex={-1}
                    data-profile-tab-measure={tab.id}
                    className="relative px-4 py-3 text-sm font-semibold whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <tab.icon size={18} strokeWidth={2} className="shrink-0" aria-hidden />
                      {t(`profile.tab.${tab.id}`, { defaultValue: tab.label })}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  tabIndex={-1}
                  data-profile-tab-measure="__more__"
                  className="relative px-3.5 py-3 text-sm font-semibold whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {t('profile.tab.more', { defaultValue: 'More' })}
                    <ChevronDown size={16} className="shrink-0" aria-hidden />
                  </span>
                </button>
              </div>
            )}
            <div ref={tabsBarRef} className="flex items-stretch">
              <div
                ref={tabScrollRef}
                className={`flex min-w-0 flex-1 gap-0 px-2 ${
                  tabsSwipeMode
                    ? 'overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x'
                    : 'overflow-x-hidden'
                }`}
              >
                {barTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    data-profile-tab={tab.id}
                    onClick={() => selectProfileTab(tab.id)}
                    className={`relative shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-muted rounded-lg'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5"><tab.icon size={18} strokeWidth={2} className="shrink-0" aria-hidden />{t(`profile.tab.${tab.id}`, { defaultValue: tab.label })}</span>
                    {activeTab === tab.id && (
                      <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-primary" />
                    )}
                  </button>
                ))}
              </div>
              {!tabsSwipeMode && moreTabs.length > 0 && (
                <div className="relative shrink-0 border-l border-border/60">
                  <button
                    ref={moreBtnRef}
                    type="button"
                    onClick={() => setTabsMoreOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={tabsMoreOpen}
                    className={`relative px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                      moreTabActive || tabsMoreOpen
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-muted rounded-lg'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t('profile.tab.more', { defaultValue: 'More' })}
                      <ChevronDown size={16} className={`shrink-0 transition-transform ${tabsMoreOpen ? 'rotate-180' : ''}`} aria-hidden />
                    </span>
                    {moreTabActive && (
                      <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-primary" />
                    )}
                  </button>
                  {tabsMoreOpen && moreMenuPos && typeof document !== 'undefined'
                    ? createPortal(
                        <div
                          ref={moreMenuRef}
                          role="menu"
                          className="fixed z-[210] min-w-[13.5rem] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover py-1.5 shadow-xl"
                          style={{
                            top: moreMenuPos.top,
                            right: moreMenuPos.right,
                            maxHeight: moreMenuPos.maxHeight,
                          }}
                        >
                          {moreTabs.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              role="menuitem"
                              onClick={() => selectProfileTab(tab.id)}
                              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold hover:bg-muted ${
                                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                              }`}
                            >
                              <tab.icon size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                              {t(`profile.tab.${tab.id}`, { defaultValue: tab.label })}
                            </button>
                          ))}
                        </div>,
                        document.body,
                      )
                    : null}
                </div>
              )}
            </div>
          </div>

          {/* ── CONTENT AREA (posts last on All / mobile) ── */}
          <div className={`${activeTab === 'all' ? 'order-3' : 'order-2'} lg:order-none min-w-0`}>
        {/* Tab swap waits for exit (mode=wait): keep both legs short so tabs feel instant. */}
        <MotionConfig transition={{ duration: 0.15, ease: 'easeOut' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileAllFeed
                posts={livePosts}
                reels={myReels}
                videos={videoItems}
                loading={(postsLoading && !postsFetched) || (reelsLoading && !reelsFetched)}
                renderPost={(post) => (
                  <UnifiedPostCard
                    variant="card"
                    post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                  />
                )}
              />
            </motion.div>
          )}

          {activeTab === 'about' && (
            <React.Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <ProfileAboutTab theme={theme} profile={profile} isOwner onSave={handleUpdate} />
            </React.Suspense>
          )}

          {activeTab === 'friends' && (
            <React.Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <ProfileFriendsTab 
                friendsLoading={friendsLoading}
                theme={theme}
                friends={friends}
                outgoingRequests={outgoingRequests}
                handleFriendAction={handleFriendAction}
              />
            </React.Suspense>
          )}


          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {postsLoading && !postsFetched ? (
                <TabSpinner theme={theme} />
              ) : regularPosts.length === 0 ? (
                <EmptyTab
                  theme={theme}
                  icon={Grid}
                  title={t('profile.noPostsTitle')}
                  subtitle={t('profile.noPostsSubtitle')}
                />
              ) : (
                <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
                  {regularPosts.map(post => (
                    <UnifiedPostCard
                      key={post.id}
                      variant="card"
                      post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reposts' && (
            <motion.div key="reposts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {postsLoading && !postsFetched ? (
                <TabSpinner theme={theme} />
              ) : reposts.length === 0 ? (
                <EmptyTab theme={theme} icon={Repeat} title="No reposts yet" subtitle="Posts you share will appear here." />
              ) : (
                <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
                  {reposts.map(post => (
                    <UnifiedPostCard
                      key={post.id}
                      variant="card"
                      post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'highlights' && (
            <motion.div key="highlights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-xl border border-border bg-card p-4">
                <ProfileHighlightsRow userId={profile.id} isOwner token={token} card />
              </div>
            </motion.div>
          )}

          {activeTab === 'wevspaces' && (
            <motion.div key="wevspaces" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MySpacesSection className="rounded-xl border border-border bg-card p-4" />
            </motion.div>
          )}

          {activeTab === 'private' && (
            <motion.div
              key="private"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              {postsLoading && !postsFetched ? (
                <TabSpinner theme={theme} />
              ) : privatePosts.length === 0 ? (
                <EmptyTab
                  theme={theme}
                  icon={Lock}
                  title="No private posts"
                  subtitle="Your private posts will appear here."
                />
              ) : (
                <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
                  {privatePosts.map(post => (
                    <UnifiedPostCard
                      key={post.id}
                      variant="card"
                      post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'photos' && (
            <React.Suspense fallback={<TabSpinner theme={theme} />}>
              <ProfilePhotosTab 
                theme={theme} 
                photoItems={photoItems} 
                postsLoading={postsLoading} 
                postsFetched={postsFetched}
                setPhotoLightboxIndex={setPhotoLightboxIndex}
              />
            </React.Suspense>
          )}

          {(activeTab === 'reels' || activeTab === 'videos') && (
            <React.Suspense fallback={<TabSpinner theme={theme} />}>
              <ProfileReelsTab 
                theme={theme}
                activeTab={activeTab}
                reelsLoading={reelsLoading}
                reelsFetched={reelsFetched}
                postsLoading={postsLoading}
                postsFetched={postsFetched}
                myReels={myReels}
                videoItems={videoItems}
              />
            </React.Suspense>
          )}

          {activeTab === 'archived' && (
            <motion.div
              key="archived"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              {postsLoading && !postsFetched ? (
                <TabSpinner theme={theme} />
              ) : archivedPosts.length === 0 ? (
                <EmptyTab
                  theme={theme}
                  icon={Archive}
                  title="Nothing archived"
                  subtitle="Posts you archive stay private to you and appear here."
                />
              ) : (
                <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
                  {archivedPosts.map(post => (
                    <UnifiedPostCard
                      key={post.id}
                      variant="card"
                      post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'saved' && (
            <React.Suspense fallback={<TabSpinner theme={theme} />}>
              <ProfileSavedTab 
                theme={theme}
                profile={profile}
                savedLoading={savedLoading}
                savedFetched={savedFetched}
                savedPosts={savedPosts}
                savedReels={savedReels}
              />
            </React.Suspense>
          )}
        </AnimatePresence>
        </MotionConfig>
          </div>
        </section>
      </div>

      {/* ── EDIT MODAL ── */}
      {isEditing && (
        <ProfileEditModal profile={profile} onClose={() => setIsEditing(false)} onSave={handleUpdate} />
      )}

      {/* ── FRAME MODAL ── */}
      <AnimatePresence>
        {frameModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${theme.card} w-full max-w-md rounded-3xl overflow-hidden`}
              style={{ boxShadow: theme.glow }}
            >
              <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: theme.accentBorder }}>
                <h3 className="text-lg font-bold" style={{ color: theme.accent }}>✨ Profile Frame</h3>
                <button onClick={() => setFrameModalOpen(false)} className="p-2 rounded-full hover:bg-black/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                {/* Preview */}
                <div className="flex justify-center mb-8">
                  <div className={`w-32 h-32 rounded-full overflow-hidden relative ${selectedFrame.css}`}
                    style={{ border: '4px solid white', boxShadow: theme.glow }}>
                    {profile.avatar ? (
                      <img src={resolveAvatarUrl(profile.avatar) || undefined} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-foreground dark:text-white"
                        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}aa)` }}>
                        {profile.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {FRAMES.map(f => (
                    <motion.button
                      key={f.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedFrame(f)}
                      className="p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-xs font-semibold"
                      style={selectedFrame.id === f.id ? {
                        borderColor: theme.accent,
                        background: theme.accentLight,
                        color: theme.accent,
                      } : { borderColor: 'transparent', background: theme.accentLight + '55' }}
                    >
                      <div className={`w-10 h-10 rounded-full ${f.css} flex items-center justify-center`}
                        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}bb)` }}>
                        <span className="text-foreground dark:text-white text-xs font-bold">{profile.name?.charAt(0)}</span>
                      </div>
                      <span className="text-center leading-tight">{f.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="p-5 flex justify-end gap-3" style={{ borderTop: `1px solid ${theme.accentBorder}` }}>
                <GlassButton theme={theme} variant="ghost" onClick={() => setFrameModalOpen(false)}>Cancel</GlassButton>
                <GlassButton theme={theme} variant="primary" onClick={async () => {
                  try {
                    const res = await fetch('/api/profile', {
                      method: 'PUT',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ profileFrame: selectedFrame.id }),
                    });
                    if (!res.ok) throw new Error('Failed to save frame');
                    setProfile({ ...profile, profileFrame: selectedFrame.id });
                    setFrameModalOpen(false);
                    toast.success('Frame applied');
                  } catch {
                    toast.error('Could not save frame');
                  }
                }}>
                  Apply Frame ✨
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHARE MODAL ── */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 dark:bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`${theme.card} w-full max-w-sm rounded-3xl overflow-hidden`}
              style={{ boxShadow: theme.glow }}
            >
              <div className="p-6 text-center space-y-5">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg" style={{ color: theme.accent }}>Share Profile</h3>
                  <button onClick={() => setShareModalOpen(false)} className="p-1.5 rounded-full hover:bg-black/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar preview */}
                <div className="flex justify-center">
                  <div className={`w-20 h-20 rounded-full overflow-hidden ${theme.avatarRing}`}
                    style={{ border: '3px solid white' }}>
                    {profile.avatar ? (
                      <img src={resolveAvatarUrl(profile.avatar) || undefined} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-foreground dark:text-white"
                        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}aa)` }}>
                        {profile.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-lg">{profile.name}</p>
                  <p
                    className="text-xs mt-1 py-2 px-4 rounded-xl inline-block cursor-pointer"
                    style={{ background: theme.accentLight, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}
                    onClick={() => {
                      const link = profileAbsoluteUrl(profile) || profilePathFor(profile) || '';
                      if (link) {
                        navigator.clipboard.writeText(link.startsWith('http') ? link : `${window.location.origin}${link}`);
                        toast.success('Link copied!');
                      }
                    }}
                  >
                    {typeof window !== 'undefined'
                      ? `${window.location.host}${profilePathFor(profile) || '/u/' + (profile.username || '')}`
                      : `wevsoft.app${profilePathFor(profile) || ''}`}
                  </p>
                </div>

                <GlassButton
                  theme={theme}
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    const link = profileAbsoluteUrl(profile);
                    if (link) {
                      navigator.clipboard.writeText(link);
                      toast.success('Profile link copied! ✨');
                    }
                    setShareModalOpen(false);
                  }}
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHOTO LIGHTBOX ── */}
      <Lightbox
        open={photoLightboxIndex >= 0}
        close={() => setPhotoLightboxIndex(-1)}
        index={photoLightboxIndex}
        slides={photoItems.map(p => ({ src: p.url }))}
      />

      {/* ── IMAGE EDITOR ── */}
      {avatarUpload.isOpen && avatarUpload.file && (
        <AvatarEditorModal
          file={avatarUpload.file}
          status={avatarUpload.status}
          progress={avatarUpload.progress}
          error={avatarUpload.error}
          frameCss={selectedFrame.css}
          onSubmit={avatarUpload.submit}
          onCancelUpload={avatarUpload.cancelUpload}
          onRetry={avatarUpload.retry}
          onClose={avatarUpload.closeEditor}
        />
      )}
      {coverUpload.isOpen && coverUpload.file && (
        <CoverEditorModal
          file={coverUpload.file}
          status={coverUpload.status}
          progress={coverUpload.progress}
          error={coverUpload.error}
          onSubmit={coverUpload.submit}
          onCancelUpload={coverUpload.cancelUpload}
          onRetry={coverUpload.retry}
          onClose={coverUpload.closeEditor}
        />
      )}
      {editorFile && (
        <ImageEditorModal
          file={editorFile}
          type={editorType}
          onClose={() => setEditorFile(null)}
          onSave={handleSaveEditedImage}
        />
      )}
      {coverRepositionUrl && (
        <CoverPhotoEditor
          imageUrl={coverRepositionUrl}
          initialScale={profile.coverPhotoConfig?.zoom || 1}
          initialX={profile.coverPhotoConfig?.cropX ?? 0.5}
          initialY={profile.coverPhotoConfig?.cropY ?? 0.5}
          onCancel={() => setCoverRepositionUrl(null)}
          onSave={async ({ url, scale, x, y }) => {
            try {
              const res = await fetch('/api/profile/cover', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url, zoom: scale, cropX: x, cropY: y }),
              });
              if (!res.ok) throw new Error('Failed to save cover');
              const cfg = await res.json();
              setProfile({ ...profile, cover: url, coverPhotoConfig: cfg });
              setAuth(token, { ...user, cover: url });
              setCoverRepositionUrl(null);
              toast.success('Cover updated');
            } catch {
              toast.error('Could not save cover position');
            }
          }}
        />
      )}
    </div>
  );
}


