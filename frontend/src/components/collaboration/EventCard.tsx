import React from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Bell, UserCheck, XCircle, HelpCircle } from 'lucide-react';
import { useStore } from '../../store';
import { rsvpEvent } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface Attendee {
  id: string;
  name: string;
  avatar?: string;
  status: 'going' | 'maybe' | 'declined';
}

interface EventCardProps {
  eventId: string;
  title: string;
  location?: string;
  startTime: string;
  endTime?: string;
  attendees: Attendee[];
  myStatus?: 'going' | 'maybe' | 'declined' | null;
}

export const EventCard: React.FC<EventCardProps> = ({
  eventId, title, location, startTime, endTime, attendees, myStatus
}) => {
  const token = useStore(state => state.token);

  const handleRSVP = async (status: 'going' | 'maybe' | 'declined') => {
    if (!token) return;
    try {
      await rsvpEvent(token, eventId, status);
      toast.success(`RSVP updated to ${status}`);
    } catch (err) {
      toast.error('Failed to RSVP');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  };

  const start = formatDateTime(startTime);
  const end = endTime ? formatDateTime(endTime) : null;

  const going = attendees.filter(a => a.status === 'going');

  return (
    <div className="bg-card border border-border rounded-xl p-4 max-w-sm w-full shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-4 mb-4">
        <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/10 rounded-xl shrink-0 text-primary">
          <span className="text-xs font-bold uppercase">{new Date(startTime).toLocaleString('default', { month: 'short' })}</span>
          <span className="text-xl font-black leading-none">{new Date(startTime).getDate()}</span>
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg leading-tight mb-1">{title}</h3>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {start.time} {end ? `- ${end.time}` : ''}
              </span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-y border-border mb-4">
        <div className="flex items-center gap-2">
          {going.length > 0 ? (
            <div className="flex -space-x-2">
              {going.slice(0, 4).map(a => (
                <img key={a.id} src={a.avatar} alt={a.name} className="w-6 h-6 rounded-full border-2 border-card object-cover" title={a.name} />
              ))}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <UserCheck className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs font-medium text-foreground">
            {going.length} going
          </span>
        </div>
        
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
          <Bell className="w-3.5 h-3.5" />
          Remind
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleRSVP('going')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            myStatus === 'going' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-card border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Going</span>
        </button>
        <button
          onClick={() => handleRSVP('maybe')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            myStatus === 'maybe' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-600' : 'bg-card border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Maybe</span>
        </button>
        <button
          onClick={() => handleRSVP('declined')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            myStatus === 'declined' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-card border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">No</span>
        </button>
      </div>
    </div>
  );
};
