import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  CheckCircle2,
  ChevronRight,
  User,
  Briefcase,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

export default function JobApplicationFormPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const totalSteps = 3;

  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    linkedin: '',
    portfolio: '',
    experience: '1-3 years',
    resumeUrl: '',
    coverLetter: '',
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jobs-creator/jobs/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [jobId, token]);

  const buildCoverLetter = () => {
    const parts = [
      form.coverLetter.trim(),
      form.linkedin ? `LinkedIn: ${form.linkedin}` : '',
      form.portfolio ? `Portfolio: ${form.portfolio}` : '',
      form.experience ? `Experience: ${form.experience}` : '',
      form.phone ? `Phone: ${form.phone}` : '',
      `${form.firstName} ${form.lastName}`.trim() ? `Applicant: ${form.firstName} ${form.lastName}`.trim() : '',
      form.email ? `Email: ${form.email}` : '',
    ].filter(Boolean);
    return parts.join('\n') || 'Interested in this position.';
  };

  const handleSubmit = async () => {
    if (!jobId) {
      toast.error('Missing job id');
      return;
    }
    if (!token) {
      toast.error('Please sign in to apply');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetter: buildCoverLetter(),
          resumeUrl: form.resumeUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(data.error || 'You already applied to this job');
        navigate('/jobs/applications');
        return;
      }
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit application');
        return;
      }
      toast.success('Application submitted successfully!');
      navigate('/jobs/applications');
    } catch {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500/50 transition-colors text-foreground';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground">
          Apply for {job?.title || 'this role'}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {job?.companyName ? `at ${job.companyName}` : 'Complete your application'}
        </p>
      </div>

      <div className="flex items-center justify-between relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full -z-10" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        />

        {[
          { id: 1, icon: User, label: 'Personal Details' },
          { id: 2, icon: Briefcase, label: 'Experience' },
          { id: 3, icon: FileSignature, label: 'Resume & Cover' },
        ].map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2 bg-background p-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                step >= s.id
                  ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-card border-border text-muted-foreground'
              }`}
            >
              {step > s.id ? <CheckCircle2 size={20} /> : <s.icon size={18} />}
            </div>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                step >= s.id ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-xl font-extrabold text-foreground mb-6 flex items-center gap-2">
                <User className="text-blue-500" /> Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className={inputClass}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className={inputClass}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={inputClass}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-xl font-extrabold text-foreground mb-6 flex items-center gap-2">
                <Briefcase className="text-blue-500" /> Professional Profiles
              </h2>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">LinkedIn URL</label>
                <input
                  type="url"
                  value={form.linkedin}
                  onChange={(e) => update('linkedin', e.target.value)}
                  className={inputClass}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Portfolio / GitHub URL</label>
                <input
                  type="url"
                  value={form.portfolio}
                  onChange={(e) => update('portfolio', e.target.value)}
                  className={inputClass}
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Years of Experience</label>
                <select
                  value={form.experience}
                  onChange={(e) => update('experience', e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option>Less than 1 year</option>
                  <option>1-3 years</option>
                  <option>3-5 years</option>
                  <option>5+ years</option>
                </select>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-xl font-extrabold text-foreground mb-6 flex items-center gap-2">
                <FileSignature className="text-blue-500" /> Documents
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Resume URL (optional)</label>
                <div className="border-2 border-dashed border-border hover:border-blue-500/50 rounded-2xl p-6 bg-black/5 dark:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Paste a resume link</h3>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Drive, Dropbox, or public PDF URL
                      </p>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={form.resumeUrl}
                    onChange={(e) => update('resumeUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Cover Letter</label>
                <textarea
                  rows={5}
                  value={form.coverLetter}
                  onChange={(e) => update('coverLetter', e.target.value)}
                  className={inputClass}
                  placeholder="Why are you a great fit for this role?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              step === 1
                ? 'opacity-0 pointer-events-none'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-foreground'
            }`}
          >
            Back
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
              className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
