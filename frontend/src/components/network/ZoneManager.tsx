import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Users, Heart, Briefcase, ChevronDown, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface ConnectionItem {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    bio: string | null;
    role?: string;
  };
  tier: string;
  privacyZone: string;
  interactionScore: number;
}

export const ZoneManager: React.FC = () => {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('ALL');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchConnections();
  }, [activeZoneFilter]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const url = activeZoneFilter === 'ALL' 
        ? '/api/v1/network/connections' 
        : `/api/v1/network/connections?zone=${activeZoneFilter}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (e) {
      console.error('[Zone Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateZone = async (connectionId: string, newZone: string) => {
    try {
      const res = await fetch('/api/v1/network/zone', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ connectionId, privacyZone: newZone }),
      });

      if (res.ok) {
        setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, privacyZone: newZone } : c));
        toast.success(`Privacy Zone updated to ${newZone.replace('_', ' ')}!`);
      }
    } catch (e) {
      toast.error('Failed to update Privacy Zone');
    }
  };

  const zonesList = [
    { key: 'ALL', label: 'All Zones', icon: Users },
    { key: 'CLOSE_FRIENDS', label: 'Close Friends', icon: Heart },
    { key: 'FAMILY', label: 'Family', icon: ShieldCheck },
    { key: 'COLLEAGUES', label: 'Colleagues', icon: Briefcase },
    { key: 'GENERAL', label: 'General', icon: Users },
  ];

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <h3 className="text-lg font-extrabold text-foreground">Privacy Zone Manager</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize connected members into Privacy Zones to control post visibility & story access.
          </p>
        </div>

        {/* Zone Filter Chips */}
        <div className="flex flex-wrap gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-border">
          {zonesList.map(z => (
            <button
              key={z.key}
              onClick={() => setActiveZoneFilter(z.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeZoneFilter === z.key
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Connection Zone List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : connections.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs">
          No connections found in this Privacy Zone.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connections.map(conn => (
            <div
              key={conn.id}
              className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <img
                  src={conn.user.avatar || `https://ui-avatars.com/api/?name=${conn.user.name}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-border"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-foreground">{conn.user.name}</h4>
                  <p className="text-[11px] text-muted-foreground">@{conn.user.username}</p>
                </div>
              </div>

              {/* Privacy Zone Selector Dropdown */}
              <select
                value={conn.privacyZone}
                onChange={(e) => handleUpdateZone(conn.id, e.target.value)}
                className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-bold outline-none cursor-pointer hover:bg-black/10 dark:bg-white/10 transition-all"
              >
                <option value="GENERAL">General</option>
                <option value="CLOSE_FRIENDS">Close Friends</option>
                <option value="FAMILY">Family</option>
                <option value="COLLEAGUES">Colleagues</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
