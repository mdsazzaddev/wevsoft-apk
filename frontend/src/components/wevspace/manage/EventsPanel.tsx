/**
 * Events (MP2 §15, MP3 §19/§30).
 *
 * Space events are rows in the existing Event table with `spaceId` set — the same
 * table personal events use — so they appear in the platform's event surfaces for
 * free instead of a parallel "Space events" system being invented (§32/§30).
 *
 * Two things the UI has to be honest about:
 *
 *  - Saving replaces the whole draft server-side (coerceEventDraft), so the editor
 *    loads every stored field first. That is why the list payload carries
 *    `category` and `reminderMinutes` even though nothing on the card shows them.
 *  - Cancelling is not deleting. It keeps the event, marks it cancelled and tells
 *    everyone who had said they were coming; the card says exactly that before the
 *    button is pressed.
 */

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  ExternalLink,
  Globe2,
  ImagePlus,
  Link2,
  MapPin,
  Pencil,
  Users,
  Video,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  EVENT_REGISTRATION_MODES,
  EVENT_REMINDER_CHOICES,
  SPACE_EVENT_LIMITS,
  SPACE_EVENT_MODES,
  SPACE_EVENT_VISIBILITIES,
  eventIsFull,
  spaceEventModeDef,
  validateEventDraft,
  type EventRegistrationMode,
  type SpaceEventDraft,
  type SpaceEventMode,
  type SpaceEventVisibility,
} from '@wevsoft/shared/wevspace';
import { uploadSpaceImage } from '../../../lib/wevspaceApi';
import {
  cancelSpaceEvent,
  createSpaceEvent,
  fetchSpaceEvents,
  updateSpaceEvent,
} from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  SegmentedTabs,
  Select,
  Sheet,
  StatTile,
  TextArea,
  TextInput,
  confirmAction,
  dateTime,
  fromLocalInputValue,
  num,
  relativeTime,
  statusTone,
  toLocalInputValue,
  usePanelData,
} from './manageUi';

type EventTab = 'upcoming' | 'past';

const TABS: ReadonlyArray<{ id: EventTab; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

const MODE_ICONS: Record<SpaceEventMode, typeof MapPin> = {
  IN_PERSON: MapPin,
  ONLINE: Video,
  HYBRID: Globe2,
};

const VISIBILITY_BLURB: Record<SpaceEventVisibility, string> = {
  public: 'Anyone can find this event.',
  followers: 'Only people who follow the Space see it.',
  private: 'Only your team sees it — useful while you finish the details.',
};

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Empty draft, or one loaded from a stored event. `image` becomes `cover`. */
function draftFrom(event: any | null): SpaceEventDraft {
  return {
    title: event?.title || '',
    description: event?.description || '',
    cover: event?.image || null,
    category: event?.category || null,
    startsAt: event?.startsAt ? new Date(event.startsAt).toISOString() : '',
    endsAt: event?.endsAt ? new Date(event.endsAt).toISOString() : null,
    timezone: event?.timezone || localTimezone(),
    mode: (event?.mode as SpaceEventMode) || 'IN_PERSON',
    location: event?.location || null,
    onlineUrl: event?.onlineUrl || null,
    capacity: event?.capacity ?? null,
    visibility: (event?.visibility as SpaceEventVisibility) || 'public',
    registrationMode: (event?.registrationMode as EventRegistrationMode) || 'NONE',
    registrationUrl: event?.registrationUrl || null,
    reminderMinutes: Number(event?.reminderMinutes) || 0,
  };
}

export default function EventsPanel() {
  const { spaceId, accent, space } = useManage();
  const [tab, setTab] = useState<EventTab>('upcoming');
  const [editing, setEditing] = useState<{ event: any | null } | null>(null);

  const list = usePanelData(
    () => fetchSpaceEvents(spaceId, tab === 'past' ? { past: true } : {}),
    [spaceId, tab],
  );

  const events = list.data?.events || [];
  const canManage = list.data?.canManage === true;

  const totals = useMemo(() => {
    const live = events.filter((event: any) => event.status !== 'cancelled');
    return {
      count: live.length,
      going: live.reduce((sum: number, event: any) => sum + (Number(event.goingCount) || 0), 0),
      interested: live.reduce((sum: number, event: any) => sum + (Number(event.interestedCount) || 0), 0),
    };
  }, [events]);

  const cancel = async (event: any) => {
    const going = Number(event.goingCount) || 0;
    const interested = Number(event.interestedCount) || 0;
    const audience = going + interested;
    if (
      !confirmAction(
        `Cancel "${event.title}"?\n\nThe event stays on the Space marked as cancelled.${
          audience > 0 ? ` ${audience} ${audience === 1 ? 'person' : 'people'} will be notified.` : ''
        }`,
      )
    ) {
      return;
    }
    try {
      const result = await cancelSpaceEvent(event.id);
      toast.success(result?.notified ? `Cancelled · ${num(result.notified)} notified` : 'Event cancelled');
      await list.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not cancel that event');
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Events"
        blurb={`Anything ${space?.name || 'this Space'} is hosting. Events are listed under the Space, not under your personal account.`}
        actions={
          canManage ? (
            <ActionButton tone="accent" accent={accent} onClick={() => setEditing({ event: null })}>
              <CalendarPlus size={13} /> New event
            </ActionButton>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          label={tab === 'past' ? 'Past events' : 'Upcoming'}
          value={num(totals.count)}
          hint={tab === 'upcoming' ? `Up to ${SPACE_EVENT_LIMITS.maxUpcoming} at a time` : undefined}
          icon={<CalendarDays size={15} />}
          accent={accent}
        />
        <StatTile label="Going" value={num(totals.going)} icon={<Users size={15} />} accent={accent} />
        <StatTile label="Interested" value={num(totals.interested)} accent={accent} />
      </div>

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} accent={accent} />

      {list.loading && !list.data ? (
        <PanelSkeleton rows={3} />
      ) : list.error ? (
        <PanelError message={list.error} onRetry={list.reload} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={18} />}
          title={tab === 'past' ? 'No past events' : 'No events planned'}
          blurb={
            tab === 'past'
              ? 'Events move here once their start time has passed.'
              : canManage
                ? 'Create one and it appears on the Space page, in search and in the events feed.'
                : 'Nobody on the team has scheduled anything yet.'
          }
          action={
            canManage && tab === 'upcoming' ? (
              <ActionButton tone="accent" accent={accent} onClick={() => setEditing({ event: null })}>
                <CalendarPlus size={13} /> New event
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {events.map((event: any) => (
            <EventCard
              key={event.id}
              event={event}
              accent={accent}
              canManage={canManage}
              onEdit={() => setEditing({ event })}
              onCancel={() => void cancel(event)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EventSheet
          spaceId={spaceId}
          accent={accent}
          event={editing.event}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void list.reload();
          }}
        />
      )}
    </div>
  );
}

function EventCard({
  event,
  accent,
  canManage,
  onEdit,
  onCancel,
}: {
  event: any;
  accent: string;
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const mode = spaceEventModeDef(event.mode);
  const Icon = MODE_ICONS[event.mode as SpaceEventMode] || MapPin;
  const cancelled = event.status === 'cancelled';
  const full = eventIsFull(event);
  const registration = EVENT_REGISTRATION_MODES.find((item) => item.id === event.registrationMode);

  return (
    <Card className={`p-3 ${cancelled ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <span
            className="grid place-items-center w-14 h-14 rounded-2xl shrink-0"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black break-words">{event.title}</h3>
            <div className="shrink-0 flex items-center gap-1">
              {canManage && (
                <>
                  <IconButton label={`Edit ${event.title}`} onClick={onEdit}>
                    <Pencil size={13} />
                  </IconButton>
                  {!cancelled && (
                    <IconButton label={`Cancel ${event.title}`} tone="danger" onClick={onCancel}>
                      <X size={13} />
                    </IconButton>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {dateTime(event.startsAt)}
            </span>
            {event.startsAt && <span>· {relativeTime(event.startsAt)}</span>}
            {event.timezone && <span>· {event.timezone}</span>}
          </p>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon size={11} /> {mode.label}
            </span>
            {event.location && <span className="truncate">· {event.location}</span>}
            {event.onlineUrl && (
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-bold hover:text-foreground"
              >
                <Link2 size={11} /> Join link
              </a>
            )}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {cancelled && <Pill tone={statusTone('CANCELLED')}>Cancelled</Pill>}
            {event.visibility !== 'public' && <Pill>{event.visibility}</Pill>}
            {registration && registration.id !== 'NONE' && <Pill accent={accent}>{registration.label}</Pill>}
            {full && <Pill tone={statusTone('PENDING')}>Full</Pill>}
            <span className="text-[11px] font-extrabold text-muted-foreground tabular-nums">
              {num(event.goingCount)} going · {num(event.interestedCount)} interested
              {event.capacity ? ` · ${num(event.capacity)} places` : ''}
            </span>
          </div>

          {event.registrationMode === 'EXTERNAL' && event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold hover:underline"
              style={{ color: accent }}
            >
              Registration page <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function EventSheet({
  spaceId,
  accent,
  event,
  onClose,
  onSaved,
}: {
  spaceId: string;
  accent: string;
  event: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<SpaceEventDraft>(() => draftFrom(event));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const set = (patch: Partial<SpaceEventDraft>) => {
    setTouched(true);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const mode = spaceEventModeDef(draft.mode);
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const validation = useMemo(() => validateEventDraft(draft, Date.now()), [draft]);

  const pickCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSpaceImage(spaceId, file);
      set({ cover: url });
    } catch (error: any) {
      toast.error(error?.message || 'Could not upload that image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setTouched(true);
    if (!validation.ok) {
      toast.error(validation.errors[0]);
      return;
    }
    setBusy(true);
    try {
      if (event?.id) await updateSpaceEvent(event.id, draft as any);
      else await createSpaceEvent(spaceId, draft as any);
      toast.success(event?.id ? 'Event updated' : 'Event created');
      onSaved();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save that event');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={event?.id ? 'Edit event' : 'New event'}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="accent" accent={accent} busy={busy} onClick={save} full>
            {event?.id ? 'Save changes' : 'Create event'}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" count={`${draft.title.length}/${SPACE_EVENT_LIMITS.title.max}`}>
          <TextInput
            value={draft.title}
            maxLength={SPACE_EVENT_LIMITS.title.max}
            placeholder="What is happening?"
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>

        <Field label="Details" hint="Optional. What people should know before they come.">
          <TextArea
            value={draft.description}
            rows={4}
            maxLength={SPACE_EVENT_LIMITS.description.max}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        <div>
          <p className="mb-1 text-xs font-extrabold">Cover image</p>
          <div className="flex items-center gap-2">
            {draft.cover ? (
              <img src={draft.cover} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <span className="grid place-items-center w-16 h-16 rounded-2xl bg-muted text-muted-foreground">
                <ImagePlus size={16} />
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickCover(e.target.files)}
            />
            <ActionButton size="sm" busy={uploading} onClick={() => fileRef.current?.click()}>
              {draft.cover ? 'Replace' : 'Add image'}
            </ActionButton>
            {draft.cover && (
              <ActionButton size="sm" tone="ghost" onClick={() => set({ cover: null })}>
                Remove
              </ActionButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Starts">
            <TextInput
              type="datetime-local"
              value={toLocalInputValue(draft.startsAt)}
              onChange={(e) => set({ startsAt: fromLocalInputValue(e.target.value) || '' })}
            />
          </Field>
          <Field label="Ends" hint="Optional.">
            <TextInput
              type="datetime-local"
              value={toLocalInputValue(draft.endsAt)}
              onChange={(e) => set({ endsAt: fromLocalInputValue(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Timezone" hint="The zone the times above are written in.">
          <TextInput value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })} />
        </Field>

        <Field label="Where">
          <Select value={draft.mode} onChange={(e) => set({ mode: e.target.value as SpaceEventMode })}>
            {SPACE_EVENT_MODES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        {mode.needsLocation && (
          <Field label="Address or place">
            <TextInput
              value={draft.location || ''}
              maxLength={SPACE_EVENT_LIMITS.location.max}
              onChange={(e) => set({ location: e.target.value || null })}
            />
          </Field>
        )}

        {mode.needsUrl && (
          <Field label="Join link" hint="Where people go to attend online.">
            <TextInput
              value={draft.onlineUrl || ''}
              placeholder="https://"
              onChange={(e) => set({ onlineUrl: e.target.value || null })}
            />
          </Field>
        )}

        <Field label="Sign-ups">
          <Select
            value={draft.registrationMode}
            onChange={(e) => set({ registrationMode: e.target.value as EventRegistrationMode })}
          >
            {EVENT_REGISTRATION_MODES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {EVENT_REGISTRATION_MODES.find((item) => item.id === draft.registrationMode)?.blurb}
          </p>
        </Field>

        {draft.registrationMode === 'RSVP' && (
          <Field label="Capacity" hint="Leave empty for no limit. RSVPs stop once it is reached.">
            <TextInput
              type="number"
              min={1}
              max={SPACE_EVENT_LIMITS.capacity.max}
              value={draft.capacity === null ? '' : String(draft.capacity)}
              onChange={(e) => set({ capacity: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
        )}

        {draft.registrationMode === 'EXTERNAL' && (
          <Field label="Registration link">
            <TextInput
              value={draft.registrationUrl || ''}
              placeholder="https://"
              onChange={(e) => set({ registrationUrl: e.target.value || null })}
            />
          </Field>
        )}

        <Field label="Reminder" hint="Sent to people who said they were going.">
          <Select
            value={String(draft.reminderMinutes)}
            onChange={(e) => set({ reminderMinutes: Number(e.target.value) })}
          >
            {EVENT_REMINDER_CHOICES.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Who can see it">
          <Select
            value={draft.visibility}
            onChange={(e) => set({ visibility: e.target.value as SpaceEventVisibility })}
          >
            {SPACE_EVENT_VISIBILITIES.map((option) => (
              <option key={option} value={option}>
                {option === 'public' ? 'Anyone' : option === 'followers' ? 'Followers only' : 'Team only'}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">{VISIBILITY_BLURB[draft.visibility]}</p>
        </Field>

        {touched && !validation.ok && (
          <ul className="rounded-2xl bg-amber-500/10 px-3 py-2.5 space-y-1">
            {validation.errors.map((error) => (
              <li key={error} className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
