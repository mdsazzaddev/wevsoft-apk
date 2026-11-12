import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  HelpCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Tag,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import api from '../../../../lib/api';
import { cx } from '../../devUi';
import { useDevAccount } from '../accountContext';
import {
  AppSelect,
  Card,
  CodeBox,
  ConsolePage,
  EmptyState,
  InfoNote,
  LoadingRows,
  NoAppsState,
  Pill,
  StatTile,
  btn,
  fmtDate,
  inputCls,
  labelCls,
  selectCls,
  tdCls,
  thCls,
} from '../ui';
import type { DeveloperApp } from '../../devApi';

interface PayoutSummary {
  currency: string;
  grossSales: number;
  platformFeeRate: number;
  platformFee: number;
  netEarnings: number;
  totalPaidOut: number;
  pendingPayout: number;
  availableBalance: number;
  minPayoutThreshold: number;
  canRequestPayout: boolean;
  totalApps: number;
  totalPaidOrders: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: string;
  method: string;
  destinationHint: string;
  note?: string;
  createdAt: string;
  processedAt?: string;
}

interface PayoutMethod {
  id: string;
  method: string;
  label: string;
  accountHint: string;
  isDefault: boolean;
  createdAt: string;
}

interface AppMonetizationConfig {
  pricingType: 'free' | 'paid_once' | 'subscription';
  price: number;
  currency: 'BDT' | 'USD';
  billingInterval?: 'monthly' | 'yearly';
  trialDays?: number;
  isActive: boolean;
}

export function MonetizationPage() {
  const { apps, appsQuery } = useDevAccount();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'payouts' | 'pricing' | 'checkout'>('payouts');
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  // Selected app for pricing configuration
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  React.useEffect(() => {
    if (!selectedAppId && apps.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSelectedAppId(apps[0]!.id);
    }
  }, [apps, selectedAppId]);

  // Queries
  const summaryQuery = useQuery<PayoutSummary>({
    queryKey: ['developerConsole', 'payoutSummary'],
    queryFn: async () => (await api.get('/api/developer/payouts/summary')).data.summary,
    staleTime: 30_000,
  });

  const historyQuery = useQuery<PayoutRecord[]>({
    queryKey: ['developerConsole', 'payoutHistory'],
    queryFn: async () => (await api.get('/api/developer/payouts/history')).data.history,
    staleTime: 30_000,
  });

  const methodsQuery = useQuery<PayoutMethod[]>({
    queryKey: ['developerConsole', 'payoutMethods'],
    queryFn: async () => (await api.get('/api/developer/payouts/methods')).data.methods,
    staleTime: 60_000,
  });

  const pricingQuery = useQuery<AppMonetizationConfig>({
    queryKey: ['developerConsole', 'appPricing', selectedAppId],
    queryFn: async () => (await api.get(`/api/developer/apps/${selectedAppId}/monetization`)).data.monetization,
    enabled: Boolean(selectedAppId),
    staleTime: 30_000,
  });

  // State for pricing editor
  const [pricingForm, setPricingForm] = useState<AppMonetizationConfig>({
    pricingType: 'free',
    price: 0,
    currency: 'BDT',
    billingInterval: 'monthly',
    trialDays: 0,
    isActive: true,
  });

  React.useEffect(() => {
    if (pricingQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPricingForm(pricingQuery.data);
    }
  }, [pricingQuery.data]);

  const updatePricingMutation = useMutation({
    mutationFn: async (payload: AppMonetizationConfig) =>
      (await api.put(`/api/developer/apps/${selectedAppId}/monetization`, payload)).data,
    onSuccess: () => {
      toast.success('App monetization settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'appPricing', selectedAppId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not save monetization settings');
    },
  });

  // Payout request form state
  const [payoutAmount, setPayoutAmount] = useState<string>('500');
  const [payoutMethod, setPayoutMethod] = useState<string>('BKASH');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [destinationHint, setDestinationHint] = useState<string>('');
  const [payoutNote, setPayoutNote] = useState<string>('');

  const requestPayoutMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/api/developer/payouts/request', payload)).data,
    onSuccess: () => {
      toast.success('Payout request submitted successfully!');
      setPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'payoutSummary'] });
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'payoutHistory'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not submit payout request');
    },
  });

  // New payout method form state
  const [newMethodType, setNewMethodType] = useState('BKASH');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newMethodAccount, setNewMethodAccount] = useState('');
  const [newMethodDefault, setNewMethodDefault] = useState(false);

  const saveMethodMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/api/developer/payouts/methods', payload)).data,
    onSuccess: () => {
      toast.success('Payout method added successfully');
      setMethodModalOpen(false);
      setNewMethodLabel('');
      setNewMethodAccount('');
      queryClient.invalidateQueries({ queryKey: ['developerConsole', 'payoutMethods'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not save payout method');
    },
  });

  const summary = summaryQuery.data;
  const history = historyQuery.data || [];
  const payoutMethods = methodsQuery.data || [];

  const statusTone = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'green';
      case 'PROCESSING':
      case 'REQUESTED':
      case 'PENDING_REVIEW':
        return 'amber';
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <ConsolePage
      group="Overview"
      title="Monetization & Payouts"
      description="Track developer revenue, manage app pricing models, and withdraw earned payouts."
    >
      {appsQuery.isLoading ? (
        <LoadingRows rows={5} />
      ) : apps.length === 0 ? (
        <NoAppsState what="monetization & payouts" />
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
            <StatTile
              icon={DollarSign}
              label="Gross Sales"
              value={summary ? `৳${summary.grossSales.toLocaleString('en-US')}` : '—'}
              tone="blue"
              hint={`${summary?.totalPaidOrders || 0} completed orders`}
            />
            <StatTile
              icon={ShieldCheck}
              label="Platform Fee (15%)"
              value={summary ? `৳${summary.platformFee.toLocaleString('en-US')}` : '—'}
              tone="gray"
              hint="Standard platform commission"
            />
            <StatTile
              icon={Banknote}
              label="Net Earnings (85%)"
              value={summary ? `৳${summary.netEarnings.toLocaleString('en-US')}` : '—'}
              tone="green"
            />
            <StatTile
              icon={Wallet}
              label="Available for Payout"
              value={summary ? `৳${summary.availableBalance.toLocaleString('en-US')}` : '—'}
              tone={summary && summary.availableBalance >= 500 ? 'green' : 'amber'}
              hint={summary?.pendingPayout ? `৳${summary.pendingPayout.toLocaleString('en-US')} pending` : 'Ready to withdraw'}
            />
          </div>

          {/* Action Header & Tabs */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dc-border)] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('payouts')}
                className={cx(
                  'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'payouts'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                Payouts & Withdrawals
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={cx(
                  'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'pricing'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                App Pricing & Monetization
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('checkout')}
                className={cx(
                  'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  activeTab === 'checkout'
                    ? 'bg-[var(--dc-blue)] text-white shadow-sm'
                    : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)] hover:bg-[var(--dc-hover)]'
                )}
              >
                In-App Checkout API
              </button>
            </div>

            {activeTab === 'payouts' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMethodModalOpen(true)}
                  className={cx(btn.secondary, btn.sm)}
                >
                  <Plus size={13} /> Add Payout Method
                </button>
                <button
                  type="button"
                  disabled={!summary?.canRequestPayout}
                  onClick={() => {
                    setPayoutAmount(String(summary?.availableBalance || 500));
                    setPayoutModalOpen(true);
                  }}
                  className={cx(btn.primary, btn.sm, !summary?.canRequestPayout && 'opacity-60 cursor-not-allowed')}
                >
                  <Send size={13} /> Request Payout
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: Payouts & Withdrawals */}
          {activeTab === 'payouts' && (
            <div className="mt-4 space-y-4">
              {/* Saved Methods Strip */}
              <Card
                title="Saved Payout Destinations"
                description="Your linked mobile banking handles and bank accounts for automatic settlement."
                bodyClassName="!py-3"
              >
                {methodsQuery.isLoading ? (
                  <LoadingRows rows={2} />
                ) : payoutMethods.length === 0 ? (
                  <div className="flex items-center justify-between py-2">
                    <p className="text-[12px] text-[var(--dc-muted)]">No saved payout methods yet.</p>
                    <button
                      type="button"
                      onClick={() => setMethodModalOpen(true)}
                      className={cx(btn.secondary, btn.sm)}
                    >
                      <Plus size={12} /> Add bKash / Nagad / Bank
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 min-[640px]:grid-cols-3">
                    {payoutMethods.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] flex items-start justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[12.5px] text-[var(--dc-text)]">{m.label}</span>
                            {m.isDefault && <Pill tone="blue">Default</Pill>}
                          </div>
                          <p className="text-[11px] text-[var(--dc-muted)] mt-0.5">{m.method} • {m.accountHint}</p>
                        </div>
                        <CreditCard size={15} className="text-[var(--dc-muted)]" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Payout History Table */}
              <Card
                title="Payout History & Withdrawal Requests"
                description="Real-time log of payout requests submitted by your developer account."
                bodyClassName="!p-0"
              >
                {historyQuery.isLoading ? (
                  <div className="p-4"><LoadingRows rows={3} /></div>
                ) : history.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Banknote}
                      title="No payout requests yet"
                      body="When your app generates revenue, request a withdrawal here to transfer earnings to your account."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr>
                          <th className={thCls}>Date</th>
                          <th className={thCls}>Request ID</th>
                          <th className={thCls}>Method</th>
                          <th className={thCls}>Destination</th>
                          <th className={thCls}>Gross Amount</th>
                          <th className={thCls}>Net Transfer</th>
                          <th className={thCls}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h) => (
                          <tr key={h.id} className="hover:bg-[var(--dc-hover)]">
                            <td className={cx(tdCls, 'whitespace-nowrap')}>{fmtDate(h.createdAt, true)}</td>
                            <td className={cx(tdCls, 'font-mono text-[11px]')}>{h.id.slice(0, 13)}...</td>
                            <td className={tdCls}>{h.method}</td>
                            <td className={cx(tdCls, 'max-w-[200px] truncate')}>{h.destinationHint}</td>
                            <td className={tdCls}>৳{h.amount.toLocaleString('en-US')}</td>
                            <td className={cx(tdCls, 'font-semibold')}>৳{h.netAmount.toLocaleString('en-US')}</td>
                            <td className={tdCls}>
                              <Pill tone={statusTone(h.status)}>{h.status}</Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <InfoNote>
                Withdrawal requests are processed within 24–48 business hours. The minimum withdrawal threshold is ৳500 (or $5.00). Standard 15% platform commission applies to gross sales.
              </InfoNote>
            </div>
          )}

          {/* TAB 2: App Pricing & Monetization */}
          {activeTab === 'pricing' && (
            <div className="mt-4 space-y-4">
              <Card
                title="Application Pricing Model"
                description="Configure whether users pay once, subscribe recurringly, or access your app for free."
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--dc-muted)]">Select App:</span>
                    <AppSelect apps={apps} value={selectedAppId} onChange={setSelectedAppId} />
                  </div>
                }
              >
                {pricingQuery.isLoading ? (
                  <LoadingRows rows={4} />
                ) : (
                  <div className="max-w-[560px] space-y-4">
                    <div>
                      <label className={labelCls}>Monetization Model</label>
                      <select
                        aria-label="Monetization Model"
                        value={pricingForm.pricingType}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            pricingType: e.target.value as any,
                            price: e.target.value === 'free' ? 0 : prev.price || 100,
                          }))
                        }
                        className={selectCls}
                      >
                        <option value="free">Free (Zero Cost / Ad-supported)</option>
                        <option value="paid_once">Paid Upfront (One-time purchase to install)</option>
                        <option value="subscription">Recurring Subscription (Monthly / Yearly)</option>
                      </select>
                    </div>

                    {pricingForm.pricingType !== 'free' && (
                      <div className="grid gap-3 min-[640px]:grid-cols-2">
                        <div>
                          <label className={labelCls}>Price Amount</label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={pricingForm.price}
                            onChange={(e) => setPricingForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                            className={inputCls}
                            placeholder="e.g. 250"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Currency</label>
                          <select
                            aria-label="Currency"
                            value={pricingForm.currency}
                            onChange={(e) => setPricingForm((prev) => ({ ...prev, currency: e.target.value as any }))}
                            className={selectCls}
                          >
                            <option value="BDT">BDT (৳ Taka)</option>
                            <option value="USD">USD ($ US Dollar)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {pricingForm.pricingType === 'subscription' && (
                      <div className="grid gap-3 min-[640px]:grid-cols-2">
                        <div>
                          <label className={labelCls}>Billing Interval</label>
                          <select
                            aria-label="Billing Interval"
                            value={pricingForm.billingInterval || 'monthly'}
                            onChange={(e) => setPricingForm((prev) => ({ ...prev, billingInterval: e.target.value as any }))}
                            className={selectCls}
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Trial Period (Days)</label>
                          <input
                            type="number"
                            min="0"
                            value={pricingForm.trialDays || 0}
                            onChange={(e) => setPricingForm((prev) => ({ ...prev, trialDays: Number(e.target.value) }))}
                            className={inputCls}
                            placeholder="0 for no trial"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={updatePricingMutation.isPending}
                        onClick={() => updatePricingMutation.mutate(pricingForm)}
                        className={cx(btn.primary, updatePricingMutation.isPending && 'opacity-60')}
                      >
                        {updatePricingMutation.isPending ? 'Saving...' : 'Save Monetization Settings'}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: In-App Checkout API */}
          {activeTab === 'checkout' && (
            <div className="mt-4 space-y-4">
              <Card
                title="In-App Digital Goods & Purchases API"
                description="Accept payments inside your application using WebSoft's seamless checkout engine."
              >
                <p className="text-[12px] text-[var(--dc-text-2)] mb-3">
                  Developers can trigger on-demand checkout orders for virtual currency, premium items, or subscriptions. When users complete payment, your server receives an instant <code className="dc-code">order.paid</code> webhook delivery.
                </p>
                <CodeBox
                  code={`// 1. Create a Checkout Order from your server (Bearer token / API Key)
curl -X POST '${window.location.origin}/api/developer/payments/create-order' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 250,
    "currency": "BDT",
    "description": "1,000 In-App Credits Pack",
    "redirectUrl": "https://yourapp.com/checkout/return",
    "metadata": {
      "userGameId": "gamer_994"
    }
  }'

// Response returns checkoutUrl for user redirection:
{
  "data": {
    "id": "pay_987xyz",
    "orderId": "ord_a1b2c3d4e5",
    "amount": 250,
    "currency": "BDT",
    "checkoutUrl": "${window.location.origin}/wallet?checkoutOrder=pay_987xyz"
  }
}`}
                />
              </Card>
            </div>
          )}

          {/* Request Payout Modal */}
          {payoutModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-[var(--dc-card)] border border-[var(--dc-border)] rounded-2xl max-w-[460px] w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--dc-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center">
                      <Send size={15} />
                    </span>
                    <h3 className="font-semibold text-[15px] text-[var(--dc-text)]">Request Payout</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className="text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-[var(--dc-card-2)] border border-[var(--dc-border)]">
                  <p className="text-[11px] text-[var(--dc-muted)]">Available Withdrawable Balance</p>
                  <p className="text-[18px] font-bold text-[var(--dc-text)] mt-0.5">
                    ৳{summary?.availableBalance.toLocaleString('en-US') || 0}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Withdrawal Amount (BDT)</label>
                    <input
                      type="number"
                      min="500"
                      max={summary?.availableBalance || 500}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className={inputCls}
                      placeholder="Min. 500"
                    />
                    <p className="text-[11px] text-[var(--dc-muted)] mt-1">Minimum withdrawal is ৳500.</p>
                  </div>

                  <div>
                    <label className={labelCls}>Payout Method</label>
                    <select
                      aria-label="Payout Method"
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className={selectCls}
                    >
                      <option value="BKASH">bKash Mobile Banking</option>
                      <option value="NAGAD">Nagad Mobile Banking</option>
                      <option value="BANK">Bank Account Wire</option>
                      <option value="STRIPE">Stripe Connect</option>
                    </select>
                  </div>

                  {payoutMethods.length > 0 && (
                    <div>
                      <label className={labelCls}>Saved Account (Optional)</label>
                      <select
                        aria-label="Saved Account"
                        value={selectedMethodId}
                        onChange={(e) => {
                          setSelectedMethodId(e.target.value);
                          const m = payoutMethods.find((x) => x.id === e.target.value);
                          if (m) setDestinationHint(`${m.label} (${m.accountHint})`);
                        }}
                        className={selectCls}
                      >
                        <option value="">-- Choose saved account or enter below --</option>
                        {payoutMethods.map((m) => (
                          <option key={m.id} value={m.id}>{m.label} ({m.accountHint})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Account Details / Number</label>
                    <input
                      type="text"
                      value={destinationHint}
                      onChange={(e) => setDestinationHint(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. +8801700000000 or Bank Account details"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Note to Finance Team (Optional)</label>
                    <input
                      type="text"
                      value={payoutNote}
                      onChange={(e) => setPayoutNote(e.target.value)}
                      className={inputCls}
                      placeholder="Reference note"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--dc-border)]">
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className={cx(btn.secondary, btn.sm)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={requestPayoutMutation.isPending || Number(payoutAmount) < 500}
                    onClick={() =>
                      requestPayoutMutation.mutate({
                        amount: Number(payoutAmount),
                        currency: 'BDT',
                        method: payoutMethod,
                        payoutMethodId: selectedMethodId || undefined,
                        destinationHint: destinationHint || undefined,
                        note: payoutNote || undefined,
                      })
                    }
                    className={cx(btn.primary, btn.sm)}
                  >
                    {requestPayoutMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Payout Method Modal */}
          {methodModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-[var(--dc-card)] border border-[var(--dc-border)] rounded-2xl max-w-[440px] w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--dc-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] grid place-items-center">
                      <Plus size={15} />
                    </span>
                    <h3 className="font-semibold text-[15px] text-[var(--dc-text)]">Add Payout Method</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMethodModalOpen(false)}
                    className="text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Method Type</label>
                    <select
                      aria-label="Method Type"
                      value={newMethodType}
                      onChange={(e) => setNewMethodType(e.target.value)}
                      className={selectCls}
                    >
                      <option value="BKASH">bKash Personal / Merchant</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="BANK">Bank Wire Transfer</option>
                      <option value="OTHER">Other Provider</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Label</label>
                    <input
                      type="text"
                      value={newMethodLabel}
                      onChange={(e) => setNewMethodLabel(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. My Personal bKash"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Account Number / Handle</label>
                    <input
                      type="text"
                      value={newMethodAccount}
                      onChange={(e) => setNewMethodAccount(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. 01712345678"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-[12px] text-[var(--dc-text)] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={newMethodDefault}
                      onChange={(e) => setNewMethodDefault(e.target.checked)}
                      className="rounded border-[var(--dc-border)]"
                    />
                    Set as default payout destination
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--dc-border)]">
                  <button
                    type="button"
                    onClick={() => setMethodModalOpen(false)}
                    className={cx(btn.secondary, btn.sm)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saveMethodMutation.isPending || !newMethodLabel || !newMethodAccount}
                    onClick={() =>
                      saveMethodMutation.mutate({
                        method: newMethodType,
                        label: newMethodLabel,
                        accountHint: newMethodAccount,
                        isDefault: newMethodDefault,
                      })
                    }
                    className={cx(btn.primary, btn.sm)}
                  >
                    {saveMethodMutation.isPending ? 'Saving...' : 'Save Method'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ConsolePage>
  );
}
