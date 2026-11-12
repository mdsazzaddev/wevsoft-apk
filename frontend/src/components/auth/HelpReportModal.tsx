import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CaptchaField } from '../captcha/CaptchaField';
import { loadCaptchaConfig } from '../../lib/captcha';

export const HELP_TOPIC_OPTIONS = [
  { id: 'login_broken', label: "Can't sign in / login error" },
  { id: 'account_recovery', label: 'Forgot password / recover account' },
  { id: 'account_security', label: 'Hacked account / suspicious activity' },
  { id: 'bug_auth_ui', label: 'Bug on this login / auth page' },
  { id: 'site_down', label: 'Site or app not loading' },
  { id: 'privacy_data', label: 'Privacy / data request' },
  { id: 'abuse', label: 'Report abuse or harassment' },
  { id: 'feature', label: 'Feedback / suggestion' },
  { id: 'other', label: 'Other' },
] as const;

const MAX_SHOT_BYTES = 5 * 1024 * 1024;
const MAX_SHOT_COUNT = 5;

type PreviewItem = { file: File; url: string };

export type HelpReportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Prefill from signed-out account chip when available */
  defaultEmail?: string | null;
  defaultName?: string | null;
};

export default function HelpReportModal({
  open,
  onClose,
  defaultEmail,
  defaultName,
}: HelpReportModalProps) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronises with an external system (network/media/DOM)
    setTopic('');
    setDescription('');
    setEmail(String(defaultEmail || '').trim());
    setName(String(defaultName || '').trim());
    setPreviews((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.url);
      return [];
    });
    setCaptchaToken(null);
    setError(null);
    setSubmitting(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [open, defaultEmail, defaultName]);

  useEffect(() => {
    return () => {
      setPreviews((prev) => {
        for (const p of prev) URL.revokeObjectURL(p.url);
        return [];
      });
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  const onPickFiles = (list: FileList | null) => {
    setError(null);
    if (!list?.length) return;

    const incoming = Array.from(list);
    const next: PreviewItem[] = [...previews];

    for (const f of incoming) {
      if (next.length >= MAX_SHOT_COUNT) {
        setError(`You can attach up to ${MAX_SHOT_COUNT} photos`);
        break;
      }
      const mime = (f.type || '').toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(mime)) {
        setError('Photos must be JPEG, PNG, or WebP');
        continue;
      }
      if (f.size > MAX_SHOT_BYTES) {
        setError('Each photo must be 5MB or smaller');
        continue;
      }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }

    setPreviews(next);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAt = (index: number) => {
    setPreviews((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!topic) {
      setError('Choose a topic');
      return;
    }
    if (description.trim().length < 20) {
      setError('Please describe the problem in at least 20 characters');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email.trim())) {
      setError('A valid contact email is required');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('topic', topic);
      fd.append('description', description.trim());
      fd.append('contactEmail', email.trim());
      if (name.trim()) fd.append('contactName', name.trim());
      fd.append('path', typeof window !== 'undefined' ? window.location.pathname : '/auth');
      for (const p of previews) {
        fd.append('screenshots', p.file);
      }
      const captcha = await loadCaptchaConfig();
      if (captcha.enabled && captcha.provider === 'turnstile' && captchaToken) {
        fd.append('turnstileToken', captchaToken);
      }

      const headers: Record<string, string> = {};
      try {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined') {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        /* ignore */
      }

      const res = await fetch('/api/help/tickets', {
        method: 'POST',
        headers,
        body: fd,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      setCaptchaToken(null);
      if (!res.ok) {
        setError(String(data?.error || 'Could not submit report'));
        return;
      }
      toast.success('Thanks — we received your report');
      onClose();
    } catch {
      setError('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !submitting) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-foreground shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 id={titleId} className="text-base font-semibold">
                Report a problem
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={submitting}
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Topic</span>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>
                      Select a topic…
                    </option>
                    {HELP_TOPIC_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">What happened?</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="Describe the issue (at least 20 characters)…"
                    className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Contact email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Name (optional)</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Photos (optional, up to {MAX_SHOT_COUNT})
                    </span>
                    {previews.length > 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        {previews.length}/{MAX_SHOT_COUNT}
                      </span>
                    ) : null}
                  </div>

                  {previews.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {previews.map((p, i) => (
                        <div
                          key={p.url}
                          className="relative overflow-hidden rounded-xl border border-border bg-muted/40 aspect-square"
                        >
                          <img
                            src={p.url}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeAt(i)}
                            className="absolute right-1 top-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {previews.length < MAX_SHOT_COUNT ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        >
                          <ImagePlus size={18} />
                          <span className="text-[11px]">Add</span>
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-muted/50"
                    >
                      <ImagePlus size={18} />
                      Add photos
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                </div>

                {error ? (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border px-4 py-3 space-y-3">
                <CaptchaField action="help_ticket" token={captchaToken} onToken={setCaptchaToken} />
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {submitting ? 'Sending…' : 'Submit report'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
