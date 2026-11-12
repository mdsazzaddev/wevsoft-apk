import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type TrustMe = {
  phone: string | null;
  phoneVerified: boolean;
  nidStatus: string | null;
  nidLast4: string | null;
  nidRejectReason: string | null;
  identityVerified: boolean;
  warningCount: number;
};

export default function TrustIdentityPanel({ token }: { token: string }) {
  const [me, setMe] = useState<TrustMe | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [last4, setLast4] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/trust/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Could not load verification status');
    const data = await res.json();
    setMe(data);
    setPhone(data.phone || '');
    setLast4(data.nidLast4 || '');
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load().catch((err) => toast.error(err.message));
  }, [load]);

  const requestPhone = async () => {
    setBusy('phone');
    try {
      const res = await fetch('/api/v1/trust/phone/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setDevCode(data.devCode || '');
      toast.success(data.sent ? 'Code sent by SMS to your phone' : data.devCode ? `Dev code: ${data.devCode}` : 'Code generated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const confirmPhone = async () => {
    setBusy('confirm');
    try {
      const res = await fetch('/api/v1/trust/phone/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      toast.success('Phone verified');
      setCode('');
      setDevCode('');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const submitNid = async () => {
    setBusy('nid');
    try {
      const res = await fetch('/api/v1/trust/nid', {
        method: 'POST',
        headers,
        body: JSON.stringify({ last4, documentUrl: documentUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      toast.success('NID submitted for admin review');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  if (!me) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Phone and NID badges help buyers trust you. We never store a full national ID number — only the last 4 digits.
      </p>

      <div className="flex flex-wrap gap-2">
        <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${me.phoneVerified ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
          <Phone size={11} className="inline mr-1" /> {me.phoneVerified ? 'Phone verified' : 'Phone unverified'}
        </span>
        <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${me.identityVerified ? 'bg-blue-500/15 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
          <BadgeCheck size={11} className="inline mr-1" /> {me.identityVerified ? 'NID verified' : me.nidStatus || 'NID not submitted'}
        </span>
      </div>

      <div className="border border-border rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Phone size={16} /> Phone badge
        </h4>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          disabled={me.phoneVerified}
          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm"
        />
        {!me.phoneVerified && (
          <>
            <button
              type="button"
              onClick={requestPhone}
              disabled={busy === 'phone'}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
            >
              {busy === 'phone' ? 'Sending…' : 'Send OTP'}
            </button>
            {devCode && <p className="text-[11px] text-amber-600">Dev code: {devCode}</p>}
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={confirmPhone}
                disabled={busy === 'confirm'}
                className="px-3 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>

      <div className="border border-border rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck size={16} /> NID badge
        </h4>
        {me.nidRejectReason && me.nidStatus === 'rejected' && (
          <p className="text-xs text-rose-500">Rejected: {me.nidRejectReason}</p>
        )}
        {me.identityVerified ? (
          <p className="text-sm text-emerald-600 font-semibold">Your NID is verified. Last 4: •••• {me.nidLast4}</p>
        ) : (
          <>
            <input
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Last 4 digits of NID"
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="Optional document URL (uploaded scan)"
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submitNid}
              disabled={busy === 'nid'}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
            >
              {me.nidStatus === 'pending' ? 'Resubmit for review' : 'Submit for review'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
