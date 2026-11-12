import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Check, ChevronDown, Clock, Code, Copy, Info, Loader2,
  Play, RefreshCw, Send, ShieldCheck, Sparkles, Webhook, X
} from 'lucide-react';
import api from '../../../../lib/api';
import { DEV_KEYS, type DeveloperApp } from '../../devApi';
import { cx } from '../../devUi';
import { WEBHOOK_EVENTS, type ConsoleDelivery, type ConsoleWebhook } from '../consoleData';
import { btn, fmtDate, inputCls, parseJsonList } from '../ui';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** OAuth scope an event needs (dedicated `scope` field on WEBHOOK_EVENTS). */
export function eventScope(eventId: string): string | null {
  return WEBHOOK_EVENTS.find((e) => e.id === eventId)?.scope || null;
}

/** Stored scope list without corrupted entries such as ["null"]. */
function cleanScopes(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : parseJsonList(typeof raw === 'string' ? raw : '[]');
  return list.map((s: unknown) => String(s).trim()).filter((s: string) => s && s !== 'null' && s !== 'undefined');
}

/** Scopes the app has requested or been approved for. `profile` is always available. */
function appScopes(app?: DeveloperApp | null): Set<string> {
  const out = new Set<string>(['profile']);
  for (const key of ['requestedScopes', 'approvedScopes'] as const) {
    cleanScopes((app as any)?.[key]).forEach((s) => out.add(s));
  }
  return out;
}

const ALL_IDS = WEBHOOK_EVENTS.map((e) => e.id);
const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.message || fallback;

/** Accessible on/off switch (role=switch). */
export function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue)]/40',
        checked ? 'bg-[var(--dc-blue)] border-[var(--dc-blue)]' : 'bg-[var(--dc-hover)] border-[var(--dc-border)]',
        disabled && 'opacity-45 cursor-not-allowed',
      )}
    >
      <span className={cx('inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-150', checked ? 'translate-x-[18px]' : 'translate-x-[2px]')} />
    </button>
  );
}

/** (i) icon with a native + accessible tooltip. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span tabIndex={0} title={text} aria-label={text} className="inline-grid place-items-center align-middle text-[var(--dc-faint)] hover:text-[var(--dc-text-2)] focus:text-[var(--dc-text-2)] outline-none cursor-help">
      <Info size={12} />
    </span>
  );
}

export function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center">
        <Webhook size={15} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-[var(--dc-text)]">{n}. {title}</h3>
        <p className="text-[12px] text-[var(--dc-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

/** Dated API versions from GET /api/developer/versions (falls back to the current one). */
export function useApiVersions() {
  return useQuery<{ latest: string; versions: { id: string; label: string }[] }>({
    queryKey: ['developerConsole', 'apiVersions'],
    queryFn: async () => (await api.get('/api/developer/versions')).data,
    staleTime: 10 * 60_000,
    retry: 0,
  });
}

/* ------------------------------------------------------------------ */
/* Step 1: Configure webhooks                                          */
/* ------------------------------------------------------------------ */

export function ConfigureWebhookCard({
  app,
  webhook,
  canAdd,
  onSaved,
  onRemove,
}: {
  app: DeveloperApp;
  /** Existing endpoint to re-verify, or null to create a new one. */
  webhook: ConsoleWebhook | null;
  canAdd: boolean;
  onSaved: (w: ConsoleWebhook & { secret?: string }) => void;
  onRemove: (w: ConsoleWebhook) => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(webhook?.endpointUrl || '');
  const [token, setToken] = useState('');
  const [clientCert, setClientCert] = useState(Boolean((webhook as any)?.clientCertEnabled));
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setUrl(webhook?.endpointUrl || '');
    setToken('');
    setClientCert(Boolean((webhook as any)?.clientCertEnabled));
    setError(null);
  }, [webhook?.id]);

  const trimmed = url.trim();
  const urlError = !trimmed
    ? null
    : !/^https?:\/\//i.test(trimmed)
      ? 'Enter a full URL starting with https://'
      : /^http:\/\//i.test(trimmed) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(trimmed)
        ? 'Use https (http is only allowed for localhost while developing)'
        : null;
  const tokenError = token && /\s/.test(token) ? 'No spaces allowed' : token.length > 200 ? 'Max 200 characters' : null;
  const valid = Boolean(trimmed) && !urlError && Boolean(token.trim()) && !tokenError && (webhook ? true : canAdd);

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/api/developer/apps/${app.id}/webhooks/verify-and-save`, {
          callbackUrl: trimmed,
          verifyToken: token.trim(),
          webhookId: webhook?.id,
          clientCertEnabled: clientCert,
          ...(webhook ? {} : { subscribedEvents: [] }),
        })
      ).data,
    onSuccess: (w: any) => {
      setError(null);
      setToken('');
      toast.success(`Verified (HTTP ${w?.verification?.status ?? 200}, ${w?.verification?.latencyMs ?? '?'} ms) and saved.`);
      if (w?.warning) toast(w.warning, { icon: '!' });
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'webhooks', app.id] });
      onSaved(w);
    },
    onError: (e: any) => {
      const m = errMsg(e, 'Verification failed');
      setError(m);
      toast.error(m);
    },
  });

  const deliveries = useQuery<ConsoleDelivery[]>({
    queryKey: ['developerConsole', 'deliveries', webhook?.id],
    queryFn: async () => {
      const data = (await api.get(`/api/developer/apps/${webhook!.appId}/webhooks/${webhook!.id}/deliveries`)).data;
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(webhook) && showErrors,
  });
  const recentErrors = (deliveries.data || []).filter((d) => d.status === 'failed' || d.status === 'dead' || (d.httpStatus != null && (d.httpStatus < 200 || d.httpStatus >= 300))).slice(0, 10);
  const verified = (webhook as any)?.verificationState === 'verified';

  return (
    <section className="dc-card p-[16px] sm:p-[20px] space-y-4">
      <StepHeader
        n={1}
        title="Configure webhooks"
        subtitle={<>Configure a custom webhook URL or use services that help you set up an endpoint. <Link to="/developer/docs#webhooks" className="text-[var(--dc-blue)] hover:underline">Learn more.</Link></>}
      />
      {webhook && (
        <p className="text-[11.5px] text-[var(--dc-muted)]">
          Status:{' '}
          <span className={verified ? 'text-[#16a34a] font-semibold' : 'text-[var(--dc-amber,#d97706)] font-semibold'}>{verified ? 'Verified' : (webhook as any)?.verificationState === 'failed' ? 'Verification failed' : 'Not verified'}</span>
          {(webhook as any)?.verifiedAt && <> on {fmtDate((webhook as any).verifiedAt)}</>}. Re-enter the verify token to change the URL or re-verify.
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label htmlFor="wh-callback" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--dc-text-2)] mb-[5px]">
            Callback URL <InfoTip text="Wevsoft sends a GET verification request here, then POSTs signed event notifications. Must be https (http://localhost is allowed while developing)." />
          </label>
          <input id="wh-callback" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourapp.com/webhooks/wevsoft" className={cx(inputCls, 'w-full')} inputMode="url" autoComplete="off" />
          {urlError && <p className="mt-1 text-[11px] text-[var(--dc-red)]">{urlError}</p>}
        </div>
        <div>
          <label htmlFor="wh-token" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--dc-text-2)] mb-[5px]">
            Verify token <InfoTip text="Any string you choose. We send it as hub.verify_token so your endpoint can check the request came from us. Stored hashed; we never show it again." />
          </label>
          <input id="wh-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder={(webhook as any)?.hasVerifyToken ? 'Saved (enter it again to re-verify)' : 'e.g. my-secret-verify-token'} className={cx(inputCls, 'w-full')} autoComplete="off" spellCheck={false} />
          {tokenError && <p className="mt-1 text-[11px] text-[var(--dc-red)]">{tokenError}</p>}
        </div>
        <div className="flex items-start gap-3">
          <Switch checked={clientCert} onChange={setClientCert} label="Attach a client certificate to Webhook requests" />
          <div className="text-[12px] text-[var(--dc-text-2)]">
            Attach a client certificate to Webhook requests. <Link to="/developer/docs#request-signing" className="text-[var(--dc-blue)] hover:underline">Learn more.</Link>
            <p className="text-[10.5px] text-[var(--dc-faint)]">Coming soon: the setting is saved, but deliveries are not sent with a client certificate yet.</p>
          </div>
        </div>
      </div>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-[var(--dc-red)]/30 bg-[var(--dc-red-soft)] px-3 py-2 text-[12px] text-[var(--dc-red)]">
          <AlertTriangle size={14} className="mt-[1px] shrink-0" /> <span>{error}</span>
        </div>
      )}
      {!webhook && !canAdd && <p className="text-[11px] text-[var(--dc-red)]">This app already has the maximum number of webhook endpoints.</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {webhook && (
          <button type="button" onClick={() => onRemove(webhook)} className={btn.secondary}>
            Remove subscription
          </button>
        )}
        <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className={btn.primary}>
          {save.isPending && <Loader2 size={14} className="animate-spin" />} Verify and save
        </button>
      </div>
      {webhook && (
        <div className="border-t border-[var(--dc-border)] pt-3">
          <button type="button" onClick={() => setShowErrors((v) => !v)} aria-expanded={showErrors} className={cx(btn.secondary, btn.sm)}>
            <ChevronDown size={13} className={cx('transition-transform', showErrors && 'rotate-180')} /> Show Recent Errors
          </button>
          {showErrors && (
            <div className="mt-2">
              {deliveries.isLoading ? (
                <p className="text-[12px] text-[var(--dc-muted)]">Loading...</p>
              ) : recentErrors.length === 0 ? (
                <p className="text-[12px] text-[var(--dc-muted)]">No failed deliveries recently.</p>
              ) : (
                <ul className="divide-y divide-[var(--dc-border)] rounded-[8px] border border-[var(--dc-border)]">
                  {recentErrors.map((d) => (
                    <li key={d.id} className="px-3 py-2 text-[11.5px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="dc-code font-semibold">{d.eventType}</code>
                        <span className="text-[var(--dc-red)]">{d.httpStatus ? `HTTP ${d.httpStatus}` : 'No response'}</span>
                        <span className="text-[var(--dc-faint)]">{fmtDate(d.createdAt)}</span>
                        <span className="text-[var(--dc-faint)]">{d.status}{d.retryCount ? `, ${d.retryCount} retries` : ''}</span>
                      </div>
                      {d.responseBody && <p className="mt-0.5 truncate text-[var(--dc-muted)]" title={d.responseBody}>{d.responseBody}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: Webhook fields table                                        */
/* ------------------------------------------------------------------ */

/**
 * Facebook-style "Webhook fields" table: Field | Version | Test | Subscribe.
 * Subscribe saves immediately via PUT .../webhooks/:webhookId { subscribedEvents } (optimistic, rolled back on error).
 * Version is per endpoint (apiVersion); the backend has no per-field version, so every row shows the endpoint's version.
 * A legacy "*" subscription is shown as everything on and expanded into an explicit list on the first change.
 */
export function WebhookFieldsPanel({ webhook, app }: { webhook: ConsoleWebhook; app?: DeveloperApp | null }) {
  const queryClient = useQueryClient();
  const key = ['developerConsole', 'webhooks', webhook.appId];
  const stored = parseJsonList(webhook.subscribedEvents as any);
  const wildcard = stored.includes('*');
  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  const on = useMemo(() => new Set(wildcard ? ALL_IDS : stored), [wildcard, stored.join('|')]);
  /** Scopes added from this panel, so switches enable immediately (optimistic). */
  const [added, setAdded] = useState<string[]>([]);
  const scopes = useMemo(() => {
    const s = appScopes(app);
    added.forEach((x) => s.add(x));
    return s;
  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  }, [app, added.join('|')]);
  // Sensitive-scope catalog + approvals (existing Permissions & Review endpoint).
  const review = useQuery({
    queryKey: ['developerConsole', 'scopeReviews', webhook.appId],
    queryFn: async () => (await api.get(`/api/developer/platform/apps/${webhook.appId}/scope-reviews`)).data as { catalog?: { scope: string; sensitive: boolean }[]; approved?: string[]; reviews?: { scope: string; status: string }[] },
    retry: false,
    staleTime: 60_000,
  });
  const isProduction = (app as any)?.mode === 'production';
  /** 'review' = sensitive scope that production tokens can't use until its scope review is approved. */
  const reviewState = (sc: string): 'ok' | 'review' | 'pending' => {
    const d = review.data;
    if (!d || !isProduction) return 'ok';
    const sensitive = (d.catalog || []).some((c) => c.scope === sc && c.sensitive);
    if (!sensitive || (d.approved || []).includes(sc)) return 'ok';
    return (d.reviews || []).some((r) => r.scope === sc && r.status === 'pending') ? 'pending' : 'review';
  };
  const addScopes = useMutation({
    mutationFn: async (list: string[]) => {
      const next = Array.from(new Set([...cleanScopes((app as any)?.requestedScopes), ...list]));
      return (await api.put(`/api/developer/apps/${webhook.appId}`, { requestedScopes: next })).data;
    },
    onMutate: (list: string[]) => {
      setAdded((a) => Array.from(new Set([...a, ...list])));
      const prev = queryClient.getQueryData<DeveloperApp[]>(DEV_KEYS.apps);
      queryClient.setQueryData<DeveloperApp[]>(DEV_KEYS.apps, (apps) =>
        (apps || []).map((a) => (a.id === webhook.appId ? ({ ...a, requestedScopes: JSON.stringify(Array.from(new Set([...cleanScopes((a as any).requestedScopes), ...list]))) } as DeveloperApp) : a)),
      );
      return { prev };
    },
    onSuccess: (_d, list) => toast.success(`Added ${list.join(', ')} to the app's requested scopes`),
    onError: (e: any, list, ctx) => {
      setAdded((a) => a.filter((x) => !list.includes(x)));
      if (ctx?.prev) queryClient.setQueryData(DEV_KEYS.apps, ctx.prev);
      toast.error(errMsg(e, 'Could not add the scope'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'scopeReviews', webhook.appId] });
    },
  });
  const groups = useMemo(() => Array.from(new Set(WEBHOOK_EVENTS.map((e) => e.group || 'Platform'))), []);
  const versions = useApiVersions();
  const versionList = versions.data?.versions?.length ? versions.data.versions : [{ id: versions.data?.latest || 'current', label: 'Current' }];
  const currentVersion = (webhook as any).apiVersion || versions.data?.latest || versionList[versionList.length - 1].id;

  const patchCache = (patch: Partial<ConsoleWebhook> & Record<string, unknown>) =>
    queryClient.setQueryData<ConsoleWebhook[]>(key, (list) => (list || []).map((w) => (w.id === webhook.id ? { ...w, ...patch } : w)));

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.put(`/api/developer/apps/${webhook.appId}/webhooks/${webhook.id}`, body)).data,
    onMutate: async (body: Record<string, unknown>) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ConsoleWebhook[]>(key);
      patchCache(body.subscribedEvents ? { subscribedEvents: JSON.stringify(body.subscribedEvents) } : (body as any));
      return { prev };
    },
    onSuccess: (d: any) => {
      if (d?.warning) toast(d.warning, { icon: '!' });
    },
    onError: (e: any, _b, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
      toast.error(errMsg(e, 'Could not update webhook fields'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const [selectedEvent, setSelectedEvent] = useState<(typeof WEBHOOK_EVENTS)[0] | null>(null);
  const [testPayloadText, setTestPayloadText] = useState<string>('');
  const [testResult, setTestResult] = useState<{ delivery: ConsoleDelivery | null; latencyMs?: number } | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const getSampleForEvent = (evId: string) => {
    const sampleData: Record<string, any> = {
      'post.created': { id: 'post_sample_101', userId: 'usr_creator_88', content: 'Simulated post update for webhook testing', privacy: 'public', type: 'text', mediaUrls: [] },
      'post.updated': { id: 'post_sample_101', content: 'Updated content body', privacy: 'public', updatedAt: new Date().toISOString() },
      'post.deleted': { id: 'post_sample_101', deletedAt: new Date().toISOString() },
      'comment.created': { id: 'cmt_sample_202', postId: 'post_sample_101', text: 'This is a test comment event', author: { id: 'usr_fan_12', name: 'Dev Tester' } },
      'reel.published': { id: 'reel_sample_303', caption: 'Short video test reel', durationSeconds: 15 },
      'group.post.created': { id: 'grp_post_404', groupId: 'grp_builders_01', content: 'Community post update' },
      'order.paid': { id: 'ord_sample_505', amount: 3500, currency: 'BDT', customerEmail: 'buyer@example.com', status: 'paid' },
      'product.created': { id: 'prod_sample_606', title: 'Premium Widget Pro', price: 1200, currency: 'BDT', stock: 10 },
      'product.updated': { id: 'prod_sample_606', title: 'Premium Widget Pro v2', price: 1500, currency: 'BDT' },
      'product.deleted': { id: 'prod_sample_606', deletedAt: new Date().toISOString() },
      'order.status_changed': { id: 'ord_sample_505', status: 'shipped', trackingNumber: 'TRK-987654' },
      // eslint-disable-next-line react-hooks/purity -- sample payload timestamp (existing behavior)
      'event.created': { id: 'evt_sample_111', title: 'Developer Community Meetup', startsAt: new Date(Date.now() + 86400000).toISOString() },
      'event.updated': { id: 'evt_sample_111', title: 'Developer Community Meetup (Rescheduled)' },
      'event.deleted': { id: 'evt_sample_111', deletedAt: new Date().toISOString() },
      'event.rsvp': { eventId: 'evt_sample_111', userId: 'usr_guest_44', status: 'going' },
      'livestream.started': { id: 'live_sample_222', title: 'Product Launch Keynote Stream', broadcasterId: 'usr_streamer' },
      'livestream.ended': { id: 'live_sample_222', durationMinutes: 45, peakViewers: 320 },
      'livestream.comment': { streamId: 'live_sample_222', message: 'Excited for this launch!', senderId: 'usr_fan_12' },
      'message.received': { id: 'msg_sample_707', conversationId: 'conv_wev_808', senderId: 'usr_guest_99', text: 'Hello from customer inquiry' },
      'message.echo': { id: 'msg_echo_909', conversationId: 'conv_wev_808', text: 'Automated bot response echo', isEcho: true },
      // eslint-disable-next-line react-hooks/purity -- sample payload timestamp (existing behavior)
      'message.read': { conversationId: 'conv_wev_808', watermarkTimestamp: Date.now() },
      'message.reaction': { messageId: 'msg_sample_707', reaction: '❤️', action: 'add', userId: 'usr_guest_99' },
      'message.edited': { messageId: 'msg_sample_707', newText: 'Edited message text', previousText: 'Original text' },
      'message.deleted': { messageId: 'msg_sample_707', deletedAt: new Date().toISOString() },
      'message.pinned': { messageId: 'msg_sample_707', pinnedBy: 'usr_guest_99' },
      'message.unpinned': { messageId: 'msg_sample_707', unpinnedBy: 'usr_guest_99' },
      'conversation.created': { conversationId: 'conv_wev_808', participants: ['usr_guest_99', 'usr_owner_01'] },
    };
    return JSON.stringify({
      // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
      id: 'evt_' + Math.random().toString(36).substring(2, 10),
      type: evId,
      test: true,
      createdAt: new Date().toISOString(),
      data: sampleData[evId] || { message: `Simulated event for ${evId}` },
    }, null, 2);
  };

  const openTestModal = (ev: (typeof WEBHOOK_EVENTS)[0]) => {
    setSelectedEvent(ev);
    setTestPayloadText(getSampleForEvent(ev.id));
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const test = useMutation({
    mutationFn: async (event: string) => (await api.post(`/api/developer/apps/${webhook.appId}/webhooks/${webhook.id}/test`, { event })).data as { delivery: ConsoleDelivery | null; latencyMs?: number },
    onSuccess: (d, event) => {
      setTestResult(d);
      const ms = d.latencyMs != null ? `, ${d.latencyMs} ms` : '';
      if (d.delivery?.status === 'success') toast.success(`${event}: delivered (HTTP ${d.delivery.httpStatus}${ms})`);
      else toast.error(`${event}: failed (${d.delivery?.httpStatus ? `HTTP ${d.delivery.httpStatus}` : 'no response'}${ms})`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'deliveries', webhook.id] });
    },
    onError: (e: any) => toast.error(errMsg(e, 'Could not send the test')),
  });

  const allowed = (id: string) => {
    const sc = eventScope(id);
    return !sc || scopes.has(sc);
  };
  const commit = (next: Set<string>) => save.mutate({ subscribedEvents: ALL_IDS.filter((id) => next.has(id)) });
  const setOne = (id: string, v: boolean) => {
    const next = new Set(on);
    if (v) next.add(id);
    else next.delete(id);
    commit(next);
  };
  const setGroup = (group: string, v: boolean) => {
    const next = new Set(on);
    for (const e of WEBHOOK_EVENTS) if ((e.group || 'Platform') === group && allowed(e.id)) { if (v) next.add(e.id); else next.delete(e.id); }
    commit(next);
  };

  return (
    <section className="dc-card p-[16px] sm:p-[20px] space-y-3">
      <StepHeader n={3} title="Webhook fields" subtitle={<>Subscribe to the fields you want. Only subscribed fields are sent to <span className="dc-code break-all">{webhook.endpointUrl}</span>.</>} />
      <div className="overflow-hidden rounded-[10px] border border-[var(--dc-border)]">
        <div role="row" className="hidden md:grid grid-cols-[minmax(0,1fr)_130px_70px_170px] gap-3 px-3 py-2 bg-[var(--dc-hover)] text-[11px] font-semibold text-[var(--dc-text-2)]">
          <span role="columnheader">Field</span>
          <span role="columnheader" className="flex items-center gap-1">Version <InfoTip text="Payload API version for this endpoint. It applies to every field of this endpoint." /></span>
          <span role="columnheader">Test</span>
          <span role="columnheader">Subscribe</span>
        </div>
        <div role="table" aria-label="Webhook fields">
          {groups.map((group) => {
            const items = WEBHOOK_EVENTS.filter((e) => (e.group || 'Platform') === group);
            const onCount = items.filter((e) => on.has(e.id)).length;
            const allOn = items.filter((e) => allowed(e.id)).every((e) => on.has(e.id));
            const blocked = items.filter((e) => !allowed(e.id)).length;
            const missing = Array.from(new Set(items.filter((e) => !allowed(e.id)).map((e) => e.scope)));
            return (
              <div role="rowgroup" key={group}>
                <div className="flex items-center justify-between gap-2 border-t border-[var(--dc-border)] bg-[var(--dc-side)] px-3 py-[6px]">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dc-faint)]">
                    {group} <span className="normal-case tracking-normal font-medium">({onCount}/{items.length} subscribed)</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-3">
                    {missing.length > 0 && blocked > 1 && (
                      <button type="button" disabled={addScopes.isPending} onClick={() => addScopes.mutate(missing)} className="text-[11px] font-medium text-[var(--dc-blue)] hover:underline disabled:opacity-50">
                        Add all required scopes ({missing.join(', ')})
                      </button>
                    )}
                    <button type="button" disabled={save.isPending} onClick={() => setGroup(group, !allOn)} className="text-[11px] font-medium text-[var(--dc-blue)] hover:underline disabled:opacity-50">
                      {allOn ? 'Turn all off' : 'Turn all on'}
                    </button>
                  </span>
                </div>
                {items.map((ev) => {
                  const sc = ev.scope;
                  const rs = sc ? reviewState(sc) : 'ok';
                  const ok = allowed(ev.id);
                  const isOn = on.has(ev.id);
                  const desc = ev.description;
                  return (
                    <div
                      role="row"
                      key={ev.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_130px_70px_170px] items-center gap-x-3 gap-y-2 border-t border-[var(--dc-border)] px-3 py-[9px] transition-colors hover:bg-[var(--dc-hover)]"
                    >
                      <div role="cell" className="min-w-0 col-span-2 md:col-span-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/developer/webhook-schemas#${ev.id}`} className="text-[12.5px] font-semibold text-[var(--dc-blue)] hover:underline">{ev.label}</Link>
                          {sc && <span className="rounded bg-[var(--dc-hover)] px-1 py-px text-[9.5px] text-[var(--dc-muted)]">{sc}</span>}
                          {ev.live === false && <span className="rounded bg-[var(--dc-amber-soft,var(--dc-hover))] px-1 py-px text-[9.5px] font-medium text-[var(--dc-amber,var(--dc-muted))]">coming soon</span>}
                        </div>
                        <p className="text-[10.5px] text-[var(--dc-muted)]">{desc}</p>
                        {ev.live === false && isOn && <p className="text-[10px] text-[var(--dc-faint)]">Subscribed, but it won't fire until WevChat supports it.</p>}
                        {!ok && (
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--dc-amber,var(--dc-muted))]">
                            <span>Requires <span className="dc-code">{sc}</span></span>
                            <button type="button" disabled={addScopes.isPending} onClick={() => sc && addScopes.mutate([sc])} className={cx(btn.secondary, btn.sm)}>
                              {addScopes.isPending && addScopes.variables?.includes(sc || '') ? 'Adding...' : 'Add scope'}
                            </button>
                          </p>
                        )}
                        {ok && rs !== 'ok' && (
                          <p className="mt-1 text-[11px] text-[var(--dc-muted)]">
                            {rs === 'pending' ? <>Review pending for <span className="dc-code">{sc}</span>; production users can't grant it yet.</> : <><span className="dc-code">{sc}</span> needs review before production users can grant it. <Link to="/developer/permissions" className="text-[var(--dc-blue)] hover:underline">Request review</Link></>}
                          </p>
                        )}
                      </div>
                      <div role="cell">
                        <select
                          aria-label={`${ev.label} version`}
                          value={currentVersion}
                          disabled={save.isPending}
                          onChange={(e) => save.mutate({ apiVersion: e.target.value })}
                          className="h-[28px] w-full max-w-[130px] rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-card)] px-2 text-[11.5px] text-[var(--dc-text)]"
                        >
                          {versionList.map((v) => (
                            <option key={v.id} value={v.id}>{v.id}{v.label ? ` (${v.label})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div role="cell">
                        <button
                          type="button"
                          disabled={test.isPending || (webhook as any).isActive === false}
                          onClick={() => openTestModal(ev)}
                          className="flex items-center gap-1 text-[12px] font-medium text-[var(--dc-blue)] hover:underline disabled:opacity-50"
                        >
                          <Play size={11} className="fill-current" />
                          {test.isPending && test.variables === ev.id ? 'Sending...' : 'Test'}
                        </button>
                      </div>
                      <div role="cell" className="flex items-center gap-2">
                        <Switch checked={isOn} disabled={(!ok && !isOn) || save.isPending} onChange={(v) => setOne(ev.id, v)} label={`Subscribe to ${ev.label}`} />
                        <span className={cx('text-[12px]', isOn ? 'text-[var(--dc-text)] font-medium' : 'text-[var(--dc-muted)]')}>{isOn ? 'Subscribed' : 'Unsubscribed'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Webhook Event Modal (Meta Parity) */}
      {isTestModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl dc-card overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--dc-border)]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] flex items-center justify-center shrink-0">
                  <Webhook size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-[var(--dc-text)] truncate">
                    Test Webhook Event: <code className="dc-code font-bold text-[var(--dc-blue)]">{selectedEvent.label}</code>
                  </h3>
                  <p className="text-[11.5px] text-[var(--dc-muted)] truncate">{selectedEvent.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 rounded-[6px] text-[var(--dc-muted)] hover:bg-[var(--dc-hover)] shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Destination Specs */}
              <div className="p-3 rounded-[8px] bg-[var(--dc-side)] border border-[var(--dc-border)] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11.5px]">
                  <span className="text-[var(--dc-muted)] font-medium">Target Callback URL:</span>
                  <code className="dc-code break-all font-semibold text-[var(--dc-text)]">{webhook.endpointUrl}</code>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11.5px]">
                  <span className="text-[var(--dc-muted)] font-medium">Payload API Version:</span>
                  <span className="font-mono text-[var(--dc-text)] font-semibold">{currentVersion}</span>
                </div>
                <div className="pt-2 border-t border-[var(--dc-border)]">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dc-faint)] block mb-1">
                    Simulated Delivery Headers:
                  </span>
                  <div className="font-mono text-[11px] text-[var(--dc-muted)] space-y-0.5">
                    <div>Content-Type: application/json</div>
                    <div>X-Wevsoft-Event-Type: {selectedEvent.id}</div>
                    <div>X-Wevsoft-Signature: HMAC-SHA256(secret, payload)</div>
                    {/* eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior) */}
                    <div>X-Wevsoft-Timestamp: {Date.now()}</div>
                  </div>
                </div>
              </div>

              {/* Payload Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-[var(--dc-text)]">
                    Simulated Payload (JSON)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTestPayloadText(getSampleForEvent(selectedEvent.id))}
                      className="text-[11px] text-[var(--dc-muted)] hover:text-[var(--dc-text)] flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Reset Sample
                    </button>
                    <span className="text-[var(--dc-faint)]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(testPayloadText);
                          setTestPayloadText(JSON.stringify(parsed, null, 2));
                          toast.success('Formatted JSON');
                        } catch {
                          toast.error('Invalid JSON');
                        }
                      }}
                      className="text-[11px] text-[var(--dc-blue)] hover:underline"
                    >
                      Format JSON
                    </button>
                  </div>
                </div>
                <textarea
                  value={testPayloadText}
                  onChange={(e) => setTestPayloadText(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className={cx(inputCls, '!h-auto py-2 font-mono text-[11.5px] leading-relaxed')}
                />
              </div>

              {/* Real-Time Live Delivery Result */}
              {testResult && (
                <div className="p-3.5 rounded-[8px] border border-[var(--dc-border)] bg-[var(--dc-card)] space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {testResult.delivery?.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[12px] font-semibold">
                          <Check size={13} /> Delivered (HTTP {testResult.delivery.httpStatus})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[12px] font-semibold">
                          <AlertTriangle size={13} /> Failed ({testResult.delivery?.httpStatus ? `HTTP ${testResult.delivery.httpStatus}` : 'No response / Timeout'})
                        </span>
                      )}
                      {testResult.latencyMs != null && (
                        <span className="text-[11px] text-[var(--dc-muted)] flex items-center gap-1 font-mono">
                          <Clock size={11} /> {testResult.latencyMs} ms
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--dc-faint)] font-mono">
                      ID: {testResult.delivery?.id?.slice(0, 8)}...
                    </span>
                  </div>

                  {testResult.delivery?.responseBody && (
                    <div className="pt-2 border-t border-[var(--dc-border)]">
                      <span className="text-[10.5px] font-semibold text-[var(--dc-faint)] uppercase tracking-wider block mb-1">
                        Server Response Body:
                      </span>
                      <pre className="p-2 rounded bg-[var(--dc-side)] font-mono text-[11px] text-[var(--dc-text-2)] overflow-x-auto max-h-[100px]">
                        {testResult.delivery.responseBody}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between p-3.5 bg-[var(--dc-side)] border-t border-[var(--dc-border)]">
              <span className="text-[11px] text-[var(--dc-muted)]">
                Sends a signed HTTP POST request with HMAC-SHA256 signature
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className={cx(btn.secondary, btn.sm)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={test.isPending}
                  onClick={() => test.mutate(selectedEvent.id)}
                  className={cx(btn.primary, btn.sm)}
                >
                  {test.isPending ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
                  Send to My Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}