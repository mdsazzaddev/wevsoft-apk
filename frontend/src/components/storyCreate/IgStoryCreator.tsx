/**
 * Instagram-style full-screen story creator (Phase 1).
 * Reuses storyStudio project model + StorySlideCanvas + POST /api/stories.
 * Advanced desktop editor remains at /story-studio.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Camera,
  ChevronDown,
  Hash,
  AtSign,
  PenLine,
  Plus,
  Smile,
  Sparkles,
  Type,
  X,
  BarChart2,
  Eraser,
  Check,
  Link2,
  MapPin,
  Timer,
  MessageCircleQuestion,
  Music,
  Film,
  LayoutTemplate,
  Images,
  SwitchCamera,
  ZapOff,
} from 'lucide-react';
import { useStore } from '../../store';
import StorySlideCanvas from '../storyStudio/render/StorySlideCanvas';
import { ensureStudioFonts } from '../storyStudio/render/fonts';
import { createEditorState, reduce, selectedOverlay, selectedSlide } from '../storyStudio/model/projectReducer';
import { toStudioConfig } from '../storyStudio/model/serialize';
import { temperatureTint, vignetteCss } from '../storyStudio/model/filters';
import {
  CaptureLooksStrip,
  CircularFilterCarousel,
  DEFAULT_CAPTURE_LOOK,
  lookToCssFilter,
  type CaptureLook,
} from './CaptureLooks';
import {
  BG_COLORS,
  CANVAS_H,
  CANVAS_W,
  MAX_SLIDES,
  newCountdownOverlay,
  newDrawOverlay,
  newGifOverlay,
  newHashtagOverlay,
  newLinkOverlay,
  newLocationOverlay,
  newMediaSlide,
  newMentionOverlay,
  newMusicOverlay,
  newPollOverlay,
  newProject,
  newQuestionOverlay,
  newSticker,
  newTextOverlay,
  newTextSlide,
  uid,
  type DrawStroke,
  type Overlay,
  type Privacy,
  type Slide,
  type SlideMedia,
} from '../storyStudio/model/types';
import { IG_TEXT_STYLES, detectTextStyle, type IgTextStyleId } from './textStyles';
import { CountdownSheet, InlineGifSheet, TextPromptSheet } from './StickerSheets';

const MAX_FILE_MB = 150;
const EMOJIS = ['😀', '🔥', '❤️', '😂', '✨', '🎉', '👏', '💯', '😍', '🙌', '😎', '🥳', '👍', '🙏', '😭', '⭐'];
const DRAW_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#000000'];
const PRIVACY_OPTS: { value: Privacy; label: string }[] = [
  { value: 'public', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'followers', label: 'Followers' },
  { value: 'close_friends', label: 'Close friends' },
];

type Screen = 'entry' | 'camera' | 'edit';
type Tray = null | 'text' | 'draw' | 'stickers' | 'effects' | 'privacy';
type StickerSheet =
  | null
  | 'mention'
  | 'hashtag'
  | 'question'
  | 'countdown'
  | 'link'
  | 'location'
  | 'gif'
  | 'music';

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

function clientToLogical(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const scale = rect.width / CANVAS_W;
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

export default function IgStoryCreator() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const spaceId = params.get('space') || undefined;
  const spaceName = params.get('name') || undefined;
  const token = useStore((s) => s.token);
  const auth = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)), [token]);

  const [state, dispatch] = useReducer(reduce, undefined, () => createEditorState(newProject()));
  const slide = selectedSlide(state);
  const overlay = selectedOverlay(state);
  const slides = state.doc.slides;

  const [screen, setScreen] = useState<Screen>('entry');
  const [tray, setTray] = useState<Tray>(null);
  const [uploading, setUploading] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [textStyle, setTextStyle] = useState<IgTextStyleId>('classic');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawWidth, setDrawWidth] = useState(14);
  const [eraser, setEraser] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [stickerSheet, setStickerSheet] = useState<StickerSheet>(null);
  const [recording, setRecording] = useState(false);
  const [library, setLibrary] = useState<{ id: string; url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [captureLook, setCaptureLook] = useState<CaptureLook>(DEFAULT_CAPTURE_LOOK);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [filterPreviewSrc, setFilterPreviewSrc] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const pendingLookRef = useRef<CaptureLook>(DEFAULT_CAPTURE_LOOK);
  pendingLookRef.current = captureLook;
  const facingRef = useRef(facingMode);
  facingRef.current = facingMode;
  const musicRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const drawStrokeRef = useRef<DrawStroke | null>(null);
  const drawLayerIdRef = useRef<string | null>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    ensureStudioFonts();
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const reloadLibrary = useCallback(() => {
    if (!token) return;
    setLibraryLoading(true);
    fetch('/api/media', { headers: auth })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        const list = (Array.isArray(rows) ? rows : [])
          .filter((m) => m && (m.type === 'image' || m.type === 'video' || String(m.mimeType || '').startsWith('image/') || String(m.mimeType || '').startsWith('video/')) && m.path)
          .map((m) => ({
            id: String(m.id),
            url: String(m.path),
            type: (String(m.type || m.mimeType || '').includes('video') ? 'video' : 'image') as 'image' | 'video',
            name: String(m.originalName || m.name || 'Media'),
          }))
          .slice(0, 60);
        setLibrary(list);
      })
      .catch(() => setLibrary([]))
      .finally(() => setLibraryLoading(false));
  }, [auth, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    if (screen === 'entry' && token) reloadLibrary();
  }, [screen, token, reloadLibrary]);

  // Snapshot camera frame for filter chip photo previews
  if (screen !== 'camera' && filterPreviewSrc !== null) setFilterPreviewSrc(null);
  useEffect(() => {
    if (screen !== 'camera') return;
    let cancelled = false;
    const snap = () => {
      const v = videoRef.current;
      if (!v || v.videoWidth < 2 || cancelled) return;
      const c = document.createElement('canvas');
      const w = 128;
      const h = Math.max(128, Math.round((v.videoHeight / v.videoWidth) * w));
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      try {
        setFilterPreviewSrc(c.toDataURL('image/jpeg', 0.72));
      } catch {
        /* tainted / not ready */
      }
    };
    const t1 = window.setTimeout(snap, 350);
    const iv = window.setInterval(snap, 2200);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearInterval(iv);
    };
  }, [screen, facingMode]);

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/home'));

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const applyMinZoom = async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track?.getCapabilities) return;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: number | { min: number; max: number } };
      const zoomCap = caps.zoom;
      if (zoomCap == null) return;
      const min = typeof zoomCap === 'number' ? 1 : zoomCap.min;
      await track.applyConstraints({ advanced: [{ zoom: min } as MediaTrackConstraintSet] });
    } catch {
      /* zoom not supported */
    }
  };

  const attachStream = (stream: MediaStream) => {
    streamRef.current = stream;
    void applyMinZoom(stream);
    setScreen('camera');
    setRecording(false);
    window.setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const startCamera = useCallback(async (face?: 'user' | 'environment') => {
    const mode = face || facingRef.current;
    stopCamera();
    // Avoid forcing 1080×1920 — that crops the sensor and feels heavily zoomed.
    const videoConstraints: MediaTrackConstraints = {
      facingMode: { ideal: mode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      setFacingMode(mode);
      attachStream(stream);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
        setFacingMode(mode);
        attachStream(stream);
      } catch {
        toast.error('Camera unavailable — pick from gallery instead');
        fileRef.current?.click();
      }
    }
  }, [stopCamera]);

  const flipCamera = useCallback(() => {
    const next = facingRef.current === 'user' ? 'environment' : 'user';
    void startCamera(next);
  }, [startCamera]);

  const addMediaSlide = useCallback(
    async (media: SlideMedia) => {
      if (state.doc.slides.length >= MAX_SLIDES) {
        toast.error(`A story can have up to ${MAX_SLIDES} slides`);
        return;
      }
      let m = media;
      if (m.type === 'video' && !m.naturalDuration) m = { ...m, naturalDuration: await probeVideoDuration(m.url) };
      const look = pendingLookRef.current;
      dispatch({
        type: 'addSlide',
        slide: newMediaSlide(m, {
          filterId: look.filterId,
          filterIntensity: look.filterIntensity,
          effects: { ...look.effects },
          adjust: { ...look.adjust },
        }),
      });
      setScreen('edit');
      setTray('effects');
    },
    [state.doc.slides.length],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      if (!isImg && !isVid) {
        toast.error('Not an image or video');
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`File larger than ${MAX_FILE_MB} MB`);
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
        await addMediaSlide({
          mediaId: m.id,
          url: m.path,
          type: isVid ? 'video' : 'image',
          name: m.originalName || file.name,
          naturalDuration,
        });
      } catch (e: any) {
        toast.error(e?.message || 'Upload failed');
      } finally {
        setUploading((n) => n - 1);
      }
    },
    [auth, addMediaSlide],
  );

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    void uploadFile(list[0]);
  };

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error('Camera not ready');
      return;
    }
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (facingRef.current === 'user') {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    stopCamera();
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadFile(file);
    }, 'image/jpeg', 0.92);
  }, [stopCamera, uploadFile]);

  const toggleVideoRecord = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    recordChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
    try {
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        setRecording(false);
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType || 'video/webm' });
        stopCamera();
        const file = new File([blob], `story_${Date.now()}.webm`, { type: blob.type || 'video/webm' });
        void uploadFile(file);
      };
      rec.start(200);
      setRecording(true);
      // Auto-stop at 15s (story max)
      window.setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
      }, 15000);
    } catch {
      toast.error('Video recording not supported on this device');
    }
  }, [recording, stopCamera, uploadFile]);

  const startTextStory = () => {
    dispatch({ type: 'init', doc: newProject() });
    const s = newTextSlide({ bgColor: BG_COLORS[0], overlays: [newTextOverlay('Your text', { y: 800 })] });
    dispatch({ type: 'addSlide', slide: s });
    dispatch({ type: 'selectOverlay', id: s.overlays[0]?.id ?? null });
    setEditingTextId(s.overlays[0]?.id ?? null);
    setScreen('edit');
    setTray('text');
  };

  /** Entry-point Music: dark slide + open audio picker (same upload path as sticker tray). */
  const startMusicStory = () => {
    dispatch({ type: 'init', doc: newProject() });
    const s = newTextSlide({
      bgColor: '#0f172a',
      overlays: [newTextOverlay('♪ Add your track', { y: 700, fontSize: 56, background: false })],
    });
    dispatch({ type: 'addSlide', slide: s });
    setScreen('edit');
    setTray(null);
    window.setTimeout(() => musicRef.current?.click(), 80);
  };

  const startFromLibrary = (item: { id: string; url: string; type: 'image' | 'video'; name: string }) => {
    void addMediaSlide({ mediaId: item.id, url: item.url, type: item.type, name: item.name });
  };

  const startTemplate = (bg: string, label: string) => {
    dispatch({ type: 'init', doc: newProject() });
    const style = IG_TEXT_STYLES.find((s) => s.id === 'classic')!.patch;
    const s = newTextSlide({
      bgColor: bg,
      overlays: [newTextOverlay(label, { ...style, y: 820 })],
    });
    dispatch({ type: 'addSlide', slide: s });
    dispatch({ type: 'selectOverlay', id: s.overlays[0]?.id ?? null });
    setEditingTextId(s.overlays[0]?.id ?? null);
    setShowTemplates(false);
    setScreen('edit');
    setTray('text');
  };

  const ensureDrawLayer = useCallback((): string => {
    const sl = selectedSlide(stateRef.current);
    if (!sl) return '';
    const existing = sl.overlays.find((o) => o.kind === 'draw');
    if (existing) {
      drawLayerIdRef.current = existing.id;
      dispatch({ type: 'selectOverlay', id: existing.id });
      return existing.id;
    }
    const draw = newDrawOverlay();
    drawLayerIdRef.current = draw.id;
    dispatch({ type: 'addOverlay', slideId: sl.id, overlay: draw });
    return draw.id;
  }, []);

  const updateSlide = (patch: Partial<Slide>, coalesce?: string) => {
    if (!slide) return;
    dispatch({ type: 'updateSlide', id: slide.id, patch, coalesce });
  };

  const updateOverlay = (overlayId: string, patch: Partial<Overlay>, coalesce?: string) => {
    if (!slide) return;
    dispatch({ type: 'updateOverlay', slideId: slide.id, overlayId, patch, coalesce });
  };

  const addText = () => {
    if (!slide) return;
    const style = IG_TEXT_STYLES.find((s) => s.id === textStyle) || IG_TEXT_STYLES[0];
    const o = newTextOverlay('Tap to edit', { ...style.patch, y: 700 + Math.random() * 200 });
    dispatch({ type: 'addOverlay', slideId: slide.id, overlay: o });
    setEditingTextId(o.id);
    setTray('text');
  };

  const applyTextStyle = (id: IgTextStyleId) => {
    setTextStyle(id);
    const style = IG_TEXT_STYLES.find((s) => s.id === id);
    if (!style || !overlay || (overlay.kind !== 'text' && overlay.kind !== 'sticker')) return;
    if (overlay.kind === 'sticker') return;
    updateOverlay(overlay.id, style.patch);
  };

  const addEmoji = (emoji: string) => {
    if (!slide) return;
    dispatch({ type: 'addOverlay', slideId: slide.id, overlay: newSticker(emoji) });
    setTray(null);
  };

  const addPoll = () => {
    if (!slide) return;
    if (slide.overlays.some((o) => o.kind === 'poll')) {
      toast.error('Only one poll per slide');
      return;
    }
    dispatch({ type: 'addOverlay', slideId: slide.id, overlay: newPollOverlay() });
    setTray(null);
  };

  const closeStickerSheet = () => setStickerSheet(null);

  const addMentionValue = (handle: string) => {
    const sl = selectedSlide(stateRef.current);
    if (!sl) return;
    dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newMentionOverlay(handle) });
    setStickerSheet(null);
    setTray(null);
  };

  const addHashtagValue = (tag: string) => {
    const sl = selectedSlide(stateRef.current);
    if (!sl) return;
    dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newHashtagOverlay(tag) });
    setStickerSheet(null);
    setTray(null);
  };

  const uploadMusic = async (file: File) => {
    const sl = selectedSlide(stateRef.current);
    if (!sl) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Pick an audio file');
      return;
    }
    setUploading((n) => n + 1);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', headers: auth, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const m = await res.json();
      const title = (m.originalName || file.name || 'Track').replace(/\.[^.]+$/, '');
      dispatch({
        type: 'addOverlay',
        slideId: sl.id,
        overlay: newMusicOverlay({ title, musicUrl: m.path, musicMediaId: m.id }),
      });
      setStickerSheet(null);
      setTray(null);
      toast.success('Music added');
    } catch (e: any) {
      toast.error(e?.message || 'Music upload failed');
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const addPage = () => {
    if (slides.length >= MAX_SLIDES) {
      toast.error(`Max ${MAX_SLIDES} pages`);
      return;
    }
    fileRef.current?.click();
  };

  const onPointerDownCanvas = (e: RPointerEvent<HTMLDivElement>) => {
    const sl = selectedSlide(stateRef.current);
    if (!sl || !canvasHostRef.current) return;
    const host = canvasHostRef.current.querySelector('[data-testid="story-slide-canvas"]') as HTMLElement | null;
    if (!host) return;
    const pt = clientToLogical(host, e.clientX, e.clientY);

    if (tray === 'draw') {
      const drawId = ensureDrawLayer();
      if (!drawId) return;
      const stroke: DrawStroke = {
        id: uid('stk'),
        color: drawColor,
        width: drawWidth,
        points: [pt],
        eraser,
      };
      drawStrokeRef.current = stroke;
      const cur = selectedSlide(stateRef.current);
      const d = cur?.overlays.find((o) => o.id === drawId) || cur?.overlays.find((o) => o.kind === 'draw');
      if (cur && d) {
        dispatch({
          type: 'updateOverlay',
          slideId: cur.id,
          overlayId: d.id,
          patch: { strokes: [...(d.strokes || []), stroke] },
          coalesce: `draw-${stroke.id}`,
        });
      } else if (cur) {
        // Layer just queued via addOverlay — seed on next frame from ref
        window.requestAnimationFrame(() => {
          const next = selectedSlide(stateRef.current);
          const layer = next?.overlays.find((o) => o.id === drawId);
          if (!next || !layer || !drawStrokeRef.current) return;
          dispatch({
            type: 'updateOverlay',
            slideId: next.id,
            overlayId: layer.id,
            patch: { strokes: [...(layer.strokes || []), drawStrokeRef.current] },
            coalesce: `draw-${stroke.id}`,
          });
        });
      }
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    const hit = [...sl.overlays].reverse().find((o) => {
      if (!o.visible || o.kind === 'draw' || o.locked) return false;
      return pt.x >= o.x && pt.x <= o.x + o.w && pt.y >= o.y && pt.y <= o.y + o.h;
    });
    if (hit) {
      dispatch({ type: 'selectOverlay', id: hit.id });
      dragRef.current = { id: hit.id, ox: hit.x, oy: hit.y, sx: pt.x, sy: pt.y };
      if (hit.kind === 'text') setEditingTextId(hit.id);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      dispatch({ type: 'selectOverlay', id: null });
      setEditingTextId(null);
    }
  };

  const onPointerMoveCanvas = (e: RPointerEvent<HTMLDivElement>) => {
    const sl = selectedSlide(stateRef.current);
    if (!sl || !canvasHostRef.current) return;
    const host = canvasHostRef.current.querySelector('[data-testid="story-slide-canvas"]') as HTMLElement | null;
    if (!host) return;
    const pt = clientToLogical(host, e.clientX, e.clientY);

    if (tray === 'draw' && drawStrokeRef.current) {
      const stroke = drawStrokeRef.current;
      stroke.points.push(pt);
      const drawId = drawLayerIdRef.current;
      const d = sl.overlays.find((o) => o.id === drawId) || sl.overlays.find((o) => o.kind === 'draw');
      if (!d) return;
      dispatch({
        type: 'updateOverlay',
        slideId: sl.id,
        overlayId: d.id,
        patch: { strokes: [...(d.strokes || []).filter((s) => s.id !== stroke.id), { ...stroke, points: [...stroke.points] }] },
        coalesce: `draw-${stroke.id}`,
      });
      return;
    }

    if (dragRef.current) {
      const d = dragRef.current;
      const nx = Math.round(d.ox + (pt.x - d.sx));
      const ny = Math.round(d.oy + (pt.y - d.sy));
      dispatch({
        type: 'updateOverlay',
        slideId: sl.id,
        overlayId: d.id,
        patch: { x: nx, y: ny },
        coalesce: `drag-${d.id}`,
      });
    }
  };

  const onPointerUpCanvas = () => {
    drawStrokeRef.current = null;
    dragRef.current = null;
  };

  const publish = async () => {
    const pending = state.doc.slides.filter((x) => !x.publishedStoryId);
    if (!pending.length) {
      toast.error('Add a photo, video, or text first');
      return;
    }
    setPublishing(true);
    let done = 0;
    for (const sl of pending) {
      const fd = new FormData();
      fd.append('type', sl.kind === 'text' ? 'text' : 'media');
      fd.append('privacy', state.doc.privacy);
      if (spaceId) fd.append('spaceId', spaceId);
      fd.append('config', JSON.stringify({ studio: toStudioConfig(sl) }));
      if (sl.kind === 'text') {
        const first = sl.overlays.find((o) => o.kind === 'text' && o.visible);
        fd.append('content', first?.text || '');
        fd.append('backgroundColor', sl.bgColor);
        fd.append('fontFamily', first?.fontFamily || 'Inter');
      } else {
        if (!sl.media?.mediaId) {
          toast.error('A page is still uploading — wait and try again');
          setPublishing(false);
          return;
        }
        fd.append('mediaId', sl.media.mediaId);
      }
      try {
        const res = await fetch('/api/stories', { method: 'POST', headers: auth, body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to publish');
        }
        const story = await res.json();
        dispatch({ type: 'markPublished', slideId: sl.id, storyId: story.id });
        done += 1;
      } catch (e: any) {
        toast.error(`${e?.message || 'Publish failed'}. ${done}/${pending.length} published.`);
        setPublishing(false);
        return;
      }
    }
    toast.success(spaceName ? `Story published as ${spaceName}` : 'Story shared!');
    setPublishing(false);
    navigate('/home');
  };

  const privacyLabel = PRIVACY_OPTS.find((p) => p.value === state.doc.privacy)?.label || 'Everyone';

  // ---- Entry screen (WevSoft mobile picker — inspired by phone story flows, not a clone) ----
  if (screen === 'entry') {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col bg-[#0a0a0b] text-white" data-testid="ig-story-creator" role="main" aria-label="Add to your story">
        <header className="flex shrink-0 items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2">
          <button type="button" aria-label="Close" onClick={leave} className="rounded-full p-2 hover:bg-white/10">
            <X size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-[16px] font-semibold tracking-tight">Add to your story</h1>
            {spaceName ? <p className="text-[11px] text-white/50">as {spaceName}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Open Studio"
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => navigate(`/story-studio${spaceId ? `?space=${encodeURIComponent(spaceId)}&name=${encodeURIComponent(spaceName || '')}` : ''}`)}
          >
            <Sparkles size={20} />
          </button>
        </header>

        {/* Quick create row — desktop: only these tiles; mobile also gets library below */}
        <div className="flex shrink-0 flex-col px-3 pb-3 pt-1 md:flex-1 md:items-center md:justify-center md:pb-16">
          <div className="flex gap-2.5 overflow-x-auto pb-1 md:justify-center md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <QuickTile
              testId="ig-entry-device"
              label="Photo / Video"
              onClick={() => fileRef.current?.click()}
              accent="from-sky-500 to-indigo-600"
              icon={<Images size={26} strokeWidth={2.2} />}
            />
            <QuickTile
              testId="ig-entry-text"
              label="Text"
              onClick={startTextStory}
              accent="from-violet-600 to-fuchsia-500"
              icon={<Type size={26} strokeWidth={2.2} />}
            />
            <QuickTile
              testId="ig-entry-music"
              label="Music"
              onClick={startMusicStory}
              accent="from-emerald-500 to-cyan-500"
              icon={<Music size={26} strokeWidth={2.2} />}
            />
            <QuickTile
              testId="ig-entry-templates"
              label="Templates"
              onClick={() => setShowTemplates((v) => !v)}
              accent="from-amber-500 to-orange-600"
              icon={<LayoutTemplate size={26} strokeWidth={2.2} />}
            />
          </div>
          {showTemplates ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:justify-center">
              {[
                { bg: '#7c3aed', label: 'Say something' },
                { bg: '#0ea5e9', label: 'Good morning' },
                { bg: '#ec4899', label: 'Feeling…' },
                { bg: '#111827', label: 'Late night' },
                { bg: '#059669', label: 'Update' },
              ].map((t) => (
                <button
                  key={t.bg}
                  type="button"
                  onClick={() => startTemplate(t.bg, t.label)}
                  className="h-16 w-24 shrink-0 rounded-xl px-2 text-[11px] font-semibold text-white shadow-inner ring-1 ring-white/15"
                  style={{ background: t.bg }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
          {uploading > 0 ? <p className="mt-4 hidden text-center text-[13px] text-sky-300 md:block">Uploading…</p> : null}
        </div>

        {/* Library / recents — phone only (md+ hidden) */}
        <div className="flex min-h-0 flex-1 flex-col rounded-t-2xl bg-[#121214] ring-1 ring-white/5 md:hidden">
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <button type="button" className="flex items-center gap-1 text-[14px] font-semibold" aria-label="Your library">
              <Images size={16} className="text-sky-400" />
              Your library
              <ChevronDown size={14} className="text-white/40" />
            </button>
            <button
              type="button"
              data-testid="ig-entry-gallery"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/90 hover:bg-white/15"
            >
              From phone
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-3 gap-0.5">
              <button
                type="button"
                data-testid="ig-entry-camera"
                onClick={() => void startCamera()}
                className="relative aspect-square bg-zinc-800/80 hover:bg-zinc-700"
                aria-label="Open camera"
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/90">
                  <Camera size={28} />
                  <span className="text-[11px] font-medium">Camera</span>
                </span>
              </button>
              {library.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => startFromLibrary(item)}
                  className="relative aspect-square overflow-hidden bg-zinc-900"
                  aria-label={item.name}
                >
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-semibold">VIDEO</span>
                    </>
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </button>
              ))}
            </div>
            {libraryLoading ? <p className="py-8 text-center text-[13px] text-white/40">Loading…</p> : null}
            {!libraryLoading && library.length === 0 ? (
              <p className="px-6 py-10 text-center text-[13px] leading-relaxed text-white/45">
                No uploads yet. Use <span className="text-white/80">Camera</span>, <span className="text-white/80">From phone</span>, or start with Text / Music above.
              </p>
            ) : null}
            {uploading > 0 ? <p className="py-3 text-center text-[13px] text-sky-300">Uploading…</p> : null}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={musicRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadMusic(f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  // ---- Camera (phone story capture chrome — floating tools + circular filter wheel) ----
  if (screen === 'camera') {
    const camFilter = lookToCssFilter(captureLook);
    const camTint = temperatureTint(captureLook.adjust.temperature);
    const camVignette = vignetteCss(captureLook.effects);
    const galleryThumb = library[0];
    return (
      <div className="fixed inset-0 z-[300] bg-black text-white" data-testid="ig-story-camera">
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-contain bg-black"
            style={{
              filter: camFilter === 'none' ? undefined : camFilter,
              transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
            }}
          />
          {camTint ? (
            <div className="pointer-events-none absolute inset-0" style={{ background: camTint.color, opacity: camTint.opacity, mixBlendMode: 'soft-light' }} />
          ) : null}
          {camVignette ? <div className="pointer-events-none absolute inset-0" style={{ background: camVignette }} /> : null}
          {captureLook.effects.grain > 0 ? (
            <div
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{
                opacity: (captureLook.effects.grain / 100) * 0.5,
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
              }}
            />
          ) : null}
        </div>

        {/* Top bar */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Close"
            className="pointer-events-auto rounded-full p-2 drop-shadow-lg"
            onClick={() => {
              stopCamera();
              setScreen('entry');
            }}
          >
            <X size={28} strokeWidth={2.2} />
          </button>
          <span className="pointer-events-none flex items-center gap-1 text-white/80 drop-shadow">
            <ZapOff size={22} />
          </span>
          <button
            type="button"
            aria-label="Open studio"
            className="pointer-events-auto rounded-full p-2 drop-shadow-lg"
            onClick={() => {
              stopCamera();
              navigate(`/story-studio${spaceId ? `?space=${encodeURIComponent(spaceId)}&name=${encodeURIComponent(spaceName || '')}` : ''}`);
            }}
          >
            <Sparkles size={22} />
          </button>
        </header>

        {recording ? (
          <div className="absolute left-1/2 top-[max(56px,env(safe-area-inset-top))] z-30 -translate-x-1/2 rounded-full bg-red-500/90 px-3 py-1 text-[12px] font-semibold">
            Recording…
          </div>
        ) : null}

        {/* Filter wheel + shutter row */}
        <div className="absolute inset-x-0 bottom-0 z-30 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
          {!recording ? (
            <div className="mb-3">
              <CircularFilterCarousel
                look={captureLook}
                onChange={setCaptureLook}
                previewSrc={filterPreviewSrc}
                mirrored={facingMode === 'user'}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between px-5">
            <button
              type="button"
              aria-label="Open gallery"
              data-testid="ig-cam-gallery"
              onClick={() => fileRef.current?.click()}
              className="h-12 w-12 overflow-hidden rounded-xl ring-2 ring-white/80 shadow-lg"
            >
              {galleryThumb ? (
                galleryThumb.type === 'video' ? (
                  <video src={galleryThumb.url} muted className="h-full w-full object-cover" />
                ) : (
                  <img src={galleryThumb.url} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-zinc-800">
                  <Images size={20} />
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label={recording ? 'Stop recording' : 'Capture photo'}
              data-testid="ig-capture"
              onClick={() => (recording ? toggleVideoRecord() : void capturePhoto())}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleVideoRecord();
              }}
              className={`h-[76px] w-[76px] rounded-full border-[5px] border-white shadow-xl ${
                recording ? 'bg-red-500' : 'bg-white/25'
              }`}
            >
              <span className={`mx-auto block rounded-full ${recording ? 'h-7 w-7 bg-white' : 'h-[58px] w-[58px] bg-white'}`} />
            </button>

            <button
              type="button"
              aria-label="Flip camera"
              data-testid="ig-cam-flip"
              onClick={() => flipCamera()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 ring-1 ring-white/30 backdrop-blur-md"
            >
              <SwitchCamera size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Edit ----
  if (!slide) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black text-white">
        <p>No page yet</p>
        <button type="button" className="rounded-full bg-white px-5 py-2 text-black" onClick={() => setScreen('entry')}>
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black text-white" data-testid="ig-story-edit" role="main" aria-label="Edit story">
      {/* Top chrome */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))]">
        <button type="button" aria-label="Close" onClick={leave} className="rounded-full bg-black/40 p-2 backdrop-blur-md">
          <X size={22} />
        </button>
        <div className="relative ml-1">
          <button
            type="button"
            data-testid="ig-privacy"
            onClick={() => setPrivacyOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-medium backdrop-blur-md"
          >
            {privacyLabel}
            <ChevronDown size={14} />
          </button>
          {privacyOpen ? (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl bg-zinc-900 shadow-xl ring-1 ring-white/10">
              {PRIVACY_OPTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] hover:bg-white/10 ${
                    state.doc.privacy === p.value ? 'text-sky-400' : ''
                  }`}
                  onClick={() => {
                    dispatch({ type: 'setPrivacy', privacy: p.value });
                    setPrivacyOpen(false);
                  }}
                >
                  {p.label}
                  {state.doc.privacy === p.value ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          data-testid="ig-share"
          disabled={publishing || uploading > 0}
          onClick={() => void publish()}
          className="rounded-full bg-sky-500 px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {publishing ? 'Sharing…' : 'Your story'}
        </button>
      </header>

      {/* Canvas */}
      <div
        ref={canvasHostRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={onPointerUpCanvas}
        onPointerCancel={onPointerUpCanvas}
        style={{ touchAction: tray === 'draw' ? 'none' : 'manipulation' }}
      >
        <div className="relative h-full max-h-full w-full max-w-[min(100vw,calc(100dvh*9/16))]">
          <StorySlideCanvas
            slide={slide}
            playing={slide.media?.type === 'video'}
            muted
            loop
            className="h-full w-full"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Selection ring */}
            {overlay && overlay.kind !== 'draw' ? (
              <div
                style={{
                  position: 'absolute',
                  left: overlay.x - 4,
                  top: overlay.y - 4,
                  width: overlay.w + 8,
                  height: overlay.h + 8,
                  border: '2px solid #38bdf8',
                  borderRadius: 8,
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </StorySlideCanvas>
        </div>

        {/* Inline text editor */}
        {editingTextId && overlay?.id === editingTextId && overlay.kind === 'text' ? (
          <textarea
            aria-label="Edit text"
            data-testid="ig-text-input"
            value={overlay.text}
            autoFocus
            onChange={(e) => updateOverlay(overlay.id, { text: e.target.value.slice(0, 600) }, 'text')}
            onBlur={() => setEditingTextId(null)}
            className="pointer-events-auto absolute left-1/2 top-[42%] z-30 w-[80%] -translate-x-1/2 resize-none rounded-xl bg-black/50 px-3 py-2 text-center text-[18px] text-white outline-none ring-1 ring-white/30 backdrop-blur"
            rows={3}
          />
        ) : null}
      </div>

      {/* Page dots + add */}
      <div className="absolute bottom-[118px] left-0 right-0 z-20 flex items-center justify-center gap-2 px-4">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Page ${i + 1}`}
            aria-pressed={s.id === slide.id}
            onClick={() => dispatch({ type: 'selectSlide', id: s.id })}
            className={`h-1.5 rounded-full transition-all ${s.id === slide.id ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
          />
        ))}
        {slides.length < MAX_SLIDES ? (
          <button type="button" aria-label="Add page" data-testid="ig-add-page" onClick={addPage} className="ml-1 rounded-full bg-white/20 p-1">
            <Plus size={14} />
          </button>
        ) : null}
      </div>

      {/* Right / bottom tool tray */}
      <div className="absolute bottom-0 right-0 z-20 flex flex-col items-end gap-2 pb-[max(16px,env(safe-area-inset-bottom))] pr-3">
        <ToolFab label="Text" icon={<Type size={20} />} active={tray === 'text'} onClick={() => { setTray(tray === 'text' ? null : 'text'); if (tray !== 'text') addText(); }} testId="ig-tool-text" />
        <ToolFab label="Draw" icon={<PenLine size={20} />} active={tray === 'draw'} onClick={() => { setTray(tray === 'draw' ? null : 'draw'); if (tray !== 'draw') ensureDrawLayer(); }} testId="ig-tool-draw" />
        <ToolFab label="Stickers" icon={<Smile size={20} />} active={tray === 'stickers'} onClick={() => setTray(tray === 'stickers' ? null : 'stickers')} testId="ig-tool-stickers" />
        <ToolFab label="Effects" icon={<Sparkles size={20} />} active={tray === 'effects'} onClick={() => setTray(tray === 'effects' ? null : 'effects')} testId="ig-tool-effects" />
      </div>

      {/* Bottom panels */}
      {tray === 'text' ? (
        <BottomSheet onClose={() => setTray(null)} title="Text">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {IG_TEXT_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                data-testid={`ig-text-style-${s.id}`}
                onClick={() => applyTextStyle(s.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  (overlay && detectTextStyle(overlay) === s.id) || textStyle === s.id
                    ? 'bg-white text-black'
                    : 'bg-white/15 text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {slide.kind === 'text' ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Background ${c}`}
                  onClick={() => updateSlide({ bgColor: c })}
                  className={`h-9 w-9 shrink-0 rounded-full ring-2 ${slide.bgColor === c ? 'ring-white' : 'ring-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          ) : null}
        </BottomSheet>
      ) : null}

      {tray === 'draw' ? (
        <BottomSheet onClose={() => setTray(null)} title="Draw">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              aria-pressed={eraser}
              data-testid="ig-draw-eraser"
              onClick={() => setEraser((v) => !v)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${eraser ? 'bg-white text-black' : 'bg-white/15'}`}
            >
              <Eraser size={16} />
            </button>
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => {
                  setDrawColor(c);
                  setEraser(false);
                }}
                className={`h-8 w-8 shrink-0 rounded-full ring-2 ${!eraser && drawColor === c ? 'ring-white' : 'ring-transparent'}`}
                style={{ background: c, border: c === '#ffffff' ? '1px solid #666' : undefined }}
              />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 text-[12px] text-white/70">
            Size
            <input
              type="range"
              min={4}
              max={40}
              value={drawWidth}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
              className="flex-1"
            />
          </label>
        </BottomSheet>
      ) : null}

      {tray === 'stickers' && !stickerSheet ? (
        <BottomSheet onClose={() => setTray(null)} title="Stickers">
          <div className="mb-3 flex flex-wrap gap-2">
            <StickerChip icon={<BarChart2 size={14} />} label="Poll" onClick={addPoll} testId="ig-sticker-poll" />
            <StickerChip icon={<AtSign size={14} />} label="Mention" onClick={() => setStickerSheet('mention')} testId="ig-sticker-mention" />
            <StickerChip icon={<Hash size={14} />} label="Hashtag" onClick={() => setStickerSheet('hashtag')} testId="ig-sticker-hashtag" />
            <StickerChip icon={<MessageCircleQuestion size={14} />} label="Question" onClick={() => setStickerSheet('question')} testId="ig-sticker-question" />
            <StickerChip icon={<Timer size={14} />} label="Countdown" onClick={() => setStickerSheet('countdown')} testId="ig-sticker-countdown" />
            <StickerChip icon={<Link2 size={14} />} label="Link" onClick={() => setStickerSheet('link')} testId="ig-sticker-link" />
            <StickerChip icon={<MapPin size={14} />} label="Location" onClick={() => setStickerSheet('location')} testId="ig-sticker-location" />
            <StickerChip icon={<Music size={14} />} label="Music" onClick={() => musicRef.current?.click()} testId="ig-sticker-music" />
            <StickerChip icon={<Film size={14} />} label="GIF" onClick={() => setStickerSheet('gif')} testId="ig-sticker-gif" />
          </div>
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" className="text-[28px] leading-none" onClick={() => addEmoji(e)} aria-label={`Sticker ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}

      {stickerSheet === 'mention' ? (
        <TextPromptSheet title="Mention" prefix="@" placeholder="username" submitLabel="Add" onClose={closeStickerSheet} onSubmit={addMentionValue} />
      ) : null}
      {stickerSheet === 'hashtag' ? (
        <TextPromptSheet title="Hashtag" prefix="#" placeholder="tag" submitLabel="Add" onClose={closeStickerSheet} onSubmit={addHashtagValue} />
      ) : null}
      {stickerSheet === 'question' ? (
        <TextPromptSheet
          title="Question"
          placeholder="Ask me anything…"
          submitLabel="Add"
          onClose={closeStickerSheet}
          onSubmit={(prompt) => {
            const sl = selectedSlide(stateRef.current);
            if (!sl) return;
            dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newQuestionOverlay(prompt) });
            closeStickerSheet();
            setTray(null);
          }}
        />
      ) : null}
      {stickerSheet === 'countdown' ? (
        <CountdownSheet
          onClose={closeStickerSheet}
          onSubmit={(title, endsAt) => {
            const sl = selectedSlide(stateRef.current);
            if (!sl) return;
            dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newCountdownOverlay(title, endsAt) });
            closeStickerSheet();
            setTray(null);
          }}
        />
      ) : null}
      {stickerSheet === 'link' ? (
        <TextPromptSheet
          title="Link"
          placeholder="https://…"
          submitLabel="Add"
          onClose={closeStickerSheet}
          onSubmit={(url) => {
            const sl = selectedSlide(stateRef.current);
            if (!sl) return;
            dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newLinkOverlay(url) });
            closeStickerSheet();
            setTray(null);
          }}
        />
      ) : null}
      {stickerSheet === 'location' ? (
        <TextPromptSheet
          title="Location"
          placeholder="Place name"
          submitLabel="Add"
          onClose={closeStickerSheet}
          onSubmit={(place) => {
            const sl = selectedSlide(stateRef.current);
            if (!sl) return;
            dispatch({ type: 'addOverlay', slideId: sl.id, overlay: newLocationOverlay(place) });
            closeStickerSheet();
            setTray(null);
          }}
        />
      ) : null}
      {stickerSheet === 'gif' ? (
        <InlineGifSheet
          onClose={closeStickerSheet}
          onSelect={(gif) => {
            const sl = selectedSlide(stateRef.current);
            if (!sl || !gif.url) return;
            dispatch({
              type: 'addOverlay',
              slideId: sl.id,
              overlay: newGifOverlay(gif.url, gif.previewUrl || undefined),
            });
            closeStickerSheet();
            setTray(null);
          }}
        />
      ) : null}

      <input
        ref={musicRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadMusic(f);
          e.target.value = '';
        }}
      />

      {tray === 'effects' ? (
        <BottomSheet onClose={() => setTray(null)} title="Filters & Looks">
          <CaptureLooksStrip
            previewSrc={slide.media?.type === 'image' ? slide.media.url : filterPreviewSrc || slide.media?.url}
            look={{
              filterId: slide.filterId,
              filterIntensity: slide.filterIntensity,
              effects: slide.effects,
              adjust: slide.adjust,
            }}
            onChange={(look) => {
              setCaptureLook(look);
              updateSlide({
                filterId: look.filterId,
                filterIntensity: look.filterIntensity,
                effects: look.effects,
                adjust: look.adjust,
              });
            }}
          />
          <label className="mt-3 flex items-center gap-3 text-[12px] text-white/70">
            Intensity
            <input
              type="range"
              min={0}
              max={100}
              value={slide.filterIntensity}
              disabled={slide.filterId === 'none'}
              onChange={(e) => updateSlide({ filterIntensity: Number(e.target.value) }, 'fint')}
              className="flex-1"
            />
          </label>
        </BottomSheet>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function QuickTile({
  icon,
  label,
  onClick,
  testId,
  accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex w-[88px] shrink-0 flex-col items-stretch gap-2 active:scale-[0.98]"
    >
      <span
        className={`flex aspect-[4/5] items-center justify-center rounded-2xl bg-gradient-to-br ${accent} shadow-lg shadow-black/40 ring-1 ring-white/15`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm">{icon}</span>
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-white/90">{label}</span>
    </button>
  );
}

function ToolFab({
  label,
  icon,
  active,
  onClick,
  testId,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${
        active ? 'bg-white text-black' : 'bg-black/45 text-white'
      }`}
    >
      {icon}
    </button>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-2xl bg-zinc-950/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl ring-1 ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[14px] font-semibold">{title}</span>
        <button type="button" aria-label="Close panel" onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  );
}

function StickerChip({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium"
    >
      {icon}
      {label}
    </button>
  );
}
