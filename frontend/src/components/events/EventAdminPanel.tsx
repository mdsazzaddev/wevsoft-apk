import React, { useEffect, useState } from 'react';
import { ShieldAlert, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const EventAdminPanel: React.FC = () => {
  const token = useStore((s) => s.token);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  const loadEvents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/events/admin/moderation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load events');
      }
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load moderation list');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadEvents();
  }, [token]);

  const handleFeature = async (event: any) => {
    if (!token || !event?.id) return;
    setFeaturingId(event.id);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ featured: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to feature event');
      }
      toast.success(`Featured event "${event.title}" on Wevsoft Events Home!`);
      await loadEvents();
    } catch (e: any) {
      toast.error(e.message || 'Failed to feature event');
    } finally {
      setFeaturingId(null);
    }
  };

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-amber-400" size={24} />
        <h2 className="text-lg font-extrabold text-foreground">Wevsoft Events Admin Moderation</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Approve/reject organizer applications, feature high-priority campus events, and moderate spam reports.
      </p>

      {loading ? (
        <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-xs">Loading events…</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
          No events to moderate yet.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="font-extrabold text-foreground truncate">{event.title || 'Untitled event'}</div>
                <div className="text-[10px] text-muted-foreground">
                  Organizer: @{event.organizer?.username || event.organizer?.name || 'unknown'}
                  {' · '}
                  {event._count?.attendees ?? event.attendeeCount ?? 0} Attendees
                  {event.isFeatured ? ' · Featured' : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleFeature(event)}
                disabled={featuringId === event.id}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1 flex-shrink-0 disabled:opacity-60"
              >
                {featuringId === event.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Star size={13} fill="currentColor" />
                )}
                Feature Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
