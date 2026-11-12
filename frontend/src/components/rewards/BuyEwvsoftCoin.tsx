import React, { useCallback, useEffect, useState } from 'react';
import { Coins, Upload, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type Package = {
  id: string;
  name: string;
  coins: number;
  priceBdt: number;
  currency: string;
  description: string | null;
};

type Method = {
  id: string;
  name: string;
  accountNo: string;
  accName: string;
  instructions: string | null;
  phone: string | null;
  qrCodes: { id: string; url: string }[];
};

type Purchase = {
  id: string;
  coins: number;
  priceBdt: number;
  trxId: string;
  proofUrl: string;
  status: string;
  createdAt: string;
  package?: { name: string };
  method?: { name: string };
  adminNote?: string | null;
};

const COIN_BRAND = 'ewvsoftcoin';

function statusTone(status: string) {
  if (status === 'approved') return 'text-emerald-600';
  if (status === 'rejected') return 'text-rose-600';
  if (status === 'cancelled') return 'text-muted-foreground';
  return 'text-amber-600';
}

export const BuyEwvsoftCoin: React.FC<{ onCredited?: () => void }> = ({ onCredited }) => {
  const token = useStore((s) => s.token);
  const [packages, setPackages] = useState<Package[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [history, setHistory] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [packageId, setPackageId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [trxId, setTrxId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [userNote, setUserNote] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pkgRes, methodRes, histRes] = await Promise.all([
        fetch('/api/coin-packages', { headers }),
        fetch('/api/coin-payment-methods', { headers }),
        fetch('/api/coin-purchases/mine?limit=20', { headers }),
      ]);
      if (pkgRes.ok) {
        const data = await pkgRes.json();
        setPackages(data.packages || []);
        if (!packageId && data.packages?.[0]) setPackageId(data.packages[0].id);
      }
      if (methodRes.ok) {
        const data = await methodRes.json();
        setMethods(data.methods || []);
        if (!methodId && data.methods?.[0]) setMethodId(data.methods[0].id);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.items || []);
      }
    } catch {
      toast.error('Could not load coin purchase options');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
  }, [load]);

  const selectedPkg = packages.find((p) => p.id === packageId);
  const selectedMethod = methods.find((m) => m.id === methodId);

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      const url = data.path || data.url || data.fileUrl;
      if (!url) throw new Error('no url');
      setProofUrl(url);
      toast.success('Proof uploaded');
    } catch {
      toast.error('Could not upload proof');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageId || !methodId || !trxId.trim() || !proofUrl) {
      toast.error('Select package, payment method, trx ID, and proof');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/coin-purchases', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, methodId, trxId, proofUrl, userNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      toast.success('Submitted — waiting for admin confirmation');
      setTrxId('');
      setProofUrl('');
      setUserNote('');
      await load();
      onCredited?.();
    } catch (err: any) {
      toast.error(err?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      const res = await fetch(`/api/coin-purchases/${id}/cancel`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Cancel failed');
      }
      toast.success('Request cancelled');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Cancel failed');
    }
  };

  if (loading) {
    return (
      <div className="bg-card/40 border border-border rounded-3xl p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={16} /> Loading {COIN_BRAND}…
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-2">
        <Coins size={18} className="text-amber-500" />
        <h2 className="text-lg font-extrabold text-foreground">Buy {COIN_BRAND}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Choose a package, send the amount to an admin payment method, then upload your transaction ID and proof.
        Coins are added only after admin confirmation — no automatic payment.
      </p>

      {packages.length === 0 || methods.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          Coin purchase is not available yet. Admin must publish packages and payment methods (Donations methods).
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Package</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={`text-left rounded-2xl border p-3 transition ${
                    packageId === p.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border bg-black/5 dark:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-foreground">{p.name}</div>
                  <div className="text-sm text-amber-600 font-extrabold">
                    {p.coins.toLocaleString()} {COIN_BRAND}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ৳{p.priceBdt.toLocaleString()} {p.currency}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Pay to (admin method)
            </label>
            <select
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.accName} ({m.accountNo})
                </option>
              ))}
            </select>
            {selectedMethod && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1 rounded-xl border border-border p-3">
                <div>
                  <span className="font-semibold text-foreground">Account:</span> {selectedMethod.accName}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Number:</span> {selectedMethod.accountNo}
                </div>
                {selectedMethod.phone && (
                  <div>
                    <span className="font-semibold text-foreground">Phone:</span> {selectedMethod.phone}
                  </div>
                )}
                {selectedMethod.instructions && <p>{selectedMethod.instructions}</p>}
                {selectedPkg && (
                  <p className="font-semibold text-foreground">
                    Send exactly ৳{selectedPkg.priceBdt.toLocaleString()} for {selectedPkg.coins.toLocaleString()}{' '}
                    {COIN_BRAND}
                  </p>
                )}
                {selectedMethod.qrCodes[0] && (
                  <img
                    src={selectedMethod.qrCodes[0].url}
                    alt={`${selectedMethod.name} QR`}
                    className="mt-2 h-28 w-28 object-contain rounded-lg border border-border bg-white"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Transaction / Trx ID
            </label>
            <input
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. bKash TrxID"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Payment proof (screenshot)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                <Upload size={14} />
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadProof(f);
                  }}
                />
              </label>
              {proofUrl && (
                <a href={proofUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  View proof
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Note (optional)
            </label>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Any extra detail for admin"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : `Submit for admin review`}
          </button>
        </form>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your purchase requests</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase requests yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 bg-black/5 dark:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {h.coins.toLocaleString()} {COIN_BRAND} · ৳{h.priceBdt}
                  </div>
                  <div className={`text-xs font-bold uppercase ${statusTone(h.status)} flex items-center gap-1`}>
                    {h.status === 'approved' ? <CheckCircle2 size={12} /> : null}
                    {h.status === 'pending' ? <Clock size={12} /> : null}
                    {h.status === 'rejected' ? <XCircle size={12} /> : null}
                    {h.status}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {h.method?.name} · trx {h.trxId}
                  </div>
                  {h.adminNote && <div className="text-[11px] text-muted-foreground">Admin: {h.adminNote}</div>}
                </div>
                {h.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancel(h.id)}
                    className="text-xs text-rose-600 shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
