import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Wrench, ChevronRight, X, Loader2, BookOpen, FileText, FileType2, Table2, Sheet, HardDrive, Webhook, ClipboardList, Inbox, Lock, type LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevToolConnection, WevToolKind, WevIntegrationStatus } from '../../../lib/automationApi';
import { ToolDetailPanel } from './tools/ToolDetailPanel';

type Category = 'Google' | 'Knowledge' | 'Capture & actions';

const KIND_OPTIONS: { kind: WevToolKind; label: string; icon: LucideIcon; blurb: string; category: Category; google?: boolean }[] = [
  { kind: 'GOOGLE_SHEETS', label: 'Google Sheets', icon: Sheet, blurb: 'Read, append, or update rows in a spreadsheet', category: 'Google', google: true },
  { kind: 'GOOGLE_DOCS', label: 'Google Docs', icon: FileType2, blurb: 'Read a Doc as knowledge, append notes, create docs', category: 'Google', google: true },
  { kind: 'GOOGLE_DRIVE', label: 'Google Drive', icon: HardDrive, blurb: 'Read a Doc, Sheet, or file from Drive', category: 'Google', google: true },
  { kind: 'DOCUMENTS', label: 'File uploads', icon: FileText, blurb: 'PDF, Word, Excel, CSV, or text as knowledge', category: 'Knowledge' },
  { kind: 'CUSTOM_TABLE', label: 'Custom Table', icon: Table2, blurb: 'A simple table the agent can read and write', category: 'Knowledge' },
  { kind: 'WIKIPEDIA', label: 'Wikipedia', icon: BookOpen, blurb: 'Look up real-world facts automatically', category: 'Knowledge' },
  { kind: 'SAVE_RECORDS', label: 'Save Records', icon: ClipboardList, blurb: 'Capture orders, leads, bookings from chats', category: 'Capture & actions' },
  { kind: 'WEBHOOK', label: 'Webhook', icon: Webhook, blurb: 'Notify an external system', category: 'Capture & actions' },
];
const CATEGORIES: Category[] = ['Google', 'Capture & actions', 'Knowledge'];

const KIND_ICON: Record<string, LucideIcon> = Object.fromEntries(KIND_OPTIONS.map((o) => [o.kind, o.icon]));
const GOOGLE_KINDS = new Set<string>(['GOOGLE_SHEETS', 'GOOGLE_DOCS', 'GOOGLE_DRIVE']);

function toolSubtitle(tool: WevToolConnection): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  if (GOOGLE_KINDS.has(tool.kind)) {
    return tool.oauthCredentialId ? { text: 'Connected', tone: 'ok' } : { text: 'Needs Google sign-in', tone: 'warn' };
  }
  switch (tool.kind) {
    case 'DOCUMENTS':
      return { text: `${tool._count?.documents ?? 0} file${tool._count?.documents === 1 ? '' : 's'}`, tone: 'muted' };
    case 'CUSTOM_TABLE':
      return { text: `${tool.table?._count?.rows ?? 0} row${tool.table?._count?.rows === 1 ? '' : 's'}`, tone: 'muted' };
    case 'SAVE_RECORDS':
      return { text: 'Record keeping', tone: 'muted' };
    case 'WEBHOOK':
      return { text: 'Outbound webhook', tone: 'muted' };
    default:
      return { text: 'Wikipedia lookup', tone: 'muted' };
  }
}

export const ToolLibraryView: React.FC<{ onOpenRecords?: () => void }> = ({ onOpenRecords }) => {
  const [integrations, setIntegrations] = useState<WevIntegrationStatus | null>(null);
  const [tools, setTools] = useState<WevToolConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKind, setNewKind] = useState<WevToolKind>('GOOGLE_SHEETS');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    load();
    automationApi.getIntegrations().then(setIntegrations).catch(() => setIntegrations(null));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await automationApi.getTools();
      setTools(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast.error('A label is required.');
      return;
    }
    setCreating(true);
    try {
      const tool = await automationApi.createTool({ kind: newKind, label: newLabel.trim(), scope: 'USER' });
      setTools((prev) => [tool, ...prev]);
      setShowCreate(false);
      setNewLabel('');
      setSelectedId(tool.id);
      toast.success('Tool added to your library');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tool');
    } finally {
      setCreating(false);
    }
  };

  const isEnabled = (kind: string) => integrations?.enabled?.[kind] !== false;
  const googleReady = integrations ? integrations.googleConfigured : true;
  const openCreate = (kind?: WevToolKind) => {
    const first = kind || KIND_OPTIONS.find((o) => isEnabled(o.kind))?.kind || 'WIKIPEDIA';
    setNewKind(first);
    setNewLabel('');
    setShowCreate(true);
  };
  const hasRecordsTool = tools.some((t) => t.kind === 'SAVE_RECORDS');

  const selected = tools.find((t) => t.id === selectedId) || null;

  if (selected) {
    return (
      <ToolDetailPanel
        tool={selected}
        onBack={() => setSelectedId(null)}
        onDeleted={(id) => {
          setTools((prev) => prev.filter((t) => t.id !== id));
          setSelectedId(null);
        }}
        onChanged={(t) => setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)))}
        onOpenRecords={onOpenRecords}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Connect apps and data once, then attach them to any agent. On each agent choose Info (read while chatting) and/or Save (write rows, notes, records).
          </p>
          {onOpenRecords && hasRecordsTool && (
            <button
              onClick={onOpenRecords}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Inbox size={13} /> Records
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin" size={22} />
          </div>
        )}

        {!loading && tools.length === 0 && (
          <div className="space-y-4 pt-1">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {KIND_OPTIONS.filter((o) => o.category === cat).map((opt) => {
                    const Icon = opt.icon;
                    const off = !isEnabled(opt.kind);
                    return (
                      <button
                        key={opt.kind}
                        disabled={off}
                        onClick={() => openCreate(opt.kind)}
                        className="flex items-start gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            {opt.label}
                            {off && <Lock size={11} className="text-muted-foreground" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug">{off ? 'Not available right now' : opt.blurb}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tools.map((tool) => {
          const Icon = KIND_ICON[tool.kind] || Wrench;
          const sub = toolSubtitle(tool);
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedId(tool.id)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{tool.label}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                  <span
                    className={
                      sub.tone === 'ok'
                        ? 'inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium'
                        : sub.tone === 'warn'
                          ? 'inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium'
                          : ''
                    }
                  >
                    {sub.tone !== 'muted' && <span className={`w-1.5 h-1.5 rounded-full ${sub.tone === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />}
                    {sub.text}
                  </span>
                  <span>·</span>
                  <span>
                    {tool._count?.agentTools ?? 0} agent{tool._count?.agentTools === 1 ? '' : 's'}
                  </span>
                  {!isEnabled(tool.kind) && <span className="text-red-500 font-medium">· Disabled by admin</span>}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <button
          onClick={() => openCreate()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Tool
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">Add Tool</h4>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="space-y-3 max-h-[45vh] overflow-y-auto -mx-1 px-1">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
                      {KIND_OPTIONS.filter((o) => o.category === cat).map((opt) => {
                        const Icon = opt.icon;
                        const off = !isEnabled(opt.kind);
                        return (
                          <button
                            key={opt.kind}
                            disabled={off}
                            onClick={() => setNewKind(opt.kind)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              newKind === opt.kind ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                            }`}
                          >
                            <Icon size={16} className={newKind === opt.kind ? 'text-primary' : 'text-muted-foreground'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                              <p className="text-[11px] text-muted-foreground">{off ? 'Disabled by the administrator' : opt.blurb}</p>
                            </div>
                            {off && <Lock size={12} className="text-muted-foreground" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {GOOGLE_KINDS.has(newKind) && !googleReady && (
                  <p className="text-[11px] p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Google sign-in isn’t set up by the administrator yet. You can add the tool now and connect later.
                  </p>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Label</label>
                  <input
                    autoFocus
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder={newKind === 'SAVE_RECORDS' ? 'e.g. "Orders"' : newKind === 'GOOGLE_SHEETS' ? 'e.g. "Inventory sheet"' : 'e.g. "Product FAQ"'}
                    className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />} Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
