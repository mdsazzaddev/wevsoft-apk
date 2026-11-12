import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Users, Image as ImageIcon, Pin, Smile, Music, MessageCircle,
  Briefcase, Store, Link2, Play, Pause, Flag, EyeOff, Trash2, Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import ReportModal from '../../components/ReportModal';
import { profilePathFor } from '../../lib/profileLinks';
import { WIDGET_TYPES, type WidgetType } from '../shared';
import { legacySocialApi } from '../api';
import type { AppliedTheme } from '../theme/apply';
import { WidgetShell } from './WidgetShell';

export interface CanvasPayload {
  profileId: string;
  handle: string;
  isOwner: boolean;
  isFriend: boolean;
  canPostWall: boolean;
  flags?: Record<string, boolean>;
  theme?: {
    presetId?: string;
    accentColor?: string | null;
    background?: any;
    density?: string;
    avatarShape?: string;
    avatarFrameId?: string;
    customAccentColor?: string;
    glassEnabled?: boolean;
    glassOpacity?: number;
    glassBlur?: number;
    themeMode?: string;
  };
  layout?: import('../shared').WidgetInstance[];
  status: { text: string; emoji?: string | null; expiresAt?: string | null } | null;
  intro: { mediaUrl: string; mediaType: string; title?: string | null } | null;
  topFriends: { position: number; user: any }[];
  wall: any[];
  widgetData: Record<string, any>;
  views?: { count: number; who?: any[] } | null;
  settings: any;
}

export interface WidgetProps {
  canvas: CanvasPayload;
  theme: AppliedTheme;
  onRefresh: () => void;
}

const MOODS = ['🚀', '✨', '🎧', '☕️', '🌙', '💫', '🔥', '🌿', '💛', '🧠'];

function AboutWidget({ canvas, theme }: WidgetProps) {
  const about = canvas.widgetData?.about;
  if (!about?.bio && !about?.intro && !about?.location && !about?.work) {
    return <WidgetShell title="About" icon={<User size={14} />} theme={theme} empty />;
  }
  return (
    <WidgetShell title="About" icon={<User size={14} />} theme={theme}>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{about.bio || about.intro}</p>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {about.work && <p>Works at {about.work}</p>}
        {about.universityName && <p>{about.universityName}</p>}
        {about.location && <p>Lives in {about.location}</p>}
      </div>
    </WidgetShell>
  );
}

function TopFriendsWidget({ canvas, theme }: WidgetProps) {
  const friends = canvas.topFriends || [];
  if (!friends.length) {
    return (
      <WidgetShell title="Close circle" icon={<Users size={14} />} theme={theme} empty={canvas.isOwner}>
        {!canvas.isOwner && <p className="text-sm text-muted-foreground">No one pinned yet.</p>}
      </WidgetShell>
    );
  }
  return (
    <WidgetShell title="Close circle" icon={<Users size={14} />} theme={theme}>
      <div className="grid grid-cols-4 gap-3">
        {friends.map((row) => (
          <Link key={row.user.id} to={profilePathFor(row.user) || '#'} className="text-center group">
            <img
              src={row.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user.id}`}
              alt=""
              className="w-12 h-12 mx-auto rounded-full object-cover ring-2 ring-offset-2 ring-offset-background transition-transform duration-200 group-hover:scale-105"
              style={{ ['--tw-ring-color' as any]: theme.accent }}
            />
            <p className="mt-1 text-[11px] font-medium truncate">{row.user.name}</p>
          </Link>
        ))}
      </div>
    </WidgetShell>
  );
}

function PhotosWidget({ canvas, theme }: WidgetProps) {
  const photos: { url: string }[] = canvas.widgetData?.photos || [];
  if (!photos.length) return <WidgetShell title="Photos" icon={<ImageIcon size={14} />} theme={theme} empty />;
  return (
    <WidgetShell title="Photos" icon={<ImageIcon size={14} />} theme={theme}>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <img key={i} src={p.url} alt="" className="aspect-square object-cover rounded-lg" />
        ))}
      </div>
    </WidgetShell>
  );
}

function FeaturedPostWidget({ canvas, theme }: WidgetProps) {
  const post = canvas.widgetData?.featuredPost;
  if (!post) return <WidgetShell title="Pinned" icon={<Pin size={14} />} theme={theme} empty />;
  const media = post.postMedia?.[0];
  return (
    <WidgetShell title="Pinned" icon={<Pin size={14} />} theme={theme}>
      {media?.url && media.type !== 'video' && (
        <img src={media.url} alt="" className="w-full h-36 object-cover rounded-xl mb-2" />
      )}
      <p className="text-sm line-clamp-4">{post.content}</p>
    </WidgetShell>
  );
}

function StatusWidget({ canvas, theme }: WidgetProps) {
  const status = canvas.status;
  if (!status?.text && !status?.emoji) {
    return canvas.isOwner
      ? <WidgetShell title="Status" icon={<Smile size={14} />} theme={theme} empty />
      : null;
  }
  return (
    <WidgetShell title="Now" icon={<Smile size={14} />} theme={theme}>
      <p className="text-lg font-medium tracking-tight">
        {status.emoji ? <span className="mr-2">{status.emoji}</span> : null}
        {status.text}
      </p>
    </WidgetShell>
  );
}

function IntroMediaWidget({ canvas, theme }: WidgetProps) {
  const intro = canvas.intro;
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!intro?.mediaUrl) {
    return canvas.isOwner
      ? <WidgetShell title="Intro" icon={<Music size={14} />} theme={theme} empty />
      : null;
  }

  const toggle = () => {
    const el = intro.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <WidgetShell title={intro.title || 'Intro'} icon={<Music size={14} />} theme={theme}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause intro' : 'Play intro'}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: theme.accent, boxShadow: theme.preset.glowSm }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{intro.title || 'Click to play'}</p>
          <p className="text-[11px] text-muted-foreground">Never autoplays</p>
        </div>
      </div>
      {intro.mediaType === 'video' ? (
        <video ref={videoRef} src={intro.mediaUrl} className="mt-3 w-full rounded-xl max-h-48 bg-black" controls={playing} muted={false} playsInline preload="metadata" onEnded={() => setPlaying(false)} />
      ) : (
        <audio ref={audioRef} src={intro.mediaUrl} preload="metadata" onEnded={() => setPlaying(false)} className="sr-only" />
      )}
    </WidgetShell>
  );
}

function WallWidget({ canvas, theme, onRefresh }: WidgetProps) {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const posts = canvas.wall || [];

  const submit = async () => {
    if (!text.trim()) return;
    try {
      await legacySocialApi.postWall(canvas.handle || canvas.profileId, text.trim());
      setText('');
      toast.success('Posted to wall');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Could not post');
    }
  };

  return (
    <WidgetShell title="Wall" icon={<MessageCircle size={14} />} theme={theme}>
      {canvas.canPostWall && (
        <div className="mb-4">
          <label className="sr-only" htmlFor="wall-composer">Write a public note</label>
          <textarea
            id="wall-composer"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            rows={2}
            placeholder="Leave a public note…"
            className="w-full text-sm bg-muted/40 border border-border rounded-xl px-3 py-2 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-muted-foreground">{text.length}/280</span>
            <button
              type="button"
              onClick={submit}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1"
              style={{ background: theme.accent }}
            >
              <Send size={12} /> Post
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {posts.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className={`flex gap-3 ${p.status === 'hidden' ? 'opacity-50' : ''}`}>
            <Link to={profilePathFor(p.author) || '#'}>
              <img src={p.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.authorUserId}`} alt="" className="w-8 h-8 rounded-full object-cover" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <Link to={profilePathFor(p.author) || '#'} className="font-semibold hover:underline">{p.author?.name}</Link>
                <span className="text-muted-foreground text-xs ml-2">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words">{p.content}</p>
              <div className="flex gap-2 mt-1">
                {!canvas.isOwner && (
                  <button type="button" onClick={() => setReportId(p.id)} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1"><Flag size={10} /> Report</button>
                )}
                {canvas.isOwner && (
                  <>
                    <button type="button" onClick={async () => { await legacySocialApi.hideWall(p.id); onRefresh(); }} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"><EyeOff size={10} /> {p.status === 'hidden' ? 'Show' : 'Hide'}</button>
                    <button type="button" onClick={async () => { await legacySocialApi.deleteWall(p.id); onRefresh(); }} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1"><Trash2 size={10} /> Remove</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {reportId && <ReportModal targetId={reportId} targetType="profile_wall" onClose={() => setReportId(null)} />}
    </WidgetShell>
  );
}

function PortfolioWidget({ canvas, theme }: WidgetProps) {
  const items = canvas.widgetData?.portfolio || [];
  if (!items.length) return <WidgetShell title="Work" icon={<Briefcase size={14} />} theme={theme} empty />;
  return (
    <WidgetShell title="Work" icon={<Briefcase size={14} />} theme={theme}>
      <div className="space-y-2">
        {items.map((item: any) => (
          <a key={item.id} href={item.url || undefined} target="_blank" rel="noreferrer" className="block rounded-xl p-3 bg-muted/40 hover:bg-muted/70 transition-colors">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
          </a>
        ))}
      </div>
    </WidgetShell>
  );
}

function ShopWidget({ canvas, theme }: WidgetProps) {
  const shop = canvas.widgetData?.shop;
  if (!shop) return <WidgetShell title="Shop" icon={<Store size={14} />} theme={theme} empty />;
  return (
    <WidgetShell title={shop.seller?.shopName || 'Shop'} icon={<Store size={14} />} theme={theme}>
      <div className="grid grid-cols-2 gap-2">
        {shop.products?.map((p: any) => (
          <Link key={p.id} to={`/wevmall/product/${p.id}`} className="rounded-xl overflow-hidden bg-muted/40">
            {p.coverImage && <img src={p.coverImage} alt="" className="h-20 w-full object-cover" />}
            <div className="p-2">
              <p className="text-xs font-semibold line-clamp-1">{p.title}</p>
              {p.price != null && <p className="text-[11px]" style={{ color: theme.accent }}>৳{p.price}</p>}
            </div>
          </Link>
        ))}
      </div>
      {shop.seller?.shopSlug && (
        <Link to={`/shop/${shop.seller.shopSlug}`} className="mt-2 inline-block text-xs font-semibold" style={{ color: theme.accent }}>Visit shop</Link>
      )}
    </WidgetShell>
  );
}

function LinksWidget({ canvas, theme }: WidgetProps) {
  const links = canvas.widgetData?.links || {};
  const entries = Object.entries(links).filter(([, v]) => typeof v === 'string' && v);
  if (!entries.length) return <WidgetShell title="Links" icon={<Link2 size={14} />} theme={theme} empty />;
  return (
    <WidgetShell title="Links" icon={<Link2 size={14} />} theme={theme}>
      <div className="flex flex-wrap gap-2">
        {entries.map(([k, v]) => (
          <a
            key={k}
            href={String(v).startsWith('http') ? String(v) : `https://${v}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{ background: theme.preset.accentLight, color: theme.accent, border: `1px solid ${theme.preset.accentBorder}` }}
          >
            {k}
          </a>
        ))}
      </div>
    </WidgetShell>
  );
}

export const WIDGET_META: Record<WidgetType, { label: string; description: string; Component: React.ComponentType<WidgetProps> }> = {
  about: { label: 'About', description: 'Bio and basics', Component: AboutWidget },
  top_friends: { label: 'Close circle', description: 'Pinned connections', Component: TopFriendsWidget },
  photos: { label: 'Photos', description: 'Recent photos', Component: PhotosWidget },
  status: { label: 'Status', description: 'Mood line', Component: StatusWidget },
  intro_media: { label: 'Profile Song', description: 'Click-to-play audio/video', Component: IntroMediaWidget },
  wall: { label: 'Wall', description: 'Public comments', Component: WallWidget },
  featured_post: { label: 'Pinned post', description: 'Featured or pinned post', Component: FeaturedPostWidget },
  portfolio: { label: 'Work', description: 'Portfolio and work links', Component: PortfolioWidget },
  shop: { label: 'Shop', description: 'WevMall storefront', Component: ShopWidget },
  links: { label: 'Links', description: 'Social and website links', Component: LinksWidget },
};

export const WIDGET_TYPE_LIST = [...WIDGET_TYPES];

export { MOODS };
