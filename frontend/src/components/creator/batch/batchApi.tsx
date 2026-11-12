import React from 'react';
import { withCreatorSpaceQuery } from '../../../lib/creatorSpaceContext';

/** Creator Studio Batch — API types + helpers (backend: creator-batch-routes.ts). */

export type BatchStatus = 'draft' | 'scheduled' | 'processing' | 'published';
export type BatchTab = 'all' | BatchStatus;
export type BatchItemStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface BatchSummary {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: BatchStatus;
  platforms: string[];
  privacy: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { total: number; draft: number; scheduled: number; published: number; failed: number };
  thumbnails: { url: string; type: string }[];
}

export interface BatchItem {
  id: string;
  caption: string;
  mediaUrl: string | null;
  mediaType: string | null;
  scheduledAt: string | null;
  status: BatchItemStatus;
  postId: string | null;
  order: number;
  error: string | null;
}

export interface BatchDetail extends BatchSummary {
  items: BatchItem[];
}

export interface BatchListResponse {
  batches: BatchSummary[];
  total: number;
  page: number;
  pageSize: number;
  tabCounts: Record<BatchTab, number>;
}

export interface BatchStat {
  value: number;
  last7d: number;
  prev7d: number;
  changePct: number | null;
}

export interface BatchStats {
  total: BatchStat;
  scheduled: BatchStat;
  published: BatchStat;
  drafts: BatchStat;
}

export interface BatchActivity {
  id: string;
  batchId: string | null;
  type: string;
  message: string;
  createdAt: string;
}

export const BATCH_BASE = '/api/v1/jobs-creator/creator/batches';

function withBatchSpace(path: string): string {
  if (typeof window === 'undefined' || /[?&]spaceId=/.test(path)) return path;
  const space = new URLSearchParams(window.location.search).get('spaceId') || new URLSearchParams(window.location.search).get('space');
  if (!space) return path;
  return `${path}${path.includes('?') ? '&' : '?'}spaceId=${encodeURIComponent(space)}`;
}

/** `spaceId` (Business Suite, from useCreatorSpace) scopes the call to that Space. Omit it to use the page query; pass null for a personal batch. */
export async function batchFetch<T>(token: string | null, path: string, init: RequestInit = {}, spaceId?: string | null): Promise<T> {
  const url = spaceId
    ? withCreatorSpaceQuery(`${BATCH_BASE}${path}`, spaceId)
    : spaceId === null
      ? `${BATCH_BASE}${path}`
      : `${BATCH_BASE}${withBatchSpace(path)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || `Request failed (${res.status})`);
  return body as T;
}

/** Upload one file with the app's existing media endpoint; returns the stored URL + type. */
export async function uploadBatchMedia(token: string | null, file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.path) throw new Error(body?.error || 'Upload failed');
  return { url: body.path, type: body.type === 'video' ? 'video' : 'image' };
}

// ── Platforms ────────────────────────────────────────────────────────────────

export const PLATFORM_OPTIONS: { id: string; label: string; live: boolean }[] = [
  { id: 'wevsoft', label: 'Wevsoft', live: true },
  { id: 'facebook', label: 'Facebook', live: false },
  { id: 'instagram', label: 'Instagram', live: false },
  { id: 'youtube', label: 'YouTube', live: false },
  { id: 'tiktok', label: 'TikTok', live: false },
  { id: 'x', label: 'X', live: false },
  { id: 'linkedin', label: 'LinkedIn', live: false },
];

export const CATEGORY_OPTIONS = ['Campaign', 'Product', 'Community', 'Education', 'Lifestyle', 'Promotion', 'Announcement', 'Other'];

const P: Record<string, { bg: string; node: React.ReactNode }> = {
  wevsoft: { bg: '#4f46e5', node: <span className="text-[9px] font-black leading-none text-white">W</span> },
  facebook: {
    bg: '#1877f2',
    node: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="#fff"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z" /></svg>,
  },
  instagram: {
    bg: 'linear-gradient(45deg,#f9ce34,#ee2a7b 55%,#6228d7)',
    node: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="#fff" strokeWidth="2.4"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r="0.6" fill="#fff" /></svg>,
  },
  youtube: {
    bg: '#ff0000',
    node: <svg viewBox="0 0 24 24" className="h-[10px] w-[10px]" fill="#fff"><path d="M8 5.5v13l11-6.5z" /></svg>,
  },
  tiktok: {
    bg: '#000',
    node: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="#fff"><path d="M16.5 3c.3 2.3 1.8 3.9 4 4.1v3.3c-1.5 0-2.9-.4-4-1.2v6.3a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.4a2.4 2.4 0 1 0 1.5 2.2V3h3.3Z" /></svg>,
  },
  x: { bg: '#111', node: <span className="text-[9px] font-black leading-none text-white">X</span> },
  linkedin: { bg: '#0a66c2', node: <span className="text-[8px] font-black leading-none text-white">in</span> },
};

export function PlatformIcon({ id, size = 18 }: { id: string; size?: number }) {
  const p = P[id] || P.wevsoft;
  const label = PLATFORM_OPTIONS.find((o) => o.id === id)?.label || id;
  return (
    <span
      title={label}
      className="inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-card"
      style={{ width: size, height: size, background: p.bg }}
    >
      {p.node}
    </span>
  );
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return fmtDate(iso);
}

/** ISO → value for <input type="datetime-local"> in the viewer's zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ── CSV import (client-side) ────────────────────────────────────────────────

export interface CsvItem { caption: string; scheduledAt: string | null; mediaUrl: string | null; mediaType: 'image' | 'video' | null }

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/**
 * Columns (header optional, case-insensitive): caption|text|content,
 * scheduled_at|scheduledAt|date|time|schedule, media_url|mediaUrl|media|image|video.
 */
export function parseBatchCsv(text: string): { items: CsvItem[]; skipped: number } {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (!rows.length) return { items: [], skipped: 0 };
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const find = (names: string[]) => head.findIndex((h) => names.includes(h));
  let ci = find(['caption', 'text', 'content', 'post', 'message']);
  let si = find(['scheduled_at', 'scheduledat', 'schedule', 'date', 'time', 'datetime', 'publish_at']);
  let mi = find(['media_url', 'mediaurl', 'media', 'image', 'image_url', 'video', 'video_url', 'url']);
  const hasHeader = ci >= 0 || si >= 0 || mi >= 0;
  if (!hasHeader) { ci = 0; si = 1; mi = 2; }
  const body = hasHeader ? rows.slice(1) : rows;
  let skipped = 0;
  const items: CsvItem[] = [];
  for (const r of body.slice(0, 100)) {
    const caption = (ci >= 0 ? r[ci] : '')?.trim() || '';
    const rawDate = (si >= 0 ? r[si] : '')?.trim() || '';
    const media = (mi >= 0 ? r[mi] : '')?.trim() || '';
    const d = rawDate ? new Date(rawDate) : null;
    const validMedia = /^(https?:\/\/|\/uploads\/)/i.test(media) ? media : '';
    if (!caption && !validMedia) { skipped++; continue; }
    items.push({
      caption,
      scheduledAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
      mediaUrl: validMedia || null,
      mediaType: validMedia ? (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(validMedia) ? 'video' : 'image') : null,
    });
  }
  skipped += Math.max(0, body.length - 100);
  return { items, skipped };
}

export const SAMPLE_CSV = 'caption,scheduled_at,media_url\n"Monday motivation: start small, stay consistent.",2026-10-05 09:00,\n"New product drop this Friday!",2026-10-09 18:30,https://example.com/image.jpg\n';