import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  UserPlus,
  CalendarCheck,
  LifeBuoy,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Sheet,
  Loader2,
  Check,
  ArrowUp,
  ArrowDown,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SAVE_RECORD_TEMPLATES,
  parseSaveRecordsConfig,
  toFieldKey,
  type SaveRecordField,
  type SaveRecordFieldType,
  type SaveRecordTemplateId,
} from '@wevsoft/shared/save-record-templates.js';
import { automationApi, WevToolConnection } from '../../../../lib/automationApi';

const TEMPLATE_ICON: Record<SaveRecordTemplateId, React.ComponentType<{ size?: number; className?: string }>> = {
  ORDER: ShoppingBag,
  LEAD: UserPlus,
  BOOKING: CalendarCheck,
  SUPPORT: LifeBuoy,
  CUSTOM: Sparkles,
};

const FIELD_TYPES: { id: SaveRecordFieldType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'longtext', label: 'Long text' },
  { id: 'number', label: 'Number' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'date', label: 'Date' },
  { id: 'select', label: 'Choice' },
  { id: 'boolean', label: 'Yes / No' },
];

/** Owner-side config for the built-in "Save Records" tool: template, field schema, when-to-save rules, optional Sheet mirror. */
export const SaveRecordsPanel: React.FC<{
  tool: WevToolConnection;
  onChanged: (t: WevToolConnection) => void;
  onOpenRecords?: () => void;
}> = ({ tool, onChanged, onOpenRecords }) => {
  const initial = useMemo(() => parseSaveRecordsConfig(tool.config), [tool.config]);
  const [template, setTemplate] = useState<SaveRecordTemplateId>(initial.template);
  const [fields, setFields] = useState<SaveRecordField[]>(initial.fields);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [syncSheetToolId, setSyncSheetToolId] = useState<string>(initial.syncSheetToolId || '');
  const [updateOpenRecord, setUpdateOpenRecord] = useState(initial.updateOpenRecord !== false);
  const [sheets, setSheets] = useState<WevToolConnection[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    automationApi
      .getTools()
      .then((all) => setSheets(all.filter((t) => t.kind === 'GOOGLE_SHEETS')))
      .catch(() => setSheets([]));
  }, []);

  const mark = () => setDirty(true);

  const pickTemplate = (id: SaveRecordTemplateId) => {
    const tpl = SAVE_RECORD_TEMPLATES.find((t) => t.id === id)!;
    if (dirty && id !== template && !window.confirm(`Switch to the ${tpl.label} template? Your current fields will be replaced.`)) return;
    setTemplate(id);
    setFields(tpl.fields.map((f) => ({ ...f })));
    setInstructions(tpl.defaultInstructions);
    mark();
  };

  const updateField = (i: number, patch: Partial<SaveRecordField>) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
    mark();
  };

  const addField = () => {
    let n = fields.length + 1;
    while (fields.some((f) => f.key === `field${n}`)) n++;
    setFields((prev) => [...prev, { key: `field${n}`, label: `Field ${n}`, type: 'text' }]);
    mark();
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    mark();
  };

  const save = async () => {
    const keys = new Set<string>();
    for (const f of fields) {
      if (!f.label.trim()) return toast.error('Every field needs a name.');
      if (keys.has(f.key)) return toast.error(`Two fields share the key "${f.key}". Rename one.`);
      keys.add(f.key);
    }
    if (fields.length === 0) return toast.error('Add at least one field.');
    setSaving(true);
    try {
      const updated = await automationApi.updateTool(tool.id, {
        config: { template, fields, instructions: instructions.trim(), syncSheetToolId: syncSheetToolId || null, updateOpenRecord },
      });
      onChanged({ ...tool, ...updated });
      setDirty(false);
      toast.success('Save Records settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const sheetColumns = ['Created', 'Contact', ...fields.map((f) => f.label), 'Status'];

  return (
    <div className="pt-2 border-t border-border space-y-5">
      {onOpenRecords && (
        <button
          onClick={onOpenRecords}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <Inbox size={18} className="text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">View saved records</p>
            <p className="text-[11px] text-muted-foreground">Browse, filter, update status and export to CSV / Excel</p>
          </div>
        </button>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Template</label>
        <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SAVE_RECORD_TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICON[t.id];
            const on = template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => pickTemplate(t.id)}
                title={t.blurb}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  on ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/30'
                }`}
              >
                <Icon size={18} className={on ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-xs font-semibold text-foreground">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Fields the agent fills in</label>
          <span className="text-[10px] text-muted-foreground">{fields.length} field{fields.length === 1 ? '' : 's'}</span>
        </div>
        <div className="mt-1.5 rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {fields.map((f, i) => (
            <div key={i} className="p-2.5 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                <input
                  value={f.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const autoKey = toFieldKey(f.label) === f.key || f.key.startsWith('field');
                    updateField(i, { label, ...(autoKey ? { key: toFieldKey(label) } : {}) });
                  }}
                  placeholder="Field name"
                  className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <select
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value as SaveRecordFieldType })}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => updateField(i, { required: !f.required })}
                  title="Required before saving"
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                    f.required ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  Req
                </button>
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}>
                    <ArrowUp size={11} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={i === fields.length - 1}
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setFields((prev) => prev.filter((_, idx) => idx !== i));
                    mark();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {f.type === 'select' && (
                <input
                  value={(f.options || []).join(', ')}
                  onChange={(e) => updateField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Choices, comma separated"
                  className="ml-6 w-[calc(100%-1.5rem)] bg-background border border-dashed border-border rounded-lg px-2.5 py-1.5 text-xs outline-none"
                />
              )}
            </div>
          ))}
          <button onClick={addField} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5">
            <Plus size={13} /> Add field
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">When should the agent save?</label>
        <textarea
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            mark();
          }}
          rows={4}
          className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-y"
        />
        <p className="text-[10px] text-muted-foreground/80 mt-1">
          The agent asks politely for missing required fields, then saves. It never makes up values.
        </p>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={updateOpenRecord}
          onChange={(e) => {
            setUpdateOpenRecord(e.target.checked);
            mark();
          }}
          className="mt-0.5 accent-[hsl(var(--primary))]"
        />
        <span className="text-xs text-foreground">
          Update instead of duplicate
          <span className="block text-[10px] text-muted-foreground">If the same contact already has a “New” record from the last 24h, update it.</span>
        </span>
      </label>

      <div>
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sheet size={12} /> Also add each record to a Google Sheet (optional)
        </label>
        <select
          value={syncSheetToolId}
          onChange={(e) => {
            setSyncSheetToolId(e.target.value);
            mark();
          }}
          className="mt-1.5 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Don’t sync</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.oauthCredentialId}>
              {s.label}
              {!s.oauthCredentialId ? ' (not connected)' : ''}
            </option>
          ))}
        </select>
        {sheets.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">Add a Google Sheets tool to your library to enable syncing.</p>}
        {syncSheetToolId && (
          <div className="mt-2 p-2.5 rounded-xl bg-muted/30 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Column order written to the sheet</p>
            <div className="flex flex-wrap gap-1">
              {sheetColumns.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] text-foreground">
                  {String.fromCharCode(65 + Math.min(i, 25))}: {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
};
