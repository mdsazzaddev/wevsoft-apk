import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Sparkles, UserPlus, Check } from 'lucide-react';
import { useStore } from '../store';
import { campusApi } from '../lib/campusApi';
import UserAvatar from '../components/UserAvatar';

const STEPS = ['Interests', 'Campus', 'Friends'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const setAuth = useStore((s) => s.setAuth);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presets, setPresets] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const [campus, setCampus] = useState({ institutionId: '', department: '', batchYear: '' });

  useEffect(() => {
    fetch('/api/v1/growth/onboarding', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.completed || user?.registrationCompletedAt || user?.onboardingCompletedAt) {
          navigate('/home', { replace: true });
          return;
        }
        // Interests already collected during registration — start at Campus (step 1).
        setStep(1);
        setPresets(data.presets || []);
        setSelected(data.interests || []);
        setInstitutions(data.institutions || []);
        setFriends(data.friends || data.recommendations || []);
      })
      .catch(() => toast.error('Could not load onboarding'))
      .finally(() => setLoading(false));
  }, [token, navigate, user?.registrationCompletedAt, user?.onboardingCompletedAt]);

  const toggle = (tag: string) => {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const finish = async (alsoCampus = false) => {
    setSaving(true);
    try {
      if (alsoCampus && campus.institutionId) {
        await campusApi.join({
          institutionId: campus.institutionId,
          department: campus.department,
          batchYear: campus.batchYear,
          role: 'student',
        }).catch(() => {});
      }
      const res = await fetch('/api/v1/growth/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selected, friendIds: pickedFriends }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (user) setAuth(token!, { ...user, onboardingCompletedAt: data.user?.onboardingCompletedAt || new Date().toISOString() });
      toast.success('Welcome to Wevsoft');
      navigate('/home', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Could not finish');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-16">
      <header className="rounded-[2rem] border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">One-click setup</p>
        <h1 className="text-2xl font-black mt-1">Make Wevsoft yours</h1>
        <p className="text-sm text-muted-foreground mt-1">Takes about 30 seconds. You can skip any step.</p>
        <div className="flex gap-2 mt-4">
          {STEPS.map((label, i) => (
            <span key={label} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-violet-500' : 'bg-border'}`} />
          ))}
        </div>
      </header>

      {step === 0 && (
        <section className="bg-card/50 border border-border rounded-[2rem] p-5 space-y-4">
          <h2 className="font-extrabold flex items-center gap-2"><Sparkles size={18} /> Interests</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                  selected.includes(tag) ? 'bg-violet-600 text-white border-violet-500' : 'border-border text-muted-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="bg-card/50 border border-border rounded-[2rem] p-5 space-y-3">
          <h2 className="font-extrabold flex items-center gap-2"><GraduationCap size={18} /> Your campus</h2>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {institutions.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setCampus((p) => ({ ...p, institutionId: item.id }))}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                  campus.institutionId === item.id ? 'border-violet-500 bg-violet-500/10 font-bold' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {item.shortName ? `${item.shortName} · ${item.name}` : item.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={campus.department} onChange={(e) => setCampus((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="px-3 py-2 rounded-xl bg-background border border-border text-sm" />
            <input value={campus.batchYear} onChange={(e) => setCampus((p) => ({ ...p, batchYear: e.target.value }))} placeholder="Batch / year" className="px-3 py-2 rounded-xl bg-background border border-border text-sm" />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="bg-card/50 border border-border rounded-[2rem] p-5 space-y-3">
          <h2 className="font-extrabold flex items-center gap-2"><UserPlus size={18} /> People to add</h2>
          {friends.length === 0 && <p className="text-sm text-muted-foreground">No suggestions yet. You can find friends later.</p>}
          <div className="space-y-2">
            {friends.map((f: any) => {
              const id = f.id || f.userId;
              const on = pickedFriends.includes(id);
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setPickedFriends((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]))}
                  className={`w-full flex items-center gap-3 p-2 rounded-2xl border ${on ? 'border-violet-500 bg-violet-500/10' : 'border-border'}`}
                >
                  <UserAvatar user={f} className="w-10 h-10 rounded-full overflow-hidden" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{f.department || f.username || ''}</p>
                  </div>
                  {on && <Check size={16} className="text-violet-400" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="px-4 py-3 rounded-2xl border border-border font-bold text-sm">
            Back
          </button>
        )}
        {step < 2 ? (
          <button onClick={() => setStep((s) => s + 1)} className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-extrabold">
            Continue
          </button>
        ) : (
          <button disabled={saving} onClick={() => finish(true)} className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-extrabold disabled:opacity-50">
            {saving ? 'Saving…' : 'Finish'}
          </button>
        )}
      </div>
      <button onClick={() => finish(false)} className="w-full text-xs font-bold text-muted-foreground">
        Skip for now
      </button>
    </div>
  );
}
