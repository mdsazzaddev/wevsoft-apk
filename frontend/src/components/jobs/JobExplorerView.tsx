import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Briefcase, Building, MapPin, Search, Plus, Sparkles, CheckCircle2, FileText, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface JobExplorerViewProps {
  onOpenAiCareerModal: () => void;
}

export const JobExplorerView: React.FC<JobExplorerViewProps> = ({ onOpenAiCareerModal }) => {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const categories = ['All', 'Technology', 'Design', 'Marketing', 'Education', 'Finance'];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchJobs();
  }, [activeCategory, jobTypeFilter]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/v1/jobs-creator/applications/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAppliedIds(new Set((data.applications || []).map((a: any) => a.jobId)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [token]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/jobs-creator/jobs?';
      if (activeCategory !== 'All') url += `category=${activeCategory}&`;
      if (jobTypeFilter !== 'All') url += `jobType=${jobTypeFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error('[Jobs Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyJob = async (job: any) => {
    if (!token) {
      toast.error('Please sign in to apply');
      return;
    }
    if (appliedIds.has(job.id)) {
      toast('You already applied to this job');
      navigate('/jobs/applications');
      return;
    }
    setApplyingId(job.id);
    try {
      const res = await fetch(`/api/v1/jobs-creator/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetter: `I am excited to apply for ${job.title} at ${job.companyName} via Wevsoft Career Platform.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast('Already applied — opening your applications');
        setAppliedIds((prev) => new Set(prev).add(job.id));
        navigate('/jobs/applications');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Application failed');
      toast.success('1-Click application submitted!');
      setAppliedIds((prev) => new Set(prev).add(job.id));
    } catch (e: any) {
      toast.error(e.message || 'Application failed');
    } finally {
      setApplyingId(null);
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      !searchQuery ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="text-blue-500" size={26} />
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Wevsoft Jobs & Career Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                CAREER V2
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Explore opportunities with 1-click apply, or post a role for your company.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/jobs/create"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg"
            >
              <Plus size={16} /> Post a Job
            </Link>
            <Link
              to="/jobs/applications"
              className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:text-foreground text-xs font-extrabold transition-all flex items-center gap-1.5"
            >
              <FileText size={16} /> My Applications
            </Link>
            <button
              onClick={onOpenAiCareerModal}
              className="px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-extrabold transition-all flex items-center gap-1.5"
            >
              <Sparkles size={16} /> AI ATS Resume Assistant
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, skill, or company..."
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground outline-none focus:border-blue-500/50"
            />
          </div>

          <select
            aria-label="Work mode"
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="bg-black/40 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none shrink-0"
          >
            <option value="All">All Work Modes (Full-Time, Remote, Part-Time)</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="REMOTE">Remote Only</option>
            <option value="PART_TIME">Part Time</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground font-mono">Scanning Wevsoft Jobs Board...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-xs bg-card/20 rounded-3xl border border-border p-8">
          No job opportunities found matching &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const already = appliedIds.has(job.id);
            const applying = applyingId === job.id;
            return (
              <motion.div
                whileHover={{ y: -3 }}
                key={job.id}
                className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-xl hover:border-blue-500/30 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground">{job.title}</h3>
                      <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
                        <Building size={14} /> {job.companyName}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                      {job.jobType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{job.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin size={14} className="text-blue-400" /> {job.location}
                    </span>
                    <span className="font-extrabold text-emerald-400">{job.salaryRange || 'Competitive Salary'}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex-1 py-2.5 rounded-xl border border-border text-center font-extrabold text-xs hover:bg-muted/40 transition-all"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleApplyJob(job)}
                      disabled={applying || already}
                      className={`flex-[1.4] py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 ${
                        already
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                      }`}
                    >
                      {applying ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : already ? (
                        <>
                          <CheckCircle2 size={16} /> Applied
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> 1-Click Apply
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${job.id}/apply`)}
                    className="w-full text-[11px] text-muted-foreground hover:text-primary font-semibold flex items-center justify-center gap-1"
                  >
                    Full application form <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
