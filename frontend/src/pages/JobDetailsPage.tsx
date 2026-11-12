import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Building2,
  ChevronLeft,
  Share2,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

function formatJobType(type?: string) {
  if (!type) return 'Full-Time';
  return type.replace(/_/g, '-').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${Math.floor(days / 30)} mo ago`;
}

function splitLines(text?: string | null) {
  if (!text) return [];
  return text
    .split(/\n|•|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/jobs-creator/jobs/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (!cancelled) {
            setJob(null);
            toast.error('Job not found');
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setJob(data.job);
      } catch {
        if (!cancelled) toast.error('Failed to load job');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const handleQuickApply = async () => {
    if (!id || !token) {
      toast.error('Please sign in to apply');
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/jobs/${id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coverLetter: 'Interested in this position via Wevsoft Careers.' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(data.error || 'You already applied');
        return;
      }
      if (!res.ok) {
        toast.error(data.error || 'Application failed');
        return;
      }
      toast.success('Application submitted!');
      navigate('/jobs/applications');
    } catch {
      toast.error('Application failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-blue-500" size={28} />
        <span className="text-sm font-medium">Loading job details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center space-y-4">
        <p className="text-muted-foreground">This job could not be found.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  const companyInitial = (job.companyName || 'J')[0].toUpperCase();
  const requirements = splitLines(job.requirements);
  const applicantCount = job._count?.applications ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-1.5 text-sm font-extrabold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={18} /> Back to Jobs
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success('Link copied');
            }}
            className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Share2 size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => {}}
            type="button"
            className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Bookmark size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Briefcase size={200} />
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-between relative z-10">
          <div className="flex gap-5 items-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <span className="text-3xl font-extrabold text-white">{companyInitial}</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{job.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-blue-500 font-extrabold text-sm flex-wrap">
                <Building2 size={16} />
                <span>{job.companyName}</span>
                <span className="text-muted-foreground font-normal ml-2 flex items-center gap-1">
                  <MapPin size={14} /> {job.location || 'Remote'}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto space-y-2">
            <button
              onClick={() => navigate(`/jobs/${id}/apply`)}
              className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              Apply Now <ArrowRight size={18} />
            </button>
            <button
              onClick={handleQuickApply}
              disabled={applying}
              className="w-full md:w-auto px-8 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground font-extrabold rounded-2xl border border-border transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {applying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Quick Apply
            </button>
            <div className="text-center mt-2 text-[11px] font-bold text-muted-foreground">
              {applicantCount} applicant{applicantCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-8 pt-8 border-t border-border">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
            <DollarSign size={16} />
            <span className="text-xs font-extrabold uppercase">{job.salaryRange || 'Competitive'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
            <Briefcase size={16} />
            <span className="text-xs font-extrabold uppercase">{formatJobType(job.jobType)}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <Clock size={16} />
            <span className="text-xs font-extrabold uppercase">{timeAgo(job.createdAt)}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-extrabold mb-4 text-foreground">Job Description</h2>
            <div className="prose prose-sm dark:prose-invert text-muted-foreground space-y-4 whitespace-pre-wrap">
              <p>{job.description}</p>
              {requirements.length > 0 && (
                <>
                  <h3 className="text-foreground font-bold mt-6">Requirements:</h3>
                  <ul className="space-y-2 list-none pl-0">
                    {requirements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-extrabold text-foreground mb-4">About The Company</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <span className="text-lg font-black text-white">{companyInitial}</span>
              </div>
              <div>
                <div className="font-extrabold text-foreground">{job.companyName}</div>
                <div className="text-xs text-muted-foreground font-medium">{job.category || 'General'}</div>
              </div>
            </div>
            {job.employer?.name && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Posted by {job.employer.name}
                {job.employer.username ? ` (@${job.employer.username})` : ''}
              </p>
            )}
          </div>

          {job.category && (
            <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold text-foreground mb-4">Category</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-[11px] font-bold text-muted-foreground">
                  {job.category}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
