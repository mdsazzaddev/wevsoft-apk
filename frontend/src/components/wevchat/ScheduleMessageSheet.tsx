import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Clock, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  defaultScheduleTime,
  formatScheduleTime,
  toLocalInputValue,
  tomorrowMorning,
  validateScheduleDate,
} from './scheduleUtils';

interface ScheduleMessageSheetProps {
  draftText: string;
  onClose: () => void;
  onSchedule: (scheduledFor: string) => void;
}

export const ScheduleMessageSheet: React.FC<ScheduleMessageSheetProps> = ({
  draftText,
  onClose,
  onSchedule,
}) => {
  const [scheduleAt, setScheduleAt] = useState(toLocalInputValue(defaultScheduleTime()));
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const committedRef = useRef(false);

  const selectedDate = useMemo(() => new Date(scheduleAt), [scheduleAt]);
  const selectedLabel = useMemo(() => {
    if (Number.isNaN(selectedDate.getTime())) return '';
    return formatScheduleTime(selectedDate.toISOString());
  }, [selectedDate]);
  const validationError = validateScheduleDate(selectedDate);

  const commit = () => {
    if (committedRef.current) return;
    const error = validateScheduleDate(selectedDate);
    if (error) {
      toast.error(error);
      return;
    }
    committedRef.current = true;
    onSchedule(selectedDate.toISOString());
  };

  const presets = [
    { label: 'In 15 min', date: () => new Date(Date.now() + 15 * 60 * 1000) },
    { label: 'In 1 hour', date: () => new Date(Date.now() + 60 * 60 * 1000) },
    { label: 'Tomorrow 9 AM', date: tomorrowMorning },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-md">
      <button type="button" className="absolute inset-0" aria-label="Close schedule page" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            <h2 className="text-sm font-black">Schedule message</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {draftText && (
          <p className="text-xs text-muted-foreground line-clamp-3 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2.5">{draftText}</p>
        )}

        <p className="text-[11px] text-muted-foreground font-semibold">Pick a time, then tap Send.</p>

        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => {
            const active = activePreset === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setScheduleAt(toLocalInputValue(preset.date()));
                  setActivePreset(preset.label);
                }}
                className={`px-2 py-3 rounded-xl border text-[10px] font-extrabold transition-colors ${
                  active
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400'
                    : 'bg-black/5 dark:bg-white/5 border-border hover:border-blue-500/40 hover:bg-blue-500/10'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Custom date & time</label>
          <input
            type="datetime-local"
            value={scheduleAt}
            // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
            min={toLocalInputValue(new Date(Date.now() + 60 * 1000))}
            onChange={(e) => {
              setScheduleAt(e.target.value);
              setActivePreset(null);
            }}
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
          />
        </div>

        {selectedLabel && !validationError && (
          <p className="text-[11px] font-bold text-foreground/80">
            Will send · {selectedLabel}
          </p>
        )}

        <button
          type="button"
          onClick={commit}
          disabled={!!validationError}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          aria-label="Send scheduled message"
        >
          <Send size={16} />
          Send
        </button>
      </motion.div>
    </div>,
    document.body
  );
};
