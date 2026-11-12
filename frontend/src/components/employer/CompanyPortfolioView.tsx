import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building, MapPin, Globe, Users, CheckCircle, Star, Briefcase, Rocket, ShieldCheck, Heart, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface CompanyPortfolioViewProps {
  companySlug: string;
  onBackToJobs: () => void;
}

export const CompanyPortfolioView: React.FC<CompanyPortfolioViewProps> = ({ companySlug, onBackToJobs }) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [company, setCompany] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchCompanyPortfolio();
  }, [companySlug]);

  const fetchCompanyPortfolio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/employer/company/${companySlug}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setActiveJobs(data.activeJobs || []);
      }
    } catch (e) {
      console.error('[Company Portfolio Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowCompany = async () => {
    try {
      const res = await fetch(`/api/v1/employer/company/${company?.id || 'comp-1'}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setFollowing(true);
        toast.success(`🎉 Now following ${company?.companyName || 'Company'}!`);
      }
    } catch (e) {
      toast.error('Follow failed');
    }
  };

  const handleGenerateAiSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/v1/employer/ai/seeker-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: company?.companyName,
          description: company?.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        toast.success('✨ AI Seeker Overview generated!');
      }
    } catch (e) {
      toast.error('Summary failed');
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-muted-foreground font-mono">Loading Company Portfolio...</div>;
  }

  if (!company) {
    return <div className="py-20 text-center text-xs text-muted-foreground">Company portfolio not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBackToJobs}
        className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
      >
        <ArrowLeft size={16} />
        <span>Back to Career Jobs Board</span>
      </button>

      {/* Hero Cover Banner & Logo */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl overflow-hidden shadow-2xl space-y-6">
        <div className="relative h-64 sm:h-80 w-full bg-black">
          <img
            src={company.coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80'}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        <div className="p-6 sm:p-8 space-y-6 -mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-black border-4 border-card overflow-hidden shadow-2xl shrink-0">
                <img
                  src={company.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground dark:text-white tracking-tight">{company.companyName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <CheckCircle size={12} /> Verified Company
                  </span>
                </div>
                <div className="text-xs text-zinc-300 font-medium">{company.industry} • {company.location}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFollowCompany}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  following
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90'
                }`}
              >
                <Heart size={16} className={following ? 'fill-emerald-400' : ''} />
                <span>{following ? 'Following' : 'Follow Company'}</span>
              </button>

              <button
                onClick={handleGenerateAiSummary}
                className="px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-extrabold transition-all flex items-center gap-1.5"
              >
                <Sparkles size={16} /> AI Seeker Overview
              </button>
            </div>
          </div>

          {/* AI Seeker Summary Display */}
          {aiSummary && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs leading-relaxed text-purple-200 font-sans whitespace-pre-wrap">
              {aiSummary}
            </div>
          )}

          {/* About Company */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-sm font-extrabold text-foreground">About {company.companyName}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">{company.description}</p>
          </div>

          {/* Company Showcase Projects & Case Studies */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Rocket size={16} className="text-blue-400" /> Products, Services & Case Studies
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(company.projects || []).map((prj: any) => (
                <div key={prj.id} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-2 text-xs">
                  <div className="font-extrabold text-foreground">{prj.title}</div>
                  <p className="text-muted-foreground leading-relaxed">{prj.description}</p>
                  <div className="flex gap-1.5 pt-1">
                    {(prj.technologies || []).map((tech: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] text-zinc-300 font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Job Openings */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Briefcase size={16} className="text-blue-400" /> Active Job Openings ({activeJobs.length})
            </h3>

            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-between text-xs">
                  <div>
                    <div className="font-extrabold text-foreground">{job.title}</div>
                    <div className="text-muted-foreground mt-0.5">{job.location} • {job.salaryRange}</div>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-extrabold shadow-md hover:opacity-90 transition-all">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
