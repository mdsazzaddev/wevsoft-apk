import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Search, Plus, Filter, Sparkles, Globe, Heart, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store';

interface EventDiscoveryViewProps {
  onSelectEvent: (eventId: string) => void;
  onCreateEventClick: () => void;
  onOpenOrganizerHub: () => void;
}

export const EventDiscoveryView: React.FC<EventDiscoveryViewProps> = ({
  onSelectEvent,
  onCreateEventClick,
  onOpenOrganizerHub,
}) => {
  const token = useStore((s) => s.token);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState('All');

  const categories = ['All', 'Social', 'Education', 'Business', 'Entertainment', 'WevMall'];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchEvents();
  }, [activeCategory, locationTypeFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/events?';
      if (activeCategory !== 'All') url += `category=${activeCategory}&`;
      if (locationTypeFilter !== 'All') url += `locationType=${locationTypeFilter}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('[Event Discovery Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(evt =>
    !searchQuery || evt.title.toLowerCase().includes(searchQuery.toLowerCase()) || evt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Launch Bar */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="text-rose-500" size={26} />
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Wevsoft Events & Expos</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                V2 DISCOVERY
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Discover student reunions, Wevsoft Academy webinars, seller expos, and campus workshops.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenOrganizerHub}
              className="px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-extrabold transition-all flex items-center gap-1.5"
            >
              <ShieldCheck size={16} /> Organizer Hub
            </button>

            <button
              onClick={onCreateEventClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white text-xs font-extrabold shadow-lg hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Plus size={16} /> Create Event (AI)
            </button>
          </div>
        </div>

        {/* Search & Location Filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, college name, or location..."
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground outline-none focus:border-rose-500/50"
            />
          </div>

          <select aria-label="Event format"
            value={locationTypeFilter}
            onChange={(e) => setLocationTypeFilter(e.target.value)}
            className="bg-black/40 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none shrink-0"
          >
            <option value="All">All Formats (Physical & Online)</option>
            <option value="PHYSICAL">Physical Location Only</option>
            <option value="ONLINE">Online Meeting Only</option>
            <option value="HYBRID">Hybrid Events</option>
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:bg-black/10 dark:bg-white/10 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground font-mono">Scanning Wevsoft Events feed...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-xs bg-card/20 rounded-3xl border border-border p-8">
          No events found matching "{searchQuery}". Be the first to host an event!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(evt => (
            <motion.div
              whileHover={{ y: -4 }}
              key={evt.id}
              onClick={() => onSelectEvent(evt.id)}
              className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-xl hover:border-rose-500/30 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img
                  src={evt.coverImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/90 backdrop-blur-md text-white uppercase tracking-wider">
                  {evt.category}
                </span>
                <span className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/60 backdrop-blur-md text-white border border-border">
                  {evt.locationType}
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-foreground line-clamp-2 group-hover:text-rose-400 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                    {evt.description}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-rose-400" /> {evt.startTime || '10:00 AM'}
                    </span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <Users size={13} /> {evt._count?.attendees || 120} Attending
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground truncate">
                    📍 {evt.address || evt.meetingUrl || 'Location TBD'}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-purple-300 font-bold">
                      Organizer: @{evt.organizer?.username || 'admin'}
                    </span>
                    <button className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-300 text-[10px] font-extrabold hover:bg-rose-500/20 transition-all">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
