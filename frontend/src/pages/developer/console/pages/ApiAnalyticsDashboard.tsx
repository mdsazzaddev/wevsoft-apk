import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { format, parseISO, subMinutes, subHours, subDays, isAfter } from 'date-fns';
import { 
  Activity, ArrowDownToLine, CheckCircle2, Clock, Code2, 
  Filter, Globe2, LayoutDashboard, Search, ServerCrash, 
  X, ChevronRight, ChevronLeft, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { useSearchParams } from 'react-router-dom';
import api from '../../../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  '2xx': 'bg-green-500/10 text-green-500 border-green-500/20',
  '3xx': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  '4xx': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  '5xx': 'bg-red-500/10 text-red-500 border-red-500/20',
};

const getStatusColor = (code: number) => {
  if (code >= 200 && code < 300) return STATUS_COLORS['2xx'];
  if (code >= 300 && code < 400) return STATUS_COLORS['3xx'];
  if (code >= 400 && code < 500) return STATUS_COLORS['4xx'];
  return STATUS_COLORS['5xx'];
};

const getStatusName = (code: number) => {
  if (code >= 200 && code < 300) return 'Success';
  if (code >= 400 && code < 500) return 'Client Error';
  if (code >= 500) return 'Server Error';
  return 'Redirect';
};

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function ApiAnalyticsDashboard({ appId }: { appId: string }) {
  const [timeRange, setTimeRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  // W4: ?requestId=<id> (from API Explorer 'View in logs') narrows the list server-side.
  const [urlParams, setUrlParams] = useSearchParams();
  const rawRequestId = urlParams.get('requestId') || '';
  const requestIdFilter = /^[A-Za-z0-9-]{8,64}$/.test(rawRequestId) ? rawRequestId : '';
  const clearRequestId = () => {
    const p = new URLSearchParams(urlParams);
    p.delete('requestId');
    setUrlParams(p, { replace: true });
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['api-logs', appId, requestIdFilter],
    queryFn: async ({ pageParam = null }) => {
      const rid = requestIdFilter ? `&requestId=${encodeURIComponent(requestIdFilter)}` : '';
      const q = (pageParam ? `?limit=1000&cursor=${pageParam}` : `?limit=1000`) + rid;
      const res = await api.get(`/api/developer/apps/${appId}/logs${q}`);
      return res.data;
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    initialPageParam: null,
    refetchInterval: 10000
  });

  const logs = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page: any) => page.logs || []);
  }, [data]);

  // Filter by time range
  const filteredByTime = useMemo(() => {
    const now = new Date();
    let cutoff = subDays(now, 7);
    if (timeRange === '15m') cutoff = subMinutes(now, 15);
    else if (timeRange === '1h') cutoff = subHours(now, 1);
    else if (timeRange === '24h') cutoff = subHours(now, 24);
    else if (timeRange === '30d') cutoff = subDays(now, 30);

    return logs.filter((log: any) => isAfter(parseISO(log.createdAt), cutoff));
  }, [logs, timeRange]);

  // Analytics Calculation
  const { totalRequests, successRate, errorRate, avgLatency } = useMemo(() => {
    const total = filteredByTime.length;
    const success = filteredByTime.filter((l: any) => l.statusCode < 400).length;
    const errs = total - success;
    const latencySum = filteredByTime.reduce((sum: number, l: any) => sum + (l.durationMs || 0), 0);
    
    return {
      totalRequests: total,
      successRate: total ? ((success / total) * 100).toFixed(1) : '0.0',
      errorRate: total ? ((errs / total) * 100).toFixed(1) : '0.0',
      avgLatency: total ? Math.round(latencySum / total) : 0,
    };
  }, [filteredByTime]);

  // Chart Data Preparation (Timeline)
  const timelineData = useMemo(() => {
    const buckets: Record<string, { time: string; success: number; error: number }> = {};
    filteredByTime.forEach((l: any) => {
      // Bucket size depends on range
      const d = parseISO(l.createdAt);
      let key: string;
      if (timeRange === '15m' || timeRange === '1h') key = format(d, 'HH:mm');
      else if (timeRange === '24h') key = format(d, 'MMM dd, HH:00');
      else key = format(d, 'MMM dd');

      if (!buckets[key]) buckets[key] = { time: key, success: 0, error: 0 };
      if (l.statusCode < 400) buckets[key].success++;
      else buckets[key].error++;
    });
    return Object.values(buckets).reverse();
  }, [filteredByTime, timeRange]);

  // Top Endpoints
  const topEndpoints = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByTime.forEach((l: any) => {
      counts[l.endpoint] = (counts[l.endpoint] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredByTime]);

  // Table Filtering & Pagination
  const tableLogs = useMemo(() => {
    let result = filteredByTime;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l: any) => l.endpoint.toLowerCase().includes(q) || l.ipAddress.includes(q));
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'success') result = result.filter((l: any) => l.statusCode < 400);
      if (statusFilter === 'error') result = result.filter((l: any) => l.statusCode >= 400);
    }
    if (methodFilter !== 'all') {
      result = result.filter((l: any) => l.method.toUpperCase() === methodFilter.toUpperCase());
    }
    return result;
  }, [filteredByTime, searchQuery, statusFilter, methodFilter]);

  const paginatedLogs = tableLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(tableLogs.length / pageSize);

  const exportCSV = () => {
    const headers = 'Timestamp,Method,Endpoint,Status,Duration(ms),IP\n';
    const csv = tableLogs.map((l: any) => `${l.createdAt},${l.method},${l.endpoint},${l.statusCode},${l.durationMs},${l.ipAddress}`).join('\n');
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_logs_${appId}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center animate-pulse"><Activity className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 text-[13px] text-gray-800 dark:text-gray-200 min-w-0">
      {requestIdFilter && (
        <div data-testid="logs-request-filter" className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[12px]">
          <span>Filtered by request ID</span>
          <code className="font-mono">{requestIdFilter}</code>
          <button type="button" onClick={clearRequestId} className="ml-auto inline-flex items-center gap-1 hover:underline">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> API Requests Analytics
        </h2>
        
        <div className="flex bg-gray-100 dark:bg-[#1a1b1e] p-1 rounded-lg border border-gray-200 dark:border-gray-800">
          {['15m', '1h', '24h', '7d', '30d'].map(r => (
            <button 
              key={r} 
              onClick={() => { setTimeRange(r); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all duration-200 font-medium ${
                timeRange === r 
                ? 'bg-white dark:bg-[#2c2d31] shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: LayoutDashboard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Success Rate', value: `${successRate}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Error Rate (4xx/5xx)', value: `${errorRate}%`, icon: ServerCrash, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Avg. Latency', value: `${avgLatency} ms`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="p-5 rounded-2xl bg-white/50 dark:bg-[#131315]/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800/60 shadow-sm relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-20`}>
              <stat.icon className={`w-16 h-16 ${stat.color} translate-x-4 -translate-y-4`} />
            </div>
            <div className="relative z-10">
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${stat.bg}`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></span>
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#131315] border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Traffic Timeline</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="text-gray-400" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="text-gray-400" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--dc-card)', borderColor: 'var(--dc-border)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" name="Success" />
                <Area type="monotone" dataKey="error" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" name="Error" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Endpoints */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131315] border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Top Endpoints</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEndpoints} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={100} className="text-gray-500" />
                <RechartsTooltip 
                  cursor={{ fill: 'currentColor', opacity: 0.05 }}
                  contentStyle={{ backgroundColor: 'var(--dc-card)', borderColor: 'var(--dc-border)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {topEndpoints.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.8 - (index * 0.1)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Logs Section */}
      <div className="rounded-2xl bg-white dark:bg-[#131315] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3 items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-gray-500" /> Request Logs
          </h3>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search endpoints or IP..." 
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-[#1a1b1e] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-[200px]"
              />
            </div>
            
            <select 
              value={statusFilter} 
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-sm bg-white dark:bg-[#1a1b1e] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="success">Success (2xx, 3xx)</option>
              <option value="error">Errors (4xx, 5xx)</option>
            </select>
            
            <button onClick={exportCSV} className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400" title="Export CSV">
              <ArrowDownToLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-[12.5px] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-white/[0.01] text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {paginatedLogs.map((log: any, i: number) => (
                <motion.tr 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-blue-50/50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 opacity-50" />
                      {format(parseISO(log.createdAt), 'MMM dd, HH:mm:ss')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{log.endpoint}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium border ${getStatusColor(log.statusCode)}`}>
                      {log.statusCode} {getStatusName(log.statusCode)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono ${log.durationMs > 500 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {log.durationMs} ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 opacity-50" /> {log.ipAddress}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <ServerCrash className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>No API requests found for the selected filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.01]">
            <span className="text-gray-500 flex items-center gap-3">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, tableLogs.length)} of {tableLogs.length}
              {hasNextPage && (
                <button 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="text-blue-600 hover:underline disabled:opacity-50 text-[12px] font-medium"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load older logs'}
                </button>
              )}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Log Inspector Slide-over */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedLog(null)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#131315] shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Request Details
                </h3>
                <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 text-[13px]">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-500 mb-1">Timestamp</p><p className="font-medium">{format(parseISO(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p></div>
                  <div><p className="text-gray-500 mb-1">Client IP</p><p className="font-mono">{selectedLog.ipAddress}</p></div>
                  <div><p className="text-gray-500 mb-1">Duration</p><p className="font-mono">{selectedLog.durationMs} ms</p></div>
                  <div><p className="text-gray-500 mb-1">Status</p><span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${getStatusColor(selectedLog.statusCode)}`}>{selectedLog.statusCode}</span></div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#1a1b1e] rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{selectedLog.method}</span>
                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400 break-all">{selectedLog.endpoint}</span>
                  </div>
                </div>

                {/* Real, redacted request data captured by the API gateway (auth headers/secrets are never stored). */}
                <div>
                  <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Request Headers</h4>
                  {selectedLog.requestHeaders ? (
                    <pre className="p-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-[11px] overflow-x-auto text-gray-600 dark:text-gray-400">{prettyJson(selectedLog.requestHeaders)}</pre>
                  ) : (
                    <p className="text-[12px] text-gray-500">Not captured for this request (logged before header capture was enabled).</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Request Body</h4>
                  {selectedLog.requestBody ? (
                    <pre className="p-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-[11px] overflow-x-auto text-gray-600 dark:text-gray-400">{prettyJson(selectedLog.requestBody)}</pre>
                  ) : (
                    <p className="text-[12px] text-gray-500">No JSON body.</p>
                  )}
                  {selectedLog.errorMessage && <p className="mt-2 text-[12px] text-rose-500">{selectedLog.errorMessage}</p>}
                  <p className="mt-2 text-[11px] text-gray-500 italic">Sensitive headers and fields (authorization, cookies, API keys, secrets, tokens) are redacted; bodies are capped at 4 KB. Response bodies are not stored.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

