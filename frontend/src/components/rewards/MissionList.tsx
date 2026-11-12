import React from 'react';
import { motion } from 'motion/react';
import {
  CalendarCheck,
  ImagePlus,
  MessageCircle,
  Sparkles,
  Target,
  Check,
  Coins,
  Loader2,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CalendarCheck,
  ImagePlus,
  MessageCircle,
  Sparkles,
  Target,
};

export interface Mission {
  key: string;
  title: string;
  description: string;
  type: string;
  icon: string | null;
  targetCount: number;
  xpReward: number;
  coinReward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface MissionListProps {
  missions: Mission[];
  claiming: string | null;
  onClaim: (key: string) => void;
}

export const MissionList: React.FC<MissionListProps> = ({ missions, claiming, onClaim }) => {
  if (missions.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl">
        <p className="text-sm text-muted-foreground">No missions available right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <Target size={18} className="text-emerald-500" />
        <h2 className="text-lg font-extrabold text-foreground">Missions</h2>
      </div>

      <div className="space-y-3">
        {missions.map((mission, i) => {
          const Icon = ICONS[mission.icon || ''] || Target;
          const pct = Math.min(100, Math.round((mission.progress / mission.targetCount) * 100));
          const claimable = mission.completed && !mission.claimed;

          return (
            <motion.div
              key={mission.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{mission.title}</h3>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/10 dark:bg-white/10 text-muted-foreground">
                        {mission.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
                  </div>
                </div>

                {mission.claimed ? (
                  <span className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    <Check size={13} /> Claimed
                  </span>
                ) : (
                  <button
                    onClick={() => onClaim(mission.key)}
                    disabled={!claimable || claiming === mission.key}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-110 bg-amber-500/15 text-amber-500 border-amber-500/40"
                  >
                    {claiming === mission.key ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      'Claim'
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold">
                    {mission.progress} / {mission.targetCount}
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-purple-500">+{mission.xpReward} XP</span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Coins size={11} />+{mission.coinReward}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
