import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { resolveAvatarUrl } from '../UserAvatar';
import { X, Wand2, Sparkles, Image as ImageIcon, Radio, Clapperboard, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import type { MediaStudioVideoSave } from '../create-post/MediaStudio';
import { editCss as studioEditCss, fileKey as studioFileKey, isVideoFile as studioIsVideo, type MediaEdit } from '../create-post/mediaStudioModel';
import { useTranslation } from 'react-i18next';
import { uploadWithProgress } from '../UploadProgressToast';
import { pollDraftError, pollDraftPayload } from '../polls/PollComposerEditor';
import { usePollT } from '../polls/pollText';

const ImageEditorModal = lazy(() => import('../profile/ImageEditorModal'));
const VideoEditorModal = lazy(() => import('../profile/VideoEditorModal'));
const MediaStudio = lazy(() => import('../create-post/MediaStudio'));
const CreatePostStudio = lazy(() => import('../create-post/CreatePostStudio'));
const PostSettings = lazy(() => import('./PostSettings').then((m) => ({ default: m.PostSettings })));
const CrossPostProgressModal = lazy(() =>
  import('./CrossPostProgressModal').then((m) => ({ default: m.CrossPostProgressModal })),
);
import {
  appendPublishSettings,
  DEFAULT_PUBLISH_SETTINGS,
  type CreatorPublishSettings,
} from '../../lib/creatorPublish';
import { fetchPostDefaults } from '../../lib/postDefaults';
import { ComposerQuickInsert } from '../settings/PostContentPanels';
import {
  DEFAULT_VISIBILITY_FLAGS,
  flagsFromPrivacy,
  privacyFromFlags,
  type AudienceUser,
  type VisibilityFlags,
} from '../../lib/postVisibility';
import {
  adjustLayoutForCount,
  defaultLayoutForPhotoCount,
  type PostLayoutTemplate,
} from '@wevsoft/shared/post-media-layout';
import {
  type PostEditMediaRef,
  type PostEditPollState,
} from '@wevsoft/shared/post-edit-state';
import type { PostMusicSelection } from './MusicPickerModal';
import type { LinkPreviewData } from './LinkPreviewCard';
import { uploadEditorMediaEarly } from '../../lib/editorMediaUpload';
import { useEnBn } from '../../lib/useEnBn';
import { PostDraftsSheet, draftEditState, type ServerPostDraft } from './PostDraftsSheet';
import { acquirePostMusicSuspend } from '../../lib/postMusicPlayback';
import { pauseExclusivePlayback } from '../../lib/exclusiveMediaPlayback';
import { stopReelPreview } from '../../lib/reelPreviewPlayback';
import type { CrossPostJobState } from './CrossPostProgressModal';
import { getOverlays } from '../../lib/overlayStack';
import type { CommentAudience, CreatePostLayoutKind } from '../create-post/types';

interface PostComposerProps {
  onPostCreated: () => void;
  /** Auto-open Create Post studio (e.g. /create-post route). */
  autoOpen?: boolean;
  autoOpenAi?: boolean;
  /** When set, the post is authored by this WevSpace (team post). */
  spaceId?: string;
  spaceName?: string;
  spaceAvatar?: string | null;
}

/** Map the account "post privacy" setting to a post privacy value. Fallback: public. */
function defaultPostPrivacy(setting: unknown): string {
  const v = String(setting || '').toLowerCase();
  if (v.startsWith('friend')) return 'friends';
  if (v.startsWith('follower')) return 'followers';
  if (v.startsWith('close')) return 'close_friends';
  if (v === 'only me' || v === 'only_me' || v === 'private') return 'private';
  return 'public';
}

/**
 * Closing the Create Post overlay pops its history entry asynchronously
 * (useOverlayBack). Run post-publish navigation only after that pop lands,
 * otherwise the pop undoes the redirect to the feed.
 */
function runAfterOverlayClose(fn: () => void) {
  const started = Date.now();
  const tick = () => {
    const st = (window.history.state as any)?.usr;
    if (getOverlays(st).length === 0 || Date.now() - started > 1200) fn();
    else window.setTimeout(tick, 30);
  };
  window.setTimeout(tick, 30);
}

function newClientDraftId() {  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PostComposer({ onPostCreated, spaceId, spaceName, spaceAvatar, autoOpen, autoOpenAi }: PostComposerProps) {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const setSidebarCompact = useStore((state) => state.setSidebarCompact);
  const { t } = useTranslation();
  const { t: pollT } = usePollT();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'editor' | 'settings'>('editor');
  const [clientDraftId, setClientDraftId] = useState(newClientDraftId);

  const displayName = spaceName || user?.name?.split(' ')[0] || 'User';
  const displayAvatar = resolveAvatarUrl(spaceAvatar || user?.avatar);
  const displayInitial = (spaceName || user?.name || 'U').charAt(0).toUpperCase();

  // Keep Home feed soundtrack/videos silent while the composer overlay covers it.
  useEffect(() => {
    if (!isOpen) return;
    const release = acquirePostMusicSuspend();
    pauseExclusivePlayback();
    stopReelPreview();
    return release;
  }, [isOpen]);


  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  /** Early-uploaded public URLs aligned with `files` (null while uploading). */
  const [mediaRefs, setMediaRefs] = useState<Array<PostEditMediaRef | null>>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visibilityFlags, setVisibilityFlags] = useState<VisibilityFlags>(() => flagsFromPrivacy('public'));
  const [customUsers, setCustomUsers] = useState<AudienceUser[]>([]);
  const [hideFromUsers, setHideFromUsers] = useState<AudienceUser[]>([]);
  const [privacy, setPrivacy] = useState<string>('public');
  /** Saved account default audience (Space posts are always public). */
  const defaultPrivacyRef = useRef<string>('public');
  const applyDefaultAudience = useCallback((p: string) => {
    setVisibilityFlags(flagsFromPrivacy(p));
    setCustomUsers([]);
    setHideFromUsers([]);
    setPrivacy(p);
  }, []);
  const [location, setLocation] = useState('');
  const [altText, setAltText] = useState('');
  const [feeling, setFeeling] = useState<string | null>(null);
  const [poll, setPoll] = useState<PostEditPollState | null>(null);
  const [playlist, setPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [isQuestion, setIsQuestion] = useState(false);
  const [template, setTemplate] = useState<PostLayoutTemplate | null>(null);
  const [cropDataList, setCropDataList] = useState<
    Array<import('@wevsoft/shared/post-media-layout').MediaCropRect | null>
  >([]);
  const [musicSelection, setMusicSelection] = useState<PostMusicSelection | null>(null);
  const [layoutKind, setLayoutKind] = useState<CreatePostLayoutKind>('standard');
  const [commentsAudience, setCommentsAudience] = useState<CommentAudience>('everyone');
  const [openWithAi, setOpenWithAi] = useState(false);

  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [editorVideoFile, setEditorVideoFile] = useState<File | null>(null);
  const [editorVideoIndex, setEditorVideoIndex] = useState<number | null>(null);
  /** Media Studio (photo + video editor) for the post's uploaded media. */
  const [studioIndex, setStudioIndex] = useState<number | null>(null);
  const [studioEdits, setStudioEdits] = useState<Record<string, MediaEdit>>({});
  const pendingVideoMetaRef = useRef<Record<string, MediaStudioVideoSave>>({});

  const [showAIPanel, setShowAIPanel] = useState(false);
  const [crossPostJobs, setCrossPostJobs] = useState<CrossPostJobState[]>([]);
  const [showCrossPostModal, setShowCrossPostModal] = useState(false);
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [remotePreviewUrls, setRemotePreviewUrls] = useState<string[]>([]);
  const [publishFailed, setPublishFailed] = useState(false);
  /** In-flight early uploads (presigned/token). Failures clear this so Post is not stuck forever. */
  const [earlyUploadInFlight, setEarlyUploadInFlight] = useState(0);
  const resumedRef = useRef(false);
  const resumedDraftRef = useRef(false);
  /** Mirrors of state used by async callbacks (uploads / restore) that outlive a render. */
  const filesRef = useRef<File[]>([]);
  const mediaRefsRef = useRef<Array<PostEditMediaRef | null>>([]);
  const clientDraftIdRef = useRef(clientDraftId);
  const fileKeysRef = useRef(new WeakMap<File, string>());
  const pendingTimerRef = useRef<number | null>(null);
  const restoreSeqRef = useRef(0);
  const restorePromiseRef = useRef<Promise<void> | null>(null);
  const restoredTemplateRef = useRef<string | null | undefined>(undefined);
  filesRef.current = files;
  mediaRefsRef.current = mediaRefs;
  clientDraftIdRef.current = clientDraftId;
  const draftScope = spaceId || 'feed';

  const fileKeyOf = (file: File): string => {
    let k = fileKeysRef.current.get(file);
    if (!k) {
      k = `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      fileKeysRef.current.set(file, k);
    }
    return k;
  };

  /** Run `fn` once an in-flight draft restore has finished (so indexes line up). Returns true when deferred. */
  const deferIfRestoring = (fn: () => void) => {
    const pr = restorePromiseRef.current;
    if (!pr) return false;
    void pr.then(fn);
    return true;
  };

  // Audience is automatic: account default (fallback Public); Space posts are always Public.
  useEffect(() => {
    if (!isOpen || !token) return;
    if (spaceId) {
      applyDefaultAudience('public');
      return;
    }
    let cancelled = false;
    fetch('/api/settings/account', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (cancelled) return;
        const p = defaultPostPrivacy(s?.postPrivacy);
        defaultPrivacyRef.current = p;
        if (!resumedDraftRef.current) applyDefaultAudience(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, spaceId, applyDefaultAudience]);

  // Layout is automatic: 2+ photos -> gallery, any video -> video, otherwise standard.
  useEffect(() => {
    const isVid = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name);
    const photos = files.filter((f) => f.type.startsWith('image/')).length;
    // A restored draft keeps the layout the user had chosen instead of the auto default.
    const restoredTemplate = restoredTemplateRef.current;
    restoredTemplateRef.current = undefined;
    if (files.some(isVid)) {
      setLayoutKind('video');
      setTemplate(null);
    } else if (photos >= 2) {
      setLayoutKind('gallery');
      setTemplate(restoredTemplate ? (restoredTemplate as PostLayoutTemplate) : defaultLayoutForPhotoCount(photos));
    } else {
      setLayoutKind('standard');
      setTemplate(null);
    }
  }, [files]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setFilePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const editorPreviewUrls = files.length > 0 ? filePreviewUrls : remotePreviewUrls;
  const editorFiles =
    files.length > 0
      ? files
      : remotePreviewUrls.map(
          (_, i) => new File([], mediaRefs[i]?.name || `media-${i}`, { type: mediaRefs[i]?.mimeType || 'image/jpeg' }),
        );

  const openAIStudio = () => {
    setShowAIPanel(true);
    setSidebarCompact(true);
  };

  const openComposer = (opts?: { withAi?: boolean }) => {
    setIsOpen(true);
    setStep('editor');
    setOpenWithAi(!!opts?.withAi);
    if (opts?.withAi) openAIStudio();
  };

  useEffect(() => {
    if (!autoOpen && !autoOpenAi) return;
    openComposer({ withAi: !!autoOpenAi });
     
  }, [autoOpen, autoOpenAi]);

  const closeAIStudio = () => {
    setShowAIPanel(false);
    setSidebarCompact(false);
  };

  const resetComposer = async () => {
    restoreSeqRef.current += 1;
    resumedRef.current = false;
    resumedDraftRef.current = false;
    setPublishFailed(false);
    setClientDraftId(newClientDraftId());
    loadedDraftIdRef.current = null;
    setDraftInitial(null);
    setContent('');
    setFiles([]);
    setMediaRefs([]);
    setRemotePreviewUrls([]);
    setCropDataList([]);
    setTemplate(null);
    setLayoutKind('standard');
    setCommentsAudience('everyone');
    setOpenWithAi(false);
    setMusicSelection(null);
    setLocation('');
    setFeeling(null);
    setPoll(null);
    setPlaylist(null);
    setGifUrl(null);
    setLinkPreview(null);
    setIsQuestion(false);
    setAiHashtags([]);
    applyDefaultAudience(spaceId ? 'public' : defaultPrivacyRef.current);
    setShowAIPanel(false);
    setIsOpen(false);
    setStep('editor');
    setSidebarCompact(false);
  };

  const isDirty =
    !!content.trim() ||
    files.length > 0 ||
    mediaRefs.some(Boolean) ||
    remotePreviewUrls.length > 0 ||
    !!musicSelection ||
    !!location ||
    !!feeling ||
    !!poll ||
    !!gifUrl ||
    !!linkPreview ||
    isQuestion ||
    aiHashtags.length > 0;

  /** Posts never keep drafts: closing (after Discard, or with nothing changed) just resets. */
  const closeComposer = () => {
    void resetComposer();
  };

  useEffect(() => {
    return () => setSidebarCompact(false);
  }, [setSidebarCompact]);

  const removeFile = (idx: number) => {
    if (deferIfRestoring(() => removeFile(idx))) return;
    const next = filesRef.current.filter((_, i) => i !== idx);
    filesRef.current = next;
    setFiles(next);
    setMediaRefs((prev) => prev.filter((_, i) => i !== idx));
    setCropDataList((prev) => prev.filter((_, i) => i !== idx));
    setRemotePreviewUrls((prev) => (prev.length ? prev.filter((_, i) => i !== idx) : prev));
    const photoCount = next.filter((f) => f.type.startsWith('image/')).length;
    setTemplate((cur) => adjustLayoutForCount(cur, photoCount));
  };

  const reorderMedia = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    if (deferIfRestoring(() => reorderMedia(from, to))) return;
    const move = <T,>(arr: T[]): T[] => {
      if (from >= arr.length) return arr;
      const next = [...arr];
      const [item] = next.splice(from, 1);
      if (item === undefined) return arr;
      next.splice(Math.min(to, next.length), 0, item);
      return next;
    };
    setFiles((prev) => move(prev));
    setMediaRefs((prev) =>
      move(prev).map((ref, i) => (ref ? { ...ref, order: i } : ref)),
    );
    setCropDataList((prev) => move(prev));
    setRemotePreviewUrls((prev) => (prev.length ? move(prev) : prev));
  };

  const clearMedia = () => {
    if (deferIfRestoring(() => clearMedia())) return;
    filesRef.current = [];
    setFiles([]);
    setMediaRefs([]);
    setCropDataList([]);
    setRemotePreviewUrls([]);
    setTemplate(null);
  };

  const uploadOneEarly = async (file: File, hintIndex: number) => {
    if (!token) return;
    const key = fileKeyOf(file);
    const kind =
      file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name) ? 'video' : 'image';
    setEarlyUploadInFlight((n) => n + 1);
    let uploaded: { publicUrl: string; key: string } | null = null;
    let lastErr: any = null;
    try {
      for (let attempt = 0; attempt < 3 && !uploaded; attempt += 1) {
        try {
          uploaded = await uploadEditorMediaEarly(file, token);
        } catch (err: any) {
          lastErr = err;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
        }
      }
      if (!uploaded) {
        // Local File remains — publish will multipart. Do not leave Post waiting forever.
        toast.error(lastErr?.message || `Failed to pre-upload ${file.name}. Will attach on Post.`);
        return;
      }
      // The user may have removed / reordered media while this was uploading: find the slot by identity.
      const index = filesRef.current.indexOf(file);
      if (index < 0) return;
      const meta = pendingVideoMetaRef.current[studioFileKey(file)];
      setMediaRefs((prev) => {
        const next = [...prev];
        while (next.length < filesRef.current.length) next.push(null);
        next[index] = {
          localId: key,
          url: uploaded!.publicUrl,
          kind,
          order: index,
          mimeType: file.type,
          name: file.name,
          sizeBytes: file.size,
          crop: null,
          ...(meta ? { trim: meta.trim, filters: meta.filters } : {}),
        };
        return next;
      });
    } finally {
      setEarlyUploadInFlight((n) => Math.max(0, n - 1));
    }
  };

  const addFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    if (deferIfRestoring(() => addFiles(newFiles))) return;
    const start = filesRef.current.length;
    const merged = [...filesRef.current, ...newFiles];
    filesRef.current = merged;
    const photoCount = merged.filter((f) => f.type.startsWith('image/')).length;
    setFiles(merged);
    setTemplate((cur) => {
      if (photoCount < 2) return null;
      if (cur) return adjustLayoutForCount(cur, photoCount) || defaultLayoutForPhotoCount(photoCount);
      return defaultLayoutForPhotoCount(photoCount);
    });
    setMediaRefs((refs) => {
      const base = [...refs];
      while (base.length < start) base.push(null);
      return [...base, ...newFiles.map(() => null)];
    });
    setCropDataList((crops) => {
      const base = [...crops];
      while (base.length < start) base.push(null);
      return [...base, ...newFiles.map(() => null)];
    });
    newFiles.forEach((file, i) => {
      void uploadOneEarly(file, start + i);
    });
  };

  const handleApplyAIContent = (aiContent: string) => {
    setContent(aiContent);
    closeAIStudio();
  };

  const handleApplyAIHashtags = (hashtags: string[]) => {
    setAiHashtags(hashtags);
    toast.success(`${hashtags.length} hashtags will be added to your post`);
  };

  const handleApplyAIImage = (file: File) => {
    addFiles([file]);
  };

  const hasMediaReady = mediaRefs.some(Boolean);
  const hasLocalFiles = files.some((f) => f.size > 0);

  const allMediaReady = useMemo(() => {
    if (files.length === 0) return true;
    if (mediaRefs.length >= files.length) return mediaRefs.slice(0, files.length).every(Boolean);
    return false;
  }, [files, mediaRefs]);


  const { t: tDraft } = useEnBn();
  const [savingDraft, setSavingDraft] = useState(false);
  const [drafts, setDrafts] = useState<ServerPostDraft[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  /** clientDraftId of the saved draft currently loaded (deleted after it is published). */
  const loadedDraftIdRef = useRef<string | null>(null);
  const [draftInitial, setDraftInitial] = useState<{ commentsEnabled?: boolean; scheduledAt?: string | null } | null>(null);

  const loadDrafts = useCallback(async () => {
    if (!token) return;
    setDraftsLoading(true);
    try {
      const r = await fetch('/api/post-drafts?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const j = await r.json();
        const list: ServerPostDraft[] = Array.isArray(j?.drafts) ? j.drafts : [];
        setDrafts(list.filter((d) => d.status === 'draft' || d.status === 'failed'));
      }
    } catch {
      /* list stays as-is */
    } finally {
      setDraftsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) void loadDrafts();
  }, [isOpen, loadDrafts]);

  const openSavedDraft = (d: ServerPostDraft) => {
    const st = draftEditState(d);
    if (!st) {
      toast.error(tDraft('This draft could not be opened', 'এই ড্রাফট খোলা যায়নি'));
      return;
    }
    restoreSeqRef.current += 1;
    resumedDraftRef.current = true;
    const media: PostEditMediaRef[] = (Array.isArray(st.media) ? st.media : []).filter((m: any) => m && typeof m.url === 'string' && m.url);
    const id = String(st.clientDraftId || d.clientDraftId);
    setClientDraftId(id);
    setContent(typeof st.content === 'string' ? st.content : '');
    filesRef.current = [];
    setFiles([]);
    mediaRefsRef.current = media;
    setMediaRefs(media);
    setRemotePreviewUrls(media.map((m) => m.url));
    setCropDataList([]);
    restoredTemplateRef.current = typeof st.templateType === 'string' ? st.templateType : null;
    const p = String(st.audience?.privacy || 'public');
    setVisibilityFlags(st.audience?.visibilityFlags && typeof st.audience.visibilityFlags === 'object' ? st.audience.visibilityFlags : flagsFromPrivacy(p));
    setCustomUsers([]);
    setHideFromUsers([]);
    setPrivacy(p);
    setLocation(typeof st.location === 'string' ? st.location : '');
    setFeeling(typeof st.feeling === 'string' ? st.feeling : null);
    setPoll(st.poll && typeof st.poll === 'object' ? st.poll : null);
    setAiHashtags(Array.isArray(st.hashtags) ? st.hashtags.map(String) : []);
    setCommentsAudience(st.commentsEnabled === false ? 'off' : 'everyone');
    setDraftInitial({ commentsEnabled: st.commentsEnabled !== false, scheduledAt: typeof st.scheduledAt === 'string' ? st.scheduledAt : null });
    loadedDraftIdRef.current = id;
    setDraftsOpen(false);
    setStep('editor');
    toast.success(tDraft('Draft opened', 'ড্রাফট খোলা হয়েছে'));
  };

  const deleteServerDraft = async (clientId: string) =>
    fetch(`/api/post-drafts/${encodeURIComponent(clientId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

  // Settings > Posts & Content > Saved drafts > Open hands a draft id over via sessionStorage.
  useEffect(() => {
    if (!token) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem('wev:openDraft'); if (id) sessionStorage.removeItem('wev:openDraft'); } catch { /* ignore */ }
    if (!id) return;
    void (async () => {
      try {
        const r = await fetch('/api/post-drafts?limit=50', { headers: { Authorization: `Bearer ${token}` } });
        const j = r.ok ? await r.json() : null;
        const d = (Array.isArray(j?.drafts) ? j.drafts : []).find((x: ServerPostDraft) => x.clientDraftId === id);
        if (!d) { toast.error(tDraft('That draft is no longer available', 'এই ড্রাফটটি আর নেই')); return; }
        openComposer();
        openSavedDraft(d);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const deleteSavedDraft = async (d: ServerPostDraft) => {
    try {
      const r = await deleteServerDraft(d.clientDraftId);
      if (!r.ok) throw new Error();
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      if (loadedDraftIdRef.current === d.clientDraftId) loadedDraftIdRef.current = null;
      toast.success(tDraft('Draft deleted', 'ড্রাফট ডিলিট হয়েছে'));
    } catch {
      toast.error(tDraft('Could not delete draft', 'ড্রাফট ডিলিট করা যায়নি'));
    }
  };
  /** Explicit Save Draft (Schedule & more footer). Never called automatically. */
  const handleSaveDraft = async (settings: { location?: string; hashtags: string[]; isCommentEnabled: boolean; scheduledAt?: string | null }) => {
    if (savingDraft) return;
    if (files.length > 0 && !allMediaReady) {
      toast.error(tDraft('Media is still uploading. Try again in a moment.', 'মিডিয়া এখনও আপলোড হচ্ছে, একটু পরে আবার চেষ্টা করুন।'));
      return;
    }
    setSavingDraft(true);
    try {
      const editState = {
        version: 1,
        clientDraftId,
        updatedAt: new Date().toISOString(),
        content,
        templateType: typeof template === 'string' ? template : null,
        media: mediaRefs.filter((m): m is PostEditMediaRef => !!m),
        music: null,
        audience: { privacy, visibilityFlags, customUserIds: customUsers.map((u) => u.id) },
        location: settings.location || location || undefined,
        feeling,
        poll,
        hashtags: Array.from(new Set([...aiHashtags, ...settings.hashtags])),
        commentsEnabled: settings.isCommentEnabled,
        scheduledAt: settings.scheduledAt ?? null,
        step: 'settings' as const,
      };
      const res = await fetch('/api/post-drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ editState }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || tDraft('Could not save draft', 'ড্রাফট সেভ করা যায়নি'));
      }
      loadedDraftIdRef.current = clientDraftId;
      setDraftInitial({ commentsEnabled: settings.isCommentEnabled, scheduledAt: settings.scheduledAt ?? null });
      void loadDrafts();
      toast.success(tDraft('Draft saved', 'ড্রাফট সেভ হয়েছে'));
    } catch (e: any) {
      toast.error(e?.message || tDraft('Could not save draft', 'ড্রাফট সেভ করা যায়নি'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFinalSubmitPost = async (settings: {
    location?: string;
    isCommentEnabled: boolean;
    scheduledAt?: string | null;
    hashtags: string[];
    privacy: string;
    visibilityFlags?: VisibilityFlags;
    customUserIds?: string[];
    publishSettings?: CreatorPublishSettings;
  }) => {
    const hasPublishable =
      !!content.trim() ||
      hasMediaReady ||
      hasLocalFiles ||
      remotePreviewUrls.length > 0 ||
      !!gifUrl ||
      (!!poll &&
        !!(poll.question || content).trim() &&
        poll.options.map((o) => o.trim()).filter(Boolean).length >= 2);
    if (!hasPublishable) {
      toast.error('কিছু লিখুন বা মিডিয়া যোগ করুন');
      return;
    }
    if (poll) {
      const pollErr = pollDraftError(poll, content, pollT);
      if (pollErr) {
        toast.error(pollErr);
        return;
      }
    }
    setLoading(true);

    try {
      const allTags = Array.from(new Set([...aiHashtags, ...settings.hashtags]));
      let finalContent = content;
      if (allTags.length > 0 && !content.includes('#')) {
        finalContent = content + '\n\n' + allTags.join(' ');
      }

      const flags = settings.visibilityFlags || visibilityFlags;
      const customIds = settings.customUserIds || customUsers.map((u) => u.id);
      const effectivePrivacy = privacyFromFlags(flags, customIds.length > 0);
      const pollPayload = poll
        ? { ...pollDraftPayload(poll), question: (poll.question || finalContent).trim().slice(0, 280) }
        : null;

      // Need local File blobs for multipart — draft URLs alone cannot use this path.
      if (!hasLocalFiles && hasMediaReady && !settings.scheduledAt) {
        toast.error('মিডিয়া প্রস্তুত নয় — আবার চেষ্টা করুন');
        setPublishFailed(true);
        setLoading(false);
        return;
      }

      if (files.some((f) => f.size === 0)) {
        toast.error('Some media could not be loaded. Remove it and add it again.');
        setPublishFailed(true);
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('content', finalContent);
      const resolvedType = isQuestion
        ? 'question'
        : gifUrl && !files.length
          ? 'gif'
          : files.some(
              (f) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name),
            )
            ? 'video'
            : files.length > 0
              ? 'photo'
              : pollPayload
                ? 'poll'
                : linkPreview
                  ? 'link'
                  : 'text';
      formData.append('type', resolvedType);
      formData.append('privacy', effectivePrivacy);
      formData.append('visibilityFlags', JSON.stringify(flags));
      formData.append('customUserIds', JSON.stringify(customIds));
      formData.append(
        'excludedUserIds',
        JSON.stringify(hideFromUsers.map((u) => u.id)),
      );
      formData.append(
        'templateType',
        template || (files.filter((f) => f.type.startsWith('image/')).length >= 2 ? 'carousel' : 'grid'),
      );
      formData.append('mediaCropData', JSON.stringify(cropDataList.slice(0, files.length)));
      if (musicSelection) {
        formData.append(
          'postMusic',
          JSON.stringify({
            musicId: musicSelection.musicId,
            startTime: musicSelection.startTime,
            endTime: musicSelection.endTime,
            volume: musicSelection.volume,
            originalAudioMuted: musicSelection.originalAudioMuted,
          }),
        );
        formData.append('musicId', musicSelection.musicId);
      }

      const resolvedLocation = settings.location || location;
      if (resolvedLocation) formData.append('location', resolvedLocation);
      if (feeling) formData.append('feeling', feeling.slice(0, 60));
      if (pollPayload) formData.append('pollData', JSON.stringify(pollPayload));
      if (gifUrl) formData.append('gifUrl', gifUrl);
      if (linkPreview && (await fetchPostDefaults(token)).linkPreview) {
        formData.append('linkPreview', JSON.stringify(linkPreview));
        if (linkPreview.url) formData.append('linkUrl', linkPreview.url);
      }
      formData.append('commentsDisabled', (!settings.isCommentEnabled).toString());
      // Per-post reply control; server falls back to Settings > Default reply control.
      if (commentsAudience !== 'off' && commentsAudience !== 'everyone') formData.append('replyAudience', commentsAudience);
      if (spaceId) formData.append('spaceId', spaceId);

      if (settings.scheduledAt) {
        formData.append('scheduledFor', settings.scheduledAt);
        formData.append('status', 'scheduled');
      } else {
        formData.append('status', 'published');
      }

      // Settings > Posts & Content > Post defaults seed every publish path
      // (studio Publish + Schedule & more). Panel overrides win when present.
      const postDefaults = await fetchPostDefaults(token);
      const fromPanel = settings.publishSettings;
      const publish = {
        ...(fromPanel || DEFAULT_PUBLISH_SETTINGS),
        allowDownloads: fromPanel ? fromPanel.allowDownloads !== false : postDefaults.allowDownloads,
        allowRemix: fromPanel ? fromPanel.allowRemix !== false : postDefaults.allowRemix,
        allowDuets: fromPanel ? fromPanel.allowDuets !== false : postDefaults.allowRemix,
        isSensitiveContent: fromPanel ? !!fromPanel.isSensitiveContent : postDefaults.sensitiveWarning,
        isAiGenerated: fromPanel ? !!fromPanel.isAiGenerated : postDefaults.aiLabel,
        isPaidPartnership: fromPanel ? !!fromPanel.isPaidPartnership : postDefaults.paidPartnership,
        altText: altText.trim() || fromPanel?.altText || '',
        visibilityType: ([
          'public',
          'followers',
          'private',
          'unlisted',
          'friends',
          'custom',
        ].includes(effectivePrivacy)
          ? effectivePrivacy
          : 'private') as CreatorPublishSettings['visibilityType'],
        enableComments: settings.isCommentEnabled,
        location: fromPanel?.location || settings.location || '',
        hashtags: fromPanel?.hashtags || allTags.join(' '),
        scheduledPublishAt: settings.scheduledAt || fromPanel?.scheduledPublishAt || '',
      };
      appendPublishSettings(formData, publish);
      // Post columns the feed reads directly (mirrors publishSettings JSON).
      formData.append('allowDownload', String(publish.allowDownloads !== false));
      formData.append('isSensitive', String(!!publish.isSensitiveContent));
      formData.append('hideLikeCount', String(postDefaults.hideLikeCount));
      const readyMediaRefs = mediaRefs.filter((m): m is PostEditMediaRef => Boolean(m && m.url));
      const allDirectReady = files.length > 0 && readyMediaRefs.length === files.length;
      if (allDirectReady) {
        formData.append('directMedia', JSON.stringify(readyMediaRefs));
      } else {
        files.forEach((f) => formData.append('media', f));
      }

      const hasMultipartFiles = !allDirectReady && files.length > 0;
      const res = hasMultipartFiles
        ? await uploadWithProgress(
            '/api/posts',
            formData,
            token,
            `post-${Date.now()}`,
            files.some((f) => f.type.startsWith('video/')) ? 'Uploading video post' : 'Uploading post',
          )
        : await fetch('/api/posts', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

      if (res.ok) {
        const created: any = await res.json().catch(() => ({}));
        const createdPostId: string | undefined = created?.id || created?.post?.id || created?.postId;
        if (createdPostId && playlist) {
          fetch(`/api/v1/jobs-creator/creator/playlists/${playlist.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemType: 'post', itemId: createdPostId }),
          })
            .then(async (r) => {
              if (!r.ok) toast.error((await r.json().catch(() => ({})))?.error || 'Could not add to playlist');
            })
            .catch(() => toast.error('Could not add to playlist'));
        }
        if (createdPostId && !settings.scheduledAt) {
          const platforms = settings.publishSettings?.crossPostPlatforms || [];
          if (platforms.length > 0) {
            setCrossPostJobs(platforms.map(p => ({ platform: p, status: 'pending' })));
            setShowCrossPostModal(true);

            await Promise.all(platforms.map(async (platform) => {
              try {
                const res = await fetch(`/api/posts/${createdPostId}/cross-post`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ platform })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to initiate cross-post');

                if (data.strategy === 'client-direct') {
                  const videoFile = files.find(f => f.type.startsWith('video/'));
                  if (!videoFile) throw new Error('No video found for client-direct upload');

                  setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'uploading', progress: 0 } : j));

                  // Mock upload progress
                  for (let i = 10; i <= 90; i += 20) {
                    await new Promise(r => setTimeout(r, 500));
                    setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, progress: i } : j));
                  }

                  const uploadRes = await fetch(data.uploadUrl, { method: data.method });
                  if (!uploadRes.ok) throw new Error('Upload failed');

                  setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'processing', progress: 100 } : j));

                  await fetch(`/api/posts/cross-post/${data.id}/complete`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'success' })
                  });
                  
                  setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'success' } : j));
                } else {
                  setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'processing' } : j));
                  
                  // Poll for success
                  while (true) {
                    await new Promise(r => setTimeout(r, 1500));
                    const pollRes = await fetch(`/api/posts/cross-post/${data.id}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const pollData = await pollRes.json();
                    if (pollData.status === 'success') {
                      setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'success' } : j));
                      break;
                    }
                    if (pollData.status === 'failed') {
                      throw new Error(pollData.error || 'Server relay failed');
                    }
                  }
                }
              } catch (err: any) {
                setCrossPostJobs(prev => prev.map(j => j.platform === platform ? { ...j, status: 'failed', error: err.message } : j));
              }
            }));
          }
        }
        const publishedDraftId = loadedDraftIdRef.current;
        if (publishedDraftId) {
          loadedDraftIdRef.current = null;
          void deleteServerDraft(publishedDraftId)
            .then(() => setDrafts((prev) => prev.filter((x) => x.clientDraftId !== publishedDraftId)))
            .catch(() => {});
        }
        toast.success(settings.scheduledAt ? 'Post scheduled successfully! ⏰' : 'Post published successfully! 🚀');
        await resetComposer();
        runAfterOverlayClose(onPostCreated);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || errorData.details || errorData.message || 'Failed to publish post');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while publishing');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditedImage = (editedFile: File) => {
    if (editorIndex !== null) {
      const updatedFiles = [...files];
      updatedFiles[editorIndex] = editedFile;
      setFiles(updatedFiles);
      void uploadOneEarly(editedFile, editorIndex);
    }
    setEditorFile(null);
    setEditorIndex(null);
  };

  const handleSaveEditedVideo = (trimStart: number, trimEnd: number) => {
    if (editorVideoIndex !== null) {
      setMediaRefs((prev) => {
        const next = [...prev];
        const current = next[editorVideoIndex];
        if (current) {
          next[editorVideoIndex] = {
            ...current,
            trim: { start: trimStart, end: trimEnd },
          };
        }
        return next;
      });
    }
    setEditorVideoFile(null);
    setEditorVideoIndex(null);
  };

  const openMediaEditor = async (index: number) => {
    if (restorePromiseRef.current) await restorePromiseRef.current.catch(() => {});
    let file = filesRef.current[index];
    const ref = mediaRefsRef.current[index];
    // A restored draft whose original could not be downloaded earlier: try once more now.
    if ((!file || file.size <= 0) && ref?.url) {
      const loadingId = toast.loading('মিডিয়া লোড হচ্ছে…');
      try {
        const res = await fetch(ref.url);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const fetched = new File([blob], ref.name || `media-${index}`, {
          type: ref.mimeType || blob.type || (ref.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          lastModified: Date.now(),
        });
        file = fetched;
        filesRef.current = filesRef.current.map((f, i) => (i === index ? fetched : f));
        setFiles(filesRef.current);
      } catch {
        /* handled below */
      } finally {
        toast.dismiss(loadingId);
      }
    }
    if (!file || file.size <= 0) {
      toast.error('সার্ভার থেকে মিডিয়া লোড করা যায়নি — মুছে আবার যোগ করুন');
      return;
    }
    setStudioIndex(index);
  };

  const handleStudioSave = (result: {
    photos: Array<{ index: number; file: File }>;
    videos: Array<{ index: number; meta: MediaStudioVideoSave; baked?: { file: File; url: string } }>;
  }) => {
    if (result.photos.length) {
      setFiles((prev) => {
        const next = [...prev];
        result.photos.forEach((p) => {
          next[p.index] = p.file;
        });
        return next;
      });
      result.photos.forEach((p) => void uploadOneEarly(p.file, p.index));
    }
    // Videos rendered by the server (FFmpeg): swap in the baked file + its uploaded URL.
    const bakedVideos = result.videos.filter((v) => v.baked);
    if (bakedVideos.length) {
      setFiles((prev) => {
        const next = [...prev];
        bakedVideos.forEach((v) => {
          next[v.index] = v.baked!.file;
        });
        return next;
      });
      setMediaRefs((prev) => {
        const next = [...prev];
        bakedVideos.forEach((v) => {
          const f = v.baked!.file;
          const cur = next[v.index];
          const { trim: _t, filters: _f, ...rest } = (cur || {}) as any;
          next[v.index] = {
            ...rest,
            localId: cur?.localId || `m-${v.index}-${Date.now()}`,
            url: v.baked!.url,
            kind: 'video',
            order: v.index,
            mimeType: 'video/mp4',
            name: f.name,
            sizeBytes: f.size,
            crop: null,
          };
        });
        return next;
      });
      bakedVideos.forEach((v) => {
        const old = files[v.index];
        if (old) delete pendingVideoMetaRef.current[studioFileKey(old)];
      });
    }
    const metaVideos = result.videos.filter((v) => !v.baked);
    if (metaVideos.length) {
      const nextEdits: Record<string, MediaEdit> = {};
      metaVideos.forEach((v) => {
        const f = files[v.index];
        if (!f) return;
        const k = studioFileKey(f);
        nextEdits[k] = v.meta.edit;
        pendingVideoMetaRef.current[k] = v.meta;
      });
      setStudioEdits((prev) => ({ ...prev, ...nextEdits }));
      setMediaRefs((prev) => {
        const next = [...prev];
        metaVideos.forEach((v) => {
          const cur = next[v.index];
          if (cur) next[v.index] = { ...cur, trim: v.meta.trim, filters: v.meta.filters };
        });
        return next;
      });
    }
    setStudioIndex(null);
    if (result.photos.length || result.videos.length) toast.success('Media updated');
  };

  const publishFromStudio = async () => {
    await handleFinalSubmitPost({
      location,
      isCommentEnabled: commentsAudience !== 'off',
      scheduledAt: null,
      hashtags: aiHashtags,
      privacy,
      visibilityFlags,
      customUserIds: customUsers.map((u) => u.id),
    });
  };

  return (
    <>
      <div
        className="w-full bg-card/50 dark:bg-card/30 backdrop-blur-xl border border-border/70 dark:border-border/40 rounded-xl px-2.5 py-2 shadow-sm hover:border-purple-500/30 transition-all cursor-pointer group select-none"
        onClick={() => openComposer()}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border/80 p-[1px] bg-gradient-to-tr from-cyan-400 to-purple-500">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                loading="lazy"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-bold text-[10px] text-foreground">
                {displayInitial}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-full px-3 py-1.5 text-muted-foreground transition-all text-xs font-medium flex items-center justify-between">
            <span className="truncate">
              {t("What's on your mind, {{name}}?", { name: displayName }) ||
                `What's on your mind, ${displayName}?`}
            </span>
            <Sparkles
              size={13}
              className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              e.target.value = '';
              if (!selected.length) return;
              addFiles(selected);
              openComposer();
            }}
          />
          <button
            type="button"
            className="shrink-0 p-1.5 rounded-full hover:bg-emerald-500/10 text-emerald-500 transition-colors"
            title={t('Photo/Video') || 'Photo/Video'}
            aria-label={t('Photo/Video') || 'Photo/Video'}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="shrink-0 p-1.5 rounded-full hover:bg-fuchsia-500/10 text-fuchsia-500 transition-colors"
            title={t('Reel') || 'Reel'}
            aria-label={t('Reel') || 'Reel'}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/reels');
            }}
          >
            <Clapperboard size={16} />
          </button>
          <button
            type="button"
            className="hidden sm:inline-flex shrink-0 p-1.5 rounded-full hover:bg-amber-500/10 text-amber-600 transition-colors dark:text-amber-400"
            title={t('WevMall') || 'WevMall'}
            aria-label={t('WevMall') || 'WevMall'}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/wevmall');
            }}
          >
            <ShoppingBag size={16} />
          </button>
          <button
            type="button"
            className="shrink-0 p-1.5 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors"
            title={t('Live') || 'Live'}
            aria-label={t('Live') || 'Live'}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/live');
            }}
          >
            <Radio size={16} />
          </button>
          <button
            type="button"
            className="shrink-0 p-1.5 rounded-full hover:bg-purple-500/10 text-purple-400 transition-colors"
            title={t('AI Writer') || 'AI Writer'}
            onClick={(e) => {
              e.stopPropagation();
              openComposer({ withAi: true });
            }}
          >
            <Wand2 size={15} />
          </button>
        </div>
      </div>

      {isOpen ? (
        <Suspense fallback={null}>
          <CreatePostStudio
            open={isOpen}
            mode="overlay"
            onClose={closeComposer}
            onDiscardAndClose={() => { void resetComposer(); }}
            isDirty={isDirty}
            authorName={spaceName || user?.name || 'User'}
            authorAvatar={displayAvatar}
            authorInitial={displayInitial}
            content={content}
            onChangeContent={setContent}
            previewUrls={editorPreviewUrls}
            onAddFiles={addFiles}
            onRemoveMedia={removeFile}
            onEditMedia={openMediaEditor}
            mediaKinds={files.length ? files.map((f) => (studioIsVideo(f) ? 'video' : 'image')) : undefined}
            mediaFilters={
              files.length
                ? files.map((f) => {
                    const e = studioEdits[studioFileKey(f)];
                    return e ? studioEditCss(e) : undefined;
                  })
                : undefined
            }
            onClearMedia={clearMedia}
            location={location}
            onLocationChange={setLocation}
            musicSelection={musicSelection}
            onMusicSelectionChange={setMusicSelection}
            gifUrl={gifUrl}
            onGifUrlChange={setGifUrl}
            poll={poll}
            onPollChange={setPoll}
            visibilityFlags={visibilityFlags}
            customUsers={customUsers}
            hideFromUsers={hideFromUsers}
            onAudienceChange={({ flags, customUsers: users, hideFromUsers: hidden }) => {
              setVisibilityFlags(flags);
              setCustomUsers(users);
              setHideFromUsers(hidden);
              setPrivacy(privacyFromFlags(flags, users.length > 0));
            }}
            layoutKind={layoutKind}
            onLayoutKindChange={(k) => {
              setLayoutKind(k);
              if (k === 'gallery') {
                const photoCount = files.filter((f) => f.type.startsWith('image/')).length;
                setTemplate(defaultLayoutForPhotoCount(Math.max(photoCount, 2)));
              } else {
                setTemplate(null);
              }
            }}
            layoutTemplate={template}
            onLayoutTemplateChange={setTemplate}
            commentsAudience={commentsAudience}
            onCommentsAudienceChange={setCommentsAudience}
            onPublish={publishFromStudio}
            onOpenSettings={() => setStep('settings')}
            onOpenDrafts={() => { setDraftsOpen(true); void loadDrafts(); }}
            draftCount={drafts.length}
            feeling={feeling}
            onFeelingChange={setFeeling}
            isQuestion={isQuestion}
            onIsQuestionChange={setIsQuestion}
            playlistId={playlist?.id ?? null}
            playlistName={playlist?.name ?? null}
            onPlaylistChange={(id, name) => setPlaylist(id ? { id, name: name || 'Playlist' } : null)}
            // Spinner only while submit runs — early media upload must not look like "Post stuck".
            publishing={loading}
            mediaUploading={earlyUploadInFlight > 0}
            onApplyAIContent={handleApplyAIContent}
            onApplyAIHashtags={handleApplyAIHashtags}
            editorAccessory={token ? (
              <ComposerQuickInsert
                token={token}
                variant="inline"
                onInsert={(text, replace) => setContent((c) => (replace || !c.trim() ? text : `${c.trimEnd()}\n${text}`))}
              />
            ) : undefined}
            initialAiOpen={openWithAi}
            hasVideo={files.some((f) => f.type.startsWith('video/'))}
          />
        </Suspense>
      ) : null}

      {isOpen && step === 'settings' ? (
        <Suspense fallback={null}>
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center"
            onClick={() => setStep('editor')}
          >
            <div
              className="flex h-[min(92dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="create-post-settings-panel"
            >
              {token ? (
                <ComposerQuickInsert
                  token={token}
                  onInsert={(text, replace) => setContent((c) => (replace || !c.trim() ? text : `${c.trimEnd()}\n${text}`))}
                />
              ) : null}
              {files.some((f) => f.type.startsWith('image/')) ? (
                <div className="border-b border-border px-4 py-3">
                  <label htmlFor="post-alt-text" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Alt text
                  </label>
                  <input
                    id="post-alt-text"
                    data-testid="post-alt-text"
                    value={altText}
                    maxLength={500}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the photo for screen readers (blank = auto)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
              <PostSettings
                onBackStep={() => setStep('editor')}
                onSubmitPost={handleFinalSubmitPost}
                submitting={loading || earlyUploadInFlight > 0}
                visibilityFlags={visibilityFlags}
                customUserIds={customUsers.map((u) => u.id)}
                privacy={privacy}
                onSaveDraft={handleSaveDraft}
                savingDraft={savingDraft}
                initialCommentsEnabled={draftInitial?.commentsEnabled ?? commentsAudience !== 'off'}
                initialScheduledAt={draftInitial?.scheduledAt ?? null}
                initialLocation={location}
              />
            </div>
          </div>
        </Suspense>
      ) : null}

      <PostDraftsSheet
        open={draftsOpen}
        drafts={drafts}
        loading={draftsLoading}
        activeClientDraftId={loadedDraftIdRef.current}
        onClose={() => setDraftsOpen(false)}
        onOpenDraft={openSavedDraft}
        onDeleteDraft={deleteSavedDraft}
      />

      {showCrossPostModal ? (
        <Suspense fallback={null}>
          <CrossPostProgressModal
            jobs={crossPostJobs}
            isOpen={showCrossPostModal}
            onClose={() => {
              setShowCrossPostModal(false);
              setCrossPostJobs([]);
            }}
          />
        </Suspense>
      ) : null}

      {studioIndex !== null && files.length > 0 ? (
        <Suspense fallback={null}>
          <MediaStudio
            files={files}
            previewUrls={filePreviewUrls}
            initialIndex={studioIndex}
            savedEdits={studioEdits}
            onAddFiles={addFiles}
            token={token}
            sourceUrls={files.map((_, i) => mediaRefs[i]?.url || null)}
            onClose={() => setStudioIndex(null)}
            onSave={handleStudioSave}
          />
        </Suspense>
      ) : null}

      {editorFile && (
        <Suspense fallback={null}>
          <ImageEditorModal
            file={editorFile}
            type="post"
            onClose={() => {
              setEditorFile(null);
              setEditorIndex(null);
            }}
            onSave={handleSaveEditedImage}
          />
        </Suspense>
      )}

      {editorVideoFile && (
        <Suspense fallback={null}>
          <VideoEditorModal
            file={editorVideoFile}
            onClose={() => {
              setEditorVideoFile(null);
              setEditorVideoIndex(null);
            }}
            onSave={handleSaveEditedVideo}
          />
        </Suspense>
      )}
    </>
  );
}

