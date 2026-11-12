import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Loader2, Trash2, Upload, FileText, Plus, X, Table2, BookOpen, Sheet, HardDrive, Webhook, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  automationApi,
  WevToolConnection,
  WevToolDocument,
  WevCustomTable,
  WevTableColumn,
} from '../../../../lib/automationApi';
import { GoogleConnectCard, GoogleSheetsPanel, GoogleDocsPanel } from './GoogleToolPanels';
import { SaveRecordsPanel } from './SaveRecordsPanel';

interface ToolDetailPanelProps {
  tool: WevToolConnection;
  onBack: () => void;
  onDeleted: (id: string) => void;
  /** Called with the fresh tool after config / connection changes so the list stays in sync. */
  onChanged?: (tool: WevToolConnection) => void;
  /** Opens the Saved Records browser (SAVE_RECORDS tools). */
  onOpenRecords?: () => void;
}

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; blurb: string }> = {
  WIKIPEDIA: { label: 'Wikipedia', icon: BookOpen, blurb: 'Looks up real-world facts on Wikipedia relevant to the incoming message.' },
  DOCUMENTS: { label: 'Documents', icon: FileText, blurb: 'Upload PDFs, Word docs, Excel/CSV sheets, or text files for the agent to use as knowledge.' },
  CUSTOM_TABLE: { label: 'Custom Table', icon: Table2, blurb: 'A simple spreadsheet-like table the agent can reference when replying.' },
  GOOGLE_SHEETS: { label: 'Google Sheets', icon: Sheet, blurb: 'Pick a spreadsheet, then choose whether the agent can read, append, or update rows.' },
  GOOGLE_DOCS: { label: 'Google Docs', icon: FileText, blurb: 'Read a Doc as knowledge, append notes to it, or create new docs.' },
  SAVE_RECORDS: { label: 'Save Records', icon: ClipboardList, blurb: 'After a chat, the agent saves a structured record (order, lead, booking…) you can browse and export.' },
  GOOGLE_DRIVE: { label: 'Google Drive', icon: HardDrive, blurb: 'Reads a Doc, Sheet, or file from Drive as reference material.' },
  WEBHOOK: { label: 'Webhook', icon: Webhook, blurb: 'Lets the agent notify an external system with a short message.' },
};

export const ToolDetailPanel: React.FC<ToolDetailPanelProps> = ({ tool, onBack, onDeleted, onChanged: onChangedProp, onOpenRecords }) => {
  const onChanged = React.useCallback((t: WevToolConnection) => onChangedProp?.(t), [onChangedProp]);
  const meta = KIND_META[tool.kind] || KIND_META.WIKIPEDIA;
  const Icon = meta.icon;
  const [label, setLabel] = useState(tool.label);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async () => {
    if (!label.trim() || label.trim() === tool.label) return;
    setSaving(true);
    try {
      await automationApi.updateTool(tool.id, { label: label.trim() });
      toast.success('Renamed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${tool.label}"? This removes it from every agent it's attached to.`)) return;
    setDeleting(true);
    try {
      await automationApi.deleteTool(tool.id);
      toast.success('Tool deleted');
      onDeleted(tool.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tool');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon size={15} />
        </div>
        <h3 className="font-bold text-sm text-foreground truncate flex-1">{tool.label}</h3>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          title="Delete tool"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <p className="text-xs text-muted-foreground">{meta.blurb}</p>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          {saving && <p className="text-[11px] text-muted-foreground mt-1">Saving…</p>}
        </div>

        {tool.kind === 'DOCUMENTS' && <DocumentsPanel toolId={tool.id} />}
        {tool.kind === 'CUSTOM_TABLE' && <CustomTablePanel toolId={tool.id} />}
        {tool.kind === 'GOOGLE_SHEETS' && <GoogleSheetsPanel tool={tool} onChanged={onChanged} />}
        {tool.kind === 'GOOGLE_DOCS' && <GoogleDocsPanel tool={tool} onChanged={onChanged} />}
        {tool.kind === 'GOOGLE_DRIVE' && <GoogleDrivePanel tool={tool} onChanged={onChanged} />}
        {tool.kind === 'SAVE_RECORDS' && <SaveRecordsPanel tool={tool} onChanged={onChanged} onOpenRecords={onOpenRecords} />}
        {tool.kind === 'WEBHOOK' && <WebhookPanel toolId={tool.id} config={tool.config} />}
      </div>
    </div>
  );
};

function parseConfig(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

const GoogleDrivePanel: React.FC<{ tool: WevToolConnection; onChanged: (t: WevToolConnection) => void }> = ({ tool, onChanged }) => {
  const config = parseConfig(tool.config);
  const [fileId, setFileId] = useState(config.fileId || '');

  const save = async () => {
    try {
      await automationApi.updateTool(tool.id, { config: { ...config, fileId: fileId.trim() } });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <GoogleConnectCard tool={tool} onChanged={onChanged} />
      <div>
        <label className="text-xs font-semibold text-muted-foreground">File ID</label>
        <p className="text-[11px] text-muted-foreground/70 mb-1.5">The long ID in the file's URL, between /d/ and /edit or /view.</p>
        <input
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          onBlur={save}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>
    </div>
  );
};

const WebhookPanel: React.FC<{ toolId: string; config: string }> = ({ toolId, config: rawConfig }) => {
  const config = parseConfig(rawConfig);
  const [url, setUrl] = useState(config.url || '');
  const [method, setMethod] = useState(config.method || 'POST');

  const save = async (next: { url?: string; method?: string }) => {
    try {
      await automationApi.updateTool(toolId, { config: { ...config, url: (next.url ?? url).trim(), method: next.method ?? method } });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Webhook URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => save({})}
          placeholder="https://your-service.example.com/hooks/wevsoft"
          className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Method</label>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            save({ method: e.target.value });
          }}
          className="mt-1.5 w-32 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        The agent will send <code>{'{ message, source, toolLabel }'}</code> as JSON when it decides this webhook is relevant.
      </p>
    </div>
  );
};

const DocumentsPanel: React.FC<{ toolId: string }> = ({ toolId }) => {
  const [docs, setDocs] = useState<WevToolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    automationApi
      .getToolDocuments(toolId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [toolId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const doc = await automationApi.uploadToolDocument(toolId, file);
      setDocs((prev) => [doc, ...prev]);
      if (doc.status === 'FAILED') {
        toast.error((doc as any).extractError || `Couldn't read text from "${doc.fileName}"`);
      } else {
        toast.success(`"${doc.fileName}" added`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await automationApi.deleteToolDocument(toolId, docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="pt-2 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Documents</p>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {uploading ? 'Extracting text…' : 'Upload PDF, Word, Excel, CSV, or text file'}
      </button>

      {loading ? null : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 mt-3">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2 mt-3">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border">
              <FileText size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {doc.status === 'READY' ? 'Ready' : doc.status === 'FAILED' ? 'Failed to extract text' : 'Processing…'}
                </p>
              </div>
              <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomTablePanel: React.FC<{ toolId: string }> = ({ toolId }) => {
  const [table, setTable] = useState<WevCustomTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<WevTableColumn[]>([]);

  useEffect(() => {
    automationApi
      .getToolTable(toolId)
      .then((t) => {
        setTable(t);
        try {
          setColumns(JSON.parse(t.columns || '[]'));
        } catch {
          setColumns([]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [toolId]);

  const rowData = (row: { data: string }): Record<string, any> => {
    try {
      return JSON.parse(row.data || '{}');
    } catch {
      return {};
    }
  };

  const saveColumns = async (next: WevTableColumn[]) => {
    setColumns(next);
    try {
      const updated = await automationApi.updateToolTable(toolId, { columns: next });
      setTable(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update columns');
    }
  };

  const addColumn = () => {
    const key = `col_${Date.now()}`;
    saveColumns([...columns, { key, label: `Column ${columns.length + 1}`, type: 'text' }]);
  };

  const removeColumn = (key: string) => {
    saveColumns(columns.filter((c) => c.key !== key));
  };

  const renameColumn = (key: string, label: string) => {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, label } : c)));
  };

  const addRow = async () => {
    if (!table) return;
    try {
      const row = await automationApi.addTableRow(toolId, {});
      setTable({ ...table, rows: [...table.rows, row] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add row');
    }
  };

  const updateCell = async (rowId: string, key: string, value: string) => {
    if (!table) return;
    const row = table.rows.find((r) => r.id === rowId);
    if (!row) return;
    const data = { ...rowData(row), [key]: value };
    setTable({ ...table, rows: table.rows.map((r) => (r.id === rowId ? { ...r, data: JSON.stringify(data) } : r)) });
    try {
      await automationApi.updateTableRow(toolId, rowId, data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save cell');
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!table) return;
    try {
      await automationApi.deleteTableRow(toolId, rowId);
      setTable({ ...table, rows: table.rows.filter((r) => r.id !== rowId) });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete row');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  if (!table) return null;

  return (
    <div className="pt-2 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground">Table Data</p>
        <button onClick={addColumn} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
          <Plus size={12} /> Column
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              {columns.map((col) => (
                <th key={col.key} className="p-2 text-left">
                  <div className="flex items-center gap-1">
                    <input
                      value={col.label}
                      onChange={(e) => renameColumn(col.key, e.target.value)}
                      onBlur={() => saveColumns(columns)}
                      className="w-24 bg-transparent font-semibold text-xs outline-none border-b border-transparent focus:border-primary/50"
                    />
                    <button onClick={() => removeColumn(col.key)} className="text-muted-foreground hover:text-red-500">
                      <X size={11} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => {
              const data = rowData(row);
              return (
                <tr key={row.id} className="border-t border-border">
                  {columns.map((col) => (
                    <td key={col.key} className="p-1.5">
                      <input
                        defaultValue={data[col.key] ?? ''}
                        onBlur={(e) => updateCell(row.id, col.key, e.target.value)}
                        className="w-full bg-transparent text-xs outline-none px-1.5 py-1 rounded hover:bg-muted/30 focus:bg-muted/50"
                      />
                    </td>
                  ))}
                  <td className="p-1.5">
                    <button onClick={() => deleteRow(row.id)} className="p-1 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <Plus size={12} /> Add Row
      </button>
    </div>
  );
};
