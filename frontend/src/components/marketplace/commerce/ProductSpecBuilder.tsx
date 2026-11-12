import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type FieldDef = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
};

type GroupValue = {
  group: string;
  items: { key: string; label: string; value: string; type?: string }[];
};

export default function ProductSpecBuilder({
  category,
  subcategory,
  value,
  onChange,
}: {
  category: string;
  subcategory?: string;
  value: GroupValue[];
  onChange: (next: GroupValue[]) => void;
}) {
  const [templates, setTemplates] = useState<GroupValue[]>([]);

  useEffect(() => {
    const q = new URLSearchParams({ category: category || '', subcategory: subcategory || '' });
    fetch(`/api/marketplace/spec-templates?${q}`)
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((d) => {
        const groups: GroupValue[] = (d.groups || []).map((g: any) => ({
          group: g.group,
          items: (g.fields || []).map((f: FieldDef) => ({
            key: f.key,
            label: f.label,
            type: f.type || 'text',
            value: '',
            options: f.options,
          })),
        }));
        setTemplates(groups);
      })
      .catch(() => setTemplates([]));
  }, [category, subcategory]);

  const merged = useMemo(() => {
    const byGroup = new Map(value.map((g) => [g.group, g]));
    const next: GroupValue[] = templates.map((tpl) => {
      const current = byGroup.get(tpl.group);
      return {
        group: tpl.group,
        items: tpl.items.map((item: any) => {
          const found = current?.items.find((it) => it.key === item.key);
          return { ...item, value: found?.value ?? item.value ?? '' };
        }),
      };
    });
    for (const g of value) {
      if (!next.some((n) => n.group === g.group)) next.push(g);
    }
    return next;
  }, [templates, value]);

  const setItem = (group: string, key: string, nextValue: string) => {
    const base = merged.map((g) =>
      g.group === group
        ? { ...g, items: g.items.map((it) => (it.key === key ? { ...it, value: nextValue } : it)) }
        : g
    );
    onChange(base);
  };

  const addCustomField = (group: string) => {
    const label = window.prompt('Custom field name')?.trim();
    if (!label) return;
    const key = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const base = merged.map((g) =>
      g.group === group ? { ...g, items: [...g.items, { key, label, value: '', type: 'text' }] } : g
    );
    onChange(base);
  };

  const addCustomGroup = () => {
    const group = window.prompt('Specification group name')?.trim();
    if (!group) return;
    onChange([...merged, { group, items: [] }]);
  };

  const removeField = (group: string, key: string) => {
    onChange(merged.map((g) => (g.group === group ? { ...g, items: g.items.filter((it) => it.key !== key) } : g)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category specifications</p>
        <button type="button" onClick={addCustomGroup} className="text-[11px] font-bold text-primary inline-flex items-center gap-1">
          <Plus size={12} /> Add group
        </button>
      </div>
      {merged.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Pick a category to load its spec fields, or add a custom group.</p>
      )}
      {merged.map((g) => (
        <div key={g.group} className="border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold">{g.group}</h4>
            <button type="button" onClick={() => addCustomField(g.group)} className="text-[11px] text-primary font-bold inline-flex items-center gap-1">
              <Plus size={11} /> Custom field
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {g.items.map((item: any) => (
              <label key={item.key} className="text-[11px] space-y-1">
                <span className="flex items-center justify-between gap-2 text-muted-foreground font-semibold">
                  {item.label}
                  {String(item.key).startsWith('custom_') && (
                    <button type="button" onClick={() => removeField(g.group, item.key)} className="text-rose-500">
                      <Trash2 size={11} />
                    </button>
                  )}
                </span>
                {item.type === 'select' ? (
                  <select
                    value={item.value}
                    onChange={(e) => setItem(g.group, item.key, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                  >
                    <option value="">Select</option>
                    {(item.options || []).map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : item.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={item.value === 'Yes' || item.value === 'true'}
                    onChange={(e) => setItem(g.group, item.key, e.target.checked ? 'Yes' : 'No')}
                  />
                ) : item.type === 'multiselect' ? (
                  <select
                    multiple
                    value={String(item.value || '').split(',').map((s) => s.trim()).filter(Boolean)}
                    onChange={(e) => setItem(g.group, item.key, Array.from(e.target.selectedOptions).map((o: HTMLOptionElement) => o.value).join(', '))}
                    className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs min-h-[64px]"
                  >
                    {(item.options || []).map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={item.type === 'number' ? 'number' : 'text'}
                    value={item.value}
                    onChange={(e) => setItem(g.group, item.key, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
