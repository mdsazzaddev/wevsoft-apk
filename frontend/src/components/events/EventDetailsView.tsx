import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2, CheckCircle2, MessageSquare, Send, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface EventDetailsViewProps {
  eventId: string;
  onBack: () => void;
}

export const EventDetailsView: React.FC<EventDetailsViewProps> = ({ eventId, onBack }) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
      }
    } catch (e) {
      console.error('[Event Details Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (status: 'GOING' | 'INTERESTED' | 'MAYBE') => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rsvpStatus: status }),
      });

      if (res.ok) {
        setRsvpStatus(status);
        toast.success(`🎉 RSVP updated to ${status}!`);
        fetchEventDetails();
      }
    } catch (e) {
      toast.error('RSVP failed');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/v1/events/${eventId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (res.ok) {
        setCommentText('');
        toast.success('Comment posted to Event Discussion!');
        fetchEventDetails();
      }
    } catch (e) {
      toast.error('Failed to post comment');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-muted-foreground font-mono">Loading Event Details...</div>;
  }

  if (!event) {
    return <div className="py-20 text-center text-xs text-muted-foreground">Event not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
      >
        <ArrowLeft size={16} />
        <span>Back to Events Feed</span>
      </button>

      {/* Hero Banner Card */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl overflow-hidden shadow-2xl space-y-6">
        <div className="relative h-64 sm:h-80 w-full bg-black">
          <img
            src={event.coverImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80'}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500 text-white uppercase tracking-wider">
            {event.category}
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-6 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground dark:text-white tracking-tight leading-tight">
                {event.title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                {event.description}
              </p>
            </div>

            {/* RSVP Action Bar */}
            <div className="bg-card/80 border border-border rounded-2xl p-4 space-y-3 shrink-0 text-center w-full md:w-64 backdrop-blur-xl shadow-xl">
              <div className="text-xs font-extrabold text-rose-400 uppercase tracking-wider">RSVP Attendance</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleRsvp('GOING')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                    rsvpStatus === 'GOING' ? 'bg-emerald-600 text-white' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
                  }`}
                >
                  Going
                </button>
                <button
                  onClick={() => handleRsvp('INTERESTED')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                    rsvpStatus === 'INTERESTED' ? 'bg-amber-600 text-white' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
                  }`}
                >
                  Interested
                </button>
                <button
                  onClick={() => handleRsvp('MAYBE')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                    rsvpStatus === 'MAYBE' ? 'bg-purple-600 text-white' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
                  }`}
                >
                  Maybe
                </button>
              </div>
            </div>
          </div>

          {/* Event Meta Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-xs">
            <div className="flex items-center gap-2">
              <Clock className="text-rose-400" size={18} />
              <div>
                <div className="font-extrabold text-foreground">{event.startTime || '10:00 AM'} - {event.endTime || '04:00 PM'}</div>
                <div className="text-muted-foreground">Date: {new Date(event.date).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="text-rose-400" size={18} />
              <div>
                <div className="font-extrabold text-foreground">{event.locationType} Event</div>
                <div className="text-muted-foreground truncate">{event.address || event.meetingUrl || 'Location TBD'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="text-rose-400" size={18} />
              <div>
                <div className="font-extrabold text-foreground">{event._count?.attendees || 120} Confirmed Attendees</div>
                <div className="text-muted-foreground">Organized by @{event.organizer?.username}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discussion Thread */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
          <MessageSquare size={18} className="text-rose-400" /> Event Discussion & Posts ({event.comments?.length || 0})
        </h3>

        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a message, question, or post for attendees..."
            className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-rose-500/50"
          />
          <button type="submit" className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90">
            <Send size={15} />
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {(event.comments || []).map((cmt: any) => (
            <div key={cmt.id} className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400">@{cmt.user?.name || 'Attendee'}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(cmt.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{cmt.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
