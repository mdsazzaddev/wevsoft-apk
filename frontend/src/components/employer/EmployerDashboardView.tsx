import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building, Users, Briefcase, BarChart3, Plus, Sparkles, Send, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface EmployerDashboardViewProps {
  onBackToJobs: () => void;
}

export const EmployerDashboardView: React.FC<EmployerDashboardViewProps> = ({ onBackToJobs }) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile setup states
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [submitting, setSubmitting] = useState(false);

  // AI Recruiter Assistant
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchEmployerDashboard();
  }, []);

  const fetchEmployerDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/employer/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/employer/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companyName, description, industry, location }),
      });

      if (res.ok) {
        toast.success('🎉 Employer Company Profile published live!');
      }
    } catch (e) {
      toast.error('Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiRecruiterAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setLoadingAdvice(true);

    try {
      const res = await fetch('/api/v1/employer/ai/recruiter-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAdvice(data.advice);
        toast.success('✨ AI Recruiter advice generated!');
      }
    } catch (e) {
      toast.error('AI Advice failed');
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building className="text-blue-500" size={26} />
              <h2 className="text-xl font-extrabold text-foreground">Employer Recruiter Dashboard Studio</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage your company profile, then post roles candidates can 1-click apply to.
            </p>
          </div>
          <Link
            to="/jobs/create"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shrink-0"
          >
            <Plus size={16} /> Create Job Post
          </Link>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border">
            <div className="text-xs text-muted-foreground font-extrabold uppercase">Profile Visitors</div>
            <div className="text-2xl font-extrabold text-foreground mt-1">{analytics?.profileViews ?? 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <div className="text-xs font-extrabold uppercase">Company Followers</div>
            <div className="text-2xl font-extrabold mt-1">{analytics?.followersCount ?? 0} Followers</div>
          </div>
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <div className="text-xs font-extrabold uppercase">Job Views</div>
            <div className="text-2xl font-extrabold mt-1">{analytics?.jobViews ?? 0} Views</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <div className="text-xs font-extrabold uppercase">Applicant Conversion</div>
            <div className="text-2xl font-extrabold mt-1">{analytics?.applicantConversionPct ?? 0}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Setup Company Profile */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Plus size={16} className="text-blue-400" /> Setup & Edit Company Profile
          </h3>

          <form onSubmit={handleSetupProfile} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Company Name:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Wevsoft AI Labs"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Company Description & Mission:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your company work culture, mission, and benefits..."
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-blue-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              <span>Save & Publish Company Portfolio</span>
            </button>
          </form>
        </div>

        {/* Right: AI Recruiter Assistant */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-purple-300 flex items-center gap-2">
            <Sparkles size={16} /> AI Recruiter Hiring Assistant
          </h3>

          <form onSubmit={handleAiRecruiterAssist} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Ask AI Hiring Strategy / JD Optimization:</label>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. 'Write a job description for Senior AI Engineer with Competitive Salary'"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAdvice}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              {loadingAdvice ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>Generate Hiring Advice</span>
            </button>
          </form>

          {aiAdvice && (
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
              {aiAdvice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
