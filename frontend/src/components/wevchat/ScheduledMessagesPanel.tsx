import React, { useState } from 'react';
import { Clock, Trash2, Send, Pencil, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatScheduleTime,
  toLocalInputValue,
  validateScheduleDate,
  type ScheduledMessageItem,
} from './scheduleUtils';

interface ScheduledMessagesPanelProps {
  items: ScheduledMessageItem[];
  onCancel: (id: string) => void;
  onSendNow?: (id: string) => void;
  onUpdate?: (id: string, payload: { text?: string; scheduledFor?: string }) => void | Promise<void>;
  emptyLabel?: string;
}

export const ScheduledMessagesPanel: React.FC<ScheduledMessagesPanelProps> = ({
  items,
  onCancel,
  onSendNow,
  onUpdate,
  emptyLabel = 'No scheduled messages',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (item: ScheduledMessageItem) => {
    setEditingId(item.id);
    setEditText(item.text || '');
    setEditTime(toLocalInputValue(new Date(item.scheduledFor)));
  };

  const saveEdit = async () => {
    if (!editingId || !onUpdate) return;
    const when = new Date(editTime);
    const error = validateScheduleDate(when);
    if (error) {
      toast.error(error);
      return;
    }
    if (!editText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    try {
      setSaving(true);
      await onUpdate(editingId, { text: editText.trim(), scheduledFor: when.toISOString() });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return <p className="text-[11px] text-muted-foreground text-center py-3">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <div key={item.id} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border space-y-2">
            {isEditing ? (
              <>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 resize-none"
                />
                <input
                  type="datetime-local"
                  value={editTime}
                  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                  min={toLocalInputValue(new Date(Date.now() + 60 * 1000))}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50"
                />
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground" title="Cancel edit">
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">{formatScheduleTime(item.scheduledFor)}</p>
                  <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">{item.text || item.fileName || '[media]'}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {onUpdate && (
                    <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground" title="Edit">
                      <Pencil size={13} />
                    </button>
                  )}
                  {onSendNow && (
                    <button type="button" onClick={() => onSendNow(item.id)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10" title="Send now">
                      <Send size={13} />
                    </button>
                  )}
                  <button type="button" onClick={() => onCancel(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
