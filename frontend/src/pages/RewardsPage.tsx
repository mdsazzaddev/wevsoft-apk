import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Gift, Loader2, CalendarCheck, Copy, UserPlus } from 'lucide-react';
import { useStore } from '../store';
import { LevelCard } from '../components/rewards/LevelCard';
import { MissionList, type Mission } from '../components/rewards/MissionList';
import { CoinWallet, type CoinTx } from '../components/rewards/CoinWallet';
import { BuyEwvsoftCoin } from '../components/rewards/BuyEwvsoftCoin';
import { AchievementGrid, type AchievementItem } from '../components/rewards/AchievementGrid';
import { Leaderboard, type LeaderboardEntry } from '../components/rewards/Leaderboard';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

interface Summary {
  xp: number;
  coins: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  streak: number;
  longestStreak: number;
  checkedInToday: boolean;
  rank: number;
  achievementsUnlocked: number;
  missions: Mission[];
  level: number;
  tier: string;
  tierLabel: string;
  tierColor: string;
  nextTier: string | null;
  nextTierAtXp: number | null;
  progressPct: number;
}

const RewardsPage: React.FC = () => {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const setGamification = useStore((s) => s.setGamification);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [wallet, setWallet] = useState<{
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    transactions: CoinTx[];
  } | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [invite, setInvite] = useState<{ code: string; url: string; stats: { invited: number; pending: number; rewarded: number }; reward: { xp: number; coins: number } } | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/gamification/me', { headers: authHeaders });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setSummary(data);
      setGamification({ xp: data.xp, coins: data.coins, level: data.level, tier: data.tier, streak: data.streak });
    } catch {
      toast.error('Could not load your rewards');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadInvite = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/growth/invite', { headers: authHeaders });
      if (!res.ok) return;
      setInvite(await res.json());
    } catch {
      /* invite is optional */
    }
  }, [token]);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await fetch('/api/v1/gamification/wallet?limit=30', { headers: authHeaders });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setWallet(data);
    } catch {
      // wallet is secondary — the balance still shows on the level card
    } finally {
      setWalletLoading(false);
    }
  }, [token]);

  const loadAchievements = useCallback(async () => {
    setAchievementsLoading(true);
    try {
      const res = await fetch('/api/v1/gamification/achievements', { headers: authHeaders });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setAchievements(data.achievements || []);
    } catch {
      // non-blocking
    } finally {
      setAchievementsLoading(false);
    }
  }, [token]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch('/api/v1/gamification/leaderboard?limit=10', { headers: authHeaders });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch {
      // non-blocking
    } finally {
      setLeaderboardLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadSummary();
    loadWallet();
    loadAchievements();
    loadLeaderboard();
    loadInvite();
  }, [token, loadSummary, loadWallet, loadAchievements, loadLeaderboard, loadInvite]);

  const handleCheckin = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/v1/gamification/checkin', { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');

      if (data.alreadyCheckedIn) {
        toast('Already checked in today — come back tomorrow!', { icon: '📅' });
      } else {
        toast.success(`Day ${data.streak} streak! +${data.xpAwarded} XP, +${data.coinsAwarded} coins`);
        if (data.unlocked?.length) {
          toast.success(`Achievement unlocked: ${data.unlocked.length} new`);
        }
      }

      await Promise.all([loadSummary(), loadWallet(), loadAchievements(), loadLeaderboard()]);
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleClaim = async (key: string) => {
    setClaiming(key);
    try {
      const res = await fetch(`/api/v1/gamification/missions/${key}/claim`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not claim reward');

      toast.success(`+${data.xpAwarded} XP, +${data.coinsAwarded} coins`);
      await Promise.all([loadSummary(), loadWallet(), loadAchievements(), loadLeaderboard()]);
    } catch (err: any) {
      toast.error(err.message || 'Could not claim reward');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="h-56 rounded-3xl bg-card/40 border border-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-3xl bg-card/40 border border-border animate-pulse" />
          <div className="h-96 rounded-3xl bg-card/40 border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">Rewards are unavailable right now. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <LevelCard
        name={user?.name || 'Wevsoft Member'}
        xp={summary.xp}
        coins={summary.coins}
        streak={summary.streak}
        longestStreak={summary.longestStreak}
        level={summary.level}
        tierLabel={summary.tierLabel}
        tierColor={summary.tierColor}
        nextTier={summary.nextTier}
        nextTierAtXp={summary.nextTierAtXp}
        progressPct={summary.progressPct}
        rank={summary.rank}
      />

      <motion.button
        onClick={handleCheckin}
        disabled={checkingIn || summary.checkedInToday}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-extrabold text-sm border transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400/25 via-yellow-500/20 to-amber-600/25 border-amber-400/40 text-amber-600 dark:text-amber-300 enabled:hover:brightness-110"
      >
        {checkingIn ? (
          <Loader2 size={18} className="animate-spin" />
        ) : summary.checkedInToday ? (
          <CalendarCheck size={18} />
        ) : (
          <Gift size={18} />
        )}
        {summary.checkedInToday ? 'Checked in today' : 'Claim daily check-in reward'}
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <MissionList missions={summary.missions} claiming={claiming} onClaim={handleClaim} />
          <AchievementGrid achievements={achievements} loading={achievementsLoading} />
        </div>

        <div className="space-y-6">
          {invite && (
            <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <UserPlus size={18} /> Invite friends
              </h3>
              <p className="text-xs text-muted-foreground">
                They join with your link. After they finish setup you get {invite.reward.xp} XP and {invite.reward.coins} coins.
              </p>
              <p className="text-[11px] font-mono break-all px-3 py-2 rounded-xl bg-background/70 border border-border">{invite.url}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invite.url);
                  toast.success('Invite link copied');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-extrabold"
              >
                <Copy size={14} /> Copy invite link
              </button>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {invite.stats.invited} joined · {invite.stats.rewarded} rewarded · {invite.stats.pending} pending
              </p>
            </div>
          )}
          <CoinWallet
            balance={wallet?.balance ?? summary.coins}
            lifetimeEarned={wallet?.lifetimeEarned ?? summary.lifetimeEarned}
            lifetimeSpent={wallet?.lifetimeSpent ?? summary.lifetimeSpent}
            transactions={wallet?.transactions ?? []}
            loading={walletLoading}
          />
          <BuyEwvsoftCoin
            onCredited={() => {
              loadWallet();
              loadSummary();
            }}
          />
          <Leaderboard entries={leaderboard} currentUserId={user?.id} loading={leaderboardLoading} />
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
