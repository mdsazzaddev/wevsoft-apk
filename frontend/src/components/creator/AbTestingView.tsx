import React, { useEffect, useState, useCallback } from 'react';
import {
  Split, Plus, Trophy, TrendingUp, BarChart2, Clock, CheckCircle2,
  Trash2, Film, FileText, Sparkles, RefreshCw, X, ChevronRight,
  Info, AlertCircle, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface ABTestVariant {
  id: string;
  label: string;
  caption?: string;
  thumbnailUrl?: string;
  impressions: number;
  views: number;
  watchTimeSeconds: number;
  likes: number;
  shares: number;
  ctr: number;
  completionRate: number;
  isWinner?: boolean;
}

interface CreatorABTest {
  id: string;
  userId: string;
  targetType: 'reel' | 'post';
  targetId: string;
  targetTitle: string;
  targetMediaUrl?: string;
  metric: 'watch_time' | 'views' | 'likes' | 'ctr';
  durationHours: number;
  status: 'active' | 'completed';
  createdAt: string;
  endsAt: string;
  winningVariantId?: string;
  confidenceScore: number;
  variants: ABTestVariant[];
  appliedToTarget?: boolean;
}

interface EligibleItem {
  id: string;
  type: 'reel' | 'post';
  title: string;
  caption?: string | null;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  createdAt: string;
}

export const AbTestingView = () => {
  const token = useStore((s) => s.token);
  const [tests, setTests] = useState<CreatorABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleReels, setEligibleReels] = useState<EligibleItem[]>([]);
  const [eligiblePosts, setEligiblePosts] = useState<EligibleItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EligibleItem | null>(null);

  // Form state
  const [metric, setMetric] = useState<'watch_time' | 'views' | 'likes' | 'ctr'>('watch_time');
  const [durationHours, setDurationHours] = useState(24);
  const [variants, setVariants] = useState<Array<{ label: string; caption: string; thumbnailUrl: string }>>([
    { label: 'Variant A', caption: '', thumbnailUrl: '' },
    { label: 'Variant B', caption: '', thumbnailUrl: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch tests
  const fetchTests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/ab-tests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error('Failed to load AB tests', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchTests();
  }, [fetchTests]);

  // Load eligible content when opening modal
  const handleOpenCreateModal = async () => {
    setModalOpen(true);
    setEligibleLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/ab-tests/eligible-content', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEligibleReels(data.reels || []);
        setEligiblePosts(data.posts || []);
        if (data.reels?.[0]) {
          setSelectedItem(data.reels[0]);
          setVariants([
            { label: 'Variant A (Original)', caption: data.reels[0].caption || '', thumbnailUrl: data.reels[0].thumbnailUrl || '' },
            { label: 'Variant B (High Hook)', caption: '', thumbnailUrl: '' },
          ]);
        } else if (data.posts?.[0]) {
          setSelectedItem(data.posts[0]);
          setVariants([
            { label: 'Variant A (Original)', caption: data.posts[0].caption || '', thumbnailUrl: '' },
            { label: 'Variant B (Alternative)', caption: '', thumbnailUrl: '' },
          ]);
        }
      }
    } catch (err) {
      toast.error('Could not load eligible content');
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleSelectContent = (item: EligibleItem) => {
    setSelectedItem(item);
    setVariants([
      { label: 'Variant A (Original)', caption: item.caption || '', thumbnailUrl: item.thumbnailUrl || '' },
      { label: 'Variant B (Alternative Hook)', caption: '', thumbnailUrl: '' },
    ]);
  };

  const handleAddVariant = () => {
    if (variants.length >= 4) return;
    const letters = ['A', 'B', 'C', 'D'];
    const nextLetter = letters[variants.length];
    setVariants([...variants, { label: `Variant ${nextLetter}`, caption: '', thumbnailUrl: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 2) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !token) return;

    for (const v of variants) {
      if (!v.caption?.trim() && !v.thumbnailUrl?.trim()) {
        toast.error(`Please provide a caption or thumbnail for ${v.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/ab-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: selectedItem.type,
          targetId: selectedItem.id,
          metric,
          durationHours,
          variants,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create test');

      toast.success('A/B Test launched successfully!');
      setModalOpen(false);
      fetchTests();
    } catch (err: any) {
      toast.error(err.message || 'Error creating A/B test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyWinner = async (testId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/ab-tests/${testId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply winner');
      toast.success(data.message || 'Winner applied to your live content!');
      fetchTests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply winner');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/ab-tests/${testId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('A/B Test removed');
        setTests((prev) => prev.filter((t) => t.id !== testId));
      }
    } catch {
      toast.error('Failed to delete test');
    }
  };

  const filteredTests = tests.filter((t) => {
    if (filter === 'active') return t.status === 'active';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const activeCount = tests.filter((t) => t.status === 'active').length;
  const completedCount = tests.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">A/B Testing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test captions and thumbnails against each other on audience samples.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create A/B Test
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[13px]">Active Tests</span>
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-[22px] font-semibold tabular-nums text-foreground">{activeCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[13px]">Completed Tests</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-[22px] font-semibold tabular-nums text-foreground">{completedCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[13px]">Avg Watch-Time Lift</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-[22px] font-semibold tabular-nums text-foreground" title="Not measured yet">—</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[13px]">Total Experiments</span>
            <BarChart2 className="h-4 w-4" />
          </div>
          <span className="text-[22px] font-semibold tabular-nums text-foreground">{tests.length}</span>
        </div>
      </div>

      {/* Filter Switcher */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                filter === tab
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? `All (${tests.length})` : tab === 'active' ? `Active (${activeCount})` : `Completed (${completedCount})`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchTests}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
          title="Refresh tests"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Tests List */}
      {loading && tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-card rounded-2xl border border-border p-8">
          <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">Loading creator A/B tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-12 text-center flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">No {filter !== 'all' ? filter : ''} A/B tests yet.</p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg border border-border bg-card text-foreground text-[13px] font-semibold hover:bg-surface-hover transition"
          >
            <Plus className="h-4 w-4" /> Start a test
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTests.map((t) => {
            const isCompleted = t.status === 'completed';
            const winner = t.variants.find((v) => v.id === t.winningVariantId) || t.variants[0];

            return (
              <div
                key={t.id}
                className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                      {t.targetType === 'reel' ? (
                        <Film className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                          {t.targetType}
                        </span>
                        <h3 className="text-sm font-bold text-foreground truncate max-w-sm sm:max-w-md">
                          "{t.targetTitle}"
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="capitalize">Metric: {t.metric.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{t.variants.length} Variants</span>
                        <span>•</span>
                        <span>{t.confidenceScore}% Confidence</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                          : 'bg-primary/10 text-primary border border-border animate-pulse'
                      }`}
                    >
                      {t.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteTest(t.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Delete test"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Variants Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {t.variants.map((v) => {
                    const isVariantWinner = v.id === t.winningVariantId;
                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-2xl border transition-all relative ${
                          isVariantWinner
                            ? 'bg-emerald-500/[0.05] border-emerald-500/40 shadow-sm'
                            : 'bg-black/20 dark:bg-white/[0.02] border-border'
                        }`}
                      >
                        {isVariantWinner && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shadow-sm">
                            <Trophy className="h-3 w-3" /> Winner
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-xs font-bold text-foreground block">
                            {v.label}
                          </span>

                          {v.caption && (
                            <p className="text-[11px] text-muted-foreground italic line-clamp-2 bg-black/10 dark:bg-white/[0.04] p-1.5 rounded-lg">
                              "{v.caption}"
                            </p>
                          )}

                          {/* Telemetry Stats */}
                          <div className="space-y-1.5 pt-1 text-[11px]">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Watch Time:</span>
                              <span className="font-bold text-foreground">{v.watchTimeSeconds}s</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>CTR:</span>
                              <span className="font-bold text-foreground">{v.ctr}%</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Views / Impr:</span>
                              <span className="font-bold text-foreground">{v.views} / {v.impressions}</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Completion:</span>
                              <span className="font-bold text-foreground">{v.completionRate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      {t.appliedToTarget
                        ? `Winning variant (${winner?.label}) is active on live ${t.targetType}`
                        : `Recommended winner: ${winner?.label} with ${t.confidenceScore}% confidence.`}
                    </span>
                  </div>

                  {!t.appliedToTarget ? (
                    <button
                      type="button"
                      onClick={() => handleApplyWinner(t.id)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Apply Winner to Live {t.targetType === 'reel' ? 'Reel' : 'Post'}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Applied to Live Content
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Create A/B Test Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Split className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Create Reel or Post A/B Test</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTest} className="space-y-4">
              {/* Step 1: Select Content */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  1. Select Content to Test
                </label>
                {eligibleLoading ? (
                  <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Loading recent reels and posts...
                  </div>
                ) : eligibleReels.length === 0 && eligiblePosts.length === 0 ? (
                  <p className="text-xs text-rose-500">You need at least one post or reel to create an A/B test.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-border rounded-xl">
                    {[...eligibleReels, ...eligiblePosts].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectContent(item)}
                        className={`p-2 rounded-lg text-left text-xs border transition ${
                          selectedItem?.id === item.id
                            ? 'bg-primary/10 border-primary text-foreground font-bold'
                            : 'bg-black/10 dark:bg-white/[0.02] border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold text-primary block">{item.type}</span>
                        <p className="truncate font-medium">{item.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Metric & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    2. Winning Metric Target
                  </label>
                  <select
                    value={metric}
                    onChange={(e: any) => setMetric(e.target.value)}
                    className="w-full text-xs rounded-xl bg-background border border-border p-2.5 text-foreground"
                  >
                    <option value="watch_time">Watch Time (Recommended for Reels)</option>
                    <option value="views">Total Views & Impressions</option>
                    <option value="ctr">Click-Through Rate (CTR %)</option>
                    <option value="likes">Engagement (Likes & Shares)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    3. Test Duration
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e: any) => setDurationHours(Number(e.target.value))}
                    className="w-full text-xs rounded-xl bg-background border border-border p-2.5 text-foreground"
                  >
                    <option value={12}>12 Hours (Fast Spike)</option>
                    <option value={24}>24 Hours (Standard)</option>
                    <option value={48}>48 Hours (High Accuracy)</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-foreground">
                    4. Configure Variants (2–4)
                  </label>
                  {variants.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Variant
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{v.label}</span>
                        {variants.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-xs text-rose-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Variant hook caption (e.g. 3 Secrets No One Tells You)"
                        value={v.caption}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].caption = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full text-xs rounded-lg bg-background border border-border p-2 text-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Optional alternative thumbnail URL (image link)"
                        value={v.thumbnailUrl}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].thumbnailUrl = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full text-xs rounded-lg bg-background border border-border p-2 text-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedItem}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Launching...
                    </>
                  ) : (
                    'Launch A/B Test'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
