import type { CreatorPublishSettings } from './creatorPublish';
import { DEFAULT_PUBLISH_SETTINGS } from './creatorPublish';
import type { ReelEditState } from './reelEditState';

const DB_NAME = 'wevsoft-creator-publish';
/**
 * The database was called `sora-creator-publish` before the Wevsoft rename. A
 * creator who left a video half-uploaded would lose that draft if we only looked
 * in the new database, so a miss falls back to reading the old one.
 */
const LEGACY_DB_NAME = 'sora-creator-publish';
const STORE = 'drafts';
const DRAFT_KEY = 'video-workflow';

export type ScheduleMode = 'now' | 'schedule';

/** Lightweight video analysis snapshot (Phase 1) — no binary payload. */
export type DraftVideoAnalysis = {
  width: number;
  height: number;
  durationSec: number;
  fps: number | null;
  aspectLabel: string;
  orientation: string;
  qualityTier: string;
  hasAudio: boolean | null;
  fileSize: number;
  mimeType: string;
  fileName: string;
};

export interface VideoPublishDraftMeta {
  publishSettings: CreatorPublishSettings;
  caption: string;
  mentions: string;
  privacy: string;
  autoPostToFeed: boolean;
  taggedProductIds: string[];
  scheduleMode: ScheduleMode;
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
  step: number;
  workflowVersion?: number;
  thumbnailDataUrl: string;
  fileName: string;
  savedAt: string;
  /** Client analysis from last selected file (metadata only). */
  videoAnalysis?: DraftVideoAnalysis | null;
  /** Non-destructive editor state (Phase 2). */
  editState?: ReelEditState | null;
}

export interface VideoPublishDraft extends VideoPublishDraftMeta {
  file?: File | null;
}

const emptyMeta = (): VideoPublishDraftMeta => ({
  publishSettings: { ...DEFAULT_PUBLISH_SETTINGS },
  caption: '',
  mentions: '',
  privacy: 'public',
  autoPostToFeed: true,
  taggedProductIds: [],
  scheduleMode: 'now',
  scheduleDate: '',
  scheduleTime: '',
  timezone: 'auto',
  step: 1,
  workflowVersion: 4,
  thumbnailDataUrl: '',
  fileName: '',
  savedAt: new Date().toISOString(),
  videoAnalysis: null,
  editState: null,
});

function openDb(name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readDraftFrom(name: string): Promise<VideoPublishDraft | undefined> {
  const db = await openDb(name);
  try {
    return await new Promise<VideoPublishDraft | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result as VideoPublishDraft | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveVideoPublishDraft(draft: VideoPublishDraft): Promise<void> {
  const payload: VideoPublishDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    try {
      const { file: _file, ...meta } = payload;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(meta));
    } catch {
      /* quota / private mode */
    }
  }
}

export async function loadVideoPublishDraft(): Promise<VideoPublishDraft | null> {
  for (const name of [DB_NAME, LEGACY_DB_NAME]) {
    try {
      const row = await readDraftFrom(name);
      if (row?.publishSettings) return row;
    } catch {
      /* try the next source */
    }
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as VideoPublishDraftMeta;
    return { ...emptyMeta(), ...meta, file: null };
  } catch {
    return null;
  }
}

export async function clearVideoPublishDraft(): Promise<void> {
  // Clear the legacy database too — otherwise a draft the user just discarded
  // would come back on the next load via the fallback read.
  for (const name of [DB_NAME, LEGACY_DB_NAME]) {
    try {
      const db = await openDb(name);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(DRAFT_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function draftHasContent(draft: VideoPublishDraft | VideoPublishDraftMeta | null): boolean {
  if (!draft) return false;
  return !!(
    draft.fileName ||
    draft.publishSettings?.title ||
    draft.publishSettings?.description ||
    draft.publishSettings?.hashtags ||
    draft.caption
  );
}
