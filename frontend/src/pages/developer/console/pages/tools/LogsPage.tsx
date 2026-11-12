/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Activity, Clock, Loader2, Radio, RotateCw, ScrollText, Search, Send, Terminal, Webhook, X, Zap } from 'lucide-react';
import api from '../../../../../lib/api';
import { type DeveloperApp } from '../../../devApi';
import { cx } from '../../../devUi';
import { useDevAccount } from '../../accountContext';
import { useConsoleWebhooks, type ConsoleWebhook } from '../../consoleData';
import { AppSelect, Card, CodeBox, ConsolePage, EmptyState, LoadingRows, NoAppsState, Pill, StatTile, btn, fmtDate, inputCls, selectCls, tdCls, thCls } from '../../ui';
import { deliveryTone } from './shared';

/* ------------------------------------------------------------------ */
/* Developer Event Simulator Modal                                     */
/* ------------------------------------------------------------------ */

function EventSimulatorModal({
  apps,
  isOpen,
  onClose,
}: {
  apps: DeveloperApp[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [eventType, setEventType] = useState('post.created');
  const [channels, setChannels] = useState<{ webhook: boolean; sse: boolean; ws: boolean }>({
    webhook: true,
    sse: true,
    ws: true,
  });
  const [customPayload, setCustomPayload] = useState<string>('');
  const [simResult, setSimResult] = useState<any>(null);

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const activeChannels = Object.entries(channels)
        .filter(([_, active]) => active)
        .map(([ch]) => ch);
      let parsedPayload: any = undefined;
      if (customPayload.trim()) {
        try {
          parsedPayload = JSON.parse(customPayload);
        } catch {
          throw new Error('Invalid JSON in custom payload');
        }
      }
      const res = await api.post('/api/developer/events/simulate', {
        appId: selectedAppId || undefined,
        eventType,
        channels: activeChannels,
        payload: parsedPayload,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSimResult(data);
      toast.success(`Event ${eventType} simulated!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.error || 'Simulation failed');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--dc-card)] border border-[var(--dc-border)] rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--dc-border)]">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            <h3 className="font-semibold text-sm text-[var(--dc-text)]">Developer Event Simulator</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--dc-muted)] hover:text-[var(--dc-text)]">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block mb-1 font-medium text-[var(--dc-text)]">Target Application</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className={cx(selectCls, '!w-full !h-[34px] !text-xs')}
            >
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-[var(--dc-text)]">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className={cx(selectCls, '!w-full !h-[34px] !text-xs')}
            >
              <option value="post.created">post.created (New public post)</option>
              <option value="post.updated">post.updated (Post edited)</option>
              <option value="reel.published">reel.published (Short video reel published)</option>
              <option value="order.paid">order.paid (Monetization checkout order paid)</option>
              <option value="comment.created">comment.created (Comment published on post)</option>
              <option value="user.followed">user.followed (New follower relationship)</option>
              <option value="custom.simulated">custom.simulated (Custom telemetry frame)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-[var(--dc-text)]">Delivery Channels</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.webhook}
                  onChange={(e) => setChannels({ ...channels, webhook: e.target.checked })}
                  className="rounded border-[var(--dc-border)]"
                />
                <span>Webhooks</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.sse}
                  onChange={(e) => setChannels({ ...channels, sse: e.target.checked })}
                  className="rounded border-[var(--dc-border)]"
                />
                <span>SSE Stream</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.ws}
                  onChange={(e) => setChannels({ ...channels, ws: e.target.checked })}
                  className="rounded border-[var(--dc-border)]"
                />
                <span>WebSocket Gateway</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-[var(--dc-text)]">Custom Payload JSON (Optional)</label>
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={3}
              placeholder='Leave empty for default event payload, or enter {"customField": "value"}'
              className={cx(inputCls, '!w-full font-mono !text-[11px] !p-2 !h-auto')}
            />
          </div>

          {simResult && (
            <div className="p-3 bg-[var(--dc-card-2)] border border-emerald-500/30 rounded-xl space-y-1">
              <p className="font-semibold text-emerald-400">Simulation Dispatched!</p>
              <p className="text-[11px] text-[var(--dc-muted)] font-mono">Event ID: {simResult.eventId}</p>
              <p className="text-[11px] text-[var(--dc-muted)]">
                Channels: {simResult.channels?.join(', ')} • SSE Listeners: {simResult.sseClientsNotified} • WS: {simResult.wsDelivered ? 'Delivered' : 'None'} • Webhooks: {simResult.webhookDeliveries?.length || 0}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-[var(--dc-border)]">
          <button type="button" onClick={onClose} className={cx(btn.secondary, btn.sm)}>
            Close
          </button>
          <button
            type="button"
            disabled={simulateMutation.isPending}
            onClick={() => simulateMutation.mutate()}
            className={cx(btn.primary, btn.sm, 'flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white')}
          >
            {simulateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Simulate Event
          </button>
        </div>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Logs & Monitoring (/developer/logs)                                 */
/* ------------------------------------------------------------------ */

export function LogsPage() {
  const { apps, appsQuery } = useDevAccount();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'requests' | 'webhooks' | 'audit'>('requests');
  const [showSimulator, setShowSimulator] = useState(false);

  // Webhook deliveries state
  const hooks = useConsoleWebhooks(apps);
  const [appId, setAppId] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [openWebhookId, setOpenWebhookId] = useState<string | null>(null);

  // API Request Inspector state
  const [reqAppId, setReqAppId] = useState<string>(apps[0]?.id || 'all');
  const [reqStatus, setReqStatus] = useState<string>('all');
  const [reqMethod, setReqMethod] = useState<string>('all');
  const [reqQ, setReqQ] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [openReqLogId, setOpenReqLogId] = useState<string | null>(null);

  // Sync selected app
  useEffect(() => {
    if (reqAppId === 'all' && apps.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setReqAppId(apps[0]!.id);
    }
  }, [apps, reqAppId]);

  const targetAppId = reqAppId === 'all' && apps.length > 0 ? apps[0]!.id : reqAppId;

  // Real-time API Request Logs query
  const apiLogsQuery = useQuery({
    queryKey: ['developerConsole', 'apiLogsInspector', targetAppId, reqStatus, reqMethod, reqQ],
    queryFn: async () => {
      if (!targetAppId || targetAppId === 'all') return { logs: [] };
      const params = new URLSearchParams();
      if (reqStatus !== 'all') params.set('status', reqStatus);
      if (reqMethod !== 'all') params.set('method', reqMethod);
      if (reqQ.trim()) params.set('q', reqQ.trim());
      params.set('limit', '50');
      const res = await api.get(`/api/developer/apps/${targetAppId}/logs?${params.toString()}`);
      return res.data;
    },
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: Boolean(targetAppId && targetAppId !== 'all'),
  });

  const apiLogs = (apiLogsQuery.data?.logs as any[]) || [];

  // Team Audit Logs query
  const auditLogsQuery = useQuery({
    queryKey: ['developerConsole', 'teamAuditLogs', targetAppId],
    queryFn: async () => {
      const res = await api.get(`/api/developer/audit-logs${targetAppId && targetAppId !== 'all' ? `?appId=${targetAppId}` : ''}`);
      return res.data;
    },
    enabled: activeTab === 'audit',
  });
  const auditLogs = (auditLogsQuery.data?.logs as any[]) || [];

  const retryDelivery = useMutation({
    mutationFn: async ({ hook, deliveryId }: { hook: ConsoleWebhook; deliveryId: string }) =>
      (await api.post(`/api/developer/apps/${hook.appId}/webhooks/${hook.id}/deliveries/${deliveryId}/retry`)).data,
    onSuccess: (res: any, vars) => {
      const st = res?.delivery?.status;
      if (st === 'success') toast.success(`Delivery retried and succeeded (HTTP ${res?.delivery?.httpStatus})`);
      else toast.error(`Retry finished with status: ${st || 'failed'}`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'deliveries', vars.hook.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not retry delivery'),
  });

  const redeliverDelivery = useMutation({
    mutationFn: async ({ hook, deliveryId }: { hook: ConsoleWebhook; deliveryId: string }) =>
      (await api.post(`/api/developer/apps/${hook.appId}/webhooks/${hook.id}/deliveries/${deliveryId}/redeliver`)).data,
    onSuccess: (res: any, vars) => {
      const st = res?.delivery?.status;
      if (st === 'success') toast.success(`Delivery replayed successfully (HTTP ${res?.delivery?.httpStatus ?? 'ok'})`);
      else toast.success(`Delivery replayed (status: ${st || 'retrying'})`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'deliveries', vars.hook.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not redeliver delivery'),
  });

  const replayDlq = useMutation({
    mutationFn: async ({ appId, webhookId }: { appId: string; webhookId: string }) =>
      (await api.post(`/api/developer/apps/${appId}/webhooks/${webhookId}/dlq/replay-all`)).data,
    onSuccess: (res: any) => {
      toast.success(`Replayed ${res?.replayedCount || 0} dead deliveries`);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'webhooks'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not replay DLQ'),
  });

  const hookById = useMemo(() => new Map(hooks.webhooks.map((w) => [w.id, w])), [hooks.webhooks]);
  const webhookRows = hooks.deliveries
    .map((d) => ({ d, hook: hookById.get(d.webhookId) }))
    .filter(({ d, hook }) => (appId === 'all' || hook?.appId === appId) && (status === 'all' || d.status === status) && (!q.trim() || `${d.eventType} ${hook?.endpointUrl || ''} ${d.httpStatus ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => new Date(b.d.createdAt).getTime() - new Date(a.d.createdAt).getTime());
  const appName = (id?: string) => apps.find((a) => a.id === id)?.name || '—';

  // API logs telemetry metrics
  const reqSuccessCount = apiLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
  const reqClientErrorCount = apiLogs.filter((l) => l.statusCode >= 400 && l.statusCode < 500).length;
  const reqServerErrorCount = apiLogs.filter((l) => l.statusCode >= 500).length;

  return (
    <ConsolePage group="Developer Tools" title="Logs & Monitoring" description="Real-time API request inspector and webhook delivery logs.">
      {appsQuery.isLoading ? (
        <LoadingRows rows={5} />
      ) : apps.length === 0 ? (
        <NoAppsState what="logs" />
      ) : (
        <>
          {/* Tab Switcher & Simulator Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dc-border)] pb-3 mb-4">
            <div className="flex items-center gap-1.5 p-1 bg-[var(--dc-card-2)] border border-[var(--dc-border)] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={cx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'requests'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                <Terminal size={14} /> API Request Inspector
                {autoRefresh && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('webhooks')}
                className={cx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'webhooks'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                <Webhook size={14} /> Webhook Deliveries
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={cx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'audit'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                <ScrollText size={14} /> Team Audit Logs
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSimulator(true)}
              className={cx(btn.secondary, btn.sm, 'flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-medium')}
            >
              <Zap size={13} className="text-amber-500" /> Event Simulator
            </button>
          </div>

          {activeTab === 'requests' ? (
            /* TAB 1: API Request Inspector */
            <>
              <div className="grid gap-3 min-[640px]:grid-cols-4">
                <StatTile icon={ScrollText} label="Logged requests" value={apiLogs.length} />
                <StatTile icon={Send} label="Success (2xx)" value={reqSuccessCount} tone="green" />
                <StatTile icon={X} label="Client Errors (4xx)" value={reqClientErrorCount} tone="amber" />
                <StatTile icon={Activity} label="Server Errors (5xx)" value={reqServerErrorCount} tone="red" />
              </div>

              <Card className="mt-4" bodyClassName="!p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 px-[16px] py-[12px] border-b border-[var(--dc-border)]">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative min-w-[200px] max-w-[280px]">
                      <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
                      <input
                        value={reqQ}
                        onChange={(e) => setReqQ(e.target.value)}
                        placeholder="Filter path, IP, or error"
                        className={cx(inputCls, '!pl-[30px] !h-[30px]')}
                      />
                    </div>
                    <AppSelect apps={apps} value={targetAppId} onChange={setReqAppId} />
                    <select
                      aria-label="Method"
                      value={reqMethod}
                      onChange={(e) => setReqMethod(e.target.value)}
                      className={cx(selectCls, '!h-[30px] !w-auto !text-[12px]')}
                    >
                      <option value="all">All Methods</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                    <select
                      aria-label="Status"
                      value={reqStatus}
                      onChange={(e) => setReqStatus(e.target.value)}
                      className={cx(selectCls, '!h-[30px] !w-auto !text-[12px]')}
                    >
                      <option value="all">All Statuses</option>
                      <option value="2xx">2xx Success</option>
                      <option value="4xx">4xx Client Error</option>
                      <option value="5xx">5xx Server Error</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoRefresh((v) => !v)}
                      className={cx(btn.secondary, btn.sm, autoRefresh && 'text-emerald-500 font-semibold')}
                    >
                      <Radio size={12} className={cx(autoRefresh && 'animate-pulse text-emerald-500')} />
                      {autoRefresh ? 'Live (5s)' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => apiLogsQuery.refetch()}
                      className={cx(btn.secondary, btn.sm)}
                    >
                      <RotateCw size={12} className={cx(apiLogsQuery.isFetching && 'animate-spin')} />
                    </button>
                  </div>
                </div>

                {apiLogsQuery.isLoading ? (
                  <div className="p-4"><LoadingRows rows={4} /></div>
                ) : apiLogs.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Terminal}
                      title="No API requests recorded"
                      body="Calls made to Developer API endpoints using your API keys or OAuth tokens will appear here in real time."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead>
                        <tr>
                          <th className={thCls}>Time</th>
                          <th className={thCls}>Method</th>
                          <th className={thCls}>Endpoint</th>
                          <th className={thCls}>Status</th>
                          <th className={thCls}>Duration</th>
                          <th className={thCls}>Auth</th>
                          <th className={thCls}>Client IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiLogs.map((log) => (
                          <React.Fragment key={log.id}>
                            <tr
                              onClick={() => setOpenReqLogId(openReqLogId === log.id ? null : log.id)}
                              className="cursor-pointer hover:bg-[var(--dc-hover)]"
                            >
                              <td className={cx(tdCls, 'whitespace-nowrap')}>{fmtDate(log.createdAt, true)}</td>
                              <td className={tdCls}>
                                <code className="dc-code font-bold text-[11px] px-1.5 py-0.5 rounded bg-[var(--dc-card-2)]">
                                  {log.method}
                                </code>
                              </td>
                              <td className={cx(tdCls, 'font-mono text-[11.5px] max-w-[280px] truncate')}>{log.endpoint}</td>
                              <td className={tdCls}>
                                <Pill tone={log.statusCode >= 500 ? 'red' : log.statusCode >= 400 ? 'amber' : 'green'}>
                                  {log.statusCode}
                                </Pill>
                              </td>
                              <td className={tdCls}>{log.durationMs} ms</td>
                              <td className={tdCls}>{log.authType === 'api_key' ? 'API key' : log.authType === 'oauth' ? 'OAuth' : '—'}</td>
                              <td className={cx(tdCls, 'font-mono text-[11px]')}>{log.ipAddress}</td>
                            </tr>
                            {openReqLogId === log.id && (
                              <tr>
                                <td colSpan={7} className="px-[16px] py-[12px] bg-[var(--dc-card-2)] border-b border-[var(--dc-border)] space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11.5px] font-semibold text-[var(--dc-text)]">
                                      Request Details <code className="dc-code font-normal text-[11px] ml-1">{log.id}</code>
                                    </p>
                                    <p className="text-[11px] text-[var(--dc-muted)]">
                                      Latency: {log.durationMs} ms • Auth: {log.authType || 'public'} • IP: {log.ipAddress}
                                    </p>
                                  </div>

                                  {log.errorMessage && (
                                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[12px]">
                                      <span className="font-semibold">Error Message:</span> {log.errorMessage}
                                    </div>
                                  )}

                                  <div className="grid gap-3 min-[800px]:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] font-semibold text-[var(--dc-muted)] mb-1">Redacted Request Headers</p>
                                      <CodeBox
                                        code={
                                          log.parsedHeaders
                                            ? JSON.stringify(log.parsedHeaders, null, 2)
                                            : log.requestHeaders || 'No headers captured'
                                        }
                                        className="max-h-[180px] overflow-auto text-[11px]"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-[var(--dc-muted)] mb-1">Request Body</p>
                                      <CodeBox
                                        code={
                                          log.parsedBody
                                            ? JSON.stringify(log.parsedBody, null, 2)
                                            : log.requestBody || 'No request body'
                                        }
                                        className="max-h-[180px] overflow-auto text-[11px]"
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'webhooks' ? (
            /* TAB 2: Webhook Deliveries */
            <>
              <div className="grid gap-3 min-[640px]:grid-cols-4">
                <StatTile icon={ScrollText} label="Log entries" value={hooks.deliveries.length} />
                <StatTile icon={Send} label="Delivered" value={hooks.deliveries.filter((d) => d.status === 'success').length} tone="green" />
                <StatTile icon={X} label="Failed / Dead" value={hooks.deliveries.filter((d) => d.status === 'failed' || d.status === 'dead').length} tone="red" />
                <StatTile icon={Clock} label="Pending" value={hooks.deliveries.filter((d) => d.status !== 'success' && d.status !== 'failed' && d.status !== 'dead').length} tone="amber" />
              </div>
              <Card className="mt-4" bodyClassName="!p-0">
                <div className="flex flex-wrap items-center gap-2 px-[16px] py-[12px]">
                  <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search event, endpoint or status code" className={cx(inputCls, '!pl-[30px] !h-[30px]')} />
                  </div>
                  <AppSelect apps={apps} value={appId} onChange={setAppId} allowAll />
                  <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={cx(selectCls, '!h-[30px] !w-auto !text-[12px]')}>
                    <option value="all">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="dead">Dead-Letter Queue (DLQ)</option>
                    <option value="pending">Pending</option>
                  </select>
                  {status === 'dead' && webhookRows.length > 0 && (
                    <button
                      type="button"
                      disabled={replayDlq.isPending}
                      onClick={() => {
                        const targetHook = webhookRows[0]?.hook;
                        if (targetHook) replayDlq.mutate({ appId: targetHook.appId, webhookId: targetHook.id });
                      }}
                      className={cx(btn.secondary, btn.sm, 'text-xs text-amber-500 flex items-center gap-1 !h-[30px]')}
                    >
                      {replayDlq.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />} Replay All DLQ
                    </button>
                  )}
                </div>
                {webhookRows.length === 0 ? (
                  <div className="px-4 pb-4"><EmptyState icon={ScrollText} title="No log entries" body={hooks.webhooks.length ? 'No deliveries match these filters yet.' : 'Add a webhook endpoint to start collecting delivery logs.'} action={!hooks.webhooks.length ? <Link to="/developer/webhooks" className={btn.primary}>Add webhook</Link> : undefined} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead>
                        <tr>
                          <th className={thCls}>Time</th>
                          <th className={thCls}>Application</th>
                          <th className={thCls}>Event</th>
                          <th className={thCls}>Endpoint</th>
                          <th className={thCls}>Status</th>
                          <th className={thCls}>HTTP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhookRows.slice(0, 300).map(({ d, hook }) => (
                          <React.Fragment key={d.id}>
                            <tr onClick={() => setOpenWebhookId(openWebhookId === d.id ? null : d.id)} className="cursor-pointer hover:bg-[var(--dc-hover)]">
                              <td className={cx(tdCls, 'whitespace-nowrap')}>{fmtDate(d.createdAt, true)}</td>
                              <td className={tdCls}>{appName(hook?.appId)}</td>
                              <td className={tdCls}><code className="dc-code text-[11px]">{d.eventType}</code></td>
                              <td className={cx(tdCls, 'max-w-[260px] truncate dc-code text-[11px]')}>{hook?.endpointUrl || '—'}</td>
                              <td className={tdCls}><Pill tone={deliveryTone(d.status)}>{d.status}</Pill></td>
                              <td className={tdCls}>{d.httpStatus ?? '—'}</td>
                            </tr>
                            {openWebhookId === d.id && (
                              <tr>
                                <td colSpan={6} className="px-[16px] py-[10px] bg-[var(--dc-card-2)] border-b border-[var(--dc-border)]">
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <p className="text-[11px] text-[var(--dc-muted)]">Delivery ID <code className="dc-code">{d.id}</code> • retries {d.retryCount ?? 0}{d.completedAt ? ` • completed ${fmtDate(d.completedAt, true)}` : ''}</p>
                                    <div className="flex items-center gap-2">
                                      {(d.status === 'failed' || d.status === 'dead') && hook && (
                                        <button
                                          type="button"
                                          disabled={retryDelivery.isPending}
                                          onClick={() => retryDelivery.mutate({ hook, deliveryId: d.id })}
                                          className={cx(btn.secondary, btn.sm)}
                                        >
                                          {retryDelivery.isPending && retryDelivery.variables?.deliveryId === d.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCw size={11} />} Retry delivery
                                        </button>
                                      )}
                                      {hook && (
                                        <button
                                          type="button"
                                          disabled={redeliverDelivery.isPending}
                                          onClick={() => redeliverDelivery.mutate({ hook, deliveryId: d.id })}
                                          className={cx(btn.secondary, btn.sm)}
                                          title="Replay this delivery immediately"
                                        >
                                          {redeliverDelivery.isPending && redeliverDelivery.variables?.deliveryId === d.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCw size={11} />} Replay
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {d.responseBody ? <CodeBox code={d.responseBody.slice(0, 4000)} className="max-h-[220px] overflow-auto" /> : <p className="text-[11px] text-[var(--dc-muted)]">No response body recorded.</p>}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          ) : (
            /* TAB 3: Team Audit Logs */
            <Card className="mt-4" bodyClassName="!p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-[16px] py-[12px] border-b border-[var(--dc-border)]">
                <div className="flex items-center gap-2">
                  <ScrollText size={16} className="text-[var(--dc-blue)]" />
                  <span className="font-semibold text-xs text-[var(--dc-text)]">Team Activity & Audit Trail</span>
                </div>
                <AppSelect apps={apps} value={reqAppId} onChange={setReqAppId} allowAll />
              </div>

              {auditLogsQuery.isLoading ? (
                <div className="p-4"><LoadingRows rows={4} /></div>
              ) : auditLogs.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    icon={ScrollText}
                    title="No audit entries"
                    body="Team actions like creating apps, generating keys, and changing monetization will be logged here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr>
                        <th className={thCls}>Timestamp</th>
                        <th className={thCls}>Action</th>
                        <th className={thCls}>Actor</th>
                        <th className={thCls}>Target</th>
                        <th className={thCls}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[var(--dc-hover)] text-xs">
                          <td className={cx(tdCls, 'whitespace-nowrap')}>{fmtDate(log.createdAt, true)}</td>
                          <td className={tdCls}><Pill tone="blue">{log.action}</Pill></td>
                          <td className={tdCls}>
                            <div className="font-medium text-[var(--dc-text)]">{log.actor?.name || 'Teammate'}</div>
                            {log.actor?.email && <div className="text-[10px] text-[var(--dc-muted)]">{log.actor.email}</div>}
                          </td>
                          <td className={tdCls}><code className="dc-code text-[11px]">{log.targetType}: {log.targetId ? log.targetId.slice(0, 10) + '...' : '—'}</code></td>
                          <td className={cx(tdCls, 'max-w-[260px] truncate text-[11px] text-[var(--dc-muted)]')}>{JSON.stringify(log.details)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
      <EventSimulatorModal apps={apps} isOpen={showSimulator} onClose={() => setShowSimulator(false)} />
    </ConsolePage>
  );
}
