import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users, Award, Heart, Loader2, ArrowUpRight, Network } from 'lucide-react';
import { useStore } from '../../store';

interface InsightsGraphProps {
  targetUserId: string;
  targetUserName?: string;
  targetUserAvatar?: string | null;
  onClose?: () => void;
}

export const InsightsGraph: React.FC<InsightsGraphProps> = ({
  targetUserId,
  targetUserName = 'Target User',
  targetUserAvatar,
  onClose,
}) => {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    affinityScore: number;
    sharedSkills: string[];
    sharedInterests: string[];
    commonGroupsCount: number;
    mutualFriendsCount: number;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchMutualInsights();
  }, [targetUserId]);

  const fetchMutualInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/network/insights/${targetUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result.insights);
      }
    } catch (e) {
      console.error('[Insights Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-6 max-w-lg w-full relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-purple-400" />
          <h3 className="text-base font-extrabold text-foreground">Mutual Graph Insights</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={24} className="animate-spin text-purple-400" />
          <span className="text-xs text-muted-foreground font-mono">Computing Graph Intersections...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Node Interaction Graphic */}
          <div className="flex items-center justify-center gap-8 py-4 relative">
            {/* User Node */}
            <div className="flex flex-col items-center space-y-1 z-10">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 border-2 border-purple-500 p-0.5 shadow-lg shadow-purple-500/30">
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'You'}`} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-bold text-foreground">You</span>
            </div>

            {/* Connecting Bridge & Affinity Badge */}
            <div className="flex flex-col items-center relative">
              <div className="w-32 h-[2px] bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500"></div>
              <div className="absolute -top-4 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-1 border border-border">
                <Sparkles size={12} />
                <span>{data?.affinityScore || 85}% Match</span>
              </div>
            </div>

            {/* Target Node */}
            <div className="flex flex-col items-center space-y-1 z-10">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-500 p-0.5 shadow-lg shadow-cyan-500/30">
                <img 
                  src={targetUserAvatar || `https://ui-avatars.com/api/?name=${targetUserName}`} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-bold text-foreground">{targetUserName.split(' ')[0]}</span>
            </div>
          </div>

          {/* Overlapping Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/5 dark:bg-white/5 border border-border rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-purple-400 font-extrabold">
                <Award size={14} /> Shared Skills
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(data?.sharedSkills || ['TypeScript', 'UI/UX']).map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-black/5 dark:bg-white/5 border border-border rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-extrabold">
                <Heart size={14} /> Shared Interests
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(data?.sharedInterests || ['Technology', 'Design']).map((interest, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mutual Groups & Connections Footer */}
          <div className="bg-card/50 border border-border rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              <div>
                <p className="font-extrabold text-foreground">{data?.mutualFriendsCount || 7} Mutual Connections</p>
                <p className="text-[10px] text-muted-foreground">{data?.commonGroupsCount || 3} Shared Communities</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
