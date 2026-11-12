import { spaceDeskPath } from '@wevsoft/shared/wevspace';
/**
 * The Events tab on a public Space page (MP3 §35).
 *
 * Backed by GET /api/spaces/:id/events, which is the dashboard's own reader mounted
 * for logged-out visitors. That reader was always viewer-aware — it gates on
 * canView and only widens to private and cancelled events for someone holding
 * events.manage — so there is one query deciding who sees which event rather than a
 * public copy that could drift from the owner's copy (§32).
 *
 * RSVP writes through POST /api/spaces/events/:id/rsvp. The server owns capacity,
 * the cancelled check and the going/interested counters, so this component sends
 * the intent and re-reads the answer instead of computing the new totals itself. A
 * full event must say so on the button rather than accept a tap and fail (§29).
 *
 * Upcoming and past are separate fetches, not one list split on the client: past
 * events are ordered newest-first and upcoming soonest-first, and only the server
 * knows "now" reliably enough to divide them.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { fetchSpaceEvents, rsvpSpaceEvent, type SpaceEventPayload } from '../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../UserAvatar';

interface Props {
  spaceId: string;
  spaceName: string;
  spaceHandle: string;
  accent: string;
  /** Shows the owner's route to the events editor. The server re-checks it. */
  canManage?: boolean;
  className?: string;
}

type Tab = 'upcoming' | 'past';

export default function SpaceEventsPanel({
  spaceId,
  spaceName,
  spaceHandle,
  accent,
  canManage = false,
  className = '',
}: Props) {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<SpaceEventPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (which: Tab) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSpaceEvents(spaceId, which === 'past');
        setEvents(res.events || []);
      } catch (err: any) {
        setError(err?.message || 'Could not load events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [spaceId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load(tab);
  }, [load, tab]);

  const patchEvent = (id: string, patch: Partial<SpaceEventPayload>) => {
    setEvents((current) => current.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  };

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Event timeframe"
          className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted"
        >
          {(['upcoming', 'past'] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-colors ${
                tab === value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              style={tab === value ? { background: accent } : undefined}
            >
              {value}
            </button>
          ))}
        </div>
        {canManage && (
          <a
            href={spaceDeskPath(spaceHandle, 's/events')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card border border-border text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <CalendarPlus size={14} /> Manage events
          </a>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-2/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))}
          <span className="sr-only" role="status">
            Loading events
          </span>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load(tab)}
            className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-3xl p-8 sm:p-10 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
            <CalendarDays size={20} />
          </span>
          <p className="mt-3 font-black text-sm">
            {tab === 'past' ? `${spaceName} has no past events` : `Nothing scheduled right now`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {tab === 'past'
              ? 'Events move here once they finish.'
              : canManage
                ? 'Create an event and it will show up here for your followers.'
                : `Follow ${spaceName} to hear about the next one.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventRow
                event={event}
                accent={accent}
                isPast={tab === 'past'}
                onPatch={(patch) => patchEvent(event.id, patch)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({
  event,
  accent,
  isPast,
  onPatch,
}: {
  event: SpaceEventPayload;
  accent: string;
  isPast: boolean;
  onPatch: (patch: Partial<SpaceEventPayload>) => void;
}) {
  const token = useStore((s) => s.token);
  const [saving, setSaving] = useState<'going' | 'interested' | null>(null);
  const image = resolveAvatarUrl(event.image);
  const cancelled = event.status === 'cancelled';
  const full = !!event.capacity && event.goingCount >= event.capacity && event.myStatus !== 'going';

  const setRsvp = async (status: 'going' | 'interested') => {
    if (!token) {
      toast.error('Sign in to RSVP');
      return;
    }
    // Tapping the state you are already in clears it, which is how the underlying
    // attendee record works — there is no separate "cancel RSVP" control to find.
    const next = event.myStatus === status ? 'not_going' : status;
    setSaving(status);
    const previous = event.myStatus;
    try {
      const res = await rsvpSpaceEvent(event.id, next);
      const saved = (res?.status || next) as SpaceEventPayload['myStatus'];
      const countDelta = (from: string | null, to: string | null, key: 'going' | 'interested') =>
        (to === key ? 1 : 0) - (from === key ? 1 : 0);
      onPatch({
        myStatus: saved,
        goingCount: Math.max(0, event.goingCount + countDelta(previous, saved, 'going')),
        interestedCount: Math.max(0, event.interestedCount + countDelta(previous, saved, 'interested')),
      });
      toast.success(
        saved === 'going' ? "You're going" : saved === 'interested' ? 'Marked as interested' : 'RSVP removed',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your RSVP');
    } finally {
      setSaving(null);
    }
  };

  const when = formatWhen(event.startsAt, event.endsAt);

  return (
    <article
      className={`rounded-3xl border border-border bg-card p-4 ${cancelled ? 'opacity-70' : ''}`}
      aria-label={event.title}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          {image ? (
            <img src={image} alt="" loading="lazy" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <span
              className="grid w-16 h-16 place-items-center rounded-2xl text-white"
              style={{ background: accent }}
              aria-hidden="true"
            >
              <CalendarDays size={22} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-sm truncate">{event.title}</h3>
            {cancelled && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wide">
                Cancelled
              </span>
            )}
            {event.visibility !== 'public' && (
              <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                {event.visibility}
              </span>
            )}
          </div>

          {when && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <Clock size={11} /> {when}
            </p>
          )}

          {(event.location || event.mode === 'online') && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              {event.mode === 'online' ? <Globe size={11} /> : <MapPin size={11} />}
              <span className="truncate">{event.location || 'Online event'}</span>
            </p>
          )}

          {event.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 break-words">{event.description}</p>
          )}

          <p className="mt-2 flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users size={11} /> {event.goingCount} going
            </span>
            <span className="inline-flex items-center gap-1">
              <Star size={11} /> {event.interestedCount} interested
            </span>
            {!!event.capacity && (
              <span className="tabular-nums">
                {event.goingCount}/{event.capacity}
              </span>
            )}
          </p>

          {/* Past and cancelled events keep their record but stop taking RSVPs. */}
          {!isPast && !cancelled && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {event.registrationMode === 'RSVP' ? (
                <>
                  <RsvpButton
                    label={event.myStatus === 'going' ? 'Going' : 'Going'}
                    active={event.myStatus === 'going'}
                    disabled={full || saving !== null}
                    busy={saving === 'going'}
                    accent={accent}
                    onClick={() => void setRsvp('going')}
                  />
                  <RsvpButton
                    label="Interested"
                    active={event.myStatus === 'interested'}
                    disabled={saving !== null}
                    busy={saving === 'interested'}
                    accent={accent}
                    onClick={() => void setRsvp('interested')}
                  />
                  {full && <span className="text-[11px] font-bold text-muted-foreground">This event is full</span>}
                </>
              ) : event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold text-primary-foreground hover:opacity-90 transition-opacity"
                  style={{ background: accent }}
                >
                  Register <ExternalLink size={12} />
                </a>
              ) : null}

              {event.mode === 'online' && event.onlineUrl && event.myStatus === 'going' && (
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  Join link <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RsvpButton({
  label,
  active,
  disabled,
  busy,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  busy?: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition-opacity disabled:opacity-60 ${
        active ? 'text-primary-foreground' : 'bg-muted hover:bg-black/5 dark:hover:bg-white/10'
      }`}
      style={active ? { background: accent } : undefined}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : active ? <Check size={13} /> : null}
      {label}
    </button>
  );
}

/**
 * Both ends in one line, and the day is not repeated when an event starts and
 * finishes on the same date. Rendered in the reader's own timezone — the server
 * sends the instant, not a sentence.
 */
function formatWhen(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;

  const dayOpts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const startDay = start.toLocaleDateString(undefined, dayOpts);
  const startTime = start.toLocaleTimeString(undefined, timeOpts);

  if (!endsAt) return `${startDay}, ${startTime}`;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return `${startDay}, ${startTime}`;

  const sameDay = start.toDateString() === end.toDateString();
  const endTime = end.toLocaleTimeString(undefined, timeOpts);
  return sameDay
    ? `${startDay}, ${startTime} – ${endTime}`
    : `${startDay}, ${startTime} – ${end.toLocaleDateString(undefined, dayOpts)}, ${endTime}`;
}
