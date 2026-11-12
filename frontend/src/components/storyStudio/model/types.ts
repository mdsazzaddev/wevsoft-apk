/**
 * Story Studio project model. Pure data (no React, no DOM) so it can be unit-tested,
 * serialised to a draft, and rendered identically by the editor, the preview and StoryViewer.
 * Overlay geometry lives in a fixed 1080x1920 logical canvas.
 */
export const CANVAS_W = 1080;
export const CANVAS_H = 1920;
export const MIN_SLIDE_SECONDS = 1;
export const MAX_SLIDE_SECONDS = 15;
export const DEFAULT_SLIDE_SECONDS = 5;
export const MAX_SLIDES = 20;
export const MAX_OVERLAYS_PER_SLIDE = 40;

export type OverlayKind =
  | 'text'
  | 'sticker'
  | 'poll'
  | 'draw'
  | 'question'
  | 'countdown'
  | 'link'
  | 'location'
  | 'music'
  | 'gif';
export type TextAlign = 'left' | 'center' | 'right';

/** Optional deep-link metadata for mention / hashtag text overlays (IG create tray). */
export type OverlayMeta =
  | { type: 'mention'; userId?: string; tag?: string }
  | { type: 'hashtag'; tag?: string };

/** Extra payload for Phase-2 interactive / media stickers. */
export interface StickerData {
  /** question */
  prompt?: string;
  /** countdown — ISO end time */
  endsAt?: string;
  title?: string;
  /** link */
  url?: string;
  linkLabel?: string;
  /** location */
  placeName?: string;
  lat?: number;
  lng?: number;
  /** music */
  musicTitle?: string;
  musicArtist?: string;
  musicUrl?: string;
  musicMediaId?: string;
  /** gif */
  gifUrl?: string;
  gifPreview?: string;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  color: string;
  width: number;
  points: DrawPoint[];
  /** When true, stroke punches through previous ink (destination-out). */
  eraser?: boolean;
}

export type StoryPollType = 'single' | 'multiple' | 'yes_no' | 'emoji_slider' | 'quiz';
export type StoryPollTheme = 'light' | 'dark' | 'neon' | 'pastel' | 'contrast';
export type ShowResultsMode = 'before' | 'after' | 'never';
export type WhoCanVote = 'everyone' | 'followers' | 'close_friends';
export type PollExpiryMode = 'story' | '1h' | '6h' | '12h' | '24h';

export interface StoryPollOptionDraft {
  text: string;
  emoji?: string;
  isCorrect?: boolean;
}

export interface StoryPollSettingsDraft {
  anonymous: boolean;
  showResults: ShowResultsMode;
  allowChange: boolean;
  whoCanVote: WhoCanVote;
  allowReply: boolean;
  maxSelections: number;
  sliderEmoji: string;
  expiryMode: PollExpiryMode;
}

export interface StoryPollDraft {
  type: StoryPollType;
  question: string;
  options: StoryPollOptionDraft[];
  theme: StoryPollTheme;
  settings: StoryPollSettingsDraft;
  correctOptionIndex?: number | null;
}

export const DEFAULT_POLL_SETTINGS: StoryPollSettingsDraft = {
  anonymous: false,
  showResults: 'after',
  allowChange: false,
  whoCanVote: 'everyone',
  allowReply: false,
  maxSelections: 2,
  sliderEmoji: '😍',
  expiryMode: 'story',
};

export const POLL_THEMES: { id: StoryPollTheme; label: string; bg: string; fg: string; accent: string }[] = [
  { id: 'light', label: 'Light', bg: '#ffffff', fg: '#0f172a', accent: '#2563eb' },
  { id: 'dark', label: 'Dark', bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8' },
  { id: 'neon', label: 'Neon', bg: '#111827', fg: '#f0abfc', accent: '#22d3ee' },
  { id: 'pastel', label: 'Pastel', bg: '#fdf2f8', fg: '#831843', accent: '#f472b6' },
  { id: 'contrast', label: 'Contrast', bg: '#000000', fg: '#ffffff', accent: '#facc15' },
];

export interface Overlay {
  id: string;
  kind: OverlayKind;
  name: string;
  /** Text content, or the emoji for stickers. */
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  color: string;
  shadow: boolean;
  outline: boolean;
  gradient: boolean;
  background: boolean;
  bgColor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Interactive poll sticker payload (kind === 'poll'). */
  poll?: StoryPollDraft;
  /** Mention / hashtag deep-link metadata (kind === 'text'). */
  meta?: OverlayMeta;
  /** Vector ink strokes (kind === 'draw'). Full-canvas layer typically x=0,y=0,w=CANVAS_W,h=CANVAS_H. */
  strokes?: DrawStroke[];
  /** Phase-2 sticker payloads (question, countdown, link, location, music, gif). */
  sticker?: StickerData;
}

export interface SlideMedia {
  /** Row id in the user's media library (`Media.id`). Required to publish. */
  mediaId?: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  /** Seconds, videos only (read from the file metadata). */
  naturalDuration?: number;
}

export interface Adjust {
  brightness: number; // 0..200, 100 = neutral
  contrast: number; // 0..200
  saturation: number; // 0..200
  temperature: number; // -100..100, 0 = neutral
}

export interface Effects {
  vignette: number; // 0..100
  grain: number; // 0..100
}

export interface Slide {
  id: string;
  kind: 'media' | 'text';
  media?: SlideMedia;
  bgColor: string;
  fit: 'cover' | 'contain';
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  zoom: number; // 1..3
  offsetX: number; // logical px
  offsetY: number;
  filterId: string;
  filterIntensity: number; // 0..100
  adjust: Adjust;
  effects: Effects;
  /** Seconds. Ignored for video slides (natural length is used). */
  duration: number;
  overlays: Overlay[];
  /** Set after this slide was published successfully (so a retry never duplicates it). */
  publishedStoryId?: string;
}

export type Privacy = 'public' | 'friends' | 'followers' | 'close_friends' | 'private';

export interface ProjectDoc {
  id: string;
  name: string;
  privacy: Privacy;
  slides: Slide[];
}

export const DEFAULT_ADJUST: Adjust = { brightness: 100, contrast: 100, saturation: 100, temperature: 0 };
export const DEFAULT_EFFECTS: Effects = { vignette: 0, grain: 0 };

export const FONT_FAMILIES = ['Inter', 'Poppins', 'Playfair Display', 'Space Grotesk', 'JetBrains Mono', 'Comic Sans MS'] as const;

export const BG_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a', '#ffffff'];

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rnd}`;
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function newTextOverlay(text = 'Your text', partial: Partial<Overlay> = {}): Overlay {
  return {
    id: uid('ov'),
    kind: 'text',
    name: '',
    text,
    fontFamily: 'Inter',
    fontSize: 84,
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
    color: '#ffffff',
    shadow: true,
    outline: false,
    gradient: false,
    background: false,
    bgColor: '#000000',
    x: 160,
    y: 760,
    w: 760,
    h: 200,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    ...partial,
  };
}

export function newSticker(emoji: string, partial: Partial<Overlay> = {}): Overlay {
  return newTextOverlay(emoji, {
    kind: 'sticker',
    name: '',
    fontSize: 200,
    bold: false,
    shadow: false,
    x: 440,
    y: 860,
    w: 200,
    h: 200,
    ...partial,
  });
}

export function newMediaSlide(media: SlideMedia, partial: Partial<Slide> = {}): Slide {
  return {
    id: uid('sl'),
    kind: 'media',
    media,
    bgColor: '#000000',
    fit: 'cover',
    rotate: 0,
    flipH: false,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    filterId: 'none',
    filterIntensity: 100,
    adjust: { ...DEFAULT_ADJUST },
    effects: { ...DEFAULT_EFFECTS },
    duration: DEFAULT_SLIDE_SECONDS,
    overlays: [],
    ...partial,
  };
}

export function newTextSlide(partial: Partial<Slide> = {}): Slide {
  return {
    ...newMediaSlide({ url: '', type: 'image', name: '' }),
    kind: 'text',
    media: undefined,
    bgColor: '#3b82f6',
    overlays: [newTextOverlay('Tap to edit', { y: 800 })],
    ...partial,
  };
}

export function newPollDraft(partial: Partial<StoryPollDraft> = {}): StoryPollDraft {
  const { settings: settingsPartial, ...rest } = partial;
  return {
    type: 'single',
    question: 'Ask a question…',
    options: [
      { text: 'Option 1', emoji: '' },
      { text: 'Option 2', emoji: '' },
    ],
    theme: 'dark',
    correctOptionIndex: null,
    ...rest,
    settings: { ...DEFAULT_POLL_SETTINGS, ...(settingsPartial || {}) },
  };
}

/** Interactive poll sticker — attachable to any photo / video / text slide. */
export function newPollOverlay(partial: Partial<Overlay> = {}, pollPartial: Partial<StoryPollDraft> = {}): Overlay {
  const basePoll = newPollDraft(pollPartial);
  const { poll: pollFromPartial, kind: _ignoredKind, text: _ignoredText, ...rest } = partial;
  const poll = pollFromPartial
    ? {
        ...basePoll,
        ...pollFromPartial,
        settings: { ...basePoll.settings, ...(pollFromPartial.settings || {}) },
      }
    : basePoll;
  return {
    id: uid('ov'),
    name: 'Poll',
    fontFamily: 'Inter',
    fontSize: 40,
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
    color: '#ffffff',
    shadow: false,
    outline: false,
    gradient: false,
    background: false,
    bgColor: '#0f172a',
    x: 140,
    y: 700,
    w: 800,
    h: 520,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    ...rest,
    kind: 'poll',
    poll,
    text: poll.question,
  };
}

/** Welcome-flow helper: text slide with one interactive poll sticker (replaces fake option pills). */
export function newPollSlide(partial: Partial<Slide> = {}): Slide {
  return {
    ...newMediaSlide({ url: '', type: 'image', name: '' }),
    kind: 'text',
    media: undefined,
    bgColor: '#1e293b',
    overlays: [newPollOverlay()],
    ...partial,
  };
}

export function newProject(partial: Partial<ProjectDoc> = {}): ProjectDoc {
  return { id: uid('proj'), name: 'My Story Project', privacy: 'public', slides: [], ...partial };
}

/** Full-bleed draw layer covering the logical canvas. */
export function newDrawOverlay(partial: Partial<Overlay> = {}): Overlay {
  const { kind: _k, ...rest } = partial;
  return {
    id: uid('ov'),
    name: 'Drawing',
    text: '',
    fontFamily: 'Inter',
    fontSize: 16,
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    color: '#ffffff',
    shadow: false,
    outline: false,
    gradient: false,
    background: false,
    bgColor: '#000000',
    x: 0,
    y: 0,
    w: CANVAS_W,
    h: CANVAS_H,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    strokes: [],
    ...rest,
    kind: 'draw',
  };
}

export function newMentionOverlay(handle: string, userId?: string, partial: Partial<Overlay> = {}): Overlay {
  const tag = handle.replace(/^@/, '').trim() || 'user';
  return newTextOverlay(`@${tag}`, {
    fontFamily: 'Poppins',
    fontSize: 64,
    bold: true,
    background: true,
    bgColor: 'rgba(0,0,0,0.55)',
    color: '#ffffff',
    shadow: false,
    meta: { type: 'mention', userId, tag },
    name: `Mention @${tag}`,
    ...partial,
  });
}

export function newHashtagOverlay(tag: string, partial: Partial<Overlay> = {}): Overlay {
  const clean = tag.replace(/^#/, '').trim().replace(/\s+/g, '') || 'tag';
  return newTextOverlay(`#${clean}`, {
    fontFamily: 'Poppins',
    fontSize: 72,
    bold: true,
    background: true,
    bgColor: 'rgba(37,99,235,0.85)',
    color: '#ffffff',
    shadow: false,
    meta: { type: 'hashtag', tag: clean },
    name: `Hashtag #${clean}`,
    ...partial,
  });
}

function baseChipOverlay(kind: OverlayKind, text: string, sticker: StickerData, partial: Partial<Overlay> = {}): Overlay {
  const { kind: _k, sticker: _s, text: _t, ...rest } = partial;
  return {
    id: uid('ov'),
    name: kind.charAt(0).toUpperCase() + kind.slice(1),
    fontFamily: 'Poppins',
    fontSize: 36,
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
    color: '#ffffff',
    shadow: true,
    outline: false,
    gradient: false,
    background: true,
    bgColor: '#111827',
    x: 140,
    y: 720,
    w: 800,
    h: 200,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    ...rest,
    kind,
    text,
    sticker,
  };
}

export function newQuestionOverlay(prompt = 'Ask me anything…', partial: Partial<Overlay> = {}): Overlay {
  return baseChipOverlay('question', prompt, { prompt }, { h: 220, bgColor: '#7c3aed', ...partial });
}

export function newCountdownOverlay(title = 'Countdown', endsAt?: string, partial: Partial<Overlay> = {}): Overlay {
  const end = endsAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  return baseChipOverlay('countdown', title, { title, endsAt: end }, { h: 240, bgColor: '#0ea5e9', ...partial });
}

export function newLinkOverlay(url: string, label?: string, partial: Partial<Overlay> = {}): Overlay {
  let safe = url.trim();
  if (safe && !/^https?:\/\//i.test(safe)) safe = `https://${safe}`;
  const linkLabel = (label || safe.replace(/^https?:\/\//i, '').slice(0, 40)) || 'Link';
  return baseChipOverlay('link', linkLabel, { url: safe, linkLabel }, { h: 120, bgColor: '#2563eb', w: 720, x: 180, ...partial });
}

export function newLocationOverlay(placeName: string, partial: Partial<Overlay> = {}): Overlay {
  const name = placeName.trim() || 'Location';
  return baseChipOverlay('location', name, { placeName: name }, { h: 110, bgColor: '#059669', w: 640, x: 220, ...partial });
}

export function newMusicOverlay(
  opts: { title: string; artist?: string; musicUrl?: string; musicMediaId?: string },
  partial: Partial<Overlay> = {},
): Overlay {
  const musicTitle = opts.title.trim() || 'Music';
  const musicArtist = (opts.artist || '').trim();
  const text = musicArtist ? `${musicTitle} · ${musicArtist}` : musicTitle;
  return baseChipOverlay(
    'music',
    text,
    { musicTitle, musicArtist, musicUrl: opts.musicUrl, musicMediaId: opts.musicMediaId },
    { h: 130, bgColor: '#111827', w: 760, x: 160, y: 1580, ...partial },
  );
}

export function newGifOverlay(url: string, preview?: string, partial: Partial<Overlay> = {}): Overlay {
  return baseChipOverlay(
    'gif',
    'GIF',
    { gifUrl: url, gifPreview: preview || url },
    { w: 480, h: 480, x: 300, y: 700, background: false, shadow: false, ...partial },
  );
}

export function overlayLabel(o: Overlay): string {
  if (o.name.trim()) return o.name.trim();
  if (o.kind === 'draw') return 'Drawing';
  if (o.kind === 'sticker') return `Sticker (${o.text})`;
  if (o.kind === 'poll') {
    const q = (o.poll?.question || o.text || 'Poll').replace(/\s+/g, ' ').trim();
    return q.length > 28 ? `Poll: ${q.slice(0, 24)}…` : `Poll: ${q}`;
  }
  if (o.kind === 'question') return `Question: ${(o.sticker?.prompt || o.text).slice(0, 24)}`;
  if (o.kind === 'countdown') return `Countdown: ${(o.sticker?.title || o.text).slice(0, 20)}`;
  if (o.kind === 'link') return `Link: ${(o.sticker?.linkLabel || o.text).slice(0, 24)}`;
  if (o.kind === 'location') return `Location: ${(o.sticker?.placeName || o.text).slice(0, 20)}`;
  if (o.kind === 'music') return `Music: ${(o.sticker?.musicTitle || o.text).slice(0, 20)}`;
  if (o.kind === 'gif') return 'GIF';
  if (o.meta?.type === 'mention') return `Mention ${o.text}`;
  if (o.meta?.type === 'hashtag') return `Hashtag ${o.text}`;
  const t = o.text.replace(/\s+/g, ' ').trim();
  return t ? (t.length > 28 ? `${t.slice(0, 27)}…` : t) : 'Text';
}
