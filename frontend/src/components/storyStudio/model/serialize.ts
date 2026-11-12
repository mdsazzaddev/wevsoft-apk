import {
  CANVAS_H,
  CANVAS_W,
  DEFAULT_ADJUST,
  DEFAULT_EFFECTS,
  DEFAULT_POLL_SETTINGS,
  MAX_OVERLAYS_PER_SLIDE,
  MAX_SLIDES,
  clamp,
  uid,
  type DrawStroke,
  type Overlay,
  type OverlayKind,
  type OverlayMeta,
  type Privacy,
  type ProjectDoc,
  type Slide,
  type StickerData,
  type StoryPollDraft,
  type StoryPollType,
  type StoryPollTheme,
} from './types';
import { slideDuration } from './timing';

/* ---------- per-slide payload stored in StoryMedia.config ---------- */

export interface StudioSlideConfig {
  v: 1;
  kind: 'media' | 'text';
  bgColor: string;
  fit: 'cover' | 'contain';
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  zoom: number;
  offsetX: number;
  offsetY: number;
  filterId: string;
  filterIntensity: number;
  adjust: Slide['adjust'];
  effects: Slide['effects'];
  duration: number;
  overlays: Overlay[];
}

export function toStudioConfig(slide: Slide): StudioSlideConfig {
  return {
    v: 1,
    kind: slide.kind,
    bgColor: slide.bgColor,
    fit: slide.fit,
    rotate: slide.rotate,
    flipH: slide.flipH,
    zoom: slide.zoom,
    offsetX: Math.round(slide.offsetX),
    offsetY: Math.round(slide.offsetY),
    filterId: slide.filterId,
    filterIntensity: slide.filterIntensity,
    adjust: slide.adjust,
    effects: slide.effects,
    duration: Math.round(slideDuration(slide) * 10) / 10,
    overlays: slide.overlays.filter((o) => o.visible),
  };
}

const str = (v: unknown, d: string, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : d);
const num = (v: unknown, d: number, min: number, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

function sanitizePollDraft(raw: any): StoryPollDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const types: StoryPollType[] = ['single', 'multiple', 'yes_no', 'emoji_slider', 'quiz'];
  const themes: StoryPollTheme[] = ['light', 'dark', 'neon', 'pastel', 'contrast'];
  const type = types.includes(raw.type) ? raw.type : 'single';
  const question = str(raw.question, '', 120);
  if (!question) return null;
  const settingsIn = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const options = (Array.isArray(raw.options) ? raw.options : [])
    .slice(0, 6)
    .map((o: any) => ({
      text: str(o?.text, '', 40),
      emoji: str(o?.emoji, '', 16),
      isCorrect: o?.isCorrect === true,
    }))
    .filter((o: { text: string }) => !!o.text || type === 'emoji_slider');
  return {
    type,
    question,
    theme: themes.includes(raw.theme) ? raw.theme : 'dark',
    correctOptionIndex:
      typeof raw.correctOptionIndex === 'number' && Number.isInteger(raw.correctOptionIndex)
        ? raw.correctOptionIndex
        : null,
    settings: {
      anonymous: settingsIn.anonymous === true,
      showResults:
        settingsIn.showResults === 'before' || settingsIn.showResults === 'never'
          ? settingsIn.showResults
          : 'after',
      allowChange: settingsIn.allowChange === true,
      whoCanVote:
        settingsIn.whoCanVote === 'followers' || settingsIn.whoCanVote === 'close_friends'
          ? settingsIn.whoCanVote
          : 'everyone',
      allowReply: settingsIn.allowReply === true,
      maxSelections: num(settingsIn.maxSelections, DEFAULT_POLL_SETTINGS.maxSelections, 1, 6),
      sliderEmoji: str(settingsIn.sliderEmoji, DEFAULT_POLL_SETTINGS.sliderEmoji, 16) || '😍',
      expiryMode: ['1h', '6h', '12h', '24h'].includes(settingsIn.expiryMode)
        ? settingsIn.expiryMode
        : 'story',
    },
    options:
      type === 'yes_no'
        ? [
            { text: 'Yes', emoji: '👍' },
            { text: 'No', emoji: '👎' },
          ]
        : options.length >= 2 || type === 'emoji_slider'
          ? options
          : [
              { text: 'Option 1', emoji: '' },
              { text: 'Option 2', emoji: '' },
            ],
  };
}

function sanitizeStrokes(raw: unknown): DrawStroke[] {
  if (!Array.isArray(raw)) return [];
  const out: DrawStroke[] = [];
  for (const s of raw.slice(0, 200)) {
    if (!s || typeof s !== 'object') continue;
    const ptsIn = Array.isArray((s as any).points) ? (s as any).points : [];
    const points = ptsIn
      .slice(0, 2000)
      .map((p: any) => ({
        x: num(p?.x, 0, -500, CANVAS_W + 500),
        y: num(p?.y, 0, -500, CANVAS_H + 500),
      }))
      .filter((p: { x: number; y: number }) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (points.length < 1) continue;
    const color = typeof (s as any).color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test((s as any).color) ? (s as any).color : '#ffffff';
    out.push({
      id: str((s as any).id, uid('stk'), 60) || uid('stk'),
      color,
      width: num((s as any).width, 12, 1, 120),
      points,
      eraser: (s as any).eraser === true,
    });
  }
  return out;
}

function sanitizeMeta(raw: unknown): OverlayMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const t = (raw as any).type;
  if (t === 'mention') {
    return {
      type: 'mention',
      userId: typeof (raw as any).userId === 'string' ? str((raw as any).userId, '', 80) || undefined : undefined,
      tag: typeof (raw as any).tag === 'string' ? str((raw as any).tag, '', 60) || undefined : undefined,
    };
  }
  if (t === 'hashtag') {
    return {
      type: 'hashtag',
      tag: typeof (raw as any).tag === 'string' ? str((raw as any).tag, '', 60) || undefined : undefined,
    };
  }
  return undefined;
}

const OVERLAY_KINDS: OverlayKind[] = [
  'text',
  'sticker',
  'poll',
  'draw',
  'question',
  'countdown',
  'link',
  'location',
  'music',
  'gif',
];

function sanitizeStickerData(raw: unknown): StickerData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: StickerData = {};
  if (typeof r.prompt === 'string') out.prompt = str(r.prompt, '', 200);
  if (typeof r.title === 'string') out.title = str(r.title, '', 80);
  if (typeof r.endsAt === 'string') {
    const d = Date.parse(r.endsAt);
    if (Number.isFinite(d)) out.endsAt = new Date(d).toISOString();
  }
  if (typeof r.url === 'string') {
    const u = str(r.url, '', 500);
    if (/^https?:\/\//i.test(u)) out.url = u;
  }
  if (typeof r.linkLabel === 'string') out.linkLabel = str(r.linkLabel, '', 80);
  if (typeof r.placeName === 'string') out.placeName = str(r.placeName, '', 120);
  if (typeof r.lat === 'number' && Number.isFinite(r.lat)) out.lat = clamp(r.lat, -90, 90);
  if (typeof r.lng === 'number' && Number.isFinite(r.lng)) out.lng = clamp(r.lng, -180, 180);
  if (typeof r.musicTitle === 'string') out.musicTitle = str(r.musicTitle, '', 120);
  if (typeof r.musicArtist === 'string') out.musicArtist = str(r.musicArtist, '', 120);
  if (typeof r.musicUrl === 'string') {
    const mu = str(r.musicUrl, '', 500);
    if (/^https?:\/\//i.test(mu) || mu.startsWith('/')) out.musicUrl = mu;
  }
  if (typeof r.musicMediaId === 'string') out.musicMediaId = str(r.musicMediaId, '', 80);
  if (typeof r.gifUrl === 'string') {
    const gu = str(r.gifUrl, '', 500);
    if (/^https?:\/\//i.test(gu) || gu.startsWith('/')) out.gifUrl = gu;
  }
  if (typeof r.gifPreview === 'string') {
    const gp = str(r.gifPreview, '', 500);
    if (/^https?:\/\//i.test(gp) || gp.startsWith('/')) out.gifPreview = gp;
  }
  return Object.keys(out).length ? out : undefined;
}

function defaultSize(kind: OverlayKind): { w: number; h: number } {
  if (kind === 'poll') return { w: 800, h: 520 };
  if (kind === 'draw') return { w: 1080, h: 1920 };
  if (kind === 'gif') return { w: 480, h: 480 };
  if (kind === 'question' || kind === 'countdown') return { w: 800, h: 220 };
  if (kind === 'music') return { w: 760, h: 130 };
  if (kind === 'link' || kind === 'location') return { w: 640, h: 120 };
  return { w: 400, h: 160 };
}

export function sanitizeOverlay(raw: any): Overlay | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind: OverlayKind = OVERLAY_KINDS.includes(raw.kind) ? raw.kind : 'text';
  const align = raw.align === 'left' || raw.align === 'right' ? raw.align : 'center';
  const def = defaultSize(kind);
  const base: Overlay = {
    id: str(raw.id, uid('ov'), 60) || uid('ov'),
    kind,
    name: str(raw.name, '', 60),
    text: str(raw.text, '', 600),
    fontFamily: str(raw.fontFamily, 'Inter', 60),
    fontSize: num(raw.fontSize, 84, 12, 600),
    bold: bool(raw.bold, false),
    italic: bool(raw.italic, false),
    underline: bool(raw.underline, false),
    align,
    color: /^#[0-9a-fA-F]{3,8}$/.test(raw.color) ? raw.color : '#ffffff',
    shadow: bool(raw.shadow, false),
    outline: bool(raw.outline, false),
    gradient: bool(raw.gradient, false),
    background: bool(raw.background, false),
    bgColor:
      typeof raw.bgColor === 'string' && (/^#[0-9a-fA-F]{3,8}$/.test(raw.bgColor) || /^rgba?\(/.test(raw.bgColor))
        ? raw.bgColor.slice(0, 64)
        : '#000000',
    x: num(raw.x, 0, -2000, 3000),
    y: num(raw.y, 0, -2000, 4000),
    w: num(raw.w, def.w, 40, 2400),
    h: num(raw.h, def.h, 40, 2400),
    rotation: num(raw.rotation, 0, -360, 360),
    opacity: num(raw.opacity, 100, 0, 100),
    visible: bool(raw.visible, true),
    locked: bool(raw.locked, false),
  };
  if (kind === 'poll') {
    const poll = sanitizePollDraft(raw.poll);
    if (!poll) return null;
    return { ...base, text: poll.question, poll };
  }
  if (kind === 'draw') {
    return { ...base, strokes: sanitizeStrokes(raw.strokes), text: '', name: base.name || 'Drawing' };
  }
  const sticker = sanitizeStickerData(raw.sticker);
  const meta = sanitizeMeta(raw.meta);
  return {
    ...base,
    ...(sticker ? { sticker } : {}),
    ...(meta ? { meta } : {}),
  };
}

/** Parse the JSON in StoryMedia.config; returns null when it is not a studio config (e.g. video thumbnail json). */
export function parseStudioConfig(text: string | null | undefined): StudioSlideConfig | null {
  if (!text) return null;
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const c = raw?.studio ?? raw;
  if (!c || typeof c !== 'object' || c.v !== 1) return null;
  const rot = [0, 90, 180, 270].includes(c.rotate) ? c.rotate : 0;
  return {
    v: 1,
    kind: c.kind === 'text' ? 'text' : 'media',
    bgColor: /^#[0-9a-fA-F]{3,8}$/.test(c.bgColor) ? c.bgColor : '#000000',
    fit: c.fit === 'contain' ? 'contain' : 'cover',
    rotate: rot,
    flipH: bool(c.flipH, false),
    zoom: num(c.zoom, 1, 1, 3),
    offsetX: num(c.offsetX, 0, -2000, 2000),
    offsetY: num(c.offsetY, 0, -3000, 3000),
    filterId: str(c.filterId, 'none', 30),
    filterIntensity: num(c.filterIntensity, 100, 0, 100),
    adjust: {
      brightness: num(c.adjust?.brightness, DEFAULT_ADJUST.brightness, 0, 200),
      contrast: num(c.adjust?.contrast, DEFAULT_ADJUST.contrast, 0, 200),
      saturation: num(c.adjust?.saturation, DEFAULT_ADJUST.saturation, 0, 200),
      temperature: num(c.adjust?.temperature, 0, -100, 100),
    },
    effects: {
      vignette: num(c.effects?.vignette, DEFAULT_EFFECTS.vignette, 0, 100),
      grain: num(c.effects?.grain, DEFAULT_EFFECTS.grain, 0, 100),
    },
    duration: num(c.duration, 5, 1, 60),
    overlays: (Array.isArray(c.overlays) ? c.overlays : [])
      .slice(0, MAX_OVERLAYS_PER_SLIDE)
      .map(sanitizeOverlay)
      .filter(Boolean) as Overlay[],
  };
}

/** Merge studio JSON into whatever config already exists (never drop `thumbnailUrl`). */
export function mergeConfigJson(existing: string | null | undefined, studio: StudioSlideConfig): string {
  let base: Record<string, unknown> = {};
  try {
    const parsed = existing ? JSON.parse(existing) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) base = parsed;
  } catch {
    /* ignore */
  }
  return JSON.stringify({ ...base, studio });
}

/* ---------- draft (project) persistence ---------- */

export const DRAFT_VERSION = 1;
const PRIVACIES: Privacy[] = ['public', 'friends', 'followers', 'close_friends', 'private'];

export interface DraftEnvelope {
  v: number;
  savedAt: number;
  doc: ProjectDoc;
}

export function draftKey(userId: string | undefined | null, spaceId?: string | null): string {
  return `wev_story_studio_draft_v${DRAFT_VERSION}:${userId || 'anon'}:${spaceId || 'me'}`;
}

export function serializeDraft(doc: ProjectDoc, now = Date.now()): string {
  const env: DraftEnvelope = { v: DRAFT_VERSION, savedAt: now, doc };
  return JSON.stringify(env);
}

function sanitizeSlide(raw: any): Slide | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind === 'text' ? 'text' : 'media';
  const cfg = parseStudioConfig(JSON.stringify({ studio: { ...raw, v: 1 } }));
  if (!cfg) return null;
  let media: Slide['media'];
  if (kind === 'media') {
    const m = raw.media;
    // Local blob: URLs do not survive a reload; only keep media that already lives on the server.
    if (!m || typeof m.url !== 'string' || !m.url || m.url.startsWith('blob:') || (m.type !== 'image' && m.type !== 'video')) return null;
    media = {
      mediaId: typeof m.mediaId === 'string' ? m.mediaId : undefined,
      url: m.url.slice(0, 2000),
      type: m.type,
      name: str(m.name, '', 120),
      naturalDuration: typeof m.naturalDuration === 'number' && Number.isFinite(m.naturalDuration) ? m.naturalDuration : undefined,
    };
  }
  return {
    id: str(raw.id, uid('sl'), 60) || uid('sl'),
    kind,
    media,
    bgColor: cfg.bgColor,
    fit: cfg.fit,
    rotate: cfg.rotate,
    flipH: cfg.flipH,
    zoom: cfg.zoom,
    offsetX: cfg.offsetX,
    offsetY: cfg.offsetY,
    filterId: cfg.filterId,
    filterIntensity: cfg.filterIntensity,
    adjust: cfg.adjust,
    effects: cfg.effects,
    duration: clamp(cfg.duration, 1, 15),
    overlays: cfg.overlays,
    publishedStoryId: typeof raw.publishedStoryId === 'string' ? raw.publishedStoryId : undefined,
  };
}

export function parseDraft(text: string | null | undefined): { doc: ProjectDoc; savedAt: number } | null {
  if (!text) return null;
  try {
    const env = JSON.parse(text);
    if (!env || env.v !== DRAFT_VERSION || !env.doc || !Array.isArray(env.doc.slides)) return null;
    const slides = env.doc.slides.slice(0, MAX_SLIDES).map(sanitizeSlide).filter(Boolean) as Slide[];
    const doc: ProjectDoc = {
      id: str(env.doc.id, uid('proj'), 60) || uid('proj'),
      name: str(env.doc.name, 'My Story Project', 80) || 'My Story Project',
      privacy: PRIVACIES.includes(env.doc.privacy) ? env.doc.privacy : 'public',
      slides,
    };
    return { doc, savedAt: typeof env.savedAt === 'number' ? env.savedAt : 0 };
  } catch {
    return null;
  }
}

export const hasContent = (doc: ProjectDoc) => doc.slides.length > 0;
export const unpublishedSlides = (doc: ProjectDoc) => doc.slides.filter((s) => !s.publishedStoryId);
