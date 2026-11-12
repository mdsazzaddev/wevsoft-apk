import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AtSign,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Image as ImageIcon,
  MapPin,
  Music2,
  Paperclip,
  Pencil,
  PenLine,
  Plus,
  Send,
  Settings2,
  HelpCircle,
  ListVideo,
  Smile,
  Sparkles,
  Type,
  UploadCloud,
  X,
  Globe,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { audienceSummaryLabel, type AudienceUser, type VisibilityFlags } from '../../lib/postVisibility';
import AudienceSelectorModal from '../social/AudienceSelectorModal';
import MusicPickerModal, { type PostMusicSelection } from '../social/MusicPickerModal';
import GifPickerModal from '../social/GifPickerModal';
import CreatePostLivePreview from './CreatePostLivePreview';
import CreatePostUnsavedBar, { useBeforeUnloadGuard } from './CreatePostUnsavedBar';
import AiGenerateStudio from './AiGenerateStudio';
import { PollComposerEditor, emptyPollDraft } from '../polls/PollComposerEditor';
import type { PostEditPollState } from '@wevsoft/shared/post-edit-state';
import { useEnBn } from '../../lib/useEnBn';
import { FEELINGS } from './feelings';
import { useStore } from '../../store';
import LayoutTemplatePicker from '../social/LayoutTemplatePicker';
import PostMediaLayout from '../social/PostMediaLayout';
import { defaultLayoutForPhotoCount, type PostLayoutTemplate } from '@wevsoft/shared/post-media-layout';
import type { CommentAudience, CreatePostLayoutKind, PreviewDevice } from './types';

export type CreatePostStudioProps = {
  open: boolean;
  onClose: () => void;
  onDiscardAndClose: () => void;
  /** Close but keep the autosaved draft (photos, caption, audience…) so it can be resumed later. */
  /** Parent's view of unsaved work (poll, feeling, media...). Falls back to the studio's own check. */
  isDirty?: boolean;
  authorName: string;
  authorAvatar?: string | null;
  authorInitial: string;
  content: string;
  onChangeContent: (v: string) => void;
  previewUrls: string[];
  onAddFiles: (files: File[]) => void;
  onRemoveMedia?: (index: number) => void;
  onEditMedia?: (index: number) => void;
  /** Per-media kind (so video thumbnails render as video). */
  mediaKinds?: Array<'image' | 'video'>;
  /** Per-media CSS filter from Media Studio (live preview of saved video edits). */
  mediaFilters?: Array<string | undefined>;
  onClearMedia?: () => void;
  location: string;
  onLocationChange: (v: string) => void;
  musicSelection: PostMusicSelection | null;
  onMusicSelectionChange: (v: PostMusicSelection | null) => void;
  gifUrl: string | null;
  onGifUrlChange: (v: string | null) => void;
  /** Post poll (null = no poll). Sent as pollData on publish. */
  poll?: PostEditPollState | null;
  onPollChange?: (v: PostEditPollState | null) => void;
  visibilityFlags: VisibilityFlags;
  customUsers: AudienceUser[];
  hideFromUsers: AudienceUser[];
  onAudienceChange: (payload: {
    flags: VisibilityFlags;
    customUsers: AudienceUser[];
    hideFromUsers: AudienceUser[];
  }) => void;
  layoutKind: CreatePostLayoutKind;
  onLayoutKindChange: (k: CreatePostLayoutKind) => void;
  /** Collage template used when Grid is chosen (2+ photos). */
  layoutTemplate?: PostLayoutTemplate | null;
  onLayoutTemplateChange?: (template: PostLayoutTemplate) => void;
  commentsAudience: CommentAudience;
  onCommentsAudienceChange: (v: CommentAudience) => void;
  onPublish: () => void | Promise<void>;
  /** Opens the full publish settings step (schedule, comments, hashtags, creator / cross-post settings). */
  onOpenSettings?: () => void;
  /** Opens the saved drafts list; `draftCount` shows a badge. */
  onOpenDrafts?: () => void;
  draftCount?: number;
  feeling?: string | null;
  onFeelingChange?: (v: string | null) => void;
  isQuestion?: boolean;
  onIsQuestionChange?: (v: boolean) => void;
  /** Creator playlist the new post is added to after publish (null = none). */
  playlistId?: string | null;
  onPlaylistChange?: (id: string | null, name?: string) => void;
  playlistName?: string | null;
  publishing?: boolean;
  /** Early media upload still in flight — Post should wait, but not show submit spinner. */
  mediaUploading?: boolean;
  onApplyAIContent: (content: string) => void;
  onApplyAIHashtags?: (tags: string[]) => void;
  /** Rendered above the main text box (saved templates / hashtag sets). */
  editorAccessory?: ReactNode;
  /** Start with AI panel open. */
  initialAiOpen?: boolean;
  /** Optional page mode (no portal backdrop). */
  mode?: 'overlay' | 'page';
  hasVideo?: boolean;
};

function MediaChip({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-card px-1.5 py-2.5 text-[11px] font-semibold text-foreground dark:border-white/10 dark:bg-white/5 transition-colors hover:bg-muted/50 sm:px-2"
    >
      <span className={tone}>{icon}</span>
      {label}
    </button>
  );
}

export default function CreatePostStudio({
  open,
  onClose,
  onDiscardAndClose,
  isDirty,
  authorName,
  authorAvatar,
  authorInitial,
  content,
  onChangeContent,
  previewUrls,
  onAddFiles,
  onRemoveMedia,
  onEditMedia,
  mediaKinds,
  mediaFilters,
  location,
  onLocationChange,
  musicSelection,
  onMusicSelectionChange,
  gifUrl,
  onGifUrlChange,
  poll = null,
  onPollChange,
  visibilityFlags,
  customUsers,
  hideFromUsers,
  onAudienceChange,
  layoutKind,
  onLayoutKindChange,
  layoutTemplate = null,
  onLayoutTemplateChange,
  commentsAudience,
  onCommentsAudienceChange,
  onPublish,
  onOpenSettings,
  onOpenDrafts,
  draftCount = 0,
  feeling = null,
  onFeelingChange,
  isQuestion = false,
  onIsQuestionChange,
  playlistId = null,
  onPlaylistChange,
  playlistName = null,
  publishing,
  mediaUploading = false,
  onApplyAIContent,
  onApplyAIHashtags,
  editorAccessory,
  initialAiOpen,
  mode = 'overlay',
  hasVideo,
}: CreatePostStudioProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const { t: tt } = useEnBn();
  const [showFeeling, setShowFeeling] = useState(false);
  const token = useStore((s) => s.token);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }> | null>(null);
  const [newPlaylist, setNewPlaylist] = useState('');
  const plHeaders = (): Record<string, string> => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  const openPlaylists = async () => {
    const next = !showPlaylists;
    setShowPlaylists(next);
    if (!next || playlists) return;
    try {
      const r = await fetch('/api/v1/jobs-creator/creator/playlists', { headers: plHeaders() });
      const d = await r.json().catch(() => ({}));
      setPlaylists(Array.isArray(d?.playlists) ? d.playlists.map((p: any) => ({ id: String(p.id), name: String(p.name || p.title || 'Playlist') })) : []);
    } catch {
      setPlaylists([]);
    }
  };
  const createPlaylist = async () => {
    const name = newPlaylist.trim();
    if (!name || !onPlaylistChange) return;
    const r = await fetch('/api/v1/jobs-creator/creator/playlists', { method: 'POST', headers: plHeaders(), body: JSON.stringify({ name }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d?.playlist?.id) {
      const p = { id: String(d.playlist.id), name: String(d.playlist.name || name) };
      setPlaylists((prev) => [p, ...(prev || [])]);
      setNewPlaylist('');
      onPlaylistChange(p.id, p.name);
      setShowPlaylists(false);
    }
  };
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [showAi, setShowAi] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
  // While the discard dialog is up the history entry is released; Continue re-pushes it so Back keeps working.
  useOverlayBack(open && mode === 'overlay' && !confirmLeave, () => requestClose());

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setConfirmLeave(false);
      setShowAi(false);
      setMobileTab('edit');
      return;
    }
    if (initialAiOpen) setShowAi(true);
    // Phone-width composers default Live Preview to the mobile frame.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setDevice('mobile');
    }
  }, [open, initialAiOpen]);

  useEffect(() => {
    if (!open || mode !== 'overlay') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (showAi) setShowAi(false);
        else requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, showAi, content, previewUrls.length, location, musicSelection, gifUrl, isDirty, confirmLeave]);

  const dirty = useMemo(() => {
    if (typeof isDirty === 'boolean') return isDirty;
    return (
      !!content.trim() ||
      previewUrls.length > 0 ||
      !!location.trim() ||
      !!musicSelection ||
      !!gifUrl ||
      !!poll
    );
  }, [isDirty, content, previewUrls.length, location, musicSelection, gifUrl, poll]);

  useBeforeUnloadGuard(open && dirty);

  const audienceLabel = audienceSummaryLabel(
    visibilityFlags,
    customUsers.length,
    hideFromUsers.length,
  );

  const firstName = authorName.split(' ')[0] || authorName;

  const requestClose = () => {
    if (confirmLeave) return;
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    onClose();
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChangeContent(content + snippet);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + snippet + content.slice(end);
    onChangeContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length) onAddFiles(list);
  };

  const allPreviewUrls = useMemo(() => {
    const urls = [...previewUrls];
    if (gifUrl && !urls.includes(gifUrl)) urls.unshift(gifUrl);
    return urls;
  }, [previewUrls, gifUrl]);

  const photoUrls = useMemo(
    () => previewUrls.filter((_, i) => mediaKinds?.[i] !== 'video'),
    [previewUrls, mediaKinds],
  );

  const hasPublishableContent =
    !!content.trim() || allPreviewUrls.length > 0 || !!musicSelection || !!poll;

  const tryPublish = () => {
    if (publishing) return;
    if (!hasPublishableContent) {
      toast.error(tt('Add a caption or media to post.', 'পোস্ট করতে লেখা বা মিডিয়া যোগ করুন।'));
      return;
    }
    // Early upload is an optimization — publish still sends local files via multipart.
    if (mediaUploading) {
      toast(tt('Finishing media upload, then posting…', 'মিডিয়া আপলোড শেষ করে পোস্ট করা হচ্ছে…'));
    }
    void onPublish();
  };
  const canAddMore = previewUrls.length + (gifUrl ? 1 : 0) < 10;
  const canPickGrid = photoUrls.length >= 2;

  if (!open) return null;

  const leftPanel = (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
          <PenLine size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-bold tracking-tight text-foreground">Create Post</h1>
        </div>
        {onOpenDrafts ? (
          <button
            type="button"
            onClick={onOpenDrafts}
            data-testid="create-post-drafts"
            className="flex shrink-0 items-center gap-1.5 self-center rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FileText size={14} />
            {tt('Drafts', 'ড্রাফট')}
            {draftCount > 0 ? <span className="rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">{draftCount}</span> : null}
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full bg-muted ring-2 ring-border/50">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                {authorInitial}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{authorName}</p>
            <button
              type="button"
              onClick={() => setShowAudience(true)}
              data-testid="create-post-audience"
              aria-label={`Audience: ${audienceLabel}. Change who can see this post`}
              title="Change who can see this post"
              className="mt-1 inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-border bg-muted/60 px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Globe size={11} className="shrink-0" aria-hidden />
              <span className="truncate">{audienceLabel}</span>
              <ChevronDown size={11} className="shrink-0 opacity-70" aria-hidden />
            </button>
          </div>
        </div>

        {editorAccessory}
        <div className="relative rounded-2xl border border-border bg-muted/30 focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/10">
          <button
            type="button"
            onClick={() => setShowAi(true)}
            title="Generate with AI"
            className="absolute right-2 top-2 z-[1] inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-bold text-violet-600 transition-colors hover:border-violet-500/50 hover:bg-violet-500/15 dark:text-violet-300"
          >
            <Sparkles size={12} />
            Generate
          </button>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            placeholder={`What's on your mind, ${firstName}?`}
            rows={5}
            className="min-h-[120px] w-full resize-none bg-transparent px-3.5 pb-1 pl-3.5 pr-[6.5rem] pt-3.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-foreground"
                title="Emoji"
                onClick={() => insertAtCursor('😊')}
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-foreground"
                title="Mention"
                onClick={() => insertAtCursor('@')}
              >
                <AtSign size={18} />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-foreground"
                title="Hashtag"
                onClick={() => insertAtCursor('#')}
              >
                <Hash size={18} />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-foreground"
                title="Location"
                onClick={() => setShowLocation((v) => !v)}
              >
                <MapPin size={18} />
              </button>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-foreground"
              title="Text style"
              onClick={() => {
                const el = textareaRef.current;
                if (!el) return;
                el.style.fontWeight = el.style.fontWeight === '700' ? '400' : '700';
              }}
            >
              <Type size={18} />
            </button>
          </div>
        </div>

        {showLocation ? (
          <div className="mt-2">
            <input
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Add a location…"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>
        ) : null}

        {location && !showLocation ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPin size={12} /> {location}
            <button type="button" className="ml-1 underline" onClick={() => onLocationChange('')}>
              Remove
            </button>
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <MediaChip
            icon={<ImageIcon size={18} />}
            label={tt('Photo/Video', 'ফটো/ভিডিও')}
            tone="text-emerald-500"
            onClick={() => fileRef.current?.click()}
          />
          <MediaChip
            icon={<FileText size={16} className="font-black" />}
            label="GIF"
            tone="text-amber-500"
            onClick={() => setShowGif(true)}
          />
          <MediaChip
            icon={<Paperclip size={18} />}
            label="File"
            tone="text-sky-500"
            onClick={() => docRef.current?.click()}
          />
          <MediaChip
            icon={<Music2 size={18} />}
            label="Music"
            tone="text-violet-500"
            onClick={() => setShowMusic(true)}
          />
          {onPollChange ? (
            <MediaChip
              icon={<BarChart3 size={18} />}
              label={tt('Poll', 'পোল')}
              tone="text-orange-500"
              onClick={() => onPollChange(poll ? null : emptyPollDraft())}
            />
          ) : null}
          {onFeelingChange ? (
            <MediaChip
              icon={<Smile size={18} />}
              label={feeling || tt('Feeling', 'অনুভূতি')}
              tone="text-amber-500"
              onClick={() => setShowFeeling((v) => !v)}
            />
          ) : null}
          {onPlaylistChange ? (
            <MediaChip
              icon={<ListVideo size={18} />}
              label={playlistId ? playlistName || tt('Playlist ✓', 'প্লেলিস্ট ✓') : tt('Playlist', 'প্লেলিস্ট')}
              tone="text-rose-500"
              onClick={() => void openPlaylists()}
            />
          ) : null}
          {onIsQuestionChange ? (
            <MediaChip
              icon={<HelpCircle size={18} />}
              label={isQuestion ? tt('Question ✓', 'প্রশ্ন ✓') : tt('Question', 'প্রশ্ন')}
              tone="text-teal-500"
              onClick={() => onIsQuestionChange(!isQuestion)}
            />
          ) : null}
        </div>

        {poll && onPollChange ? (
          <div className="mt-3" data-testid="create-post-poll">
            <PollComposerEditor
              poll={poll}
              onChange={onPollChange}
              questionHint={tt('Leave empty to use your post text', 'খালি রাখলে পোস্টের লেখাই প্রশ্ন হবে')}
            />
          </div>
        ) : null}

        {showPlaylists && onPlaylistChange ? (
          <div className="mt-3 space-y-1.5 rounded-xl border border-border p-2" data-testid="create-post-playlists">
            {playlists === null ? <p className="text-xs text-muted-foreground">…</p> : null}
            {(playlists || []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPlaylistChange(playlistId === p.id ? null : p.id, p.name);
                  setShowPlaylists(false);
                }}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs ${playlistId === p.id ? 'bg-primary/15 font-bold' : 'hover:bg-muted'}`}
              >
                {p.name}
              </button>
            ))}
            <div className="flex gap-1.5">
              <input
                value={newPlaylist}
                onChange={(e) => setNewPlaylist(e.target.value)}
                placeholder={tt('New playlist name', 'নতুন প্লেলিস্টের নাম')}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button type="button" onClick={() => void createPlaylist()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                {tt('Create', 'তৈরি')}
              </button>
            </div>
          </div>
        ) : null}

        {showFeeling && onFeelingChange ? (
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border p-2 sm:grid-cols-4" data-testid="create-post-feelings">
            {FEELINGS.map((f) => {
              const v = `${f.emoji} ${f.label}`;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    onFeelingChange(feeling === v ? null : v);
                    setShowFeeling(false);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-left text-xs ${feeling === v ? 'bg-primary/15 font-bold' : 'hover:bg-muted'}`}
                >
                  {v}
                </button>
              );
            })}
            {feeling ? (
              <button
                type="button"
                onClick={() => {
                  onFeelingChange(null);
                  setShowFeeling(false);
                }}
                className="rounded-lg px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10"
              >
                {tt('Clear', 'মুছুন')}
              </button>
            ) : null}
          </div>
        ) : null}

        {gifUrl || previewUrls.length > 0 ? (
          <div
            className={`mt-3 space-y-2 rounded-xl transition-colors ${
              dragOver ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-card' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            data-testid="create-post-media-inline-preview"
          >
            {/* Feed-sized preview on Create (matches Live Preview / mobile post card). */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {gifUrl && previewUrls.length === 0 ? (
                <div className="relative aspect-video bg-muted">
                  <img src={gifUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : !hasVideo && photoUrls.length >= 2 ? (
                <div className="bg-muted/30">
                  <PostMediaLayout
                    media={previewUrls.map((url, i) => ({
                      id: `compose-${i}`,
                      url,
                      type: mediaKinds?.[i] === 'video' ? 'video' : 'image',
                      order: i,
                    }))}
                    template={layoutTemplate || defaultLayoutForPhotoCount(photoUrls.length) || undefined}
                    autoplayEnabled={false}
                  />
                </div>
              ) : previewUrls[0] ? (
                <div
                  className={`relative overflow-hidden bg-muted ${
                    layoutKind === 'photo' || (!hasVideo && photoUrls.length === 1) ? 'aspect-[4/5]' : 'aspect-video'
                  }`}
                >
                  {mediaKinds?.[0] === 'video' || hasVideo ? (
                    <video
                      src={previewUrls[0]}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      style={{ filter: mediaFilters?.[0] }}
                    />
                  ) : (
                    <img
                      src={previewUrls[0]}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ filter: mediaFilters?.[0] }}
                    />
                  )}
                  {mediaKinds?.[0] === 'video' || hasVideo ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground shadow">
                        ▶
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {gifUrl ? (
                <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <img src={gifUrl} alt="" className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors md:group-hover:bg-black/35" />
                  <button
                    type="button"
                    onClick={() => onGifUrlChange(null)}
                    className="absolute right-0.5 top-0.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition-opacity hover:bg-black/85 md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Remove GIF"
                    title="Remove"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ) : null}
              {previewUrls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
                >
                  {mediaKinds?.[i] === 'video' ? (
                    <video src={url} muted preload="metadata" className="h-full w-full object-cover" style={{ filter: mediaFilters?.[i] }} />
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" style={{ filter: mediaFilters?.[i] }} />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors md:group-hover:bg-black/35" />
                  {onEditMedia ? (
                    <button
                      type="button"
                      onClick={() => onEditMedia(i)}
                      className="absolute left-0.5 top-0.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition-opacity hover:bg-black/85 md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Edit media"
                      title="Edit"
                    >
                      <Pencil size={11} strokeWidth={2.5} />
                    </button>
                  ) : null}
                  {onRemoveMedia ? (
                    <button
                      type="button"
                      onClick={() => onRemoveMedia(i)}
                      className="absolute right-0.5 top-0.5 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition-opacity hover:bg-black/85 md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Remove media"
                      title="Remove"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
              ))}
              {canAddMore ? (
                <button
                  type="button"
                  onClick={() => addMoreRef.current?.click()}
                  aria-label="Add photo or video"
                  title="Add"
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-[9px] font-bold leading-none text-primary transition-colors hover:border-primary/70 hover:bg-primary/10"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Add
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-dashed px-3 py-3 text-left transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
            }`}
          >
            <UploadCloud size={18} className="shrink-0 opacity-80" />
            <span className="min-w-0 text-xs">
              <span className="font-semibold text-foreground">Drag & drop</span>
              <span className="text-muted-foreground"> or click to browse</span>
            </span>
          </button>
        )}

        {canPickGrid && onLayoutTemplateChange ? (
          <LayoutTemplatePicker
            compact
            className="mt-2"
            photoCount={photoUrls.length}
            value={layoutTemplate}
            previewUrls={photoUrls}
            onChange={(template) => {
              onLayoutTemplateChange(template);
              if (layoutKind !== 'gallery') onLayoutKindChange('gallery');
            }}
          />
        ) : null}

        {musicSelection ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-violet-500/5 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">
              ♪ {musicSelection.title || 'Music'} {musicSelection.artist ? `· ${musicSelection.artist}` : ''}
            </span>
            <button
              type="button"
              className="font-bold text-muted-foreground hover:text-foreground"
              onClick={() => onMusicSelectionChange(null)}
            >
              Remove
            </button>
          </div>
        ) : null}

      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="create-post-settings"
            className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Settings2 size={15} /> {tt('Schedule & more', 'শিডিউল ও আরও')}
          </button>
        ) : (
          <span aria-hidden className="min-w-0" />
        )}
        {/* Mobile: Next → Preview. Desktop: Post here (preview sits beside). */}
        <button
          type="button"
          data-testid="create-post-next"
          onClick={() => setMobileTab('preview')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 md:hidden"
        >
          {tt('Next', 'পরবর্তী')}
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          data-testid="create-post-publish"
          disabled={!hasPublishableContent}
          onClick={tryPublish}
          className="hidden items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100 md:inline-flex"
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Post
        </button>
      </footer>

      <AnimatePresence>
        {showAi ? (
          <AiGenerateStudio
            open
            embedded
            currentContent={content}
            onApplyContent={onApplyAIContent}
            onApplyHashtags={onApplyAIHashtags}
            onClose={() => setShowAi(false)}
          />
        ) : null}
      </AnimatePresence>

      <input
        ref={addMoreRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          e.target.value = '';
          if (list.length) onAddFiles(list);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          e.target.value = '';
          if (list.length) onAddFiles(list);
        }}
      />
      <input
        ref={docRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          e.target.value = '';
          if (list.length) onAddFiles(list);
        }}
      />
    </div>
  );

  const rightPanel = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border/60 bg-background/80 dark:bg-background/40">
      <div className="min-h-0 flex-1 overflow-hidden">
        <CreatePostLivePreview
          device={device}
          onDeviceChange={setDevice}
          authorName={authorName}
          authorAvatar={authorAvatar}
          authorInitial={authorInitial}
          caption={content}
          previewUrls={previewUrls}
          audienceLabel={audienceLabel}
          mediaFilters={mediaFilters}
          mediaKinds={mediaKinds}
          layoutKind={layoutKind}
          onLayoutKindChange={onLayoutKindChange}
          layoutTemplate={layoutTemplate}
          commentsAudience={commentsAudience}
          onCommentsAudienceChange={onCommentsAudienceChange}
          onOpenAudience={() => setShowAudience(true)}
          hasVideo={hasVideo}
        />
      </div>
      {/* Mobile Preview: Back + Post (Create tab hides the publish footer). */}
      <footer
        className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur md:hidden"
        data-testid="create-post-preview-footer"
      >
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className="inline-flex min-w-0 items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
          {tt('Back', 'পেছনে')}
        </button>
        <button
          type="button"
          data-testid="create-post-preview-publish"
          disabled={!hasPublishableContent}
          onClick={tryPublish}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100"
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Post
        </button>
      </footer>
    </div>
  );

  const shell = (
    <div
      className={
        mode === 'page'
          ? 'flex h-full min-h-0 w-full flex-col'
          : 'relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden bg-card'
      }
      role="dialog"
      aria-modal={mode === 'overlay' ? true : undefined}
      aria-label="Create Post"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile edit/preview tabs */}
      <div className="flex shrink-0 border-b border-border md:hidden">
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-bold capitalize ${
              mobileTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'edit' ? 'Create' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className={`min-h-0 min-w-0 flex-[1.05] ${mobileTab === 'edit' ? 'flex' : 'hidden'} md:flex`}>
          {leftPanel}
        </div>
        <div className={`min-h-0 min-w-0 flex-1 ${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex`}>
          {rightPanel}
        </div>
      </div>
    </div>
  );

  const modals = (
    <>
      <AudienceSelectorModal
        open={showAudience}
        onClose={() => setShowAudience(false)}
        initialFlags={visibilityFlags}
        initialCustomUsers={customUsers}
        initialHideFromUsers={hideFromUsers}
        onSave={onAudienceChange}
      />
      <MusicPickerModal
        open={showMusic}
        onClose={() => setShowMusic(false)}
        value={musicSelection}
        onApply={(v) => {
          onMusicSelectionChange(v);
          setShowMusic(false);
        }}
      />
      <GifPickerModal
        open={showGif}
        onClose={() => setShowGif(false)}
        onSelect={(gif) => {
          onGifUrlChange(gif.url);
          setShowGif(false);
        }}
      />
      <CreatePostUnsavedBar
        open={confirmLeave}
        onContinue={() => setConfirmLeave(false)}
        onDiscard={() => {
          setConfirmLeave(false);
          onDiscardAndClose();
        }}
      />
    </>
  );

  if (mode === 'page') {
    return (
      <>
        {shell}
        {modals}
      </>
    );
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-[1] flex h-full min-h-0 w-full"
      >
        {shell}
      </motion.div>
      {modals}
    </motion.div>,
    document.body,
  );
}