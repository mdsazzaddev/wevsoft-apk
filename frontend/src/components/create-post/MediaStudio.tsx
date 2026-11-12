import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  Blend, Captions, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Crop, Eye, Film, FlipHorizontal, Gauge,
  ImageIcon, Info, Layers, Loader2, Maximize, Music, Pause, Play, Redo2, RotateCw, ScanFace, Scissors, SkipBack,
  SkipForward, SlidersHorizontal, Smile, Sparkles, Trash2, Type, Undo2, Upload, Volume2, VolumeX, Wand2, X, ZoomIn,
  AlertTriangle, Brush, CircleDot, Download, Plus,
} from 'lucide-react';
import {
  ADJUST_KEYS, ASPECTS, EFFECTS, PRESETS, aspectRatioOf, defaultEdit, editCss, effectsCss, exportPhoto,
  fileKey, formatBytes, formatTime, isDefaultEdit, isRectFull, isVideoFile, normalizeEdit, presetCss, rectForAspect, videoEditMeta,
  type AdjustKey, type AspectId, type MediaEdit, type Rect, type Segment,
} from './mediaStudioModel';
import {
  buildVideoSpec, captionsToVtt, drawCaption, effectiveSegments, fetchAsFile, mapSourceCue, outToSrc, processPhoto,
  renderVideoOnServer, renderVideoOverlays, requestAutoCaptions, segLen, srcToOut, uid, type PhotoProcessInfo,
} from './mediaStudioPro';
import { uploadEditorMediaEarly } from '../../lib/editorMediaUpload';

/** Horizontal chip strip: vertical mouse-wheel scrolls sideways when the row overflows. */
function HScrollStrip({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div
      ref={ref}
      className={`-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [scrollbar-width:thin] ${className}`}
      data-testid="h-scroll-strip"
    >
      <div className="flex w-max gap-1.5">{children}</div>
    </div>
  );
}

export type MediaStudioVideoSave = ReturnType<typeof videoEditMeta> & { edit: MediaEdit };

type Props = {
  files: File[];
  previewUrls: string[];
  initialIndex: number;
  /** Edits already saved for this composer session (re-open keeps them). */
  savedEdits?: Record<string, MediaEdit>;
  onAddFiles?: (files: File[]) => void;
  /** Auth token: needed for server rendering, music/overlay uploads and auto captions. */
  token?: string | null;
  /** Uploaded URL of each file (null while still uploading). */
  sourceUrls?: Array<string | null>;
  onClose: () => void;
  onSave: (result: {
    photos: Array<{ index: number; file: File; edit: MediaEdit }>;
    videos: Array<{ index: number; meta: MediaStudioVideoSave; baked?: { file: File; url: string } }>;
  }) => void;
};

type Tool =
  | 'media' | 'crop' | 'adjust' | 'filters' | 'effects' | 'retouch' | 'text' | 'stickers'
  | 'audio' | 'speed' | 'trim' | 'captions' | 'background';

const SOON = 'Coming soon';
const PAD_FILLS: Array<{ id: string; label: string }> = [
  { id: '#000000', label: 'Black' },
  { id: '#ffffff', label: 'White' },
  { id: 'blur', label: 'Blur' },
];
const AUTOSAVE_PREFIX = 'wev_media_studio:';
const STICKERS = ['😀', '😍', '🔥', '🎉', '❤️', '👍', '⭐', '😎', '🌸', '📍', '✨', '🙌'];

type EditsMap = Record<string, MediaEdit>;

function cloneMap(m: EditsMap): EditsMap {
  return JSON.parse(JSON.stringify(m));
}

function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  return m === 1 ? '1 minute ago' : `${m} minutes ago`;
}

/** Adjustments only (for preset thumbnails so they reflect current sliders). */
function adjustOnlyCss(e: MediaEdit) {
  return editCss({ ...e, preset: 'original', effects: [] }).replace(/^none$/, '');
}

function useMediaMeta(files: File[], urls: string[]) {
  const [meta, setMeta] = useState<Record<string, { w: number; h: number; duration?: number }>>({});
  useEffect(() => {
    files.forEach((f, i) => {
      const k = fileKey(f);
      const url = urls[i];
      if (!url || meta[k]) return;
      if (isVideoFile(f)) {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.onloadedmetadata = () =>
          setMeta((p) => ({ ...p, [k]: { w: v.videoWidth, h: v.videoHeight, duration: v.duration } }));
        v.src = url;
      } else {
        const img = new Image();
        img.onload = () => setMeta((p) => ({ ...p, [k]: { w: img.naturalWidth, h: img.naturalHeight } }));
        img.src = url;
      }
    });
     
  }, [files, urls]);
  return meta;
}

/** Real frame thumbnails + audio peaks for the timeline. */
function useVideoTimeline(file: File | null, url: string | null, duration: number) {
  const [frames, setFrames] = useState<string[]>([]);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [audioState, setAudioState] = useState<'loading' | 'ok' | 'none'>('loading');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setFrames([]);
    if (!file || !url || !duration) return;
    let cancelled = false;
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.src = url;
    const N = 10;
    const out: string[] = [];
    const c = document.createElement('canvas');
    c.width = 112;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    let idx = 0;
    const grab = (i: number) => {
      if (cancelled) return;
      if (i >= N) {
        setFrames([...out]);
        return;
      }
      v.currentTime = Math.min(duration - 0.05, ((i + 0.5) * duration) / N);
    };
    v.onseeked = () => {
      try {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        out.push(c.toDataURL('image/jpeg', 0.6));
      } catch {
        /* ignore */
      }
      idx += 1;
      if (idx % 3 === 0 || idx === N) setFrames([...out]);
      grab(idx);
    };
    v.onloadeddata = () => grab(0);
    return () => {
      cancelled = true;
      v.removeAttribute('src');
    };
  }, [file, url, duration]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setPeaks(null);
    setAudioState('loading');
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) {
      setAudioState('none');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        const ac = new Ctx();
        const buf = await ac.decodeAudioData(await file.arrayBuffer());
        void ac.close();
        const data = buf.getChannelData(0);
        const bins = 240;
        const step = Math.max(1, Math.floor(data.length / bins));
        const p: number[] = [];
        let max = 0;
        for (let i = 0; i < bins; i++) {
          let mx = 0;
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) mx = Math.max(mx, Math.abs(data[j]));
          p.push(mx);
          max = Math.max(max, mx);
        }
        if (cancelled) return;
        if (max < 0.002) {
          setAudioState('none');
          return;
        }
        setPeaks(p.map((x) => x / max));
        setAudioState('ok');
      } catch {
        if (!cancelled) setAudioState('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);
  return { frames, peaks, audioState };
}

function CaptionPreview({ text, w, h }: { text: string; w: number; h: number }) {
  const px = Math.max(10, Math.min(w, h) * 0.055);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] flex justify-center" style={{ bottom: `${10}%` }} data-testid="caption-preview">
      <span
        className="max-w-[86%] text-center font-bold leading-[1.3] text-white"
        style={{ fontSize: px, background: 'rgba(0,0,0,0.6)', padding: `0 ${px * 0.4}px`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
      >
        {text}
      </span>
    </div>
  );
}

function Slider({
  value, min, max, step = 1, onChange, disabled, gradient, label,
}: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
  disabled?: boolean; gradient?: string; label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="ms-range h-1 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background:
          gradient ||
          `linear-gradient(to right, #2563eb 0%, #2563eb ${pct}%, rgb(var(--ms-track)) ${pct}%, rgb(var(--ms-track)) 100%)`,
      }}
    />
  );
}

export default function MediaStudio({ files, previewUrls, initialIndex, savedEdits, onAddFiles, token, sourceUrls, onClose, onSave }: Props) {
  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), Math.max(0, files.length - 1)));
  const file = files[index] || null;
  const url = previewUrls[index] || null;
  const key = file ? fileKey(file) : '';
  const isVideo = !!file && isVideoFile(file);
  const meta = useMediaMeta(files, previewUrls);
  const m = meta[key];

  // ---------- edits + undo/redo history ----------
  const initialMap = useMemo<EditsMap>(() => {
    const map: EditsMap = {};
    for (const f of files) {
      const k = fileKey(f);
      if (savedEdits?.[k]) map[k] = normalizeEdit(savedEdits[k]);
      else {
        try {
          const raw = sessionStorage.getItem(AUTOSAVE_PREFIX + k);
          if (raw) map[k] = normalizeEdit(JSON.parse(raw).edit);
        } catch {
          /* ignore */
        }
      }
    }
    return map;
     
  }, []);
  const [edits, setEdits] = useState<EditsMap>(initialMap);
  const [past, setPast] = useState<EditsMap[]>([]);
  const [future, setFuture] = useState<EditsMap[]>([]);
  const lastCommit = useRef<{ k: string; t: number }>({ k: '', t: 0 });
  const edit: MediaEdit = useMemo(() => (edits[key] ? normalizeEdit(edits[key]) : defaultEdit()), [edits, key]);

  const update = useCallback(
    (patch: Partial<MediaEdit> | ((e: MediaEdit) => Partial<MediaEdit>), coalesce?: string) => {
      if (!key) return;
      setEdits((prev) => {
        const cur = prev[key] ? normalizeEdit(prev[key]) : defaultEdit();
        const p = typeof patch === 'function' ? patch(cur) : patch;
        const now = Date.now();
        const ck = coalesce ? `${key}:${coalesce}` : '';
        if (!(ck && lastCommit.current.k === ck && now - lastCommit.current.t < 800)) {
          setPast((ps) => [...ps.slice(-60), cloneMap(prev)]);
          setFuture([]);
        }
        lastCommit.current = { k: ck, t: now };
        return { ...prev, [key]: { ...cur, ...p } };
      });
    },
    [key],
  );
  const editsRef = useRef(edits);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  editsRef.current = edits;
  const undo = useCallback(() => {
    setPast((ps) => {
      if (!ps.length) return ps;
      const prev = ps[ps.length - 1];
      const cur = editsRef.current;
      setFuture((f) => [cloneMap(cur), ...f]);
      setEdits(prev);
      lastCommit.current = { k: '', t: 0 };
      return ps.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((fs) => {
      if (!fs.length) return fs;
      const next = fs[0];
      const cur = editsRef.current;
      setPast((p) => [...p, cloneMap(cur)]);
      setEdits(next);
      lastCommit.current = { k: '', t: 0 };
      return fs.slice(1);
    });
  }, []);

  // ---------- autosave (this browser session) ----------
  const [savedAt, setSavedAt] = useState<number | null>(() => {
    let latest = 0;
    for (const f of files) {
      try {
        const raw = sessionStorage.getItem(AUTOSAVE_PREFIX + fileKey(f));
        if (raw) latest = Math.max(latest, JSON.parse(raw).at || 0);
      } catch {
        /* ignore */
      }
    }
    return latest || null;
  });
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const at = Date.now();
      try {
        for (const [k, e] of Object.entries(edits)) {
          sessionStorage.setItem(AUTOSAVE_PREFIX + k, JSON.stringify({ at, edit: e }));
        }
        setSavedAt(at);
        setNow(at);
      } catch {
        /* storage full / disabled */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [edits]);

  // ---------- working image (rotation / flip baked) ----------
  const [workingSrc, setWorkingSrc] = useState<string | null>(url);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoInfo, setPhotoInfo] = useState<PhotoProcessInfo>({ personCoverage: null, error: null });
  const processKey = JSON.stringify([edit.rotation, edit.flipH, edit.retouch, edit.background]);
  useEffect(() => {
    if (!url) return;
    if (isVideo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setWorkingSrc(url);
      return;
    }
    let alive = true;
    let made: string | null = null;
    const t = window.setTimeout(() => {
      setPhotoBusy(true);
      processPhoto(url, edit)
        .then(({ url: s, info }) => {
          if (!alive) {
            if (s !== url) URL.revokeObjectURL(s);
            return;
          }
          if (s !== url) made = s;
          setWorkingSrc(s);
          setPhotoInfo(info);
        })
        .catch((err) => {
          if (!alive) return;
          setWorkingSrc(url);
          setPhotoInfo({ personCoverage: null, error: err?.message || 'Photo processing failed' });
        })
        .finally(() => alive && setPhotoBusy(false));
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(t);
      if (made) {
        const toRevoke = made;
        window.setTimeout(() => URL.revokeObjectURL(toRevoke), 2000);
      }
    };
     
  }, [url, isVideo, processKey]);
  const [workDims, setWorkDims] = useState<{ w: number; h: number } | null>(null);

  // ---------- ui state ----------
  const [tool, setTool] = useState<Tool>('media');
  const [rightTab, setRightTab] = useState<'adjust' | 'filters' | 'effects'>('adjust');
  const [libTab, setLibTab] = useState<'all' | 'photos' | 'videos'>('all');
  const [libSortDesc, setLibSortDesc] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'media' | 'edit'>('edit');
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [brushMode, setBrushMode] = useState<'off' | 'heal' | 'redeye'>('off');
  const [brushSize, setBrushSize] = useState(3);
  const [capBusy, setCapBusy] = useState(false);
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicErr, setMusicErr] = useState<string | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!fileMenu) return;
    const onPtr = (e: PointerEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFileMenu(false);
    };
    document.addEventListener('pointerdown', onPtr);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPtr);
      document.removeEventListener('keydown', onKey);
    };
  }, [fileMenu]);
  const stageRef = useRef<HTMLDivElement>(null);

  // ---------- video ----------
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  /** Source time of the <video> element. */
  const [time, setTime] = useState(0);
  const duration = m?.duration || 0;
  const segs: Segment[] = isVideo && duration ? effectiveSegments(edit, duration) : [];
  const outDur = segLen(segs) / (edit.speed || 1);
  const trimEnd = edit.trimEnd ?? duration;
  const [segIdx, setSegIdx] = useState(0);
  const segIdxRef = useRef(0);
  const [selSeg, setSelSeg] = useState(0);
  const tOut = segs.length ? srcToOut(segs, edit.speed, Math.min(segIdx, segs.length - 1), time) : 0;
  const [zoom, setZoom] = useState(100);
  const { frames, peaks, audioState } = useVideoTimeline(isVideo ? file : null, isVideo ? url : null, duration);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setPlaying(false);
    setTime(0);
    setWorkDims(null);
    setSegIdx(0);
    segIdxRef.current = 0;
    setSelSeg(0);
  }, [key]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (selSeg > segs.length - 1) setSelSeg(Math.max(0, segs.length - 1));
    if (segIdxRef.current > segs.length - 1) {
      segIdxRef.current = 0;
      setSegIdx(0);
    }
  }, [segs.length, selSeg]);
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.defaultPlaybackRate = edit.speed;
      v.playbackRate = edit.speed;
    }
  }, [edit.speed, key]);
  /** Fade gain (0..1) at output time t for a fade-in/out pair. */
  const fadeGain = (t: number, fin: number, fout: number) => {
    let g = 1;
    if (fin > 0 && t < fin) g = Math.min(g, Math.max(0, t / fin));
    if (fout > 0 && outDur - t < fout) g = Math.min(g, Math.max(0, (outDur - t) / fout));
    return g;
  };
  const applyAudio = (t: number) => {
    const v = videoRef.current;
    if (v) {
      v.muted = edit.muted;
      v.volume = Math.min(1, Math.max(0, (edit.volume / 100) * fadeGain(t, edit.audioFadeIn, edit.audioFadeOut)));
    }
    const a = musicRef.current;
    if (a && edit.music) a.volume = Math.min(1, Math.max(0, (edit.music.volume / 100) * fadeGain(t, edit.audioFadeIn, edit.audioFadeOut)));
  };
  useEffect(() => {
    applyAudio(tOut);
     
  }, [edit.muted, edit.volume, edit.music?.volume, edit.audioFadeIn, edit.audioFadeOut, key]);
  const syncMusic = (t: number, play: boolean) => {
    const a = musicRef.current;
    if (!a || !edit.music) return;
    const d = a.duration || 0;
    const target = d ? t % d : t;
    if (Math.abs(a.currentTime - target) > 0.3) a.currentTime = target;
    if (play && a.paused) void a.play().catch(() => {});
    if (!play && !a.paused) a.pause();
  };
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !segs.length) return;
    let i = Math.min(segIdxRef.current, segs.length - 1);
    const s = segs[i];
    if (!v.paused && v.currentTime >= s.end - 0.04) {
      if (i + 1 < segs.length) {
        i += 1;
        segIdxRef.current = i;
        setSegIdx(i);
        v.currentTime = segs[i].start;
      } else {
        v.pause();
        segIdxRef.current = 0;
        setSegIdx(0);
        v.currentTime = segs[0].start;
        syncMusic(0, false);
      }
    } else if (!v.paused && v.currentTime < s.start - 0.25) {
      v.currentTime = s.start;
    }
    setTime(v.currentTime);
    const t = srcToOut(segs, edit.speed, segIdxRef.current, v.currentTime);
    applyAudio(t);
    if (!v.paused) syncMusic(t, true);
  };
  const seekOut = (t: number) => {
    const v = videoRef.current;
    if (!segs.length) return;
    const { i, src } = outToSrc(segs, edit.speed, Math.min(Math.max(0, t), outDur));
    segIdxRef.current = i;
    setSegIdx(i);
    if (v) v.currentTime = src;
    setTime(src);
    syncMusic(t, !!v && !v.paused);
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !segs.length) return;
    if (v.paused) {
      const s = segs[Math.min(segIdxRef.current, segs.length - 1)];
      if (v.currentTime < s.start - 0.05 || v.currentTime >= s.end - 0.05) {
        segIdxRef.current = 0;
        setSegIdx(0);
        v.currentTime = segs[0].start;
      }
      void v.play();
      syncMusic(srcToOut(segs, edit.speed, segIdxRef.current, v.currentTime), true);
    } else {
      v.pause();
      syncMusic(0, false);
    }
  };
  const fadeOpacity = isVideo && playing ? fadeGain(tOut, edit.fadeIn, edit.fadeOut) : 1;
  const inWindow = (st?: number | null, en?: number | null) => !isVideo || ((st ?? 0) <= tOut + 1e-3 && tOut <= (en ?? 1e9));
  /** Edit-list operations. */
  const setSegments = (next: Segment[], coalesce?: string) => update({ segments: next, trimStart: 0, trimEnd: null }, coalesce);
  const splitAtPlayhead = () => {
    if (!segs.length) return;
    const i = Math.min(segIdxRef.current, segs.length - 1);
    const s = segs[i];
    const p = time;
    if (p - s.start < 0.2 || s.end - p < 0.2) return;
    const next = [...segs.slice(0, i), { id: uid('s'), start: s.start, end: p }, { id: uid('s'), start: p, end: s.end }, ...segs.slice(i + 1)];
    setSegments(next);
    setSelSeg(i + 1);
  };
  const deleteSegment = () => {
    if (segs.length < 2) return;
    const i = Math.min(selSeg, segs.length - 1);
    setSegments(segs.filter((_, j) => j !== i));
    setSelSeg(Math.max(0, i - 1));
    segIdxRef.current = 0;
    setSegIdx(0);
  };
  const duplicateSegment = () => {
    if (!segs.length) return;
    const i = Math.min(selSeg, segs.length - 1);
    const s = segs[i];
    setSegments([...segs.slice(0, i + 1), { id: uid('s'), start: s.start, end: s.end }, ...segs.slice(i + 1)]);
    setSelSeg(i + 1);
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---------- aspect / crop ----------
  const isRot90 = edit.rotation % 180 === 90;
  const rot90 = isRot90;
  const rawW = isVideo ? m?.w || 0 : workDims?.w || 0;
  const rawH = isVideo ? m?.h || 0 : workDims?.h || 0;
  const mediaW = isRot90 ? rawH : rawW;
  const mediaH = isRot90 ? rawW : rawH;
  const FULL = { x: 0, y: 0, w: 1, h: 1 };
  const setAspect = (id: AspectId) => {
    const r = aspectRatioOf(id);
    update({ aspect: id, crop: r && edit.fit === 'fill' ? rectForAspect(r, mediaW, mediaH) : { ...FULL } });
  };
  const setFit = (fit: 'fit' | 'fill') => {
    const r = aspectRatioOf(edit.aspect);
    update({ fit, crop: r && fit === 'fill' ? rectForAspect(r, mediaW, mediaH) : { ...FULL } });
  };
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: string; sx: number; sy: number; start: Rect } | null>(null);
  const onCropDown = (mode: string) => (e: ReactPointerEvent) => {
    if (previewing) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, start: { ...edit.crop } };
  };
  const onCropMove = (e: ReactPointerEvent | PointerEvent) => {
    const d = dragRef.current;
    const boxEl = boxRef.current;
    if (!d || !boxEl) return;
    const box = boxEl.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dx = (e.clientX - d.sx) / box.width;
    const dy = (e.clientY - d.sy) / box.height;
    const s = d.start;
    const MIN = 0.06;

    if (d.mode === 'move') {
      const x = Math.min(Math.max(0, s.x + dx), 1 - s.w);
      const y = Math.min(Math.max(0, s.y + dy), 1 - s.h);
      update({ crop: { x, y, w: s.w, h: s.h } }, 'crop');
      return;
    }

    const ratio = aspectRatioOf(edit.aspect);
    const hasLockedRatio = ratio !== null && edit.fit === 'fill' && mediaW > 0 && mediaH > 0;

    if (!hasLockedRatio) {
      // Freeform crop
      let x1 = s.x;
      let y1 = s.y;
      let x2 = s.x + s.w;
      let y2 = s.y + s.h;

      if (d.mode.includes('w')) x1 = Math.min(Math.max(0, s.x + dx), x2 - MIN);
      if (d.mode.includes('e')) x2 = Math.max(Math.min(1, s.x + s.w + dx), x1 + MIN);
      if (d.mode.includes('n')) y1 = Math.min(Math.max(0, s.y + dy), y2 - MIN);
      if (d.mode.includes('s')) y2 = Math.max(Math.min(1, s.y + s.h + dy), y1 + MIN);

      update({ crop: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } }, 'crop');
      return;
    }

    // Proportional locked aspect ratio: (w * mediaW) / (h * mediaH) = ratio => w / h = K
    const K = ratio * (mediaH / mediaW);

    if (d.mode === 'se') {
      const maxW = 1 - s.x;
      const maxH = 1 - s.y;
      const limitW = Math.min(maxW, maxH * K);
      const deltaW = dx;
      const deltaH = dy * K;
      const delta = Math.abs(dx) > Math.abs(dy) ? deltaW : deltaH;
      const newW = Math.max(MIN * K, Math.min(limitW, s.w + delta));
      const newH = newW / K;
      update({ crop: { x: s.x, y: s.y, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'sw') {
      const x2 = s.x + s.w;
      const maxW = x2;
      const maxH = 1 - s.y;
      const limitW = Math.min(maxW, maxH * K);
      const deltaW = -dx;
      const deltaH = dy * K;
      const delta = Math.abs(dx) > Math.abs(dy) ? deltaW : deltaH;
      const newW = Math.max(MIN * K, Math.min(limitW, s.w + delta));
      const newH = newW / K;
      update({ crop: { x: x2 - newW, y: s.y, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'ne') {
      const y2 = s.y + s.h;
      const maxW = 1 - s.x;
      const maxH = y2;
      const limitW = Math.min(maxW, maxH * K);
      const deltaW = dx;
      const deltaH = -dy * K;
      const delta = Math.abs(dx) > Math.abs(dy) ? deltaW : deltaH;
      const newW = Math.max(MIN * K, Math.min(limitW, s.w + delta));
      const newH = newW / K;
      update({ crop: { x: s.x, y: y2 - newH, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'nw') {
      const x2 = s.x + s.w;
      const y2 = s.y + s.h;
      const maxW = x2;
      const maxH = y2;
      const limitW = Math.min(maxW, maxH * K);
      const deltaW = -dx;
      const deltaH = -dy * K;
      const delta = Math.abs(dx) > Math.abs(dy) ? deltaW : deltaH;
      const newW = Math.max(MIN * K, Math.min(limitW, s.w + delta));
      const newH = newW / K;
      update({ crop: { x: x2 - newW, y: y2 - newH, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'e') {
      const maxW = 1 - s.x;
      const newW = Math.max(MIN * K, Math.min(maxW, Math.min(s.w + dx, 1 * K)));
      const newH = Math.min(1, newW / K);
      const cy = s.y + s.h / 2;
      const newY = Math.max(0, Math.min(1 - newH, cy - newH / 2));
      update({ crop: { x: s.x, y: newY, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'w') {
      const x2 = s.x + s.w;
      const newW = Math.max(MIN * K, Math.min(x2, Math.min(s.w - dx, 1 * K)));
      const newH = Math.min(1, newW / K);
      const cy = s.y + s.h / 2;
      const newY = Math.max(0, Math.min(1 - newH, cy - newH / 2));
      update({ crop: { x: x2 - newW, y: newY, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 's') {
      const maxH = 1 - s.y;
      const newH = Math.max(MIN, Math.min(maxH, Math.min(s.h + dy, 1 / K)));
      const newW = Math.min(1, newH * K);
      const cx = s.x + s.w / 2;
      const newX = Math.max(0, Math.min(1 - newW, cx - newW / 2));
      update({ crop: { x: newX, y: s.y, w: newW, h: newH } }, 'crop');
    } else if (d.mode === 'n') {
      const y2 = s.y + s.h;
      const newH = Math.max(MIN, Math.min(y2, Math.min(s.h - dy, 1 / K)));
      const newW = Math.min(1, newH * K);
      const cx = s.x + s.w / 2;
      const newX = Math.max(0, Math.min(1 - newW, cx - newW / 2));
      update({ crop: { x: newX, y: y2 - newH, w: newW, h: newH } }, 'crop');
    }
  };

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      onCropMove(e);
    };
    const handleGlobalUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
      }
    };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [edit.aspect, edit.fit, mediaW, mediaH]);

  // ---------- overlay drag (text / stickers) ----------
  const layerDrag = useRef<{ kind: 'text' | 'sticker'; id: string } | null>(null);
  const onLayerDown = (kind: 'text' | 'sticker', id: string) => (e: ReactPointerEvent) => {
    if (previewing) return;
    e.stopPropagation();
    boxRef.current?.setPointerCapture?.(e.pointerId);
    layerDrag.current = { kind, id };
  };
  const onLayerMove = (e: ReactPointerEvent) => {
    const d = layerDrag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const x = Math.min(Math.max(0, (e.clientX - box.left) / box.width), 1);
    const y = Math.min(Math.max(0, (e.clientY - box.top) / box.height), 1);
    if (d.kind === 'text') update((c) => ({ texts: c.texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) }), 'layer');
    else update((c) => ({ stickers: c.stickers.map((t) => (t.id === d.id ? { ...t, x, y } : t)) }), 'layer');
  };
  const [boxSize, setBoxSize] = useState({ w: 400, h: 400 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBoxSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [key, workingSrc]);

  // ---------- save ----------
  const dirtyKeys = Object.entries(edits)
    .filter(([k, e]) => !isDefaultEdit(e) || !!savedEdits?.[k])
    .map(([k]) => k);
  const hasChanges = past.length > 0;
  const [render, setRender] = useState<{ label: string; pct: number; error?: string } | null>(null);
  const handleSave = async () => {
    setSaving(true);
    setRender(null);
    try {
      const photos: Array<{ index: number; file: File; edit: MediaEdit }> = [];
      const videos: Array<{ index: number; meta: MediaStudioVideoSave; baked?: { file: File; url: string } }> = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const k = fileKey(f);
        const e = edits[k] ? normalizeEdit(edits[k]) : null;
        if (!e || !dirtyKeys.includes(k)) continue;
        if (isVideoFile(f)) {
          if (isDefaultEdit(e)) {
            videos.push({ index: i, meta: { ...videoEditMeta(e), edit: e } });
            continue;
          }
          const src = sourceUrls?.[i];
          if (!token) throw new Error('Please sign in again to render videos.');
          if (!src) throw new Error(`"${f.name}" is still uploading. Wait for the upload to finish, then save again.`);
          const mm = meta[k];
          if (!mm?.duration || !mm.w || !mm.h) throw new Error(`Could not read "${f.name}" metadata.`);
          setRender({ label: `Preparing overlays · ${f.name}`, pct: 0 });
          const rw = e.rotation % 180 === 90 ? mm.h : mm.w;
          const rh = e.rotation % 180 === 90 ? mm.w : mm.h;
          const pngs = await renderVideoOverlays(e, rw, rh);
          const overlays: Array<{ url: string; start: number | null; end: number | null }> = [];
          for (let n = 0; n < pngs.length; n++) {
            const up = await uploadEditorMediaEarly(new File([pngs[n].blob], `studio-overlay-${n}.png`, { type: 'image/png' }), token);
            overlays.push({ url: up.publicUrl, start: pngs[n].start, end: pngs[n].end });
          }
          const spec = buildVideoSpec(e, mm.duration, overlays);
          const r = await renderVideoOnServer(token, src, spec, (p, stage) =>
            setRender({ label: `${stage || 'Rendering'} · ${f.name}`, pct: p }),
          );
          setRender({ label: `Downloading result · ${f.name}`, pct: 100 });
          const baked = await fetchAsFile(r.url, f.name.replace(/(\.[a-z0-9]+)?$/i, '-edited.mp4'));
          videos.push({ index: i, meta: { ...videoEditMeta(e), edit: e }, baked: { file: baked, url: r.url } });
        } else if (!isDefaultEdit(e)) {
          const { url: src } = await processPhoto(previewUrls[i], e);
          photos.push({ index: i, file: await exportPhoto(f, src, e), edit: e });
        }
      }
      for (const f of files) {
        try {
          sessionStorage.removeItem(AUTOSAVE_PREFIX + fileKey(f));
        } catch {
          /* ignore */
        }
      }
      setRender(null);
      onSave({ photos, videos });
    } catch (err: any) {
      setRender({ label: 'Could not save', pct: 0, error: err?.message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };
  const requestClose = () => {
    if (hasChanges) setConfirmClose(true);
    else onClose();
  };

  // ---------- derived ----------
  const css = editCss(edit);
  const library = files
    .map((f, i) => ({ f, i, url: previewUrls[i] }))
    .filter((x) => (libTab === 'all' ? true : libTab === 'videos' ? isVideoFile(x.f) : !isVideoFile(x.f)));
  if (libSortDesc) library.reverse();
  const firstPhoto = files.findIndex((f) => !isVideoFile(f));
  const firstVideo = files.findIndex((f) => isVideoFile(f));
  const thumbSrc = isVideo ? frames[0] || null : workingSrc;
  const fitRatio = (() => {
    const r = aspectRatioOf(edit.aspect);
    return r && edit.fit === 'fit' ? r : null;
  })();

  const railItems: Array<{ id: Tool; label: string; icon: any; soon?: boolean; photoOnly?: boolean; videoOnly?: boolean }> = [
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'crop', label: 'Crop', icon: Crop },
    { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
    { id: 'filters', label: 'Filters', icon: Blend },
    { id: 'effects', label: 'Effects', icon: Wand2 },
    { id: 'retouch', label: 'Retouch', icon: ScanFace, photoOnly: true },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'audio', label: 'Audio', icon: Music, videoOnly: true },
    { id: 'speed', label: 'Speed', icon: Gauge, videoOnly: true },
    { id: 'trim', label: 'Trim', icon: Scissors, videoOnly: true },
    { id: 'captions', label: 'Captions', icon: Captions, videoOnly: true },
    { id: 'background', label: 'Background', icon: Layers, photoOnly: true },
  ];
  const pickTool = (t: Tool) => {
    if (t === 'adjust' || t === 'filters' || t === 'effects') {
      setRightTab(t === 'adjust' ? 'adjust' : t);
      setMobilePanel('edit');
    } else setMobilePanel('media');
    setTool(t);
  };
  const leftPanelTool: Tool = tool === 'adjust' || tool === 'filters' || tool === 'effects' ? 'media' : tool;
  // Switching between photo/video: drop a tool that doesn't apply.
  useEffect(() => {
    const item = railItems.find((r) => r.id === tool);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (item && ((item.photoOnly && isVideo) || (item.videoOnly && !isVideo))) setTool('media');
     
  }, [isVideo]);


  // ---------- shared small controls ----------
  const numInput = 'h-7 w-[58px] rounded-md border border-slate-200 bg-white px-1.5 text-right text-[11.5px] outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white';
  const timingRow = (st: number | null | undefined, en: number | null | undefined, onChange: (s: number | null, e: number | null) => void, label: string) =>
    isVideo ? (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <span>Show</span>
        <input type="number" step={0.1} min={0} max={outDur} aria-label={`${label} start`} value={st ?? 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0), en ?? null)} className={numInput} />
        <span>to</span>
        <input type="number" step={0.1} min={0} max={outDur} aria-label={`${label} end`} value={Number((en ?? outDur).toFixed(2))} onChange={(e) => onChange(st ?? 0, Math.max(0, Number(e.target.value) || 0))} className={numInput} />
        <span>s</span>
        <button type="button" className="text-blue-600 hover:underline dark:text-blue-400" onClick={() => onChange(Math.round(tOut * 10) / 10, en ?? null)}>
          start at playhead
        </button>
        {st != null || en != null ? (
          <button type="button" className="text-slate-500 hover:underline" onClick={() => onChange(null, null)}>
            whole clip
          </button>
        ) : null}
      </div>
    ) : null;
  const switchEl = (on: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-[18px] w-8 shrink-0 rounded-full transition ${on ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/15'}`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${on ? 'left-[16px]' : 'left-0.5'}`} />
    </button>
  );

  // ---------- left panel (media library or tool options) ----------
  const tabBtn = (active: boolean) =>
    `-mb-px border-b-2 px-2.5 py-2 text-[12px] font-medium ${
      active
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
    }`;
  const leftPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {leftPanelTool === 'media' ? (
        <>
          <div className="p-3 pb-2">
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={!onAddFiles}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload size={15} /> Upload media
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              data-testid="studio-upload"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                if (list.length) onAddFiles?.(list);
                e.target.value = '';
              }}
            />
          </div>
          <div className="flex items-center gap-1 border-b border-slate-200 px-3 dark:border-white/10">
            {(['all', 'photos', 'videos'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setLibTab(t)} className={tabBtn(libTab === t)}>
                {t === 'all' ? 'All' : t === 'photos' ? 'Photos' : 'Videos'}
              </button>
            ))}
            <button
              type="button"
              title={libSortDesc ? 'Sort: last added first' : 'Sort: first added first'}
              aria-label="Sort media"
              onClick={() => setLibSortDesc((v) => !v)}
              className="ml-auto rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {library.length === 0 ? (
              <p className="mb-3 py-4 text-center text-[12px] text-slate-500">
                No {libTab === 'photos' ? 'photos' : libTab === 'videos' ? 'videos' : 'media'} in this post yet.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3">
              {library.map(({ f, i, url: u }) => {
                const mm = meta[fileKey(f)];
                const vid = isVideoFile(f);
                const active = i === index;
                const e = edits[fileKey(f)];
                const style = { filter: e ? editCss(e) : undefined };
                return (
                  <button key={fileKey(f) + i} type="button" onClick={() => setIndex(i)} className="min-w-0 text-left" aria-current={active || undefined}>
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-md bg-slate-200 ring-offset-1 dark:bg-white/10 dark:ring-offset-[#14171c] ${
                        active ? 'ring-2 ring-blue-600' : 'hover:ring-1 hover:ring-slate-300'
                      }`}
                    >
                      {vid ? (
                        <video src={u} muted preload="metadata" className="h-full w-full object-cover" style={style} />
                      ) : (
                        <img src={u} alt="" className="h-full w-full object-cover" style={style} />
                      )}
                      {vid ? (
                        <>
                          <Film size={12} className="absolute bottom-1 left-1 text-white drop-shadow" />
                          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                            {mm?.duration ? formatTime(mm.duration) : '--:--'}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{f.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {vid ? (mm?.duration ? formatTime(mm.duration) : '…') : formatBytes(f.size)}
                    </p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                disabled={!onAddFiles}
                data-testid="studio-add-more"
                className="min-w-0 text-left disabled:opacity-50"
              >
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-300">
                  <Plus size={20} strokeWidth={2.25} />
                  <span className="text-[11px] font-semibold">Add more</span>
                </div>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[12px]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{railItems.find((r) => r.id === leftPanelTool)?.label}</p>
            <button type="button" onClick={() => setTool('media')} className="text-[11.5px] font-medium text-blue-600 hover:underline dark:text-blue-400">
              Back to media
            </button>
          </div>
          {leftPanelTool === 'crop' ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="mb-2 block font-semibold text-slate-700 dark:text-slate-300">Aspect Ratio</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAspect(a.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 px-2 text-[11.5px] font-medium transition-all ${
                        edit.aspect === a.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {a.id === 'original' ? <Crop size={13} /> : null}
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block font-semibold text-slate-700 dark:text-slate-300">Framing</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fill', 'fit'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFit(f)}
                      className={`rounded-lg border py-2 px-2 text-[11.5px] font-medium transition-all ${
                        edit.fit === f
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {f === 'fill' ? 'Fill (Crop)' : 'Fit (Letterbox)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block font-semibold text-slate-700 dark:text-slate-300">Transform</span>
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => update({ rotation: ((edit.rotation + 90) % 360) as MediaEdit['rotation'], crop: { ...FULL } })}
                      className="ms-btn flex items-center justify-center gap-1.5"
                    >
                      <RotateCw size={13} /> Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ flipH: !edit.flipH })}
                      className="ms-btn flex items-center justify-center gap-1.5"
                    >
                      <FlipHorizontal size={13} /> Flip H
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ crop: { ...FULL }, aspect: 'original', rotation: 0, flipH: false })}
                    className="ms-btn w-full text-slate-600 dark:text-slate-400"
                  >
                    Reset crop & transform
                  </button>
                </div>
              </div>

              <p className="rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-500 dark:bg-white/5 dark:text-slate-400">
                Tip: Drag handles to resize the crop area, or drag inside the box to reposition.
              </p>
            </div>
          ) : null}
          {leftPanelTool === 'text' ? (
            <div className="space-y-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type your text"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[12px] outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} aria-label="Text color" className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-white/10" />
                <button
                  type="button"
                  disabled={!newText.trim()}
                  onClick={() => {
                    update((c) => ({ texts: [...c.texts, { id: uid('t'), text: newText.trim(), x: 0.5, y: 0.5, size: 8, color: textColor }] }));
                    setNewText('');
                  }}
                  className="flex-1 rounded-md bg-blue-600 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  Add text
                </button>
              </div>
              {edit.texts.map((t) => (
                <div key={t.id} className="rounded-md border border-slate-200 px-2 py-1.5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate dark:text-white">{t.text}</span>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    value={t.size}
                    aria-label="Text size"
                    onChange={(e) => update((c) => ({ texts: c.texts.map((x) => (x.id === t.id ? { ...x, size: Number(e.target.value) } : x)) }), 'tsize')}
                    className="w-16"
                  />
                  <button type="button" aria-label="Remove text" onClick={() => update((c) => ({ texts: c.texts.filter((x) => x.id !== t.id) }))} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
                {timingRow(t.start, t.end, (a, b) => update((c) => ({ texts: c.texts.map((x) => (x.id === t.id ? { ...x, start: a, end: b } : x)) }), `tt-${t.id}`), 'Text')}
                </div>
              ))}
              <p className="text-slate-500 dark:text-slate-400">Drag text on the canvas to move it.</p>
            </div>
          ) : null}
          {leftPanelTool === 'stickers' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update((c) => ({ stickers: [...c.stickers, { id: uid('k'), emoji: s, x: 0.5, y: 0.5, size: 12 }] }))}
                    className="flex aspect-square items-center justify-center rounded-md border border-slate-200 text-xl hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {edit.stickers.map((st) => (
                <div key={st.id} className="rounded-md border border-slate-200 px-2 py-1.5 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{st.emoji}</span>
                    <input
                      type="range"
                      min={4}
                      max={30}
                      value={st.size}
                      aria-label="Sticker size"
                      onChange={(e) => update((c) => ({ stickers: c.stickers.map((x) => (x.id === st.id ? { ...x, size: Number(e.target.value) } : x)) }), 'ssize')}
                      className="min-w-0 flex-1"
                    />
                    <button type="button" aria-label="Remove sticker" onClick={() => update((c) => ({ stickers: c.stickers.filter((x) => x.id !== st.id) }))} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {timingRow(st.start, st.end, (a, b) => update((c) => ({ stickers: c.stickers.map((x) => (x.id === st.id ? { ...x, start: a, end: b } : x)) }), `st-${st.id}`), 'Sticker')}
                </div>
              ))}
              {edit.stickers.length ? (
                <button type="button" onClick={() => update({ stickers: [] })} className="ms-btn w-full">
                  Remove all stickers
                </button>
              ) : null}
              <p className="text-slate-500 dark:text-slate-400">Drag stickers on the canvas to move them.</p>
            </div>
          ) : null}
          {leftPanelTool === 'speed' ? (
            <div className="space-y-2">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ speed: s })}
                  className={`ms-btn w-full !justify-between ${edit.speed === s ? '!border-blue-600 text-blue-600' : ''}`}
                >
                  {s === 1 ? '1.0x' : `${s}x`} {edit.speed === s ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
          {leftPanelTool === 'trim' ? (
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <p>Drag the blue handles of the selected clip on the timeline, or use the playhead:</p>
              {segs[selSeg] ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const s0 = segs[selSeg];
                      if (segIdxRef.current !== selSeg || time >= s0.end - 0.2) return;
                      setSegments(segs.map((x, j) => (j === selSeg ? { ...x, start: Math.max(0, time) } : x)));
                    }}
                    className="ms-btn w-full"
                  >
                    Set clip {selSeg + 1} start at playhead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s0 = segs[selSeg];
                      if (segIdxRef.current !== selSeg || time <= s0.start + 0.2) return;
                      setSegments(segs.map((x, j) => (j === selSeg ? { ...x, end: Math.min(duration, time) } : x)));
                    }}
                    className="ms-btn w-full"
                  >
                    Set clip {selSeg + 1} end at playhead
                  </button>
                </>
              ) : null}
              <div className="space-y-1 pt-1" data-testid="segment-list">
                {segs.map((sg, j) => (
                  <button
                    key={sg.id + j}
                    type="button"
                    onClick={() => setSelSeg(j)}
                    className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-[11.5px] ${
                      j === selSeg ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <span>Clip {j + 1}</span>
                    <span className="tabular-nums">
                      {sg.start.toFixed(1)}s – {sg.end.toFixed(1)}s
                    </span>
                  </button>
                ))}
              </div>
              <p>
                Output length: <b className="tabular-nums">{outDur.toFixed(1)}s</b> {edit.speed !== 1 ? `(at ${edit.speed}x)` : ''}
              </p>
              <button type="button" onClick={() => update({ trimStart: 0, trimEnd: null, segments: null })} className="ms-btn w-full">
                Reset edit list
              </button>
            </div>
          ) : null}
          {leftPanelTool === 'retouch' ? (
            <div className="space-y-3 text-slate-600 dark:text-slate-300">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Skin smoothing</span>
                  <span className="tabular-nums">{edit.retouch.smooth}</span>
                </div>
                <Slider label="Skin smoothing" value={edit.retouch.smooth} min={0} max={100} onChange={(v) => update((c) => ({ retouch: { ...c.retouch, smooth: v } }), 'smooth')} />
                <p className="mt-1 text-[10.5px] text-slate-500">Smooths skin-tone areas only and keeps edges (eyes, hair) sharp.</p>
              </div>
              <div>
                <p className="mb-1">Brush (click on the photo)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ['off', 'Off'],
                    ['heal', 'Spot heal'],
                    ['redeye', 'Red-eye'],
                  ] as const).map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={brushMode === id} onClick={() => setBrushMode(id)} className={`ms-btn ${brushMode === id ? '!border-blue-600 text-blue-600' : ''}`}>
                      {id === 'heal' ? <Brush size={13} /> : id === 'redeye' ? <CircleDot size={13} /> : null}
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0">Brush size</span>
                  <Slider label="Brush size" value={brushSize} min={1} max={10} onChange={setBrushSize} />
                </div>
              </div>
              <p>
                {edit.retouch.spots.length} healed spot{edit.retouch.spots.length === 1 ? '' : 's'}, {edit.retouch.redEye.length} red-eye fix
                {edit.retouch.redEye.length === 1 ? '' : 'es'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" className="ms-btn" disabled={!edit.retouch.spots.length && !edit.retouch.redEye.length} onClick={() => update((c) => (c.retouch.spots.length ? { retouch: { ...c.retouch, spots: c.retouch.spots.slice(0, -1) } } : { retouch: { ...c.retouch, redEye: c.retouch.redEye.slice(0, -1) } }))}>
                  Undo last spot
                </button>
                <button type="button" className="ms-btn" onClick={() => update({ retouch: { smooth: 0, spots: [], redEye: [] } })}>
                  Reset retouch
                </button>
              </div>
              {photoBusy ? (
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Loader2 size={12} className="animate-spin" /> Processing…
                </p>
              ) : null}
            </div>
          ) : null}
          {leftPanelTool === 'background' ? (
            <div className="space-y-3 text-slate-600 dark:text-slate-300">
              <p className="text-[11px] text-slate-500">Detects people on-device (MediaPipe selfie segmentation) and changes everything behind them.</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['none', 'Original'],
                  ['blur', 'Blur'],
                  ['color', 'Color'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={edit.background.mode === id}
                    onClick={() => update((c) => ({ background: { ...c.background, mode: id } }))}
                    className={`ms-btn ${edit.background.mode === id ? '!border-blue-600 text-blue-600' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {edit.background.mode === 'blur' ? (
                <div>
                  <div className="mb-1 flex justify-between">
                    <span>Blur strength</span>
                    <span className="tabular-nums">{edit.background.amount}</span>
                  </div>
                  <Slider label="Background blur" value={edit.background.amount} min={5} max={100} onChange={(v) => update((c) => ({ background: { ...c.background, amount: v } }), 'bgamt')} />
                </div>
              ) : null}
              {edit.background.mode === 'color' ? (
                <div className="flex flex-wrap items-center gap-2">
                  {['#ffffff', '#000000', '#2563eb', '#f1f5f9', '#fde68a', '#bbf7d0'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Background ${c}`}
                      onClick={() => update((x) => ({ background: { ...x.background, color: c } }))}
                      className={`h-7 w-7 rounded-full border ${edit.background.color === c ? 'ring-2 ring-blue-600 ring-offset-1' : 'border-slate-300'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input type="color" aria-label="Custom background color" value={edit.background.color} onChange={(e) => update((x) => ({ background: { ...x.background, color: e.target.value } }), 'bgcol')} className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-transparent" />
                </div>
              ) : null}
              {photoBusy ? (
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Loader2 size={12} className="animate-spin" /> Detecting person…
                </p>
              ) : edit.background.mode !== 'none' && photoInfo.error ? (
                <p className="flex gap-1 text-[11px] text-red-600"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {photoInfo.error}</p>
              ) : edit.background.mode !== 'none' && photoInfo.personCoverage != null && photoInfo.personCoverage < 0.01 ? (
                <p className="flex gap-1 text-[11px] text-amber-600" data-testid="bg-no-person"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> No person detected in this photo, so the whole image is treated as background.</p>
              ) : edit.background.mode !== 'none' && photoInfo.personCoverage != null ? (
                <p className="text-[11px] text-emerald-600" data-testid="bg-person">Person detected ({Math.round(photoInfo.personCoverage * 100)}% of the photo).</p>
              ) : null}
              <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                <p className="mb-1">Letterbox fill (Fit + ratio)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAD_FILLS.map((p) => (
                    <button key={p.id} type="button" aria-pressed={edit.padFill === p.id} onClick={() => update({ padFill: p.id })} className={`ms-btn ${edit.padFill === p.id ? '!border-blue-600 text-blue-600' : ''}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {leftPanelTool === 'audio' ? (
            <div className="space-y-3 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Mute original audio</span>
                {switchEl(edit.muted, () => update({ muted: !edit.muted }), 'Mute original audio')}
              </div>
              <div className={edit.muted ? 'opacity-50' : ''}>
                <div className="mb-1 flex justify-between">
                  <span>Original volume</span>
                  <span className="tabular-nums">{edit.volume}%</span>
                </div>
                <Slider label="Original volume" value={edit.volume} min={0} max={200} step={5} disabled={edit.muted} onChange={(v) => update({ volume: v }, 'vol')} />
                {edit.volume > 100 ? <p className="mt-1 text-[10.5px] text-slate-500">Boost above 100% is applied on export (preview plays at 100%).</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['audioFadeIn', 'audioFadeOut'] as const).map((k) => (
                  <label key={k} className="flex items-center justify-between gap-1">
                    {k === 'audioFadeIn' ? 'Fade in' : 'Fade out'}
                    <input type="number" min={0} max={10} step={0.5} aria-label={k === 'audioFadeIn' ? 'Audio fade in seconds' : 'Audio fade out seconds'} value={edit[k]} onChange={(e) => update({ [k]: Math.min(10, Math.max(0, Number(e.target.value) || 0)) } as Partial<MediaEdit>, k)} className={numInput} />
                  </label>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                <p className="mb-1.5 font-medium text-slate-800 dark:text-slate-100">Background music</p>
                {edit.music ? (
                  <div className="space-y-2 rounded-md border border-slate-200 p-2 dark:border-white/10" data-testid="music-track">
                    <div className="flex items-center gap-2">
                      <Music size={14} className="shrink-0 text-blue-600" />
                      <span className="min-w-0 flex-1 truncate">{edit.music.name}</span>
                      <button type="button" aria-label="Remove music" onClick={() => update({ music: null })} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Mix level</span>
                      <span className="tabular-nums">{edit.music.volume}%</span>
                    </div>
                    <Slider label="Music mix level" value={edit.music.volume} min={0} max={150} step={5} onChange={(v) => update((c) => ({ music: c.music ? { ...c.music, volume: v } : null }), 'mvol')} />
                    <p className="text-[10.5px] text-slate-500">Loops to fill the video and follows the audio fades.</p>
                  </div>
                ) : null}
                <button type="button" disabled={musicBusy || !token} onClick={() => musicInputRef.current?.click()} className="ms-btn mt-2 w-full">
                  {musicBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {edit.music ? 'Replace music' : 'Add music'}
                </button>
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  data-testid="music-upload"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f || !token) return;
                    setMusicBusy(true);
                    setMusicErr(null);
                    try {
                      const up = await uploadEditorMediaEarly(f, token);
                      update((c) => ({ music: { url: up.publicUrl, name: f.name, volume: c.music?.volume ?? 50 } }));
                    } catch (err: any) {
                      setMusicErr(err?.message || 'Upload failed');
                    } finally {
                      setMusicBusy(false);
                    }
                  }}
                />
                {musicErr ? <p className="mt-1 text-[11px] text-red-600">{musicErr}</p> : null}
              </div>
            </div>
          ) : null}
          {leftPanelTool === 'captions' ? (
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  className="ms-btn"
                  onClick={() => {
                    const st = Math.round(tOut * 10) / 10;
                    update((c) => ({ captions: [...c.captions, { id: uid('c'), start: st, end: Math.min(outDur || st + 2, st + 2), text: '' }].sort((x, y) => x.start - y.start) }));
                  }}
                >
                  <Plus size={13} /> Add at playhead
                </button>
                <button
                  type="button"
                  className="ms-btn"
                  disabled={capBusy || !token || !sourceUrls?.[index]}
                  title={!sourceUrls?.[index] ? 'Wait for the upload to finish' : 'Transcribe speech with AI'}
                  onClick={async () => {
                    const src = sourceUrls?.[index];
                    if (!src || !token) return;
                    setCapBusy(true);
                    setCapMsg(null);
                    try {
                      const cues = await requestAutoCaptions(token, src);
                      const mapped = cues
                        .map((c) => {
                          const o = mapSourceCue(segs, edit.speed, c.start, c.end);
                          return o ? { id: uid('c'), start: Math.round(o.start * 100) / 100, end: Math.round(o.end * 100) / 100, text: c.text } : null;
                        })
                        .filter(Boolean) as MediaEdit['captions'];
                      if (!mapped.length) setCapMsg('No speech was found in the kept part of this video.');
                      else {
                        update({ captions: mapped });
                        setCapMsg(`Added ${mapped.length} caption${mapped.length === 1 ? '' : 's'}. Review them before saving.`);
                      }
                    } catch (err: any) {
                      setCapMsg(err?.message || 'Auto captions failed');
                    } finally {
                      setCapBusy(false);
                    }
                  }}
                >
                  {capBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Auto-generate
                </button>
              </div>
              {capMsg ? <p className="text-[11px]" data-testid="caption-msg">{capMsg}</p> : null}
              {edit.captions.length === 0 ? <p className="py-3 text-center text-[11.5px] text-slate-500">No captions yet.</p> : null}
              <div className="space-y-2" data-testid="caption-list">
                {edit.captions.map((c) => (
                  <div key={c.id} className={`rounded-md border p-2 ${tOut >= c.start && tOut <= c.end ? 'border-blue-500' : 'border-slate-200 dark:border-white/10'}`}>
                    <div className="mb-1 flex items-center gap-1 text-[11px]">
                      <input type="number" step={0.1} min={0} aria-label="Caption start" value={c.start} onChange={(e) => update((x) => ({ captions: x.captions.map((y) => (y.id === c.id ? { ...y, start: Math.max(0, Number(e.target.value) || 0) } : y)) }), `cs-${c.id}`)} className={numInput} />
                      <span>→</span>
                      <input type="number" step={0.1} min={0} aria-label="Caption end" value={c.end} onChange={(e) => update((x) => ({ captions: x.captions.map((y) => (y.id === c.id ? { ...y, end: Math.max(0, Number(e.target.value) || 0) } : y)) }), `ce-${c.id}`)} className={numInput} />
                      <button type="button" className="ml-1 text-blue-600 hover:underline dark:text-blue-400" onClick={() => seekOut(c.start)}>
                        go
                      </button>
                      <button type="button" aria-label="Delete caption" onClick={() => update((x) => ({ captions: x.captions.filter((y) => y.id !== c.id) }))} className="ml-auto text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={c.text}
                      placeholder="Caption text"
                      aria-label="Caption text"
                      onChange={(e) => update((x) => ({ captions: x.captions.map((y) => (y.id === c.id ? { ...y, text: e.target.value } : y)) }), `ct-${c.id}`)}
                      className="w-full resize-none rounded border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              {edit.captions.length ? (
                <button
                  type="button"
                  className="ms-btn w-full"
                  onClick={() => {
                    const blob = new Blob([captionsToVtt(edit.captions)], { type: 'text/vtt' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${(file?.name || 'captions').replace(/\.[^.]+$/, '')}.vtt`;
                    a.click();
                    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                  }}
                >
                  <Download size={13} /> Download .vtt
                </button>
              ) : null}
              <p className="text-[10.5px] text-slate-500">Captions are burned into the video when you save.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  // ---------- right panel ----------
  const thumbFor = (filterCss: string, label: string, active: boolean, onClick: () => void, strip = false) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`${strip ? 'w-[52px] shrink-0' : 'min-w-0'} text-center`}
      aria-pressed={active}
      title={label}
    >
      <div
        className={`aspect-square overflow-hidden rounded-md bg-slate-200 dark:bg-white/10 ${
          active ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-[#14171c]' : ''
        }`}
      >
        {thumbSrc ? <img src={thumbSrc} alt="" className="h-full w-full object-cover" style={{ filter: filterCss.trim() || 'none' }} /> : null}
      </div>
      <p className={`mt-1 truncate text-[11px] ${active ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
    </button>
  );
  const adjustSection = (
    <section className="px-4 pt-3">
      <h3 className="mb-2 text-[12px] font-semibold text-slate-900 dark:text-white">Basic Adjustments</h3>
      <div className="space-y-[7px]">
        {ADJUST_KEYS.map(({ key: k, label }) => (
          <div key={k} className="grid grid-cols-[84px_1fr_30px] items-center gap-2">
            <span className="text-[11.5px] text-slate-700 dark:text-slate-300">{label}</span>
            <Slider
              label={label}
              value={edit.adjust[k]}
              min={-100}
              max={100}
              onChange={(v) => update((c) => ({ adjust: { ...c.adjust, [k as AdjustKey]: v } }), `adj-${k}`)}
              gradient={k === 'temperature' ? 'linear-gradient(to right,#3b82f6,#e2e8f0 50%,#f59e0b)' : undefined}
            />
            <span className="text-right text-[11.5px] tabular-nums text-slate-700 dark:text-slate-300">
              {edit.adjust[k] > 0 ? `+${edit.adjust[k]}` : edit.adjust[k]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={() => update({ adjust: { ...defaultEdit().adjust } })}
          className="rounded-md border border-slate-200 px-4 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Reset
        </button>
      </div>
    </section>
  );
  const presetsSection = (all: boolean) => (
    <section className="border-t border-slate-200 px-4 pt-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">Filter Presets</h3>
        {!all ? (
          <button type="button" onClick={() => setRightTab('filters')} className="text-[11.5px] font-medium text-blue-600 hover:underline dark:text-blue-400">
            See all
          </button>
        ) : null}
      </div>
      <HScrollStrip>
        {PRESETS.map((p) =>
          thumbFor(
            `${adjustOnlyCss(edit)} ${presetCss(p.id)}`,
            p.label,
            edit.preset === p.id,
            () => update({ preset: p.id }),
            true,
          ),
        )}
      </HScrollStrip>
    </section>
  );
  const effectsSection = (
    <section className="border-t border-slate-200 px-4 pt-3 dark:border-white/10">
      <h3 className="mb-2 text-[12px] font-semibold text-slate-900 dark:text-white">Effects</h3>
      <HScrollStrip>
        {EFFECTS.map((fx) =>
          thumbFor(
            effectsCss([fx.id]),
            fx.label,
            edit.effects.includes(fx.id),
            () =>
              update((c) => ({
                effects: c.effects.includes(fx.id) ? c.effects.filter((x) => x !== fx.id) : [...c.effects, fx.id],
              })),
            true,
          ),
        )}
      </HScrollStrip>
    </section>
  );
  const videoSection = isVideo ? (
    <section className="space-y-2.5 border-t border-slate-200 px-4 py-3 text-[11.5px] dark:border-white/10">
      <div className="flex items-center justify-between" title="Removes camera shake (FFmpeg vid.stab, applied on save)">
        <span className="text-slate-700 dark:text-slate-300">Stabilize video</span>
        {switchEl(edit.stabilize, () => update({ stabilize: !edit.stabilize }), 'Stabilize video')}
      </div>
      <div className="grid grid-cols-[112px_1fr_24px] items-center gap-2" title="Temporal + spatial denoise (FFmpeg hqdn3d, applied on save)">
        <span className="text-slate-700 dark:text-slate-300">Noise reduction</span>
        <Slider label="Noise reduction" value={edit.denoise} min={0} max={100} onChange={(v) => update({ denoise: v }, 'denoise')} />
        <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">{edit.denoise}</span>
      </div>
      {edit.stabilize || edit.denoise > 0 ? <p className="text-[10.5px] text-slate-500">Stabilize and noise reduction can't be previewed live; they are rendered when you save.</p> : null}
      <div className="grid grid-cols-[112px_1fr] items-center gap-2">
        <span className="text-slate-700 dark:text-slate-300">Playback speed</span>
        <div className="relative">
          <select
            aria-label="Playback speed"
            value={edit.speed}
            onChange={(e) => update({ speed: Number(e.target.value) })}
            className="h-7 w-full appearance-none rounded-md border border-slate-200 bg-white px-2 text-[11.5px] text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#1b1f26] dark:text-white"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s === 1 ? '1.0x' : `${s}x`}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['fadeIn', 'fadeOut'] as const).map((k) => (
          <label key={k} className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
            {k === 'fadeIn' ? 'Fade in' : 'Fade out'}
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={edit[k]}
                aria-label={k === 'fadeIn' ? 'Fade in seconds' : 'Fade out seconds'}
                onChange={(e) => update({ [k]: Math.min(5, Math.max(0, Number(e.target.value) || 0)) } as Partial<MediaEdit>, k)}
                className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-right text-[11.5px] outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <span className="text-slate-400">s</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  ) : null;

  const segBtn = (active: boolean) =>
    `rounded py-1 text-[11.5px] font-medium disabled:opacity-50 ${
      active
        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-white/10 dark:text-blue-400 dark:ring-blue-500/30'
        : 'text-slate-600 dark:text-slate-400'
    }`;
  const rightPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-slate-200 dark:border-white/10">
        {(
          [
            { id: 'adjust', label: 'Adjustments', icon: SlidersHorizontal },
            { id: 'filters', label: 'Filters', icon: Blend },
            { id: 'effects', label: 'Effects', icon: Sparkles },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setRightTab(id)}
            className={`-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[12px] font-medium ${
              rightTab === id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 rounded-md bg-slate-100 p-0.5 dark:bg-white/5">
            <button type="button" disabled={firstPhoto < 0} title={firstPhoto < 0 ? 'No photos in this post' : undefined} onClick={() => isVideo && firstPhoto >= 0 && setIndex(firstPhoto)} className={segBtn(!isVideo)}>
              Photo
            </button>
            <button type="button" disabled={firstVideo < 0} title={firstVideo < 0 ? 'No videos in this post' : undefined} onClick={() => !isVideo && firstVideo >= 0 && setIndex(firstVideo)} className={segBtn(isVideo)}>
              Video
            </button>
          </div>
          <div className="mt-2 flex gap-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-[10.5px] leading-snug text-slate-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-300">
            <Info size={12} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              {isVideo
                ? 'Video tools are available for this video. Photo-only tools will appear when a photo is selected.'
                : 'Photo tools are available for this photo. Video-only tools will appear when a video is selected.'}
            </span>
          </div>
        </div>
        {rightTab === 'adjust' ? (
          <>
            {adjustSection}
            <div className="mt-3">{presetsSection(false)}</div>
            <div className="mt-3">{effectsSection}</div>
            <div className="mt-3">{videoSection}</div>
          </>
        ) : rightTab === 'filters' ? (
          <div className="mt-3">{presetsSection(true)}</div>
        ) : (
          <>
            <div className="mt-3">{effectsSection}</div>
            <div className="mt-3">{videoSection}</div>
          </>
        )}
        <div className="mx-4 mt-3 flex gap-2 rounded-md border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-[10.5px] leading-snug text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <Info size={12} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            {isVideo
              ? 'Everything you change here (clips, speed, filters, effects, crop, text, stickers, captions, audio, stabilize and noise reduction) is rendered into a new video when you save. Retouch and Background are photo-only.'
              : 'Everything is baked into a new image when you save. Speed, Trim, Audio and Captions appear when a video is selected.'}
          </span>
        </div>
      </div>
    </div>
  );

  // ---------- canvas ----------
  const [stage, setStage] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [isDesktop]);
  const fitInto = (W: number, H: number, ratio: number) => {
    if (W <= 0 || H <= 0 || !ratio) return { w: 0, h: 0 };
    return W / H > ratio ? { w: H * ratio, h: H } : { w: W, h: W / ratio };
  };
  const PAD = 24;
  const mediaRatio = mediaW && mediaH ? mediaW / mediaH : 16 / 9;
  const frame = fitRatio ? fitInto(stage.w - PAD, stage.h - PAD, fitRatio) : null;
  const box = frame ? fitInto(frame.w, frame.h, mediaRatio) : fitInto(stage.w - PAD, stage.h - PAD, mediaRatio);
  const layerPx = (size: number) => (size / 100) * Math.min(boxSize.w, boxSize.h);
  const handles = ['nw', 'ne', 'sw', 'se'] as const;
  const edgeHandles = ['n', 'e', 's', 'w'] as const;
  const brushActive = !isVideo && tool === 'retouch' && brushMode !== 'off' && !previewing;
  const isCropActive = (tool === 'crop' || leftPanelTool === 'crop') && !previewing && !brushActive;
  /** Aspect strip duplicates left-panel crop controls — only show while cropping so the stage can grow. */
  const showAspectBar = tool === 'crop' || leftPanelTool === 'crop';
  const canvas = (
    <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
      {!file || !url ? (
        <p className="text-sm text-slate-400">No media selected</p>
      ) : (
        <div
          className="relative flex items-center justify-center overflow-hidden"
          data-testid="studio-frame"
          style={frame ? { width: frame.w, height: frame.h, background: edit.padFill === 'blur' ? '#000' : edit.padFill } : undefined}
        >
          {frame && edit.padFill === 'blur' && thumbSrc ? (
            <img src={thumbSrc} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover" style={{ filter: `blur(18px) brightness(0.92) ${css === 'none' ? '' : css}` }} />
          ) : null}
          <div
            ref={boxRef}
            data-testid="studio-media-box"
            className={`relative touch-none ${brushActive ? 'cursor-crosshair' : ''}`}
            style={{ width: box.w || undefined, height: box.h || undefined }}
            onPointerDown={(e) => {
              if (!brushActive) return;
              const r = boxRef.current?.getBoundingClientRect();
              if (!r) return;
              const spot = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r: brushSize / 100 };
              if (brushMode === 'heal') update((c) => ({ retouch: { ...c.retouch, spots: [...c.retouch.spots, spot] } }));
              else update((c) => ({ retouch: { ...c.retouch, redEye: [...c.retouch.redEye, spot] } }));
            }}
            onPointerMove={(e) => {
              onCropMove(e);
              onLayerMove(e);
            }}
            onPointerUp={() => {
              dragRef.current = null;
              layerDrag.current = null;
            }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                data-testid="studio-video"
                key={key}
                src={url}
                playsInline
                onTimeUpdate={onTimeUpdate}
                onPlay={(e) => {
                  e.currentTarget.playbackRate = edit.speed;
                  setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) => {
                  e.currentTarget.defaultPlaybackRate = edit.speed;
                  e.currentTarget.playbackRate = edit.speed;
                  e.currentTarget.muted = edit.muted;
                  const first = edit.segments?.[0]?.start ?? edit.trimStart;
                  e.currentTarget.currentTime = first || 0.01;
                }}
                className={rot90 ? 'absolute left-1/2 top-1/2 block max-w-none select-none object-contain' : 'block h-full w-full select-none object-contain'}
                style={{
                  filter: css,
                  opacity: fadeOpacity,
                  ...(rot90 ? { width: box.h, height: box.w } : {}),
                  transform:
                    `${rot90 ? 'translate(-50%,-50%)' : ''} ${edit.flipH ? 'scaleX(-1)' : ''} ${edit.rotation ? `rotate(${edit.rotation}deg)` : ''}`.trim() || undefined,
                }}
              />
            ) : workingSrc ? (
              <img
                src={workingSrc}
                alt=""
                draggable={false}
                data-testid="studio-photo"
                onLoad={(e) => setWorkDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className={isRot90 ? 'absolute left-1/2 top-1/2 block max-w-none select-none object-contain' : 'block h-full w-full select-none object-contain'}
                style={{
                  filter: css,
                  ...(isRot90 ? { width: box.h, height: box.w } : {}),
                  transform:
                    `${isRot90 ? 'translate(-50%,-50%)' : ''} ${edit.flipH ? 'scaleX(-1)' : ''} ${edit.rotation ? `rotate(${edit.rotation}deg)` : ''}`.trim() || undefined,
                }}
              />
            ) : null}
            {photoBusy && !isVideo ? (
              <span className="absolute right-2 top-2 z-[3] flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] text-white">
                <Loader2 size={11} className="animate-spin" /> Processing
              </span>
            ) : null}
            {isVideo
              ? edit.captions
                  .filter((c) => c.text.trim() && tOut >= c.start && tOut <= c.end)
                  .slice(0, 1)
                  .map((c) => <CaptionPreview key={c.id} text={c.text} w={box.w} h={box.h} />)
              : null}
            {
              edit.texts.filter((t) => inWindow(t.start, t.end)).map((t) => (
                  <div
                    key={t.id}
                    onPointerDown={onLayerDown('text', t.id)}
                    className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-nowrap font-bold"
                    style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, color: t.color, fontSize: layerPx(t.size), textShadow: '0 1px 3px rgba(0,0,0,.6)' }}
                  >
                    {t.text}
                  </div>
                ))
              }
            {
              edit.stickers.filter((s) => inWindow(s.start, s.end)).map((s) => (
                  <div
                    key={s.id}
                    onPointerDown={onLayerDown('sticker', s.id)}
                    className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 cursor-move leading-none"
                    style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, fontSize: layerPx(s.size) }}
                  >
                    {s.emoji}
                  </div>
                ))
              }
            {isCropActive ? (
              <div
                className="absolute z-[1] cursor-move select-none"
                data-testid="crop-rect"
                style={{
                  left: `${edit.crop.x * 100}%`,
                  top: `${edit.crop.y * 100}%`,
                  width: `${edit.crop.w * 100}%`,
                  height: `${edit.crop.h * 100}%`,
                  boxShadow: 'inset 0 0 0 1.5px #fff, inset 0 0 0 3px #2563eb, 0 0 0 9999px rgba(0,0,0,0.65)',
                }}
                onPointerDown={onCropDown('move')}
              >
                {/* rule-of-thirds grid */}
                <span aria-hidden className="pointer-events-none absolute inset-0">
                  <span className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40 shadow-sm" />
                  <span className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40 shadow-sm" />
                  <span className="absolute top-1/3 left-0 right-0 h-px bg-white/40 shadow-sm" />
                  <span className="absolute top-2/3 left-0 right-0 h-px bg-white/40 shadow-sm" />
                </span>
                {edgeHandles.map((h) => (
                  <span
                    key={h}
                    data-handle={h}
                    onPointerDown={onCropDown(h)}
                    className={`absolute z-[2] touch-none rounded-sm bg-white shadow-md shadow-black/50 ring-2 ring-blue-600 ${
                      h === 'n' ? 'left-1/2 -top-1.5 -translate-x-1/2 h-3 w-8 cursor-ns-resize' : ''
                    } ${
                      h === 's' ? 'left-1/2 -bottom-1.5 -translate-x-1/2 h-3 w-8 cursor-ns-resize' : ''
                    } ${
                      h === 'w' ? 'top-1/2 -left-1.5 -translate-y-1/2 h-8 w-3 cursor-ew-resize' : ''
                    } ${
                      h === 'e' ? 'top-1/2 -right-1.5 -translate-y-1/2 h-8 w-3 cursor-ew-resize' : ''
                    }`}
                  />
                ))}
                {handles.map((h) => (
                  <span
                    key={h}
                    data-handle={h}
                    onPointerDown={onCropDown(h)}
                    className={`absolute z-[3] touch-none h-4.5 w-4.5 rounded-[3px] border-2 border-blue-600 bg-white shadow-lg shadow-black/50 ${
                      h.includes('n') ? '-top-2' : '-bottom-2'
                    } ${
                      h.includes('w') ? '-left-2' : '-right-2'
                    } ${
                      h === 'nw' || h === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'
                    }`}
                  />
                ))}
              </div>
            ) : !isRectFull(edit.crop) && !previewing ? (
              <div
                className="pointer-events-none absolute z-[1]"
                data-testid="crop-mask-preview"
                style={{
                  left: `${edit.crop.x * 100}%`,
                  top: `${edit.crop.y * 100}%`,
                  width: `${edit.crop.w * 100}%`,
                  height: `${edit.crop.h * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                  border: '1px solid rgba(255,255,255,0.4)',
                }}
              />
            ) : null}
          </div>
        </div>
      )}
      {isVideo && edit.music ? <audio ref={musicRef} src={edit.music.url} preload="auto" loop data-testid="music-preview" /> : null}
      {previewing ? (
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">Preview: handles hidden</span>
      ) : null}
    </div>
  );

  const ctlBtn = 'text-slate-800 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400';
  const videoControls = isVideo ? (
    <div className="flex h-11 shrink-0 items-center gap-3.5 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#14171c]">
      <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className={ctlBtn}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <button type="button" aria-label="Jump to start" title="Jump to start" onClick={() => seekOut(0)} className={ctlBtn}>
        <SkipBack size={14} fill="currentColor" />
      </button>
      <button type="button" aria-label="Jump to end" title="Jump to end" onClick={() => seekOut(Math.max(0, outDur - 0.1))} className={ctlBtn}>
        <SkipForward size={14} fill="currentColor" />
      </button>
      <span className="ml-1 shrink-0 text-[11.5px] tabular-nums text-slate-800 dark:text-slate-200" data-testid="studio-time">
        <span className="font-semibold">{formatTime(tOut)}</span> <span className="text-slate-500">/ {formatTime(outDur)}</span>
      </span>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={outDur || 0}
        step={0.05}
        value={Math.min(tOut, outDur || 0)}
        onChange={(e) => seekOut(Number(e.target.value))}
        className="ms-range mx-2 h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(to right,#2563eb ${(tOut / (outDur || 1)) * 100}%, rgb(var(--ms-track)) 0)` }}
      />
      <button type="button" aria-label={edit.muted ? 'Unmute' : 'Mute'} title={edit.muted ? 'Muted (applied to the post)' : 'Mute'} onClick={() => update({ muted: !edit.muted })} className={ctlBtn}>
        {edit.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <button type="button" aria-label="Fullscreen" onClick={() => void stageRef.current?.requestFullscreen?.()} className={ctlBtn}>
        <Maximize size={15} />
      </button>
    </div>
  ) : null;

  const aspectBar = (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto bg-white px-4 py-2 dark:bg-[#14171c]">
      {ASPECTS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setAspect(a.id)}
          aria-pressed={edit.aspect === a.id}
          className={`flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3.5 text-[12px] font-medium sm:min-w-[64px] sm:px-4 ${
            edit.aspect === a.id
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
          } ${a.id === 'original' ? 'sm:min-w-[96px]' : ''}`}
        >
          {a.id === 'original' ? <Crop size={13} /> : a.id === '16:9' ? <span className="inline-block h-2 w-3 rounded-[2px] border-[1.5px] border-current" /> : null}
          {a.label}
        </button>
      ))}
      {aspectRatioOf(edit.aspect) && edit.fit === 'fit' ? (
        <div className="ml-3 flex shrink-0 items-center gap-1 text-[11.5px] text-slate-600 dark:text-slate-400" aria-label="Letterbox fill">
          <span className="hidden xl:inline">Fill:</span>
          {PAD_FILLS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={`Letterbox: ${p.label}`}
              aria-pressed={edit.padFill === p.id}
              onClick={() => update({ padFill: p.id })}
              className={`h-7 rounded-md border px-2 text-[11.5px] ${edit.padFill === p.id ? 'border-blue-600 text-blue-600' : 'border-slate-200 dark:border-white/10'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ml-auto flex shrink-0 gap-2 pl-4">
        {(['fit', 'fill'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFit(f)}
            aria-pressed={edit.fit === f}
            title={f === 'fit' ? 'Fit: keep the whole media, letterbox to the ratio' : 'Fill: crop the media to the ratio'}
            className={`h-8 min-w-[64px] rounded-md border px-4 text-[12px] font-medium sm:min-w-[90px] ${
              edit.fit === f
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            {f === 'fit' ? 'Fit' : 'Fill'}
          </button>
        ))}
      </div>
    </div>
  );

  // ---------- timeline (edit list in output order) ----------
  const tlRef = useRef<HTMLDivElement>(null);
  const tlDrag = useRef<{ mode: 'head' | 'start' | 'end'; i: number; sx: number; s0: Segment; pxPerSec: number } | null>(null);
  const srcTotal = segLen(segs);
  const outPct = (t: number) => `${outDur ? (t / outDur) * 100 : 0}%`;
  const tlOut = (clientX: number) => {
    const r = tlRef.current?.getBoundingClientRect();
    if (!r || !outDur) return 0;
    return Math.min(Math.max(0, ((clientX - r.left) / r.width) * outDur), outDur);
  };
  const onTlMove = (e: ReactPointerEvent) => {
    const d = tlDrag.current;
    if (!d) return;
    if (d.mode === 'head') {
      seekOut(tlOut(e.clientX));
      return;
    }
    const dt = (e.clientX - d.sx) / d.pxPerSec;
    const next = segs.map((x, j) => {
      if (j !== d.i) return x;
      if (d.mode === 'start') return { ...x, start: Math.round(Math.min(Math.max(0, d.s0.start + dt), d.s0.end - 0.3) * 10) / 10 };
      return { ...x, end: Math.round(Math.max(Math.min(duration, d.s0.end + dt), d.s0.start + 0.3) * 10) / 10 };
    });
    setSegments(next, `seg-${d.mode}-${d.i}`);
  };
  const tickStep = outDur > 240 ? 60 : outDur > 120 ? 30 : outDur > 60 ? 15 : outDur > 20 ? 5 : outDur > 8 ? 2 : 1;
  const ticks: number[] = [];
  if (outDur) for (let t = 0; t <= outDur + 0.001; t += tickStep) ticks.push(t);
  const frameAt = (srcT: number) => (frames.length && duration ? frames[Math.min(frames.length - 1, Math.floor((srcT / duration) * frames.length))] : null);
  const peaksFor = (sg: Segment) => {
    if (!peaks || !duration) return [];
    const a0 = Math.floor((sg.start / duration) * peaks.length);
    const a1 = Math.max(a0 + 1, Math.ceil((sg.end / duration) * peaks.length));
    return peaks.slice(a0, a1);
  };
  const tlBtn = 'flex items-center gap-1.5 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:text-blue-400';
  const timeline = isVideo ? (
    <div className="flex h-[min(132px,22dvh)] min-h-[112px] shrink-0 flex-col border-t border-slate-200 bg-white dark:border-white/10 dark:bg-[#14171c]">
      <div className="flex h-9 shrink-0 items-center gap-5 px-4 text-[12px] text-slate-700 dark:text-slate-300">
        <button type="button" onClick={splitAtPlayhead} title="Split the clip at the playhead" className={tlBtn} data-testid="tl-split">
          <Scissors size={14} /> Split
        </button>
        <button type="button" onClick={deleteSegment} disabled={segs.length < 2} title={segs.length < 2 ? 'Split first: a video needs at least one clip' : 'Delete the selected clip'} className={tlBtn} data-testid="tl-delete">
          <Trash2 size={14} /> Delete
        </button>
        <button type="button" onClick={duplicateSegment} disabled={!segs.length} title="Duplicate the selected clip" className={tlBtn} data-testid="tl-duplicate">
          <Copy size={14} /> Duplicate
        </button>
        <span className="hidden text-[11px] text-slate-500 md:inline">
          {segs.length} clip{segs.length === 1 ? '' : 's'} · {outDur.toFixed(1)}s
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ZoomIn size={14} className="text-slate-500" />
          <div className="w-20 sm:w-24">
            <Slider label="Timeline zoom" value={zoom} min={100} max={400} step={10} onChange={setZoom} />
          </div>
          <span className="w-9 text-right tabular-nums">{zoom}%</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[64px] shrink-0 flex-col pt-[24px] text-[11px] text-slate-700 dark:text-slate-300">
          <div className="flex h-[40px] items-center gap-1.5 rounded-l-md bg-slate-50 pl-3 dark:bg-white/5">
            <Film size={13} /> Video
          </div>
          <div className="mt-3 flex h-[36px] items-center gap-1.5 pl-3">
            <Music size={13} /> Audio
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pr-4">
          <div ref={tlRef} className="relative select-none" style={{ width: `${zoom}%`, minWidth: '100%' }} onPointerMove={onTlMove} onPointerUp={() => (tlDrag.current = null)}>
            <div
              className="relative h-[24px] cursor-pointer"
              onPointerDown={(e) => {
                tlRef.current?.setPointerCapture?.(e.pointerId);
                tlDrag.current = { mode: 'head', i: 0, sx: e.clientX, s0: segs[0], pxPerSec: 1 };
                seekOut(tlOut(e.clientX));
              }}
            >
              {ticks.map((t) => (
                <span key={t} className="absolute top-0 -translate-x-1/2 text-[9.5px] tabular-nums text-slate-500" style={{ left: outPct(t) }}>
                  {formatTime(t)}
                  <span className="absolute left-1/2 top-[15px] h-[5px] w-px bg-slate-300 dark:bg-white/20" />
                </span>
              ))}
            </div>
            <div className="relative flex h-[40px] gap-[2px]" data-testid="video-track">
              {!frames.length ? (
                <div className="flex flex-1 items-center justify-center rounded-md bg-slate-200 text-[10px] text-slate-500 dark:bg-white/10">
                  <Loader2 size={12} className="mr-1 animate-spin" /> Loading frames…
                </div>
              ) : (
                // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
                segs.map((sg, j) => {
                  const len = sg.end - sg.start;
                  const n = Math.max(1, Math.round((len / (srcTotal || 1)) * 10));
                  const sel = j === selSeg;
                  return (
                    <div
                      key={sg.id + j}
                      data-testid="tl-segment"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelSeg(j);
                        tlRef.current?.setPointerCapture?.(e.pointerId);
                        tlDrag.current = { mode: 'head', i: j, sx: e.clientX, s0: sg, pxPerSec: 1 };
                        seekOut(tlOut(e.clientX));
                      }}
                      className={`relative flex min-w-0 overflow-hidden rounded-md bg-slate-200 dark:bg-white/10 ${sel ? 'ring-2 ring-blue-600' : 'ring-1 ring-slate-300 dark:ring-white/15'}`}
                      style={{ width: `${(len / (srcTotal || 1)) * 100}%` }}
                    >
                      {Array.from({ length: n }).map((_, q) => {
                        const src = frameAt(sg.start + ((q + 0.5) / n) * len);
                        return src ? <img key={q} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" style={{ filter: css }} /> : <div key={q} className="flex-1" />;
                      })}
                      <span className="absolute left-1 top-0.5 rounded bg-black/55 px-1 text-[9px] font-semibold text-white">{j + 1}</span>
                      {sel
                        ? (['start', 'end'] as const).map((h) => (
                            <button
                              key={h}
                              type="button"
                              aria-label={h === 'start' ? `Trim clip ${j + 1} start` : `Trim clip ${j + 1} end`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                const r = tlRef.current?.getBoundingClientRect();
                                tlRef.current?.setPointerCapture?.(e.pointerId);
                                tlDrag.current = { mode: h, i: j, sx: e.clientX, s0: { ...sg }, pxPerSec: r && srcTotal ? r.width / srcTotal : 50 };
                              }}
                              className={`absolute inset-y-0 z-[2] flex w-3 cursor-ew-resize items-center justify-center bg-blue-600 text-white ${h === 'start' ? 'left-0 rounded-l-[4px]' : 'right-0 rounded-r-[4px]'}`}
                            >
                              {h === 'start' ? <ChevronLeft size={10} strokeWidth={3} /> : <ChevronRight size={10} strokeWidth={3} />}
                            </button>
                          ))
                        : null}
                    </div>
                  );
                })
              )}
            </div>
            <div className="relative mt-3 flex h-[36px] gap-[2px]" data-testid="audio-track">
              {audioState === 'ok' && peaks ? (
                segs.map((sg, j) => {
                  const p = peaksFor(sg);
                  return (
                    <div key={sg.id + j} className="relative rounded-md bg-blue-50 dark:bg-blue-500/10" style={{ width: `${((sg.end - sg.start) / (srcTotal || 1)) * 100}%` }}>
                      <svg viewBox={`0 0 ${Math.max(1, p.length)} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                        {p.map((v, i) => (
                          <rect key={i} x={i + 0.15} width={0.7} y={50 - Math.max(2, v * 46 * Math.min(2, edit.volume / 100))} height={Math.max(4, v * 92 * Math.min(2, edit.volume / 100))} fill="#3b82f6" opacity={edit.muted ? 0.25 : 0.85} />
                        ))}
                      </svg>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full flex-1 items-center justify-center rounded-md bg-blue-50 text-[10.5px] text-slate-500 dark:bg-blue-500/10">
                  {audioState === 'loading' ? 'Reading audio…' : 'No audio track found'}
                </div>
              )}
              {edit.music ? (
                <span className="pointer-events-none absolute bottom-0.5 right-1 flex items-center gap-1 rounded bg-emerald-600/90 px-1.5 text-[9.5px] font-medium text-white">
                  <Music size={9} /> {edit.music.name} · {edit.music.volume}%
                </span>
              ) : null}
            </div>
            <div className="pointer-events-none absolute inset-y-0 z-[3] w-px bg-blue-600" style={{ left: outPct(tOut) }}>
              <span className="absolute -left-[5px] top-[7px] h-[11px] w-[11px] rounded-full bg-blue-600 ring-2 ring-white dark:ring-[#14171c]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ---------- rail ----------
  const rail = (
    <nav
      aria-label="Media tools"
      className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-[#14171c] lg:w-[116px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-1.5"
    >
      {railItems.map((r) => {
        const off = !!(r.soon || (r.photoOnly && isVideo) || (r.videoOnly && !isVideo));
        const tip = r.soon ? SOON : r.photoOnly && isVideo ? 'Photo only: select a photo' : r.videoOnly && !isVideo ? 'Video only: select a video' : r.label;
        const active = tool === r.id;
        const Icon = r.icon;
        return (
          <button
            key={r.id}
            type="button"
            title={tip}
            aria-disabled={off || undefined}
            aria-current={active || undefined}
            onClick={() => (off ? undefined : pickTool(r.id))}
            className={`flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-[12px] lg:w-full ${
              active
                ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                : off
                  ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            <Icon size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="whitespace-nowrap">{r.label}</span>
          </button>
        );
      })}
    </nav>
  );

  // ---------- top bar ----------
  const topBar = (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-[#14171c] sm:gap-3 sm:px-4">
      <h1 className="hidden shrink-0 text-[15px] font-semibold text-slate-900 dark:text-white md:block">Media Studio</h1>
      <div ref={fileMenuRef} className="relative min-w-0 sm:ml-6">
        <button
          type="button"
          onClick={() => setFileMenu((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={fileMenu}
          className="flex h-9 max-w-full items-center gap-2 rounded-md border border-slate-200 px-2.5 text-[12.5px] font-medium text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          {isVideo ? <Film size={15} className="shrink-0 text-blue-600" /> : <ImageIcon size={15} className="shrink-0 text-blue-600" />}
          <span className="truncate">{file?.name || 'No media'}</span>
          <ChevronDown size={14} className="shrink-0 text-slate-500" />
        </button>
        {fileMenu ? (
          <div role="listbox" className="absolute left-0 top-10 z-20 w-64 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1b1f26]">
            {files.map((f, i) => {
              const thumb = previewUrls[i];
              const vid = isVideoFile(f);
              return (
                <button
                  key={fileKey(f) + i}
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  onClick={() => {
                    setIndex(i);
                    setFileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-white/10">
                    {thumb ? (
                      vid ? (
                        <video src={thumb} muted preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      )
                    ) : vid ? (
                      <Film size={14} className="absolute inset-0 m-auto text-slate-400" />
                    ) : (
                      <ImageIcon size={14} className="absolute inset-0 m-auto text-slate-400" />
                    )}
                    {vid && thumb ? <Film size={10} className="absolute bottom-0.5 left-0.5 text-white drop-shadow" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  {i === index ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <span className="hidden shrink-0 text-[11.5px] text-slate-500 dark:text-slate-400 xl:inline" data-testid="autosave-status">
        {savedAt ? `Autosaved ${timeAgo(savedAt, now)}` : 'No changes yet'}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!past.length}
          aria-label="Undo"
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-white/5 dark:disabled:text-slate-600"
        >
          <Undo2 size={15} /> <span className="hidden sm:inline">Undo</span>
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!future.length}
          aria-label="Redo"
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-white/5 dark:disabled:text-slate-600"
        >
          <Redo2 size={15} /> <span className="hidden sm:inline">Redo</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewing((v) => !v)}
          aria-pressed={previewing}
          className={`ml-1 hidden h-9 items-center gap-2 rounded-md border px-4 text-[12.5px] font-medium md:flex lg:px-7 ${
            previewing ? 'border-blue-600 text-blue-600' : 'border-slate-200 text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'
          }`}
        >
          {previewing ? <Eye size={14} /> : <Play size={13} />} Preview
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !files.length}
          className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-[12.5px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 lg:px-8"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={14} />} <span>Save<span className="hidden sm:inline"> changes</span></span>
        </button>
        <button type="button" aria-label="Close Media Studio" onClick={requestClose} className="ml-1 rounded-md p-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
          <X size={18} />
        </button>
      </div>
    </header>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Media Studio" className="media-studio fixed inset-0 z-[400] flex flex-col bg-white text-slate-900 dark:bg-[#14171c] dark:text-white">
      <style>{`
        .media-studio{--ms-track:226 232 240}
        .dark .media-studio{--ms-track:51 56 66}
        .media-studio .ms-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;height:11px;width:11px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px rgba(37,99,235,.35)}
        .media-studio .ms-range::-moz-range-thumb{height:11px;width:11px;border-radius:9999px;background:#2563eb;border:2px solid #fff}
        .media-studio .ms-range:disabled::-webkit-slider-thumb{background:#94a3b8}
        .media-studio .ms-btn{display:flex;align-items:center;justify-content:center;gap:.4rem;border-radius:.375rem;border:1px solid rgb(226 232 240);padding:.45rem .6rem;font-size:12px;font-weight:500;color:rgb(51 65 85)}
        .dark .media-studio .ms-btn{border-color:rgba(255,255,255,.1);color:rgb(226 232 240)}
        .media-studio .ms-btn:hover{background:rgb(248 250 252)}
        .dark .media-studio .ms-btn:hover{background:rgba(255,255,255,.06)}
        .media-studio .ms-soon{margin-left:4px;border-radius:9999px;background:rgb(241 245 249);padding:0 6px;font-size:9.5px;color:rgb(100 116 139)}
        .dark .media-studio .ms-soon{background:rgba(255,255,255,.08);color:rgb(148 163 184)}
      `}</style>
      {topBar}
      {isDesktop ? (
        <div className="flex min-h-0 flex-1">
          {rail}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              <aside className="w-[244px] shrink-0 border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#14171c] xl:w-[256px]">{leftPanel}</aside>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                  className={`flex min-h-0 min-w-0 flex-[1.75] flex-col overflow-hidden ${
                    isVideo ? 'min-h-[min(42dvh,480px)]' : 'min-h-[200px]'
                  }`}
                >
                  {canvas}
                </div>
                {videoControls}
                {showAspectBar ? aspectBar : null}
              </div>
            </div>
            {timeline}
          </div>
          <aside className="w-[320px] shrink-0 border-l border-slate-200 bg-white dark:border-white/10 dark:bg-[#14171c] xl:w-[340px]">{rightPanel}</aside>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className={`flex shrink-0 flex-col ${isVideo ? 'h-[58vh] min-h-[300px]' : 'h-[50vh] min-h-[260px]'}`}>{canvas}</div>
          {videoControls}
          {showAspectBar ? aspectBar : null}
          {rail}
          {timeline}
          <div className="flex shrink-0 border-b border-slate-200 dark:border-white/10">
            {(['edit', 'media'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMobilePanel(p)}
                className={`-mb-px flex-1 border-b-2 py-2.5 text-[12.5px] font-medium ${
                  mobilePanel === p ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-600 dark:text-slate-400'
                }`}
              >
                {p === 'edit' ? 'Adjust & filters' : leftPanelTool === 'media' ? 'Media' : railItems.find((r) => r.id === leftPanelTool)?.label}
              </button>
            ))}
          </div>
          <div className="min-h-[60vh] shrink-0">{mobilePanel === 'edit' ? rightPanel : leftPanel}</div>
        </div>
      )}

      {render ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div role="alertdialog" aria-label="Rendering" data-testid="render-dialog" className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-[#1b1f26]">
            {render.error ? (
              <>
                <p className="flex items-center gap-2 text-[15px] font-semibold text-red-600">
                  <AlertTriangle size={17} /> {render.label}
                </p>
                <p className="mt-2 break-words text-[12.5px] text-slate-600 dark:text-slate-300" data-testid="render-error">{render.error}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setRender(null)} className="ms-btn px-4">
                    Close
                  </button>
                  <button type="button" onClick={() => void handleSave()} className="rounded-md bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">
                    Retry
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <Loader2 size={16} className="animate-spin text-blue-600" /> Rendering your video
                </p>
                <p className="mt-1 truncate text-[12px] text-slate-600 dark:text-slate-400">{render.label}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(2, Math.min(100, render.pct))}%` }} />
                </div>
                <p className="mt-1 text-right text-[11px] tabular-nums text-slate-500" data-testid="render-pct">{Math.round(render.pct)}%</p>
              </>
            )}
          </div>
        </div>
      ) : null}
      {confirmClose ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div role="alertdialog" aria-label="Discard changes" className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-[#1b1f26]">
            <p className="text-[15px] font-semibold">Discard changes?</p>
            <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
              Your edits are autosaved for this session, but they won't be applied to the post until you press Save changes.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} className="ms-btn px-4">
                Keep editing
              </button>
              <button type="button" onClick={onClose} className="rounded-md bg-red-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-red-700">
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
