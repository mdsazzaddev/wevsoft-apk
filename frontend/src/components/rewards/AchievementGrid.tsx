import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Footprints,
  Star,
  Trophy,
  Flame,
  ShieldCheck,
  ImagePlus,
  Sparkles,
  MessageCircle,
  Target,
  Lock,
  Coins,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Footprints,
  Star,
  Trophy,
  Flame,
  ShieldCheck,
  ImagePlus,
  Sparkles,
  MessageCircle,
  Target,
};

export interface AchievementItem {
  key: string | null;
  title: string;
  description: string;
  icon: string | null;
  category: string;
  points: number;
  coinReward: number;
  threshold: number;
  current: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementGridProps {
  achievements: AchievementItem[];
  loading: boolean;
}

export const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements, loading }) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-purple-500" />
          <h2 className="text-lg font-extrabold text-foreground">Achievements</h2>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {unlockedCount} / {achievements.length}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((a, i) => {
            const Icon = ICONS[a.icon || ''] || Award;
            const pct = a.threshold > 0 ? Math.min(100, Math.round((a.current / a.threshold) * 100)) : 0;

            return (
              <motion.div
                key={a.key || a.title}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-2xl border space-y-2 ${
                  a.unlocked
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-black/5 dark:bg-white/5 border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 border ${
                      a.unlocked
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-500'
                        : 'bg-black/5 dark:bg-white/5 border-border text-muted-foreground'
                    }`}
                  >
                    {a.unlocked ? <Icon size={18} /> : <Lock size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{a.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                  </div>
                </div>

                {a.unlocked ? (
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    <span className="text-purple-500">+{a.points} pts</span>
                    {a.coinReward > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Coins size={11} />+{a.coinReward}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      {a.current} / {a.threshold}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
