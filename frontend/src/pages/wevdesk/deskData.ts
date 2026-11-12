/** Real-data queries for WevDesk tiles. Each is permission-gated and never throws into the UI. */

import { useQuery } from '@tanstack/react-query';
import {
  fetchInboxThreads,
  fetchInsights,
  fetchMonetization,
  fetchSpaceContent,
  fetchSpaceReviews,
  fetchTeam,
} from '../../lib/wevspaceManageApi';
import { fetchOfferings } from '../../lib/wevspaceApi';
import { useDesk } from './deskContext';

const opts = { retry: false, staleTime: 60_000, refetchOnWindowFocus: false } as const;

export function useDeskData() {
  const { spaceId, can } = useDesk();
  const canInsights = can('analytics.view');
  const canInbox = can('messages.read');
  const canMoney = can('monetization.view');

  const insights = useQuery({ queryKey: ['wevdesk', spaceId, 'insights'], queryFn: () => fetchInsights(spaceId, { range: '28d' }), enabled: canInsights, ...opts });
  const content = useQuery({ queryKey: ['wevdesk', spaceId, 'content'], queryFn: () => fetchSpaceContent(spaceId, { status: 'all', limit: 50 }), ...opts });
  const inbox = useQuery({ queryKey: ['wevdesk', spaceId, 'inbox'], queryFn: () => fetchInboxThreads(spaceId, { folder: 'inbox', limit: 3 }), enabled: canInbox, ...opts });
  const offerings = useQuery({ queryKey: ['wevdesk', spaceId, 'offerings'], queryFn: () => fetchOfferings(spaceId), ...opts });
  const team = useQuery({ queryKey: ['wevdesk', spaceId, 'team'], queryFn: () => fetchTeam(spaceId), ...opts });
  const money = useQuery({ queryKey: ['wevdesk', spaceId, 'money'], queryFn: () => fetchMonetization(spaceId), enabled: canMoney, ...opts });
  const reviews = useQuery({ queryKey: ['wevdesk', spaceId, 'reviews'], queryFn: () => fetchSpaceReviews(spaceId, { limit: 1 }), ...opts });

  return { insights, content, inbox, offerings, team, money, reviews, canInsights, canInbox, canMoney };
}

export const DAY_MS = 86_400_000;

/** Monday 00:00 of the current week. */
export function weekStart(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS);
}

export interface CalendarItem {
  id: string;
  label: string;
  status: string;
  text: string;
  at: string;
}

/** Places this week's Space posts on Mon..Sun: scheduled by their slot, drafts/published by creation day. */
export function weekCalendar(posts: any[] | undefined, from: Date = weekStart()): CalendarItem[][] {
  const start = from.getTime();
  const days: CalendarItem[][] = Array.from({ length: 7 }, () => []);
  for (const p of posts || []) {
    const when = p.status === 'scheduled' && p.scheduledFor ? p.scheduledFor : p.createdAt;
    const t = new Date(when).getTime();
    if (!Number.isFinite(t) || t < start || t >= start + 7 * DAY_MS) continue;
    const idx = Math.floor((t - start) / DAY_MS);
    const kind = String(p.type || '').toLowerCase() === 'reel' ? 'Reel' : 'Post';
    const status = p.status === 'scheduled' ? 'Scheduled' : p.status === 'draft' ? 'Draft' : 'Published';
    days[idx].push({ id: p.id, label: `${kind} · ${status}`, status: p.status, text: String(p.content || '').slice(0, 80), at: when });
  }
  return days;
}

export function money(amount: number | null | undefined, currency?: string): string {
  const n = Number(amount) || 0;
  const c = (currency || 'BDT').toUpperCase();
  if (c === 'BDT') return `৳${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)}`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${c} ${n}`;
  }
}
