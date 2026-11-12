/**
 * WevDesk → Planner: week-by-week interactive content calendar with Drag & Drop scheduling.
 * Supports dragging scheduled posts between days, dragging drafts onto the calendar to schedule,
 * and dragging scheduled items back to drafts to unschedule them.
 */

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Sparkles,
  X,
  ExternalLink,
  Undo2,
  Check,
  Calendar,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSpaceContent, rescheduleSpacePost } from '../../lib/wevspaceManageApi';
import { useDesk } from './deskContext';
import { DAY_MS, weekCalendar, weekStart } from './deskData';
import { DeskButton, EmptyNote, PageHeader, Pill, StatTile, cx, fmtNum } from './deskUi';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DragItemData {
  id: string;
  source: 'calendar' | 'draft';
  label: string;
  text: string;
  at: string;
  status: string;
}

export default function WevDeskPlanner() {
  const { spaceId, overview, managePath } = useDesk();
  const queryClient = useQueryClient();
  const counts = overview.counts || {};
  const [offset, setOffset] = useState(0);

  // Drag and Drop state
  const [dragItem, setDragItem] = useState<DragItemData | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const [dragOverDrafts, setDragOverDrafts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Reschedule Modal state
  const [modalItem, setModalItem] = useState<{ id: string; label: string; text: string; at: string; status: string } | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('10:00');

  const content = useQuery({
    queryKey: ['wevdesk', spaceId, 'planner'],
    queryFn: () => fetchSpaceContent(spaceId, { status: 'all', limit: 100 }),
    retry: false,
    staleTime: 60_000,
  });

  const from = useMemo(() => new Date(weekStart().getTime() + offset * 7 * DAY_MS), [offset]);
  const days = useMemo(() => weekCalendar(content.data?.posts, from), [content.data, from]);
  const drafts = (content.data?.posts || []).filter((p: any) => p.status === 'draft').slice(0, 10);
  const todayIdx = offset === 0 ? (new Date().getDay() + 6) % 7 : -1;
  const range = `${from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${new Date(from.getTime() + 6 * DAY_MS).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // Handle dropping a post or draft onto a specific day column
  const handleDropOnDay = async (dayIndex: number) => {
    if (!dragItem || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const targetDate = new Date(from.getTime() + dayIndex * DAY_MS);

      let hours = 10;
      let minutes = 0;
      if (dragItem.at) {
        const prev = new Date(dragItem.at);
        if (!Number.isNaN(prev.getTime())) {
          hours = prev.getHours();
          minutes = prev.getMinutes();
        }
      }
      targetDate.setHours(hours, minutes, 0, 0);

      // Prevent scheduling in the past
      // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
      if (targetDate.getTime() <= Date.now() + 60_000) {
        // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
        const future = new Date(Date.now() + 15 * 60_000);
        targetDate.setHours(future.getHours(), future.getMinutes(), 0, 0);
      }

      await rescheduleSpacePost(dragItem.id, {
        scheduledFor: targetDate.toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'planner'] });
      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'content'] });

      toast.success(
        `Scheduled for ${targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${targetDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reschedule post');
    } finally {
      setIsSubmitting(false);
      setDragItem(null);
      setDragOverCol(null);
    }
  };

  // Handle dropping a scheduled post onto the Drafts area to unschedule
  const handleDropOnDrafts = async () => {
    if (!dragItem || isSubmitting) return;
    if (dragItem.source === 'draft') return; // already a draft

    try {
      setIsSubmitting(true);
      await rescheduleSpacePost(dragItem.id, {
        unschedule: true,
      });

      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'planner'] });
      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'content'] });

      toast.success('Post unscheduled and moved back to drafts');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unschedule post');
    } finally {
      setIsSubmitting(false);
      setDragItem(null);
      setDragOverDrafts(false);
    }
  };

  // Open Quick Reschedule Modal
  const openModal = (item: { id: string; label: string; text: string; at: string; status: string }) => {
    // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
    const d = item.at ? new Date(item.at) : new Date(Date.now() + 86_400_000);
    const dateStr = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const timeStr = !Number.isNaN(d.getTime()) ? d.toTimeString().slice(0, 5) : '10:00';

    setModalItem(item);
    setModalDate(dateStr);
    setModalTime(timeStr);
  };

  // Submit Modal Reschedule
  const handleModalSave = async () => {
    if (!modalItem || !modalDate || !modalTime) return;

    try {
      setIsSubmitting(true);
      const targetDate = new Date(`${modalDate}T${modalTime}:00`);
      if (Number.isNaN(targetDate.getTime())) {
        toast.error('Invalid date or time');
        return;
      }
      if (targetDate.getTime() < Date.now() - 60_000) {
        toast.error('Cannot schedule in the past');
        return;
      }

      await rescheduleSpacePost(modalItem.id, {
        scheduledFor: targetDate.toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'planner'] });
      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'content'] });

      toast.success(`Post scheduled for ${targetDate.toLocaleString()}`);
      setModalItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Unschedule via Modal
  const handleModalUnschedule = async () => {
    if (!modalItem) return;

    try {
      setIsSubmitting(true);
      await rescheduleSpacePost(modalItem.id, {
        unschedule: true,
      });

      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'planner'] });
      await queryClient.invalidateQueries({ queryKey: ['wevdesk', spaceId, 'content'] });

      toast.success('Moved to drafts');
      setModalItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move to drafts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1600px]">
      <PageHeader
        icon={CalendarDays}
        title="Planner"
        subtitle="Plan and schedule your Space posts and reels. Drag posts across days to reschedule them, or drag drafts onto the calendar to set their publishing slot."
        actions={
          <>
            <DeskButton to="/studio/content">New post</DeskButton>
            <DeskButton to={managePath('content')}>Manage content</DeskButton>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Scheduled" value={fmtNum(counts.scheduled || 0)} sub="Waiting to publish" />
        <StatTile label="Drafts" value={fmtNum(counts.drafts || 0)} sub="Ready to schedule" />
        <StatTile label="Published" value={fmtNum(counts.published || 0)} sub="Live on your Space" />
        <StatTile label="Best time to post" value="10:00 AM" sub="Optimal audience reach" />
      </div>

      {/* Week Calendar Section */}
      <section className="wd-card p-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-[15px] font-semibold">{range}</h2>
            <Pill tone="green">
              <Sparkles size={11} className="mr-1 inline text-emerald-600" />
              Drag & Drop Active
            </Pill>
          </div>
          <DeskButton onClick={() => setOffset((o) => o - 1)} title="Previous week">
            <ChevronLeft size={15} />
          </DeskButton>
          <DeskButton onClick={() => setOffset(0)} disabled={offset === 0}>
            This week
          </DeskButton>
          <DeskButton onClick={() => setOffset((o) => o + 1)} title="Next week">
            <ChevronRight size={15} />
          </DeskButton>
        </div>

        {/* 7-Day Interactive Columns Grid */}
        <div className="mt-4 grid grid-cols-7 gap-2 overflow-x-auto pb-2">
          {DAYS.map((d, i) => {
            const date = new Date(from.getTime() + i * DAY_MS);
            const isToday = i === todayIdx;
            const isTarget = dragOverCol === i;

            return (
              <div
                key={d}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverCol !== i) setDragOverCol(i);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverCol === i) setDragOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnDay(i);
                }}
                className={cx(
                  'min-w-[130px] min-h-[300px] rounded-[12px] p-2.5 transition-all flex flex-col',
                  isTarget
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-500 shadow-md scale-[1.01]'
                    : isToday
                      ? 'bg-[#eef6f4] ring-1 ring-[#cfe7e1]'
                      : 'bg-[#f3f5f8] dark:bg-white/5'
                )}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
                  <p className="text-[11.5px] font-medium text-[var(--wd-muted)]">
                    {d} <span className="font-semibold text-[var(--wd-text)]">{date.getDate()}</span>
                  </p>
                  {isToday && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-2 flex-1">
                  {days[i].map((it) => {
                    const isPublished = it.status === 'published';
                    const isScheduled = it.status === 'scheduled';

                    return (
                      <div
                        key={it.id}
                        draggable={!isPublished}
                        onDragStart={(e) => {
                          if (isPublished) return;
                          setDragItem({
                            id: it.id,
                            source: 'calendar',
                            label: it.label,
                            text: it.text,
                            at: it.at,
                            status: it.status,
                          });
                          e.dataTransfer.setData('text/plain', it.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDragItem(null);
                          setDragOverCol(null);
                          setDragOverDrafts(false);
                        }}
                        className={cx(
                          'group relative rounded-[9px] border bg-white dark:bg-slate-900 p-2 shadow-xs transition-all',
                          !isPublished && 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-emerald-400',
                          isScheduled && 'border-violet-200/80 dark:border-violet-800/40 border-l-4 border-l-violet-500',
                          isPublished && 'border-emerald-200/60 dark:border-emerald-800/40 border-l-4 border-l-emerald-500 opacity-90',
                          dragItem?.id === it.id && 'opacity-40 ring-2 ring-emerald-400'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {!isPublished && (
                            <GripVertical
                              size={12}
                              className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            />
                          )}
                          <span className="flex-1 text-[11px] font-semibold truncate text-[var(--wd-text)]">
                            {it.label}
                          </span>
                          {!isPublished && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(it);
                              }}
                              title="Reschedule post"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800"
                            >
                              <Clock size={12} />
                            </button>
                          )}
                        </div>

                        {it.text && (
                          <p className="mt-1 text-[10.5px] text-[var(--wd-muted)] line-clamp-2 leading-relaxed">
                            {it.text}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--wd-faint)]">
                          <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                            <Clock size={10} className="text-violet-500" />
                            {new Date(it.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <Link
                            to={managePath('content')}
                            title="Edit content"
                            className="text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            Edit <ExternalLink size={9} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {days[i].length === 0 && (
                    <div
                      className={cx(
                        'h-full min-h-[90px] rounded-[8px] border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-colors',
                        isTarget
                          ? 'border-emerald-500 bg-emerald-100/50 text-emerald-800 font-medium text-[11px]'
                          : 'border-transparent text-[10.5px] text-[var(--wd-faint)]'
                      )}
                    >
                      {isTarget ? (
                        <>
                          <Sparkles size={14} className="mb-1 text-emerald-600 animate-bounce" />
                          <span>Drop to schedule</span>
                        </>
                      ) : (
                        <span>Nothing planned</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {content.isError && (
          <p className="mt-2 text-[11.5px] text-[var(--wd-muted)]">
            Your role cannot read this Space's content.
          </p>
        )}
      </section>

      {/* Drafts Tray with Drag to Schedule & Unschedule Drop Target */}
      <section
        onDragOver={(e) => {
          if (dragItem?.source === 'calendar') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!dragOverDrafts) setDragOverDrafts(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOverDrafts(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnDrafts();
        }}
        className={cx(
          'wd-card p-[18px] transition-all',
          dragOverDrafts && 'ring-2 ring-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-[15px] font-semibold">Drafts to schedule</h2>
          <p className="text-[12px] text-[var(--wd-muted)] hidden sm:block">
            Drag any draft up onto a calendar day, or drag scheduled posts down here to unschedule them.
          </p>
        </div>

        {dragOverDrafts && (
          <div className="mt-3 p-3 rounded-lg border-2 border-dashed border-amber-500 bg-amber-100/40 text-amber-900 font-medium text-xs flex items-center justify-center gap-2">
            <Undo2 size={14} />
            <span>Drop here to unschedule this post and move back to drafts</span>
          </div>
        )}

        <div className="mt-3">
          {drafts.length === 0 ? (
            <EmptyNote title="No drafts">
              Drafts you save in Content Studio or the Space composer show up here.
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-[var(--wd-line)]">
              {drafts.map((p: any) => (
                <li
                  key={p.id}
                  draggable={true}
                  onDragStart={(e) => {
                    setDragItem({
                      id: p.id,
                      source: 'draft',
                      label: 'Draft',
                      text: p.content || '',
                      at: p.createdAt,
                      status: 'draft',
                    });
                    e.dataTransfer.setData('text/plain', p.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragItem(null);
                    setDragOverCol(null);
                    setDragOverDrafts(false);
                  }}
                  className={cx(
                    'py-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-black/2.5 dark:hover:bg-white/5 px-2 rounded-lg transition-colors',
                    dragItem?.id === p.id && 'opacity-40'
                  )}
                >
                  <GripVertical size={14} className="text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-[12.5px] font-medium">
                    {p.content || 'Untitled draft'}
                  </span>
                  <span className="text-[11px] text-[var(--wd-muted)] shrink-0">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <DeskButton
                    onClick={() =>
                      openModal({
                        id: p.id,
                        label: 'Draft',
                        text: p.content || '',
                        at: p.createdAt,
                        status: 'draft',
                      })
                    }
                  >
                    Schedule
                  </DeskButton>
                  <DeskButton to={managePath('content')}>Open</DeskButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Reschedule & Time Picker Modal */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setModalItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-base">
                  {modalItem.status === 'draft' ? 'Schedule Post' : 'Reschedule Post'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50">
              "{modalItem.text || 'Untitled post'}"
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={modalDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Publish Time
                </label>
                <input
                  type="time"
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date(Date.now() + 86_400_000);
                      setModalDate(t.toISOString().slice(0, 10));
                      setModalTime('10:00');
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium"
                  >
                    Tomorrow 10 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date(Date.now() + 86_400_000 * 2);
                      setModalDate(t.toISOString().slice(0, 10));
                      setModalTime('14:30');
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date(Date.now() + 86_400_000 * 7);
                      setModalDate(t.toISOString().slice(0, 10));
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium"
                  >
                    Next Week
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {modalItem.status !== 'draft' ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleModalUnschedule}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  Unschedule to Draft
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalItem(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !modalDate || !modalTime}
                  onClick={handleModalSave}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={14} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Schedule'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
