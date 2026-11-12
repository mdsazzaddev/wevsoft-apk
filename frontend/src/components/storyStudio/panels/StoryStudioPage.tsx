import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Image as ImageIcon, Layers, SlidersHorizontal, Smile, Type, X, Camera, Video, MessageSquare, BarChart2 } from 'lucide-react';
import { useStore } from '../../../store';
import ImageEditorModal from '../../profile/ImageEditorModal';
import StoryCreator from '../../social/StoryCreator';
import { createEditorState, reduce, selectedOverlay, selectedSlide } from '../model/projectReducer';
import { draftKey, parseDraft, serializeDraft, toStudioConfig } from '../model/serialize';
import { slideAtTime, slideOffsets, totalDuration } from '../model/timing';
import { MAX_SLIDES, newMediaSlide, newPollOverlay, newProject, newSticker, newTextOverlay, newTextSlide, newPollSlide, type Slide, type SlideMedia } from '../model/types';
import { ensureStudioFonts } from '../render/fonts';
import CanvasStage from './CanvasStage';
import { ConfirmDialog, PreviewOverlay, ShortcutsDialog } from './Dialogs';
import IconRail from './IconRail';
import Inspector from './Inspector';
import LeftPanel from './LeftPanel';
import Timeline from './Timeline';
import TopBar, { type PublishProgress } from './TopBar';
import { StudioCtx, type InspectorTab, type LeftTab, type LibraryItem, type SaveStatus, type Studio, type Tool } from './StudioContext';

const STYLE = `
.ss-root{--ss-bg:#f4f7fc;--ss-panel:#ffffff;--ss-border:#e3e9f3;--ss-text:#14213d;--ss-muted:#6a7893;--ss-accent:#2563eb;--ss-accent-soft:#e8f0ff;--ss-field:#f6f8fc;--ss-hover:#eef2f9;--ss-toggle-off:#d3dae8;--ss-stage:#f4f7fc;color-scheme:light}
html.dark .ss-root{--ss-bg:#0b0f17;--ss-panel:#131a26;--ss-border:rgba(255,255,255,.09);--ss-text:#e9eef7;--ss-muted:#8d9ab2;--ss-accent:#5b95ff;--ss-accent-soft:rgba(91,149,255,.16);--ss-field:#0f1520;--ss-hover:rgba(255,255,255,.06);--ss-toggle-off:#2a3446;--ss-stage:#0b0f17;color-scheme:dark}
html.oled .ss-root{--ss-bg:#000;--ss-panel:#06070a;--ss-border:rgba(255,255,255,.11);--ss-field:#0b0c10;--ss-stage:#000;--ss-hover:rgba(255,255,255,.07)}
.ss-root{background:var(--ss-bg);color:var(--ss-text);font-family:Inter,system-ui,sans-serif}
.ss-scroll{scrollbar-width:thin;scrollbar-color:rgba(128,138,160,.45) transparent}
.ss-scroll::-webkit-scrollbar{width:6px;height:6px}.ss-scroll::-webkit-scrollbar-thumb{background:rgba(128,138,160,.45);border-radius:99px}
.ss-range{-webkit-appearance:none;appearance:none;height:18px;background:transparent;cursor:pointer}
.ss-range::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:linear-gradient(90deg,var(--ss-accent) var(--ss-pct,0%),var(--ss-toggle-off) var(--ss-pct,0%))}
.ss-range::-moz-range-track{height:4px;border-radius:99px;background:var(--ss-toggle-off)}.ss-range::-moz-range-progress{height:4px;border-radius:99px;background:var(--ss-accent)}
.ss-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:var(--ss-accent);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.ss-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:var(--ss-accent);border:2px solid #fff}
.ss-range:focus-visible{outline:2px solid var(--ss-accent);outline-offset:2px;border-radius:6px}.ss-range:disabled{opacity:.45;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){.ss-root *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;

function useLayout(): 'mobile' | 'tablet' | 'desktop' {
  const get = () => (typeof window === 'undefined' ? 'desktop' : window.matchMedia('(min-width:1180px)').matches ? 'desktop' : window.matchMedia('(min-width:768px)').matches ? 'tablet' : 'mobile');
  const [l, setL] = useState<'mobile' | 'tablet' | 'desktop'>(get);
  useEffect(() => {
    const a = window.matchMedia('(min-width:1180px)');
    const b = window.matchMedia('(min-width:768px)');
    const h = () => setL(get());
    a.addEventListener('change', h);
    b.addEventListener('change', h);
    return () => {
      a.removeEventListener('change', h);
      b.removeEventListener('change', h);
    };
  }, []);
  return l;
}

function probeVideoDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    let done = false;
    const fin = (d?: number) => {
      if (done) return;
      done = true;
      v.removeAttribute('src');
      v.load();
      resolve(d);
    };
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : undefined);
    v.onerror = () => fin(undefined);
    window.setTimeout(() => fin(undefined), 6000);
    v.src = url;
  });
}

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

const MAX_FILE_MB = 150;

export default function StoryStudioPage() {
  const token = useStore((st) => st.token);
  const user = useStore((st) => st.user) as any;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const spaceId = params.get('space') || undefined;
  const spaceName = params.get('name') || undefined;
  const layout = useLayout();
  const key = draftKey(user?.id, spaceId);

  const [recovered, setRecovered] = useState<number | null>(null);
  const [state, dispatch] = useReducer(reduce, undefined, () => {
    try {
      const draft = parseDraft(localStorage.getItem(key));
      if (draft && draft.doc.slides.length) return createEditorState(draft.doc);
    } catch {
      /* ignore */
    }
    return createEditorState(newProject());
  });
  const slide = selectedSlide(state);
  const overlay = selectedOverlay(state);
  const slides = state.doc.slides;

  // ---- ui state
  const [leftTab, setLeftTab] = useState<LeftTab>('media');
  const [leftOpen, setLeftOpen] = useState(layout === 'desktop');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('edit');
  const [inspectorOpen, setInspectorOpen] = useState(layout === 'desktop');
  const [tool, setTool] = useState<Tool>('select');
  const [safeArea, setSafeArea] = useState(true);
  const [guides, setGuides] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [compare, setCompare] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [dialog, setDialog] = useState<null | 'shortcuts' | 'leave' | 'discard' | 'preview' | 'classic'>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // First-time choice modal: show on first visit with no slides and no recovered draft
  const [showWelcomeChoice, setShowWelcomeChoice] = useState(false);
  const layoutPrev = useRef(layout);
  useEffect(() => {
    if (layoutPrev.current !== layout) {
      layoutPrev.current = layout;
      setLeftOpen(layout === 'desktop');
      setInspectorOpen(layout === 'desktop');
    }
  }, [layout]);
  useEffect(() => ensureStudioFonts(), []);

  // ---- autosave (this device)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSavedRev = useRef(0);
  const docRef = useRef(state.doc);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  docRef.current = state.doc;
  const flush = useCallback(() => {
    try {
      if (docRef.current.slides.length) localStorage.setItem(key, serializeDraft(docRef.current));
      else localStorage.removeItem(key);
      setSavedAt(Date.now());
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [key]);
  useEffect(() => {
    if (state.rev === lastSavedRev.current) return;
    lastSavedRev.current = state.rev;
    setSaveStatus('saving');
    const t = window.setTimeout(flush, 450);
    return () => window.clearTimeout(t);
  }, [state.rev, flush]);
  useEffect(() => {
    const draft = (() => {
      try {
        return parseDraft(localStorage.getItem(key));
      } catch {
        return null;
      }
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (draft && draft.doc.slides.length) setRecovered(draft.savedAt || Date.now());
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      flush();
    };
     
  }, []);

  // ---- first-time welcome choice modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const welcomeKey = `wev_story_welcome_${user?.id || 'anon'}_${spaceId || 'personal'}`;
    const hasSeenWelcome = localStorage.getItem(welcomeKey);
    const hasSlides = slides.length > 0;
    const hasRecoveredDraft = recovered !== null;
    if (!hasSeenWelcome && !hasSlides && !hasRecoveredDraft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
      setShowWelcomeChoice(true);
    }
  }, [slides.length, recovered, user?.id, spaceId]);

  const markWelcomeSeen = useCallback(() => {
    if (typeof window === 'undefined') return;
    const welcomeKey = `wev_story_welcome_${user?.id || 'anon'}_${spaceId || 'personal'}`;
    localStorage.setItem(welcomeKey, '1');
    setShowWelcomeChoice(false);
  }, [user?.id, spaceId]);

  // ---- media library
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const auth = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const reloadLibrary = useCallback(() => {
    setLibraryLoading(true);
    setLibraryError(null);
    fetch('/api/media', { headers: auth })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load your media');
        const rows = (await r.json()) as any[];
        setLibrary(
          rows
            .filter((m) => (m.type === 'image' || m.type === 'video') && m.path)
            .map((m) => ({ id: m.id, url: m.path, type: m.type, name: m.originalName || m.filename || 'media', size: m.size, createdAt: m.createdAt })),
        );
      })
      .catch((e) => setLibraryError(e?.message || 'Could not load your media'))
      .finally(() => setLibraryLoading(false));
  }, [auth]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (token) reloadLibrary();
    else setLibraryLoading(false);
  }, [token, reloadLibrary]);

  // Re-encoded videos move to a new URL: keep slides pointed at the live file.
  useEffect(() => {
    if (!library.length) return;
    const urls: Record<string, string> = {};
    for (const m of library) urls[m.id] = m.url;
    const stale = stateRef.current.doc.slides.some((sl) => sl.media?.mediaId && urls[sl.media.mediaId] && urls[sl.media.mediaId] !== sl.media.url);
    if (stale) dispatch({ type: 'refreshMediaUrls', urls });
  }, [library]);

  const slidesLenRef = useRef(slides.length);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  slidesLenRef.current = slides.length;

  const addMediaSlide = useCallback(
    async (media: SlideMedia) => {
      if (slidesLenRef.current >= MAX_SLIDES) {
        toast.error(`A story can have up to ${MAX_SLIDES} slides`);
        return;
      }
      let m = media;
      if (m.type === 'video' && !m.naturalDuration) m = { ...m, naturalDuration: await probeVideoDuration(m.url) };
      dispatch({ type: 'addSlide', slide: newMediaSlide(m) });
      slidesLenRef.current += 1;
    },
    [],
  );

  const importFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      list.forEach(async (file) => {
        const isImg = file.type.startsWith('image/');
        const isVid = file.type.startsWith('video/');
        if (!isImg && !isVid) {
          toast.error(`"${file.name}" is not an image or video`);
          return;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`"${file.name}" is larger than ${MAX_FILE_MB} MB`);
          return;
        }
        setUploading((n) => n + 1);
        try {
          let naturalDuration: number | undefined;
          if (isVid) {
            const blobUrl = URL.createObjectURL(file);
            naturalDuration = await probeVideoDuration(blobUrl);
            URL.revokeObjectURL(blobUrl);
          }
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/media/upload', { method: 'POST', headers: auth, body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload failed');
          }
          const m = await res.json();
          const item: LibraryItem = { id: m.id, url: m.path, type: isVid ? 'video' : 'image', name: m.originalName || file.name, size: m.size, createdAt: m.createdAt };
          setLibrary((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
          await addMediaSlide({ mediaId: m.id, url: m.path, type: item.type, name: item.name, naturalDuration });
          if (isVid) [7000, 20000].forEach((ms) => window.setTimeout(reloadLibrary, ms));
        } catch (e: any) {
          toast.error(e?.message || `Could not upload "${file.name}"`);
        } finally {
          setUploading((n) => n - 1);
        }
      });
    },
    [auth, addMediaSlide, reloadLibrary],
  );

  const addFromLibrary = useCallback((item: LibraryItem) => void addMediaSlide({ mediaId: item.id, url: item.url, type: item.type, name: item.name }), [addMediaSlide]);

  const addTextSlide = useCallback(() => {
    if (slidesLenRef.current >= MAX_SLIDES) return toast.error(`A story can have up to ${MAX_SLIDES} slides`);
    dispatch({ type: 'addSlide', slide: newTextSlide() });
    slidesLenRef.current += 1;
  }, []);

  // ---- welcome choice handlers
  const handleWelcomeMedia = useCallback(() => {
    // Open file picker for images/videos
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files?.length) importFiles(files);
    };
    input.click();
    markWelcomeSeen();
  }, [importFiles, markWelcomeSeen]);

  const handleWelcomeText = useCallback(() => {
    addTextSlide();
    markWelcomeSeen();
  }, [addTextSlide, markWelcomeSeen]);

  const handleWelcomePoll = useCallback(() => {
    if (slidesLenRef.current >= MAX_SLIDES) return toast.error(`A story can have up to ${MAX_SLIDES} slides`);
    dispatch({ type: 'addSlide', slide: newPollSlide() });
    slidesLenRef.current += 1;
    markWelcomeSeen();
  }, [markWelcomeSeen]);

  const stateRef = useRef(state);
  // eslint-disable-next-line react-hooks/immutability, react-hooks/refs -- intentional mutation/forward reference (existing behavior)
  stateRef.current = state;
  const ensureSlide = (): string | null => {
    const cur = selectedSlide(stateRef.current);
    if (cur) return cur.id;
    const sl = newTextSlide({ overlays: [] });
    dispatch({ type: 'addSlide', slide: sl });
    return sl.id;
  };

  const addText = useCallback((preset: 'heading' | 'subheading' | 'body' = 'subheading') => {
    const sid = ensureSlide();
    if (!sid) return;
    const cfg = preset === 'heading' ? { fontSize: 120, text: 'Heading', h: 220 } : preset === 'body' ? { fontSize: 56, text: 'Your text here', h: 130 } : { fontSize: 84, text: 'Your text', h: 180 };
    dispatch({ type: 'addOverlay', slideId: sid, overlay: newTextOverlay(cfg.text, { fontSize: cfg.fontSize, h: cfg.h, y: 800 }) });
    setInspectorTab('edit');
    if (layout !== 'desktop') setInspectorOpen(true);
    window.setTimeout(() => window.dispatchEvent(new Event('ss:focus-text')), 60);
     
  }, [layout]);

  const addSticker = useCallback((emoji: string) => {
    const sid = ensureSlide();
    if (sid) dispatch({ type: 'addOverlay', slideId: sid, overlay: newSticker(emoji) });
     
  }, []);

  const addPoll = useCallback(() => {
    const sid = ensureSlide();
    if (!sid) return;
    const cur = selectedSlide(stateRef.current);
    if (cur?.overlays.some((o) => o.kind === 'poll')) {
      toast.error('Only one poll sticker per story slide');
      const existing = cur.overlays.find((o) => o.kind === 'poll');
      if (existing) dispatch({ type: 'selectOverlay', id: existing.id });
      return;
    }
    const ov = newPollOverlay();
    dispatch({ type: 'addOverlay', slideId: sid, overlay: ov });
    dispatch({ type: 'selectOverlay', id: ov.id });
    setInspectorTab('edit');
    if (layout !== 'desktop') setInspectorOpen(true);
    setLeftTab('stickers');
  }, [layout]);

  const openImageEditor = useCallback(async () => {
    const cur = selectedSlide(stateRef.current);
    if (!cur?.media || cur.media.type !== 'image') return;
    try {
      const blob = await (await fetch(cur.media.url)).blob();
      setImageFile(new File([blob], cur.media.name || 'photo.jpg', { type: blob.type || 'image/jpeg' }));
    } catch {
      toast.error('Could not open this photo for editing');
    }
  }, []);

  const saveEditedImage = useCallback(
    async (edited: File) => {
      const cur = selectedSlide(stateRef.current);
      setImageFile(null);
      if (!cur) return;
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', edited);
        const res = await fetch('/api/media/upload', { method: 'POST', headers: auth, body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const m = await res.json();
        dispatch({ type: 'updateSlide', id: cur.id, patch: { media: { mediaId: m.id, url: m.path, type: 'image', name: m.originalName || edited.name }, zoom: 1, offsetX: 0, offsetY: 0, rotate: 0, flipH: false } });
        setLibrary((prev) => [{ id: m.id, url: m.path, type: 'image', name: m.originalName || edited.name, size: m.size, createdAt: m.createdAt }, ...prev]);
        toast.success('Photo updated');
      } catch (e: any) {
        toast.error(e?.message || 'Could not save the edited photo');
      } finally {
        setUploading((n) => n - 1);
      }
    },
    [auth],
  );

  // ---- playback (timeline <-> canvas)
  const [time, setTime] = useState(0);
  const [playing, setPlayingState] = useState(false);
  const total = useMemo(() => totalDuration(slides), [slides]);
  const offsets = useMemo(() => slideOffsets(slides), [slides]);
  const totalRef = useRef(total);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  totalRef.current = total;
  const slidesRef = useRef(slides);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  slidesRef.current = slides;
  const timeRef = useRef(0);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  timeRef.current = time;

  const seek = useCallback((t: number) => {
    const tt = Math.max(0, Math.min(totalRef.current, t));
    setTime(tt);
    const { index } = slideAtTime(slidesRef.current, tt);
    const sl = slidesRef.current[index];
    if (sl && sl.id !== stateRef.current.selectedSlideId) dispatch({ type: 'selectSlide', id: sl.id });
  }, []);

  const setPlaying = useCallback((v: boolean) => {
    if (v && timeRef.current >= totalRef.current - 0.05) {
      setTime(0);
      timeRef.current = 0;
      const first = slidesRef.current[0];
      if (first) dispatch({ type: 'selectSlide', id: first.id });
    }
    setPlayingState(v);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = timeRef.current + dt;
      if (next >= totalRef.current) {
        setTime(totalRef.current);
        setPlayingState(false);
        return;
      }
      timeRef.current = next;
      setTime(next);
      const { index } = slideAtTime(slidesRef.current, next);
      const sl = slidesRef.current[index];
      if (sl && sl.id !== stateRef.current.selectedSlideId) dispatch({ type: 'selectSlide', id: sl.id });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // keep the playhead on the selected slide when the user picks one elsewhere
  useEffect(() => {
    if (playing || !state.selectedSlideId) return;
    const i = slides.findIndex((x) => x.id === state.selectedSlideId);
    if (i < 0) return;
    const { index } = slideAtTime(slides, timeRef.current);
    if (index !== i) {
      setTime(offsets[i]);
      timeRef.current = offsets[i];
    }
     
  }, [state.selectedSlideId, slides.length]);

  // ---- publish
  const [progress, setProgress] = useState<PublishProgress>({ busy: false, done: 0, total: 0, error: null });
  const publish = useCallback(async () => {
    const pending = stateRef.current.doc.slides.filter((x) => !x.publishedStoryId);
    if (!pending.length) return;
    setPlayingState(false);
    setProgress({ busy: true, done: 0, total: pending.length, error: null });
    let done = 0;
    for (const sl of pending) {
      const fd = new FormData();
      fd.append('type', sl.kind === 'text' ? 'text' : 'media');
      fd.append('privacy', stateRef.current.doc.privacy);
      if (spaceId) fd.append('spaceId', spaceId);
      fd.append('config', JSON.stringify({ studio: toStudioConfig(sl) }));
      if (sl.kind === 'text') {
        const first = sl.overlays.find((o) => o.kind === 'text' && o.visible);
        fd.append('content', first?.text || '');
        fd.append('backgroundColor', sl.bgColor);
        fd.append('fontFamily', first?.fontFamily || 'Inter');
      } else {
        if (!sl.media?.mediaId) {
          setProgress({ busy: false, done, total: pending.length, error: 'A slide has no uploaded media. Re-add it and try again.' });
          return;
        }
        fd.append('mediaId', sl.media.mediaId);
      }
      try {
        const res = await fetch('/api/stories', { method: 'POST', headers: auth, body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to publish a slide');
        }
        const story = await res.json();
        dispatch({ type: 'markPublished', slideId: sl.id, storyId: story.id });
        done += 1;
        setProgress({ busy: true, done, total: pending.length, error: null });
      } catch (e: any) {
        setProgress({ busy: false, done, total: pending.length, error: `${e?.message || 'Publish failed'}. ${done} of ${pending.length} published — retry to finish.` });
        return;
      }
    }
    setProgress({ busy: false, done, total: pending.length, error: null });
    toast.success(spaceName ? `Story published as ${spaceName}` : 'Story published!');
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    lastSavedRev.current = stateRef.current.rev + 999;
    window.setTimeout(() => navigate('/home'), 500);
  }, [auth, key, navigate, spaceId, spaceName]);

  // ---- navigation guards
  const hasUnpublished = slides.some((x) => !x.publishedStoryId);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (uploading > 0 || progress.busy || saveStatus === 'error') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [uploading, progress.busy, saveStatus]);

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/home'));
  const onBack = () => (hasUnpublished ? setDialog('leave') : leave());
  const discard = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'init', doc: newProject() });
    lastSavedRev.current = 0;
    setTime(0);
    setRecovered(null);
    setDialog(null);
  };

  // ---- shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (dialog) return;
      const mod = e.ctrlKey || e.metaKey;
      const typing = isTyping(e.target);
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing && (e.target as HTMLElement).tagName !== 'BODY') {
          // let native text undo work inside fields unless nothing is focused there
          return;
        }
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flush();
        return;
      }
      if (typing) return;
      const st = stateRef.current;
      const sl = selectedSlide(st);
      const ov = selectedOverlay(st);
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.key === 'Escape') {
        dispatch({ type: 'selectOverlay', id: null });
      } else if (e.key.toLowerCase() === 't' && !mod) {
        e.preventDefault();
        addText();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (sl && ov) dispatch({ type: 'duplicateOverlay', slideId: sl.id, overlayId: ov.id });
        else if (sl) dispatch({ type: 'duplicateSlide', id: sl.id });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (sl && ov) dispatch({ type: 'removeOverlay', slideId: sl.id, overlayId: ov.id });
        else if (sl) dispatch({ type: 'removeSlide', id: sl.id });
      } else if (e.key === '[' || e.key === ']') {
        const i = st.doc.slides.findIndex((x) => x.id === st.selectedSlideId);
        const n = Math.max(0, Math.min(st.doc.slides.length - 1, i + (e.key === ']' ? 1 : -1)));
        if (st.doc.slides[n]) seek(offsets[n]);
      } else if (ov && sl && !ov.locked && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const patch = e.key === 'ArrowLeft' ? { x: ov.x - d } : e.key === 'ArrowRight' ? { x: ov.x + d } : e.key === 'ArrowUp' ? { y: ov.y - d } : { y: ov.y + d };
        dispatch({ type: 'updateOverlay', slideId: sl.id, overlayId: ov.id, patch, coalesce: 'nudge' });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dialog, playing, flush, setPlaying, addText, seek, offsets]);

  const notify = useCallback((m: string) => toast(m), []);

  const ctx: Studio = {
    state,
    dispatch,
    slide,
    overlay,
    time,
    playing,
    total,
    setPlaying,
    seek,
    leftTab,
    setLeftTab,
    leftOpen,
    setLeftOpen,
    inspectorTab,
    setInspectorTab,
    inspectorOpen,
    setInspectorOpen,
    tool,
    setTool,
    safeArea,
    setSafeArea,
    guides,
    setGuides,
    chrome,
    setChrome,
    compare,
    setCompare,
    zoomMode,
    setZoomMode,
    layout,
    library,
    libraryLoading,
    libraryError,
    reloadLibrary,
    uploading,
    importFiles,
    addFromLibrary,
    addTextSlide,
    addText,
    addSticker,
    addPoll,
    openImageEditor,
    saveStatus,
    savedAt,
    user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
    spaceId,
    spaceName,
    notify,
  };

  const panelCard = 'overflow-hidden rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]';
  const mobile = layout === 'mobile';
  const tablet = layout === 'tablet';

  return (
    <StudioCtx.Provider value={ctx}>
      <div className="ss-root fixed inset-0 z-[300] flex flex-col" data-testid="story-studio" role="main" aria-label="Story Studio">
        <style>{STYLE}</style>
        <TopBar onBack={onBack} onPreview={() => setDialog('preview')} onPublish={publish} progress={progress} onShortcuts={() => setDialog('shortcuts')} onDiscard={() => setDialog('discard')} onClassic={() => setDialog('classic')} />

        {recovered ? (
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--ss-border)] bg-[color:var(--ss-accent-soft)] px-4 py-1.5 text-[12.5px] text-[color:var(--ss-text)]" role="status" data-testid="ss-recovered">
            <span>
              Recovered your unfinished story ({slides.length} slide{slides.length === 1 ? '' : 's'}) from this device.
            </span>
            <span className="flex items-center gap-3">
              <button type="button" className="font-semibold text-[color:var(--ss-accent)] hover:underline" onClick={() => setDialog('discard')}>Start fresh</button>
              <button type="button" aria-label="Dismiss" onClick={() => setRecovered(null)}><X size={14} /></button>
            </span>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          {!mobile ? <IconRail onSettings={() => setDialog('shortcuts')} /> : null}

          <div className={`flex min-w-0 flex-1 flex-col gap-2 ${mobile ? 'p-2' : 'py-2 pr-2'}`}>
            <div className="flex min-h-0 flex-1 gap-2">
              {layout === 'desktop' && leftOpen ? (
                <aside aria-label="Media and assets" className={`${panelCard} w-[300px] shrink-0`} data-testid="ss-left-panel">
                  <LeftPanel />
                </aside>
              ) : null}
              <CanvasStage />
            </div>
            <div className={mobile ? 'h-[140px] shrink-0' : 'shrink-0'} style={mobile ? undefined : { height: 'clamp(186px, 25vh, 232px)' }}>
              <Timeline compact={mobile} />
            </div>
          </div>

          {layout === 'desktop' && inspectorOpen ? (
            <aside aria-label="Inspector" className="w-[300px] shrink-0 py-2 pr-2 xl:w-[316px]">
              <Inspector />
            </aside>
          ) : null}
        </div>

        {/* tablet: drawers over the canvas */}
        {tablet && leftOpen ? (
          <aside aria-label="Media and assets" className={`${panelCard} absolute bottom-2 left-[72px] top-[64px] z-40 w-[300px] shadow-2xl`} data-testid="ss-left-panel">
            <LeftPanel />
          </aside>
        ) : null}
        {tablet && inspectorOpen ? (
          <aside aria-label="Inspector" className="absolute bottom-2 right-2 top-[64px] z-40 w-[310px] rounded-2xl bg-[color:var(--ss-bg)] shadow-2xl">
            <div className="h-full p-0"><Inspector /></div>
          </aside>
        ) : null}
        {tablet ? (
          <button type="button" aria-label={inspectorOpen ? 'Close inspector' : 'Open inspector'} aria-pressed={inspectorOpen} data-testid="ss-inspector-toggle" onClick={() => setInspectorOpen(!inspectorOpen)} className="absolute right-3 top-[44%] z-50 flex h-10 items-center gap-2 rounded-full border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] px-4 text-[13px] font-semibold text-[color:var(--ss-accent)] shadow-lg">
            <SlidersHorizontal size={15} /> {inspectorOpen ? 'Close' : 'Edit'}
          </button>
        ) : null}

        {/* mobile: bottom tab bar + sheets */}
        {mobile ? (
          <>
            <nav aria-label="Studio tools" className="flex h-14 shrink-0 items-center justify-around border-t border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] px-1 pb-[env(safe-area-inset-bottom)]">
              {/* eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior) */}
              {[
                { id: 'media', label: 'Media', icon: ImageIcon, run: () => { setLeftTab('media'); setLeftOpen(true); setInspectorOpen(false); } },
                { id: 'text', label: 'Text', icon: Type, run: () => addText() },
                { id: 'poll', label: 'Poll', icon: BarChart2, run: () => { addPoll(); setLeftOpen(false); setInspectorOpen(true); } },
                { id: 'stickers', label: 'Stickers', icon: Smile, run: () => { setLeftTab('stickers'); setLeftOpen(true); setInspectorOpen(false); } },
                { id: 'edit', label: 'Edit', icon: SlidersHorizontal, run: () => { setInspectorOpen(true); setLeftOpen(false); } },
                { id: 'layers', label: 'Layers', icon: Layers, run: () => { setLeftTab('layers'); setLeftOpen(true); setInspectorOpen(false); } },
              ].map((t) => (
                <button key={t.id} type="button" onClick={t.run} aria-label={t.label} data-testid={`ss-mtab-${t.id}`} className="flex h-12 min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg text-[10.5px] font-medium text-[color:var(--ss-text)]">
                  <t.icon size={19} />
                  {t.label}
                </button>
              ))}
            </nav>
            {leftOpen || inspectorOpen ? (
              <div className="fixed inset-0 z-[310] flex flex-col justify-end bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) { setLeftOpen(false); setInspectorOpen(false); } }}>
                <div role="dialog" aria-label={inspectorOpen ? 'Inspector' : 'Panel'} data-testid="ss-sheet" className="flex h-[66dvh] flex-col overflow-hidden rounded-t-2xl bg-[color:var(--ss-bg)] shadow-2xl">
                  <div className="flex shrink-0 items-center justify-center py-1.5"><span className="h-1 w-10 rounded-full bg-[color:var(--ss-border)]" /></div>
                  <div className="min-h-0 flex-1 p-2 pt-0">
                    {inspectorOpen ? <Inspector /> : <div className={`${panelCard} h-full`}><LeftPanel /></div>}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
        {dialog === 'preview' ? <PreviewOverlay slides={slides} onClose={() => setDialog(null)} /> : null}
        {dialog === 'leave' ? (
          <ConfirmDialog
            title="Leave Story Studio?"
            body="Your project is saved on this device, so you can pick up where you left off next time. Or discard it now."
            confirm="Leave (keep draft)"
            onConfirm={() => { flush(); leave(); }}
            onCancel={() => setDialog(null)}
            extra={{ label: 'Discard & leave', run: () => { discard(); leave(); } }}
          />
        ) : null}
        {dialog === 'discard' ? <ConfirmDialog title="Discard this project?" body="All slides and edits in this draft will be removed from this device. Media stays in your library." confirm="Discard" danger onConfirm={discard} onCancel={() => setDialog(null)} /> : null}
        {dialog === 'classic' ? <StoryCreator spaceId={spaceId} spaceName={spaceName} onClose={() => setDialog(null)} onSuccess={() => { setDialog(null); navigate('/home'); }} /> : null}
        {imageFile ? <ImageEditorModal file={imageFile} type="post" onClose={() => setImageFile(null)} onSave={saveEditedImage} /> : null}

        {/* First-time welcome choice modal */}
        {showWelcomeChoice && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <div className="w-full max-w-md rounded-2xl bg-[color:var(--ss-panel)] shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)] mx-auto mb-4">
                <Camera size={28} />
              </div>
              <h2 id="welcome-title" className="text-[22px] font-bold text-[color:var(--ss-text)] mb-2">Create your story</h2>
              <p className="text-[14px] text-[color:var(--ss-muted)] mb-6">What would you like to start with?</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  type="button"
                  onClick={handleWelcomeMedia}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] p-4 hover:bg-[color:var(--ss-hover)] transition-colors"
                  aria-label="Start with photo or video"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]">
                    <Video size={22} />
                  </div>
                  <span className="text-[12px] font-medium text-[color:var(--ss-text)]">Photo / Video</span>
                </button>
                <button
                  type="button"
                  onClick={handleWelcomeText}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] p-4 hover:bg-[color:var(--ss-hover)] transition-colors"
                  aria-label="Start with text"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]">
                    <Type size={22} />
                  </div>
                  <span className="text-[12px] font-medium text-[color:var(--ss-text)]">Text</span>
                </button>
                <button
                  type="button"
                  onClick={handleWelcomePoll}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] p-4 hover:bg-[color:var(--ss-hover)] transition-colors"
                  aria-label="Start with poll"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]">
                    <BarChart2 size={22} />
                  </div>
                  <span className="text-[12px] font-medium text-[color:var(--ss-text)]">Poll</span>
                </button>
              </div>
              <button
                type="button"
                onClick={markWelcomeSeen}
                className="text-[13px] text-[color:var(--ss-muted)] hover:text-[color:var(--ss-accent)] underline"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </StudioCtx.Provider>
  );
}
