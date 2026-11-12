import React, { useCallback, useEffect, useState } from 'react';
import {
  Star,
  DollarSign,
  Users,
  Award,
  TrendingUp,
  Target,
  Settings,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Video,
  Radio,
  FileText,
  Trash2,
  Plus,
  Heart,
  Crown,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface StarsAnalytics {
  totalStars: number;
  totalEarningsUsd: number;
  totalEarningsBdt: number;
  periodStars: number;
  periodEarningsUsd: number;
  periodEarningsBdt: number;
  growthPercent: number;
  totalSupporters: number;
  averageStarsPerGift: number;
  cashout: {
    availableUsd: number;
    availableBdt: number;
    minPayoutUsd: number;
    minPayoutBdt: number;
    progressPercent: number;
    isEligible: boolean;
  };
  timeseries: Array<{
    date: string;
    stars: number;
    earningsUsd: number;
    giftCount: number;
  }>;
  contentBreakdown: {
    liveStreams: { count: number; stars: number; percentage: number };
    reels: { count: number; stars: number; percentage: number };
    postsAndFeed: { count: number; stars: number; percentage: number };
  };
  topGiftTypes: Array<{
    name: string;
    emoji: string;
    count: number;
    totalStars: number;
  }>;
}

interface TopSupporter {
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  totalStars: number;
  giftsSentCount: number;
  badge: 'super_supporter' | 'top_sender' | 'supporter';
  badgeTitle: string;
  badgeEmoji: string;
  lastGiftAt: string;
  favoriteGift: string | null;
  favoriteGiftEmoji: string | null;
}

interface StarGoal {
  id: string;
  title: string;
  targetStars: number;
  currentStars: number;
  progressPercent: number;
  deadline: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pinned: boolean;
  createdAt: string;
}

interface CreatorStarSettings {
  starsEnabled: boolean;
  enableOnReels: boolean;
  enableOnLive: boolean;
  enableOnPosts: boolean;
  minStarTip: number;
  customThankYouMessage: string;
}

export const StarsGiftingView: React.FC = () => {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'overview' | 'supporters' | 'goals' | 'settings'>('overview');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState<StarsAnalytics | null>(null);
  const [supporters, setSupporters] = useState<TopSupporter[]>([]);
  const [goals, setGoals] = useState<StarGoal[]>([]);
  const [settings, setSettings] = useState<CreatorStarSettings>({
    starsEnabled: true,
    enableOnReels: true,
    enableOnLive: true,
    enableOnPosts: true,
    minStarTip: 10,
    customThankYouMessage: 'Thank you for supporting my content with stars! ⭐',
  });

  // Modal states
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('1000');
  const [newGoalPinned, setNewGoalPinned] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);

  const [thankModalOpen, setThankModalOpen] = useState(false);
  const [selectedSupporter, setSelectedSupporter] = useState<TopSupporter | null>(null);
  const [thankMessage, setThankMessage] = useState('');
  const [sendingThank, setSendingThank] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [analyticsRes, supportersRes, goalsRes, settingsRes] = await Promise.all([
        fetch(`/api/v1/jobs-creator/creator/stars/analytics?range=${range}`, { headers }),
        fetch(`/api/v1/jobs-creator/creator/stars/top-senders?range=${range}&limit=20`, { headers }),
        fetch('/api/v1/jobs-creator/creator/stars/goals', { headers }),
        fetch('/api/v1/jobs-creator/creator/stars/settings', { headers }),
      ]);

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
      if (supportersRes.ok) {
        const data = await supportersRes.json();
        setSupporters(data.supporters || []);
      }
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals || []);
      }
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Stars analytics');
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadData();
  }, [loadData]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    const target = Number(newGoalTarget);
    if (!target || target <= 0) {
      toast.error('Target stars must be greater than 0');
      return;
    }

    setSavingGoal(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/stars/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          targetStars: target,
          pinned: newGoalPinned,
        }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      toast.success('Star Goal created!');
      setGoalModalOpen(false);
      setNewGoalTitle('');
      setNewGoalTarget('1000');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to remove this star goal?')) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/stars/goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete goal');
      toast.success('Star Goal removed');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete goal');
    }
  };

  const handleSendThankYou = async () => {
    if (!selectedSupporter) return;
    setSendingThank(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/stars/senders/${selectedSupporter.userId}/thank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customMessage: thankMessage }),
      });
      if (!res.ok) throw new Error('Failed to send thank you');
      toast.success(`Thank you sent to ${selectedSupporter.name}! ⭐`);
      setThankModalOpen(false);
      setSelectedSupporter(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send thank you');
    } finally {
      setSendingThank(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/stars/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Star settings updated!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
        <span className="text-sm font-medium">Loading Stars & Virtual Gifting Analytics...</span>
      </div>
    );
  }

  const activeGoal = goals.find((g) => g.status === 'ACTIVE' && g.pinned) || goals.find((g) => g.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-foreground">Stars & gifting</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Stars and gifts from your live streams, reels and posts.</p>
        </div>
        <button
          type="button"
          onClick={() => setGoalModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Set star goal
        </button>
      </div>

      {/* Hero KPI Strip (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stars */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="text-[13px] text-muted-foreground flex items-center justify-between mb-1">
            <span>Total Stars Earned</span>
            <Star size={16} />
          </div>
          <div className="text-[24px] font-semibold tabular-nums text-foreground">
            {(analytics?.totalStars || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground">
            {analytics && analytics.growthPercent >= 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <TrendingUp size={12} /> +{analytics.growthPercent}%
              </span>
            ) : (
              <span className="text-rose-400 font-bold">{analytics?.growthPercent}%</span>
            )}
            <span>vs previous {range}</span>
          </div>
        </div>

        {/* Estimated Star Revenue */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="text-[13px] text-muted-foreground flex items-center justify-between mb-1">
            <span>Estimated Revenue</span>
            <DollarSign size={16} />
          </div>
          <div className="text-[24px] font-semibold tabular-nums text-foreground">
            ${(analytics?.totalEarningsUsd || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground font-medium">
            ≈ ৳{(analytics?.totalEarningsBdt || 0).toLocaleString()} BDT (1 ⭐ = $0.01)
          </div>
        </div>

        {/* Supporters & Tips */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="text-[13px] text-muted-foreground flex items-center justify-between mb-1">
            <span>Star Supporters</span>
            <Users size={16} />
          </div>
          <div className="text-[24px] font-semibold tabular-nums text-foreground">
            {(analytics?.totalSupporters || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-muted-foreground font-medium">
            Avg. {(analytics?.averageStarsPerGift || 0).toLocaleString()} stars per gift
          </div>
        </div>

        {/* Payout Cashout Progress */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="text-[13px] text-muted-foreground flex items-center justify-between mb-1">
            <span>Cashout Threshold</span>
            <Award size={16} />
          </div>
          <div className="text-[24px] font-semibold tabular-nums text-foreground">
            {analytics?.cashout.progressPercent || 0}%
          </div>
          <div className="w-full bg-border/80 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, analytics?.cashout.progressPercent || 0)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex justify-between">
            <span>${(analytics?.cashout.availableUsd || 0).toFixed(2)} available</span>
            <span>$25.00 min</span>
          </div>
        </div>
      </div>

      {/* Active Goal Hero Bar (if present) */}
      {activeGoal && (
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-muted-foreground" />
              <span className="text-[13px] font-medium text-muted-foreground">Active Star Goal</span>
              {activeGoal.pinned && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold border border-border">
                  Pinned Overlay
                </span>
              )}
            </div>
            <h4 className="text-lg font-bold text-foreground">{activeGoal.title}</h4>
            <div className="text-xs text-muted-foreground">
              {activeGoal.currentStars.toLocaleString()} of {activeGoal.targetStars.toLocaleString()} Stars received (
              {activeGoal.progressPercent}%)
            </div>
          </div>

          <div className="w-full md:w-72 space-y-1.5">
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, activeGoal.progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Progress: {activeGoal.progressPercent}%</span>
              <span>
                {Math.max(0, activeGoal.targetStars - activeGoal.currentStars).toLocaleString()} Stars to go
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp size={16} /> Overview & Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supporters')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'supporters'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Crown size={16} /> Top Supporters ({supporters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'goals'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target size={16} /> Star Goals ({goals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings size={16} /> Settings & Placement
          </button>
        </div>

        {/* Timeframe selector (only for overview/supporters) */}
        {(activeTab === 'overview' || activeTab === 'supporters') && (
          <div className="flex items-center bg-card border border-border rounded-lg p-0.5 text-xs font-semibold">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  range === r ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Timeseries Graph */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">Star Revenue Trend
                </h3>
                <p className="text-xs text-muted-foreground">Daily stars received during selected timeframe</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Period Total</span>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {(analytics?.periodStars || 0).toLocaleString()} (${(analytics?.periodEarningsUsd || 0).toFixed(2)})
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              {analytics && analytics.timeseries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => d.slice(5)}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value as number;
                          return (
                            <div className="p-3 bg-card border border-border rounded-xl text-xs shadow-lg">
                              <div className="font-bold text-foreground mb-1">{label}</div>
                              <div className="text-foreground font-semibold">{val.toLocaleString()} Stars</div>
                              <div className="text-muted-foreground">${(val * 0.01).toFixed(2)} USD</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stars"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#starGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No star data recorded in this period yet.
                </div>
              )}
            </div>
          </div>

          {/* Content Breakdown & Top Gift Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Attribution */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">Stars by Content Source
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Distribution across streaming, short-form, and feed</p>

              <div className="space-y-4">
                {/* Live Streams */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <Radio size={14} /> Live Streams
                    </span>
                    <span className="text-foreground">
                      {(analytics?.contentBreakdown.liveStreams.stars || 0).toLocaleString()} Stars (
                      {analytics?.contentBreakdown.liveStreams.percentage || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${analytics?.contentBreakdown.liveStreams.percentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Reels */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Video size={14} /> Reels
                    </span>
                    <span className="text-foreground">
                      {(analytics?.contentBreakdown.reels.stars || 0).toLocaleString()} Stars (
                      {analytics?.contentBreakdown.reels.percentage || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${analytics?.contentBreakdown.reels.percentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Feed Posts & Direct Tips */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText size={14} /> Posts & Direct Tips
                    </span>
                    <span className="text-foreground">
                      {(analytics?.contentBreakdown.postsAndFeed.stars || 0).toLocaleString()} Stars (
                      {analytics?.contentBreakdown.postsAndFeed.percentage || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${analytics?.contentBreakdown.postsAndFeed.percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Virtual Gifts */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">Popular Virtual Gifts
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Top gift tiers sent by your audience</p>

              {analytics && analytics.topGiftTypes.length > 0 ? (
                <div className="space-y-2.5">
                  {analytics.topGiftTypes.map((g) => (
                    <div
                      key={g.name}
                      className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <div className="text-sm font-bold text-foreground">{g.name}</div>
                          <div className="text-[11px] text-muted-foreground">{g.count} gifts sent</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">{g.totalStars.toLocaleString()}</div>
                        <div className="text-[11px] text-muted-foreground">${(g.totalStars * 0.01).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-xs">
                  No gifts sent yet. Gifts sent in chat or on reels will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Supporters Leaderboard */}
      {activeTab === 'supporters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                <Crown className="text-muted-foreground" size={20} /> Supporters Leaderboard
              </h3>
              <p className="text-xs text-muted-foreground">
                Ranked by total stars sent. Send direct appreciation to cultivate lasting creator loyalty.
              </p>
            </div>
          </div>

          {supporters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supporters.map((s, idx) => (
                <div
                  key={s.userId}
                  className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between gap-4 transition hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative">
                      {s.avatar ? (
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-12 h-12 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted text-foreground font-semibold flex items-center justify-center text-lg">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-card bg-muted px-1 text-[10px] font-semibold text-foreground">
                        {idx < 3 ? idx + 1 : s.badgeEmoji}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">{s.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground border border-border">
                          {s.badgeTitle}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">@{s.username}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {s.giftsSentCount} gifts sent · Fav: {s.favoriteGiftEmoji} {s.favoriteGift || 'Star'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-base font-semibold text-foreground">{s.totalStars.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">${(s.totalStars * 0.01).toFixed(2)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupporter(s);
                        setThankMessage(`Hey ${s.name}, thank you so much for your generous support with stars! ⭐❤️`);
                        setThankModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-card hover:bg-surface-hover text-foreground border border-border text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Send size={12} /> Thank Sender
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-card dark:bg-card/30 border border-border text-center text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-40 text-muted-foreground" />
              <h4 className="text-base font-bold text-foreground">No Supporters in This Period</h4>
              <p className="text-xs max-w-sm mx-auto mt-1">
                When viewers send stars during your live stream or reels, they will appear on your leaderboard here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Star Goals */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                <Target className="text-muted-foreground" size={20} /> Creator Star Goals
              </h3>
              <p className="text-xs text-muted-foreground">
                Set transparent crowdfunding targets for equipment, projects, or community milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGoalModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition flex items-center gap-1.5"
            >
              <Plus size={14} /> New Goal
            </button>
          </div>

          {goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className={`p-5 rounded-2xl border shadow-lg transition ${
                    g.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : g.pinned
                      ? 'bg-primary/5 border-primary/40'
                      : 'bg-card dark:bg-card/50 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground">{g.title}</span>
                        {g.pinned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold border border-border">
                            Pinned
                          </span>
                        )}
                        {g.status === 'COMPLETED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Completed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Created on {new Date(g.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete goal"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">
                        {g.currentStars.toLocaleString()} / {g.targetStars.toLocaleString()} Stars
                      </span>
                      <span className="text-foreground">{g.progressPercent}%</span>
                    </div>

                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          g.status === 'COMPLETED'
                            ? 'bg-emerald-400'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, g.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-card dark:bg-card/30 border border-border text-center text-muted-foreground">
              <Target size={40} className="mx-auto mb-3 opacity-40 text-muted-foreground" />
              <h4 className="text-base font-bold text-foreground">No Goals Active</h4>
              <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
                Inspire your audience by creating a star goal for your next studio upgrade or community project.
              </p>
              <button
                type="button"
                onClick={() => setGoalModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Create First Goal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Settings & Placement */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-6">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Stars Placement & Toggles
              </h3>
              <p className="text-xs text-muted-foreground">Configure where viewers can send stars and tips</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-foreground">Enable Stars System</div>
                  <div className="text-xs text-muted-foreground">Allow viewers to send virtual gifts & tips</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.starsEnabled}
                  onChange={(e) => setSettings({ ...settings, starsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-foreground">Enable on Live Streams</div>
                  <div className="text-xs text-muted-foreground">Display gifting panel and alerts during live video</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableOnLive}
                  onChange={(e) => setSettings({ ...settings, enableOnLive: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-foreground">Enable on Reels</div>
                  <div className="text-xs text-muted-foreground">Show star tipping button on short-form videos</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableOnReels}
                  onChange={(e) => setSettings({ ...settings, enableOnReels: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-foreground">Enable on Feed Posts</div>
                  <div className="text-xs text-muted-foreground">Allow audience to gift stars directly under posts</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableOnPosts}
                  onChange={(e) => setSettings({ ...settings, enableOnPosts: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                  Minimum Star Tip
                </label>
                <select
                  value={settings.minStarTip}
                  onChange={(e) => setSettings({ ...settings, minStarTip: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-ring/30 outline-none"
                >
                  <option value={5}>5 Stars ($0.05)</option>
                  <option value={10}>10 Stars ($0.10)</option>
                  <option value={25}>25 Stars ($0.25)</option>
                  <option value={50}>50 Stars ($0.50)</option>
                  <option value={100}>100 Stars ($1.00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                  Automated Thank You Note
                </label>
                <textarea
                  rows={3}
                  value={settings.customThankYouMessage}
                  onChange={(e) => setSettings({ ...settings, customThankYouMessage: e.target.value })}
                  placeholder="Enter message sent when someone tips you stars..."
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-ring/30 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings && <Loader2 size={16} className="animate-spin" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Star Goal */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Target className="text-muted-foreground" size={20} /> Create Star Goal
              </h4>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4K Live Stream Camera"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-ring/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wide mb-1">
                  Target Stars
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  required
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-ring/30 outline-none"
                />
                <div className="flex gap-1.5 mt-2">
                  {['500', '1000', '2500', '5000', '10000'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNewGoalTarget(chip)}
                      className="px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[11px] font-bold text-muted-foreground"
                    >
                      {chip} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={newGoalPinned}
                  onChange={(e) => setNewGoalPinned(e.target.checked)}
                  className="w-4 h-4 accent-[var(--primary)] rounded cursor-pointer"
                />
                Pin goal to live stream overlay and Creator Hub banner
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingGoal && <Loader2 size={14} className="animate-spin" />}
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Thank You Shoutout */}
      {thankModalOpen && selectedSupporter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Send className="text-muted-foreground" size={18} /> Thank {selectedSupporter.name}
              </h4>
              <button
                type="button"
                onClick={() => setThankModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              This sends a personalized creator notification directly to @{selectedSupporter.username}.
            </p>

            <div>
              <textarea
                rows={3}
                value={thankMessage}
                onChange={(e) => setThankMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-ring/30 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setThankModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendThankYou}
                disabled={sendingThank}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingThank && <Loader2 size={14} className="animate-spin" />}
                Send Thank You
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
