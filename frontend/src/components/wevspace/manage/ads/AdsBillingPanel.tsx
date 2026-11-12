import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  confirmAdsDeposit,
  fetchAdsBilling,
  startAdsDeposit,
} from '../../../../lib/wevspaceManageApi';
import { useManage } from '../ManageContext';
import { ActionButton, Field, PanelError, PanelSkeleton, StatTile, TextInput, money, usePanelData } from '../manageUi';

export default function AdsBillingPanel({ accent }: { accent?: string }) {
  const { spaceId, can } = useManage();
  const canManage = can('promotion.manage');
  const billing = usePanelData(() => fetchAdsBilling(spaceId, { limit: 40 }), [spaceId]);
  const [amount, setAmount] = useState('500');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== '1') return;
    const deposit = params.get('deposit');
    const pay = params.get('pay');
    if (!deposit && !pay) return;
    void (async () => {
      try {
        setBusy(true);
        await confirmAdsDeposit(spaceId, { transactionId: deposit || undefined, sessionId: pay || undefined });
        toast.success('Funds added to your Ads wallet');
        await billing.reload();
        params.delete('billing');
        params.delete('deposit');
        params.delete('pay');
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
        window.history.replaceState({}, '', next);
      } catch (err: any) {
        toast.error(err?.message || 'Could not confirm deposit');
      } finally {
        setBusy(false);
      }
    })();
     
  }, [spaceId]);

  async function addFunds() {
    if (!canManage) return;
    setBusy(true);
    try {
      const session = await startAdsDeposit(spaceId, { amount: Number(amount), currency: 'BDT', provider: 'sslcommerz' });
      if (session.mode === 'sandbox' && session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      toast.error('No checkout URL returned');
    } catch (err: any) {
      toast.error(err?.message || 'Could not start deposit');
    } finally {
      setBusy(false);
    }
  }

  if (billing.loading) return <PanelSkeleton />;
  if (billing.error) return <PanelError message={billing.error} onRetry={billing.reload} />;
  const account = billing.data?.account;
  const currency = account?.currency || 'BDT';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Balance" value={money(account?.balance, currency)} icon={<Wallet size={16} />} accent={accent} />
        <StatTile label="Available" value={money(account?.availableBalance, currency)} />
        <StatTile label="Reserved" value={money(account?.reservedBalance, currency)} />
        <StatTile label="Total spent" value={money(account?.totalSpend, currency)} />
      </div>

      {canManage && (
        <div className="rounded-3xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-extrabold">Add funds</p>
          <Field label="Amount (BDT)">
            <TextInput type="number" min={100} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void addFunds()}>
            Pay with SSLCommerz
          </ActionButton>
          <p className="text-[11px] text-muted-foreground">
            Wallet is credited only after server-side payment verification. Sandbox deposits confirm when you return here.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
          Transaction history
        </div>
        <ul className="divide-y divide-border">
          {(billing.data?.transactions || []).map((tx: any) => (
            <li key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-bold truncate">{tx.type}</p>
                <p className="text-[11px] text-muted-foreground">{tx.status} · {new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <p className="font-black tabular-nums">{money(tx.amount, tx.currency || currency)}</p>
            </li>
          ))}
          {(billing.data?.transactions || []).length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No wallet transactions yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
