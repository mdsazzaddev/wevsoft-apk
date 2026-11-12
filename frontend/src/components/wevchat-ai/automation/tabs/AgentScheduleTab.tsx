import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgent } from '../../../../lib/automationApi';
import { ToggleSwitch } from '../ToggleSwitch';

interface AgentScheduleTabProps {
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent>) => void;
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DAYS = [
  { value: 0, label: 'S', full: 'Sunday' },
  { value: 1, label: 'M', full: 'Monday' },
  { value: 2, label: 'T', full: 'Tuesday' },
  { value: 3, label: 'W', full: 'Wednesday' },
  { value: 4, label: 'T', full: 'Thursday' },
  { value: 5, label: 'F', full: 'Friday' },
  { value: 6, label: 'S', full: 'Saturday' },
];

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function parseDays(value?: string | null): number[] {
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed) && parsed.every((d) => typeof d === 'number')) {
      return parsed.length > 0 ? parsed : ALL_DAYS;
    }
  } catch {
    /* ignore */
  }
  return ALL_DAYS;
}

function formatClock(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

function spansMidnight(start: string, end: string): boolean {
  const toMin = (v: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  return toMin(end) <= toMin(start);
}

function describeDays(days: number[]): string {
  if (days.length === 7) return 'every day';
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'weekdays';
  if (days.length === 0) return 'no days selected';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS.find((x) => x.value === d)?.full.slice(0, 3) || '')
    .filter(Boolean)
    .join(', ');
}

const TimezoneControl: React.FC = () => {
  const [timezone, setTimezone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options = Array.from(new Set([browserTz, ...COMMON_TIMEZONES]));

  useEffect(() => {
    automationApi
      .getTimezone()
      .then((res) => setTimezone(res.timezone))
      .catch(() => setTimezone('UTC'));
  }, []);

  const handleChange = async (tz: string) => {
    setSaving(true);
    try {
      await automationApi.setTimezone(tz);
      setTimezone(tz);
      toast.success('Timezone updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timezone');
    } finally {
      setSaving(false);
    }
  };

  if (timezone === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
        <Loader2 size={13} className="animate-spin" /> Loading timezone…
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-foreground">Timezone</label>
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>
      <select
        value={timezone}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none disabled:opacity-60"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
            {tz === browserTz ? ' (this device)' : ''}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground">Shared across all your agents.</p>
    </div>
  );
};

export const AgentScheduleTab: React.FC<AgentScheduleTabProps> = ({ draft, onChange }) => {
  const scheduleOn = draft.scheduleEnabled ?? false;
  const start = draft.scheduleStart || '22:00';
  const end = draft.scheduleEnd || '08:00';
  const activeDays = parseDays(draft.scheduleDays);
  const masterOff = !(draft.isEnabled ?? true);
  const overnight = spansMidnight(start, end);

  const summary = useMemo(() => {
    if (!scheduleOn) return 'Auto-reply can run any time of day (as long as the agent is enabled).';
    if (activeDays.length === 0) return 'No days selected — this agent will not auto-reply until you pick at least one day.';
    const range = overnight
      ? `${formatClock(start)} → ${formatClock(end)} (overnight)`
      : `${formatClock(start)} – ${formatClock(end)}`;
    return `Replies only ${range}, ${describeDays(activeDays)}.`;
  }, [scheduleOn, start, end, overnight, activeDays]);

  const toggleDay = (day: number) => {
    const next = activeDays.includes(day) ? activeDays.filter((d) => d !== day) : [...activeDays, day].sort();
    onChange({ scheduleDays: JSON.stringify(next.length ? next : []) });
  };

  const setDays = (days: number[]) => onChange({ scheduleDays: JSON.stringify(days) });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Limit to a time window</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Off = reply any time. On = only during the hours and days you set.
            </p>
          </div>
          <ToggleSwitch
            checked={scheduleOn}
            onChange={(v) => {
              onChange({
                scheduleEnabled: v,
                scheduleStart: draft.scheduleStart || '22:00',
                scheduleEnd: draft.scheduleEnd || '08:00',
                scheduleDays: draft.scheduleDays || JSON.stringify(ALL_DAYS),
              });
            }}
            label="Limit to a time window"
          />
        </div>

        {scheduleOn && (
          <div className="border-t border-border px-3.5 py-3.5 space-y-4 bg-muted/10">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-foreground">Hours</p>
                {overnight && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    Crosses midnight
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">From</label>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => onChange({ scheduleStart: e.target.value || '22:00' })}
                    className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm tabular-nums focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
                <span className="pb-2.5 text-xs text-muted-foreground">to</span>
                <div>
                  <label className="text-[11px] text-muted-foreground">Until</label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => onChange({ scheduleEnd: e.target.value || '08:00' })}
                    className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm tabular-nums focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                Example: 10:00 PM → 8:00 AM means overnight only. Outside that window there is no auto-reply.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-foreground">Days</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDays(ALL_DAYS)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Every day
                  </button>
                  <button
                    type="button"
                    onClick={() => setDays(WEEKDAYS)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Weekdays
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 justify-between">
                {DAYS.map((d) => {
                  const on = activeDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      title={d.full}
                      aria-pressed={on}
                      onClick={() => toggleDay(d.value)}
                      className={`flex-1 min-w-0 aspect-square max-h-10 rounded-xl text-xs font-bold transition-colors ${
                        on
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {activeDays.length === 0 && (
                <p className="text-[11px] text-amber-400/90 mt-2">Pick at least one day or the agent will never reply on a schedule.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {masterOff && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90">
          <PowerOff size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed">
            Agent is off on <span className="font-semibold">General</span>. Schedule still saves — replies start after you enable the agent.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/25">
        <Clock size={14} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">When this agent replies</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{summary}</p>
        </div>
      </div>

      <TimezoneControl />
    </div>
  );
};
