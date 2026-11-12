import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Clock, CheckCircle2, XCircle, Search, Filter, Loader2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

function statusMeta(status?: string) {
  const s = (status || 'APPLIED').toUpperCase();
  if (s === 'INTERVIEW' || s === 'SHORTLISTED') {
    return {
      label: s === 'INTERVIEW' ? 'Interview' : 'Shortlisted',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      icon: Briefcase,
    };
  }
  if (s === 'OFFER' || s === 'HIRED' || s === 'ACCEPTED') {
    return {
      label: 'Offer',
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
      icon: CheckCircle2,
    };
  }
  if (s === 'REJECTED' || s === 'DECLINED') {
    return {
      label: 'Rejected',
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      icon: XCircle,
    };
  }
  return {
    label: s === 'APPLIED' ? 'Applied' : s.replace(/_/g, ' '),
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: Clock,
  };
}

export default function MyApplicationsPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/jobs-creator/applications/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('Failed to load applications');
          return;
        }
        const data = await res.json();
        if (!cancelled) setApplications(data.applications || []);
      } catch {
        if (!cancelled) toast.error('Failed to load applications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const title = app.job?.title || '';
      const company = app.job?.companyName || '';
      return title.toLowerCase().includes(q) || company.toLowerCase().includes(q);
    });
  }, [applications, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">My Applications</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Track and manage your job applications.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles..."
              className="pl-9 pr-4 py-2 bg-card/40 backdrop-blur-md border border-border rounded-xl text-sm outline-none focus:border-blue-500/50 text-foreground"
            />
          </div>
          <button onClick={() => {}}
            type="button"
            aria-label="Filter applications"
            title="Filter applications"
            className="p-2.5 bg-card/40 backdrop-blur-md border border-border rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Filter size={16} className="text-foreground" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin text-blue-500" size={28} />
          <span className="text-sm">Loading your applications...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground bg-card/20 rounded-3xl border border-border">
          <Inbox size={36} className="opacity-50" />
          <p className="text-sm font-medium">
            {applications.length === 0 ? 'No applications yet.' : 'No matches for your search.'}
          </p>
          <button
            onClick={() => navigate('/jobs')}
            className="mt-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((app, index) => {
            const meta = statusMeta(app.status);
            const Icon = meta.icon;
            const company = app.job?.companyName || 'Company';
            const title = app.job?.title || 'Untitled role';
            const date = app.createdAt
              ? new Date(app.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-5 shadow-lg hover:shadow-xl hover:border-border/80 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-md">
                      <span className="text-lg font-black text-white">{company[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-foreground group-hover:text-blue-500 transition-colors">
                        {title}
                      </h3>
                      <p className="text-xs font-bold text-muted-foreground">{company}</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] font-extrabold uppercase ${meta.color}`}
                  >
                    <Icon size={12} /> {meta.label}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Applied on {date}</span>
                  <button
                    type="button"
                    onClick={() => app.job?.id && navigate(`/jobs/${app.job.id}`)}
                    className="text-xs font-extrabold text-foreground hover:text-blue-500 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
