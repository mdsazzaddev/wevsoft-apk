/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Plus, RotateCw, Send, X } from 'lucide-react';
import api from '../../../../../lib/api';
import { ConfirmDialog, cx } from '../../../devUi';
import { useDevAccount } from '../../accountContext';
import { PLATFORM_LIMITS, useConsoleWebhooks, type ConsoleDelivery, type ConsoleWebhook } from '../../consoleData';
import { AppSelect, Card, EmptyState, LoadingRows, NoAppsState, Pill, SecretField, btn, fmtDate, tdCls, thCls } from '../../ui';
import { ConfigureWebhookCard, WebhookFieldsPanel } from '../../components/WebhookFieldsPanel';
import { AccessTokensCard } from '../../components/AccessTokensCard';
import { deliveryTone } from './shared';

/* ------------------------------------------------------------------ */
/* Webhooks (/developer/webhooks) — reused by the app details tab      */
/* ------------------------------------------------------------------ */

function useDeliveries(hook: ConsoleWebhook | null) {
  return useQuery<ConsoleDelivery[]>({
    queryKey: ['developerConsole', 'deliveries', hook?.id],
    queryFn: async () => {
      const data = (await api.get(`/api/developer/apps/${hook!.appId}/webhooks/${hook!.id}/deliveries`)).data;
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(hook),
  });
}
function DeliveriesPanel({ hook, onClose }: { hook: ConsoleWebhook; onClose: () => void }) {
  const q = useDeliveries(hook);
  const queryClient = useQueryClient();
  const retryDelivery = useMutation({
    mutationFn: async (deliveryId: string) =>
      (await api.post(`/api/developer/apps/${hook.appId}/webhooks/${hook.id}/deliveries/${deliveryId}/retry`)).data,
    onSuccess: (res: any) => {
      const st = res?.delivery?.status;
      if (st === 'success') toast.success(`Delivery retried and succeeded (HTTP ${res?.delivery?.httpStatus})`);
      else toast.error(`Retry finished with status: ${st || 'failed'}`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'deliveries', hook.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not retry delivery'),
  });

  const redeliverDelivery = useMutation({
    mutationFn: async (deliveryId: string) =>
      (await api.post(`/api/developer/apps/${hook.appId}/webhooks/${hook.id}/deliveries/${deliveryId}/redeliver`)).data,
    onSuccess: (res: any) => {
      const st = res?.delivery?.status;
      if (st === 'success') toast.success(`Delivery replayed and succeeded (HTTP ${res?.delivery?.httpStatus ?? 'ok'})`);
      else toast.success(`Delivery replayed (status: ${st || 'retrying'})`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'deliveries', hook.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not redeliver delivery'),
  });

  return (
    <Card
      title={<>Deliveries <span className="font-normal text-[var(--dc-muted)] truncate max-w-[360px]">{hook.endpointUrl}</span></>}
      action={
        <button type="button" onClick={onClose} aria-label="Close deliveries" className="w-[26px] h-[26px] grid place-items-center rounded text-[var(--dc-muted)] hover:bg-[var(--dc-hover)]">
          <X size={14} />
        </button>
      }
      className="mt-4"
      bodyClassName="!px-0"
    >
      {q.isLoading ? (
        <div className="px-4"><LoadingRows /></div>
      ) : (q.data || []).length === 0 ? (
        <div className="px-4"><EmptyState icon={Send} title="No deliveries yet" body="Deliveries appear when a subscribed event happens." className="!py-7" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr>
                <th className={thCls}>Event</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>HTTP</th>
                <th className={thCls}>Retries</th>
                <th className={thCls}>Sent</th>
                <th className={cx(thCls, 'text-right')}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(q.data || []).map((d) => (
                <tr key={d.id}>
                  <td className={tdCls}><code className="dc-code text-[11px]">{d.eventType}</code></td>
                  <td className={tdCls}><Pill tone={deliveryTone(d.status)}>{d.status}</Pill></td>
                  <td className={tdCls}>{d.httpStatus ?? '—'}</td>
                  <td className={tdCls}>{d.retryCount ?? 0}</td>
                  <td className={tdCls}>{fmtDate(d.createdAt, true)}</td>
                  <td className={cx(tdCls, 'text-right flex items-center justify-end gap-1')}>
                    {(d.status === 'failed' || d.status === 'dead') && (
                      <button
                        type="button"
                        disabled={retryDelivery.isPending}
                        onClick={() => retryDelivery.mutate(d.id)}
                        className={cx(btn.secondary, btn.sm)}
                      >
                        {retryDelivery.isPending && retryDelivery.variables === d.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCw size={11} />} Retry
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={redeliverDelivery.isPending}
                      onClick={() => redeliverDelivery.mutate(d.id)}
                      className={cx(btn.secondary, btn.sm)}
                      title="Replay this delivery immediately"
                    >
                      {redeliverDelivery.isPending && redeliverDelivery.variables === d.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCw size={11} />} Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
/**
 * Facebook-style webhook setup backed by /api/developer/apps/:id/webhooks.
 *   1. Configure webhooks: callback URL + verify token, "Verify and save" (GET hub.challenge handshake).
 *   2. Webhook fields: per-event Subscribe switches, version and Test.
 * Each app can have several endpoints (PLATFORM_LIMITS.webhooksPerApp); pick one in the endpoint bar.
 * `fixedAppId` scopes it to one app (app details > Webhooks tab).
 */
export function WebhookManager({ fixedAppId }: { fixedAppId?: string }) {
  const { apps } = useDevAccount();
  const queryClient = useQueryClient();
  const scopeApps = fixedAppId ? apps.filter((a) => a.id === fixedAppId) : apps;
  const hooks = useConsoleWebhooks(scopeApps);
  const [appId, setAppId] = useState(fixedAppId || '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ConsoleWebhook | null>(null);
  const [deleting, setDeleting] = useState<ConsoleWebhook | null>(null);
  /** Signing secrets are returned only on create / rotate; keep them for this session so they can be copied. */
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const targetApp = scopeApps.find((a) => a.id === (appId || scopeApps[0]?.id)) || null;
  const appHooks = targetApp ? hooks.webhooks.filter((w) => w.appId === targetApp.id) : [];
  const canAdd = appHooks.length < PLATFORM_LIMITS.webhooksPerApp;
  // 'new' = configure a new endpoint; otherwise the chosen endpoint (defaults to the first one).
  const selected = selectedId === 'new' ? null : appHooks.find((w) => w.id === selectedId) || appHooks[0] || null;

  const refresh = (id: string) => queryClient.invalidateQueries({ queryKey: ['developerConsole', 'webhooks', id] });

  const rotateSecret = useMutation({
    mutationFn: async (w: ConsoleWebhook) => (await api.post(`/api/developer/apps/${w.appId}/webhooks/${w.id}/rotate-secret`)).data as { secret: string },
    onSuccess: (d, w) => {
      setRevealed((r) => ({ ...r, [w.id]: d.secret }));
      toast.success('Signing secret rotated. Update your endpoint now.');
    },
    onError: () => toast.error('Could not rotate the secret'),
  });
  const toggleActive = useMutation({
    mutationFn: async (w: ConsoleWebhook) => (await api.put(`/api/developer/apps/${w.appId}/webhooks/${w.id}`, { isActive: w.isActive === false })).data,
    onSuccess: (_d, w) => {
      toast.success(w.isActive === false ? 'Endpoint enabled' : 'Endpoint paused');
      refresh(w.appId);
    },
    onError: () => toast.error('Could not update the endpoint'),
  });
  const remove = useMutation({
    mutationFn: async (w: ConsoleWebhook) => (await api.delete(`/api/developer/apps/${w.appId}/webhooks/${w.id}`)).data,
    onSuccess: (_d, w) => {
      toast.success('Subscription removed');
      setDeleting(null);
      setSelectedId(null);
      if (viewing?.id === w.id) setViewing(null);
      refresh(w.appId);
    },
    onError: (e: Error) => toast.error(e?.message || 'Could not remove the subscription'),
  });

  if (scopeApps.length === 0) return <NoAppsState what="webhooks" />;
  if (!targetApp) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!fixedAppId && scopeApps.length > 1 && (
          <AppSelect apps={scopeApps} value={targetApp.id} onChange={(id) => { setAppId(id); setSelectedId(null); }} />
        )}
        {appHooks.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setSelectedId(w.id)}
            aria-pressed={selected?.id === w.id}
            className={cx(
              'max-w-full inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border text-[11.5px] transition-colors',
              selected?.id === w.id ? 'border-[var(--dc-blue)] bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] font-semibold' : 'border-[var(--dc-border)] text-[var(--dc-text-2)] hover:bg-[var(--dc-hover)]',
            )}
          >
            <span className={cx('w-[6px] h-[6px] rounded-full shrink-0', (w as any).verificationState === 'verified' && w.isActive !== false ? 'bg-[#22c55e]' : 'bg-[var(--dc-faint)]')} />
            <span className="truncate max-w-[220px] dc-code">{w.endpointUrl.replace(/^https?:\/\//, '')}</span>
          </button>
        ))}
        {canAdd && (
          <button type="button" onClick={() => setSelectedId('new')} aria-pressed={selectedId === 'new'} className={cx(btn.secondary, btn.sm)}>
            <Plus size={13} /> Add callback URL
          </button>
        )}
      </div>

      <ConfigureWebhookCard
        app={targetApp}
        webhook={selected}
        canAdd={canAdd}
        onSaved={(w) => {
          if (w.secret) setRevealed((r) => ({ ...r, [w.id]: w.secret as string }));
          setSelectedId(w.id);
        }}
        onRemove={setDeleting}
      />

      <AccessTokensCard app={targetApp} />

      {selected ? (
        <>
          <div className="dc-card px-[16px] py-[10px] flex flex-wrap items-center gap-2 text-[11.5px]">
            <span className="text-[var(--dc-muted)]">Signing secret</span>
            {revealed[selected.id] ? (
              <SecretField value={revealed[selected.id]} label="Signing secret copied" />
            ) : (
              <span className="dc-code text-[11px] text-[var(--dc-faint)]" title="Shown only when created or rotated">{selected.secretMasked || 'hidden'}</span>
            )}
            <button type="button" className={cx(btn.ghost, btn.sm)} disabled={rotateSecret.isPending} onClick={() => rotateSecret.mutate(selected)}>Rotate</button>
            <span className="flex-1" />
            <Pill tone={selected.isActive === false ? 'gray' : 'green'}>{selected.isActive === false ? 'Paused' : 'Active'}</Pill>
            <button type="button" onClick={() => toggleActive.mutate(selected)} disabled={toggleActive.isPending} className={cx(btn.secondary, btn.sm)}>{selected.isActive === false ? 'Resume' : 'Pause'}</button>
            <button type="button" onClick={() => setViewing(selected)} className={cx(btn.secondary, btn.sm)}>All deliveries</button>
          </div>
          <WebhookFieldsPanel webhook={selected} app={targetApp} />
        </>
      ) : (
        <section className="dc-card p-[16px] sm:p-[20px] opacity-70">
          <h3 className="text-[14px] font-semibold text-[var(--dc-text)]">3. Webhook fields</h3>
          <p className="text-[12px] text-[var(--dc-muted)]">Verify and save a callback URL first, then choose the fields to subscribe to.</p>
        </section>
      )}

      {viewing && <DeliveriesPanel hook={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
        title="Remove this subscription?"
        description={<>Events will stop being sent to <b className="break-all">{deleting?.endpointUrl}</b>. Its delivery history is deleted too.</>}
        confirmLabel="Remove subscription"
        busy={remove.isPending}
      />
    </div>
  );
}
