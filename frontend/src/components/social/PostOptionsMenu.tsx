import { useEffect, useLayoutEffect, useRef, useState, lazy, Suspense, type ElementType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  MoreHorizontal, X, ChevronRight, ChevronLeft, Gauge, Volume2, VolumeX, Settings2,
  Languages, Captions, Ban, BellOff, User, Link2, Share2, Bookmark,
  Download, Tag, Flag, UserX, EyeOff, Sparkles, FileText, Music2, Search, Check, ExternalLink,
  Pencil, Trash2, Archive, ArchiveRestore, Pin, PinOff, MessageCircle, MessageCircleOff,
  Hash, Globe, Users, Lock, BarChart3, Code, Copy, Files, Image, ImagePlus, Type, MapPin,
  Folder, Scissors, Clapperboard, Repeat, Shield, AlertTriangle, UserPlus, UserMinus,
  Eye, Megaphone, Gavel, Heart, Clock, ListOrdered, Replace, Save, Crop, PlayCircle,
  AtSign, Layout, SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useWevAI } from '../../ai/hooks/useWevAI';
import {
  allMediaUrls,
  firstMediaUrl,
  isAdminRole,
  postHasVideo,
  viewerMenuKind,
  type PostMenuKind,
} from '../../lib/postMenuKind';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';
import { followSpace, unfollowSpace } from '../../lib/wevspaceApi';
import type { PostMusicSelection } from './MusicPickerModal';
import { flagsFromPrivacy, type AudienceUser } from '../../lib/postVisibility';
import { openAdminApp } from '../../lib/adminAppUrl';
import CreatePostUnsavedBar, { useBeforeUnloadGuard } from '../create-post/CreatePostUnsavedBar';

const ShareModal = lazy(() => import('../ShareModal'));
const VideoEditorModal = lazy(() => import('../profile/VideoEditorModal'));
const AudienceSelectorModal = lazy(() => import('./AudienceSelectorModal'));
const MusicPickerModal = lazy(() => import('./MusicPickerModal'));

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const QUALITIES = ['Auto', '144p', '360p', '480p', '720p', '1080p'] as const;
const LANGUAGES = [
  { code: 'auto', label: 'Auto (device)' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'à¦¬à¦¾à¦‚à¦²à¦¾' },
  { code: 'hi', label: 'à¤¹à¤¿à¤¨à¥à¤¦à¥€' },
  { code: 'ar', label: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' },
  { code: 'es', label: 'EspaÃ±ol' },
] as const;
const REPORT_REASONS = [
  { id: 'spam', label: 'Report Spam' },
  { id: 'harassment', label: 'Report Harassment' },
  { id: 'hate', label: 'Report Hate Content' },
  { id: 'violence', label: 'Report Violence' },
  { id: 'misinformation', label: 'Report Misinformation' },
  { id: 'copyright', label: 'Report Copyright Issue' },
  { id: 'fake_account', label: 'Report Fake Account' },
] as const;
const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Public', hint: 'Anyone on or off Wevsoft' },
  { id: 'friends', label: 'Friends', hint: 'People you are friends with' },
  { id: 'followers', label: 'Followers', hint: 'People who follow you' },
  { id: 'private', label: 'Only Me', hint: 'Only you can see this' },
] as const;

type Panel =
  | 'root'
  | 'speed'
  | 'quality'
  | 'language'
  | 'captions'
  | 'report'
  | 'form'
  | 'privacy'
  | 'analytics'
  | 'photos'
  | 'albums'
  | 'admin'
  | 'rearrange'
  | 'more';

type FormSpec = {
  title: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  saveLabel?: string;
  /** Leaving with unsaved edits asks Discard / Continue editing (no draft is kept). */
  guardUnsaved?: boolean;
  onSave: (value: string) => Promise<void>;
};

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

function Row({
  icon: Icon,
  label,
  hint,
  danger,
  onClick,
  trailing,
}: {
  icon: ElementType;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover ${
        danger ? 'text-destructive' : 'text-foreground'
      }`}
    >
      <Icon size={18} className={danger ? 'text-destructive' : 'text-muted-foreground'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hint}</p> : null}
      </div>
      {trailing ?? <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-2 pb-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function privacyLabel(value?: string | null) {
  const v = String(value || 'public').toLowerCase();
  if (v === 'private' || v === 'only_me' || v === 'onlyme') return 'Only Me';
  if (v === 'friends') return 'Friends';
  if (v === 'followers') return 'Followers';
  if (v === 'custom') return 'Custom audience';
  return 'Public';
}

export default function PostOptionsMenu({
  post,
  onHidden,
  onRestored,
  onRemoved,
  onChanged,
  triggerClassName,
  overlayZIndex,
}: {
  /** Restyle the "..." trigger (the photo viewer uses a chip that matches its panel). */
  triggerClassName?: string;
  /** Raise the options sheet above a full-screen host such as the post photo viewer. */
  overlayZIndex?: number;
  post: any;
  onHidden?: () => void;
  /** Undo of a hide-like action (snooze): the host puts the post back where it was. */
  onRestored?: () => void;
  onRemoved?: () => void;
  onChanged?: (patch: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const openAssistant = useWevAI((s) => s.openAssistant);
  const addMessage = useWevAI((s) => s.addMessage);
  const btnRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('root');
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('Auto');
  const [isMuted, setIsMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captionLanguage, setCaptionLanguage] = useState('en');
  const [audioLanguage, setAudioLanguage] = useState('auto');
  const [live, setLive] = useState(post);
  const [ctx, setCtx] = useState<any>(null);
  const [form, setForm] = useState<FormSpec | null>(null);
  const [formValue, setFormValue] = useState('');
  const [confirmExit, setConfirmExit] = useState<null | 'back' | 'close'>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [trimFile, setTrimFile] = useState<File | null>(null);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setLive(post); }, [post]);

  const postId = String(live?.id || '');
  /**
   * Who this menu is about.
   *
   * `menu-context` is authoritative once loaded; until then the card's own payload
   * already carries `authorKind`/`space`. Either way the answer never falls back to
   * `live.user` on a Space's post — that fallback is what turned whichever team
   * member pressed publish into this menu's Follow, Restrict and Block buttons, for a
   * human the reader was never shown.
   */
  const author = resolveContentAuthor(
    ctx?.authorKind
      ? { authorKind: ctx.authorKind, space: ctx.space, spaceId: ctx.space?.id ?? null, user: live?.user }
      : live,
    user?.id,
  );
  const isSpacePost = author.kind === 'space';
  /** Null on a Space's post, so every person-level control below disables itself. */
  const ownerId = author.kind === 'user' ? author.id : null;
  /**
   * On a Space's post this is the server's answer, not a comparison: it means "you
   * hold content.edit in this Space", which an Owner does and a departed Editor does
   * not. Comparing ids would get both backwards.
   */
  const isOwn = isSpacePost ? !!ctx?.isOwner : !!(user?.id && ownerId && user.id === ownerId);
  const isAdmin = isAdminRole(user?.role) || !!ctx?.isAdmin;
  const kind: PostMenuKind = viewerMenuKind(live, isOwn);
  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/posts/${encodeURIComponent(postId)}`
      : `/posts/${postId}`;
  const ownerPath = author.href;
  const allowDownload =
    ctx?.downloadsEnabled !== undefined
      ? !!ctx.downloadsEnabled
      : live?.allowDownload !== false && live?.sharingDisabled !== true;
  const hasVideo = postHasVideo(live) || kind === 'video' || kind === 'reel';
  const hasPhoto = kind === 'photo' || (kind === 'share' && allMediaUrls(live).some((u) => !/\.(mp4|webm|mov|mkv)(\?|$)/i.test(u)));
  const caption = String(live?.content || live?.caption || live?.description || '');
  const commentsOff = ctx?.settings?.commentsDisabled ?? live?.commentsDisabled;
  const sharingOff = ctx?.settings?.sharingDisabled ?? live?.sharingDisabled;
  const pinned = ctx?.settings?.pinned ?? live?.pinned;
  const archived = ctx?.settings?.isArchived ?? live?.isArchived;
  const following = isSpacePost ? !!ctx?.spaceFollowing : !!ctx?.following;
  const remixOn = ctx?.publish?.allowRemix !== false;
  const duetOn = ctx?.publish?.allowDuets !== false;
  const embedsOn = ctx?.publish?.allowEmbeds !== false;

  const headers = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const findVideo = () =>
    (btnRef.current?.closest('article, .group, [class*="rounded"]') as HTMLElement | null)?.querySelector('video') as HTMLVideoElement | null;

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPanel('root');
      setForm(null);
      return;
    }
    if (!token || !postId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/menu-context`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || cancelled) return;
        setCtx(await res.json());
      } catch {
        /* offline â€” menu still works from post payload */
      }
    })();
    return () => { cancelled = true; };
  }, [open, token, postId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmExit) return;
        if (panel !== 'root') guardedRef.current('back');
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, panel, confirmExit]);

  const close = () => setOpen(false);
  const editDirty = open && panel === 'form' && !!form?.guardUnsaved && formValue !== form.value;
  useBeforeUnloadGuard(editDirty);
  const runExit = (kind: 'back' | 'close') => {
    if (kind === 'back') setPanel('root');
    else setOpen(false);
  };
  const guardedExit = (kind: 'back' | 'close') => {
    if (editDirty) setConfirmExit(kind);
    else runExit(kind);
  };
  const guardedRef = useRef(guardedExit);
  // Latest-callback ref, updated after render instead of during render.
  // eslint-disable-next-line react-hooks/immutability -- ref mutation inside an effect is the intended pattern
  useLayoutEffect(() => { guardedRef.current = guardedExit; });

  const applyLocal = (patch: Record<string, any>) => {
    setLive((p: any) => ({ ...p, ...patch }));
    onChanged?.(patch);
    setCtx((c: any) =>
      c
        ? {
            ...c,
            settings: { ...c.settings, ...patch },
          }
        : c,
    );
  };

  const patchPost = async (body: Record<string, any>, okMsg?: string) => {
    if (!token || !postId) return false;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('update failed');
      const updated = await res.json();
      applyLocal(updated);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch {
      toast.error('Could not update post');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const patchViewSettings = async (
    body: {
      viewCountVisibility?: string;
      showViewerIdentities?: boolean;
      viewTrackingDisabled?: boolean;
    },
    okMsg?: string,
  ) => {
    if (!token || !postId) return false;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/view-settings`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('update failed');
      const updated = await res.json();
      applyLocal(updated);
      onChanged?.(updated);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch {
      toast.error('Could not update view settings');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const currentMusicSelection = (): PostMusicSelection | null => {
    const pm = live?.postMusic;
    const audioUrl = pm?.audioUrl || live?.music?.audioUrl;
    const musicId = pm?.musicId || live?.musicId || live?.music?.id;
    if (!musicId || !audioUrl) return null;
    return {
      musicId: String(musicId),
      startTime: Number(pm?.startTime) || 0,
      endTime: pm?.endTime == null ? null : Number(pm.endTime),
      volume: pm?.volume != null ? Number(pm.volume) : 1,
      originalAudioMuted: !!pm?.originalAudioMuted,
      title: String(pm?.title || live?.music?.title || 'Music'),
      artist: pm?.artist ?? live?.music?.artist ?? null,
      coverImage: pm?.coverImage ?? live?.music?.coverImage ?? null,
      audioUrl: String(audioUrl),
      duration: Number(pm?.duration || live?.music?.duration) || 30,
    };
  };

  const savePostMusic = async (selection: PostMusicSelection | null) => {
    if (!token || !postId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/music`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(
          selection
            ? {
                musicId: selection.musicId,
                startTime: selection.startTime,
                endTime: selection.endTime,
                volume: selection.volume,
                originalAudioMuted: selection.originalAudioMuted,
              }
            : { remove: true },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update music');
      applyLocal({
        postMusic: data.postMusic ?? null,
        musicId: data.postMusic?.musicId ?? null,
        music: data.postMusic
          ? {
              id: data.postMusic.musicId,
              title: data.postMusic.title,
              artist: data.postMusic.artist,
              coverImage: data.postMusic.coverImage,
              audioUrl: data.postMusic.audioUrl,
              duration: data.postMusic.duration,
            }
          : null,
      });
      toast.success(selection ? 'Music updated' : 'Music removed');
      setMusicPickerOpen(false);
      close();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update music');
    } finally {
      setBusy(false);
    }
  };

  const openForm = (spec: FormSpec) => {
    setForm(spec);
    setFormValue(spec.value);
    setPanel('form');
  };

  const askWev = (prompt: string) => {
    close();
    openAssistant();
    addMessage({ role: 'user', content: prompt });
    toast.success('Opened Wevsoft AI');
  };

  const copyText = async (text: string, ok = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok);
      close();
    } catch {
      toast.error('Could not copy');
    }
  };

  const copyLink = () => copyText(postUrl, 'Link copied');

  const persistHide = async (reason: string) => {
    const list = readList('wev_hidden_posts');
    if (postId && !list.includes(postId)) list.push(postId);
    writeList('wev_hidden_posts', list);
    if (token) {
      await fetch(`/api/posts/${postId}/hide`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ reason }),
      }).catch(() => {});
    }
    close();
    onHidden?.();
  };

  const savePost = async () => {
    const list = readList('wev_saved_posts');
    if (postId && !list.includes(postId)) list.push(postId);
    writeList('wev_saved_posts', list);
    if (token) {
      await fetch(`/api/posts/${postId}/save`, { method: 'POST', headers: headers() }).catch(() => {});
    }
    toast.success('Post saved');
    close();
  };

  const hidePost = async () => {
    toast.success('Post hidden');
    await persistHide('hidden');
  };

  const notInterested = async () => {
    toast.success('Got it â€” fewer like this');
    await persistHide('not_interested');
  };

  const muteCreator = async () => {
    const id = String(ownerId || '');
    // No person to mute on a Space's post. The row is hidden there too; this guard
    // keeps the success toast honest if it is ever reached another way.
    if (!id) return;
    const list = readList('wev_muted_creators');
    if (id && !list.includes(id)) list.push(id);
    writeList('wev_muted_creators', list);
    if (token && id) {
      await fetch('/api/settings/mutes', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ mutedId: id }),
      }).catch(() => {});
    }
    toast.success(`Muted ${live?.user?.name || 'this account'}`);
    close();
    onHidden?.();
  };

  // Server-side snooze (Settings > Snoozed accounts): hides this person's posts and reels from feeds for 30 days.
  const snoozeCreator = async () => {
    const id = String(ownerId || '');
    if (!id || !token || isOwn) return;
    const name = live?.user?.name || 'this account';
    try {
      const r = await fetch('/api/settings/snoozed-accounts', { method: 'POST', headers: headers(), body: JSON.stringify({ userId: id }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Could not snooze');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not snooze');
      return;
    }
    close();
    onHidden?.();
    toast((t) => (
      <span className="flex items-center gap-3 text-sm">
        <span>Snoozed {name} for 30 days</span>
        <button
          type="button"
          className="font-semibold text-primary"
          onClick={async () => {
            toast.dismiss(t.id);
            const r = await fetch(`/api/settings/snoozed-accounts/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() }).catch(() => null);
            if (r && r.ok) {
              onRestored?.();
              toast.success(onRestored ? 'Snooze undone' : 'Snooze undone. Refresh to see their posts again.');
            }
            else toast.error('Could not undo. Manage it in Settings > Snoozed accounts.');
          }}
        >
          Undo
        </button>
      </span>
    ), { duration: 6000 });
  };

  const hideCreator = () => {
    const id = String(ownerId || '');
    if (!id) return;
    const list = readList('wev_hidden_creators');
    if (id && !list.includes(id)) list.push(id);
    writeList('wev_hidden_creators', list);
    toast.success('Content from this creator will be hidden');
    close();
    onHidden?.();
  };

  const showLessLikeThis = async () => {
    const list = readList('wev_show_less_tags');
    const tag = (live?.hashtags || caption || postId).toString().slice(0, 80);
    if (tag && !list.includes(tag)) list.push(String(tag));
    writeList('wev_show_less_tags', list);
    toast.success('We will show less like this');
    await persistHide('not_interested');
  };

  const showMoreLikeThis = () => {
    const list = readList('wev_show_more_tags');
    const tag = (live?.hashtags || caption || postId).toString().slice(0, 80);
    if (tag && !list.includes(tag)) list.push(String(tag));
    writeList('wev_show_more_tags', list);
    toast.success('We will show more like this');
    close();
  };

  const followUser = async () => {
    if (!token || isOwn) return;
    setBusy(true);
    try {
      if (isSpacePost) {
        // Followed through the Space API. There is deliberately no user id here to
        // point `/api/users/:id/follow` at, and the follower row belongs to the
        // Space's audience rather than to any team member's followers.
        if (!author.id) throw new Error('This WevSpace is unavailable');
        const data = following ? await unfollowSpace(author.id) : await followSpace(author.id);
        setCtx((c: any) => ({ ...(c || {}), spaceFollowing: !!data.following }));
        toast.success(data.following ? 'Following this WevSpace' : 'Unfollowed');
        return;
      }
      if (!ownerId) return;
      const res = await fetch(`/api/users/${ownerId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      setCtx((c: any) => ({ ...(c || {}), following: !!data.following }));
      toast.success(data.following ? 'Following' : 'Unfollowed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update follow');
    } finally {
      setBusy(false);
    }
  };

  const restrictUser = async () => {
    if (!ownerId || !token || isOwn) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${ownerId}/restrict`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      setCtx((c: any) => ({ ...(c || {}), restricted: !!data.restricted }));
      toast.success(data.restricted ? 'User restricted' : 'Restriction removed');
      close();
    } catch {
      toast.error('Could not restrict user');
    } finally {
      setBusy(false);
    }
  };

  const blockUser = async () => {
    if (!ownerId || !token || isOwn) return;
    if (!window.confirm(`Block ${live?.user?.name || 'this user'}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/settings/blocks', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ blockedId: ownerId }),
      });
      if (!res.ok) throw new Error('block failed');
      toast.success('User blocked');
      close();
      onHidden?.();
    } catch {
      toast.error('Failed to block user');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (reason: string) => {
    if (!token || !postId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          targetId: postId,
          targetType: 'post',
          reason,
          description: `Post report: ${reason}`,
        }),
      });
      if (!res.ok) throw new Error('report failed');
      toast.success('Report submitted');
      close();
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setBusy(false);
    }
  };

  const toggleMute = () => {
    const video = findVideo();
    const next = !isMuted;
    setIsMuted(next);
    if (video) video.muted = next;
    toast.success(next ? 'Muted' : 'Unmuted');
  };

  const applySpeed = (rate: number) => {
    setPlaybackRate(rate);
    const video = findVideo();
    if (video) video.playbackRate = rate;
    toast.success(`Speed ${rate}Ã—`);
    setPanel('root');
  };

  const downloadUrl = async (url: string, filename: string) => {
    try {
      setBusy(true);
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success('Download started');
      close();
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Opening mediaâ€¦');
      close();
    } finally {
      setBusy(false);
    }
  };

  const downloadMedia = async (compressed = false) => {
    if (!allowDownload) {
      toast.error('Creator disabled downloads');
      return;
    }
    const url = firstMediaUrl(live);
    if (!url) {
      toast.error('No media to download');
      return;
    }
    if (compressed && !hasVideo) {
      try {
        setBusy(true);
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('load'));
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));
        if (!blob) throw new Error('compress');
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `wevsoft-post-${postId}.jpg`;
        a.click();
        URL.revokeObjectURL(href);
        toast.success('Compressed download started');
        close();
      } catch {
        await downloadUrl(url, `wevsoft-post-${postId}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    await downloadUrl(url, `wevsoft-post-${postId}${hasVideo ? '.mp4' : ''}`);
  };

  const loadAnalytics = async () => {
    if (!token || !postId) return;
    setPanel('analytics');
    try {
      const res = await fetch(`/api/posts/${postId}/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('analytics');
      setAnalytics(await res.json());
    } catch {
      toast.error('Could not load analytics');
    }
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post? It will be moved to trash.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('delete');
      toast.success('Post deleted');
      close();
      onRemoved?.();
      onHidden?.();
    } catch {
      toast.error('Could not delete post');
    } finally {
      setBusy(false);
    }
  };

  const duplicatePost = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/duplicate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('dup');
      toast.success('Post duplicated');
      close();
    } catch {
      toast.error('Could not duplicate post');
    } finally {
      setBusy(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ post: live, context: ctx, exportedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `wevsoft-post-${postId}.json`;
    a.click();
    URL.revokeObjectURL(href);
    toast.success('Export started');
    close();
  };

  const embedPost = () => {
    const snippet = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${postId}?embed=1" width="540" height="680" style="border:0;border-radius:16px;overflow:hidden" allowfullscreen></iframe>`;
    void copyText(snippet, 'Embed code copied');
  };

  const captureFrame = async () => {
    const video = findVideo();
    if (!video) {
      toast.error('Play the video to capture a cover frame');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob || !token) return;
    const fd = new FormData();
    fd.append('thumbnail', blob, 'cover.jpg');
    fd.append('coverFrame', String(video.currentTime || 0));
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/thumbnail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('thumb');
      toast.success('Cover updated');
    } catch {
      toast.error('Could not update cover');
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (files: FileList | null, replace = false) => {
    if (!files?.length || !token) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('media', f));
    if (replace) fd.append('replace', 'true');
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('media');
      const data = await res.json();
      applyLocal({ postMedia: data.all, media: JSON.stringify((data.all || []).map((m: any) => m.url)) });
      toast.success(replace ? 'Photo replaced' : 'Photos added');
    } catch {
      toast.error('Could not update photos');
    } finally {
      setBusy(false);
    }
  };

  const startTrim = async () => {
    const url = firstMediaUrl(live);
    if (!url) return;
    try {
      setBusy(true);
      const res = await fetch(url);
      const blob = await res.blob();
      setTrimFile(new File([blob], `wevsoft-${postId}.mp4`, { type: blob.type || 'video/mp4' }));
      close();
    } catch {
      toast.error('Could not load video for trimming');
    } finally {
      setBusy(false);
    }
  };

  const moderate = async (action: string, ok: string) => {
    if (!window.confirm(`${ok}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/moderate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('mod');
      toast.success(ok);
      if (action === 'remove' || action === 'shadow_hide') {
        close();
        onHidden?.();
        onRemoved?.();
      }
    } catch {
      toast.error('Moderation action failed');
    } finally {
      setBusy(false);
    }
  };

  const watchLater = async () => {
    if (token) {
      await fetch(`/api/posts/${postId}/watch-later`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    const list = readList('wev_watch_later');
    if (postId && !list.includes(postId)) list.push(postId);
    writeList('wev_watch_later', list);
    toast.success('Saved to Watch Later');
    close();
  };

  const showTranscript = () => {
    const text = caption;
    if (!text) {
      toast.error('No transcript available');
      return;
    }
    close();
    toast((t) => (
      <div className="max-w-xs">
        <p className="font-bold text-sm mb-1">Transcript</p>
        <p className="text-xs whitespace-pre-wrap line-clamp-8">{text}</p>
        <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => toast.dismiss(t.id)}>
          Close
        </button>
      </div>
    ), { duration: 8000 });
  };

  const title =
    panel === 'speed' ? 'Playback Speed'
    : panel === 'quality' ? 'Quality'
    : panel === 'language' ? 'Language'
    : panel === 'captions' ? 'Captions'
    : panel === 'report' ? 'Report'
    : panel === 'form' ? (form?.title || 'Edit')
    : panel === 'privacy' ? 'Privacy & Audience'
    : panel === 'analytics' ? 'Analytics'
    : panel === 'photos' ? 'Photo management'
    : panel === 'albums' ? 'Albums'
    : panel === 'admin' ? 'Moderation'
    : panel === 'rearrange' ? 'Rearrange photos'
    : panel === 'more' ? 'More options'
    : kind === 'reel' ? 'Reel options'
    : kind === 'share' ? 'Shared post'
    : 'Post options';

  const playbackSection = hasVideo ? (
    <Section title="Playback">
      <Row icon={Gauge} label="Playback Speed" hint={`${playbackRate}Ã—`} onClick={() => setPanel('speed')} />
      <Row
        icon={isMuted ? VolumeX : Volume2}
        label={isMuted ? 'Unmute' : 'Mute'}
        hint="Volume / Mute"
        onClick={toggleMute}
        trailing={<span className="text-[11px] text-muted-foreground font-semibold">{isMuted ? 'Muted' : 'On'}</span>}
      />
      <Row icon={Settings2} label="Quality" hint={quality} onClick={() => setPanel('quality')} />
      <Row
        icon={Languages}
        label="Language"
        hint={`Audio: ${LANGUAGES.find((l) => l.code === audioLanguage)?.label || audioLanguage}`}
        onClick={() => setPanel('language')}
      />
      <Row
        icon={Captions}
        label="Captions / Subtitles"
        hint={captionsOn ? `On Â· ${captionLanguage}` : 'Off'}
        onClick={() => setPanel('captions')}
      />
    </Section>
  ) : null;

  const wevSection = (
    <Section title="Wevsoft">
      {hasVideo && (
        <Row icon={FileText} label="View Transcript" onClick={showTranscript} trailing={null} />
      )}
      {hasVideo && (
        <Row
          icon={Music2}
          label="View Original Audio"
          hint={`Original Audio Â· ${live?.user?.name || 'Creator'}`}
          onClick={() => {
            toast.success(`Original Audio â€” ${live?.user?.name || 'Creator'}`);
            close();
          }}
          trailing={null}
        />
      )}
      <Row
        icon={Search}
        label="Search this Post / Find similar"
        onClick={() => {
          const q = encodeURIComponent((live?.hashtags || caption || 'posts').toString().slice(0, 60));
          close();
          navigate(`/home?q=${q}`);
        }}
        trailing={null}
      />
    </Section>
  );

  const ownerManagement = isOwn && kind !== 'share' && kind !== 'reel' && (
    <Section title="Post Management">
      <Row
        icon={Pencil}
        label="Edit Post"
        onClick={() =>
          openForm({
            title: 'Edit Post',
            label: 'Caption',
            value: caption,
            multiline: true,
            guardUnsaved: true,
            onSave: async (v) => { await patchPost({ content: v }, 'Post updated'); close(); },
          })
        }
      />
      <Row icon={Trash2} label="Delete Post" danger onClick={() => void deletePost()} trailing={null} />
      {archived ? (
        <Row icon={ArchiveRestore} label="Restore Archived Post" onClick={() => void patchPost({ isArchived: false }, 'Post restored')} trailing={null} />
      ) : (
        <Row icon={Archive} label="Archive Post" onClick={() => void patchPost({ isArchived: true }, 'Post archived')} trailing={null} />
      )}
      <Row
        icon={EyeOff}
        label="Hide From Timeline"
        hint={ctx?.settings?.hideFromTimeline ? 'Hidden' : 'Visible on profile'}
        onClick={() => void patchPost({ hideFromTimeline: !ctx?.settings?.hideFromTimeline }, ctx?.settings?.hideFromTimeline ? 'Shown on timeline' : 'Hidden from timeline')}
        trailing={null}
      />
      {pinned ? (
        <Row icon={PinOff} label="Unpin From Profile" onClick={() => void patchPost({ pinned: false }, 'Unpinned')} trailing={null} />
      ) : (
        <Row icon={Pin} label="Pin To Profile" onClick={() => void patchPost({ pinned: true }, 'Pinned to profile')} trailing={null} />
      )}
      {kind !== 'video' && (
        <Row
          icon={commentsOff ? MessageCircle : MessageCircleOff}
          label={commentsOff ? 'Turn Comments On' : 'Turn Comments Off'}
          onClick={() => void patchPost({ commentsDisabled: !commentsOff }, commentsOff ? 'Comments on' : 'Comments off')}
          trailing={null}
        />
      )}
      {kind !== 'video' && (
        <>
          <Row
            icon={SlidersHorizontal}
            label="Limit Comments"
            hint={ctx?.settings?.commentPolicy === 'followers' ? 'Followers only' : 'Everyone'}
            onClick={() =>
              void patchPost(
                { commentPolicy: ctx?.settings?.commentPolicy === 'followers' ? 'everyone' : 'followers' },
                ctx?.settings?.commentPolicy === 'followers' ? 'Comments open to everyone' : 'Comments limited to followers',
              )
            }
            trailing={null}
          />
          <Row
            icon={AtSign}
            label="Manage Mentions"
            onClick={() =>
              openForm({
                title: 'Manage Mentions',
                label: '@usernames',
                value: (caption.match(/@[\w.]+/g) || []).join(' '),
                placeholder: '@friend @creator',
                onSave: async (v) => {
                  await patchPost({ content: `${caption.replace(/@[\w.]+/g, '').trim()} ${v}`.trim() }, 'Mentions updated');
                  setPanel('root');
                },
              })
            }
          />
          {kind !== 'photo' && (
            <Row
              icon={Hash}
              label="Edit Hashtags"
              onClick={() =>
                openForm({
                  title: 'Edit Hashtags',
                  label: 'Hashtags',
                  value: String(live?.hashtags || ''),
                  placeholder: '#wevsoft #campus',
                  onSave: async (v) => { await patchPost({ hashtags: v }, 'Hashtags updated'); setPanel('root'); },
                })
              }
            />
          )}
        </>
      )}
      <Row
        icon={Music2}
        label={currentMusicSelection() ? 'Edit Music Segment' : 'Add Music'}
        hint={currentMusicSelection()?.title}
        onClick={() => {
          setOpen(false);
          setMusicPickerOpen(true);
        }}
        trailing={null}
      />
    </Section>
  );

  const ownerPrivacy = isOwn && kind !== 'reel' && (
    <Section title="Privacy & Audience">
      <Row
        icon={Globe}
        label="Change Audience"
        hint={privacyLabel(ctx?.settings?.privacy || live?.privacy)}
        onClick={() => setAudienceOpen(true)}
      />
      <Row
        icon={UserMinus}
        label="Exclude Specific Users"
        onClick={() =>
          openForm({
            title: 'Exclude Users',
            label: 'User IDs to exclude',
            value: (ctx?.settings?.excludedUserIds || []).join(', '),
            onSave: async (v) => {
              await patchPost({ excludedUserIds: v.split(/[,\s]+/).filter(Boolean) }, 'Exclusions saved');
              setPanel('root');
            },
          })
        }
      />
    </Section>
  );

  const viewVis = String(live?.viewCountVisibility || 'public').toLowerCase();
  const ownerViewSettings = isOwn && kind !== 'share' && (
    <Section title="View Settings">
      <Row
        icon={Eye}
        label="Show view count"
        hint={viewVis === 'public' ? 'Everyone' : viewVis === 'owner' ? 'Only you' : 'Hidden'}
        onClick={() => {
          const order = ['public', 'owner', 'hidden'] as const;
          const next = order[(order.indexOf(viewVis as any) + 1) % order.length];
          void patchViewSettings(
            { viewCountVisibility: next },
            next === 'public' ? 'View count visible' : next === 'owner' ? 'View count owner-only' : 'View count hidden',
          );
        }}
      />
      <Row
        icon={Users}
        label={live?.showViewerIdentities ? 'Hide viewer list' : 'Allow viewer list'}
        hint="Still respects each viewer’s privacy"
        onClick={() =>
          void patchViewSettings(
            { showViewerIdentities: !live?.showViewerIdentities },
            live?.showViewerIdentities ? 'Viewer list off' : 'Viewer list allowed',
          )
        }
      />
      <Row
        icon={EyeOff}
        label={live?.viewTrackingDisabled ? 'Enable view tracking' : 'Disable view tracking'}
        onClick={() =>
          void patchViewSettings(
            { viewTrackingDisabled: !live?.viewTrackingDisabled },
            live?.viewTrackingDisabled ? 'Tracking enabled' : 'Tracking disabled',
          )
        }
        trailing={null}
      />
    </Section>
  );

  const ownerAnalytics = isOwn && kind !== 'share' && (
    <Section title="Analytics">
      <Row
        icon={BarChart3}
        label="View Insights"
        hint={kind === 'reel' ? 'Views, reach, watch time, saves, followers' : kind === 'video' ? 'Reach, engagement, watch time, retention' : 'Reach, engagement, reactions, shares, comments'}
        onClick={() => void loadAnalytics()}
      />
    </Section>
  );

  const ownerSharing = isOwn && (
    <Section title="Sharing">
      <Row icon={Link2} label="Copy Post Link" onClick={copyLink} trailing={null} />
      <Row
        icon={Share2}
        label="Share Post"
        onClick={() => { close(); setShareOpen(true); }}
        trailing={null}
      />
      {kind !== 'share' && kind !== 'reel' && (
        <Row icon={Code} label="Embed Post" onClick={embedPost} trailing={null} />
      )}
    </Section>
  );

  const ownerAdvanced = isOwn && kind !== 'share' && kind !== 'reel' && (
    <Section title="Advanced">
      <Row icon={Save} label="Save As Draft" onClick={() => void patchPost({ status: 'draft' }, 'Saved as draft')} trailing={null} />
      <Row icon={Files} label="Duplicate Post" onClick={() => void duplicatePost()} trailing={null} />
      <Row
        icon={Languages}
        label="Translate Post"
        onClick={() => askWev(`Translate this post caption to my preferred language:\n\n"${caption || '(no caption)'}"`)}
        trailing={null}
      />
      <Row icon={Download} label="Export Post Data" onClick={exportData} trailing={null} />
    </Section>
  );

  const photoOwner = isOwn && kind === 'photo' && (
    <>
      <Section title="Photo Management">
        <Row icon={Replace} label="Replace Photo" onClick={() => photoInputRef.current?.click()} trailing={null} />
        <Row icon={ImagePlus} label="Add More Photos" onClick={() => addPhotoInputRef.current?.click()} trailing={null} />
        <Row icon={ListOrdered} label="Rearrange Photos" onClick={() => setPanel('rearrange')} />
        <Row
          icon={Type}
          label="Edit Caption"
          onClick={() =>
            openForm({
              title: 'Edit Caption',
              label: 'Caption',
              value: caption,
              multiline: true,
              onSave: async (v) => { await patchPost({ content: v }, 'Caption updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={FileText}
          label="Edit Alt Text"
          onClick={() =>
            openForm({
              title: 'Edit Alt Text',
              label: 'Alt text',
              value: String(ctx?.settings?.altText || ''),
              multiline: true,
              onSave: async (v) => { await patchPost({ altText: v, publish: { altText: v } }, 'Alt text saved'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={Layout}
          label="Set Cover Image"
          hint="First photo is the cover"
          onClick={() => {
            const first = ctx?.media?.[0]?.id;
            if (first) void patchPost({ coverMediaId: first }, 'Cover image set');
            else toast.error('No photos yet');
          }}
          trailing={null}
        />
        <Row icon={Download} label="Download Original" onClick={() => void downloadMedia(false)} trailing={null} />
        <Row icon={Image} label="Download Compressed Version" onClick={() => void downloadMedia(true)} trailing={null} />
      </Section>
      <Section title="Photo Controls">
        <Row
          icon={Tag}
          label="Tag People"
          onClick={() =>
            openForm({
              title: 'Tag People',
              label: 'User IDs',
              value: (ctx?.settings?.taggedUserIds || []).join(', '),
              onSave: async (v) => {
                await patchPost({ taggedUserIds: v.split(/[,\s]+/).filter(Boolean) }, 'Tags updated');
                setPanel('root');
              },
            })
          }
        />
        <Row
          icon={UserX}
          label="Remove Tags"
          onClick={() => void patchPost({ taggedUserIds: [] }, 'Tags removed')}
          trailing={null}
        />
        <Row
          icon={MapPin}
          label="Edit Location"
          onClick={() =>
            openForm({
              title: 'Edit Location',
              label: 'Location',
              value: String(live?.location || ''),
              onSave: async (v) => { await patchPost({ location: v }, 'Location updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={Folder}
          label="Edit Album"
          onClick={async () => {
            if (token) {
              const res = await fetch('/api/me/albums', { headers: { Authorization: `Bearer ${token}` } });
              const data = await res.json().catch(() => ({}));
              setAlbums(data.albums || []);
            }
            setPanel('albums');
          }}
        />
        <Row icon={Folder} label="Move To Album" onClick={() => setPanel('albums')} />
      </Section>
    </>
  );

  const videoOwner = isOwn && kind === 'video' && (
    <>
      <Section title="Video Management">
        <Row
          icon={Type}
          label="Edit Video Title"
          onClick={() =>
            openForm({
              title: 'Video Title',
              label: 'Title',
              value: String(ctx?.publish?.title || caption.split('\n')[0] || ''),
              onSave: async (v) => { await patchPost({ publish: { title: v } }, 'Title updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={FileText}
          label="Edit Description"
          onClick={() =>
            openForm({
              title: 'Description',
              label: 'Description',
              value: String(ctx?.publish?.description || caption),
              multiline: true,
              onSave: async (v) => { await patchPost({ content: v, publish: { description: v } }, 'Description updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={Hash}
          label="Edit Hashtags"
          onClick={() =>
            openForm({
              title: 'Hashtags',
              label: 'Hashtags',
              value: String(live?.hashtags || ctx?.publish?.hashtags || ''),
              onSave: async (v) => { await patchPost({ hashtags: v, publish: { hashtags: v } }, 'Hashtags updated'); setPanel('root'); },
            })
          }
        />
        <Row icon={Replace} label="Replace Thumbnail" onClick={() => thumbInputRef.current?.click()} trailing={null} />
        <Row icon={Sparkles} label="Auto Generate Thumbnail" onClick={() => void captureFrame()} trailing={null} />
        <Row icon={ImagePlus} label="Upload Custom Thumbnail" onClick={() => thumbInputRef.current?.click()} trailing={null} />
        <Row icon={Scissors} label="Trim Video" onClick={() => void startTrim()} trailing={null} />
        <Row icon={Crop} label="Change Cover Frame" onClick={() => void captureFrame()} trailing={null} />
      </Section>
      <Section title="Video Controls">
        <Row
          icon={commentsOff ? MessageCircle : MessageCircleOff}
          label={commentsOff ? 'Enable Comments' : 'Disable Comments'}
          onClick={() => void patchPost({ commentsDisabled: !commentsOff, publish: { enableComments: commentsOff } }, 'Updated')}
          trailing={null}
        />
        <Row
          icon={Download}
          label={allowDownload ? 'Disable Downloads' : 'Enable Downloads'}
          onClick={() => void patchPost({ allowDownload: !allowDownload, publish: { allowDownloads: !allowDownload } }, 'Updated')}
          trailing={null}
        />
        <Row
          icon={Code}
          label={embedsOn ? 'Disable Embedding' : 'Enable Embedding'}
          onClick={() => void patchPost({ publish: { allowEmbeds: !embedsOn } }, 'Updated')}
          trailing={null}
        />
        <Row
          icon={Share2}
          label={sharingOff ? 'Enable Sharing' : 'Disable Sharing'}
          onClick={() => void patchPost({ sharingDisabled: !sharingOff, publish: { allowSharing: sharingOff } }, 'Updated')}
          trailing={null}
        />
      </Section>
    </>
  );

  const reelOwner = isOwn && kind === 'reel' && (
    <>
      <Section title="Reel Management">
        <Row
          icon={Pencil}
          label="Edit Reel"
          onClick={() =>
            openForm({
              title: 'Edit Reel',
              label: 'Caption',
              value: caption,
              multiline: true,
              onSave: async (v) => { await patchPost({ content: v }, 'Reel updated'); close(); },
            })
          }
        />
        <Row icon={Trash2} label="Delete Reel" danger onClick={() => void deletePost()} trailing={null} />
        {archived ? (
          <Row icon={ArchiveRestore} label="Restore Reel" onClick={() => void patchPost({ isArchived: false }, 'Restored')} trailing={null} />
        ) : (
          <Row icon={Archive} label="Archive Reel" onClick={() => void patchPost({ isArchived: true }, 'Archived')} trailing={null} />
        )}
        {pinned ? (
          <Row icon={PinOff} label="Unpin Reel" onClick={() => void patchPost({ pinned: false }, 'Unpinned')} trailing={null} />
        ) : (
          <Row icon={Pin} label="Pin Reel" onClick={() => void patchPost({ pinned: true }, 'Pinned')} trailing={null} />
        )}
        <Row icon={Crop} label="Change Cover" onClick={() => void captureFrame()} trailing={null} />
        <Row icon={Replace} label="Replace Thumbnail" onClick={() => thumbInputRef.current?.click()} trailing={null} />
        <Row
          icon={Music2}
          label={currentMusicSelection() ? 'Edit Music Segment' : 'Add Music'}
          hint={currentMusicSelection()?.title}
          onClick={() => {
            setOpen(false);
            setMusicPickerOpen(true);
          }}
          trailing={null}
        />
        <Row
          icon={Type}
          label="Edit Caption"
          onClick={() =>
            openForm({
              title: 'Caption',
              label: 'Caption',
              value: caption,
              multiline: true,
              onSave: async (v) => { await patchPost({ content: v }, 'Caption updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={Hash}
          label="Edit Hashtags"
          onClick={() =>
            openForm({
              title: 'Hashtags',
              label: 'Hashtags',
              value: String(live?.hashtags || ''),
              onSave: async (v) => { await patchPost({ hashtags: v }, 'Hashtags updated'); setPanel('root'); },
            })
          }
        />
        <Row
          icon={MapPin}
          label="Add Location"
          onClick={() =>
            openForm({
              title: 'Location',
              label: 'Location',
              value: String(live?.location || ''),
              onSave: async (v) => { await patchPost({ location: v }, 'Location updated'); setPanel('root'); },
            })
          }
        />
      </Section>
      <Section title="Reel Controls">
        <Row
          icon={Repeat}
          label={remixOn ? 'Disable Remix' : 'Allow Remix'}
          onClick={() => void patchPost({ publish: { allowRemix: !remixOn } }, remixOn ? 'Remix disabled' : 'Remix allowed')}
          trailing={null}
        />
        <Row
          icon={Download}
          label={allowDownload ? 'Disable Downloads' : 'Allow Downloads'}
          onClick={() => void patchPost({ allowDownload: !allowDownload, publish: { allowDownloads: !allowDownload } }, 'Updated')}
          trailing={null}
        />
        <Row
          icon={Clapperboard}
          label={duetOn ? 'Disable Duet' : 'Allow Duet'}
          onClick={() => void patchPost({ publish: { allowDuets: !duetOn } }, duetOn ? 'Duets disabled' : 'Duets allowed')}
          trailing={null}
        />
      </Section>
    </>
  );

  const shareOwner = isOwn && kind === 'share' && (
    <Section title="Shared Post">
      <Row
        icon={Pencil}
        label="Edit Share Caption"
        onClick={() =>
          openForm({
            title: 'Share caption',
            label: 'Caption',
            value: caption,
            multiline: true,
            onSave: async (v) => { await patchPost({ content: v }, 'Caption updated'); close(); },
          })
        }
      />
      <Row icon={Trash2} label="Remove Shared Post" danger onClick={() => void deletePost()} trailing={null} />
      <Row icon={Globe} label="Change Audience" hint={privacyLabel(live?.privacy)} onClick={() => setPanel('privacy')} />
      <Row icon={Link2} label="Copy Link" onClick={copyLink} trailing={null} />
      {pinned ? (
        <Row icon={PinOff} label="Unpin From Profile" onClick={() => void patchPost({ pinned: false }, 'Unpinned')} trailing={null} />
      ) : (
        <Row icon={Pin} label="Pin To Profile" onClick={() => void patchPost({ pinned: true }, 'Pinned')} trailing={null} />
      )}
      <Row icon={Archive} label="Archive" onClick={() => void patchPost({ isArchived: true }, 'Archived')} trailing={null} />
    </Section>
  );

  const otherInteraction = !isOwn && (
    <Section title="Interaction">
      <Row icon={Bookmark} label="Save Post" onClick={() => void savePost()} trailing={null} />
      <Row icon={Link2} label="Copy Link" onClick={copyLink} trailing={null} />
      <Row icon={Share2} label="Share Post" onClick={() => { close(); setShareOpen(true); }} trailing={null} />
      <Row
        icon={Languages}
        label="Translate Post"
        onClick={() => askWev(`Translate this post caption to my preferred language:\n\n"${caption || '(no caption)'}"`)}
        trailing={null}
      />
      <Row
        icon={following ? UserMinus : UserPlus}
        label={
          isSpacePost
            ? following
              ? 'Unfollow WevSpace'
              : 'Follow WevSpace'
            : following
              ? 'Unfollow User'
              : kind === 'reel'
                ? 'Follow Creator'
                : 'Follow User'
        }
        onClick={() => void followUser()}
        trailing={null}
      />
    </Section>
  );

  const otherFeed = !isOwn && (
    <Section title="Feed Control">
      <Row icon={EyeOff} label="Hide Post" onClick={() => void hidePost()} />
      <Row icon={Ban} label="Not Interested" onClick={() => void notInterested()} />
      <Row icon={Tag} label="Show Less Like This" onClick={() => void showLessLikeThis()} />
      <Row icon={Sparkles} label="Show More Like This" onClick={showMoreLikeThis} trailing={null} />
    </Section>
  );

  // Mute, block, restrict and hide-creator all act on a person. A Space's post has
  // no person to act on, and the platform has no Space-level equivalents yet, so the
  // section is absent rather than present-and-inert. Post-level "Hide Post" and
  // "Not Interested" in Feed Control still cover the reader's real intent.
  const otherUserControl = !isOwn && !isSpacePost && (
    <Section title="User Control">
      <Row icon={BellOff} label="Mute User" onClick={() => void muteCreator()} />
      <Row icon={Clock} label="Snooze for 30 days" onClick={() => void snoozeCreator()} />
      <Row icon={UserX} label="Block User" danger onClick={() => void blockUser()} />
      <Row icon={Shield} label={ctx?.restricted ? 'Unrestrict User' : 'Restrict User'} onClick={() => void restrictUser()} />
      <Row icon={EyeOff} label="Hide content from this creator" danger onClick={hideCreator} />
    </Section>
  );

  const otherReport = !isOwn && (
    <Section title="Report">
      <Row icon={Flag} label="Report" danger onClick={() => setPanel('report')} />
    </Section>
  );

  const otherPhoto = !isOwn && hasPhoto && (
    <Section title="Photo">
      {allowDownload && <Row icon={Download} label="Download Photo" onClick={() => void downloadMedia(false)} trailing={null} />}
      <Row
        icon={Eye}
        label="View Full Resolution"
        onClick={() => {
          const url = firstMediaUrl(live);
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
          close();
        }}
        trailing={null}
      />
      <Row
        icon={Copy}
        label="Copy Image Link"
        onClick={() => {
          const url = firstMediaUrl(live);
          if (url) void copyText(url.startsWith('http') ? url : `${window.location.origin}${url}`, 'Image link copied');
        }}
        trailing={null}
      />
    </Section>
  );

  const otherVideo = !isOwn && (kind === 'video' || kind === 'reel') && (
    <Section title={kind === 'reel' ? 'Reel' : 'Video'}>
      <Row icon={Clock} label="Watch Later" onClick={() => void watchLater()} trailing={null} />
      {allowDownload && (
        <Row icon={Download} label={kind === 'reel' ? 'Download Reel' : 'Download Video'} onClick={() => void downloadMedia(false)} trailing={null} />
      )}
      <Row
        icon={Link2}
        label="Copy Video Link"
        onClick={() => {
          const url = firstMediaUrl(live);
          if (url) void copyText(url.startsWith('http') ? url : `${window.location.origin}${url}`, 'Video link copied');
        }}
        trailing={null}
      />
      {kind === 'reel' && remixOn && (
        <Row
          icon={Repeat}
          label="Remix Reel"
          onClick={() => {
            const reelId = live?.shareMeta?.originalReel?.id || postId;
            close();
            navigate(`/reels?remix=${encodeURIComponent(reelId)}`);
          }}
          trailing={null}
        />
      )}
      {kind === 'reel' && (
        <>
          <Row
            icon={Music2}
            label="Use Audio"
            onClick={() => {
              writeList('wev_use_audio', [...readList('wev_use_audio'), String(live?.musicId || postId)]);
              toast.success('Audio ready for your next reel');
              close();
            }}
            trailing={null}
          />
          <Row
            icon={Save}
            label="Save Audio"
            onClick={() => {
              writeList('wev_saved_audio', [...readList('wev_saved_audio'), String(live?.musicId || postId)]);
              toast.success('Audio saved');
              close();
            }}
            trailing={null}
          />
        </>
      )}
    </Section>
  );

  const existingContentExtras = (
    <Section title="Content">
      <Row
        icon={User}
        label={isSpacePost ? 'View WevSpace' : 'View Profile'}
        onClick={() => {
          if (!ownerPath) return;
          close();
          navigate(ownerPath);
        }}
      />
      <Row
        icon={ExternalLink}
        label="Open in New Tab"
        onClick={() => {
          window.open(postUrl, '_blank', 'noopener,noreferrer');
          close();
        }}
        trailing={null}
      />
    </Section>
  );

  const adminSection = isAdmin && (
    <Section title="Administrator">
      <Row icon={Trash2} label="Remove Post" danger onClick={() => void moderate('remove', 'Remove this post')} trailing={null} />
      <Row icon={EyeOff} label="Shadow Hide Post" danger onClick={() => void moderate('shadow_hide', 'Shadow-hide this post')} trailing={null} />
      <Row icon={EyeOff} label="Restrict Visibility" onClick={() => void moderate('restrict_visibility', 'Restrict visibility to followers')} trailing={null} />
      <Row icon={Image} label="Remove Media" danger onClick={() => void moderate('remove_media', 'Remove media from this post')} trailing={null} />
      <Row icon={Lock} label="Lock Comments" onClick={() => void moderate('lock_comments', 'Lock comments')} trailing={null} />
      <Row icon={Ban} label="Suspend User Posting" danger onClick={() => void moderate('suspend_posting', 'Suspend posting for this user')} trailing={null} />
      <Row icon={Megaphone} label="Warning System" onClick={() => void moderate('warn', 'Issue a warning to this user')} trailing={null} />
      <Row
        icon={Flag}
        label="Review Reports"
        onClick={() => {
          close();
          openAdminApp();
        }}
      />
      <Row
        icon={Gavel}
        label="Content Moderation Actions"
        onClick={() => setPanel('admin')}
      />
    </Section>
  );

  const followLabel = isSpacePost
    ? following ? 'Unfollow WevSpace' : 'Follow WevSpace'
    : following ? 'Unfollow User' : kind === 'reel' ? 'Follow Creator' : 'Follow User';
  const quickEdit = () => {
    if (kind === 'share') {
      openForm({ title: 'Share caption', label: 'Caption', value: caption, multiline: true, onSave: async (v) => { await patchPost({ content: v }, 'Caption updated'); close(); } });
    } else if (kind === 'reel') {
      openForm({ title: 'Edit Reel', label: 'Caption', value: caption, multiline: true, onSave: async (v) => { await patchPost({ content: v }, 'Reel updated'); close(); } });
    } else {
      openForm({ title: 'Edit Post', label: 'Caption', value: caption, multiline: true, guardUnsaved: true, onSave: async (v) => { await patchPost({ content: v }, 'Post updated'); close(); } });
    }
  };

  // Facebook-style short list; everything else lives under "More options".
  const quickBody = (
    <motion.div key="quick" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="py-1">
      {hasVideo && <Row icon={Gauge} label="Playback Speed" hint={`${playbackRate}x`} onClick={() => setPanel('speed')} />}
      {isOwn ? (
        <>
          <Row icon={Pencil} label={kind === 'share' ? 'Edit Share Caption' : kind === 'reel' ? 'Edit Reel' : 'Edit Post'} onClick={quickEdit} />
          {pinned ? (
            <Row icon={PinOff} label="Unpin From Profile" onClick={() => void patchPost({ pinned: false }, 'Unpinned')} trailing={null} />
          ) : (
            <Row icon={Pin} label="Pin To Profile" onClick={() => void patchPost({ pinned: true }, kind === 'reel' || kind === 'share' ? 'Pinned' : 'Pinned to profile')} trailing={null} />
          )}
          <Row
            icon={Globe}
            label="Change Audience"
            hint={privacyLabel(kind === 'share' ? live?.privacy : ctx?.settings?.privacy || live?.privacy)}
            onClick={() => (kind === 'share' ? setPanel('privacy') : setAudienceOpen(true))}
          />
          {kind !== 'share' && kind !== 'reel' && (
            <Row
              icon={commentsOff ? MessageCircle : MessageCircleOff}
              label={commentsOff ? 'Turn Comments On' : 'Turn Comments Off'}
              onClick={() => void (kind === 'video'
                ? patchPost({ commentsDisabled: !commentsOff, publish: { enableComments: commentsOff } }, 'Updated')
                : patchPost({ commentsDisabled: !commentsOff }, commentsOff ? 'Comments on' : 'Comments off'))}
              trailing={null}
            />
          )}
          <Row icon={Link2} label="Copy Link" onClick={copyLink} trailing={null} />
          <Row icon={Share2} label="Share Post" onClick={() => { close(); setShareOpen(true); }} trailing={null} />
          {kind !== 'share' && <Row icon={BarChart3} label="View Insights" onClick={() => void loadAnalytics()} />}
          {archived && kind !== 'share' ? (
            <Row icon={ArchiveRestore} label="Restore From Archive" onClick={() => void patchPost({ isArchived: false }, 'Post restored')} trailing={null} />
          ) : (
            <Row icon={Archive} label="Archive" onClick={() => void patchPost({ isArchived: true }, kind === 'share' ? 'Archived' : 'Post archived')} trailing={null} />
          )}
          <Row icon={Trash2} label={kind === 'share' ? 'Remove Shared Post' : kind === 'reel' ? 'Delete Reel' : 'Delete Post'} danger onClick={() => void deletePost()} trailing={null} />
        </>
      ) : (
        <>
          <Row icon={Bookmark} label="Save Post" onClick={() => void savePost()} trailing={null} />
          <Row icon={Link2} label="Copy Link" onClick={copyLink} trailing={null} />
          <Row icon={Share2} label="Share Post" onClick={() => { close(); setShareOpen(true); }} trailing={null} />
          <Row icon={following ? UserMinus : UserPlus} label={followLabel} onClick={() => void followUser()} trailing={null} />
          <Row icon={EyeOff} label="Hide Post" onClick={() => void hidePost()} />
          <Row icon={Ban} label="Not Interested" onClick={() => void notInterested()} />
          {!isSpacePost && <Row icon={BellOff} label="Mute User" onClick={() => void muteCreator()} />}
          {!isSpacePost && <Row icon={Clock} label="Snooze for 30 days" onClick={() => void snoozeCreator()} />}
          <Row icon={Flag} label="Report" danger onClick={() => setPanel('report')} />
        </>
      )}
      <div className="my-1 border-t border-border" />
      <Row icon={MoreHorizontal} label="More options" hint={isAdmin ? 'All settings, downloads & moderation' : 'All settings & tools'} onClick={() => setPanel('more')} />
    </motion.div>
  );

  const rootBody = (
    <motion.div key="more" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
      {playbackSection}
      {shareOwner}
      {ownerManagement}
      {photoOwner}
      {videoOwner}
      {reelOwner}
      {ownerPrivacy}
      {ownerViewSettings}
      {ownerAnalytics}
      {ownerSharing}
      {ownerAdvanced}
      {otherInteraction}
      {otherPhoto}
      {otherVideo}
      {otherFeed}
      {otherUserControl}
      {otherReport}
      {existingContentExtras}
      {adminSection}
      {wevSection}
    </motion.div>
  );

  const sheet = open && typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[240] bg-black/55 backdrop-blur-sm flex items-end justify-center sm:items-center"
              style={overlayZIndex ? { zIndex: overlayZIndex } : undefined}
              onClick={() => guardedExit('close')}
              role="dialog"
              aria-modal="true"
              aria-label="Post options"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[460px] sm:max-w-[420px] max-h-[min(80dvh,620px)] rounded-t-3xl sm:rounded-3xl bg-popover text-popover-foreground border border-border flex flex-col shadow-2xl mb-0 sm:mb-6"
              >
                <div className="relative px-4 pt-4 pb-2 border-b border-border shrink-0 flex items-center gap-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
                  {panel !== 'root' ? (
                    <button
                      type="button"
                      onClick={() => guardedExit('back')}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover"
                      aria-label="Back"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  ) : (
                    <span className="w-8" />
                  )}
                  <p className="flex-1 text-center text-foreground font-semibold text-sm">{title}</p>
                  <button
                    type="button"
                    onClick={() => guardedExit('close')}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="overflow-y-auto overscroll-contain min-h-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <AnimatePresence mode="wait">
                    {panel === 'root' && quickBody}
                    {panel === 'more' && rootBody}

                    {panel === 'speed' && (
                      <motion.div key="speed" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                        {SPEEDS.map((s) => (
                          <button key={s} type="button" onClick={() => applySpeed(s)} className="w-full flex items-center justify-between px-4 py-3.5 text-foreground hover:bg-surface-hover">
                            <span className="text-sm font-semibold">{s}Ã—</span>
                            {playbackRate === s ? <Check size={18} className="text-cyan-400" /> : null}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'quality' && (
                      <motion.div key="quality" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                        {QUALITIES.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => { setQuality(q); toast.success(`Quality: ${q}`); setPanel('root'); }}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-foreground hover:bg-surface-hover"
                          >
                            <span className="text-sm font-semibold">{q}</span>
                            {quality === q ? <Check size={18} className="text-cyan-400" /> : null}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'language' && (
                      <motion.div key="language" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => { setAudioLanguage(l.code); toast.success(`Language: ${l.label}`); setPanel('root'); }}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-foreground hover:bg-surface-hover"
                          >
                            <span className="text-sm font-semibold">{l.label}</span>
                            {audioLanguage === l.code ? <Check size={18} className="text-cyan-400" /> : null}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'captions' && (
                      <motion.div key="captions" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                        <button type="button" onClick={() => setCaptionsOn((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-foreground hover:bg-surface-hover">
                          <span className="text-sm font-semibold">{captionsOn ? 'Captions On' : 'Captions Off'}</span>
                          <span className={`w-11 h-6 rounded-full relative transition-colors ${captionsOn ? 'bg-cyan-500' : 'bg-muted-foreground/30'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${captionsOn ? 'left-5' : 'left-0.5'}`} />
                          </span>
                        </button>
                        {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => { setCaptionLanguage(l.code); setCaptionsOn(true); toast.success(`Captions: ${l.label}`); }}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-foreground hover:bg-surface-hover"
                          >
                            <span className="text-sm font-semibold">{l.label}</span>
                            {captionLanguage === l.code ? <Check size={18} className="text-cyan-400" /> : null}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'report' && (
                      <motion.div key="report" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                        {REPORT_REASONS.map((reason) => (
                          <button
                            key={reason.id}
                            type="button"
                            disabled={busy}
                            onClick={() => submitReport(reason.id)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-foreground hover:bg-surface-hover disabled:opacity-50"
                          >
                            <Flag size={16} className="text-destructive" />
                            <span className="text-sm font-semibold">{reason.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'privacy' && (
                      <motion.div key="privacy" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2 px-4">
                        <p className="text-sm text-muted-foreground mb-3">Use the audience selector for granular access.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAudienceOpen(true);
                            setPanel('root');
                          }}
                          className="w-full rounded-full bg-foreground text-background font-bold text-sm py-2.5"
                        >
                          Open audience selector
                        </button>
                      </motion.div>
                    )}

                    {panel === 'form' && form && (
                      <motion.div key="form" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="p-4 space-y-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{form.label}</label>
                        {form.multiline ? (
                          <textarea
                            value={formValue}
                            onChange={(e) => setFormValue(e.target.value)}
                            placeholder={form.placeholder}
                            rows={5}
                            className="w-full rounded-2xl bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-400/50"
                          />
                        ) : (
                          <input
                            value={formValue}
                            onChange={(e) => setFormValue(e.target.value)}
                            placeholder={form.placeholder}
                            className="w-full rounded-2xl bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-400/50"
                          />
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void form.onSave(formValue)}
                          className="w-full rounded-full bg-foreground text-background font-bold text-sm py-2.5 disabled:opacity-50"
                        >
                          {form.saveLabel || 'Save'}
                        </button>
                      </motion.div>
                    )}

                    {panel === 'analytics' && (
                      <motion.div key="analytics" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="p-4 grid grid-cols-2 gap-3">
                        {analytics ? (
                          [
                            ['Reach', analytics.reach],
                            ['Views', analytics.views],
                            ['Engagement', `${analytics.engagement}%`],
                            ['Reactions', analytics.reactionCount],
                            ['Shares', analytics.shares],
                            ['Comments', analytics.comments],
                            ['Saves', analytics.saves],
                            ['Watch time', analytics.watchTime],
                            ['Avg watch', analytics.averageWatchDuration],
                            ['Completion', `${analytics.completionRate}%`],
                            ['Rewatches', analytics.rewatchStatistics],
                            ['Profile visits', analytics.profileVisits],
                            ['Followers gained', analytics.followersGained],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-2xl bg-muted/50 border border-border p-3">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{label}</p>
                              <p className="text-lg font-bold text-foreground mt-1">{value ?? 0}</p>
                            </div>
                          ))
                        ) : (
                          <p className="col-span-2 text-sm text-muted-foreground px-2 py-6 text-center">Loading analyticsâ€¦</p>
                        )}
                      </motion.div>
                    )}

                    {panel === 'rearrange' && (
                      <motion.div key="rearrange" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="py-2">
                        {(ctx?.media || live?.postMedia || []).map((m: any, i: number, arr: any[]) => (
                          <div key={m.id || i} className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                            <img src={m.url} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted" />
                            <p className="flex-1 text-sm text-foreground truncate">Photo {i + 1}</p>
                            <button
                              type="button"
                              disabled={i === 0}
                              className="text-muted-foreground disabled:opacity-30 text-xs font-bold"
                              onClick={async () => {
                                const ids = arr.map((x: any) => x.id);
                                [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                                const res = await fetch(`/api/posts/${postId}/media/order`, {
                                  method: 'PUT',
                                  headers: headers(),
                                  body: JSON.stringify({ order: ids }),
                                });
                                const data = await res.json();
                                setCtx((c: any) => ({ ...(c || {}), media: data.media }));
                              }}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={i === arr.length - 1}
                              className="text-muted-foreground disabled:opacity-30 text-xs font-bold"
                              onClick={async () => {
                                const ids = arr.map((x: any) => x.id);
                                [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                                const res = await fetch(`/api/posts/${postId}/media/order`, {
                                  method: 'PUT',
                                  headers: headers(),
                                  body: JSON.stringify({ order: ids }),
                                });
                                const data = await res.json();
                                setCtx((c: any) => ({ ...(c || {}), media: data.media }));
                              }}
                            >
                              Down
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'albums' && (
                      <motion.div key="albums" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="py-2">
                        {albums.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No albums yet.</p>}
                        {albums.map((a: any) => (
                          <button
                            key={a.id}
                            type="button"
                            className="w-full text-left px-4 py-3.5 text-foreground hover:bg-surface-hover"
                            onClick={async () => {
                              await fetch(`/api/posts/${postId}/move-album`, {
                                method: 'POST',
                                headers: headers(),
                                body: JSON.stringify({ albumId: a.id }),
                              });
                              toast.success(`Moved to ${a.name}`);
                              setPanel('root');
                            }}
                          >
                            <p className="text-sm font-semibold">{a.name}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {panel === 'admin' && (
                      <motion.div key="admin" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="py-2">
                        <Row icon={AlertTriangle} label="Lock Comments" onClick={() => void moderate('lock_comments', 'Lock comments')} trailing={null} />
                        <Row icon={MessageCircle} label="Unlock Comments" onClick={() => void moderate('unlock_comments', 'Unlock comments')} trailing={null} />
                        <Row icon={Megaphone} label="Issue Warning" onClick={() => void moderate('warn', 'Issue a warning')} trailing={null} />
                        <Row icon={Gavel} label="Open admin console" onClick={() => { close(); openAdminApp(); }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        title="Post options"
        aria-label="Post options"
        aria-expanded={open}
        className={triggerClassName || 'p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors'}
      >
        <MoreHorizontal size={18} />
      </button>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void uploadFiles(e.target.files, true); e.target.value = ''; }} />
      <input ref={addPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadFiles(e.target.files, false); e.target.value = ''; }} />
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !token) return;
          const fd = new FormData();
          fd.append('thumbnail', file);
          setBusy(true);
          try {
            const res = await fetch(`/api/posts/${postId}/thumbnail`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            });
            if (!res.ok) throw new Error('thumb');
            toast.success('Thumbnail updated');
          } catch {
            toast.error('Could not update thumbnail');
          } finally {
            setBusy(false);
          }
        }}
      />
      {sheet}
      {shareOpen && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen
            onClose={() => setShareOpen(false)}
            url={`/posts/${postId}`}
            title="Share Post"
            targetType="post"
            targetId={postId}
            overlayZIndex={overlayZIndex ? overlayZIndex + 10 : undefined}
          />
        </Suspense>
      )}
      {musicPickerOpen && (
        <Suspense fallback={null}>
          <MusicPickerModal
            open={musicPickerOpen}
            onClose={() => setMusicPickerOpen(false)}
            value={currentMusicSelection()}
            onApply={(selection) => {
              void savePostMusic(selection);
            }}
          />
        </Suspense>
      )}
      {audienceOpen && (
        <Suspense fallback={null}>
          <AudienceSelectorModal
            open={audienceOpen}
            onClose={() => setAudienceOpen(false)}
            initialFlags={flagsFromPrivacy(
              ctx?.settings?.privacy || live?.privacy,
              !!(ctx?.settings?.includedUserIds?.length || ctx?.settings?.customViewers?.length),
              !!(ctx?.settings?.excludedUserIds?.length),
            )}
            initialCustomUsers={
              (ctx?.settings?.customViewers as AudienceUser[] | undefined) ||
              (ctx?.settings?.includedUserIds || []).map((id: string) => ({
                id,
                name: id.slice(0, 8),
                username: null,
                avatar: null,
              }))
            }
            initialHideFromUsers={(ctx?.settings?.excludedUserIds || []).map((id: string) => ({
              id,
              name: id.slice(0, 8),
              username: null,
              avatar: null,
            }))}
            onSave={({ flags, customUsers, hideFromUsers }) => {
              void patchPost(
                {
                  visibilityFlags: flags,
                  customUserIds: customUsers.map((u) => u.id),
                  excludedUserIds: hideFromUsers.map((u) => u.id),
                },
                'Audience updated',
              );
            }}
          />
        </Suspense>
      )}
      {trimFile && (
        <Suspense fallback={null}>
          <VideoEditorModal
            file={trimFile}
            onClose={() => setTrimFile(null)}
            onSave={(trimStart, trimEnd) => { toast('Please reupload to trim.', { icon: '??' }); setTrimFile(null); }}
          />
        </Suspense>
      )}
      <CreatePostUnsavedBar
        open={!!confirmExit}
        editing
        onContinue={() => setConfirmExit(null)}
        onDiscard={() => { const k = confirmExit; setConfirmExit(null); setFormValue(form?.value ?? ''); if (k) runExit(k); }}
      />
    </div>
  );
}
