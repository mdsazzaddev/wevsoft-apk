import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import type { DeveloperApp } from '../devApi';

/* ------------------------------------------------------------------ */
/* Console preferences (local only)                                    */
/* ------------------------------------------------------------------ */

export const CONSOLE_APP_KEY = 'wev-dev-console-app';
export const CONSOLE_THEME_KEY = 'wev-dev-console-theme';
export const CONSOLE_KEY_GENERATED = 'wev-dev-console-key-generated';
export const CONSOLE_VERSION = 'v1.0.0';

export function readLocal(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage disabled */
  }
}

/* ------------------------------------------------------------------ */
/* Real data: connected accounts + webhooks                            */
/* ------------------------------------------------------------------ */

export interface ConnectedPlatform {
  platform: string;
  environment?: string;
  isConnected: boolean;
  connection?: {
    id: string;
    platformUserId: string | null;
    needsReconnect: boolean;
    connectedAt: string;
  } | null;
}

/** Same endpoint the Settings → Connected Accounts panel uses. */
export function useConnectedPlatforms(enabled = true) {
  return useQuery<ConnectedPlatform[]>({
    queryKey: ['developerConsole', 'connectedAccounts'],
    queryFn: async () => {
      const data = (await api.get('/api/settings/connected-accounts')).data;
      return Array.isArray(data) ? data : [];
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export interface ConsoleWebhook {
  id: string;
  appId: string;
  endpointUrl: string;
  subscribedEvents: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Signing secret: only present in the create / rotate responses. */
  secret?: string;
  /** Masked form returned by the list endpoint. */
  secretMasked?: string;
}

export interface ConsoleDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  status: string;
  httpStatus: number | null;
  createdAt: string;
  eventId?: string;
  retryCount?: number;
  completedAt?: string | null;
  responseBody?: string | null;
  payload?: string;
}

/** Webhooks for every app + their latest deliveries (GET /api/developer/apps/:id/webhooks[/:wid/deliveries]). */
export function useConsoleWebhooks(apps: DeveloperApp[]) {
  const hookQueries = useQueries({
    queries: apps.map((a) => ({
      queryKey: ['developerConsole', 'webhooks', a.id],
      queryFn: async () => {
        const data = (await api.get(`/api/developer/apps/${a.id}/webhooks`)).data;
        return (Array.isArray(data) ? data : []) as ConsoleWebhook[];
      },
      staleTime: 60_000,
      retry: 0,
    })),
  });
  const webhooks = useMemo(
    () => hookQueries.flatMap((q) => q.data || []),
     
    // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
    [hookQueries.map((q) => q.dataUpdatedAt).join('|')],
  );
  const deliveryQueries = useQueries({
    queries: webhooks.slice(0, 25).map((w) => ({
      queryKey: ['developerConsole', 'deliveries', w.id],
      queryFn: async () => {
        const data = (await api.get(`/api/developer/apps/${w.appId}/webhooks/${w.id}/deliveries`)).data;
        return (Array.isArray(data) ? data : []) as ConsoleDelivery[];
      },
      staleTime: 60_000,
      retry: 0,
    })),
  });
  const deliveries = useMemo(
    () => deliveryQueries.flatMap((q) => q.data || []),
     
    // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
    [deliveryQueries.map((q) => q.dataUpdatedAt).join('|')],
  );
  const settled = deliveries.filter((d) => d.status === 'success' || d.status === 'failed' || d.status === 'dead');
  const success = settled.filter((d) => d.status === 'success').length;
  const health = settled.length ? Math.round((success / settled.length) * 1000) / 10 : null;
  return { webhooks, deliveries, health };
}

/* ------------------------------------------------------------------ */
/* Usage metering (GET /api/developer/apps/:id/usage, real log data)    */
/* ------------------------------------------------------------------ */

export interface AppUsage {
  period: string;
  totalRequests: number;
  quotaLimit: number;
  rateLimitPerMinute: number;
  quotaPercent: number;
  last7Days: { requests: number; failed: number; requestsDelta: number | null; failedDelta: number | null };
  avgLatencyMs: number | null;
  statusClasses: Record<string, number>;
  daily: { date: string; requests: number; errors: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  webhooks: { deliveries: number; delivered: number; healthPercent: number | null };
}

export function useAppUsage(appId: string | null | undefined) {
  return useQuery<AppUsage>({
    queryKey: ['developerConsole', 'usage', appId],
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/usage`)).data,
    enabled: !!appId,
    staleTime: 60_000,
  });
}

export interface ApiLogRow {
  id: string;
  appId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string;
  errorMessage: string | null;
  authType?: string | null;
  requestHeaders?: string | null;
  requestBody?: string | null;
  createdAt: string;
}

export function useAppLogs(appId: string | null | undefined, limit = 500) {
  return useQuery<{ logs: ApiLogRow[]; nextCursor: string | null }>({
    queryKey: ['developerConsole', 'logs', appId, limit],
    queryFn: async () => (await api.get(`/api/developer/apps/${appId}/logs?limit=${limit}`)).data,
    enabled: !!appId,
    staleTime: 30_000,
  });
}

/** Usage summed across every app the developer owns. */
export interface UsageTotals {
  loading: boolean;
  requests7: number;
  failed7: number;
  requestsDelta: number | null;
  failedDelta: number | null;
  monthRequests: number;
  quotaLimit: number;
  quotaPercent: number;
  webhookHealth: number | null;
  daily: { date: string; requests: number; errors: number }[];
}

export function useAllAppsUsage(apps: { id: string }[]): UsageTotals {
  const queries = useQueries({
    queries: apps.slice(0, 25).map((a) => ({
      queryKey: ['developerConsole', 'usage', a.id],
      queryFn: async () => (await api.get(`/api/developer/apps/${a.id}/usage`)).data as AppUsage,
      staleTime: 60_000,
      retry: 0,
    })),
  });
  // Cheap aggregation; recomputed per render (no memo needed).
  {
    // Ignore malformed/partial usage payloads instead of crashing the dashboard.
    const rows = queries.map((q) => q.data).filter((u): u is AppUsage => !!u && typeof u === 'object' && !!u.last7Days);
    const daily = new Map<string, { date: string; requests: number; errors: number }>();
    let requests7 = 0, failed7 = 0, prevReq = 0, prevFail = 0, month = 0, limit = 0, delivered = 0, deliveries = 0;
    for (const u of rows) {
      requests7 += u.last7Days.requests;
      failed7 += u.last7Days.failed;
      if (u.last7Days.requestsDelta !== null) prevReq += u.last7Days.requests / (1 + u.last7Days.requestsDelta / 100);
      if (u.last7Days.failedDelta !== null) prevFail += u.last7Days.failed / (1 + u.last7Days.failedDelta / 100);
      month += u.totalRequests || 0;
      limit += u.quotaLimit || 0;
      delivered += u.webhooks?.delivered || 0;
      deliveries += u.webhooks?.deliveries || 0;
      for (const d of Array.isArray(u.daily) ? u.daily : []) {
        const cur = daily.get(d.date) || { date: d.date, requests: 0, errors: 0 };
        cur.requests += d.requests;
        cur.errors += d.errors;
        daily.set(d.date, cur);
      }
    }
    const delta = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : null);
    return {
      loading: queries.some((q) => q.isLoading),
      requests7,
      failed7,
      requestsDelta: delta(requests7, prevReq),
      failedDelta: delta(failed7, prevFail),
      monthRequests: month,
      quotaLimit: limit,
      quotaPercent: limit ? Math.min(100, Math.round((month / limit) * 1000) / 10) : 0,
      webhookHealth: deliveries ? Math.round((delivered / deliveries) * 1000) / 10 : null,
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

export type UsageRange = 7 | 14 | 30;

export interface UsagePoint {
  label: string;
  successful: number;
  failed: number;
}

/** Chart series from real daily counts (zeros when there is no traffic). */
export function usageSeries(daily: { date: string; requests: number; errors: number }[], range: UsageRange): UsagePoint[] {
  return daily.slice(-range).map((d) => ({
    label: new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    successful: d.requests - d.errors,
    failed: d.errors,
  }));
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/* ------------------------------------------------------------------ */
/* App helpers                                                         */
/* ------------------------------------------------------------------ */

export function appTypeLabel(app: DeveloperApp, uris: string[]): string {
  if (uris.length && uris.every((u) => !/^https?:/i.test(u))) return 'Native Application';
  return 'Web Application';
}

export function appStatusMeta(app: DeveloperApp): { label: string; tone: 'green' | 'blue' | 'amber' } {
  if (app.status === 'live') return { label: 'Published', tone: 'green' };
  if (app.status === 'in_review') return { label: 'In Review', tone: 'amber' };
  return { label: 'Development', tone: 'blue' };
}

export function envLabel(app: DeveloperApp): string {
  return app.mode === 'production' ? 'Production' : 'Development';
}

export function lastUsedLabel(value: string | null | undefined): string {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Events the platform dispatches to app webhooks (see webhook.service dispatchWebhookEvent callers). */
/** `group` is used to section the event picker; events without one are listed under "Platform". */
export const WEBHOOK_EVENTS: { id: string; label: string; description: string; /** OAuth scope a user grant needs for this event (mirrors backend EVENT_SCOPES). */ scope: string; group?: string; live?: boolean }[] = [
  { id: 'post.created', label: 'post.created', scope: 'posts.read', description: 'A public post was published by a user who authorized your app' },
  { id: 'post.updated', label: 'post.updated', scope: 'posts.read', description: 'A public post was updated by a user who authorized your app' },
  { id: 'post.deleted', label: 'post.deleted', scope: 'posts.read', description: 'A public post was deleted by a user who authorized your app' },
  { id: 'comment.created', label: 'comment.created', scope: 'posts.read', description: 'A comment was added to a public post by an authorized user' },
  { id: 'reel.published', label: 'reel.published', scope: 'reels.read', description: 'A public short-form reel was published by an authorized user' },
  { id: 'group.post.created', label: 'group.post.created', scope: 'groups.read', description: 'A new post was created inside an authorized group community' },
  { id: 'order.paid', label: 'order.paid', scope: 'profile', description: 'An in-app checkout order was confirmed and paid' },
  { id: 'product.created', label: 'product.created', scope: 'marketplace.read', description: 'A marketplace product was listed by an authorized seller' },
  { id: 'product.updated', label: 'product.updated', scope: 'marketplace.read', description: 'A marketplace product listing was updated by an authorized seller' },
  { id: 'product.deleted', label: 'product.deleted', scope: 'marketplace.read', description: 'A marketplace product listing was removed by an authorized seller' },
  { id: 'order.status_changed', label: 'order.status_changed', scope: 'marketplace.read', description: 'A marketplace order\'s fulfilment status changed' },
  { id: 'event.created', label: 'event.created', scope: 'events.read', description: 'An authorized user organized a new personal event' },
  { id: 'event.updated', label: 'event.updated', scope: 'events.read', description: 'An authorized organizer edited their event' },
  { id: 'event.deleted', label: 'event.deleted', scope: 'events.read', description: 'An authorized organizer removed their event' },
  { id: 'event.rsvp', label: 'event.rsvp', scope: 'events.read', description: 'Someone answered an RSVP on an authorized organizer\'s event' },
  { id: 'livestream.started', label: 'livestream.started', scope: 'livestream.read', description: 'An authorized broadcaster went live' },
  { id: 'livestream.ended', label: 'livestream.ended', scope: 'livestream.read', description: 'An authorized broadcaster ended a live stream' },
  { id: 'livestream.comment', label: 'livestream.comment', scope: 'livestream.read', description: 'A viewer posted a comment in an authorized broadcaster\'s live chat' },
  // WevChat (Messenger-style). All need messages.read; delivered only for conversations of the authorizing account.
  { id: 'message.received', label: 'message.received', scope: 'messages.read', group: 'WevChat', live: true, description: 'Someone sent the authorized user a WevChat message' },
  { id: 'message.echo', label: 'message.echo', scope: 'messages.read', group: 'WevChat', live: true, description: 'Your app sent a message for the user via the API (messages.write). Only your app gets it; WevChat UI messages have no echo' },
  { id: 'message.read', label: 'message.read', scope: 'messages.read', group: 'WevChat', live: true, description: 'The other person read the conversation up to a watermark time' },
  { id: 'message.reaction', label: 'message.reaction', scope: 'messages.read', group: 'WevChat', live: true, description: 'Another member added or removed an emoji reaction on a message' },
  { id: 'message.edited', label: 'message.edited', scope: 'messages.read', group: 'WevChat', live: true, description: 'Another member edited the text of a message they sent. Includes the new text and, when known, the previous text.' },
  { id: 'message.deleted', label: 'message.deleted', scope: 'messages.read', group: 'WevChat', live: true, description: 'Another member unsent a message (deleted for everyone). "Delete for me" never fires it.' },
  { id: 'message.pinned', label: 'message.pinned', scope: 'messages.read', group: 'WevChat', live: true, description: 'Another member pinned a message in the conversation.' },
  { id: 'message.unpinned', label: 'message.unpinned', scope: 'messages.read', group: 'WevChat', live: true, description: 'Another member unpinned a message in the conversation.' },
  { id: 'conversation.created', label: 'conversation.created', scope: 'messages.read', group: 'WevChat', live: true, description: 'A new direct or group conversation including the user was created' },
  { id: 'message.delivered', label: 'message.delivered', scope: 'messages.read', group: 'WevChat', live: false, description: 'Messages reached the recipient. Coming soon: WevChat has no delivery receipts yet' },
  { id: 'message.postback', label: 'message.postback', scope: 'messages.read', group: 'WevChat', live: false, description: 'A user tapped a button or quick reply. Coming soon: WevChat has no buttons yet' },
  { id: 'messaging.optin', label: 'messaging.optin', scope: 'messages.read', group: 'WevChat', live: false, description: 'A user opted in to receive messages from you. Coming soon' },
  { id: 'messaging.referral', label: 'messaging.referral', scope: 'messages.read', group: 'WevChat', live: true, description: 'A customer opened a new chat with a Space your app manages (source: space)' },
  { id: 'conversation.handover', label: 'conversation.handover', scope: 'messages.read', group: 'WevChat', live: false, description: 'Thread control moved between apps or to a human agent. Coming soon' },
  { id: 'messaging.policy_enforcement', label: 'messaging.policy_enforcement', scope: 'messages.read', group: 'WevChat', live: true, description: 'Wevsoft suspended (block) or reinstated (unblock) your app for platform policy' },
  { id: 'account.linking', label: 'account.linking', scope: 'messages.read', group: 'WevChat', live: false, description: 'A user linked or unlinked their account on your service. Coming soon' },
];

export interface DeveloperMeteringSummary {
  month: string;
  totalRequests: number;
  quotaLimit: number;
  quotaUsedPercent: number;
  remainingRequests: number;
  daysRemainingInMonth: number;
  resetDate: string;
  avgLatencyMs: number;
  statusClasses: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  daily: { date: string; requests: number; errors: number; avgLatencyMs: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  appsBreakdown: {
    appId: string;
    appName: string;
    mode: string;
    status: string;
    quotaLimit: number;
    requests: number;
    errors: number;
    errorRate: number;
  }[];
}

export function useDeveloperMeteringSummary(enabled = true) {
  return useQuery<DeveloperMeteringSummary>({
    queryKey: ['developerConsole', 'meteringSummary'],
    queryFn: async () => {
      const res = await api.get('/api/developer/usage/summary');
      return res.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

/** Hard limits enforced by backend/src/server/modules/developer/*.routes.ts. */
export const PLATFORM_LIMITS = {
  webhooksPerApp: 5,
  redirectUrisPerApp: 20,
  deliveriesShown: 50,
  mediaUploadMb: 100,
  appNameMax: 80,
};
