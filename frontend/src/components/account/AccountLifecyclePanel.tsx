import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, PauseCircle, Trash2, Undo2 } from 'lucide-react';

type Lifecycle = {
  status: string;
  hasPassword: boolean;
  graceDays: number;
  deletion: { requestedAt: string; scheduledFor: string } | null;
};

function signOutLocally() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch { /* ignore */ }
  window.location.href = '/';
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Deactivate (hide the account until you sign back in) or delete it after a grace period.
 * Both need the account password (or the username for password-less accounts).
 */
export default function AccountLifecyclePanel({ token }: { token: string }) {
  const [info, setInfo] = useState<Lifecycle | null>(null);
  const [mode, setMode] = useState<'none' | 'deactivate' | 'delete'>('none');
  const [secret, setSecret] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    const r = await fetch('/api/account/lifecycle', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setInfo(await r.json());
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { load(); }, [load]);

  const credential = () => (info?.hasPassword ? { password: secret } : { confirmUsername: secret });

  const submit = async () => {
    setBusy(true);
    try {
      const url = mode === 'deactivate' ? '/api/account/deactivate' : '/api/account/deletion';
      const body = mode === 'deactivate' ? credential() : { ...credential(), confirm };
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Request failed');
      toast.success(mode === 'deactivate' ? 'Account deactivated. Sign in any time to restore it.' : `Deletion scheduled for ${fmt(d.scheduledFor)}.`);
      setTimeout(signOutLocally, 1200);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelDeletion = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/account/deletion/cancel', { method: 'POST', headers, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not cancel');
      toast.success('Deletion cancelled');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="py-6 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const field = info.hasPassword ? 'Current password' : 'Your username';
  const canSubmit = secret.trim().length > 0 && (mode !== 'delete' || confirm.trim().toUpperCase() === 'DELETE');

  return (
    <div className="space-y-3" data-testid="account-lifecycle">
      {info.deletion && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Deletion scheduled for {fmt(info.deletion.scheduledFor)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Requested {fmt(info.deletion.requestedAt)}. Until then you can change your mind.</p>
          </div>
          <button type="button" disabled={busy} onClick={cancelDeletion} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-muted">
            <Undo2 className="w-3.5 h-3.5" /> Keep my account
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => { setMode('deactivate'); setSecret(''); }} className={`text-left rounded-xl border p-3 transition-colors ${mode === 'deactivate' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
          <PauseCircle className="w-5 h-5 text-amber-500" />
          <p className="mt-2 text-sm font-semibold">Deactivate</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your profile, posts and comments are hidden and you are signed out everywhere. Sign in again to restore everything.</p>
        </button>
        <button type="button" disabled={Boolean(info.deletion)} onClick={() => { setMode('delete'); setSecret(''); setConfirm(''); }} className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-50 ${mode === 'delete' ? 'border-red-500 bg-red-500/5' : 'border-border hover:bg-muted/50'}`}>
          <Trash2 className="w-5 h-5 text-red-500" />
          <p className="mt-2 text-sm font-semibold">Delete permanently</p>
          <p className="text-xs text-muted-foreground mt-0.5">The account is hidden now and erased after {info.graceDays} days. Signing in and restoring it before then cancels the deletion. Financial records required by law are kept.</p>
        </button>
      </div>

      {mode !== 'none' && (
        <div className="rounded-xl border border-border p-3 space-y-2.5">
          <label className="block text-xs font-semibold">
            {field}
            <input type={info.hasPassword ? 'password' : 'text'} value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete={info.hasPassword ? 'current-password' : 'off'} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          {mode === 'delete' && (
            <label className="block text-xs font-semibold">
              Type DELETE to confirm
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono" />
            </label>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMode('none')} className="px-3 h-8 rounded-lg border border-border text-xs font-semibold">Cancel</button>
            <button type="button" disabled={!canSubmit || busy} onClick={submit} className={`px-3 h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-50 ${mode === 'delete' ? 'bg-red-600' : 'bg-amber-600'}`}>
              {busy ? 'Working...' : mode === 'delete' ? `Schedule deletion in ${info.graceDays} days` : 'Deactivate account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
