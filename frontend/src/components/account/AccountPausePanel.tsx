import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PauseCircle } from 'lucide-react';
import { useStore } from '../../store';

const DURATIONS = [
  { id: '24h', label: '24 hours' },
  { id: '3d', label: '3 days' },
  { id: '7d', label: '7 days' },
  { id: '1m', label: '1 month' },
  { id: 'custom', label: 'Custom' },
];

export default function AccountPausePanel({ token }: { token: string }) {
  const logout = useStore((s) => s.logout);
  const [duration, setDuration] = useState('24h');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!confirm('Pause this account? You will be signed out. Existing posts stay visible.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/account/self-suspend', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: duration === 'custom' ? undefined : duration,
          endsAt: duration === 'custom' && endsAt ? new Date(endsAt).toISOString() : undefined,
          reason: reason.trim() || 'Paused by account owner',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not pause account');
      toast.success('Account paused. You can restore it from the login screen.');
      await logout();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Temporarily pause your own account. An administrator suspension cannot be removed from here.</p>
      <div className="grid grid-cols-2 gap-2">
        {DURATIONS.map((item) => (
          <button key={item.id} type="button" onClick={() => setDuration(item.id)} className={`rounded-xl px-3 py-2 text-sm font-semibold border ${duration === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
            {item.label}
          </button>
        ))}
      </div>
      {duration === 'custom' && (
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm" />
      )}
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" className="w-full min-h-[80px] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm" />
      <button type="button" disabled={saving} onClick={submit} className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 text-white font-bold py-3">
        <PauseCircle size={16} /> {saving ? 'Pausing…' : 'Pause my account'}
      </button>
    </div>
  );
}
