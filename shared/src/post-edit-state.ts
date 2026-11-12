/**
 * Non-destructive post editor state (Phase 3).
 * Original media files are never mutated during editing — only referenced by URL.
 * Heavy bake (video trim/filters/music mix) happens only at publish via the job queue.
 */

export const POST_EDIT_STATE_VERSION = 1 as const;

export type PostEditMediaKind = 'image' | 'video';

export interface PostEditMediaRef {
  /** Client-side stable id for the slot (not the server Media id). */
  localId: string;
  url: string;
  kind: PostEditMediaKind;
  order: number;
  mimeType?: string;
  /** Original filename for display only. */
  name?: string;
  sizeBytes?: number;
  /** Non-destructive crop 0–1. */
  crop?: { x: number; y: number; w: number; h: number } | null;
  /** CSS/canvas filter + adjust values — applied live; baked only on publish if needed. */
  filters?: {
    brightness?: number;
    contrast?: number;
    saturate?: number;
    blur?: number;
    preset?: string | null;
    /** Media Studio edit params (speed, trimStart/trimEnd, adjustments, effects, fades…). */
    [key: string]: unknown;
  } | null;
  /** Video trim points (seconds) — not re-encoded until publish. */
  trim?: { start: number; end: number | null } | null;
  /** Client-only: key of a not-yet-uploaded file kept in IndexedDB (url is '' until the upload finishes). Never sent to the server. */
  pendingBlobKey?: string;
  textOverlays?: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize?: number;
    color?: string;
  }>;
  stickers?: Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    scale?: number;
  }>;
}

export interface PostEditMusicState {
  musicId: string;
  startTime: number;
  endTime: number | null;
  volume: number;
  originalAudioMuted: boolean;
  title?: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl?: string;
  duration?: number;
}

export interface PostEditAudienceState {
  privacy: string;
  visibilityFlags?: Record<string, boolean>;
  customUserIds?: string[];
  /** People who must not see the post (Friends/Followers/Public). */
  excludedUserIds?: string[];
}

/** Compact poll draft for the feed composer (2–4 options). */
export interface PostEditPollState {
  question: string;
  /** 2-10 options (see shared/post-poll.ts). */
  options: string[];
  /** 1d | 3d | 7d | custom | none. Missing = legacy (expiresAt decides). */
  durationPreset?: '1d' | '3d' | '7d' | 'custom' | 'none';
  multiChoice?: boolean;
  allowAddOptions?: boolean;
  anonymous?: boolean;
  resultsVisibility?: 'always' | 'after_vote' | 'after_close';
  /** ISO datetime when the poll closes; null = no end. */
  expiresAt?: string | null;
}

export interface PostEditState {
  version: typeof POST_EDIT_STATE_VERSION;
  clientDraftId: string;
  updatedAt: string;
  content: string;
  templateType: string | null;
  media: PostEditMediaRef[];
  music: PostEditMusicState | null;
  audience: PostEditAudienceState;
  location?: string;
  feeling?: string | null;
  poll?: PostEditPollState | null;
  hashtags?: string[];
  /** Array of platforms to cross-post to (e.g., ['facebook', 'youtube']) */
  crossPostPlatforms?: string[];
  /** True when publish must run FFmpeg (video trim/filters/music bake). */
  needsHeavyProcess?: boolean;
  /** UI step hint for resume. */
  step?: 'editor' | 'settings';
  /** Which composer owns this draft ('feed' or a Space id) so drafts never cross surfaces. */
  scope?: string | null;
  /** Saved with an explicit Save Draft: comments on/off and a chosen schedule time (ISO). */
  commentsEnabled?: boolean;
  scheduledAt?: string | null;
}

export function createEmptyPostEditState(clientDraftId: string): PostEditState {
  return {
    version: POST_EDIT_STATE_VERSION,
    clientDraftId,
    updatedAt: new Date().toISOString(),
    content: '',
    templateType: null,
    media: [],
    music: null,
    audience: { privacy: 'private' },
    crossPostPlatforms: [],
    needsHeavyProcess: false,
    step: 'editor',
  };
}

export function touchPostEditState(state: PostEditState): PostEditState {
  return { ...state, updatedAt: new Date().toISOString(), version: POST_EDIT_STATE_VERSION };
}

export function computeNeedsHeavyProcess(state: Pick<PostEditState, 'media' | 'music'>): boolean {
  const hasVideoWork = state.media.some((m) => {
    if (m.kind !== 'video') return false;
    if (m.trim && (m.trim.start > 0 || m.trim.end != null)) return true;
    if (m.filters && Object.values(m.filters).some((v) => v != null && v !== 0 && v !== 100 && v !== 'none')) {
      return true;
    }
    if ((m.textOverlays && m.textOverlays.length) || (m.stickers && m.stickers.length)) return true;
    return false;
  });
  const musicOnVideo = !!state.music && state.media.some((m) => m.kind === 'video');
  return hasVideoWork || musicOnVideo;
}

export function parsePostEditState(raw: unknown): PostEditState | null {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  if (!obj.clientDraftId || typeof obj.clientDraftId !== 'string') return null;
  const media = Array.isArray(obj.media) ? obj.media : [];
  return {
    version: POST_EDIT_STATE_VERSION,
    clientDraftId: String(obj.clientDraftId),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    content: typeof obj.content === 'string' ? obj.content.slice(0, 5000) : '',
    templateType: typeof obj.templateType === 'string' ? obj.templateType : null,
    media: media
      .filter((m: any) => m && typeof m.url === 'string' && m.url)
      .map((m: any, i: number) => ({
        localId: String(m.localId || `m-${i}`),
        url: String(m.url),
        kind: m.kind === 'video' ? 'video' : 'image',
        order: Number.isFinite(Number(m.order)) ? Number(m.order) : i,
        mimeType: m.mimeType ? String(m.mimeType) : undefined,
        name: m.name ? String(m.name) : undefined,
        sizeBytes: Number.isFinite(Number(m.sizeBytes)) ? Number(m.sizeBytes) : undefined,
        crop: m.crop && typeof m.crop === 'object' ? m.crop : null,
        filters: m.filters && typeof m.filters === 'object' ? m.filters : null,
        trim: m.trim && typeof m.trim === 'object' ? m.trim : null,
        textOverlays: Array.isArray(m.textOverlays) ? m.textOverlays : [],
        stickers: Array.isArray(m.stickers) ? m.stickers : [],
      })),
    music: obj.music && typeof obj.music === 'object' && obj.music.musicId
      ? {
          musicId: String(obj.music.musicId),
          startTime: Number(obj.music.startTime) || 0,
          endTime: obj.music.endTime == null ? null : Number(obj.music.endTime),
          volume: Number(obj.music.volume) || 1,
          originalAudioMuted: !!obj.music.originalAudioMuted,
          title: obj.music.title,
          artist: obj.music.artist,
          coverImage: obj.music.coverImage,
          audioUrl: obj.music.audioUrl,
          duration: obj.music.duration,
        }
      : null,
    audience:
      obj.audience && typeof obj.audience === 'object'
        ? {
            privacy: String(obj.audience.privacy || 'private'),
            visibilityFlags: obj.audience.visibilityFlags,
            customUserIds: Array.isArray(obj.audience.customUserIds)
              ? obj.audience.customUserIds.map(String)
              : [],
            excludedUserIds: Array.isArray(obj.audience.excludedUserIds)
              ? obj.audience.excludedUserIds.map(String)
              : [],
          }
        : { privacy: 'private' },
    location: typeof obj.location === 'string' ? obj.location : undefined,
    feeling: typeof obj.feeling === 'string' ? obj.feeling.slice(0, 60) : obj.feeling ?? null,
    poll: (() => {
      const p = obj.poll;
      if (!p || typeof p !== 'object') return null;
      const options = Array.isArray(p.options)
        ? p.options.map((o: unknown) => String(o ?? '').trim().slice(0, 80)).filter(Boolean).slice(0, 10)
        : [];
      const question = typeof p.question === 'string' ? p.question.trim().slice(0, 280) : '';
      if (!question && options.length < 2) return null;
      return {
        question,
        options: options.length >= 2 ? options : [...options, '', ''].slice(0, Math.max(2, options.length)),
        expiresAt: typeof p.expiresAt === 'string' ? p.expiresAt : null,
        durationPreset: ['1d', '3d', '7d', 'custom', 'none'].includes(p.durationPreset) ? p.durationPreset : undefined,
        multiChoice: !!p.multiChoice,
        allowAddOptions: !!p.allowAddOptions,
        anonymous: !!p.anonymous,
        resultsVisibility: ['always', 'after_vote', 'after_close'].includes(p.resultsVisibility) ? p.resultsVisibility : 'always',
      };
    })(),
    hashtags: Array.isArray(obj.hashtags) ? obj.hashtags.map(String) : [],
    crossPostPlatforms: Array.isArray(obj.crossPostPlatforms) ? obj.crossPostPlatforms.map(String) : [],
    needsHeavyProcess: !!obj.needsHeavyProcess,
    step: obj.step === 'settings' ? 'settings' : 'editor',
    scope: typeof obj.scope === 'string' && obj.scope ? obj.scope.slice(0, 80) : null,
    commentsEnabled: typeof obj.commentsEnabled === 'boolean' ? obj.commentsEnabled : undefined,
    scheduledAt: typeof obj.scheduledAt === 'string' && !Number.isNaN(Date.parse(obj.scheduledAt)) ? obj.scheduledAt : null,
  };
}

export function serializePostEditState(state: PostEditState): string {
  return JSON.stringify(touchPostEditState({
    ...state,
    needsHeavyProcess: computeNeedsHeavyProcess(state),
  }));
}
