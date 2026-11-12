import React, { useEffect, useState } from 'react';
import {
  Briefcase, Handshake, Loader2, DollarSign, Sparkles, CheckCircle2,
  Award, Search, Plus, ExternalLink, Calendar, Tag, ShieldCheck,
  Clock, Send, FileText, X, AlertCircle, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface CollabCampaign {
  id: string;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deliverables: string[];
  deadline: string;
  requirements: string;
  verifiedBrand: boolean;
  applied?: boolean;
  dealId?: string;
  dealStatus?: string;
}

interface CreatorDeal {
  id: string;
  brandName: string;
  dealTitle: string;
  budget: number;
  currency: string;
  status: string; // PROPOSED | ACTIVE | DELIVERED | COMPLETED | DECLINED
  deliverables: string[];
  pitch: string;
  deliverableUrl: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  turnaroundDays: number;
  createdAt: string;
}

interface CollabProfile {
  collabOpen: boolean;
  primaryNiche: string;
  contactEmail?: string;
  minBudget: number;
  rateCard: {
    reelRate: number;
    postRate: number;
    storyRate: number;
    videoRate: number;
  };
  bio?: string;
}

export const BrandCollabView = () => {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'marketplace' | 'deals' | 'rate_card'>('marketplace');

  // Marketplace states
  const [campaigns, setCampaigns] = useState<CollabCampaign[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Deals states
  const [deals, setDeals] = useState<CreatorDeal[]>([]);
  const [dealFilter, setDealFilter] = useState<'all' | 'proposed' | 'active' | 'delivered' | 'completed'>('all');
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeCount: 0,
    proposedCount: 0,
    deliveredCount: 0,
    completedCount: 0,
    pipelineValue: 0,
    totalEarnings: 0,
  });

  // Profile / Media Kit states
  const [profile, setProfile] = useState<CollabProfile>({
    collabOpen: true,
    primaryNiche: 'Technology & Programming',
    contactEmail: '',
    minBudget: 150,
    rateCard: {
      reelRate: 250,
      postRate: 150,
      storyRate: 80,
      videoRate: 500,
    },
    bio: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Proposal modal states
  const [activeCampaign, setActiveCampaign] = useState<CollabCampaign | null>(null);
  const [proposalPitch, setProposalPitch] = useState('');
  const [requestedBudget, setRequestedBudget] = useState<number | ''>('');
  const [turnaroundDays, setTurnaroundDays] = useState(7);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Deliverable modal states
  const [activeDealForDelivery, setActiveDealForDelivery] = useState<CreatorDeal | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  // Custom Deal modal states
  const [showCustomDealModal, setShowCustomDealModal] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBudget, setCustomBudget] = useState(300);
  const [customDeliverables, setCustomDeliverables] = useState('1 Dedicated Reel, 1 Story');
  const [submittingCustomDeal, setSubmittingCustomDeal] = useState(false);

  // Load all initial data
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [campRes, dealsRes, profRes] = await Promise.all([
        fetch('/api/v1/jobs-creator/creator/brand-collabs/marketplace', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/jobs-creator/creator/brand-collabs/deals', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/jobs-creator/creator/brand-collabs/profile', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (campRes.ok) {
        const cData = await campRes.json();
        setCampaigns(cData.campaigns || []);
      }
      if (dealsRes.ok) {
        const dData = await dealsRes.json();
        setDeals(dData.deals || []);
        if (dData.stats) setStats(dData.stats);
      }
      if (profRes.ok) {
        const pData = await profRes.json();
        if (pData.profile) setProfile(pData.profile);
      }
    } catch {
      toast.error('Failed to load brand collaboration hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadData();
  }, [token]);

  // AI Pitch Specialist generator
  const handleGenerateAIPitch = async () => {
    if (!token || !activeCampaign) return;
    setGeneratingPitch(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/ai/pitch-assistant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: activeCampaign.brandName,
          channelNiche: profile.primaryNiche || activeCampaign.category,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pitch) {
          setProposalPitch(data.pitch);
          toast.success('AI Pitch crafted successfully!');
        }
      } else {
        toast.error('Failed to generate AI pitch');
      }
    } catch {
      toast.error('Error contacting AI pitch specialist');
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Submit proposal
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeCampaign) return;
    setSubmittingProposal(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/brand-collabs/apply/${activeCampaign.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pitch: proposalPitch,
          requestedBudget: requestedBudget || activeCampaign.budgetMin,
          turnaroundDays,
        }),
      });
      if (res.ok) {
        toast.success(`Proposal submitted to ${activeCampaign.brandName}!`);
        setActiveCampaign(null);
        setProposalPitch('');
        setRequestedBudget('');
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit proposal');
      }
    } catch {
      toast.error('Error submitting proposal');
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (dealId: string, status: string, url?: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/brand-collabs/deals/${dealId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, deliverableUrl: url }),
      });
      if (res.ok) {
        toast.success(`Deal marked as ${status}`);
        loadData();
      } else {
        toast.error('Failed to update deal status');
      }
    } catch {
      toast.error('Error updating deal');
    }
  };

  // Deliverable link submission
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealForDelivery || !deliverableUrl.trim()) return;
    setSubmittingDelivery(true);
    try {
      await handleUpdateStatus(activeDealForDelivery.id, 'DELIVERED', deliverableUrl.trim());
      setActiveDealForDelivery(null);
      setDeliverableUrl('');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  // Create custom deal
  const handleCreateCustomDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !customBrand.trim() || !customTitle.trim()) return;
    setSubmittingCustomDeal(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/brand-collabs/deals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: customBrand.trim(),
          dealTitle: customTitle.trim(),
          budget: customBudget,
          deliverables: customDeliverables.split(',').map((s) => s.trim()).filter(Boolean),
          status: 'ACTIVE',
        }),
      });
      if (res.ok) {
        toast.success('Custom brand deal added to pipeline');
        setShowCustomDealModal(false);
        setCustomBrand('');
        setCustomTitle('');
        loadData();
      } else {
        toast.error('Failed to create custom deal');
      }
    } catch {
      toast.error('Error creating custom deal');
    } finally {
      setSubmittingCustomDeal(false);
    }
  };

  // Save profile & rate card
  const handleSaveProfile = async (patch?: Partial<CollabProfile>) => {
    if (!token) return;
    const next = patch ? { ...profile, ...patch } : profile;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/brand-collabs/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        toast.success('Media Kit & Rate Card saved');
      } else {
        toast.error('Failed to save profile');
      }
    } catch {
      toast.error('Error saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={28} />
        <span className="text-sm">Loading Brand Collab Marketplace...</span>
      </div>
    );
  }

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesCat = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      c.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Filtered deals
  const filteredDeals = deals.filter((d) => {
    if (dealFilter === 'proposed') return d.status === 'PROPOSED';
    if (dealFilter === 'active') return ['ACTIVE', 'IN_TALKS', 'IN_PROGRESS'].includes(d.status);
    if (dealFilter === 'delivered') return d.status === 'DELIVERED';
    if (dealFilter === 'completed') return d.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Creator Marketplace</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Find brand campaigns, send pitches and track your deals.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setTab('marketplace')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'marketplace'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Explore Campaigns ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('deals')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'deals'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Deals ({deals.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('rate_card')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                tab === 'rate_card'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Media Kit & Rates
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Active Deals</span>
              <Briefcase size={18} />
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-foreground">{stats.activeCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">In production & talks</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Pipeline Value</span>
              <DollarSign size={18} />
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-foreground">${stats.pipelineValue}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Active + proposed budget</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Completed Deals</span>
              <Award size={18} />
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-foreground">{stats.completedCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Delivered partnerships</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Open to Collabs</span>
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => {
                  const nextState = !profile.collabOpen;
                  setProfile({ ...profile, collabOpen: nextState });
                  handleSaveProfile({ collabOpen: nextState });
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  profile.collabOpen ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {profile.collabOpen ? 'Brands can discover your profile' : 'Profile hidden from marketplace'}
            </div>
          </div>
        </div>

        {/* ─── TAB 1: MARKETPLACE (BRAND CAMPAIGNS) ─── */}
        {tab === 'marketplace' && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All Niches' },
                  { id: 'tech', label: 'Tech & Dev' },
                  { id: 'gaming', label: 'Gaming' },
                  { id: 'lifestyle', label: 'Lifestyle' },
                  { id: 'edtech', label: 'EdTech' },
                  { id: 'fitness', label: 'Fitness' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-slate-900 text-white shadow dark:bg-white/15'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search brand briefs..."
                  className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Campaign Cards Grid */}
            {filteredCampaigns.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-muted-foreground">
                <Handshake size={32} className="opacity-30 mb-2" />
                <p className="text-sm">No campaigns match your filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-card border border-border hover:border-primary transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Brand Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow">
                            {camp.brandName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">{camp.brandName}</span>
                              {camp.verifiedBrand && (
                                <span title="Verified Brand Partner">
                                  <CheckCircle2 size={12} className="text-primary" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              {camp.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-0.5">
                            <DollarSign size={13} />
                            {camp.budgetMin} - {camp.budgetMax} {camp.currency}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                            <Clock size={10} /> By {new Date(camp.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{camp.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {camp.description}
                      </p>

                      {/* Deliverables Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        {camp.deliverables.map((deliv, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 dark:bg-white/5 border border-border text-foreground/80"
                          >
                            <Tag size={10} className="text-primary" />
                            {deliv}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {camp.applied ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Check size={12} /> Proposal {camp.dealStatus || 'Sent'}
                          </span>
                        ) : (
                          'Accepting Creator Pitches'
                        )}
                      </span>

                      {camp.applied ? (
                        <button
                          type="button"
                          onClick={() => setTab('deals')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white transition-colors"
                        >
                          View in Pipeline
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCampaign(camp);
                            setRequestedBudget(camp.budgetMin);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
                        >
                          <Send size={12} /> Apply / Pitch
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: MY DEALS & PIPELINE ─── */}
        {tab === 'deals' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Deal Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all' as const, label: `All Deals (${deals.length})` },
                  { id: 'proposed' as const, label: `Proposals (${stats.proposedCount})` },
                  { id: 'active' as const, label: `In Production (${stats.activeCount})` },
                  { id: 'delivered' as const, label: `Delivered (${stats.deliveredCount})` },
                  { id: 'completed' as const, label: `Completed (${stats.completedCount})` },
                ].map((df) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => setDealFilter(df.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      dealFilter === df.id
                        ? 'bg-slate-900 text-white shadow dark:bg-white/15'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowCustomDealModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/5 transition-colors self-start sm:self-auto"
              >
                <Plus size={14} /> Add Direct Deal
              </button>
            </div>

            {/* Deals List */}
            {filteredDeals.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-muted-foreground">
                <Briefcase size={32} className="opacity-30 mb-2" />
                <p className="text-sm">No brand deals in this pipeline stage.</p>
                <p className="text-xs max-w-sm mt-1">
                  Explore available campaigns in the Marketplace tab to pitch brands or log external sponsorships.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDeals.map((deal) => {
                  const isProposed = deal.status === 'PROPOSED';
                  const isActive = ['ACTIVE', 'IN_TALKS', 'IN_PROGRESS'].includes(deal.status);
                  const isDelivered = deal.status === 'DELIVERED';
                  const isCompleted = deal.status === 'COMPLETED';

                  return (
                    <div
                      key={deal.id}
                      className="p-4 rounded-2xl bg-card border border-border hover:border-slate-200 dark:hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-primary border border-border flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {deal.brandName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground truncate">{deal.dealTitle}</h4>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : isDelivered
                                  ? 'bg-primary/10 text-primary border border-border'
                                  : isActive
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-primary/10 text-primary border border-border'
                              }`}
                            >
                              {deal.status}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-foreground/80">{deal.brandName}</span>
                            <span>•</span>
                            <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Deliverables summary */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {deal.deliverables.map((deliv, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-50 dark:bg-white/5 text-muted-foreground"
                              >
                                {deliv}
                              </span>
                            ))}
                          </div>

                          {deal.deliverableUrl && (
                            <a
                              href={deal.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1.5"
                            >
                              <ExternalLink size={10} /> Proof: {deal.deliverableUrl}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Budget and Actions */}
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <div className="text-base font-bold text-emerald-400">
                          ${deal.budget} {deal.currency}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isProposed && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(deal.id, 'ACTIVE')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                              >
                                Accept Deal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(deal.id, 'DECLINED')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDealForDelivery(deal);
                                setDeliverableUrl(deal.deliverableUrl || '');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
                            >
                              <ExternalLink size={11} /> Submit Deliverable Link
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(deal.id, 'COMPLETED')}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow transition-colors"
                            >
                              <CheckCircle2 size={12} /> Mark Completed & Paid
                            </button>
                          )}

                          {isCompleted && (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <Check size={14} /> Settlement Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: MEDIA KIT & RATE CARD ─── */}
        {tab === 'rate_card' && (
          <div className="space-y-6 flex-1 max-w-2xl">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Collaboration Media Kit
              </h3>
              <p className="text-xs text-muted-foreground">
                Set your baseline rates and sponsorship contact preferences. Brands use this when inviting you to campaigns.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Primary Content Niche / Category
                  </label>
                  <input
                    type="text"
                    value={profile.primaryNiche}
                    onChange={(e) => setProfile({ ...profile, primaryNiche: e.target.value })}
                    placeholder="e.g. Technology, Gaming, Lifestyle, Web Development"
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Sponsorship Contact Email
                  </label>
                  <input
                    type="email"
                    value={profile.contactEmail || ''}
                    onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                    placeholder="sponsorships@yourdomain.com"
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Minimum Campaign Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    value={profile.minBudget}
                    onChange={(e) => setProfile({ ...profile, minBudget: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Creator Bio for Brand Inquiries
                  </label>
                  <textarea
                    rows={3}
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Short summary of your content reach, audience demographics, and past collaborations..."
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Rate Card Grid */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" /> Deliverables Rate Card ($ USD)
              </h3>
              <p className="text-xs text-muted-foreground">
                Your suggested starting prices per deliverable type:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Rate per Reel / Short Video
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <input
                      type="number"
                      value={profile.rateCard.reelRate}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          rateCard: { ...profile.rateCard, reelRate: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Rate per Feed Post / Photo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <input
                      type="number"
                      value={profile.rateCard.postRate}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          rateCard: { ...profile.rateCard, postRate: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Rate per Story Mention
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <input
                      type="number"
                      value={profile.rateCard.storyRate}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          rateCard: { ...profile.rateCard, storyRate: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Rate per Dedicated Video (YouTube/Long)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <input
                      type="number"
                      value={profile.rateCard.videoRate}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          rateCard: { ...profile.rateCard, videoRate: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => handleSaveProfile()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Media Kit & Rates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: SUBMIT PROPOSAL / PITCH ─── */}
      {activeCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveCampaign(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                Sponsorship Proposal
              </span>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                Pitch to {activeCampaign.brandName}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{activeCampaign.title}</p>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">Custom Pitch / Concept</label>
                  <button
                    type="button"
                    disabled={generatingPitch}
                    onClick={handleGenerateAIPitch}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {generatingPitch && <Loader2 size={12} className="animate-spin" />}
                    Draft with AI
                  </button>
                </div>
                <textarea
                  rows={6}
                  required
                  value={proposalPitch}
                  onChange={(e) => setProposalPitch(e.target.value)}
                  placeholder="Explain why your audience is a great match and describe your creative vision for the campaign..."
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Your Quote ($ USD)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={requestedBudget}
                    onChange={(e) => setRequestedBudget(e.target.value ? Number(e.target.value) : '')}
                    placeholder={`${activeCampaign.budgetMin}`}
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Brand budget: ${activeCampaign.budgetMin} - ${activeCampaign.budgetMax}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Turnaround (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={turnaroundDays}
                    onChange={(e) => setTurnaroundDays(Number(e.target.value) || 7)}
                    className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Expected draft within {turnaroundDays} days
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCampaign(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
                >
                  {submittingProposal ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SUBMIT DELIVERABLE LINK ─── */}
      {activeDealForDelivery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-lg relative">
            <button
              type="button"
              onClick={() => setActiveDealForDelivery(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">Submit Deliverable Proof</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the live URL of your published Reel or Post for {activeDealForDelivery.brandName}.
            </p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Live Post / Reel URL
                </label>
                <input
                  type="url"
                  required
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://wevsoft.com/posts/... or https://instagram.com/reel/..."
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDealForDelivery(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelivery}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
                >
                  {submittingDelivery ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE CUSTOM DEAL ─── */}
      {showCustomDealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-lg relative">
            <button
              type="button"
              onClick={() => setShowCustomDealModal(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">Log Direct Brand Deal</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Track an external brand partnership in your Creator Hub pipeline.
            </p>

            <form onSubmit={handleCreateCustomDeal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="e.g. Acme Tech"
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Q4 App Sponsorship"
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Budget ($ USD)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={customBudget}
                  onChange={(e) => setCustomBudget(Number(e.target.value) || 0)}
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Deliverables (comma-separated)
                </label>
                <input
                  type="text"
                  value={customDeliverables}
                  onChange={(e) => setCustomDeliverables(e.target.value)}
                  placeholder="1 Reel, 2 Stories, 1 Feed Post"
                  className="w-full bg-slate-100 dark:bg-black/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomDealModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomDeal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary text-white shadow transition-colors"
                >
                  {submittingCustomDeal ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
