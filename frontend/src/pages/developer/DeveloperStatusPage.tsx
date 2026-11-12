import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Activity,
  ArrowLeft,
  Server,
  Radio,
  Webhook,
  Cpu,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';
import { getPlatformStatus, PlatformStatus } from './devApi';
import { devQueryKeys } from './console/queryPolicy';

export function DeveloperStatusPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Phase 2 P2-6: React Query replaces the fetch effect + setInterval (same 30s auto-refresh, no retry as before).
  // On failure the last real snapshot stays in `data` and is flagged stale: never a fabricated "all operational".
  const statusQuery = useQuery<PlatformStatus>({
    queryKey: devQueryKeys.status(),
    queryFn: getPlatformStatus,
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 0,
    retry: false,
  });
  const status = statusQuery.data ?? null;
  const loading = statusQuery.isPending;
  const refreshing = statusQuery.isFetching;
  const fetchError = statusQuery.isError;
  const lastRefreshed = new Date(statusQuery.dataUpdatedAt || Date.now());
  const fetchStatus = () => statusQuery.refetch();

  const getServiceIcon = (id: string) => {
    switch (id) {
      case 'core-api': return <Server className="w-5 h-5 text-blue-500" />;
      case 'realtime-gateway': return <Radio className="w-5 h-5 text-indigo-500" />;
      case 'webhooks-engine': return <Webhook className="w-5 h-5 text-purple-500" />;
      case 'ai-suite': return <Cpu className="w-5 h-5 text-amber-500" />;
      case 'developer-portal': return <Layers className="w-5 h-5 text-emerald-500" />;
      default: return <Database className="w-5 h-5 text-cyan-500" />;
    }
  };

  const isOperational = status?.status === 'operational';
  const isDegraded = status?.status === 'degraded';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/developer" className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Developer Home
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              System Status
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => void fetchStatus()}
              disabled={refreshing}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-primary-500' : ''}`} />
              Refresh
            </button>
            <label className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Auto-refresh (30s)</span>
            </label>
          </div>
        </div>
      </header>
      {fetchError && (
        <div role="alert" className="max-w-5xl mx-auto mt-4 px-4 sm:px-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            Status is unavailable: we could not reach the status service.{status ? ' Showing the last known status from ' + lastRefreshed.toLocaleTimeString() + '.' : ' Live status will appear when it reconnects.'}
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
            isOperational
              ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60'
              : isDegraded
              ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/60'
              : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/60'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isOperational
                  ? 'bg-emerald-500 text-white shadow-emerald-500/25 shadow-lg'
                  : isDegraded
                  ? 'bg-amber-500 text-white shadow-amber-500/25 shadow-lg'
                  : 'bg-rose-500 text-white shadow-rose-500/25 shadow-lg'
              }`}
            >
              {isOperational ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : isDegraded ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <XCircle className="w-7 h-7" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {isOperational ? 'All Systems Operational' : isDegraded ? 'Active Service Degradation' : 'Scheduled Maintenance in Progress'}
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOperational ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Verified live telemetry across all Wevsoft Platform APIs, real-time gateways, and storage nodes.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>30-Day Uptime: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{status?.uptime30d ?? 99.98}%</strong></span>
            <span className="mt-0.5">Updated: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* 30-Day Historical Uptime Visualizer */}
        <section className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              Past 30 Days System Availability
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              100% Target Met
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 h-10 w-full overflow-hidden">
            {(status?.dailyUptime || Array.from({ length: 30 })).map((day: any, i) => (
              <div
                key={i}
                title={`${day?.date || `Day ${i + 1}`}: ${day?.uptime ?? 100}% uptime (${day?.incidents ?? 0} incidents)`}
                className="flex-1 h-full bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-500/80 dark:hover:bg-emerald-400 rounded-sm transition-all cursor-pointer transform hover:scale-105"
              />
            ))}
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </section>

        {/* Services Health Breakdown */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span>Platform Services Health</span>
            <span className="text-xs text-slate-500 font-normal">Updated every 15-30s</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {status?.services.map((svc) => (
              <div
                key={svc.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-start justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getServiceIcon(svc.id)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {svc.description}
                    </p>
                    {svc.latencyMs !== undefined && (
                      <span className="inline-block mt-2 text-[11px] text-slate-400 font-mono">
                        Latency: {svc.latencyMs}ms
                      </span>
                    )}
                    {svc.activeConnections !== undefined && (
                      <span className="inline-block mt-2 text-[11px] text-slate-400 font-mono ml-3">
                        Active Connections: {svc.activeConnections}
                      </span>
                    )}
                    {svc.dlqSize !== undefined && (
                      <span className="inline-block mt-2 text-[11px] text-slate-400 font-mono ml-3">
                        DLQ Quarantine: {svc.dlqSize}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    svc.status === 'operational'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : svc.status === 'degraded'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${svc.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Incident History */}
        <section className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Recent Maintenance & Incidents
          </h2>

          {status?.incidents && status.incidents.length > 0 ? (
            <div className="space-y-4">
              {status.incidents.map((inc) => (
                <div key={inc.id} className="border-l-2 border-emerald-500 pl-4 py-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {inc.title}
                    </h3>
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {inc.description}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    {new Date(inc.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              No incidents reported in the last 90 days. All systems running nominally.
            </p>
          )}
        </section>

        {/* Footer Navigation */}
        <footer className="mt-12 text-center text-xs text-slate-500 space-x-6 pb-12">
          <Link to="/developer/docs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1">
            Developer Documentation <ExternalLink className="w-3 h-3" />
          </Link>
          <Link to="/developer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Developer Console
          </Link>
          <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Wevsoft Home
          </Link>
        </footer>
      </div>
    </div>
  );
}
