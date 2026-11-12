import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, CalendarClock, Check, Image as ImageIcon, Loader2,
  Save, Scissors, Send, ShoppingBag, Sparkles, Type, UploadCloud, Users, Video, Wand2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { uploadWithProgress } from './UploadProgressToast';
import { uploadDirectMedia } from '../lib/directUpload';
import {
  StepAccessibility,
  StepContentDetails,
  StepContentDisclosure,
  StepCopyright,
  StepMonetization,
  StepPublishingOptions,
  StepProfileOptions,
  StepSafety,
  PublishReviewCard,
  inputClass,
  FieldLabel,
  type ReviewEditTarget,
} from './creator/CreatorPublishSteps';
import ReelVideoInfoCard from './reels/creator/ReelVideoInfoCard';
import ReelQualitySelector from './reels/creator/ReelQualitySelector';
import ReelFullscreenEditor from './reels/creator/ReelFullscreenEditor';
import ReelProcessingScreen, { type ProcessStep } from './reels/creator/ReelProcessingScreen';
import {
  appendPublishSettings,
  DEFAULT_PUBLISH_SETTINGS,
  wallClockToIso,
  type CreatorPublishSettings,
} from '../lib/creatorPublish';
import {
  clearVideoPublishDraft,
  draftHasContent,
  loadVideoPublishDraft,
  saveVideoPublishDraft,
  type ScheduleMode,
} from '../lib/publishDraft';
import {
  analyzeReelVideoFile,
  formatBytes,
  formatDurationLabel,
  isLikelyVideoFile,
  pickDefaultQuality,
  type ReelVideoAnalysis,
} from '../lib/reelVideoAnalysis';
import {
  createReelEditState,
  editNeedsHeavyProcess,
  parseReelEditState,
  type ReelEditState,
} from '../lib/reelEditState';
import { MIN_TRIM_DURATION_SEC } from '../lib/video-trim';

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** 'page' = rendered by the dedicated /reels/create Creator page. */
  variant?: 'modal' | 'page';
}

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Edit' },
  { n: 3, label: 'Review' },
] as const;

function mapDraftStep(step?: number, workflowVersion?: number): number {
  const n = step || 1;
  if (workflowVersion === 6 || workflowVersion === 5 || workflowVersion === 4) return Math.min(Math.max(n, 1), 3);
  if (workflowVersion === 3) return n <= 2 ? n : 3;
  if (n <= 2) return 1;
  if (n <= 6) return 2;
  return 3;
}

/** Filename → upload title (strip extension, tidy separators, cap length). */
function titleFromUploadName(name: string, max = 200): string {
  const base = String(name || '')
    .replace(/\.[^.\\/]+$/i, '')
    .replace(/[_+]+/g, ' ')
    .replace(/-+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';
  return base.length > max ? base.slice(0, max).trim() : base;
}

function captureThumbnail(video: HTMLVideoElement): string {
  try {
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return '';
  }
}

export default function ReelUploadModal({ isOpen, onClose, onSuccess, variant = 'modal' }: ReelUploadModalProps) {
  const token = useStore((s) => s.token);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [analysis, setAnalysis] = useState<ReelVideoAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [editState, setEditState] = useState<ReelEditState>(() => createReelEditState());
  const [dragOver, setDragOver] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [mentions, setMentions] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [autoPostToFeed, setAutoPostToFeed] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [productHits, setProductHits] = useState<any[]>([]);
  const [taggedProducts, setTaggedProducts] = useState<any[]>([]);
  const [publishSettings, setPublishSettings] = useState<CreatorPublishSettings>(DEFAULT_PUBLISH_SETTINGS);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [timezone, setTimezone] = useState('auto');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReviewEditTarget | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipNextSave = useRef(false);
  const analyzeGen = useRef(0);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const pendingRetryMode = useRef<'publish' | 'schedule' | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setThumbnail('');
    setDurationLabel('');
    setAnalysis(null);
    setAnalyzing(false);
    setAnalysisError(null);
    setEditState(createReelEditState());
    setDragOver(false);
    setResumePrompt(false);
    setProcessing(false);
    setProcessSteps([]);
    setUploadError(null);
    setMentions('');
    setTaggedProducts([]);
    setProductQuery('');
    setAutoPostToFeed(true);
    setPublishSettings(DEFAULT_PUBLISH_SETTINGS);
    setScheduleMode('now');
    setScheduleDate('');
    setScheduleTime('');
    setTimezone('auto');
    setDraftSavedAt(null);
    setMoreOpen(false);
    setEditTarget(null);
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    pendingRetryMode.current = null;
  }, []);

  // Escape Reels phone-frame / layout containing blocks — always cover the real viewport.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadVideoPublishDraft().then((draft) => {
      if (cancelled || !draft || !draftHasContent(draft)) return;
      skipNextSave.current = true;
      setPublishSettings({ ...DEFAULT_PUBLISH_SETTINGS, ...draft.publishSettings });
      setMentions(draft.mentions || '');
      setAutoPostToFeed(draft.autoPostToFeed !== false);
      setScheduleMode(draft.scheduleMode || 'now');
      setScheduleDate(draft.scheduleDate || '');
      setScheduleTime(draft.scheduleTime || '');
      setTimezone(draft.timezone || 'auto');
      setStep(mapDraftStep(draft.step, draft.workflowVersion));
      setThumbnail(draft.thumbnailDataUrl || '');
      if (draft.editState) {
        const parsed = parseReelEditState(draft.editState);
        if (parsed) setEditState(parsed);
      }
      if (draft.videoAnalysis && draft.videoAnalysis.width) {
        setAnalysis({
          ...draft.videoAnalysis,
          orientation: (draft.videoAnalysis.orientation as ReelVideoAnalysis['orientation']) || 'portrait',
          qualityTier: (draft.videoAnalysis.qualityTier as ReelVideoAnalysis['qualityTier']) || 'unknown',
          estimatedUploadBytes: draft.videoAnalysis.fileSize || 0,
        });
        if (draft.videoAnalysis.durationSec > 0) {
          setDurationLabel(formatDurationLabel(draft.videoAnalysis.durationSec));
        }
      }
      if (draft.file instanceof File) {
        setFile(draft.file);
        setPreview(URL.createObjectURL(draft.file));
      }
      setDraftSavedAt(draft.savedAt);
      setResumePrompt(true);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !token) return;
    const q = productQuery.trim();
    const t = window.setTimeout(() => {
      fetch(`/api/reels/shop/products${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setProductHits(Array.isArray(d.products) ? d.products : []))
        .catch(() => setProductHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [productQuery, isOpen, token]);

  const openVideoPicker = useCallback(() => {
    const input = fileInputRef.current;
    if (!input) return;
    // Allow re-picking the same path after a replace attempt.
    input.value = '';
    input.click();
  }, []);

  const clearSelectedVideo = useCallback(() => {
    analyzeGen.current += 1;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setDurationLabel('');
    setThumbnail('');
    setAnalysis(null);
    setAnalyzing(false);
    setAnalysisError(null);
    setUploadError(null);
    setEditState(createReelEditState());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [preview]);

  const runAnalysis = useCallback(async (selected: File) => {
    const gen = ++analyzeGen.current;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeReelVideoFile(selected);
      if (gen !== analyzeGen.current) return;
      setAnalysis(result);
      if (result.durationSec > 0) setDurationLabel(formatDurationLabel(result.durationSec));
      setPublishSettings((prev) => ({ ...prev, uploadQuality: pickDefaultQuality(result) }));
      setEditState((prev) =>
        prev.trimEnd == null && result.durationSec > 0
          ? { ...prev, trimEnd: result.durationSec }
          : prev,
      );
    } catch (err: any) {
      if (gen !== analyzeGen.current) return;
      setAnalysis(null);
      setAnalysisError(err?.message || 'Could not analyze this video');
    } finally {
      if (gen === analyzeGen.current) setAnalyzing(false);
    }
  }, []);

  const applySelectedFile = useCallback((selected: File, previousFile: File | null) => {
    if (!isLikelyVideoFile(selected)) {
      toast.error('Only video files are allowed for Reels');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setDurationLabel('');
    setThumbnail('');
    setUploadError(null);
      setAnalysis(null);
      setAnalysisError(null);
      setEditState(createReelEditState());
      const autoTitle = titleFromUploadName(selected.name);
    if (autoTitle) {
      setPublishSettings((prev) => {
        const prevAuto = previousFile ? titleFromUploadName(previousFile.name) : '';
        const titleBlank = !prev.title.trim();
        const titleWasPrevFile = prevAuto && prev.title.trim() === prevAuto;
        if (!titleBlank && !titleWasPrevFile) return prev;
        return { ...prev, title: autoTitle };
      });
    }
    void runAnalysis(selected);
  }, [preview, runAnalysis]);

  const suggestAiTitleStep1 = useCallback(async () => {
    if (!token) {
      toast.error('Sign in to use AI suggestions');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate a short, viral, punchy title (max 60 chars) for a short-form vertical video reel. Caption or context: ${publishSettings.description || 'trending reel'}. Respond with just the title, no quotes.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const text = (data.post || data.content || data.text || '').trim().replace(/^["']|["']$/g, '');
      if (text) {
        setPublishSettings((prev) => ({ ...prev, title: text.slice(0, 200) }));
        toast.success('AI title suggested');
      } else {
        toast.error('Could not generate title');
      }
    } catch {
      toast.error('Could not generate title');
    } finally {
      setAiLoading(false);
    }
  }, [token, publishSettings.description]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Always clear so the next Replace can fire onChange even for the same file.
    e.target.value = '';
    if (!selected) return;
    applySelectedFile(selected, file);
  };

  const onDropVideo = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    applySelectedFile(dropped, file);
  }, [applySelectedFile, file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Re-analyze when restoring a draft file without analysis.
  useEffect(() => {
    if (!isOpen || !file || analysis || analyzing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void runAnalysis(file);
  }, [isOpen, file, analysis, analyzing, runAnalysis]);

  const persistDraft = useCallback(async () => {
    await saveVideoPublishDraft({
      publishSettings,
      caption: publishSettings.description,
      mentions,
      privacy: publishSettings.visibilityType,
      autoPostToFeed,
      taggedProductIds: taggedProducts.map((p) => p.id),
      scheduleMode,
      scheduleDate,
      scheduleTime,
      timezone,
      step,
      workflowVersion: 6,
      thumbnailDataUrl: thumbnail,
      fileName: file?.name || '',
      savedAt: new Date().toISOString(),
      file,
      videoAnalysis: analysis
        ? {
            width: analysis.width,
            height: analysis.height,
            durationSec: analysis.durationSec,
            fps: analysis.fps,
            aspectLabel: analysis.aspectLabel,
            orientation: analysis.orientation,
            qualityTier: analysis.qualityTier,
            hasAudio: analysis.hasAudio,
            fileSize: analysis.fileSize,
            mimeType: analysis.mimeType,
            fileName: analysis.fileName,
          }
        : null,
      editState,
    });
    setDraftSavedAt(new Date().toISOString());
  }, [publishSettings, mentions, autoPostToFeed, taggedProducts, scheduleMode, scheduleDate, scheduleTime, timezone, step, thumbnail, file, analysis, editState]);

  useEffect(() => {
    if (!isOpen) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      persistDraft().catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(t);
  }, [isOpen, persistDraft]);

  const composedSettings = useMemo((): CreatorPublishSettings => {
    const scheduled =
      scheduleMode === 'schedule' && scheduleDate && scheduleTime
        ? wallClockToIso(scheduleDate, scheduleTime, timezone)
        : '';
    return {
      ...publishSettings,
      description: publishSettings.description,
      scheduledPublishAt: scheduled,
    };
  }, [publishSettings, scheduleMode, scheduleDate, scheduleTime, timezone]);

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setLoading(false);
    setUploadError('Upload cancelled. Your original file is still safe.');
  }, []);

  const setStepStatus = useCallback((id: string, status: ProcessStep['status']) => {
    setProcessSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  const submit = async (mode: 'publish' | 'schedule') => {
    if (!file) {
      toast.error('Upload a video first');
      setStep(1);
      return;
    }
    if (mode === 'schedule' && (!scheduleDate || !scheduleTime)) {
      toast.error('Choose a date and time to schedule');
      setStep(2);
      setMoreOpen(true);
      return;
    }
    setLoading(true);
    setProcessing(true);
    setUploadError(null);
    pendingRetryMode.current = mode;
    const abort = new AbortController();
    uploadAbortRef.current = abort;

    const initialSteps: ProcessStep[] = [
      { id: 'prepare', label: 'Preparing video', status: 'active' },
      { id: 'upload', label: 'Uploading', status: 'pending' },
      { id: 'process', label: 'Processing video', status: 'pending' },
      { id: 'thumb', label: 'Generating thumbnail', status: 'pending' },
      { id: 'publish', label: mode === 'schedule' ? 'Scheduling' : 'Publishing', status: 'pending' },
    ];
    setProcessSteps(initialSteps);

    try {
      const uploadFile = file;
      const trimEnd = editState.trimEnd;
      const needsTrim =
        editState.trimStart > 0.05 ||
        (trimEnd != null && analysis?.durationSec != null && trimEnd < analysis.durationSec - 0.05);
      setStepStatus('prepare', 'done');
      setStepStatus('upload', 'active');

      let directUploadedUrl: string | null = null;
      try {
        const directResult = await uploadDirectMedia(
          uploadFile,
          token,
          mode === 'schedule' ? 'Scheduling reel' : 'Uploading reel',
          { signal: abort.signal },
        );
        directUploadedUrl = directResult.publicUrl;
      } catch (err: any) {
        if (abort.signal.aborted) throw err;
        console.warn('[Direct Reel Upload falling back to multipart]', err?.message);
      }

      const formData = new FormData();
      if (directUploadedUrl) {
        formData.append('videoUrl', directUploadedUrl);
      } else {
        formData.append('video', uploadFile);
      }
      const caption = composedSettings.description || composedSettings.title;
      formData.append('caption', caption);
      formData.append('hashtags', composedSettings.hashtags);

      if (mentions.trim()) {
        const mentionList = mentions.split(',').map((m) => m.trim()).filter(Boolean);
        formData.append('mentions', JSON.stringify(mentionList));
      }
      if (taggedProducts.length) {
        formData.append('productIds', JSON.stringify(taggedProducts.map((p) => p.id)));
      }
      formData.append('autoPostToFeed', autoPostToFeed ? 'true' : 'false');
      if (analysis) {
        formData.append(
          'videoAnalysis',
          JSON.stringify({
            width: analysis.width,
            height: analysis.height,
            durationSec: analysis.durationSec,
            fps: analysis.fps,
            aspectLabel: analysis.aspectLabel,
            orientation: analysis.orientation,
            qualityTier: analysis.qualityTier,
            mimeType: analysis.mimeType,
          }),
        );
        if (analysis.durationSec > 0) {
          formData.append('durationSec', String(analysis.durationSec));
        }
      }

      const editPayload = editState;
      formData.append('editState', JSON.stringify(editPayload));
      formData.append('needsHeavyProcess', editNeedsHeavyProcess(editPayload) ? 'true' : 'false');
      if (editState.coverDataUrl) {
        formData.append('coverDataUrl', editState.coverDataUrl);
      }
      if (editState.music) {
        formData.append('reelMusic', JSON.stringify(editState.music));
      }

      const merged = {
        ...composedSettings,
        scheduledPublishAt: mode === 'schedule' ? composedSettings.scheduledPublishAt : '',
      };
      formData.append('privacy', merged.visibilityType);
      if (mode === 'schedule' && merged.scheduledPublishAt) {
        formData.append('scheduledFor', merged.scheduledPublishAt);
        formData.append('status', 'scheduled');
      }
      appendPublishSettings(formData, merged);

      let res: Response;
      if (directUploadedUrl) {
        res = await fetch('/api/reels', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: abort.signal,
        });
      } else {
        res = await uploadWithProgress(
          '/api/reels',
          formData,
          token,
          `reel-${Date.now()}`,
          mode === 'schedule' ? 'Scheduling reel' : 'Uploading reel',
          { signal: abort.signal },
        );
      }

      if (res.ok) {
        setStepStatus('upload', 'done');
        setStepStatus('process', 'active');
        await new Promise((r) => setTimeout(r, 350));
        setStepStatus('process', 'done');
        setStepStatus('thumb', 'active');
        await new Promise((r) => setTimeout(r, 250));
        setStepStatus('thumb', 'done');
        setStepStatus('publish', 'done');
        toast.success(mode === 'schedule' ? 'Reel scheduled' : 'Reel published');
        await clearVideoPublishDraft();
        await new Promise((r) => setTimeout(r, 600));
        resetForm();
        onSuccess();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || 'Your video couldn\'t be uploaded. Your original file is still safe. Try again.';
        setStepStatus('upload', 'error');
        setUploadError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      if (err?.message === 'Upload cancelled') {
        setProcessSteps((prev) => prev.map((s) => (s.status === 'active' ? { ...s, status: 'pending' } : s)));
        toast('Upload cancelled', { icon: '⏹' });
        setProcessing(false);
        setUploadError('Upload cancelled. Your original file is still safe.');
      } else {
        const msg = err?.message || 'Upload failed — check your connection and try again';
        setUploadError(msg);
        setProcessSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s)),
        );
        toast.error(msg);
      }
    } finally {
      uploadAbortRef.current = null;
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    await persistDraft();
    toast.success('Draft saved');
  };

  const canContinue = step > 1 || !!file;
  const isReview = step === 3;
  const progress = (step / STEPS.length) * 100;

  const goEdit = (target: ReviewEditTarget) => {
    setEditTarget(target);
    if (target === 'content') {
      setMoreOpen(false);
      setStep(1);
      return;
    }
    if (target === 'more') setMoreOpen(true);
    setStep(2);
  };

  useEffect(() => {
    if (!editTarget) return;
    const id = `publish-section-${editTarget}`;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setEditTarget(null);
    }, 80);
    return () => window.clearTimeout(t);
  }, [editTarget, step, moreOpen]);

  const extras = (
    <div className="space-y-4 pt-2">
      <div>
        <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          <Users size={12} /> Mentions
        </label>
        <input
          type="text"
          value={mentions}
          onChange={(e) => setMentions(e.target.value)}
          placeholder="@username (comma separated)"
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={autoPostToFeed} onChange={(e) => setAutoPostToFeed(e.target.checked)} className="rounded" />
        Also post this reel to my feed
      </label>
    </div>
  );

  const productTagger = (
    <div>
      <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        <ShoppingBag size={12} /> Tag products
      </label>
      <p className="text-[11px] text-muted-foreground mb-2">Shop items you promote earn affiliate coins when someone buys.</p>
      {taggedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {taggedProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTaggedProducts((prev) => prev.filter((x) => x.id !== p.id))}
              className="px-2 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center gap-1"
            >
              {p.title} <X size={11} />
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={productQuery}
        onChange={(e) => setProductQuery(e.target.value)}
        placeholder="Search marketplace…"
        className={inputClass}
      />
      <div className="mt-1 max-h-28 overflow-y-auto space-y-1">
        {productHits
          .filter((p) => !taggedProducts.some((t) => t.id === p.id))
          .slice(0, 6)
          .map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={taggedProducts.length >= 3}
              onClick={() => setTaggedProducts((prev) => [...prev, p].slice(0, 3))}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-xs flex items-center justify-between"
            >
              <span className="truncate">{p.title}</span>
              <span className="text-muted-foreground shrink-0">৳{p.price || 0}</span>
            </button>
          ))}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Creator Studio"
          data-variant={variant}
          className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-background text-foreground shadow-none"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            maxWidth: '100vw',
            maxHeight: '100dvh',
            zIndex: 200,
            borderRadius: 0,
          }}
        >
          {/* TOP STUDIO HEADER */}
          <header className="shrink-0 px-4 md:px-8 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border bg-card z-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 -ml-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Exit Creator Studio"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Creator Studio</p>
                <h2 className="text-base md:text-lg font-extrabold text-foreground truncate">
                  {step === 1 ? 'Upload reel' : step === 2 ? 'Edit reel' : 'Review & publish'}
                </h2>
              </div>
            </div>

            {/* STEPPER PILLS */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {STEPS.map((s) => {
                const active = step === s.n;
                const done = s.n < step;
                return (
                  <button
                    key={s.n}
                    type="button"
                    disabled={s.n > 1 && !file}
                    onClick={() => {
                      if (s.n > 1 && !file) return;
                      setStep(s.n);
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : done
                          ? 'bg-primary/15 text-primary hover:bg-primary/25'
                          : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {done ? (
                      <Check size={12} className="shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-extrabold">
                        {s.n}
                      </span>
                    )}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* DRAFT INDICATOR & CLOSE */}
            <div className="flex items-center gap-3 shrink-0">
              {draftSavedAt && (
                <span className="hidden md:inline text-[11px] text-muted-foreground">
                  Draft saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-muted/80 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* PROGRESS BAR */}
          <div className="h-1 bg-muted shrink-0 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* HIDDEN FILE INPUT */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi,.3gp"
            onChange={handleFileChange}
          />

          {/* RESUME DRAFT BANNER (TOP DISMISSIBLE) */}
          {resumePrompt && !processing && (
            <div className="shrink-0 px-4 md:px-8 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span>Continue editing your previous Reel draft?</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-border text-[11px] font-bold hover:bg-muted"
                  onClick={async () => {
                    await clearVideoPublishDraft();
                    resetForm();
                    setResumePrompt(false);
                  }}
                >
                  Discard draft
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold"
                  onClick={() => setResumePrompt(false)}
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setResumePrompt(false)}
                  className="p-1 text-muted-foreground hover:text-foreground ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* MAIN WORKSPACE */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {processing ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <ReelProcessingScreen
                    steps={processSteps}
                    title={loading ? 'Preparing your Reel…' : uploadError ? 'Upload interrupted' : 'Preparing your Reel…'}
                    subtitle={loading ? 'Please keep this window open while the file uploads.' : undefined}
                    error={uploadError}
                    onRetry={() => {
                      setProcessing(true);
                      void submit(pendingRetryMode.current || 'publish');
                    }}
                    onDismiss={() => {
                      setProcessing(false);
                      setUploadError(null);
                      setStep(3);
                    }}
                  />
                </div>
              </div>
            ) : step === 2 ? (
              /* STEP 2: IMMERSIVE FULL-SCREEN VIDEO EDITOR */
              <div className="flex-1 min-h-0 w-full h-full p-2.5 md:p-5 overflow-hidden flex flex-col">
                <ReelFullscreenEditor
                  previewUrl={preview}
                  durationSec={analysis?.durationSec || 0}
                  edit={editState}
                  onChange={setEditState}
                  publishSettings={publishSettings}
                  onPublishSettings={setPublishSettings}
                  thumbnail={thumbnail}
                  onThumbnail={(url) => setThumbnail(url)}
                />
              </div>
            ) : step === 3 ? (
              /* STEP 3: REVIEW & PUBLISH */
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6 pb-8">
                  <div>
                    <h3 className="text-xl font-extrabold mb-1">Review & Publish</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Check your video, caption, thumbnail, and settings before publishing.
                    </p>
                  </div>
                  {analysis && (
                    <div>
                      <ReelVideoInfoCard analysis={analysis} />
                    </div>
                  )}
                  {(editState.filterPreset !== 'none' || editState.music || editState.trimStart > 0) && (
                    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Edits (preview)</p>
                      {editState.trimStart > 0 || editState.trimEnd != null ? (
                        <p>
                          Trim {formatDurationLabel(editState.trimStart)}–
                          {formatDurationLabel(editState.trimEnd ?? analysis?.durationSec ?? 0)}
                        </p>
                      ) : null}
                      {editState.filterPreset !== 'none' && <p>Filter: {editState.filterPreset}</p>}
                      {editState.music && <p>Music: {editState.music.title}</p>}
                      {editNeedsHeavyProcess(editState) && (
                        <p className="text-amber-600 dark:text-amber-400">Will process on publish (Phase 3 bake)</p>
                      )}
                    </div>
                  )}
                  {uploadError && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 space-y-2">
                      <p className="text-sm text-rose-600 dark:text-rose-400">{uploadError}</p>
                      <button
                        type="button"
                        disabled={loading || !file}
                        onClick={() => submit(pendingRetryMode.current || 'publish')}
                        className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
                      >
                        Retry upload
                      </button>
                    </div>
                  )}
                  <PublishReviewCard
                    preview={preview}
                    thumbnail={thumbnail}
                    settings={composedSettings}
                    scheduleMode={scheduleMode}
                    scheduleDate={scheduleDate}
                    scheduleTime={scheduleTime}
                    timezone={timezone}
                    onEdit={goEdit}
                  />
                </div>
              </div>
            ) : (
              /* STEP 1: UPLOAD & DETAILS (2-COLUMN THEATER STUDIO) */
              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                {/* Left Column: Preview Theater / Dropzone */}
                <div
                  className={`w-full md:w-[45%] lg:w-[42%] bg-neutral-950 relative flex items-center justify-center border-b md:border-b-0 md:border-r border-border shrink-0 overflow-hidden ${
                    !preview ? 'min-h-[58dvh] md:min-h-0 md:h-full' : 'h-[28vh] md:h-full'
                  } ${dragOver ? 'ring-2 ring-inset ring-primary' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                  onDrop={onDropVideo}
                >
                  {preview ? (
                    <>
                      <video
                        key={preview}
                        ref={videoRef}
                        src={preview}
                        controls
                        autoPlay={!file || file.size < 80 * 1024 * 1024}
                        preload="metadata"
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => {
                          const el = e.currentTarget;
                          const d = el.duration;
                          if (Number.isFinite(d) && d > 0 && !durationLabel) {
                            setDurationLabel(formatDurationLabel(d));
                          }
                          const grab = () => {
                            const shot = captureThumbnail(el);
                            if (shot) setThumbnail(shot);
                          };
                          if (el.currentTime > 0.1) grab();
                          else {
                            el.currentTime = Math.min(0.4, (el.duration || 1) * 0.05);
                            el.addEventListener('seeked', grab, { once: true });
                          }
                        }}
                      />
                      {file && (
                        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                          <div className="min-w-0 flex-1 text-[11px] text-white/90 bg-black/60 backdrop-blur rounded-lg px-2.5 py-1.5 truncate">
                            {file.name} · {formatBytes(file.size)}{durationLabel ? ` · ${durationLabel}` : ''}
                            {analysis?.qualityTier && analysis.qualityTier !== 'unknown' ? ` · ${analysis.qualityTier}` : ''}
                          </div>
                          <button
                            type="button"
                            onClick={openVideoPicker}
                            className="shrink-0 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-black hover:bg-white shadow"
                          >
                            Replace
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center px-6 py-10 overflow-hidden">
                      {/* ambient glow */}
                      <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
                      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-fuchsia-600/25 blur-3xl" />
                      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
                      <div className={`relative w-full max-w-sm text-center rounded-3xl border-2 border-dashed p-7 sm:p-8 transition-colors ${dragOver ? 'border-primary bg-primary/10' : 'border-white/15 bg-white/[0.03]'}`}>
                        <div className="relative mx-auto mb-5 h-20 w-20">
                          <span className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 opacity-60 blur-md animate-pulse" />
                          <span className="relative flex h-full w-full items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-white shadow-xl">
                            <UploadCloud size={34} strokeWidth={2.2} />
                          </span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">New Reel</p>
                        <h3 className="text-2xl font-extrabold tracking-tight text-white mb-2">Create something amazing</h3>
                        <p className="text-neutral-400 text-xs sm:text-sm mb-6 leading-relaxed">
                          {dragOver ? 'Drop it here to start editing.' : 'Pick a video from your gallery or drag & drop it here. Vertical 9:16 looks best.'}
                        </p>
                        <button
                          type="button"
                          onClick={openVideoPicker}
                          className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-purple-900/40 hover:scale-[1.03] active:scale-[0.98] transition-transform"
                        >
                          <Video size={17} />
                          Select Video File
                        </button>
                        <p className="mt-3 text-[11px] text-neutral-500">MP4 · MOV · WebM · M4V</p>
                        <ol className="mt-7 grid grid-cols-4 gap-2 text-left">
                          {[
                            { icon: Video, label: 'Pick' },
                            { icon: Scissors, label: 'Edit' },
                            { icon: Type, label: 'Details' },
                            { icon: Send, label: 'Publish' },
                          ].map(({ icon: Icon, label }, idx) => (
                            <li key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] border border-white/10 py-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/90"><Icon size={14} /></span>
                              <span className="text-[10px] font-semibold text-white/70">{idx + 1}. {label}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Details Form (Title & Description First) */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
                  <div id="publish-section-content" className="max-w-2xl mx-auto space-y-6 pb-8 scroll-mt-2">
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">Reel Information & Media</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Title and description first, followed by your video file and options.
                      </p>
                    </div>

                    {/* 1. TITLE & DESCRIPTION (FIRST) */}
                    <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 md:p-5 shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <FieldLabel>Title *</FieldLabel>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={aiLoading}
                              onClick={suggestAiTitleStep1}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline disabled:opacity-40"
                            >
                              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                              Suggest with AI
                            </button>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {publishSettings.title.length}/200
                            </span>
                          </div>
                        </div>
                        <input
                          value={publishSettings.title}
                          onChange={(e) => setPublishSettings({ ...publishSettings, title: e.target.value })}
                          placeholder="Give this upload a catchy title..."
                          className={inputClass}
                          maxLength={200}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <FieldLabel>Description / Caption</FieldLabel>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {publishSettings.description.length} characters
                          </span>
                        </div>
                        <textarea
                          value={publishSettings.description}
                          onChange={(e) => setPublishSettings({ ...publishSettings, description: e.target.value })}
                          placeholder="Tell viewers what this reel is about... Add #hashtags, context, or @mentions"
                          className={`${inputClass} min-h-[110px] resize-none leading-relaxed`}
                        />
                      </div>
                    </div>

                    {/* 2. VIDEO FILE UPLOAD */}
                    <section className="space-y-3">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Video File</h4>
                      {file ? (
                        <div
                          className={`rounded-2xl border p-4 space-y-3 ${dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/40'}`}
                          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                          onDrop={onDropVideo}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                              <Video size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(file.size)}
                                {durationLabel ? ` · ${durationLabel}` : ''}
                                {file.type ? ` · ${file.type}` : ''}
                              </p>
                            </div>
                          </div>
                          <ReelVideoInfoCard analysis={analysis} analyzing={analyzing} error={analysisError} />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={openVideoPicker}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                            >
                              <UploadCloud size={14} />
                              Replace video
                            </button>
                            <button
                              type="button"
                              onClick={clearSelectedVideo}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
                            >
                              <X size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={openVideoPicker}
                          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                          onDrop={onDropVideo}
                          className={`w-full rounded-2xl border border-dashed p-6 flex flex-col items-center gap-2 transition-colors ${
                            dragOver
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <UploadCloud size={24} />
                          </div>
                          <span className="text-sm font-bold text-foreground">Select or drop a video</span>
                          <span className="text-[11px] text-muted-foreground text-center max-w-xs">
                            MP4, MOV, WebM, M4V · Vertical (9:16) format works best
                          </span>
                        </button>
                      )}
                    </section>

                    {/* 3. DETECTED QUALITY SELECTOR */}
                    {(file || analyzing) && (
                      <ReelQualitySelector
                        value={publishSettings}
                        onChange={setPublishSettings}
                        analysis={analysis}
                      />
                    )}

                    {/* 4. THUMBNAIL PREVIEW */}
                    <section className="space-y-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Thumbnail Preview</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-32 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                          {thumbnail ? (
                            <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled={!preview}
                            onClick={() => {
                              const el = videoRef.current;
                              if (!el) return;
                              const shot = captureThumbnail(el);
                              if (shot) setThumbnail(shot);
                            }}
                            className="px-3 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-40 hover:bg-muted"
                          >
                            Capture current frame
                          </button>
                          <p className="text-[11px] text-muted-foreground">
                            You can also pick custom cover frames in the next Edit step.
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* 5. CONTENT CATEGORY & TAGS */}
                    <StepContentDetails
                      value={publishSettings}
                      onChange={setPublishSettings}
                      hideTitleDescription
                    />

                    {/* 6. ADVANCED OPTIONS (SCHEDULE, SAFETY, DISCLOSURE, MONETIZATION) */}
                    <details
                      id="publish-section-more"
                      className="rounded-2xl border border-border bg-card/60 px-4 py-3 scroll-mt-2"
                      open={moreOpen}
                      onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}
                    >
                      <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Advanced Options (Schedule, Safety, Disclosure, Monetization)</span>
                        <span className="text-xs font-bold text-primary">{moreOpen ? 'Hide' : 'Expand'}</span>
                      </summary>
                      <div className="pt-4 mt-3 border-t border-border space-y-6">
                        <section id="publish-section-schedule" className="space-y-3 scroll-mt-2">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Publishing Schedule</h4>
                          <StepPublishingOptions
                            value={publishSettings}
                            onChange={setPublishSettings}
                            scheduleMode={scheduleMode}
                            onScheduleMode={setScheduleMode}
                            scheduleDate={scheduleDate}
                            scheduleTime={scheduleTime}
                            timezone={timezone}
                            onScheduleDate={setScheduleDate}
                            onScheduleTime={setScheduleTime}
                            onTimezone={setTimezone}
                            showProfileOptions={false}
                            showHeading={false}
                          />
                        </section>
                        <section id="publish-section-disclosure" className="space-y-3 scroll-mt-2">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Content Disclosure</h4>
                          <StepContentDisclosure value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        <section id="publish-section-safety" className="space-y-3 scroll-mt-2">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Safety</h4>
                          <StepSafety value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Accessibility</h4>
                          <StepAccessibility value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Monetization</h4>
                          <StepMonetization value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Copyright</h4>
                          <StepCopyright value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Profile Options</h4>
                          <StepProfileOptions value={publishSettings} onChange={setPublishSettings} />
                        </section>
                        {extras}
                        {productTagger}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* BOTTOM STUDIO ACTION FOOTER */}
          <footer className="shrink-0 px-4 md:px-8 py-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] border-t border-border flex items-center justify-between gap-3 bg-card/95 backdrop-blur z-20">
            <button
              type="button"
              onClick={() => {
                if (loading) {
                  cancelUpload();
                  return;
                }
                if (processing) {
                  setProcessing(false);
                  return;
                }
                if (step === 1) onClose();
                else setStep((s) => Math.max(1, s - 1));
              }}
              className="px-4 py-2 rounded-full border border-border text-xs sm:text-sm font-bold hover:bg-muted flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft size={15} /> {loading ? 'Cancel upload' : processing ? 'Back to review' : step === 1 ? 'Cancel' : 'Back'}
            </button>

            {processing ? (
              <span className="text-xs text-muted-foreground font-medium">{loading ? 'Uploading…' : 'Ready'}</span>
            ) : isReview ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={loading}
                  className="px-4 py-2 rounded-full border border-border text-xs sm:text-sm font-bold hover:bg-muted flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={15} /> Save Draft
                </button>
                <button
                  type="button"
                  disabled={loading || !file}
                  onClick={() => submit('schedule')}
                  className="px-4 py-2 rounded-full border border-border text-xs sm:text-sm font-bold hover:bg-muted flex items-center gap-1.5 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Schedule
                </button>
                <button
                  type="button"
                  disabled={loading || !file}
                  onClick={() => submit('publish')}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md hover:opacity-95 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publish Now
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canContinue || analyzing}
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                {step === 2 ? 'Review & Publish' : 'Continue to Edit'} <ArrowRight size={15} />
              </button>
            )}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
