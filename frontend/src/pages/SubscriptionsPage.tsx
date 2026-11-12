import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Star, Check, Crown, Zap, Gift, Users, ChevronRight, Loader2, X } from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  benefits?: string; // JSON
  creatorId: string;
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate?: string;
  plan: SubscriptionPlan;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  basic: <Star className="w-5 h-5" />,
  pro: <Zap className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

const PLAN_GRADIENTS = [
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
];

export default function SubscriptionsPage() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'my' | 'creator'>('explore');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', description: '', price: '', interval: 'monthly', benefits: '' });
  const [paymentMethod, setPaymentMethod] = useState('bkash');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    loadPlans();
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    loadMySubscriptions();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/subscriptions/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const loadMySubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMySubscriptions(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod,
          transactionId: `TXN-${Date.now()}`
        })
      });
      if (!res.ok) throw new Error();
      await loadMySubscriptions();
      setShowPayModal(null);
      toast.success(`✅ Subscribed to ${plan.name}!`);
    } catch {
      toast.error('Subscription failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    try {
      await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadMySubscriptions();
      toast.success('Subscription cancelled');
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.price) return toast.error('Name and price required');
    try {
      const benefits = newPlan.benefits ? newPlan.benefits.split('\n').filter(Boolean) : [];
      const res = await fetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newPlan,
          price: parseFloat(newPlan.price),
          benefits
        })
      });
      if (!res.ok) throw new Error();
      await loadPlans();
      setShowCreateModal(false);
      setNewPlan({ name: '', description: '', price: '', interval: 'monthly', benefits: '' });
      toast.success('Plan created successfully!');
    } catch {
      toast.error('Failed to create plan');
    }
  };

  const parseBenefits = (benefits?: string): string[] => {
    if (!benefits) return [];
    try { return JSON.parse(benefits); } catch { return []; }
  };

  const isSubscribed = (planId: string) =>
    mySubscriptions.some(s => s.plan.id === planId && s.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold">Subscriptions</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-sm font-semibold hover:opacity-90"
          >
            <Zap className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/50 rounded-2xl p-1 mb-6">
          {(['explore', 'my', 'creator'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-violet-500 text-foreground dark:text-white shadow-lg'
                  : 'text-zinc-400 hover:text-foreground dark:text-white'
              }`}
            >
              {tab === 'my' ? 'My Subscriptions' : tab === 'creator' ? 'My Plans' : 'Explore'}
            </button>
          ))}
        </div>

        {/* Explore tab */}
        {activeTab === 'explore' && (
          <div>
            {plans.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-6xl">💎</div>
                <p className="text-xl font-semibold text-zinc-400">No subscription plans yet</p>
                <p className="text-zinc-500">Be the first creator to offer a plan!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan, idx) => {
                  const gradient = PLAN_GRADIENTS[idx % PLAN_GRADIENTS.length];
                  const subscribed = isSubscribed(plan.id);
                  const benefits = parseBenefits(plan.benefits);

                  return (
                    <motion.div
                      key={plan.id}
                      whileHover={{ scale: 1.02 }}
                      className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
                    >
                      {/* Gradient header */}
                      <div className={`bg-gradient-to-br ${gradient} p-5`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="bg-black/20 dark:bg-white/20 p-2 rounded-xl">
                            {PLAN_ICONS[plan.name.toLowerCase()] || <Star className="w-5 h-5" />}
                          </div>
                          {subscribed && (
                            <span className="bg-black/20 dark:bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-xl">{plan.name}</h3>
                        <p className="text-foreground dark:text-white/70 text-sm mt-1">{plan.description}</p>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Price */}
                        <div>
                          <span className="text-3xl font-bold">{plan.currency} {plan.price}</span>
                          <span className="text-zinc-400 text-sm">/{plan.interval}</span>
                        </div>

                        {/* Benefits */}
                        {benefits.length > 0 && (
                          <ul className="space-y-2">
                            {benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Subscribe button */}
                        {plan.creatorId !== user?.id && (
                          <button
                            onClick={() => subscribed ? null : setShowPayModal(plan)}
                            disabled={subscribed}
                            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                              subscribed
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                : `bg-gradient-to-r ${gradient} hover:opacity-90`
                            }`}
                          >
                            {subscribed ? '✓ Subscribed' : 'Subscribe'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My subscriptions tab */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            {mySubscriptions.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-6xl">🔔</div>
                <p className="text-xl font-semibold text-zinc-400">No active subscriptions</p>
                <button onClick={() => setActiveTab('explore')} className="text-violet-400 hover:text-violet-300">
                  Explore plans →
                </button>
              </div>
            ) : (
              mySubscriptions.map(sub => (
                <div key={sub.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex items-center gap-4">
                  <div className="p-3 bg-violet-500/20 rounded-xl">
                    <Crown className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{sub.plan.name}</p>
                    <p className="text-sm text-zinc-400">
                      {sub.plan.currency} {sub.plan.price}/{sub.plan.interval}
                    </p>
                    {sub.endDate && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Renews: {new Date(sub.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancel(sub.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Creator tab */}
        {activeTab === 'creator' && (
          <div className="space-y-4">
            {plans.filter(p => p.creatorId === user?.id).length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-6xl">🚀</div>
                <p className="text-xl font-semibold text-zinc-400">You haven't created any plans yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-violet-500 rounded-xl text-sm font-semibold hover:bg-violet-600"
                >
                  Create Your First Plan
                </button>
              </div>
            ) : (
              plans.filter(p => p.creatorId === user?.id).map((plan, idx) => (
                <div key={plan.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${PLAN_GRADIENTS[idx % PLAN_GRADIENTS.length]} bg-opacity-20`}>
                      <Crown className="w-5 h-5 text-foreground dark:text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-sm text-zinc-400">{plan.currency} {plan.price}/{plan.interval}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm space-y-4 border border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Subscribe to {showPayModal.name}</h3>
                <button onClick={() => setShowPayModal(null)}>
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="bg-zinc-800 rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold">{showPayModal.currency} {showPayModal.price}</p>
                <p className="text-zinc-400 text-sm">/{showPayModal.interval}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-zinc-400 font-medium">Payment Method</p>
                {['bkash', 'nagad', 'stripe'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === method
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <span className="text-lg">
                      {method === 'bkash' ? '📱' : method === 'nagad' ? '💳' : '💰'}
                    </span>
                    <span className="capitalize font-medium">{method}</span>
                    {paymentMethod === method && <Check className="w-4 h-4 text-violet-400 ml-auto" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(showPayModal)}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {loading ? 'Processing...' : `Pay ${showPayModal.currency} ${showPayModal.price}`}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Create Plan Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md space-y-4 border border-zinc-800"
            >
              <h2 className="text-xl font-bold">Create Subscription Plan</h2>
              <div className="space-y-3">
                <input
                  value={newPlan.name}
                  onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="Plan name (e.g., Pro, Premium)"
                  className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-500 border border-zinc-700 focus:border-violet-500"
                />
                <input
                  value={newPlan.description}
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Description"
                  className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-500 border border-zinc-700 focus:border-violet-500"
                />
                <div className="flex gap-2">
                  <input
                    value={newPlan.price}
                    onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                    placeholder="Price (BDT)"
                    type="number"
                    className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-500 border border-zinc-700 focus:border-violet-500"
                  />
                  <select
                    value={newPlan.interval}
                    onChange={e => setNewPlan({ ...newPlan, interval: e.target.value })}
                    className="bg-zinc-800 rounded-xl px-3 py-3 text-sm outline-none border border-zinc-700 focus:border-violet-500 text-foreground dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <textarea
                  value={newPlan.benefits}
                  onChange={e => setNewPlan({ ...newPlan, benefits: e.target.value })}
                  placeholder="Benefits (one per line)&#10;e.g., Exclusive content&#10;Early access&#10;Badge"
                  rows={4}
                  className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-500 border border-zinc-700 focus:border-violet-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-zinc-800 rounded-xl text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={handleCreatePlan} className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl text-sm font-semibold hover:opacity-90">
                  Create Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
