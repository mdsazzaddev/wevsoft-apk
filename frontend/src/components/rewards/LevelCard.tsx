import React from 'react';
import { motion } from 'motion/react';
import { Flame, Coins, Trophy, TrendingUp } from 'lucide-react';

interface LevelCardProps {
  name: string;
  xp: number;
  coins: number;
  streak: number;
  longestStreak: number;
  level: number;
  tierLabel: string;
  tierColor: string;
  nextTier: string | null;
  nextTierAtXp: number | null;
  progressPct: number;
  rank: number;
}

export const LevelCard: React.FC<LevelCardProps> = ({
  name,
  xp,
  coins,
  streak,
  longestStreak,
  level,
  tierLabel,
  tierColor,
  nextTier,
  nextTierAtXp,
  progressPct,
  rank,
}) => {
  const remaining = nextTierAtXp !== null ? Math.max(0, nextTierAtXp - xp) : 0;

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
            style={{ color: tierColor, borderColor: `${tierColor}55`, backgroundColor: `${tierColor}1a` }}
          >
            {tierLabel} · Level {level}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-2 truncate">
            {name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Rank #{rank} · {xp.toLocaleString()} XP earned
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center gap-2 shadow-lg">
            <Flame size={22} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">Streak</div>
              <div className="text-base font-extrabold">{streak} Days</div>
            </div>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-2 shadow-lg">
            <Coins size={22} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">Coins</div>
              <div className="text-base font-extrabold">{coins.toLocaleString()}</div>
            </div>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-2 shadow-lg">
            <Trophy size={22} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">Total XP</div>
              <div className="text-base font-extrabold">{xp.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            {nextTier ? `Progress to ${nextTier}` : 'Level progress'}
          </span>
          <span className="text-muted-foreground font-semibold">
            {nextTier ? `${remaining.toLocaleString()} XP to go` : `Longest streak: ${longestStreak} days`}
          </span>
        </div>
        <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tierColor}, ${tierColor}aa)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingUp size={13} />
          <span>{progressPct}% complete</span>
        </div>
      </div>
    </div>
  );
};
