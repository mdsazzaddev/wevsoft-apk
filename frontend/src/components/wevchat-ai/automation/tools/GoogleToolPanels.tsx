import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Unplug,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Eye,
  PlusCircle,
  PencilLine,
  FilePlus2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, googleOAuthStartUrl, WevGoogleFile, WevToolConnection } from '../../../../lib/automationApi';

export function parseToolConfig(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

const GoogleMark: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * Connected-account card: "Continue with Google" when disconnected; account
 * email, reconnect and disconnect when connected. The consent screen opens in
 * a new tab, so the card re-fetches the tool when the window regains focus.
 */
export const GoogleConnectCard: React.FC<{
  tool: WevToolConnection;
  onChanged: (tool: WevToolConnection) => void;
  needsDocsScope?: boolean;
}> = ({ tool, onChanged, needsDocsScope }) => {
  const config = parseToolConfig(tool.config);
  const connected = !!tool.oauthCredentialId;
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState<boolean | null>(null);

  useEffect(() => {
    automationApi
      .getIntegrations()
      .then((s) => setGoogleReady(s.googleConfigured && s.enabled[tool.kind] !== false))
      .catch(() => setGoogleReady(null));
  }, [tool.kind]);

  const refresh = useCallback(async () => {
    try {
      const all = await automationApi.getTools();
      const fresh = all.find((t) => t.id === tool.id);
      if (fresh) {
        if (fresh.oauthCredentialId && fresh.oauthCredentialId !== tool.oauthCredentialId) toast.success('Google account connected');
        onChanged(fresh);
      }
    } catch {
      /* ignore */
    }
  }, [tool.id, tool.oauthCredentialId, onChanged]);

  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => {
      setWaiting(false);
      refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [waiting, refresh]);

  const disconnect = async () => {
    if (!window.confirm('Disconnect this Google account? The agent will stop using this tool until you reconnect.')) return;
    setBusy(true);
    try {
      onChanged(await automationApi.disconnectGoogle(tool.id));
      toast.success('Disconnected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  const scopeMissing =
    connected && needsDocsScope && typeof config.grantedScopes === 'string' && !config.grantedScopes.includes('/auth/documents');
  const legacyNoScopeInfo = connected && needsDocsScope && typeof config.grantedScopes !== 'string';

  if (googleReady === false && !connected) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">Google sign-in isn’t available yet</p>
          The platform admin hasn’t enabled this integration or added Google OAuth credentials.
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-border flex items-center justify-center shrink-0">
            <GoogleMark size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Connect your Google account</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sign in with Google to let this tool use your files. You can disconnect any time.
            </p>
          </div>
        </div>
        <a
          href={googleOAuthStartUrl(tool.id)}
          target="_blank"
          rel="noreferrer"
          onClick={() => setWaiting(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1f1f1f] border border-border text-sm font-semibold shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
        >
          <GoogleMark size={16} /> Continue with Google <ExternalLink size={12} className="opacity-60" />
        </a>
        {waiting && (
          <button onClick={refresh} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <Loader2 size={12} className="animate-spin" /> Waiting for Google… click here once you’re done
          </button>
        )}
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <ShieldCheck size={11} /> Tokens are stored encrypted on our servers and never shared with the AI model.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center shrink-0">
          <GoogleMark size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CheckCircle2 size={14} className="text-emerald-500" /> Connected
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{config.connectedEmail || 'Google account'}</p>
        </div>
        <a
          href={googleOAuthStartUrl(tool.id)}
          target="_blank"
          rel="noreferrer"
          onClick={() => setWaiting(true)}
          title="Reconnect / switch account"
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} />
        </a>
        <button
          onClick={disconnect}
          disabled={busy}
          title="Disconnect"
          className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
        </button>
      </div>
      {(scopeMissing || legacyNoScopeInfo) && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          {scopeMissing
            ? 'This account was connected without Google Docs access. Reconnect to grant it.'
            : 'If Docs actions fail, reconnect this account to grant Google Docs access.'}
        </p>
      )}
    </div>
  );
};

/** Searchable list of the connected account's Sheets or Docs. */
export const GoogleFilePicker: React.FC<{
  toolId: string;
  type: 'sheets' | 'docs';
  selectedId?: string;
  selectedName?: string;
  onPick: (file: WevGoogleFile) => void;
}> = ({ toolId, type, selectedId, selectedName, onPick }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [files, setFiles] = useState<WevGoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const Icon = type === 'sheets' ? FileSpreadsheet : FileText;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setFiles(await automationApi.listGoogleFiles(toolId, type, q || undefined));
      } catch (err: any) {
        toast.error(err.message || 'Could not list files');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, q, toolId, type]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${type === 'sheets' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {selectedName || (selectedId ? selectedId : `Choose a ${type === 'sheets' ? 'spreadsheet' : 'document'}`)}
          </p>
          <p className="text-[11px] text-muted-foreground">{selectedId ? 'Click to change' : 'From your connected Google Drive'}</p>
        </div>
        <span className="text-xs font-semibold text-primary">{open ? 'Close' : 'Browse'}</span>
      </button>
      {open && (
        <div className="border-t border-border bg-muted/10">
          <div className="p-2">
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3">
              <Search size={13} className="text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name"
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
              {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {!loading && files.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">No files found.</p>}
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onPick(f);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-muted/40 ${f.id === selectedId ? 'text-primary font-semibold' : 'text-foreground'}`}
              >
                <Icon size={14} className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{f.name}</span>
                {f.modifiedTime && <span className="text-[10px] text-muted-foreground shrink-0">{new Date(f.modifiedTime).toLocaleDateString()}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

type ActionDef = { id: string; label: string; hint: string; icon: React.ComponentType<{ size?: number; className?: string }> };

const SHEET_ACTIONS: ActionDef[] = [
  { id: 'read', label: 'Read', hint: 'Look up rows (prices, stock, status)', icon: Eye },
  { id: 'append', label: 'Append row', hint: 'Add new rows (orders, leads)', icon: PlusCircle },
  { id: 'update', label: 'Update cells', hint: 'Change existing rows', icon: PencilLine },
];
const DOC_ACTIONS: ActionDef[] = [
  { id: 'read', label: 'Read', hint: 'Use the doc as knowledge', icon: Eye },
  { id: 'append', label: 'Append', hint: 'Add notes to the end', icon: PlusCircle },
  { id: 'create', label: 'Create docs', hint: 'Make new documents', icon: FilePlus2 },
];

export const AllowedActionsPicker: React.FC<{ kind: 'GOOGLE_SHEETS' | 'GOOGLE_DOCS'; value: string[]; onChange: (v: string[]) => void }> = ({
  kind,
  value,
  onChange,
}) => {
  const actions = kind === 'GOOGLE_SHEETS' ? SHEET_ACTIONS : DOC_ACTIONS;
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">What can the agent do?</label>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {actions.map((a) => {
          const on = value.includes(a.id);
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => onChange(on ? value.filter((v) => v !== a.id) : [...value, a.id])}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                on ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/30 opacity-70'
              }`}
            >
              <Icon size={14} className={on ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs font-semibold text-foreground">{a.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{a.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/80 mt-1.5">On each agent, “Info” enables reading and “Save” enables writing.</p>
    </div>
  );
};

function defaultActions(kind: 'GOOGLE_SHEETS' | 'GOOGLE_DOCS', config: Record<string, any>): string[] {
  if (Array.isArray(config.allowedActions)) return config.allowedActions;
  return kind === 'GOOGLE_SHEETS' ? ['read', 'append'] : ['read'];
}

export const GoogleSheetsPanel: React.FC<{ tool: WevToolConnection; onChanged: (t: WevToolConnection) => void }> = ({ tool, onChanged }) => {
  const config = useMemo(() => parseToolConfig(tool.config), [tool.config]);
  const [range, setRange] = useState(config.range || config.sheetName || 'Sheet1');
  const [manualId, setManualId] = useState(config.spreadsheetId || '');
  const [tabs, setTabs] = useState<string[]>([]);
  const connected = !!tool.oauthCredentialId;

  const save = async (patch: Record<string, any>) => {
    try {
      const updated = await automationApi.updateTool(tool.id, { config: { ...config, ...patch } });
      onChanged({ ...tool, ...updated });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  useEffect(() => {
    if (!connected || !config.spreadsheetId) return;
    automationApi
      .getSheetTabs(tool.id, config.spreadsheetId)
      .then((r) => setTabs(r.tabs.map((t) => t.title).filter(Boolean)))
      .catch(() => setTabs([]));
  }, [connected, config.spreadsheetId, tool.id]);

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <GoogleConnectCard tool={tool} onChanged={onChanged} />
      {connected && (
        <>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Spreadsheet</label>
            <div className="mt-1.5">
              <GoogleFilePicker
                toolId={tool.id}
                type="sheets"
                selectedId={config.spreadsheetId}
                selectedName={config.spreadsheetName}
                onPick={(f) => {
                  setManualId(f.id);
                  save({ spreadsheetId: f.id, spreadsheetName: f.name, spreadsheetUrl: f.webViewLink });
                }}
              />
            </div>
            <details className="mt-1.5">
              <summary className="text-[11px] text-muted-foreground cursor-pointer">Paste an ID instead</summary>
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onBlur={() => manualId.trim() !== (config.spreadsheetId || '') && save({ spreadsheetId: manualId.trim(), spreadsheetName: null })}
                placeholder="ID between /d/ and /edit in the sheet URL"
                className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </details>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Sheet / Range</label>
            {tabs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setRange(t);
                      save({ range: t });
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      range === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              onBlur={() => range.trim() !== (config.range || '') && save({ range: range.trim() })}
              placeholder='e.g. "Sheet1" or "Sheet1!A:D"'
              className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <AllowedActionsPicker kind="GOOGLE_SHEETS" value={defaultActions('GOOGLE_SHEETS', config)} onChange={(v) => save({ allowedActions: v })} />
          {config.spreadsheetUrl && (
            <a href={config.spreadsheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open in Google Sheets <ExternalLink size={11} />
            </a>
          )}
        </>
      )}
    </div>
  );
};

export const GoogleDocsPanel: React.FC<{ tool: WevToolConnection; onChanged: (t: WevToolConnection) => void }> = ({ tool, onChanged }) => {
  const config = useMemo(() => parseToolConfig(tool.config), [tool.config]);
  const connected = !!tool.oauthCredentialId;
  const actions = defaultActions('GOOGLE_DOCS', config);

  const save = async (patch: Record<string, any>) => {
    try {
      const updated = await automationApi.updateTool(tool.id, { config: { ...config, ...patch } });
      onChanged({ ...tool, ...updated });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <GoogleConnectCard tool={tool} onChanged={onChanged} needsDocsScope />
      {connected && (
        <>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Document</label>
            <p className="text-[11px] text-muted-foreground/70 mb-1.5">Used for Read and Append. Not needed if the agent only creates new docs.</p>
            <GoogleFilePicker
              toolId={tool.id}
              type="docs"
              selectedId={config.documentId}
              selectedName={config.documentName}
              onPick={(f) => save({ documentId: f.id, documentName: f.name, documentUrl: f.webViewLink })}
            />
          </div>
          <AllowedActionsPicker kind="GOOGLE_DOCS" value={actions} onChange={(v) => save({ allowedActions: v })} />
          {config.documentUrl && (
            <a href={config.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open in Google Docs <ExternalLink size={11} />
            </a>
          )}
        </>
      )}
    </div>
  );
};
