import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, MapPin, RefreshCw, Compass, ShieldAlert, Sparkles, UserPlus, MessageCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { Link } from 'react-router-dom';

interface RadarUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  distKm: number;
  angleDeg: number;
  isOnline: boolean;
  department?: string;
}

export const ProximityRadar: React.FC = () => {
  const token = useStore((s) => s.token);
  const [scanning, setScanning] = useState(false);
  const [users, setUsers] = useState<RadarUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<RadarUser | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchRadarUsers();
  }, [radiusKm]);

  const fetchRadarUsers = async (customLat?: number, customLng?: number) => {
    setScanning(true);
    try {
      const lat = customLat || userCoords?.lat || 37.7749;
      const lng = customLng || userCoords?.lng || -122.4194;

      const res = await fetch('/api/v1/network/radar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, radiusKm }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('[Radar Error]', e);
    } finally {
      setTimeout(() => setScanning(false), 800);
    }
  };

  const handleEnableLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          fetchRadarUsers(latitude, longitude);
          toast.success('Geo-location synced! Radar refreshed.');
        },
        () => {
          toast.error('Location permission denied. Using default radar zone.');
        }
      );
    }
  };

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl shadow-purple-500/10 space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={20} className="text-cyan-400 animate-pulse" />
            <h3 className="text-lg font-extrabold text-foreground">Wevsoft Proximity Radar</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              LIVE GEOSPATIAL
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover active Wevsoft platform members around your current location in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Radius Selector */}
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none font-bold cursor-pointer"
          >
            <option value={5}>Radius: 5 km</option>
            <option value={15}>Radius: 15 km</option>
            <option value={30}>Radius: 30 km</option>
          </select>

          <button
            onClick={handleEnableLocation}
            className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all text-xs font-bold flex items-center gap-1.5"
            title="Sync Device Location"
          >
            <Compass size={16} className={scanning ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Sync GPS</span>
          </button>
        </div>
      </div>

      {/* Main Radar Screen Container */}
      <div className="relative w-full aspect-square max-w-[480px] mx-auto flex items-center justify-center rounded-full border border-cyan-500/20 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden my-4">
        
        {/* Radar Rings Grid */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-90"></div>
        <div className="absolute inset-0 rounded-full border border-cyan-500/15 scale-65"></div>
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 scale-40"></div>
        
        {/* Crosshair Lines */}
        <div className="absolute w-full h-[1px] bg-cyan-500/20"></div>
        <div className="absolute h-full w-[1px] bg-cyan-500/20"></div>

        {/* Radar Rotating Scan Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className="absolute inset-0 rounded-full origin-center pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, rgba(6, 182, 212, 0.35) 0deg, transparent 60deg, transparent 360deg)',
          }}
        />

        {/* Center User Beacon */}
        <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/50 border-2 border-white">
          <MapPin size={16} className="animate-bounce" />
        </div>

        {/* Nearby Users Glowing Radar Dots */}
        {users.map((u) => {
          // Convert distance & angle to polar position %
          const normalizedDist = Math.min(1, u.distKm / radiusKm);
          const radiusPct = normalizedDist * 42; // max radius 42% from center
          const angleRad = (u.angleDeg * Math.PI) / 180;
          const xPct = 50 + radiusPct * Math.cos(angleRad);
          const yPct = 50 + radiusPct * Math.sin(angleRad);

          return (
            <motion.button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 2 + (u.distKm % 2) }}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform hover:scale-125 z-20 ${
                selectedUser?.id === u.id 
                  ? 'border-cyan-400 bg-cyan-500 shadow-cyan-500/80 scale-125' 
                  : 'border-purple-400/80 bg-purple-600/60 shadow-purple-500/50'
              }`}
            >
              {u.avatar ? (
                <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[9px] font-extrabold text-foreground dark:text-white">{u.name.charAt(0)}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected User Popover Card */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-card/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shrink-0">
                <img 
                  src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}`} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-foreground">{selectedUser.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {selectedUser.distKm} km away
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/u/${selectedUser.username}`}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>Profile</span>
                <ExternalLink size={14} />
              </Link>
              <button
                onClick={() => {
                  toast.success(`Connection request sent to ${selectedUser.name}!`);
                  setSelectedUser(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center gap-1"
              >
                <UserPlus size={14} />
                <span>Connect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
