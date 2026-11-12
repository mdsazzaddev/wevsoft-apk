import React from 'react';
import { Crown, Medal } from 'lucide-react';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  avatar: string | null;
  xpPoints: number;
  level: number;
  tier: string;
  streakCount: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  loading: boolean;
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-orange-600 dark:text-orange-400',
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentUserId, loading }) => {
  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-amber-500" />
        <h2 className="text-lg font-extrabold text-foreground">Top Earners</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has earned XP yet. Be the first.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const isMe = e.userId === currentUserId;
            return (
              <div
                key={e.userId}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isMe ? 'bg-primary/10 border-primary/40' : 'bg-black/5 dark:bg-white/5 border-border'
                }`}
              >
                <div className={`w-7 text-center font-extrabold text-sm ${RANK_COLORS[e.rank] || 'text-muted-foreground'}`}>
                  {e.rank <= 3 ? <Medal size={16} className="mx-auto" /> : e.rank}
                </div>

                {e.avatar ? (
                  <img src={e.avatar} alt={e.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {e.name}
                    {isMe && <span className="ml-1.5 text-[10px] font-black text-primary uppercase">You</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {e.tier} · Level {e.level}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-foreground">{e.xpPoints.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">XP</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
