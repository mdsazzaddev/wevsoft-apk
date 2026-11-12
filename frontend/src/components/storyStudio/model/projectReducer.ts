import {
  MAX_OVERLAYS_PER_SLIDE,
  MAX_SLIDES,
  MAX_SLIDE_SECONDS,
  MIN_SLIDE_SECONDS,
  DEFAULT_ADJUST,
  DEFAULT_EFFECTS,
  clamp,
  uid,
  type Overlay,
  type ProjectDoc,
  type Slide,
} from './types';

export const HISTORY_LIMIT = 100;
const COALESCE_MS = 700;

export interface EditorState {
  doc: ProjectDoc;
  selectedSlideId: string | null;
  selectedOverlayId: string | null;
  past: ProjectDoc[];
  future: ProjectDoc[];
  /** Bumped on every document change (drives autosave). */
  rev: number;
  lastKey: string | null;
  lastAt: number;
}

export type Action =
  | { type: 'init'; doc: ProjectDoc }
  | { type: 'rename'; name: string; at?: number }
  | { type: 'setPrivacy'; privacy: ProjectDoc['privacy'] }
  | { type: 'addSlide'; slide: Slide; index?: number; at?: number }
  | { type: 'removeSlide'; id: string; at?: number }
  | { type: 'duplicateSlide'; id: string; at?: number }
  | { type: 'moveSlide'; id: string; toIndex: number; at?: number }
  | { type: 'selectSlide'; id: string | null }
  | { type: 'updateSlide'; id: string; patch: Partial<Slide>; coalesce?: string; at?: number }
  | { type: 'resetAdjust'; id: string; at?: number }
  | { type: 'addOverlay'; slideId: string; overlay: Overlay; at?: number }
  | { type: 'updateOverlay'; slideId: string; overlayId: string; patch: Partial<Overlay>; coalesce?: string; at?: number }
  | { type: 'removeOverlay'; slideId: string; overlayId: string; at?: number }
  | { type: 'duplicateOverlay'; slideId: string; overlayId: string; at?: number }
  | { type: 'moveOverlayLayer'; slideId: string; overlayId: string; toIndex: number; at?: number }
  | { type: 'selectOverlay'; id: string | null }
  | { type: 'markPublished'; slideId: string; storyId: string }
  | { type: 'refreshMediaUrls'; urls: Record<string, string> }
  | { type: 'undo' }
  | { type: 'redo' };

export function createEditorState(doc: ProjectDoc): EditorState {
  return {
    doc,
    selectedSlideId: doc.slides[0]?.id ?? null,
    selectedOverlayId: null,
    past: [],
    future: [],
    rev: 0,
    lastKey: null,
    lastAt: 0,
  };
}

function commit(state: EditorState, doc: ProjectDoc, opts: { key?: string; at?: number } = {}): EditorState {
  const at = opts.at ?? Date.now();
  const key = opts.key ?? null;
  const coalesced = key !== null && key === state.lastKey && at - state.lastAt < COALESCE_MS && state.past.length > 0;
  const past = coalesced ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT);
  return { ...state, doc, past, future: [], rev: state.rev + 1, lastKey: key, lastAt: at };
}

function mapSlide(doc: ProjectDoc, id: string, fn: (s: Slide) => Slide): ProjectDoc {
  let changed = false;
  const slides = doc.slides.map((s) => {
    if (s.id !== id) return s;
    changed = true;
    return fn(s);
  });
  return changed ? { ...doc, slides } : doc;
}

function normalizeSlide(s: Slide): Slide {
  return {
    ...s,
    duration: clamp(s.duration, MIN_SLIDE_SECONDS, MAX_SLIDE_SECONDS),
    zoom: clamp(s.zoom, 1, 3),
    filterIntensity: clamp(s.filterIntensity, 0, 100),
    adjust: {
      brightness: clamp(s.adjust.brightness, 0, 200),
      contrast: clamp(s.adjust.contrast, 0, 200),
      saturation: clamp(s.adjust.saturation, 0, 200),
      temperature: clamp(s.adjust.temperature, -100, 100),
    },
    effects: { vignette: clamp(s.effects.vignette, 0, 100), grain: clamp(s.effects.grain, 0, 100) },
  };
}

function normalizeOverlay(o: Overlay): Overlay {
  return {
    ...o,
    fontSize: clamp(o.fontSize, 12, 600),
    w: clamp(o.w, 40, 2400),
    h: clamp(o.h, 40, 2400),
    rotation: clamp(o.rotation, -360, 360),
    opacity: clamp(o.opacity, 0, 100),
  };
}

export function reduce(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'init':
      return createEditorState(action.doc);

    case 'rename': {
      const name = action.name.slice(0, 80);
      if (name === state.doc.name) return state;
      return commit(state, { ...state.doc, name }, { key: 'rename', at: action.at });
    }

    case 'setPrivacy':
      if (action.privacy === state.doc.privacy) return state;
      return commit(state, { ...state.doc, privacy: action.privacy });

    case 'addSlide': {
      if (state.doc.slides.length >= MAX_SLIDES) return state;
      const idx = clamp(action.index ?? state.doc.slides.length, 0, state.doc.slides.length);
      const slides = [...state.doc.slides];
      slides.splice(idx, 0, normalizeSlide(action.slide));
      return { ...commit(state, { ...state.doc, slides }, { at: action.at }), selectedSlideId: action.slide.id, selectedOverlayId: null };
    }

    case 'removeSlide': {
      const idx = state.doc.slides.findIndex((s) => s.id === action.id);
      if (idx < 0) return state;
      const slides = state.doc.slides.filter((s) => s.id !== action.id);
      const next = slides[Math.min(idx, slides.length - 1)]?.id ?? null;
      const selectedSlideId = state.selectedSlideId === action.id ? next : state.selectedSlideId;
      return { ...commit(state, { ...state.doc, slides }, { at: action.at }), selectedSlideId, selectedOverlayId: null };
    }

    case 'duplicateSlide': {
      const idx = state.doc.slides.findIndex((s) => s.id === action.id);
      if (idx < 0 || state.doc.slides.length >= MAX_SLIDES) return state;
      const src = state.doc.slides[idx];
      const copy: Slide = {
        ...src,
        id: uid('sl'),
        publishedStoryId: undefined,
        overlays: src.overlays.map((o) => ({ ...o, id: uid('ov') })),
      };
      const slides = [...state.doc.slides];
      slides.splice(idx + 1, 0, copy);
      return { ...commit(state, { ...state.doc, slides }, { at: action.at }), selectedSlideId: copy.id, selectedOverlayId: null };
    }

    case 'moveSlide': {
      const from = state.doc.slides.findIndex((s) => s.id === action.id);
      if (from < 0) return state;
      const to = clamp(action.toIndex, 0, state.doc.slides.length - 1);
      if (to === from) return state;
      const slides = [...state.doc.slides];
      const [item] = slides.splice(from, 1);
      slides.splice(to, 0, item);
      return commit(state, { ...state.doc, slides }, { at: action.at });
    }

    case 'selectSlide':
      if (action.id === state.selectedSlideId) return state;
      return { ...state, selectedSlideId: action.id, selectedOverlayId: null };

    case 'updateSlide': {
      const doc = mapSlide(state.doc, action.id, (s) => normalizeSlide({ ...s, ...action.patch }));
      if (doc === state.doc) return state;
      return commit(state, doc, { key: action.coalesce ? `slide:${action.id}:${action.coalesce}` : undefined, at: action.at });
    }

    case 'resetAdjust': {
      const doc = mapSlide(state.doc, action.id, (s) => ({
        ...s,
        filterId: 'none',
        filterIntensity: 100,
        adjust: { ...DEFAULT_ADJUST },
        effects: { ...DEFAULT_EFFECTS },
      }));
      if (doc === state.doc) return state;
      return commit(state, doc, { at: action.at });
    }

    case 'addOverlay': {
      const slide = state.doc.slides.find((s) => s.id === action.slideId);
      if (!slide || slide.overlays.length >= MAX_OVERLAYS_PER_SLIDE) return state;
      const doc = mapSlide(state.doc, action.slideId, (s) => ({ ...s, overlays: [...s.overlays, normalizeOverlay(action.overlay)] }));
      return { ...commit(state, doc, { at: action.at }), selectedSlideId: action.slideId, selectedOverlayId: action.overlay.id };
    }

    case 'updateOverlay': {
      const doc = mapSlide(state.doc, action.slideId, (s) => ({
        ...s,
        overlays: s.overlays.map((o) => (o.id === action.overlayId ? normalizeOverlay({ ...o, ...action.patch }) : o)),
      }));
      if (doc === state.doc) return state;
      return commit(state, doc, { key: action.coalesce ? `ov:${action.overlayId}:${action.coalesce}` : undefined, at: action.at });
    }

    case 'removeOverlay': {
      const doc = mapSlide(state.doc, action.slideId, (s) => ({ ...s, overlays: s.overlays.filter((o) => o.id !== action.overlayId) }));
      if (doc === state.doc) return state;
      return {
        ...commit(state, doc, { at: action.at }),
        selectedOverlayId: state.selectedOverlayId === action.overlayId ? null : state.selectedOverlayId,
      };
    }

    case 'duplicateOverlay': {
      const slide = state.doc.slides.find((s) => s.id === action.slideId);
      const src = slide?.overlays.find((o) => o.id === action.overlayId);
      if (!slide || !src || slide.overlays.length >= MAX_OVERLAYS_PER_SLIDE) return state;
      const copy: Overlay = { ...src, id: uid('ov'), x: src.x + 40, y: src.y + 40, locked: false };
      const doc = mapSlide(state.doc, action.slideId, (s) => {
        const i = s.overlays.findIndex((o) => o.id === action.overlayId);
        const overlays = [...s.overlays];
        overlays.splice(i + 1, 0, copy);
        return { ...s, overlays };
      });
      return { ...commit(state, doc, { at: action.at }), selectedOverlayId: copy.id };
    }

    case 'moveOverlayLayer': {
      const doc = mapSlide(state.doc, action.slideId, (s) => {
        const from = s.overlays.findIndex((o) => o.id === action.overlayId);
        if (from < 0) return s;
        const to = clamp(action.toIndex, 0, s.overlays.length - 1);
        if (to === from) return s;
        const overlays = [...s.overlays];
        const [item] = overlays.splice(from, 1);
        overlays.splice(to, 0, item);
        return { ...s, overlays };
      });
      if (doc === state.doc) return state;
      return commit(state, doc, { at: action.at });
    }

    case 'selectOverlay':
      if (action.id === state.selectedOverlayId) return state;
      return { ...state, selectedOverlayId: action.id };

    case 'markPublished': {
      // Bookkeeping only: not an undoable edit.
      const doc = mapSlide(state.doc, action.slideId, (s) => ({ ...s, publishedStoryId: action.storyId }));
      return { ...state, doc, rev: state.rev + 1 };
    }

    case 'refreshMediaUrls': {
      // The server may re-encode a video after upload and move it to a new URL. Keep every
      // snapshot (including undo history) pointing at the live file. Not an undoable edit.
      let changed = false;
      const fix = (doc: ProjectDoc): ProjectDoc => ({
        ...doc,
        slides: doc.slides.map((sl) => {
          const id = sl.media?.mediaId;
          const url = id ? action.urls[id] : undefined;
          if (!sl.media || !url || url === sl.media.url) return sl;
          changed = true;
          return { ...sl, media: { ...sl.media, url } };
        }),
      });
      const doc = fix(state.doc);
      if (!changed) return state;
      return { ...state, doc, past: state.past.map(fix), future: state.future.map(fix), rev: state.rev + 1 };
    }

    case 'undo': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return reselect({ ...state, doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], rev: state.rev + 1, lastKey: null });
    }

    case 'redo': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return reselect({ ...state, doc: next, past: [...state.past, state.doc], future: state.future.slice(1), rev: state.rev + 1, lastKey: null });
    }

    default:
      return state;
  }
}

/** After undo/redo make sure the selection still points at something that exists. */
function reselect(state: EditorState): EditorState {
  const slide = state.doc.slides.find((s) => s.id === state.selectedSlideId) ?? state.doc.slides[0] ?? null;
  const overlayOk = !!slide?.overlays.some((o) => o.id === state.selectedOverlayId);
  return { ...state, selectedSlideId: slide?.id ?? null, selectedOverlayId: overlayOk ? state.selectedOverlayId : null };
}

export const canUndo = (s: EditorState) => s.past.length > 0;
export const canRedo = (s: EditorState) => s.future.length > 0;
export const selectedSlide = (s: EditorState): Slide | null => s.doc.slides.find((x) => x.id === s.selectedSlideId) ?? null;
export const selectedOverlay = (s: EditorState): Overlay | null =>
  selectedSlide(s)?.overlays.find((o) => o.id === s.selectedOverlayId) ?? null;
