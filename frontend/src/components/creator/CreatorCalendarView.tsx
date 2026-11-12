import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Film,
  FileText,
  CircleDashed,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';
import { applyBusinessCreatorNav } from '../../lib/creatorBusinessNav';

type PlannerKind = 'post' | 'reel' | 'story' | 'batch_item';
type ViewMode = 'day' | 'week' | 'month';

type PlannerItem = {
  id: string;
  kind: PlannerKind;
  title: string;
  status: string;
  at: string;
  createdAt: string;
  scheduledFor: string | null;
  thumbnail: string | null;
  href: string;
  movable: boolean;
  batchName?: string | null;
};

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekStart(d: Date) {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7;
  return new Date(x.getTime() - offset * DAY_MS);
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtRange(from: Date, to: Date) {
  const a = from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const b = to.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a}–${b}`;
}

function kindIcon(kind: PlannerKind) {
  if (kind === 'reel') return Film;
  if (kind === 'story') return CircleDashed;
  if (kind === 'batch_item') return Layers;
  return FileText;
}

function statusTone(status: string) {
  if (status === 'scheduled') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25';
  if (status === 'draft') return 'bg-slate-500/15 text-slate-300 border-slate-500/25';
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
}

export const CreatorCalendarView = () => {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const { spaceId } = useCreatorSpace();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [modal, setModal] = useState<PlannerItem | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('10:00');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/planner', spaceId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error('Failed to load planner');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    load();
  }, [load]);

  const tzLabel = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time',
    [],
  );

  const rangeLabel = useMemo(() => {
    if (view === 'day') {
      return anchor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (view === 'week') {
      const from = weekStart(anchor);
      return fmtRange(from, new Date(from.getTime() + 6 * DAY_MS));
    }
    return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [anchor, view]);

  const shift = (dir: -1 | 1) => {
    setAnchor((d) => {
      if (view === 'day') return new Date(d.getTime() + dir * DAY_MS);
      if (view === 'week') return new Date(d.getTime() + dir * 7 * DAY_MS);
      return new Date(d.getFullYear(), d.getMonth() + dir, 1);
    });
  };

  const goToday = () => setAnchor(startOfDay(new Date()));

  const itemsByDay = useMemo(() => {
    const map = new Map<string, PlannerItem[]>();
    for (const it of items) {
      const k = dayKey(it.at);
      const list = map.get(k) || [];
      list.push(it);
      map.set(k, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    }
    return map;
  }, [items]);

  const weekDays = useMemo(() => {
    const from = weekStart(anchor);
    return Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * DAY_MS));
  }, [anchor]);

  const monthCells = useMemo(() => {
    const first = monthStart(anchor);
    const start = weekStart(first);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  }, [anchor]);

  const reschedule = async (item: PlannerItem, when: Date, unschedule = false) => {
    if (!token || !item.movable) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/planner/${item.kind}/${item.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          unschedule ? { unschedule: true } : { scheduledFor: when.toISOString() },
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Reschedule failed');
      toast.success(unschedule ? 'Moved to drafts' : 'Rescheduled');
      setModal(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Reschedule failed');
    } finally {
      setBusyId(null);
    }
  };

  const dropOnDay = async (day: Date) => {
    const item = items.find((i) => i.id === dragId);
    setDropKey(null);
    setDragId(null);
    if (!item?.movable) return;
    const prev = new Date(item.at);
    const target = new Date(day);
    target.setHours(
      Number.isNaN(prev.getTime()) ? 10 : prev.getHours(),
      Number.isNaN(prev.getTime()) ? 0 : prev.getMinutes(),
      0,
      0,
    );
    await reschedule(item, target);
  };

  const openModal = (item: PlannerItem) => {
    if (!item.movable) {
      if (!applyBusinessCreatorNav(item.href, { navigate })) navigate(item.href);
      return;
    }
    const d = new Date(item.at);
    setModal(item);
    setModalDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
    setModalTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  };

  const saveModal = async () => {
    if (!modal) return;
    const when = new Date(`${modalDate}T${modalTime}:00`);
    if (Number.isNaN(when.getTime())) {
      toast.error('Invalid date/time');
      return;
    }
    await reschedule(modal, when);
  };

  const Chip = ({ item }: { item: PlannerItem }) => {
    const Icon = kindIcon(item.kind);
    const time = new Date(item.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return (
      <button
        type="button"
        draggable={item.movable}
        onDragStart={(e) => {
          if (!item.movable) return;
          setDragId(item.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDragId(null);
          setDropKey(null);
        }}
        onClick={() => openModal(item)}
        disabled={busyId === item.id}
        className={`w-full text-left rounded-lg border px-2 py-1.5 transition ${statusTone(item.status)} ${
          dragId === item.id ? 'opacity-50' : 'hover:brightness-110'
        } ${item.movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
          <Icon size={11} />
          <span>{item.kind === 'batch_item' ? 'Batch' : item.kind}</span>
          <span className="ml-auto normal-case opacity-90">{time}</span>
        </div>
        <p className="mt-0.5 text-[11px] font-semibold line-clamp-2 text-foreground">{item.title}</p>
        {item.batchName && (
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{item.batchName}</p>
        )}
      </button>
    );
  };

  const bindDayDrop = (day: Date) => {
    const key = dayKey(day.toISOString());
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        setDropKey(key);
      },
      onDragLeave: () => {
        if (dropKey === key) setDropKey(null);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        void dropOnDay(day);
      },
      dropActive: dropKey === key,
    };
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-yellow-400" size={28} />
        <span className="text-sm">Loading planner...</span>
      </div>
    );
  }

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4">
      <div className="">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Planner</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Clock size={12} /> {tzLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
              {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 h-8 rounded-md text-[13px] font-semibold capitalize ${
                    view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Space hub: Business Suite Batch Upload. Personal hub: Batch is not part of it,
                so this opens the personal composer (it has its own Schedule step). */}
            <Link
              to={spaceId ? creatorHubPath('batch') : '/create-post'}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus size={14} /> {spaceId ? 'Schedule post' : 'Create post'}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-surface-hover"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="h-8 px-3 rounded-lg border border-border text-[12px] font-semibold hover:bg-surface-hover"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-surface-hover"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
          <h3 className="ml-2 text-sm font-bold text-foreground">{rangeLabel}</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {items.length} items · drag scheduled/drafts onto a day
          </span>
        </div>

        {view === 'week' && (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 min-h-[480px]">
            {weekDays.map((day) => {
              const key = dayKey(day.toISOString());
              const list = itemsByDay.get(key) || [];
              const isToday = sameDay(day, today);
              const drop = bindDayDrop(day);
              return (
                <div
                  key={key}
                  onDragOver={drop.onDragOver}
                  onDragLeave={drop.onDragLeave}
                  onDrop={drop.onDrop}
                  className={`rounded-2xl border border-border bg-slate-50 dark:bg-black/15 p-2 flex flex-col min-h-[200px] ${
                    isToday ? 'border-border bg-primary/10' : ''
                  } ${drop.dropActive ? 'ring-2 ring-ring ring-inset' : ''}`}
                >
                  <div className="flex items-baseline justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {WEEKDAYS[(day.getDay() + 6) % 7]}
                    </span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[420px] no-scrollbar">
                    {list.map((it) => (
                      <Chip key={`${it.kind}:${it.id}`} item={it} />
                    ))}
                    {list.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/70 text-center py-6">No posts</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'month' && (
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] font-bold uppercase text-muted-foreground text-center py-1">
                {d}
              </div>
            ))}
            {monthCells.map((day) => {
              const key = dayKey(day.toISOString());
              const list = itemsByDay.get(key) || [];
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = sameDay(day, today);
              const drop = bindDayDrop(day);
              return (
                <div
                  key={key}
                  onDragOver={drop.onDragOver}
                  onDragLeave={drop.onDragLeave}
                  onDrop={drop.onDrop}
                  className={`min-h-[92px] rounded-xl border border-border p-1.5 ${
                    inMonth ? 'bg-slate-50 dark:bg-black/15' : 'bg-muted/50 opacity-50'
                  } ${isToday ? 'border-border' : ''} ${drop.dropActive ? 'ring-2 ring-ring ring-inset' : ''}`}
                >
                  <div className={`text-[11px] font-bold mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((it) => (
                      <Chip key={`${it.kind}:${it.id}`} item={it} />
                    ))}
                    {list.length > 3 && (
                      <p className="text-[10px] text-muted-foreground px-1">+{list.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'day' && (() => {
          const drop = bindDayDrop(anchor);
          return (
          <div
            onDragOver={drop.onDragOver}
            onDragLeave={drop.onDragLeave}
            onDrop={drop.onDrop}
            className={`rounded-2xl border border-border bg-slate-50 dark:bg-black/15 overflow-hidden ${drop.dropActive ? 'ring-2 ring-ring ring-inset' : ''}`}
          >
            <div className="divide-y divide-border/60">
              {HOURS.map((h) => {
                const slotItems = (itemsByDay.get(dayKey(anchor.toISOString())) || []).filter((it) => {
                  const hour = new Date(it.at).getHours();
                  return hour === h;
                });
                return (
                  <div key={h} className="grid grid-cols-[64px_1fr] min-h-[56px]">
                    <div className="px-2 py-2 text-[11px] font-semibold text-muted-foreground">
                      {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                    </div>
                    <div className="p-1.5 space-y-1.5">
                      {slotItems.map((it) => (
                        <Chip key={`${it.kind}:${it.id}`} item={it} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {(itemsByDay.get(dayKey(anchor.toISOString())) || []).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-16">Nothing on this day. Schedule a post to fill the calendar.</p>
            )}
          </div>
          );
        })()}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground">Reschedule</h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{modal.title}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Date
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="text-[11px] font-semibold text-muted-foreground">
                Time
                <input
                  type="time"
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveModal}
                disabled={busyId === modal.id}
                className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:bg-primary disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => reschedule(modal, new Date(), true)}
                disabled={busyId === modal.id}
                className="h-9 rounded-xl border border-border px-4 text-xs font-bold hover:bg-surface-hover disabled:opacity-50"
              >
                Unschedule
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="ml-auto h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
