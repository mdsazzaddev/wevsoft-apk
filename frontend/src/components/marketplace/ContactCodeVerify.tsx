import React, { useState } from 'react';
import toast from 'react-hot-toast';
import OtpDigitBoxes from '../auth/OtpDigitBoxes';

/** Phone / email proof for sellers: request a 6-digit code for the account's own contact, then enter it. */
function Row({ token, kind, verified, onDone }: { token: string; kind: 'phone' | 'email'; verified: boolean; onDone?: () => void }) {
  const [sent, setSent] = useState<null | { target: string; sent: boolean; devCode?: string }>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const label = kind === 'phone' ? 'Phone' : 'Email';
  const post = async (path: string, body: object) => {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || 'Request failed');
    return j;
  };
  const start = async () => {
    setBusy(true);
    try { setSent(await post(`/api/marketplace/verify/${kind}/start`, {})); setCode(''); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try { await post(`/api/marketplace/verify/${kind}`, { code }); toast.success(`${label} verified`); setSent(null); onDone?.(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground mt-1">{verified ? 'Verified' : sent ? 'Code sent' : 'Not verified'}</div>
      {!verified && !sent && (
        <button type="button" disabled={busy} onClick={start} className="mt-2 text-[11px] font-bold text-cyan-500 disabled:opacity-50">Send code</button>
      )}
      {!verified && sent && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">Enter the 6-digit code {sent.sent ? 'we sent to' : 'for'} {sent.target}. It expires in 10 minutes.</p>
          {sent.devCode && <p className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1">Development only, no delivery set up: <b className="font-mono">{sent.devCode}</b></p>}
          <OtpDigitBoxes label={`${label} code`} value={code} onChange={setCode} autoFocus />
          <div className="flex gap-2">
            <button type="button" disabled={busy || code.length !== 6} onClick={confirm} className="px-3 h-8 rounded-lg bg-cyan-600 text-white text-xs font-bold disabled:opacity-50">Confirm</button>
            <button type="button" disabled={busy} onClick={start} className="text-[11px] font-semibold text-muted-foreground">Resend</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactCodeVerify({ token, phoneVerified, emailVerified, onDone }: { token: string; phoneVerified: boolean; emailVerified: boolean; onDone?: () => void }) {
  return (
    <>
      <Row token={token} kind="phone" verified={phoneVerified} onDone={onDone} />
      <Row token={token} kind="email" verified={emailVerified} onDone={onDone} />
    </>
  );
}
