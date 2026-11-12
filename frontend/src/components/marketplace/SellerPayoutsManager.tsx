import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, ArrowUpRight, CheckCircle2, AlertCircle, Building, Smartphone, Loader2, ShieldCheck, Lock, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const SellerPayoutsManager: React.FC = () => {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [pendingPayout, setPendingPayout] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState('bKash');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [bankInfo, setBankInfo] = useState<any>(null);

  // Withdrawal modal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/payouts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayouts(data.payouts || []);
        setAvailableBalance(Number(data.availableBalance ?? 0));
        setPendingPayout(Number(data.pendingPayout ?? 0));
        setPayoutMethod(data.payoutMethod || 'bKash');
        setPayoutDetails(data.payoutDetails || '');
        setBankInfo(data.bankInfo || null);
      }
    } catch (e) {
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchPayoutData();
  }, []);

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter valid withdrawal amount');
      return;
    }
    if (amt > availableBalance) {
      toast.error('Amount exceeds your available Escrow balance');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          method: payoutMethod,
          accountInfo: payoutDetails,
          note: withdrawNote
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`🎉 Payout request of ৳${amt} submitted!`);
        setWithdrawAmount('');
        setWithdrawNote('');
        fetchPayoutData();
      } else {
        toast.error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      toast.error('Network error during withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider opacity-80">Available Escrow Balance</p>
            <h3 className="text-3xl font-black mt-2">৳{availableBalance.toLocaleString()}</h3>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs opacity-90 border-t border-white/20 mt-4">
            <span>Settled & Ready for Withdrawal</span>
            <span className="font-bold">Wevsoft Pay Escrow ✓</span>
          </div>
        </div>

        <div className="bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">Pending in Transit</p>
            <h3 className="text-2xl font-black text-foreground mt-2">৳{pendingPayout.toLocaleString()}</h3>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border mt-4">
            <Clock size={14} className="text-amber-400 shrink-0" />
            <span>Clears 24h after buyer confirms delivery</span>
          </div>
        </div>

        <div className="bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">Commission Rate Tier</p>
            <h3 className="text-2xl font-black text-purple-400 mt-2">6.0% Fee</h3>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border mt-4">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Electronics category verified rate</span>
          </div>
        </div>
      </div>

      {/* Withdrawal Form & Payout Method Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal Form */}
        <div className="bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <DollarSign size={20} className="text-purple-400" />
            <h3 className="text-base font-extrabold text-foreground">Request Escrow Payout</h3>
          </div>

          <form onSubmit={handleRequestWithdrawal} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground">Withdrawal Amount (BDT ৳)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max: ${availableBalance}`}
                required
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Target Verified Account</label>
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between mt-1">
                <div className="flex items-center gap-2.5">
                  <CreditCard size={18} className="text-purple-400" />
                  <div>
                    <p className="text-xs font-extrabold text-foreground">{payoutMethod} Wallet / Account</p>
                    <p className="text-[11px] text-muted-foreground">{payoutDetails || 'No account configured yet'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${payoutDetails ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {payoutDetails ? 'Verified ✓' : 'Setup Required'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Optional Reference Note</label>
              <input
                type="text"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="e.g. Weekly inventory settlement"
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || availableBalance <= 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit Withdrawal Request
            </button>
          </form>
        </div>

        {/* Recent Payouts Table */}
        <div className="bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-extrabold text-foreground">Payout Transaction History</h3>
            <span className="text-xs text-muted-foreground">Escrow Ledger</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-8 space-y-1">
              <p className="text-xs font-bold text-foreground">No withdrawal transactions yet</p>
              <p className="text-[11px] text-muted-foreground">Request your first payout once your sales balance clears</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
              {payouts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
                  <div>
                    <p className="text-xs font-extrabold text-foreground">৳{p.amount.toLocaleString()} via {p.method}</p>
                    <p className="text-[10px] text-muted-foreground">{p.accountInfo} • {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'PAID' || p.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-muted-foreground flex items-center gap-2">
            <Lock size={15} className="text-purple-400 shrink-0" />
            <span>
              All transactions are secured by Bangladesh Bank compliant Escrow & automated bKash/Nagad settlement APIs.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
