import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import {
  cancelWithdrawal,
  confirmDepositSandbox,
  fetchTransactions,
  fetchUnifiedWallet,
  fetchWithdrawals,
  previewWithdrawal,
  requestWithdrawal,
  startDeposit,
  fetchStatementUrl,
  fetchStatementPdfUrl,
  FinanceApiError,
} from '../lib/financeApi';

function money(v: unknown) {
  const n = Number(v) || 0;
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WalletPage() {
  const { active, isSpaceMode, options, setActive, loading: idLoading } = useSpaceIdentities();
  const [search] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('1000');
  const [provider, setProvider] = useState('sslcommerz');
  const [source, setSource] = useState<'PERSONAL' | 'BUSINESS' | 'UNIFIED'>('PERSONAL');
  const [method, setMethod] = useState('BKASH');
  const [dest, setDest] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const context = isSpaceMode ? 'BUSINESS' : 'PERSONAL';
  const spaceId = isSpaceMode ? active?.id : undefined;

  const load = async () => {
    setLoading(true);
    try {
      const [w, t, wd] = await Promise.all([
        fetchUnifiedWallet(),
        fetchTransactions({ context, spaceId, limit: 50 }),
        fetchWithdrawals(),
      ]);
      setData(w);
      setTxs(t.transactions || []);
      setWithdrawals(wd.withdrawals || []);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [context, spaceId]);

  useEffect(() => {
    const depositId = search.get('deposit');
    const pay = search.get('pay');
    if (depositId && pay) {
      confirmDepositSandbox({ transactionId: depositId, sessionId: pay })
        .then(() => {
          toast.success('Deposit verified');
          void load();
        })
        .catch((err) => toast.error(err?.message || 'Could not verify deposit'));
    }
  }, []);

  const balances = useMemo(() => {
    if (!data) return null;
    if (context === 'BUSINESS' && spaceId) {
      const biz = data.businesses?.find((b: any) => b.space.id === spaceId);
      return biz ? { label: biz.space.name, ...biz.wallet, totals: biz.totals } : data.unified;
    }
    return { label: 'Personal', ...data.personal.wallet, totals: data.personal.totals };
  }, [data, context, spaceId]);

  const onDeposit = async () => {
    setBusy(true);
    try {
      const result = await startDeposit({
        amount: Number(amount),
        provider,
        context,
        spaceId,
      });
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else toast.success('Deposit started');
    } catch (err: any) {
      toast.error(err?.message || 'Deposit failed');
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async () => {
    setBusy(true);
    try {
      const result = await previewWithdrawal({
        amount: Number(amount),
        source,
        spaceId: source === 'BUSINESS' ? spaceId : undefined,
      });
      setPreview(result);
    } catch (err: any) {
      toast.error(err?.message || 'Cannot preview');
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async () => {
    setBusy(true);
    try {
      await requestWithdrawal({
        amount: Number(amount),
        source,
        spaceId: source === 'BUSINESS' ? spaceId : undefined,
        method,
        destinationHint: dest,
        confirmPassword,
      });
      toast.success('Withdrawal submitted');
      setPreview(null);
      void load();
    } catch (err: any) {
      if (err instanceof FinanceApiError && err.data?.code === 'REAUTH_REQUIRED') {
        toast.error('Confirm with your password or 2FA code');
      } else {
        toast.error(err?.message || 'Withdrawal failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
            <Wallet size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black">Wallet</h1>
            <p className="text-sm text-muted-foreground">
              Active: {isSpaceMode ? `Business — ${active?.name}` : 'Personal account'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt.kind === 'space' ? opt.id : 'personal'}
              type="button"
              onClick={() => setActive(opt.kind === 'space' ? opt.id : null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                (opt.kind === 'space' && opt.id === active?.id) || (opt.kind !== 'space' && !isSpaceMode)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border'
              }`}
            >
              {opt.kind === 'space' ? opt.name : 'Personal'}
            </button>
          ))}
        </div>
      </header>

      {(loading || idLoading) && <p className="text-sm text-muted-foreground">Loading balances…</p>}

      {balances && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BalanceTile label="Available" value={money(balances.available)} />
          <BalanceTile label="Pending" value={money(balances.pending)} />
          <BalanceTile label="Reserved" value={money(balances.reserved)} />
          <BalanceTile label="Withdrawable" value={money(balances.withdrawable)} />
        </section>
      )}

      {data?.unified && (
        <section className="rounded-3xl border border-border p-4">
          <h2 className="font-bold mb-2">Unified wallet view</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Combined totals. Each taka still belongs to personal or a business ledger.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>Available {money(data.unified.available)}</div>
            <div>Pending {money(data.unified.pending)}</div>
            <div>Withdrawable {money(data.unified.withdrawable)}</div>
            <div>Earnings {money(data.unified.earnings)}</div>
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border p-4 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <ArrowDownToLine size={16} /> Deposit
          </h2>
          <p className="text-xs text-muted-foreground">
            Destination: {context === 'BUSINESS' ? `Business — ${active?.name}` : 'Personal wallet'}
          </p>
          <input className="w-full h-10 rounded-2xl border border-border bg-background px-3" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Deposit amount" />
          <select aria-label="Payment provider" className="w-full h-10 rounded-2xl border border-border bg-background px-3" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="sslcommerz">SSLCOMMERZ / card</option>
            <option value="bkash">bKash</option>
            <option value="stripe">Card (Stripe)</option>
          </select>
          <button type="button" disabled={busy} onClick={onDeposit} className="w-full h-10 rounded-2xl bg-primary text-primary-foreground font-semibold">
            Add money
          </button>
        </div>

        <div className="rounded-3xl border border-border p-4 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <ArrowUpFromLine size={16} /> Withdraw
          </h2>
          <select aria-label="Withdraw from" className="w-full h-10 rounded-2xl border border-border bg-background px-3" value={source} onChange={(e) => setSource(e.target.value as any)}>
            <option value="PERSONAL">Personal wallet</option>
            <option value="BUSINESS">Business wallet</option>
            <option value="UNIFIED">Unified (split, auditable)</option>
          </select>
          <select aria-label="Withdrawal method" className="w-full h-10 rounded-2xl border border-border bg-background px-3" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="BANK">Bank</option>
          </select>
          <input className="w-full h-10 rounded-2xl border border-border bg-background px-3" placeholder="Account number" aria-label="Destination account number" value={dest} onChange={(e) => setDest(e.target.value)} />
          <button type="button" disabled={busy} onClick={onPreview} className="w-full h-10 rounded-2xl border border-border font-semibold">
            Preview fee
          </button>
          {preview && (
            <div className="text-sm space-y-1 rounded-2xl bg-muted/40 p-3">
              <div>Amount {money(preview.amount)}</div>
              <div>Fee {money(preview.fee)}</div>
              <div className="font-bold">You receive {money(preview.net)}</div>
              <ul className="text-xs text-muted-foreground">
                {(preview.allocations || []).map((a: any) => (
                  <li key={a.walletId}>
                    {a.context}: {money(a.amount)}
                  </li>
                ))}
              </ul>
              {preview.requiresReauth && (
                <input className="w-full h-10 rounded-2xl border border-border bg-background px-3 mt-2" type="password" placeholder="Password to confirm" aria-label="Password to confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
              <button type="button" disabled={busy} onClick={onWithdraw} className="w-full h-10 rounded-2xl bg-primary text-primary-foreground font-semibold mt-2">
                Confirm withdrawal
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Transactions</h2>
          <a className="text-sm text-primary" href={fetchStatementUrl({ context, spaceId })}>
            Export CSV
          </a>
            <a className="text-sm text-primary" href={fetchStatementPdfUrl({ context, spaceId })}>
              Export PDF
            </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-2">When</th>
                <th>Type</th>
                <th>Context</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-t border-border">
                  <td className="py-2">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td>{tx.type}</td>
                  <td>{tx.context}</td>
                  <td>{money(tx.amount)}</td>
                  <td>{tx.status}</td>
                  <td className="font-mono text-xs">{tx.reference}</td>
                </tr>
              ))}
              {!txs.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!!withdrawals.length && (
        <section className="rounded-3xl border border-border p-4">
          <h2 className="font-bold mb-3">Withdrawals</h2>
          <ul className="space-y-2 text-sm">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3">
                <span>
                  {money(w.amount)} → {w.method} · {w.status}
                </span>
                {['REQUESTED', 'PENDING_REVIEW', 'APPROVED'].includes(w.status) && (
                  <button type="button" className="text-xs text-destructive" onClick={() => cancelWithdrawal(w.id).then(load)}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BalanceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}
