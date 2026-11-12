import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { creatorHubPath } from '../../lib/creatorHub';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Sparkles,
  RefreshCw, Eye, HelpCircle, Send, X, Fingerprint, Lock, ExternalLink,
  FileText, ChevronRight, Info, AlertCircle, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';

interface RecommendationCheck {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
}

interface ViolationItem {
  id: string;
  type: string;
  title: string;
  reason: string;
  date: string;
}

interface RecommendationResponse {
  status: 'RECOMMENDABLE' | 'AT_RISK' | 'NOT_RECOMMENDABLE';
  score: number;
  badge: string;
  summary: string;
  checks: RecommendationCheck[];
  violations: ViolationItem[];
  canAppeal: boolean;
}

export const SecurityCopyrightView = () => {
  const token = useStore((s) => s.token);
  // Space hub: the Space's own recommendation standing (?spaceId=). The
  // 'Security & Copyright' sub-tab (2FA, Content Studio) is personal-account only.
  const { spaceId } = useCreatorSpace();
  const inSpace = !!spaceId;
  const [params, setParams] = useSearchParams();
  const subParam = params.get('sub');

  // Sub-tabs: 'recommendation' (default) vs 'security'
  const [activeTabRaw, setActiveTab] = useState<'recommendation' | 'security'>(
    subParam === 'security' ? 'security' : 'recommendation'
  );
  const activeTab = inSpace ? 'recommendation' : activeTabRaw;

  // Sync sub-tab with searchParams
  useEffect(() => {
    if (subParam === 'security' && activeTab !== 'security') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setActiveTab('security');
    } else if ((subParam === 'recommendation' || !subParam) && activeTab !== 'recommendation') {
      setActiveTab('recommendation');
    }
  }, [subParam]);

  const switchTab = (tab: 'recommendation' | 'security') => {
    setActiveTab(tab);
    const next = new URLSearchParams(params);
    if (tab === 'security') next.set('sub', 'security');
    else next.set('sub', 'recommendation');
    setParams(next, { replace: true });
  };

  // Recommendation status state
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Appeal modal state
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Security toggles
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);

  // Fetch recommendation status
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/recommendation-status', spaceId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load recommendation status (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load recommendation status');
    } finally {
      setLoading(false);
    }
  }, [token, spaceId]);

  useEffect(() => {
    if (activeTab === 'recommendation') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      fetchStatus();
    }
  }, [activeTab, fetchStatus]);

  // Submit appeal handler
  const handleOpenAppeal = (v: ViolationItem) => {
    setSelectedViolation(v);
    setAppealReason('');
    setAppealModalOpen(true);
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViolation || !appealReason.trim() || !token) return;

    setSubmittingAppeal(true);
    try {
      const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/recommendation/appeal', spaceId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetId: selectedViolation.id,
          targetType: selectedViolation.type,
          reason: appealReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit appeal');
      }

      toast.success(json.message || 'Appeal submitted successfully');
      setAppealModalOpen(false);
      setSelectedViolation(null);
      setAppealReason('');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Could not submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const getTierBadge = (status?: string) => {
    switch (status) {
      case 'RECOMMENDABLE':
        return {
          title: 'Profile is recommendable',
          color: 'emerald',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-500',
          badgeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
          icon: ShieldCheck,
        };
      case 'AT_RISK':
        return {
          title: 'Recommendation at risk',
          color: 'amber',
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10',
          text: 'text-amber-500',
          badgeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
          icon: AlertTriangle,
        };
      case 'NOT_RECOMMENDABLE':
      default:
        return {
          title: 'Profile is not recommendable',
          color: 'rose',
          border: 'border-rose-500/30',
          bg: 'bg-rose-500/10',
          text: 'text-rose-500',
          badgeClass: 'bg-rose-500/20 text-destructive dark:text-rose-400 border border-rose-500/30',
          icon: ShieldAlert,
        };
    }
  };

  const tier = getTierBadge(data?.status);
  const TierIcon = tier.icon;

  return (
    <div className="space-y-5">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">{inSpace ? 'Space Status' : 'Profile Status & Security'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {inSpace
              ? "Monitor this Space's organic recommendation standing and content safety compliance."
              : 'Monitor your organic recommendation standing, content safety compliance, and account protection.'}
          </p>
        </div>

        {/* Tab Controls (personal only: Security & Copyright is about the personal account) */}
        {!inSpace && <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/60 rounded-lg border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => switchTab('recommendation')}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
              activeTab === 'recommendation'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile Recommendation
          </button>
          <button
            type="button"
            onClick={() => switchTab('security')}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Fingerprint className="h-4 w-4" />
            Security & Copyright
          </button>
        </div>}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: Profile Recommendation Status (Facebook Professional Dashboard) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'recommendation' && (
        <div className="space-y-6">
          {/* Loading State */}
          {loading && !data && (
            <div className="flex flex-col items-center justify-center min-h-[350px] bg-card border border-border rounded-2xl p-8">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-semibold text-foreground">Evaluating recommendation health...</p>
              <p className="text-xs text-muted-foreground mt-1">Auditing account standing, content flags, and community guidelines.</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-rose-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-rose-500">Could not retrieve recommendation status</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchStatus}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 rounded-xl transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Recommendation Content */}
          {data && (
            <>
              {/* Hero Status Card (Facebook-style) */}
              <div className={`rounded-2xl border border-border bg-card p-5`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted`}>
                      <TierIcon className={`h-5 w-5 ${tier.text}`} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-[18px] font-semibold text-foreground">
                          {tier.title}
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tier.badgeClass}`}>
                          {data.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        {data.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                    {/* Score Gauge Badge */}
                    <div className="text-right">
                      <span className="block text-[13px] text-muted-foreground">
                        Distribution Health
                      </span>
                      <span className={`text-[22px] font-semibold tabular-nums text-foreground`}>
                        {data.score}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={fetchStatus}
                      disabled={loading}
                      title="Re-check status"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-surface-hover text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="mt-5 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      data.status === 'RECOMMENDABLE'
                        ? 'bg-emerald-500'
                        : data.status === 'AT_RISK'
                        ? 'bg-amber-500'
                        : 'bg-destructive'
                    }`}
                    style={{ width: `${Math.max(5, data.score)}%` }}
                  />
                </div>
              </div>

              {/* 4-Point Distribution Health Checklist */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">Distribution Checklist</h3>
                    <p className="text-xs text-muted-foreground">Requirements evaluated to determine algorithm recommendation eligibility.</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {data.checks.filter((c) => c.passed).length} of {data.checks.length} Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.checks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-4 rounded-xl border border-border flex items-start gap-3`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {check.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">{check.title}</h4>
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              check.passed
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {check.passed ? 'Passed' : 'Needs Action'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {check.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Violations & Content Issues */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">Content Flags & Violations</h3>
                    <p className="text-xs text-muted-foreground">Items limiting your visibility in feeds and explore suggestions.</p>
                  </div>
                  {data.violations.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      {data.violations.length} Flagged
                    </span>
                  )}
                </div>

                {data.violations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No flagged content. Your posts can reach people who don't follow you yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.violations.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-500">
                              {v.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">
                            "{v.title}"
                          </p>
                          <p className="text-xs text-amber-500 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {v.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenAppeal(v)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Send className="h-3 w-3" />
                            Request Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What Recommendation Means (Facebook Parity Guidance) */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="text-[15px] font-semibold text-foreground">How Wevsoft Recommendation Works</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Where You Appear</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Recommendable creators appear in the Explore grid, Suggested Reels, and Recommended For You feeds for people who don't follow them yet.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">Boost Your Reach</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Original video content, clear profile information, and engaging community discussions signal high quality to our recommendation engine.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">What to Avoid</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sensationalized clickbait, uncredited copyrighted re-uploads, and repetitive comment spam can temporarily reduce recommendation ranking.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: Security & Copyright Protection */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="text-muted-foreground h-5 w-5" /> Account Security & Copyright Controls
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configure proactive anti-theft scans, two-factor authentication, and copyright disclosures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copyright Protection */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <Fingerprint size={16} className="text-primary" /> Copyright Protection
              </h3>
              <div className="p-4 bg-card border border-border rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-foreground">AI Copyright Detection</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAiDetectionEnabled(!aiDetectionEnabled);
                      toast.success(
                        !aiDetectionEnabled
                          ? 'AI Copyright Detection enabled'
                          : 'AI Copyright Detection disabled'
                      );
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      aiDetectionEnabled ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        aiDetectionEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically scan the platform for unauthorized re-uploads of your original videos and issue instant takedown notices.
                </p>
              </div>
            </div>

            {/* Account Security */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <AlertTriangle size={16} className="text-amber-500" /> Account Security
              </h3>
              <div className="p-4 bg-card border border-border rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-foreground">Two-Factor Auth (2FA)</span>
                  <Link
                    to="/settings?opt=security_2fa"
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    Manage 2FA <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Protect your creator earnings, payout bank details, and publishing rights with hardware or authenticator 2FA.
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Declarations */}
          <div className="p-5 bg-card border border-border rounded-2xl space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Copyright Declarations
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Original vs licensed copyright, ownership notes, and AI-generated content declarations are saved with each upload under{' '}
              <span className="font-semibold text-foreground">Content Disclosure and Copyright Information</span>. You can inspect or update disclosures anytime inside Content Studio.
            </p>
            <div className="pt-2">
              <Link
                to={creatorHubPath('content_studio')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                Go to Content Studio <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Appeal / Review Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {appealModalOpen && selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="text-[15px] font-semibold text-foreground">Request Recommendation Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500">
                {selectedViolation.type}
              </span>
              <p className="text-xs font-semibold text-foreground truncate">
                "{selectedViolation.title}"
              </p>
              <p className="text-[11px] text-muted-foreground">
                Flag reason: <span className="text-amber-500">{selectedViolation.reason}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Explain why this item should be recommendable
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="e.g. This post is original educational content and strictly follows community guidelines..."
                  className="w-full text-xs rounded-xl bg-background border border-border p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || !appealReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingAppeal ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Appeal'
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
