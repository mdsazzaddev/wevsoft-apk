import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

const JOB_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const CATEGORIES = ['Technology', 'Design', 'Marketing', 'Education', 'Finance'];

export default function CreateJobPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    companyName: '',
    category: 'Technology',
    location: '',
    jobType: 'FULL_TIME',
    salaryRange: '',
    description: '',
    requirements: '',
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitJob = async (status: 'OPEN' | 'DRAFT') => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!token) {
      toast.error('Please sign in to post a job');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          companyName: form.companyName.trim() || 'Wevsoft Company',
          category: form.category,
          location: form.location.trim() || 'Remote',
          jobType: form.jobType,
          salaryRange: form.salaryRange.trim() || undefined,
          description: form.description.trim(),
          requirements: form.requirements.trim() || undefined,
          status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to create job');
        return;
      }

      toast.success(status === 'DRAFT' ? 'Draft saved!' : 'Job published successfully!');
      if (data.job?.id) {
        navigate(`/jobs/${data.job.id}`);
      } else {
        navigate('/jobs');
      }
    } catch {
      toast.error('Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJob('OPEN');
  };

  const inputClass =
    'w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50 text-foreground';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-card/40 backdrop-blur-xl border border-border p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <PlusCircle className="text-blue-500" size={28} />
          <h1 className="text-2xl font-extrabold text-foreground">Create a New Job Post</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Fill out the details below to publish a new job opening to the Job Board.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Job Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                placeholder="e.g. Wevsoft AI Labs"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="e.g. Remote / Dhaka"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Category</label>
              <select
                aria-label="Category"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Job Type</label>
              <select
                aria-label="Job type"
                value={form.jobType}
                onChange={(e) => update('jobType', e.target.value)}
                className={inputClass}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Salary Range</label>
              <input
                type="text"
                value={form.salaryRange}
                onChange={(e) => update('salaryRange', e.target.value)}
                placeholder="e.g. $80k - $120k"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Job Description *</label>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the responsibilities and role..."
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Requirements</label>
            <textarea
              rows={3}
              value={form.requirements}
              onChange={(e) => update('requirements', e.target.value)}
              placeholder="Skills, experience, education..."
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => submitJob('DRAFT')}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-foreground font-extrabold hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-extrabold shadow-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
              Publish Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
