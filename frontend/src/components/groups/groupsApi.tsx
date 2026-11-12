import React from 'react';
import {
  Cpu, Palette, Code2, GraduationCap, Megaphone, Sun, Gamepad2, Camera, Briefcase, Music2, Trophy, Shapes,
} from 'lucide-react';
import { resolveAvatarUrl } from '../UserAvatar';

/** Groups hub — API types/helpers (backend: backend/src/server/social/groups-hub.ts). */

export interface HubUser {
  id: string;
  name: string | null;
  username?: string | null;
  avatar?: string | null;
  verified?: boolean | null;
}

export interface HubGroup {
  id: string;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  avatar: string | null;
  privacy: string;
  category: string | null;
  createdAt: string;
  memberCount: number;
  postCount: number;
  joined: boolean;
  role: string | null;
  pending: boolean;
}

export interface HubPoll {
  id: string;
  question: string;
  expiresAt: string | null;
  totalVotes: number;
  myVote: string | null;
  options: { id: string; text: string; votes: number }[];
}

export interface HubPost {
  id: string;
  content: string | null;
  type: string;
  feeling: string | null;
  createdAt: string;
  author: HubUser | null;
  media: { url: string; type: string }[];
  groups: { id: string; name: string; avatar: string | null; coverPhoto: string | null; privacy: string; category: string | null; pinned: boolean }[];
  counts: { likes: number; comments: number; shares: number };
  reactions: { type: string; count: number }[];
  likedByMe: boolean;
  myReaction: string | null;
  savedByMe: boolean;
  isMine: boolean;
  shareToFeed?: boolean;
  poll: HubPoll | null;
}

export interface HubOverview {
  counts: { all: number; joined: number; myPosts: number; savedPosts: number };
  categories: { key: string; count: number }[];
  myGroups: HubGroup[];
}

export interface HubTrending {
  id: string;
  title: string;
  thumbnail: { url: string; type: string } | null;
  author: HubUser | null;
  group: { id: string; name: string } | null;
  likes: number;
  comments: number;
}

export interface HubEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  isAllDay: boolean;
  color: string | null;
  group: { id: string; name: string; avatar: string | null; coverPhoto: string | null } | null;
  attendees: number;
}

export async function hubFetch<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith('/api/') ? path : `/api/groups-hub${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || (body as any)?.message || `Request failed (${res.status})`);
  return body as T;
}

export async function uploadHubMedia(token: string | null, file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/media/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.path) throw new Error(body?.error || 'Upload failed');
  return { url: body.path, type: body.type === 'video' ? 'video' : 'image' };
}

// ── Categories ──
export const CATEGORY_META: Record<string, { label: string; icon: React.FC<any>; tone: string; grad: string }> = {
  technology: { label: 'Technology', icon: Cpu, tone: 'bg-sky-500/15 text-sky-500 dark:text-sky-300', grad: 'bg-muted' },
  design: { label: 'Design', icon: Palette, tone: 'bg-amber-500/15 text-amber-500 dark:text-amber-300', grad: 'bg-muted' },
  development: { label: 'Development', icon: Code2, tone: 'bg-violet-500/15 text-violet-500 ', grad: 'bg-muted' },
  education: { label: 'Education', icon: GraduationCap, tone: 'bg-blue-500/15 text-blue-500 dark:text-blue-300', grad: 'bg-muted' },
  marketing: { label: 'Marketing', icon: Megaphone, tone: 'bg-rose-500/15 text-muted-foreground dark:text-rose-300', grad: 'bg-muted' },
  lifestyle: { label: 'Lifestyle', icon: Sun, tone: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-300', grad: 'bg-muted' },
  gaming: { label: 'Gaming', icon: Gamepad2, tone: 'bg-muted text-foreground/70 ', grad: 'bg-muted' },
  photography: { label: 'Photography', icon: Camera, tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', grad: 'bg-muted' },
  business: { label: 'Business', icon: Briefcase, tone: 'bg-primary/15 text-primary ', grad: 'bg-muted' },
  music: { label: 'Music', icon: Music2, tone: 'bg-pink-500/15 text-pink-500 dark:text-pink-300', grad: 'bg-muted' },
  sports: { label: 'Sports', icon: Trophy, tone: 'bg-orange-500/15 text-muted-foreground dark:text-orange-300', grad: 'bg-muted' },
  other: { label: 'Other', icon: Shapes, tone: 'bg-teal-500/15 text-teal-600 dark:text-teal-300', grad: 'bg-muted' },
};
export const catMeta = (key?: string | null) => CATEGORY_META[key || 'other'] || CATEGORY_META.other;

// ── Visual helpers ──
const GRADS = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
];
export function gradFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

export function GroupAvatar({ group, size = 36, className = '' }: { group: { id: string; name: string; avatar?: string | null }; size?: number; className?: string }) {
  const url = resolveAvatarUrl(group.avatar || null);
  return (
    <span className={`grid shrink-0 overflow-hidden rounded-lg bg-card ${className}`} style={{ width: size, height: size }}>
      <span className={`grid h-full w-full place-items-center font-semibold ${url ? '' : gradFor(group.id)}`} style={{ fontSize: size * 0.42 }}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (group.name || 'G').trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

export function PersonAvatar({ user, size = 36, className = '' }: { user?: HubUser | null; size?: number; className?: string }) {
  const url = resolveAvatarUrl(user?.avatar || null);
  const initials = (user?.name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className={`grid shrink-0 overflow-hidden rounded-full bg-card ${className}`} style={{ width: size, height: size }}>
      <span className={`grid h-full w-full place-items-center font-semibold ${url ? '' : gradFor(user?.id || 'u')}`} style={{ fontSize: size * 0.38 }}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials}
      </span>
    </span>
  );
}

export const plural = (n: number, word: string) => `${fmtCount(n)} ${word}${n === 1 ? '' : 's'}`;

export function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d > 300 ? 'numeric' : undefined });
}

export const REACTION_EMOJI: Record<string, string> = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };

export const FEELINGS = [
  { key: 'happy', emoji: '😊' }, { key: 'excited', emoji: '🤩' }, { key: 'grateful', emoji: '🙏' }, { key: 'motivated', emoji: '💪' },
  { key: 'proud', emoji: '😎' }, { key: 'inspired', emoji: '✨' }, { key: 'relaxed', emoji: '😌' }, { key: 'loved', emoji: '🥰' },
  { key: 'curious', emoji: '🤔' }, { key: 'tired', emoji: '😴' }, { key: 'sad', emoji: '😢' }, { key: 'celebrating', emoji: '🎉' },
];
export const feelingEmoji = (key?: string | null) => FEELINGS.find((f) => f.key === key)?.emoji || '🙂';

export const card = 'rounded-xl border border-border bg-card shadow-sm';