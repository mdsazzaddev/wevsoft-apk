import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MoreHorizontal, Upload } from 'lucide-react';
import { useStore } from '../../store';

export default function UsernameSettingsPanel({ token }: { token: string }) {
  const setAuth = useStore((s) => s.setAuth);
  const user = useStore((s) => s.user);
  const [info, setInfo] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [requested, setRequested] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch('/api/account/username', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setInfo(data);
    setUsername(data.username || '');
    setRequested(data.username || '');
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { load().catch(() => {}); }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/account/username', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not change username');
      if (user) setAuth(token, { ...user, username: data.username });
      toast.success('Username updated');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitHelp = async () => {
    setSaving(true);
    try {
      const body = new FormData();
      body.append('requestedUsername', requested);
      body.append('message', message);
      photos.slice(0, 5).forEach((file) => body.append('photos', file));
      const res = await fetch('/api/account/username-help', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send request');
      toast.success('Help request sent to administrators');
      setHelpOpen(false);
      setMessage('');
      setPhotos([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Username</label>
        <div className="flex gap-2">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm" />
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-xl border border-border" title="More">
            <MoreHorizontal size={16} />
          </button>
        </div>
        {menuOpen && !info?.canChange && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-background shadow-xl z-10 p-2">
            <button type="button" onClick={() => { setMenuOpen(false); setHelpOpen(true); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm">
              Request Username Change Help
            </button>
          </div>
        )}
      </div>
      {!info?.canChange && info?.nextEligibleLabel && (
        <p className="text-xs text-amber-600">You can change your username again on {info.nextEligibleLabel}.</p>
      )}
      <button type="button" disabled={saving || !info?.canChange} onClick={save} className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save username'}
      </button>

      {helpOpen && (
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold">Request help from an administrator</p>
          <input value={requested} onChange={(e) => setRequested(e.target.value)} placeholder="Requested username" className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I need to change my username because..." className="w-full min-h-[90px] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Upload size={14} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
            Attach photos ({photos.length}/5)
          </label>
          <button type="button" disabled={saving} onClick={submitHelp} className="w-full rounded-xl border border-primary text-primary font-bold py-2">Send request</button>
        </div>
      )}
    </div>
  );
}
