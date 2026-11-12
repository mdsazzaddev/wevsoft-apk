import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Download,
  Loader2,
  Inbox,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Bot,
  Sheet,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  automationApi,
  WevAgent,
  WevRecordFilters,
  WevRecordStatus,
  WevSavedRecord,
  WevSavedRecordDetail,
  WevToolConnection,
  WevToolRunEntry,
} from '../../../lib/automationApi';

const STATUS_META: Record<WevRecordStatus, { label: string; cls: string; dot: string }> = {
  NEW: { label: 'New', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20', dot: 'bg-sky-500' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20', dot: 'bg-violet-500' },
  DONE: { label: 'Done', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
};
const STATUSES = Object.keys(STATUS_META) as WevRecordStatus[];
const PAGE_SIZE = 25;

function parseData(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw || '{}') || {};
  } catch {
    return {};
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const StatusPill: React.FC<{ status: WevRecordStatus }> = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.NEW;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

/** Browse records captured by Save Records tools, plus an audit trail of tool runs. */
export const RecordsView: React.FC = () => {
  const [tab, setTab] = useState<'records' | 'runs'>('records');
  const [agents, setAgents] = useState<WevAgent[]>([]);
  const [tools, setTools] = useState<WevToolConnection[]>([]);
  const [filters, setFilters] = useState<WevRecordFilters>({ page: 1, pageSize: PAGE_SIZE, status: '' });
  const [qInput, setQInput] = useState('');
  const [items, setItems] = useState<WevSavedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  useEffect(() => {
    automationApi.getAgents().then(setAgents).catch(() => undefined);
    automationApi
      .getTools()
      .then((t) => setTools(t.filter((x) => x.kind === 'SAVE_RECORDS')))
      .catch(() => undefined);
  }, []);

  // debounce search box
  useEffect(() => {
    const h = setTimeout(() => setFilters((f) => (f.q === (qInput.trim() || undefined) ? f : { ...f, q: qInput.trim() || undefined, page: 1 })), 300);
    return () => clearTimeout(h);
  }, [qInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automationApi.getRecords(filters);
      setItems(res.items);
      setTotal(res.total);
      setCounts(res.counts || {});
    } catch (err: any) {
      toast.error(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change; loading flag is intentional
    if (tab === 'records') void load();
  }, [load, tab]);

  const set = (patch: Partial<WevRecordFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const allCount = useMemo(() => Object.values(counts).reduce((a, b) => a + (b || 0), 0), [counts]);
  const page = filters.page || 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name || null;

  const doExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try {
      await automationApi.exportRecords(format, { ...filters, page: undefined, pageSize: undefined });
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-4 sm:px-6 pt-3 flex gap-1 border-b border-border">
        {(
          [
            ['records', 'Records', ClipboardList],
            ['runs', 'Tool activity', Activity],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'runs' ? (
        <ToolRunsList agents={agents} />
      ) : (
        <>
          <div className="p-4 sm:px-6 space-y-3 border-b border-border">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="Search name, phone, item…"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <ExportMenu exporting={exporting} onExport={doExport} disabled={total === 0} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <Chip active={!filters.status} onClick={() => set({ status: '' })} label="All" count={allCount} />
              {STATUSES.map((s) => (
                <Chip key={s} active={filters.status === s} onClick={() => set({ status: s })} label={STATUS_META[s].label} count={counts[s] || 0} />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={filters.agentId || ''} onChange={(e) => set({ agentId: e.target.value || undefined })} className={selectCls}>
                <option value="">All agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select value={filters.toolId || ''} onChange={(e) => set({ toolId: e.target.value || undefined })} className={selectCls}>
                <option value="">All record types</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input type="date" value={filters.from || ''} onChange={(e) => set({ from: e.target.value || undefined })} className={selectCls} title="From" />
              <input type="date" value={filters.to || ''} onChange={(e) => set({ to: e.target.value || undefined })} className={selectCls} title="To" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="animate-spin" size={22} />
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
                <Inbox size={36} className="opacity-30" />
                <p className="text-sm max-w-xs">
                  No records yet. Attach a <b>Save Records</b> tool to an agent with Save turned on — orders, leads and bookings will appear here.
                </p>
              </div>
            )}
            {!loading &&
              items.map((r) => {
                const data = parseData(r.data);
                const preview = Object.entries(data)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .slice(0, 3)
                  .map(([, v]) => String(v))
                  .join(' · ');
                return (
                  <button
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                      {(r.contactName || r.title || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">{r.title || r.contactName || 'Untitled record'}</p>
                        <StatusPill status={r.status} />
                        {r.sheetSyncStatus === 'ERROR' && <AlertTriangle size={12} className="text-amber-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{preview || r.summary || '—'}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        {r.template.toLowerCase()} · {r.contactName || 'Unknown contact'}
                        {agentName(r.agentId) ? ` · via ${agentName(r.agentId)}` : ''} · {timeAgo(r.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>

          {total > PAGE_SIZE && (
            <div className="px-4 sm:px-6 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => set({ page: page - 1 })} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= pages} onClick={() => set({ page: page + 1 })} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {openId && (
          <RecordDrawer
            id={openId}
            onClose={() => setOpenId(null)}
            onUpdated={(rec) => {
              setItems((prev) => prev.map((x) => (x.id === rec.id ? { ...x, ...rec } : x)));
              void load();
            }}
            onDeleted={(id) => {
              setItems((prev) => prev.filter((x) => x.id !== id));
              setOpenId(null);
              void load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const selectCls = 'w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40';

const Chip: React.FC<{ active: boolean; onClick: () => void; label: string; count: number }> = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
      active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
    }`}
  >
    {label}
    <span className={`text-[10px] ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
  </button>
);

const ExportMenu: React.FC<{ exporting: 'csv' | 'xlsx' | null; onExport: (f: 'csv' | 'xlsx') => void; disabled: boolean }> = ({
  exporting,
  onExport,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        disabled={disabled || !!exporting}
        onClick={() => setOpen((o) => !o)}
        className="h-full inline-flex items-center gap-1.5 px-3 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
      >
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-20 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden" onMouseLeave={() => setOpen(false)}>
          {(
            [
              ['xlsx', 'Excel (.xlsx)'],
              ['csv', 'CSV (.csv)'],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => {
                setOpen(false);
                onExport(f);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RecordDrawer: React.FC<{
  id: string;
  onClose: () => void;
  onUpdated: (r: WevSavedRecord) => void;
  onDeleted: (id: string) => void;
}> = ({ id, onClose, onUpdated, onDeleted }) => {
  const [rec, setRec] = useState<WevSavedRecordDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    automationApi
      .getRecord(id)
      .then((r) => {
        setRec(r);
        setNotes(r.notes || '');
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load record');
        onClose();
      });
  }, [id, onClose]);

  const patch = async (body: { status?: WevRecordStatus; notes?: string }) => {
    if (!rec) return;
    setBusy(true);
    try {
      const updated = await automationApi.updateRecord(rec.id, body);
      setRec({ ...rec, ...updated });
      onUpdated(updated);
      toast.success('Record updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!rec || !window.confirm('Delete this record? This cannot be undone.')) return;
    setBusy(true);
    try {
      await automationApi.deleteRecord(rec.id);
      toast.success('Record deleted');
      onDeleted(rec.id);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      setBusy(false);
    }
  };

  const data = rec ? parseData(rec.data) : {};
  const fieldList = rec
    ? [...rec.fields, ...Object.keys(data).filter((k) => !rec.fields.some((f) => f.key === k)).map((k) => ({ key: k, label: k, type: 'text' }))]
    : [];

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{rec?.title || rec?.contactName || 'Record'}</p>
            {rec && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {rec.toolLabel || rec.template} · {new Date(rec.createdAt).toLocaleString()}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {!rec ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => rec.status !== s && patch({ status: s })}
                    className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                      rec.status === s ? STATUS_META[s].cls + ' ring-2 ring-primary/30' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User size={12} /> {rec.contactName || 'Unknown contact'}
              </span>
              {rec.agentName && (
                <span className="inline-flex items-center gap-1">
                  <Bot size={12} /> {rec.agentName}
                </span>
              )}
              {rec.sheetSyncStatus && (
                <span
                  className={`inline-flex items-center gap-1 ${rec.sheetSyncStatus === 'ERROR' ? 'text-amber-600' : 'text-emerald-600'}`}
                  title={rec.sheetSyncError || ''}
                >
                  <Sheet size={12} /> {rec.sheetSyncStatus === 'ERROR' ? 'Sheet sync failed' : 'Synced to sheet'}
                  {rec.sheetSyncStatus !== 'ERROR' && <CheckCircle2 size={11} />}
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {fieldList.map((f) => {
                const v = data[f.key];
                const empty = v === null || v === undefined || v === '';
                return (
                  <div key={f.key} className="flex gap-3 px-3 py-2.5">
                    <span className="w-28 shrink-0 text-[11px] font-semibold text-muted-foreground">{f.label}</span>
                    <span className={`flex-1 text-sm break-words whitespace-pre-wrap ${empty ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                      {empty ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                    </span>
                  </div>
                );
              })}
            </div>

            {rec.summary && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Agent summary</p>
                <p className="text-sm text-foreground bg-muted/30 rounded-xl p-3 whitespace-pre-wrap">{rec.summary}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Your notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Private notes for your team"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              />
              {notes !== (rec.notes || '') && (
                <button
                  disabled={busy}
                  onClick={() => patch({ notes })}
                  className="mt-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  Save notes
                </button>
              )}
            </div>
          </div>
        )}

        {rec && (
          <div className="p-4 border-t border-border">
            <button
              disabled={busy}
              onClick={remove}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 size={13} /> Delete record
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ToolRunsList: React.FC<{ agents: WevAgent[] }> = ({ agents }) => {
  const [items, setItems] = useState<WevToolRunEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'' | 'SUCCESS' | 'ERROR'>('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const res = await automationApi.getToolRuns({ status: status || undefined, cursor: next, limit: 30 });
        setItems((prev) => (next ? [...prev, ...res.items] : res.items));
        setCursor(res.nextCursor);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change; loading flag is intentional
    void fetchPage();
  }, [fetchPage]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-2">
      <div className="flex gap-1.5">
        <Chip active={status === ''} onClick={() => setStatus('')} label="All" count={status === '' ? items.length : 0} />
        <Chip active={status === 'SUCCESS'} onClick={() => setStatus('SUCCESS')} label="Succeeded" count={status === 'SUCCESS' ? items.length : 0} />
        <Chip active={status === 'ERROR'} onClick={() => setStatus('ERROR')} label="Failed" count={status === 'ERROR' ? items.length : 0} />
      </div>
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
          <Activity size={32} className="opacity-30" />
          <p className="text-sm">No tool activity yet.</p>
        </div>
      )}
      {items.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card">
          <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
            <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-foreground truncate">{r.functionName}</p>
              <p className="text-[10px] text-muted-foreground">
                {agents.find((a) => a.id === r.agentId)?.name || 'Agent'} · {r.latencyMs}ms · {timeAgo(r.createdAt)}
              </p>
            </div>
          </button>
          {expanded === r.id && (
            <div className="px-3 pb-3 space-y-2">
              {r.errorMessage && <p className="text-[11px] text-red-600 break-words">{r.errorMessage}</p>}
              {r.input && <pre className="text-[10px] bg-muted/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">{r.input}</pre>}
              {r.output && <pre className="text-[10px] bg-muted/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">{r.output}</pre>}
            </div>
          )}
        </div>
      ))}
      {loading && (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="animate-spin" size={18} />
        </div>
      )}
      {!loading && cursor && (
        <button onClick={() => fetchPage(cursor)} className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl">
          Load more
        </button>
      )}
    </div>
  );
};
