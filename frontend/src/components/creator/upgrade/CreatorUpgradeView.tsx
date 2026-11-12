import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CREATOR_HUB_NAME } from '../../../lib/creatorHub';
import toast from 'react-hot-toast';
import {
  Crown, Check, X, Sparkles, BarChart3, Layers, DollarSign, Users, ShieldCheck, ChevronDown, Clock,
  LifeBuoy, ArrowLeft, Zap,
} from 'lucide-react';
import { useStore } from '../../../store';
import api from '../../../lib/api';
import {
  CREATOR_PLANS, CREATOR_PLAN_FEATURE_ROWS, CREATOR_PRO_BENEFITS, CREATOR_PRO_FAQ, CREATOR_PLANS_CHECKOUT_LIVE,
  formatPlanPrice, type CreatorPlan,
} from './creatorPlans';

const card = 'rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_rgba(16,24,40,0.04)] dark:border-border dark:bg-card';
const muted = 'text-slate-500 dark:text-muted-foreground';

const BENEFIT_ICON = { sparkles: Sparkles, chart: BarChart3, layers: Layers, dollar: DollarSign, users: Users, shield: ShieldCheck } as const;
const BENEFIT_TONE = {
  sparkles: 'bg-sky-50 text-sky-500 dark:bg-sky-500/15',
  chart: 'bg-blue-50 text-blue-500 dark:bg-blue-500/15',
  layers: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15',
  dollar: 'bg-amber-50 text-amber-500 dark:bg-amber-500/15',
  users: 'bg-teal-50 text-teal-500 dark:bg-teal-500/15',
  shield: 'bg-violet-50 text-violet-500 dark:bg-violet-500/15',
} as const;

function notLiveToast(plan: CreatorPlan) {
  toast(`${plan.name} isn't available yet. No payment was taken. Contact support for early access.`, { icon: '⏳' });
}

function PlanCard({ plan, yearly, current, onBack, onUpgrade }: { plan: CreatorPlan; yearly: boolean; current: boolean; onBack: () => void, onUpgrade?: (p: CreatorPlan) => void }) {
  const price = yearly ? plan.yearly / 12 : plan.monthly;
  const dark = Boolean(plan.popular);
  const body = (
    <div
      className={`relative flex h-full flex-col rounded-[18px] p-6 ${
        dark ? 'bg-[#0d1638] text-white' : 'bg-white dark:bg-card'
      }`}
      style={dark ? { backgroundImage: 'radial-gradient(120% 70% at 100% 0%, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 60%), linear-gradient(180deg, #121c46 0%, #0b1233 100%)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[15px] font-bold ${dark ? 'text-white' : 'text-slate-900 dark:text-foreground'}`}>{plan.name}</span>
        {plan.popular && (
          <span className="rounded-full bg-gradient-to-r from-[#4f6bff] to-[#8b5cf6] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg shadow-indigo-900/40">
            Most popular
          </span>
        )}
        {current && !plan.popular && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            Current plan
          </span>
        )}
      </div>
      <p className={`mt-1 text-[13px] ${dark ? 'text-slate-300' : muted}`}>{plan.tagline}</p>
      <div className="mt-5 flex items-end gap-1.5">
        <span className={`text-[40px] font-bold leading-none tracking-tight ${dark ? 'text-white' : 'text-slate-900 dark:text-foreground'}`}>
          {formatPlanPrice(Math.round(price * 100) / 100, plan.currency)}
        </span>
        <span className={`pb-1 text-[13px] ${dark ? 'text-slate-300' : muted}`}>/ month</span>
      </div>
      <p className={`mt-1 h-4 text-[12px] ${dark ? 'text-slate-400' : muted}`}>
        {plan.monthly > 0 ? (yearly ? `${formatPlanPrice(plan.yearly, plan.currency)} billed yearly` : 'Billed monthly') : 'Free forever'}
      </p>

      {plan.monthly === 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 h-11 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-border dark:bg-muted/40 dark:text-foreground dark:hover:bg-muted"
        >
          {current ? 'Your current plan' : 'Use Free'}
        </button>
      ) : CREATOR_PLANS_CHECKOUT_LIVE ? (
        <button
          type="button"
          onClick={() => onUpgrade?.(plan)}
          className={`mt-6 flex h-11 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold transition ${
            dark
              ? 'bg-gradient-to-r from-[#4f6bff] to-[#7c5cff] text-white shadow-lg shadow-indigo-900/50 hover:opacity-95'
              : 'border border-[#4f6bff]/40 bg-white text-[#3f5bff] hover:bg-blue-50 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10'
          }`}
        >
          {current ? 'Your current plan' : `Upgrade to ${plan.name}`}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => notLiveToast(plan)}
          className={`mt-6 flex h-11 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold transition ${
            dark
              ? 'bg-gradient-to-r from-[#4f6bff] to-[#7c5cff] text-white shadow-lg shadow-indigo-900/50 hover:opacity-95'
              : 'border border-[#4f6bff]/40 bg-white text-[#3f5bff] hover:bg-blue-50 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10'
          }`}
        >
          <Clock size={15} /> Coming soon
        </button>
      )}
      {plan.monthly > 0 && (
        <p className={`mt-2 text-center text-[11px] ${dark ? 'text-slate-400' : muted}`}>Checkout isn't live yet. You won't be charged.</p>
      )}

      <div className={`my-5 h-px ${dark ? 'bg-white/10' : 'bg-slate-100 dark:bg-border'}`} />
      <ul className="space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px]">
            <span
              className={`mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${
                dark ? 'bg-gradient-to-br from-[#4f6bff] to-[#8b5cf6] text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
              }`}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span className={dark ? 'text-slate-100' : 'text-slate-700 dark:text-foreground'}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (dark) {
    return (
      <div className="relative order-first rounded-[20px] bg-gradient-to-b from-[#6d8bff] via-[#7c5cff] to-[#312e81] p-[2px] shadow-[0_20px_50px_rgba(79,70,229,0.35)] md:order-none lg:-my-3">
        {body}
      </div>
    );
  }
  return <div className={`${card} overflow-hidden rounded-[20px]`}>{body}</div>;
}

function Cell({ v, planId }: { v: boolean | string; planId: string }) {
  if (v === true)
    return (
      <span className={`inline-grid h-6 w-6 place-items-center rounded-full ${planId === 'pro' ? 'bg-gradient-to-br from-[#4f6bff] to-[#8b5cf6] text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'}`}>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (v === false) return <X size={15} className="inline text-slate-300 dark:text-muted-foreground/50" />;
  return <span className="text-[12.5px] font-medium text-slate-700 dark:text-foreground">{v}</span>;
}

export function CreatorUpgradeView({ onBack }: { onBack: () => void }) {
  const handleUpgrade = async (plan: CreatorPlan) => {
    try {
      toast.loading('Processing upgrade...', { id: 'upgrade' });
      await api.post('/api/monetization/subscriptions', { tier: plan.id.toUpperCase() });
      toast.success(`Successfully upgraded to ${plan.name}!`, { id: 'upgrade' });
      onBack();
    } catch (err) {
      toast.error('Failed to upgrade.', { id: 'upgrade' });
    }
  };
  const user = useStore((s) => s.user);
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'Creator';
  const pro = CREATOR_PLANS.find((p) => p.popular) || CREATOR_PLANS[1];
  const savePct = pro && pro.monthly > 0 ? Math.round((1 - pro.yearly / (pro.monthly * 12)) * 100) : 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <button type="button" onClick={onBack} className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${muted} hover:text-slate-900 dark:hover:text-foreground`}>
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0d1530] px-5 py-9 text-center shadow-[0_8px_30px_rgba(15,23,42,0.18)] sm:px-10 sm:py-11">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(60% 80% at 15% 0%, rgba(79,107,255,0.45) 0%, rgba(79,107,255,0) 60%), radial-gradient(55% 80% at 90% 10%, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0) 60%), radial-gradient(80% 60% at 50% 120%, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0) 60%), linear-gradient(180deg, #0b1127 0%, #141d45 100%)',
          }}
        />
        <svg className="absolute bottom-0 left-0 h-[45%] w-full opacity-50" viewBox="0 0 800 160" preserveAspectRatio="none" aria-hidden>
          <path d="M0 120 L90 70 L170 105 L260 45 L360 110 L450 60 L540 100 L640 40 L720 90 L800 70 L800 160 L0 160 Z" fill="#1b2556" />
          <path d="M0 140 L120 100 L220 130 L330 90 L430 135 L540 95 L650 128 L800 100 L800 160 L0 160 Z" fill="#131b40" />
        </svg>
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-amber-300 ring-1 ring-white/15 backdrop-blur">
            <Crown size={14} fill="currentColor" /> Wevsoft Creator Pro
          </span>
          <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[38px]">
            Grow faster, {firstName}.{' '}
            <span className="bg-gradient-to-r from-[#8fb0ff] via-[#b69cff] to-[#f0abfc] bg-clip-text text-transparent">Create without limits.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
            More AI, deeper analytics, batch scheduling and monetization tools, all in the {CREATOR_HUB_NAME} you already use.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-[11.5px] font-medium text-amber-200 ring-1 ring-amber-300/25">
            <Clock size={12} /> Paid plans are coming soon. Prices below are a preview.
          </div>

          {/* Billing toggle */}
          <div className="mt-7 flex justify-center">
            <div className="inline-flex items-center rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
              {[
                { id: false, label: 'Monthly' },
                { id: true, label: 'Yearly' },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setYearly(o.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                    yearly === o.id ? 'bg-white text-slate-900 shadow' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {o.label}
                  {o.id && savePct > 0 && (
                    <span className={`rounded-md px-1.5 py-[1px] text-[10.5px] font-bold ${yearly ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-400/20 text-emerald-300'}`}>
                      Save {savePct}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-5 md:grid-cols-3 lg:gap-6">
        {CREATOR_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} yearly={yearly} current={p.id === 'free'} onBack={onBack} onUpgrade={handleUpgrade} />
        ))}
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-foreground">Why creators go Pro</h2>
          <p className={`mt-1 text-[13.5px] ${muted}`}>Tools built to save you time and grow your audience.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CREATOR_PRO_BENEFITS.map((b) => {
            const Icon = BENEFIT_ICON[b.icon];
            return (
              <div key={b.title} className={`${card} p-5`}>
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${BENEFIT_TONE[b.icon]}`}>
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-[14.5px] font-bold text-slate-900 dark:text-foreground">{b.title}</h3>
                <p className={`mt-1 text-[13px] leading-relaxed ${muted}`}>{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className={`${card} mx-auto max-w-6xl overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-4 dark:border-border">
          <h2 className="text-[16px] font-bold text-slate-900 dark:text-foreground">Compare plans</h2>
          <p className={`text-[12.5px] ${muted}`}>Everything included in each plan.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-[12.5px]">
                <th className={`sticky left-0 z-10 bg-white px-5 py-3 font-medium dark:bg-card ${muted}`}>Feature</th>
                {CREATOR_PLANS.map((p) => (
                  <th key={p.id} className={`px-4 py-3 text-center font-bold ${p.popular ? 'bg-blue-50/70 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-slate-800 dark:text-foreground'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CREATOR_PLAN_FEATURE_ROWS.map((g) => (
                <React.Fragment key={g.group}>
                  <tr>
                    <td colSpan={4} className="bg-slate-50 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-muted/40 dark:text-muted-foreground">
                      {g.group}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.label} className="border-t border-slate-100 dark:border-border">
                      <td className="sticky left-0 z-10 bg-white px-5 py-3 text-[13px] text-slate-700 dark:bg-card dark:text-foreground">{r.label}</td>
                      {CREATOR_PLANS.map((p) => (
                        <td key={p.id} className={`px-4 py-3 text-center ${p.popular ? 'bg-blue-50/40 dark:bg-blue-500/5' : ''}`}>
                          <Cell v={r.values[p.id]} planId={p.id} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-center text-[22px] font-bold tracking-tight text-slate-900 dark:text-foreground">Frequently asked questions</h2>
        <div className="mt-5 space-y-3">
          {CREATOR_PRO_FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className={`${card} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[14px] font-semibold text-slate-800 dark:text-foreground">{f.q}</span>
                  <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && <p className={`-mt-1 px-5 pb-4 text-[13px] leading-relaxed ${muted}`}>{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-10 text-white shadow-[0_12px_32px_rgba(91,33,182,0.3)] sm:px-10"
        style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 45%, #1e1b4b 100%)' }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-4 right-8 hidden items-end gap-2 sm:flex" aria-hidden>
          {[22, 34, 48, 64, 84].map((h, i) => (
            <span key={i} className="w-4 rounded-t bg-gradient-to-t from-blue-500/70 to-cyan-300/90" style={{ height: h }} />
          ))}
        </div>
        <div className="relative max-w-xl">
          <h2 className="flex items-center gap-2 text-[24px] font-bold tracking-tight">
            <Zap size={22} className="text-amber-300" fill="currentColor" /> Ready to level up?
          </h2>
          <p className="mt-2 text-[14px] text-violet-100/90">
            Creator Pro is on its way. Want early access or have questions about plans? Our team is happy to help.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/support"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[13.5px] font-semibold text-violet-700 shadow-lg hover:bg-violet-50"
            >
              <LifeBuoy size={16} /> Contact support
            </Link>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-[13.5px] font-semibold text-white ring-1 ring-white/25 hover:bg-white/15"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
